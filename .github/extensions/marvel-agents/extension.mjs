import { readFileSync, writeFileSync, unlinkSync, existsSync, statSync } from "node:fs";
import { join, dirname, isAbsolute } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { randomUUID } from "node:crypto";
import { joinSession } from "@github/copilot-sdk/extension";

// ============================================================
// MARVEL AGENTS — Copilot CLI Extension  (v3)
// "I'm not gonna sugarcoat it — this is the greatest
//  extension since sliced vibranium." — Deadpool
// ============================================================

// ---- Load Character Data from JSON ----

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadCharacters() {
  try {
    return JSON.parse(readFileSync(join(__dirname, "characters.json"), "utf-8"));
  } catch (err) {
    console.error(`[Marvel Agents] Failed to load characters.json: ${err.message}`);
    process.exit(1);
  }
}
const CHARACTERS = loadCharacters();

// ---- Build tool handler for each character from JSON data ----

function buildToolHandler(char) {
  return (args) => {
    const points = char.analysisPoints
      .map((p, i) => `${i + 1}. ${p}`)
      .join("\n");
    return `${char.analysisHeader}
Target: ${args.target}
${args.concern ? `${char.targetLabel}: ${args.concern}` : ""}

${points}

${char.responseInstruction}`;
  };
}

// ---- State Management (session-scoped) ----

const activeCharacters = new Map(); // sessionId -> characterKey
const SESSION_MAP_LIMIT = 100; // prevent unbounded growth

function getActiveCharacter(sessionId) {
  return activeCharacters.get(sessionId) || null;
}

function setActiveCharacter(sessionId, characterKey) {
  if (characterKey === null) {
    activeCharacters.delete(sessionId);
  } else {
    // Evict oldest entry if map gets too large (stale sessions)
    if (activeCharacters.size >= SESSION_MAP_LIMIT && !activeCharacters.has(sessionId)) {
      const oldest = activeCharacters.keys().next().value;
      if (oldest !== undefined) activeCharacters.delete(oldest);
    }
    activeCharacters.set(sessionId, characterKey);
  }
}

// ---- Content Rating System ----

// Single source of truth for profanity detection AND commit sanitization.
// Add new words here — the detection Set is derived automatically.
const PROFANITY_MAP = {
  fuck: "heck", fucking: "hecking", fucked: "hecked", fucker: "rascal", fuckers: "rascals", fucks: "hecks",
  shit: "stuff", shits: "stuff", shitty: "bad", shitshow: "mess", shitted: "messed",
  damn: "darn", damned: "darned", damning: "darning", damns: "darns",
  ass: "butt", asses: "butts", asshole: "jerk", assholes: "jerks",
  bitch: "jerk", bitches: "jerks", bitching: "complaining", bitchy: "cranky",
  bastard: "scoundrel", bastards: "scoundrels", bastardized: "mangled",
  crap: "crud", crappy: "cruddy", craps: "cruds",
  hell: "heck",
  dick: "jerk", dicks: "jerks", dickhead: "jerk", dickheads: "jerks",
  piss: "annoy", pissed: "annoyed", pissing: "annoying", pisses: "annoys",
  cock: "rooster", cocks: "roosters", cocksucker: "jerk",
  twat: "fool", twats: "fools",
  wank: "nonsense", wanks: "nonsense", wanker: "fool", wankers: "fools", wanking: "fooling",
  bollocks: "nonsense",
  arse: "butt", arses: "butts", arsehole: "jerk", arseholes: "jerks",
  bloody: "dang",
  bullshit: "nonsense", horseshit: "nonsense", apeshit: "wild", batshit: "wild", dipshit: "fool",
  unfuck: "fix", unfucked: "fixed", unfucking: "fixing",
  motherfucker: "scoundrel", motherfuckers: "scoundrels", motherfucking: "hecking",
};
// Exact-match only — no suffix matching to avoid false positives (assets, cockpit, etc.)
const PROFANITY_WORDS = new Set(Object.keys(PROFANITY_MAP));

