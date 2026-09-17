import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

const VALID_STATUSES = [
  'concept',
  'planning',
  'active',
  'paused',
  'completed',
  'archived',
];

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const description = typeof body.description === 'string' ? body.description : undefined;
    const status = typeof body.status === 'string' ? body.status : undefined;

    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 },
      );
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid project status' },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload: Record<string, string | number | null> = {
      updated_at: new Date().toISOString(),
    };

    if (name !== undefined) payload.name = name;
    if (description !== undefined) payload.description = description;
    if (status) payload.status = status;

    const { data, error } = await supabase
      .from('projects')
      .update(payload)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single();

    if (error) {
      console.error('Failed to update project:', error);
      return NextResponse.json(
        { error: `Project update error: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ project: data });
  } catch (err) {
    console.error('Project update error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('projects')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      console.error('Failed to delete project:', error);
      return NextResponse.json(
        { error: `Project delete error: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('Project delete error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
