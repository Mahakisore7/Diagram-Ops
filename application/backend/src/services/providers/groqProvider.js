const OpenAI = require('openai');
const { groqApiKey, groqModel } = require('../../config/env');

// Groq exposes an OpenAI-compatible API, so the official `openai` SDK works
// against it unchanged — only the baseURL and API key point at Groq.
// See docs/adr/0009-provider-behind-interface.md: this class is one of two
// interchangeable implementations of the same shape (name + generate()).
class GroqProvider {
  constructor() {
    this.name = 'groq';
    this.client = new OpenAI({
      apiKey: groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });
  }

  async generate(systemPrompt, messages) {
    const response = await this.client.chat.completions.create({
      model: groqModel,
      messages: [{ role: 'system', content: systemPrompt }, ...messages],
      temperature: 0.2,
    });
    return response.choices[0].message.content;
  }
}

module.exports = GroqProvider;
