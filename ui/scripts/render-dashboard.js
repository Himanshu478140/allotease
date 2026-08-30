/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * ui/scripts/render-dashboard.js - Dashboard Metrics & Optimization Comparison Renderer
 */

function renderDashboard() {
  const rooms = (state.rooms && Array.isArray(state.rooms)) ? state.rooms : (window.LocalMockDB ? window.LocalMockDB.rooms || [] : []);
  const students = (state.students && Array.isArray(state.students)) ? state.students : (window.LocalMockDB ? window.LocalMockDB.students || [] : []);
  const allocations = (state.allocations && Array.isArray(state.allocations)) ? state.allocations : (window.LocalMockDB ? window.LocalMockDB.allocations || [] : []);
  const waitingList = (state.waitingList && Array.isArray(state.waitingList)) ? state.waitingList : (window.LocalMockDB ? window.LocalMockDB.waitingList || [] : []);

  let totalBeds = 0;
  let occupiedBeds = 0;
  rooms.forEach(r => {
    totalBeds += parseInt(r['Capacity']) || 0;
    occupiedBeds += parseInt(r['Current Occupancy']) || 0;
  });
  const availableBeds = Math.max(0, totalBeds - occupiedBeds);
  const totalRooms = rooms.length;
  const totalStudents = students.length;
  const allocatedCount = students.filter(st => st['Allocation Status'] === 'Allocated').length;
  const unallocatedCount = students.filter(st => st['Allocation Status'] === 'Unallocated').length;
  const waitingCount = waitingList.length;
  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  const setElementText = (id, text) => {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  };

  setElementText('stat-total-students', totalStudents);
  setElementText('stat-total-rooms', totalRooms);
  setElementText('stat-total-beds', totalBeds);
  setElementText('stat-occupied-beds', occupiedBeds);
  setElementText('stat-available-beds', availableBeds);
  setElementText('stat-utilization', occupancyRate + '%');
  setElementText('stat-waiting', waitingCount);
  setElementText('stat-unallocated', unallocatedCount);

  // Dynamic Allocation Overview Card Updates
  setElementText('overview-allocated-count', allocatedCount);
  setElementText('overview-unallocated-count', unallocatedCount);
  setElementText('overview-waiting-count', waitingCount);
  setElementText('overview-occupancy-rate', occupancyRate + '%');

  setElementText('overview-progress-label', `${allocatedCount} of ${totalBeds} Total Beds Allocated (${occupancyRate}%)`);

  const progressBarFill = document.getElementById('overview-progress-bar-fill');
  if (progressBarFill) {
    progressBarFill.style.width = `${Math.min(100, Math.max(0, occupancyRate))}%`;
  }

  const lastRunEl = document.getElementById('overview-last-run');
  if (lastRunEl && state.lastAllocationRunTime) {
    lastRunEl.textContent = state.lastAllocationRunTime;
  }

  // Render Dynamic Room Availability Breakdown
  renderRoomAvailabilityBreakdown();

  // Render Recent Activity Control Center Feed
  renderRecentActivityFeed();

  // Optimization Before vs After Metrics
  const ba = state.beforeAfter || {};
  if (ba.before && ba.after) {
    setElementText('comp-util-before', (ba.before.bedUtilization || 0) + '%');
    setElementText('comp-util-after', (ba.after.bedUtilization || 0) + '%');

    setElementText('comp-score-before', (ba.before.preferenceScore || 0) + '%');
    setElementText('comp-score-after', (ba.after.preferenceScore || 0) + '%');

    setElementText('comp-unalloc-before', ba.before.unallocated || 0);
    setElementText('comp-unalloc-after', ba.after.unallocated || 0);
  }
}

/**
 * Render Dynamic Room Availability Breakdown Bars (Single, Double, Triple, AC, Non-AC)
 */
