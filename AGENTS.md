<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## CUBIK project-memory protocol

Before every task, read `docs/AI_HANDOFF.md`. Treat it as the navigation index and current project state.

- Do not scan the whole repository again by default.
- Open only the files listed for the relevant subsystem in `docs/AI_HANDOFF.md`, plus direct imports when required.
- Read `docs/ARCHITECTURE.md` or `docs/ROADMAP.md` only when the task changes product architecture or sequencing.
- Verify assumptions against the targeted source files before editing; the handoff is a map, not a replacement for source-code truth.
- After each material change, update the current-state, completed-work, and next-step sections in `docs/AI_HANDOFF.md`.
- Never overwrite or discard unrelated local changes.
