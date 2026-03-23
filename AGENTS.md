# Repository Guidelines

## Project Structure & Module Organization

This repository is currently documentation-first. The main content lives in `docs/plans/`, which contains dated planning artifacts such as the PRD, technical architecture, API spec, schema design, and task lists for the AI coding tutor project. Use the existing filename pattern when adding new docs: `YYYY-MM-DD-topic-name.md`. Local agent permissions live in `.claude/settings.local.json`. Do not place new planning files at the repository root.

## Build, Test, and Development Commands

No application runtime, `package.json`, or `Makefile` is checked in yet, so there is no project build pipeline to run. For now, contributors should use lightweight validation:

- `rg --files docs/plans` to confirm file placement and naming.
- `sed -n '1,80p' docs/plans/<file>.md` to spot-check structure and front matter.
- `git diff -- AGENTS.md docs/plans` to review documentation-only edits when working in a Git clone.

If you introduce runnable code, add the corresponding build and test scripts in the same change.

## Coding Style & Naming Conventions

Write Markdown with short sections, clear headings, and direct language. Keep line content readable in plain text and prefer ordered or flat bullet lists over dense paragraphs. Existing documents are written primarily in Chinese with English product and stack terms; keep terminology consistent. Use lowercase kebab-case for filenames after the date prefix.

## Testing Guidelines

There is no automated test suite in this snapshot. Treat document quality as the test target: verify links, headings, table formatting, and cross-document references before submitting. When implementation begins, place tests next to the delivered runtime and document the exact command used to run them in the same PR.

## Commit & Pull Request Guidelines

This workspace snapshot does not include `.git`, so local commit history is unavailable. Use Conventional Commits going forward, for example `docs: add database schema notes` or `feat: scaffold Next.js app`. Keep each pull request scoped to one planning artifact or one implementation slice, include a short summary, list affected files, and add screenshots only when UI work is introduced.

## Contributor Notes

Prefer updating an existing plan doc before creating a duplicate. When assumptions change, update the PRD or architecture doc first, then align downstream files such as the task list or API spec.
