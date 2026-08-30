/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * ui/scripts/render-rooms.js - Room Cards Grid Renderer
 */

async function renderRoomsCards(filterText = '') {
  if (typeof renderBuildingLayoutTable === 'function') {
    renderBuildingLayoutTable(state.buildingLayout || []);
  }

  if (typeof renderPriorityTiersTable === 'function') {
    if (!state.priorityTiers || state.priorityTiers.length === 0) {
      const prioRes = await api.getPriorityTiers();
      if (prioRes && prioRes.data && prioRes.data.length > 0) {
        state.priorityTiers = prioRes.data;
      }
    }
    if (state.priorityTiers && state.priorityTiers.length > 0) {
      renderPriorityTiersTable(state.priorityTiers);
    }
  }

  // Initialize WebGL 3D Interactive Hostel Visualizer
  if (typeof window.init3DHostelVisualizer === 'function') {
    setTimeout(function() {
      window.init3DHostelVisualizer();
    }, 100);
  }

  const containers = document.querySelectorAll('.rooms-cards-container, #rooms-cards-grid, #rooms-cards-grid-setup');
  if (containers.length === 0) return;

  console.log('[REAL INVENTORY] source rooms:', state.rooms?.length);

  let filtered = state.rooms || [];
  if (filterText) {
    const q = filterText.toLowerCase();
    filtered = filtered.filter(r =>
      String(r['Room ID']).toLowerCase().includes(q) ||
      String(r['Block']).toLowerCase().includes(q) ||
      String(r['Room Number']).toLowerCase().includes(q) ||
      String(r['Room Type']).toLowerCase().includes(q)
    );
  }

  console.log('[REAL INVENTORY] rendering:', filtered?.length);

  const html = filtered.length === 0
    ? `<div style="grid-column: 1/-1; text-align:center; padding: 3rem; color: var(--text-muted);">No room records found.</div>`
    : filtered.map(r => `
        <div class="stat-card" style="position:relative;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start; gap:0.5rem;">
            <div>
              <span style="font-family:'Outfit'; font-size: 1.15rem; font-weight:700;">${escapeHtml(r['Room Number'])} (${escapeHtml(r['Block'])})</span>
              <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:0.25rem;">
                ${escapeHtml(r['Room Type'])} • Floor ${r['Floor']} • ${escapeHtml(r['Gender'])}
              </div>
            </div>
            <div style="display:flex; align-items:center; gap:0.4rem;">
              <button type="button" onclick="confirmDeleteRoom('${escapeHtml(r['Room ID'])}', '${escapeHtml(r['Room Number'])}', '${escapeHtml(r['Block'])}')" style="background:transparent; border:none; padding:0.2rem 0.3rem; color:#ef4444; cursor:pointer; display:inline-flex; align-items:center; justify-content:center; border-radius:var(--radius-sm); transition:color 0.15s ease;" title="Delete Room">
                <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:currentColor; stroke-width:2; fill:none;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
              </button>
            </div>
          </div>
          <div style="margin-top:0.85rem; display:flex; justify-content:space-between; align-items:center;">
            <span style="font-size:0.85rem; font-weight:600;">Occupancy: ${r['Current Occupancy'] || 0}/${r['Capacity']} Beds</span>
            <span style="font-size:0.75rem; color:var(--accent-emerald);">${r['Available Beds']} Available</span>
          </div>
        </div>
      `).join('');

  containers.forEach(container => {
    container.innerHTML = html;
  });

  console.log('[REAL INVENTORY] DOM cards:', document.querySelectorAll('.stat-card').length);
}

/**
 * Custom Modal Confirmation & Deletion Handler for Individual Rooms
 */
