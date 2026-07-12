# GLAB Student Portal — Google-side setup

One-time setup, done by whoever owns the GLAB Google account.

## 1. Roster spreadsheet

Open the spreadsheet that already has the GLAB ID ↔ Name roster.

- Make sure the tab with that data has a header row containing columns named exactly **`GLAB ID`** and **`Name`** (any other columns, any order, are fine — the script only looks for these by name). Rename the tab to **`Students`** if it isn't already.
- Add two more columns: **`Eligible A2`** and **`Eligible B1`**. These control who can register for what — see "Marking students eligible" below. Leave them blank for students who aren't eligible for anything yet.
- You don't need to create the `Registrations` tab yourself — the script creates it automatically on the first submission, with headers: Timestamp, GLAB ID, Name, Course, Batch ID, Payment Method, Payment Reference, Proof File Link, Feedback, Status.
- You do need to create a **`Batch Links`** tab yourself, with two columns: **`Batch ID`** and **`WhatsApp Group Link`**. This is how a confirmed student gets their batch's WhatsApp group link automatically — see "Assigning WhatsApp group links" below.

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

**Marking students eligible.** On the `Students` tab, set `Eligible A2` and/or `Eligible B1` to any of `TRUE`, `Yes`, `Y`, `1` (or use a real checkbox column via Format → Checkboxes) to grant access. A student only ever sees batches for the courses they're marked eligible for on `/portal`.

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
