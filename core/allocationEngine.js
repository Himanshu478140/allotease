/**
 * AllotEase - Smart Allocation Algorithm Engine
 * core/allocationEngine.js - Handles hard constraint evaluation & soft factor scoring calculations
 */

(function(window) {
  'use strict';

  /**
   * Generic field-to-field matching helper for local simulator
   */
  function mockGenericCheck(student, room, factorDef, prefMap = {}) {
    const sField = factorDef.studentField || '';
    const rField = factorDef.roomField || '';

    const pref = prefMap[String(student['Student ID'] || '').trim().toUpperCase()] || {};
    let studentVal = pref[sField] || student[sField] || student[factorDef.key];

    const prefRoomType = String(student['Preferred Room Type'] || '').trim();
    const prefBlock = String(
      student['Preferred Block'] || 
      student['Preferred Hostel Block'] || 
      student['Block'] || 
      student.preferredBlock || 
      pref['Preferred Block'] || 
      pref['Preferred Hostel Block'] || 
      ''
    ).trim();
    const prefFloor = String(student['Preferred Floor'] || student['Floor'] || '').trim();

    if (factorDef.key === 'acPreference') {
      if (!studentVal || String(studentVal).trim() === '' || String(studentVal).includes('--')) {
        if (prefRoomType.toLowerCase().includes('non-ac') || prefRoomType.toLowerCase().includes('non ac')) {
          studentVal = 'Non-AC';
        } else if (prefRoomType.toLowerCase().includes('ac')) {
          studentVal = 'AC';
        }
      }
    } else if (factorDef.key === 'occupancyType') {
      if (!studentVal || String(studentVal).trim() === '' || String(studentVal).includes('--')) {
        if (prefRoomType.toLowerCase().includes('single')) studentVal = 'Single';
        else if (prefRoomType.toLowerCase().includes('double')) studentVal = 'Double';
        else if (prefRoomType.toLowerCase().includes('triple')) studentVal = 'Triple';
      }
    } else if (factorDef.key === 'roomType') {
      if (!studentVal && prefRoomType) {
        studentVal = prefRoomType;
      }
    } else if (factorDef.key === 'block') {
      studentVal = prefBlock;
    } else if (factorDef.key === 'floor') {
      if (!studentVal && prefFloor) {
        studentVal = prefFloor;
      }
    }

    if (!studentVal || String(studentVal).trim() === '' || String(studentVal).includes('--')) {
      return { match: false };
    }

    let roomVal = room[rField];
    const roomTypeStr = String(room['Room Type'] || room.type || '').trim();
    const roomBlockStr = String(room['Block'] || room.block || '').trim();
    const roomFloorStr = String(room['Floor'] || room.floor || '').trim();
    const roomACStr = (roomTypeStr.toLowerCase().includes('non-ac') || roomTypeStr.toLowerCase().includes('non ac')) ? 'Non-AC' : (roomTypeStr.toLowerCase().includes('ac') ? 'AC' : '');

    if (factorDef.key === 'acPreference') {
      roomVal = roomACStr;
    } else if (factorDef.key === 'occupancyType') {
      const cap = parseInt(room['Capacity'] || room.capacity) || 1;
      roomVal = cap === 1 ? 'Single' : (cap === 2 ? 'Double' : (cap === 3 ? 'Triple' : `${cap}-Bed`));
    } else if (factorDef.key === 'roomType') {
      roomVal = roomTypeStr;
    } else if (factorDef.key === 'block') {
      const sBlockClean = studentVal.toLowerCase().replace(/[^a-z0-9]/g, '');
      const rBlockClean = roomBlockStr.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (sBlockClean && rBlockClean && (sBlockClean === rBlockClean || sBlockClean.includes(rBlockClean) || rBlockClean.includes(sBlockClean))) {
        return { match: true, detail: `(${roomBlockStr})` };
      }
      return { match: false };
    } else if (factorDef.key === 'floor') {
      roomVal = roomFloorStr;
    }

    if (!roomVal || String(roomVal).trim() === '') {
      return { match: false };
    }

    const sStr = String(studentVal).trim().toLowerCase();
    const rStr = String(roomVal).trim().toLowerCase();

    if (sStr === rStr || sStr.includes(rStr) || rStr.includes(sStr)) {
      return { match: true, detail: `(${roomVal})` };
    }

    return { match: false };
  }

  function mockCheckHardConstraints(student, room, requiredBeds = 1, hardConstraintsConfig = null) {
    const dbConfig = window.LocalMockDB ? window.LocalMockDB.propertyConfig : {};
    const hc = hardConstraintsConfig || dbConfig.hardConstraints || { genderMatch: true, groundFloorAccess: true };

    // Mandatory 1: Room Status
    const roomStatus = room.status || room['Status'];
    if (roomStatus !== 'Available') {
      return { pass: false, reason: `Room status is ${roomStatus}` };
    }

    // Mandatory 2: Bed Capacity
    const availableBeds = typeof room.availableBeds !== 'undefined' ? room.availableBeds : parseInt(room['Available Beds']) || 0;
    if (availableBeds < requiredBeds) {
      return { pass: false, reason: `Insufficient capacity (${availableBeds} beds available, ${requiredBeds} required)` };
    }

    // Optional 1: Gender Match & Smart Boys/Girls Hostel Isolation Protection
    if (hc.genderMatch !== false) {
      const studentGender = String(student['Gender'] || '').trim().toLowerCase();
      const roomGender = String(room.gender || room['Gender'] || '').trim().toLowerCase();
      const roomBlock = String(room['Block'] || room.block || '').trim().toLowerCase();

      const isGirlsHostel = roomBlock.includes('girls') || roomBlock.includes('girl') || roomBlock.includes('female') || roomBlock.includes('women') || roomBlock.includes('woman') || roomBlock.includes('ladies') || roomBlock.includes('lady');
      const isBoysHostel = roomBlock.includes('boys') || roomBlock.includes('boy') || roomBlock.includes('male') || roomBlock.includes('men') || roomBlock.includes('man') || roomBlock.includes('gents');

      if (studentGender === 'male') {
        if (roomGender === 'female' || isGirlsHostel) {
          return { pass: false, reason: `Gender isolation protection: Male applicant cannot be allocated to Girls Hostel / Female Room (${room['Block']})` };
        }
      } else if (studentGender === 'female') {
        if (roomGender === 'male' || isBoysHostel) {
          return { pass: false, reason: `Gender isolation protection: Female applicant cannot be allocated to Boys Hostel / Male Room (${room['Block']})` };
        }
      }

      if (roomGender && roomGender !== 'any' && roomGender !== 'co-ed' && roomGender !== 'all' && studentGender && roomGender !== studentGender) {
        return { pass: false, reason: `Gender mismatch (${student['Gender']} student vs ${room.gender || room['Gender']} room)` };
      }
    }

    // Optional 2: Ground Floor Access
    if (hc.groundFloorAccess !== false) {
      const specReq = String(student['Special Requirement'] || '').toLowerCase();
      const roomFloor = typeof room.floor !== 'undefined' ? room.floor : parseInt(room['Floor']) || 1;
      if ((specReq.includes('wheelchair') || specReq.includes('ground floor') || specReq.includes('disability')) && roomFloor !== 1) {
        return { pass: false, reason: `Special accessibility requirement requires Floor 1 (Room is Floor ${roomFloor})` };
      }
    }

    // Mandatory 3: STRICT HOSTEL BLOCK MATCHING
    const prefBlock = String(
      student['Preferred Block'] || 
      student['Preferred Hostel Block'] || 
      student['Block'] || 
      student.preferredBlock || 
      ''
    ).trim();

    if (prefBlock && prefBlock.toLowerCase() !== 'any' && prefBlock.toLowerCase() !== 'all') {
      const studentGender = String(student['Gender'] || '').trim().toLowerCase();
      const prefBlockLower = prefBlock.toLowerCase();
      
      const isOppositeGenderBlock = (studentGender === 'male' && (prefBlockLower.includes('girls') || prefBlockLower.includes('female') || prefBlockLower.includes('women') || prefBlockLower.includes('ladies'))) ||
                                    (studentGender === 'female' && (prefBlockLower.includes('boys') || prefBlockLower.includes('male') || prefBlockLower.includes('men')));

      // Ignore opposite-gender block preference to route applicant safely to their correct gender hostel!
      if (!isOppositeGenderBlock) {
        const roomBlock = String(room['Block'] || room.block || '').trim();
        const cleanPrefBlock = prefBlock.toLowerCase().replace(/[^a-z0-9]/g, '');
        const cleanRoomBlock = roomBlock.toLowerCase().replace(/[^a-z0-9]/g, '');

        if (cleanPrefBlock && cleanRoomBlock && !cleanPrefBlock.includes(cleanRoomBlock) && !cleanRoomBlock.includes(cleanPrefBlock)) {
          return { pass: false, reason: `Block mismatch (Requested ${prefBlock} vs Room ${roomBlock})` };
        }
      }
    }

    // Mandatory 4: STRICT ROOM TYPE & AC PREFERENCE MATCHING
    const prefRoomType = String(student['Preferred Room Type'] || student['Room Type'] || '').trim();
    if (prefRoomType && prefRoomType.toLowerCase() !== 'any' && prefRoomType.toLowerCase() !== 'all') {
      const roomTypeStr = String(room['Room Type'] || room.type || '').trim().toLowerCase();

      // Check Occupancy Type Match (Single, Double, Triple)
      if (prefRoomType.toLowerCase().includes('single')) {
        const cap = parseInt(room['Capacity'] || room.capacity) || 1;
        if (cap !== 1 && !roomTypeStr.includes('single')) {
          return { pass: false, reason: `Capacity mismatch (Requested Single vs Room ${roomTypeStr})` };
        }
      } else if (prefRoomType.toLowerCase().includes('double')) {
        const cap = parseInt(room['Capacity'] || room.capacity) || 2;
        if (cap !== 2 && !roomTypeStr.includes('double')) {
          return { pass: false, reason: `Capacity mismatch (Requested Double vs Room ${roomTypeStr})` };
        }
      } else if (prefRoomType.toLowerCase().includes('triple')) {
        const cap = parseInt(room['Capacity'] || room.capacity) || 3;
        if (cap !== 3 && !roomTypeStr.includes('triple')) {
          return { pass: false, reason: `Capacity mismatch (Requested Triple vs Room ${roomTypeStr})` };
        }
      }

      // Check AC Preference Match (AC vs Non-AC)
      const isReqNonAc = prefRoomType.toLowerCase().includes('non-ac') || prefRoomType.toLowerCase().includes('non ac');
      const isReqAc = !isReqNonAc && prefRoomType.toLowerCase().includes('ac');

      const isRoomNonAc = roomTypeStr.includes('non-ac') || roomTypeStr.includes('non ac');
      const isRoomAc = !isRoomNonAc && roomTypeStr.includes('ac');

      if (isReqNonAc && !isRoomNonAc) {
        return { pass: false, reason: `AC mismatch (Requested Non-AC vs Room ${room['Room Type']})` };
      }
      if (isReqAc && !isRoomAc) {
        return { pass: false, reason: `AC mismatch (Requested AC vs Room ${room['Room Type']})` };
      }
    }

    return { pass: true, reason: 'Passed hard constraints and strict preference matching' };
  }

  function mockCalculateSoftScore(student, room, weights = null, prefMap = {}, isRoommateMatched = false, customSoftFactors = null) {
    let score = 0;
    const breakdown = [];

    const dbConfig = window.LocalMockDB ? window.LocalMockDB.propertyConfig : {};
    const softFactors = customSoftFactors || dbConfig.softFactors || [];

    softFactors.forEach(factor => {
      if (factor.active === false) return;

      let factorWeight = factor.weight;
      if (weights && typeof weights[factor.key] !== 'undefined') {
        factorWeight = weights[factor.key];
      }
      if (factorWeight <= 0) return;

      let res = { match: false };

      if (factor.key === 'roommate') {
        if (isRoommateMatched) {
          res = { match: true, detail: '' };
        } else {
          const reqRoommate = String(student['Preferred Roommates'] || '').trim().toUpperCase();
          const occupants = room.occupants || [];
          if (reqRoommate && occupants.some(id => id === reqRoommate)) {
            res = { match: true, detail: `(${reqRoommate}) Present` };
          }
        }
      } else if (factor.key === 'priority') {
        const p = student['Priority'];
        if (p === 'Emergency/Special Requirement' || p === 'Final Year') {
          res = { match: true, detail: `(${p})` };
        }
      } else {
        res = mockGenericCheck(student, room, factor, prefMap);
      }

      if (res.match) {
        score += factorWeight;
        const detailStr = res.detail ? ` ${res.detail}` : '';
        breakdown.push(`+${factorWeight} ${factor.label}${detailStr}`);
      }
    });

    const finalScore = Math.min(100, score);
    return { score: finalScore, reason: breakdown.join('; ') || 'Default eligible allocation' };
  }

  // Expose on window scope
  window.mockGenericCheck = mockGenericCheck;
  window.mockCheckHardConstraints = mockCheckHardConstraints;
  window.mockCalculateSoftScore = mockCalculateSoftScore;

})(window);
