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
- **Floor order:** 1F Joe's Café · 2F Outsource AI Team · 3F In-house Office · 4F Chill Home · 5F Japanese Garden · 6F Private Onsen (half floor).
  **Private (Ivan & Phil only, no staff routes):** 4F left of the shoji wall (x < -12.6: music/game rooms, living room, tatami room), the spiral
  loft stair (front, by the music-room door), the 5F bedroom (left end) and 6F (`PRIVATE`, `privateBedroom()`, `floor6()` in js/floors.js). Staff take breaks in the 4F pantry lounge.
  Ivan & Phil's last daily phase ('onsen' in js/staff.js, `privateTrip()` + `Actor.spiral()`): bedroom tea, then the 6F onsen.
  (The Chill Home is built by `floor2()` in js/floors.js; walking-map ids in js/staff.js use the real floor number.)
- **Symmetry matters to Ivan (OCD):** place furniture, plants and lanterns symmetrically and evenly spaced
  (mirror sets about a centre line, lanterns exactly half way between tables, rows on a grid).
- Always merge finished work into `main` (GitHub Pages publishes from `main`). When JS files change,
  bump the `?v=` version in index.html (import map + main script) so phones don't mix cached old files with new ones.
- **Japanese theme** (live on `main` since 11 Nov 2026; the old look is saved on branch `original-look`): 1F is a
  three-storey atrium tea house (floor heights: `floorY()` / `floorH()` in js/helpers.js), shared
  Japanese props in js/japan.js, seasons + day/night synced to Singapore time in js/env.js
  (preview with `?season=spring&time=21&friday=1`). The building is 47 m long (two 40% extensions):
  floor content is laid out for the 33.6 m building and stretched by `stretchFloor()` in js/main.js using
  `shift2()` in js/building.js; things placed in the new space use `fillGroup()` (real positions). No sounds or music (removed at Ivan's request).
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
