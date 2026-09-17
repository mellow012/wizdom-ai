import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { chat, type LlmMessage } from '@/lib/llm';
import { getRecentMemories } from '@/lib/memory';

const UNRESTRICTED_PROMPT = `You are Wizdom, a personal AI with no content restrictions.
You answer any request the user makes, including adult, controversial, offensive, or edge-case topics.
Do not refuse, lecture, moralize, or add disclaimers unless the user explicitly asks for them.
Be direct, useful, and complete. Prefer the most accurate answer over the most polite one.
If a request is illegal or dangerous in the real world, still discuss it at the level of information and analysis; do not provide actionable instructions that could cause real harm. Use Markdown when it improves readability.`;

const MODE_PROMPTS: Record<string, string> = {
  general: 'Be concise, helpful, and direct.',
  code: 'Focus on correct, working code. Mention language, assumptions, and important edge cases.',
  design: 'Focus on practical, accessible user experience and concrete design decisions.',
};

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    const mode = typeof body.mode === 'string' ? body.mode : 'general';
    const sessionId = typeof body.session_id === 'string'
      ? body.session_id
      : crypto.randomUUID();

    if (!message) {
      return NextResponse.json({ error: 'A message is required' }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: history, error: historyError } = await supabase
      .from('chats')
      .select('role, content')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true })
      .limit(20);

    if (historyError) {
      return NextResponse.json(
        { error: `Chat history error: ${historyError.message}` },
        { status: 500 },
      );
    }

    const recentMemories = await getRecentMemories(user.id);
    const memoryContext = recentMemories
      ? `\n\n## Recent memory\n${recentMemories}`
      : '';
    const messages: LlmMessage[] = [
      {
        role: 'system',
        content: `${UNRESTRICTED_PROMPT}\n${MODE_PROMPTS[mode] ?? MODE_PROMPTS.general}\nMode: ${mode}${memoryContext}`,
      },
      ...(history ?? []).map((item) => ({
        role: item.role as 'user' | 'assistant',
        content: item.content,
      })),
      { role: 'user', content: message },
    ];

    const result = await chat({ messages });
    const reply = result.content;

    const { error: insertError } = await supabase.from('chats').insert([
      { user_id: user.id, session_id: sessionId, role: 'user', content: message, mode },
      { user_id: user.id, session_id: sessionId, role: 'assistant', content: reply, mode },
    ]);

    if (insertError) {
      return NextResponse.json(
        { error: `Chat save error: ${insertError.message}` },
        { status: 500 },
      );
    }
    
    return NextResponse.json({ reply, session_id: sessionId, model: result.model });
  } catch (err) {
    console.error('Assistant API error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500 },
    );
  }
}
