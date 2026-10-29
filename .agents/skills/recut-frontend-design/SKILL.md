---
name: recut-frontend-design
description: Designs and implements ReCut OS premium industrial SaaS interfaces, dark theme, responsive dashboards, accessible material/job forms, interactive SVG cutting plans, and honest impact cards.
---

# Goal
Make ReCut OS feel like credible professional manufacturing software rather than a student hackathon template.

## Visual system
- Palette: `#0B1013` page, `#11171B` shell, `#1C2529` cards, `#F2F0E9` primary text, `#A9B4B4` muted text, `#29B49B` action/valid placement, `#E8AA65` warning/offcut. Use red only for errors.
- Typography: Inter or Geist; consistent hierarchy with 12–14px metadata, 14–16px body, 24–36px headings; tabular numbers for mm, %, and currency.
- Components: shadcn/ui with thoughtful customization, 8–12px radii, subtle borders, visible state changes; clean sidebar, crisp tables, generous input form layout.
- Charts: use sparingly. SVG cutting diagrams and baseline comparisons deserve the most space.

## Procedure
1. Read PRD sections 4–6 and analyze which user decision each screen enables.
2. Define shared tokens and build the shell/navigation, data tables, form components, source status chips, and metric cards.
3. Create a striking but clear public landing with one primary CTA: **Try the live demo**. Emphasize reuse and validated cutting, not AI buzzwords.
4. Ensure `/demo` is fully functional through the shared optimizer and visibly labeled illustrative.
5. Build diagram explorer as responsive **SVG** in consistent mm-coordinate geometry; provide zoom/pan or fit-to-container, labels, dimensions, legend, selectable part details, cut order and recoverable vs scrap regions. Give a textual alternative.
6. The plan comparison must show absolute counts/cost, baseline assumptions, neutral/negative delta, and source provenance.
7. Make optimistic interaction use carefully controlled and backed by server outcomes; never mock a persisted change.
8. Audit 375px, 768px, 1280px widths; prevent diagram overflows, inaccessible modals, and unreadable tables.
9. Honor reduced-motion settings and keep animation restrained.

## Review checklist
Can a guest understand the core value and run the demo in 3 clicks? Are all metrics derived from actual calculation? Does the diagram remain usable without color alone? Is the UI clearly truthful about simulation vs measured outcomes?
