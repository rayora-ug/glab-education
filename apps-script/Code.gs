/**
 * GLAB Student Portal — backend script.
 * Bound to the roster spreadsheet (Extensions > Apps Script). Deployed as a
 * Web App and called only from the site's server-side API routes, never
 * directly from the browser.
 *
 * Setup: see apps-script/README.md in the repo for step-by-step instructions.
 */

var STUDENTS_SHEET = 'Students';
var REGISTRATIONS_SHEET = 'Registrations';
var BATCH_LINKS_SHEET = 'Batch Links';
var APPLICATIONS_SHEET = 'Applications';
var A1_WAITLIST_SHEET = 'A1 Waitlist';
var A1_WAITLIST_HEADERS = ['Timestamp', 'Name', 'Email', 'WhatsApp Number'];
var FINANCE_SHEET = 'Finance';
var FINANCE_HEADERS = [
  'Date', 'GLAB ID', 'Name', 'Course', 'Session', 'Course Fee', 'Amount Paid',
  'Discount', 'Location', 'Payment Account', 'Payment Reference', 'Notes'
];
var FINANCE_EXPENSES_SHEET = 'Finance Expenses';
var FINANCE_EXPENSES_HEADERS = ['Date', 'Description', 'Amount', 'Location', 'Paid From', 'Session'];
var FINANCE_SESSIONS_SHEET = 'Finance Sessions';
var FINANCE_SESSIONS_HEADERS = ['Session Code', 'Start Date', 'End Date'];
var REGISTRATION_PENDING_SHEET = 'Registration Pending';
var REGISTRATION_PENDING_HEADERS = ['GLAB ID', 'Name', 'Eligible Courses', 'Pending Since'];
var EXAM_SUBMISSIONS_SHEET = 'Exam Submissions';
var EXAM_SUBMISSIONS_HEADERS = [
  'Timestamp', 'GLAB ID', 'Name', 'Exam Code', 'Score', 'Total Scorable',
  'Percent', 'Writing Uploaded', 'Answers (JSON)', 'Published'
];
var EXAM_PERMISSIONS_SHEET = 'Exam Permissions';
var REVIEWS_SHEET = 'Reviews';
var ANNOUNCEMENTS_SHEET = 'Announcements';
var ANNOUNCEMENTS_HEADERS = ['Title', 'Excerpt', 'Content', 'Date', 'Category', 'Important'];
var CERTIFICATES_SHEET = 'Certificates';
var CONTACT_MESSAGES_SHEET = 'Contact Messages';
var CONTACT_MESSAGES_HEADERS = ['Timestamp', 'Name', 'Email', 'Subject', 'Message'];
var ATTENDANCE_SHEET = 'Attendance';
var STUDENT_FEEDBACK_SHEET = 'Student Feedback';
// The "I'm Interested" request queue itself was retired (see CRM build),
// but this sheet name is still read by findLatestInterestEmail_ (for
// MyGLAB/portal's saved-email prefill) and onEdit (a manual fallback for
// any rows left unprocessed from before the retirement).
var INTEREST_SHEET = 'Next Level Interest';
var REGISTRATIONS_HEADERS = [
  'Timestamp', 'GLAB ID', 'Name', 'Course', 'Batch ID', 'Email',
  'Paying From', 'Payment Reference', 'Proof File Link', 'Feedback', 'Status'
];
var DEFAULT_STATUS = 'Submitted';
var CONFIRMED_STATUS = 'Confirmed';
var ELIGIBILITY_COLUMNS = [
  { header: 'eligible a1', course: 'A1 Intensive' },
  { header: 'eligible a2', course: 'A2 Intensive' },
  { header: 'eligible b1', course: 'B1 Intensive' }
];
var MAX_FILE_BYTES = 5 * 1024 * 1024; // 5MB, defense in depth (site also caps this)
// GLAB IDs follow GLAB{YY}{Season}{seq} (e.g. GLAB26H251) — GLAB runs five
// admission sessions a year (F/S/H/H/W) and the two "H" sessions in a given
// year share the same letter and just keep counting rather than restarting.
// Both the prefix and the next sequence number are set explicitly once per
// admission cycle in the admin panel — not derived by scanning the roster
// for the highest existing ID, since that depends on the historical
// Student Database import actually being present and complete. See
// generateNextA1GlabId_.
var A1_ID_PREFIX_PROPERTY = 'A1_ID_PREFIX';
var A1_NEXT_SEQ_PROPERTY = 'A1_NEXT_SEQ';

function doPost(e) {
  var response;
  try {
    var body = JSON.parse(e.postData.contents);
    assertValidToken_(body.token);

    if (body.action === 'lookup') {
      response = lookupStudent_(body.glabId);
    } else if (body.action === 'submit') {
      response = submitRegistration_(body);
    } else if (body.action === 'submitA1Registration') {
      response = submitA1Registration_(body);
    } else if (body.action === 'checkApplication') {
      response = checkApplication_(body.email, body.phone);
    } else if (body.action === 'submitA1Application') {
      response = submitA1Application_(body);
    } else if (body.action === 'submitA1Waitlist') {
      response = submitA1Waitlist_(body);
    } else if (body.action === 'adminListApplications') {
      response = adminListApplications_();
    } else if (body.action === 'adminSelectApplicant') {
      response = adminSelectApplicant_(body.email, body.phone, body.batchLabel, body.batchId);
    } else if (body.action === 'adminRejectApplicant') {
      response = adminRejectApplicant_(body.email, body.phone);
    } else if (body.action === 'adminSetApplicationNote') {
      response = adminSetApplicationNote_(body.row, body.note, body.flagged);
    } else if (body.action === 'adminPreviewApplicationCleanup') {
      response = adminPreviewApplicationCleanup_();
    } else if (body.action === 'adminApplyApplicationCleanup') {
      response = adminApplyApplicationCleanup_(body.rows);
    } else if (body.action === 'adminGetA1IdSettings') {
      response = adminGetA1IdSettings_();
    } else if (body.action === 'adminSetA1IdSettings') {
      response = adminSetA1IdSettings_(body.prefix, body.nextSeq);
    } else if (body.action === 'submitExam') {
      response = submitExam_(body);
    } else if (body.action === 'checkExamPermission') {
      response = checkExamPermission_(body.examCode, body.glabId);
    } else if (body.action === 'uploadWritingProof') {
      response = uploadWritingProof_(body);
    } else if (body.action === 'listReviews') {
      response = listReviews_(body.onlyUnsynced);
    } else if (body.action === 'markReviewsSynced') {
      response = markReviewsSynced_(body.ids);
    } else if (body.action === 'getPublishedReviews') {
      response = getPublishedReviews_();
    } else if (body.action === 'adminAddReview') {
      response = adminAddReview_(body);
    } else if (body.action === 'adminDeleteReview') {
      response = adminDeleteReview_(body.row);
    } else if (body.action === 'getPublishedAnnouncements') {
      response = getPublishedAnnouncements_();
    } else if (body.action === 'adminAddAnnouncement') {
      response = adminAddAnnouncement_(body);
    } else if (body.action === 'verifyCertificate') {
      response = verifyCertificate_(body.certificateId);
    } else if (body.action === 'submitContact') {
      response = submitContact_(body);
    } else if (body.action === 'getDashboard') {
      response = getDashboard_(body.glabId);
    } else if (body.action === 'getRegistrationStatus') {
      response = { success: true, open: isRegistrationOpen_() };
    } else if (body.action === 'adminSetRegistrationOpen') {
      response = adminSetRegistrationOpen_(body.open);
    } else if (body.action === 'getA1ApplicationStatus') {
      response = { success: true, open: isA1ApplicationOpen_() };
    } else if (body.action === 'adminSetA1ApplicationOpen') {
      response = adminSetA1ApplicationOpen_(body.open);
    } else if (body.action === 'adminSetStudentBlocked') {
      response = adminSetStudentBlocked_(body.glabId, body.blocked);
    } else if (body.action === 'adminFindStudent') {
      response = adminFindStudent_(body.glabId);
    } else if (body.action === 'adminRestoreMissingStudent') {
      response = adminRestoreMissingStudent_(body.glabId, body.name);
    } else if (body.action === 'adminListSubmittedRegistrations') {
      response = adminListSubmittedRegistrations_();
    } else if (body.action === 'adminListAllRegistrations') {
      response = adminListAllRegistrations_();
    } else if (body.action === 'adminListFinance') {
      response = adminListFinance_();
    } else if (body.action === 'adminUpdateFinanceEntry') {
      response = adminUpdateFinanceEntry_(body);
    } else if (body.action === 'adminDeleteFinanceEntry') {
      response = adminDeleteFinanceEntry_(body.row);
    } else if (body.action === 'adminAddFinanceExpense') {
      response = adminAddFinanceExpense_(body);
    } else if (body.action === 'adminListFinanceExpenses') {
      response = adminListFinanceExpenses_();
    } else if (body.action === 'adminDeleteFinanceExpense') {
      response = adminDeleteFinanceExpense_(body.row);
    } else if (body.action === 'adminListFinanceSessions') {
      response = adminListFinanceSessions_();
    } else if (body.action === 'adminCreateFinanceSession') {
      response = adminCreateFinanceSession_(body);
    } else if (body.action === 'adminUpdateFinanceSession') {
      response = adminUpdateFinanceSession_(body);
    } else if (body.action === 'adminDeleteFinanceSession') {
      response = adminDeleteFinanceSession_(body.sessionCode);
    } else if (body.action === 'adminGetFinanceOpeningBalance') {
      response = adminGetFinanceOpeningBalance_();
    } else if (body.action === 'adminSetFinanceOpeningBalance') {
      response = adminSetFinanceOpeningBalance_(body.openingBD, body.openingDE);
    } else if (body.action === 'adminListBatches') {
      response = adminListBatches_();
    } else if (body.action === 'adminCreateBatch') {
      response = adminCreateBatch_(body);
    } else if (body.action === 'adminUpdateBatch') {
      response = adminUpdateBatch_(body);
    } else if (body.action === 'adminListCRM') {
      response = adminListCRM_();
    } else if (body.action === 'adminSendOutreach') {
      response = adminSendOutreach_(body.recipients, body.subject, body.messageBody);
    } else if (body.action === 'adminConfirmRegistration') {
      response = adminConfirmRegistration_(body.glabId, body.timestamp);
    } else if (body.action === 'submitStudentReview') {
      response = submitStudentReview_(body);
    } else if (body.action === 'recoverGlabId') {
      response = recoverGlabId_(body.email);
    } else {
      throw new Error('Unknown action: ' + body.action);
    }
  } catch (err) {
    response = { success: false, error: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

function assertValidToken_(token) {
  var expected = PropertiesService.getScriptProperties().getProperty('SHARED_TOKEN');
  if (!expected || token !== expected) {
    throw new Error('Unauthorized');
  }
}

function isTruthy_(v) {
  if (v === true) return true;
  var s = String(v || '').trim().toLowerCase();
  return s === 'true' || s === 'yes' || s === 'y' || s === '1';
}

// Normalizes a Date object or a date-like string to 'YYYY-MM-DD' so sheet
// dates and an HTML <input type="date"> value can be compared reliably.
// A real Date object (from a date-formatted sheet cell) is read with local
// getters, which Apps Script already resolves in the spreadsheet's own
// timezone — safe. A string is matched directly against YYYY-MM-DD first,
// deliberately avoiding new Date(isoString) + local getters for strings,
// since that path parses as UTC and can shift the date by a day depending
// on the script's timezone setting.
function normalizeDate_(v) {
  if (v instanceof Date) {
    var y = v.getFullYear();
    var m = String(v.getMonth() + 1).padStart(2, '0');
    var day = String(v.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
  }
  var s = String(v || '').trim();
  var isoMatch = s.match(/^(\d{4}-\d{2}-\d{2})/);
  if (isoMatch) return isoMatch[1];
  var parsed = new Date(s);
  if (!isNaN(parsed.getTime())) {
    return parsed.getFullYear() + '-' + String(parsed.getMonth() + 1).padStart(2, '0') + '-' + String(parsed.getDate()).padStart(2, '0');
  }
  return s;
}

// Normalizes a phone/WhatsApp number for comparison — strips everything but
// digits, then keeps only the last 10, so "01712345678", "+8801712345678",
// and "8801712345678" (leading zero vs. country code, with or without "+",
// with or without spaces/dashes) all match as the same number. Used as
// half of the A1 applicant verification pair instead of date of birth,
// which applicants often forget (official vs. unofficial DOBs) — a phone
// number is both more memorable and, unlike DOB, actually unique per
// person.
function normalizePhone_(v) {
  var digits = String(v || '').replace(/\D/g, '');
  return digits.slice(-10);
}

// Finds a student by GLAB ID. Reads the Students tab by header name so it
// works regardless of column order — the sheet only needs "GLAB ID" and
// "Name" columns, plus optionally "Eligible A2" / "Eligible B1".
function findStudent_(glabId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENTS_SHEET);
  if (!sheet) throw new Error('Students sheet not found');

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var nameCol = headers.indexOf('name');
  if (idCol === -1 || nameCol === -1) {
    throw new Error('Students sheet must have "GLAB ID" and "Name" columns');
  }
  var eligibilityCols = ELIGIBILITY_COLUMNS.map(function (e) {
    return { col: headers.indexOf(e.header), course: e.course };
  });
  var blockedCol = headers.indexOf('blocked');

  var needle = String(glabId || '').trim().toLowerCase();
  if (!needle) return null;

  for (var i = 1; i < values.length; i++) {
    var cell = String(values[i][idCol] || '').trim().toLowerCase();
    if (cell === needle) {
      var eligibleCourses = eligibilityCols
        .filter(function (e) { return e.col !== -1 && isTruthy_(values[i][e.col]); })
        .map(function (e) { return e.course; });
      var blocked = blockedCol !== -1 && isTruthy_(values[i][blockedCol]);
      return { glabId: values[i][idCol], name: values[i][nameCol], eligibleCourses: eligibleCourses, blocked: blocked };
    }
  }
  return null;
}

// Returns a lookup of every GLAB ID (lowercased) that has at least one row
// in Registrations, regardless of status. Used to find eligible students who
// have never registered at all — a student who has any prior registration
// (even for a different course) is intentionally treated as "not pending";
// this keeps the comparison simple and misses only the repeat-student case
// of someone newly eligible for another course who hasn't re-registered yet.
function getRegisteredGlabIds_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  var ids = {};
  if (!sheet) return ids;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return ids;
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  if (idCol === -1) return ids;

  for (var i = 1; i < values.length; i++) {
    var id = String(values[i][idCol] || '').trim().toLowerCase();
    if (id) ids[id] = true;
  }
  return ids;
}

// Rebuilds the "Registration Pending" tab: every Students row that's
// eligible for at least one course but has no Registrations row at all.
// Run this on a daily time-driven trigger (set up in the Apps Script
// editor — see apps-script/README.md) so the tab stays current with no
// manual cross-referencing. Re-running preserves each student's original
// "Pending Since" date and drops anyone who has since registered.
function refreshRegistrationPending() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var studentsSheet = ss.getSheetByName(STUDENTS_SHEET);
  if (!studentsSheet) throw new Error('Students sheet not found');

  var studentValues = studentsSheet.getDataRange().getValues();
  var headers = studentValues[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var nameCol = headers.indexOf('name');
  if (idCol === -1 || nameCol === -1) {
    throw new Error('Students sheet must have "GLAB ID" and "Name" columns');
  }
  var eligibilityCols = ELIGIBILITY_COLUMNS.map(function (e) {
    return { col: headers.indexOf(e.header), course: e.course };
  });

  var registeredIds = getRegisteredGlabIds_();

  var pendingNow = {};
  for (var i = 1; i < studentValues.length; i++) {
    var glabId = String(studentValues[i][idCol] || '').trim();
    if (!glabId) continue;
    var idKey = glabId.toLowerCase();
    if (registeredIds[idKey]) continue;

    var eligibleCourses = eligibilityCols
      .filter(function (e) { return e.col !== -1 && isTruthy_(studentValues[i][e.col]); })
      .map(function (e) { return e.course; });
    if (eligibleCourses.length === 0) continue;

    pendingNow[idKey] = { glabId: glabId, name: studentValues[i][nameCol], courses: eligibleCourses.join(', ') };
  }

  var pendingSheet = ss.getSheetByName(REGISTRATION_PENDING_SHEET) || ss.insertSheet(REGISTRATION_PENDING_SHEET);
  var existingValues = pendingSheet.getDataRange().getValues();
  var existingSinceById = {};
  if (existingValues.length > 1) {
    var exHeaders = existingValues[0].map(function (h) { return String(h).trim().toLowerCase(); });
    var exIdCol = exHeaders.indexOf('glab id');
    var exSinceCol = exHeaders.indexOf('pending since');
    if (exIdCol !== -1 && exSinceCol !== -1) {
      for (var j = 1; j < existingValues.length; j++) {
        var exId = String(existingValues[j][exIdCol] || '').trim().toLowerCase();
        if (exId) existingSinceById[exId] = existingValues[j][exSinceCol];
      }
    }
  }

  var today = new Date();
  var rows = Object.keys(pendingNow).sort().map(function (idKey) {
    var p = pendingNow[idKey];
    var since = existingSinceById[idKey] || today;
    return [p.glabId, p.name, p.courses, since];
  });

  pendingSheet.clearContents();
  pendingSheet.getRange(1, 1, 1, REGISTRATION_PENDING_HEADERS.length).setValues([REGISTRATION_PENDING_HEADERS]);
  if (rows.length > 0) {
    pendingSheet.getRange(2, 1, rows.length, REGISTRATION_PENDING_HEADERS.length).setValues(rows);
  }
}

// Returns the most recent Registrations row for this GLAB ID, or null if
// they've never submitted (or the Registrations tab doesn't exist yet).
function findLatestRegistration_(glabId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) return null;

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var courseCol = headers.indexOf('course');
  var batchIdCol = headers.indexOf('batch id');
  var statusCol = headers.indexOf('status');
  var timestampCol = headers.indexOf('timestamp');
  if (idCol === -1) return null;

  var needle = String(glabId || '').trim().toLowerCase();
  var latest = null;
  for (var i = 1; i < values.length; i++) {
    var cell = String(values[i][idCol] || '').trim().toLowerCase();
    if (cell === needle) {
      latest = {
        course: courseCol !== -1 ? values[i][courseCol] : '',
        batchId: batchIdCol !== -1 ? values[i][batchIdCol] : '',
        status: statusCol !== -1 ? values[i][statusCol] : DEFAULT_STATUS,
        timestamp: timestampCol !== -1 ? values[i][timestampCol] : null
      };
    }
  }
  return latest;
}

// Returns this GLAB ID's existing row for one specific batch, if any —
// used only to guard against a genuine resubmission (a client retry after
// an ambiguous network error) of the *same* registration, never to block a
// legitimately new one. findLatestRegistration_ finds the most recent
// registration for *any* course, which is exactly right for "what's this
// student's current status" (used elsewhere), but was wrongly reused here
// too: a student with an old Confirmed A1 record would get told they're
// "already registered" the moment they tried to submit for A2, and the new
// row would silently never get created at all.
function findRegistrationForBatch_(glabId, batchId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) return null;

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var courseCol = headers.indexOf('course');
  var batchIdCol = headers.indexOf('batch id');
  var statusCol = headers.indexOf('status');
  var timestampCol = headers.indexOf('timestamp');
  if (idCol === -1 || batchIdCol === -1) return null;

  var needleId = String(glabId || '').trim().toLowerCase();
  var needleBatch = String(batchId || '').trim().toLowerCase();
  var latest = null;
  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    var rowBatch = String(values[i][batchIdCol] || '').trim().toLowerCase();
    if (rowId === needleId && rowBatch === needleBatch) {
      latest = {
        course: courseCol !== -1 ? values[i][courseCol] : '',
        batchId: values[i][batchIdCol],
        status: statusCol !== -1 ? values[i][statusCol] : DEFAULT_STATUS,
        timestamp: timestampCol !== -1 ? values[i][timestampCol] : null
      };
    }
  }
  return latest;
}

