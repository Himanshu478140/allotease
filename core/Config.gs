/**
 * AllotEase - Core Configuration Constants & Schema Definitions
 * core/Config.gs - Core Configuration Constants & Property Setup Definitions
 */

const CONFIG = {
  // Google Sheets Tab Names
  SHEETS: {
    STUDENTS: 'Students',
    ROOMS: 'Rooms',
    ALLOCATIONS: 'Allocations',
    PREFERENCES: 'Preferences',
    WAITING_LIST: 'WaitingList',
    SETTINGS: 'Settings',
    PROPERTY_CONFIG: 'PropertyConfig',
    FIELD_MAPPING: 'FieldMapping'
  },

  // Required System Fields for Student Intake Mapping
  REQUIRED_SYSTEM_FIELDS: [
    'Student ID',
    'Name',
    'Gender',
    'Course',
    'Branch',
    'Year',
    'Category',
    'Priority',
    'Special Requirement',
    'Preferred Room Type',
    'Preferred Block',
    'Preferred Floor',
    'Preferred Roommates'
  ],

  // Default Algorithm Scoring Weights (Fallback)
  DEFAULT_WEIGHTS: {
    roomType: 30,
    block: 20,
    floor: 10,
    roommate: 20,
    priority: 10,
    specialReq: 10
  },

  // Default Property Configuration (Soft Factors, Hard Constraints & College Location)
  DEFAULT_PROPERTY_CONFIG: {
    collegeLocation: {
      name: 'Sector 16 C, Dwarka, New Delhi',
      latitude: 28.5921,
      longitude: 77.0460
    },
    softFactors: [
      { key: 'acPreference', label: 'AC / Non-AC Match', weight: 10, studentField: 'AC Preference', roomField: 'AC Status', active: true },
      { key: 'occupancyType', label: 'Bed Capacity Preference (Single/Double/Triple)', weight: 10, studentField: 'Preferred Occupancy', roomField: 'Capacity', active: true },
      { key: 'roomType', label: 'Exact Room Type Match (e.g. Single AC)', weight: 10, studentField: 'Preferred Room Type', roomField: 'Room Type', active: true },
      { key: 'distance', label: 'Home Distance Priority (Outstation Student Queue Factor)', weight: 20, studentField: 'Home Distance (km)', roomField: 'Distance Category', active: false }
    ],
    hardConstraints: {
      genderMatch: true,
      groundFloorAccess: true
    }
  },

  // Priority Tiers (Strict Allocation Order: Lower rank number = Processed First)
  PRIORITY_TIERS: {
    'Emergency/Special Requirement': 1,
    'Final Year': 2,
    'New Students': 3,
    'Other Students': 4
  },

  // Default Priority Values list
  PRIORITY_LIST: [
    'Emergency/Special Requirement',
    'Final Year',
    'New Students',
    'Other Students'
  ],

  // Enums for Statuses
  STUDENT_STATUS: {
    UNALLOCATED: 'Unallocated',
    ALLOCATED: 'Allocated',
    WAITING: 'Waiting List'
  },

  ROOM_STATUS: {
    AVAILABLE: 'Available',
    FULL: 'Full',
    MAINTENANCE: 'Maintenance',
    RESERVED: 'Reserved'
  },

  ALLOCATION_STATUS: {
    ACTIVE: 'Active',
    OVERRIDDEN: 'Overridden',
    CANCELLED: 'Cancelled'
  },

  // Room Types
  ROOM_TYPES: ['Single AC', 'Single Non-AC', 'Double AC', 'Double Non-AC', 'Triple AC', 'Triple Non-AC'],

  // Blocks & Floors
  BLOCKS: ['Block A', 'Block B', 'Block C'],
  FLOORS: [1, 2, 3, 4],

  // Gender Enums
  GENDERS: ['Male', 'Female']
};

/**
 * Returns active settings merged with defaults.
 */
function getActiveSettings() {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(CONFIG.SHEETS.SETTINGS);
    if (!sheet) return CONFIG.DEFAULT_WEIGHTS;

    const data = sheet.getDataRange().getValues();
    const settings = { ...CONFIG.DEFAULT_WEIGHTS };

    for (let i = 1; i < data.length; i++) {
      const key = data[i][0];
      const val = parseFloat(data[i][1]);
      if (key && !isNaN(val)) {
        if (key === 'Weight_RoomType') settings.roomType = val;
        if (key === 'Weight_Block') settings.block = val;
        if (key === 'Weight_Floor') settings.floor = val;
        if (key === 'Weight_Roommate') settings.roommate = val;
        if (key === 'Weight_Priority') settings.priority = val;
        if (key === 'Weight_SpecialReq') settings.specialReq = val;
      }
    }
    return settings;
  } catch (e) {
    return CONFIG.DEFAULT_WEIGHTS;
  }
}

/**
 * Reads Property Configuration (Soft Factors & Hard Constraints) from PropertyConfig sheet tab.
 * Falls back to CONFIG.DEFAULT_PROPERTY_CONFIG if the tab is absent or empty.
 */
function getPropertyConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.PROPERTY_CONFIG);
    if (!sheet) return CONFIG.DEFAULT_PROPERTY_CONFIG;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return CONFIG.DEFAULT_PROPERTY_CONFIG;

    const softFactors = [];
    const hardConstraints = { genderMatch: true, groundFloorAccess: true };
    let collegeLocation = { ...CONFIG.DEFAULT_PROPERTY_CONFIG.collegeLocation };

    for (let i = 1; i < data.length; i++) {
      const rowType = String(data[i][0] || '').trim();
      const key = String(data[i][1] || '').trim();
      const label = String(data[i][2] || '').trim();
      const weight = parseFloat(data[i][3]) || 0;
      const studentField = String(data[i][4] || '').trim();
      const roomField = String(data[i][5] || '').trim();
      const active = data[i][6] === true || String(data[i][6]).toLowerCase() === 'true';

      if (rowType === 'SOFT_FACTOR' && key) {
        softFactors.push({ key, label, weight, studentField, roomField, active });
      } else if (rowType === 'HARD_CONSTRAINT' && key) {
        if (key === 'genderMatch') hardConstraints.genderMatch = active;
        if (key === 'groundFloorAccess') hardConstraints.groundFloorAccess = active;
      } else if (rowType === 'COLLEGE_LOCATION') {
        if (key === 'name') collegeLocation.name = label;
        if (key === 'latitude') collegeLocation.latitude = parseFloat(label) || 28.5921;
        if (key === 'longitude') collegeLocation.longitude = parseFloat(label) || 77.0460;
      }
    }

    if (softFactors.length === 0) {
      return CONFIG.DEFAULT_PROPERTY_CONFIG;
    }

    return { softFactors, hardConstraints, collegeLocation };
  } catch (e) {
    return CONFIG.DEFAULT_PROPERTY_CONFIG;
  }
}

/**
 * Saves Property Configuration to the PropertyConfig sheet tab.
 */
function savePropertyConfig(configData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.PROPERTY_CONFIG);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEETS.PROPERTY_CONFIG);
    } else {
      sheet.clearContents();
    }

    sheet.appendRow(['Type', 'Key', 'Label', 'Weight', 'StudentField', 'RoomField', 'Active']);

    const loc = configData.collegeLocation || CONFIG.DEFAULT_PROPERTY_CONFIG.collegeLocation;
    sheet.appendRow(['COLLEGE_LOCATION', 'name', loc.name || 'Sector 16 C, Dwarka, New Delhi', 0, '', '', true]);
    sheet.appendRow(['COLLEGE_LOCATION', 'latitude', String(loc.latitude || 28.5921), 0, '', '', true]);
    sheet.appendRow(['COLLEGE_LOCATION', 'longitude', String(loc.longitude || 77.0460), 0, '', '', true]);

    const softFactors = configData.softFactors || [];
    softFactors.forEach(f => {
      sheet.appendRow([
        'SOFT_FACTOR',
        f.key,
        f.label,
        f.weight,
        f.studentField || '',
        f.roomField || '',
        f.active !== false
      ]);
    });

    const hc = configData.hardConstraints || { genderMatch: true, groundFloorAccess: true };
    sheet.appendRow(['HARD_CONSTRAINT', 'genderMatch', 'Gender Isolation Check', 0, '', '', hc.genderMatch !== false]);
    sheet.appendRow(['HARD_CONSTRAINT', 'groundFloorAccess', 'Medical / Ground Floor Accessibility Check', 0, '', '', hc.groundFloorAccess !== false]);

    return createResponse(true, configData, 'Property Configuration saved successfully.');
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}

/**
 * Reads Google Form Student Intake Configuration & Field Mapping from FieldMapping sheet tab.
 */
function getFormIntakeConfig() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.FIELD_MAPPING);

    const defaultConfig = {
      formEmbedUrl: '',
      responseSheetUrl: '',
      defaultBaseRent: 8000,
      fieldMapping: {}
    };

    if (!sheet) return defaultConfig;

    const data = sheet.getDataRange().getValues();
    if (data.length <= 1) return defaultConfig;

    const config = { ...defaultConfig, fieldMapping: {} };

    for (let i = 1; i < data.length; i++) {
      const type = String(data[i][0] || '').trim();
      const key = String(data[i][1] || '').trim();
      const val = String(data[i][2] || '').trim();

      if (type === 'CONFIG') {
        if (key === 'FormEmbedUrl') config.formEmbedUrl = val;
        if (key === 'ResponseSheetUrl') config.responseSheetUrl = val;
        if (key === 'DefaultBaseRent') config.defaultBaseRent = parseFloat(val) || 8000;
      } else if (type === 'MAPPING' && key) {
        config.fieldMapping[key] = val;
      }
    }

    return config;
  } catch (e) {
    return { formEmbedUrl: '', responseSheetUrl: '', defaultBaseRent: 8000, fieldMapping: {} };
  }
}

/**
 * Saves Google Form Student Intake Configuration & Field Mapping.
 */
function saveFormIntakeConfig(configData) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = ss.getSheetByName(CONFIG.SHEETS.FIELD_MAPPING);
    if (!sheet) {
      sheet = ss.insertSheet(CONFIG.SHEETS.FIELD_MAPPING);
    } else {
      sheet.clearContents();
    }

    sheet.appendRow(['Type', 'Key', 'Value']);
    sheet.appendRow(['CONFIG', 'FormEmbedUrl', configData.formEmbedUrl || '']);
    sheet.appendRow(['CONFIG', 'ResponseSheetUrl', configData.responseSheetUrl || '']);
    sheet.appendRow(['CONFIG', 'DefaultBaseRent', configData.defaultBaseRent || 8000]);

    const mapping = configData.fieldMapping || {};
    Object.keys(mapping).forEach(sysKey => {
      sheet.appendRow(['MAPPING', sysKey, mapping[sysKey] || '']);
    });

    return createResponse(true, configData, 'Form Intake Configuration and Field Mapping saved successfully.');
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
