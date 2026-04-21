import { supabase } from '@/services/supabase';
import { NextResponse } from 'next/server';
import { ValidationError, createValidationErrorResponse } from '@/middleware/validation/middleware';

/**
 * GET /api/admin/users/[id]/tags
 * List all tags linked to a specific user
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Get user's linked tags
    const userTags = await supabase.getUserTagLinks(userId);

    // Organize tags by type
    const organizedTags = {
      physical: userTags.filter((tag) => tag.tag_type === 'physical'),
      meta: userTags.filter((tag) => tag.tag_type === 'meta'),
      user: userTags.filter((tag) => tag.tag_type === 'user'),
      admin: userTags.filter((tag) => tag.tag_type === 'admin'),
    };

    return NextResponse.json({
      user_id: userId,
      tags: {
        total: userTags.length,
        by_type: {
          physical: organizedTags.physical.length,
          meta: organizedTags.meta.length,
          user: organizedTags.user.length,
          admin: organizedTags.admin.length,
        },
        data: organizedTags,
      },
      // Legacy format for backward compatibility
      user_tags: userTags,
    });
  } catch (error) {
    console.error('Error fetching user tags:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/users/[id]/tags
 * Link a tag to a user
 */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: userId } = await params;
    const body = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Validate request body
    const { tag_id, linked_by, reason } = body;

    if (!tag_id) {
      return NextResponse.json({ error: 'tag_id is required' }, { status: 400 });
    }

    if (!linked_by) {
      return NextResponse.json({ error: 'linked_by is required' }, { status: 400 });
    }

    // Verify the tag exists and is linkable (physical or meta)
    const { data: tag } = await supabase.client
      .from('ocpp_tags')
      .select('id_tag, tag_type, steve_tag_pk')
      .eq('id_tag', tag_id)
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

    // Verify the user exists
    const { data: user } = await supabase.client
      .from('profiles')
      .select('id, first_name, last_name, email')
      .eq('id', userId)
      .single();

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if link already exists
    const { data: existingLink } = await supabase.client
      .from('user_tag_links')
      .select('id, is_active')
      .eq('user_id', userId)
      .eq('tag_id', tag_id)
      .single();

    if (existingLink) {
      if (existingLink.is_active) {
        return NextResponse.json({ error: 'Tag is already linked to this user' }, { status: 409 });
      } else {
        // Reactivate existing link
        const { data: reactivatedLink } = await supabase.client
          .from('user_tag_links')
          .update({
            is_active: true,
            linked_by,
            link_reason: reason,
            updated_at: new Date().toISOString(),
          })
          .eq('id', existingLink.id)
          .select()
          .single();

        return NextResponse.json({
          message: 'Tag link reactivated successfully',
          link: reactivatedLink,
          user: user,
          tag: tag,
        });
      }
    }

    // Create new link
    const newLink = await supabase.linkUserToTag(userId, tag_id, linked_by, reason);

    return NextResponse.json(
      {
        message: 'Tag linked to user successfully',
        link: newLink,
        user: user,
        tag: tag,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error linking tag to user:', error);

    if (error instanceof ValidationError) {
      return createValidationErrorResponse(error);
    }

    // Handle unique constraint violations
    if (error instanceof Error && error.message.includes('duplicate key')) {
      return NextResponse.json({ error: 'Tag is already linked to this user' }, { status: 409 });
    }

    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
