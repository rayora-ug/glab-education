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
var REGISTRATIONS_HEADERS = [
  'Timestamp', 'GLAB ID', 'Name', 'Course', 'Batch ID',
  'Payment Method', 'Payment Reference', 'Proof File Link', 'Feedback', 'Status'
];
var DEFAULT_STATUS = 'Submitted';
var CONFIRMED_STATUS = 'Confirmed';
var ELIGIBILITY_COLUMNS = [
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

  var needle = String(glabId || '').trim().toLowerCase();
  if (!needle) return null;

  for (var i = 1; i < values.length; i++) {
    var cell = String(values[i][idCol] || '').trim().toLowerCase();
    if (cell === needle) {
      var eligibleCourses = eligibilityCols
        .filter(function (e) { return e.col !== -1 && isTruthy_(values[i][e.col]); })
        .map(function (e) { return e.course; });
      return { glabId: values[i][idCol], name: values[i][nameCol], eligibleCourses: eligibleCourses };
    }
  }
  return null;
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

// Looks up the WhatsApp group link for a batch from the Batch Links sheet.
// Returns null if the sheet, the batch row, or the link itself is missing.
function findWhatsAppLink_(batchId) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(BATCH_LINKS_SHEET);
  if (!sheet || !batchId) return null;

  var values = sheet.getDataRange().getValues();
  var headers = values[0].map(function (h) { return String(h).trim().toLowerCase(); });
  var idCol = headers.indexOf('batch id');
  var linkCol = headers.indexOf('whatsapp group link');
  if (idCol === -1 || linkCol === -1) return null;

  var needle = String(batchId).trim().toLowerCase();
  for (var i = 1; i < values.length; i++) {
    var cell = String(values[i][idCol] || '').trim().toLowerCase();
    if (cell === needle) {
      var link = String(values[i][linkCol] || '').trim();
      return link || null;
    }
  }
  return null;
}

function lookupStudent_(glabId) {
  var student = findStudent_(glabId);
  if (!student) return { success: true, found: false };

  var registration = findLatestRegistration_(student.glabId);
  if (registration && registration.status === CONFIRMED_STATUS) {
    registration.whatsappLink = findWhatsAppLink_(registration.batchId);
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
  var student = findStudent_(body.glabId);
  if (!student) throw new Error('GLAB ID not found');

  if (!body.course) throw new Error('Course is required');
  if (!body.batchId) throw new Error('Batch is required');
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

  var fileUrl = saveProofFile_(body.fileBase64, body.fileName, body.fileMimeType);
  appendRegistrationRow_([
    new Date(),
    student.glabId,
    student.name,
    body.course,
    body.batchId,
    body.paymentMethod,
    body.paymentReference || '',
    fileUrl,
    body.feedback || '',
    DEFAULT_STATUS
  ]);
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

function appendRegistrationRow_(row) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getSheetByName(REGISTRATIONS_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(REGISTRATIONS_SHEET);
    sheet.appendRow(REGISTRATIONS_HEADERS);
  }
  sheet.appendRow(row);
}
