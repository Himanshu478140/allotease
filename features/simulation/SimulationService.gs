/**
 * AllotEase - What-If Simulation Engine
 * features/simulation/SimulationService.gs - What-If Dry-Run Simulation Calculator
 */

/**
 * Dry-run simulation of allocation using custom candidate weights.
 * Does NOT mutate Google Sheets database.
 */
function simulateAllocation(candidateWeights) {
  try {
    const studentsRes = getStudents();
    const roomsRes = getRooms();
    
    if (!studentsRes.success || !roomsRes.success) {
      return createResponse(false, null, 'Failed to fetch database sheets for simulation.');
    }

    const students = studentsRes.data;
    const rooms = roomsRes.data;

    // Simulation uses custom weights or fallback defaults
    const weights = candidateWeights || getActiveSettings();

    // Perform dry-run calculation
    let totalScoreSum = 0;
    let simulatedAllocatedCount = 0;
    const simulatedChanges = [];

    // Filter unallocated students for simulation
    const candidateStudents = students.filter(s => 
      s['Allocation Status'] === CONFIG.STUDENT_STATUS.UNALLOCATED || 
      s['Allocation Status'] === CONFIG.STUDENT_STATUS.WAITING ||
      s['Allocation Status'] === CONFIG.STUDENT_STATUS.ALLOCATED
    );

    const roomCapacityMap = {};
    rooms.forEach(r => {
      roomCapacityMap[String(r['Room ID']).trim().toUpperCase()] = {
        id: String(r['Room ID']).trim().toUpperCase(),
        block: String(r['Block']).trim(),
        floor: parseInt(r['Floor']) || 1,
        type: String(r['Room Type']).trim(),
        capacity: parseInt(r['Capacity']) || 0,
        availableBeds: parseInt(r['Capacity']) || 0,
        gender: String(r['Gender']).trim(),
        status: String(r['Status']).trim(),
        occupants: []
      };
    });

    candidateStudents.sort((a, b) => {
      const rankA = CONFIG.PRIORITY_TIERS[a['Priority']] || 99;
      const rankB = CONFIG.PRIORITY_TIERS[b['Priority']] || 99;
      return rankA - rankB;
    });

    for (const student of candidateStudents) {
      const sId = String(student['Student ID']).trim().toUpperCase();
      let bestRoom = null;
      let bestScore = -1;

      Object.values(roomCapacityMap).forEach(room => {
        // Check hard constraints using shared ScoringEngine.gs function
        const hardCheck = checkHardConstraints(student, room, 1);
        if (hardCheck.pass) {
          // Calculate soft score using shared ScoringEngine.gs function with candidate weights
          const softRes = calculateSoftScore(student, room, weights, {}, false);

          if (softRes.score > bestScore) {
            bestScore = softRes.score;
            bestRoom = room;
          }
        }
      });

      if (bestRoom && bestScore >= 0) {
        simulatedAllocatedCount++;
        totalScoreSum += bestScore;
        bestRoom.availableBeds--;

        const currentRoom = String(student['Allocated Room'] || '').trim().toUpperCase();
        if (currentRoom && currentRoom !== bestRoom.id) {
          simulatedChanges.push({
            studentId: sId,
            oldRoom: currentRoom,
            newSimulatedRoom: bestRoom.id
          });
        }
      }
    }

    const simulatedAvgScore = simulatedAllocatedCount > 0 ? Math.round(totalScoreSum / simulatedAllocatedCount) : 0;
    const currentStatsRes = getDashboardStats();
    const currentAvgScore = currentStatsRes.success ? currentStatsRes.data.avgScore : 0;

    return createResponse(true, {
      weightsUsed: weights,
      simulatedAllocatedCount,
      simulatedAvgScore,
      currentAvgScore,
      scoreImprovementDelta: simulatedAvgScore - currentAvgScore,
      studentsAffectedCount: simulatedChanges.length,
      roomsChangedCount: new Set(simulatedChanges.map(c => c.newSimulatedRoom)).size,
      sampleChanges: simulatedChanges.slice(0, 5)
    }, 'What-If Simulation calculated successfully.');
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