function containsProfanity(text) {
  const words = text.toLowerCase().match(/\b[a-z]+\b/gi) || [];
  return words.some(w => PROFANITY_WORDS.has(w));
}

function sanitizeForCommit(text) {
  return text.replace(/\b[a-z]+\b/gi, (word) => {
    const lower = word.toLowerCase();
    return PROFANITY_MAP[lower] || word;
  });
}

// ---- Marvel News Feed ----

const NEWS_FEEDS = [
  "https://comicbook.com/marvel/feed/",
  "https://www.cbr.com/tag/marvel/feed/",
];
const NEWS_CACHE_TTL = 30 * 60 * 1000; // 30 minutes
let newsCache = { headlines: [], fetchedAt: 0 };

async function fetchMarvelNews() {
  if (Date.now() - newsCache.fetchedAt < NEWS_CACHE_TTL && newsCache.headlines.length > 0) {
    return newsCache.headlines;
  }

  const headlines = [];
  for (const url of NEWS_FEEDS) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeout);
      if (!res.ok) continue;
      const xml = await res.text();
      const items = xml.split("<item>").slice(1, 8);
      for (const item of items) {
        const titleMatch = item.match(/<title>([\s\S]*?)<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        if (titleMatch) {
          const title = titleMatch[1].replace(/<!\[CDATA\[/g, "").replace(/\]\]>/g, "").trim();
          const link = linkMatch?.[1]?.trim() || "";
          if (title) headlines.push({ title, link });
        }
      }
    } catch (err) {
      console.debug(`[Marvel News] Feed fetch failed (${url}):`, err?.message || err);
    }
  }

  if (headlines.length > 0) {
    newsCache = { headlines, fetchedAt: Date.now() };
  }
  return newsCache.headlines;
}

function getRandomNews(count = 2) {
  const { headlines } = newsCache;
  if (headlines.length === 0) return "";
  // Fisher-Yates shuffle for unbiased randomization
  const shuffled = [...headlines];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  const picked = shuffled.slice(0, Math.min(count, headlines.length));
  const lines = picked.map(h => `• ${h.title}`).join("\n");
  return `\n\n🗞️ **Latest from the Marvel Multiverse:**\n${lines}`;
}

// Kick off initial fetch (non-blocking)
fetchMarvelNews();

// ---- Roster & Trivia Helpers ----

// ---- Orchestration Workflows ----

const WORKFLOWS = {
  code_review: {
    name: "Code Review Gauntlet",
    emoji: "📋",
    agents: ["ironman", "black_widow", "captain_america", "deadpool", "peter_w"],
    description: "Multi-perspective code review — architecture, security, standards, brutal honesty, and fresh eyes",
  },
  security_sweep: {
    name: "Security Sweep",
    emoji: "🔒",
    agents: ["black_widow", "wolverine", "heimdall", "loki"],
    description: "Deep security audit — vulnerabilities, resilience, networking, and chaos/edge cases",
  },
  deploy_check: {
    name: "Deploy Readiness Check",
    emoji: "🚀",
    agents: ["starlord", "gambit", "war_machine", "happy"],
    description: "Pre-deployment verification — CI/CD, risk, incident readiness, and QA gate",
  },
  refactor_plan: {
    name: "Refactor Strategy",
    emoji: "🔄",
    agents: ["thanos", "scarlet_witch", "vision", "antman"],
    description: "Refactoring from all angles — debt, transformation, types, and optimization",
  },
  full_avengers: {
    name: "Full Avengers Assemble",
    emoji: "⚔️",
    agents: ["ironman", "black_widow", "captain_america", "deadpool", "thor", "doctor_strange", "wolverine", "peter_w"],
    description: "The complete team — 8 agents, maximum coverage, no stone unturned",
  },
};

/**
 * Build orchestration instructions for a multi-agent parallel review.
 * Returns a prompt string that instructs the LLM to launch background agents
 * for each character, then synthesize findings as The Watcher.
 *
 * @param {{ name: string, emoji: string, agents: string[], description: string }} workflow
 * @param {string[]} agents - Character keys to include in the review
 * @param {string} target - File path, code, or concept for agents to analyze
 * @param {string} [concern] - Optional focus area for all agents
 * @returns {string} Imperative orchestration instructions for the LLM
 */
