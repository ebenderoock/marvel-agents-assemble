<!-- AUTO-GENERATED from characters.json — DO NOT EDIT -->
---
name: marvel-assemble
description: "Launch a multi-agent Marvel review. Multiple character agents analyze the same target in parallel, then synthesize findings. Presets: code_review, security_sweep, deploy_check, refactor_plan, full_avengers."
---

# ⚔️ Marvel Assemble — Multi-Agent Review

When this skill is invoked, orchestrate a parallel review using Marvel character custom agents.

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

```
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
```
