/**
 * AllotEase - Local Mock Student API
 * core/mockStudentsApi.js - Student management, intake forms & customization endpoints
 */

(function(window) {
  'use strict';

  const mockStudentsApi = {
    getStudents: async function() {
      if (window.loadLocalMockDB) window.loadLocalMockDB();
      return { success: true, data: window.LocalMockDB ? window.LocalMockDB.students : [] };
    },

    addStudent: async function(studentData) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      let sId = String(studentData.studentId || '').trim().toUpperCase();
      if (!sId) {
        let maxNum = 1000;
        db.students.forEach(s => {
          const match = String(s['Student ID'] || '').match(/STU-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        sId = `STU-${maxNum + 1}`;
      }

      const homePin = String(studentData.homePinCode || studentData['Home PIN Code'] || '').replace(/\D/g, '').trim();
      let geoRes = { distanceKm: null, distanceSource: 'UNAVAILABLE', city: '', district: '', state: '', latitude: null, longitude: null };
      if (typeof window.lookupPinCode === 'function' && homePin) {
        geoRes = window.lookupPinCode(homePin);
      }

      db.students.push({
        'Student ID': sId,
        'Name': studentData.name,
        'Gender': studentData.gender,
        'Course': studentData.course || 'B.Tech',
        'Branch': studentData.branch || 'CSE',
        'Year': studentData.year || '1st Year',
        'Category': studentData.category || 'General',
        'Preferred Room Type': studentData.preferredRoomType || 'Single AC',
        'Preferred Roommates': studentData.preferredRoommates || '',
        'Special Requirement': studentData.specialRequirement || 'None',
        'Priority': studentData.priority || 'Other Students',
        'Home PIN Code': homePin,
        'Home City': geoRes.city || studentData.homeCity || '',
        'Home District': geoRes.district || studentData.homeDistrict || '',
        'Home State': geoRes.state || studentData.homeState || '',
        'Home Latitude': geoRes.latitude,
        'Home Longitude': geoRes.longitude,
        'Distance From College (km)': geoRes.distanceKm,
        'Home Distance (km)': geoRes.distanceKm,
        'Distance Source': geoRes.distanceSource,
        'Allocation Status': 'Unallocated',
        'Allocated Room': '',
        'Allocation Score': 0,
        'Rent Due': 8000,
        'Amount Paid': 0,
        'Payment Status': 'Pending',
        'Custom Fields': studentData.customFields || {}
      });

      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: `Student ${sId} added.` };
    },

    submitStudentIntake: async function(formData) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const config = db.formIntakeConfig || {};
      const isOverride = formData.isOverride === true || formData.override === true || formData.bypassDeadline === true;

      if (!isOverride && config.intakeDeadline) {
        const d = new Date(config.intakeDeadline);
        if (!isNaN(d.getTime()) && new Date() > d) {
          return { success: false, message: 'Registration has closed. Please contact the hostel administration.' };
        }
      }

      let sId = String(formData.studentId || formData['Student ID'] || '').trim().toUpperCase();
      const name = String(formData.name || formData['Name'] || '').trim();
      const gender = String(formData.gender || formData['Gender'] || '').trim();

      if (!name || !gender) {
        return { success: false, message: 'Missing required fields. Name and Gender are required.' };
      }

      if (!sId) {
        let maxNum = 1000;
        db.students.forEach(s => {
          const match = String(s['Student ID'] || '').match(/STU-(\d+)/i);
          if (match) {
            const num = parseInt(match[1], 10);
            if (num > maxNum) maxNum = num;
          }
        });
        sId = `STU-${maxNum + 1}`;
      } else {
        const existing = db.students.find(s => String(s['Student ID']).trim().toUpperCase() === sId);
        if (existing) {
          return { success: false, message: `Student ID '${sId}' already exists in the system. Duplicate Student IDs are not allowed.` };
        }
      }

      const homePin = String(formData.homePinCode || formData['Home PIN Code'] || formData.pinCode || '').replace(/\D/g, '').trim();
      let geoRes = { distanceKm: null, distanceSource: 'UNAVAILABLE', city: '', district: '', state: '', latitude: null, longitude: null };
      if (typeof window.lookupPinCode === 'function' && homePin) {
        geoRes = window.lookupPinCode(homePin);
      }

      const prefType = formData.preferredRoomType || formData['Preferred Room Type'] || 'Single AC';
      const derivedAc = (prefType.toLowerCase().includes('non-ac') || prefType.toLowerCase().includes('non ac')) ? 'Non-AC' : (prefType.toLowerCase().includes('ac') ? 'AC' : '');
      const derivedOcc = prefType.toLowerCase().includes('single') ? 'Single' : (prefType.toLowerCase().includes('double') ? 'Double' : (prefType.toLowerCase().includes('triple') ? 'Triple' : ''));

      const newStudent = {
        'Student ID': sId,
        'Name': name,
        'Gender': gender,
        'Course': formData.course || formData['Course'] || 'B.Tech',
        'Branch': formData.branch || formData['Branch'] || 'CSE',
        'Year': formData.year || formData['Year'] || '1st Year',
        'Category': formData.category || formData['Category'] || 'General',
        'Preferred Room Type': prefType,
        'Preferred Block': formData.preferredBlock || formData['Preferred Block'] || formData['Preferred Hostel Block'] || '',
        'Preferred Hostel Block': formData.preferredBlock || formData['Preferred Block'] || formData['Preferred Hostel Block'] || '',
        'Preferred Floor': formData.preferredFloor || formData['Preferred Floor'] || '',
        'AC Preference': formData.acPreference || formData['AC Preference'] || derivedAc,
        'Preferred Occupancy': formData.preferredOccupancy || formData['Preferred Occupancy'] || derivedOcc,
        'Preferred Roommates': formData.preferredRoommates || formData['Preferred Roommates'] || '',
        'Special Requirement': formData.specialRequirement || formData['Special Requirement'] || 'None',
        'Priority': formData.priority || formData['Priority'] || 'General Applicants / Local Quota',
        'Home PIN Code': homePin,
        'Home City': geoRes.city || formData.homeCity || '',
        'Home District': geoRes.district || formData.homeDistrict || '',
        'Home State': geoRes.state || formData.homeState || '',
        'Home Latitude': geoRes.latitude,
        'Home Longitude': geoRes.longitude,
        'Distance From College (km)': geoRes.distanceKm,
        'Home Distance (km)': geoRes.distanceKm,
        'Distance Source': geoRes.distanceSource,
        'Allocation Status': 'Unallocated',
        'Allocated Room': '',
        'Allocation Score': 0,
        'Rent Due': 8000,
        'Amount Paid': 0,
        'Payment Status': 'Pending',
        'Email Address': formData.email || formData['Email Address'] || formData.emailAddress || '',
        'Email': formData.email || formData['Email Address'] || formData.emailAddress || '',
        'Custom Fields': formData.customFields || formData['Custom Fields'] || {},
        'customFields': formData.customFields || formData['Custom Fields'] || {}
      };

      db.students.push(newStudent);
      if (window.saveLocalMockDB) window.saveLocalMockDB();

      if (typeof window.addActivityLog === 'function') {
        window.addActivityLog({
          title: 'New Student Application',
          details: `${name} (${sId}) submitted application (${formData.course || 'B.Tech'})`,
          type: 'application',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      }

      try {
        window.dispatchEvent(new StorageEvent('storage', { key: 'allotease_students_db' }));
      } catch (e) {}

      return { success: true, data: newStudent, message: 'Application submitted successfully.' };
    },

    updateStudent: async function(studentId, data) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const student = db.students.find(s => s['Student ID'] === studentId);
      if (!student) return { success: false, message: 'Student not found.' };
      if (data.name) student['Name'] = data.name;
      if (data.gender) student['Gender'] = data.gender;
      if (data.branch) student['Branch'] = data.branch;
      if (data.year) student['Year'] = data.year;
      if (data.priority) student['Priority'] = data.priority;
      if (data.specialRequirement) student['Special Requirement'] = data.specialRequirement;
      
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: `Student ${studentId} updated.` };
    },

    deleteStudent: async function(studentId) {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const cleanId = String(studentId || '').trim().toUpperCase();

      // Find student to check for any allocated room
      const student = db.students.find(s => String(s['Student ID'] || '').trim().toUpperCase() === cleanId);
      const allocatedRoomId = student ? (student['Allocated Room'] || '') : '';

      // Remove student record
      db.students = db.students.filter(s => String(s['Student ID'] || '').trim().toUpperCase() !== cleanId);

      // Find and remove allocation records for this student
      const freedAlloc = (db.allocations || []).find(a => String(a['Student ID'] || '').trim().toUpperCase() === cleanId);
      const targetRoomId = allocatedRoomId || (freedAlloc ? freedAlloc['Room ID'] : '');
      db.allocations = (db.allocations || []).filter(a => String(a['Student ID'] || '').trim().toUpperCase() !== cleanId);

      // Remove waiting list entries for this student
      db.waitingList = (db.waitingList || []).filter(w => String(w['Student ID'] || '').trim().toUpperCase() !== cleanId);

      // Free up room bed occupancy if student was allocated
      if (targetRoomId) {
        const room = (db.rooms || []).find(r => String(r['Room ID'] || '').trim().toUpperCase() === String(targetRoomId).trim().toUpperCase());
        if (room) {
          const newOcc = Math.max(0, (parseInt(room['Current Occupancy'] || room['Occupied Beds'] || 1) || 1) - 1);
          room['Current Occupancy'] = newOcc;
          room['Occupied Beds'] = newOcc;
          room['Available Beds'] = Math.max(0, (parseInt(room['Capacity']) || 1) - newOcc);
          if (room['Status'] === 'Full' && room['Available Beds'] > 0) {
            room['Status'] = 'Available';
          }
        }
      }

      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, message: `Student ${studentId} deleted and associated allocation records cleaned.` };
    },

    getFormIntakeConfig: async function() {
      const db = window.LocalMockDB;
      let config = (db && db.formIntakeConfig) ? db.formIntakeConfig : {};
      try {
        const saved = localStorage.getItem('allotease_form_intake_config');
        if (saved) {
          config = JSON.parse(saved);
          if (db) db.formIntakeConfig = config;
        }
      } catch (e) {}
      return { success: true, data: config };
    },

    saveFormIntakeConfig: async function(configData) {
      const db = window.LocalMockDB;
      if (db) {
        db.formIntakeConfig = JSON.parse(JSON.stringify(configData));
      }
      try {
        localStorage.setItem('allotease_form_intake_config', JSON.stringify(configData));
      } catch (e) {}
      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return { success: true, data: configData, message: 'Form Intake Configuration and Field Mapping saved successfully.' };
    },

    fetchResponseSheetHeaders: async function(responseSheetUrl) {
      if (!responseSheetUrl || String(responseSheetUrl).trim() === '') {
        return { success: false, message: 'Please provide a valid Google Form Response Sheet URL or Spreadsheet ID.' };
      }
      if (responseSheetUrl.includes('invalid') || responseSheetUrl.includes('unshared')) {
        return { success: false, message: 'Cannot access response Sheet. Please ensure the response Sheet is shared with edit access or set to "Anyone with the link can view".' };
      }
      const headers = [
        'Timestamp', 'Roll Number / Student ID', 'Full Name', 'Gender',
        'Course Name', 'Branch / Specialization', 'Year of Study', 'Category',
        'Priority Category', 'Special Accommodation Needed', 'Room Type Preference',
        'Preferred Hostel Block', 'Preferred Floor', 'Requested Roommate ID'
      ];
      return { success: true, data: { headers, sheetName: 'Form Responses 1' }, message: `Extracted ${headers.length} column headers from sheet 'Form Responses 1'.` };
    },

    syncFormResponses: async function() {
      const db = window.LocalMockDB;
      if (!db) return { success: false, message: 'LocalMockDB uninitialized.' };

      const config = db.formIntakeConfig || {};
      if (!config.responseSheetUrl) {
        return { success: false, message: 'Please complete Google Form Response Sheet configuration in Property Setup first.' };
      }

      const mapping = config.fieldMapping || {};
      if (Object.keys(mapping).length === 0) {
        return { success: false, message: 'Please complete field mapping in Property Setup / Intake Settings first.' };
      }

      const mockSheetResponses = [
        {
          'Roll Number / Student ID': 'STU-2001',
          'Full Name': 'Vikas Malhotra',
          'Gender': 'Male',
          'Course Name': 'B.Tech',
          'Branch / Specialization': 'CSE',
          'Year of Study': '1st Year',
          'Category': 'General',
          'Priority Category': 'General Applicants / Local Quota',
          'Special Accommodation Needed': 'None',
          'Room Type Preference': 'Single AC',
          'Preferred Hostel Block': 'Block A',
          'Preferred Floor': '1',
          'Requested Roommate ID': ''
        },
        {
          'Roll Number / Student ID': 'STU-2002',
          'Full Name': 'Priya Sen',
          'Gender': 'Female',
          'Course Name': 'B.Tech',
          'Branch / Specialization': 'ECE',
          'Year of Study': '1st Year',
          'Category': 'OBC',
          'Priority Category': 'General Applicants / Local Quota',
          'Special Accommodation Needed': 'Ground Floor / Wheelchair Access',
          'Room Type Preference': 'Double AC',
          'Preferred Hostel Block': 'Block B',
          'Preferred Floor': '1',
          'Requested Roommate ID': ''
        }
      ];

      let syncedCount = 0;
      let skippedCount = 0;

      mockSheetResponses.forEach(row => {
        const studentId = (row[mapping['Student ID']] || row['Roll Number / Student ID'] || '').trim().toUpperCase();
        const name = (row[mapping['Name']] || row['Full Name'] || '').trim();

        if (!studentId || !name) {
          skippedCount++;
          return;
        }

        const existing = db.students.find(s => String(s['Student ID']).trim().toUpperCase() === studentId);
        if (!existing) {
          db.students.push({
            'Student ID': studentId,
            'Name': name,
            'Gender': row[mapping['Gender']] || row['Gender'] || 'Male',
            'Course': row[mapping['Course']] || row['Course Name'] || 'B.Tech',
            'Branch': row[mapping['Branch']] || row['Branch / Specialization'] || 'CSE',
            'Year': row[mapping['Year']] || row['Year of Study'] || '1st Year',
            'Category': row[mapping['Category']] || row['Category'] || 'General',
            'Preferred Room Type': row[mapping['Preferred Room Type']] || row['Room Type Preference'] || 'Single AC',
            'Preferred Roommates': row[mapping['Preferred Roommates']] || row['Requested Roommate ID'] || '',
            'Special Requirement': row[mapping['Special Requirement']] || row['Special Accommodation Needed'] || 'None',
            'Priority': row[mapping['Priority']] || row['Priority Category'] || 'General Applicants / Local Quota',
            'Allocation Status': 'Unallocated',
            'Allocated Room': '',
            'Allocation Score': 0,
            'Rent Due': 8000,
            'Amount Paid': 0,
            'Payment Status': 'Pending'
          });
          syncedCount++;
        } else {
          skippedCount++;
        }
      });

      if (window.saveLocalMockDB) window.saveLocalMockDB();
      return {
        success: true,
        data: { syncedCount, skippedCount },
        message: `Successfully synced ${syncedCount} new student application(s) from Google Form (${skippedCount} existing duplicate(s) skipped).`
      };
    }
  };

  window.mockStudentsApi = mockStudentsApi;

})(window);
