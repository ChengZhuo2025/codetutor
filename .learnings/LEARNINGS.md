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
