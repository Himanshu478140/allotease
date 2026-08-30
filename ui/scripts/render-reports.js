/**
 * Low-Cost Lite Smart Hostel Allocation & Optimization System
 * ui/scripts/render-reports.js - Analytics Summary & Export Options Renderer
 */

function renderReportsView() {
  const container = document.getElementById('reports-summary-box');
  if (!container) return;

  const s = state.stats;
  container.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card">
        <span class="stat-label">Allocation Rate</span>
        <span class="stat-value" style="color:var(--accent-emerald);">${s.allocationPercentage}%</span>
        <span class="stat-sub">${s.allocatedStudents} allocated / ${s.totalStudents} total students</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Average Satisfaction</span>
        <span class="stat-value" style="color:var(--accent-purple);">${s.avgScore}/100</span>
        <span class="stat-sub">Based on weighted soft preference engine</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Unallocated Queue</span>
        <span class="stat-value" style="color:var(--accent-amber);">${s.waitingStudents}</span>
        <span class="stat-sub">Waiting for room vacancies</span>
      </div>
    </div>
  `;
}