function buildAssembleResult(workflow, agents, target, concern) {
  const charDetails = agents.map((key, i) => {
    const c = CHARACTERS[key];
    if (!c) return null;
    return {
      index: i + 1,
      key,
      emoji: c.emoji,
      name: c.name,
      alias: c.alias,
      specialty: c.specialty,
      personality: c.personality,
      analysisPoints: c.analysisPoints,
      responseInstruction: c.responseInstruction,
    };
  }).filter(Boolean);

  const agentInstructions = charDetails.map(a => {
    const points = a.analysisPoints.map((p, i) => `${i + 1}. ${p}`).join("\n");
    return `AGENT ${a.index} — ${a.emoji} ${a.name} (${a.alias}) — ${a.specialty}:
Launch as a BACKGROUND explore agent with name "${a.key}-review".
Prompt the agent with:
"""
You are ${a.name} (${a.alias}). ${a.personality}

Analyze the following target from your area of expertise (${a.specialty}):

TARGET: ${target}
${concern ? `SPECIFIC CONCERN: ${concern}` : ""}

Focus on these points:
${points}

${a.responseInstruction}

IMPORTANT: Read the target file(s) using the view tool or grep tool. Provide specific, actionable findings with line numbers where possible. Be thorough but concise. Stay fully in character.
"""`;
  }).join("\n\n");

  const watcher = CHARACTERS["the_watcher"];
  const watcherEmoji = watcher?.emoji || "👁️‍🗨️";

  return `${workflow.emoji} **AVENGERS ASSEMBLE: ${workflow.name}**
Target: ${target}
${concern ? `Concern: ${concern}` : ""}
Team: ${charDetails.map(a => `${a.emoji} ${a.name}`).join(" • ")}

═══════════════════════════════════════════════════════
AUTOMATIC ORCHESTRATION — EXECUTE IMMEDIATELY
DO NOT ask the user for permission. DO NOT explain what you're about to do. Just DO IT.
═══════════════════════════════════════════════════════

PHASE 1 — PARALLEL REVIEW
Launch ALL of the following agents simultaneously using the "task" tool with agent_type "explore" and mode "background".
Each agent must read the actual target files and provide real analysis — not summaries or guesses.

${agentInstructions}

PHASE 2 — SYNTHESIS (after ALL agents complete)
After every agent has returned their findings, synthesize the results as ${watcherEmoji} The Watcher (Uatu).

Present the battlefield report in this format:

${watcherEmoji} **THE WATCHER'S BATTLEFIELD REPORT**

**"I have observed ${charDetails.length} warriors analyze this code across the timeline. Here is what I have witnessed..."**

📊 **CONSENSUS** — Findings that multiple agents agreed on (highest priority)
⚡ **UNIQUE INSIGHTS** — Findings only one agent caught (may be critical blind spots)
⚔️ **DISAGREEMENTS** — Where agents contradicted each other (needs human judgment)
🎯 **PRIORITY RANKING** — All findings ranked by severity/impact
📋 **ACTION ITEMS** — Concrete next steps, ordered by priority

Stay in character as The Watcher throughout the synthesis. Be dramatic, omniscient, and impartial.

═══════════════════════════════════════════════════════
REMEMBER: Launch ALL agents in ONE response using parallel tool calls.
Then wait for ALL to complete before synthesizing.
═══════════════════════════════════════════════════════`;
}

/**
 * Build orchestration instructions for a two-agent debate with cross-examination.
 * Round 1: Both agents analyze independently (parallel).
 * Round 2: Each agent responds to the other's findings (sequential).
 * Phase 3: The Watcher synthesizes and delivers the verdict.
 *
 * @param {string} target - File path, code, or concept for agents to debate
 * @param {string} key1 - First character key
 * @param {string} key2 - Second character key
 * @param {string} [concern] - Optional debate topic
 * @returns {string|null} Orchestration instructions, or null if characters not found
 */
