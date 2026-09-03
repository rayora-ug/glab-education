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
var INTEREST_SHEET = 'Next Level Interest';
var INTEREST_HEADERS = ['Timestamp', 'GLAB ID', 'Name', 'Level', 'Requested Batch', 'Current Batch', 'Email', 'Processed'];
var REGISTRATIONS_HEADERS = [
  'Timestamp', 'GLAB ID', 'Name', 'Course', 'Batch ID', 'Email',
  'Payment Method', 'Payment Reference', 'Proof File Link', 'Feedback', 'Status'
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
    } else if (body.action === 'checkApplication') {
      response = checkApplication_(body.email, body.phone);
    } else if (body.action === 'submitA1Application') {
      response = submitA1Application_(body);
    } else if (body.action === 'adminListApplications') {
      response = adminListApplications_();
    } else if (body.action === 'adminSelectApplicant') {
      response = adminSelectApplicant_(body.email, body.phone, body.batchLabel, body.batchId);
    } else if (body.action === 'adminRejectApplicant') {
      response = adminRejectApplicant_(body.email, body.phone);
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
    } else if (body.action === 'adminSetStudentBlocked') {
      response = adminSetStudentBlocked_(body.glabId, body.blocked);
    } else if (body.action === 'adminFindStudent') {
      response = adminFindStudent_(body.glabId);
    } else if (body.action === 'adminListSubmittedRegistrations') {
      response = adminListSubmittedRegistrations_();
    } else if (body.action === 'adminConfirmRegistration') {
      response = adminConfirmRegistration_(body.glabId, body.timestamp);
    } else if (body.action === 'submitInterest') {
      response = submitInterest_(body);
    } else if (body.action === 'adminListInterest') {
      response = adminListInterest_();
    } else if (body.action === 'adminApproveInterest') {
      response = adminApproveInterest_(body.glabId, body.timestamp, body.level);
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

  // Idempotency: a resubmit (double-click, retry after a flaky network
  // response) shouldn't create a second row for the same applicant.
  var needleEmail = email.toLowerCase();
  var needlePhone = normalizePhone_(whatsappNumber);
  for (var i = 1; i < values.length; i++) {
    var rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
    var rowPhone = normalizePhone_(values[i][phoneCol]);
    if (rowEmail === needleEmail && rowPhone === needlePhone) {
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

// Marks one applicant Selected: assigns the next GLAB ID, adds them to
// Students (so submitRegistration_'s findStudent_/eligibility check works
// immediately — the same manual row an admin used to add by hand), updates
// the Applications row, and emails the applicant their GLAB ID and a
// registration link. Idempotent — re-clicking Select on an already-selected
// applicant just returns their existing GLAB ID instead of double-processing.
function adminSelectApplicant_(email, phone, batchLabel, batchId) {
  var found = findApplicationRow_(email, phone);
  var existingStatus = String(found.values[found.rowIndex][found.statusCol] || '').trim().toLowerCase();
  if (existingStatus === 'selected') {
    return { success: true, alreadySelected: true, glabId: found.glabIdCol !== -1 ? found.values[found.rowIndex][found.glabIdCol] : null };
  }

  var applicantName = found.nameCol !== -1 ? found.values[found.rowIndex][found.nameCol] : '';
  var glabId = generateNextA1GlabId_();

  appendStudentRow_(glabId, applicantName);
  adminSetStudentEligible_(glabId, 'A1', true);

  var sheetRow = found.rowIndex + 1;
  found.sheet.getRange(sheetRow, found.statusCol + 1).setValue('Selected');
  if (found.glabIdCol !== -1) found.sheet.getRange(sheetRow, found.glabIdCol + 1).setValue(glabId);
  if (found.batchCol !== -1) found.sheet.getRange(sheetRow, found.batchCol + 1).setValue(batchLabel || '');
  if (found.batchIdCol !== -1) found.sheet.getRange(sheetRow, found.batchIdCol + 1).setValue(batchId || '');

  sendA1SelectionEmail_(String(found.values[found.rowIndex][found.emailCol] || '').trim(), applicantName, glabId);
  return { success: true, glabId: glabId };
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

// Adds a bare row to Students with just GLAB ID + Name — the same minimal
// row an admin used to type in by hand when manually selecting an A1
// applicant. Eligibility is granted separately via adminSetStudentEligible_.
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

function sendA1SelectionEmail_(email, name, glabId) {
  if (!email) return;
  try {
    var lines = [
      'Hi ' + (name || 'there') + ',', '',
      "Congratulations — you've been selected for GLAB's A1 Intensive course!",
      '',
      'Your GLAB ID: ' + glabId,
      '',
      'Complete your registration here: glabeducation.com/results',
      '(log in with the same email and date of birth you used to apply)',
      '',
      'Seats are limited, so please register as soon as you can to secure your spot.',
      '',
      '— GLAB Team'
    ];
    GmailApp.sendEmail(email, "You've been selected for GLAB A1 Intensive!", lines.join('\n'), {
      name: 'GLAB Team',
      from: 'mrayhanur@gmail.com'
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
      name: 'GLAB Team',
      from: 'mrayhanur@gmail.com'
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
    'Payment Method': body.paymentMethod,
    'Payment Reference': body.paymentReference || '',
    'Proof File Link': fileUrl,
    'Feedback': body.feedback || '',
    'Status': DEFAULT_STATUS
  });
  return { success: true };
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

  var response = {
    success: true,
    found: true,
    name: student.name,
    glabId: student.glabId,
    eligibleCourses: student.eligibleCourses,
    confirmed: confirmed,
    registration: registration,
    history: findRegistrationHistory_(student.glabId),
    pendingInterestLevels: findPendingInterestLevels_(student.glabId)
  };

  if (confirmed) {
    var batchInfo = findBatchInfo_(registration.batchId);
    response.batchInfo = batchInfo;
    response.attendance = findAttendance_(student.glabId, registration.batchId);
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
      courseCol = col('course'), batchIdCol = col('batch id'), methodCol = col('payment method'),
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
      return { success: true };
    }
  }
  throw new Error('Matching registration not found');
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

    // Sends from the script owner's own Gmail (mrayhanur@gmail.com) — an
    // info@glabeducation.com "Send mail as" alias was tried here but never
    // got verified on the account this script runs under, so GmailApp
    // silently failed to send (caught below, logged to LAST_EMAIL_ERROR).
    // The account's own address always works with no alias setup needed.
    GmailApp.sendEmail(email, 'GLAB Registration Confirmed — ' + course, lines.join('\n'), {
      name: 'GLAB Team',
      from: 'mrayhanur@gmail.com'
    });
    PropertiesService.getScriptProperties().setProperty(
      'LAST_EMAIL_SENT',
      new Date().toISOString() + ' — sent to ' + email + ' from mrayhanur@gmail.com'
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
      name: 'GLAB Team',
      from: 'mrayhanur@gmail.com'
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
// A student who's confirmed for one level but not yet marked Eligible for
// the next one has no way to signal "I want in" — admin previously had no
// visibility into who actually wants to move up, only who's already been
// marked eligible. This is a lightweight request queue: student taps
// "I'm Interested" on MyGLAB, it lands here, and an admin reviewing it in
// /admin can approve with one click, which flips the matching Eligible
// column on Students so the student can then self-serve register via
// /portal exactly like any other eligible student — nothing here grants
// eligibility on its own, it's just a signal for a human to act on.
function submitInterest_(body) {
  var student = findStudent_(body.glabId);
  if (!student) throw new Error('GLAB ID not found');
  if (student.blocked) throw new Error('This account has been restricted. Please contact GLAB.');

  var level = String(body.level || '').trim().toUpperCase();
  if (level !== 'A2' && level !== 'B1') throw new Error('Level must be A2 or B1');
  var requestedBatch = String(body.batch || '').trim();
  var email = String(body.email || '').trim();
  if (!email) throw new Error('Email is required.');

  // The student's current batch, snapshotted at the moment they express
  // interest — not looked up fresh later — so admin has that context (e.g.
  // "she's in the Evening batch now, wants Evening again") when deciding.
  var currentRegistration = findLatestRegistration_(student.glabId);
  var currentBatch = currentRegistration ? currentRegistration.course : '';

  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INTEREST_SHEET);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(INTEREST_SHEET);
    sheet.appendRow(INTEREST_HEADERS);
  }
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0]
    .map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var idCol = col('glab id'), levelCol = col('level'), processedCol = col('processed');

  // Idempotency guard: don't add a second row if this student already has
  // an unprocessed request for the same level on file.
  if (idCol !== -1 && levelCol !== -1) {
    var values = sheet.getDataRange().getValues();
    var needleId = student.glabId.trim().toLowerCase();
    for (var i = 1; i < values.length; i++) {
      var rowId = String(values[i][idCol] || '').trim().toLowerCase();
      var rowLevel = String(values[i][levelCol] || '').trim().toUpperCase();
      var rowProcessed = processedCol !== -1 && isTruthy_(values[i][processedCol]);
      if (rowId === needleId && rowLevel === level && !rowProcessed) {
        return { success: true, alreadySubmitted: true };
      }
    }
  }

  var row = new Array(headers.length).fill('');
  if (col('timestamp') !== -1) row[col('timestamp')] = new Date();
  if (idCol !== -1) row[idCol] = student.glabId;
  if (col('name') !== -1) row[col('name')] = student.name;
  if (levelCol !== -1) row[levelCol] = level;
  if (col('requested batch') !== -1) row[col('requested batch')] = requestedBatch;
  if (col('current batch') !== -1) row[col('current batch')] = currentBatch;
  if (col('email') !== -1) row[col('email')] = email;
  sheet.appendRow(row);
  return { success: true };
}

// Returns every level a student currently has an unprocessed (not yet
// approved) interest request for — so MyGLAB can hide the "I'm Interested"
// form for a level they've already asked about, on every future login, not
// just within the same browser session as the submission.
function findPendingInterestLevels_(glabId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INTEREST_SHEET);
  if (!sheet || !glabId) return [];

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var levelCol = headers.indexOf('level');
  var processedCol = headers.indexOf('processed');
  if (idCol === -1 || levelCol === -1) return [];

  var needle = String(glabId).trim().toLowerCase();
  var levels = [];
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idCol] || '').trim().toLowerCase() !== needle) continue;
    if (processedCol !== -1 && isTruthy_(values[i][processedCol])) continue;
    var level = String(values[i][levelCol] || '').trim().toUpperCase();
    if (level) levels.push(level);
  }
  return levels;
}

