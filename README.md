# Twosplit MCP Server

An MCP server that leverages multiple Claude instances to provide enhanced responses. It sends the same prompt to two separate instances of Claude and uses a third instance to combine or select the best elements from both responses.

## Features

- Supports multiple Claude models:
  - claude-3-opus-latest
  - claude-3-5-sonnet-latest
  - claude-3-5-haiku-latest
  - claude-3-haiku-20240307
- Gets single, direct responses from each AI
- Shows original responses and source attribution
- Returns optimized final response

## Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```
3. Build the server:
```bash
npm run build
```

## Configuration

The server requires an Anthropic API key to function. Set it as an environment variable:

```bash
export ANTHROPIC_API_KEY=your-api-key-here
```

## Usage

The server provides a single tool called `twosplit` with the following parameters:

- `prompt` (required): The prompt to send to Claude
- `model` (required): The Claude model to use (must be one of the supported models listed above)

Example tool usage in Claude:

```
<use_mcp_tool>
<server_name>twosplit</server_name>
<tool_name>twosplit</tool_name>
<arguments>
{
  "prompt": "Write a short story about a robot learning to paint",
  "model": "claude-3-5-sonnet-latest"
}
</arguments>
</use_mcp_tool>
```

The response will include:
1. The final optimized response
2. Original responses from both AIs
3. Source attribution showing which parts came from which AI

## How it Works

1. The server sends the same prompt to two separate instances of the specified Claude model, requesting a single direct response
2. A third instance analyzes both responses and either:
   - Selects the single best response if one is clearly superior
   - Creates a new response that combines the best elements from both responses
3. The final response, original responses, and source attribution are all included in the output

## Development

To run the server in watch mode during development:

```bash
npm run watch
```

To inspect the server's capabilities:

```bash
npm run inspector
