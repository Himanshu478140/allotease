/**
 * AllotEase - Smart Allocation Hub Renderer & Diagnostics Controller
 * ui/scripts/render-allocation-hub.js
 */

if (!state.allocationSubTab) state.allocationSubTab = 'rules';
if (!state.allocationRecordsSubTab) state.allocationRecordsSubTab = 'ledger';

/**
 * Switch Allocation Subtab (Allocation Rules / Allocation Records)
 */
window.switchAllocationSubTab = function(tab) {
  state.allocationSubTab = tab;

  const buttons = document.querySelectorAll('.alloc-subtab');
  buttons.forEach(b => {
    if (b.getAttribute('data-tab') === tab) {
      b.classList.remove('btn-secondary');
      b.classList.add('btn-primary', 'active');
    } else {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-secondary');
    }
  });

  const rulesPanel = document.getElementById('alloc-rules-panel');
  const recordsPanel = document.getElementById('alloc-records-panel');

  if (tab === 'records') {
    if (rulesPanel) rulesPanel.style.display = 'none';
    if (recordsPanel) {
      recordsPanel.style.display = 'flex';
      recordsPanel.classList.remove('panel-fade-in');
      void recordsPanel.offsetWidth;
      recordsPanel.classList.add('panel-fade-in');
    }

    const activeRecTab = state.allocationRecordsSubTab || 'ledger';
    switchAllocationRecordsSubTab(activeRecTab);
  } else {
    if (recordsPanel) recordsPanel.style.display = 'none';
    if (rulesPanel) {
      rulesPanel.style.display = 'flex';
      rulesPanel.classList.remove('panel-fade-in');
      void rulesPanel.offsetWidth;
      rulesPanel.classList.add('panel-fade-in');
    }

    if (state.propertyConfig) {
      if (typeof window.renderCollegeLocationCard === 'function') {
        window.renderCollegeLocationCard(state.propertyConfig);
      }
      if (typeof window.renderHardConstraintsCard === 'function') {
        window.renderHardConstraintsCard(state.propertyConfig.hardConstraints || {});
      }
      if (typeof window.renderEmailNoticesCard === 'function') {
        window.renderEmailNoticesCard(state.propertyConfig.autoEmailNotices !== false);
      }
    }
    if (typeof renderPriorityTiersTable === 'function' && state.priorityTiers) {
      renderPriorityTiersTable(state.priorityTiers);
    }
  }
};

/**
 * Switch Inner Allocation Records Subtab (Ledger / Waiting List / Allocated)
 */
window.switchAllocationRecordsSubTab = function(subtab) {
  state.allocationRecordsSubTab = subtab;

  const buttons = document.querySelectorAll('.alloc-records-subtab');
  buttons.forEach(b => {
    if (b.getAttribute('data-rectab') === subtab) {
      b.classList.remove('btn-secondary');
      b.classList.add('btn-primary', 'active');
    } else {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-secondary');
    }
  });

  const pLedger = document.getElementById('rec-panel-ledger');
  const pWaiting = document.getElementById('rec-panel-waiting');
  const pAllocated = document.getElementById('rec-panel-allocated');

  if (pLedger) pLedger.style.display = (subtab === 'ledger') ? 'flex' : 'none';
  if (pWaiting) pWaiting.style.display = (subtab === 'waiting') ? 'flex' : 'none';
  if (pAllocated) pAllocated.style.display = (subtab === 'allocated') ? 'flex' : 'none';

  const activePanel = (subtab === 'ledger') ? pLedger : (subtab === 'waiting') ? pWaiting : pAllocated;
  if (activePanel) {
    activePanel.classList.remove('panel-fade-in');
    void activePanel.offsetWidth;
    activePanel.classList.add('panel-fade-in');
  }

  if (subtab === 'ledger' && typeof renderAllocationsTable === 'function') renderAllocationsTable();
  if (subtab === 'waiting' && typeof renderWaitingListTable === 'function') renderWaitingListTable();
  if (subtab === 'allocated' && typeof renderAllocatedStudentsTable === 'function') renderAllocatedStudentsTable();
};

/**
 * Universal Capsule Pagination Bar Builder
 */
