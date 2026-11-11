# IP Man Home Office: notes for Claude

Context about the owner's setup to remember in every session:

- **Floor 3 (In-house Office)** is Ivan's **in-house office**: every employee there works for Ivan and
  does things for him (they run his scheduled tasks).
- **Floor 2** is the **Outsource AI Team** office, kept for future use. Ivan may do business for
  other companies, with employees working for those clients. He may call himself the
  "outsource AI team" when talking about this floor.
- Panel floors (`home` in `js/employees.js`): Floor 1 = Jennie (cashier), Lisa (barista), Rose (receptionist), Jisoo (usher), Lily, Robert;
  Floor 4 = Ivan, Phil (Chill Home); Floor 3 = Kenny (manager), JungKook, XiaoMing, Sally, Aida, Mary; Floor 5 = Eugene.
- Employees are linked to the owner's scheduled tasks by task name. The floor panel shows the
  latest message of each task from `reports/latest.json`.
- **Floor order:** 1F Joe's Café · 2F Outsource AI Team · 3F In-house Office · 4F Chill Home · 5F Japanese Garden (roof: glass gym + Japanese garden; Mt Fuji in the backdrop, `mtFuji()` in js/main.js).
  (The Chill Home is built by `floor2()` in js/floors.js; walking-map ids in js/staff.js use the real floor number.)
- Always merge finished work into `main` (GitHub Pages publishes from `main`).
- **Japanese theme** (branch `japanese-theme`, backup of the old look on `original-look`): 1F is a
  three-storey atrium tea house (floor heights: `floorY()` / `floorH()` in js/helpers.js), shared
  Japanese props in js/japan.js, seasons + day/night synced to Singapore time in js/env.js
  (preview with `?season=spring&time=21&friday=1`), Web Audio ambient sounds (no music, by request) + mute button in js/audio.js.
- **Floor panel refresh = on request only.** Ivan says "refresh the panel" and Claude updates
  `reports/latest.json` on `main` (no background updater, to save his usage allowance; the
  "Update office floor panel" scheduled task exists but is switched OFF because scheduled sessions
  can't read other tasks' transcripts or push to GitHub). He may set up an automatic updater from
  claude.ai later, once he has his own PC.
  How to refresh: `list_triggers` -> each task's `last_run.session_id` -> `list_events`
  (kinds ["assistant"]) -> take the last `SendUserMessage` message (or the last text block) and
  its `created_at` -> write `{"sentAt", "text"}` under the task name -> commit + push to `main`.
  Also update `"status"` in the same file (task name -> `ok` | `error` | `setup`) from each task's
  `last_run.status`: it drives Kenny's daruma wall on Floor 3 (never include Eugene's tasks).
- **Never publish Eugene's tasks** in any form (no text, no timestamp): they hold Ivan's personal
  health info and the repo/site are public. Sally's nutrition reads are fine to publish in full.
- **Kenny** (Floor 3 manager) checks the team every day at 1:07 pm SGT with his scheduled task
  "Kenny team check (manager)" (it has the Claude Code Remote connector so it can call list_triggers).
  He messages Ivan + sends a push notification only when a task failed, is overdue or is switched off.
  Ivan can also say "Kenny, check the team" any time: use list_triggers and report the same way.
