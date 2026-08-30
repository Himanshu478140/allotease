/**
 * AllotEase - Student Database & Waiting List View Controller
 * ui/scripts/render-students.js
 */

if (!state.studentsSubTab) state.studentsSubTab = 'all';
if (!state.studentsPage) state.studentsPage = 1;
if (!state.studentsPerPage) state.studentsPerPage = 10;

/**
 * Switch Students Subtab (All / Allocated / Waiting List)
 */
window.switchStudentsSubTab = function(tab) {
  state.studentsSubTab = tab;
  state.studentsPage = 1;

  const buttons = document.querySelectorAll('.students-subtab');
  buttons.forEach(b => {
    if (b.getAttribute('data-tab') === tab) {
      b.classList.remove('btn-secondary');
      b.classList.add('btn-primary', 'active');
    } else {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-secondary');
    }
  });

  const studentsContainer = document.getElementById('students-table-container');
  const waitingContainer = document.getElementById('waitinglist-table-container');

  if (tab === 'waiting') {
    if (studentsContainer) studentsContainer.style.display = 'none';
    if (waitingContainer) waitingContainer.style.display = 'block';
    renderWaitingListTable();
  } else {
    if (waitingContainer) waitingContainer.style.display = 'none';
    if (studentsContainer) studentsContainer.style.display = 'block';
    renderStudentsTable();
  }
};

/**
 * Get Dynamic Columns based on active Form Intake Configuration and System Factors
 */
