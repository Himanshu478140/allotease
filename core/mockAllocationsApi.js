/**
 * AllotEase - Local Mock Allocations & Analytics API
 * core/mockAllocationsApi.js - Smart Allocation execution, room swaps, checkouts & analytics endpoints
 */

(function(window) {
  'use strict';

  const mockAllocationsApi = {
    getAllocations: async function() {
      const db = window.LocalMockDB;
      if (!db) return { success: true, data: [] };

      // Auto-purge orphan allocation records for deleted students
      const validStudentIds = new Set((db.students || []).map(st => String(st['Student ID'] || '').trim().toUpperCase()));
      db.allocations = (db.allocations || []).filter(a => validStudentIds.has(String(a['Student ID'] || '').trim().toUpperCase()));
      if (window.saveLocalMockDB) window.saveLocalMockDB();

      const enriched = db.allocations.map(a => {
        const student = db.students.find(s => String(s['Student ID'] || '').trim().toUpperCase() === String(a['Student ID'] || '').trim().toUpperCase()) || {};
        const room = db.rooms.find(r => String(r['Room ID'] || '').trim().toUpperCase() === String(a['Room ID'] || '').trim().toUpperCase()) || {};
        return {
          ...a,
          studentName: student['Name'] || a['Student ID'],
          gender: student['Gender'] || '-',
          branch: student['Branch'] || '-',
          year: student['Year'] || '-',
          roomNumber: room['Room Number'] || a['Room ID'],
          block: room['Block'] || '-',
          floor: room['Floor'] || '-'
        };
      });
      return { success: true, data: enriched };
    },

    getWaitingList: async function() {
      const db = window.LocalMockDB;
      if (!db) return { success: true, data: [] };

      // Auto-purge orphan waiting list records for deleted students
      const validStudentIds = new Set((db.students || []).map(st => String(st['Student ID'] || '').trim().toUpperCase()));
      db.waitingList = (db.waitingList || []).filter(w => validStudentIds.has(String(w['Student ID'] || '').trim().toUpperCase()));
      if (window.saveLocalMockDB) window.saveLocalMockDB();

      const list = db.waitingList.map((w, idx) => {
        const student = db.students.find(s => String(s['Student ID'] || '').trim().toUpperCase() === String(w['Student ID'] || '').trim().toUpperCase()) || {};
        return {
          ...w,
          position: idx + 1,
          studentName: student['Name'] || w['Student ID'],
          gender: student['Gender'] || '-',
          branch: student['Branch'] || '-',
          year: student['Year'] || '-',
          specialRequirement: student['Special Requirement'] || 'None'
        };
      });
      return { success: true, data: list };
    },

    getDashboardStats: async function() {
      const db = window.LocalMockDB;
      if (!db) return { success: true, data: { totalStudents: 0, totalRooms: 0 } };

      const totalStudents = db.students.length;
      const totalRooms = db.rooms.length;
      let totalBeds = 0;
      let occupiedBeds = 0;

      db.rooms.forEach(r => {
        totalBeds += parseInt(r['Capacity']) || 0;
        occupiedBeds += parseInt(r['Current Occupancy']) || 0;
      });

      const availableBeds = Math.max(0, totalBeds - occupiedBeds);
      const allocatedStudents = db.students.filter(s => s['Allocation Status'] === 'Allocated').length;
      const unallocatedStudents = db.students.filter(s => s['Allocation Status'] === 'Unallocated').length;
      const waitingStudents = db.waitingList.length;

      const bedUtilization = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
      const allocationPercentage = totalStudents > 0 ? Math.round((allocatedStudents / totalStudents) * 100) : 0;

      const scores = db.students.filter(s => s['Allocation Status'] === 'Allocated').map(s => s['Allocation Score'] || 0);
      const avgScore = scores.length > 0 ? Math.round(scores.reduce((a,b) => a+b, 0) / scores.length) : 0;

      return {
        success: true,
        data: {
          totalStudents, totalRooms, totalBeds, occupiedBeds, availableBeds,
          allocatedStudents, unallocatedStudents, waitingStudents,
          bedUtilization, allocationPercentage, avgScore
        }
      };
    },

    getBeforeVsAfterMetrics: async function() {
      const statsRes = await mockAllocationsApi.getDashboardStats();
      const stats = statsRes.data;
      return {
        success: true,
        data: {
          before: {
            bedUtilization: stats.allocatedStudents === 0 ? 0 : 72,
            preferenceScore: stats.allocatedStudents === 0 ? 0 : 54,
            unallocated: stats.allocatedStudents === 0 ? stats.totalStudents : 12
          },
          after: {
            bedUtilization: stats.bedUtilization,
            preferenceScore: stats.avgScore,
            unallocated: stats.unallocatedStudents + stats.waitingStudents
          }
        }
      };
    },

    sendAllocationEmails: async function(allocationIds = null) {
      const db = window.LocalMockDB;
      const activeAllocations = db ? db.allocations.filter(a => a['Status'] === 'Active') : [];
      return {
        success: true,
        data: { sentCount: activeAllocations.length },
        message: `Sent Gmail notifications to ${activeAllocations.length} allocated applicants.`
      };
    },

    updatePaymentStatus: async function(studentId, amountPaid, rentDue, paymentStatus) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const cleanId = String(studentId || '').trim().toUpperCase();
      const student = db.students.find(s => String(s['Student ID'] || '').trim().toUpperCase() === cleanId);
      if (!student) return { success: false, message: 'Student not found.' };

      student['Amount Paid'] = parseFloat(amountPaid) || 0;
      student['Rent Due'] = parseFloat(rentDue) || 0;
      student['Payment Status'] = paymentStatus || 'Pending';

      if (window.saveLocalMockDB) window.saveLocalMockDB();

      if (typeof window.addActivityLog === 'function') {
        window.addActivityLog({
          title: 'Payment Record Updated',
          details: `Payment status for ${student['Name'] || studentId} updated to ${paymentStatus} (Paid ₹${amountPaid})`,
          type: 'payment',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      return { success: true, message: `Payment record updated for Student ${studentId}.` };
    },

    checkoutStudent: async function(studentId, allocationId = null) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const student = db.students.find(s => s['Student ID'] === studentId);
      if (!student) return { success: false, message: 'Student not found.' };

      const freedRoomId = student['Allocated Room'];
      const alloc = db.allocations.find(a => a['Student ID'] === studentId && a['Status'] === 'Active');
      if (alloc) alloc['Status'] = 'Checked Out';

      student['Allocation Status'] = 'Checked Out';
      student['Allocated Room'] = '';
      student['Allocation Score'] = 0;

      let freedRoom = null;
      if (freedRoomId) {
        freedRoom = db.rooms.find(r => r['Room ID'] === freedRoomId);
        if (freedRoom) {
          freedRoom['Current Occupancy'] = Math.max(0, freedRoom['Current Occupancy'] - 1);
          freedRoom['Available Beds'] = freedRoom['Capacity'] - freedRoom['Current Occupancy'];
          if (freedRoom['Status'] === 'Full') freedRoom['Status'] = 'Available';
        }
      }

      // Check waiting list candidates using mockCheckHardConstraints
      let reallocatedStudent = null;
      if (freedRoom && freedRoom['Available Beds'] > 0) {
        const waitingStudents = db.waitingList.slice();
        const pRanks = { 'Emergency/Special Requirement': 1, 'Final Year': 2, 'New Students': 3, 'Other Students': 4 };
        waitingStudents.sort((a,b) => (pRanks[a['Priority']] || 99) - (pRanks[b['Priority']] || 99));

        for (const candidate of waitingStudents) {
          const cStudent = db.students.find(s => s['Student ID'] === candidate['Student ID']);
          if (cStudent) {
            const hardCheck = window.mockCheckHardConstraints(cStudent, freedRoom, 1);
            if (hardCheck.pass) {
              const softRes = window.mockCalculateSoftScore(cStudent, freedRoom, null, {}, false);
              cStudent['Allocation Status'] = 'Allocated';
              cStudent['Allocated Room'] = freedRoom['Room ID'];
              cStudent['Allocation Score'] = softRes.score;

              freedRoom['Current Occupancy'] += 1;
              freedRoom['Available Beds'] -= 1;
              if (freedRoom['Available Beds'] === 0) freedRoom['Status'] = 'Full';

              db.allocations.push({
                'Allocation ID': 'ALL-' + Math.floor(1000 + Math.random()*9000),
                'Student ID': cStudent['Student ID'],
                'Room ID': freedRoom['Room ID'],
                'Allocation Date': new Date().toISOString().split('T')[0],
                'Allocation Score': softRes.score,
                'Reason': `Auto-Reallocated from Waiting List to freed Room ${freedRoom['Room ID']}: ${softRes.reason}`,
                'Status': 'Active'
              });

              db.waitingList = db.waitingList.filter(w => w['Student ID'] !== cStudent['Student ID']);
              reallocatedStudent = { studentId: cStudent['Student ID'], name: cStudent['Name'], roomId: freedRoom['Room ID'], score: softRes.score };
              break;
            }
          }
        }
      }

      if (window.saveLocalMockDB) window.saveLocalMockDB();
      let msg = `Checkout successful for Student ${studentId}. Bed in Room ${freedRoomId} has been vacated.`;
      if (reallocatedStudent) {
        msg += ` Auto-reallocated freed bed to Waitlist Student ${reallocatedStudent.name} (${reallocatedStudent.studentId}) with score ${reallocatedStudent.score}/100.`;
      } else {
        msg += ` Room ${freedRoomId} remains Available for future allocation runs.`;
      }
      return { success: true, message: msg };
    },

    resetDemo: async function() {
      const db = window.LocalMockDB;
      if (db) {
        db.students = [];
        db.rooms = [];
        db.allocations = [];
        db.waitingList = [];
        db.propertyConfig = JSON.parse(JSON.stringify(window.MOCK_DEFAULT_PROPERTY_CONFIG || {}));
      }
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: 'Local Mock Database reset to clean state.' };
    },

    generateDemoData: async function() {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      if ((db.rooms && db.rooms.length > 0) || (db.students && db.students.length > 0)) {
        if (window.saveLocalMockDB) window.saveLocalMockDB();
        return { success: true, message: 'Existing data preserved.' };
      }

      await mockAllocationsApi.resetDemo();

      db.rooms = [
        { 'Room ID': 'RM-101', 'Block': 'Block A', 'Floor': 1, 'Room Number': 'A-101', 'Room Type': 'Single AC', 'Capacity': 1, 'Current Occupancy': 0, 'Available Beds': 1, 'Gender': 'Male', 'Status': 'Available' },
        { 'Room ID': 'RM-102', 'Block': 'Block A', 'Floor': 1, 'Room Number': 'A-102', 'Room Type': 'Double AC', 'Capacity': 2, 'Current Occupancy': 0, 'Available Beds': 2, 'Gender': 'Male', 'Status': 'Available' },
        { 'Room ID': 'RM-103', 'Block': 'Block A', 'Floor': 1, 'Room Number': 'A-103', 'Room Type': 'Triple Non-AC', 'Capacity': 3, 'Current Occupancy': 0, 'Available Beds': 3, 'Gender': 'Male', 'Status': 'Available' },
        { 'Room ID': 'RM-201', 'Block': 'Block A', 'Floor': 2, 'Room Number': 'A-201', 'Room Type': 'Double AC', 'Capacity': 2, 'Current Occupancy': 0, 'Available Beds': 2, 'Gender': 'Male', 'Status': 'Available' },
        { 'Room ID': 'RM-202', 'Block': 'Block A', 'Floor': 2, 'Room Number': 'A-202', 'Room Type': 'Triple Non-AC', 'Capacity': 3, 'Current Occupancy': 0, 'Available Beds': 3, 'Gender': 'Male', 'Status': 'Available' },
        { 'Room ID': 'RM-203', 'Block': 'Block A', 'Floor': 2, 'Room Number': 'A-203', 'Room Type': 'Single Non-AC', 'Capacity': 1, 'Current Occupancy': 0, 'Available Beds': 1, 'Gender': 'Male', 'Status': 'Maintenance' },
        { 'Room ID': 'RM-104', 'Block': 'Block B', 'Floor': 1, 'Room Number': 'B-104', 'Room Type': 'Single AC', 'Capacity': 1, 'Current Occupancy': 0, 'Available Beds': 1, 'Gender': 'Female', 'Status': 'Available' },
        { 'Room ID': 'RM-105', 'Block': 'Block B', 'Floor': 1, 'Room Number': 'B-105', 'Room Type': 'Double AC', 'Capacity': 2, 'Current Occupancy': 0, 'Available Beds': 2, 'Gender': 'Female', 'Status': 'Available' },
        { 'Room ID': 'RM-106', 'Block': 'Block B', 'Floor': 1, 'Room Number': 'B-106', 'Room Type': 'Triple Non-AC', 'Capacity': 3, 'Current Occupancy': 0, 'Available Beds': 3, 'Gender': 'Female', 'Status': 'Available' },
        { 'Room ID': 'RM-204', 'Block': 'Block B', 'Floor': 2, 'Room Number': 'B-204', 'Room Type': 'Double AC', 'Capacity': 2, 'Current Occupancy': 0, 'Available Beds': 2, 'Gender': 'Female', 'Status': 'Available' },
        { 'Room ID': 'RM-205', 'Block': 'Block B', 'Floor': 2, 'Room Number': 'B-205', 'Room Type': 'Triple Non-AC', 'Capacity': 3, 'Current Occupancy': 0, 'Available Beds': 3, 'Gender': 'Female', 'Status': 'Available' },
        { 'Room ID': 'RM-301', 'Block': 'Block C', 'Floor': 3, 'Room Number': 'C-301', 'Room Type': 'Double Non-AC', 'Capacity': 2, 'Current Occupancy': 0, 'Available Beds': 2, 'Gender': 'Male', 'Status': 'Available' }
      ];

      const maleNames = ['Rahul Sharma', 'Aarav Verma', 'Rohan Gupta', 'Aditya Patel', 'Vikram Singh', 'Siddharth Kumar', 'Kunal Reddy', 'Dev Rao', 'Arjun Joshi', 'Kabir Mehta', 'Yash Nair', 'Varun Chopra', 'Amit Malhotra', 'Rishi Deshmukh', 'Karan Bhat', 'Madhav Saxena', 'Ishaan Kumar', 'Nikhil Sharma', 'Pranav Singh', 'Soham Patel'];
      const femaleNames = ['Ananya Sharma', 'Priya Verma', 'Sneha Gupta', 'Riya Patel', 'Kavya Singh', 'Diya Kumar', 'Meera Reddy', 'Pooja Rao', 'Tanvi Joshi', 'Isha Mehta', 'Simran Nair', 'Shruti Chopra', 'Neha Malhotra', 'Aditi Deshmukh', 'Shreya Bhat', 'Deepika Saxena', 'Kriti Kumar', 'Nisha Sharma', 'Aastha Singh', 'Roshni Patel'];
      const courses = ['B.Tech', 'M.Tech', 'B.Arch'];
      const branches = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT'];
      const roomTypes = ['Single AC', 'Double AC', 'Triple AC', 'Single Non-AC', 'Double Non-AC', 'Triple Non-AC'];

      for (let i = 1; i <= 40; i++) {
        const isMale = i % 2 !== 0;
        const sId = 'STU-' + (1000 + i);
        const name = isMale ? maleNames[(i-1)/2 % maleNames.length] : femaleNames[(i-2)/2 % femaleNames.length];
        
        let priority = 'Other Students';
        let specialReq = 'None';

        if (i <= 3) {
          priority = 'Emergency/Special Requirement';
          specialReq = 'Ground Floor / Wheelchair Access';
        } else if (i % 4 === 0) {
          priority = 'Final Year';
        } else if (i % 3 === 0) {
          priority = 'New Students';
        }

        let prefRoommates = '';
        if (i === 4) prefRoommates = 'STU-1005';
        if (i === 5) prefRoommates = 'STU-1004';

        const rentDue = isMale ? 8000 : 8500;
        const amountPaid = i % 3 === 0 ? 0 : (i % 2 === 0 ? rentDue : 4000);
        const paymentStatus = i % 3 === 0 ? 'Pending' : (i % 2 === 0 ? 'Paid' : 'Overdue');

        db.students.push({
          'Student ID': sId,
          'Name': name,
          'Gender': isMale ? 'Male' : 'Female',
          'Course': courses[i % courses.length],
          'Branch': branches[i % branches.length],
          'Year': i % 4 === 0 ? 'Final Year' : `${(i % 3) + 1}st Year`,
          'Category': 'General',
          'Preferred Room Type': roomTypes[i % roomTypes.length],
          'Preferred Roommates': prefRoommates,
          'Special Requirement': specialReq,
          'Priority': priority,
          'Allocation Status': 'Unallocated',
          'Allocated Room': '',
          'Allocation Score': 0,
          'Rent Due': rentDue,
          'Amount Paid': amountPaid,
          'Payment Status': paymentStatus
        });
      }

      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: 'Local Seeded Demo Data generated (40 Students, 12 Rooms).' };
    },

    runAllocation: async function(customWeights) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const weights = customWeights || null;
      const unallocated = db.students.filter(s => s['Allocation Status'] !== 'Allocated');

      const activePriorityTiers = (typeof state !== 'undefined' && state.priorityTiers && state.priorityTiers.length > 0)
        ? state.priorityTiers
        : window.MOCK_DEFAULT_PRIORITY_TIERS;

      function getPriorityRank(student) {
        if (!student) return 99;

        const sObj = (typeof student === 'object' && student !== null) ? student : { Priority: student };
        const customData = sObj.customFields || sObj['Custom Fields'] || {};

        const pStr = [
          sObj['Priority'],
          sObj['Country'],
          sObj['Home Country'],
          customData['country'],
          customData['Country'],
          customData['nationality'],
          customData['Nationality'],
          sObj['Special Requirement']
        ].map(v => String(v || '').toLowerCase().trim()).filter(Boolean).join(' ');

        if (!pStr) return 99;

        for (let idx = 0; idx < activePriorityTiers.length; idx++) {
          const tier = activePriorityTiers[idx];
          if (tier.active === false) continue;
          const rawName = String(tier.name || '').toLowerCase().trim();
          const tierKey = String(tier.key || '').toLowerCase().trim();

          // 1. International Student Priority
          if (tierKey === 'international' || rawName.includes('internation') || rawName.includes('foreign') || rawName.includes('nri')) {
            const countryVal = String(sObj['Country'] || customData['country'] || customData['Country'] || '').toLowerCase().trim();
            if (pStr.includes('internation') || pStr.includes('foreign') || pStr.includes('nri') || pStr.includes('overseas') || 
                (countryVal && !countryVal.includes('india') && countryVal !== 'in')) {
              return idx + 1;
            }
          }

          // 2. Rank Based + Distance Priority
          if (tierKey === 'rank_distance' || (rawName.includes('rank') && rawName.includes('distance'))) {
            if (pStr.includes('rank') || pStr.includes('merit') || sObj['Rank'] || customData['rank'] || customData['Rank']) {
              return idx + 1;
            }
          }

          // 3. Distance Based Priority
          if (tierKey === 'distance' || (rawName.includes('distance') && !rawName.includes('rank')) || rawName.includes('farthest') || rawName.includes('outstation')) {
            const distKm = parseFloat(sObj['Distance From College (km)'] || sObj['Home Distance (km)']);
            if (!isNaN(distKm) && distKm > 0 && sObj['Distance Source'] !== 'UNAVAILABLE') {
              return idx + 1;
            }
          }

          // 4. First-Come, First-Served Priority
          if (tierKey === 'first_come' || rawName.includes('first') || rawName.includes('come') || rawName.includes('served')) {
            return idx + 1;
          }

          // Generic keyword fallback
          const cleanPStr = pStr.replace(/[^\w\s]/gi, '').trim();
          const cleanTierName = rawName.replace(/[^\w\s]/gi, '').trim();
          if (cleanPStr && cleanTierName && (cleanPStr.includes(cleanTierName) || cleanTierName.includes(cleanPStr))) {
            return idx + 1;
          }
        }
        return 99;
      }

      // Check if Distance Priority factor is enabled in Property Setup or if a Distance priority tier is configured
      const propConfig = (db && db.propertyConfig) ? db.propertyConfig : (window.MOCK_DEFAULT_PROPERTY_CONFIG || {});
      const distanceFactor = (propConfig.softFactors || []).find(f => f.key === 'distance');
      const hasDistanceTier = activePriorityTiers.some(t => {
        const name = String(t.name || '').toLowerCase();
        return name.includes('distance') || name.includes('farthest') || name.includes('outstation');
      });
      const isDistanceEnabled = hasDistanceTier || (distanceFactor ? (distanceFactor.active !== false) : true);
      const distanceWeight = distanceFactor ? (parseFloat(distanceFactor.weight) || 30) : 30;

      function getStudentDistanceKm(student) {
        if (!student) return 0;
        const distVal = parseFloat(student['Distance From College (km)'] || student['Home Distance (km)']);
        return (!isNaN(distVal) && distVal > 0 && student['Distance Source'] !== 'UNAVAILABLE') ? distVal : 0;
      }

      // Find maximum valid distance among unallocated applicants
      let maxValidDistanceKm = 0;
      unallocated.forEach(s => {
        const distKm = getStudentDistanceKm(s);
        if (distKm > maxValidDistanceKm) maxValidDistanceKm = distKm;
      });

      function calculateStudentDistanceScore(student) {
        if (!isDistanceEnabled || maxValidDistanceKm <= 0) return 0;
        const sDist = getStudentDistanceKm(student);
        if (sDist <= 0) return 0;

        const score = (sDist / maxValidDistanceKm) * distanceWeight;
        return Math.round(score * 10) / 10;
      }

      const topTierKey = (activePriorityTiers && activePriorityTiers[0]) 
        ? String(activePriorityTiers[0].key || activePriorityTiers[0].name || '').toLowerCase() 
        : '';

      function getStudentQueuePriorityScore(student) {
        const tierRank = getPriorityRank(student);
        const rankScore = (100 - tierRank * 10);
        const customData = student.customFields || student['Custom Fields'] || {};

        // If First-Come First-Served is set as Rank #1, earlier submission order gets maximum priority bonus!
        const registrationOrderBonus = (topTierKey.includes('first_come') || topTierKey.includes('first'))
          ? Math.max(0, (unallocated.length - unallocated.indexOf(student)) * 2)
          : 0;

        // If Rank Based + Distance is set as Rank #1, academic merit rank adds bonus points!
        let rankMeritBonus = 0;
        if (topTierKey.includes('rank')) {
          const rawRank = parseFloat(student['Rank'] || student['Academic Rank'] || customData['rank'] || customData['Rank'] || 250);
          const validRank = (!isNaN(rawRank) && rawRank > 0) ? rawRank : 250;
          rankMeritBonus = Math.max(0, Math.round(50 - (validRank / 10)));
        }

        const distScore = calculateStudentDistanceScore(student);
        const distKm = getStudentDistanceKm(student);
        
        const totalScore = rankScore + registrationOrderBonus + rankMeritBonus + distScore + (distKm / 100000);

        console.log(`[ALLOCATION QUEUE] Student: ${student['Student ID']} (${student['Name']}) | Priority Rank: #${tierRank} | MeritBonus: +${rankMeritBonus} | DistScore: +${distScore} | TotalScore: ${totalScore.toFixed(4)}`);

        return totalScore;
      }

      // Sort unallocated applicants by total queue priority score descending
      unallocated.sort((a,b) => getStudentQueuePriorityScore(b) - getStudentQueuePriorityScore(a));

      let allocatedCount = 0;
      db.allocations = [];
      db.waitingList = [];

      unallocated.forEach(student => {
        let bestRoom = null;
        let bestScore = -1;
        let bestReason = '';

        const distScore = calculateStudentDistanceScore(student);
        const distSrc = student['Distance Source'] || 'UNAVAILABLE';
        const distKm = student['Distance From College (km)'] || student['Home Distance (km)'];

        let distExplanation = '';
        if (isDistanceEnabled) {
          if (distSrc !== 'UNAVAILABLE' && distKm) {
            distExplanation = `[Distance Priority: ${distKm} km (${distSrc}) -> +${distScore}/${distanceWeight} pts] `;
          } else {
            distExplanation = `[Distance Priority: Unavailable -> +0 pts] `;
          }
        }

        db.rooms.forEach(room => {
          const hardCheck = window.mockCheckHardConstraints(student, room, 1);
          if (hardCheck.pass) {
            const softRes = window.mockCalculateSoftScore(student, room, weights, {}, false);
            if (softRes.score > bestScore) {
              bestScore = softRes.score;
              bestRoom = room;
              bestReason = distExplanation + softRes.reason;
            }
          }
        });

        if (bestRoom && bestScore >= 0) {
          student['Allocation Status'] = 'Allocated';
          student['Allocated Room'] = bestRoom['Room ID'];
          student['Allocation Score'] = Math.round(bestScore);

          bestRoom['Current Occupancy'] += 1;
          bestRoom['Available Beds'] -= 1;
          if (bestRoom['Available Beds'] === 0) bestRoom['Status'] = 'Full';

          db.allocations.push({
            'Allocation ID': 'ALL-' + Math.floor(1000 + Math.random()*9000),
            'Student ID': student['Student ID'],
            'Room ID': bestRoom['Room ID'],
            'Allocation Date': new Date().toISOString().split('T')[0],
            'Allocation Score': Math.round(bestScore),
            'Reason': bestReason,
            'Status': 'Active'
          });

          allocatedCount++;
        } else {
          student['Allocation Status'] = 'Waiting List';
          db.waitingList.push({
            'Student ID': student['Student ID'],
            'Priority': student['Priority'],
            'Request Date': new Date().toISOString().split('T')[0],
            'Reason': 'No eligible room matching hard constraints and bed capacity.',
            'Status': 'Active'
          });
        }
      });

      if (window.saveLocalMockDB) window.saveLocalMockDB();

      if (typeof window.addActivityLog === 'function') {
        window.addActivityLog({
          title: 'Smart Room Allocation Finalized',
          details: `Allocated ${allocatedCount} applicants across rooms (${db.waitingList.length} on waiting list)`,
          type: 'allocation',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      return {
        success: true,
        data: { allocatedCount, waitingCount: db.waitingList.length },
        message: `Local Smart Allocation complete: ${allocatedCount} allocated, ${db.waitingList.length} on waiting list.`
      };
    },

    simulateAllocation: async function(weights) {
      const statsRes = await mockAllocationsApi.getDashboardStats();
      const currentAvg = statsRes.data.avgScore;
      const simAvg = Math.min(100, Math.round(currentAvg * 1.08 + 4));

      return {
        success: true,
        data: {
          weightsUsed: weights,
          simulatedAllocatedCount: 35,
          simulatedAvgScore: simAvg,
          currentAvgScore: currentAvg,
          scoreImprovementDelta: simAvg - currentAvg,
          studentsAffectedCount: 8,
          roomsChangedCount: 5,
          sampleChanges: [
            { studentId: 'STU-1004', oldRoom: 'RM-102', newSimulatedRoom: 'RM-101' },
            { studentId: 'STU-1012', oldRoom: 'RM-201', newSimulatedRoom: 'RM-103' }
          ]
        }
      };
    },

    changeRoom: async function(allocId, newRoomId, reason) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const cleanAllocId = String(allocId || '').trim().toUpperCase();
      const cleanNewRoomId = String(newRoomId || '').trim().toUpperCase();

      const alloc = db.allocations.find(a => String(a['Allocation ID']).trim().toUpperCase() === cleanAllocId);
      if (!alloc) return { success: false, message: 'Allocation record not found.' };

      const oldRoomId = alloc['Room ID'];
      const studentId = alloc['Student ID'];

      const newRoom = db.rooms.find(r => String(r['Room ID']).trim().toUpperCase() === cleanNewRoomId);
      if (!newRoom || (newRoom['Available Beds'] <= 0 && newRoom['Room ID'] !== oldRoomId)) {
        return { success: false, message: 'Target room full or unavailable.' };
      }

      const oldRoom = db.rooms.find(r => String(r['Room ID']).trim().toUpperCase() === String(oldRoomId).trim().toUpperCase());
      if (oldRoom) {
        oldRoom['Current Occupancy'] = Math.max(0, oldRoom['Current Occupancy'] - 1);
        oldRoom['Available Beds'] = oldRoom['Capacity'] - oldRoom['Current Occupancy'];
        if (oldRoom['Status'] === 'Full') oldRoom['Status'] = 'Available';
      }

      newRoom['Current Occupancy'] += 1;
      newRoom['Available Beds'] = Math.max(0, newRoom['Capacity'] - newRoom['Current Occupancy']);
      if (newRoom['Available Beds'] === 0) newRoom['Status'] = 'Full';

      alloc['Original Room ID'] = oldRoomId;
      alloc['Room ID'] = cleanNewRoomId;
      alloc['Status'] = 'Overridden';
      alloc['Reason'] = `Manual Override by Admin from ${oldRoomId} to ${cleanNewRoomId}. Reason: ${reason || 'Administrative re-assignment'}`;

      const student = db.students.find(s => String(s['Student ID']).trim().toUpperCase() === String(studentId).trim().toUpperCase());
      if (student) {
        student['Allocated Room'] = cleanNewRoomId;
        student['Allocation Status'] = 'Allocated';
      }

      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: `Student ${studentId} manually re-assigned to Room ${cleanNewRoomId}. Status updated to Overridden.` };
    },

    sendAllocationEmails: async function(allocationIds = null) {
      const db = window.LocalMockDB;
      if (!db || !db.allocations || db.allocations.length === 0) {
        return { success: false, message: 'No active allocations found to dispatch emails.' };
      }

      let activeAllocations = db.allocations.filter(a => a['Status'] !== 'Cancelled');
      if (allocationIds && allocationIds.length > 0) {
        activeAllocations = activeAllocations.filter(a => allocationIds.includes(a['Allocation ID']));
      }

      const emailsSent = activeAllocations.map(alloc => {
        const student = (db.students || []).find(s => String(s['Student ID']).toUpperCase() === String(alloc['Student ID']).toUpperCase()) || {};
        const room = (db.rooms || []).find(r => String(r['Room ID']).toUpperCase() === String(alloc['Room ID']).toUpperCase()) || {};
        
        const sName = student['Name'] || student['Full Name'] || alloc['Student ID'];
        const sEmail = student['Email'] || student['Email Address'] || `${String(alloc['Student ID']).toLowerCase()}@college.edu`;
        const rNum = room['Room Number'] || alloc['Room ID'];
        const block = room['Block'] || 'Main Hostel';
        const floor = room['Floor'] || '1';

        return {
          studentId: alloc['Student ID'],
          studentName: sName,
          email: sEmail,
          subject: `[AllotEase] Hostel Room Allotment Notice - ${sName}`,
          body: `Dear ${sName},\n\nYour hostel room allocation has been processed successfully!\n\nAllocation ID: ${alloc['Allocation ID']}\nAssigned Room: ${rNum} (${block}, Floor ${floor})\nSatisfaction Match Score: ${alloc['Allocation Score']}/100\nAllocation Date: ${alloc['Allocation Date']}\n\nScore Breakdown:\n${alloc['Reason']}\n\nBest regards,\nHostel Administration & AllotEase`
        };
      });

      return {
        success: true,
        data: { sentCount: emailsSent.length, emails: emailsSent },
        message: `Dispatched ${emailsSent.length} Gmail Allotment Notification(s) via Google Apps Script MailApp API.`
      };
    },

    exportCSV: async function(sheetName) {
      const db = window.LocalMockDB;
      const targetName = String(sheetName || 'Allocations').trim().toLowerCase();
      let rows = [];

      if (targetName.includes('student')) {
        rows = db ? db.students : [];
      } else if (targetName.includes('room')) {
        rows = db ? db.rooms : [];
      } else {
        rows = db ? db.allocations : [];
      }

      if (rows.length === 0) {
        return { success: false, message: `No data records found to export for '${sheetName}'.` };
      }

      const headers = Object.keys(rows[0]);
      let csvContent = headers.join(',') + '\n';

      rows.forEach(row => {
        const line = headers.map(h => {
          let val = row[h];
          if (typeof val === 'object') val = JSON.stringify(val);
          val = String(val || '').replace(/"/g, '""');
          return `"${val}"`;
        }).join(',');
        csvContent += line + '\n';
      });

      return {
        success: true,
        data: { csvContent, filename: `AllotEase_${sheetName || 'Export'}_${new Date().toISOString().split('T')[0]}.csv` },
        message: `Generated CSV export with ${rows.length} row(s).`
      };
    }
  };

  window.mockAllocationsApi = mockAllocationsApi;

})(window);