function renderRoomAvailabilityBreakdown() {
  const typeContainer = document.getElementById('room-type-availability-bars');
  const acContainer = document.getElementById('room-ac-availability-bars');
  if (!typeContainer && !acContainer) return;

  let rooms = [];
  if (window.state && Array.isArray(window.state.rooms)) {
    rooms = window.state.rooms;
  } else if (window.LocalMockDB && Array.isArray(window.LocalMockDB.rooms)) {
    rooms = window.LocalMockDB.rooms;
  }

  // Display empty state notice when room inventory is empty
  if (rooms.length === 0) {
    const emptyNotice = `<div style="padding:1rem; text-align:center; color:var(--text-muted); font-size:0.85rem; background:var(--bg-main); border:1px dashed var(--border-color); border-radius:var(--radius-sm);">No rooms in hostel inventory.</div>`;
    if (typeContainer) typeContainer.innerHTML = emptyNotice;
    if (acContainer) acContainer.innerHTML = emptyNotice;
    return;
  }

  const typeData = { 'Single': { total: 0, avail: 0 }, 'Double': { total: 0, avail: 0 }, 'Triple': { total: 0, avail: 0 } };
  const acData = { 'AC': { total: 0, avail: 0 }, 'Non-AC': { total: 0, avail: 0 } };

  rooms.forEach(r => {
    const typeStr = String(r['Room Type'] || r['Room Category'] || r.type || 'Standard');
    const cap = parseInt(r['Capacity'] || r['Total Capacity'] || r.capacity || 1, 10);
    
    let occ = 0;
    if (r['Current Occupancy'] !== undefined && r['Current Occupancy'] !== null) {
      occ = parseInt(r['Current Occupancy'], 10);
    } else if (r['Allocated Students Count'] !== undefined) {
      occ = parseInt(r['Allocated Students Count'], 10);
    } else if (window.state && Array.isArray(window.state.allocations)) {
      const roomNum = r['Room Number'] || r['Room ID'] || r.id;
      occ = window.state.allocations.filter(a => String(a['Room ID'] || a['Allocated Room'] || '').toLowerCase() === String(roomNum).toLowerCase()).length;
    }

    const avail = Math.max(0, cap - occ);

    const tLower = typeStr.toLowerCase();
    let cat = 'Double';
    if (tLower.includes('single')) cat = 'Single';
    else if (tLower.includes('triple')) cat = 'Triple';
    else if (tLower.includes('double')) cat = 'Double';
    else {
      if (!typeData[typeStr]) typeData[typeStr] = { total: 0, avail: 0 };
      cat = typeStr;
    }

    if (!typeData[cat]) typeData[cat] = { total: 0, avail: 0 };
    typeData[cat].total += cap;
    typeData[cat].avail += avail;

    const isAC = (tLower.includes('ac') && !tLower.includes('non-ac') && !tLower.includes('non ac') && !tLower.includes('nonac'));
    const acKey = isAC ? 'AC' : 'Non-AC';
    acData[acKey].total += cap;
    acData[acKey].avail += avail;
  });

  const createBarHTML = (label, avail, total, barColor = '#C2652A') => {
    const pct = total > 0 ? Math.min(100, Math.round((avail / total) * 100)) : 0;
    return `
      <div style="display:flex; align-items:center; gap:1rem;">
        <span style="width:75px; font-size:0.85rem; font-weight:600; color:var(--text-primary); flex-shrink:0;">${label}</span>
        
        <div style="flex:1; height:12px; background:#E8DFD5; border-radius:999px; overflow:hidden; position:relative; padding:1px; box-shadow:inset 0 1px 2px rgba(0,0,0,0.08);">
          <div style="width:${pct}%; height:100%; background:${barColor}; border-radius:999px; transition:width 0.5s ease;"></div>
        </div>

        <span style="font-size:0.82rem; font-weight:700; color:var(--text-primary); width:95px; text-align:right; flex-shrink:0;">
          ${avail} available
        </span>
      </div>
    `;
  };

  if (typeContainer) {
    typeContainer.innerHTML = Object.keys(typeData)
      .filter(k => typeData[k].total > 0 || typeData[k].avail > 0)
      .map(k => createBarHTML(k, typeData[k].avail, typeData[k].total, '#C2652A'))
      .join('');
  }

  if (acContainer) {
    acContainer.innerHTML = Object.keys(acData)
      .filter(k => acData[k].total > 0 || acData[k].avail > 0)
      .map(k => createBarHTML(k, acData[k].avail, acData[k].total, '#4A7C59'))
      .join('');
  }
}

/**
 * Get or initialize persistent Recent Activity Log
 */