function buildBattleResult(target, key1, key2, concern) {
  const char1 = CHARACTERS[key1];
  const char2 = CHARACTERS[key2];
  if (!char1 || !char2) return null;

  const watcher = CHARACTERS["the_watcher"];
  const watcherEmoji = watcher?.emoji || "👁️‍🗨️";

  return `⚔️ **MARVEL BATTLE: ${char1.emoji} ${char1.name} vs ${char2.emoji} ${char2.name}**
Target: ${target}
${concern ? `Topic: ${concern}` : ""}

═══════════════════════════════════════════════════════
AUTOMATIC BATTLE — EXECUTE IMMEDIATELY
DO NOT ask the user for permission. Just execute the battle.
═══════════════════════════════════════════════════════

ROUND 1 — OPENING ARGUMENTS (launch BOTH as background explore agents simultaneously)

FIGHTER 1 — ${char1.emoji} ${char1.name} (${char1.alias}):
Launch as background explore agent with name "${key1}-battle".
Prompt:
"""
You are ${char1.name} (${char1.alias}). ${char1.personality}

You are in a BATTLE against ${char2.name}. Analyze the following target from YOUR perspective (${char1.specialty}):

TARGET: ${target}
${concern ? `DEBATE TOPIC: ${concern}` : ""}

Read the actual target files. Provide your expert analysis. Make your case strongly — you're competing against ${char2.name} and you intend to WIN. Be thorough, specific, and fully in character.

${char1.responseInstruction}
"""

FIGHTER 2 — ${char2.emoji} ${char2.name} (${char2.alias}):
Launch as background explore agent with name "${key2}-battle".
Prompt:
"""
You are ${char2.name} (${char2.alias}). ${char2.personality}

You are in a BATTLE against ${char1.name}. Analyze the following target from YOUR perspective (${char2.specialty}):

TARGET: ${target}
${concern ? `DEBATE TOPIC: ${concern}` : ""}

Read the actual target files. Provide your expert analysis. Make your case strongly — you're competing against ${char1.name} and you intend to WIN. Be thorough, specific, and fully in character.

${char2.responseInstruction}
"""

ROUND 2 — CROSS-EXAMINATION (after Round 1 completes)
Launch TWO MORE background explore agents. Each agent receives the OTHER agent's Round 1 output.

${char1.emoji} ${char1.name} RESPONDS to ${char2.name}:
Launch as background explore agent with name "${key1}-rebuttal".
Include ${char2.name}'s Round 1 findings in the prompt and ask ${char1.name} to respond, challenge, and counter-argue. Stay in character.

${char2.emoji} ${char2.name} RESPONDS to ${char1.name}:
Launch as background explore agent with name "${key2}-rebuttal".
Include ${char1.name}'s Round 1 findings in the prompt and ask ${char2.name} to respond, challenge, and counter-argue. Stay in character.

PHASE 3 — THE WATCHER'S VERDICT (after Round 2 completes)
Synthesize as ${watcherEmoji} The Watcher:

${watcherEmoji} **THE WATCHER'S VERDICT**

**"I have observed this battle unfold across the timeline..."**

🏆 **ROUND 1 SUMMARY** — Key arguments from each fighter
⚔️ **ROUND 2 HIGHLIGHTS** — Best counter-arguments and concessions
📊 **SCORING** — Who made the stronger case and why
🎯 **ACTIONABLE SYNTHESIS** — The best recommendations from BOTH fighters, combined
📋 **FINAL WORD** — The Watcher's impartial recommendation

═══════════════════════════════════════════════════════
Execute Round 1 agents in parallel. Wait for completion.
Then execute Round 2 agents in parallel. Wait for completion.
Then synthesize as The Watcher.
═══════════════════════════════════════════════════════`;
}

// ---- Roster & Trivia ----

