/**
 * Backend function to process student intake registrations from standalone StudentIntake.html.
 * Validates required fields, checks for duplicate Student ID, and appends row to Students sheet.
 */
function submitStudentIntake(formData) {
  try {
    if (!formData) {
      return createResponse(false, null, 'No registration form data submitted.');
    }

    // Check intake deadline cutoff (bypass if isOverride is true)
    const config = getFormIntakeConfig();
    const isOverride = formData.isOverride === true || formData.override === true || formData.bypassDeadline === true;
    if (!isOverride && config.intakeDeadline) {
      const d = new Date(config.intakeDeadline);
      if (!isNaN(d.getTime()) && new Date() > d) {
        return createResponse(false, null, 'Registration has closed. Please contact the hostel administration.');
      }
    }

    let sId = String(formData.studentId || formData['Student ID'] || '').trim().toUpperCase();
    const name = String(formData.name || formData['Name'] || '').trim();
    const gender = String(formData.gender || formData['Gender'] || '').trim();

    if (!name || !gender) {
      return createResponse(false, null, 'Missing required fields. Name and Gender are required.');
    }

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const studentSheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const data = studentSheet.getDataRange().getValues();
    const headers = data[0];

    const sIdColIndex = headers.indexOf('Student ID');

    if (!sId) {
      // Authoritative Backend Unique Student ID Generation
      let maxNum = 1000;
      for (let i = 1; i < data.length; i++) {
        const idStr = String(data[i][sIdColIndex] || '');
        const match = idStr.match(/STU-(\d+)/i);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxNum) maxNum = num;
        }
      }
      sId = 'STU-' + (maxNum + 1);
    } else {
      // Check duplicate Student ID if user specified one
      for (let i = 1; i < data.length; i++) {
        const existingId = String(data[i][sIdColIndex] || '').trim().toUpperCase();
        if (existingId === sId) {
          return createResponse(false, null, `Student ID '${sId}' already exists in the system. Please verify your Student ID.`);
        }
      }
    }

    const course = String(formData.course || formData['Course'] || 'B.Tech').trim();
    const branch = String(formData.branch || formData['Branch'] || 'CSE').trim();
    const year = String(formData.year || formData['Year'] || '1st Year').trim();
    const category = String(formData.category || formData['Category'] || 'General').trim();
    const prefRoomType = String(formData.preferredRoomType || formData['Preferred Room Type'] || 'Single AC').trim();
    const prefRoommates = String(formData.preferredRoommates || formData['Preferred Roommates'] || '').trim();
    const specialReq = String(formData.specialRequirement || formData['Special Requirement'] || 'None').trim();
    const priority = String(formData.priority || formData['Priority'] || 'General Applicants / Local Quota').trim();
    const defaultRent = 8000;

    // Append new student row matching standard schema
    studentSheet.appendRow([
      sId,
      name,
      gender,
      course,
      branch,
      year,
      category,
      prefRoomType,
      prefRoommates,
      specialReq,
      priority,
      CONFIG.STUDENT_STATUS.UNALLOCATED,
      '', // Allocated Room
      0,  // Allocation Score
      defaultRent,
      0,  // Amount Paid
      'Pending' // Payment Status
    ]);

    return createResponse(true, { studentId: sId, name: name }, `Application submitted successfully.`);
  } catch (e) {
    return createResponse(false, null, 'Error submitting student registration: ' + e.toString());
  }
}

/**
 * Fetches column header titles from a linked Google Form Response Sheet.
 * Handles permission and URL errors gracefully.
 */
function fetchResponseSheetHeaders(responseSheetUrl) {
  try {
    if (!responseSheetUrl || String(responseSheetUrl).trim() === '') {
      return createResponse(false, null, 'Please provide a valid Google Form Response Sheet URL or Spreadsheet ID.');
    }

    let targetSs = null;
    const urlStr = String(responseSheetUrl).trim();

    // Extract Spreadsheet ID if full URL provided
    const match = urlStr.match(/[-\w]{25,}/);
    const ssId = match ? match[0] : urlStr;

    try {
      targetSs = SpreadsheetApp.openById(ssId);
    } catch (err) {
      return createResponse(false, null, `Cannot access response Sheet. Please ensure the response Sheet is shared with edit access or set to "Anyone with the link can view". (${err.toString()})`);
    }

    if (!targetSs) {
      return createResponse(false, null, 'Unable to open response Spreadsheet.');
    }

    // Read first sheet (typically "Form Responses 1")
    const sheets = targetSs.getSheets();
    if (sheets.length === 0) {
      return createResponse(false, null, 'Target response Spreadsheet has no sheets.');
    }

    const firstSheet = sheets[0];
    const data = firstSheet.getDataRange().getValues();
    if (data.length === 0) {
      return createResponse(false, null, 'Target response Sheet is empty (no headers found).');
    }

    const headers = data[0].map(h => String(h || '').trim()).filter(h => h.length > 0);
    return createResponse(true, { headers, sheetName: firstSheet.getName() }, `Extracted ${headers.length} column headers from sheet '${firstSheet.getName()}'.`);
  } catch (e) {
    return createResponse(false, null, 'Error fetching response headers: ' + e.toString());
  }
}

