import OpenAI from 'openai';

import { OPEN_ROUTER_API_KEY } from '../constant';
import type { LlmModel } from './LlmModel';

export class LlmClient {
  private openRouterClient?: OpenAI;

  private getClient() {
    if (!OPEN_ROUTER_API_KEY) {
      throw new Error('OPEN_ROUTER_API_KEY not provided at utils-llm');
    }

    this.openRouterClient ??= new OpenAI({
      baseURL: 'https://openrouter.ai/api/v1',
      apiKey: OPEN_ROUTER_API_KEY,
    });

    return this.openRouterClient;
  }

  async completion(model: LlmModel, messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
    const completion = await this.getClient().chat.completions.create({
      model,
      messages,
    });

    const message = completion.choices[0]?.message;

    if (!message) {
      throw new Error(`LLM completion is empty for model: ${model}`);
    }

    return message;
  }
}