window.confirmDeleteRoom = function(roomId, roomNumber, block) {
  const room = (state.rooms || []).find(r => r['Room ID'] === roomId);
  const curOcc = room ? (parseInt(room['Current Occupancy'] || room['Occupied Beds'] || 0) || 0) : 0;

  // Remove existing modal if any
  const existing = document.getElementById('delete-room-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'delete-room-modal-overlay';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(0,0,0,0.65); backdrop-filter:blur(4px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem;';

  overlay.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); max-width:440px; width:100%; padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem; box-shadow:0 20px 25px -5px rgba(0,0,0,0.4);">
      <div>
        <h4 style="font-family:'Outfit'; font-size:1.15rem; color:var(--accent-rose); margin-bottom:0.4rem;">Delete Room Confirmation</h4>
        <p style="font-size:0.88rem; color:var(--text-primary); line-height:1.4;">
          Are you sure you want to permanently delete room <strong style="color:var(--accent-blue);">${escapeHtml(roomNumber)} (${escapeHtml(block)})</strong>?
        </p>
        ${curOcc > 0 ? `
          <div style="margin-top:0.75rem; padding:0.65rem 0.85rem; background:rgba(244, 63, 94, 0.1); border:1px solid rgba(244, 63, 94, 0.3); border-radius:var(--radius-sm); font-size:0.8rem; color:var(--accent-rose);">
            <strong>Warning:</strong> This room currently has ${curOcc} allocated student(s). Deleting it will release those beds.
          </div>
        ` : ''}
      </div>

      <div style="display:flex; justify-content:flex-end; gap:0.75rem;">
        <button class="btn btn-secondary" onclick="document.getElementById('delete-room-modal-overlay').remove()" style="padding:0.4rem 0.85rem; font-size:0.85rem;">Cancel</button>
        <button class="btn btn-danger" id="btn-confirm-delete-room" style="padding:0.4rem 0.85rem; font-size:0.85rem; background:var(--accent-rose); color:#fff; border:none; border-radius:var(--radius-sm); cursor:pointer;">Confirm Delete</button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  document.getElementById('btn-confirm-delete-room').onclick = async function() {
    overlay.remove();
    showLoading(true);
    try {
      const res = await api.deleteRoom(roomId);
      if (res && res.success) {
        state.rooms = (state.rooms || []).filter(r => r['Room ID'] !== roomId);
        if (typeof LocalMockDB !== 'undefined') {
          LocalMockDB.rooms = (LocalMockDB.rooms || []).filter(r => r['Room ID'] !== roomId);
          if (typeof saveLocalMockDB === 'function') saveLocalMockDB();
        }
        await refreshAllData();
        showToast(`Room ${roomNumber} (${block}) deleted successfully.`, 'success');
      } else {
        showToast(res.message || 'Failed to delete room.', 'error');
      }
    } catch (e) {
      showToast('Error deleting room: ' + e.message, 'error');
    } finally {
      showLoading(false);
    }
  };
};

/**
 * 3D Interactive Room Click Audit & Details Modal Handler
 */
