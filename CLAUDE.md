# IP Man Home Office: notes for Claude

Context about the owner's setup to remember in every session:

- **Floor 3 (In-house Office)** is Ivan's **in-house office**: every employee there works for Ivan and
  does things for him (they run his scheduled tasks).
- **Floor 4** is the **Outsource AI Team** office, kept for future use. Ivan may do business for
  other companies, with employees working for those clients. He may call himself the
  "outsource AI team" when talking about this floor.
- Panel floors (`home` in `js/employees.js`): Floor 1 = Jennie (cashier), Lisa (barista), Rose (receptionist), Jisoo (usher), Lily, Robert;
  Floor 2 = Ivan, Phil; Floor 3 = Kenny (manager), JungKook, XiaoMing, Sally, Aida, Mary; Floor 5 = Eugene.
- Employees are linked to the owner's scheduled tasks by task name. The floor panel shows the
  latest message of each task from `reports/latest.json`.
- Always merge finished work into `main` (GitHub Pages publishes from `main`).
- **Floor panel refresh = on request only.** Ivan says "refresh the panel" and Claude updates
  `reports/latest.json` on `main` (no background updater, to save his usage allowance; the
  "Update office floor panel" scheduled task exists but is switched OFF because scheduled sessions
  can't read other tasks' transcripts or push to GitHub). He may set up an automatic updater from
  claude.ai later, once he has his own PC.
  How to refresh: `list_triggers` -> each task's `last_run.session_id` -> `list_events`
  (kinds ["assistant"]) -> take the last `SendUserMessage` message (or the last text block) and
  its `created_at` -> write `{"sentAt", "text"}` under the task name -> commit + push to `main`.
- **Never publish Eugene's tasks** in any form (no text, no timestamp): they hold Ivan's personal
  health info and the repo/site are public. Sally's nutrition reads are fine to publish in full.
- **Kenny** (Floor 3 manager) checks the team every day at 1:07 pm SGT with his scheduled task
  "Kenny team check (manager)" (it has the Claude Code Remote connector so it can call list_triggers).
  He messages Ivan + sends a push notification only when a task failed, is overdue or is switched off.
  Ivan can also say "Kenny, check the team" any time: use list_triggers and report the same way.
