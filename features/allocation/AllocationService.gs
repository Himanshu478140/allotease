/**
 * AllotEase - Smart Hostel Allocation Engine
 * features/allocation/AllocationService.gs - Weighted Smart Allocation Engine & Manual Override
 */

/**
 * Executes the Smart Allocation Algorithm.
 */
function runSmartAllocation(customWeights = null) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    
    // Get active scoring weights
    const weights = customWeights || getActiveSettings();

    // Fetch live datasets
    const studentsRes = getStudents();
    const roomsRes = getRooms();
    
    if (!studentsRes.success || !roomsRes.success) {
      return createResponse(false, null, 'Failed to fetch database sheets.');
    }

    const students = studentsRes.data;
    const rooms = roomsRes.data;

    // Filter unallocated students
    let unallocatedStudents = students.filter(s => 
      s['Allocation Status'] === CONFIG.STUDENT_STATUS.UNALLOCATED || 
      s['Allocation Status'] === CONFIG.STUDENT_STATUS.WAITING
    );

    if (unallocatedStudents.length === 0) {
      return createResponse(true, { allocatedCount: 0, waitingCount: 0 }, 'No unallocated students found.');
    }

    // Fetch Preferences sheet
    const prefSheet = ss.getSheetByName(CONFIG.SHEETS.PREFERENCES);
    const prefData = prefSheet.getDataRange().getValues();
    const preferencesList = sheetToObjects(prefData);
    const prefMap = {};
    preferencesList.forEach(p => {
      prefMap[String(p['Student ID']).trim().toUpperCase()] = p;
    });

    // 1. SORT STUDENTS BY STRICT PRIORITY QUEUE
    unallocatedStudents.sort((a, b) => {
      const rankA = CONFIG.PRIORITY_TIERS[a['Priority']] || 99;
      const rankB = CONFIG.PRIORITY_TIERS[b['Priority']] || 99;
      return rankA - rankB;
    });

    // Track state in memory during execution
    const liveRooms = rooms.map(r => ({
      id: String(r['Room ID']).trim().toUpperCase(),
      block: String(r['Block']).trim(),
      floor: parseInt(r['Floor']) || 1,
      type: String(r['Room Type']).trim(),
      capacity: parseInt(r['Capacity']) || 0,
      occupancy: parseInt(r['Current Occupancy']) || 0,
      availableBeds: parseInt(r['Available Beds']) || 0,
      gender: String(r['Gender']).trim(),
      status: String(r['Status']).trim(),
      occupants: [] // Student IDs currently assigned in this run
    }));

    const allocationsToAppend = [];
    const allocatedStudentIds = new Set();

    // 2. PROCESS ALLOCATION QUEUE (using shared ScoringEngine.gs functions)
    for (let i = 0; i < unallocatedStudents.length; i++) {
      const student = unallocatedStudents[i];
      const sId = String(student['Student ID']).trim().toUpperCase();

      if (allocatedStudentIds.has(sId)) continue; // Already processed in group

      // Check if student requested a roommate
      const requestedRoommateId = String(student['Preferred Roommates'] || '').trim().toUpperCase();
      let pairedStudent = null;

      if (requestedRoommateId) {
        pairedStudent = unallocatedStudents.find(s => 
          String(s['Student ID']).trim().toUpperCase() === requestedRoommateId && 
          !allocatedStudentIds.has(requestedRoommateId)
        );
      }

      let bestRoom = null;
      let bestScore = -1;
      let bestReason = '';
      let isPairAllocation = false;

      // Evaluate candidate rooms
      for (const room of liveRooms) {
        // Try pair allocation if pairedStudent exists
        if (pairedStudent && room.availableBeds >= 2) {
          const check1 = checkHardConstraints(student, room, 2);
          const check2 = checkHardConstraints(pairedStudent, room, 2);

          if (check1.pass && check2.pass) {
            const score1 = calculateSoftScore(student, room, weights, prefMap, true);
            const score2 = calculateSoftScore(pairedStudent, room, weights, prefMap, true);
            const avgPairScore = (score1.score + score2.score) / 2;

            if (avgPairScore > bestScore) {
              bestScore = avgPairScore;
              bestRoom = room;
              bestReason = `Paired Allocation (${sId} & ${requestedRoommateId}): ${score1.reason}`;
              isPairAllocation = true;
            }
          }
        }

        // Single allocation evaluation
        const hardCheck = checkHardConstraints(student, room, 1);
        if (hardCheck.pass) {
          const softRes = calculateSoftScore(student, room, weights, prefMap, false);
          if (softRes.score > bestScore) {
            bestScore = softRes.score;
            bestRoom = room;
            bestReason = softRes.reason;
            isPairAllocation = false;
          }
        }
      }

      // Assign to best room if found
      if (bestRoom && bestScore >= 0) {
        const allocId = 'ALL-' + Math.floor(1000 + Math.random() * 9000);
        const today = new Date().toISOString().split('T')[0];

        if (isPairAllocation && pairedStudent) {
          // Assign Student 1
          bestRoom.occupancy += 1;
          bestRoom.availableBeds -= 1;
          bestRoom.occupants.push(sId);
          allocatedStudentIds.add(sId);

          allocationsToAppend.push({
            allocId: allocId + 'A',
            studentId: sId,
            roomId: bestRoom.id,
            date: today,
            score: Math.round(bestScore),
            reason: bestReason,
            status: CONFIG.ALLOCATION_STATUS.ACTIVE
          });

          // Assign Student 2
          const allocId2 = 'ALL-' + Math.floor(1000 + Math.random() * 9000);
          bestRoom.occupancy += 1;
          bestRoom.availableBeds -= 1;
          bestRoom.occupants.push(requestedRoommateId);
          allocatedStudentIds.add(requestedRoommateId);

          allocationsToAppend.push({
            allocId: allocId2 + 'B',
            studentId: requestedRoommateId,
            roomId: bestRoom.id,
            date: today,
            score: Math.round(bestScore),
            reason: `Paired Allocation with ${sId}: ${bestReason}`,
            status: CONFIG.ALLOCATION_STATUS.ACTIVE
          });

        } else {
          // Single student assignment
          bestRoom.occupancy += 1;
          bestRoom.availableBeds -= 1;
          bestRoom.occupants.push(sId);
          allocatedStudentIds.add(sId);

          allocationsToAppend.push({
            allocId: allocId,
            studentId: sId,
            roomId: bestRoom.id,
            date: today,
            score: Math.round(bestScore),
            reason: bestReason,
            status: CONFIG.ALLOCATION_STATUS.ACTIVE
          });
        }

        if (bestRoom.availableBeds === 0) {
          bestRoom.status = CONFIG.ROOM_STATUS.FULL;
        }
      } else {
        // Enlist unallocated student to WaitingList
        addToWaitingList(sId, student['Priority'], 'No eligible room matching hard constraints and capacity.', ss);
      }
    }

    // 3. PERSIST CHANGES TO GOOGLE SHEETS
    const allocSheet = ss.getSheetByName(CONFIG.SHEETS.ALLOCATIONS);
    allocationsToAppend.forEach(a => {
      allocSheet.appendRow([
        a.allocId,
        a.studentId,
        a.roomId,
        a.date,
        a.score,
        a.reason,
        a.status
      ]);
    });

    // Update Students tab for allocated students
    const studentSheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const sData = studentSheet.getDataRange().getValues();
    const sHeaders = sData[0];
    const statusCol = sHeaders.indexOf('Allocation Status');
    const roomCol = sHeaders.indexOf('Allocated Room');
    const scoreCol = sHeaders.indexOf('Allocation Score');

    allocationsToAppend.forEach(a => {
      for (let i = 1; i < sData.length; i++) {
        if (String(sData[i][0]).trim().toUpperCase() === a.studentId) {
          studentSheet.getRange(i + 1, statusCol + 1).setValue(CONFIG.STUDENT_STATUS.ALLOCATED);
          studentSheet.getRange(i + 1, roomCol + 1).setValue(a.roomId);
          studentSheet.getRange(i + 1, scoreCol + 1).setValue(a.score);
          removeFromWaitingList(a.studentId, ss);
          break;
        }
      }
    });

    // Sync room occupancies
    syncRoomOccupancy(ss);

    return createResponse(true, {
      allocatedCount: allocationsToAppend.length,
      waitingCount: unallocatedStudents.length - allocationsToAppend.length
    }, `Smart Allocation completed: ${allocationsToAppend.length} students allocated successfully.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Retrieves all allocations from Allocations sheet.
 */
function getAllocations() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.ALLOCATIONS);
    const data = sheet.getDataRange().getValues();
    const allocations = sheetToObjects(data);

    // Enrich with Student & Room names for UI displays
    const studentsRes = getStudents();
    const roomsRes = getRooms();
    const studentMap = {};
    const roomMap = {};

    if (studentsRes.success) {
      studentsRes.data.forEach(s => studentMap[String(s['Student ID']).trim().toUpperCase()] = s);
    }
    if (roomsRes.success) {
      roomsRes.data.forEach(r => roomMap[String(r['Room ID']).trim().toUpperCase()] = r);
    }

    const enriched = allocations.map(a => {
      const sId = String(a['Student ID']).trim().toUpperCase();
      const rId = String(a['Room ID']).trim().toUpperCase();
      const student = studentMap[sId] || {};
      const room = roomMap[rId] || {};

      return {
        ...a,
        studentName: student['Name'] || sId,
        studentEmail: student['Email'] || student['Email Address'] || student['email'] || '',
        gender: student['Gender'] || '-',
        branch: student['Branch'] || '-',
        year: student['Year'] || '-',
        roomNumber: room['Room Number'] || rId,
        block: room['Block'] || '-',
        floor: room['Floor'] || '-'
      };
    });

    return createResponse(true, enriched, `Fetched ${enriched.length} allocations.`);
  } catch (e) {
    return createResponse(false, [], e.toString());
  }
}

/**
 * Executes Manual Override to change student's room.
 */
function changeRoom(allocationId, newRoomId, adminReason) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const allocSheet = ss.getSheetByName(CONFIG.SHEETS.ALLOCATIONS);
    const data = allocSheet.getDataRange().getValues();
    const headers = data[0];

    const cleanAllocId = String(allocationId).trim().toUpperCase();
    const cleanNewRoomId = String(newRoomId).trim().toUpperCase();

    let targetRow = -1;
    let studentId = '';
    let oldRoomId = '';

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanAllocId) {
        targetRow = i + 1;
        studentId = String(data[i][1]).trim().toUpperCase();
        oldRoomId = String(data[i][2]).trim().toUpperCase();
        break;
      }
    }

    if (targetRow === -1) {
      return createResponse(false, null, `Allocation record '${cleanAllocId}' not found.`);
    }

    // Check new room availability
    const roomsRes = getRooms();
    const newRoom = roomsRes.data.find(r => String(r['Room ID']).trim().toUpperCase() === cleanNewRoomId);
    if (!newRoom) return createResponse(false, null, `New Room '${cleanNewRoomId}' not found.`);

    if (parseInt(newRoom['Available Beds']) <= 0) {
      return createResponse(false, null, `Room '${cleanNewRoomId}' has no available beds.`);
    }

    if (newRoom['Status'] !== CONFIG.ROOM_STATUS.AVAILABLE) {
      return createResponse(false, null, `Room '${cleanNewRoomId}' is ${newRoom['Status']}.`);
    }

    const auditReason = `Manual Override by Admin: Reassigned from Room ${oldRoomId} to Room ${cleanNewRoomId}. Reason: ${adminReason || 'Administrative decision'}`;

    // Directly update allocation record: Room ID, Reason, Status = Overridden
    allocSheet.getRange(targetRow, headers.indexOf('Room ID') + 1).setValue(cleanNewRoomId);
    allocSheet.getRange(targetRow, headers.indexOf('Reason') + 1).setValue(auditReason);
    allocSheet.getRange(targetRow, headers.indexOf('Status') + 1).setValue(CONFIG.ALLOCATION_STATUS.OVERRIDDEN);

    // Update Student Record
    const studentSheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const sData = studentSheet.getDataRange().getValues();
    for (let i = 1; i < sData.length; i++) {
      if (String(sData[i][0]).trim().toUpperCase() === studentId) {
        studentSheet.getRange(i + 1, sData[0].indexOf('Allocated Room') + 1).setValue(cleanNewRoomId);
        studentSheet.getRange(i + 1, sData[0].indexOf('Allocation Status') + 1).setValue(CONFIG.STUDENT_STATUS.ALLOCATED);
        break;
      }
    }

    // Sync room occupancy
    syncRoomOccupancy(ss);

    return createResponse(true, { allocationId: cleanAllocId, studentId, newRoomId: cleanNewRoomId }, `Manual Override successful: Student ${studentId} moved to Room ${cleanNewRoomId}. Status updated to Overridden.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