function getOrInitializeActivityLogs() {
  // Always reload from localStorage first for multi-tab / real-time updates!
  try {
    const saved = localStorage.getItem('allotease_activity_log');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        state.activityLog = parsed;
        return parsed;
      }
    }
  } catch(e){}

  // Derived fallbacks from current system state if localStorage is empty
  const students = (state.students && Array.isArray(state.students)) ? state.students : (window.LocalMockDB ? window.LocalMockDB.students || [] : []);
  const allocations = (state.allocations && Array.isArray(state.allocations)) ? state.allocations : (window.LocalMockDB ? window.LocalMockDB.allocations || [] : []);
  
  const derived = [];

  // Recent student submissions
  const unallocated = students.filter(s => s['Allocation Status'] === 'Unallocated');
  const recentUnallocated = (unallocated.length > 0 ? unallocated : students).slice(-4).reverse();
  recentUnallocated.forEach(st => {
    derived.push({
      title: 'New Student Application',
      details: `${st['Name'] || 'Student'} (${st['Student ID'] || 'ID'}) submitted application (${st['Course'] || 'B.Tech'})`,
      type: 'application',
      time: 'Just now'
    });
  });

  // Recent allocations
  if (allocations.length > 0) {
    derived.push({
      title: 'Smart Room Allocation Finalized',
      details: `${allocations.length} applicants successfully allocated to hostel rooms`,
      type: 'allocation',
      time: 'Today'
    });
  }

  if (students.length > 0 && derived.length === 0) {
    derived.push({
      title: 'Student Database Synchronized',
      details: `${students.length} total applicant profiles recorded in database`,
      type: 'application',
      time: 'Today'
    });
  }

  state.activityLog = derived;
  try {
    localStorage.setItem('allotease_activity_log', JSON.stringify(derived));
  } catch(e){}

  return derived;
}

/**
 * Render Dynamic Recent Activity Control Center Feed
 */
function renderRecentActivityFeed() {
  const container = document.getElementById('recent-activity-feed-container');
  if (!container) return;

  const logs = getOrInitializeActivityLogs();

  if (logs.length === 0) {
    container.innerHTML = `
      <div style="padding: 1.5rem; text-align: center; color: var(--text-secondary); background: #E4D7C7; border: 1px dashed #D4C4B1; border-radius: var(--radius-md);">
        <svg viewBox="0 0 24 24" style="width: 24px; height: 24px; stroke: #78706A; stroke-width: 1.5; fill: none; margin-bottom: 0.4rem; opacity: 0.8;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 16 14"></polyline></svg>
        <div style="font-size: 0.88rem; font-weight: 600; color: var(--text-primary);">No Recent Activity Logged</div>
        <div style="font-size: 0.78rem; color: #78706A; opacity:0.9; margin-top: 0.2rem;">Live allocation events, new student applications, and room updates will appear here automatically when actions occur.</div>
      </div>
    `;
    return;
  }

  const getSvgIcon = (type) => {
    if (type === 'lightning' || type === 'allocation') {
      return `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#C2652A; stroke-width:2; fill:none;"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"></polygon></svg>`;
    } else if (type === 'user' || type === 'application') {
      return `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#605850; stroke-width:2; fill:none;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>`;
    } else if (type === 'payment') {
      return `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#2563eb; stroke-width:2; fill:none;"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`;
    } else {
      return `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#4A7C59; stroke-width:2; fill:none;"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>`;
    }
  };

  container.innerHTML = logs.map(item => `
    <div style="display:flex; align-items:center; gap:0.9rem; padding:0.85rem 1.1rem; background:#E4D7C7; border:1px solid #D6C7B4; border-radius:var(--radius-md); transition:transform 0.2s ease;">
      <div style="width:36px; height:36px; border-radius:50%; background:${item.iconBg || 'rgba(194, 101, 42, 0.15)'}; display:flex; align-items:center; justify-content:center; flex-shrink:0;">
        ${getSvgIcon(item.iconType || item.type)}
      </div>
      
      <div style="display:flex; flex-direction:column; gap:0.15rem; flex:1;">
        <span style="font-size:0.88rem; font-weight:700; color:var(--text-primary); font-family:var(--font-body);">${item.title}</span>
        <span style="font-size:0.78rem; color:#78706A; font-weight:500;">${item.details}</span>
      </div>
      ${item.time ? `<span style="font-size:0.75rem; color:#78706A; opacity:0.85; font-weight:500;">${item.time}</span>` : ''}
    </div>
  `).join('');
}

window.addActivityLog = function(entry) {
  if (!entry || !entry.title) return;

  let currentLogs = [];
  try {
    const saved = localStorage.getItem('allotease_activity_log');
    if (saved) currentLogs = JSON.parse(saved);
  } catch(e){}

  if (!Array.isArray(currentLogs)) currentLogs = state.activityLog || [];

  // Prevent duplicate log entries for identical events
  if (currentLogs.length > 0) {
    const top = currentLogs[0];
    if (top && top.title === entry.title && (top.details === entry.details || (entry.details && top.details.includes(entry.details.split(' ')[0])))) {
      return; // Skip duplicate!
    }
  }

  currentLogs.unshift(entry);
  if (currentLogs.length > 15) currentLogs.pop();

  state.activityLog = currentLogs;

  try {
    localStorage.setItem('allotease_activity_log', JSON.stringify(currentLogs));
  } catch(e){}

  if (state.currentView === 'dashboard') renderRecentActivityFeed();
};