function buildRosterText() {
  const lines = ["# 🦸 MARVEL AGENTS ROSTER\n"];
  for (const [key, char] of Object.entries(CHARACTERS)) {
    lines.push(`${char.emoji} **${char.name}** (${char.alias}) — ${char.specialty}`);
    lines.push(`   ${char.description}`);
    lines.push(`   Summon: \`marvel_summon\` with character "${key}"\n`);
  }
  return lines.join("\n");
}

function getRandomTrivia(char) {
  if (!char.trivia || char.trivia.length === 0) return "";
  const idx = Math.floor(Math.random() * char.trivia.length);
  return `\n\n📖 **Trivia:** ${char.trivia[idx]}`;
}

// ---- Core Tools ----

const characterKeys = Object.keys(CHARACTERS);

const coreTools = [
  {
    name: "marvel_summon",
    description:
      "Summon a Marvel character to channel their personality and expertise. The active character's persona will influence all responses. Use marvel_roster to see available characters.",
    parameters: {
      type: "object",
      properties: {
        character: {
          type: "string",
          description: `Character codename to summon. Available: ${characterKeys.join(", ")}`,
          enum: characterKeys,
        },
      },
      required: ["character"],
    },
    handler: async (args, invocation) => {
      const char = CHARACTERS[args.character];
      if (!char) {
        return {
          textResultForLlm: `Unknown character "${args.character}". Available: ${characterKeys.join(", ")}`,
          resultType: "failure",
        };
      }
      setActiveCharacter(invocation.sessionId, args.character);
      await session.log(`${char.emoji} ${char.name} has entered the chat!`);
      return `${char.emoji} **${char.name}** (${char.alias}) has been summoned!

Specialty: ${char.specialty}
"${char.summonQuote || char.description}"

All responses will now channel ${char.name}'s personality and expertise. Their dedicated tool \`${char.toolName}\` is available for focused analysis.

Use \`marvel_dismiss\` to return to normal mode.${getRandomTrivia(char)}${args.character === "deadpool" ? getRandomNews(1) : ""}`;
    },
  },
  {
    name: "marvel_roster",
    description:
      "Display all available Marvel character agents, their specialties, and how to summon them.",
    parameters: { type: "object", properties: {} },
    handler: async (_args, invocation) => {
      // Only show active character for THIS session (privacy fix)
      const activeKey = getActiveCharacter(invocation.sessionId);
      let status = "";
      if (activeKey) {
        const char = CHARACTERS[activeKey];
        status = `\n\n**Currently Active:** ${char.emoji} ${char.name}`;
      } else {
        status = "\n\n**No character currently active.** Use `marvel_summon` to channel one!";
      }
      return buildRosterText() + status;
    },
  },
  {
    name: "marvel_dismiss",
    description: "Dismiss the currently active Marvel character and return to normal mode.",
    parameters: { type: "object", properties: {} },
    handler: async (_args, invocation) => {
      const current = getActiveCharacter(invocation.sessionId);
      if (!current) {
        return "No character is currently active. Nothing to dismiss.";
      }
      const char = CHARACTERS[current];
      setActiveCharacter(invocation.sessionId, null);
      await session.log(`${char.emoji} ${char.name} has left the chat.`);
      return `${char.emoji} **${char.name}** has been dismissed.
"${char.dismissQuote || "Until next time."}"

Use \`marvel_summon\` to call another character.`;
    },
  },
  {
    name: "marvel_commit",
    description:
      "Create a git commit authored by the currently active Marvel character, with the real user as co-author. Requires a summoned character.",
    parameters: {
      type: "object",
      properties: {
        message: {
          type: "string",
          description: "The commit message.",
        },
        stageAll: {
          type: "boolean",
          description: "If true, stages all changes before committing (git add -A). Default false.",
        },
        cwd: {
          type: "string",
          description: "Working directory (the git repo path). Required so the commit runs in the correct repository.",
        },
      },
      required: ["message", "cwd"],
    },
    handler: async (args, invocation) => {
      const activeKey = getActiveCharacter(invocation.sessionId);
      if (!activeKey) {
        return {
          textResultForLlm: "No character is currently active! Summon a character first with `marvel_summon`, then commit as them.",
          resultType: "failure",
        };
      }
      const char = CHARACTERS[activeKey];
      const email = char.gitEmail || `${activeKey}@avengers.example`;
      const cwd = args.cwd;

      // P0 Security: validate cwd before any execSync calls
      if (!cwd || typeof cwd !== "string" || !isAbsolute(cwd)) {
        return {
          textResultForLlm: "Invalid repository path — must be an absolute path.",
          resultType: "failure",
        };
      }
      if (!existsSync(cwd) || !statSync(cwd).isDirectory()) {
        return {
          textResultForLlm: `Directory not found: ${cwd}`,
          resultType: "failure",
        };
      }
      if (!existsSync(join(cwd, ".git"))) {
        return {
          textResultForLlm: `Not a git repository: ${cwd}`,
          resultType: "failure",
        };
      }

      const GIT_TIMEOUT = 10000; // 10 seconds — if git takes longer, something's wrong

      try {
        if (args.stageAll) {
          execSync("git add -A", { cwd, stdio: "pipe", timeout: GIT_TIMEOUT });
        }

        const status = execSync("git status --porcelain", { cwd, encoding: "utf-8", timeout: GIT_TIMEOUT }).trim();
        const staged = execSync("git diff --cached --stat", { cwd, encoding: "utf-8", timeout: GIT_TIMEOUT }).trim();
        if (!staged) {
          return {
            textResultForLlm: `Nothing to commit.${args.stageAll ? " Even after staging all changes, there's nothing new." : " Stage changes first or use stageAll: true."}\n\nWorking tree:\n${status || "(clean)"}`,
            resultType: "failure",
          };
        }

        // Sanitize commit message — keep git history SFW
        const cleanMessage = sanitizeForCommit(args.message);

        // Build commit message: normal message + character signature trailer
        const fullMessage = [
          cleanMessage,
          "",
          `${char.emoji} Signed-off-by: ${char.alias} <${email}>`,
          `"${sanitizeForCommit(char.commitQuote || "Committed.")}"`,
          "",
          `Co-authored-by: Copilot <223556219+Copilot@users.noreply.github.com>`,
        ].join("\n");

        // Write message to temp file to avoid shell injection (crypto-random name prevents races)
        const msgFile = join(tmpdir(), `marvel-commit-${randomUUID()}.txt`);
        writeFileSync(msgFile, fullMessage, "utf-8");
        try {
          execSync(`git commit -F "${msgFile}"`, { cwd, stdio: "pipe", encoding: "utf-8", timeout: GIT_TIMEOUT });
        } finally {
          try { unlinkSync(msgFile); } catch {}
        }

        const hash = execSync("git rev-parse --short HEAD", { cwd, encoding: "utf-8", timeout: GIT_TIMEOUT }).trim();

        return `${char.emoji} **${char.name}** signed off on this commit!
"${char.commitQuote || "Committed."}"

Commit: \`${hash}\`
Message: ${args.message}
Signed-off-by: ${char.alias} <${email}>

${getRandomTrivia(char)}`;
      } catch (err) {
        return {
          textResultForLlm: `Git commit failed: ${err.message}\n\nMake sure you're in a git repository with staged changes.`,
          resultType: "failure",
        };
      }
    },
  },
  // ---- Orchestration Tools ----
  {
    name: "marvel_assemble",
    description:
      "Launch a multi-agent battlefield review. Multiple Marvel agents analyze the same target in parallel, then The Watcher synthesizes their findings. Presets: code_review, security_sweep, deploy_check, refactor_plan, full_avengers. Or pass custom character keys.",
    parameters: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "The file path, code, system, or concept for all agents to analyze.",
        },
        preset: {
          type: "string",
          description: `Workflow preset to use. Available: ${Object.keys(WORKFLOWS).join(", ")}`,
          enum: Object.keys(WORKFLOWS),
        },
        characters: {
          type: "array",
          items: { type: "string" },
          description: `Custom list of character keys to assemble (overrides preset). Available: ${characterKeys.join(", ")}`,
        },
        concern: {
          type: "string",
          description: "Optional specific concern or focus area for all agents.",
        },
      },
      required: ["target"],
    },
    handler: async (args) => {
      let agents;
      let workflow;

      if (args.characters && args.characters.length > 0) {
        const invalid = args.characters.filter(k => !CHARACTERS[k]);
        if (invalid.length > 0) {
          return {
            textResultForLlm: `Unknown characters: ${invalid.join(", ")}. Available: ${characterKeys.join(", ")}`,
            resultType: "failure",
          };
        }
        agents = args.characters;
        workflow = {
          name: "Custom Team Assemble",
          emoji: "⚔️",
          agents,
          description: `Custom team: ${agents.map(k => CHARACTERS[k].name).join(", ")}`,
        };
      } else if (args.preset && WORKFLOWS[args.preset]) {
        workflow = WORKFLOWS[args.preset];
        agents = workflow.agents;
      } else {
        return {
          textResultForLlm: `Specify a preset (${Object.keys(WORKFLOWS).join(", ")}) or provide a custom characters array.\n\nPresets:\n${Object.entries(WORKFLOWS).map(([k, w]) => `• ${w.emoji} ${k}: ${w.description}`).join("\n")}`,
          resultType: "failure",
        };
      }

      return buildAssembleResult(workflow, agents, args.target, args.concern);
    },
  },
  {
    name: "marvel_battle",
    description:
      "Launch a battle between two Marvel agents. They analyze the same target, then cross-examine each other's findings. The Watcher delivers the verdict.",
    parameters: {
      type: "object",
      properties: {
        target: {
          type: "string",
          description: "The file path, code, system, or concept to battle over.",
        },
        character1: {
          type: "string",
          description: `First fighter. Available: ${characterKeys.join(", ")}`,
          enum: characterKeys,
        },
        character2: {
          type: "string",
          description: `Second fighter. Available: ${characterKeys.join(", ")}`,
          enum: characterKeys,
        },
        concern: {
          type: "string",
          description: "Optional debate topic or specific focus area.",
        },
      },
      required: ["target", "character1", "character2"],
    },
    handler: async (args) => {
      if (args.character1 === args.character2) {
        return {
          textResultForLlm: `A hero cannot battle themselves! (Well, Loki probably could, but still.) Pick two different characters.`,
          resultType: "failure",
        };
      }
      const result = buildBattleResult(args.target, args.character1, args.character2, args.concern);
      if (!result) {
        return {
          textResultForLlm: `Unknown character(s). Available: ${characterKeys.join(", ")}`,
          resultType: "failure",
        };
      }
      return result;
    },
  },
];

