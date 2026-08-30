/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * core/Utils.gs - Utility Functions & Database Helpers
 */

/**
 * Standard API Response Wrapper
 */
function createResponse(success, data = null, message = '') {
  return {
    success: success,
    data: data,
    message: message,
    timestamp: new Date().toISOString()
  };
}

/**
 * Ensures Google Sheet tabs and headers exist.
 */
function initializeSheets(ss = SpreadsheetApp.getActiveSpreadsheet()) {
  const schemas = {
    [CONFIG.SHEETS.STUDENTS]: [
      'Student ID', 'Name', 'Gender', 'Course', 'Branch', 'Year', 'Category',
      'Preferred Room Type', 'Preferred Roommates', 'Special Requirement',
      'Priority', 'Allocation Status', 'Allocated Room', 'Allocation Score'
    ],
    [CONFIG.SHEETS.ROOMS]: [
      'Room ID', 'Block', 'Floor', 'Room Number', 'Room Type', 'Capacity',
      'Current Occupancy', 'Available Beds', 'Gender', 'Status'
    ],
    [CONFIG.SHEETS.ALLOCATIONS]: [
      'Allocation ID', 'Student ID', 'Room ID', 'Allocation Date',
      'Allocation Score', 'Reason', 'Status'
    ],
    [CONFIG.SHEETS.PREFERENCES]: [
      'Student ID', 'Preferred Room Type', 'Preferred Block', 'Preferred Floor',
      'Preferred Roommates', 'Other Preference'
    ],
    [CONFIG.SHEETS.WAITING_LIST]: [
      'Student ID', 'Priority', 'Request Date', 'Reason', 'Status'
    ],
    [CONFIG.SHEETS.SETTINGS]: [
      'Key', 'Value', 'Description'
    ]
  };

  Object.keys(schemas).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schemas[sheetName]);
      sheet.getRange(1, 1, 1, schemas[sheetName].length).setFontWeight('bold').setBackground('#1e293b').setFontColor('#ffffff');
    }
  });

  // Ensure settings defaults
  const settingsSheet = ss.getSheetByName(CONFIG.SHEETS.SETTINGS);
  if (settingsSheet.getLastRow() <= 1) {
    const defaultSettingsRows = [
      ['Weight_RoomType', 30, 'Score weight for room type match'],
      ['Weight_Block', 20, 'Score weight for block preference match'],
      ['Weight_Floor', 10, 'Score weight for floor preference match'],
      ['Weight_Roommate', 20, 'Score weight for roommate preference match'],
      ['Weight_Priority', 10, 'Score weight for priority status'],
      ['Weight_SpecialReq', 10, 'Score weight for special requirement match'],
      ['Academic_Year', '2026-2027', 'Current academic year'],
      ['Max_Room_Capacity', 4, 'Maximum allowed capacity for any room']
    ];
    defaultSettingsRows.forEach(row => settingsSheet.appendRow(row));
  }
}

/**
 * Converts a 2D sheet array with headers to an array of JavaScript objects.
 */
function sheetToObjects(values) {
  if (!values || values.length <= 1) return [];
  const headers = values[0].map(h => String(h).trim());
  const results = [];
  for (let i = 1; i < values.length; i++) {
    const row = values[i];
    if (row.every(cell => cell === '' || cell === null)) continue;
    const obj = {};
    headers.forEach((header, colIndex) => {
      obj[header] = row[colIndex] !== undefined ? row[colIndex] : '';
    });
    obj['_rowIndex'] = i + 1; // 1-indexed row number in Google Sheet
    results.push(obj);
  }
  return results;
}

/**
 * Mulberry32 Seeded Pseudo-Random Number Generator.
 * Guarantees 100% reproducible demo data for Hackathon presentations.
 */
function createSeededPRNG(seed) {
  let s = seed >>> 0;
  return function() {
    let t = (s += 0x6D2B79F5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a random integer in range [min, max] using a seeded generator.
 */
function seededRandomInt(prng, min, max) {
  return Math.floor(prng() * (max - min + 1)) + min;
}

/**
 * Selects a random element from an array using a seeded generator.
 */
function seededChoice(prng, array) {
  return array[Math.floor(prng() * array.length)];
}
