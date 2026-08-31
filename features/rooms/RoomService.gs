/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * features/rooms/RoomService.gs - Room Management Operations & Capacity Tracking
 */

/**
 * Retrieves all rooms from the Rooms tab.
 */
function getRooms() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.ROOMS);
    const data = sheet.getDataRange().getValues();
    const rooms = sheetToObjects(data);
    return createResponse(true, rooms, `Fetched ${rooms.length} rooms.`);
  } catch (e) {
    return createResponse(false, [], e.toString());
  }
}

/**
 * Adds a new room record. Prevents duplicate Room IDs.
 */
function addRoom(roomData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.ROOMS);
    const cleanId = String(roomData.roomId || '').trim().toUpperCase();

    if (!cleanId) return createResponse(false, null, 'Room ID is required.');
    
    const existingRes = getRooms();
    if (existingRes.data.some(r => String(r['Room ID']).trim().toUpperCase() === cleanId)) {
      return createResponse(false, null, `Room ID '${cleanId}' already exists.`);
    }

    const capacity = parseInt(roomData.capacity) || 2;
    const occupancy = parseInt(roomData.currentOccupancy) || 0;
    const availableBeds = Math.max(0, capacity - occupancy);

    const row = [
      cleanId,
      roomData.block || 'Block A',
      parseInt(roomData.floor) || 1,
      roomData.roomNumber || cleanId,
      roomData.roomType || 'Double AC',
      capacity,
      occupancy,
      availableBeds,
      roomData.gender || 'Male',
      roomData.status || (availableBeds > 0 ? CONFIG.ROOM_STATUS.AVAILABLE : CONFIG.ROOM_STATUS.FULL)
    ];

    sheet.appendRow(row);
    return createResponse(true, { roomId: cleanId }, `Room ${cleanId} created.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Updates an existing room record.
 */
function updateRoom(roomId, roomData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.ROOMS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const cleanId = String(roomId).trim().toUpperCase();

    let rowIndex = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanId) {
        rowIndex = i + 1;
        break;
      }
    }

    if (rowIndex === -1) return createResponse(false, null, `Room ID ${cleanId} not found.`);

    const capacity = parseInt(roomData.capacity !== undefined ? roomData.capacity : data[rowIndex-1][headers.indexOf('Capacity')]);
    const occupancy = parseInt(roomData.currentOccupancy !== undefined ? roomData.currentOccupancy : data[rowIndex-1][headers.indexOf('Current Occupancy')]);
    const availableBeds = Math.max(0, capacity - occupancy);

    const status = roomData.status || (availableBeds === 0 ? CONFIG.ROOM_STATUS.FULL : CONFIG.ROOM_STATUS.AVAILABLE);

    const fieldMap = {
      'Block': roomData.block,
      'Floor': parseInt(roomData.floor),
      'Room Number': roomData.roomNumber,
      'Room Type': roomData.roomType,
      'Capacity': capacity,
      'Current Occupancy': occupancy,
      'Available Beds': availableBeds,
      'Gender': roomData.gender,
      'Status': status
    };

    Object.keys(fieldMap).forEach(header => {
      const col = headers.indexOf(header);
      if (col !== -1 && fieldMap[header] !== undefined) {
        sheet.getRange(rowIndex, col + 1).setValue(fieldMap[header]);
      }
    });

    return createResponse(true, { roomId: cleanId }, `Room ${cleanId} updated.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Updates status of a room (Available, Maintenance, Full, Reserved).
 */
function updateRoomStatus(roomId, newStatus) {
  return updateRoom(roomId, { status: newStatus });
}

/**
 * Deletes a room by Room ID.
 */
function deleteRoom(roomId) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.ROOMS);
    const data = sheet.getDataRange().getValues();
    const cleanId = String(roomId).trim().toUpperCase();

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanId) {
        sheet.deleteRow(i + 1);
        return createResponse(true, null, `Room ${cleanId} deleted.`);
      }
    }
    return createResponse(false, null, `Room ${cleanId} not found.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Recalculates occupancy and available beds for all rooms based on Active Allocations.
 */
function syncRoomOccupancy(ss = SpreadsheetApp.getActiveSpreadsheet()) {
  try {
    const roomSheet = ss.getSheetByName(CONFIG.SHEETS.ROOMS);
    const allocSheet = ss.getSheetByName(CONFIG.SHEETS.ALLOCATIONS);
    if (!roomSheet || !allocSheet) return;

    const roomData = roomSheet.getDataRange().getValues();
    const allocData = allocSheet.getDataRange().getValues();
    
    if (roomData.length <= 1) return;

    const allocations = sheetToObjects(allocData).filter(a => a['Status'] === CONFIG.ALLOCATION_STATUS.ACTIVE);
    
    // Count active allocations per room
    const occupancyMap = {};
    allocations.forEach(a => {
      const rId = String(a['Room ID']).trim().toUpperCase();
      occupancyMap[rId] = (occupancyMap[rId] || 0) + 1;
    });

    const headers = roomData[0];
    const occCol = headers.indexOf('Current Occupancy');
    const availCol = headers.indexOf('Available Beds');
    const statusCol = headers.indexOf('Status');
    const capCol = headers.indexOf('Capacity');

    for (let i = 1; i < roomData.length; i++) {
      const rId = String(roomData[i][0]).trim().toUpperCase();
      const cap = parseInt(roomData[i][capCol]) || 0;
      const occ = occupancyMap[rId] || 0;
      const avail = Math.max(0, cap - occ);

      roomSheet.getRange(i + 1, occCol + 1).setValue(occ);
      roomSheet.getRange(i + 1, availCol + 1).setValue(avail);

      let currentStatus = String(roomData[i][statusCol]).trim();
      if (currentStatus !== CONFIG.ROOM_STATUS.MAINTENANCE && currentStatus !== CONFIG.ROOM_STATUS.RESERVED) {
        const updatedStatus = avail === 0 ? CONFIG.ROOM_STATUS.FULL : CONFIG.ROOM_STATUS.AVAILABLE;
        roomSheet.getRange(i + 1, statusCol + 1).setValue(updatedStatus);
      }
    }
  } catch (e) {
    console.error('Error syncing room occupancy:', e);
  }
}

/**
 * Saves entire array of rooms into Rooms sheet tab.
 */
function saveRooms(rooms) {
  try {
    if (!Array.isArray(rooms)) return createResponse(false, null, 'Invalid rooms data array.');
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    initializeSheets(ss);
    const sheet = ss.getSheetByName(CONFIG.SHEETS.ROOMS);
    
    // Clear rows below header
    const lastRow = sheet.getLastRow();
    if (lastRow > 1) {
      sheet.getRange(2, 1, lastRow - 1, sheet.getLastColumn()).clearContent();
    }

    rooms.forEach(r => {
      const cleanId = String(r['Room ID'] || r.roomId || r['Room Number'] || '').trim().toUpperCase();
      const cap = parseInt(r['Capacity'] || r.capacity) || 2;
      const occ = parseInt(r['Current Occupancy'] || r.occupancy) || 0;
      const avail = Math.max(0, cap - occ);
      sheet.appendRow([
        cleanId,
        r['Block'] || r.block || 'Block A',
        parseInt(r['Floor'] || r.floor) || 1,
        r['Room Number'] || r.roomNumber || cleanId,
        r['Room Type'] || r.roomType || 'Double AC',
        cap,
        occ,
        avail,
        r['Gender'] || r.gender || 'Male',
        r['Status'] || r.status || (avail > 0 ? CONFIG.ROOM_STATUS.AVAILABLE : CONFIG.ROOM_STATUS.FULL)
      ]);
    });

    return createResponse(true, { count: rooms.length }, `Saved ${rooms.length} rooms to Google Sheet.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
