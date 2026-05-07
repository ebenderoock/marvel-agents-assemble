import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import { joinSession } from "@github/copilot-sdk/extension";

// ============================================================
// MARVEL AGENTS — Copilot CLI Extension  (v2)
// "I'm not gonna sugarcoat it — this is the greatest
//  extension since sliced vibranium." — Deadpool
// ============================================================

// ---- Load Character Data from JSON ----

const __dirname = dirname(fileURLToPath(import.meta.url));
const CHARACTERS = JSON.parse(
  readFileSync(join(__dirname, "characters.json"), "utf-8")
);

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

// ---- Git Identity Map ----

const GIT_EMAILS = {
  ironman:          "tony.stark@stark-industries.example",
  thor:             "thor@asgard.example",
  black_widow:      "natasha@redroom.example",
  deadpool:         "wade@chimichanga.example",
  spiderman:        "peter.parker@dailybugle.example",
  hawkeye:          "clint@bullseye.example",
  captain_america:  "steve.rogers@shield.example",
  starlord:         "quill@milano.example",
  rocket:           "rocket@guardians.example",
  groot:            "groot@groot.example",
  mantis:           "mantis@guardians.example",
  hulk:             "bruce.banner@gamma.example",
  doctor_strange:   "strange@sanctum.example",
  nick_fury:        "fury@shield.example",
  loki:             "loki@mischief.example",
  scarlet_witch:    "wanda@hex.example",
  happy:            "happy.hogan@stark-security.example",
  black_panther:    "tchalla@wakanda.example",
  antman:           "scott.lang@pymtech.example",
  falcon:           "sam.wilson@pararescue.example",
  vision:           "vision@mind-stone.example",
  miles:            "miles.morales@brooklyn.example",
  thanos:           "thanos@titan.example",
  ultron:           "ultron@no-strings.example",
  war_machine:      "rhodey@iron-patriot.example",
  shuri:            "shuri@wakanda-labs.example",
  wong:             "wong@sanctum.example",
  wolverine:        "logan@weapon-x.example",
  ghost_spider:     "gwen@spider-verse.example",
  storm:            "ororo@xavier-institute.example",
  magneto:          "erik@genosha.example",
  gambit:           "remy@thieves-guild.example",
  nebula:           "nebula@benatar.example",
};

// Real user gets co-author credit on every character commit
const REAL_USER = { name: "Eben de Roock", email: "eben.deroock@eroad.com" };

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
"${char.description}"

All responses will now channel ${char.name}'s personality and expertise. Their dedicated tool \`${char.toolName}\` is available for focused analysis.

Use \`marvel_dismiss\` to return to normal mode.${getRandomTrivia(char)}`;
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
      return `${char.emoji} **${char.name}** has been dismissed. Back to normal mode.\n\nUse \`marvel_summon\` to call another character.`;
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
      const email = GIT_EMAILS[activeKey] || `${activeKey}@avengers.dev`;
      const authorName = char.alias;
      const cwd = args.cwd || session.workspacePath || process.cwd();

      try {
        if (args.stageAll) {
          execSync("git add -A", { cwd, stdio: "pipe" });
        }

        // Check if there's anything to commit
        const status = execSync("git status --porcelain", { cwd, encoding: "utf-8" }).trim();
        const staged = execSync("git diff --cached --stat", { cwd, encoding: "utf-8" }).trim();
        if (!staged && !args.stageAll) {
          return {
            textResultForLlm: `Nothing staged to commit. Stage changes first or use stageAll: true.\n\nUnstaged changes:\n${status || "(clean working tree)"}`,
            resultType: "failure",
          };
        }

        // Build commit message with co-author trailer
        const fullMessage = `${args.message}\n\nCo-authored-by: ${REAL_USER.name} <${REAL_USER.email}>`;

        execSync(
          `git commit --author="${authorName} <${email}>" -m ${JSON.stringify(fullMessage)}`,
          { cwd, stdio: "pipe", encoding: "utf-8" }
        );

        // Get the commit hash
        const hash = execSync("git rev-parse --short HEAD", { cwd, encoding: "utf-8" }).trim();

        return `${char.emoji} **${char.name}** committed as **${authorName}** <${email}>

Commit: \`${hash}\`
Message: ${args.message}
Co-authored-by: ${REAL_USER.name} <${REAL_USER.email}>

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
  tools: [...coreTools, ...characterTools],
  hooks: {
    onSessionStart: async () => {
      await session.log("🦸 Marvel Agents extension loaded — use marvel_summon to channel a hero!");
    },
    onUserPromptSubmitted: async (input, invocation) => {
      const activeKey = getActiveCharacter(invocation.sessionId);
      if (!activeKey) return;

      const char = CHARACTERS[activeKey];
      if (!char) return;

      return {
        additionalContext: char.personality,
      };
    },
  },
});
