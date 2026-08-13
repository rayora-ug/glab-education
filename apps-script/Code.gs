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
var CERTIFICATES_SHEET = 'Certificates';
var CONTACT_MESSAGES_SHEET = 'Contact Messages';
var CONTACT_MESSAGES_HEADERS = ['Timestamp', 'Name', 'Email', 'Subject', 'Message'];
var ATTENDANCE_SHEET = 'Attendance';
var STUDENT_FEEDBACK_SHEET = 'Student Feedback';
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
      response = checkApplication_(body.email, body.dob);
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

// Finds an A1 application by Email + Date of Birth. Reads the Applications
// tab by header name — needs "Email" and "Date of Birth" columns at minimum,
// plus "Name", "Selection Status", "GLAB ID", "Confirmed Batch", and a batch
// id column for a full result. "Confirmed Batch" is the display text shown
// to the applicant; the batch id column (accepts either "Batch ID" or
// "Confirmed Batch ID" as the header) is the short, stable id (e.g. a1-40-e,
// matching the a2-36-E convention) matched against Batch Links.
function findApplication_(email, dob) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(APPLICATIONS_SHEET);
  if (!sheet) throw new Error('Applications sheet not found');

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var emailCol = headers.indexOf('email');
  var dobCol = headers.indexOf('date of birth');
  var nameCol = headers.indexOf('name');
  var statusCol = headers.indexOf('selection status');
  var glabIdCol = headers.indexOf('glab id');
  var batchCol = headers.indexOf('confirmed batch');
  var batchIdCol = headers.indexOf('confirmed batch id');
  if (batchIdCol === -1) batchIdCol = headers.indexOf('batch id');
  if (emailCol === -1 || dobCol === -1) {
    throw new Error('Applications sheet must have "Email" and "Date of Birth" columns');
  }

  var needleEmail = String(email || '').trim().toLowerCase();
  var needleDob = normalizeDate_(dob);
  if (!needleEmail || !needleDob) return null;

  for (var i = 1; i < values.length; i++) {
    var rowEmail = String(values[i][emailCol] || '').trim().toLowerCase();
    var rowDob = normalizeDate_(values[i][dobCol]);
    if (rowEmail === needleEmail && rowDob === needleDob) {
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

function checkApplication_(email, dob) {
  var application = findApplication_(email, dob);
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
    registration: registration
  };
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

  // Idempotency guard: if this GLAB ID already has a registration on file,
  // don't append another one — just report success without writing a new
  // row. Without this, a client retry after an ambiguous network error (the
  // submission actually succeeded, but the response never confirmed it)
  // produces a real duplicate row, since this function previously had no
  // way to tell "first submission" from "resubmission" apart.
  var existing = findLatestRegistration_(student.glabId);
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

// Reads the "Reviews" intake tab — staff paste real reviews (from Facebook
// or elsewhere) here as they collect them. This is a staging area, not
// connected live to the site: reviews are periodically synced by hand into
// data/reviews.json in the site repo. Expected columns (any order, matched
// by header name): Name, Location, Rating, Date, Course, Review Text,
// Outcome, Featured, Synced. "Synced" is a checkbox column this function's
// counterpart (markReviewsSynced_) checks off once a review has been copied
// into the site, so repeat syncs don't reprocess the same rows.
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
    registration: registration
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
  try {
    email = String(email || '').trim();
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
      lines.push('Your class links will be posted here and on MyGLAB (glabeducation.com/dashboard) closer to the start date.');
    }
    lines.push('');
    lines.push('You can check your batch, class links, and attendance anytime at glabeducation.com/dashboard with your GLAB ID: ' + glabId);
    lines.push('');
    lines.push('— GLAB Team');

    MailApp.sendEmail({ to: email, subject: 'GLAB Registration Confirmed — ' + course, body: lines.join('\n'), name: 'GLAB Team' });
  } catch (err) {
    // A failed email should never fail the confirmation itself — but log it
    // (View > Executions > this run > Logs in the Apps Script editor) so a
    // silent failure is still diagnosable instead of just vanishing.
    console.error('sendConfirmationEmail_ failed: ' + err.message);
  }
}
