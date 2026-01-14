import { NextRequest, NextResponse } from 'next/server';
import { geminiChat, buildSystemPrompt, GeminiError } from '@/lib/clients/gemini';
import { openaiChat, OpenAIError } from '@/lib/clients/openai';
import { verifyToken, extractBearerToken } from '@/lib/auth';
import type { ChatRequest, ChatResponse, GeminiModel, OpenAIModel } from '@/types';

export async function POST(request: NextRequest) {
  try {
    // Require authentication for chat
    const authHeader = request.headers.get('authorization');
    const token = extractBearerToken(authHeader);

    if (!token) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required for AI chat' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    const body: ChatRequest = await request.json();

    // Validate request
    if (!body.message || typeof body.message !== 'string') {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'message is required' },
        { status: 400 }
      );
    }

    if (!body.settings?.model) {
      return NextResponse.json(
        { error: 'INVALID_REQUEST', message: 'settings.model is required' },
        { status: 400 }
      );
    }

    // Build system prompt with optional deck context
    const systemPrompt = buildSystemPrompt(
      body.deckContext,
      body.settings.bracketLevel,
      body.settings.includeContext
    );

    const provider = body.settings.provider || 'openai';
    let response: { text: string; tokensUsed?: number };

    if (provider === 'openai') {
      // Convert conversation history to OpenAI format
      const conversationHistory = (body.conversationHistory || []).map((msg) => ({
        role: msg.role as 'user' | 'assistant',
        content: msg.content,
      }));

      response = await openaiChat({
        model: body.settings.model as OpenAIModel,
        systemPrompt,
        conversationHistory,
        userMessage: body.message,
      });
    } else {
      // Convert conversation history to Gemini format
      const conversationHistory = (body.conversationHistory || []).map((msg) => ({
        role: msg.role === 'assistant' ? 'model' as const : 'user' as const,
        content: msg.content,
      }));

      response = await geminiChat({
        model: body.settings.model as GeminiModel,
        systemPrompt,
        conversationHistory,
        userMessage: body.message,
      });
    }

    const chatResponse: ChatResponse = {
      message: response.text,
      model: body.settings.model,
      tokensUsed: response.tokensUsed,
    };

    return NextResponse.json(chatResponse, {
      headers: {
        'Cache-Control': 'private, no-cache',
      },
    });
  } catch (error) {
    console.error('Chat API error:', error);

    if (error instanceof GeminiError) {
      return NextResponse.json(
        { error: 'GEMINI_ERROR', message: error.message },
        { status: error.status }
      );
    }

    if (error instanceof OpenAIError) {
      return NextResponse.json(
        { error: 'OPENAI_ERROR', message: error.message },
        { status: error.status }
      );
    }

    return NextResponse.json(
      { error: 'INTERNAL_ERROR', message: 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