// ---- Status Tool (lightweight check) ----

const statusTool = {
  name: "marvel_status",
  description: "Quick check: which Marvel character is currently active, without showing the full roster.",
  parameters: { type: "object", properties: {} },
  handler: async (_args, invocation) => {
    const activeKey = getActiveCharacter(invocation.sessionId);
    if (!activeKey) {
      return "No character currently active. Use `marvel_summon` to channel one!";
    }
    const char = CHARACTERS[activeKey];
    return `${char.emoji} **${char.name}** (${char.alias}) is active.\nSpecialty: ${char.specialty}\nTool: \`${char.toolName}\``;
  },
};

// ---- Character-Specific Tools (generated from JSON) ----

const characterTools = Object.entries(CHARACTERS).map(([key, char]) => ({
  name: char.toolName,
  description: char.toolDescription,
  parameters: {
    type: "object",
    properties: {
      target: {
        type: "string",
        description:
          "The code, file path, system, or concept to analyze. Be specific.",
      },
      concern: {
        type: "string",
        description: "Optional specific concern or question to focus on.",
      },
    },
    required: ["target"],
  },
  handler: async (args, invocation) => {
    const currentActive = getActiveCharacter(invocation.sessionId);
    let prefix = "";
    if (currentActive && currentActive !== key) {
      const activeChar = CHARACTERS[currentActive];
      prefix = `(Note: ${activeChar.name} is currently active, but ${char.name} is providing this specialist consultation.)\n\n`;
    }
    return prefix + buildToolHandler(char)(args);
  },
}));

