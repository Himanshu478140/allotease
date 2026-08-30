/**
 * AllotEase - Property Setup & Weight Simulator View Controller
 * ui/scripts/render-property-setup.js
 */

if (!state.propertySubTab) state.propertySubTab = 'config';

/**
 * Switch Property Setup Subtab (Factor Config & Intake / What-If Weight Simulator)
 */
window.switchPropertySubTab = function (tab) {
  state.propertySubTab = tab;

  const buttons = document.querySelectorAll('.prop-subtab');
  buttons.forEach(b => {
    if (b.getAttribute('data-tab') === tab) {
      b.classList.remove('btn-secondary');
      b.classList.add('btn-primary', 'active');
    } else {
      b.classList.remove('btn-primary', 'active');
      b.classList.add('btn-secondary');
    }
  });

  const configPanel = document.getElementById('prop-config-panel');
  const simPanel = document.getElementById('prop-simulator-panel');

  if (tab === 'simulator') {
    if (configPanel) configPanel.style.display = 'none';
    if (simPanel) simPanel.style.display = 'flex';
  } else {
    if (simPanel) simPanel.style.display = 'none';
    if (configPanel) configPanel.style.display = 'flex';
  }
};

/**
 * Render Property Setup View
 */
async function renderPropertySetupView() {
  const container = document.getElementById('view-property-setup');
  if (!container) return;

  try {
    showLoading(true);

    const [propRes, intakeRes, prioRes, layoutRes] = await Promise.all([
      api.getPropertyConfig(),
      api.getFormIntakeConfig(),
      api.getPriorityTiers(),
      api.getBuildingLayout()
    ]);

    const propertyConfig = propRes.data || { softFactors: [], hardConstraints: {} };
    const intakeConfig = intakeRes.data || {};

    state.propertyConfig = propertyConfig;
    state.intakeConfig = intakeConfig;
    state.priorityTiers = prioRes.data || [
      { name: '♿ Differently-Abled / Special Needs', desc: 'Medical disability, wheelchair access, or ground floor requirement' },
      { name: '📍 Farthest Distance from Campus', desc: 'Outstation applicants residing > 200 km from college' },
      { name: '🎓 Final Year Senior Students', desc: 'Seniors completing final year degree requirements' },
      { name: '🌟 First Year Freshmen Batch', desc: 'New admissions entering college hostel for first time' },
      { name: '👥 General Applicants / Local Quota', desc: 'Standard applicants and local city residents' }
    ];
    state.buildingLayout = layoutRes.data || [
      { block: 'Block A', floor: '1', type: 'Single AC', startNo: '101', count: 10, rent: 10000 },
      { block: 'Block A', floor: '1', type: 'Double Non-AC', startNo: '101', count: 15, rent: 6000 },
      { block: 'Block A', floor: '2', type: 'Double AC', startNo: '201', count: 12, rent: 8500 },
      { block: 'Block B', floor: '1', type: 'Triple Non-AC', startNo: '101', count: 8, rent: 5000 }
    ];

    renderIntakeSetupCard(intakeConfig);
    renderBuildingLayoutTable(state.buildingLayout);
    renderPriorityTiersTable(state.priorityTiers);
    renderSoftFactorsTable(propertyConfig.softFactors || []);
    renderHardConstraintsCard(propertyConfig.hardConstraints || {});
    renderCollegeLocationCard(propertyConfig);

  } catch (e) {
    showToast('Error loading Property Setup: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
}

/**
 * Render College Location & Distance Priority Controls
 */
function renderCollegeLocationCard(propertyConfig) {
  if (!propertyConfig) return;
  const loc = propertyConfig.collegeLocation || window.DEFAULT_COLLEGE_LOCATION || { name: 'Sector 16 C, Dwarka, New Delhi', latitude: 28.5921, longitude: 77.0460 };
  const factors = propertyConfig.softFactors || [];
  const distFactor = factors.find(f => f.key === 'distance') || { weight: 20, active: false };

  const nameInput = document.getElementById('cfg-college-name');
  const latInput = document.getElementById('cfg-college-lat');
  const lngInput = document.getElementById('cfg-college-lng');
  const distActiveInput = document.getElementById('cfg-distance-active');
  const distWeightInput = document.getElementById('cfg-distance-weight');

  if (nameInput) nameInput.value = loc.name || 'Sector 16 C, Dwarka, New Delhi';
  if (latInput) latInput.value = typeof loc.latitude === 'number' ? loc.latitude : 28.5921;
  if (lngInput) lngInput.value = typeof loc.longitude === 'number' ? loc.longitude : 77.0460;
  if (distActiveInput) distActiveInput.checked = distFactor.active !== false;
  if (distWeightInput) distWeightInput.value = distFactor.weight || 20;
}
window.renderCollegeLocationCard = renderCollegeLocationCard;

window.syncAndAutoSaveCollegeLocation = async function() {
  if (!state.propertyConfig) state.propertyConfig = { softFactors: [], hardConstraints: {} };

  const name = document.getElementById('cfg-college-name')?.value.trim() || 'Sector 16 C, Dwarka, New Delhi';
  const latitude = parseFloat(document.getElementById('cfg-college-lat')?.value) || 28.5921;
  const longitude = parseFloat(document.getElementById('cfg-college-lng')?.value) || 77.0460;
  const distActive = document.getElementById('cfg-distance-active') ? document.getElementById('cfg-distance-active').checked : true;
  const distWeight = document.getElementById('cfg-distance-weight') ? (parseFloat(document.getElementById('cfg-distance-weight').value) || 20) : 20;

  state.propertyConfig.collegeLocation = { name, latitude, longitude };

  if (!state.propertyConfig.softFactors) state.propertyConfig.softFactors = [];
  let distFactor = state.propertyConfig.softFactors.find(f => f.key === 'distance');
  if (!distFactor) {
    distFactor = { key: 'distance', label: 'Home Distance Priority (Outstation Student Queue Factor)', studentField: 'Home Distance (km)', roomField: 'Distance Category' };
    state.propertyConfig.softFactors.push(distFactor);
  }
  distFactor.active = distActive;
  distFactor.weight = distWeight;

  await api.savePropertyConfig(state.propertyConfig.softFactors, state.propertyConfig.hardConstraints, state.propertyConfig.collegeLocation);
};

window.ALLOTEASE_PREDEFINED_PRIORITY_TIERS = [
  { key: 'distance', name: 'Distance Based Priority', desc: 'Outstation applicants residing farther from campus (calculated via home PIN code distance)' },
  { key: 'international', name: 'International Student Priority', desc: 'Foreign, NRI, or international applicants residing outside the host country' },
  { key: 'first_come', name: 'First-Come, First-Served', desc: 'Submission timestamp / registration order priority for early applicants' },
  { key: 'rank_distance', name: 'Rank Based + Distance Priority', desc: 'Composite priority combining academic merit/rank score with home distance priority' }
];

function sanitizePriorityTiers(tiers) {
  const predefined = window.ALLOTEASE_PREDEFINED_PRIORITY_TIERS;
  if (!tiers || !Array.isArray(tiers) || tiers.length === 0) {
    return predefined.map(p => ({ ...p, active: true }));
  }

  const result = [];
  const addedKeys = new Set();

  tiers.forEach(t => {
    const rawName = String(t.name || '').toLowerCase();
    let matched = predefined.find(p => p.key === t.key);
    if (!matched) {
      if (rawName.includes('distance') && !rawName.includes('rank')) matched = predefined[0];
      else if (rawName.includes('internation') || rawName.includes('foreign') || rawName.includes('nri')) matched = predefined[1];
      else if (rawName.includes('first') || rawName.includes('come') || rawName.includes('served') || rawName.includes('timestamp')) matched = predefined[2];
      else if (rawName.includes('rank')) matched = predefined[3];
    }

    if (matched && !addedKeys.has(matched.key)) {
      addedKeys.add(matched.key);
      result.push({
        key: matched.key,
        name: matched.name,
        desc: matched.desc,
        rank: result.length + 1,
        active: t.active !== false
      });
    }
  });

  predefined.forEach(p => {
    if (!addedKeys.has(p.key)) {
      addedKeys.add(p.key);
      result.push({
        key: p.key,
        name: p.name,
        desc: p.desc,
        rank: result.length + 1,
        active: true
      });
    }
  });

  return result;
}

/**
 * Render Priority Hierarchy Table (Predefined 4 Tiers with Re-order Queue & Enable Checkbox)
 */
function renderPriorityTiersTable(tiers) {
  const tbodies = document.querySelectorAll('#priority-tiers-tbody');
  if (tbodies.length === 0) return;

  const sanitized = sanitizePriorityTiers(tiers);
  state.priorityTiers = sanitized;

  tbodies.forEach(tbody => {
    tbody.innerHTML = sanitized.map((item, idx) => `
      <tr data-index="${idx}" data-key="${item.key || ''}">
        <td style="text-align:center; font-weight:700;">
          <span class="badge ${idx === 0 ? 'badge-priority' : 'badge-allocated'}" style="font-size:0.85rem; padding:0.3rem 0.65rem;">
            Rank #${idx + 1}
          </span>
        </td>
        <td>
          <div style="font-weight:700; color:var(--accent-blue); font-size:0.9rem; display:flex; align-items:center; gap:0.4rem;">
            ${escapeHtml(item.name)}
          </div>
          <input type="hidden" class="pt-key" value="${escapeHtml(item.key || '')}">
          <input type="hidden" class="pt-name" value="${escapeHtml(item.name)}">
          <input type="hidden" class="pt-desc" value="${escapeHtml(item.desc)}">
        </td>
        <td style="text-align:center;">
          <div style="display:inline-flex; gap:0.35rem;">
            <button class="btn btn-secondary" onclick="movePriorityTier(${idx}, -1)" ${idx === 0 ? 'disabled' : ''} style="padding:0.25rem 0.55rem; font-size:0.8rem;" title="Re-order Up in Queue">▲</button>
            <button class="btn btn-secondary" onclick="movePriorityTier(${idx}, 1)" ${idx === sanitized.length - 1 ? 'disabled' : ''} style="padding:0.25rem 0.55rem; font-size:0.8rem;" title="Re-order Down in Queue">▼</button>
          </div>
        </td>
        <td style="text-align:center;">
          <input type="checkbox" class="pt-active-chk" ${item.active !== false ? 'checked' : ''} onchange="togglePriorityTierActive(${idx}, this.checked)" style="width:18px; height:18px; cursor:pointer; accent-color:var(--accent-blue);" title="Enable / Disable Priority Tier">
        </td>
      </tr>
    `).join('');
  });
}

function syncPriorityTiersFromDOM() {
  const rows = document.querySelectorAll('#priority-tiers-tbody tr');
  if (!rows || rows.length === 0) return;

  const currentTiers = [];
  rows.forEach((r, idx) => {
    const keyInput = r.querySelector('.pt-key');
    const nameInput = r.querySelector('.pt-name');
    const descInput = r.querySelector('.pt-desc');
    const chk = r.querySelector('.pt-active-chk');
    const key = keyInput ? keyInput.value : '';
    const name = nameInput ? nameInput.value : '';
    const desc = descInput ? descInput.value : '';
    const active = chk ? chk.checked : true;
    if (name) {
      currentTiers.push({ rank: idx + 1, key, name, desc, active });
    }
  });

  if (currentTiers.length > 0) {
    state.priorityTiers = currentTiers;
  }
}

window.syncAndAutoSavePriorityTiers = function() {
  syncPriorityTiersFromDOM();
  if (state.priorityTiers && state.priorityTiers.length > 0) {
    api.savePriorityTiers(state.priorityTiers);
  }
};

window.movePriorityTier = async function (index, direction) {
  if (!state.priorityTiers) state.priorityTiers = sanitizePriorityTiers([]);
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= state.priorityTiers.length) return;

  const temp = state.priorityTiers[index];
  state.priorityTiers[index] = state.priorityTiers[newIndex];
  state.priorityTiers[newIndex] = temp;

  state.priorityTiers.forEach((t, i) => t.rank = i + 1);

  renderPriorityTiersTable(state.priorityTiers);
  await api.savePriorityTiers(state.priorityTiers);
  showToast(`Updated Priority Rank #${newIndex + 1}: ${temp.name}`, 'success');
};

window.togglePriorityTierActive = async function (index, isChecked) {
  if (!state.priorityTiers) state.priorityTiers = sanitizePriorityTiers([]);
  if (state.priorityTiers[index]) {
    state.priorityTiers[index].active = isChecked;
    renderPriorityTiersTable(state.priorityTiers);
    await api.savePriorityTiers(state.priorityTiers);
    showToast(`${isChecked ? 'Enabled' : 'Disabled'} ${state.priorityTiers[index].name}`, isChecked ? 'success' : 'warning');
  }
};

/**
 * Render Building Layout & Room Inventory Setup Table
 */
function renderBuildingLayoutTable(layout) {
  const tbodies = document.querySelectorAll('#building-layout-tbody');
  if (tbodies.length === 0) return;

  tbodies.forEach(tbody => {
    if (!layout || layout.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No building layout defined. Click "➕ Add Layout Row" to specify room counts.</td></tr>`;
      return;
    }

    tbody.innerHTML = layout.map((item, idx) => `
      <tr data-index="${idx}">
        <td>
          <input type="text" class="input-field bl-block" value="${item.block || 'Block A'}" style="font-size:0.85rem;" oninput="syncAndAutoSaveBuildingLayout()" onchange="updateLayoutSummaryMetrics()">
        </td>
        <td>
          <input type="text" class="input-field bl-floor" value="${item.floor || '1'}" style="font-size:0.85rem;" oninput="syncAndAutoSaveBuildingLayout()" onchange="updateLayoutSummaryMetrics()">
        </td>
        <td>
          <select class="input-field bl-type" style="font-size:0.85rem; background:var(--bg-main); color:var(--text-primary); cursor:pointer;" onchange="syncAndAutoSaveBuildingLayout(); updateLayoutSummaryMetrics();">
            <option value="Single AC" ${item.type === 'Single AC' ? 'selected' : ''}>Single AC</option>
            <option value="Single Non-AC" ${item.type === 'Single Non-AC' ? 'selected' : ''}>Single Non-AC</option>
            <option value="Double AC" ${item.type === 'Double AC' ? 'selected' : ''}>Double AC</option>
            <option value="Double Non-AC" ${item.type === 'Double Non-AC' ? 'selected' : ''}>Double Non-AC</option>
            <option value="Triple AC" ${item.type === 'Triple AC' ? 'selected' : ''}>Triple AC</option>
            <option value="Triple Non-AC" ${item.type === 'Triple Non-AC' ? 'selected' : ''}>Triple Non-AC</option>
          </select>
        </td>
        <td>
          <input type="text" class="input-field bl-start" value="${item.startNo || (item.floor + '01')}" placeholder="e.g. 101, A-101, or 101,102,103A" style="font-size:0.8rem;" oninput="syncAndAutoSaveBuildingLayout()" title="Enter starting number like 101 or comma-separated list like 101,102,103A">
        </td>
        <td>
          <input type="number" class="input-field bl-count" value="${item.count || 10}" min="1" max="100" style="font-size:0.85rem;" oninput="syncAndAutoSaveBuildingLayout(); updateLayoutSummaryMetrics();">
        </td>
        <td>
          <input type="number" class="input-field bl-rent" value="${item.rent || 8000}" step="500" style="font-size:0.85rem;" oninput="syncAndAutoSaveBuildingLayout()">
        </td>
        <td style="text-align:center;">
          <button class="btn btn-secondary" onclick="deleteBuildingLayoutRow(${idx})" style="padding:0.25rem 0.5rem; font-size:0.8rem; color:var(--accent-rose);" title="Delete Row">✕</button>
        </td>
      </tr>
    `).join('');
  });

  updateLayoutSummaryMetrics();
}

/**
 * Updates Live Capacity Summary Metrics
 */
function updateLayoutSummaryMetrics() {
  const tbodies = document.querySelectorAll('#building-layout-tbody');
  tbodies.forEach(tbody => {
    const rows = tbody.querySelectorAll('tr');
    let totalRooms = 0;
    let acRooms = 0;
    let nonAcRooms = 0;
    let totalBeds = 0;

    rows.forEach(r => {
      const type = r.querySelector('.bl-type')?.value || 'Double Non-AC';
      const count = parseInt(r.querySelector('.bl-count')?.value) || 0;

      let cap = 2;
      if (type.includes('Single')) cap = 1;
      else if (type.includes('Triple')) cap = 3;
      else if (type.includes('Double')) cap = 2;

      const isAC = type.includes('AC') && !type.includes('Non-AC');

      totalRooms += count;
      totalBeds += (count * cap);
      if (isAC) {
        acRooms += count;
      } else {
        nonAcRooms += count;
      }
    });

    const setTxt = (id, text) => {
      const el = document.getElementById(id);
      if (el) el.textContent = text;
    };

    setTxt('layout-total-rooms', `${totalRooms} Rooms`);
    setTxt('layout-ac-rooms', `${acRooms} AC`);
    setTxt('layout-nonac-rooms', `${nonAcRooms} Non-AC`);
    setTxt('layout-total-beds', `${totalBeds} Beds`);
  });
}

window.syncBuildingLayoutFromDOM = function () {
  let tbodies = document.querySelectorAll('#building-layout-tbody');
  let activeTbody = null;
  tbodies.forEach(tb => {
    if (tb.offsetParent !== null || !activeTbody) activeTbody = tb;
  });

  const rows = activeTbody ? activeTbody.querySelectorAll('tr') : [];
  if (rows.length === 0) return;

  const currentLayout = [];
  rows.forEach(r => {
    const block = r.querySelector('.bl-block')?.value.trim() || 'Block A';
    const floor = r.querySelector('.bl-floor')?.value.trim() || '1';
    const type = r.querySelector('.bl-type')?.value || 'Double Non-AC';
    const startNo = r.querySelector('.bl-start')?.value.trim() || r.querySelector('.bl-startno')?.value.trim() || '101';
    const count = parseInt(r.querySelector('.bl-count')?.value) || 1;
    const rent = parseFloat(r.querySelector('.bl-rent')?.value) || 6000;

    currentLayout.push({ block, floor, type, startNo, count, rent });
  });

  if (currentLayout.length > 0) {
    state.buildingLayout = currentLayout;
  }
};

window.syncAndAutoSaveBuildingLayout = function() {
  syncBuildingLayoutFromDOM();
  if (state.buildingLayout && state.buildingLayout.length > 0) {
    api.saveBuildingLayout(state.buildingLayout);
  }
};

/**
 * Adds a new Building Layout row
 */
window.addBuildingLayoutRow = async function () {
  window.syncBuildingLayoutFromDOM();
  if (!state.buildingLayout) state.buildingLayout = [];
  state.buildingLayout.push({
    block: 'Block A',
    floor: '1',
    type: 'Double Non-AC',
    startNo: '101',
    count: 10,
    rent: 6000
  });

  renderBuildingLayoutTable(state.buildingLayout);
  await api.saveBuildingLayout(state.buildingLayout);
};

/**
 * Deletes a Building Layout row
 */
window.deleteBuildingLayoutRow = async function (index) {
  window.syncBuildingLayoutFromDOM();
  if (!state.buildingLayout) return;
  state.buildingLayout.splice(index, 1);
  renderBuildingLayoutTable(state.buildingLayout);
  await api.saveBuildingLayout(state.buildingLayout);
};

/**
 * Applies Building Layout matrix to Rooms Database
 */
window.applyBuildingLayoutToRooms = async function () {
  console.log('[REAL APPLY] clicked');

  let tbodies = document.querySelectorAll('#building-layout-tbody');
  let activeTbody = null;
  tbodies.forEach(tb => {
    if (tb.offsetParent !== null || !activeTbody) activeTbody = tb;
  });

  const rows = activeTbody ? activeTbody.querySelectorAll('tr') : [];
  console.log('[REAL APPLY] layout rows:', rows.length);

  if (rows.length === 0) {
    showToast('Please add at least one building layout row before applying.', 'warning');
    return;
  }

  const newRooms = [];
  const layoutStateData = [];
  const usedRoomNumsPerBlock = {};

  // Map existing rooms by Room ID to preserve occupancy, full status, and allocated student ties
  const existingRoomsMap = new Map();
  const existingRooms = (state.rooms || (typeof LocalMockDB !== 'undefined' ? LocalMockDB.rooms : [])) || [];
  existingRooms.forEach(r => {
    if (r && r['Room ID']) {
      existingRoomsMap.set(String(r['Room ID']).trim().toUpperCase(), r);
    }
  });

  rows.forEach((r, idx) => {
    const block = r.querySelector('.bl-block')?.value.trim() || 'Block A';
    const floor = parseInt(r.querySelector('.bl-floor')?.value) || 1;
    const type = r.querySelector('.bl-type')?.value || 'Double Non-AC';
    const startInput = r.querySelector('.bl-start')?.value.trim() || `${floor}01`;
    const count = parseInt(r.querySelector('.bl-count')?.value) || 10;
    const rent = parseFloat(r.querySelector('.bl-rent')?.value) || 8000;

    if (!usedRoomNumsPerBlock[block]) {
      usedRoomNumsPerBlock[block] = new Set();
    }

    layoutStateData.push({ block, floor: String(floor), type, startNo: startInput, count, rent });

    let capacity = 2;
    if (type.includes('Single')) capacity = 1;
    else if (type.includes('Triple')) capacity = 3;
    else if (type.includes('Double')) capacity = 2;

    const ac = (type.includes('AC') && !type.includes('Non-AC')) ? 'AC' : 'Non-AC';

    let roomNumbersList = [];
    if (startInput.includes(',')) {
      roomNumbersList = startInput.split(',').map(s => s.trim()).filter(Boolean);
    } else {
      const match = startInput.match(/^(.*?)[-_\s]*(\d+)$/);
      if (match) {
        const prefix = match[1] ? (match[1] + '-') : '';
        let startNum = parseInt(match[2], 10);
        const padLen = match[2].length;

        // Auto-continue room numbers if startNum collides with existing room numbers in block
        while (usedRoomNumsPerBlock[block].has(`${prefix}${String(startNum).padStart(padLen, '0')}`)) {
          startNum++;
        }

        for (let i = 0; i < count; i++) {
          let numStr = `${prefix}${String(startNum + i).padStart(padLen, '0')}`;
          while (usedRoomNumsPerBlock[block].has(numStr)) {
            startNum++;
            numStr = `${prefix}${String(startNum + i).padStart(padLen, '0')}`;
          }
          roomNumbersList.push(numStr);
        }
      } else {
        for (let i = 0; i < count; i++) {
          roomNumbersList.push(`${startInput}-${i + 1}`);
        }
      }
    }

    roomNumbersList.forEach(roomNum => {
      usedRoomNumsPerBlock[block].add(roomNum);
      const roomId = `RM-${block.replace(/\s+/g, '')}-${roomNum}`;
      const cleanRoomId = roomId.toUpperCase();
      const existing = existingRoomsMap.get(cleanRoomId);

      if (existing) {
        // PRESERVE existing room occupancy, status, gender, and student allocation ties!
        const curOcc = parseInt(existing['Current Occupancy'] || existing['Occupied Beds'] || 0) || 0;
        const availBeds = Math.max(0, capacity - curOcc);
        let roomStatus = existing['Status'] || 'Available';
        if (roomStatus !== 'Maintenance') {
          roomStatus = (availBeds === 0) ? 'Full' : 'Available';
        }

        newRooms.push({
          ...existing,
          'Room ID': roomId,
          'Room Number': roomNum,
          'Block': block,
          'Floor': floor,
          'Room Type': type,
          'Capacity': capacity,
          'Current Occupancy': curOcc,
          'Occupied Beds': curOcc,
          'Available Beds': availBeds,
          'Rent (₹)': rent,
          'Status': roomStatus,
          'AC Status': ac
        });
        existingRoomsMap.delete(cleanRoomId);
      } else {
        // BRAND NEW room
        newRooms.push({
          'Room ID': roomId,
          'Room Number': roomNum,
          'Block': block,
          'Floor': floor,
          'Room Type': type,
          'Capacity': capacity,
          'Current Occupancy': 0,
          'Occupied Beds': 0,
          'Available Beds': capacity,
          'Gender': 'Any',
          'Rent (₹)': rent,
          'Status': 'Available',
          'AC Status': ac
        });
      }
    });
  });

  // Preserve any remaining existing rooms that were not in the generated layout block (e.g. custom rooms)
  existingRoomsMap.forEach((roomObj) => {
    newRooms.push(roomObj);
  });

  console.log('[REAL APPLY] generated rooms:', newRooms.length);
  console.table(newRooms);

  if (typeof LocalMockDB !== 'undefined') {
    console.log('[REAL APPLY] rooms before save:', LocalMockDB.rooms?.length);
  }

  try {
    showLoading(true);
    state.buildingLayout = layoutStateData;
    await api.saveBuildingLayout(layoutStateData);

    // 1. Persist generated rooms to database/storage via API
    if (typeof api.saveRooms === 'function') {
      await api.saveRooms(newRooms);
    } else if (typeof LocalMockDB !== 'undefined') {
      LocalMockDB.rooms = newRooms;
    }

    // 2. Immediate direct state update and room cards rendering
    state.rooms = newRooms;

    if (typeof LocalMockDB !== 'undefined') {
      console.log('[REAL APPLY] rooms after save:', LocalMockDB.rooms?.length);
    }
    console.log('[REAL APPLY] state.rooms:', state.rooms?.length);

    if (typeof renderRoomsCards === 'function') renderRoomsCards();
    renderBuildingLayoutTable(state.buildingLayout);

    // 3. Peripheral data refresh runs in background without blocking room card rendering
    refreshAllData().catch(err => console.warn('Background refresh warning:', err));

    const cardsGrid = document.getElementById('rooms-cards-grid');
    if (cardsGrid) {
      cardsGrid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    showToast(`Successfully configured ${newRooms.length} rooms in building inventory!`, 'success');
  } catch (e) {
    console.error('[Building Layout Error]', e);
    showToast('Error applying layout: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

/**
 * Render Soft Preference Scoring Factors Table (Friendly Dropdown Customizer)
 */
function renderSoftFactorsTable(softFactors) {
  const tbody = document.getElementById('soft-factors-tbody');
  if (!tbody) return;

  if (!softFactors || softFactors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:1.5rem; color:var(--text-muted);">No matching rules configured. Click "➕ Add Matching Rule" to create one.</td></tr>`;
    return;
  }

  const studentOptions = [
    'Preferred Room Type',
    'AC Preference',
    'Preferred Occupancy',
    'Preferred Block',
    'Preferred Floor',
    'Preferred Roommates',
    'Special Requirement',
    'Priority',
    'Home Distance (km)'
  ];

  const roomOptions = [
    'Room Type',
    'AC Status',
    'Capacity',
    'Block',
    'Floor',
    'occupants',
    'Special Requirement',
    'Gender',
    'Status'
  ];

  tbody.innerHTML = softFactors.map((f, idx) => {
    const currentStudentField = f.studentField || 'Preferred Room Type';
    const currentRoomField = f.roomField || 'Room Type';

    const sOpts = Array.from(new Set([...studentOptions, currentStudentField]));
    const rOpts = Array.from(new Set([...roomOptions, currentRoomField]));

    return `
      <tr data-index="${idx}">
        <td>
          <input type="text" class="input-field sf-label" value="${f.label || ''}" placeholder="Rule Name (e.g. AC Match)" style="font-size:0.85rem; font-weight:600;">
          <input type="hidden" class="sf-key" value="${f.key || 'rule_' + (idx + 1)}">
        </td>
        <td>
          <select class="input-field sf-studentfield" style="font-size:0.85rem; background:var(--bg-main); color:var(--text-primary); cursor:pointer;">
            ${sOpts.map(opt => `<option value="${opt}" ${opt === currentStudentField ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </td>
        <td>
          <select class="input-field sf-roomfield" style="font-size:0.85rem; background:var(--bg-main); color:var(--text-primary); cursor:pointer;">
            ${rOpts.map(opt => `<option value="${opt}" ${opt === currentRoomField ? 'selected' : ''}>${opt}</option>`).join('')}
          </select>
        </td>
        <td style="text-align:center;">
          <input type="checkbox" class="sf-active" ${f.active !== false ? 'checked' : ''} style="accent-color:var(--accent-blue); width:20px; height:20px; cursor:pointer;">
        </td>
        <td style="text-align:center;">
          <button class="btn btn-secondary" onclick="deleteSoftFactorRow(${idx})" style="padding:0.25rem 0.5rem; font-size:0.8rem; color:var(--accent-rose);" title="Delete Rule">✕</button>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Render Hard Allocation Constraints Controls
 */
function renderHardConstraintsCard(hardConstraints) {
  if (!hardConstraints) return;
  const hcGender = document.getElementById('hc-gender-match');
  const hcGround = document.getElementById('hc-ground-floor');

  if (hcGender) hcGender.checked = hardConstraints.genderMatch !== false;
  if (hcGround) hcGround.checked = hardConstraints.groundFloorAccess !== false;
}
window.renderHardConstraintsCard = renderHardConstraintsCard;

window.syncAndAutoSaveHardConstraints = async function() {
  if (!state.propertyConfig) state.propertyConfig = { softFactors: [], hardConstraints: {} };
  const hcGenderElem = document.getElementById('hc-gender-match');
  const hcGroundElem = document.getElementById('hc-ground-floor');

  const genderMatch = hcGenderElem ? hcGenderElem.checked : (state.propertyConfig.hardConstraints ? state.propertyConfig.hardConstraints.genderMatch !== false : true);
  const groundFloorAccess = hcGroundElem ? hcGroundElem.checked : (state.propertyConfig.hardConstraints ? state.propertyConfig.hardConstraints.groundFloorAccess !== false : true);

  state.propertyConfig.hardConstraints = { genderMatch, groundFloorAccess };
  await api.savePropertyConfig(state.propertyConfig.softFactors || [], state.propertyConfig.hardConstraints, state.propertyConfig.collegeLocation, state.propertyConfig.autoEmailNotices);
};

window.renderEmailNoticesCard = function(autoEmailNotices) {
  const elem = document.getElementById('chk-send-email-notifications');
  if (elem) elem.checked = autoEmailNotices !== false;
};

window.syncAndAutoSaveEmailNotices = async function() {
  if (!state.propertyConfig) state.propertyConfig = { softFactors: [], hardConstraints: {} };
  const elem = document.getElementById('chk-send-email-notifications');
  const autoEmailNotices = elem ? elem.checked : (state.propertyConfig.autoEmailNotices !== false);
  state.propertyConfig.autoEmailNotices = autoEmailNotices;

  await api.savePropertyConfig(
    state.propertyConfig.softFactors || [],
    state.propertyConfig.hardConstraints || {},
    state.propertyConfig.collegeLocation,
    state.propertyConfig.autoEmailNotices
  );
};

/**
 * Adds a new soft factor row
 */
window.addSoftFactorRow = function () {
  if (!state.propertyConfig) state.propertyConfig = { softFactors: [] };
  if (!state.propertyConfig.softFactors) state.propertyConfig.softFactors = [];

  state.propertyConfig.softFactors.push({
    key: 'custom_rule_' + (state.propertyConfig.softFactors.length + 1),
    label: 'New Matching Rule',
    weight: 10,
    studentField: 'Preferred Room Type',
    roomField: 'Room Type',
    active: true
  });

  renderSoftFactorsTable(state.propertyConfig.softFactors);
};

/**
 * Deletes a soft factor row
 */
window.deleteSoftFactorRow = function (index) {
  if (!state.propertyConfig || !state.propertyConfig.softFactors) return;
  state.propertyConfig.softFactors.splice(index, 1);
  renderSoftFactorsTable(state.propertyConfig.softFactors);
};

/**
 * Resets Property Config to Hostel Baseline Defaults
 */
window.resetToHostelDefaults = async function () {
  const confirmed = await showConfirmDialog('Reset to Hostel Defaults', 'Are you sure you want to reset all scoring factors to Hostel baseline defaults?');
  if (!confirmed) return;

  const defaultFactors = [
    { key: 'acPreference', label: 'AC / Non-AC Match', weight: 10, studentField: 'AC Preference', roomField: 'AC Status', active: true },
    { key: 'occupancyType', label: 'Bed Capacity Preference (Single/Double/Triple)', weight: 10, studentField: 'Preferred Occupancy', roomField: 'Capacity', active: true },
    { key: 'roomType', label: 'Exact Room Type Match (e.g. Single AC)', weight: 10, studentField: 'Preferred Room Type', roomField: 'Room Type', active: true },
    { key: 'distance', label: 'Home Distance Priority', weight: 10, studentField: 'Home Distance (km)', roomField: 'Distance Category', active: true }
  ];

  const defaultHardConstraints = { genderMatch: true, groundFloorAccess: true };

  state.propertyConfig.softFactors = defaultFactors;
  state.propertyConfig.hardConstraints = defaultHardConstraints;

  renderSoftFactorsTable(defaultFactors);
  renderHardConstraintsCard(defaultHardConstraints);

  await savePropertyConfigFromUI();
};

/**
 * Saves Property Configuration from UI form fields
 */
window.savePropertyConfigFromUI = async function () {
  const rows = document.querySelectorAll('#soft-factors-tbody tr');
  const softFactors = [];

  rows.forEach((r, idx) => {
    let key = r.querySelector('.sf-key')?.value.trim();
    const label = r.querySelector('.sf-label')?.value.trim();
    const studentField = r.querySelector('.sf-studentfield')?.value;
    const roomField = r.querySelector('.sf-roomfield')?.value;
    const active = r.querySelector('.sf-active')?.checked;

    if (!key) key = 'rule_' + (idx + 1);

    if (label) {
      softFactors.push({ key, label, weight: 10, studentField, roomField, active });
    }
  });

  // Collect Priority Hierarchy Tiers from UI table
  const prioRows = document.querySelectorAll('#priority-tiers-tbody tr');
  const updatedPriorityTiers = [];
  prioRows.forEach((r, idx) => {
    const name = r.querySelector('.pt-name')?.value.trim();
    const desc = r.querySelector('.pt-desc')?.value.trim() || '';
    if (name) {
      updatedPriorityTiers.push({ rank: idx + 1, name, desc });
    }
  });

  const hcGenderElem = document.getElementById('hc-gender-match');
  const hcGroundElem = document.getElementById('hc-ground-floor');

  const hardConstraints = {
    genderMatch: hcGenderElem ? hcGenderElem.checked : (state.propertyConfig?.hardConstraints?.genderMatch !== false),
    groundFloorAccess: hcGroundElem ? hcGroundElem.checked : (state.propertyConfig?.hardConstraints?.groundFloorAccess !== false)
  };

  try {
    showLoading(true);
    window.syncBuildingLayoutFromDOM();
    if (state.buildingLayout && state.buildingLayout.length > 0) {
      await api.saveBuildingLayout(state.buildingLayout);
    }

    if (updatedPriorityTiers.length > 0) {
      state.priorityTiers = updatedPriorityTiers;
      await api.savePriorityTiers(updatedPriorityTiers);
    }

    const emailElem = document.getElementById('chk-send-email-notifications');
    const autoEmailNotices = emailElem ? emailElem.checked : (state.propertyConfig?.autoEmailNotices !== false);

    const res = await api.savePropertyConfig(softFactors, hardConstraints, state.propertyConfig?.collegeLocation, autoEmailNotices);
    if (res.success) {
      showToast('Property Configuration, Building Layout & Priority Hierarchy saved successfully!', 'success');
      await refreshAllData();
    } else {
      showToast(res.message, 'danger');
    }
  } catch (e) {
    showToast('Error saving configuration: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

/**
 * Open Settings & Parameters Custom Modal Popup Overlay
 */
window.showSettingsModal = async function () {
  let modalOverlay = document.getElementById('settings-modal-overlay');
  if (!modalOverlay) {
    modalOverlay = document.createElement('div');
    modalOverlay.id = 'settings-modal-overlay';
    modalOverlay.className = 'modal-overlay';
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0; left: 0; width: 100vw; height: 100vh;
      background: rgba(15, 23, 42, 0.65);
      backdrop-filter: blur(8px);
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      opacity: 0;
      pointer-events: auto;
      transition: opacity 0.25s ease;
    `;
    document.body.appendChild(modalOverlay);
  }

  if (typeof showLoading === 'function') showLoading(false);

  const setupView = document.getElementById('view-property-setup');
  if (setupView && (!setupView.children.length || setupView.children.length === 0)) {
    await renderPropertySetupView();
    if (typeof showLoading === 'function') showLoading(false);
  }

  modalOverlay.innerHTML = `
    <div class="modal-card" style="
      background: var(--bg-card);
      border: none !important;
      border-radius: var(--radius-lg);
      width: 100%;
      max-width: 1050px;
      max-height: 88vh;
      display: flex;
      flex-direction: column;
      box-shadow: 0 20px 45px rgba(0, 0, 0, 0.25);
      overflow: hidden;
      pointer-events: auto;
      padding: 0 !important;
      animation: modalSlideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    ">
      <!-- Modal Header -->
      <div style="
        padding: 1.1rem 1.5rem;
        background: #3D352E;
        color: #FFFFFF;
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: none;
      ">
        <div style="display:flex; align-items:center; gap:0.6rem;">
          <svg style="width:20px; height:20px; stroke:#C2652A; fill:none; stroke-width:2;" viewBox="0 0 24 24"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.38a2 2 0 0 0-.73-2.73l-.15-.1a2 2 0 0 1-1-1.72v-.51a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          <h3 style="margin:0; font-family:var(--font-heading); font-size:1.25rem; font-weight:700; color:#FFFFFF;">Settings</h3>
        </div>
        <button onclick="closeSettingsModal()" style="
          background: rgba(255,255,255,0.1);
          border: none;
          color: #FFFFFF;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          cursor: pointer;
          font-size: 1rem;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: background 0.2s ease;
        ">✕</button>
      </div>

      <!-- Modal Body (Custom Scrollbar) -->
      <div id="settings-modal-body" style="
        padding: 1.5rem;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      "></div>
    </div>
  `;

  modalOverlay.style.display = 'flex';
  document.body.style.overflow = 'hidden';
  setTimeout(() => modalOverlay.style.opacity = '1', 10);

  const modalBody = document.getElementById('settings-modal-body');
  if (setupView && modalBody) {
    setupView.style.display = 'block';
    modalBody.appendChild(setupView);
  }
};

window.closeSettingsModal = function () {
  const modalOverlay = document.getElementById('settings-modal-overlay');
  const setupView = document.getElementById('view-property-setup');
  const mainContent = document.getElementById('main-content');

  if (setupView && mainContent) {
    setupView.style.display = 'none';
    mainContent.appendChild(setupView);
  }

  if (modalOverlay) {
    modalOverlay.style.opacity = '0';
    setTimeout(() => {
      modalOverlay.style.display = 'none';
      document.body.style.overflow = '';
    }, 250);
  } else {
    document.body.style.overflow = '';
  }
};