// Returns every Confirmed registration a student has ever had, oldest
// first — their learning journey through GLAB (e.g. A1 batch X, then A2
// batch Y). For a student who started directly at A2 (an Oral Test
// placement, say), this is naturally just the one entry — no special
// casing needed, it's simply their earliest and only row.
function findRegistrationHistory_(glabId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) return [];

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var courseCol = headers.indexOf('course');
  var batchIdCol = headers.indexOf('batch id');
  var statusCol = headers.indexOf('status');
  var timestampCol = headers.indexOf('timestamp');
  if (idCol === -1) return [];

  var needle = String(glabId || '').trim().toLowerCase();
  var history = [];
  for (var i = 1; i < values.length; i++) {
    var cell = String(values[i][idCol] || '').trim().toLowerCase();
    if (cell !== needle) continue;
    var status = statusCol !== -1 ? values[i][statusCol] : DEFAULT_STATUS;
    if (status !== CONFIRMED_STATUS) continue;
    history.push({
      course: courseCol !== -1 ? values[i][courseCol] : '',
      batchId: batchIdCol !== -1 ? values[i][batchIdCol] : '',
      timestamp: timestampCol !== -1 ? new Date(values[i][timestampCol]).toISOString() : null
    });
  }
  history.sort(function (a, b) { return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(); });
  return history;
}

// Looks up a batch's WhatsApp group, Google Classroom, Google Meet, and
// start/end dates from the Batch Links sheet — the single source of truth
// for per-batch info across A1/A2/B1. Returns an object with all fields
// (each null if missing) so a student who logs back in — days or weeks
// after links were only shared in the WhatsApp group itself — can still
// find them; chat history isn't visible to anyone who joins the group late.
function findBatchInfo_(batchId) {
  var empty = { whatsappLink: null, classroomLink: null, meetLink: null, startDate: null, endDate: null };
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BATCH_LINKS_SHEET);
  if (!sheet || !batchId) return empty;

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('batch id');
  var whatsappCol = headers.indexOf('whatsapp group link');
  var classroomCol = headers.indexOf('google classroom link');
  var meetCol = headers.indexOf('google meet link');
  var startCol = headers.indexOf('start date');
  var endCol = headers.indexOf('end date');
  if (idCol === -1) return empty;

  var needle = String(batchId).trim().toLowerCase();
  var cell = function (row, col) {
    if (col === -1) return null;
    var v = String(row[col] || '').trim();
    return v || null;
  };
  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    if (rowId === needle) {
      return {
        whatsappLink: cell(values[i], whatsappCol),
        classroomLink: cell(values[i], classroomCol),
        meetLink: cell(values[i], meetCol),
        startDate: startCol !== -1 ? (normalizeDate_(values[i][startCol]) || null) : null,
        endDate: endCol !== -1 ? (normalizeDate_(values[i][endCol]) || null) : null
      };
    }
  }
  return empty;
}

var BATCH_LINKS_HEADERS = [
  'Batch ID', 'WhatsApp Group Link', 'Google Classroom Link', 'Google Meet Link', 'Start Date', 'End Date'
];

// Lists every batch in the Batch Links tab for the admin panel, each
// annotated with how many currently-Confirmed registrations point at it —
// so admin can see the real impact of editing a batch's links before
// doing it, rather than discovering it after the fact (which is exactly
// how a currently-enrolled cohort briefly lost its class links: an
// existing batch's row was cleared to prep the next one, instead of
// adding a new row for it).
function adminListBatches_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BATCH_LINKS_SHEET);
  if (!sheet) return { success: true, batches: [] };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, batches: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var idCol = col('batch id'), whatsappCol = col('whatsapp group link'),
      classroomCol = col('google classroom link'), meetCol = col('google meet link'),
      startCol = col('start date'), endCol = col('end date');
  if (idCol === -1) return { success: true, batches: [] };

  var confirmedCounts = {};
  var regSheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  if (regSheet) {
    var regValues = regSheet.getDataRange().getValues();
    if (regValues.length > 1) {
      var regHeaders = regValues[0].map(function (h) { return String(h).trim().toLowerCase(); });
      var regBatchCol = regHeaders.indexOf('batch id'), regStatusCol = regHeaders.indexOf('status');
      if (regBatchCol !== -1 && regStatusCol !== -1) {
        for (var r = 1; r < regValues.length; r++) {
          var status = String(regValues[r][regStatusCol] || '').trim();
          if (status !== CONFIRMED_STATUS) continue;
          var bId = String(regValues[r][regBatchCol] || '').trim().toLowerCase();
          if (!bId) continue;
          confirmedCounts[bId] = (confirmedCounts[bId] || 0) + 1;
        }
      }
    }
  }

  var cell = function (row, c) { return c !== -1 ? String(row[c] || '').trim() : ''; };
  var batches = [];
  for (var i = 1; i < values.length; i++) {
    var batchId = cell(values[i], idCol);
    if (!batchId) continue;
    batches.push({
      batchId: batchId,
      whatsappLink: cell(values[i], whatsappCol),
      classroomLink: cell(values[i], classroomCol),
      meetLink: cell(values[i], meetCol),
      startDate: startCol !== -1 ? (normalizeDate_(values[i][startCol]) || '') : '',
      endDate: endCol !== -1 ? (normalizeDate_(values[i][endCol]) || '') : '',
      confirmedCount: confirmedCounts[batchId.toLowerCase()] || 0
    });
  }
  return { success: true, batches: batches };
}

// Creates a brand-new batch row. Deliberately refuses to touch an
// existing batch ID — the whole point is to make it structurally
// impossible to repeat the mistake of clearing/reusing a live batch's row
// to prep the next one, instead of giving the next batch its own row.
function adminCreateBatch_(body) {
  var batchId = String(body.batchId || '').trim();
  if (!batchId) throw new Error('Batch ID is required.');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BATCH_LINKS_SHEET);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(BATCH_LINKS_SHEET);
    sheet.appendRow(BATCH_LINKS_HEADERS);
  }
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('batch id');
  if (idCol === -1) throw new Error('Batch Links sheet must have a "Batch ID" column.');

  var needle = batchId.toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '').trim().toLowerCase() === needle) {
      throw new Error('A batch with this ID already exists — edit that one instead of creating a duplicate.');
    }
  }

  var row = new Array(headers.length).fill('');
  var set = function (name, value) { var c = headers.indexOf(name); if (c !== -1) row[c] = value; };
  set('batch id', batchId);
  set('whatsapp group link', body.whatsappLink || '');
  set('google classroom link', body.classroomLink || '');
  set('google meet link', body.meetLink || '');
  set('start date', body.startDate || '');
  set('end date', body.endDate || '');
  sheet.appendRow(row);
  return { success: true };
}

// Updates an existing batch's links — for legitimate corrections to a
// batch that's already been created, as opposed to adminCreateBatch_'s
// job of starting a new one. Requires the batch to already exist, the
// mirror-image guard of adminCreateBatch_'s "must not already exist".
function adminUpdateBatch_(body) {
  var batchId = String(body.batchId || '').trim();
  if (!batchId) throw new Error('Batch ID is required.');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BATCH_LINKS_SHEET);
  if (!sheet) throw new Error('Batch Links sheet not found.');
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('batch id');
  if (idCol === -1) throw new Error('Batch Links sheet must have a "Batch ID" column.');

  var needle = batchId.toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '').trim().toLowerCase() === needle) {
      var setCell = function (name, value) {
        var c = headers.indexOf(name);
        if (c !== -1) sheet.getRange(i + 1, c + 1).setValue(value);
      };
      setCell('whatsapp group link', body.whatsappLink || '');
      setCell('google classroom link', body.classroomLink || '');
      setCell('google meet link', body.meetLink || '');
      setCell('start date', body.startDate || '');
      setCell('end date', body.endDate || '');
      return { success: true };
    }
  }
  throw new Error('Batch not found.');
}

// Finds an A1 application by Email + WhatsApp Number. Reads the
// Applications tab by header name — needs "Email" and "WhatsApp Number"
// columns at minimum, plus "Name", "Selection Status", "GLAB ID",
// "Confirmed Batch", and a batch id column for a full result. "Confirmed
// Batch" is the display text shown to the applicant; the batch id column
// (accepts either "Batch ID" or "Confirmed Batch ID" as the header) is the
// short, stable id (e.g. a1-41-m, matching the a2-38-M convention) matched
// against Batch Links.
function findApplication_(email, phone) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) throw new Error('Applications sheet not found');
  // Guarantees the "WhatsApp Number" column exists even if no application
  // has ever been submitted through the new on-site form yet — without
  // this, checking a result before that first submission would throw
  // instead of just reporting "not found".
  ensureApplicationsHeaders_(sheet);

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var emailCol = headers.indexOf('email');
  var phoneCol = headers.indexOf('whatsapp number');
  var nameCol = headers.indexOf('name');
  var statusCol = headers.indexOf('selection status');
  var glabIdCol = headers.indexOf('glab id');
  var batchCol = headers.indexOf('confirmed batch');
  var batchIdCol = headers.indexOf('confirmed batch id');
  if (batchIdCol === -1) batchIdCol = headers.indexOf('batch id');
  if (emailCol === -1 || phoneCol === -1) {
    throw new Error('Applications sheet must have "Email" and "WhatsApp Number" columns');
  }

  var needleEmail = String(email || '').trim().toLowerCase();
  var needlePhone = normalizePhone_(phone);
  if (!needleEmail || !needlePhone) return null;

  for (var i = 1; i < values.length; i++) {
    var rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
    var rowPhone = normalizePhone_(values[i][phoneCol]);
    if (rowEmail === needleEmail && rowPhone === needlePhone) {
      var rawStatus = statusCol !== -1 ? String(values[i][statusCol] || '').trim().toLowerCase() : '';
      var status = 'pending';
      if (rawStatus === 'selected') status = 'selected';
      else if (rawStatus === 'not selected') status = 'not_selected';

      return {
        name: nameCol !== -1 ? values[i][nameCol] : '',
        status: status,
        glabId: status === 'selected' && glabIdCol !== -1 ? values[i][glabIdCol] : null,
        confirmedBatch: status === 'selected' && batchCol !== -1 ? values[i][batchCol] : null,
        confirmedBatchId: status === 'selected' && batchIdCol !== -1 ? values[i][batchIdCol] : null
      };
    }
  }
  return null;
}

function checkApplication_(email, phone) {
  var application = findApplication_(email, phone);
  if (!application) return { success: true, found: false };
  return {
    success: true,
    found: true,
    name: application.name,
    status: application.status,
    glabId: application.glabId,
    confirmedBatch: application.confirmedBatch,
    confirmedBatchId: application.confirmedBatchId
  };
}

