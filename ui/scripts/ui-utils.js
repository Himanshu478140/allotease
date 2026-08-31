/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * ui/scripts/ui-utils.js - UI Helpers, Modal Controls, Toast System & Exporters
 */

/**
 * Custom Confirmation Dialog Overlay (AGENTS.md Rule 1 - Replaces native confirm())
 */
window.showConfirmDialog = function(title, message) {
  return new Promise((resolve) => {
    document.getElementById('confirm-modal-title').textContent = title || 'Confirmation Needed';
    document.getElementById('confirm-modal-message').textContent = message || 'Are you sure you want to proceed?';
    
    const okBtn = document.getElementById('confirm-modal-ok');
    const cancelBtn = document.getElementById('confirm-modal-cancel');
    const closeBtn = document.getElementById('confirm-modal-close');

    function cleanup(result) {
      closeModal('confirm-modal');
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      closeBtn.removeEventListener('click', onCancel);
      resolve(result);
    }

    function onOk() { cleanup(true); }
    function onCancel() { cleanup(false); }

    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
    closeBtn.addEventListener('click', onCancel);

    openModal('confirm-modal');
  });
};

// Modal Control Helpers
window.openModal = function(id) {
  document.getElementById(id)?.classList.add('active');
};

window.closeModal = function(id) {
  document.getElementById(id)?.classList.remove('active');
};

// Loading Overlay Control (with 2.5s max safety auto-dismiss)
let _loadingSafetyTimer = null;
window.showLoading = function(show) {
  const el = document.getElementById('loading-overlay');
  if (_loadingSafetyTimer) {
    clearTimeout(_loadingSafetyTimer);
    _loadingSafetyTimer = null;
  }

  if (el) {
    el.style.display = show ? 'flex' : 'none';
    if (show) {
      _loadingSafetyTimer = setTimeout(() => {
        if (el) el.style.display = 'none';
        _loadingSafetyTimer = null;
      }, 2500);
    }
  }
};

// Toast Notification System (AGENTS.md Rule 4 - Icons over Emojis)
window.showToast = function(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  let iconSvg = '';
  if (type === 'success') {
    iconSvg = `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#4A7C59; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><polyline points="16 9 10.5 15 8 12.5"></polyline></svg>`;
  } else if (type === 'danger' || type === 'error') {
    iconSvg = `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#8C3C3C; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`;
  } else if (type === 'warning') {
    iconSvg = `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#C2652A; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:#78706A; fill:none; stroke-width:2.2; stroke-linecap:round; stroke-linejoin:round; flex-shrink:0;"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
  }

  toast.innerHTML = `${iconSvg}<span>${msg}</span>`;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 4000);
};

window.capitalize = function(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
};

window.escapeHtml = function(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Download CSV Helper
 */
window.downloadCSV = async function(sheetName) {
  try {
    showLoading(true);
    const res = await api.exportCSV(sheetName);
    if (res && res.success) {
      const csvData = (typeof res.data === 'object' && res.data !== null && res.data.csvContent) 
        ? res.data.csvContent 
        : res.data;
      const fileName = (typeof res.data === 'object' && res.data !== null && res.data.filename)
        ? res.data.filename
        : `AllotEase_${sheetName || 'Export'}_${new Date().toISOString().split('T')[0]}.csv`;

      if (!csvData) {
        showToast(`No data records found to export for '${sheetName}'.`, 'warning');
        return;
      }

      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showToast(`Exported ${fileName} successfully!`, 'success');
    } else {
      showToast(res ? res.message : `Failed to export ${sheetName}.`, 'warning');
    }
  } catch (e) {
    showToast(e.toString(), 'danger');
  } finally {
    showLoading(false);
  }
};
