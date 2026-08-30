/**
 * AllotEase - Core Backend Controller
 * core/Code.gs - Google Apps Script Web App Entry Point & Template Controller
 */

/**
 * Serves the Web Application on HTTP GET.
 */
function doGet(e) {
  try {
    const viewParam = (e && e.parameter && (e.parameter.view || e.parameter.page)) ? String(e.parameter.view || e.parameter.page).toLowerCase() : '';
    if (viewParam === 'student') {
      const studentTemplate = HtmlService.createTemplateFromFile('StudentIntake');
      return studentTemplate.evaluate()
        .setTitle('Student Hostel Registration - AllotEase')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
    }

    const template = HtmlService.createTemplateFromFile('index');
    return template.evaluate()
      .setTitle('AllotEase Hostel Management System')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  } catch (error) {
    return HtmlService.createHtmlOutput(`<h3>Error launching AllotEase web application: ${error.toString()}</h3>`);
  }
}

/**
 * Include helper to inline separate HTML files (css, js, apiAdapter).
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (e) {
    try {
      return HtmlService.createHtmlOutputFromFile('ui/' + filename).getContent();
    } catch (err) {
      return '';
    }
  }
}

/**
 * Web App Initialization Endpoint
 */
function initializeApp() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  initializeSheets(ss);
  return createResponse(true, null, 'AllotEase sheets & system configuration initialized.');
}
