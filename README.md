<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Agent Skills

A collection of agent skills designed to help developers design, build, evaluate, audit, and integrate [WebMCP (Web Model Context Protocol)](https://github.com/webmachinelearning/webmcp) tools into their web applications following official Chrome recommendations.

---

## Skills Catalog

| Skill Name | Description | Link |
| :--- | :--- | :--- |
| **`build-webmcp-tools`** | Comprehensive guide and workflow for the complete WebMCP lifecycle: user goals portfolio, starting states matrix, turn-by-turn roleplay, edge-case variations, schema & evals generation, and framework integration (React, Angular, Vanilla JS, Declarative HTML). Enforces official Chrome character budgets, annotations, agent security guardrails, DevTools/Lighthouse inspection, and an exhaustive review checklist. | [SKILL.md](skills/build-webmcp-tools/SKILL.md) |

### Technical References in `build-webmcp-tools`

* **[Use Case Markdown Template](skills/build-webmcp-tools/references/use-case-template.md)**: Standardized template for cataloging user journeys, turn-by-turn roleplay, and discovered tools.
* **[Evaluations, Debugging & Auditing Specification](skills/build-webmcp-tools/references/evals-format.md)**: Evals schema (`evals.json`), troubleshooting matrix, DevTools WebMCP pane, and Lighthouse audits.
* **[React Integration Guide (`use-webmcp-tool`)](skills/build-webmcp-tools/references/react-patterns.md)**: Component-scoped tools, state-gated tools with `enabled`, v0.2.0 gotchas, and Vitest testing.
* **[Angular Integration Guide](skills/build-webmcp-tools/references/angular-patterns.md)**: `provideExperimentalWebMcpTools`, auto-cleanup injectors, and Signal Forms integration.
* **[Declarative HTML Forms Guide](skills/build-webmcp-tools/references/declarative-patterns.md)**: Form markup, pairing rules, Lighthouse audit criteria, window events, and CSS pseudo-classes.
* **[Vanilla JS & Native Imperative Guide](skills/build-webmcp-tools/references/vanilla-patterns.md)**: `document.modelContext.registerTool`, discovery APIs (`getTools`), and cross-origin security (`exposedTo`, `iframe allow="tools"`).
* **[Agent Security & Prompt Injection Defense](skills/build-webmcp-tools/references/agent-security.md)**: Threat models, spotlighting (tags vs Base64), classifiers, and user-alignment critics.
* **[Official Chrome Sources & Spec Index](skills/build-webmcp-tools/references/sources.md)**: Complete index of official Chrome docs, blog posts, and Google Chrome Labs repositories.

---

## Installing Skills in Your Agent

You can install skills from this repository into your AI coding assistant (e.g., Antigravity, Gemini CLI, Cursor, Claude Code):

### Using Skills CLI
```bash
npx skills add andreban/webmcp-skills
```

### Manual Installation
Copy the skill folder into your project's workspace agent directory:
```bash
# Antigravity / Gemini CLI convention
cp -r skills/build-webmcp-tools <your-project>/.agents/skills/

# Cursor convention
cp -r skills/build-webmcp-tools <your-project>/.cursor/skills/
```

---

## Running Skill Evaluations

This repository uses [Promptfoo](https://www.promptfoo.dev/) to evaluate skill adherence, stage routing accuracy, and code generation compliance.

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment
Set your Google AI API key:
```bash
export GEMINI_API_KEY="your-gemini-api-key"
```

### 3. Run Evaluations
```bash
# Run evaluations against the skills
npm test

# Open interactive HTML report
npm run test:view
```

---

## License

Apache 2.0. See [LICENSE](LICENSE) for details.
