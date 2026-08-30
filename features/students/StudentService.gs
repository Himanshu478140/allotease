/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * features/students/StudentService.gs - Student CRUD & Management Operations
 */

/**
 * Retrieves all students from the Students tab.
 */
function getStudents() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const data = sheet.getDataRange().getValues();
    const students = sheetToObjects(data);
    return createResponse(true, students, `Fetched ${students.length} students.`);
  } catch (e) {
    return createResponse(false, [], e.toString());
  }
}

/**
 * Retrieves a single student by Student ID.
 */
function getStudentById(studentId) {
  try {
    const res = getStudents();
    if (!res.success) return res;
    const student = res.data.find(s => String(s['Student ID']).trim().toUpperCase() === String(studentId).trim().toUpperCase());
    if (student) return createResponse(true, student, 'Student found.');
    return createResponse(false, null, `Student ID ${studentId} not found.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Adds a new student record. Prevents duplicate Student IDs.
 */
function addStudent(studentData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const existingRes = getStudents();
    
    // Server-side Validation
    const cleanId = String(studentData.studentId || '').trim().toUpperCase();
    if (!cleanId) return createResponse(false, null, 'Student ID is required.');
    if (!studentData.name) return createResponse(false, null, 'Student Name is required.');
    if (!studentData.gender) return createResponse(false, null, 'Gender is required.');

    // Check Duplicate ID
    if (existingRes.data.some(s => String(s['Student ID']).trim().toUpperCase() === cleanId)) {
      return createResponse(false, null, `Student ID '${cleanId}' already exists.`);
    }

    const row = [
      cleanId,
      studentData.name,
      studentData.gender,
      studentData.course || 'B.Tech',
      studentData.branch || 'CSE',
      studentData.year || '1st Year',
      studentData.category || 'General',
      studentData.preferredRoomType || 'Single AC',
      studentData.preferredRoommates || '',
      studentData.specialRequirement || 'None',
      studentData.priority || 'Other Students',
      CONFIG.STUDENT_STATUS.UNALLOCATED,
      '', // Allocated Room
      0   // Allocation Score
    ];

    sheet.appendRow(row);

    // Also insert or update Preferences tab
    const prefSheet = ss.getSheetByName(CONFIG.SHEETS.PREFERENCES);
    prefSheet.appendRow([
      cleanId,
      studentData.preferredRoomType || 'Single AC',
      studentData.preferredBlock || 'Block A',
      studentData.preferredFloor || 1,
      studentData.preferredRoommates || '',
      studentData.otherPreference || ''
    ]);

    return createResponse(true, { studentId: cleanId }, `Student ${cleanId} added successfully.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Updates an existing student record.
 */
function updateStudent(studentId, updatedData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    
    const idColIndex = headers.indexOf('Student ID');
    if (idColIndex === -1) return createResponse(false, null, 'Invalid sheet structure.');

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][idColIndex]).trim().toUpperCase() === String(studentId).trim().toUpperCase()) {
        rowIndex = i + 1; // 1-indexed row
        break;
      }
    }

    if (rowIndex === -1) return createResponse(false, null, `Student ID ${studentId} not found.`);

    // Map fields
    const fieldMap = {
      'Name': updatedData.name,
      'Gender': updatedData.gender,
      'Course': updatedData.course,
      'Branch': updatedData.branch,
      'Year': updatedData.year,
      'Category': updatedData.category,
      'Preferred Room Type': updatedData.preferredRoomType,
      'Preferred Roommates': updatedData.preferredRoommates,
      'Special Requirement': updatedData.specialRequirement,
      'Priority': updatedData.priority
    };

    Object.keys(fieldMap).forEach(header => {
      const col = headers.indexOf(header);
      if (col !== -1 && fieldMap[header] !== undefined) {
        sheet.getRange(rowIndex, col + 1).setValue(fieldMap[header]);
      }
    });

    return createResponse(true, { studentId: studentId }, `Student ${studentId} updated successfully.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Deletes a student by Student ID.
 */
function deleteStudent(studentId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const data = sheet.getDataRange().getValues();
    const cleanId = String(studentId).trim().toUpperCase();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanId) {
        sheet.deleteRow(i + 1);
        return createResponse(true, null, `Student ${cleanId} deleted.`);
      }
    }
    return createResponse(false, null, `Student ${cleanId} not found.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