/**
 * Syncs new student registration rows from linked Google Form Response Sheet.
 * Applies saved field mapping and skips existing student IDs to prevent duplicates.
 */
function syncFormResponses() {
  try {
    const config = getFormIntakeConfig();

    if (!config.responseSheetUrl || String(config.responseSheetUrl).trim() === '') {
      return createResponse(false, null, 'Please complete Google Form Response Sheet configuration in Property Setup first.');
    }

    const mapping = config.fieldMapping || {};
    if (Object.keys(mapping).length === 0) {
      return createResponse(false, null, 'Please complete field mapping in Property Setup / Intake Settings first.');
    }

    // 1. Fetch Headers and Data from External Response Sheet
    const headerRes = fetchResponseSheetHeaders(config.responseSheetUrl);
    if (!headerRes.success) return headerRes;

    const urlStr = String(config.responseSheetUrl).trim();
    const match = urlStr.match(/[-\w]{25,}/);
    const ssId = match ? match[0] : urlStr;
    const targetSs = SpreadsheetApp.openById(ssId);
    const respSheet = targetSs.getSheets()[0];
    const respData = respSheet.getDataRange().getValues();

    if (respData.length <= 1) {
      return createResponse(true, { syncedCount: 0, skippedCount: 0 }, 'No response entries found in linked Form Response Sheet.');
    }

    const respHeaders = respData[0].map(h => String(h || '').trim());

    // Build header index lookup map
    const headerMap = {};
    respHeaders.forEach((h, idx) => {
      headerMap[h] = idx;
    });

    // 2. Fetch Existing Student IDs from local Students Sheet
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const studentSheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const sData = studentSheet.getDataRange().getValues();
    const sHeaders = sData[0];

    const existingStudentIds = new Set();
    const sIdColIndex = sHeaders.indexOf('Student ID');

    for (let i = 1; i < sData.length; i++) {
      const existingId = String(sData[i][sIdColIndex] || '').trim().toUpperCase();
      if (existingId) existingStudentIds.add(existingId);
    }

    // 3. Process Response Rows and Append New Students
    let syncedCount = 0;
    let skippedCount = 0;
    const defaultRent = config.defaultBaseRent || 8000;

    for (let i = 1; i < respData.length; i++) {
      const row = respData[i];

      // Helper to extract value mapped to system key
      function getValue(sysKey) {
        const formHeader = mapping[sysKey];
        if (!formHeader || typeof headerMap[formHeader] === 'undefined') return '';
        return String(row[headerMap[formHeader]] || '').trim();
      }

      let sId = getValue('Student ID');
      if (!sId) {
        // Auto-generate ID if missing in form entry
        sId = 'STU-' + (1000 + i);
      } else {
        sId = sId.toUpperCase();
      }

      if (existingStudentIds.has(sId)) {
        skippedCount++;
        continue;
      }

      const name = getValue('Name') || `Applicant ${sId}`;
      const gender = getValue('Gender') || 'Male';
      const course = getValue('Course') || 'B.Tech';
      const branch = getValue('Branch') || 'CSE';
      const year = getValue('Year') || '1st Year';
      const category = getValue('Category') || 'General';
      const priority = getValue('Priority') || 'Other Students';
      const specialReq = getValue('Special Requirement') || 'None';
      const prefRoomType = getValue('Preferred Room Type') || 'Single AC';
      const prefBlock = getValue('Preferred Block') || '';
      const prefFloor = getValue('Preferred Floor') || '';
      const prefRoommates = getValue('Preferred Roommates') || '';

      // Append student row matching standard schema
      studentSheet.appendRow([
        sId,
        name,
        gender,
        course,
        branch,
        year,
        category,
        prefRoomType,
        prefRoommates,
        specialReq,
        priority,
        CONFIG.STUDENT_STATUS.UNALLOCATED,
        '', // Allocated Room
        0,  // Allocation Score
        defaultRent,
        0,  // Amount Paid
        'Pending' // Payment Status
      ]);

      existingStudentIds.add(sId);
      syncedCount++;
    }

    return createResponse(true, { syncedCount, skippedCount }, `Successfully synced ${syncedCount} new student application(s) from Google Form (${skippedCount} existing duplicate(s) skipped).`);
  } catch (e) {
    return createResponse(false, null, 'Error syncing form responses: ' + e.toString());
  }
}