// ===== A1 application intake (replaces the external Google Form) =====
// Full field set matches the real application form GLAB was running via
// Google Forms — kept intact (minus "Are you available on WhatsApp?",
// dropped as redundant once a WhatsApp number is given) so nothing useful
// for judging an applicant gets lost by moving on-site.
var APPLICATION_HEADERS = [
  'Timestamp', 'Name', 'Email', 'WhatsApp Number', 'Facebook Profile Link', 'Date of Birth',
  'Current Occupation', 'Current City', 'Batch Choice',
  'Previous GLAB Experience', 'Previous Course Details', 'Previous Course Completed',
  'Motivation', 'Why GLAB', 'How Heard', 'Primary Goal', 'Comment',
  'Admin Note', 'Flagged',
  'Selection Status', 'GLAB ID', 'Confirmed Batch', 'Confirmed Batch ID'
];

// Appends any headers from APPLICATION_HEADERS that the live Applications
// sheet doesn't already have, rather than requiring an admin to manually
// add columns — the sheet predates this feature and may only have the
// original handful of columns from when rows were typed in by hand.
function ensureApplicationsHeaders_(sheet) {
  var lastCol = sheet.getLastColumn();
  var existing = lastCol > 0
    ? sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h).trim().toLowerCase(); })
    : [];
  var missing = APPLICATION_HEADERS.filter(function (h) { return existing.indexOf(h.toLowerCase()) === -1; });
  if (missing.length > 0) {
    sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
  }
}

// Writes straight into the Applications tab with Selection Status left
// blank, which findApplication_/checkApplication_ already treat as
// "pending" — no schema change needed, just a new way to add rows besides
// typing them in by hand.
function submitA1Application_(body) {
  if (!isA1ApplicationOpen_()) throw new Error('A1 applications are currently closed. Please check back later.');

  var name = String(body.name || '').trim();
  var email = String(body.email || '').trim();
  var whatsappNumber = String(body.whatsappNumber || '').trim();
  var dob = String(body.dob || '').trim();
  var facebookLink = String(body.facebookLink || '').trim();
  var occupation = String(body.occupation || '').trim();
  var city = String(body.city || '').trim();
  var batchChoice = String(body.batchChoice || '').trim();
  var previousExperience = String(body.previousExperience || '').trim();
  var previousCourseDetails = String(body.previousCourseDetails || '').trim();
  var previousCourseCompleted = String(body.previousCourseCompleted || '').trim();
  var motivation = String(body.motivation || '').trim();
  var whyGlab = String(body.whyGlab || '').trim();
  var howHeard = String(body.howHeard || '').trim();
  var primaryGoal = String(body.primaryGoal || '').trim();
  var comment = String(body.comment || '').trim();
  var agreedToRules = !!body.agreedToRules;

  if (!name) throw new Error('Name is required.');
  if (!email) throw new Error('Email is required.');
  if (!whatsappNumber) throw new Error('WhatsApp number is required.');
  if (!dob) throw new Error('Date of birth is required.');
  if (!occupation) throw new Error('Current occupation is required.');
  if (!city) throw new Error('Current city is required.');
  if (!batchChoice) throw new Error('Please choose a batch.');
  if (!motivation) throw new Error('Please tell us what motivates you to learn German.');
  if (!whyGlab) throw new Error('Please tell us why you want to learn from GLAB.');
  if (!howHeard) throw new Error('Please tell us how you heard about GLAB.');
  if (!primaryGoal) throw new Error('Please select your primary goal.');
  if (!agreedToRules) throw new Error('You must agree to the course rules to apply.');
  if (previousExperience === 'yes' && !previousCourseDetails) {
    throw new Error('Please tell us which course you previously attended.');
  }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(APPLICATIONS_SHEET);
    sheet.appendRow(APPLICATION_HEADERS);
  } else {
    ensureApplicationsHeaders_(sheet);
  }
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };
  var emailCol = col('email'), phoneCol = col('whatsapp number');
  if (emailCol === -1 || phoneCol === -1) {
    throw new Error('Applications sheet must have "Email" and "WhatsApp Number" columns');
  }

  // One person, one application: block a resubmission that matches an
  // existing row on EITHER email or WhatsApp number (not requiring both),
  // since the two can legitimately drift independently for the same person
  // (typo'd or swapped email, new phone number) while still being the same
  // applicant. Guards against blank cells matching each other by never
  // comparing against an empty needle/row value.
  var needleEmail = email.toLowerCase();
  var needlePhone = normalizePhone_(whatsappNumber);
  for (var i = 1; i < values.length; i++) {
    var rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
    var rowPhone = normalizePhone_(values[i][phoneCol]);
    var emailMatches = rowEmail && needleEmail && rowEmail === needleEmail;
    var phoneMatches = rowPhone && needlePhone && rowPhone === needlePhone;
    if (emailMatches || phoneMatches) {
      return { success: true, alreadySubmitted: true };
    }
  }

  var set = function (row, name, value) { var c = col(name); if (c !== -1) row[c] = value; };
  var row = new Array(headers.length).fill('');
  set(row, 'timestamp', new Date());
  set(row, 'name', name);
  row[emailCol] = email;
  row[phoneCol] = whatsappNumber;
  set(row, 'facebook profile link', facebookLink);
  set(row, 'date of birth', dob);
  set(row, 'current occupation', occupation);
  set(row, 'current city', city);
  set(row, 'batch choice', batchChoice);
  set(row, 'previous glab experience', previousExperience);
  set(row, 'previous course details', previousCourseDetails);
  set(row, 'previous course completed', previousCourseCompleted);
  set(row, 'motivation', motivation);
  set(row, 'why glab', whyGlab);
  set(row, 'how heard', howHeard);
  set(row, 'primary goal', primaryGoal);
  set(row, 'comment', comment);
  sheet.appendRow(row);
  return { success: true };
}

// Captures interest from someone who hit the /apply/a1 page while
// applications were closed. Deliberately separate from the Applications
// sheet/flow above (this is a name+email+phone lead, not a full
// application) so priority-list follow-up for the next session doesn't
// get mixed in with an actual session's applicant pool.
function submitA1Waitlist_(body) {
  var name = String(body.name || '').trim();
  var email = String(body.email || '').trim();
  var whatsappNumber = String(body.whatsappNumber || '').trim();
  if (!name) throw new Error('Name is required.');
  if (!email) throw new Error('Email is required.');
  if (!whatsappNumber) throw new Error('WhatsApp number is required.');

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(A1_WAITLIST_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(A1_WAITLIST_SHEET);
    sheet.appendRow(A1_WAITLIST_HEADERS);
  }
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var emailCol = headers.indexOf('email'), phoneCol = headers.indexOf('whatsapp number');

  // Same "one person, one entry" guard as submitA1Application_ — block a
  // resubmission matching an existing row on either email or WhatsApp
  // number, rather than piling up duplicate rows from someone who
  // revisits the page more than once.
  var needleEmail = email.toLowerCase();
  var needlePhone = normalizePhone_(whatsappNumber);
  for (var i = 1; i < values.length; i++) {
    var rowEmail = emailCol !== -1 ? String(values[i][emailCol] || '').trim().toLowerCase() : '';
    var rowPhone = phoneCol !== -1 ? normalizePhone_(values[i][phoneCol]) : '';
    var emailMatches = rowEmail && needleEmail && rowEmail === needleEmail;
    var phoneMatches = rowPhone && needlePhone && rowPhone === needlePhone;
    if (emailMatches || phoneMatches) {
      return { success: true, alreadyOnList: true };
    }
  }

  sheet.appendRow([new Date(), name, email, whatsappNumber]);
  return { success: true };
}

// Lists every A1 application, newest first, for the admin panel. Includes
// already-decided ones too (not just pending) so admin can see recent
// history, not just the queue.
function adminListApplications_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) return { success: true, applications: [] };
  ensureApplicationsHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, applications: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };
  var nameCol = col('name'), emailCol = col('email'), phoneCol = col('whatsapp number'),
    dobCol = col('date of birth'), facebookCol = col('facebook profile link'),
    occupationCol = col('current occupation'), cityCol = col('current city'),
    batchChoiceCol = col('batch choice'), prevExpCol = col('previous glab experience'),
    prevDetailsCol = col('previous course details'), prevCompletedCol = col('previous course completed'),
    motivationCol = col('motivation'), whyGlabCol = col('why glab'), howHeardCol = col('how heard'),
    primaryGoalCol = col('primary goal'), commentCol = col('comment'),
    noteCol = col('admin note'), flaggedCol = col('flagged'),
    statusCol = col('selection status'), glabIdCol = col('glab id'),
    batchCol = col('confirmed batch'), timestampCol = col('timestamp');
  if (emailCol === -1 || phoneCol === -1) return { success: true, applications: [] };

  var get = function (row, c) { return c !== -1 ? row[c] : ''; };
  var apps = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var rawStatus = statusCol !== -1 ? String(row[statusCol] || '').trim().toLowerCase() : '';
    var status = rawStatus === 'selected' ? 'selected' : rawStatus === 'not selected' ? 'not_selected' : 'pending';
    apps.push({
      row: i + 1,
      name: get(row, nameCol),
      email: row[emailCol],
      phone: row[phoneCol],
      dob: dobCol !== -1 ? normalizeDate_(row[dobCol]) : '',
      facebookLink: get(row, facebookCol),
      occupation: get(row, occupationCol),
      city: get(row, cityCol),
      batchChoice: get(row, batchChoiceCol),
      previousExperience: get(row, prevExpCol),
      previousCourseDetails: get(row, prevDetailsCol),
      previousCourseCompleted: get(row, prevCompletedCol),
      motivation: get(row, motivationCol),
      whyGlab: get(row, whyGlabCol),
      howHeard: get(row, howHeardCol),
      primaryGoal: get(row, primaryGoalCol),
      comment: get(row, commentCol),
      note: get(row, noteCol),
      flagged: flaggedCol !== -1 && isTruthy_(row[flaggedCol]),
      status: status,
      glabId: get(row, glabIdCol),
      confirmedBatch: get(row, batchCol),
      timestamp: timestampCol !== -1 && row[timestampCol] ? new Date(row[timestampCol]).toISOString() : null
    });
  }
  apps.reverse();
  return { success: true, applications: apps };
}

// Finds the Applications row for one applicant (same email+WhatsApp-number
// match findApplication_ uses) and returns its sheet row index (0-based,
// into getDataRange()'s values array) plus the header column lookup —
// shared by adminSelectApplicant_ and adminRejectApplicant_ so both locate
// rows the same way.
function findApplicationRow_(email, phone) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) throw new Error('Applications sheet not found');
  ensureApplicationsHeaders_(sheet);
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };
  var nameCol = col('name'), emailCol = col('email'), phoneCol = col('whatsapp number'),
    statusCol = col('selection status'), glabIdCol = col('glab id'),
    batchCol = col('confirmed batch'), batchIdCol = col('confirmed batch id');
  if (batchIdCol === -1) batchIdCol = col('batch id');
  if (emailCol === -1 || phoneCol === -1) throw new Error('Applications sheet must have "Email" and "WhatsApp Number" columns');
  if (statusCol === -1) throw new Error('Applications sheet must have a "Selection Status" column');

  var needleEmail = String(email || '').trim().toLowerCase();
  var needlePhone = normalizePhone_(phone);
  var rowIndex = -1;
  for (var i = 1; i < values.length; i++) {
    var rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
    var rowPhone = normalizePhone_(values[i][phoneCol]);
    if (rowEmail === needleEmail && rowPhone === needlePhone) { rowIndex = i; break; }
  }
  if (rowIndex === -1) throw new Error('Application not found');

  return {
    sheet: sheet, values: values, rowIndex: rowIndex,
    nameCol: nameCol, emailCol: emailCol, statusCol: statusCol,
    glabIdCol: glabIdCol, batchCol: batchCol, batchIdCol: batchIdCol
  };
}

// Lets admin leave a private note on an application (e.g. "Recommended by
// GLAB26H130" or "Weak motivation, low priority") and/or flag it for
// attention, entirely separate from Selection Status — this is for triage
// before a Select/Reject decision is made, not a decision itself. Addressed
// by the 1-indexed sheet row (from adminListApplications_'s `row` field)
// rather than email+phone, since a row worth flagging (e.g. a corrupted or
// duplicate one) might not have reliable email/phone to match on.
function adminSetApplicationNote_(row, note, flagged) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) throw new Error('Applications sheet not found');
  ensureApplicationsHeaders_(sheet);
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var noteCol = headers.indexOf('admin note'), flaggedCol = headers.indexOf('flagged');
  if (noteCol === -1 || flaggedCol === -1) {
    throw new Error('Applications sheet must have "Admin Note" and "Flagged" columns');
  }
  var rowNum = parseInt(row, 10);
  if (!rowNum || rowNum < 2 || rowNum > sheet.getLastRow()) throw new Error('Invalid row.');

  sheet.getRange(rowNum, noteCol + 1).setValue(note || '');
  sheet.getRange(rowNum, flaggedCol + 1).setValue(!!flagged);
  return { success: true };
}

// Marks one applicant Selected and emails them a registration link —
// deliberately does NOT assign a GLAB ID or create their Students row yet.
// A GLAB ID is a permanent, sequential resource; minting one for every
// selected applicant regardless of whether they ever actually register
// would burn real IDs on people who never show up to pay. The ID is
// created later, in submitA1Registration_, only at the moment an applicant
// actually submits payment. Idempotent — re-clicking Select on an
// already-selected applicant is a no-op.
function adminSelectApplicant_(email, phone, batchLabel, batchId) {
  var found = findApplicationRow_(email, phone);
  var existingStatus = String(found.values[found.rowIndex][found.statusCol] || '').trim().toLowerCase();
  if (existingStatus === 'selected') {
    return { success: true, alreadySelected: true };
  }

  var applicantName = found.nameCol !== -1 ? found.values[found.rowIndex][found.nameCol] : '';

  var sheetRow = found.rowIndex + 1;
  found.sheet.getRange(sheetRow, found.statusCol + 1).setValue('Selected');
  if (found.batchCol !== -1) found.sheet.getRange(sheetRow, found.batchCol + 1).setValue(batchLabel || '');
  if (found.batchIdCol !== -1) found.sheet.getRange(sheetRow, found.batchIdCol + 1).setValue(batchId || '');

  sendA1SelectionEmail_(String(found.values[found.rowIndex][found.emailCol] || '').trim(), applicantName);
  return { success: true };
}

// Marks one applicant Not Selected and emails them the standard "not
// selected this round" text (the same copy /results already shows for this
// status) — closes the loop for applicants who don't proactively check
// their result.
function adminRejectApplicant_(email, phone) {
  var found = findApplicationRow_(email, phone);
  var applicantName = found.nameCol !== -1 ? found.values[found.rowIndex][found.nameCol] : '';
  found.sheet.getRange(found.rowIndex + 1, found.statusCol + 1).setValue('Not Selected');
  sendA1RejectionEmail_(String(found.values[found.rowIndex][found.emailCol] || '').trim(), applicantName);
  return { success: true };
}

