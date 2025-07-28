# Frontend Refactor & Redesign Plan

This document outlines the strategy for revamping the AI Meeting Assistant's frontend, focusing on improving usability, layout, and aesthetics based on modern design principles.

---

## Core Principles

### 1. Simplify the Core Workflow with a "Single Entry Point"

*   **Problem:** The current UI forces users to choose between "Paste Transcript" and "Upload File" upfront and presents redundant "Template" vs. "Meeting Type" options, increasing cognitive load.
*   **Solution:**
    *   **Unified Input:** Replace the tabs with a single, intelligent text area that accepts pasted text, drag-and-drop files, and has an associated "Choose File" button.
    *   **Progressive Disclosure:** Initially show only the input area. Reveal secondary options like "Participants" and "Analysis Type" only after a transcript is provided.
    *   **Consolidate Options:** Merge the two separate meeting type dropdowns into a single, clear "Analysis Type" selector.
*   **Benefit:** This creates a guided, intuitive user experience by focusing on one primary action at a time.

### 2. Transform Results from a Report to an "Actionable Dashboard"

*   **Problem:** The results are presented as a static, non-interactive list. Users cannot act on the information directly within the tool.
*   **Solution:**
    *   **Modern "Bento Grid" Layout:** Redesign the results view into a modern, visually appealing dashboard grid.
    *   **Interactive Components:** Make result cards "live." For example, allow users to check off action items or edit details directly.
    *   **Clear Hierarchy:** Place the most critical information (Summary) in the most prominent position.
*   **Benefit:** This transforms the application from a passive report generator into an active workspace, significantly increasing its utility.

### 3. Elevate the Aesthetic with a "Modern & Cohesive Design System"

*   **Problem:** The current design is generic, lacks a distinct visual identity, and uses basic text characters for icons, which feels unprofessional.
*   **Solution:**
    *   **Professional Iconography:** Replace all text-based icons with a clean, professional SVG icon library (e.g., Feather Icons or Phosphor Icons).
    *   **Refined Visuals & Layout:**
        *   **Color Palette & Dark Mode:** Introduce a refreshed, modern color palette and implement a dark mode toggle.
        *   **Typography:** Establish a clear typographic scale for better readability and hierarchy.
        *   **Component Styling:** Refine the styling of all UI elements (cards, buttons, forms) for a polished, cohesive look.
    *   **Wider, Professional Layout:** Move to a more spacious layout that feels less constrained and more like a professional desktop application.
*   **Benefit:** A strong, modern visual identity builds user trust and makes the application more enjoyable and engaging to use.

---

## Implementation Plan

1.  **Code Refactoring (Foundation First):**
    *   Restructure the monolithic `script.js` into smaller, focused modules (e.g., `ui.js`, `api.js`, `handlers.js`).
    *   Organize the `style.css` file for better maintainability.
2.  **Implement the New Input Flow:**
    *   Redesign the HTML and associated JavaScript logic for the new unified input area.
3.  **Build the Results Dashboard:**
    *   Implement the "bento grid" layout and create the new interactive result components.
4.  **Apply the New Design System:**
    *   Roll out the new colors, typography, icons, and a dark mode across the entire application.

This structured approach will ensure a high-quality revamp of the frontend. 