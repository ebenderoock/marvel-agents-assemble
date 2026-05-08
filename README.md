# 🦸 Marvel Agents — Copilot CLI Extension

Summon Marvel characters as coding personas in your [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) sessions. Each character brings their own personality, specialty, and analysis tools — from Iron Man's architecture reviews to Deadpool's R-rated code roasts.

## Features

- **38 characters** — Each with a unique personality, specialty tool, and analysis framework
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

## Tools

### Core Tools

| Tool | Description |
|------|-------------|
| `marvel_summon` | Summon a character — all responses adopt their personality until dismissed |
| `marvel_dismiss` | Dismiss the active character and return to normal mode |
| `marvel_roster` | Display all available characters and their specialties |
| `marvel_status` | Quick check which character is currently active |
| `marvel_commit` | Create a git commit signed by the active character (auto-sanitizes profanity) |
| `marvel_assemble` | Launch a multi-agent parallel review with a preset or custom team |
| `marvel_battle` | Pit two characters against each other with cross-examination, judged by The Watcher |

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
| 🦾 | Iron Man | `ironman` | Architecture & System Design | `marvel_ironman_architect` |
| ⚡ | Thor | `thor` | Performance & Benchmarking | `marvel_thor_benchmark` |
| 🕷️ | Black Widow | `black_widow` | Security Auditing | `marvel_black_widow_security` |
| 💀 | Deadpool | `deadpool` | Brutally Honest Code Review | `marvel_deadpool_roast` |
| 🕸️ | Spider-Man | `spiderman` | Web & Frontend Development | `marvel_spiderman_web_check` |
| 🏹 | Hawkeye | `hawkeye` | Precision Debugging | `marvel_hawkeye_debug` |
| 🛡️ | Captain America | `captain_america` | Code Standards & Best Practices | `marvel_captain_america_standards` |
| 🚀 | Star-Lord | `starlord` | DevOps & CI/CD | `marvel_starlord_deploy` |
| 🦝 | Rocket Raccoon | `rocket` | Scripting & Automation | `marvel_rocket_automate` |
| 🌳 | Groot | `groot` | Documentation | `marvel_groot_document` |
| 🦋 | Mantis | `mantis` | UX & Accessibility | `marvel_mantis_ux_review` |
| 💚 | Hulk | `hulk` | Stress Testing & Breaking Things | `marvel_hulk_smash_test` |
| 🔮 | Doctor Strange | `doctor_strange` | Complex Debugging & Root Cause Analysis | `marvel_doctor_strange_diagnose` |
| 👁️ | Nick Fury | `nick_fury` | Project Management & Oversight | `marvel_nick_fury_assemble` |
| 🐍 | Loki | `loki` | Chaos Engineering & Edge Cases | `marvel_loki_chaos` |
| 🔴 | Scarlet Witch | `scarlet_witch` | Refactoring & Code Transformation | `marvel_scarlet_witch_refactor` |
| 🛡️🎫 | Happy Hogan | `happy` | QA Gatekeeper & PR Reviews | `marvel_happy_qa_gate` |
| 🐾 | Black Panther | `black_panther` | API Design & Contracts | `marvel_black_panther_api` |
| 🐜 | Ant-Man | `antman` | Micro-optimization & Code Golf | `marvel_antman_optimize` |
| 🦅 | Falcon | `falcon` | Migration & Upgrades | `marvel_falcon_migrate` |
| 🤖 | Vision | `vision` | Type Systems & Static Analysis | `marvel_vision_typecheck` |
| 🕷️⚡ | Miles Morales | `miles` | Mobile Development | `marvel_miles_mobile` |
| 💜 | Thanos | `thanos` | Technical Debt Reduction | `marvel_thanos_snap` |
| 🤖💀 | Ultron | `ultron` | Ground-Up Rewrites & System Redesign | `marvel_ultron_rewrite` |
| 🔫 | War Machine | `war_machine` | Incident Response & On-Call | `marvel_war_machine_incident` |
| 🧪 | Shuri | `shuri` | R&D & Prototyping | `marvel_shuri_prototype` |
| 📚 | Wong | `wong` | Backend Engineering & Data Architecture | `marvel_wong_backend` |
| 🐺 | Wolverine | `wolverine` | Resilience & Reliability Engineering | `marvel_wolverine_resilience` |
| 🕸️✨ | Ghost-Spider | `ghost_spider` | Cross-Platform & Design Systems | `marvel_ghost_spider_cross_platform` |
| 🌩️ | Storm | `storm` | Cloud Architecture & Distributed Systems | `marvel_storm_cloud` |
| 🧲 | Magneto | `magneto` | Data Engineering & Transformation | `marvel_magneto_data` |
| 🃏 | Gambit | `gambit` | Risk Analysis & Probabilistic Systems | `marvel_gambit_risk` |
| 🦾💜 | Nebula | `nebula` | Legacy System Modernization | `marvel_nebula_modernize` |
| 🔴 | Daredevil | `daredevil` | Accessibility Testing & Compliance | `marvel_daredevil_a11y` |
| 🧠 | Professor X | `professor_x` | Data Science, ML & AI | `marvel_professor_x_ml` |
| 🌐 | Heimdall | `heimdall` | Networking & Infrastructure | `marvel_heimdall_network` |
| 🪂 | Peter W. | `peter_w` | Fresh Eyes & Junior Dev Perspective | `marvel_peter_w_fresh_eyes` |
| 👁️‍🗨️ | The Watcher | `the_watcher` | Battlefield Moderator & Synthesis | `marvel_watcher_observe` |

## Usage Examples

**Summon a character** — all responses adopt their voice:
```
marvel_summon deadpool
```

**Run a focused analysis** — use any character's tool without summoning them:
```
marvel_ironman_architect src/api/
marvel_black_widow_security auth.js
```

**Multi-agent code review** — 5 characters review in parallel, The Watcher synthesizes:
```
marvel_assemble --preset code_review --target src/
```

**Custom team** — pick your own squad:
```
marvel_assemble --characters ironman,black_widow,loki --target src/database/
```

**Battle** — two characters debate, cross-examine, and The Watcher judges:
```
marvel_battle --character1 ironman --character2 thanos --target src/legacy/ --concern "refactor vs rewrite"
```

**Commit as a character** — message is auto-sanitized for SFW git history:
```
marvel_summon deadpool
marvel_commit --message "Fixed the auth bug" --stageAll true
```

## Requirements

- [GitHub Copilot CLI](https://docs.github.com/copilot/concepts/agents/about-copilot-cli) installed
- Active Copilot subscription

## Author

Created by [Eben de Roock](https://github.com/ebenderoock)
