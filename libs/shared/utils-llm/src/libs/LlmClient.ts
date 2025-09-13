import OpenAI from 'openai';
import { OPEN_ROUTER_API_KEY } from '../constant';
import { LlmModel } from './LlmModel';

export class LlmClient {
  private readonly openRouterClient = new OpenAI({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: OPEN_ROUTER_API_KEY,
  });

  async completion(model: LlmModel, messages: { role: 'system' | 'user' | 'assistant'; content: string }[]) {
    const completion = await this.openRouterClient.chat.completions.create({
      model,
      messages,
    });

    return completion.choices[0].message;
  }
}
