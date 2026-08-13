const Anthropic = require('@anthropic-ai/sdk');
const { anthropicApiKey, anthropicModel } = require('../../config/env');

// The paid fallback (docs/adr/0002). Kept behind the same ILLMProvider
// shape as GroqProvider so ProviderRegistry never needs to know which
// concrete SDK it's talking to.
class ClaudeProvider {
  constructor() {
    this.name = 'claude';
    this.client = new Anthropic({ apiKey: anthropicApiKey });
  }

  async generate(systemPrompt, messages) {
    const response = await this.client.messages.create({
      model: anthropicModel,
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    });
    return response.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');
  }
}

module.exports = ClaudeProvider;
