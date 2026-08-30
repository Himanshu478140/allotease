/**
 * AllotEase - Local Mock Store & Storage Persistence Layer
 * core/mockStore.js - Handles LocalMockDB state, defaults & localStorage sync
 */

(function (window) {
  'use strict';

  // Default Property Configuration (Soft Factors, Hard Constraints & College Location) for Local Mock
  const MOCK_DEFAULT_PROPERTY_CONFIG = {
    collegeLocation: {
      name: 'Sector 16 C, Dwarka, New Delhi',
      latitude: 28.5921,
      longitude: 77.0460
    },
    softFactors: [
      { key: 'acPreference', label: 'AC / Non-AC Match', weight: 10, studentField: 'AC Preference', roomField: 'AC Status', active: true },
      { key: 'occupancyType', label: 'Bed Capacity Preference (Single/Double/Triple)', weight: 10, studentField: 'Preferred Occupancy', roomField: 'Capacity', active: true },
      { key: 'roomType', label: 'Exact Room Type Match (e.g. Single AC)', weight: 10, studentField: 'Preferred Room Type', roomField: 'Room Type', active: true },
      { key: 'distance', label: 'Home Distance Priority (Outstation Student Queue Factor)', weight: 30, studentField: 'Home Distance (km)', roomField: 'Distance Category', active: true }
    ],
    hardConstraints: {
      genderMatch: true,
      groundFloorAccess: true
    },
    autoEmailNotices: true
  };

  const MOCK_DEFAULT_PRIORITY_TIERS = [
    { rank: 1, key: 'distance', name: 'Distance Based Priority', desc: 'Outstation applicants residing farther from campus (calculated via home PIN code distance)', active: true },
    { rank: 2, key: 'international', name: 'International Student Priority', desc: 'Foreign, NRI, or international applicants residing outside the host country', active: true },
    { rank: 3, key: 'first_come', name: 'First-Come, First-Served', desc: 'Submission timestamp / registration order priority for early applicants', active: true },
    { rank: 4, key: 'rank_distance', name: 'Rank Based + Distance Priority', desc: 'Composite priority combining academic merit/rank score with home distance priority', active: true }
  ];

  const MOCK_DEFAULT_BUILDING_LAYOUT = [];

  let initialPriorityTiers = MOCK_DEFAULT_PRIORITY_TIERS;
  try {
    const savedPrio = localStorage.getItem('allotease_priorityTiers');
    if (savedPrio) initialPriorityTiers = JSON.parse(savedPrio);
  } catch (e) { }

  let initialBuildingLayout = MOCK_DEFAULT_BUILDING_LAYOUT;
  try {
    const savedLayout = localStorage.getItem('allotease_building_layout');
    if (savedLayout) initialBuildingLayout = JSON.parse(savedLayout);
  } catch (e) { }

  // Local In-Memory Mock Database for Local Browser Preview
  const LocalMockDB = {
    students: [],
    rooms: [],
    allocations: [],
    waitingList: [],
    priorityTiers: initialPriorityTiers,
    buildingLayout: initialBuildingLayout,
    settings: {
      roomType: 30, block: 20, floor: 10, roommate: 20, priority: 10, specialReq: 10
    },
    propertyConfig: JSON.parse(JSON.stringify(MOCK_DEFAULT_PROPERTY_CONFIG)),
    formIntakeConfig: {
      formEmbedUrl: 'https://docs.google.com/forms/d/e/1FAIpQLScDemoFormId12345/viewform?embedded=true',
      responseSheetUrl: 'https://docs.google.com/spreadsheets/d/1DemoSheetId1234567890/edit',
      defaultBaseRent: 8000,
      courses: ['B.Tech', 'M.Tech', 'B.Arch', 'MBA'],
      branches: ['CSE', 'ECE', 'ME', 'CE', 'EEE', 'IT'],
      fieldVisibility: {
        studentId: true,
        capacity: true,
        acPref: true,
        block: true,
        floor: true,
        priority: true,
        specialReq: true,
        roommates: true
      },
      customFields: [
        { id: 'f_hometown', label: 'Hometown / State', type: 'text', options: '', required: false },
        { id: 'f_parent_phone', label: 'Parent / Guardian Phone', type: 'text', options: '', required: false },
        { id: 'f_dietary', label: 'Food Preference', type: 'select', options: 'Veg, Non-Veg, Jain', required: false }
      ],
      fieldMapping: {
        'Student ID': 'Roll Number / Student ID',
        'Name': 'Full Name',
        'Gender': 'Gender',
        'Course': 'Course Name',
        'Branch': 'Branch / Specialization',
        'Year': 'Year of Study',
        'Category': 'Category',
        'Priority': 'Priority Category',
        'Special Requirement': 'Special Accommodation Needed',
        'Preferred Room Type': 'Room Type Preference',
        'Preferred Block': 'Preferred Hostel Block',
        'Preferred Floor': 'Preferred Floor',
        'Preferred Roommates': 'Requested Roommate ID'
      }
    }
  };

  function saveLocalMockDB() {
    try {
      localStorage.setItem('allotease_students_db', JSON.stringify(LocalMockDB.students || []));
      localStorage.setItem('allotease_rooms_db', JSON.stringify(LocalMockDB.rooms || []));
      localStorage.setItem('allotease_allocations_db', JSON.stringify(LocalMockDB.allocations || []));
      localStorage.setItem('allotease_waitinglist_db', JSON.stringify(LocalMockDB.waitingList || []));
      localStorage.setItem('allotease_priorityTiers', JSON.stringify(LocalMockDB.priorityTiers || []));
      localStorage.setItem('allotease_building_layout', JSON.stringify(LocalMockDB.buildingLayout || []));
      localStorage.setItem('allotease_form_intake_config', JSON.stringify(LocalMockDB.formIntakeConfig || {}));
      localStorage.setItem('allotease_property_config', JSON.stringify(LocalMockDB.propertyConfig || {}));
    } catch (e) {
      console.warn('Error saving LocalMockDB to localStorage:', e);
    }
  }

  function loadLocalMockDB() {
    try {
      const s = localStorage.getItem('allotease_students_db');
      if (s) LocalMockDB.students = JSON.parse(s);

      const r = localStorage.getItem('allotease_rooms_db');
      if (r) LocalMockDB.rooms = JSON.parse(r);

      const a = localStorage.getItem('allotease_allocations_db');
      if (a) LocalMockDB.allocations = JSON.parse(a);

      const w = localStorage.getItem('allotease_waitinglist_db');
      if (w) LocalMockDB.waitingList = JSON.parse(w);

      const p = localStorage.getItem('allotease_priorityTiers');
      if (p) LocalMockDB.priorityTiers = JSON.parse(p);

      const b = localStorage.getItem('allotease_building_layout');
      if (b) LocalMockDB.buildingLayout = JSON.parse(b);

      const f = localStorage.getItem('allotease_form_intake_config');
      if (f) LocalMockDB.formIntakeConfig = JSON.parse(f);

      const pc = localStorage.getItem('allotease_property_config');
      if (pc) LocalMockDB.propertyConfig = JSON.parse(pc);

      // Auto-purge orphan allocation and waiting list records for deleted students
      const validStudentIds = new Set((LocalMockDB.students || []).map(st => String(st['Student ID'] || '').trim().toUpperCase()));
      LocalMockDB.allocations = (LocalMockDB.allocations || []).filter(a => validStudentIds.has(String(a['Student ID'] || '').trim().toUpperCase()));
      LocalMockDB.waitingList = (LocalMockDB.waitingList || []).filter(w => validStudentIds.has(String(w['Student ID'] || '').trim().toUpperCase()));

      // Set default room Gender to Any so no rooms block male/female applicants unless customized
      if (Array.isArray(LocalMockDB.rooms)) {
        LocalMockDB.rooms.forEach(r => {
          if (!r['Gender'] || r['Gender'] === 'Male' || r['Gender'] === 'Female') {
            r['Gender'] = 'Any';
          }
        });
      }

      saveLocalMockDB();
    } catch (e) {
      console.warn('Error loading LocalMockDB from localStorage:', e);
    }
  }

  // Load persisted DB state on init
  loadLocalMockDB();

  // Expose on window scope
  window.MOCK_DEFAULT_PROPERTY_CONFIG = MOCK_DEFAULT_PROPERTY_CONFIG;
  window.MOCK_DEFAULT_PRIORITY_TIERS = MOCK_DEFAULT_PRIORITY_TIERS;
  window.MOCK_DEFAULT_BUILDING_LAYOUT = MOCK_DEFAULT_BUILDING_LAYOUT;
  window.LocalMockDB = LocalMockDB;
  window.saveLocalMockDB = saveLocalMockDB;
  window.loadLocalMockDB = loadLocalMockDB;

})(window);
