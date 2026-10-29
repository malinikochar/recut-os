---
name: recut-accessibility
description: Audits and fixes ReCut OS keyboard navigation, screen-reader semantics, form labels, focus states, reduced motion, diagram text alternatives, and contrast. Use before final UI release or when building interactive screens.
---

# Goal
Deliver inclusive, readable manufacturing tools that remain usable with a keyboard and non-visual assistive technology.

## Procedure
1. Check semantic landmarks: header/nav/main, hierarchical headings, table captions, descriptive buttons, and accessible link text.
2. For forms, pair each field with a label, instructions, constraints, and inline error announcement; focus the first invalid input when appropriate.
3. Audit dialogs/popovers for Escape behavior, focus trapping/restoration, and interactive controls' keyboard access.
4. Verify visible focus and WCAG AA contrast for text and essential UI; don't rely on color alone to indicate source material, risk, or savings.
5. Provide data table and textual cut-list alternatives to the visual SVG plan; add accessible summaries and per-piece geometry details.
6. Support 200% zoom, narrow mobile screens, and `prefers-reduced-motion`.
7. Use automated accessibility tooling where available, then manually test keyboard-only happy path and errors.
8. Ensure charts have adjacent textual data explanations and accurate value labels.

## Never
Avoid clickable `div` without keyboard semantics, placeholder-only labels, inaccessible SVG-only information, and color-as-only-stock-provenance indication.
