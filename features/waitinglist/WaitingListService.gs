/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * features/waitinglist/WaitingListService.gs - Waiting List Queue & Auto-Enlistment
 */

/**
 * Retrieves waiting list records sorted by priority rank & request date.
 */
function getWaitingList() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.WAITING_LIST);
    const data = sheet.getDataRange().getValues();
    const list = sheetToObjects(data);

    // Join with Student data to include Name, Branch, etc.
    const studentRes = getStudents();
    const studentMap = {};
    if (studentRes.success) {
      studentRes.data.forEach(s => {
        studentMap[String(s['Student ID']).trim().toUpperCase()] = s;
      });
    }

    const enrichedList = list.map((item, index) => {
      const sId = String(item['Student ID']).trim().toUpperCase();
      const student = studentMap[sId] || {};
      return {
        ...item,
        position: index + 1,
        studentName: student['Name'] || 'Unknown Student',
        gender: student['Gender'] || '-',
        branch: student['Branch'] || '-',
        year: student['Year'] || '-',
        specialRequirement: student['Special Requirement'] || 'None'
      };
    });

    return createResponse(true, enrichedList, `Fetched ${enrichedList.length} waiting list entries.`);
  } catch (e) {
    return createResponse(false, [], e.toString());
  }
}

/**
 * Enlists a student into the WaitingList tab.
 */
function addToWaitingList(studentId, priority, reason, ss = SpreadsheetApp.getActiveSpreadsheet()) {
  try {
    const sheet = ss.getSheetByName(CONFIG.SHEETS.WAITING_LIST);
    const cleanId = String(studentId).trim().toUpperCase();
    
    // Check if already in waiting list
    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanId) {
        return createResponse(true, { studentId: cleanId }, `Student ${cleanId} already on waiting list.`);
      }
    }

    sheet.appendRow([
      cleanId,
      priority || 'Other Students',
      new Date().toISOString().split('T')[0],
      reason || 'No eligible room found matching constraints and available capacity.',
      'Active'
    ]);

    // Update Student Status
    const studentSheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const sData = studentSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      if (String(sData[i][0]).trim().toUpperCase() === cleanId) {
        studentSheet.getRange(i + 1, sData[0].indexOf('Allocation Status') + 1).setValue(CONFIG.STUDENT_STATUS.WAITING);
        break;
      }
    }

    return createResponse(true, { studentId: cleanId }, `Student ${cleanId} added to waiting list.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Removes a student from the waiting list.
 */
function removeFromWaitingList(studentId, ss = SpreadsheetApp.getActiveSpreadsheet()) {
  try {
    const sheet = ss.getSheetByName(CONFIG.SHEETS.WAITING_LIST);
    const data = sheet.getDataRange().getValues();
    const cleanId = String(studentId).trim().toUpperCase();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanId) {
        sheet.deleteRow(i + 1);
        return createResponse(true, null, `Student ${cleanId} removed from waiting list.`);
      }
    }
    return createResponse(false, null, `Student ${cleanId} not found on waiting list.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