window.showRoomDetailsModal = function(roomId) {
  const room = (state.rooms || []).find(r => 
    String(r['Room ID'] || r['Room Number'] || r.id || r.number).toLowerCase() === String(roomId).toLowerCase()
  );

  if (!room) {
    if (typeof showToast === 'function') showToast(`Room details for ID ${roomId} not found.`, 'info');
    return;
  }

  const roomNum = room['Room Number'] || room['Room ID'] || roomId;
  const block = room['Block'] || room['Block Name'] || 'Block A';
  const floor = room['Floor'] || room['Floor Level'] || '1st Floor';
  const type = room['Room Type'] || room['Room Category'] || 'Standard';
  const cap = room['Capacity'] || room['Total Capacity'] || 1;
  const occ = room['Current Occupancy'] || room['Allocated Students Count'] || 0;
  const rent = room['Monthly Rent (INR)'] || room['Monthly Rent'] || 5000;
  const status = room['Status'] || (occ >= cap ? 'Full' : occ > 0 ? 'Partial' : 'Available');

  // Find assigned students for this room
  const assignedStudents = (state.allocations || []).filter(a =>
    String(a['Room ID'] || a['Allocated Room'] || '').toLowerCase() === String(roomNum).toLowerCase() ||
    String(a['Room ID'] || a['Allocated Room'] || '').toLowerCase() === String(roomId).toLowerCase()
  );

  const existingModal = document.getElementById('modal-room-3d-details');
  if (existingModal) existingModal.remove();

  const overlay = document.createElement('div');
  overlay.id = 'modal-room-3d-details';
  overlay.style.cssText = 'position:fixed; top:0; left:0; width:100vw; height:100vh; background:rgba(96,88,80,0.5); backdrop-filter:blur(6px); z-index:9999; display:flex; align-items:center; justify-content:center; padding:1rem;';

  const allStudents = state.students || [];

  const studentsRowsHtml = assignedStudents.length === 0
    ? `<tr><td colspan="4" style="text-align:center; padding:1.25rem; color:var(--text-muted);">No students currently assigned to this room.</td></tr>`
    : assignedStudents.map(alloc => {
        const sId = String(alloc['Student ID'] || alloc.studentId || '').trim();
        const sObj = allStudents.find(s => String(s['Student ID'] || s.id || s.studentId || '').trim().toUpperCase() === sId.toUpperCase()) || {};

        const sName = alloc['Name'] || alloc['Student Name'] || sObj['Name'] || sObj['Full Name'] || sObj.name || sId;
        const sCourse = alloc['Course'] || sObj['Course'] || sObj.course || '';
        const sBranch = alloc['Branch'] || sObj['Branch'] || sObj.branch || '';
        const acadInfo = (sCourse || sBranch) ? `${sCourse} ${sBranch ? '- ' + sBranch : ''}`.trim() : 'General';

        return `
          <tr>
            <td><strong>${escapeHtml(sId)}</strong></td>
            <td><strong style="color:var(--text-primary);">${escapeHtml(sName)}</strong></td>
            <td>${escapeHtml(acadInfo)}</td>
            <td><span class="badge badge-success">Allocated</span></td>
          </tr>
        `;
      }).join('');

  overlay.innerHTML = `
    <div style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:var(--radius-md); width:100%; max-width:620px; box-shadow:0 20px 40px rgba(96,88,80,0.25); overflow:hidden;">
      <div style="padding:1.25rem 1.5rem; background:var(--bg-card-hover); border-bottom:1px solid var(--border-color); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <h3 style="font-family:'EB Garamond', serif; font-size:1.4rem; color:var(--accent-blue); margin:0;">
            Room ${escapeHtml(roomNum)} Audit (${escapeHtml(block)})
          </h3>
          <span style="font-size:0.8rem; color:var(--text-secondary);">Floor ${escapeHtml(floor)} • ${escapeHtml(type)}</span>
        </div>
        <button onclick="document.getElementById('modal-room-3d-details').remove()" style="background:transparent; border:none; font-size:1.25rem; cursor:pointer; color:var(--text-secondary);">✕</button>
      </div>

      <div style="padding:1.5rem; display:flex; flex-direction:column; gap:1.25rem;">
        <!-- Attributes Grid -->
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:0.85rem; background:var(--bg-main); padding:1rem; border-radius:var(--radius-sm); border:1px solid var(--border-color); text-align:center;">
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; text-transform:uppercase; font-weight:600;">Status</span>
            <span class="badge badge-${status === 'Full' ? 'full' : status === 'Partial' ? 'waiting' : 'available'}" style="margin-top:0.25rem; display:inline-block;">${status}</span>
          </div>
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; text-transform:uppercase; font-weight:600;">Occupancy</span>
            <strong style="font-size:1.1rem; color:var(--text-primary);">${occ} / ${cap} Beds</strong>
          </div>
          <div>
            <span style="font-size:0.75rem; color:var(--text-muted); display:block; text-transform:uppercase; font-weight:600;">Monthly Rent</span>
            <strong style="font-size:1.1rem; color:var(--accent-blue);">₹${rent}</strong>
          </div>
        </div>

        <!-- Assigned Students List -->
        <div>
          <h5 style="font-family:'EB Garamond', serif; font-size:1.1rem; color:var(--text-primary); margin-bottom:0.65rem;">
            Assigned Room Residents (${assignedStudents.length})
          </h5>
          <div class="table-responsive" style="max-height:220px; overflow-y:auto;">
            <table class="data-table" style="font-size:0.85rem;">
              <thead>
                <tr>
                  <th>Student ID</th>
                  <th>Full Name</th>
                  <th>Academic Info</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${studentsRowsHtml}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);
};
