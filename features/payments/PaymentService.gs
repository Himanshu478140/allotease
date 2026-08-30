/**
 * AllotEase - Fee & Payment Service
 * features/payments/PaymentService.gs - Administrative Payment Status & Record-Keeping
 */

/**
 * Updates student payment status and record fields.
 */
function updatePaymentStatus(studentId, amountPaid, rentDue, paymentStatus) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(CONFIG.SHEETS.STUDENTS);
    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const cleanSId = String(studentId).trim().toUpperCase();
    let targetRow = -1;

    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]).trim().toUpperCase() === cleanSId) {
        targetRow = i + 1;
        break;
      }
    }

    if (targetRow === -1) {
      return createResponse(false, null, `Student '${cleanSId}' not found.`);
    }

    const rentCol = headers.indexOf('Rent Due') + 1;
    const paidCol = headers.indexOf('Amount Paid') + 1;
    const statusCol = headers.indexOf('Payment Status') + 1;

    if (rentCol > 0) sheet.getRange(targetRow, rentCol).setValue(rentDue);
    if (paidCol > 0) sheet.getRange(targetRow, paidCol).setValue(amountPaid);
    if (statusCol > 0) sheet.getRange(targetRow, statusCol).setValue(paymentStatus);

    return createResponse(true, { studentId: cleanSId, amountPaid, rentDue, paymentStatus }, `Payment record updated for Student ${cleanSId}.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
