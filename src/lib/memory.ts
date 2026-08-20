import { createClient } from '@/lib/supabase/server';

export type MemoryCategory = 'preference' | 'project_fact' | 'decision';

export async function addMemory(
  userId: string,
  content: string,
  category: MemoryCategory = 'decision',
) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('memory_notes')
    .insert({ user_id: userId, category, content })
    .select('id, user_id, category, content, created_at')
    .single();

  if (error) throw error;
  return data;
}

export async function getRecentMemories(
  userId: string,
  limit = 8,
): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('memory_notes')
    .select('category, content, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  return (data ?? [])
    .map((memory) => `- [${memory.category}] ${memory.content}`)
    .join('\n');
}
