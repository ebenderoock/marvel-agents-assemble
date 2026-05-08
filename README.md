# 🦸 Marvel Agents — Copilot CLI Extension

Summon Marvel characters as coding personas in your [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) sessions. Each character brings their own personality, specialty, and analysis tools — from Iron Man's architecture reviews to Deadpool's R-rated code roasts.

## Features

- **37 characters** — Each with a unique personality, specialty tool, and analysis framework
- **Summon & dismiss** — Channel a character and all responses adopt their voice
- **Character tools** — Focused analysis tools (e.g., `marvel_ironman_architect`, `marvel_black_widow_security`)
- **Assemble** — Multi-agent parallel reviews with preset workflows: `code_review`, `security_sweep`, `deploy_check`, `refactor_plan`, `full_avengers`
- **Battle** — Pit two characters against each other with cross-examination rounds, judged by The Watcher
- **Marvel commits** — Commit as your active character with auto-sanitized messages
- **Content rating** — Deadpool and Wolverine get R-rated mode; Captain America reacts to profanity with "Language!"

## Install

### One-liner (user-level, all repos)

```bash
curl -fsSL https://raw.githubusercontent.com/ebenderoock/marvel-agents-assemble/main/install.sh | bash
```

### Clone (project-level, this repo only)

```bash
git clone https://github.com/ebenderoock/marvel-agents-assemble.git
cd marvel-agents-assemble
```

The extension loads automatically from `.github/extensions/marvel-agents/` when you run `copilot` in the repo.

### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/ebenderoock/marvel-agents-assemble/main/install.sh | bash -s -- --uninstall
```

## Quick Start

```
copilot
> marvel_summon deadpool
> marvel_ironman_architect src/
> marvel_assemble --preset code_review --target src/
> marvel_battle --character1 ironman --character2 thor --target src/
```

## Requirements

- [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) installed
- Active Copilot subscription
