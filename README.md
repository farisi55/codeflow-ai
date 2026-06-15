# CodeFlow AI

AI-Native Web IDE with Multi-Provider AI Orchestration, Agentic Coding, Smart Routing, Smart Fallback, Integrated Terminal, and Live Preview.

## Overview

CodeFlow AI adalah web-based code editor yang terinspirasi dari VS Code namun berfokus pada AI-assisted development.

### Key Features

- Project Explorer
- Monaco Editor
- Agentic AI Assistant
- Multi-Provider AI
- Smart Routing
- Smart Fallback
- Internet Browsing (Tavily + Firecrawl)
- Integrated Terminal
- Live Preview
- Docker Deployment
- Self Hosted

## AI Providers

- OpenCode
- Cloudflare AI
- GitHub Models
- OpenRouter
- Groq
- Gemini
- Mistral
- SambaNova
- ZAI
- Ollama

## Installation

```bash
git clone <repository>
cd codeflow-ai
docker compose up -d
```

## Environment Variables

### GitHub Models

```env
GITHUB_MODELS_API_KEY=
GITHUB_MODELS_DEFAULT_MODEL=openai/gpt-4.1-mini
```

### Cloudflare AI

```env
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=
```

### Tavily

```env
TAVILY_API_KEY=
```

### Firecrawl

```env
FIRECRAWL_API_KEY=
```

## Architecture

```text
Browser
   |
Frontend (Next.js)
   |
Backend (NestJS)
   |
AI Gateway
   |
+-- OpenCode
+-- GitHub Models
+-- Cloudflare AI
+-- OpenRouter
+-- Groq
+-- Gemini
+-- Ollama
```

# FAQ

## Why do I see "Skipping github: not available (no credentials)"?

The API key is not available inside the Docker container.

Verify:

```bash
docker exec -it codeflow-ai-api-1 env
```

## Why are only Ollama providers available?

Docker cannot see your API keys.

Check:

- `.env`
- docker compose environment mapping
- container environment variables

## Why is Preview blank?

Verify:

- index.html exists
- Preview service is enabled

## Why does web browsing not trigger?

Use prompts such as:

- Search official documentation
- Browse latest docs
- Find latest SDK examples

## Why does AI generate only one file?

The model must output structured multi-file responses:

```text
FILE: index.html
FILE: style.css
FILE: script.js
```

## Why does Ollama return 503?

Ollama is not running or inaccessible.

Test:

```bash
curl http://ollama:11434/api/tags
```

# Roadmap

## Completed

- AI Gateway
- OpenCode Integration
- Cloudflare AI
- GitHub Models
- Smart Routing
- Smart Fallback
- Integrated Terminal
- Live Preview
- Web Browsing

## Planned

- Git Integration
- Workspace Memory
- Autonomous Agent
- RAG Context Engine
- Multi-Agent Collaboration