// Scans the Applications sheet for two kinds of junk rows, without
// deleting anything — adminApplyApplicationCleanup_ does the actual
// deletion, only for rows this preview surfaced and the admin confirmed:
//   1. "Corrupt" rows — no Name and no Email at all (e.g. a row with only
//      a WhatsApp number and nothing else, which the real application
//      form could never produce — see submitA1Application_'s required-
//      field validation). Pure junk, no information lost by removing them.
//   2. "Duplicate" groups — rows sharing the same normalized phone or
//      email. Within each group the "best" row is kept (already decided
//      > most complete data > earliest submission) and the rest are
//      listed as removal candidates.
function adminPreviewApplicationCleanup_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) return { success: true, corruptRows: [], duplicateGroups: [] };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, corruptRows: [], duplicateGroups: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };
  var nameCol = col('name'), emailCol = col('email'), phoneCol = col('whatsapp number'),
    statusCol = col('selection status'), timestampCol = col('timestamp');
  if (emailCol === -1 || phoneCol === -1) return { success: true, corruptRows: [], duplicateGroups: [] };

  var corruptRows = [];
  var candidates = []; // non-corrupt rows, considered for duplicate grouping
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    var name = nameCol !== -1 ? String(row[nameCol] || '').trim() : '';
    var email = String(row[emailCol] || '').trim();
    var phone = String(row[phoneCol] || '').trim();
    var summary = {
      row: i + 1, name: name, email: email, phone: phone,
      status: statusCol !== -1 ? String(row[statusCol] || '').trim() : '',
      timestamp: timestampCol !== -1 && row[timestampCol] ? new Date(row[timestampCol]).toISOString() : null
    };
    if (!name && !email) {
      corruptRows.push(summary);
      continue;
    }
    var nonEmptyCount = row.filter(function (v) { return String(v || '').trim() !== ''; }).length;
    candidates.push({ summary: summary, normPhone: normalizePhone_(phone), normEmail: email.toLowerCase(), nonEmptyCount: nonEmptyCount });
  }

  // Group remaining rows by identity (phone if present, else email).
  var groups = {};
  candidates.forEach(function (c) {
    var key = c.normPhone || c.normEmail;
    if (!key) return;
    if (!groups[key]) groups[key] = [];
    groups[key].push(c);
  });

  var duplicateGroups = [];
  Object.keys(groups).forEach(function (key) {
    var members = groups[key];
    if (members.length < 2) return;
    members.sort(function (a, b) {
      var aDecided = a.summary.status ? 1 : 0, bDecided = b.summary.status ? 1 : 0;
      if (aDecided !== bDecided) return bDecided - aDecided;
      if (a.nonEmptyCount !== b.nonEmptyCount) return b.nonEmptyCount - a.nonEmptyCount;
      return a.summary.row - b.summary.row;
    });
    duplicateGroups.push({
      key: key,
      keepRow: members[0].summary.row,
      rows: members.map(function (m) { return m.summary; })
    });
  });

  return { success: true, corruptRows: corruptRows, duplicateGroups: duplicateGroups };
}

// Deletes the given 1-indexed sheet rows from Applications — only ever
// called with rows the admin has explicitly reviewed and confirmed via the
// preview above. Deletes bottom-to-top so earlier row numbers don't shift
// out from under later deletions.
function adminApplyApplicationCleanup_(rows) {
  if (!rows || !rows.length) return { success: true, deleted: 0 };
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) throw new Error('Applications sheet not found');

  var rowNums = rows.map(function (r) { return parseInt(r, 10); })
    .filter(function (r) { return r >= 2 && r <= sheet.getLastRow(); });
  rowNums.sort(function (a, b) { return b - a; });
  rowNums.forEach(function (r) { sheet.deleteRow(r); });
  return { success: true, deleted: rowNums.length };
}

// Adds a bare row to Students with just GLAB ID + Name — the same minimal
// row an admin used to type in by hand when manually selecting an A1
// applicant. Eligibility is granted separately via adminSetStudentEligible_.
// Restores one student's row on the Students sheet if it's missing —
// recovery for rows that get deleted by mistake (e.g. someone clearing
// out "done with the program" students, not realizing this sheet is also
// the MyGLAB login/identity record, not just an eligibility list — a
// finished B1 student still needs their row to exist to see their own
// attendance/certificate history and log in at all). A no-op (not an
// error) if the row already exists, so this is safe to call speculatively
// on a list of GLAB IDs without checking first. Restores identity only —
// eligibility checkboxes stay unset, exactly as a normal finished
// student's would be.
function adminRestoreMissingStudent_(glabId, name) {
  glabId = String(glabId || '').trim();
  if (!glabId) throw new Error('GLAB ID is required.');
  var existing = findStudent_(glabId);
  if (existing) return { success: true, alreadyExists: true };
  appendStudentRow_(glabId, name || '');
  return { success: true, restored: true };
}

function appendStudentRow_(glabId, name) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENTS_SHEET);
  if (!sheet) throw new Error('Students sheet not found');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id'), nameCol = headers.indexOf('name');
  if (idCol === -1 || nameCol === -1) throw new Error('Students sheet must have "GLAB ID" and "Name" columns');
  var row = new Array(headers.length).fill('');
  row[idCol] = glabId;
  row[nameCol] = name;
  sheet.appendRow(row);
}

// Generates the next A1 GLAB ID from an explicit counter (prefix + next
// sequence number, both set via adminSetA1IdSettings_/the admin panel) —
// deliberately not derived by scanning the roster for the highest existing
// ID, since that depends on historical data actually being present and
// complete in a particular sheet. Consumes the counter: every successful
// call advances A1_NEXT_SEQ by 1, so the admin sets the starting number
// once per admission cycle and it just keeps counting from there
// (including across the two same-lettered "H" sessions per year).
function generateNextA1GlabId_() {
  var props = PropertiesService.getScriptProperties();
  var prefix = props.getProperty(A1_ID_PREFIX_PROPERTY);
  var nextSeq = props.getProperty(A1_NEXT_SEQ_PROPERTY);
  if (!prefix || !nextSeq) {
    throw new Error('Set the current A1 GLAB ID prefix and next number in the admin panel first.');
  }
  prefix = String(prefix).trim().toUpperCase();
  var seq = parseInt(nextSeq, 10);
  if (isNaN(seq)) throw new Error('The configured A1 next-number setting is invalid.');

  var digits = Math.max(3, String(seq).length);
  var seqStr = String(seq);
  while (seqStr.length < digits) seqStr = '0' + seqStr;

  props.setProperty(A1_NEXT_SEQ_PROPERTY, String(seq + 1));
  return 'GLAB' + prefix + seqStr;
}

function adminGetA1IdSettings_() {
  var props = PropertiesService.getScriptProperties();
  return {
    success: true,
    prefix: props.getProperty(A1_ID_PREFIX_PROPERTY) || '',
    nextSeq: props.getProperty(A1_NEXT_SEQ_PROPERTY) || ''
  };
}

function adminSetA1IdSettings_(prefix, nextSeq) {
  var seq = parseInt(nextSeq, 10);
  if (!prefix || isNaN(seq) || seq < 1) {
    throw new Error('A prefix (e.g. "26H") and a valid next number are both required.');
  }
  var props = PropertiesService.getScriptProperties();
  props.setProperty(A1_ID_PREFIX_PROPERTY, String(prefix).trim().toUpperCase());
  props.setProperty(A1_NEXT_SEQ_PROPERTY, String(seq));
  return { success: true };
}

function sendA1SelectionEmail_(email, name) {
  if (!email) return;
  try {
    var lines = [
      'Hi ' + (name || 'there') + ',', '',
      "Congratulations — you've been selected for GLAB's A1 Intensive course!",
      '',
      'Complete your registration here: glabeducation.com/results',
      '(log in with the same email and WhatsApp number you used to apply)',
      '',
      'Your GLAB ID will be assigned once your registration is submitted.',
      '',
      'Seats are limited, so please register as soon as you can to secure your spot.',
      '',
      '— GLAB Team'
    ];
    GmailApp.sendEmail(email, "You've been selected for GLAB A1 Intensive!", lines.join('\n'), {
      name: 'GLAB - German Language Academy of Bangladesh',
      from: 'info@glabeducation.com'
    });
  } catch (err) {
    PropertiesService.getScriptProperties().setProperty(
      'LAST_A1_SELECT_EMAIL_ERROR', new Date().toISOString() + ' — ' + err.message
    );
  }
}

function sendA1RejectionEmail_(email, name) {
  if (!email) return;
  try {
    var lines = [
      'Hi ' + (name || 'there') + ',', '',
      'Thank you for your interest in joining GLAB.',
      'After carefully reviewing all applications, we regret to inform you that you have not been selected for this session.',
      'Due to the limited number of seats, not all applicants can be accommodated.',
      'We sincerely appreciate your interest in GLAB and encourage you to apply again in a future session.',
      'Thank you for your understanding, and we wish you all the best in your German language learning journey.',
      '',
      '— GLAB Team'
    ];
    GmailApp.sendEmail(email, 'Your GLAB A1 Application Result', lines.join('\n'), {
      name: 'GLAB - German Language Academy of Bangladesh',
      from: 'info@glabeducation.com'
    });
  } catch (err) {
    PropertiesService.getScriptProperties().setProperty(
      'LAST_A1_REJECT_EMAIL_ERROR', new Date().toISOString() + ' — ' + err.message
    );
  }
}

function lookupStudent_(glabId) {
  var student = findStudent_(glabId);
  if (!student) return { success: true, found: false };
  if (student.blocked) return { success: true, found: true, blocked: true, name: student.name };

  var registration = findLatestRegistration_(student.glabId);
  if (registration && registration.status === CONFIRMED_STATUS) {
    var links = findBatchInfo_(registration.batchId);
    registration.whatsappLink = links.whatsappLink;
    registration.classroomLink = links.classroomLink;
    registration.meetLink = links.meetLink;
  }

  return {
    success: true,
    found: true,
    name: student.name,
    eligibleCourses: student.eligibleCourses,
    registration: registration,
    savedEmail: findLatestInterestEmail_(student.glabId)
  };
}

// Finds the email a student gave when they last expressed interest in
// their next level (any row, processed or not — by the time they're
// actually registering, that request has usually been approved already).
// /portal prefills its own Email field with this so a student doesn't have
// to type the same address twice; still editable, and submitRegistration_
// still requires it explicitly, so a missing/stale value here never blocks
// anything.
function findLatestInterestEmail_(glabId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INTEREST_SHEET);
  if (!sheet || !glabId) return null;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var emailCol = headers.indexOf('email');
  var tsCol = headers.indexOf('timestamp');
  if (idCol === -1 || emailCol === -1) return null;

  var needle = String(glabId).trim().toLowerCase();
  var latest = null;
  var latestTime = -Infinity;
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '').trim().toLowerCase() !== needle) continue;
    var email = String(values[i][emailCol] || '').trim();
    if (!email) continue;
    var t = tsCol !== -1 ? new Date(values[i][tsCol]).getTime() : i;
    if (t >= latestTime) {
      latestTime = t;
      latest = email;
    }
  }
  return latest;
}

function submitRegistration_(body) {
  if (!isRegistrationOpen_()) throw new Error('Registration is currently closed. Please check back later.');

  var student = findStudent_(body.glabId);
  if (!student) throw new Error('GLAB ID not found');
  if (student.blocked) throw new Error('This account has been restricted. Please contact GLAB.');

  if (!body.course) throw new Error('Course is required');
  if (!body.batchId) throw new Error('Batch is required');
  if (!body.email) throw new Error('Email is required');
  if (!body.paymentMethod) throw new Error('Payment method is required');
  if (!body.fileBase64 || !body.fileName || !body.fileMimeType) {
    throw new Error('Payment proof file is required');
  }
  if (!/^image\//.test(body.fileMimeType) && body.fileMimeType !== 'application/pdf') {
    throw new Error('Payment proof must be an image or a PDF');
  }
  var isEligible = student.eligibleCourses.some(function (c) {
    return body.course.indexOf(c) === 0;
  });
  if (!isEligible) throw new Error('Not eligible for this course');

  // Idempotency guard: if this GLAB ID already has a row for this exact
  // batch, don't append another one — just report success without writing
  // a new row. Without this, a client retry after an ambiguous network
  // error (the submission actually succeeded, but the response never
  // confirmed it) produces a real duplicate row. Scoped to this specific
  // batchId, not "any registration ever" — a past registration for a
  // different course/batch (even one still Confirmed) is a real, separate
  // registration event and must never block a new one.
  var existing = findRegistrationForBatch_(student.glabId, body.batchId);
  if (existing) {
    var existingLinks = existing.status === CONFIRMED_STATUS
      ? findBatchInfo_(existing.batchId)
      : { whatsappLink: null, classroomLink: null, meetLink: null };
    existing.whatsappLink = existingLinks.whatsappLink;
    existing.classroomLink = existingLinks.classroomLink;
    existing.meetLink = existingLinks.meetLink;
    return { success: true, alreadyRegistered: true, registration: existing };
  }

  var fileUrl = saveProofFile_(body.fileBase64, body.fileName, body.fileMimeType);
  appendRegistrationRow_({
    'Timestamp': new Date(),
    'GLAB ID': student.glabId,
    'Name': student.name,
    'Course': body.course,
    'Batch ID': body.batchId,
    'Email': body.email,
    'Paying From': body.paymentMethod,
    'Payment Reference': body.paymentReference || '',
    'Proof File Link': fileUrl,
    'Feedback': body.feedback || '',
    'Status': DEFAULT_STATUS
  });
  return { success: true };
}

// The A1 equivalent of submitRegistration_ — identifies the applicant by
// email + WhatsApp number (the Applications row) instead of an existing
// GLAB ID, because for a first-time A1 registrant none exists yet. Mints
// the GLAB ID and creates the Students row right here, at the moment of
// actual payment submission, rather than at Select time — see
// adminSelectApplicant_'s comment for why. Idempotent the same way a
// resubmit is: if this Applications row already has a GLAB ID (an earlier
// submission attempt already created one), reuses it instead of minting a
// second one; submitRegistration_'s own per-batch idempotency guard then
// handles a genuine duplicate submission from there.
function submitA1Registration_(body) {
  var email = String(body.email || '').trim();
  var phone = String(body.phone || '').trim();
  if (!email) throw new Error('Email is required.');
  if (!phone) throw new Error('WhatsApp number is required.');

  var found = findApplicationRow_(email, phone);
  var status = String(found.values[found.rowIndex][found.statusCol] || '').trim().toLowerCase();
  if (status !== 'selected') throw new Error('This application has not been selected for registration.');

  var glabId = found.glabIdCol !== -1 ? String(found.values[found.rowIndex][found.glabIdCol] || '').trim() : '';
  if (!glabId) {
    var applicantName = found.nameCol !== -1 ? found.values[found.rowIndex][found.nameCol] : '';
    glabId = generateNextA1GlabId_();
    appendStudentRow_(glabId, applicantName);
    adminSetStudentEligible_(glabId, 'A1', true);
    if (found.glabIdCol !== -1) found.sheet.getRange(found.rowIndex + 1, found.glabIdCol + 1).setValue(glabId);
  }

  var result = submitRegistration_(Object.assign({}, body, { glabId: glabId }));
  result.glabId = glabId;
  return result;
}

function saveProofFile_(base64, fileName, mimeType) {
  var folderId = PropertiesService.getScriptProperties().getProperty('DRIVE_FOLDER_ID');
  if (!folderId) throw new Error('DRIVE_FOLDER_ID script property not set');

  var bytes = Utilities.base64Decode(base64);
  if (bytes.length > MAX_FILE_BYTES) throw new Error('File too large');

  var blob = Utilities.newBlob(bytes, mimeType, fileName);
  var folder = DriveApp.getFolderById(folderId);
  var file = folder.createFile(blob);
  return file.getUrl();
}

