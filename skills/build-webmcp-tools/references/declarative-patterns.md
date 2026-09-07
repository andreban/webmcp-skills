<!--
Copyright 2026 Andre Cipriani Bandarra
SPDX-License-Identifier: Apache-2.0
-->

# Declarative WebMCP Patterns (HTML Forms API)

This guide covers the WebMCP Declarative API, which transforms standard HTML `<form>` elements into AI-callable tools directly via markup attributes.

---

## 1. Markup Attributes

The browser synthesizes a JSON Schema tool definition directly from standard HTML forms annotated with these attributes:

* **`toolname`**: Unique identifier for the tool (e.g., `toolname="search-flights"`).
* **`tooldescription`**: Natural-language description of the tool's purpose.
* **`toolautosubmit`**: (Optional) When present, allows the browser agent to submit the form immediately without prompting the user for manual confirmation.
* **`toolparamdescription`**: (Optional) Custom description for an `<input>`, `<select>`, or `<textarea>`.
  * *Resolution Order*: `toolparamdescription` $\rightarrow$ associated `<label>` text $\rightarrow$ `aria-description`.
  * *Fieldset Grouping*: Put `toolparamdescription` on a `<fieldset>` to document a group of related elements (e.g., `<input type="radio">` buttons).

---

## 2. Example: Declarative Form with Grouping

```html
<form toolname="search_rentals"
      tooldescription="Searches available vacation rental properties by city and amenities"
      toolautosubmit>
  
  <label for="city">Destination City</label>
  <input type="text" id="city" name="city" required>

  <label for="guests">Number of Guests</label>
  <input type="number" id="guests" name="guests" min="1" max="10" toolparamdescription="Total number of adults and children" required>

  <!-- Grouped parameter using fieldset -->
  <fieldset toolparamdescription="Type of accommodation requested">
    <legend>Property Type</legend>
    <label><input type="radio" name="property_type" value="entire_home" checked> Entire Home</label>
    <label><input type="radio" name="property_type" value="private_room"> Private Room</label>
  </fieldset>

  <button type="submit">Search Rentals</button>
</form>
```

---

## 3. Submitting & Returning Payloads to the Agent

When an AI agent invokes the tool, the browser fires a standard `SubmitEvent`. The event includes two special WebMCP properties:
* **`event.agentInvoked`** (`boolean`): True if submitted by an AI agent.
* **`event.respondWith(promise)`**: Allows returning structured data or validation error messages directly back to the agent without triggering page navigation.

```javascript
document.querySelector('form[toolname="search_rentals"]').addEventListener('submit', async (event) => {
  event.preventDefault();

  const formData = new FormData(event.target);
  const city = formData.get('city');

  // 1. Validation error handling
  if (!city || city.trim() === '') {
    if (event.agentInvoked) {
      event.respondWith(Promise.resolve({
        error: "VALIDATION_FAILED",
        message: "A destination city must be provided."
      }));
    }
    return;
  }

  // 2. Perform search
  const resultsPromise = fetch(`/api/rentals?city=${encodeURIComponent(city)}`)
    .then(r => r.json())
    .then(data => {
      renderRentalsList(data.results);
      return {
        total_count: data.results.length,
        items: data.results.map(item => ({ id: item.id, title: item.title, price: item.price }))
      };
    });

  // 3. Return results directly to agent
  if (event.agentInvoked) {
    event.respondWith(resultsPromise);
  }
});
```

---

## 4. `toolautosubmit` Policy: Safe vs. Human-in-the-Loop

### When to INCLUDE `toolautosubmit`:
* **Read-only queries**: Product search, flight lookup, checking availability.
* **Reversible low-risk actions**: Adding items to a shopping cart, changing temporary UI view filters, saving a draft.

### When to OMIT `toolautosubmit` (Requires User Interaction):
* **Financial transactions**: Submitting payment, authorizing charges, booking reservations.
* **Destructive changes**: Deleting records, canceling accounts, wiping data.
* **Sensitive data or messaging**: Submitting job applications, sending messages to other people, updating account passwords.

When `toolautosubmit` is omitted, the browser automatically pauses agent execution and prompts the user to review the pre-filled form and click submit manually.

---

## 5. Visual Styling with CSS Pseudo-Classes

Enhance user visibility during agentic interaction:

```css
/* Highlights the form currently active by the AI agent */
form:tool-form-active {
  outline: 2px dashed #1a73e8;
  background-color: rgba(26, 115, 232, 0.05);
}

/* Highlights the submit button when waiting for user review */
button:tool-submit-active {
  outline: 2px solid #d93025;
  box-shadow: 0 0 8px rgba(217, 48, 37, 0.4);
}
```
