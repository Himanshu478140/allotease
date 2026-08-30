/**
 * AllotEase - Gmail Notification Service
 * features/notifications/NotificationService.gs - Automatic Gmail Dispatches via MailApp
 */

/**
 * Sends Gmail notifications to allocated students.
 */
function sendAllocationEmails(allocationIds = null) {
  try {
    const quota = MailApp.getRemainingDailyQuota();
    if (quota <= 0) {
      return createResponse(false, null, 'Daily Gmail quota reached.');
    }

    const allocRes = getAllocations();
    if (!allocRes.success) return allocRes;

    let allocations = allocRes.data;
    if (allocationIds && allocationIds.length > 0) {
      allocations = allocations.filter(a => allocationIds.includes(a['Allocation ID']));
    } else {
      allocations = allocations.filter(a => a['Status'] === CONFIG.ALLOCATION_STATUS.ACTIVE);
    }

    let sentCount = 0;
    allocations.forEach(alloc => {
      const email = alloc.studentEmail || `${String(alloc['Student ID']).toLowerCase()}@example.com`;
      const subject = `[AllotEase] Room Allocation Notice - ${alloc.studentName}`;
      const body = 
        `Dear ${alloc.studentName},\n\n` +
        `Your room allocation has been processed successfully!\n\n` +
        `Allocation ID: ${alloc['Allocation ID']}\n` +
        `Assigned Room: ${alloc.roomNumber} (${alloc.block}, Floor ${alloc.floor})\n` +
        `Satisfaction Score: ${alloc['Allocation Score']}/100\n` +
        `Allocation Date: ${alloc['Allocation Date']}\n\n` +
        `Score Breakdown:\n${alloc['Reason']}\n\n` +
        `Best regards,\n` +
        `AllotEase Administration`;

      try {
        MailApp.sendEmail(email, subject, body);
        sentCount++;
      } catch (err) {
        console.warn(`Email send failed for ${email}: `, err);
      }
    });

    return createResponse(true, { sentCount }, `Sent Gmail notifications to ${sentCount} allocated applicants.`);
  } catch (e) {
    return createResponse(false, null, e.toString());
  }
}
