/**
 * AllotEase - Dual-Runtime API Adapter Layer (Orchestrator)
 * core/apiAdapter.js - Routes calls between Google Apps Script backend and Local Mock APIs
 */

(function(window) {
  'use strict';

  // Check runtime environment
  const isGoogleAppsScript = typeof window.google !== 'undefined' && 
                             window.google.script && 
                             window.google.script.run;

  console.log(`[API Adapter] Initialized. Runtime Mode: ${isGoogleAppsScript ? 'Google Apps Script (GAS)' : 'Local Browser Simulator'}`);

  // Live Google Apps Script Web App Deployment URL
  window.GAS_API_URL = 'https://script.google.com/macros/s/AKfycbw5vLt0X8VP8_5mbPzMC7HwqoLQjiMf2R57MFX7_U0sceyGf9sW9q3PwZH1PE_mMQNA/exec';

  /**
   * Helper to invoke Google Apps Script backend as a Promise
   */
  function callGasFunction(funcName, ...args) {
    if (isGoogleAppsScript) {
      return new Promise((resolve, reject) => {
        window.google.script.run
          .withSuccessHandler(response => resolve(response))
          .withFailureHandler(error => reject(error))
          [funcName](...args);
      });
    } else if (window.GAS_API_URL) {
      // Remote HTTP fetch bridge to Apps Script Web App for GitHub Pages
      const postData = JSON.stringify({ action: funcName, args: args });
      return fetch(window.GAS_API_URL, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: postData,
        redirect: 'follow'
      }).then(r => r.json()).catch(err => {
        console.warn('GAS fetch notice:', err);
        return LocalMockAPI[funcName] ? LocalMockAPI[funcName](...args) : { success: false };
      });
    }
  }

  // Combined LocalMockAPI delegator
  const LocalMockAPI = {
    // Rooms & Property Setup
    getRooms: () => window.mockRoomsApi.getRooms(),
    saveRooms: (rooms) => window.mockRoomsApi.saveRooms(rooms),
    addRoom: (data) => window.mockRoomsApi.addRoom(data),
    updateRoom: (id, data) => window.mockRoomsApi.updateRoom(id, data),
    deleteRoom: (id) => window.mockRoomsApi.deleteRoom(id),
    getBuildingLayout: () => window.mockRoomsApi.getBuildingLayout(),
    saveBuildingLayout: (layout) => window.mockRoomsApi.saveBuildingLayout(layout),
    getPriorityTiers: () => window.mockRoomsApi.getPriorityTiers(),
    savePriorityTiers: (tiers) => window.mockRoomsApi.savePriorityTiers(tiers),
    getPropertyConfig: () => window.mockRoomsApi.getPropertyConfig(),
    savePropertyConfig: (softFactors, hardConstraints, collegeLocation, autoEmailNotices) => window.mockRoomsApi.savePropertyConfig(softFactors, hardConstraints, collegeLocation, autoEmailNotices),

    // Students & Form Intake
    getStudents: () => window.mockStudentsApi.getStudents(),
    addStudent: (data) => window.mockStudentsApi.addStudent(data),
    submitStudentIntake: (formData) => window.mockStudentsApi.submitStudentIntake(formData),
    updateStudent: (id, data) => window.mockStudentsApi.updateStudent(id, data),
    deleteStudent: (id) => window.mockStudentsApi.deleteStudent(id),
    getFormIntakeConfig: () => window.mockStudentsApi.getFormIntakeConfig(),
    saveFormIntakeConfig: (config) => window.mockStudentsApi.saveFormIntakeConfig(config),
    fetchResponseSheetHeaders: (url) => window.mockStudentsApi.fetchResponseSheetHeaders(url),
    syncFormResponses: () => window.mockStudentsApi.syncFormResponses(),

    // Allocations & Analytics
    getAllocations: () => window.mockAllocationsApi.getAllocations(),
    getWaitingList: () => window.mockAllocationsApi.getWaitingList(),
    getDashboardStats: () => window.mockAllocationsApi.getDashboardStats(),
    getBeforeVsAfterMetrics: () => window.mockAllocationsApi.getBeforeVsAfterMetrics(),
    sendAllocationEmails: (ids) => window.mockAllocationsApi.sendAllocationEmails(ids),
    updatePaymentStatus: (id, paid, due, status) => window.mockAllocationsApi.updatePaymentStatus(id, paid, due, status),
    checkoutStudent: (id, allocId) => window.mockAllocationsApi.checkoutStudent(id, allocId),
    runAllocation: (weights) => window.mockAllocationsApi.runAllocation(weights),
    simulateAllocation: (weights) => window.mockAllocationsApi.simulateAllocation(weights),
    changeRoom: (allocId, newRoomId, reason) => window.mockAllocationsApi.changeRoom(allocId, newRoomId, reason),
    resetDemo: () => window.mockAllocationsApi.resetDemo(),
    generateDemoData: () => window.mockAllocationsApi.generateDemoData(),
    exportCSV: (sheetName) => window.mockAllocationsApi.exportCSV(sheetName)
  };

  // Expose clean global API object
  window.api = {
    isGas: isGoogleAppsScript,
    getBuildingLayout: () => isGoogleAppsScript ? callGasFunction('getBuildingLayout') : LocalMockAPI.getBuildingLayout(),
    saveBuildingLayout: async (layout) => {
      try { callGasFunction('saveBuildingLayout', layout); } catch(e){}
      return LocalMockAPI.saveBuildingLayout(layout);
    },
    getPriorityTiers: () => isGoogleAppsScript ? callGasFunction('getPriorityTiers') : LocalMockAPI.getPriorityTiers(),
    savePriorityTiers: async (tiers) => {
      try { callGasFunction('savePriorityTiers', tiers); } catch(e){}
      return LocalMockAPI.savePriorityTiers(tiers);
    },
    getPropertyConfig: () => isGoogleAppsScript ? callGasFunction('getPropertyConfig') : LocalMockAPI.getPropertyConfig(),
    savePropertyConfig: async (softFactors, hardConstraints, collegeLocation, autoEmailNotices) => {
      try { callGasFunction('savePropertyConfig', { softFactors, hardConstraints, collegeLocation, autoEmailNotices }); } catch(e){}
      return LocalMockAPI.savePropertyConfig(softFactors, hardConstraints, collegeLocation, autoEmailNotices);
    },
    getFormIntakeConfig: async () => {
      const localRes = await LocalMockAPI.getFormIntakeConfig();
      // Background async sync with Apps Script without hanging UI
      callGasFunction('getFormIntakeConfig').then(gasRes => {
        if (gasRes && gasRes.success && gasRes.data) {
          if (window.LocalMockDB) window.LocalMockDB.formIntakeConfig = gasRes.data;
        }
      }).catch(() => {});
      return localRes;
    },
    saveFormIntakeConfig: async (config) => {
      try { callGasFunction('saveFormIntakeConfig', config); } catch(e){}
      return LocalMockAPI.saveFormIntakeConfig(config);
    },
    fetchResponseSheetHeaders: (url) => isGoogleAppsScript ? callGasFunction('fetchResponseSheetHeaders', url) : LocalMockAPI.fetchResponseSheetHeaders(url),
    syncFormResponses: () => isGoogleAppsScript ? callGasFunction('syncFormResponses') : LocalMockAPI.syncFormResponses(),
    sendAllocationEmails: (ids) => isGoogleAppsScript ? callGasFunction('sendAllocationEmails', ids) : LocalMockAPI.sendAllocationEmails(ids),
    updatePaymentStatus: async (id, paid, due, status) => {
      try { callGasFunction('updatePaymentStatus', id, paid, due, status); } catch(e){}
      return LocalMockAPI.updatePaymentStatus(id, paid, due, status);
    },
    checkoutStudent: async (id, allocId) => {
      try { callGasFunction('checkoutStudent', id, allocId); } catch(e){}
      return LocalMockAPI.checkoutStudent(id, allocId);
    },
    resetDemo: () => isGoogleAppsScript ? callGasFunction('resetDemo') : LocalMockAPI.resetDemo(),
    generateDemoData: () => isGoogleAppsScript ? callGasFunction('generateDemoData') : LocalMockAPI.generateDemoData(),
    getStudents: () => isGoogleAppsScript ? callGasFunction('getStudents') : LocalMockAPI.getStudents(),
    getRooms: () => isGoogleAppsScript ? callGasFunction('getRooms') : LocalMockAPI.getRooms(),
    saveRooms: async (rooms) => {
      try { callGasFunction('saveRooms', rooms); } catch(e){}
      return LocalMockAPI.saveRooms(rooms);
    },
    getAllocations: () => isGoogleAppsScript ? callGasFunction('getAllocations') : LocalMockAPI.getAllocations(),
    getWaitingList: () => isGoogleAppsScript ? callGasFunction('getWaitingList') : LocalMockAPI.getWaitingList(),
    getDashboardStats: () => isGoogleAppsScript ? callGasFunction('getDashboardStats') : LocalMockAPI.getDashboardStats(),
    getBeforeVsAfterMetrics: () => isGoogleAppsScript ? callGasFunction('getBeforeVsAfterMetrics') : LocalMockAPI.getBeforeVsAfterMetrics(),
    getReportData: () => isGoogleAppsScript ? callGasFunction('getReportData') : (async () => ({ success: true, data: { byBranch: { CSE: 16, ECE: 12, ME: 8, CE: 4 }, byYear: { '1st Year': 10, '2nd Year': 10, '3rd Year': 10, 'Final Year': 10 } } }))(),
    calculateScore: (student, room, weights) => window.mockCalculateSoftScore(student, room, weights),
    runAllocation: async (weights) => {
      try { callGasFunction('runSmartAllocation', weights); } catch(e){}
      return LocalMockAPI.runAllocation(weights);
    },
    simulateAllocation: (weights) => isGoogleAppsScript ? callGasFunction('simulateAllocation', weights) : LocalMockAPI.simulateAllocation(weights),
    changeRoom: async (allocId, newRoomId, reason) => {
      try { callGasFunction('changeRoom', allocId, newRoomId, reason); } catch(e){}
      return LocalMockAPI.changeRoom(allocId, newRoomId, reason);
    },
    addStudent: async (data) => {
      try { callGasFunction('addStudent', data); } catch(e){}
      return LocalMockAPI.addStudent(data);
    },
    submitStudentIntake: async (formData) => {
      // 1. Send HTTP request to live Google Apps Script / Google Sheet backend
      let gasRes = null;
      try {
        gasRes = await callGasFunction('submitStudentIntake', formData);
      } catch(e) { console.warn('GAS HTTP bridge fetch notice:', e); }

      // 2. Also record in local store for instant UI rendering
      const mockRes = await LocalMockAPI.submitStudentIntake(formData);

      return (gasRes && gasRes.success) ? gasRes : mockRes;
    },
    updateStudent: async (id, data) => {
      try { callGasFunction('updateStudent', id, data); } catch(e){}
      return LocalMockAPI.updateStudent(id, data);
    },
    deleteStudent: async (id) => {
      // Send delete request to Google Apps Script Google Sheet backend
      try { callGasFunction('deleteStudent', id); } catch(e){}
      return LocalMockAPI.deleteStudent(id);
    },
    addRoom: async (data) => {
      try { callGasFunction('addRoom', data); } catch(e){}
      return LocalMockAPI.addRoom(data);
    },
    updateRoom: async (id, data) => {
      try { callGasFunction('updateRoom', id, data); } catch(e){}
      return LocalMockAPI.updateRoom(id, data);
    },
    deleteRoom: async (id) => {
      try { callGasFunction('deleteRoom', id); } catch(e){}
      return LocalMockAPI.deleteRoom(id);
    },
    exportCSV: (sheetName) => isGoogleAppsScript ? callGasFunction('exportDataAsCSV', sheetName) : LocalMockAPI.exportCSV(sheetName)
  };

  window.LocalMockAPI = LocalMockAPI;

})(window);
