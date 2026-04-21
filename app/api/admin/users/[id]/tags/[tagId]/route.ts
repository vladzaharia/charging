import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * GET /api/admin/users/[id]/tags/[tagId]
 * Get details of a specific user-tag link
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const { id: userId, tagId } = await params;

    if (!userId || !tagId) {
      return NextResponse.json({ error: 'User ID and Tag ID are required' }, { status: 400 });
    }

    // Get the specific user-tag link
    const { data: link } = await supabase.client
      .from('user_tags_view')
      .select('*')
      .eq('user_id', userId)
      .eq('tag_id', tagId)
      .single();

    if (!link) {
      return NextResponse.json({ error: 'User-tag link not found' }, { status: 404 });
    }

    return NextResponse.json({
      link: {
        id: link.link_id,
        user_id: link.user_id,
        tag_id: link.tag_id,
        tag_type: link.tag_type,
        steve_tag_pk: link.steve_tag_pk,
        parent_tag: link.parent_id_tag,
        linked_by: link.linked_by,
        link_reason: link.link_reason,
        is_active: link.is_active,
        linked_at: link.linked_at,
        updated_at: link.updated_at,
      },
      user: {
        id: link.user_id,
        name: `${link.first_name} ${link.last_name}`,
        email: link.email,
      },
      tag: {
        id: link.tag_id,
        type: link.tag_type,
        steve_pk: link.steve_tag_pk,
        parent_id: link.parent_id_tag,
      },
    });
  } catch (error) {
    console.error('Error fetching user-tag link:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]/tags/[tagId]
 * Unlink a tag from a user
 */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const { id: userId, tagId } = await params;

    if (!userId || !tagId) {
      return NextResponse.json({ error: 'User ID and Tag ID are required' }, { status: 400 });
    }

    // Verify the link exists and is active
    const { data: existingLink } = await supabase.client
      .from('user_tag_links')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('tag_id', tagId)
      .single();

    if (!existingLink) {
      return NextResponse.json({ error: 'User-tag link not found' }, { status: 404 });
    }

    if (!existingLink.is_active) {
      return NextResponse.json(
        { error: 'Tag is already unlinked from this user' },
        { status: 409 }
      );
    }

    // Get user and tag details for response
    const { data: user } = await supabase.client
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', userId)
      .single();

    const { data: tag } = await supabase.client
      .from('ocpp_tags')
      .select('id_tag, tag_type, steve_tag_pk')
      .eq('id_tag', tagId)
      .single();

    // Unlink the tag (set is_active to false)
    const unlinkedTag = await supabase.unlinkUserFromTag(userId, tagId);

    return NextResponse.json({
      message: 'Tag unlinked from user successfully',
      unlinked_link: unlinkedTag,
      user: user,
      tag: tag,
    });
  } catch (error) {
    console.error('Error unlinking tag from user:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]/tags/[tagId]
 * Update a user-tag link (e.g., change reason, reactivate)
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; tagId: string }> }
) {
  try {
    const { id: userId, tagId } = await params;
    const body = await request.json();

    if (!userId || !tagId) {
      return NextResponse.json({ error: 'User ID and Tag ID are required' }, { status: 400 });
    }

    // Verify the link exists
    const { data: existingLink } = await supabase.client
      .from('user_tag_links')
      .select('id, is_active, link_reason')
      .eq('user_id', userId)
      .eq('tag_id', tagId)
      .single();

    if (!existingLink) {
      return NextResponse.json({ error: 'User-tag link not found' }, { status: 404 });
    }

    // Prepare update data
    const updateData: {
      updated_at: string;
      link_reason?: string;
      is_active?: boolean;
      linked_by?: string;
    } = {
      updated_at: new Date().toISOString(),
    };

    if (body.link_reason !== undefined) {
      updateData.link_reason = body.link_reason;
    }

    if (body.is_active !== undefined) {
      updateData.is_active = body.is_active;
    }

    if (body.linked_by !== undefined) {
      updateData.linked_by = body.linked_by;
    }

    // Update the link
    const { data: updatedLink } = await supabase.client
      .from('user_tag_links')
      .update(updateData)
      .eq('id', existingLink.id)
      .select()
      .single();

    return NextResponse.json({
      message: 'User-tag link updated successfully',
      updated_link: updatedLink,
    });
  } catch (error) {
    console.error('Error updating user-tag link:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
