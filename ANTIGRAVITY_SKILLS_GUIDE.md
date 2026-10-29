# Antigravity 2.0 Skills Guide — ReCut OS

This repo contains **11 custom workspace skills** specific to building ReCut OS. These are **not external marketplace plugins** and are **not claims that Antigravity requires exactly these 11 skills**. They are practical project-specific playbooks that let Antigravity focus on one demanding responsibility at a time.

## Installation and discovery

The standard location in current Antigravity 2.0 documentation is:

```text
recut-os/
├── PRD.md
├── AGENTS.md
└── .agents/
    └── skills/
        ├── recut-product-planning/SKILL.md
        ├── recut-domain-model/SKILL.md
        ├── recut-geometry/SKILL.md
        ├── recut-impact-benchmark/SKILL.md
        ├── recut-supabase-security/SKILL.md
        ├── recut-nextjs-features/SKILL.md
        ├── recut-frontend-design/SKILL.md
        ├── recut-accessibility/SKILL.md
        ├── recut-quality-assurance/SKILL.md
        ├── recut-vercel-release/SKILL.md
        └── recut-hackathon-demo/SKILL.md
```

Open the project root in Antigravity and inspect the Customizations/Skills interface if skills are not automatically discovered. Each `SKILL.md` has the official-style YAML `name` and `description` metadata followed by a repeatable workflow. You can ask the agent to use a named skill or try its corresponding slash command, such as `/recut-geometry`.

## What each skill handles

| Skill | When to activate | Main output |
|---|---|---|
| `/recut-product-planning` | New feature, unclear milestones | Scope decision, ordered acceptance checklist |
| `/recut-domain-model` | Domain types, schemas, stock lineage | Strict input/output contracts and invariants |
| `/recut-geometry` | Cut algorithm, kerf, feasibility | Guillotine cut tree, independent verifier, geometry tests |
| `/recut-impact-benchmark` | Baseline and sustainability evidence | Reproducible benchmark with truthful cost/scrap metrics |
| `/recut-supabase-security` | Auth, tables, RLS, commit transactions | Owner-safe SQL migrations and policy tests |
| `/recut-nextjs-features` | Integrating a full product workflow | Next.js feature connected to validated server state |
| `/recut-frontend-design` | SaaS UI, diagrams, responsive dashboard | Premium visual system and working forms/diagrams |
| `/recut-accessibility` | UI audit and keyboard support | Accessible forms, plan alternatives, focus/contrast checks |
| `/recut-quality-assurance` | Tests, security checks, regressions | Actual passing test coverage, candid failure report |
| `/recut-vercel-release` | CI, GitHub, env vars, production | Reproducible deployment procedure + smoke checks |
| `/recut-hackathon-demo` | Video, pitch, Devpost, project README | Short evidence-led demo narrative and submission checklist |

## Suggested activation order

1. **Architecture:** `/recut-product-planning` + `/recut-domain-model`
2. **Core algorithm:** `/recut-geometry` + `/recut-impact-benchmark`
3. **Backend:** `/recut-supabase-security` + `/recut-nextjs-features`
4. **Experience:** `/recut-frontend-design` + `/recut-accessibility`
5. **Release confidence:** `/recut-quality-assurance` + `/recut-vercel-release`
6. **Presentation:** `/recut-hackathon-demo`

## Core knowledge worth learning yourself

Skills guide an AI agent but do not replace understanding. The essential technical topics for a strong ReCut OS defense are:

- TypeScript types, functions, async code and Next.js Server/Client Components.
- React state, form validation and responsive UI.
- SQL basics, foreign keys, Row Level Security, Supabase Auth and transactions.
- Rectangle packing vs physically guillotine-feasible cut sequences.
- Saw kerf, constraints, lexicographic optimization and deterministic heuristics.
- Independent verification, unit tests, end-to-end tests and reproducible benchmarks.
- Git commits/branches, GitHub CI, Vercel deployments and environment configuration.
- Sustainable manufacturing metrics and truthful evidence-based presentation.

Documentation: https://antigravity.google/docs/skills and https://antigravity.google/docs/rules/
