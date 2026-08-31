/**
 * AllotEase - Google Form Intake & Field Mapping Controller
 * ui/scripts/render-intake.js
 */

let activeIntakeConfig = null;
let currentExtractedHeaders = [];

const REQUIRED_SYSTEM_FIELDS = [
  'Student ID',
  'Name',
  'Gender',
  'Course',
  'Branch',
  'Year',
  'Category',
  'Priority',
  'Special Requirement',
  'Preferred Room Type',
  'Preferred Block',
  'Preferred Floor',
  'Preferred Roommates'
];

/**
 * Render Student Intake Form View (Native Application Form Primary)
 */
async function renderIntakeFormView() {
  const container = document.getElementById('view-intake-form');
  if (!container) return;

  try {
    renderNativeFormOptions();
    await renderIntakeSetupCard();
    if (typeof window.initStudentLinkView === 'function') {
      await window.initStudentLinkView();
    }

    // Auto-suggest next Student ID if empty
    const idInput = document.getElementById('app-student-id');
    if (idInput && (!idInput.value || idInput.value.trim() === '')) {
      const nextNum = 1000 + (state.students?.length || 0) + 1;
      idInput.value = `STU-${nextNum}`;
    }
  } catch (e) {
    console.warn('Notice rendering Application Form View:', e);
  }
}

/**
 * Dynamically derives Room Capacities, AC Preferences, Blocks, Floors, and Priorities from active state.rooms & state.priorityTiers
 */
function renderNativeFormOptions() {
  const capSelect = document.getElementById('app-pref-capacity');
  const acSelect = document.getElementById('app-pref-ac');
  const blockSelect = document.getElementById('app-pref-block');
  const floorSelect = document.getElementById('app-pref-floor');
  const prioritySelect = document.getElementById('app-priority');

  const rooms = (typeof state !== 'undefined' && state.rooms && state.rooms.length > 0)
    ? state.rooms
    : (typeof LocalMockDB !== 'undefined' ? LocalMockDB.rooms : []);

  // 1. Room Capacities
  const capacityMap = { 1: 'Single', 2: 'Double', 3: 'Triple', 4: 'Quad' };
  const capacitiesSet = new Set();
  rooms.forEach(r => {
    const cap = parseInt(r.Capacity || r['Capacity'] || r.capacity) || 0;
    if (cap > 0) {
      capacitiesSet.add(capacityMap[cap] || `${cap}-Bed`);
    } else {
      const typeStr = String(r['Room Type'] || r.type || '').toLowerCase();
      if (typeStr.includes('single')) capacitiesSet.add('Single');
      if (typeStr.includes('double')) capacitiesSet.add('Double');
      if (typeStr.includes('triple')) capacitiesSet.add('Triple');
    }
  });

  if (capacitiesSet.size === 0) {
    capacitiesSet.add('Single');
    capacitiesSet.add('Double');
    capacitiesSet.add('Triple');
  }

  if (capSelect) {
    const capOpts = ['<option value="-- No Preference --">-- No Preference --</option>']
      .concat(Array.from(capacitiesSet).map(c => `<option value="${c}">${c}</option>`));
    capSelect.innerHTML = capOpts.join('');
  }

  // 2. AC Preference
  const acSet = new Set();
  rooms.forEach(r => {
    const typeStr = String(r['Room Type'] || r.type || '').toLowerCase();
    if (typeStr.includes('non-ac') || typeStr.includes('non ac')) {
      acSet.add('Non-AC');
    } else if (typeStr.includes('ac')) {
      acSet.add('AC');
    }
  });

  if (acSet.size === 0) {
    acSet.add('AC');
    acSet.add('Non-AC');
  }

  if (acSelect) {
    const acOpts = ['<option value="-- No Preference --">-- No Preference --</option>']
      .concat(Array.from(acSet).map(a => `<option value="${a}">${a}</option>`));
    acSelect.innerHTML = acOpts.join('');
  }

  // 3. Preferred Block (Derived from state.rooms)
  const blockSet = new Set();
  rooms.forEach(r => {
    const b = r.Block || r['Block'] || r.block;
    if (b) blockSet.add(String(b).trim());
  });

  if (blockSelect) {
    const blockOpts = ['<option value="-- No Preference --">-- No Preference --</option>']
      .concat(Array.from(blockSet).sort().map(b => `<option value="${b}">${b}</option>`));
    blockSelect.innerHTML = blockOpts.join('');
  }

  // 4. Preferred Floor (Derived from state.rooms)
  const floorSet = new Set();
  rooms.forEach(r => {
    const f = r.Floor || r['Floor'] || r.floor;
    if (f) floorSet.add(`Floor ${f}`);
  });

  if (floorSelect) {
    const floorOpts = ['<option value="-- No Preference --">-- No Preference --</option>']
      .concat(Array.from(floorSet).sort().map(f => `<option value="${f}">${f}</option>`));
    floorSelect.innerHTML = floorOpts.join('');
  }

  // 5. Priority Categories (Derived from state.priorityTiers)
  const priorityTiers = (typeof state !== 'undefined' && state.priorityTiers && state.priorityTiers.length > 0)
    ? state.priorityTiers
    : [
        { name: '♿ Differently-Abled / Special Needs' },
        { name: '📍 Farthest Distance from Campus' },
        { name: '🎓 Final Year Senior Students' },
        { name: '🌟 First Year Freshmen Batch' },
        { name: '👥 General Applicants / Local Quota' }
      ];

  if (prioritySelect) {
    prioritySelect.innerHTML = priorityTiers.map(pt => {
      const nameStr = pt.name || pt;
      return `<option value="${nameStr}">${nameStr}</option>`;
    }).join('');
  }
}

