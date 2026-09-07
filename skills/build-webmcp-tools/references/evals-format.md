<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# WebMCP Tool Schema & Evals Specification

This guide specifies the format for declaring WebMCP tool schemas (`schema.json`) and automated evaluations (`evals.json`) compatible with the `webmcp-evals` framework.

---

## 1. WebMCP Tool Schema (`schema.json`)

The schema file contains an object with a `tools` array. Each tool defines its `name`, a clear natural-language `description`, and a standard JSON Schema `inputSchema`.

```json
{
  "tools": [
    {
      "name": "search_flights",
      "description": "Searches for available flights between origins and destinations for specified dates.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "origin": {
            "type": "string",
            "description": "3-letter IATA departure airport code (e.g., SFO, JFK)"
          },
          "destination": {
            "type": "string",
            "description": "3-letter IATA arrival airport code (e.g., LHR, HND)"
          },
          "departure_date": {
            "type": "string",
            "description": "Departure date in YYYY-MM-DD format"
          },
          "cabin_class": {
            "type": "string",
            "enum": ["economy", "premium_economy", "business", "first"],
            "description": "Preferred cabin class (optional)"
          },
          "nonstop_only": {
            "type": "boolean",
            "description": "True if only non-stop direct flights should be returned"
          }
        },
        "required": ["origin", "destination", "departure_date"]
      }
    },
    {
      "name": "book_flight",
      "description": "Books a specific flight for the current user using their profile and flight ID.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "flight_id": {
            "type": "string",
            "description": "Unique identifier of the flight to book"
          }
        },
        "required": ["flight_id"]
      }
    }
  ]
}
```

### Schema Best Practices
* **Positive Descriptions**: State clearly what the tool accomplishes rather than listing negative restrictions.
* **Avoid Agent Calculations**: Accept raw inputs (e.g., raw search query or date string) rather than expecting the agent to compute offsets or indices.
* **Document Every Property**: Every parameter in `properties` should have a descriptive `description` to prevent model hallucinations.

---

## 2. Evals Test Suite (`evals.json`)

The evaluations file is a JSON array of test cases. Each test case provides conversational prompt messages and the expected tool invocations.

```json
[
  {
    "name": "Search direct economy flight to JFK",
    "messages": [
      {
        "role": "user",
        "type": "message",
        "content": "I need a direct flight from SFO to JFK on 2026-10-15 in economy class."
      }
    ],
    "expectedCall": [
      {
        "functionName": "search_flights",
        "arguments": {
          "origin": "SFO",
          "destination": "JFK",
          "departure_date": "2026-10-15",
          "cabin_class": "economy",
          "nonstop_only": true
        }
      }
    ]
  },
  {
    "name": "Date extraction pattern matching",
    "messages": [
      {
        "role": "user",
        "type": "message",
        "content": "Look up flights from Seattle (SEA) to Chicago (ORD) for next Tuesday."
      }
    ],
    "expectedCall": [
      {
        "functionName": "search_flights",
        "arguments": {
          "origin": "SEA",
          "destination": "ORD",
          "departure_date": "/^202[0-9]-[0-1][0-9]-[0-3][0-9]$/"
        }
      }
    ]
  },
  {
    "name": "Multi-turn booking selection",
    "messages": [
      {
        "role": "user",
        "type": "message",
        "content": "Book flight AA-100 for me."
      }
    ],
    "expectedCall": [
      {
        "functionName": "book_flight",
        "arguments": {
          "flight_id": "AA-100"
        }
      }
    ]
  }
]
```

### Matching Features Supported by `webmcp-evals`
1. **Exact Matching**: Literal values (`"economy"`, `true`, `42`).
2. **Regex Patterns**: Enclose pattern in slashes (e.g., `"arguments": { "date": "/^202[0-9]-[0-9]{2}-[0-9]{2}$/" }`).
3. **Sequential (Ordered) Invocations**: By default, multiple items in `expectedCall` expect the LLM to call tools in that exact sequence.
4. **Unordered Invocations**: Can be tested via unordered eval suites (`evals-unordered.json`) when tool call sequence order is flexible.

---

## 3. Running Evaluations with CLI

The `webmcp-evals` CLI runs evaluations against your generated tool schemas:

### Local Evaluation (Against static `schema.json`)
```bash
# Using Vercel AI SDK backend (default)
npx webmcp-evals local -t schema.json -e evals.json

# Using Gemini backend with Gemini 3.5 Flash
npx webmcp-evals local -b gemini -m gemini-3.5-flash -t schema.json -e evals.json

# Run 3 iterations per test case to evaluate consistency
npx webmcp-evals local -t schema.json -e evals.json -r 3
```

### Live Browser Evaluation (Against active WebMCP page)
```bash
# Evaluates tools exposed on a running web application
npx webmcp-evals browser --url http://localhost:3000 -e evals.json
```
