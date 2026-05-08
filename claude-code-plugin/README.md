<!-- AUTO-GENERATED from characters.json — DO NOT EDIT -->
# 🦸 Marvel Agents — Claude Code Plugin

Summon Marvel characters as coding specialists in [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Each character brings their own personality, specialty, and analysis framework.

## Install

Copy or symlink the `claude-code-plugin/` directory into your project:

```bash
# From the repo root
cp -r claude-code-plugin/.claude-plugin .claude-plugin
cp -r claude-code-plugin/agents agents
cp -r claude-code-plugin/skills skills
```

Or symlink for auto-updates:

```bash
ln -s path/to/marvel-agents-assemble/claude-code-plugin/.claude-plugin .claude-plugin
ln -s path/to/marvel-agents-assemble/claude-code-plugin/agents agents
ln -s path/to/marvel-agents-assemble/claude-code-plugin/skills skills
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

## Characters

38 characters with review mode (read-only) and 32 with engineer mode (full access).

See the `marvel-roster` skill for the complete list and recommended team compositions.

## Generated Files

All agent and skill files are auto-generated from `characters.json`. To regenerate:

```bash
node scripts/generate-plugins.mjs --target claude
```

To check if files are up-to-date (CI):

```bash
node scripts/generate-plugins.mjs --target claude --check
```
