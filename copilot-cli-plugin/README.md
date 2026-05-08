<!-- AUTO-GENERATED from characters.json — DO NOT EDIT -->
# 🦸 Marvel Agents — Copilot CLI Plugin

Summon Marvel characters as coding specialists in [GitHub Copilot CLI](https://docs.github.com/en/copilot/github-copilot-in-the-cli). Each character brings their own personality, specialty, and analysis framework.

## Install

Install the plugin from the local directory:

```bash
# From the repo root
copilot plugin install ./copilot-cli-plugin
```

Or copy the plugin files into your project's `.github/` directory:

```bash
cp -r copilot-cli-plugin/.github/plugin .github/plugin
cp -r copilot-cli-plugin/agents agents
cp -r copilot-cli-plugin/skills skills
```

## Usage

**Delegate to a character:**
```
Have Iron Man review my architecture in src/
```

**Use the engineer variant for changes:**
```
Fix this auth bug as Wolverine (engineer mode)
```

**Browse available agents:**
```
Show me the Marvel roster
```

**Team review (assemble):**
```
Use marvel-assemble with the code_review preset on src/api/
```

## Characters

38 characters with review mode (read-only) and 32 with engineer mode (full access).

See the `marvel-roster` skill for the complete list and recommended team compositions.

## Generated Files

All agent and skill files are auto-generated from `characters.json`. To regenerate:

```bash
node scripts/generate-plugins.mjs --target copilot
```

To check if files are up-to-date (CI):

```bash
node scripts/generate-plugins.mjs --target copilot --check
```