// Saves a student's handwritten writing-task photo/scan directly to Drive,
// named with their exam code + GLAB ID + timestamp so it's unambiguous which
// student it belongs to without relying on them naming the file themselves.
// Uses its own script property (EXAM_WRITING_FOLDER_ID) — a separate folder
// from payment proofs — and each upload only touches that one file, so
// students never see anyone else's submission (unlike a shared Drive folder
// link, which requires Editor access to upload and therefore also grants
// view access to everything else already in it).
function uploadWritingProof_(body) {
  if (!body.examCode || !body.glabId || !body.fileBase64 || !body.fileName || !body.fileMimeType) {
    throw new Error('Exam code, GLAB ID, and file are required.');
  }
  if (!/^image\//.test(body.fileMimeType) && body.fileMimeType !== 'application/pdf') {
    throw new Error('File must be an image or a PDF.');
  }
  var parentFolderId = PropertiesService.getScriptProperties().getProperty('EXAM_WRITING_FOLDER_ID');
  if (!parentFolderId) throw new Error('EXAM_WRITING_FOLDER_ID script property not set');

  var bytes = Utilities.base64Decode(body.fileBase64);
  if (bytes.length > MAX_FILE_BYTES) throw new Error('File too large');

  var ext = String(body.fileName).split('.').pop() || 'jpg';
  var safeName = body.examCode + '_' + String(body.glabId).trim().toUpperCase() + '_' + new Date().getTime() + '.' + ext;
  var blob = Utilities.newBlob(bytes, body.fileMimeType, safeName);
  var parentFolder = DriveApp.getFolderById(parentFolderId);
  var examFolder = getOrCreateSubfolder_(parentFolder, body.examCode);
  var file = examFolder.createFile(blob);
  return { success: true, fileUrl: file.getUrl() };
}

// Finds (or creates, on first use) a subfolder named after the exam code
// inside the given parent — so one script property/folder setup stays
// organized as one subfolder per exam, without needing new setup steps
// each time a new exam is created.
function getOrCreateSubfolder_(parentFolder, name) {
  var existing = parentFolder.getFoldersByName(name);
  if (existing.hasNext()) return existing.next();
  return parentFolder.createFolder(name);
}

// Appends one Registrations row, matching each field to its column by
// header name (case-insensitive) rather than a fixed position — so adding a
// column to the live sheet (like "Email") works regardless of where you put
// it, without needing this function updated to match. Any field with no
// matching column is silently dropped.
function appendRegistrationRow_(fields) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(REGISTRATIONS_SHEET);
    sheet.appendRow(REGISTRATIONS_HEADERS);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var row = new Array(headers.length).fill('');
  Object.keys(fields).forEach(function (key) {
    var col = headers.indexOf(key.toLowerCase());
    if (col !== -1) row[col] = fields[key];
  });
  sheet.appendRow(row);
}

// Records a /contact form submission. The site previously only simulated
// this (a fake setTimeout with no backend call at all), so messages were
// silently discarded — this makes it a real submission, landing in its own
// sheet for manual follow-up, same pattern as Registrations/Exam Submissions.
function submitContact_(body) {
  if (!body.name || !body.email || !body.message) {
    throw new Error('Name, email, and message are required.');
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(CONTACT_MESSAGES_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(CONTACT_MESSAGES_SHEET);
    sheet.appendRow(CONTACT_MESSAGES_HEADERS);
  }
  sheet.appendRow([
    new Date(),
    body.name,
    body.email,
    body.subject || '',
    body.message
  ]);
  return { success: true };
}

// Records an exam submission. Scores are never sent back to the student —
// the client only learns "submitted successfully". Results stay in this
// sheet with a blank "Published" column until an admin decides to release
// them, matching the same manual-confirmation pattern as Registrations.
function submitExam_(body) {
  if (!body.name || !body.glabId || !body.examCode) {
    throw new Error('Name, GLAB ID, and exam code are required.');
  }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(EXAM_SUBMISSIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(EXAM_SUBMISSIONS_SHEET);
    sheet.appendRow(EXAM_SUBMISSIONS_HEADERS);
  }
  sheet.appendRow([
    new Date(),
    String(body.glabId).trim(),
    body.name,
    body.examCode,
    body.score,
    body.totalScorable,
    body.percent,
    body.writingUploaded ? 'Yes' : 'No',
    JSON.stringify(body.answers || {}),
    ''
  ]);
  return { success: true };
}

// Checks whether a GLAB ID is allowed to take a given exam, by looking up
// the "Exam Permissions" sheet — lets the admin grant/revoke access live via
// checkbox, no redeploy needed, unlike an exam whose allowed IDs are baked
// into the site's JSON at build time. Needs "GLAB ID", "Exam Code", and
// "Allowed" columns; "Name" is optional, read-only reference data.
function checkExamPermission_(examCode, glabId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXAM_PERMISSIONS_SHEET);
  if (!sheet) return { success: true, found: false, allowed: false, alreadySubmitted: false };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, found: false, allowed: false, alreadySubmitted: false };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var codeCol = headers.indexOf('exam code');
  var allowedCol = headers.indexOf('allowed');
  if (idCol === -1 || codeCol === -1 || allowedCol === -1) {
    throw new Error('Exam Permissions sheet must have "GLAB ID", "Exam Code", and "Allowed" columns');
  }

  var needleId = String(glabId || '').trim().toLowerCase();
  var needleCode = String(examCode || '').trim().toLowerCase();
  if (!needleId || !needleCode) return { success: true, found: false, allowed: false, alreadySubmitted: false };

  var alreadySubmitted = hasExamSubmission_(needleCode, needleId);

  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    var rowCode = String(values[i][codeCol] || '').trim().toLowerCase();
    if (rowId === needleId && rowCode === needleCode) {
      return { success: true, found: true, allowed: isTruthy_(values[i][allowedCol]), alreadySubmitted: alreadySubmitted };
    }
  }
  return { success: true, found: false, allowed: false, alreadySubmitted: alreadySubmitted };
}

// Cross-device check for whether this GLAB ID has already submitted this
// exam — the client also keeps a localStorage "done" marker, but that only
// blocks re-entry on the same browser/device. Checking the Exam Submissions
// sheet here closes the gap: someone logging in from a different device (or
// after clearing site data) after already submitting is still blocked.
function hasExamSubmission_(needleCodeLower, needleIdLower) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(EXAM_SUBMISSIONS_SHEET);
  if (!sheet) return false;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return false;
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var codeCol = headers.indexOf('exam code');
  if (idCol === -1 || codeCol === -1) return false;

  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    var rowCode = String(values[i][codeCol] || '').trim().toLowerCase();
    if (rowId === needleIdLower && rowCode === needleCodeLower) return true;
  }
  return false;
}

// Reads the "Reviews" tab — rows land here three ways: adminAddReview_
// (published immediately), submitStudentReview_ (a student's own
// self-service submission from MyGLAB, always unsynced), or pasted in by
// hand. onlyUnsynced=true (used by /admin's Pending Reviews queue) filters
// to just the ones awaiting approval. Expected columns (any order, matched
// by header name): Name, Location, Rating, Date, Course, Review Text,
// Outcome, Featured, Synced. "Synced" doubles as the live-publish flag —
// see getPublishedReviews_ — checked off by markReviewsSynced_ once an
// admin approves a pending row.
function listReviews_(onlyUnsynced) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REVIEWS_SHEET);
  if (!sheet) throw new Error('Reviews sheet not found');

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, reviews: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var nameCol = col('name'), locCol = col('location'), ratingCol = col('rating'),
      dateCol = col('date'), courseCol = col('course'), textCol = col('review text'),
      outcomeCol = col('outcome'), featuredCol = col('featured'), syncedCol = col('synced');

  var reviews = [];
  for (var i = 1; i < values.length; i++) {
    var synced = syncedCol !== -1 && isTruthy_(values[i][syncedCol]);
    if (onlyUnsynced && synced) continue;
    var row = values[i];
    if (!row[nameCol] && !row[textCol]) continue; // skip blank rows
    reviews.push({
      row: i + 1, // 1-indexed sheet row, for markReviewsSynced_
      name: nameCol !== -1 ? row[nameCol] : '',
      location: locCol !== -1 ? row[locCol] : '',
      rating: ratingCol !== -1 ? Number(row[ratingCol]) || null : null,
      date: dateCol !== -1 ? normalizeDate_(row[dateCol]) : '',
      course: courseCol !== -1 ? row[courseCol] : '',
      text: textCol !== -1 ? row[textCol] : '',
      outcome: outcomeCol !== -1 ? row[outcomeCol] : '',
      featured: featuredCol !== -1 && isTruthy_(row[featuredCol]),
      synced: synced
    });
  }
  return { success: true, reviews: reviews };
}

// Checks off "Synced" for the given 1-indexed row numbers (as returned by
// listReviews_) once they've been copied into data/reviews.json.
function markReviewsSynced_(rowNumbers) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REVIEWS_SHEET);
  if (!sheet) throw new Error('Reviews sheet not found');
  if (!rowNumbers || !rowNumbers.length) return { success: true, updated: 0 };

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var syncedCol = headers.indexOf('synced');
  if (syncedCol === -1) throw new Error('Reviews sheet has no "Synced" column');

  rowNumbers.forEach(function (r) {
    sheet.getRange(r, syncedCol + 1).setValue(true);
  });
  return { success: true, updated: rowNumbers.length };
}

// Permanently removes one row from the Reviews tab — for a duplicate
// self-submission (a student accidentally submitting the same review
// twice) or any other pending review that shouldn't be published.
// Row numbers only ever come from listReviews_'s own output, but the
// header-row guard stays as a hard backstop against ever wiping the
// sheet's column labels.
function adminDeleteReview_(row) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REVIEWS_SHEET);
  if (!sheet) throw new Error('Reviews sheet not found');
  row = Number(row);
  if (!row || row < 2) throw new Error('Invalid row.');
  sheet.deleteRow(row);
  return { success: true };
}

// Returns every "Synced" review from the Reviews tab, for live display on
// the public site. "Synced" now doubles as the publish flag — checking it
// (via the admin panel's Add Review form, which checks it automatically, or
// by hand on a row someone pasted in directly) makes a review appear on
// /reviews and the homepage immediately, no code deploy needed. This is what
// replaced the old fully-manual "paste into this tab, then hand-copy into
// data/reviews.json" workflow described in apps-script/README.md.
function getPublishedReviews_() {
  var all = listReviews_(false).reviews;
  var published = all.filter(function (r) { return r.synced; });
  return {
    success: true,
    reviews: published.map(function (r) {
      return {
        id: 'sheet-' + r.row,
        name: r.name,
        location: r.location,
        rating: r.rating,
        date: r.date,
        level: r.course,
        text: r.text,
        outcome: r.outcome,
        featured: r.featured,
        verified: true
      };
    })
  };
}

// Admin: appends a new review to the Reviews tab, already marked Synced —
// i.e. published live immediately. This is the "Add Review" form on /admin,
// for one-off reviews (e.g. copied from a Facebook comment) without needing
// a code change.
function adminAddReview_(body) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REVIEWS_SHEET);
  if (!sheet) throw new Error('Reviews sheet not found');
  if (!body.name || !body.text) throw new Error('Name and review text are required.');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var nameCol = col('name'), locCol = col('location'), ratingCol = col('rating'),
      dateCol = col('date'), courseCol = col('course'), textCol = col('review text'),
      outcomeCol = col('outcome'), featuredCol = col('featured'), syncedCol = col('synced');
  if (nameCol === -1 || textCol === -1 || syncedCol === -1) {
    throw new Error('Reviews sheet must have "Name", "Review Text", and "Synced" columns');
  }

  var row = new Array(headers.length).fill('');
  row[nameCol] = body.name;
  if (locCol !== -1) row[locCol] = body.location || '';
  if (ratingCol !== -1) row[ratingCol] = body.rating || 5;
  if (dateCol !== -1) row[dateCol] = body.date || normalizeDate_(new Date());
  if (courseCol !== -1) row[courseCol] = body.level || '';
  row[textCol] = body.text;
  if (outcomeCol !== -1) row[outcomeCol] = body.outcome || '';
  if (featuredCol !== -1) row[featuredCol] = !!body.featured;
  row[syncedCol] = true;

  sheet.appendRow(row);
  return { success: true };
}

// ===== Announcements (admin panel "Add Announcement" form) =====
// Same pattern as Reviews: every row in this tab is published live
// immediately (no separate approval queue, unlike Reviews' "Synced" flag —
// only admin ever writes here, there's no public self-submission path to
// gate). Historical announcements before this feature existed stay in
// data/announcements.json as a static fallback; getAnnouncements() on the
// Next.js side merges both, so nothing needs a one-time migration.
function getPublishedAnnouncements_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ANNOUNCEMENTS_SHEET);
  if (!sheet) return { success: true, announcements: [] };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, announcements: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };
  var titleCol = col('title'), excerptCol = col('excerpt'), contentCol = col('content'),
    dateCol = col('date'), categoryCol = col('category'), importantCol = col('important');

  var announcements = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (!row[titleCol]) continue; // skip blank rows
    announcements.push({
      id: 'sheet-' + (i + 1),
      title: row[titleCol],
      excerpt: excerptCol !== -1 ? row[excerptCol] : '',
      content: contentCol !== -1 ? row[contentCol] : '',
      date: dateCol !== -1 ? normalizeDate_(row[dateCol]) : '',
      category: categoryCol !== -1 ? row[categoryCol] : 'Course Registration',
      important: importantCol !== -1 && isTruthy_(row[importantCol])
    });
  }
  return { success: true, announcements: announcements };
}

// Admin: appends a new announcement, published live immediately — the
// /admin "Add Announcement" form, replacing the old workflow of asking
// Claude to edit data/announcements.json and push a deploy for every
// announcement.
function adminAddAnnouncement_(body) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(ANNOUNCEMENTS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(ANNOUNCEMENTS_SHEET);
    sheet.appendRow(ANNOUNCEMENTS_HEADERS);
  }
  if (!body.title || !body.content) throw new Error('Title and content are required.');

  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (n) { return headers.indexOf(n); };
  var titleCol = col('title'), excerptCol = col('excerpt'), contentCol = col('content'),
    dateCol = col('date'), categoryCol = col('category'), importantCol = col('important');
  if (titleCol === -1 || contentCol === -1) {
    throw new Error('Announcements sheet must have "Title" and "Content" columns');
  }

  var row = new Array(headers.length).fill('');
  row[titleCol] = body.title;
  if (excerptCol !== -1) row[excerptCol] = body.excerpt || '';
  row[contentCol] = body.content;
  if (dateCol !== -1) row[dateCol] = body.date || normalizeDate_(new Date());
  if (categoryCol !== -1) row[categoryCol] = body.category || 'Course Registration';
  if (importantCol !== -1) row[importantCol] = !!body.important;

  sheet.appendRow(row);
  return { success: true };
}

