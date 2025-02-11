#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import Anthropic from '@anthropic-ai/sdk';

// This will be provided via environment variable
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

if (!ANTHROPIC_API_KEY) {
  throw new Error('ANTHROPIC_API_KEY environment variable is required');
}

const anthropic = new Anthropic({
  apiKey: ANTHROPIC_API_KEY,
});

const VALID_MODELS = [
  'claude-3-opus-latest',
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-3-haiku-20240307'
];

const server = new Server(
  {
    name: "twosplit",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "twosplit",
        description: "Get multiple AI perspectives and combine them into the best response",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "The prompt to send to the AI"
            },
            model: {
              type: "string",
              description: "The Claude model to use (claude-3-opus-latest, claude-3-5-sonnet-latest, claude-3-5-haiku-latest, claude-3-haiku-20240307)",
              enum: VALID_MODELS
            }
          },
          required: ["prompt", "model"]
        }
      }
    ]
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  if (request.params.name !== "twosplit") {
    throw new Error("Unknown tool");
  }

  const prompt = String(request.params.arguments?.prompt);
  const model = String(request.params.arguments?.model);

  if (!prompt || !model) {
    throw new Error("Prompt and model are required");
  }

  if (!VALID_MODELS.includes(model)) {
    throw new Error(`Invalid model. Must be one of: ${VALID_MODELS.join(', ')}`);
  }

  try {
    // Modify the prompt to ensure a single, direct response
    const enhancedPrompt = `${prompt}\n\nProvide exactly one response. Do not provide multiple options or ask follow-up questions.`;

    // Get two independent responses
    const [response1, response2] = await Promise.all([
      anthropic.messages.create({
        model: model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: enhancedPrompt }],
      }),
      anthropic.messages.create({
        model: model,
        max_tokens: 1024,
        messages: [{ role: 'user', content: enhancedPrompt }],
      })
    ]);

    // Extract text content from responses
    const text1 = response1.content.map(block => {
      if ('text' in block) return block.text;
      return '';
    }).join('');

    const text2 = response2.content.map(block => {
      if ('text' in block) return block.text;
      return '';
    }).join('');

    // Get a third response to combine/select from the first two
    const combinationPrompt = `You are tasked with creating the best possible response by either selecting one response entirely or combining elements from both responses. Here are two responses to this prompt: "${prompt}"

Response 1:
${text1}

Response 2:
${text2}

Your task:
1. Create the best possible response by either:
   - Using one response entirely if it's clearly superior
   - OR combining the best elements from both responses
2. Then list which parts came from which response

Important: Provide exactly one response. Do not provide multiple options or ask follow-up questions.

Format your response exactly like this:
[Your complete response with no explanations or commentary]
---
SOURCES:
[List which parts came from Response 1 vs Response 2]`;

    const finalResponse = await anthropic.messages.create({
      model: model,
      max_tokens: 1024,
      messages: [{ role: 'user', content: combinationPrompt }],
    });

    const finalText = finalResponse.content.map(block => {
      if ('text' in block) return block.text;
      return '';
    }).join('');

    // Split at --- to separate response and sources
    const [response, sources] = finalText.split('---').map(s => s.trim());

    // Add the additional output
    const fullOutput = `${response}

=== AI 1 Output ===
${text1}

=== AI 2 Output ===
${text2}

=== Source Attribution ===
${sources}`;

    // Return the response with additional information
    return {
      content: [{
        type: "text",
        text: fullOutput
      }]
    };

  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
    throw error;
  }
});

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Twosplit MCP server running on stdio");
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
