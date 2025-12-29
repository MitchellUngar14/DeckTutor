import OpenAI from 'openai';
import type { OpenAIModel, DeckContext, CommanderBracket } from '@/types';
import { COMMANDER_BRACKETS } from '@/types';

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

export class OpenAIError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string
  ) {
    super(message);
    this.name = 'OpenAIError';
  }
}

export interface OpenAIChatRequest {
  model: OpenAIModel;
  systemPrompt: string;
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>;
  userMessage: string;
}

export interface OpenAIChatResponse {
  text: string;
  tokensUsed?: number;
}

let openai: OpenAI | null = null;

function getClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new OpenAIError('OPENAI_API_KEY not configured', 500);
  }
  if (!openai) {
    openai = new OpenAI({ apiKey: OPENAI_API_KEY });
  }
  return openai;
}

export async function openaiChat(request: OpenAIChatRequest): Promise<OpenAIChatResponse> {
  const client = getClient();

  try {
    // Build messages array
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: 'system', content: request.systemPrompt },
      ...request.conversationHistory.map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      })),
      { role: 'user', content: request.userMessage },
    ];

    const response = await client.chat.completions.create({
      model: request.model,
      messages,
    });

    const choice = response.choices[0];
    if (!choice?.message?.content) {
      throw new OpenAIError('No response from OpenAI', 502);
    }

    return {
      text: choice.message.content,
      tokensUsed: response.usage?.total_tokens,
    };
  } catch (error) {
    console.error('OpenAI API error:', error);
    if (error instanceof OpenAIError) {
      throw error;
    }
    throw new OpenAIError(
      error instanceof Error ? error.message : 'OpenAI API error',
      502
    );
  }
}

// Build system prompt (same as Gemini, reusable)
export { buildSystemPrompt } from './gemini';
