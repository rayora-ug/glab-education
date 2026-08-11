# GLAB Student Portal — Google-side setup

One-time setup, done by whoever owns the GLAB Google account.

## 1. Roster spreadsheet

Open the spreadsheet that already has the GLAB ID ↔ Name roster.

- Make sure the tab with that data has a header row containing columns named exactly **`GLAB ID`** and **`Name`** (any other columns, any order, are fine — the script only looks for these by name). Rename the tab to **`Students`** if it isn't already.
- Add three more columns: **`Eligible A1`**, **`Eligible A2`**, and **`Eligible B1`**. These control who can register for what — see "Marking students eligible" below. Leave them blank for students who aren't eligible for anything yet.
- You don't need to create the `Registrations` tab yourself — the script creates it automatically on the first submission, with headers: Timestamp, GLAB ID, Name, Course, Batch ID, Payment Method, Payment Reference, Proof File Link, Feedback, Status.
- You do need to create a **`Batch Links`** tab yourself, with six columns: **`Batch ID`**, **`WhatsApp Group Link`**, **`Google Classroom Link`**, **`Google Meet Link`**, **`Start Date`**, and **`End Date`**. This is how a confirmed student gets their batch's class links and course dates automatically — see "Assigning batch links" below.
- For the MyGLAB dashboard (`/dashboard`), you also need an **`Attendance`** tab and a **`Student Feedback`** tab — see "MyGLAB dashboard" below.
- If you're using `/results` (A1 application results), you also need an **`Applications`** tab — see "A1 applications" below.

## 2. Drive folder for payment proofs

Create a Drive folder (e.g. "GLAB Payment Proofs"). Open it and copy the folder ID from the URL:
`https://drive.google.com/drive/folders/`**`THIS_PART_IS_THE_ID`**

## 3. Add the script

In the roster spreadsheet: **Extensions → Apps Script**. Delete any starter code and paste in the contents of [`Code.gs`](Code.gs) from this repo.

## 4. Set script properties (the shared secret + folder ID)

Still in the Apps Script editor: **Project Settings (gear icon) → Script Properties → Add script property**, add two:

| Property | Value |
|---|---|
| `SHARED_TOKEN` | any long random string you make up — this is the password the website uses to talk to this script. Keep it secret. |
| `DRIVE_FOLDER_ID` | the folder ID from step 2 |

## 5. Deploy as a Web App

**Deploy → New deployment → Select type: Web app.**

- Execute as: **Me**
- Who has access: **Anyone**

Click Deploy, authorize the permissions it asks for (it needs to read the sheet and write to Drive). Copy the **Web app URL** it gives you — you'll need it for step 6.

## 6. Give me two values

