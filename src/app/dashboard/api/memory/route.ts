import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { category, content } = body;

    if (!category || !content) {
      return NextResponse.json(
        { error: 'Missing category or content' },
        { status: 400 },
      );
    }

    const validCategories = ['preference', 'project_fact', 'decision'];
    if (!validCategories.includes(category)) {
      return NextResponse.json(
        { error: 'Invalid category. Must be preference, project_fact, or decision.' },
        { status: 400 },
      );
    }

    // Auth check
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('memory_notes')
      .insert({ user_id: user.id, category, content })
      .select()
      .single();

    if (error) {
      console.error('Failed to insert memory note:', error);
      return NextResponse.json({ error: 'DB error' }, { status: 500 });
    }

    return NextResponse.json({ note: data }, { status: 201 });
  } catch (err) {
    console.error('Memory API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