window.buildCapsulePaginationHtml = function(currentPage, totalRecords, pageSize = 10, changeFnName = '') {
  if (totalRecords <= 0) return '';
  const totalPages = Math.ceil(totalRecords / pageSize);
  const startCount = (currentPage - 1) * pageSize + 1;
  const endCount = Math.min(currentPage * pageSize, totalRecords);

  if (totalPages <= 1) {
    return `
      <div class="table-pagination-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding-top:1rem; margin-top:1rem; border-top:1px solid var(--border-color, #DCD0BF);">
        <div style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">
          Showing <strong style="color:var(--text-primary);">${startCount}–${endCount}</strong> of <strong style="color:var(--text-primary);">${totalRecords}</strong> records
        </div>
      </div>
    `;
  }

  let pageButtonsHtml = '';
  for (let i = 1; i <= totalPages; i++) {
    if (i === currentPage) {
      pageButtonsHtml += `
        <button class="pag-pill active" style="min-width:38px; height:32px; padding:0 0.6rem; border-radius:9999px; background:var(--primary, #C2652A); color:#ffffff; font-weight:700; font-size:0.85rem; border:none; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(194, 101, 42, 0.35);">
          ${i}
        </button>
      `;
    } else {
      pageButtonsHtml += `
        <button class="pag-pill" onclick="${changeFnName}(${i})" style="min-width:38px; height:32px; padding:0 0.6rem; border-radius:9999px; background:transparent; border:1px solid var(--border-color, #DCD0BF); color:var(--text-secondary, #78706A); font-weight:600; font-size:0.85rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s ease;">
          ${i}
        </button>
      `;
    }
  }

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  return `
    <div class="table-pagination-footer" style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:1rem; padding-top:1rem; margin-top:1rem; border-top:1px solid var(--border-color, #DCD0BF);">
      <div style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">
        Showing <strong style="color:var(--text-primary);">${startCount}–${endCount}</strong> of <strong style="color:var(--text-primary);">${totalRecords}</strong> records
      </div>
      
      <div class="capsule-pagination-bar" style="display:inline-flex; align-items:center; background:var(--bg-main, #EFE5D8); border:1px solid var(--border-color, #DCD0BF); border-radius:9999px; padding:0.25rem 0.35rem; gap:0.3rem; box-shadow:inset 0 1px 3px rgba(0,0,0,0.04);">
        <button class="pag-arrow-btn" ${isPrevDisabled ? 'disabled' : `onclick="${changeFnName}(${currentPage - 1})"`} style="width:32px; height:32px; border-radius:50%; border:none; background:${isPrevDisabled ? 'transparent' : 'var(--bg-card, #FAF4EC)'}; color:${isPrevDisabled ? 'var(--text-muted, #948b82)' : 'var(--text-primary, #605850)'}; display:flex; align-items:center; justify-content:center; cursor:${isPrevDisabled ? 'not-allowed' : 'pointer'}; opacity:${isPrevDisabled ? 0.35 : 1}; transition:all 0.15s ease;" title="Previous Page">
          <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:currentColor; stroke-width:2.5; fill:none; stroke-linecap:round; stroke-linejoin:round;"><polyline points="15 18 9 12 15 6"></polyline></svg>
        </button>

        <div style="display:flex; align-items:center; gap:0.3rem;">
          ${pageButtonsHtml}
        </div>

        <button class="pag-arrow-btn" ${isNextDisabled ? 'disabled' : `onclick="${changeFnName}(${currentPage + 1})"`} style="width:32px; height:32px; border-radius:50%; border:none; background:${isNextDisabled ? 'transparent' : 'var(--bg-card, #FAF4EC)'}; color:${isNextDisabled ? 'var(--text-primary, #605850)' : 'var(--text-primary, #605850)'}; display:flex; align-items:center; justify-content:center; cursor:${isNextDisabled ? 'not-allowed' : 'pointer'}; opacity:${isNextDisabled ? 0.35 : 1}; box-shadow:${isNextDisabled ? 'none' : '0 2px 6px rgba(0,0,0,0.08)'}; transition:all 0.15s ease;" title="Next Page">
          <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:currentColor; stroke-width:2.5; fill:none; stroke-linecap:round; stroke-linejoin:round;"><polyline points="9 18 15 12 9 6"></polyline></svg>
        </button>
      </div>
    </div>
  `;
};

/**
 * Render Allocated Students Directory Table (Section 3 in Allocation Records) - 10 per page
 */
