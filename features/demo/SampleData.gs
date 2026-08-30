/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * features/demo/SampleData.gs - Seeded Deterministic Hackathon Demo Generator & Reset Demo Action
 */

/**
 * Resets the entire Google Sheets database to a clean slate.
 */
function resetDemo() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheetNames = [
      CONFIG.SHEETS.STUDENTS,
      CONFIG.SHEETS.ROOMS,
      CONFIG.SHEETS.ALLOCATIONS,
      CONFIG.SHEETS.PREFERENCES,
      CONFIG.SHEETS.WAITING_LIST
    ];

    sheetNames.forEach(name => {
      let sheet = ss.getSheetByName(name);
      if (sheet) {
        sheet.clear();
      }
    });

    // Re-initialize headers
    initializeSheets(ss);

    return createResponse(true, null, 'Demo database reset successfully to clean baseline state.');
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Generates 100% deterministic demo data using Mulberry32 PRNG (Seed: 42).
 * Creates 40 students and 12 rooms (36 total bed capacity).
 */
function generateDemoData() {
  try {
    // 1. Reset first to avoid duplicate collisions
    resetDemo();

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const prng = createSeededPRNG(42); // Fixed seed for reproducible hackathon demo

    // Demo Rooms Definition (12 Rooms = 36 total beds)
    const demoRooms = [
      ['RM-101', 'Block A', 1, 'A-101', 'Single AC', 1, 0, 1, 'Male', 'Available'],
      ['RM-102', 'Block A', 1, 'A-102', 'Double AC', 2, 0, 2, 'Male', 'Available'],
      ['RM-103', 'Block A', 1, 'A-103', 'Triple Non-AC', 3, 0, 3, 'Male', 'Available'],
      ['RM-201', 'Block A', 2, 'A-201', 'Double AC', 2, 0, 2, 'Male', 'Available'],
      ['RM-202', 'Block A', 2, 'A-202', 'Triple Non-AC', 3, 0, 3, 'Male', 'Available'],
      ['RM-203', 'Block A', 2, 'A-203', 'Single Non-AC', 1, 0, 1, 'Male', 'Maintenance'],
      ['RM-104', 'Block B', 1, 'B-104', 'Single AC', 1, 0, 1, 'Female', 'Available'],
      ['RM-105', 'Block B', 1, 'B-105', 'Double AC', 2, 0, 2, 'Female', 'Available'],
      ['RM-106', 'Block B', 1, 'B-106', 'Triple Non-AC', 3, 0, 3, 'Female', 'Available'],
      ['RM-204', 'Block B', 2, 'B-204', 'Double AC', 2, 0, 2, 'Female', 'Available'],
      ['RM-205', 'Block B', 2, 'B-205', 'Triple Non-AC', 3, 0, 3, 'Female', 'Available'],
      ['RM-301', 'Block C', 3, 'C-301', 'Double Non-AC', 2, 0, 2, 'Male', 'Available']
    ];

    const roomSheet = ss.getSheetByName(CONFIG.SHEETS.ROOMS);
    demoRooms.forEach(row => roomSheet.appendRow(row));

    // Student Names Pool
    const maleFirstNames = ['Rahul', 'Aarav', 'Rohan', 'Aditya', 'Vikram', 'Siddharth', 'Kunal', 'Dev', 'Arjun', 'Kabir', 'Yash', 'Varun', 'Amit', 'Priya', 'Ananya', 'Rishi', 'Karan', 'Madhav', 'Ishaan', 'Nikhil'];
    const femaleFirstNames = ['Ananya', 'Priya', 'Sneha', 'Riya', 'Kavya', 'Diya', 'Meera', 'Pooja', 'Tanvi', 'Isha', 'Simran', 'Shruti', 'Neha', 'Aditi', 'Shreya', 'Deepika', 'Kriti', 'Nisha', 'Aastha', 'Roshni'];
    const lastNames = ['Sharma', 'Verma', 'Gupta', 'Patel', 'Singh', 'Kumar', 'Reddy', 'Rao', 'Joshi', 'Mehta', 'Nair', 'Chopra', 'Malhotra', 'Deshmukh', 'Bhat', 'Saxena'];

    const branches = ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT'];
    const courses = ['B.Tech', 'M.Tech', 'B.Arch'];
    const years = ['1st Year', '2nd Year', '3rd Year', 'Final Year'];
    const roomTypes = ['Single AC', 'Double AC', 'Triple AC', 'Triple Non-AC', 'Single Non-AC', 'Double Non-AC'];

    const studentSheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const prefSheet = ss.getSheetByName(CONFIG.SHEETS.PREFERENCES);

    const generatedStudents = [];

    for (let i = 1; i <= 40; i++) {
      const sId = 'STU-' + (1000 + i);
      const isMale = i % 2 !== 0; // 20 Male, 20 Female
      const gender = isMale ? 'Male' : 'Female';
      const firstName = isMale ? seededChoice(prng, maleFirstNames) : seededChoice(prng, femaleFirstNames);
      const lastName = seededChoice(prng, lastNames);
      const name = `${firstName} ${lastName}`;

      const course = seededChoice(prng, courses);
      const branch = seededChoice(prng, branches);
      const year = seededChoice(prng, years);
      const prefRoomType = seededChoice(prng, roomTypes);

      // Controlled Priorities & Special Requirements
      let priority = 'Other Students';
      let specialReq = 'None';

      if (i <= 3) {
        priority = 'Emergency/Special Requirement';
        specialReq = 'Ground Floor / Wheelchair Access';
      } else if (year === 'Final Year') {
        priority = 'Final Year';
      } else if (year === '1st Year') {
        priority = 'New Students';
      } else if (i % 7 === 0) {
        specialReq = 'Medical Single Room';
      }

      // Roommate pairings: e.g. STU-1004 requests STU-1005
      let prefRoommates = '';
      if (i === 4) prefRoommates = 'STU-1005';
      if (i === 5) prefRoommates = 'STU-1004';
      if (i === 14) prefRoommates = 'STU-1015';
      if (i === 15) prefRoommates = 'STU-1014';

      const prefBlock = isMale ? 'Block A' : 'Block B';
      const prefFloor = seededChoice(prng, [1, 2]);

      // Append Student
      studentSheet.appendRow([
        sId,
        name,
        gender,
        course,
        branch,
        year,
        'General',
        prefRoomType,
        prefRoommates,
        specialReq,
        priority,
        CONFIG.STUDENT_STATUS.UNALLOCATED,
        '', // Allocated Room
        0   // Allocation Score
      ]);

      // Append Preferences
      prefSheet.appendRow([
        sId,
        prefRoomType,
        prefBlock,
        prefFloor,
        prefRoommates,
        'Quiet study room preferred'
      ]);

      generatedStudents.push(sId);
    }

    return createResponse(true, {
      studentCount: 40,
      roomCount: 12,
      totalBeds: 24
    }, 'Hackathon Seeded Demo Data generated: 40 Students & 12 Rooms ready.');
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
