import Groq from 'groq-sdk';

// ── Provider-agnostic interface ─────────────────────────────────────────

export interface LlmMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LlmInput {
  messages: LlmMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface LlmOutput {
  content: string;
  model: string;
}

// ── Groq implementation ─────────────────────────────────────────────────

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

/**
 * Single function that calls the LLM. Swap the internals to change
 * providers — the rest of the codebase only imports LlmInput / LlmOutput.
 */
export async function chat(input: LlmInput): Promise<LlmOutput> {
  const {
    messages,
    model = process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    temperature = 0.7,
    maxTokens = 2048,
  } = input;

  const response = await groq.chat.completions.create({
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
    temperature,
    max_tokens: maxTokens,
  });

  const [choice] = response.choices;
  return {
    content: choice?.message?.content ?? '',
    model: response.model,
  };
}
