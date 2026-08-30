/**
 * AllotEase - Local Mock Rooms & Property Setup API
 * core/mockRoomsApi.js - Room inventory, building layout matrix & property configuration endpoints
 */

(function(window) {
  'use strict';

  const mockRoomsApi = {
    getRooms: async function() {
      return { success: true, data: window.LocalMockDB ? window.LocalMockDB.rooms : [] };
    },

    saveRooms: async function(roomsArray) {
      const db = window.LocalMockDB;
      if (db) {
        db.rooms = roomsArray || [];
        if (window.saveLocalMockDB) window.saveLocalMockDB();
      }
      return { success: true, message: `Successfully updated ${roomsArray ? roomsArray.length : 0} rooms.` };
    },

    addRoom: async function(roomData) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const cap = parseInt(roomData.capacity) || 2;
      db.rooms.push({
        'Room ID': roomData.roomId,
        'Block': roomData.block || 'Block A',
        'Floor': parseInt(roomData.floor) || 1,
        'Room Number': roomData.roomNumber || roomData.roomId,
        'Room Type': roomData.roomType || 'Double AC',
        'Capacity': cap,
        'Current Occupancy': 0,
        'Available Beds': cap,
        'Gender': roomData.gender || 'Any',
        'Status': 'Available'
      });
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: `Room ${roomData.roomId} added.` };
    },

    updateRoom: async function(roomId, data) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const room = db.rooms.find(r => r['Room ID'] === roomId);
      if (!room) return { success: false, message: 'Room not found.' };
      if (data.status) room['Status'] = data.status;
      if (data.capacity) {
        room['Capacity'] = parseInt(data.capacity);
        room['Available Beds'] = Math.max(0, room['Capacity'] - room['Current Occupancy']);
      }
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: `Room ${roomId} updated.` };
    },

    deleteRoom: async function(roomId) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      db.rooms = db.rooms.filter(r => r['Room ID'] !== roomId);
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: `Room ${roomId} deleted.` };
    },

    getBuildingLayout: async function() {
      const db = window.LocalMockDB;
      let layout = (db && db.buildingLayout) ? db.buildingLayout : window.MOCK_DEFAULT_BUILDING_LAYOUT;
      try {
        const saved = localStorage.getItem('allotease_building_layout');
        if (saved) {
          layout = JSON.parse(saved);
          if (db) db.buildingLayout = layout;
        }
      } catch (e) {}
      return { success: true, data: layout };
    },

    saveBuildingLayout: async function(layout) {
      if (!Array.isArray(layout)) return { success: false, message: 'Invalid building layout data.' };
      const db = window.LocalMockDB;
      if (db) db.buildingLayout = layout;
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, data: layout, message: 'Building layout saved successfully.' };
    },

    getPriorityTiers: async function() {
      const db = window.LocalMockDB;
      let tiers = (db && db.priorityTiers) ? db.priorityTiers : window.MOCK_DEFAULT_PRIORITY_TIERS;
      try {
        const saved = localStorage.getItem('allotease_priorityTiers');
        if (saved) {
          tiers = JSON.parse(saved);
          if (db) db.priorityTiers = tiers;
        }
      } catch (e) {}
      return { success: true, data: tiers };
    },

    savePriorityTiers: async function(tiers) {
      if (!Array.isArray(tiers)) return { success: false, message: 'Invalid priority tiers data.' };
      const updatedTiers = tiers.map((t, idx) => ({
        rank: idx + 1,
        key: t.key || '',
        name: t.name || 'Priority Rank #' + (idx + 1),
        desc: t.desc || '',
        active: t.active !== false
      }));
      const db = window.LocalMockDB;
      if (db) db.priorityTiers = updatedTiers;
      try {
        localStorage.setItem('allotease_priorityTiers', JSON.stringify(updatedTiers));
      } catch (e) {}
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, data: updatedTiers, message: 'Priority Hierarchy saved successfully.' };
    },

    getPropertyConfig: async function() {
      return { success: true, data: window.LocalMockDB ? window.LocalMockDB.propertyConfig : {} };
    },

    savePropertyConfig: async function(softFactors, hardConstraints, collegeLocation, autoEmailNotices) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'Uninitialized' };

      let config = {};
      if (Array.isArray(softFactors)) {
        config = {
          softFactors: softFactors,
          hardConstraints: typeof hardConstraints !== 'undefined' ? hardConstraints : (db.propertyConfig ? db.propertyConfig.hardConstraints : { genderMatch: true, groundFloorAccess: true }),
          collegeLocation: collegeLocation || (db.propertyConfig ? db.propertyConfig.collegeLocation : window.DEFAULT_COLLEGE_LOCATION),
          autoEmailNotices: typeof autoEmailNotices !== 'undefined' ? autoEmailNotices : (db.propertyConfig && typeof db.propertyConfig.autoEmailNotices !== 'undefined' ? db.propertyConfig.autoEmailNotices : true)
        };
      } else if (typeof softFactors === 'object' && softFactors !== null) {
        config = {
          softFactors: softFactors.softFactors || (db.propertyConfig ? db.propertyConfig.softFactors : []),
          hardConstraints: typeof softFactors.hardConstraints !== 'undefined' ? softFactors.hardConstraints : (db.propertyConfig ? db.propertyConfig.hardConstraints : { genderMatch: true, groundFloorAccess: true }),
          collegeLocation: softFactors.collegeLocation || (db.propertyConfig ? db.propertyConfig.collegeLocation : window.DEFAULT_COLLEGE_LOCATION),
          autoEmailNotices: typeof softFactors.autoEmailNotices !== 'undefined' ? softFactors.autoEmailNotices : (db.propertyConfig && typeof db.propertyConfig.autoEmailNotices !== 'undefined' ? db.propertyConfig.autoEmailNotices : true)
        };
      }

      db.propertyConfig = JSON.parse(JSON.stringify(config));
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, data: config, message: 'Property Configuration saved successfully.' };
    }
  };

  window.mockRoomsApi = mockRoomsApi;

})(window);
