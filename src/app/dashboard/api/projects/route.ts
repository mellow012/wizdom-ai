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

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('projects')
      .select('*')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Failed to fetch projects:', error);
      return NextResponse.json(
        { error: `Project lookup error: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ projects: data ?? [] });
  } catch (err) {
    console.error('Projects API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    const description = typeof body.description === 'string' ? body.description : '';
    const status = typeof body.status === 'string' ? body.status : 'concept';

    if (!name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 },
      );
    }

    if (!VALID_STATUSES.includes(status)) {
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

    const payload = {
      user_id: user.id,
      name,
      description,
      status,
      github_repo_id: body.github_repo_id ?? null,
      github_owner: typeof body.github_owner === 'string' ? body.github_owner : null,
      github_repo: typeof body.github_repo === 'string' ? body.github_repo : null,
      github_url: typeof body.github_url === 'string' ? body.github_url : null,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('projects')
      .insert([payload])
      .select()
      .single();

    if (error) {
      console.error('Failed to create project:', error);
      return NextResponse.json(
        { error: `Project create error: ${error.message}` },
        { status: 500 },
      );
    }

    return NextResponse.json({ project: data }, { status: 201 });
  } catch (err) {
    console.error('Project creation error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