function getActiveStudentColumns() {
  const intakeConfig = (typeof state !== 'undefined' && state.intakeConfig) ? state.intakeConfig : {};
  const vis = intakeConfig.fieldVisibility || {};

  const propConfig = (typeof state !== 'undefined' && state.propertyConfig) ? state.propertyConfig : {};
  const distFactor = (propConfig.softFactors || []).find(f => f.key === 'distance');
  const isDistanceActive = distFactor ? (distFactor.active !== false) : true;

  const cols = [];

  if (vis.studentId !== false) {
    cols.push({
      id: 'studentId',
      label: 'Student ID',
      render: s => `<strong>${escapeHtml(s['Student ID'] || 'N/A')}</strong>`
    });
  }

  cols.push({
    id: 'name',
    label: 'Name',
    render: s => escapeHtml(s['Name'] || 'N/A')
  });

  cols.push({
    id: 'gender',
    label: 'Gender',
    render: s => escapeHtml(s['Gender'] || 'N/A')
  });

  cols.push({
    id: 'courseBranch',
    label: 'Course & Branch',
    render: s => {
      const c = s['Course'] || '';
      const b = s['Branch'] || '';
      if (c && b) return escapeHtml(`${c} - ${b}`);
      if (c || b) return escapeHtml(c || b);
      return 'N/A';
    }
  });

  if (vis.year === true) {
    cols.push({
      id: 'year',
      label: 'Year',
      render: s => escapeHtml(s['Year'] || 'N/A')
    });
  }



  if (isDistanceActive) {
    cols.push({
      id: 'distance',
      label: 'Distance',
      render: s => {
        const dist = s['Distance From College (km)'] !== undefined ? s['Distance From College (km)'] : s['Home Distance (km)'];
        const src = s['Distance Source'];
        if (dist !== undefined && dist !== null && dist !== '' && !isNaN(parseFloat(dist))) {
          return `<span style="font-weight:600;">${dist} km</span> <span style="font-size:0.75rem; color:var(--text-muted);">(${src || 'PIN'})</span>`;
        }
        return '<span style="color:var(--text-muted);">Unavailable</span>';
      }
    });
  }



  cols.push({
    id: 'status',
    label: 'Allocation Status',
    render: s => {
      const status = s['Allocation Status'] || 'Unallocated';
      let badgeClass = 'badge-waiting';
      if (status === 'Allocated') badgeClass = 'badge-allocated';
      if (status === 'Unallocated') badgeClass = 'badge-unallocated';
      if (status === 'Checked Out') badgeClass = 'badge-full';
      return `<span class="badge ${badgeClass}">${status} ${s['Allocated Room'] ? `(${s['Allocated Room']})` : ''}</span>`;
    }
  });

  cols.push({
    id: 'payment',
    label: 'Payment',
    render: s => {
      const status = s['Allocation Status'] || 'Unallocated';
      const pStatus = s['Payment Status'] || 'Pending';
      let pBadgeClass = 'badge-waiting';
      if (pStatus === 'Paid') pBadgeClass = 'badge-allocated';
      if (pStatus === 'Overdue') pBadgeClass = 'badge-full';

      const rentDue = parseFloat(s['Rent Due']) || 8000;
      const amountPaid = parseFloat(s['Amount Paid']) || 0;
      const studentIdEsc = escapeHtml(s['Student ID'] || '');

      return `
        <div style="display:flex; align-items:center; justify-content:space-between; gap:0.75rem; min-width:110px;">
          <span class="badge ${pBadgeClass}">${escapeHtml(pStatus)}</span>

          <div style="position:relative; display:inline-block;" class="action-menu-container">
            <button type="button" class="action-dots-btn" onclick="window.toggleActionMenu(event, '${studentIdEsc}')" style="background:transparent; border:none; padding:0.35rem 0.4rem; color:var(--text-secondary, #78706A); cursor:pointer; display:flex; align-items:center; justify-content:center; border-radius:var(--radius-sm); transition:color 0.15s ease;" title="Actions">
              <svg viewBox="0 0 24 24" style="width:20px; height:20px; stroke:currentColor; stroke-width:2; fill:currentColor;"><circle cx="12" cy="12" r="1.75"></circle><circle cx="19" cy="12" r="1.75"></circle><circle cx="5" cy="12" r="1.75"></circle></svg>
            </button>
            <div id="action-dropdown-${studentIdEsc}" class="action-dropdown-menu">
              <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); openStudentDetailsModal('${studentIdEsc}')" style="font-weight:600; color:var(--primary, #C2652A);">
                <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; stroke-width:2; fill:none;"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                <span>View Details</span>
              </button>
              <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); openPaymentModal('${studentIdEsc}', ${rentDue}, ${amountPaid}, '${pStatus}')">
                <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; stroke-width:2; fill:none;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>
                <span>Manage Payment</span>
              </button>
              ${status === 'Allocated' ? `
                <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); openExplainModal('${studentIdEsc}')">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:currentColor; stroke-width:2; fill:none;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  <span>Audit Score</span>
                </button>
                <button type="button" class="dropdown-item" onclick="window.closeAllActionMenus(); triggerCheckout('${studentIdEsc}')" style="color:#d97706;">
                  <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:#d97706; stroke-width:2; fill:none;"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                  <span>Vacate Room</span>
                </button>
              ` : ''}
              <div style="height:1px; background:var(--border-color); margin:0.25rem 0;"></div>
              <button type="button" class="dropdown-item danger" onclick="window.closeAllActionMenus(); deleteStudentApplication('${studentIdEsc}')">
                <svg viewBox="0 0 24 24" style="width:14px; height:14px; stroke:#ef4444; stroke-width:2; fill:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                <span style="color:#ef4444; font-weight:600;">Delete Student</span>
              </button>
            </div>
          </div>
        </div>
      `;
    }
  });

  return cols;
}

/**
 * Toggle Action Menu Popover (Smart Fixed Viewport Positioning & Auto-Flip Direction - AGENTS.md Rule 1.5)
 */
window.toggleActionMenu = function(event, studentId, prefix = 'action-dropdown-') {
  if (event) event.stopPropagation();
  const targetId = prefix.endsWith('-') ? `${prefix}${studentId}` : `${prefix}-${studentId}`;
  const dropdown = document.getElementById(targetId) || document.getElementById(`action-dropdown-${studentId}`);
  const isVisible = dropdown && dropdown.style.display === 'block';
  
  window.closeAllActionMenus();
  
  if (dropdown && !isVisible) {
    dropdown.style.display = 'block';
    
    const btn = event ? event.currentTarget : null;
    if (btn) {
      const btnRect = btn.getBoundingClientRect();
      const dropRect = dropdown.getBoundingClientRect();

      dropdown.style.position = 'fixed';
      dropdown.style.zIndex = '99999';

      // Align right edge of dropdown with right edge of action button
      const leftPos = Math.max(10, btnRect.right - dropRect.width);
      dropdown.style.left = `${leftPos}px`;

      // Auto-flip upward if opening downward would overflow the viewport height
      if (btnRect.bottom + dropRect.height + 10 > window.innerHeight) {
        dropdown.style.top = `${Math.max(10, btnRect.top - dropRect.height - 4)}px`;
      } else {
        dropdown.style.top = `${btnRect.bottom + 4}px`;
      }
    }
  }
};