// Lets a logged-in student submit their own review from MyGLAB — lands in
// the same Reviews tab as adminAddReview_, but always unsynced (unlike the
// admin form, which publishes immediately): a student-submitted review
// needs a human to look at it before it goes live, same reasoning as the
// Next Level Interest queue. Name comes from the authenticated student
// record, not anything the client sends, so a review can't be submitted
// under someone else's name.
function submitStudentReview_(body) {
  var student = findStudent_(body.glabId);
  if (!student) throw new Error('GLAB ID not found');
  if (student.blocked) throw new Error('This account has been restricted. Please contact GLAB.');
  if (!body.text || !String(body.text).trim()) throw new Error('Review text is required.');

  var rating = Number(body.rating);
  if (!rating || rating < 1 || rating > 5) rating = 5;

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REVIEWS_SHEET);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(REVIEWS_SHEET);
    sheet.appendRow(['Name', 'Location', 'Rating', 'Date', 'Course', 'Review Text', 'Outcome', 'Featured', 'Synced']);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var nameCol = col('name'), locCol = col('location'), ratingCol = col('rating'),
      dateCol = col('date'), courseCol = col('course'), textCol = col('review text'), syncedCol = col('synced');
  if (nameCol === -1 || textCol === -1 || syncedCol === -1) {
    throw new Error('Reviews sheet must have "Name", "Review Text", and "Synced" columns');
  }

  var row = new Array(headers.length).fill('');
  row[nameCol] = student.name;
  if (locCol !== -1) row[locCol] = body.location || '';
  if (ratingCol !== -1) row[ratingCol] = rating;
  if (dateCol !== -1) row[dateCol] = normalizeDate_(new Date());
  if (courseCol !== -1) row[courseCol] = body.level || '';
  row[textCol] = String(body.text).trim();
  row[syncedCol] = false;

  sheet.appendRow(row);
  return { success: true };
}

// Looks up a single record by its ID (case-insensitive) from the
// "Certificates" tab. Only the queried record's data is ever returned —
// deliberately server-side so the full roster (every student's name and
// status) is never shipped to the browser, unlike the old static-JSON
// approach this replaced. Expected columns (any order, matched by header
// name): Certificate ID, Student Name, Course, Starting Date,
// Completion Date, Issued Date, Status.
// Status drives what the site shows: "Completed" renders as a full
// Certificate of Completion; "Enrolled"/"Running" render as a verified
// current-student/enrollment record instead.
function verifyCertificate_(certificateId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CERTIFICATES_SHEET);
  if (!sheet) throw new Error('Certificates sheet not found');

  var needle = String(certificateId || '').trim().toLowerCase();
  if (!needle) return { success: true, found: false };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, found: false };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var idCol = col('certificate id');
  if (idCol === -1) throw new Error('Certificates sheet must have a "Certificate ID" column');
  var nameCol = col('student name'), courseCol = col('course'),
      startCol = col('starting date'), completionCol = col('completion date'),
      issuedCol = col('issued date'), statusCol = col('status');

  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (String(row[idCol] || '').trim().toLowerCase() === needle) {
      return {
        success: true,
        found: true,
        certificate: {
          certificateId: row[idCol],
          studentName: nameCol !== -1 ? row[nameCol] : '',
          course: courseCol !== -1 ? row[courseCol] : '',
          startingDate: startCol !== -1 ? normalizeDate_(row[startCol]) : '',
          completionDate: completionCol !== -1 ? normalizeDate_(row[completionCol]) : '',
          issuedDate: issuedCol !== -1 ? normalizeDate_(row[issuedCol]) : '',
          status: statusCol !== -1 ? String(row[statusCol] || '').trim() : ''
        }
      };
    }
  }
  return { success: true, found: false };
}

// Counts a student's attendance for one batch from the shared Attendance
// tab (one tab covers every batch, disambiguated by a Batch ID column).
// Each numbered column (1, 2, 3, ...) is one class session; a checkbox cell
// is a real boolean (TRUE/FALSE) once the teacher has recorded that session
// for that student, and blank ("") if it hasn't been recorded yet — so
// "total" only counts sessions actually marked for this student, not every
// numbered column that exists in the sheet (which may be ahead of this
// particular batch's own pace).
function findAttendance_(glabId, batchId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(ATTENDANCE_SHEET);
  if (!sheet || !glabId || !batchId) return null;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var batchCol = headers.indexOf('batch id');
  if (idCol === -1) return null;

  var classCols = [];
  for (var c = 0; c < headers.length; c++) {
    if (/^\d+$/.test(headers[c])) classCols.push(c);
  }

  var needleId = String(glabId).trim().toLowerCase();
  var needleBatch = String(batchId).trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    var rowBatch = batchCol !== -1 ? String(values[i][batchCol] || '').trim().toLowerCase() : '';
    if (rowId === needleId && rowBatch === needleBatch) {
      var present = 0, total = 0;
      for (var j = 0; j < classCols.length; j++) {
        var cell = values[i][classCols[j]];
        if (typeof cell === 'boolean') {
          total++;
          if (cell) present++;
        }
      }
      return { present: present, missed: total - present, total: total };
    }
  }
  return null;
}

// Reads a free-text note the instructor has left for this student, from the
// Student Feedback tab (one row per GLAB ID, overwritten whenever there's
// something new to say — no history, just the current note).
function findFeedback_(glabId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENT_FEEDBACK_SHEET);
  if (!sheet || !glabId) return null;

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return null;
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var noteCol = headers.indexOf('note');
  if (idCol === -1 || noteCol === -1) return null;

  var needle = String(glabId).trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    if (rowId === needle) {
      var note = String(values[i][noteCol] || '').trim();
      return note || null;
    }
  }
  return null;
}

// Picks which confirmed registration's batch info (links, attendance,
// feedback) a student should see on MyGLAB right now. A student can have
// more than one confirmed registration at a time — e.g. already confirmed
// for B1 while still finishing A2 — and we deliberately keep showing the
// EARLIEST one that hasn't ended yet, so a student keeps seeing their
// current course's Meet link right up through its last day, instead of
// the view jumping to the next course the moment its registration gets
// confirmed. The registration confirmation email is unaffected by this —
// it already includes the new course's own links immediately, which is
// separate and intentional. Once every confirmed registration's batch has
// ended, falls back to the most recently confirmed one (their latest
// completed/ongoing course) — the prior, simpler behavior.
function pickActiveRegistration_(history) {
  if (!history.length) return null;
  var today = new Date();
  today.setHours(0, 0, 0, 0);
  for (var i = 0; i < history.length; i++) {
    var info = findBatchInfo_(history[i].batchId);
    // No end date on file — treat as still active rather than risk
    // skipping a course prematurely just because its dates aren't filled
    // in on the Batch Links sheet yet.
    if (!info.endDate) return history[i];
    var end = new Date(info.endDate);
    if (isNaN(end.getTime()) || end >= today) return history[i];
  }
  return history[history.length - 1];
}

// Assembles the full MyGLAB dashboard for a confirmed student: batch info
// (course, dates, links), attendance, published exam results, and any
// instructor feedback. A student who exists but isn't Confirmed yet still
// gets a response (so the page can say "not confirmed yet" rather than
// "not found") — just without any of the confirmed-only data attached.
function getDashboard_(glabId) {
  var student = findStudent_(glabId);
  if (!student) return { success: true, found: false };
  if (student.blocked) return { success: true, found: true, blocked: true, name: student.name };

  var registration = findLatestRegistration_(student.glabId);
  var confirmed = !!registration && registration.status === CONFIRMED_STATUS;
  var history = findRegistrationHistory_(student.glabId); // Confirmed-only, oldest first.
  // The registration whose batch info a student should currently see —
  // deliberately independent of `registration`/`confirmed` above, which
  // only reflect the single latest row regardless of status. Without this,
  // a student mid-registration for their next level (a newer row still
  // "Submitted", not yet confirmed, or already confirmed but not yet
  // started) would lose all visibility into their current course's
  // attendance/class links. See pickActiveRegistration_ for how it picks
  // between multiple confirmed registrations.
  var confirmedRegistration = pickActiveRegistration_(history);

  var response = {
    success: true,
    found: true,
    name: student.name,
    glabId: student.glabId,
    eligibleCourses: student.eligibleCourses,
    confirmed: confirmed,
    registration: registration,
    confirmedRegistration: confirmedRegistration,
    history: history,
    savedEmail: findLatestInterestEmail_(student.glabId)
  };

  if (confirmedRegistration) {
    var batchInfo = findBatchInfo_(confirmedRegistration.batchId);
    response.batchInfo = batchInfo;
    response.attendance = findAttendance_(student.glabId, confirmedRegistration.batchId);
    response.feedback = findFeedback_(student.glabId);
  }

  return response;
}

// ===== Admin: registration on/off switch =====
// A single global pause switch stored as a Script Property (Project
// Settings > Script Properties > REGISTRATION_OPEN), not a sheet — there's
// only one value, and this way it can be flipped instantly from the admin
// panel with no sheet lookup on every registration attempt. Defaults to
// open (true) if the property has never been set, so a fresh setup doesn't
// accidentally start locked.
function isRegistrationOpen_() {
  var v = PropertiesService.getScriptProperties().getProperty('REGISTRATION_OPEN');
  return v === null || v === 'true';
}

function adminSetRegistrationOpen_(open) {
  PropertiesService.getScriptProperties().setProperty('REGISTRATION_OPEN', open ? 'true' : 'false');
  return { success: true, open: !!open };
}

// ===== Admin: A1 application on/off switch =====
// Separate from REGISTRATION_OPEN above — that one gates course
// registration (A2/B1, and A1's post-selection step), while this one
// gates the A1 application form itself, which has its own independent
// on/off cycle (e.g. opened briefly for one student on request, then
// closed again). Same script-property pattern, own key so the two never
// interact. Defaults to open (true) if never set, matching the same
// "fresh setup isn't accidentally locked" reasoning as REGISTRATION_OPEN.
function isA1ApplicationOpen_() {
  var v = PropertiesService.getScriptProperties().getProperty('A1_APPLICATION_OPEN');
  return v === null || v === 'true';
}

function adminSetA1ApplicationOpen_(open) {
  PropertiesService.getScriptProperties().setProperty('A1_APPLICATION_OPEN', open ? 'true' : 'false');
  return { success: true, open: !!open };
}

// ===== Admin: block/unblock a student =====
// Blocking sets a checkbox on the Students tab; every student-facing entry
// point (lookupStudent_, submitRegistration_, getDashboard_) checks it via
// findStudent_ and refuses access without revealing anything else about
// their record. A blocked student's row and history are never deleted —
// this only gates the site, not their data.
function adminSetStudentBlocked_(glabId, blocked) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENTS_SHEET);
  if (!sheet) throw new Error('Students sheet not found');
  if (!glabId) throw new Error('GLAB ID is required');

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var blockedCol = headers.indexOf('blocked');
  if (idCol === -1) throw new Error('Students sheet must have a "GLAB ID" column');
  if (blockedCol === -1) throw new Error('Students sheet must have a "Blocked" column');

  var needle = String(glabId).trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '').trim().toLowerCase() === needle) {
      sheet.getRange(i + 1, blockedCol + 1).setValue(!!blocked);
      return { success: true, glabId: values[i][idCol], blocked: !!blocked };
    }
  }
  throw new Error('GLAB ID not found');
}

// Admin-only student lookup — unlike lookupStudent_, this always returns
// full info (including current Blocked state and registration) regardless
// of whether the student is blocked, since an admin needs to see that
// state in order to change it.
function adminFindStudent_(glabId) {
  var student = findStudent_(glabId);
  if (!student) return { success: true, found: false };

  var registration = findLatestRegistration_(student.glabId);
  return {
    success: true,
    found: true,
    glabId: student.glabId,
    name: student.name,
    eligibleCourses: student.eligibleCourses,
    blocked: student.blocked,
    registration: registration
  };
}

// ===== Admin: confirm a registration (payment verification queue) =====
// Lists every Registrations row still at the default Submitted status, so
// an admin can review the attached payment proof and confirm from one
// place instead of switching to the Registrations sheet for every student.
function adminListSubmittedRegistrations_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) return { success: true, registrations: [] };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, registrations: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var timestampCol = col('timestamp'), idCol = col('glab id'), nameCol = col('name'),
      courseCol = col('course'), batchIdCol = col('batch id'), methodCol = col('paying from'),
      refCol = col('payment reference'), proofCol = col('proof file link'),
      feedbackCol = col('feedback'), statusCol = col('status');
  if (idCol === -1 || statusCol === -1) return { success: true, registrations: [] };

  var registrations = [];
  for (var i = 1; i < values.length; i++) {
    var status = String(values[i][statusCol] || DEFAULT_STATUS).trim();
    if (status !== DEFAULT_STATUS) continue;
    var ts = timestampCol !== -1 ? values[i][timestampCol] : null;
    registrations.push({
      timestamp: ts instanceof Date ? ts.toISOString() : String(ts || ''),
      glabId: idCol !== -1 ? values[i][idCol] : '',
      name: nameCol !== -1 ? values[i][nameCol] : '',
      course: courseCol !== -1 ? values[i][courseCol] : '',
      batchId: batchIdCol !== -1 ? values[i][batchIdCol] : '',
      paymentMethod: methodCol !== -1 ? values[i][methodCol] : '',
      paymentReference: refCol !== -1 ? values[i][refCol] : '',
      proofFileLink: proofCol !== -1 ? values[i][proofCol] : '',
      feedback: feedbackCol !== -1 ? values[i][feedbackCol] : ''
    });
  }
  return { success: true, registrations: registrations };
}

// Returns every Registrations row regardless of status (unlike
// adminListSubmittedRegistrations_, which only returns the still-pending
// payment-verification queue) — used for the admin panel's per-batch
// registration counts, so admin can see true batch fill (confirmed +
// pending) without opening the sheet.
function adminListAllRegistrations_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) return { success: true, registrations: [] };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, registrations: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var idCol = col('glab id'), nameCol = col('name'), courseCol = col('course'),
      batchIdCol = col('batch id'), statusCol = col('status');
  if (idCol === -1) return { success: true, registrations: [] };

  var registrations = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][idCol]) continue; // skip blank rows
    registrations.push({
      glabId: values[i][idCol],
      name: nameCol !== -1 ? values[i][nameCol] : '',
      course: courseCol !== -1 ? values[i][courseCol] : '',
      batchId: batchIdCol !== -1 ? values[i][batchIdCol] : '',
      status: statusCol !== -1 ? String(values[i][statusCol] || DEFAULT_STATUS).trim() : DEFAULT_STATUS
    });
  }
  return { success: true, registrations: registrations };
}

// Course title → level rank, for comparing "highest level completed" vs.
// "most recent attempt" without hardcoding string comparisons everywhere.
var CRM_LEVEL_RANKS = { 'A1 Intensive': 1, 'A2 Intensive': 2, 'B1 Intensive': 3 };
function crmLevelRank_(course) {
  var text = String(course || '');
  for (var title in CRM_LEVEL_RANKS) {
    if (text.indexOf(title) === 0) return CRM_LEVEL_RANKS[title];
  }
  return 0;
}
function crmLevelLabel_(rank) {
  return rank === 1 ? 'A1' : rank === 2 ? 'A2' : rank === 3 ? 'B1' : '';
}