// Lists every unprocessed interest request, for the /admin panel.
function adminListInterest_() {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INTEREST_SHEET);
  if (!sheet) return { success: true, requests: [] };

  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return { success: true, requests: [] };
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var col = function (name) { return headers.indexOf(name); };
  var tsCol = col('timestamp'), idCol = col('glab id'), nameCol = col('name'), levelCol = col('level'),
      reqBatchCol = col('requested batch'), curBatchCol = col('current batch'), emailCol = col('email'), processedCol = col('processed');

  var requests = [];
  for (var i = 1; i < values.length; i++) {
    var row = values[i];
    if (idCol === -1 || !row[idCol]) continue;
    if (processedCol !== -1 && isTruthy_(row[processedCol])) continue;
    requests.push({
      timestamp: tsCol !== -1 ? new Date(row[tsCol]).toISOString() : null,
      glabId: row[idCol],
      name: nameCol !== -1 ? row[nameCol] : '',
      level: levelCol !== -1 ? row[levelCol] : '',
      requestedBatch: reqBatchCol !== -1 ? row[reqBatchCol] : '',
      currentBatch: curBatchCol !== -1 ? row[curBatchCol] : '',
      email: emailCol !== -1 ? row[emailCol] : ''
    });
  }
  return { success: true, requests: requests };
}