/**
 * Close All Action Menu Popovers
 */
window.closeAllActionMenus = function() {
  document.querySelectorAll('.action-dropdown-menu').forEach(m => {
    m.style.display = 'none';
  });
};

document.addEventListener('click', function(e) {
  if (!e.target.closest('.action-menu-container') && !e.target.closest('.action-dropdown-menu')) {
    window.closeAllActionMenus();
  }
});

window.addEventListener('scroll', function() {
  window.closeAllActionMenus();
}, true);

window.addEventListener('resize', function() {
  window.closeAllActionMenus();
});

/**
 * Change Active Student Page
 */
window.changeStudentsPage = function(newPage) {
  state.studentsPage = newPage;
  renderStudentsTable();
};

/**
 * Render Students Table with Dynamic Columns based on active Form Intake Config
 */
function renderStudentsTable(searchTerm = '') {
  const searchInput = document.getElementById('search-students');
  const term = searchTerm || (searchInput ? searchInput.value : '');

  const thead = document.getElementById('students-thead');
  const tbody = document.getElementById('students-tbody');
  if (!tbody) return;

  const cols = getActiveStudentColumns();

  // Render Table Header dynamically
  if (thead) {
    thead.innerHTML = `<tr>${cols.map(c => `<th>${c.label}</th>`).join('')}</tr>`;
  }

  let filtered = state.students || [];

  // Filter by subtab status if 'allocated'
  if (state.studentsSubTab === 'allocated') {
    filtered = filtered.filter(s => s['Allocation Status'] === 'Allocated');
  }

  if (term.trim() !== '') {
    const q = term.toLowerCase();
    filtered = filtered.filter(s => 
      String(s['Name'] || '').toLowerCase().includes(q) ||
      String(s['Student ID'] || '').toLowerCase().includes(q) ||
      String(s['Branch'] || '').toLowerCase().includes(q)
    );
  }

  const totalRecords = filtered.length;
  const perPage = state.studentsPerPage || 10;
  const totalPages = Math.ceil(totalRecords / perPage) || 1;

  if (state.studentsPage > totalPages) state.studentsPage = totalPages;
  if (state.studentsPage < 1) state.studentsPage = 1;

  const currentPage = state.studentsPage;
  const startIdx = (currentPage - 1) * perPage;
  const endIdx = Math.min(startIdx + perPage, totalRecords);
  const pageItems = filtered.slice(startIdx, endIdx);

  if (pageItems.length === 0) {
    tbody.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; padding: 2rem; color: var(--text-muted);">No student records found.</td></tr>`;
  } else {
    tbody.innerHTML = pageItems.map(s => {
      return `
        <tr>
          ${cols.map(c => `<td>${c.render(s)}</td>`).join('')}
        </tr>
      `;
    }).join('');
  }

  renderStudentsPaginationUI(currentPage, totalPages, startIdx + 1, endIdx, totalRecords);
}

/**
 * Render Capsule Pill Pagination Bar UI Below Student Directory Table
 */