// One row per real person, joining Students + Registrations (for anyone
// with a GLAB ID) with Applications rows that don't have a GLAB ID yet
// (A1 prospects still mid-pipeline) — the CRM/student-database view. Every
// row gets a computed `segment` answering "where are they, and do they
// need a nudge" — this is what replaces the old Next Level Interest queue:
// instead of waiting for a student to proactively signal interest, this
// surfaces EVERY student who completed a level and never registered for
// the next one, so admin can reach out directly.
function adminListCRM_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var crm = [];

  // ---- Students + their Registrations history ----
  var studentsSheet = ss.getSheetByName(STUDENTS_SHEET);
  var students = [];
  if (studentsSheet) {
    var sValues = studentsSheet.getDataRange().getValues();
    if (sValues.length > 1) {
      var sHeaders = sValues[0].map(function (h) { return String(h).trim().toLowerCase(); });
      var sIdCol = sHeaders.indexOf('glab id'), sNameCol = sHeaders.indexOf('name'), sBlockedCol = sHeaders.indexOf('blocked');
      if (sIdCol !== -1) {
        for (var i = 1; i < sValues.length; i++) {
          var gid = String(sValues[i][sIdCol] || '').trim();
          if (!gid) continue;
          students.push({
            glabId: gid,
            name: sNameCol !== -1 ? sValues[i][sNameCol] : '',
            blocked: sBlockedCol !== -1 && isTruthy_(sValues[i][sBlockedCol])
          });
        }
      }
    }
  }

  var regsByStudent = {}; // lowercased glabId -> [{course, batchId, status, timestamp, email}], oldest first
  var regSheet = ss.getSheetByName(REGISTRATIONS_SHEET);
  if (regSheet) {
    var rValues = regSheet.getDataRange().getValues();
    if (rValues.length > 1) {
      var rHeaders = rValues[0].map(function (h) { return String(h).trim().toLowerCase(); });
      var rIdCol = rHeaders.indexOf('glab id'), rCourseCol = rHeaders.indexOf('course'), rBatchIdCol = rHeaders.indexOf('batch id'),
        rStatusCol = rHeaders.indexOf('status'), rTsCol = rHeaders.indexOf('timestamp'), rEmailCol = rHeaders.indexOf('email');
      if (rIdCol !== -1) {
        for (var j = 1; j < rValues.length; j++) {
          var regGid = String(rValues[j][rIdCol] || '').trim();
          if (!regGid) continue;
          var key = regGid.toLowerCase();
          if (!regsByStudent[key]) regsByStudent[key] = [];
          regsByStudent[key].push({
            course: rCourseCol !== -1 ? rValues[j][rCourseCol] : '',
            batchId: rBatchIdCol !== -1 ? rValues[j][rBatchIdCol] : '',
            status: rStatusCol !== -1 ? String(rValues[j][rStatusCol] || DEFAULT_STATUS).trim() : DEFAULT_STATUS,
            timestamp: rTsCol !== -1 ? rValues[j][rTsCol] : null,
            email: rEmailCol !== -1 ? rValues[j][rEmailCol] : ''
          });
        }
      }
    }
  }

  students.forEach(function (s) {
    var regs = (regsByStudent[s.glabId.toLowerCase()] || []).slice();
    regs.sort(function (a, b) {
      var ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      var tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return ta - tb;
    });
    var confirmedRegs = regs.filter(function (r) { return r.status === CONFIRMED_STATUS; });
    var latestReg = regs.length ? regs[regs.length - 1] : null;
    var highestConfirmedRank = 0;
    confirmedRegs.forEach(function (r) {
      var rank = crmLevelRank_(r.course);
      if (rank > highestConfirmedRank) highestConfirmedRank = rank;
    });
    var latestRank = latestReg ? crmLevelRank_(latestReg.course) : 0;

    var segment;
    if (s.blocked) {
      segment = 'Blocked';
    } else if (latestReg && latestReg.status === DEFAULT_STATUS) {
      segment = 'Payment pending';
    } else if (highestConfirmedRank === 0) {
      segment = 'No confirmed registration';
    } else if (highestConfirmedRank >= 3) {
      segment = 'Completed B1';
    } else if (latestRank <= highestConfirmedRank) {
      segment = 'Completed ' + crmLevelLabel_(highestConfirmedRank) + ' — not registered ' + crmLevelLabel_(highestConfirmedRank + 1);
    } else {
      segment = 'Active / in progress';
    }

    var email = '';
    for (var e = regs.length - 1; e >= 0; e--) {
      if (regs[e].email) { email = regs[e].email; break; }
    }

    crm.push({
      glabId: s.glabId,
      name: s.name,
      email: email,
      phone: '',
      segment: segment,
      highestLevel: crmLevelLabel_(highestConfirmedRank),
      lastCourse: latestReg ? latestReg.course : '',
      lastStatus: latestReg ? latestReg.status : '',
      lastActivity: latestReg && latestReg.timestamp ? new Date(latestReg.timestamp).toISOString() : null
    });
  });

  // ---- A1 applicants who don't have a GLAB ID yet (still prospects) ----
  // Anyone who already has a GLAB ID is represented above via Students —
  // skip them here to avoid listing the same person twice.
  var appsSheet = ss.getSheetByName(APPLICATIONS_SHEET);
  if (appsSheet) {
    var aValues = appsSheet.getDataRange().getValues();
    if (aValues.length > 1) {
      var aHeaders = aValues[0].map(function (h) { return String(h).trim().toLowerCase(); });
      var aNameCol = aHeaders.indexOf('name'), aEmailCol = aHeaders.indexOf('email'), aPhoneCol = aHeaders.indexOf('whatsapp number'),
        aStatusCol = aHeaders.indexOf('selection status'), aGlabIdCol = aHeaders.indexOf('glab id'), aTsCol = aHeaders.indexOf('timestamp');
      for (var m = 1; m < aValues.length; m++) {
        var row = aValues[m];
        var appName = aNameCol !== -1 ? row[aNameCol] : '';
        var appEmail = aEmailCol !== -1 ? String(row[aEmailCol] || '').trim() : '';
        if (!appName && !appEmail) continue; // skip blank/corrupt rows
        var appGlabId = aGlabIdCol !== -1 ? String(row[aGlabIdCol] || '').trim() : '';
        if (appGlabId) continue; // already represented via Students above

        var rawStatus = aStatusCol !== -1 ? String(row[aStatusCol] || '').trim().toLowerCase() : '';
        var appSegment = rawStatus === 'selected' ? 'A1 selected — not yet registered'
          : rawStatus === 'not selected' ? 'A1 not selected'
          : 'A1 application pending';

        crm.push({
          glabId: '',
          name: appName,
          email: appEmail,
          phone: aPhoneCol !== -1 ? row[aPhoneCol] : '',
          segment: appSegment,
          highestLevel: '',
          lastCourse: '',
          lastStatus: '',
          lastActivity: aTsCol !== -1 && row[aTsCol] ? new Date(row[aTsCol]).toISOString() : null
        });
      }
    }
  }

  return { success: true, students: crm };
}

// Sends a bulk email to an explicit recipient list — the CRM panel passes
// exactly the (name, email) pairs currently shown after its segment/search
// filters, so what admin sees is exactly who gets emailed; nothing is
// re-derived server-side. `{{name}}` in the body is replaced per-recipient
// (falling back to "there"). Capped at 450 recipients per call — comfortably
// within Gmail's daily sending quota alongside the confirmation/selection
// emails already going out that day, and well within Apps Script's
// execution time limit.
function adminSendOutreach_(recipients, subject, body) {
  if (!recipients || !recipients.length) throw new Error('No recipients provided.');
  if (!subject) throw new Error('Subject is required.');
  if (!body) throw new Error('Message body is required.');
  if (recipients.length > 450) throw new Error('Too many recipients in one send (max 450) — narrow the list first.');

  var sent = 0, failed = 0;
  var errors = [];
  recipients.forEach(function (r) {
    var email = String((r && r.email) || '').trim();
    if (!email) { failed++; errors.push('(blank email)'); return; }
    var name = String((r && r.name) || '').trim();
    var personalized = String(body).replace(/\{\{\s*name\s*\}\}/gi, name || 'there');
    try {
      GmailApp.sendEmail(email, subject, personalized, {
        name: 'GLAB - German Language Academy of Bangladesh',
        from: 'info@glabeducation.com'
      });
      sent++;
    } catch (err) {
      failed++;
      errors.push(email + ': ' + err.message);
    }
  });

  PropertiesService.getScriptProperties().setProperty(
    'LAST_OUTREACH_SENT',
    new Date().toISOString() + ' — sent ' + sent + ', failed ' + failed + ', subject "' + subject + '"'
  );
  if (errors.length) {
    PropertiesService.getScriptProperties().setProperty('LAST_OUTREACH_ERROR', errors.join(' | '));
  }
  return { success: true, sent: sent, failed: failed, errors: errors };
}

// Confirms one specific Registrations row, identified by GLAB ID + its
// exact Timestamp (compared by millisecond value, not string, since a
// sheet cell round-trips as a Date object while the client only ever saw
// the ISO string from adminListSubmittedRegistrations_) — a GLAB ID alone
// isn't unique enough if a student has more than one row over time.
function adminConfirmRegistration_(glabId, timestamp) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) throw new Error('Registrations sheet not found');
  if (!glabId || !timestamp) throw new Error('GLAB ID and timestamp are required');

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var timestampCol = headers.indexOf('timestamp');
  var statusCol = headers.indexOf('status');
  var nameCol = headers.indexOf('name');
  var courseCol = headers.indexOf('course');
  var batchIdCol = headers.indexOf('batch id');
  var emailCol = headers.indexOf('email');
  var payingFromCol = headers.indexOf('paying from');
  var paymentRefCol = headers.indexOf('payment reference');
  if (idCol === -1 || timestampCol === -1 || statusCol === -1) {
    throw new Error('Registrations sheet must have "GLAB ID", "Timestamp", and "Status" columns');
  }

  var needleId = String(glabId).trim().toLowerCase();
  var needleTime = new Date(timestamp).getTime();
  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    var rowTime = new Date(values[i][timestampCol]).getTime();
    if (rowId === needleId && rowTime === needleTime) {
      sheet.getRange(i + 1, statusCol + 1).setValue(CONFIRMED_STATUS);
      sendConfirmationEmail_(
        emailCol !== -1 ? values[i][emailCol] : '',
        nameCol !== -1 ? values[i][nameCol] : '',
        courseCol !== -1 ? values[i][courseCol] : '',
        batchIdCol !== -1 ? values[i][batchIdCol] : '',
        values[i][idCol]
      );
      createFinanceEntryFromRegistration_({
        date: values[i][timestampCol],
        glabId: values[i][idCol],
        name: nameCol !== -1 ? values[i][nameCol] : '',
        course: courseCol !== -1 ? values[i][courseCol] : '',
        payingFrom: payingFromCol !== -1 ? values[i][payingFromCol] : '',
        paymentReference: paymentRefCol !== -1 ? values[i][paymentRefCol] : ''
      });
      return { success: true };
    }
  }
  throw new Error('Matching registration not found');
}

// ===== Finance =====
// Auto-populates the Finance sheet the moment a registration is
// confirmed — GLAB ID, Name, Course, Date, Session, Location, and Payment
// Reference all come from data the site already has, so admin never
// retypes them from a bKash notification. Course Fee, Amount Paid,
// Discount, and the specific Payment Account (which bKash number/bank)
// genuinely can't be known automatically — the registration form only
// captures a broad "Paying From" category, not which account a payment
// landed in — so those stay blank for admin to fill in when reconciling.
function createFinanceEntryFromRegistration_(info) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SHEET);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(FINANCE_SHEET);
    sheet.appendRow(FINANCE_HEADERS);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var row = new Array(headers.length).fill('');
  var set = function (name, value) { var c = headers.indexOf(name); if (c !== -1) row[c] = value; };

  var payingFrom = String(info.payingFrom || '').trim().toLowerCase();
  var location = payingFrom.indexOf('germany') !== -1 || payingFrom.indexOf('eu') !== -1 ? 'DE' : 'BD';

  set('date', info.date);
  set('glab id', info.glabId);
  set('name', info.name);
  set('course', info.course);
  set('session', findSessionForDate_(info.date));
  set('location', location);
  set('payment reference', info.paymentReference);
  sheet.appendRow(row);
}

// Matches a date against admin-defined session date ranges (the Finance
// Sessions sheet) — e.g. "26H" = Jul 1-Oct 31 2026. Returns '' if no
// range covers it yet, rather than guessing; admin can always fill the
// Session cell in by hand for a row that predates its range being set up.
function findSessionForDate_(date) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SESSIONS_SHEET);
  if (!sheet || !date) return '';
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return '';
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var codeCol = headers.indexOf('session code'), startCol = headers.indexOf('start date'), endCol = headers.indexOf('end date');
  if (codeCol === -1 || startCol === -1 || endCol === -1) return '';

  var d = new Date(date).getTime();
  for (var i = 1; i < values.length; i++) {
    var start = new Date(values[i][startCol]).getTime();
    var end = new Date(values[i][endCol]).getTime();
    if (!isNaN(start) && !isNaN(end) && d >= start && d <= end) {
      return String(values[i][codeCol] || '').trim();
    }
  }
  return '';
}

// Lists every Finance row for the admin panel, newest first. Due is
// computed here rather than stored, so editing Course Fee/Discount/Amount
// Paid later never leaves a stale Due behind.
function adminListFinance_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SHEET);
  if (!sheet) return { success: true, entries: [] };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, entries: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var dateCol = col('date'), idCol = col('glab id'), nameCol = col('name'), courseCol = col('course'),
      sessionCol = col('session'), feeCol = col('course fee'), paidCol = col('amount paid'),
      discountCol = col('discount'), locCol = col('location'), acctCol = col('payment account'),
      refCol = col('payment reference'), notesCol = col('notes');

  var entries = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][idCol]) continue;
    var fee = Number(feeCol !== -1 ? values[i][feeCol] : 0) || 0;
    var paid = Number(paidCol !== -1 ? values[i][paidCol] : 0) || 0;
    var discount = Number(discountCol !== -1 ? values[i][discountCol] : 0) || 0;
    entries.push({
      row: i + 1,
      date: dateCol !== -1 ? normalizeDate_(values[i][dateCol]) : '',
      glabId: values[i][idCol],
      name: nameCol !== -1 ? values[i][nameCol] : '',
      course: courseCol !== -1 ? values[i][courseCol] : '',
      session: sessionCol !== -1 ? values[i][sessionCol] : '',
      courseFee: fee,
      amountPaid: paid,
      discount: discount,
      due: Math.max(0, fee - discount - paid),
      location: locCol !== -1 ? values[i][locCol] : '',
      paymentAccount: acctCol !== -1 ? values[i][acctCol] : '',
      paymentReference: refCol !== -1 ? values[i][refCol] : '',
      notes: notesCol !== -1 ? values[i][notesCol] : ''
    });
  }
  entries.reverse();
  return { success: true, entries: entries };
}

// Updates the manually-reconciled fields on one Finance row (identified
// by the row number adminListFinance_ returned). Date/GLAB ID/Name/
// Course/Session came from the registration automatically and are never
// touched here.
function adminUpdateFinanceEntry_(body) {
  var row = Number(body.row);
  if (!row || row < 2) throw new Error('Invalid row.');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SHEET);
  if (!sheet) throw new Error('Finance sheet not found.');
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var setCell = function (name, value) {
    var c = headers.indexOf(name);
    if (c !== -1) sheet.getRange(row, c + 1).setValue(value);
  };
  setCell('course fee', Number(body.courseFee) || 0);
  setCell('amount paid', Number(body.amountPaid) || 0);
  setCell('discount', Number(body.discount) || 0);
  setCell('location', body.location || '');
  setCell('payment account', body.paymentAccount || '');
  setCell('payment reference', body.paymentReference || '');
  setCell('notes', body.notes || '');
  return { success: true };
}

function adminAddFinanceExpense_(body) {
  var amount = Number(body.amount);
  if (!body.description) throw new Error('Description is required.');
  if (!amount) throw new Error('Amount is required.');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_EXPENSES_SHEET);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(FINANCE_EXPENSES_SHEET);
    sheet.appendRow(FINANCE_EXPENSES_HEADERS);
  }
  var date = body.date ? new Date(body.date) : new Date();
  sheet.appendRow([date, body.description, amount, body.location || '', body.paidFrom || '', findSessionForDate_(date)]);
  return { success: true };
}

