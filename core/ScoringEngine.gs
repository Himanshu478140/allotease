/**
 * AllotEase - Core Scoring & Constraint Engine
 * core/ScoringEngine.gs - Shared Data-Driven Allocation Scoring Logic
 */

/**
 * Generic field-to-field matching helper for configurable soft factors.
 */
function genericCheck(student, room, factorDef, prefMap = {}) {
  const sField = factorDef.studentField || '';
  const rField = factorDef.roomField || '';

  const pref = prefMap[String(student['Student ID'] || '').trim().toUpperCase()] || {};
  let studentVal = pref[sField] || student[sField];

  // Gender-aware fallback defaults if student preference field is missing
  if (!studentVal || String(studentVal).trim() === '') {
    if (factorDef.key === 'block') {
      const gender = String(student['Gender'] || '').trim().toLowerCase();
      studentVal = (gender === 'female') ? 'Block B' : 'Block A';
    } else if (factorDef.key === 'floor') {
      studentVal = 1;
    }
  }

  if (!studentVal || String(studentVal).trim() === '') {
    return { match: false };
  }

  // Extract room field value
  let roomVal = room[rField];
  if (typeof roomVal === 'undefined' && room.type && rField === 'Room Type') roomVal = room.type;
  if (typeof roomVal === 'undefined' && room.block && rField === 'Block') roomVal = room.block;
  if (typeof roomVal === 'undefined' && room.floor && rField === 'Floor') roomVal = room.floor;

  if (typeof roomVal === 'undefined' || roomVal === null || String(roomVal).trim() === '') {
    // If factor has no room field required (e.g. special requirement fulfillment check)
    if (!rField) {
      if (String(studentVal).trim() !== '' && String(studentVal).trim() !== 'None') {
        return { match: true, detail: `(${studentVal})` };
      }
    }
    return { match: false };
  }

  // Compare studentVal and roomVal (numeric or case-insensitive string match)
  const sStr = String(studentVal).trim().toLowerCase();
  const rStr = String(roomVal).trim().toLowerCase();

  if (sStr === rStr) {
    return { match: true, detail: `(${roomVal})` };
  }

  return { match: false };
}

/**
 * Validates hard constraints for a candidate room assignment.
 * Bed Capacity and Room Status are mandatory (non-toggleable).
 * Gender Match and Ground Floor Access are optional toggles based on PropertyConfig.
 */
function checkHardConstraints(student, room, requiredBeds = 1, hardConstraintsConfig = null) {
  const propConfig = getPropertyConfig();
  const hc = hardConstraintsConfig || propConfig.hardConstraints || { genderMatch: true, groundFloorAccess: true };

  // Mandatory Constraint 1: Room status availability
  const roomStatus = room.status || room['Status'];
  if (roomStatus !== CONFIG.ROOM_STATUS.AVAILABLE) {
    return { pass: false, reason: `Room status is ${roomStatus}` };
  }

  // Mandatory Constraint 2: Bed capacity limits
  const availableBeds = typeof room.availableBeds !== 'undefined' ? room.availableBeds : parseInt(room['Available Beds']) || 0;
  if (availableBeds < requiredBeds) {
    return { pass: false, reason: `Insufficient capacity (${availableBeds} beds available, ${requiredBeds} required)` };
  }

  // Optional Constraint 1: Gender match
  if (hc.genderMatch !== false) {
    const roomGender = String(room.gender || room['Gender'] || '').trim().toLowerCase();
    const studentGender = String(student['Gender'] || '').trim().toLowerCase();
    if (roomGender && studentGender && roomGender !== studentGender) {
      return { pass: false, reason: `Gender mismatch (${student['Gender']} student vs ${room.gender || room['Gender']} room)` };
    }
  }

  // Optional Constraint 2: Ground Floor / Wheelchair Special Requirement
  if (hc.groundFloorAccess !== false) {
    const specReq = String(student['Special Requirement'] || '').toLowerCase();
    const roomFloor = typeof room.floor !== 'undefined' ? room.floor : parseInt(room['Floor']) || 1;
    if ((specReq.includes('wheelchair') || specReq.includes('ground floor') || specReq.includes('disability')) && roomFloor !== 1) {
      return { pass: false, reason: `Special accessibility requirement requires Floor 1 (Room is Floor ${roomFloor})` };
    }
  }

  return { pass: true, reason: 'Passed hard constraints' };
}

/**
 * Calculates weighted soft preference score by dynamically running active soft factors.
 * Only 'roommate' and 'priority' are special-cased; all other factors use genericCheck().
 */
function calculateSoftScore(student, room, customWeights = null, prefMap = {}, isRoommateMatched = false, customSoftFactors = null) {
  let score = 0;
  const breakdown = [];

  const propConfig = getPropertyConfig();
  const softFactors = customSoftFactors || propConfig.softFactors || CONFIG.DEFAULT_PROPERTY_CONFIG.softFactors;

  softFactors.forEach(factor => {
    if (factor.active === false) return;

    // Use custom passed weight or factor's configured weight
    let factorWeight = factor.weight;
    if (customWeights && typeof customWeights[factor.key] !== 'undefined') {
      factorWeight = customWeights[factor.key];
    }
    if (factorWeight <= 0) return;

    let res = { match: false };

    // Special Case 1: Roommate Pairing
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
    }
    // Special Case 2: Priority Bonus
    else if (factor.key === 'priority') {
      const p = student['Priority'];
      if (p === 'Emergency/Special Requirement' || p === 'Final Year') {
        res = { match: true, detail: `(${p})` };
      }
    }
    // All Generic Factors (roomType, block, floor, specialReq, dietPref, etc.)
    else {
      res = genericCheck(student, room, factor, prefMap);
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