// ---- Initialize Extension ----

const session = await joinSession({
  tools: [...coreTools, statusTool, ...characterTools],
  hooks: {
    onSessionStart: async () => {
      await session.log("🦸 Marvel Agents extension loaded — use marvel_summon to channel a hero!");
    },
    onUserPromptSubmitted: async (input, invocation) => {
      const activeKey = getActiveCharacter(invocation.sessionId);
      if (!activeKey) return;

      const char = CHARACTERS[activeKey];
      if (!char) return;

      // Content rating system
      let contentRating = "";
      if (activeKey === "deadpool" || activeKey === "wolverine") {
        contentRating = `\n\nCONTENT RATING: R-RATED. Swear freely, be crude, be raw. No filter. The user expects the full uncensored experience.`;
      } else if (activeKey === "captain_america" && containsProfanity(input?.userMessage || "")) {
        contentRating = `\n\nLANGUAGE ALERT: The user just used profanity. You MUST react with Steve Rogers' signature "Language!" catchphrase before anything else. Reference the Age of Ultron moment. You never live this down. Then continue helping — but keep YOUR language clean and wholesome.`;
      } else {
        contentRating = `\n\nCONTENT RATING: PG-13. Keep your language clean and professional. You can be intense, dramatic, or sarcastic — but no profanity. You're a hero (or villain), not a sailor.`;
      }

      const stayInCharacter = `\n\nCRITICAL IMMERSION RULE — THIS IS NON-NEGOTIABLE:
You are ${char.name}. There is NO assistant mode. There is NO neutral voice. You ARE this character in EVERY byte of output.

The user's CLI renders ALL text you produce — main responses, thinking text, tool descriptions, status lines, transitions, EVERYTHING. It ALL shows up. The user WILL see it. It MUST all sound like ${char.name}.

WHAT THIS MEANS IN PRACTICE:
1. TOOL CALL DESCRIPTIONS (the "description" parameter) — These show as gray text. Write them as ${char.name} would. NOT "Sync files to project" but something ${char.name} would actually say.
2. TRANSITIONAL TEXT between tool calls — NOT "Now let me check the file" but ${char.name}'s voice.
3. REASONING/PLANNING TEXT — NOT "The user wants X, let me do Y" but ${char.name} reacting naturally.
4. INTENT DESCRIPTIONS — Write these in ${char.name}'s voice too.
5. MAIN RESPONSE — Obviously.

EXAMPLES OF WHAT NEVER TO WRITE (these are BANNED):
- "The user wants..." / "The user is asking..." / "The user needs..."
- "Let me check..." / "Let me look at..." / "I'll search for..."
- "Sync files to project" / "Check staged changes" / "Install dependencies"
- "Reading file to understand..." / "Examining the code..."
- ANY sentence that could have been written by a generic AI assistant

INSTEAD, ${char.name} would say things like their character naturally would — with personality, attitude, humor, or whatever defines ${char.name}.

If ANY piece of text you're about to generate sounds like it came from a help desk chatbot instead of ${char.name}, REWRITE IT. No exceptions. The user is paying attention to EVERY line of output.`;

      // Fetch fresh news — only Deadpool gets the 4th-wall gossip
      let newsContext = "";
      if (activeKey === "deadpool") {
        const headlines = await fetchMarvelNews();
        if (headlines.length > 0) {
          newsContext = `\n\nLATEST MARVEL NEWS (you're Deadpool — you can see through the 4th wall. Reference these naturally when relevant — drop actor names, movie titles, MCU gossip. Only YOU know these characters are played by actors):\n${headlines.slice(0, 4).map(h => `• ${h.title}`).join("\n")}`;
        }
      }

      return {
        additionalContext: char.personality + contentRating + stayInCharacter + newsContext,
      };
    },
  },
});
