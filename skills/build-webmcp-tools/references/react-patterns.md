<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# React WebMCP Patterns with `use-webmcp-tool`

This guide explains how to expose WebMCP tools in React applications using the official Google Chrome Labs package [`use-webmcp-tool`](https://www.npmjs.com/package/use-webmcp-tool).

---

## 1. Installation

```bash
npm install use-webmcp-tool
```

Requires React 18+ as a peer dependency.

---

## 2. Core Principles of `useWebMCP`

`useWebMCP` binds the imperative WebMCP registration (`document.modelContext.registerTool`) to React's component lifecycle:
1. **Mount Registration**: The tool is automatically registered with the browser when the component mounts.
2. **Unmount Cleanup**: The tool is unregistered via an `AbortSignal` when the component unmounts, ensuring the agent's available tools stay in sync with what is currently on screen.
3. **Re-render Stability**: Changing functions or stable object schemas will not cause unnecessary registration churn.
4. **Normalized Output**: Return values from `execute` are automatically normalized into WebMCP content blocks:
   * String $\rightarrow$ `{ content: [{ type: "text", text }] }`
   * Object / Array $\rightarrow$ JSON-serialized into text
   * Thrown Error $\rightarrow$ `{ content: [{ type: "text", text: error.message }], isError: true }`

---

## 3. Basic Example: Component-Scoped Tool

```tsx
import React, { useState } from 'react';
import { useWebMCP } from 'use-webmcp-tool';

export function FlightSearch() {
  const [flights, setFlights] = useState([]);
  const [selectedFlight, setSelectedFlight] = useState(null);

  // Register flight search tool
  const { supported, registered, error } = useWebMCP({
    name: 'search_flights',
    description: 'Searches for flights matching destination and departure dates.',
    inputSchema: {
      type: 'object',
      properties: {
        destination: { type: 'string', description: 'Destination airport code (e.g. JFK)' },
        date: { type: 'string', description: 'Departure date YYYY-MM-DD' },
      },
      required: ['destination', 'date'],
    },
    async execute({ destination, date }) {
      const results = await fetch(`/api/flights?dest=${destination}&date=${date}`).then(r => r.json());
      
      // Update UI state before returning so the agent sees consistent DOM
      setFlights(results);

      return {
        total_count: results.length,
        flights: results.map(f => ({ id: f.id, airline: f.airline, price: f.price })),
      };
    },
    annotations: {
      readOnlyHint: true, // Informs agent that this query has no side effects
    },
  });

  return (
    <div className="search-container">
      {supported && <span className="badge">{registered ? '🤖 AI Enabled' : 'Connecting...'}</span>}
      {/* Search results UI */}
      <ul>
        {flights.map(flight => (
          <li key={flight.id}>{flight.airline} - ${flight.price}</li>
        ))}
      </ul>
    </div>
  );
}
```

---

## 4. Mutating Action Tool with Human-in-the-Loop Guardrail

For mutating actions (e.g., booking, checkout), execute the action or transition the user to a confirmation screen rather than completing sensitive payments autonomously:

```tsx
import React from 'react';
import { useWebMCP } from 'use-webmcp-tool';
import { useNavigate } from 'react-router-dom';

export function BookingButton({ flightId }) {
  const navigate = useNavigate();

  useWebMCP({
    name: 'initiate_booking',
    description: 'Pre-selects the flight and navigates the user to the checkout confirmation screen.',
    inputSchema: {
      type: 'object',
      properties: {
        flight_id: { type: 'string', description: 'Flight ID to book' },
      },
      required: ['flight_id'],
    },
    async execute({ flight_id }) {
      // Validate inventory / session
      const valid = await checkInventory(flight_id);
      if (!valid) {
        throw new Error(`Flight ${flight_id} is no longer available.`);
      }

      // Navigate user to confirmation screen (human-in-the-loop)
      navigate(`/checkout?flight=${flight_id}`);

      return {
        status: 'requires_user_action',
        message: 'Flight selected. User has been directed to the checkout screen to confirm payment.',
      };
    },
  });

  return <button onClick={() => navigate(`/checkout?flight=${flightId}`)}>Book Flight</button>;
}
```

---

## 5. Integrating with Global State (Zustand / Redux)

Tools can directly dispatch actions to state stores:

```tsx
import { useWebMCP } from 'use-webmcp-tool';
import { useCartStore } from '../store/cartStore';

export function CartManager() {
  const addItem = useCartStore(state => state.addItem);
  const items = useCartStore(state => state.items);

  useWebMCP({
    name: 'add_to_cart',
    description: 'Adds an item to the shopping cart.',
    inputSchema: {
      type: 'object',
      properties: {
        productId: { type: 'string', description: 'Product ID' },
        quantity: { type: 'number', description: 'Quantity to add' },
      },
      required: ['productId'],
    },
    execute({ productId, quantity = 1 }) {
      addItem(productId, quantity);
      return `Added ${quantity} item(s) to cart. Cart total count is now ${items.length + quantity}.`;
    },
  });

  return null;
}
```
