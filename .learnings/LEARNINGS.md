## [LRN-20260414-001] correction

**Logged**: 2026-04-14T22:15:00+08:00
**Priority**: medium
**Status**: pending
**Area**: docs

### Summary
Chrome DevTools screenshot export did not preserve the intended 16:9 output size for cover generation.

### Details
A cover image intended to be 1920x1080 was exported as 3840x1472. The user correctly identified that the image was effectively cropped. For final cover assets, validate pixel dimensions after export and prefer scripted rendering with an explicit viewport when exact aspect ratio matters.

### Suggested Action
Use Playwright or another deterministic renderer for cover exports, then verify with sips before delivering.

### Metadata
- Source: user_feedback
- Related Files: tmp/douyin-ppt-cover-landscape.png
- Tags: cover, export, aspect-ratio

---

## [LRN-20260518-001] correction

**Logged**: 2026-05-18T07:36:06Z
**Priority**: medium
**Status**: pending
**Area**: docs

### Summary
Do not rely on docs/plans or migration README summaries as the source of truth for the latest migration number.

### Details
The project README still stated migrations had reached 049, but the actual `supabase/migrations` directory already contained 050 and 051. The user corrected this while planning site information management. For migration planning, inspect the migration directory directly before choosing the next migration number.

### Suggested Action
Before adding or discussing migrations, run `rg --files supabase/migrations | sort | tail` and use the highest numbered SQL file in the directory, then update stale docs if the task includes a documentation sync pass.

### Metadata
- Source: user_feedback
- Related Files: supabase/migrations, supabase/migrations/README.md, docs/plans/README.md
- Tags: migrations, docs, source-of-truth

---
