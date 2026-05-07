// ═══════════════════════════════════════════════════════════════════
// IMPROVED MVGFC GRADUATION SURVEY — Google Apps Script (Code.gs)
// ═══════════════════════════════════════════════════════════════════
// Instructions:
// 1. Paste this into your Google Apps Script editor.
// 2. Click "Run" -> "authorizeDrive" to grant permissions.
// 3. Deploy as a Web App (Execute as: Me, Access: Anyone).
// 4. Copy the Web App URL and paste it into constants.ts (SCRIPT_URL).

const DRIVE_FOLDER_ID = '1WlDsABfmRUQB366kWv-0vYei_hmKYq29';

const SHEETS = {
  PERSONAL:  'Personal Info',
  CONSENT:   'Consent',
  RATINGS:   'Satisfaction Ratings',
  FEEDBACK:  'Open Feedback',
  ALUMNI:    'Alumni ID',
  SUMMARY:   'Summary'
};

// --- GET: Analytics ---
function doGet(e) {
  try {
    if (e && e.parameter && e.parameter.action === 'getAnalytics') {
      return json(getAnalytics());
    }
    return json({ status: 'ok', message: 'MVGFC Survey API is active.' });
  } catch (ex) {
    return json({ status: 'error', message: ex.toString() });
  }
}

// --- POST: Submission ---
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    if (data.action === 'submit') {
      saveSubmission(data);
      return json({ status: 'success', message: 'Submission saved successfully.' });
    }
    return json({ status: 'error', message: 'Unknown action.' });
  } catch (ex) {
    console.error('Submission Error:', ex.toString());
    return json({ status: 'error', message: ex.toString() });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// --- SAVE SUBMISSION ---
function saveSubmission(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ts = data.timestamp || new Date().toLocaleString('en-PH');

  // --- TAB 1: Personal Info ---
  const pSheet = getOrCreate(ss, SHEETS.PERSONAL);
  if (pSheet.getLastRow() === 0) {
    pSheet.appendRow(['Timestamp','Email','Full Name','Program','Year Graduated','Contact Number','Permanent Address','Facebook Name','Employment Status']);
    styleHeader(pSheet);
  }
  pSheet.appendRow([ts, data.email, data.name, data.program, data.yearGrad, data.contact, data.address, data.fbName, data.employment || '']);

  // --- TAB 2: Consent ---
  const cSheet = getOrCreate(ss, SHEETS.CONSENT);
  if (cSheet.getLastRow() === 0) {
    cSheet.appendRow(['Timestamp','Name','Email','Consent']);
    styleHeader(cSheet);
  }
  cSheet.appendRow([ts, data.name, data.email, data.consent]);

  // --- TAB 3: Satisfaction Ratings ---
  const rSheet = getOrCreate(ss, SHEETS.RATINGS);
  const rIds = ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'r7', 'r8', 'r9'];
  if (rSheet.getLastRow() === 0) {
    rSheet.appendRow(['Timestamp','Name','Program', ...rIds, 'Average Rating']);
    styleHeader(rSheet);
  }
  const rVals = rIds.map(id => parseInt(data.ratings[id]) || 0);
  const avg = (rVals.reduce((a, b) => a + b, 0) / rVals.length).toFixed(2);
  rSheet.appendRow([ts, data.name, data.program, ...rVals, avg]);

  // --- TAB 4: Open Feedback ---
  const fSheet = getOrCreate(ss, SHEETS.FEEDBACK);
  if (fSheet.getLastRow() === 0) {
    fSheet.appendRow(['Timestamp','Name','Program','Most Appreciated','Needs Improvement','Suggestions']);
    styleHeader(fSheet);
  }
  fSheet.appendRow([ts, data.name, data.program, data.appreciate, data.improve, data.suggestions]);

  // --- TAB 5: Alumni ID ---
  const aSheet = getOrCreate(ss, SHEETS.ALUMNI);
  if (aSheet.getLastRow() === 0) {
    aSheet.appendRow(['Timestamp','Name','Program','Wants Alumni ID','DOB','Citizenship','Home Address','Primary Contact','Emergency Person','Emergency Contact','Relationship','Emergency Address','E-Signature','2x2 Photo']);
    styleHeader(aSheet);
  }

  let esigLink = '', photoLink = '';
  if (data.alumniId === 'Yes') {
    if (data.esig) {
      esigLink = uploadBase64(data.esig, `${data.name}_esig_${Date.now()}.jpg`, data.esigType);
    }
    if (data.photo) {
      photoLink = uploadBase64(data.photo, `${data.name}_photo_${Date.now()}.jpg`, data.photoType);
    }
  }

  aSheet.appendRow([
    ts, data.name, data.program, data.alumniId,
    data.dob || '', data.citizenship || '', data.homeAddress || '',
    data.primaryContact || '', data.emergencyPerson || '',
    data.emergencyContact || '', data.relationship || '',
    data.emergencyAddress || '', esigLink, photoLink
  ]);

  // --- TAB 6: Summary ---
  const sSheet = getOrCreate(ss, SHEETS.SUMMARY);
  if (sSheet.getLastRow() === 0) {
    const headers = ['Timestamp','Email','Name','Program','Year','Contact','Address','Facebook','Employment','Consent', ...rIds, 'Avg Rating','Appreciation','Needs Improvement','Suggestions','Alumni ID','DOB','Citizenship'];
    sSheet.appendRow(headers);
    styleHeader(sSheet);
  }
  sSheet.appendRow([
    ts, data.email, data.name, data.program, data.yearGrad,
    data.contact, data.address, data.fbName, data.employment || '',
    data.consent,
    ...rVals, avg,
    data.appreciate, data.improve, data.suggestions,
    data.alumniId, data.dob || '', data.citizenship || ''
  ]);
}