Send me (or put in the site's environment variables — see main README):

- `GLAB_SCRIPT_URL` — the Web app URL from step 5
- `GLAB_SCRIPT_TOKEN` — the `SHARED_TOKEN` value you set in step 4

That's the entire Google-side setup. Any time you edit `Code.gs` in the Apps Script editor, you need to do **Deploy → Manage deployments → edit (pencil) → New version → Deploy** for the change to actually take effect — saving alone doesn't redeploy it.

## Ongoing admin tasks

Most of this is still done directly in the spreadsheet. A few things have moved to a password-gated `/admin` page on the site instead — see "Admin panel" further down — but the sheet remains the source of truth for everything.

**Marking students eligible.** On the `Students` tab, set `Eligible A1`, `Eligible A2`, and/or `Eligible B1` to any of `TRUE`, `Yes`, `Y`, `1` (or use a real checkbox column via Format → Checkboxes) to grant access. A student only ever sees batches for the courses they're marked eligible for on `/portal`.

Eligibility is **not** hierarchical in the code — if a student finishes A2 and becomes eligible for B1, and you still want them able to register for A2 again (e.g. a repeat), you need to keep `Eligible A2` checked too. The script won't infer that for you; it's just whatever the two columns say.

**Confirming a payment.** On the `Registrations` tab, every new submission starts with `Status` = `Submitted`. Once you've verified the payment, change that cell to exactly `Confirmed` — the student will see this next time they check `/portal` with their GLAB ID, and (if a WhatsApp link is assigned — see below) get a "Join WhatsApp Group" button. The `/admin` panel's "Pending Payment Verification" list does the same thing with a button instead of editing the cell, and links straight to the uploaded payment proof — see "Admin panel" below.

**Fixing a mistake.** Just edit the `Status` cell back to whichever value is correct — there's no history/audit trail, the cell's current value is the live status.

**Assigning batch links.** On the `Batch Links` tab, add one row per batch: its `Batch ID`, `WhatsApp Group Link`, `Google Classroom Link`, `Google Meet Link`, `Start Date`, and `End Date`. The portal (and the MyGLAB dashboard) only shows these to a student once their registration is `Confirmed` — never before, and any missing value (e.g. Classroom not set up yet, or dates not filled in) is simply skipped rather than shown broken/blank. You can add or change these at any time, no redeploy needed. `Start Date`/`End Date` can be any date format Sheets recognizes.

This is deliberately the *only* place these links live — not just shared once in the WhatsApp group — because a student who joins the group after a link was posted has no way to see it in chat history. Putting it on the confirmation page means logging back in with their GLAB ID always shows the current links, no matter when they join.

Current batch ids (from `data/courses.json` in the site repo) and their links as of the August 2026 batches:

| Batch ID | Batch | Google Classroom | Google Meet |
|---|---|---|---|
| `a2-36-E` | A2 Intensive — 36th Batch (Evening) | https://classroom.google.com/c/ODcxOTAzMjE2OTEz?cjc=mzfxjfhd | https://meet.google.com/veu-erme-rvz |
| `a2-37-M` | A2 Intensive — 37th Batch (Morning) | https://classroom.google.com/c/ODE5OTIyNzIzNTg4?cjc=hr76ldtm | https://meet.google.com/njj-zgsv-zmt |
| `b1-32-M` | B1 Intensive — 32nd Batch (Morning) | https://classroom.google.com/c/ODcxODk4NzI4NjQw?cjc=krlgtntr | https://meet.google.com/mos-gkud-rfm |
| `b1-33-E` | B1 Intensive — 33rd Batch (Evening) | https://classroom.google.com/c/ODcxOTAyODMwNTY3?cjc=jbbg2h6u | https://meet.google.com/fix-nkgx-aaw |

(The `-M`/`-E` suffix marks Morning/Evening, matching the actual batch time — not the batch number.)

A1 batches aren't in `data/courses.json` — they're assigned manually per applicant via the `Batch ID` column on `Applications` (see "A1 applications" below), so add a `Batch Links` row whenever a new one is confirmed:

| Batch ID | Batch | Google Classroom | Google Meet |
|---|---|---|---|
| `a1-39-m` | A1 Intensive — 39th Batch (Morning) | https://classroom.google.com/c/ODcxODkzNDQzMDkz?cjc=bkc7wyhd | https://meet.google.com/sgj-gzjc-sqx |
| `a1-40-e` | A1 Intensive — 40th Batch (Evening) | https://classroom.google.com/c/ODcxOTAyNDExMTA3?cjc=ujdgw663 | https://meet.google.com/yxh-rzfw-aod |

WhatsApp group links for all six batches should already be in the `WhatsApp Group Link` column. If a specific confirmed student still doesn't see their WhatsApp link despite the row being correct, check their row on `Registrations` — `Batch ID` there is written once at submission time and won't update retroactively just because `Applications` or `Batch Links` changed afterward; you'd need to fix that cell directly to match.

If a new batch is ever added to the site, it'll get a new id there — add the matching row here whenever that happens.

## A1 applications (`/results`)

Applicants without a GLAB ID yet (new Foundation+A1 applicants) check whether they were selected on `/results`, using the Email + Date of Birth they gave on the original application form.

**The `Applications` tab** needs your application-form export (Timestamp, Name, Email, Date of Birth, WhatsApp, etc. — whatever you already collect) plus four columns you manage yourself:

| Column | What it's for |
|---|---|
| `Selection Status` | Leave blank while under review. Set to a dropdown (select the column → Data → Data validation → List of items: `Selected`, `Not Selected`) so it's always exactly one of those two once decided. |
| `GLAB ID` | The GLAB ID you assign this applicant — only fill this in once they're `Selected`. |
| `Confirmed Batch` | Display text shown to the applicant, e.g. `A1 Intensive — 40th Batch (Evening)`. Doesn't have to match whatever batch they originally requested — this is what you're actually placing them in. |
| `Batch ID` | Short, stable id for this batch, matching the same convention as A2/B1 (e.g. `a1-40-e`, see the table above). This is the actual key stored in `Registrations`/`Batch ID` and matched against `Batch Links` — add a matching row there with this id if you want the WhatsApp link to appear automatically once `Confirmed`. (The code also accepts a column literally named `Confirmed Batch ID`, if you'd rather use that name — either works.) If left blank, it falls back to the `Confirmed Batch` text (old behavior), but filling it in keeps `Registrations` consistent with A2/B1 instead of duplicating the `Course` column. |

The `Email` and `Date of Birth` columns must exist with those exact names for lookups to work; everything else is read-only reference data for you.

**Marking someone Selected is two manual steps, not automatic:**
1. On `Applications`: set `Selection Status` to `Selected`, and fill in `GLAB ID`, `Confirmed Batch`, and `Batch ID`.
2. On `Students`: add a new row for them — GLAB ID, Name, and check `Eligible A1`.

Once both are done, `/results` will show them as selected with their GLAB ID and confirmed batch, and they register through the exact same flow (and `Status`/`Confirmed`/WhatsApp-link mechanics) as any A2/B1 student — nothing else to configure.

Applicants who look themselves up before you've made a decision just see "still under review" — no need to set `Selection Status` to anything for that; blank means pending.

## Registration Pending tab (who hasn't registered yet)

A `Registration Pending` tab tracks students who are marked eligible on `Students` but have never submitted a registration — so you know who to nudge without manually comparing the two tabs yourself. It's rebuilt automatically by the `refreshRegistrationPending` function in `Code.gs`; you don't edit this tab by hand, and any manual edits get overwritten the next time it runs.

**One-time setup:** in the Apps Script editor, open **Triggers** (clock icon in the left sidebar) → **Add Trigger** → set:
- Function: `refreshRegistrationPending`
- Event source: **Time-driven**
- Type: **Day timer**, pick any hour that works for you (e.g. 8am–9am)

Save it, and the tab will stay current on its own from then on — no manual cross-referencing, and no need to re-run anything after future `Code.gs` redeploys (the trigger keeps running independently of deployments).

**What counts as "pending":** any `Students` row with at least one `Eligible A1`/`Eligible A2`/`Eligible B1` box checked that has *zero* rows in `Registrations` for that GLAB ID — regardless of status (even a `Submitted`-but-not-yet-`Confirmed` registration counts as "not pending", since they've taken the action). Each student's `Pending Since` date is set the first time they're detected and preserved across future runs, so you can see how long someone's been sitting there.

**Known limitation:** a returning student who's newly eligible for a *different* course but already has an old registration row from a previous course won't show up here, since the check only looks at whether any registration exists at all, not which course it was for. Catch those manually for now — it's a small, occasional case, not the common one this tab is for.

## Exam Submissions tab (`/exam`)

The `/exam` page (a fully client-side page, separate from `/portal`/`/results` — it doesn't use GLAB IDs from `Students`, just its own `allowedIds` list in `data/exam-a2-vocab.json`) now submits each student's answers to an `Exam Submissions` tab instead of showing the score directly to the student. The Web App creates this tab automatically on first submission — you don't need to create it yourself.

**Columns:** `Timestamp`, `GLAB ID`, `Name`, `Exam Code`, `Score`, `Total Scorable`, `Percent`, `Writing Uploaded` (Yes/No, self-reported by the student), `Answers (JSON)` (their raw answers, for spot-checking), `Published` (blank by default).

**Publishing results is entirely manual, by design** — the student never sees their score. Once you're ready to release results, that's on you to do however you communicate with students (a message, a separate page, whatever) — this tab is just the record. The `Published` column is provided as a place to mark off who you've told, but nothing in the code reads it; it's for your own tracking only.

**The writing question:** students see only the prompt — no auto-graded answer box, same as the score for that question is never auto-computed; grade it yourself outside this system.

- On **`/exam`** (F51), this is still the original link-based flow: a link to a shared Google Drive upload folder plus a self-report checkbox ("I've uploaded my answer") that only affects their own progress indicator, not scoring. Their photographed/scanned answer is matched by filename convention (their GLAB ID) — this was never changed, see "Exam Writing Uploads folder" below for why `/exam-grammar` no longer works this way.
- On **`/exam-grammar`** (F101), the student uploads their photo/scan directly from within the exam page itself — no external link or app. This writes straight to Drive via a new `uploadWritingProof` action and automatically fills in `answers[101]` with the resulting file's URL once the upload succeeds, so you can jump straight to it from the `Answers (JSON)` column in `Exam Submissions` instead of hunting through a folder.

Both `/exam` and `/exam-grammar` share the same submission logic and write to this same `Exam Submissions` tab — rows from either exam are told apart by the `Exam Code` column.

## Exam Writing Uploads folder (`/exam-grammar` only)

`/exam-grammar`'s writing question uploads straight to Drive from inside the exam page — no shared folder link, no external Form. This was a deliberate change: a shared Drive folder link needs Editor-level access to let anyone upload to it, and Editor access also lets everyone see (and download) everyone else's uploads — there's no "upload-only" permission on a plain Drive folder. A Google Form was tried as a fix but proved too fiddly for students to use quickly during a timed exam. Uploading directly through the exam page avoids both problems: the server picks the destination and names the file, so students never see each other's answers and never have to type anything extra.

**One-time setup:**
1. Create a Drive folder (e.g. "GLAB Exam Writing Uploads") and copy its folder ID from the URL, same as you did for the payment-proofs folder in step 2 above.
2. In the Apps Script editor: **Project Settings → Script Properties → Add script property**, name `EXAM_WRITING_FOLDER_ID`, value = that folder ID.

You only need to do this once, ever — every exam shares this same parent folder. Inside it, the script automatically creates one subfolder per exam code (e.g. `A2GRAM0725/`) the first time that exam gets a submission, so uploads stay organized per exam without any extra setup for future exams. Files within each subfolder are named `{examCode}_{GLAB ID}_{timestamp}.{extension}` automatically — you don't need students to follow any filename convention themselves.

## Exam Permissions tab (`/exam-grammar` only)

`/exam` still checks GLAB IDs against a static list baked into the site at build time (`allowedIds` in `data/exam-a2-vocab.json`) — fast, but needs a code redeploy to add or remove a student.

`/exam-grammar` instead checks live against an `Exam Permissions` tab, so you can grant or revoke access at any time just by editing the spreadsheet — no redeploy needed. You need to create this tab yourself, with these columns:

| Column | What it's for |
|---|---|
| `GLAB ID` | The student's GLAB ID. |
| `Name` | Read-only reference for you — not used by the code. |
| `Exam Code` | Must exactly match the exam's code (currently `A2GRAM0725` for the grammar exam — see `examCode` in `data/exam-a2-grammar.json`). This lets one tab serve multiple exams later if needed, each keyed by its own code. |
| `Allowed` | A checkbox (or `TRUE`/`Yes`/`1`). Only checked rows let that student log in to that exam. |

Add one row per student per exam. To revoke access, just uncheck `Allowed` — no need to delete the row. A student not present in this tab at all is treated the same as unchecked (not allowed).

## Reviews tab (staging real testimonials for `/reviews`)

The `/reviews` page reads from a static file in the site repo (`data/reviews.json`), not live from the spreadsheet — so this tab is a **staging area**, not a live data source. You paste real reviews here as you collect them (from the Facebook page or anywhere else); I periodically pull unsynced rows from this tab and copy them into `data/reviews.json` by hand, then mark those rows as synced so they don't get pulled again. Nothing here updates the live site automatically — the actual publish step is still a normal code change + deploy, matching how everything else in this project works.

**You need to create this tab yourself**, named exactly `Reviews`, with these columns:

| Column | What it's for |
|---|---|
| `Name` | Reviewer's name as it should appear on the site. |
| `Location` | City, e.g. `Dhaka`. |
| `Rating` | 1–5. |
| `Date` | When the review was posted (any date format Sheets recognizes). |
| `Course` | Which course/level they took, e.g. `B1 Intensive`. |
| `Review Text` | The review itself. |
| `Outcome` | Optional short badge, e.g. `Passed Goethe B1 Exam` — leave blank if there isn't one. |
| `Featured` | Checkbox — whether this review should appear in the "Featured Stories" spotlight, not just the full list. |
| `Synced` | Checkbox — leave unchecked when you add a row. Gets checked automatically once the review has been copied into the site; don't check it yourself. |

No script property or redeploy is needed just to add reviews — only the `Code.gs` changes that introduced this tab's `listReviews`/`markReviewsSynced` actions needed a deploy, once.

## Certificates tab (`/verify`)

The `/verify` page looks up certificates **live from the spreadsheet** — one certificate at a time, by the ID the visitor enters. This replaced an older static-file approach where the entire certificate list (every student's name, score, and grade) was bundled into the website itself and readable by anyone; now only the single queried certificate ever leaves the server.

**You need to create this tab yourself**, named exactly `Certificates`, with these columns (any order):

| Column | What it's for |
|---|---|
| `Certificate ID` | The unique ID printed on the certificate, e.g. `GLAB-2026-B1-001`. Matching is case-insensitive. |
| `Student Name` | Name as printed on the certificate. |
| `Course` | e.g. `B1 Intensive`. |
| `Starting Date` | When the student's course started. Any date format Sheets recognizes. |
| `Completion Date` | When they finished — leave blank while the course is still running. |
| `Issued Date` | When the certificate was issued — leave blank until it is. |
| `Status` | Dropdown: `Enrolled` / `Running` / `Completed`. This drives what the site shows: `Completed` renders the full Certificate of Completion; `Enrolled` and `Running` render as a verified student/enrollment record (useful for embassies or employers confirming current enrollment) without the completion wording. |

The tab therefore doubles as both the certificate register and a verifiable enrollment record — one row per student per course. Blank date fields are simply hidden on the site rather than shown empty. Changes take effect immediately — no site redeploy needed. Adding this tab required a one-time `Code.gs` redeploy (the `verifyCertificate` action).

## Contact Messages tab (`/contact`)

The `/contact` form used to only *look* like it sent something — it faked a delay and showed "Message Sent!" with no backend call at all, so every message was silently lost. It now submits for real via a `submitContact` action, writing each message to a `Contact Messages` tab: `Timestamp`, `Name`, `Email`, `Subject`, `Message`.

The Web App creates this tab automatically on first submission, same as `Exam Submissions` — you don't need to create it yourself. There's no notification when a new message arrives, so check the tab periodically (or set up a Sheets email-notification rule on new rows if you want to be alerted immediately). Adding this required a `Code.gs` redeploy.

## MyGLAB dashboard (`/dashboard`)

A confirmed student's home base: course info + dates (from `Batch Links`), attendance, class links (same three as the confirmation page), an A2/B1 "register now" prompt once they're eligible and it's open, and a free-text note from you. Logs in with GLAB ID only — no separate account, same identity as everywhere else on the site. (Exam results are not shown here for now.)

**You need to create two tabs yourself:**

**`Attendance`** — one shared tab covering every batch, columns: `GLAB ID`, `Name`, `Batch ID`, then one column per class session named just the number (`1`, `2`, `3`, ...) as a checkbox column — checked means present. Add a new numbered column each time you hold a class, and check the box for whoever attended. A student's total/missed count on the dashboard only includes columns where their own checkbox has actually been set (checked *or* unchecked) — so a column that doesn't apply yet to a given batch (e.g. that batch hasn't had that many sessions) doesn't count against them just because other batches share the same sheet. If a student passes 5 missed classes, that's the same number as the "removed from the course" rule in the Course Rules shown on both the registration and dashboard pages — the dashboard doesn't enforce anything automatically, it just makes the number visible to the student themselves.

**`Student Feedback`** — columns: `GLAB ID`, `Note`. One row per student. Whatever you type in `Note` shows up on their dashboard as "Note from Your Instructor" — overwrite it whenever you have something new to say (there's no history, just the current note). Leave a row's `Note` blank (or don't add the row at all) and nothing shows.

None of this requires a `Code.gs` redeploy for day-to-day use (editing sheet data never does) — the redeploy was only needed once, to add the `getDashboard` action itself.

## Admin panel (`/admin`)

A password-gated page — one shared admin password, set as `ADMIN_PASSWORD` in Netlify's environment variables (not in Apps Script; the password check happens entirely in the Next.js server, Code.gs never sees it). You also need `ADMIN_SESSION_SECRET`, any long random string used only to sign the login cookie — generate one with `openssl rand -hex 32` and never reuse it elsewhere. Both go in the same place as `GLAB_SCRIPT_URL`/`GLAB_SCRIPT_TOKEN`.

Three things live here for now:

**Registration on/off.** One global switch, stored as a Script Property (`REGISTRATION_OPEN`) rather than a sheet — Project Settings → Script Properties in the Apps Script editor, though you'll normally never need to touch it there since the admin panel itself sets it. Defaults to open if never set. When off: every registration page shows a "Registration is currently closed" banner and disables the submit button, *and* the backend itself refuses new submissions regardless of what the page shows — so even a cached/stale page can't slip a registration through. This is a single global switch, not per-course — see the note in the site repo if you want per-course control later.

**Block / unblock a student.** Add a `Blocked` checkbox column to the `Students` tab yourself. A blocked student's row and history are never touched or deleted — this only gates the site. Search their GLAB ID in the admin panel and toggle it; the effect is immediate on `/portal`, `/results`, and `/dashboard` (all three refuse access with a "contact GLAB" message once blocked, without revealing anything else about their record).

**Confirm registrations (payment verification queue).** Lists every `Registrations` row still at the default `Submitted` status — name, GLAB ID, course/batch, payment method/reference, and a link to the uploaded payment proof — so you can review the screenshot and click Confirm from one place instead of switching to the sheet (and the Drive folder) for every student. Confirming sets that row's `Status` to `Confirmed` directly, same as editing the cell by hand.

Adding this required a `Code.gs` redeploy (six new actions: `getRegistrationStatus`, `adminSetRegistrationOpen`, `adminSetStudentBlocked`, `adminFindStudent`, `adminListSubmittedRegistrations`, `adminConfirmRegistration`).
