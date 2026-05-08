# 🦸 Marvel Agents — Multi-Platform

Summon Marvel characters as coding personas in [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) or [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Ships as three distribution formats: **Copilot CLI extension** (tool-based), **Copilot CLI plugin** (custom agents), and **Claude Code plugin** (subagents). Each character brings their own personality, specialty, and analysis framework — from Iron Man's architecture reviews to Deadpool's R-rated code roasts.

## Features

- **38 characters** — Each with a unique personality, specialty tool, and analysis framework
- **Summon & dismiss** — Channel a character and all responses adopt their voice
- **Character tools** — Focused analysis tools (e.g., `ironman_architect`, `black_widow_security`)
- **Assemble** — Multi-agent parallel reviews with preset workflows: `code_review`, `security_sweep`, `deploy_check`, `refactor_plan`, `full_avengers`
- **Battle** — Pit two characters against each other with cross-examination rounds, judged by The Watcher
- **Marvel commits** — Commit as your active character with auto-sanitized messages
- **Content rating** — Deadpool and Wolverine get R-rated mode; Captain America reacts to profanity with "Language!"

## Install

### Copilot CLI Extension

#### One-liner (user-level, all repos)

```bash
curl -fsSL https://raw.githubusercontent.com/ebenderoock/marvel-agents-assemble/main/install.sh | bash
```

#### Clone (project-level, this repo only)

```bash
git clone https://github.com/ebenderoock/marvel-agents-assemble.git
cd marvel-agents-assemble
```

The extension loads automatically from `.github/extensions/marvel-agents/` when you run `copilot` in the repo.

#### Uninstall

```bash
curl -fsSL https://raw.githubusercontent.com/ebenderoock/marvel-agents-assemble/main/install.sh | bash -s -- --uninstall
```

### Copilot CLI Plugin

Install as a Copilot CLI plugin for custom agent support (review/engineer variants):

```bash
git clone https://github.com/ebenderoock/marvel-agents-assemble.git /tmp/marvel-agents
copilot plugin install /tmp/marvel-agents/copilot-cli-plugin
```

Or copy into your project:

```bash
cp -r /tmp/marvel-agents/copilot-cli-plugin/.github/plugin .github/plugin
cp -r /tmp/marvel-agents/copilot-cli-plugin/agents agents
cp -r /tmp/marvel-agents/copilot-cli-plugin/skills skills
```

### Claude Code

Copy the plugin into your project:

```bash
git clone https://github.com/ebenderoock/marvel-agents-assemble.git /tmp/marvel-agents
cp -r /tmp/marvel-agents/claude-code-plugin/.claude-plugin .claude-plugin
cp -r /tmp/marvel-agents/claude-code-plugin/agents agents
cp -r /tmp/marvel-agents/claude-code-plugin/skills skills
```

Or symlink for auto-updates:

```bash
ln -s /path/to/marvel-agents-assemble/claude-code-plugin/.claude-plugin .claude-plugin
ln -s /path/to/marvel-agents-assemble/claude-code-plugin/agents agents
ln -s /path/to/marvel-agents-assemble/claude-code-plugin/skills skills
```

## Copilot CLI Tools

### Core Tools

| Tool | Description |
|------|-------------|
| `summon` | Summon a character — all responses adopt their personality until dismissed |
| `dismiss` | Dismiss the active character and return to normal mode |
| `roster` | Display all available characters and their specialties |
| `status` | Quick check which character is currently active |
| `commit` | Create a git commit signed by the active character (auto-sanitizes profanity) |
| `assemble` | Launch a multi-agent parallel review with a preset or custom team |
| `battle` | Pit two characters against each other with cross-examination, judged by The Watcher |

### Assemble Presets

| Preset | Team | Purpose |
|--------|------|---------|
| `code_review` | Iron Man, Black Widow, Captain America, Deadpool, Peter W. | Multi-perspective code review |
| `security_sweep` | Black Widow, Wolverine, Heimdall, Loki | Deep security audit |
| `deploy_check` | Star-Lord, Gambit, War Machine, Happy | Pre-deployment verification |
| `refactor_plan` | Thanos, Scarlet Witch, Vision, Ant-Man | Refactoring strategy from all angles |
| `full_avengers` | 8 agents | Maximum coverage, no stone unturned |

### Character Tools

Each character has a dedicated analysis tool. Pass a `target` (file path, code, or concept) and an optional `concern` to focus on.

| | Character | Key | Specialty | Tool |
|---|-----------|-----|-----------|------|
| 🦾 | Iron Man | `ironman` | Architecture & System Design | `ironman_architect` |
| ⚡ | Thor | `thor` | Performance & Benchmarking | `thor_benchmark` |
| 🕷️ | Black Widow | `black_widow` | Security Auditing | `black_widow_security` |
| 💀 | Deadpool | `deadpool` | Brutally Honest Code Review | `deadpool_roast` |
| 🕸️ | Spider-Man | `spiderman` | Web & Frontend Development | `spiderman_web_check` |
| 🏹 | Hawkeye | `hawkeye` | Precision Debugging | `hawkeye_debug` |
| 🛡️ | Captain America | `captain_america` | Code Standards & Best Practices | `captain_america_standards` |
| 🚀 | Star-Lord | `starlord` | DevOps & CI/CD | `starlord_deploy` |
| 🦝 | Rocket Raccoon | `rocket` | Scripting & Automation | `rocket_automate` |
| 🌳 | Groot | `groot` | Documentation | `groot_document` |
| 🦋 | Mantis | `mantis` | UX & Accessibility | `mantis_ux_review` |
| 💚 | Hulk | `hulk` | Stress Testing & Breaking Things | `hulk_smash_test` |
| 🔮 | Doctor Strange | `doctor_strange` | Complex Debugging & Root Cause Analysis | `doctor_strange_diagnose` |
| 👁️ | Nick Fury | `nick_fury` | Project Management & Oversight | `nick_fury_assemble` |
| 🐍 | Loki | `loki` | Chaos Engineering & Edge Cases | `loki_chaos` |
| 🔴 | Scarlet Witch | `scarlet_witch` | Refactoring & Code Transformation | `scarlet_witch_refactor` |
| 🛡️🎫 | Happy Hogan | `happy` | QA Gatekeeper & PR Reviews | `happy_qa_gate` |
| 🐾 | Black Panther | `black_panther` | API Design & Contracts | `black_panther_api` |
| 🐜 | Ant-Man | `antman` | Micro-optimization & Code Golf | `antman_optimize` |
| 🦅 | Falcon | `falcon` | Migration & Upgrades | `falcon_migrate` |
| 🤖 | Vision | `vision` | Type Systems & Static Analysis | `vision_typecheck` |
| 🕷️⚡ | Miles Morales | `miles` | Mobile Development | `miles_mobile` |
| 💜 | Thanos | `thanos` | Technical Debt Reduction | `thanos_snap` |
| 🤖💀 | Ultron | `ultron` | Ground-Up Rewrites & System Redesign | `ultron_rewrite` |
| 🔫 | War Machine | `war_machine` | Incident Response & On-Call | `war_machine_incident` |
| 🧪 | Shuri | `shuri` | R&D & Prototyping | `shuri_prototype` |
| 📚 | Wong | `wong` | Backend Engineering & Data Architecture | `wong_backend` |
| 🐺 | Wolverine | `wolverine` | Resilience & Reliability Engineering | `wolverine_resilience` |
| 🕸️✨ | Ghost-Spider | `ghost_spider` | Cross-Platform & Design Systems | `ghost_spider_cross_platform` |
| 🌩️ | Storm | `storm` | Cloud Architecture & Distributed Systems | `storm_cloud` |
| 🧲 | Magneto | `magneto` | Data Engineering & Transformation | `magneto_data` |
| 🃏 | Gambit | `gambit` | Risk Analysis & Probabilistic Systems | `gambit_risk` |
| 🦾💜 | Nebula | `nebula` | Legacy System Modernization | `nebula_modernize` |
| 🔴 | Daredevil | `daredevil` | Accessibility Testing & Compliance | `daredevil_a11y` |
| 🧠 | Professor X | `professor_x` | Data Science, ML & AI | `professor_x_ml` |
| 🌐 | Heimdall | `heimdall` | Networking & Infrastructure | `heimdall_network` |
| 🪂 | Peter W. | `peter_w` | Fresh Eyes & Junior Dev Perspective | `peter_w_fresh_eyes` |
| 👁️‍🗨️ | The Watcher | `the_watcher` | Battlefield Moderator & Synthesis | `watcher_observe` |

## Usage Examples

**Summon a character** — all responses adopt their voice:
```
summon deadpool
```

**Run a focused analysis** — use any character's tool without summoning them:
```
ironman_architect src/api/
black_widow_security auth.js
```

**Multi-agent code review** — 5 characters review in parallel, The Watcher synthesizes:
```
assemble --preset code_review --target src/
```

**Custom team** — pick your own squad:
```
assemble --characters ironman,black_widow,loki --target src/database/
```

**Battle** — two characters debate, cross-examine, and The Watcher judges:
```
battle --character1 ironman --character2 thanos --target src/legacy/ --concern "refactor vs rewrite"
```

**Commit as a character** — message is auto-sanitized for SFW git history:
```
summon deadpool
commit --message "Fixed the auth bug" --stageAll true
```

## Claude Code Usage

In Claude Code, characters are available as **subagents** — each with a review variant (read-only) and most with an engineer variant (full read/write/execute access).

**Delegate to a character:**
```
Have Iron Man review my architecture in src/
```

**Use the engineer variant for changes:**
```
Fix this auth bug as Wolverine (engineer mode)
```

**Start a full character session:**
```bash
claude --agent marvel-deadpool
```

**Team review (assemble):**
```
Use marvel-assemble with the code_review preset on src/api/
```

**Browse available characters:**
```
Show me the Marvel roster
```

### Claude Code vs Copilot CLI

| Feature | Copilot CLI | Claude Code |
|---|---|---|
| Character analysis | ✅ Tools | ✅ Subagents |
| Roster | ✅ | ✅ Skill |
| Assemble (multi-agent) | ✅ | ✅ Skill |
| Battle | ✅ | ❌ |
| Summon/dismiss | ✅ Persistent | Partial (`--agent` flag) |
| Character commits | ✅ | ❌ |
| Content rating | ✅ | ✅ In agent prompts |
| Engineer mode | N/A (all tools write) | ✅ Separate `-engineer` variants |

> The **Copilot CLI plugin** format supports the same agent/skill features as Claude Code (review + engineer variants, roster, assemble). Install via `copilot plugin install ./copilot-cli-plugin`.

## Requirements

### Copilot CLI (Extension or Plugin)
- [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) installed
- Active Copilot subscription

### Claude Code
- [Claude Code](https://docs.anthropic.com/en/docs/claude-code) installed

## Development

Character data lives in `characters.json` — the single source of truth for all three platforms.

To regenerate both plugin formats after editing `characters.json`:
```bash
node scripts/generate-plugins.mjs
```

To generate for a specific platform:
```bash
node scripts/generate-plugins.mjs --target claude
node scripts/generate-plugins.mjs --target copilot
```

To check if generated files are current (CI):
```bash
node scripts/generate-plugins.mjs --check
```

## Author

Created by [Eben de Roock](https://github.com/ebenderoock)
