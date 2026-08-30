/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * ui/scripts/render-waitinglist.js - Waiting List Queue Table Renderer
 */

function renderWaitingListTable() {
  const tbodies = document.querySelectorAll('#waitinglist-tbody');
  const pagContainer = document.getElementById('alloc-waiting-pagination');
  if (tbodies.length === 0) return;

  let list = state.waitingList || [];

  // Fallback: If state.waitingList is empty, pull unallocated/waiting list students from state.students
  if (list.length === 0 && state.students && state.students.length > 0) {
    const unallocatedOrWaiting = state.students.filter(s => s['Allocation Status'] === 'Waiting List' || s['Allocation Status'] === 'Unallocated');
    list = unallocatedOrWaiting.map((s, idx) => ({
      position: idx + 1,
      'Student ID': s['Student ID'],
      studentName: s['Name'],
      'Priority': s['Priority'] || 'General Applicants / Local Quota',
      specialRequirement: s['Special Requirement'] || 'None',
      'Reason': s['Allocation Status'] === 'Waiting List' ? 'Awaiting room vacancy / constraint match' : 'Unallocated queue (Ready for Smart Allocation)',
      'Request Date': s['Submission Date'] || s['Registration Date'] || new Date().toISOString().split('T')[0]
    }));
  }

  if (list.length === 0) {
    tbodies.forEach(tbody => {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align:center; padding: 2rem; color: var(--text-muted);">Waiting list is empty. All eligible students have been accommodated!</td></tr>`;
    });
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  if (!state.allocWaitingPage) state.allocWaitingPage = 1;
  const pageSize = 10;
  const totalRecords = list.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  if (state.allocWaitingPage > totalPages && totalPages > 0) state.allocWaitingPage = totalPages;

  const startIdx = (state.allocWaitingPage - 1) * pageSize;
  const pageItems = list.slice(startIdx, startIdx + pageSize);

  tbodies.forEach(tbody => {
    tbody.innerHTML = pageItems.map((w, idx) => {
      const realRank = startIdx + idx + 1;
      return `
        <tr>
          <td><strong style="color:var(--accent-amber);">#${w.position || realRank}</strong></td>
          <td><strong>${escapeHtml(w.studentName || w['Name'] || w['Student ID'] || '')}</strong> <span style="font-size:0.8rem; color:var(--text-secondary);">(${escapeHtml(w['Student ID'] || '')})</span></td>
          <td style="font-size:0.8rem; color:var(--text-secondary);">${escapeHtml(w['Reason'] || 'In queue')}</td>
          <td>${escapeHtml(w['Request Date'] || '-')}</td>
        </tr>
      `;
    }).join('');
  });

  if (pagContainer && typeof window.buildCapsulePaginationHtml === 'function') {
    pagContainer.innerHTML = window.buildCapsulePaginationHtml(state.allocWaitingPage, totalRecords, pageSize, 'changeAllocWaitingPage');
  }
}

window.changeAllocWaitingPage = function(newPage) {
  state.allocWaitingPage = newPage;
  renderWaitingListTable();
};
