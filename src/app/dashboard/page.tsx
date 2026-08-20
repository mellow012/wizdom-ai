'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  LogOut,
  Brain,
  Send,
  Plus,
  Trash2,
  MessageSquare,
  Pencil,
  RotateCcw,
  Sun,
  Moon,
  Copy,
  Check,
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type Mode = 'general' | 'code' | 'design';

type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
  error?: boolean;
  failedMessage?: string;
};

type SessionSummary = {
  id: string;
  title: string;
  preview: string;
  mode: Mode;
};

type MemoryNote = {
  id: string;
  category: 'preference' | 'project_fact' | 'decision';
  content: string;
  created_at: string;
};

function generateSessionId() {
  return crypto.randomUUID();
}

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [mode, setMode] = useState<Mode>('general');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => generateSessionId());
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Memory notes state
  const [memoryNotes, setMemoryNotes] = useState<MemoryNote[]>([]);
  const [newNoteCategory, setNewNoteCategory] = useState<'preference' | 'project_fact' | 'decision'>('preference');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [memoryOpen, setMemoryOpen] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem('wizdom-theme');
    const nextTheme = savedTheme === 'dark' ? 'dark' : 'light';
    setTheme(nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  }, []);

  function toggleTheme() {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    window.localStorage.setItem('wizdom-theme', nextTheme);
    document.documentElement.classList.toggle('dark', nextTheme === 'dark');
  }

  // Load memory notes
  const loadMemoryNotes = useCallback(async () => {
    const { data } = await supabase
      .from('memory_notes')
      .select('*')
      .order('created_at', { ascending: false });
    if (data) setMemoryNotes(data);
  }, [supabase]);

  // Load chat history for the current session
  const loadChatHistory = useCallback(async () => {
    const { data } = await supabase
      .from('chats')
      .select('*')
      .eq('session_id', sessionId)
      .order('created_at', { ascending: true });
    if (data) setMessages(data.map((d: Record<string, string>) => ({
      id: d.id,
      role: d.role as 'user' | 'assistant',
      content: d.content,
      created_at: d.created_at,
    })));
  }, [supabase, sessionId]);

  const loadChatSessions = useCallback(async () => {
    const { data } = await supabase
      .from('chats')
      .select('session_id, mode, content, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!data) return;

    const seen = new Set<string>();
    const recentSessions = data
      .filter((chat: Record<string, string>) => {
        if (seen.has(chat.session_id)) return false;
        seen.add(chat.session_id);
        return true;
      })
      .map((chat: Record<string, string>) => ({
        id: chat.session_id,
        title: chat.content.slice(0, 30) || 'Untitled conversation',
        preview: chat.content.slice(0, 58) || 'No preview available',
        mode: (chat.mode as Mode) || 'general',
      }));

    setSessions(recentSessions);
  }, [supabase]);

  useEffect(() => {
    loadChatHistory();
    loadMemoryNotes();
    loadChatSessions();
  }, [loadChatHistory, loadMemoryNotes, loadChatSessions]);

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSend(messageOverride?: string, removeMessageId?: string) {
    const trimmed = (messageOverride ?? input).trim();
    if (!trimmed || loading) return;

    setInput('');
    setEditingMessageId(null);
    setLoading(true);

    const userMsg: ChatMessage = {
      id: generateSessionId(),
      role: 'user',
      content: trimmed,
    };
    if (removeMessageId) {
      setMessages((prev) => prev.filter((message) => message.id !== removeMessageId));
    }
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = await fetch('/dashboard/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: trimmed, mode, session_id: sessionId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Request failed' }));
        throw new Error(err.error || 'Request failed');
      }

      const { reply } = await res.json();
      setMessages((prev) => [
        ...prev,
        { id: generateSessionId(), role: 'assistant', content: reply },
      ]);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Something went wrong';
      setMessages((prev) => [
        ...prev,
        {
          id: generateSessionId(),
          role: 'assistant',
          content: errorMsg,
          error: true,
          failedMessage: trimmed,
        },
      ]);
    } finally {
      setLoading(false);
      loadChatSessions();
      inputRef.current?.focus();
    }
  }

  function handleEdit(message: ChatMessage) {
    setEditingMessageId(message.id);
    setInput(message.content);
    inputRef.current?.focus();
  }

  function handleRetry(message: ChatMessage) {
    if (message.failedMessage) handleSend(message.failedMessage, message.id);
  }

  async function handleCopy(message: ChatMessage) {
    await navigator.clipboard.writeText(message.content);
    setCopiedMessageId(message.id);
    window.setTimeout(() => setCopiedMessageId(null), 1600);
  }

  async function handleAddNote() {
    const content = newNoteContent.trim();
    if (!content) return;

    await fetch('/dashboard/api/memory', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ category: newNoteCategory, content }),
    });

    setNewNoteContent('');
    loadMemoryNotes();
  }

  async function handleDeleteNote(id: string) {
    await supabase.from('memory_notes').delete().eq('id', id);
    loadMemoryNotes();
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push('/login');
    router.refresh();
  }

  function handleNewChat() {
    setSessionId(generateSessionId());
    setMessages([]);
    setEditingMessageId(null);
    setInput('');
  }

  function handleSelectSession(id: string, selectedMode: Mode) {
    setMode(selectedMode);
    setSessionId(id);
    setEditingMessageId(null);
    setInput('');
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const categoryColor: Record<string, string> = {
    preference: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    project_fact: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    decision: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
  };

  return (
    <div className="h-screen flex bg-background text-foreground">
      <aside className="hidden md:flex w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground">
        <div className="flex items-center gap-3 border-b border-sidebar-border px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground">
            W
          </div>
          <div>
            <p className="font-semibold tracking-tight">Wizdom AI</p>
            <p className="text-[11px] text-sidebar-foreground/60">Your thinking partner</p>
          </div>
        </div>

        <div className="p-3">
          <Button
            onClick={handleNewChat}
            className="w-full justify-start gap-2 bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
          >
            <Plus className="h-4 w-4" />
            New conversation
          </Button>
        </div>

        <div className="px-4 pb-2 pt-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-sidebar-foreground/45">
          Recent conversations
        </div>
        <ScrollArea className="flex-1 px-3">
          <div className="space-y-1 pb-4">
            {sessions.map((session) => (
              <button
                key={session.id}
                type="button"
                onClick={() => handleSelectSession(session.id, session.mode)}
                className={`w-full rounded-lg px-3 py-2.5 text-left transition-colors ${
                  session.id === sessionId
                    ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                    : 'text-sidebar-foreground/75 hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground'
                }`}
              >
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
                  <span className="truncate text-xs font-medium">{session.title}</span>
                </div>
                <p className="mt-1 truncate pl-5 text-[11px] text-sidebar-foreground/45">
                  {session.preview}
                </p>
              </button>
            ))}
            {sessions.length === 0 && (
              <p className="px-3 py-8 text-center text-xs leading-relaxed text-sidebar-foreground/45">
                Your recent chats will appear here.
              </p>
            )}
          </div>
        </ScrollArea>

        <div className="border-t border-sidebar-border p-4 text-[11px] text-sidebar-foreground/50">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
            Workspace ready
          </span>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="flex items-center justify-between px-4 py-3 border-b border-border shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-lg font-semibold tracking-tight">Wizdom AI</h1>
          <Button variant="ghost" size="sm" onClick={handleNewChat} title="New chat">
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode selector */}
          <Select value={mode} onValueChange={(v) => setMode(v as Mode)}>
            <SelectTrigger className="w-[130px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="general">General</SelectItem>
              <SelectItem value="code">Code</SelectItem>
              <SelectItem value="design">Design</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
          >
            {theme === 'light' ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </Button>

          {/* Memory notes panel */}
          <Sheet open={memoryOpen} onOpenChange={setMemoryOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="sm" title="Memory notes">
                <Brain className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent className="w-80 flex flex-col">
              <SheetHeader>
                <SheetTitle>Memory Notes</SheetTitle>
              </SheetHeader>

              {/* Add note form */}
              <div className="space-y-2 mt-4">
                <Label className="text-xs text-muted-foreground">Category</Label>
                <Select value={newNoteCategory} onValueChange={(v) => setNewNoteCategory(v as MemoryNote['category'])}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="preference">Preference</SelectItem>
                    <SelectItem value="project_fact">Project Fact</SelectItem>
                    <SelectItem value="decision">Decision</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  placeholder="Add a memory note…"
                  value={newNoteContent}
                  onChange={(e) => setNewNoteContent(e.target.value)}
                  className="min-h-[60px] text-sm"
                />
                <Button size="sm" onClick={handleAddNote} className="w-full">
                  <Plus className="h-3 w-3 mr-1" /> Add Note
                </Button>
              </div>

              {/* Notes list */}
              <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
                <div className="space-y-2">
                  {memoryNotes.map((note) => (
                    <div
                      key={note.id}
                      className="flex items-start justify-between gap-2 p-2 rounded-md border border-border bg-card"
                    >
                      <div className="min-w-0">
                        <Badge variant="outline" className={`text-[10px] mb-1 ${categoryColor[note.category]}`}>
                          {note.category.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-muted-foreground break-words">{note.content}</p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="shrink-0 h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteNote(note.id)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  {memoryNotes.length === 0 && (
                    <p className="text-xs text-muted-foreground text-center py-8">
                      No memory notes yet.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>

          <Button variant="ghost" size="sm" onClick={handleLogout} title="Sign out">
            <LogOut className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* ── Messages ─────────────────────────────────────── */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-20">
              <MessageSquare className="h-8 w-8 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Start a conversation with your AI co-pilot.</p>
              <p className="text-xs mt-1 opacity-60">Mode: {mode}</p>
            </div>
          )}

          {messages.map((msg, i) => (
            <div
              key={msg.id || i}
              className={`group flex items-end gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'whitespace-pre-wrap bg-primary text-primary-foreground'
                    : msg.error
                      ? 'border border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border border-border bg-card'
                }`}
              >
                {msg.error ? (
                  <div className="space-y-2">
                    <p>{msg.content}</p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 border-destructive/30 text-destructive hover:bg-destructive/10"
                      onClick={() => handleRetry(msg)}
                    >
                      <RotateCcw className="mr-1.5 h-3 w-3" />
                      Retry
                    </Button>
                  </div>
                ) : msg.role === 'assistant' ? (
                  <div className="assistant-markdown">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  msg.content
                )}
              </div>
              {msg.role === 'user' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                  onClick={() => handleEdit(msg)}
                  title="Edit message"
                  aria-label="Edit message"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              )}
              {msg.role === 'assistant' && !msg.error && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
                  onClick={() => handleCopy(msg)}
                  title={copiedMessageId === msg.id ? 'Copied' : 'Copy response'}
                  aria-label={copiedMessageId === msg.id ? 'Copied' : 'Copy response'}
                >
                  {copiedMessageId === msg.id ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </Button>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-card border border-border rounded-xl px-4 py-3 text-sm text-muted-foreground animate-pulse">
                Thinking…
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Input ────────────────────────────────────────── */}
      <div className="shrink-0 border-t border-border px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type a message… (Enter to send, Shift+Enter for new line)"
            className="min-h-[44px] max-h-[160px] resize-none text-sm"
            rows={1}
            disabled={loading}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="shrink-0 h-[44px] w-[44px]"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {editingMessageId && (
          <div className="mx-auto mt-2 flex max-w-2xl items-center justify-between text-xs text-muted-foreground">
            <span>Editing your message</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs"
              onClick={() => {
                setEditingMessageId(null);
                setInput('');
              }}
            >
              Cancel
            </Button>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
