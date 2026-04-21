import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * GET /api/admin/tags/[id]/users
 * List all users linked to a specific tag
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tagId } = await params;

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    // Get tag details and linked users
    const tagUsers = await supabase.getTagUsers(tagId);

    if (!tagUsers) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    // Get detailed user-tag links for this tag
    const { data: detailedLinks } = await supabase.client
      .from('user_tags_view')
      .select('*')
      .eq('tag_id', tagId);

    return NextResponse.json({
      tag: {
        id: tagUsers.id_tag,
        type: tagUsers.tag_type,
        steve_pk: tagUsers.steve_tag_pk,
        parent_id: tagUsers.parent_id_tag,
      },
      users: {
        total: tagUsers.linked_user_count,
        data: tagUsers.linked_users || [],
      },
      links: {
        total: detailedLinks?.length || 0,
        data:
          detailedLinks?.map((link) => ({
            link_id: link.link_id,
            user: {
              id: link.user_id,
              name: `${link.first_name} ${link.last_name}`,
              email: link.email,
            },
            linked_by: link.linked_by,
            link_reason: link.link_reason,
            linked_at: link.linked_at,
            is_active: link.is_active,
          })) || [],
      },
      // Legacy format for backward compatibility
      tag_users: tagUsers,
    });
  } catch (error) {
    console.error('Error fetching tag users:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/tags/[id]/users
 * Link multiple users to a tag (bulk operation)
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tagId } = await params;
    const body = await request.json();

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    // Validate request body
    const { user_ids, linked_by, reason } = body;

    if (!user_ids || !Array.isArray(user_ids) || user_ids.length === 0) {
      return NextResponse.json(
        { error: 'user_ids array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (!linked_by) {
      return NextResponse.json({ error: 'linked_by is required' }, { status: 400 });
    }

    // Verify the tag exists and is linkable
    const { data: tag } = await supabase.client
      .from('ocpp_tags')
      .select('id_tag, tag_type, steve_tag_pk')
      .eq('id_tag', tagId)
      .single();

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 });
    }

    if (!['physical', 'meta'].includes(tag.tag_type)) {
      return NextResponse.json(
        {
          error: `Cannot link ${tag.tag_type} tags to users. Only physical and meta tags can be linked.`,
        },
        { status: 400 }
      );
    }

    // Verify all users exist
    const { data: users } = await supabase.client
      .from('profiles')
      .select('id, first_name, last_name, email')
      .in('id', user_ids);

    if (!users || users.length !== user_ids.length) {
      const foundUserIds = users?.map((u) => u.id) || [];
      const missingUserIds = user_ids.filter((id) => !foundUserIds.includes(id));
      return NextResponse.json(
        { error: `Users not found: ${missingUserIds.join(', ')}` },
        { status: 404 }
      );
    }

    // Prepare bulk insert data
    const linksToCreate = user_ids.map((userId: string) => ({
      user_id: userId,
      tag_id: tagId,
      linked_by,
      link_reason: reason,
      is_active: true,
    }));

    // Insert links (using upsert to handle existing links)
    const { data: createdLinks, error } = await supabase.client
      .from('user_tag_links')
      .upsert(linksToCreate, {
        onConflict: 'user_id,tag_id',
        ignoreDuplicates: false,
      })
      .select();

    if (error) {
      throw error;
    }

    return NextResponse.json(
      {
        message: `Successfully linked tag to ${createdLinks?.length || 0} users`,
        tag: tag,
        users: users,
        links: createdLinks,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error bulk linking tag to users:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/tags/[id]/users
 * Unlink all users from a tag (bulk operation)
 */
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tagId } = await params;
    const body = await request.json();

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 });
    }

    const { user_ids } = body;

    // If user_ids provided, unlink specific users; otherwise unlink all
    let query = supabase.client
      .from('user_tag_links')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .eq('tag_id', tagId)
      .eq('is_active', true);

    if (user_ids && Array.isArray(user_ids) && user_ids.length > 0) {
      query = query.in('user_id', user_ids);
    }

    const { data: unlinkedLinks } = await query.select();

    const unlinkedCount = unlinkedLinks?.length || 0;
    const message = user_ids
      ? `Successfully unlinked tag from ${unlinkedCount} specified users`
      : `Successfully unlinked tag from all ${unlinkedCount} users`;

    return NextResponse.json({
      message,
      unlinked_count: unlinkedCount,
      unlinked_links: unlinkedLinks,
    });
  } catch (error) {
    console.error('Error bulk unlinking tag from users:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
