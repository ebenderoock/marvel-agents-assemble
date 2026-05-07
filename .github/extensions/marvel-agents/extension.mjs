import { readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { tmpdir } from "node:os";
import { joinSession } from "@github/copilot-sdk/extension";

// ============================================================
// MARVEL AGENTS — Copilot CLI Extension  (v3)
// "I'm not gonna sugarcoat it — this is the greatest
//  extension since sliced vibranium." — Deadpool
// ============================================================

// ---- Load Character Data from JSON ----

const __dirname = dirname(fileURLToPath(import.meta.url));
let CHARACTERS;
try {
  CHARACTERS = JSON.parse(
    readFileSync(join(__dirname, "characters.json"), "utf-8")
  );
} catch (err) {
  console.error(`[Marvel Agents] Failed to load characters.json: ${err.message}`);
  process.exit(1);
}

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

function getActiveCharacter(sessionId) {
  return activeCharacters.get(sessionId) || null;
}

function setActiveCharacter(sessionId, characterKey) {
  if (characterKey === null) {
    activeCharacters.delete(sessionId);
  } else {
    activeCharacters.set(sessionId, characterKey);
  }
}

// ---- Content Rating System ----

const PROFANITY_PATTERN = /\b(fuck|shit|damn|ass|bitch|bastard|crap|hell|dick|piss|cock|twat|wank|bollocks|arse|bloody)\w*|\b\w*(fuck|shit)\w*/gi;

function containsProfanity(text) {
  return PROFANITY_PATTERN.test(text);
}

function sanitizeForCommit(text) {
  const BASE_REPLACEMENTS = {
    fuck: "heck", shit: "stuff", damn: "darn", ass: "butt", bitch: "jerk",
    bastard: "scoundrel", crap: "crud", hell: "heck", dick: "jerk",
    piss: "annoy", cock: "rooster", twat: "fool", wank: "nonsense",
    bollocks: "nonsense", arse: "butt", bloody: "dang",
  };
  const EXACT = {
    fucking: "hecking", fucked: "hecked", fucker: "rascal", fuckers: "rascals",
    shitshow: "mess", shitty: "bad", damned: "darned",
    asshole: "jerk", assholes: "jerks", bitching: "complaining",
    bastards: "scoundrels", crappy: "cruddy", pissed: "annoyed", pissing: "annoying",
    unfuck: "fix", unfucked: "fixed", unfucking: "fixing",
    bullshit: "nonsense", horseshit: "nonsense", apeshit: "wild", batshit: "wild",
  };
  return text.replace(PROFANITY_PATTERN, (match) => {
    const lower = match.toLowerCase();
    if (EXACT[lower]) return EXACT[lower];
    if (BASE_REPLACEMENTS[lower]) return BASE_REPLACEMENTS[lower];
    // For unknown suffixed forms, find the base word and use its replacement
    for (const [base, replacement] of Object.entries(BASE_REPLACEMENTS)) {
      if (lower.startsWith(base)) return replacement;
    }
    for (const [base, replacement] of Object.entries(BASE_REPLACEMENTS)) {
      if (lower.includes(base)) return replacement;
    }
    return "heck";
  });
}

// ---- Marvel News Feed ----

const NEWS_FEEDS = [
  "https://comicbook.com/marvel/feed/",
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
    } catch {
      // Feed fetch failed silently — not worth crashing over gossip
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
  const shuffled = [...headlines].sort(() => Math.random() - 0.5);
  const picked = shuffled.slice(0, Math.min(count, headlines.length));
  const lines = picked.map(h => `• ${h.title}`).join("\n");
  return `\n\n🗞️ **Latest from the Marvel Multiverse:**\n${lines}`;
}

// Kick off initial fetch (non-blocking)
fetchMarvelNews();

// ---- Roster & Trivia Helpers ----

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

      try {
        if (args.stageAll) {
          execSync("git add -A", { cwd, stdio: "pipe" });
        }

        const status = execSync("git status --porcelain", { cwd, encoding: "utf-8" }).trim();
        const staged = execSync("git diff --cached --stat", { cwd, encoding: "utf-8" }).trim();
        if (!staged && !args.stageAll) {
          return {
            textResultForLlm: `Nothing staged to commit. Stage changes first or use stageAll: true.\n\nUnstaged changes:\n${status || "(clean working tree)"}`,
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

        // Write message to temp file to avoid shell injection
        const msgFile = join(tmpdir(), `marvel-commit-${Date.now()}.txt`);
        writeFileSync(msgFile, fullMessage, "utf-8");
        try {
          execSync(`git commit -F "${msgFile}"`, { cwd, stdio: "pipe", encoding: "utf-8" });
        } finally {
          try { unlinkSync(msgFile); } catch {}
        }

        const hash = execSync("git rev-parse --short HEAD", { cwd, encoding: "utf-8" }).trim();

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
