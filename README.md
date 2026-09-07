<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Agent Skills

A collection of agent skills designed to help developers build, evaluate, and integrate [WebMCP (Web Model Context Protocol)](https://github.com/webmachinelearning/webmcp) tools into their web applications.

---

## Skills Catalog

| Skill Name | Description | Link |
| :--- | :--- | :--- |
| **`build-webmcp-tools`** | Guides developers through the multi-stage WebMCP lifecycle: cataloging product goals, modeling starting states, turn-by-turn roleplay, generating edge-case variations, producing `schema.json` & `evals.json`, and implementing tools in React, Angular, Vanilla JS, or Declarative HTML forms. | [SKILL.md](skills/build-webmcp-tools/SKILL.md) |

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