function renderAllocatedStudentsTable() {
  const tbody = document.getElementById('allocated-students-tbody');
  const pagContainer = document.getElementById('alloc-allocated-pagination');
  if (!tbody) return;

  const allocated = (state.students || []).filter(s => s['Allocation Status'] === 'Allocated');

  if (allocated.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; padding: 2rem; color: var(--text-muted);">No allocated student records found.</td></tr>`;
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  if (!state.allocAllocatedPage) state.allocAllocatedPage = 1;
  const pageSize = 10;
  const totalRecords = allocated.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  if (state.allocAllocatedPage > totalPages && totalPages > 0) state.allocAllocatedPage = totalPages;

  const startIdx = (state.allocAllocatedPage - 1) * pageSize;
  const pageItems = allocated.slice(startIdx, startIdx + pageSize);

  tbody.innerHTML = pageItems.map(s => {
    const pStatus = s['Payment Status'] || 'Pending';
    let pBadgeClass = 'badge-waiting';
    if (pStatus === 'Paid') pBadgeClass = 'badge-allocated';
    if (pStatus === 'Overdue') pBadgeClass = 'badge-full';

    const rentDue = parseFloat(s['Rent Due']) || 8000;
    const amountPaid = parseFloat(s['Amount Paid']) || 0;
    const studentIdEsc = escapeHtml(s['Student ID'] || '');

    return `
      <tr>
        <td><strong>${studentIdEsc}</strong></td>
        <td>${escapeHtml(s['Name'] || '')}</td>
        <td>${escapeHtml(s['Gender'] || '')}</td>
        <td>${escapeHtml(`${s['Course'] || ''} - ${s['Branch'] || ''}`)}</td>
        <td><strong style="color:var(--accent-blue);">${escapeHtml(s['Allocated Room'] || 'N/A')}</strong></td>
        <td><span class="badge badge-allocated">Allocated</span></td>
        <td>
          <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; min-width:110px;">
            <span class="badge ${pBadgeClass}">${escapeHtml(pStatus)}</span>

            <div style="position:relative; display:inline-block;" class="action-menu-container">
              <button type="button" class="action-dots-btn" onclick="window.toggleActionMenu(event, '${studentIdEsc}', 'alloc-action-dropdown-')" style="background:transparent; border:none; padding:0.35rem 0.4rem; color:var(--text-secondary, #78706A); cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-sm); transition:color 0.15s ease;" title="Actions">
                <svg viewBox="0 0 24 24" style="width:20px; height:20px; stroke:currentColor; stroke-width:2; fill:currentColor;"><circle cx="12" cy="12" r="1.75"></circle><circle cx="19" cy="12" r="1.75"></circle><circle cx="5" cy="12" r="1.75"></circle></svg>
              </button>
              <div id="alloc-action-dropdown-${studentIdEsc}" class="action-dropdown-menu">
                <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); openStudentDetailsModal('${studentIdEsc}')" style="font-weight:600; color:var(--primary, #C2652A);">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; stroke-width:2; fill:none;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  <span>View Details</span>
                </button>
                <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); openPaymentModal('${studentIdEsc}', ${rentDue}, ${amountPaid}, '${pStatus}')">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; stroke-width:2; fill:none;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                  <span>Manage Payment</span>
                </button>
                <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); openExplainModal('${studentIdEsc}')">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; stroke-width:2; fill:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <span>Audit Score</span>
                </button>
                <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); triggerCheckout('${studentIdEsc}')" style="color:#d97706;">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:#d97706; stroke-width:2; fill:none;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>Vacate Room</span>
                </button>
                <div style="height:1px; background:var(--border-color); margin:0.25rem 0;"></div>
                <button type="button" class="dropdown-item danger" onclick="window.closeAllActionMenus(); deleteStudentApplication('${studentIdEsc}')">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:#ef4444; stroke-width:2; fill:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  <span style="color:#ef4444; font-weight:600;">Delete Student</span>
                </button>
              </div>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');

  if (pagContainer) {
    pagContainer.innerHTML = window.buildCapsulePaginationHtml(state.allocAllocatedPage, totalRecords, pageSize, 'changeAllocAllocatedPage');
  }
}

window.changeAllocAllocatedPage = function(newPage) {
  state.allocAllocatedPage = newPage;
  renderAllocatedStudentsTable();
};
window.renderAllocatedStudentsTable = renderAllocatedStudentsTable;

/**
 * Render Smart Allocation View
 */
async function renderAllocationView() {
  const container = document.getElementById('view-allocation');
  if (!container) return;

  if (!state.propertyConfig) {
    const propRes = await api.getPropertyConfig();
    if (propRes && propRes.data) {
      state.propertyConfig = propRes.data;
    }
  }

  if (!state.priorityTiers || state.priorityTiers.length === 0) {
    const prioRes = await api.getPriorityTiers();
    if (prioRes && prioRes.data && prioRes.data.length > 0) {
      state.priorityTiers = prioRes.data;
    }
  }

  const activeTab = state.allocationSubTab || 'rules';
  switchAllocationSubTab(activeTab);
}
window.renderAllocationView = renderAllocationView;
window.renderAllocationsView = renderAllocationView;

/**
 * Render Priority Queue Distribution Breakdown
 */
function renderPriorityQueueBreakdown(unallocatedStudents) {
  const container = document.getElementById('alloc-hub-priority-breakdown');
  if (!container) return;

  const counts = {
    'Emergency/Special Requirement': 0,
    'Final Year': 0,
    'New Students': 0,
    'Other Students': 0
  };

  unallocatedStudents.forEach(s => {
    const p = s['Priority'] || 'Other Students';
    if (typeof counts[p] !== 'undefined') counts[p]++;
    else counts['Other Students']++;
  });

  const tiers = [
    { label: 'Emergency / Special Requirement', count: counts['Emergency/Special Requirement'], badgeClass: 'badge-waiting', color: 'var(--accent-rose)' },
    { label: 'Final Year Students', count: counts['Final Year'], badgeClass: 'badge-allocated', color: 'var(--accent-purple)' },
    { label: 'New First-Year Students', count: counts['New Students'], badgeClass: 'badge-allocated', color: 'var(--accent-blue)' },
    { label: 'Other Registered Students', count: counts['Other Students'], badgeClass: 'badge-unallocated', color: 'var(--text-secondary)' }
  ];

  container.innerHTML = tiers.map((t, idx) => `
    <div style="display:flex; justify-content:space-between; align-items:center; background:var(--bg-main); border:1px solid var(--border-color); padding:0.65rem 0.85rem; border-radius:var(--radius-sm);">
      <div style="display:flex; align-items:center; gap:0.5rem;">
        <span style="font-size:0.8rem; font-weight:700; color:${t.color};">T${idx + 1}</span>
        <span style="font-size:0.85rem; font-weight:500;">${t.label}</span>
      </div>
      <span class="badge ${t.badgeClass}" style="font-size:0.8rem; font-weight:600;">${t.count} Candidate(s)</span>
    </div>
  `).join('');
}

/**
 * Render Active Factors Breakdown
 */
function renderActiveFactorsBreakdown(softFactors) {
  const container = document.getElementById('alloc-hub-factors-breakdown');
  if (!container) return;

  if (softFactors.length === 0) {
    container.innerHTML = `<p style="color:var(--text-muted); font-size:0.85rem;">No soft factors configured.</p>`;
    return;
  }

  container.innerHTML = softFactors.map(f => {
    const isActive = f.active !== false;
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding:0.4rem 0.6rem; border-bottom:1px solid var(--border-color); font-size:0.85rem;">
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span style="color:${isActive ? 'var(--accent-emerald)' : 'var(--text-muted)'}; font-size:0.75rem;">●</span>
          <span style="color:${isActive ? 'var(--text-primary)' : 'var(--text-muted)'};">${f.label}</span>
        </div>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="badge ${isActive ? 'badge-allocated' : 'badge-unallocated'}" style="font-size:0.7rem; padding:0.15rem 0.4rem;">${isActive ? 'Active' : 'Disabled'}</span>
        </div>
      </div>
    `;
  }).join('');
}

/**
 * Render Pending Applicants Preview Table
 */
function renderPendingApplicantsPreviewTable(unallocatedStudents) {
  const tbody = document.getElementById('alloc-hub-pending-tbody');
  if (!tbody) return;

  if (unallocatedStudents.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:2rem; color:var(--text-muted);">🎉 All registered applicants are currently allocated!</td></tr>`;
    return;
  }

  tbody.innerHTML = unallocatedStudents.slice(0, 10).map(s => `
    <tr>
      <td><strong>${s['Student ID']}</strong></td>
      <td>${s['Name']}</td>
      <td><span class="badge ${s['Gender'] === 'Male' ? 'badge-male' : 'badge-female'}">${s['Gender']}</span></td>
      <td><span class="badge badge-waiting">${s['Priority'] || 'Other'}</span></td>
      <td>${s['Preferred Room Type'] || 'Single AC'}</td>
      <td>${s['Special Requirement'] || 'None'}</td>
      <td><span class="badge badge-unallocated">Ready for Run</span></td>
    </tr>
  `).join('');
}

/**
 * Triggers Smart Allocation Run from Hub Button
 */
window.triggerRunAllocationFromHub = async function() {
  const btn = document.getElementById('btn-run-smart-allocation');
  if (btn) btn.click();
};
