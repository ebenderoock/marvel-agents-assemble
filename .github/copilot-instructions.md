# Copilot Instructions — Marvel Agents Extension

## Project Overview

This is a **GitHub Copilot CLI extension** called "Marvel Agents" that lets users summon Marvel characters as coding personas during CLI sessions. It uses the `@github/copilot-sdk/extension` SDK.

## Architecture

The extension lives entirely in `.github/extensions/marvel-agents/` and consists of two files:

- **`extension.mjs`** — The extension entry point. Registers tools and hooks via `joinSession()` from the Copilot SDK. Contains:
  - **Core tools**: `summon`, `dismiss`, `roster`, `commit`, `status`, `assemble`, `battle`
  - **Character-specific tools**: Dynamically generated from `characters.json` (one analysis tool per character, e.g., `ironman_architect`)
  - **Profanity sanitization**: A `PROFANITY_MAP` dictionary that sanitizes commit messages via exact word-boundary matching. The detection set (`PROFANITY_WORDS`) is derived from the map keys — add new entries to `PROFANITY_MAP` only.
  - **Session-scoped state**: `activeCharacters` Map keyed by `sessionId`, capped at 100 entries with LRU eviction
  - **News feed**: Fetches Marvel RSS headlines with 30-min TTL cache (Deadpool-exclusive feature)
  - **Orchestration workflows**: `buildAssembleResult()` and `buildBattleResult()` generate multi-agent prompt instructions for parallel review and debate patterns
  - **`onUserPromptSubmitted` hook**: Injects character personality, content rating (R for Deadpool/Wolverine, PG-13 otherwise), and immersion rules into `additionalContext`

- **`characters.json`** — Data file defining all Marvel characters. Each entry includes: `name`, `alias`, `emoji`, `specialty`, `personality`, `toolName`, `toolDescription`, `analysisPoints`, `responseInstruction`, `trivia`, quotes, and `gitEmail`. To add a new character, add an entry here — the extension auto-generates the corresponding tool.

## Key Conventions

- **No build step** — The extension is raw ESM (`extension.mjs`) loaded directly by the Copilot CLI runtime. No transpilation or bundling.
- **Tool registration pattern** — Tools are plain objects with `name`, `description`, `parameters` (JSON Schema), and an async `handler(args, invocation)` function. All tools are passed to `joinSession({ tools: [...] })`.
- **Commit message sanitization** — `commit` writes messages to a temp file (`git commit -F`) to avoid shell injection. Messages are sanitized through `PROFANITY_MAP` before commit. The Copilot co-author trailer is appended automatically.
- **Security**: `commit` validates `cwd` is an absolute path, exists, is a directory, and contains `.git` before any `execSync` call. Git operations have a 10-second timeout.
- **Content rating system** — Deadpool and Wolverine get R-rated mode (uncensored); Captain America reacts to user profanity with "Language!"; all others are PG-13.

## MCP Configuration

The repo has a `.mcp.json` configuring `shadcn` via `npx shadcn@latest mcp`. This appears to be unrelated to the Marvel Agents extension itself.
