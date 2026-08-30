/**
 * AllotEase - Allocations Ledger View Controller
 * ui/scripts/render-allocations.js
 */

/**
 * Render Allocations Ledger Table
 */
function renderAllocationsTable(searchTerm = '') {
  const tbody = document.getElementById('allocations-tbody');
  const pagContainer = document.getElementById('alloc-ledger-pagination');
  if (!tbody) return;

  let filtered = state.allocations || [];
  if (searchTerm.trim() !== '') {
    const q = searchTerm.toLowerCase();
    filtered = filtered.filter(a => 
      String(a['Allocation ID'] || '').toLowerCase().includes(q) ||
      String(a.studentName || '').toLowerCase().includes(q) ||
      String(a['Student ID'] || '').toLowerCase().includes(q) ||
      String(a.roomNumber || '').toLowerCase().includes(q)
    );
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; padding: 2rem; color: var(--text-muted);">No allocation records in ledger. Click "Run Smart Allocation" from Dashboard.</td></tr>`;
    if (pagContainer) pagContainer.innerHTML = '';
    return;
  }

  if (!state.allocLedgerPage) state.allocLedgerPage = 1;
  const pageSize = 10;
  const totalRecords = filtered.length;
  const totalPages = Math.ceil(totalRecords / pageSize);
  if (state.allocLedgerPage > totalPages && totalPages > 0) state.allocLedgerPage = totalPages;

  const startIdx = (state.allocLedgerPage - 1) * pageSize;
  const pageItems = filtered.slice(startIdx, startIdx + pageSize);

  tbody.innerHTML = pageItems.map(a => {
    const status = a['Status'] || 'Active';
    let badgeClass = 'badge-allocated';
    if (status === 'Overridden') badgeClass = 'badge-waiting';
    if (status === 'Cancelled' || status === 'Checked Out') badgeClass = 'badge-full';

    return `
      <tr>
        <td><strong>${a['Allocation ID']}</strong></td>
        <td>
          <div><strong>${a.studentName}</strong> (${a['Student ID']})</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">${a.gender} | ${a.branch} | ${a.year}</div>
        </td>
        <td>
          <div><strong>Room ${a.roomNumber}</strong> (${a.block})</div>
          <div style="font-size:0.75rem; color:var(--text-secondary);">Floor ${a.floor}</div>
        </td>
        <td>${a['Allocation Date']}</td>
        <td><span class="badge ${badgeClass}">${status}</span></td>
        <td>
          <button class="btn btn-secondary" style="padding:0.25rem 0.5rem; font-size:0.75rem; margin-right:0.25rem;" onclick="openExplainModal('${a['Student ID']}')">Audit</button>
          ${status === 'Active' ? `
            <button class="btn btn-warning" style="padding:0.25rem 0.5rem; font-size:0.75rem; margin-right:0.25rem;" onclick="openOverrideModal('${a['Allocation ID']}', '${a['Student ID']}', '${a['Room ID']}')">Override</button>
            <button class="btn btn-danger" style="padding:0.25rem 0.5rem; font-size:0.75rem;" onclick="triggerCheckout('${a['Student ID']}')">Checkout</button>
          ` : ''}
        </td>
      </tr>
    `;
  }).join('');

  if (pagContainer && typeof window.buildCapsulePaginationHtml === 'function') {
    pagContainer.innerHTML = window.buildCapsulePaginationHtml(state.allocLedgerPage, totalRecords, pageSize, 'changeAllocLedgerPage');
  }
}

window.changeAllocLedgerPage = function(newPage) {
  state.allocLedgerPage = newPage;
  renderAllocationsTable();
};

/**
 * Open Explain Allocation Modal
 */
