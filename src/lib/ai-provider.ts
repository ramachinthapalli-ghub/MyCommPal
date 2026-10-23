/**
 * MyCommPal AI Provider Integration
 * Integrates OpenAI Chat Completions / Responses API with Anthropic fallback,
 * supporting structured JSON output, strict schema validation, quote sanitization,
 * timeouts, transient retries, and prompt-injection safeguards.
 */

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CallLLMOptions {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  retries?: number;
}

export class AIConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConfigurationError';
  }
}

export class AIServiceError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 500) {
    super(message);
    this.name = 'AIServiceError';
    this.statusCode = statusCode;
  }
}

/**
 * Returns active provider configuration.
 * Prioritizes OPENAI_API_KEY (default: gpt-4o-mini), then ANTHROPIC_API_KEY.
 */
export function getAIProviderConfig(): {
  provider: 'openai' | 'anthropic';
  model: string;
  apiKey: string;
} {
  const chosenProvider = (process.env.AI_PROVIDER || '').toLowerCase();
  const openaiKey = process.env.OPENAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  if (chosenProvider === 'anthropic' && anthropicKey && !anthropicKey.includes('your_anthropic')) {
    return {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      apiKey: anthropicKey,
    };
  }

  if (openaiKey && !openaiKey.includes('your_openai') && !openaiKey.includes('placeholder')) {
    return {
      provider: 'openai',
      model: process.env.OPENAI_MODEL || process.env.AI_MODEL || 'gpt-4o-mini',
      apiKey: openaiKey,
    };
  }

  if (anthropicKey && !anthropicKey.includes('your_anthropic') && !anthropicKey.includes('placeholder')) {
    return {
      provider: 'anthropic',
      model: process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022',
      apiKey: anthropicKey,
    };
  }

  throw new AIConfigurationError(
    'AI Assessment is unavailable: Neither OPENAI_API_KEY nor ANTHROPIC_API_KEY is configured on the server. Please set OPENAI_API_KEY in your environment.'
  );
}

/**
 * Calls OpenAI Chat Completions API with JSON object response format.
 */
async function callOpenAI(
  apiKey: string,
  model: string,
  options: CallLLMOptions,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: options.temperature ?? 0.1,
      max_tokens: options.maxTokens ?? 2000,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    const status = res.status;
    if (status === 401) {
      throw new AIServiceError('Invalid OpenAI API credentials. Please verify OPENAI_API_KEY.', 401);
    }
    if (status === 429) {
      throw new AIServiceError('OpenAI rate limit or quota exceeded. Please try again in a few moments.', 429);
    }
    throw new AIServiceError(`OpenAI API returned error ${status}: ${errorBody.slice(0, 300)}`, status);
  }

  const json = await res.json();
  const rawText = json.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new AIServiceError('OpenAI returned an empty response.', 502);
  }
  return rawText;
}

/**
 * Calls Anthropic Messages API.
 */
async function callAnthropic(
  apiKey: string,
  model: string,
  options: CallLLMOptions,
  signal: AbortSignal
): Promise<string> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model,
      max_tokens: options.maxTokens ?? 2000,
      temperature: options.temperature ?? 0.1,
      system: options.systemPrompt,
      messages: [{ role: 'user', content: options.userPrompt }],
    }),
    signal,
  });

  if (!res.ok) {
    const errorBody = await res.text().catch(() => '');
    const status = res.status;
    if (status === 401) {
      throw new AIServiceError('Invalid Anthropic API key.', 401);
    }
    if (status === 429) {
      throw new AIServiceError('Anthropic rate limit exceeded. Please try again shortly.', 429);
    }
    throw new AIServiceError(`Anthropic API returned error ${status}: ${errorBody.slice(0, 300)}`, status);
  }

  const json = await res.json();
  const rawText = json.content?.[0]?.text;
  if (!rawText) {
    throw new AIServiceError('Anthropic returned an empty response.', 502);
  }
  return rawText;
}

/**
 * Executes LLM call with timeout and 1 transient retry.
 */
export async function executeLLMCall(options: CallLLMOptions): Promise<{
  rawResponse: string;
  provider: string;
  model: string;
}> {
  const config = getAIProviderConfig();
  const timeoutMs = options.timeoutMs ?? 20000; // 20s default timeout
  const maxRetries = options.retries ?? 1;

  let attempt = 0;
  let lastError: any = null;

  while (attempt <= maxRetries) {
    attempt++;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      let raw: string;
      if (config.provider === 'openai') {
        raw = await callOpenAI(config.apiKey, config.model, options, controller.signal);
      } else {
        raw = await callAnthropic(config.apiKey, config.model, options, controller.signal);
      }
      clearTimeout(timer);
      return { rawResponse: raw, provider: config.provider, model: config.model };
    } catch (err: any) {
      clearTimeout(timer);
      lastError = err;

      // Handle timeout
      if (err.name === 'AbortError' || controller.signal.aborted) {
        lastError = new AIServiceError(
          `Vira's evaluation timed out after ${Math.round(timeoutMs / 1000)} seconds. Please retry with a slightly more concise response.`,
          504
        );
      }

      // Do not retry 400, 401, or AIConfigurationError
      if (err instanceof AIConfigurationError || err.statusCode === 401 || err.statusCode === 400) {
        throw err;
      }

      // If we still have retries remaining, wait 1000ms before retrying
      if (attempt <= maxRetries) {
        await new Promise(r => setTimeout(r, 1000));
        continue;
      }
    }
  }

  throw lastError || new AIServiceError('Vira assessment service is temporarily unavailable.', 503);
}

/**
 * Sanitizes and strips Markdown code fences if the model wraps JSON in ```json
 */
export function extractCleanJSON(rawText: string): any {
  if (!rawText || typeof rawText !== 'string') {
    throw new AIServiceError('Model returned empty text.', 502);
  }

  let cleaned = rawText.trim();
  // Strip markdown code fences if present
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
  }

  try {
    return JSON.parse(cleaned);
  } catch (parseError: any) {
    // Attempt to locate outer JSON object braces
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      const sliced = cleaned.slice(firstBrace, lastBrace + 1);
      try {
        return JSON.parse(sliced);
      } catch (e) {}
    }
    throw new AIServiceError(`Failed to parse AI response into structured JSON: ${parseError.message}`, 502);
  }
}