function adminListFinanceExpenses_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_EXPENSES_SHEET);
  if (!sheet) return { success: true, expenses: [] };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, expenses: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var dateCol = col('date'), descCol = col('description'), amountCol = col('amount'),
      locCol = col('location'), paidFromCol = col('paid from'), sessionCol = col('session');

  var expenses = [];
  for (var i = 1; i < values.length; i++) {
    if (!values[i][descCol]) continue;
    expenses.push({
      row: i + 1,
      date: dateCol !== -1 ? normalizeDate_(values[i][dateCol]) : '',
      description: values[i][descCol],
      amount: Number(amountCol !== -1 ? values[i][amountCol] : 0) || 0,
      location: locCol !== -1 ? values[i][locCol] : '',
      paidFrom: paidFromCol !== -1 ? values[i][paidFromCol] : '',
      session: sessionCol !== -1 ? values[i][sessionCol] : ''
    });
  }
  expenses.reverse();
  return { success: true, expenses: expenses };
}

function adminDeleteFinanceExpense_(row) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_EXPENSES_SHEET);
  if (!sheet) throw new Error('Finance Expenses sheet not found.');
  row = Number(row);
  if (!row || row < 2) throw new Error('Invalid row.');
  sheet.deleteRow(row);
  return { success: true };
}

function adminDeleteFinanceEntry_(row) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SHEET);
  if (!sheet) throw new Error('Finance sheet not found.');
  row = Number(row);
  if (!row || row < 2) throw new Error('Invalid row.');
  sheet.deleteRow(row);
  return { success: true };
}

// ===== Finance: sessions =====
// Admin-defined date ranges (e.g. "26H" = Jul 1-Oct 31 2026), used to
// auto-tag every Finance/Expense row by the date it actually happened —
// deliberately NOT derived from a GLAB ID's own embedded session code,
// since a student's GLAB ID reflects when they first registered (usually
// A1), not when a later A2/B1 payment in a different session occurred.
function adminListFinanceSessions_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SESSIONS_SHEET);
  if (!sheet) return { success: true, sessions: [] };
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, sessions: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var codeCol = headers.indexOf('session code'), startCol = headers.indexOf('start date'), endCol = headers.indexOf('end date');
  if (codeCol === -1) return { success: true, sessions: [] };

  var sessions = [];
  for (var i = 1; i < values.length; i++) {
    var code = String(values[i][codeCol] || '').trim();
    if (!code) continue;
    sessions.push({
      sessionCode: code,
      startDate: startCol !== -1 ? (normalizeDate_(values[i][startCol]) || '') : '',
      endDate: endCol !== -1 ? (normalizeDate_(values[i][endCol]) || '') : ''
    });
  }
  return { success: true, sessions: sessions };
}

function adminCreateFinanceSession_(body) {
  var code = String(body.sessionCode || '').trim();
  if (!code) throw new Error('Session code is required.');
  if (!body.startDate || !body.endDate) throw new Error('Start date and end date are required.');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SESSIONS_SHEET);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(FINANCE_SESSIONS_SHEET);
    sheet.appendRow(FINANCE_SESSIONS_HEADERS);
  }
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var codeCol = headers.indexOf('session code');
  var needle = code.toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][codeCol] || '').trim().toLowerCase() === needle) {
      throw new Error('A session with this code already exists — edit that one instead.');
    }
  }
  sheet.appendRow([code, new Date(body.startDate), new Date(body.endDate)]);
  return { success: true };
}

function adminUpdateFinanceSession_(body) {
  var code = String(body.sessionCode || '').trim();
  if (!code) throw new Error('Session code is required.');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SESSIONS_SHEET);
  if (!sheet) throw new Error('Finance Sessions sheet not found.');
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var codeCol = headers.indexOf('session code'), startCol = headers.indexOf('start date'), endCol = headers.indexOf('end date');
  var needle = code.toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][codeCol] || '').trim().toLowerCase() === needle) {
      if (startCol !== -1) sheet.getRange(i + 1, startCol + 1).setValue(new Date(body.startDate));
      if (endCol !== -1) sheet.getRange(i + 1, endCol + 1).setValue(new Date(body.endDate));
      return { success: true };
    }
  }
  throw new Error('Session not found.');
}

function adminDeleteFinanceSession_(sessionCode) {
  var code = String(sessionCode || '').trim();
  if (!code) throw new Error('Session code is required.');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FINANCE_SESSIONS_SHEET);
  if (!sheet) throw new Error('Finance Sessions sheet not found.');
  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var codeCol = headers.indexOf('session code');
  var needle = code.toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][codeCol] || '').trim().toLowerCase() === needle) {
      sheet.deleteRow(i + 1);
      return { success: true };
    }
  }
  throw new Error('Session not found.');
}

// ===== Finance: opening balance =====
// A single one-time starting figure (BD and DE, in local currency each)
// representing real total revenue up to the day this system went live —
// added once, by hand, since it predates this ledger entirely. Every
// Finance row recorded from that point on is added on top of it, so
// "All-Time Revenue" never needs a per-session manual carry-forward.
function adminGetFinanceOpeningBalance_() {
  var props = PropertiesService.getScriptProperties();
  return {
    success: true,
    openingBD: Number(props.getProperty('FINANCE_OPENING_BD')) || 0,
    openingDE: Number(props.getProperty('FINANCE_OPENING_DE')) || 0
  };
}

function adminSetFinanceOpeningBalance_(bd, de) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('FINANCE_OPENING_BD', String(Number(bd) || 0));
  props.setProperty('FINANCE_OPENING_DE', String(Number(de) || 0));
  return { success: true };
}

// Emails a student the moment their registration is confirmed — this is
// what replaced silence as the only signal a student got. Students kept
// assuming a confirmation email would arrive and missed the first class or
// two waiting for one that was never going to come; this closes that gap.
// The email address comes straight off the Registrations row being
// confirmed (an "Email" field on the /portal and /results registration
// forms, required going forward) — not a separate lookup anywhere, so
// there's nothing to keep in sync. Registrations submitted before that
// field existed simply won't have one on file yet; this just skips the
// email for those, same as any other missing-email case. Never blocks the
// confirmation itself: the payment being marked Confirmed is what matters,
// the email is a courtesy on top of it.
function sendConfirmationEmail_(email, name, course, batchId, glabId) {
  email = String(email || '').trim();
  // Unconditional trace, written before anything else can go wrong or bail
  // out early — so it's possible to tell "this never even ran" apart from
  // "it ran but the row had no email" apart from "it ran, had an email, and
  // MailApp itself threw." Safe to remove once email delivery is confirmed
  // working; doesn't affect behavior, only Script Properties.
  PropertiesService.getScriptProperties().setProperty(
    'LAST_CONFIRM_ATTEMPT',
    new Date().toISOString() + ' — glabId=' + glabId + ' email="' + email + '" course=' + course + ' batchId=' + batchId
  );
  try {
    if (!email) return;

    var links = findBatchInfo_(batchId);
    var lines = [
      'Hi ' + (name || 'there') + ',',
      '',
      'Your registration for ' + course + ' has been confirmed. Welcome aboard!',
      ''
    ];
    if (links.startDate) lines.push('Batch starts: ' + links.startDate);
    if (links.whatsappLink) lines.push('WhatsApp group: ' + links.whatsappLink);
    if (links.classroomLink) lines.push('Google Classroom: ' + links.classroomLink);
    if (links.meetLink) lines.push('Google Meet: ' + links.meetLink);
    if (!links.whatsappLink && !links.classroomLink) {
      lines.push('Your class links will be posted here and on MyGLAB (glabeducation.com/myglab) closer to the start date.');
    }
    lines.push('');
    lines.push('You can check your batch, class links, and attendance anytime at glabeducation.com/myglab with your GLAB ID: ' + glabId);
    lines.push('');
    lines.push('— GLAB Team');

    GmailApp.sendEmail(email, 'GLAB Registration Confirmed — ' + course, lines.join('\n'), {
      name: 'GLAB - German Language Academy of Bangladesh',
      from: 'info@glabeducation.com'
    });
    PropertiesService.getScriptProperties().setProperty(
      'LAST_EMAIL_SENT',
      new Date().toISOString() + ' — sent to ' + email + ' from info@glabeducation.com'
    );
  } catch (err) {
    // A failed email should never fail the confirmation itself — but record
    // it somewhere reachable without digging through the Executions log:
    // Project Settings (gear icon) > Script Properties, key
    // LAST_EMAIL_ERROR. Gets overwritten by the next failure, so it's only
    // ever the most recent one.
    PropertiesService.getScriptProperties().setProperty(
      'LAST_EMAIL_ERROR',
      new Date().toISOString() + ' — ' + err.message
    );
  }
}

// ===== GLAB ID recovery (MyGLAB "Forgot your GLAB ID?" link) =====
// Looks up every GLAB ID on file for a given email by scanning
// Registrations (the same "Email" column used for confirmation emails —
// no separate lookup to keep in sync) and emails the match(es) rather than
// returning them in the response, so the endpoint can't be used to check
// whether an arbitrary email is a GLAB student. Always returns a generic
// success regardless of whether anything matched, for the same reason.
function recoverGlabId_(email) {
  email = String(email || '').trim();
  if (!email) throw new Error('Email is required.');

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(REGISTRATIONS_SHEET);
  var matches = [];
  if (sheet) {
    var values = sheet.getDataRange().getValues();
    if (values.length > 1) {
      var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
      var idCol = headers.indexOf('glab id');
      var nameCol = headers.indexOf('name');
      var emailCol = headers.indexOf('email');
      if (idCol !== -1 && emailCol !== -1) {
        var needle = email.toLowerCase();
        var seen = {};
        for (var i = 1; i < values.length; i++) {
          var rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
          if (rowEmail !== needle) continue;
          var glabId = String(values[i][idCol] || '').trim();
          if (!glabId || seen[glabId.toLowerCase()]) continue;
          seen[glabId.toLowerCase()] = true;
          matches.push({ glabId: glabId, name: nameCol !== -1 ? values[i][nameCol] : '' });
        }
      }
    }
  }

  if (matches.length > 0) sendGlabIdRecoveryEmail_(email, matches);
  return { success: true };
}

function sendGlabIdRecoveryEmail_(email, matches) {
  try {
    var lines = [
      'Hi,', '',
      (matches.length > 1 ? 'Here are the GLAB IDs' : 'Here is the GLAB ID') + ' on file for this email address:', ''
    ];
    matches.forEach(function (m) {
      lines.push('- ' + m.glabId + (m.name ? ' (' + m.name + ')' : ''));
    });
    lines.push('');
    lines.push('You can log in anytime at glabeducation.com/myglab with your GLAB ID.');
    lines.push('');
    lines.push("If you didn't request this, you can safely ignore this email.");
    lines.push('');
    lines.push('— GLAB Team');
    GmailApp.sendEmail(email, 'Your GLAB ID', lines.join('\n'), {
      name: 'GLAB - German Language Academy of Bangladesh',
      from: 'info@glabeducation.com'
    });
    PropertiesService.getScriptProperties().setProperty(
      'LAST_ID_RECOVERY_SENT',
      new Date().toISOString() + ' — sent to ' + email + ' (' + matches.length + ' match' + (matches.length === 1 ? '' : 'es') + ')'
    );
  } catch (err) {
    PropertiesService.getScriptProperties().setProperty(
      'LAST_ID_RECOVERY_ERROR',
      new Date().toISOString() + ' — ' + err.message
    );
  }
}

// ===== Next-level interest (MyGLAB "I'm interested" button) =====
// Sets the Eligible {level} column (e.g. "Eligible A2") on the Students
// tab for one GLAB ID — used by onEdit below (checking "Processed" by hand
// on the retired Next Level Interest tab) and by the A1 selection flow
// (adminSelectApplicant_/submitA1Registration_), and available for any
// future admin action that needs to grant eligibility the same way.
function adminSetStudentEligible_(glabId, level, value) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(STUDENTS_SHEET);
  if (!sheet) throw new Error('Students sheet not found');

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var eligibleCol = headers.indexOf('eligible ' + String(level).toLowerCase());
  if (idCol === -1 || eligibleCol === -1) {
    throw new Error('Students sheet must have "GLAB ID" and "Eligible ' + level + '" columns');
  }

  var needle = String(glabId).trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '').trim().toLowerCase() === needle) {
      sheet.getRange(i + 1, eligibleCol + 1).setValue(value);
      return;
    }
  }
  throw new Error('Student not found');
}

// A "simple trigger" — Apps Script runs any function literally named
// onEdit automatically on every manual edit to this spreadsheet, with zero
// setup (unlike refreshRegistrationPending's trigger, nothing to install
// under Triggers). The Next Level Interest feature itself was retired
// (superseded by the CRM segment view — see the CRM build), but this is
// kept as a manual fallback for any rows still sitting unprocessed on that
// tab from before the retirement: checking "Processed" by hand flips the
// matching Eligible column on Students, same as the old admin Approve
// button used to.
//
// Only reacts to a single checkbox flipping to checked (not unchecked, and
// not a multi-cell paste/fill, which onEdit reports as one event covering
// the whole range — deliberately skipped rather than guessed at, so a bulk
// paste doesn't silently grant eligibility for rows nobody meant to
// approve; tick this box one row at a time by hand instead).
function onEdit(e) {
  var props = PropertiesService.getScriptProperties();
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== INTEREST_SHEET) return;
    if (e.range.getNumRows() !== 1 || e.range.getNumColumns() !== 1) return;

    var row = e.range.getRow();
    if (row === 1) return;

    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
      .map(function (h) { return String(h).trim().toLowerCase(); });
    var processedCol = headers.indexOf('processed') + 1;
    var idCol = headers.indexOf('glab id') + 1;
    var levelCol = headers.indexOf('level') + 1;
    if (processedCol === 0 || idCol === 0 || levelCol === 0) return;
    if (e.range.getColumn() !== processedCol) return;

    // e.value is usually the checkbox's new value as a string ("TRUE"), but
    // some checkbox edits don't populate it — read the cell directly as a
    // fallback rather than silently doing nothing in that case.
    var rawValue = e.value !== undefined ? e.value : e.range.getValue();
    if (!isTruthy_(rawValue)) return; // only act on check, not uncheck

    var glabId = sheet.getRange(row, idCol).getValue();
    var level = String(sheet.getRange(row, levelCol).getValue() || '').trim().toUpperCase();

    props.setProperty('LAST_ONEDIT_ATTEMPT',
      new Date().toISOString() + ' — row=' + row + ' glabId="' + glabId + '" level="' + level + '" rawValue="' + rawValue + '"');

    if (!glabId || (level !== 'A1' && level !== 'A2' && level !== 'B1')) {
      props.setProperty('LAST_ONEDIT_ERROR',
        new Date().toISOString() + ' — skipped: missing GLAB ID or invalid level ("' + level + '") on row ' + row);
      return;
    }

    adminSetStudentEligible_(glabId, level, true);
    props.setProperty('LAST_ONEDIT_SUCCESS',
      new Date().toISOString() + ' — set Eligible ' + level + ' for ' + glabId);
  } catch (err) {
    // A trigger failure should never block the user's own edit from saving
    // — but record it so a silent failure is still diagnosable. Project
    // Settings (gear icon) > Script Properties, keys LAST_ONEDIT_ATTEMPT /
    // LAST_ONEDIT_SUCCESS / LAST_ONEDIT_ERROR.
    props.setProperty('LAST_ONEDIT_ERROR', new Date().toISOString() + ' — ' + err.message);
  }
}