function renderStudentsPaginationUI(currentPage, totalPages, startCount, endCount, totalRecords) {
  const container = document.getElementById('students-pagination-container');
  if (!container) return;

  if (totalRecords === 0) {
    container.innerHTML = '';
    return;
  }

  // Generate Capsule Number Pills
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
        <button class="pag-pill" onclick="changeStudentsPage(${i})" style="min-width:38px; height:32px; padding:0 0.6rem; border-radius:9999px; background:transparent; border:1px solid var(--border-color, #DCD0BF); color:var(--text-secondary, #78706A); font-weight:600; font-size:0.85rem; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.15s ease;">
          ${i}
        </button>
      `;
    }
  }

  const isPrevDisabled = currentPage <= 1;
  const isNextDisabled = currentPage >= totalPages;

  container.innerHTML = `
    <div style="font-size:0.85rem; color:var(--text-secondary); font-weight:500;">
      Showing <strong style="color:var(--text-primary);">${startCount}–${endCount}</strong> of <strong style="color:var(--text-primary);">${totalRecords}</strong> registered students
    </div>
    
    <!-- Capsule Pill Pagination Container -->
    <div class="capsule-pagination-bar" style="display:inline-flex; align-items:center; background:var(--bg-main, #EFE5D8); border:1px solid var(--border-color, #DCD0BF); border-radius:9999px; padding:0.25rem 0.35rem; gap:0.3rem; box-shadow:inset 0 1px 3px rgba(0,0,0,0.04);">
      <!-- Previous Arrow Pill -->
      <button class="pag-arrow-btn" ${isPrevDisabled ? 'disabled' : `onclick="changeStudentsPage(${currentPage - 1})"`} style="width:32px; height:32px; border-radius:50%; border:none; background:${isPrevDisabled ? 'transparent' : 'var(--bg-card, #FAF4EC)'}; color:${isPrevDisabled ? 'var(--text-muted, #948b82)' : 'var(--text-primary, #605850)'}; display:flex; align-items:center; justify-content:center; cursor:${isPrevDisabled ? 'not-allowed' : 'pointer'}; opacity:${isPrevDisabled ? 0.35 : 1}; transition:all 0.15s ease;" title="Previous Page">
        <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:currentColor; stroke-width:2.5; fill:none; stroke-linecap:round; stroke-linejoin:round;"><polyline points="15 18 9 12 15 6"></polyline></svg>
      </button>

      <!-- Page Number Pills -->
      <div style="display:flex; align-items:center; gap:0.3rem;">
        ${pageButtonsHtml}
      </div>

      <!-- Next Arrow Pill -->
      <button class="pag-arrow-btn" ${isNextDisabled ? 'disabled' : `onclick="changeStudentsPage(${currentPage + 1})"`} style="width:32px; height:32px; border-radius:50%; border:none; background:${isNextDisabled ? 'transparent' : 'var(--bg-card, #FAF4EC)'}; color:${isNextDisabled ? 'var(--text-primary, #605850)' : 'var(--text-primary, #605850)'}; display:flex; align-items:center; justify-content:center; cursor:${isNextDisabled ? 'not-allowed' : 'pointer'}; opacity:${isNextDisabled ? 0.35 : 1}; box-shadow:${isNextDisabled ? 'none' : '0 2px 6px rgba(0,0,0,0.08)'}; transition:all 0.15s ease;" title="Next Page">
        <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:currentColor; stroke-width:2.5; fill:none; stroke-linecap:round; stroke-linejoin:round;"><polyline points="9 18 15 12 9 6"></polyline></svg>
      </button>
    </div>
  `;
}

/**
 * Opens Full Student Application Details Modal Overlay (Configuration-Aware)
 */
window.openStudentDetailsModal = function(studentId) {
  const modal = document.getElementById('student-details-modal');
  const container = document.getElementById('student-details-modal-content');
  if (!modal || !container) return;

  const students = (typeof state !== 'undefined' && state.students) ? state.students : [];
  const student = students.find(s => String(s['Student ID'] || '').trim().toUpperCase() === String(studentId || '').trim().toUpperCase());

  if (!student) {
    showToast('Student record not found.', 'warning');
    return;
  }

  // Load Active Form Intake Configuration and Property Setup Factors
  const intakeConfig = (typeof state !== 'undefined' && state.intakeConfig) ? state.intakeConfig : {};
  const vis = intakeConfig.fieldVisibility || {};

  const propConfig = (typeof state !== 'undefined' && state.propertyConfig) ? state.propertyConfig : {};
  const distFactor = (propConfig.softFactors || []).find(f => f.key === 'distance');
  const isDistanceActive = distFactor ? (distFactor.active !== false) : true;

  // Helper to format missing value for ENABLED fields only
  const formatValue = (val) => {
    if (val === undefined || val === null || String(val).trim() === '' || String(val).trim() === 'undefined' || String(val).trim() === 'null') {
      return `<span style="color:var(--text-muted); font-style:italic;">Not provided</span>`;
    }
    return escapeHtml(String(val));
  };

  // Helper to render field HTML row ONLY IF enabled in configuration
  const renderFieldIfEnabled = (enabledCondition, label, val) => {
    if (!enabledCondition) return '';
    return `<div><strong>${escapeHtml(label)}:</strong> ${formatValue(val)}</div>`;
  };

  // 1. Student Information (Only active form fields)
  const infoFieldsHtml = [
    renderFieldIfEnabled(vis.studentId !== false, 'Student ID', student['Student ID']),
    renderFieldIfEnabled(true, 'Full Name', student['Name']),
    renderFieldIfEnabled(true, 'Gender', student['Gender']),
    renderFieldIfEnabled(true, 'Course', student['Course']),
    renderFieldIfEnabled(true, 'Branch', student['Branch']),
    renderFieldIfEnabled(vis.year === true, 'Year of Study', student['Year']),
    renderFieldIfEnabled(vis.category === true, 'Category', student['Category'])
  ].filter(Boolean).join('');

  const infoSection = infoFieldsHtml ? `
    <div style="margin-bottom:1.25rem;">
      <h4 style="font-family:'Outfit'; font-size:0.95rem; color:var(--accent-blue); margin-bottom:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
        Student Information
      </h4>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; font-size:0.85rem;">
        ${infoFieldsHtml}
      </div>
    </div>
  ` : '';

  // 2. Home / Geographic Distance Information
  const pinVal = student['Home PIN Code'] || student['Home PIN'];
  const cityVal = student['Home City'] || student['Hometown'];
  const districtVal = student['Home District'];
  const stateVal = student['Home State'];
  const countryVal = student['Country'];

  const distVal = student['Distance From College (km)'] !== undefined ? student['Distance From College (km)'] : student['Home Distance (km)'];
  const distSrc = student['Distance Source'] || 'Unavailable';

  const homeFieldsHtml = [
    renderFieldIfEnabled(true, 'Home PIN Code', pinVal),
    renderFieldIfEnabled(true, 'Hometown', cityVal),
    renderFieldIfEnabled(Boolean(districtVal), 'District', districtVal),
    renderFieldIfEnabled(Boolean(stateVal), 'State', stateVal),
    renderFieldIfEnabled(Boolean(countryVal), 'Country', countryVal)
  ].filter(Boolean).join('');

  let distanceBadgeHtml = '';
  if (isDistanceActive) {
    distanceBadgeHtml = `
      <div style="grid-column: span 2; background:rgba(37,99,235,0.08); padding:0.6rem 0.85rem; border-radius:var(--radius-sm); border:1px solid rgba(37,99,235,0.2);">
        <strong>Distance From College:</strong>
        <span style="font-size:1rem; font-weight:700; color:var(--accent-blue); margin-left:0.35rem;">
          ${distVal !== undefined && distVal !== null && distVal !== '' ? `${distVal} km` : 'Unavailable'}
        </span>
        <span style="font-size:0.78rem; color:var(--text-muted); margin-left:0.5rem;">(Resolution Source: ${distSrc})</span>
      </div>
    `;
  }

  const homeSection = (homeFieldsHtml || distanceBadgeHtml) ? `
    <div style="margin-bottom:1.25rem;">
      <h4 style="font-family:'Outfit'; font-size:0.95rem; color:var(--accent-blue); margin-bottom:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
        Home & Geographic Distance Information
      </h4>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; font-size:0.85rem;">
        ${homeFieldsHtml}
        ${distanceBadgeHtml}
      </div>
    </div>
  ` : '';

  // 3. Contact Information
  const parentPhone = student['Parent / Guardian Phone'] || student['Parent Phone'] || student['Guardian Phone'];
  const emailVal = student['Email Address'] || student['Email'] || student['emailAddress'] || student['email'];

  const contactFieldsHtml = [
    renderFieldIfEnabled(vis.email !== false, 'Email Address', emailVal),
    renderFieldIfEnabled(Boolean(parentPhone), 'Parent / Guardian Phone', parentPhone)
  ].filter(Boolean).join('');

  const contactSection = contactFieldsHtml ? `
    <div style="margin-bottom:1.25rem;">
      <h4 style="font-family:'Outfit'; font-size:0.95rem; color:var(--accent-blue); margin-bottom:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
        Contact Information
      </h4>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; font-size:0.85rem;">
        ${contactFieldsHtml}
      </div>
    </div>
  ` : '';

  const rTypeStr = String(student['Preferred Room Type'] || '').trim();
  const derivedAcPref = student['AC Preference'] || ((rTypeStr.toLowerCase().includes('non-ac') || rTypeStr.toLowerCase().includes('non ac')) ? 'Non-AC' : (rTypeStr.toLowerCase().includes('ac') ? 'AC' : 'Not provided'));
  const blockVal = student['Preferred Block'] || student['Preferred Hostel Block'] || student['Block'] || 'Not provided';
  const floorVal = student['Preferred Floor'] || 'Not provided';

  // 4. Hostel Preferences (Only active form preferences)
  const prefFieldsHtml = [
    renderFieldIfEnabled(vis.capacity !== false, 'Preferred Room Capacity', student['Preferred Occupancy'] || student['Preferred Room Type']),
    renderFieldIfEnabled(vis.acPref !== false, 'AC Preference', derivedAcPref),
    renderFieldIfEnabled(vis.block !== false, 'Preferred Hostel Block', blockVal),
    renderFieldIfEnabled(vis.floor !== false, 'Preferred Floor', floorVal),
    renderFieldIfEnabled(vis.roommates !== false, 'Preferred Roommates', student['Preferred Roommates']),
    renderFieldIfEnabled(vis.specialReq !== false, 'Special Accessibility Requirement', student['Special Requirement'])
  ].filter(Boolean).join('');

  const prefSection = prefFieldsHtml ? `
    <div style="margin-bottom:1.25rem;">
      <h4 style="font-family:'Outfit'; font-size:0.95rem; color:var(--accent-blue); margin-bottom:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
        Hostel & Room Preferences
      </h4>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; font-size:0.85rem;">
        ${prefFieldsHtml}
      </div>
    </div>
  ` : '';

  // 5. System Allocation Information (Always rendered system fields)
  const allocs = (typeof state !== 'undefined' && state.allocations) ? state.allocations : [];
  const allocRecord = allocs.find(a => String(a['Student ID'] || '').trim().toUpperCase() === String(studentId || '').trim().toUpperCase());

  const rooms = (typeof state !== 'undefined' && state.rooms) ? state.rooms : [];
  const roomRecord = rooms.find(r => String(r['Room ID'] || '').trim().toUpperCase() === String(student['Allocated Room'] || '').trim().toUpperCase());

  const allocStatus = student['Allocation Status'] || 'Unallocated';
  let allocBadgeClass = 'badge-unallocated';
  if (allocStatus === 'Allocated') allocBadgeClass = 'badge-allocated';
  if (allocStatus === 'Waiting List') allocBadgeClass = 'badge-waiting';

  const allocSection = `
    <div style="margin-bottom:1.25rem; background:var(--bg-main); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
      <h4 style="font-family:'Outfit'; font-size:0.95rem; color:var(--accent-blue); margin-bottom:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
        Allocation Status & Audit Information
      </h4>
      <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; font-size:0.85rem;">
        <div><strong>Allocation Status:</strong> <span class="badge ${allocBadgeClass}">${allocStatus}</span></div>
        <div><strong>Allocated Room:</strong> ${formatValue(student['Allocated Room'])}</div>
        <div><strong>Hostel Block:</strong> ${formatValue(roomRecord ? roomRecord['Block'] : student['Allocated Block'])}</div>
        <div><strong>Floor:</strong> ${formatValue(roomRecord ? roomRecord['Floor'] : student['Allocated Floor'])}</div>
        <div><strong>Room Type:</strong> ${formatValue(roomRecord ? roomRecord['Room Type'] : '')}</div>
        ${vis.priority !== false ? `<div><strong>Priority Tier:</strong> ${formatValue(student['Priority'], 'General Applicants / Local Quota')}</div>` : ''}
        <div><strong>Allocation Score:</strong> ${student['Allocation Score'] !== undefined ? `${student['Allocation Score']} pts` : 'N/A'}</div>
        <div style="grid-column: span 2;"><strong>Allocation Decision Reason:</strong> ${formatValue(allocRecord ? allocRecord['Reason'] : '')}</div>
      </div>
    </div>
  `;

  // 6. Custom Application Details (ONLY custom fields currently in Form Builder)
  const customFieldsData = student['Custom Fields'] || student.customFields || {};
  const definedCustomFields = intakeConfig.customFields || [];

  const customFieldEntries = [];
  definedCustomFields.forEach(cf => {
    const label = cf.label;
    let val = customFieldsData[label];
    if (val === undefined && customFieldsData[cf.id] !== undefined) val = customFieldsData[cf.id];
    if (val === undefined && student[label] !== undefined) val = student[label];
    customFieldEntries.push({ label, val });
  });

  let customSection = '';
  if (customFieldEntries.length > 0) {
    const fieldsHtml = customFieldEntries.map(e => `
      <div><strong>${escapeHtml(e.label)}:</strong> ${formatValue(e.val)}</div>
    `).join('');

    customSection = `
      <div style="margin-bottom:1.25rem;">
        <h4 style="font-family:'Outfit'; font-size:0.95rem; color:var(--accent-blue); margin-bottom:0.75rem; border-bottom:1px solid var(--border-color); padding-bottom:0.35rem; display:flex; align-items:center; gap:0.4rem;">
          Additional Custom Profile Metadata
        </h4>
        <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:0.85rem; font-size:0.85rem;">
          ${fieldsHtml}
        </div>
      </div>
    `;
  }

  container.innerHTML = infoSection + homeSection + contactSection + prefSection + allocSection + customSection;
  modal.classList.add('active');
};

/**
 * Deletes a Student Application Record with Custom Confirmation Dialog (AGENTS.md Rule 1)
 */
window.deleteStudentApplication = async function(studentId) {
  const confirmed = await showConfirmDialog(
    'Confirm Application Deletion',
    `Are you sure you want to permanently delete application for Student ${studentId}? If allocated, their bed space will be freed.`
  );
  if (!confirmed) return;

  try {
    showLoading(true);
    const res = await api.deleteStudent(studentId);
    if (res.success) {
      closeModal('student-details-modal');
      await refreshAllData();
      showToast(res.message || `Student application ${studentId} deleted successfully.`, 'success');
    } else {
      showToast(res.message || 'Error deleting student application.', 'danger');
    }
  } catch (e) {
    showToast('Error deleting student: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

/**
 * Opens Custom Vanilla Payment Modal Overlay (AGENTS.md Rule 1)
 */
window.openPaymentModal = function(studentId, rentDue, amountPaid, currentStatus) {
  const modal = document.getElementById('payment-modal');
  if (!modal) return;

  document.getElementById('payment-student-id').value = studentId;
  document.getElementById('payment-rent-due').value = rentDue;
  document.getElementById('payment-amount-paid').value = amountPaid;

  const statusTrigger = document.getElementById('payment-status-selected-label');
  const statusHiddenInput = document.getElementById('payment-status-value');
  if (statusTrigger && statusHiddenInput) {
    statusTrigger.textContent = currentStatus;
    statusHiddenInput.value = currentStatus;
  }

  modal.classList.add('active');
};

/**
 * Submits Fee Payment Record update
 */
window.submitPaymentRecord = async function() {
  const studentId = document.getElementById('payment-student-id')?.value;
  const rentDue = parseFloat(document.getElementById('payment-rent-due')?.value) || 0;
  const amountPaid = parseFloat(document.getElementById('payment-amount-paid')?.value) || 0;
  const paymentStatus = document.getElementById('payment-status-value')?.value || 'Pending';

  if (!studentId) return;

  try {
    showLoading(true);
    const res = await api.updatePaymentStatus(studentId, amountPaid, rentDue, paymentStatus);
    if (res.success) {
      closeModal('payment-modal');
      await refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'danger');
    }
  } catch (e) {
    showToast('Error updating payment: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

/**
 * Triggers Vacancy Checkout Flow with Custom Confirm Overlay (AGENTS.md Rule 1)
 */
window.triggerCheckout = async function(studentId) {
  const confirmed = await showConfirmDialog('Confirm Checkout', `Vacate bed and check out Student ${studentId}? The room capacity will be freed and waiting list evaluated for auto-reallocation.`);
  if (!confirmed) return;

  try {
    showLoading(true);
    const res = await api.checkoutStudent(studentId);
    if (res.success) {
      await refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'danger');
    }
  } catch (e) {
    showToast('Error executing checkout: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};
