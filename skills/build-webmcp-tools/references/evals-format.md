<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Evaluations, Debugging & Auditing Specification

This guide specifies how to test, evaluate, debug, and audit WebMCP tools across deterministic unit testing, probabilistic model evaluations (`evals.json`), Chrome DevTools inspection, and Lighthouse audits.

---

## 1. Multi-Layer Testing Strategy

Agents are probabilistic; identical prompts can produce different paths. Before deploying tools to production, test across five distinct layers:

1. **Deterministic Unit Tests**: Mock `document.modelContext.registerTool`, invoke the captured `execute` callback directly, and assert state store updates, argument validation, and return payloads without invoking an LLM.
2. **Tools in Isolation**: Verify schemas and descriptions in isolation. Trigger tools directly using `document.modelContext.executeTool(tool, jsonString)` to verify parser behavior before introducing model randomness.
3. **Probabilistic Model Evals**: Run conversational prompt suites to confirm the model selects the right tool and extracts the correct parameters under both direct queries ("Book flight AA-100") and ambiguous queries ("Find me a morning flight next Friday").
4. **End-to-End User Journeys**: Verify complete multi-turn flows (e.g. `search_flights` $\rightarrow$ `select_flight` $\rightarrow$ `initiate_booking`), specifying ordering constraints where sequence matters.
5. **Mid-Chain Failures**: Advance the application state directly to an intermediate step and simulate failures (e.g. discount coupon expired) to ensure the agent recovers gracefully rather than blindly completing the journey.

---

## 2. Evaluation File Format (`evals.json`)

Evaluation suites provide test cases matching conversational messages against expected tool calls.

### Single Tool / Direct Query
```json
[
  {
    "name": "Direct flight search",
    "messages": [
      {
        "role": "user",
        "type": "message",
        "content": "I need a flight from SFO to JFK on 2026-10-15 in economy class."
      }
    ],
    "expectedCall": [
      {
        "functionName": "search_flights",
        "arguments": {
          "origin": "SFO",
          "destination": "JFK",
          "departure_date": "2026-10-15",
          "cabin_class": "economy"
        }
      }
    ]
  }
]
```

### Multi-Step Journey with Ordered & Unordered Constraints
When some steps must occur sequentially while others can execute in any order (such as looking up details for multiple items), use nested `ordered` and `unordered` blocks:

```json
[
  {
    "name": "Multi-item lookup journey",
    "messages": [
      {
        "role": "user",
        "type": "message",
        "content": "Find black running shoes and red water bottles, and show details for both."
      }
    ],
    "expectedCall": [
      { "functionName": "navigate_to_catalog", "arguments": { "category": "sports" } },
      {
        "unordered": [
          {
            "ordered": [
              { "functionName": "search_products", "arguments": { "query": "black running shoes" } },
              { "functionName": "get_product_details", "arguments": { "productId": "SHOE-101" } }
            ]
          },
          {
            "ordered": [
              { "functionName": "search_products", "arguments": { "query": "red water bottle" } },
              { "functionName": "get_product_details", "arguments": { "productId": "BOTTLE-202" } }
            ]
          }
        ]
      }
    ]
  }
]
```

### Argument Matching Rules
* **Exact Matching**: Matches primitive values (`"SFO"`, `true`, `42`).
* **Regex Pattern Matching**: Enclose strings in regex slashes (e.g. `"departure_date": "/^202[0-9]-[0-1][0-9]-[0-3][0-9]$/"`).
* **Realistic Tool Sets**: When evaluating tool selection, always supply the **complete tool catalog for that page state** so the agent must choose between competing tools.

---

## 3. Failure-Mode Troubleshooting Matrix

When an evaluation fails or an agent misbehaves, consult this diagnostic guide:

| Failure Mode | Typical Symptom | Diagnostic Checks |
| :--- | :--- | :--- |
| **Wrong Tool Selected / Skipped** | Agent calls `checkout` without calling `add_to_cart`. | • Description clear, positive, and complete?<br>• Name intuitive (action-verb ≤ 30 chars)?<br>• Tool exposed in current page state?<br>• Description overlaps with another tool? |
| **Incorrect Step Ordering** | Calls `select_seat` before `search_flights`. | • Does preceding tool output supply required context?<br>• Are tools dynamically exposed/gated by application state?<br>• Test the isolated sub-chain by pre-seeding state. |
| **Invalid or Hallucinated Arguments** | Agent sends raw text instead of enum, or wrong date format. | • `inputSchema` has explicit `enum` arrays and property descriptions?<br>• Required fields declared?<br>• Description explains how to map user input to structured values? |
| **Stale or Missing Output** | Agent reports wrong total or claims action failed. | • Tool logic bug?<br>• UI state update awaited before returning payload?<br>• Payload concise and formatted for LLM consumption (≤ 1.5K chars)? |
| **Runtime Exceptions / Crash** | Agent stops abruptly; tool crashes. | • Runtime exceptions caught and re-thrown with actionable messages?<br>• Network failures handled?<br>• Is error distinguishable between retryable vs fatal? |

---

## 4. Debugging with Chrome DevTools (Chrome 149+)

Enable Chrome flags:
* `chrome://flags/#enable-webmcp-testing`
* `chrome://flags/#devtools-webmcp-support`

Open **Chrome DevTools $\rightarrow$ Application $\rightarrow$ WebMCP**:

1. **Available Tools Pane**:
   * Displays all active declarative and imperative tools as the browser agent sees them.
   * Features an **invocation counter** per tool. A count of zero across sessions indicates the agent never deemed the tool relevant.
2. **Invoked Tools Log**:
   * Chronological log showing Status (`Completed`, `Canceled`, `In Progress`, `Error`), input arguments received, and returned payload.
3. **Manual Tool Execution**:
   * Click any tool or click the Play icon on a log entry to execute tools manually with custom parameters, bypassing the LLM to verify application state reactions.
4. **Schema Violation Warnings**:
   * Inspect validation warnings when parameters passed by the model do not match the declared JSON Schema.

---

## 5. Chrome DevTools for Agents (`chrome-devtools-mcp`)

Use the Chrome DevTools MCP server to let coding agents interact with running WebMCP web pages:

```json
{
  "mcpServers": {
    "chrome-devtools": {
      "command": "npx",
      "args": [
        "-y",
        "chrome-devtools-mcp@latest",
        "--autoConnect",
        "--categoryExperimentalWebmcp",
        "--channel=canary"
      ]
    }
  }
}
```

* Enables coding agents to query available WebMCP tools, execute tools inside the browser, and inspect accessibility trees and visual renders.

---

## 6. Lighthouse "Agentic Browsing" Audits (Chrome 150+)

Lighthouse evaluates site readiness for AI agents using fractional pass ratios and specific audits:

* **Registered WebMCP Tools**: Audits discovered declarative and imperative tools for action-oriented names and descriptive text.
* **Forms Missing Declarative WebMCP**: Detects standard `<form>` elements lacking `toolname` and `tooldescription`.
* **WebMCP Schema Validity**: Fails if a form has only one of `toolname`/`tooldescription`, or if an input lacks a `name`. Warns if fields lack `toolparamdescription` or `<label>`.
* **Accessibility for Agents**: Verifies that every interactive element has a programmatic accessible name and valid roles.
* **Layout Stability (CLS)**: Asserts Cumulative Layout Shift thresholds so visual position shifts do not cause agent misclicks.
* **`llms.txt`**: Checks for `/llms.txt` per the [llmstxt.org](https://llmstxt.org/) standard summarizing site capabilities and entry points.
