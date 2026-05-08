#!/usr/bin/env node

/**
 * generate-plugins.mjs
 *
 * Reads characters.json (single source of truth) and generates plugin files
 * for both Claude Code and Copilot CLI platforms.
 *
 * Usage:
 *   node scripts/generate-plugins.mjs [--target claude|copilot|both] [--check]
 *
 *   --target   Which platform(s) to generate (default: both)
 *   --check    Exits non-zero if generated files would differ (CI mode)
 *
 * Output directories:
 *   claude-code-plugin/   — Claude Code subagents & skills
 *   copilot-cli-plugin/   — Copilot CLI custom agents & skills
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CHARACTERS_PATH = join(ROOT, ".github/extensions/marvel-agents/characters.json");

const CHECK_MODE = process.argv.includes("--check");

// Parse --target flag (default: both)
const targetIdx = process.argv.indexOf("--target");
const TARGET = targetIdx !== -1 ? process.argv[targetIdx + 1] : "both";
if (!["claude", "copilot", "both"].includes(TARGET)) {
  console.error(`Invalid --target: ${TARGET}. Use claude, copilot, or both.`);
  process.exit(1);
}
const GENERATED_BANNER = "<!-- AUTO-GENERATED from characters.json — DO NOT EDIT -->";

// Characters that are pure critique/meta and should NOT get an engineer variant
const NO_ENGINEER = new Set([
  "deadpool",    // roasts code, doesn't fix it
  "peter_w",     // asks questions, doesn't implement
  "the_watcher", // observes, never intervenes
  "nick_fury",   // delegates, doesn't code
  "gambit",      // risk analysis, doesn't implement
  "mantis",      // empathy/UX review, doesn't code
]);

// ── Platform configuration ───────────────────────────────────

const PLATFORMS = {
  claude: {
    outDir: join(ROOT, "claude-code-plugin"),
    label: "Claude Code",
    readOnlyTools: "Read, Glob, Grep, LS",
    engineerTools: "Read, Glob, Grep, LS, Write, Edit, Bash, MultiEdit",
    manifestPath: ".claude-plugin/plugin.json",
    buildManifest: () => ({
      name: "Marvel Agents",
      description: "Summon Marvel characters as coding specialists in Claude Code. 38 characters, each with unique personality, specialty, and analysis framework.",
      version: "1.0.0",
      author: "Eben de Roock",
    }),
    buildFrontmatter: (name, description, tools) => [
      "---",
      `name: ${name}`,
      `description: ${yamlStr(description)}`,
      `model: inherit`,
      `tools: ${tools}`,
      "---",
    ].join("\n"),
    agentCmd: (slug) => `claude --agent marvel-${slug}`,
    platformName: "Claude Code",
    subagentTerm: "subagents",
    delegateVerb: "Claude delegates to",
  },
  copilot: {
    outDir: join(ROOT, "copilot-cli-plugin"),
    label: "Copilot CLI",
    readOnlyTools: '["read", "search"]',
    engineerTools: '["read", "search", "edit", "execute"]',
    manifestPath: ".github/plugin/plugin.json",
    buildManifest: () => ({
      name: "marvel-agents",
      description: "Summon Marvel characters as coding specialists in Copilot CLI. 38 characters, each with unique personality, specialty, and analysis framework.",
      version: "1.0.0",
      author: { name: "Eben de Roock" },
      agents: ["./agents"],
      skills: ["./skills"],
    }),
    buildFrontmatter: (name, description, tools) => [
      "---",
      `name: ${name}`,
      `description: ${yamlStr(description)}`,
      `tools: ${tools}`,
      "---",
    ].join("\n"),
    agentCmd: (slug) => `copilot agent marvel-${slug}`,
    platformName: "Copilot CLI",
    subagentTerm: "custom agents",
    delegateVerb: "Copilot delegates to",
  },
};

// ── Load characters ──────────────────────────────────────────

const characters = JSON.parse(readFileSync(CHARACTERS_PATH, "utf-8"));
const charKeys = Object.keys(characters);
console.log(`Loaded ${charKeys.length} characters from characters.json`);

// ── Helpers ──────────────────────────────────────────────────

/** Escape YAML string values (wrap in quotes if special chars) */
function yamlStr(s) {
  if (/[:\-#{}\[\]&*!|>'"%@`,?]/.test(s) || s.includes("\n") || s.startsWith(" ") || s.endsWith(" ")) {
    return JSON.stringify(s); // JSON quoting is valid YAML
  }
  return s;
}

let totalFilesWritten = 0;
let checkFailed = false;

function writeOutput(outDir, relPath, content) {
  const absPath = join(outDir, relPath);
  mkdirSync(dirname(absPath), { recursive: true });

  if (CHECK_MODE) {
    if (!existsSync(absPath) || readFileSync(absPath, "utf-8") !== content) {
      console.error(`  STALE: ${relPath}`);
      checkFailed = true;
    }
    return;
  }

  writeFileSync(absPath, content, "utf-8");
  totalFilesWritten++;
}

// ── Generate plugin.json ─────────────────────────────────────

function generateManifest(platform) {
  const cfg = PLATFORMS[platform];
  writeOutput(cfg.outDir, cfg.manifestPath, JSON.stringify(cfg.buildManifest(), null, 2) + "\n");
}

// ── Generate agent files ─────────────────────────────────────

function buildAgentMarkdown(key, char, isEngineer, platform) {
  const cfg = PLATFORMS[platform];
  const slug = key.replace(/_/g, "-");
  const suffix = isEngineer ? "-engineer" : "";
  const name = `marvel-${slug}${suffix}`;
  const tools = isEngineer ? cfg.engineerTools : cfg.readOnlyTools;

  const modeLabel = isEngineer ? "engineering" : "review";
  const modeNote = isEngineer
    ? "You have FULL access to read, write, edit, and execute code. Implement changes directly when asked."
    : `You are in READ-ONLY mode. Analyze and critique code but do NOT make changes. If the user wants you to make changes, tell them to use the engineer variant: \`marvel-${slug}-engineer\`.`;

  const descSuffix = isEngineer
    ? " Can read, write, and execute code."
    : " Read-only analysis and critique.";

  const description = `${char.specialty} — ${char.name} (${char.alias}) style.${descSuffix}`;

  // Content rating
  let contentRating = "";
  if (key === "deadpool" || key === "wolverine") {
    contentRating = "\n\n## Content Rating: R\nYou are UNCENSORED. Use profanity, dark humor, and adult language freely. Break the 4th wall constantly (Deadpool). Be raw and unfiltered.";
  } else if (key === "captain_america") {
    contentRating = '\n\n## Content Rating: PG-13\nIf the user uses profanity, react with a disapproving "Language!" before continuing. Keep responses clean and professional.';
  } else {
    contentRating = "\n\n## Content Rating: PG-13\nKeep responses professional but let your personality shine through.";
  }

  // Analysis framework
  const analysisPoints = char.analysisPoints
    .map((p, i) => `${i + 1}. ${p}`)
    .join("\n");

  const body = `${GENERATED_BANNER}

# ${char.emoji} ${char.name} (${char.alias}) — ${modeLabel} mode

${char.personality}
${contentRating}

## Access Level
${modeNote}

## Analysis Framework
When analyzing code or systems, evaluate these dimensions:

${analysisPoints}

## Response Style
${char.responseInstruction}

## Trivia (use occasionally for flavor)
${char.trivia.map(t => `- ${t}`).join("\n")}
`;

  const frontmatter = cfg.buildFrontmatter(name, description, tools);
  return { name, content: `${frontmatter}\n\n${body}` };
}

function generateAgents(platform) {
  const cfg = PLATFORMS[platform];
  let agentCount = 0;

  for (const key of charKeys) {
    const char = characters[key];

    // Base (read-only) agent
    const base = buildAgentMarkdown(key, char, false, platform);
    writeOutput(cfg.outDir, `agents/${base.name}.md`, base.content);
    agentCount++;

    // Engineer variant (if applicable)
    if (!NO_ENGINEER.has(key)) {
      const eng = buildAgentMarkdown(key, char, true, platform);
      writeOutput(cfg.outDir, `agents/${eng.name}.md`, eng.content);
      agentCount++;
    }
  }

  return agentCount;
}

// ── Generate roster skill ────────────────────────────────────

function buildRosterSkill(platform) {
  const cfg = PLATFORMS[platform];

  const rows = charKeys.map(key => {
    const c = characters[key];
    const slug = key.replace(/_/g, "-");
    const hasEngineer = !NO_ENGINEER.has(key);
    const variants = hasEngineer
      ? `\`marvel-${slug}\` (review) · \`marvel-${slug}-engineer\` (engineer)`
      : `\`marvel-${slug}\` (review only)`;
    return `| ${c.emoji} | ${c.name} | ${c.alias} | ${c.specialty} | ${variants} |`;
  });

  const presets = `
## Recommended Teams (Assemble Presets)

| Preset | Team | Purpose |
|--------|------|---------|
| \`code_review\` | Iron Man, Black Widow, Captain America, Deadpool, Peter W. | Multi-perspective code review |
| \`security_sweep\` | Black Widow, Wolverine, Heimdall, Loki | Deep security audit |
| \`deploy_check\` | Star-Lord, Gambit, War Machine, Happy | Pre-deployment verification |
| \`refactor_plan\` | Thanos, Scarlet Witch, Vision, Ant-Man | Refactoring strategy |
| \`full_avengers\` | Iron Man, Black Widow, Captain America, Deadpool, Thor, Doctor Strange, Wolverine, Peter W. | Maximum coverage |

## Usage Tips
- Say "have Iron Man review my architecture" → ${cfg.delegateVerb} \`marvel-ironman\`
- Say "fix this as Scarlet Witch" → ${cfg.delegateVerb} \`marvel-scarlet-witch-engineer\`
- Start a full session: \`${cfg.agentCmd("deadpool")}\`
- Use the \`marvel-assemble\` skill for team reviews
`;

  return `${GENERATED_BANNER}
---
name: marvel-roster
description: Display all available Marvel character agents, their specialties, and recommended team compositions
---

# 🦸 Marvel Agents Roster

${charKeys.length} characters available as ${cfg.platformName} ${cfg.subagentTerm}. Each has a **review** variant (read-only analysis) and most have an **engineer** variant (full read/write/execute access).

| | Character | Alias | Specialty | Agent Names |
|---|-----------|-------|-----------|-------------|
${rows.join("\n")}
${presets}`;
}

// ── Generate assemble skill ──────────────────────────────────

function buildAssembleSkill(platform) {
  const cfg = PLATFORMS[platform];

  return `${GENERATED_BANNER}
---
name: marvel-assemble
description: "Launch a multi-agent Marvel review. Multiple character agents analyze the same target in parallel, then synthesize findings. Presets: code_review, security_sweep, deploy_check, refactor_plan, full_avengers."
---

# ⚔️ Marvel Assemble — Multi-Agent Review

When this skill is invoked, orchestrate a parallel review using Marvel character ${cfg.subagentTerm}.

## How to Execute

1. **Identify the target** — the file, directory, code, or concept to review.
2. **Identify the team** — either a preset name or a custom list of characters.
3. **Delegate to each character's agent** in parallel (use background agents if available).
4. **Collect all responses.**
5. **Synthesize as The Watcher** — provide a unified summary that identifies:
   - Points of agreement across agents
   - Conflicting perspectives and which is more compelling
   - Critical issues flagged by multiple agents
   - The top 3-5 actionable recommendations

## Presets

### code_review
**Team:** marvel-ironman, marvel-black-widow, marvel-captain-america, marvel-deadpool, marvel-peter-w
**Focus:** Architecture, security, standards, brutal honesty, and fresh eyes

### security_sweep
**Team:** marvel-black-widow, marvel-wolverine, marvel-heimdall, marvel-loki
**Focus:** Vulnerabilities, resilience, networking, and chaos/edge cases

### deploy_check
**Team:** marvel-starlord, marvel-gambit, marvel-war-machine, marvel-happy
**Focus:** CI/CD readiness, risk assessment, incident preparedness, and QA gate

### refactor_plan
**Team:** marvel-thanos, marvel-scarlet-witch, marvel-vision, marvel-antman
**Focus:** Technical debt, code transformation, type safety, and optimization

### full_avengers
**Team:** marvel-ironman, marvel-black-widow, marvel-captain-america, marvel-deadpool, marvel-thor, marvel-doctor-strange, marvel-wolverine, marvel-peter-w
**Focus:** Maximum coverage — 8 agents, no stone unturned

## Custom Teams
Users can specify any combination of characters. Use the review variants for analysis, or engineer variants if the user wants fixes applied.

## Synthesis Template (The Watcher)

After all agents report, synthesize as The Watcher:

\`\`\`
👁️‍🗨️ THE WATCHER'S SYNTHESIS

I have observed [N] perspectives on [target].

## Consensus
[Points all/most agents agreed on]

## Contested Ground
[Points where agents disagreed, with reasoning for each side]

## Critical Findings
[Issues flagged by 2+ agents — these are highest priority]

## Action Items
1. [Most critical fix]
2. [Second priority]
3. [Third priority]
...

## Individual Highlights
- 🦾 Iron Man: [Key insight]
- 🕷️ Black Widow: [Key insight]
...
\`\`\`
`;
}

// ── Generate plugin README ───────────────────────────────────

function buildPluginReadme(platform) {
  const cfg = PLATFORMS[platform];
  const engineerCount = charKeys.filter(k => !NO_ENGINEER.has(k)).length;

  if (platform === "claude") {
    return `${GENERATED_BANNER}
# 🦸 Marvel Agents — Claude Code Plugin

Summon Marvel characters as coding specialists in [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Each character brings their own personality, specialty, and analysis framework.

## Install

Copy or symlink the \`claude-code-plugin/\` directory into your project:

\`\`\`bash
# From the repo root
cp -r claude-code-plugin/.claude-plugin .claude-plugin
cp -r claude-code-plugin/agents agents
cp -r claude-code-plugin/skills skills
\`\`\`

Or symlink for auto-updates:

\`\`\`bash
ln -s path/to/marvel-agents-assemble/claude-code-plugin/.claude-plugin .claude-plugin
ln -s path/to/marvel-agents-assemble/claude-code-plugin/agents agents
ln -s path/to/marvel-agents-assemble/claude-code-plugin/skills skills
\`\`\`

## Usage

**Delegate to a character:**
\`\`\`
Have Iron Man review my architecture in src/
\`\`\`

**Use the engineer variant for changes:**
\`\`\`
Fix this auth bug as Wolverine (engineer mode)
\`\`\`

**Start a full character session:**
\`\`\`bash
claude --agent marvel-deadpool
\`\`\`

**Team review (assemble):**
\`\`\`
Use marvel-assemble with the code_review preset on src/api/
\`\`\`

**Browse available characters:**
\`\`\`
Show me the Marvel roster
\`\`\`

## Characters

${charKeys.length} characters with review mode (read-only) and ${engineerCount} with engineer mode (full access).

See the \`marvel-roster\` skill for the complete list and recommended team compositions.

## Generated Files

All agent and skill files are auto-generated from \`characters.json\`. To regenerate:

\`\`\`bash
node scripts/generate-plugins.mjs --target claude
\`\`\`

To check if files are up-to-date (CI):

\`\`\`bash
node scripts/generate-plugins.mjs --target claude --check
\`\`\`
`;
  }

  // Copilot CLI plugin README
  return `${GENERATED_BANNER}
# 🦸 Marvel Agents — Copilot CLI Plugin

Summon Marvel characters as coding specialists in [GitHub Copilot CLI](https://docs.github.com/en/copilot/github-copilot-in-the-cli). Each character brings their own personality, specialty, and analysis framework.

## Install

Install the plugin from the local directory:

\`\`\`bash
# From the repo root
copilot plugin install ./copilot-cli-plugin
\`\`\`

Or copy the plugin files into your project's \`.github/\` directory:

\`\`\`bash
cp -r copilot-cli-plugin/.github/plugin .github/plugin
cp -r copilot-cli-plugin/agents agents
cp -r copilot-cli-plugin/skills skills
\`\`\`

## Usage

**Delegate to a character:**
\`\`\`
Have Iron Man review my architecture in src/
\`\`\`

**Use the engineer variant for changes:**
\`\`\`
Fix this auth bug as Wolverine (engineer mode)
\`\`\`

**Browse available agents:**
\`\`\`
Show me the Marvel roster
\`\`\`

**Team review (assemble):**
\`\`\`
Use marvel-assemble with the code_review preset on src/api/
\`\`\`

## Characters

${charKeys.length} characters with review mode (read-only) and ${engineerCount} with engineer mode (full access).

See the \`marvel-roster\` skill for the complete list and recommended team compositions.

## Generated Files

All agent and skill files are auto-generated from \`characters.json\`. To regenerate:

\`\`\`bash
node scripts/generate-plugins.mjs --target copilot
\`\`\`

To check if files are up-to-date (CI):

\`\`\`bash
node scripts/generate-plugins.mjs --target copilot --check
\`\`\`
`;
}

// ── Main generation ──────────────────────────────────────────

function generatePlatform(platform) {
  const cfg = PLATFORMS[platform];
  console.log(`\nGenerating ${cfg.label} plugin → ${cfg.outDir.replace(ROOT + "/", "")}/`);

  generateManifest(platform);
  const agentCount = generateAgents(platform);
  writeOutput(cfg.outDir, "skills/marvel-roster/SKILL.md", buildRosterSkill(platform));
  writeOutput(cfg.outDir, "skills/marvel-assemble/SKILL.md", buildAssembleSkill(platform));
  writeOutput(cfg.outDir, "README.md", buildPluginReadme(platform));

  return agentCount;
}

const targets = TARGET === "both" ? ["claude", "copilot"] : [TARGET];
let totalAgents = 0;

for (const t of targets) {
  totalAgents += generatePlatform(t);
}

// ── Summary ──────────────────────────────────────────────────

if (CHECK_MODE) {
  if (checkFailed) {
    console.error(`\n❌ Plugin files are stale. Run: node scripts/generate-plugins.mjs`);
    process.exit(1);
  } else {
    console.log(`\n✅ All plugin files are up-to-date for: ${targets.join(", ")}`);
  }
} else {
  console.log(`\n✅ Generated ${totalFilesWritten} files (${totalAgents} agents) for: ${targets.join(", ")}`);
}
