<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# Vanilla JavaScript & General Framework WebMCP Patterns

This guide provides reference patterns for implementing WebMCP tools using the native browser Imperative API (`document.modelContext.registerTool`). Use this for Vanilla JavaScript, Vue, Svelte, or custom frontend architectures.

---

## 1. Core API & Tool Registration

The browser exposes WebMCP on **`document.modelContext`**.

```javascript
// Check for WebMCP support
if ('modelContext' in document && 'registerTool' in document.modelContext) {
  const controller = new AbortController();

  await document.modelContext.registerTool(
    {
      name: "search_catalog",
      description: "Searches the catalog for products by keyword and category.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search terms" },
          category: { type: "string", description: "Optional category filter" },
          page: { type: "integer", minimum: 1, description: "Page number" },
        },
        required: ["query"],
      },
      async execute({ query, category, page = 1 }) {
        // 1. Fetch or filter data
        const data = await fetchCatalog(query, category, page);

        // 2. IMPORTANT: Update the UI DOM first so the agent sees consistent state
        renderProductGrid(data.results);

        // 3. Return structured payload to the agent
        return {
          total_count: data.total,
          page: data.page,
          page_size: 12,
          results: data.results,
        };
      },
      annotations: {
        readOnlyHint: true, // Signals that this tool performs a safe, read-only query
      },
    },
    { signal: controller.signal }
  );

  // When tearing down or navigating away:
  // controller.abort();
}
```

---

## 2. Critical Lifecycle Rules

### Use `AbortSignal` for Cleanup (Never `unregisterTool`)
WebMCP does **not** provide an `unregisterTool()` method. To unregister tools when switching views, routes, or destroying UI components:
* Always pass `{ signal: controller.signal }` in the second argument to `registerTool`.
* Call `controller.abort()` when the tool should be deactivated.

### Return After UI Renders
AI agents observe both tool responses and DOM updates. If a tool triggers a UI state update asynchronously after resolving, the agent might inspect the page or issue its next message while the DOM is still stale.
* Await render/state updates inside `execute()` before returning the result.

---

## 3. Tool Factory Pattern for State & Stores

When your tools need access to application state (e.g. Redux store, Pinia, router, or local managers), use a factory function:

```javascript
export function registerCartTools(cartStore, abortSignal) {
  if (!('modelContext' in document)) return;

  document.modelContext.registerTool({
    name: "add_item_to_cart",
    description: "Adds a specified product and quantity to the active shopping cart.",
    inputSchema: {
      type: "object",
      properties: {
        productId: { type: "string", description: "The product SKU/ID" },
        quantity: { type: "number", minimum: 1, description: "Number of units" }
      },
      required: ["productId"]
    },
    async execute({ productId, quantity = 1 }) {
      await cartStore.addItem(productId, quantity);
      return {
        status: "success",
        cartTotal: cartStore.totalCount,
        message: `Added ${quantity} of ${productId} to cart.`
      };
    }
  }, { signal: abortSignal });
}
```

---

## 4. Feature Detection & Polyfill Fallback

To support environments where native WebMCP is not yet enabled:

```html
<!-- Load the WebMCP polyfill before your application scripts -->
<script src="/shared/webmcp-polyfill.js"></script>
```

Or detect features in code:
```javascript
const modelContext = document.modelContext || navigator.modelContext;
if (modelContext && typeof modelContext.registerTool === 'function') {
  // Safe to register
}
```

> **API Deprecation Notice**: Older Chromium previews mounted on `navigator.modelContext`. The current WebMCP specification standardizes on **`document.modelContext`**.
