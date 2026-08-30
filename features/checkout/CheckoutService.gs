/**
 * AllotEase - Vacancy & Checkout Service
 * features/checkout/CheckoutService.gs - Bed Vacancy Checkout & Constraint-Checked Auto-Reallocation
 */

/**
 * Handles student checkout, vacates bed capacity, and evaluates waiting list for auto-reallocation.
 */
function checkoutStudent(studentId, allocationId = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);

    const cleanSId = String(studentId).trim().toUpperCase();

    // 1. Fetch Student & Allocation Record
    const studentSheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const sData = studentSheet.getDataRange().getValues();
    const sHeaders = sData[0];
    const sIdCol = sHeaders.indexOf('Student ID');
    const sStatusCol = sHeaders.indexOf('Allocation Status');
    const sRoomCol = sHeaders.indexOf('Allocated Room');
    const sScoreCol = sHeaders.indexOf('Allocation Score');

    let sRow = -1;
    let freedRoomId = '';

    for (let i = 1; i < sData.length; i++) {
      if (String(sData[i][sIdCol]).trim().toUpperCase() === cleanSId) {
        sRow = i + 1;
        freedRoomId = String(sData[i][sRoomCol]).trim().toUpperCase();
        break;
      }
    }

    if (sRow === -1) {
      return createResponse(false, null, `Student '${cleanSId}' not found.`);
    }

    // 2. Mark Allocation Record as Checked Out
    const allocSheet = ss.getSheetByName(CONFIG.SHEETS.ALLOCATIONS);
    const aData = allocSheet.getDataRange().getValues();
    const aHeaders = aData[0];
    const aIdCol = aHeaders.indexOf('Allocation ID');
    const aStudentCol = aHeaders.indexOf('Student ID');
    const aStatusCol = aHeaders.indexOf('Status');

    for (let i = 1; i < aData.length; i++) {
      const matchAlloc = allocationId ? String(aData[i][aIdCol]).trim().toUpperCase() === String(allocationId).trim().toUpperCase() : true;
      if (String(aData[i][aStudentCol]).trim().toUpperCase() === cleanSId && matchAlloc && String(aData[i][aStatusCol]).trim().toUpperCase() === 'ACTIVE') {
        allocSheet.getRange(i + 1, aStatusCol + 1).setValue('Checked Out');
        break;
      }
    }

    // 3. Clear Student Record
    studentSheet.getRange(sRow, sStatusCol + 1).setValue('Checked Out');
    studentSheet.getRange(sRow, sRoomCol + 1).setValue('');
    studentSheet.getRange(sRow, sScoreCol + 1).setValue(0);

    // 4. Update Room Occupancy
    if (freedRoomId) {
      syncRoomOccupancy(ss);
    }

    // 5. Evaluate Waiting List for Constraint-Checked Auto-Reallocation
    let reallocatedStudent = null;

    if (freedRoomId) {
      const roomsRes = getRooms();
      const freedRoom = roomsRes.data.find(r => String(r['Room ID']).trim().toUpperCase() === freedRoomId);

      if (freedRoom && freedRoom['Available Beds'] > 0 && freedRoom['Status'] === CONFIG.ROOM_STATUS.AVAILABLE) {
        const waitingRes = getWaitingList();
        const waitingList = waitingRes.data || [];

        // Sort waiting list by priority rank
        waitingList.sort((a, b) => {
          const rankA = CONFIG.PRIORITY_TIERS[a['Priority']] || 99;
          const rankB = CONFIG.PRIORITY_TIERS[b['Priority']] || 99;
          return rankA - rankB;
        });

        // Evaluate waiting list candidates for freedRoom
        for (const candidate of waitingList) {
          const candidateStudentRes = getStudents();
          const candidateStudent = candidateStudentRes.data.find(s => String(s['Student ID']).trim().toUpperCase() === String(candidate['Student ID']).trim().toUpperCase());

          if (candidateStudent) {
            const hardCheck = checkHardConstraints(candidateStudent, freedRoom, 1);
            if (hardCheck.pass) {
              // Match found! Auto-allocate candidate to freedRoom
              const weights = getActiveSettings();
              const softRes = calculateSoftScore(candidateStudent, freedRoom, weights, {}, false);

              const newAllocId = 'ALL-' + Math.floor(1000 + Math.random() * 9000);
              const today = new Date().toISOString().split('T')[0];
              const auditReason = `Auto-Reallocated from Waiting List to freed Room ${freedRoomId}: ${softRes.reason}`;

              // Append new allocation
              allocSheet.appendRow([
                newAllocId,
                candidateStudent['Student ID'],
                freedRoomId,
                today,
                softRes.score,
                auditReason,
                CONFIG.ALLOCATION_STATUS.ACTIVE
              ]);

              // Update Candidate Student Record
              for (let i = 1; i < sData.length; i++) {
                if (String(sData[i][sIdCol]).trim().toUpperCase() === String(candidateStudent['Student ID']).trim().toUpperCase()) {
                  studentSheet.getRange(i + 1, sStatusCol + 1).setValue(CONFIG.STUDENT_STATUS.ALLOCATED);
                  studentSheet.getRange(i + 1, sRoomCol + 1).setValue(freedRoomId);
                  studentSheet.getRange(i + 1, sScoreCol + 1).setValue(softRes.score);
                  break;
                }
              }

              // Remove from WaitingList sheet
              removeFromWaitingList(candidateStudent['Student ID'], ss);

              // Sync occupancy
              syncRoomOccupancy(ss);

              reallocatedStudent = {
                studentId: candidateStudent['Student ID'],
                name: candidateStudent['Name'],
                roomId: freedRoomId,
                score: softRes.score
              };
              break; // Auto-reallocated 1 bed to top qualifying waitlist student
            }
          }
        }
      }
    }

    let msg = `Checkout successful for Student ${cleanSId}. Bed in Room ${freedRoomId} has been vacated.`;
    if (reallocatedStudent) {
      msg += ` Auto-reallocated freed bed to Waitlist Student ${reallocatedStudent.name} (${reallocatedStudent.studentId}) with score ${reallocatedStudent.score}/100.`;
    } else {
      msg += ` Room ${freedRoomId} remains Available for future allocation runs.`;
    }

    return createResponse(true, { studentId: cleanSId, freedRoomId, reallocatedStudent }, msg);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
