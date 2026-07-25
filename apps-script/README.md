# GLAB Student Portal — Google-side setup

One-time setup, done by whoever owns the GLAB Google account.

## 1. Roster spreadsheet

Open the spreadsheet that already has the GLAB ID ↔ Name roster.

- Make sure the tab with that data has a header row containing columns named exactly **`GLAB ID`** and **`Name`** (any other columns, any order, are fine — the script only looks for these by name). Rename the tab to **`Students`** if it isn't already.
- Add three more columns: **`Eligible A1`**, **`Eligible A2`**, and **`Eligible B1`**. These control who can register for what — see "Marking students eligible" below. Leave them blank for students who aren't eligible for anything yet.
- You don't need to create the `Registrations` tab yourself — the script creates it automatically on the first submission, with headers: Timestamp, GLAB ID, Name, Course, Batch ID, Payment Method, Payment Reference, Proof File Link, Feedback, Status.
- You do need to create a **`Batch Links`** tab yourself, with two columns: **`Batch ID`** and **`WhatsApp Group Link`**. This is how a confirmed student gets their batch's WhatsApp group link automatically — see "Assigning WhatsApp group links" below.
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

There's no separate admin webpage — you do all of this directly in the spreadsheet.

**Marking students eligible.** On the `Students` tab, set `Eligible A1`, `Eligible A2`, and/or `Eligible B1` to any of `TRUE`, `Yes`, `Y`, `1` (or use a real checkbox column via Format → Checkboxes) to grant access. A student only ever sees batches for the courses they're marked eligible for on `/portal`.

Eligibility is **not** hierarchical in the code — if a student finishes A2 and becomes eligible for B1, and you still want them able to register for A2 again (e.g. a repeat), you need to keep `Eligible A2` checked too. The script won't infer that for you; it's just whatever the two columns say.

**Confirming a payment.** On the `Registrations` tab, every new submission starts with `Status` = `Submitted`. Once you've verified the payment, change that cell to exactly `Confirmed` — the student will see this next time they check `/portal` with their GLAB ID, and (if a WhatsApp link is assigned — see below) get a "Join WhatsApp Group" button.

**Fixing a mistake.** Just edit the `Status` cell back to whichever value is correct — there's no history/audit trail, the cell's current value is the live status.

**Assigning WhatsApp group links.** On the `Batch Links` tab, add one row per batch: the `Batch ID` and its `WhatsApp Group Link`. The portal only shows this link to a student once their registration is `Confirmed` — never before. You can add or change these links at any time, no redeploy needed. Current batch ids (from `data/courses.json` in the site repo):

| Batch ID | Batch |
|---|---|
| `a2-36-E` | A2 Intensive — 36th Batch (Evening) |
| `a2-37-M` | A2 Intensive — 37th Batch (Morning) |
| `b1-32-M` | B1 Intensive — 32nd Batch (Morning) |
| `b1-33-E` | B1 Intensive — 33rd Batch (Evening) |

(The `-M`/`-E` suffix marks Morning/Evening, matching the actual batch time — not the batch number.)

If a new batch is ever added to the site, it'll get a new id there — add the matching row here whenever that happens.

## A1 applications (`/results`)

Applicants without a GLAB ID yet (new Foundation+A1 applicants) check whether they were selected on `/results`, using the Email + Date of Birth they gave on the original application form.

**The `Applications` tab** needs your application-form export (Timestamp, Name, Email, Date of Birth, WhatsApp, etc. — whatever you already collect) plus three columns you manage yourself:

| Column | What it's for |
|---|---|
| `Selection Status` | Leave blank while under review. Set to a dropdown (select the column → Data → Data validation → List of items: `Selected`, `Not Selected`) so it's always exactly one of those two once decided. |
| `GLAB ID` | The GLAB ID you assign this applicant — only fill this in once they're `Selected`. |
| `Confirmed Batch` | Display text shown to the applicant, e.g. `A1 Intensive — 40th Batch (Evening)`. Doesn't have to match whatever batch they originally requested — this is what you're actually placing them in. This same text is also the lookup key for the WhatsApp link — add a matching row to `Batch Links` with this exact text as the `Batch ID` if you want the link to appear automatically once the applicant's registration is `Confirmed`. |

The `Email` and `Date of Birth` columns must exist with those exact names for lookups to work; everything else is read-only reference data for you.

**Marking someone Selected is two manual steps, not automatic:**
1. On `Applications`: set `Selection Status` to `Selected`, and fill in `GLAB ID` and `Confirmed Batch`.
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

**The writing question (F51):** students see only the prompt — no answer box — plus a link to a Google Drive upload folder and a self-report checkbox ("I've uploaded my answer") that just affects their own progress indicator in the exam UI, not scoring. Look for their photographed/scanned handwritten answer in the Drive folder, matched by the filename convention (their GLAB ID) — grade it yourself outside this system, same as the score for that question is never auto-computed.

Both `/exam` and `/exam-grammar` (the 100-question A2 grammar exam) share the same submission logic and write to this same `Exam Submissions` tab — rows from either exam are told apart by the `Exam Code` column.

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
