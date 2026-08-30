/**
 * AllotEase - Event Handlers & Wiring
 * ui/scripts/events.js - Event Handlers, Wiring, Search & Custom Select Listeners
 */

function setupEventHandlers() {
  // Smart Allocation Execution using Custom Confirm Dialog (AGENTS.md Rule 1)
  document.getElementById('btn-run-smart-allocation')?.addEventListener('click', async () => {
    const sendEmails = document.getElementById('chk-send-email-notifications')?.checked === true;
    const confirmed = await showConfirmDialog('Run Allocation Engine', 'Run Smart Allocation Engine across all unallocated applicants according to active property rules and constraints?');
    if (!confirmed) return;
    try {
      showLoading(true);
      const res = await api.runAllocation();
      let msg = res.message || 'Smart Allocation completed successfully!';
      if (sendEmails) {
        const emailRes = await api.sendAllocationEmails();
        if (emailRes.success) {
          msg += ` (${emailRes.message})`;
        }
      }
      await refreshAllData();
      if (window.addActivityLog) {
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const occBeds = state.stats ? (state.stats.occupiedBeds || 0) : (state.allocations ? state.allocations.length : 0);
        const waitCount = state.stats ? (state.stats.waitingStudents || 0) : 0;
        window.addActivityLog({
          iconType: 'lightning',
          title: 'Smart Allocation Completed',
          details: `${occBeds} students allocated • ${waitCount} waiting in queue`,
          time: `Today, ${timeStr}`,
          iconBg: 'rgba(194, 101, 42, 0.12)'
        });
      }
      showToast(msg, 'success');
    } catch (e) {
      showToast(e.toString(), 'danger');
    } finally {
      showLoading(false);
    }
  });

  // Reset Demo Action using Custom Confirm Dialog (AGENTS.md Rule 1)
  document.getElementById('btn-reset-demo')?.addEventListener('click', async () => {
    const confirmed = await showConfirmDialog('Reset Demo Data', 'Are you sure you want to reset all operational data to a clean baseline state?');
    if (!confirmed) return;
    try {
      showLoading(true);
      const res = await api.resetDemo();
      await refreshAllData();
      showToast(res.message, 'warning');
    } catch (e) {
      showToast(e.toString(), 'danger');
    } finally {
      showLoading(false);
    }
  });

  // Generate Seeded Demo Data Action
  document.getElementById('btn-generate-demo')?.addEventListener('click', async () => {
    try {
      showLoading(true);
      const res = await api.generateDemoData();
      await refreshAllData();
      showToast(res.message, 'success');
    } catch (e) {
      showToast(e.toString(), 'danger');
    } finally {
      showLoading(false);
    }
  });

  // What-If Simulation Trigger
  document.getElementById('btn-run-simulation')?.addEventListener('click', async () => {
    const weights = {
      roomType: parseInt(document.getElementById('slider-roomtype').value),
      block: parseInt(document.getElementById('slider-block').value),
      floor: parseInt(document.getElementById('slider-floor').value),
      roommate: parseInt(document.getElementById('slider-roommate').value),
      priority: parseInt(document.getElementById('slider-priority').value),
      specialReq: parseInt(document.getElementById('slider-specialreq').value)
    };

    try {
      const res = await api.simulateAllocation(weights);
      if (res.success) {
        const d = res.data;
        document.getElementById('sim-result-box').innerHTML = `
          <div style="background:var(--bg-main); padding:1.25rem; border-radius:var(--radius-md); border:1px solid var(--accent-blue); display:flex; flex-direction:column; gap:0.5rem;">
            <strong style="color:var(--accent-blue);">Simulation Results:</strong>
            <div>Current Avg Score: <strong>${d.currentAvgScore}%</strong> ➔ Simulated Avg Score: <strong style="color:var(--accent-emerald);">${d.simulatedAvgScore}%</strong></div>
            <div>Students Affected: <strong>${d.studentsAffectedCount}</strong> | Rooms Changed: <strong>${d.roomsChangedCount}</strong></div>
            <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.3rem;">Dry-run completed. Click "Run Smart Allocation" from dashboard to apply live.</div>
          </div>
        `;
      }
    } catch (e) {
      showToast(e.toString(), 'danger');
    }
  });

  // CSV Export Actions
  document.getElementById('btn-export-students')?.addEventListener('click', () => downloadCSV('Students'));
  document.getElementById('btn-export-rooms')?.addEventListener('click', () => downloadCSV('Rooms'));
  document.getElementById('btn-export-allocations')?.addEventListener('click', () => downloadCSV('Allocations'));

  // Search filters
  document.getElementById('search-students')?.addEventListener('input', (e) => {
    if (typeof state !== 'undefined') state.studentsPage = 1;
    renderStudentsTable(e.target.value);
  });
  document.getElementById('search-rooms')?.addEventListener('input', (e) => renderRoomsCards(e.target.value));
  document.getElementById('search-allocations')?.addEventListener('input', (e) => renderAllocationsTable(e.target.value));

  // Setup Custom Select Trigger for Manual Override Modal (AGENTS.md Rule 1.5)
  const overrideTrigger = document.getElementById('override-room-trigger');
  const overrideDropdown = document.getElementById('override-room-dropdown');
  overrideTrigger?.addEventListener('click', () => {
    overrideDropdown?.classList.toggle('active');
    overrideTrigger.classList.toggle('active');
  });

  // Setup Custom Select Trigger for Preset Loader Dropdown (AGENTS.md Rule 1.5)
  const presetTrigger = document.getElementById('preset-select-trigger');
  const presetDropdown = document.getElementById('preset-select-dropdown');
  presetTrigger?.addEventListener('click', () => {
    presetDropdown?.classList.toggle('active');
    presetTrigger.classList.toggle('active');
  });

  // Setup Custom Select Trigger for Payment Status Dropdown (AGENTS.md Rule 1.5)
  const payTrigger = document.getElementById('payment-status-trigger');
  const payDropdown = document.getElementById('payment-status-dropdown');
  const payValue = document.getElementById('payment-status-value');
  const payLabel = document.getElementById('payment-status-selected-label');

  payTrigger?.addEventListener('click', () => {
    payDropdown?.classList.toggle('active');
    payTrigger.classList.toggle('active');
  });

  payDropdown?.querySelectorAll('.custom-select-option').forEach(opt => {
    opt.addEventListener('click', () => {
      const val = opt.getAttribute('data-value');
      if (val) {
        payValue.value = val;
        payLabel.textContent = val;
        payDropdown.classList.remove('active');
        payTrigger.classList.remove('active');
      }
    });
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('#override-room-select')) {
      overrideDropdown?.classList.remove('active');
      overrideTrigger?.classList.remove('active');
    }
    if (!e.target.closest('#preset-select-wrapper')) {
      presetDropdown?.classList.remove('active');
      presetTrigger?.classList.remove('active');
    }
    if (!e.target.closest('#payment-status-select-wrapper')) {
      payDropdown?.classList.remove('active');
      payTrigger?.classList.remove('active');
    }
  });
}
