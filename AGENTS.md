# Extension Builder — Agent Guide

## Estado
Proyecto nuevo — sin stack definido aún.

## LLM Wiki

> **HARD RULE**: Before reading ANY source code or answering ANY project question,
> you MUST load the `wiki` skill AND immediately read both:
> - `.opencode/skills/wiki/references/conventions.md`
> - `docs/wiki/index.md`
>
> These two reads are MANDATORY pre-flight steps. The skill's inline content is NOT a substitute.
> If the question involves a specific feature, also read the relevant wiki page BEFORE reading code.

This project maintains a knowledge wiki at `docs/wiki/` following the [LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f).

- **Before touching code**: consult `docs/wiki/` for architecture, gotchas, and feature flows.
- **After touching code**: update affected wiki pages. Load the `wiki` skill (`.opencode/skills/wiki/SKILL.md`) for the full workflow.
- **Raw sources** are in `docs/raw/` (immutable, read-only).
- **Index**: `docs/wiki/index.md` — catalog of all pages.
- **Log**: `docs/wiki/log.md` — chronological record of all wiki changes.
- **Conventions**: `.opencode/skills/wiki/references/conventions.md` — page format and cross-referencing rules.

### Triggers
| Action | Wiki update required |
|--------|---------------------|
| New implementation plan in `docs/raw/plans/` | Ingest into wiki |
| Modify `AGENTS.md` | Check skill `wiki` for consistency |
| Any question about the project | Query wiki first before reading code |
| Valuable business/strategy discussion | Propose saving as plan in `docs/raw/plans/` then ingest |
| User says "revisa la wiki" or "wiki lint" | Execute full lint operation |