/**
 * Handles Native Student Application Submission
 */
window.submitNativeStudentApplication = async function() {
  const nameInput = document.getElementById('app-student-name');
  const idInput = document.getElementById('app-student-id');
  const genderInput = document.getElementById('app-gender');
  const courseInput = document.getElementById('app-course');
  const branchInput = document.getElementById('app-branch');
  const yearInput = document.getElementById('app-year');
  const capInput = document.getElementById('app-pref-capacity');
  const acInput = document.getElementById('app-pref-ac');
  const blockInput = document.getElementById('app-pref-block');
  const floorInput = document.getElementById('app-pref-floor');
  const priorityInput = document.getElementById('app-priority');
  const specialReqInput = document.getElementById('app-special-req');

  const name = nameInput?.value.trim();
  const studentId = idInput?.value.trim().toUpperCase();
  const gender = genderInput?.value;
  const course = courseInput?.value;
  const branch = branchInput?.value;
  const year = yearInput?.value || '1st Year';
  const capacity = capInput?.value;
  const acPref = acInput?.value;
  const block = blockInput?.value;
  const floor = floorInput?.value;
  const priority = priorityInput?.value;
  const specialReq = specialReqInput?.value || 'None';

  if (!name || !studentId) {
    showToast('Please enter both Student Name and Student ID.', 'warning');
    return;
  }

  // Format Preferred Room Type
  let prefRoomType = 'Single AC';
  if (capacity !== '-- No Preference --' && acPref !== '-- No Preference --') {
    prefRoomType = `${capacity} ${acPref}`;
  } else if (capacity !== '-- No Preference --') {
    prefRoomType = `${capacity} AC`;
  } else if (acPref !== '-- No Preference --') {
    prefRoomType = `Single ${acPref}`;
  }

  const prefBlock = block === '-- No Preference --' ? '' : block;
  const prefFloor = floor === '-- No Preference --' ? '' : floor.replace('Floor ', '');

  // Collect custom fields profile metadata
  const customFieldsData = {};
  const customInputs = document.querySelectorAll('.warden-custom-input');
  customInputs.forEach(input => {
    const label = input.getAttribute('data-field-label') || input.name || input.id;
    const val = input.type === 'checkbox' ? (input.checked ? 'Yes' : 'No') : input.value;
    if (label) customFieldsData[label] = val;
  });

  const categoryInput = document.getElementById('app-category');
  const roommatesInput = document.getElementById('app-pref-roommates');

  const category = categoryInput?.value || 'General';
  const preferredRoommates = roommatesInput?.value.trim() || '';
  const homePin = document.getElementById('app-home-pin')?.value.trim() || '';

  const payload = {
    studentId: studentId,
    name: name,
    gender: gender,
    course: course,
    branch: branch,
    year: year,
    category: category,
    homePinCode: homePin,
    preferredRoomType: prefRoomType,
    preferredBlock: prefBlock,
    preferredFloor: prefFloor,
    preferredRoommates: preferredRoommates,
    specialRequirement: specialReq,
    priority: priority,
    allocationStatus: 'Unallocated',
    customFields: customFieldsData
  };

  try {
    showLoading(true);
    const res = await api.addStudent(payload);

    if (res.success) {
      // Re-fetch or refresh students in state
      const refreshed = await api.getStudents();
      if (refreshed.success && refreshed.data) {
        state.students = refreshed.data;
      }
      if (typeof renderStudentsTable === 'function') renderStudentsTable();

      if (typeof window.addActivityLog === 'function') {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        window.addActivityLog({
          iconType: 'user',
          title: 'New Application Received',
          details: `${name} (${studentId}) • ${course} ${branch}`,
          time: `Today, ${timeStr}`,
          iconBg: 'rgba(61, 53, 46, 0.08)'
        });
      }

      showToast(`Student application for ${name} (${studentId}) submitted successfully as Unallocated!`, 'success');
      resetNativeApplicationForm();
    } else {
      showToast(res.message || 'Error submitting application.', 'danger');
    }
  } catch (err) {
    console.error('[Application Submission Error]', err);
    showToast('Error submitting student application: ' + err.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

window.resetNativeApplicationForm = function() {
  const form = document.getElementById('native-student-app-form');
  if (form) form.reset();
  const badge = document.getElementById('warden-pin-distance-badge');
  if (badge) badge.style.display = 'none';

  // Auto-suggest next STU ID
  const idInput = document.getElementById('app-student-id');
  if (idInput && typeof state !== 'undefined' && state.students) {
    const nextNum = 1000 + state.students.length + 1;
    idInput.value = `STU-${nextNum}`;
  }
};

window.updateWardenPinDistancePreview = function(pinVal) {
  const badge = document.getElementById('warden-pin-distance-badge');
  if (!badge) return;

  const cleanPin = String(pinVal || '').replace(/\D/g, '').trim();
  if (cleanPin.length !== 6) {
    badge.style.display = 'none';
    return;
  }
  badge.style.display = 'block';
  if (typeof window.lookupPinCode === 'function') {
    const res = window.lookupPinCode(cleanPin);
    if (res.found && res.distanceKm !== null) {
      if (res.distanceSource === 'PIN') {
        badge.style.background = 'rgba(34,197,94,0.1)';
        badge.style.color = '#16a34a';
        badge.style.border = '1px solid rgba(34,197,94,0.2)';
        badge.innerHTML = `Estimated distance: ${res.distanceKm} km (Source: PIN - ${res.city || res.district}, ${res.state})`;
      } else {
        badge.style.background = 'rgba(234,179,8,0.1)';
        badge.style.color = '#d97706';
        badge.style.border = '1px solid rgba(234,179,8,0.2)';
        badge.innerHTML = `Estimated distance: ${res.distanceKm} km (Source: ${res.distanceSource} - ${res.district || res.state})`;
      }
    } else {
      badge.style.background = 'rgba(239,68,68,0.1)';
      badge.style.color = '#dc2626';
      badge.style.border = '1px solid rgba(239,68,68,0.2)';
      badge.innerHTML = `🔴 PIN code not found in reference data. Distance will use configured fallback.`;
    }
  }
};

/**
 * Render Form Intake & Field Mapping Setup UI inside Property Setup View
 */
async function renderIntakeSetupCard() {
  const container = document.getElementById('intake-setup-card');
  if (!container) return;

  try {
    const res = await api.getFormIntakeConfig();
    activeIntakeConfig = res.data || { formEmbedUrl: '', responseSheetUrl: '', defaultBaseRent: 8000, fieldMapping: {} };

    const embedInput = document.getElementById('input-form-embed-url');
    const sheetInput = document.getElementById('input-response-sheet-url');
    const rentInput = document.getElementById('input-default-base-rent');

    if (embedInput) embedInput.value = activeIntakeConfig.formEmbedUrl || '';
    if (sheetInput) sheetInput.value = activeIntakeConfig.responseSheetUrl || '';
    if (rentInput) rentInput.value = activeIntakeConfig.defaultBaseRent || 8000;

    // Populate Form Customization Builder (Courses, Branches, Custom Fields, Visibility Checkboxes)
    if (typeof window.populateFormBuilderUI === 'function') {
      window.populateFormBuilderUI(activeIntakeConfig);
    }

    // Auto-fetch headers if response sheet URL is present
    if (activeIntakeConfig.responseSheetUrl) {
      const headerRes = await api.fetchResponseSheetHeaders(activeIntakeConfig.responseSheetUrl);
      if (headerRes.success) {
        currentExtractedHeaders = headerRes.data.headers || [];
      }
    }

    renderFieldMappingRows();
  } catch (e) {
    console.warn('Error loading intake setup:', e);
  }
}

/**
 * Fetches Response Sheet Headers from user input URL
 */
window.fetchResponseHeadersFromUI = async function() {
  const sheetInput = document.getElementById('input-response-sheet-url');
  const url = sheetInput?.value.trim();

  if (!url) {
    showToast('Please paste a Google Form Response Sheet URL or Spreadsheet ID first.', 'warning');
    return;
  }

  try {
    showLoading(true);
    const res = await api.fetchResponseSheetHeaders(url);
    if (res.success) {
      currentExtractedHeaders = res.data.headers || [];
      renderFieldMappingRows();
      showToast(res.message || `Successfully extracted ${currentExtractedHeaders.length} column headers!`, 'success');
    } else {
      showToast(res.message, 'danger');
    }
  } catch (e) {
    showToast('Error: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

function autoMatchHeader(sysField, headers) {
  if (!headers || headers.length === 0) return '';
  const s = sysField.toLowerCase();

  // Try exact or partial match first
  for (const h of headers) {
    const hl = h.toLowerCase();
    if (hl === s || hl.includes(s) || s.includes(hl)) return h;
  }

  // Keyword rules
  const rules = {
    'Student ID': ['roll', 'student id', 'reg', 'enrollment', 'id'],
    'Name': ['name', 'full name', 'applicant name', 'student name'],
    'Gender': ['gender', 'sex'],
    'Course': ['course', 'degree', 'program'],
    'Branch': ['branch', 'department', 'specialization', 'stream'],
    'Year': ['year', 'semester'],
    'Category': ['category', 'quota'],
    'Priority': ['priority'],
    'Special Requirement': ['special', 'disability', 'medical', 'accommodation'],
    'Preferred Room Type': ['room type', 'type preference', 'room preference'],
    'Preferred Block': ['block', 'hostel block', 'building'],
    'Preferred Floor': ['floor', 'preferred floor'],
    'Preferred Roommates': ['roommate', 'requested roommate', 'friend']
  };

  const keywords = rules[sysField] || [];
  for (const kw of keywords) {
    const match = headers.find(h => h.toLowerCase().includes(kw));
    if (match) return match;
  }

  return '';
}

/**
 * Render Field Mapping Rows
 */
function renderFieldMappingRows() {
  const tbody = document.getElementById('field-mapping-tbody');
  if (!tbody) return;

  const mapping = activeIntakeConfig?.fieldMapping || {};

  tbody.innerHTML = REQUIRED_SYSTEM_FIELDS.map(sysField => {
    let selectedFormHeader = mapping[sysField] || '';

    // Auto-match header if not explicitly saved
    if (!selectedFormHeader && currentExtractedHeaders.length > 0) {
      selectedFormHeader = autoMatchHeader(sysField, currentExtractedHeaders);
    }

    const optionsHtml = [
      `<option value="" ${!selectedFormHeader ? 'selected' : ''}>-- Skip / Do Not Map --</option>`,
      ...currentExtractedHeaders.map(h => `<option value="${h}" ${h === selectedFormHeader ? 'selected' : ''}>${h}</option>`)
    ].join('');

    return `
      <tr>
        <td><strong>${sysField}</strong></td>
        <td>
          <select class="input-field mapping-select" data-sysfield="${sysField}" style="width:100%; font-size:0.85rem; background:var(--bg-main); color:var(--text-primary); border:1px solid var(--border-color); border-radius:var(--radius-md); padding:0.4rem;">
            ${optionsHtml}
          </select>
        </td>
      </tr>
    `;
  }).join('');
}

/**
 * Saves Form Intake Configuration & Field Mapping
 */
window.saveIntakeConfigFromUI = async function() {
  try {
    showLoading(true);

    const embedUrl = document.getElementById('input-form-embed-url')?.value.trim() || '';
    const sheetUrl = document.getElementById('input-response-sheet-url')?.value.trim() || '';
    const defaultRent = parseFloat(document.getElementById('input-default-base-rent')?.value) || 8000;

    const mapping = {};
    document.querySelectorAll('.mapping-select').forEach(select => {
      const sysField = select.getAttribute('data-sysfield');
      const val = select.value;
      if (sysField && val) {
        mapping[sysField] = val;
      }
    });

    const payload = {
      formEmbedUrl: embedUrl,
      responseSheetUrl: sheetUrl,
      defaultBaseRent: defaultRent,
      fieldMapping: mapping
    };

    const res = await api.saveFormIntakeConfig(payload);
    if (res.success) {
      activeIntakeConfig = res.data;
      showToast(res.message || 'Form Intake & Field Mapping saved successfully!', 'success');
    } else {
      showToast('Failed to save intake configuration: ' + res.message, 'danger');
    }
  } catch (e) {
    showToast('Error saving intake setup: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

/**
 * Trigger Form Response Sync Action
 */
window.triggerFormSync = async function() {
  try {
    showLoading(true);
    const res = await api.syncFormResponses();
    if (res.success) {
      await refreshAllData();
      showToast(res.message, 'success');
    } else {
      showToast(res.message, 'danger');
    }
  } catch (e) {
    showToast('Error syncing form responses: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

if (typeof window.escapeHtml !== 'function') {
  window.escapeHtml = function(str) {
    if (str === null || str === undefined) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  };
}

window.initStudentLinkView = async function() {
  const input = document.getElementById('public-student-url-input');
  const previewBtn = document.getElementById('open-student-preview-btn');
  const overrideBtn = document.getElementById('open-student-override-btn');

  const shareUrl = window.location.origin + window.location.pathname + '?view=student';
  const overrideUrl = window.location.origin + window.location.pathname + '?view=student&override=true';
  
  if (input) input.value = shareUrl;
  if (previewBtn) previewBtn.href = shareUrl;
  if (overrideBtn) overrideBtn.href = overrideUrl;

  if (typeof api !== 'undefined' && api.getFormIntakeConfig) {
    try {
      const res = await api.getFormIntakeConfig();
      const config = res.data || {};
      const deadlineInput = document.getElementById('input-intake-deadline');
      if (deadlineInput && config.intakeDeadline) {
        const d = new Date(config.intakeDeadline);
        if (!isNaN(d.getTime())) {
          const pad = num => String(num).padStart(2, '0');
          const localIso = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
          deadlineInput.value = localIso;
        }
      }
      window.updateDeadlineBadgeFromInput();
      window.populateFormBuilderUI(config);
    } catch (e) {
      console.warn('Error loading intake deadline config:', e);
    }
  }
};

window.populateFormBuilderUI = function(config) {
  const coursesInput = document.getElementById('cfg-custom-courses');
  const branchesInput = document.getElementById('cfg-custom-branches');
  
  if (coursesInput) {
    if (config.courses) coursesInput.value = Array.isArray(config.courses) ? config.courses.join(', ') : config.courses;
    coursesInput.oninput = window.syncAndAutoSaveFormCustomizationQuietly;
  }
  if (branchesInput) {
    if (config.branches) branchesInput.value = Array.isArray(config.branches) ? config.branches.join(', ') : config.branches;
    branchesInput.oninput = window.syncAndAutoSaveFormCustomizationQuietly;
  }

  // Populate Field Visibility Checkboxes
  const fieldVis = config.fieldVisibility || {};
  document.querySelectorAll('.field-vis-chk').forEach(chk => {
    const fieldKey = chk.getAttribute('data-field');
    if (fieldKey) {
      chk.checked = fieldVis[fieldKey] !== false; // Default true
    }
    chk.onchange = window.syncAndAutoSaveFormCustomizationQuietly;
  });

  const tbody = document.getElementById('custom-fields-tbody');
  if (!tbody) return;
  tbody.innerHTML = '';

  const customFields = config.customFields || [
    { id: 'f_hometown', label: 'Hometown / State', type: 'text', options: '', required: false },
    { id: 'f_parent_phone', label: 'Parent / Guardian Phone', type: 'text', options: '', required: false },
    { id: 'f_dietary', label: 'Food Preference', type: 'select', options: 'Veg, Non-Veg, Jain', required: false }
  ];

  customFields.forEach(field => {
    window.addCustomFieldRowUI(field.label, field.type, field.options, field.required);
  });

  window.renderWardenCustomFields(customFields);
  window.applyFieldVisibilityToWardenPanel(fieldVis);
};

window.syncAndAutoSaveFormCustomizationQuietly = async function() {
  const coursesVal = document.getElementById('cfg-custom-courses')?.value || '';
  const branchesVal = document.getElementById('cfg-custom-branches')?.value || '';

  const courses = coursesVal.split(',').map(s => s.trim()).filter(Boolean);
  const branches = branchesVal.split(',').map(s => s.trim()).filter(Boolean);

  const fieldVisibility = {};
  document.querySelectorAll('.field-vis-chk').forEach(chk => {
    const fieldKey = chk.getAttribute('data-field');
    if (fieldKey) fieldVisibility[fieldKey] = chk.checked;
  });

  const rows = document.querySelectorAll('.custom-field-row');
  const customFields = [];
  rows.forEach((row, idx) => {
    const label = row.querySelector('.field-label-input')?.value.trim();
    const type = row.querySelector('.field-type-select')?.value || 'text';
    const options = row.querySelector('.field-options-input')?.value.trim() || '';
    const required = row.querySelector('.field-required-chk')?.checked || false;

    if (label) {
      customFields.push({
        id: 'custom_' + idx + '_' + label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
        label: label,
        type: type,
        options: options,
        required: required
      });
    }
  });

  const res = await api.getFormIntakeConfig();
  const currentConfig = res.data || {};
  currentConfig.courses = courses;
  currentConfig.branches = branches;
  currentConfig.customFields = customFields;
  currentConfig.fieldVisibility = fieldVisibility;

  const saveRes = await api.saveFormIntakeConfig(currentConfig);
  if (saveRes.success) {
    activeIntakeConfig = saveRes.data;
    if (typeof state !== 'undefined') state.intakeConfig = saveRes.data;
    window.renderWardenCustomFields(customFields);
    window.applyFieldVisibilityToWardenPanel(fieldVisibility);
    window.updateCourseBranchSelects(courses, branches);
  }
};

window.saveUnifiedFormCustomizationFromUI = async function() {
  try {
    showLoading(true);

    const deadlineVal = document.getElementById('input-intake-deadline')?.value;
    const isoDeadline = deadlineVal ? new Date(deadlineVal).toISOString() : null;

    const coursesVal = document.getElementById('cfg-custom-courses')?.value || '';
    const branchesVal = document.getElementById('cfg-custom-branches')?.value || '';

    const courses = coursesVal.split(',').map(s => s.trim()).filter(Boolean);
    const branches = branchesVal.split(',').map(s => s.trim()).filter(Boolean);

    const fieldVisibility = {};
    document.querySelectorAll('.field-vis-chk').forEach(chk => {
      const fieldKey = chk.getAttribute('data-field');
      if (fieldKey) fieldVisibility[fieldKey] = chk.checked;
    });

    const rows = document.querySelectorAll('.custom-field-row');
    const customFields = [];
    rows.forEach((row, idx) => {
      const label = row.querySelector('.field-label-input')?.value.trim();
      const type = row.querySelector('.field-type-select')?.value || 'text';
      const options = row.querySelector('.field-options-input')?.value.trim() || '';
      const required = row.querySelector('.field-required-chk')?.checked || false;

      if (label) {
        customFields.push({
          id: 'custom_' + idx + '_' + label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          label: label,
          type: type,
          options: options,
          required: required
        });
      }
    });

    const res = await api.getFormIntakeConfig();
    const currentConfig = res.data || {};
    currentConfig.intakeDeadline = isoDeadline;
    currentConfig.courses = courses;
    currentConfig.branches = branches;
    currentConfig.customFields = customFields;
    currentConfig.fieldVisibility = fieldVisibility;

    const saveRes = await api.saveFormIntakeConfig(currentConfig);
    if (saveRes.success) {
      activeIntakeConfig = saveRes.data;
      if (typeof state !== 'undefined') state.intakeConfig = saveRes.data;
      window.renderWardenCustomFields(customFields);
      window.applyFieldVisibilityToWardenPanel(fieldVisibility);
      window.updateCourseBranchSelects(courses, branches);
      window.updateDeadlineBadgeFromInput();
      window.reloadIntakePreviewIframe();
      showToast('Form Customization, Registration Deadline & Custom Boxes saved successfully!', 'success');
    } else {
      showToast('Error saving configuration: ' + saveRes.message, 'danger');
    }
  } catch (e) {
    showToast('Error saving configuration: ' + e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};

window.applyFieldVisibilityToWardenPanel = function(fieldVisibility) {
  const vis = fieldVisibility || {};

  document.querySelectorAll('[data-field-group]').forEach(el => {
    const fieldKey = el.getAttribute('data-field-group');
    if (fieldKey) {
      const isVisible = vis[fieldKey] !== false; // Default true
      el.style.display = isVisible ? 'block' : 'none';
    }
  });

  // Check section visibility
  const hasPrefVisible = vis.capacity !== false || vis.acPref !== false || vis.block !== false || vis.floor !== false;
  const prefSec = document.getElementById('warden-section-preferences');
  if (prefSec) prefSec.style.display = hasPrefVisible ? 'block' : 'none';

  const hasPrioVisible = vis.priority !== false || vis.specialReq !== false;
  const prioSec = document.getElementById('warden-section-priority');
  if (prioSec) prioSec.style.display = hasPrioVisible ? 'block' : 'none';

  // Student ID required indicator
  const sIdReq = document.getElementById('app-student-id-req-span');
  if (sIdReq) {
    sIdReq.style.display = (vis.studentId !== false) ? 'inline' : 'none';
  }
};

window.addCustomFieldRowUI = function(label = '', type = 'text', options = '', required = false) {
  const tbody = document.getElementById('custom-fields-tbody');
  if (!tbody) return;

  const tr = document.createElement('tr');
  tr.className = 'custom-field-row';
  tr.innerHTML = `
    <td>
      <input type="text" class="input-field field-label-input" value="${escapeHtml(label)}" placeholder="e.g. Hometown" oninput="window.syncAndAutoSaveFormCustomizationQuietly()" style="font-size:0.95rem; padding:0.55rem 0.75rem;" required>
    </td>
    <td>
      <select class="input-field field-type-select" style="font-size:0.95rem; padding:0.55rem 0.75rem; background:var(--bg-main);" onchange="window.toggleFieldOptionsVisibility(this); window.syncAndAutoSaveFormCustomizationQuietly();">
        <option value="text" ${type === 'text' ? 'selected' : ''}>Text Input</option>
        <option value="number" ${type === 'number' ? 'selected' : ''}>Number</option>
        <option value="select" ${type === 'select' ? 'selected' : ''}>Dropdown Select</option>
        <option value="checkbox" ${type === 'checkbox' ? 'selected' : ''}>Checkbox</option>
      </select>
    </td>
    <td>
      <input type="text" class="input-field field-options-input" value="${escapeHtml(options)}" placeholder="Option 1, Option 2" oninput="window.syncAndAutoSaveFormCustomizationQuietly()" style="font-size:0.95rem; padding:0.55rem 0.75rem; ${type === 'select' ? '' : 'opacity:0.5;'}">
    </td>
    <td style="text-align:center;">
      <input type="checkbox" class="field-required-chk" ${required ? 'checked' : ''} onchange="window.syncAndAutoSaveFormCustomizationQuietly()" style="width:18px; height:18px; cursor:pointer;">
    </td>
    <td style="text-align:center;">
      <button type="button" class="btn btn-secondary" onclick="this.closest('tr').remove(); window.syncAndAutoSaveFormCustomizationQuietly();" style="padding:0.35rem 0.6rem; font-size:0.85rem; color:#ef4444; border-color:rgba(239,68,68,0.2); background:rgba(239,68,68,0.06);" title="Delete field row">
        <svg viewBox="0 0 24 24" style="width:15px; height:15px; stroke:#ef4444; fill:none; stroke-width:2;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
      </button>
    </td>
  `;
  tbody.appendChild(tr);
  window.syncAndAutoSaveFormCustomizationQuietly();
};

window.toggleFieldOptionsVisibility = function(selectEl) {
  const optionsInput = selectEl.closest('tr').querySelector('.field-options-input');
  if (optionsInput) {
    if (selectEl.value === 'select') {
      optionsInput.style.opacity = '1';
      optionsInput.placeholder = 'Option 1, Option 2, Option 3';
    } else {
      optionsInput.style.opacity = '0.5';
    }
  }
};

window.saveFormCustomizationFromUI = async function() {
  try {
    if (typeof showLoading === 'function') showLoading(true);

    const coursesVal = document.getElementById('cfg-custom-courses')?.value || '';
    const branchesVal = document.getElementById('cfg-custom-branches')?.value || '';

    const courses = coursesVal.split(',').map(s => s.trim()).filter(Boolean);
    const branches = branchesVal.split(',').map(s => s.trim()).filter(Boolean);

    // Collect Field Visibility States
    const fieldVisibility = {};
    document.querySelectorAll('.field-vis-chk').forEach(chk => {
      const fieldKey = chk.getAttribute('data-field');
      if (fieldKey) fieldVisibility[fieldKey] = chk.checked;
    });

    const rows = document.querySelectorAll('.custom-field-row');
    const customFields = [];

    rows.forEach((row, idx) => {
      const label = row.querySelector('.field-label-input')?.value.trim();
      const type = row.querySelector('.field-type-select')?.value || 'text';
      const options = row.querySelector('.field-options-input')?.value.trim() || '';
      const required = row.querySelector('.field-required-chk')?.checked || false;

      if (label) {
        customFields.push({
          id: 'custom_' + idx + '_' + label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
          label: label,
          type: type,
          options: options,
          required: required
        });
      }
    });

    const res = await api.getFormIntakeConfig();
    const currentConfig = res.data || {};
    currentConfig.courses = courses;
    currentConfig.branches = branches;
    currentConfig.customFields = customFields;
    currentConfig.fieldVisibility = fieldVisibility;

    const saveRes = await api.saveFormIntakeConfig(currentConfig);
    if (saveRes.success) {
      activeIntakeConfig = saveRes.data;
      if (typeof state !== 'undefined') state.intakeConfig = saveRes.data;
      if (typeof showToast === 'function') {
        showToast('Form customizations & field visibility settings saved successfully!', 'success');
      }
      window.renderWardenCustomFields(customFields);
      window.applyFieldVisibilityToWardenPanel(fieldVisibility);
      window.updateCourseBranchSelects(courses, branches);
      window.reloadIntakePreviewIframe();
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Error saving form customizations: ' + err.toString(), 'danger');
  } finally {
    if (typeof showLoading === 'function') showLoading(false);
  }
};

window.renderWardenCustomFields = function(customFields) {
  const sec = document.getElementById('warden-custom-fields-section');
  const container = document.getElementById('warden-custom-fields-container');
  if (!sec || !container) return;

  if (!customFields || customFields.length === 0) {
    sec.style.display = 'none';
    container.innerHTML = '';
    return;
  }

  sec.style.display = 'block';
  container.innerHTML = '';

  customFields.forEach(field => {
    const div = document.createElement('div');
    div.className = 'form-group warden-custom-field-group';
    div.style.marginBottom = '0';

    let inputHtml = '';
    if (field.type === 'select') {
      const opts = (field.options || '').split(',').map(o => o.trim()).filter(Boolean);
      const optionsHtml = opts.map(o => `<option value="${escapeHtml(o)}">${escapeHtml(o)}</option>`).join('');
      inputHtml = `<select class="input-field warden-custom-input" data-field-id="${field.id}" data-field-label="${escapeHtml(field.label)}" style="font-size:0.85rem; background:var(--bg-main);">
        ${optionsHtml}
      </select>`;
    } else if (field.type === 'checkbox') {
      inputHtml = `<div style="display:flex; align-items:center; gap:0.5rem; margin-top:0.35rem;">
        <input type="checkbox" class="warden-custom-input" data-field-id="${field.id}" data-field-label="${escapeHtml(field.label)}" style="width:18px; height:18px; accent-color:var(--accent-blue);">
        <span style="font-size:0.85rem; color:var(--text-secondary);">${escapeHtml(field.label)}</span>
      </div>`;
    } else if (field.type === 'number') {
      inputHtml = `<input type="number" class="input-field warden-custom-input" data-field-id="${field.id}" data-field-label="${escapeHtml(field.label)}" placeholder="Enter ${escapeHtml(field.label)}" style="font-size:0.85rem;" ${field.required ? 'required' : ''}>`;
    } else {
      inputHtml = `<input type="text" class="input-field warden-custom-input" data-field-id="${field.id}" data-field-label="${escapeHtml(field.label)}" placeholder="Enter ${escapeHtml(field.label)}" style="font-size:0.85rem;" ${field.required ? 'required' : ''}>`;
    }

    div.innerHTML = `
      <label class="form-label" style="font-size:0.8rem;">
        ${escapeHtml(field.label)} ${field.required ? '<span style="color:#ef4444;">*</span>' : ''}
      </label>
      ${inputHtml}
    `;
    container.appendChild(div);
  });
};

window.updateCourseBranchSelects = function(courses, branches) {
  if (courses && courses.length > 0) {
    const courseSelect = document.getElementById('app-course');
    if (courseSelect) {
      courseSelect.innerHTML = courses.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
    }
  }
  if (branches && branches.length > 0) {
    const branchSelect = document.getElementById('app-branch');
    if (branchSelect) {
      branchSelect.innerHTML = branches.map(b => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join('');
    }
  }
};

window.updateDeadlineBadgeFromInput = function() {
  const deadlineInput = document.getElementById('input-intake-deadline');
  const badge = document.getElementById('deadline-status-badge');
  if (!badge) return;

  const val = deadlineInput?.value;
  if (!val) {
    badge.innerHTML = 'Status: Open Indefinitely';
    badge.style.background = 'rgba(34,197,94,0.1)';
    badge.style.color = '#16a34a';
    badge.style.border = '1px solid rgba(34,197,94,0.2)';
  } else {
    const d = new Date(val);
    const now = new Date();
    if (d < now) {
      badge.innerHTML = 'Status: Registration Closed (Past Cutoff)';
      badge.style.background = 'rgba(239,68,68,0.1)';
      badge.style.color = '#dc2626';
      badge.style.border = '1px solid rgba(239,68,68,0.2)';
    } else {
      badge.innerHTML = `Status: Active (Closes ${d.toLocaleString()})`;
      badge.style.background = 'rgba(34,197,94,0.1)';
      badge.style.color = '#16a34a';
      badge.style.border = '1px solid rgba(34,197,94,0.2)';
    }
  }
};

window.saveIntakeDeadlineFromUI = async function() {
  const deadlineInput = document.getElementById('input-intake-deadline');
  const val = deadlineInput?.value;

  let isoDeadline = '';
  if (val) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) {
      isoDeadline = d.toISOString();
    }
  }

  try {
    if (typeof showLoading === 'function') showLoading(true);
    const res = await api.getFormIntakeConfig();
    const currentConfig = res.data || {};
    currentConfig.intakeDeadline = isoDeadline;

    const saveRes = await api.saveFormIntakeConfig(currentConfig);
    if (saveRes.success) {
      if (typeof showToast === 'function') {
        showToast(isoDeadline ? `Intake deadline saved successfully!` : 'Intake deadline cleared (Open Indefinitely).', 'success');
      }
      window.updateDeadlineBadgeFromInput();
      window.reloadIntakePreviewIframe();
    }
  } catch (err) {
    if (typeof showToast === 'function') showToast('Error saving deadline: ' + err.toString(), 'danger');
  } finally {
    if (typeof showLoading === 'function') showLoading(false);
  }
};

window.clearIntakeDeadlineUI = async function() {
  const deadlineInput = document.getElementById('input-intake-deadline');
  if (deadlineInput) deadlineInput.value = '';
  await window.saveIntakeDeadlineFromUI();
};

window.reloadIntakePreviewIframe = function() {
  const iframe = document.getElementById('intake-preview-iframe');
  if (iframe) {
    iframe.src = '?view=student&t=' + Date.now();
  }
};

window.copyStudentPublicLink = function() {
  const input = document.getElementById('public-student-url-input');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value);
    if (typeof showToast === 'function') {
      showToast('Public Student Registration Link copied to clipboard!', 'success');
    }
  }
};