window.openExplainModal = function(studentId) {
  const modal = document.getElementById('explain-modal');
  const content = document.getElementById('explain-modal-content');
  if (!modal || !content) return;

  const student = state.students.find(s => s['Student ID'] === studentId);
  if (!student) {
    content.innerHTML = `<p style="color:var(--accent-rose);">No record found for student ${studentId}.</p>`;
    modal.classList.add('active');
    return;
  }

  const currentRoomId = student['Allocated Room'];
  const currentRoom = state.rooms.find(r => r['Room ID'] === currentRoomId);
  const studentAllocations = (state.allocations || []).filter(a => a['Student ID'] === studentId);

  const activeAlloc = studentAllocations.find(a => a['Status'] === 'Active');
  const overriddenAlloc = studentAllocations.find(a => a['Status'] === 'Overridden');

  const isOverridden = Boolean(
    overriddenAlloc ||
    (activeAlloc && activeAlloc['Reason'] && activeAlloc['Reason'].includes('Manual Override')) ||
    (student['Allocation Status'] === 'Allocated' && overriddenAlloc)
  );

  // Compute live score breakdown for current room if assigned
  let liveScoreObj = { score: student['Allocation Score'] || (activeAlloc ? activeAlloc['Allocation Score'] : 0), reason: '' };
  if (currentRoom && typeof api.calculateScore === 'function') {
    liveScoreObj = api.calculateScore(student, currentRoom);
  }

  const origRoomId = overriddenAlloc ? overriddenAlloc['Room ID'] : (activeAlloc ? activeAlloc['Room ID'] : currentRoomId);
  const origRoom = state.rooms.find(r => r['Room ID'] === origRoomId);

  content.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:1rem;">
      
      ${isOverridden ? `
        <div style="background: rgba(251, 191, 36, 0.12); border: 1px solid var(--accent-amber); border-radius: var(--radius-md); padding: 1rem;">
          <div style="display:flex; align-items:center; gap:0.5rem; color:var(--accent-amber); font-weight:700; font-size:0.95rem; margin-bottom:0.4rem;">
            <span>⚠️</span> <span>Manually Overridden Assignment</span>
          </div>
          <div style="font-size:0.85rem; color:var(--text-primary); line-height:1.6;">
            This student's room assignment was manually overridden by an Administrator.
            <br>• <strong>Original Algorithmic Room:</strong> Room ${origRoom ? origRoom['Room Number'] : origRoomId} (${origRoom ? origRoom['Block'] : '-'}, Floor ${origRoom ? origRoom['Floor'] : '-'}) — Score: ${overriddenAlloc ? overriddenAlloc['Allocation Score'] : 'N/A'}/100
            <br>• <strong>Current Admin-Assigned Room:</strong> Room ${currentRoom ? currentRoom['Room Number'] : currentRoomId} (${currentRoom ? currentRoom['Block'] : '-'}, Floor ${currentRoom ? currentRoom['Floor'] : '-'})
            <br>• <strong>Admin Override Audit Reason:</strong> ${activeAlloc ? activeAlloc['Reason'] : (overriddenAlloc ? overriddenAlloc['Reason'] : 'Manual Administrative Decision')}
          </div>
        </div>
      ` : ''}

      <!-- Student Profile Details Card -->
      <div style="background:var(--bg-main); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
        <h4 style="color:var(--accent-blue); margin-bottom:0.4rem;">👤 ${student['Name']} (${student['Student ID']})</h4>
        <div style="font-size:0.85rem; color:var(--text-secondary); display:grid; grid-template-columns:1fr 1fr; gap:0.4rem;">
          <div>Gender: <strong>${student['Gender']}</strong></div>
          <div>Priority Tier: <strong>${student['Priority']}</strong></div>
          <div>Course / Branch: <strong>${student['Course']} - ${student['Branch']}</strong></div>
          <div>Special Requirement: <strong>${student['Special Requirement'] || 'None'}</strong></div>
          <div>Preferred Room Type: <strong>${student['Preferred Room Type'] || 'Single AC'}</strong></div>
          <div>Allocation Status: <strong style="color:var(--accent-emerald);">${student['Allocation Status']}</strong></div>
        </div>
      </div>

      <!-- Currently Assigned Room Details Card -->
      <div style="background:var(--bg-main); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--border-color);">
        <h4 style="color:var(--accent-emerald); margin-bottom:0.4rem;">🏠 Currently Assigned Room: ${currentRoom ? `Room ${currentRoom['Room Number']} (${currentRoom['Block']})` : (currentRoomId || 'Unallocated')}</h4>
        ${currentRoom ? `
          <div style="font-size:0.85rem; color:var(--text-secondary); display:grid; grid-template-columns:1fr 1fr; gap:0.4rem;">
            <div>Hostel Block: <strong>${currentRoom['Block']}</strong></div>
            <div>Floor Level: <strong>Floor ${currentRoom['Floor']}</strong></div>
            <div>Room Type: <strong>${currentRoom['Room Type']}</strong></div>
            <div>Current Occupancy: <strong>${currentRoom['Current Occupancy']} / ${currentRoom['Capacity']} beds</strong></div>
            <div>Available Capacity: <strong>${currentRoom['Available Beds']} beds free</strong></div>
            <div>Room Status: <strong>${currentRoom['Status']}</strong></div>
          </div>
        ` : `<p style="font-size:0.85rem; color:var(--text-muted);">No active room assignment.</p>`}
      </div>

      <!-- Live Score Breakdown Audit Card -->
      <div style="background:var(--bg-main); padding:1rem; border-radius:var(--radius-md); border:1px solid var(--accent-purple);">
        <h4 style="color:var(--accent-purple); margin-bottom:0.4rem;">
          📊 Score Breakdown Audit (Current Room Match Score: ${liveScoreObj.score}/100)
        </h4>
        <div style="font-family:monospace; font-size:0.85rem; color:var(--text-primary); white-space:pre-wrap; line-height:1.6;">${liveScoreObj.reason || (activeAlloc ? activeAlloc['Reason'] : 'Eligible matching allocation.')}</div>
      </div>

    </div>
  `;

  modal.classList.add('active');
};

/**
 * Open Override Modal with Custom Select Dropdown (AGENTS.md Rule 1.5)
 */
window.openOverrideModal = function(allocId, studentId, currentRoomId) {
  const modal = document.getElementById('override-modal');
  if (!modal) return;

  document.getElementById('override-alloc-id').value = allocId;
  document.getElementById('override-current-room').value = currentRoomId;

  // Custom Select Dropdown setup for Target Room Selection
  const dropdown = document.getElementById('override-room-dropdown');
  const triggerLabel = document.getElementById('override-room-selected-label');
  const hiddenInput = document.getElementById('override-new-room-value');

  const availableRooms = state.rooms.filter(r => r['Available Beds'] > 0 && r['Room ID'] !== currentRoomId);

  if (availableRooms.length === 0) {
    dropdown.innerHTML = `<div class="custom-select-option disabled">No available rooms for transfer</div>`;
  } else {
    dropdown.innerHTML = availableRooms.map(r => `
      <div class="custom-select-option" data-value="${r['Room ID']}">
        Room ${r['Room Number']} (${r['Block']}, Floor ${r['Floor']} - ${r['Available Beds']} beds free)
      </div>
    `).join('');

    dropdown.querySelectorAll('.custom-select-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const val = opt.getAttribute('data-value');
        if (val) {
          hiddenInput.value = val;
          triggerLabel.textContent = opt.textContent.trim();
          dropdown.classList.remove('active');
          document.getElementById('override-room-trigger')?.classList.remove('active');
        }
      });
    });
  }

  modal.classList.add('active');
};

/**
 * Submit Manual Override Re-assignment
 */
window.submitManualOverride = async function() {
  const allocId = document.getElementById('override-alloc-id').value;
  const newRoomId = document.getElementById('override-new-room-value').value;
  const reason = document.getElementById('override-reason').value;

  if (!newRoomId) {
    showToast('Please select a target room for override.', 'warning');
    return;
  }

  try {
    showLoading(true);
    const res = await api.changeRoom(allocId, newRoomId, reason);
    if (res.success) {
      closeModal('override-modal');
      await refreshAllData();
      if (typeof renderAllocationsTable === 'function') {
        renderAllocationsTable();
      }
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'danger');
    }
  } catch (e) {
    showToast(e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};