// Approves one interest request: marks the matching Eligible {level}
// column on Students, then marks this request row Processed so it drops
// out of the pending list. Identified by GLAB ID + Timestamp together,
// same reasoning as adminConfirmRegistration_ — a GLAB ID alone isn't
// unique enough if a student has requested more than one level over time.
function adminApproveInterest_(glabId, timestamp, level) {
  if (!glabId || !timestamp || !level) throw new Error('GLAB ID, timestamp, and level are required');
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(INTEREST_SHEET);
  if (!sheet) throw new Error('Next Level Interest sheet not found');

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('glab id');
  var tsCol = headers.indexOf('timestamp');
  var processedCol = headers.indexOf('processed');
  if (idCol === -1 || tsCol === -1 || processedCol === -1) {
    throw new Error('Next Level Interest sheet must have "GLAB ID", "Timestamp", and "Processed" columns');
  }

  var needleId = String(glabId).trim().toLowerCase();
  var needleTime = new Date(timestamp).getTime();
  var found = false;
  for (var i = 1; i < values.length; i++) {
    var rowId = String(values[i][idCol] || '').trim().toLowerCase();
    var rowTime = new Date(values[i][tsCol]).getTime();
    if (rowId === needleId && rowTime === needleTime) {
      sheet.getRange(i + 1, processedCol + 1).setValue(true);
      found = true;
      break;
    }
  }
  if (!found) throw new Error('Matching request not found');

  adminSetStudentEligible_(glabId, level, true);
  return { success: true };
}

// Sets the Eligible {level} column (e.g. "Eligible A2") on the Students
// tab for one GLAB ID — shared by adminApproveInterest_ and available for
// any future admin action that needs to grant eligibility the same way.
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
// under Triggers). This is what makes checking "Processed" by hand on the
// Next Level Interest tab do the same thing as clicking Approve in
// /admin — flip the matching Eligible column on Students — instead of just
// marking the row done with no other effect.
//
// Only reacts to a single checkbox flipping to checked (not unchecked, and
// not a multi-cell paste/fill, which onEdit reports as one event covering
// the whole range — deliberately skipped rather than guessed at, so a bulk
// paste doesn't silently grant eligibility for rows nobody meant to
// approve yet; use /admin's Approve button one at a time for those, or
// tick this box one row at a time by hand).
//
// Note this never fires for /admin's own Approve button — Apps Script only
// invokes onEdit for edits made by a person in the Sheets UI, not for
// edits the script itself makes via setValue(), so there's no risk of the
// two approval paths double-processing each other.
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