// --- ANALYTICS ---
function getAnalytics() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const pS = ss.getSheetByName(SHEETS.PERSONAL);
  const rS = ss.getSheetByName(SHEETS.RATINGS);
  const cS = ss.getSheetByName(SHEETS.CONSENT);
  const aS = ss.getSheetByName(SHEETS.ALUMNI);
  const fS = ss.getSheetByName(SHEETS.FEEDBACK);

  if (!pS) return { total: 0 };

  const total = Math.max(0, pS.getLastRow() - 1);
  const programs = {};
  if (total > 0) {
    pS.getRange(2, 4, total, 1).getValues().forEach(r => programs[r[0]] = (programs[r[0]] || 0) + 1);
  }

  const consent = {};
  if (cS && cS.getLastRow() > 1) {
    cS.getRange(2, 4, cS.getLastRow()-1, 1).getValues().forEach(r => consent[r[0]] = (consent[r[0]] || 0) + 1);
  }

  const alumni = {};
  if (aS && aS.getLastRow() > 1) {
    aS.getRange(2, 4, aS.getLastRow()-1, 1).getValues().forEach(r => alumni[r[0]] = (alumni[r[0]] || 0) + 1);
  }

  const avgRatings = {};
  const ratingDist = {'4':0,'3':0,'2':0,'1':0};
  const keys = ['r1','r2','r3','r4','r5','r6','r7','r8','r9'];
  if (rS && rS.getLastRow() > 1) {
    const rc = rS.getLastRow() - 1;
    const vals = rS.getRange(2, 4, rc, 9).getValues();
    const sums = new Array(9).fill(0);
    vals.forEach(row => row.forEach((v,i) => {
      const n = parseInt(v) || 0;
      sums[i] += n;
      if (ratingDist[String(n)] !== undefined) ratingDist[String(n)]++;
    }));
    keys.forEach((k,i) => avgRatings[k] = sums[i]/rc);
  }

  const recentResponses = [];
  if (total > 0) {
    const pData = pS.getRange(Math.max(2, pS.getLastRow()-19), 1, Math.min(20, pS.getLastRow()-1), 5).getValues();
    const rData = rS ? rS.getRange(Math.max(2, rS.getLastRow()-19), 1, Math.min(20, rS.getLastRow()-1), 13).getValues() : [];
    const cData = cS ? cS.getRange(Math.max(2, cS.getLastRow()-19), 1, Math.min(20, cS.getLastRow()-1), 4).getValues() : [];
    const aData = aS ? aS.getRange(Math.max(2, aS.getLastRow()-19), 1, Math.min(20, aS.getLastRow()-1), 4).getValues() : [];

    pData.forEach((row,i) => {
      recentResponses.push({
        ts:   String(row[0]),
        name: String(row[2]),
        program: String(row[3]),
        year: String(row[4]),
        consent: cData[i] ? String(cData[i][3]) : '—',
        alumni:  aData[i] ? String(aData[i][3]) : '—',
        avg:     rData[i] ? parseFloat(rData[i][12]).toFixed(2) : '—'
      });
    });
    recentResponses.reverse();
  }

  const appreciation = [];
  if (fS && fS.getLastRow() > 1) {
    const startF = Math.max(2, fS.getLastRow()-5);
    fS.getRange(startF, 2, fS.getLastRow()-startF+1, 3).getValues().forEach(r => {
      appreciation.push({ name: String(r[0]), text: String(r[2]) });
    });
    appreciation.reverse();
  }

  return { total, programs, consent, alumni, avgRatings, ratingDist, recentResponses, appreciation };
}

// --- HELPERS ---
function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function styleHeader(sheet) {
  const h = sheet.getRange(1, 1, 1, sheet.getLastColumn());
  h.setBackground('#0f3d0f').setFontColor('#ffffff').setFontWeight('bold');
  sheet.setFrozenRows(1);
}

function uploadBase64(base64String, fileName, mimeType) {
  try {
    let cleanBase64 = base64String;
    // Strip header if present
    if (base64String.includes(',')) {
      cleanBase64 = base64String.split(',')[1];
    }
    const decoded = Utilities.base64Decode(cleanBase64);
    const blob = Utilities.newBlob(decoded, mimeType || 'image/jpeg', fileName);
    const folder = DriveApp.getFolderById(DRIVE_FOLDER_ID);
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    return file.getUrl();
  } catch (e) {
    return 'Upload Error: ' + e.toString();
  }
}

function authorizeDrive() {
  DriveApp.getFolderById(DRIVE_FOLDER_ID);
  Logger.log('Drive Authorized successfully.');
}
