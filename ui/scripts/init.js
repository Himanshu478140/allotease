/**
 * AllotEase - Application Initialization & Router
 * ui/scripts/init.js
 */

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

/**
 * Initialize App Navigation and Initial Data Fetch
 */
async function initApp() {
  // Check for ?view=student parameter in URL (Local preview & GAS routing)
  const urlParams = new URLSearchParams(window.location.search);
  const viewMode = (urlParams.get('view') || urlParams.get('page') || '').toLowerCase();

  if (viewMode === 'student') {
    try {
      const resp = await fetch('ui/StudentIntake.html');
      if (resp.ok) {
        const html = await resp.text();
        
        // 100% Standalone view replacement for local browser simulator
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        document.body.style.background = '#f8fafc';
        document.body.innerHTML = html;
        
        // Re-execute scripts embedded in StudentIntake.html
        const scripts = document.body.querySelectorAll('script');
        scripts.forEach(scr => {
          const newScr = document.createElement('script');
          newScr.textContent = scr.textContent;
          document.body.appendChild(newScr);
        });

        return;
      }
    } catch (err) {
      console.warn('Could not fetch ui/StudentIntake.html for local preview:', err);
    }
  }

  await loadModularViews();
  setupNavigation();
  setupMobileDrawer();
  setupSidebarCollapse();
  setupEventHandlers();

  await refreshAllData();
  showToast('AllotEase ready.');
}

/**
 * Load Modular Views & Components for Local Browser Preview (localhost:3000)
 */
async function loadModularViews() {
  const viewMap = {
    'view-dashboard': 'ui/views/dashboard.html',
    'view-intake-form': 'ui/views/intake-form.html',
    'view-students': 'ui/views/students.html',
    'view-rooms': 'ui/views/rooms.html',
    'view-allocation': 'ui/views/allocation-hub.html',
    'view-property-setup': 'ui/views/property-setup.html',
    'modals-container': 'ui/views/modals.html'
  };

  const loadPromises = Object.entries(viewMap).map(async ([containerId, filePath]) => {
    const container = document.getElementById(containerId);
    if (container && (!container.children || container.children.length === 0)) {
      try {
        const res = await fetch(filePath);
        if (res.ok) {
          const html = await res.text();
          container.innerHTML = html;

          // Execute scripts inside fetched HTML views
          const scripts = container.querySelectorAll('script');
          scripts.forEach(scr => {
            const newScr = document.createElement('script');
            newScr.textContent = scr.textContent;
            document.body.appendChild(newScr);
          });
        }
      } catch (err) {
        console.warn(`[ViewLoader] Local fetch failed for ${filePath}:`, err);
      }
    }
  });

  await Promise.all(loadPromises);
}

/**
 * Setup Desktop Expandable/Collapsible Sidebar
 */
function setupSidebarCollapse() {
  const collapseBtn = document.getElementById('sidebar-collapse-btn');
  const brandLogo = document.getElementById('brand-logo');
  const sidebar = document.getElementById('sidebar');

  // Restore saved collapse state from localStorage
  const isCollapsed = localStorage.getItem('allotease_sidebar_collapsed') === 'true';
  if (isCollapsed && window.innerWidth > 768) {
    sidebar?.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
  }

  // Click separate collapse button in expanded state
  collapseBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (window.innerWidth <= 768) return;
    sidebar?.classList.add('collapsed');
    document.body.classList.add('sidebar-collapsed');
    localStorage.setItem('allotease_sidebar_collapsed', 'true');
  });

  // Click logo badge in collapsed state to expand
  brandLogo?.addEventListener('click', (e) => {
    if (window.innerWidth <= 768) return;
    if (sidebar?.classList.contains('collapsed')) {
      sidebar.classList.remove('collapsed');
      document.body.classList.remove('sidebar-collapsed');
      localStorage.setItem('allotease_sidebar_collapsed', 'false');
    }
  });
}

/**
 * Setup Mobile Top Navigation Dropdown & Drawer
 */
function setupMobileDrawer() {
  const toggleBtn = document.getElementById('mobile-menu-toggle');
  const backdrop = document.getElementById('sidebar-backdrop');
  const mainNavWrapper = document.getElementById('main-nav-wrapper');

  function toggleMobileNav(e) {
    if (e) e.stopPropagation();
    mainNavWrapper?.classList.toggle('mobile-open');
    backdrop?.classList.toggle('active');
    if (mainNavWrapper?.classList.contains('mobile-open')) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }

  function closeMobileNav() {
    mainNavWrapper?.classList.remove('mobile-open');
    backdrop?.classList.remove('active');
    document.body.style.overflow = '';
  }

  toggleBtn?.addEventListener('click', toggleMobileNav);
  backdrop?.addEventListener('click', closeMobileNav);

  window.closeMobileSidebar = closeMobileNav;
}

/**
 * Refreshes all global state data from API adapter
 */
async function refreshAllData() {
  try {
    showLoading(true);
    const results = await Promise.allSettled([
      api.getStudents(),
      api.getRooms(),
      api.getAllocations(),
      api.getWaitingList(),
      api.getDashboardStats(),
      api.getBeforeVsAfterMetrics(),
      api.getPriorityTiers(),
      api.getBuildingLayout(),
      api.getFormIntakeConfig(),
      api.getPropertyConfig()
    ]);

    const [studentsRes, roomsRes, allocRes, waitingRes, statsRes, beforeAfterRes, prioRes, layoutRes, intakeRes, propRes] = results;

    if (studentsRes.status === 'fulfilled' && studentsRes.value?.data) state.students = studentsRes.value.data;
    if (roomsRes.status === 'fulfilled' && roomsRes.value?.data) state.rooms = roomsRes.value.data;
    if (allocRes.status === 'fulfilled' && allocRes.value?.data) state.allocations = allocRes.value.data;
    if (waitingRes.status === 'fulfilled' && waitingRes.value?.data) state.waitingList = waitingRes.value.data;
    if (statsRes.status === 'fulfilled' && statsRes.value?.data) state.stats = statsRes.value.data;
    if (beforeAfterRes.status === 'fulfilled' && beforeAfterRes.value?.data) state.beforeAfter = beforeAfterRes.value.data;
    if (prioRes.status === 'fulfilled' && prioRes.value?.data) state.priorityTiers = prioRes.value.data;
    if (layoutRes.status === 'fulfilled' && layoutRes.value?.data) state.buildingLayout = layoutRes.value.data;
    if (intakeRes.status === 'fulfilled' && intakeRes.value?.data) state.intakeConfig = intakeRes.value.data;
    if (propRes.status === 'fulfilled' && propRes.value?.data) {
      state.propertyConfig = propRes.value.data;
      if (typeof window.renderHardConstraintsCard === 'function') {
        window.renderHardConstraintsCard(state.propertyConfig.hardConstraints || {});
      }
      if (typeof window.renderCollegeLocationCard === 'function') {
        window.renderCollegeLocationCard(state.propertyConfig);
      }
      if (typeof window.renderEmailNoticesCard === 'function') {
        window.renderEmailNoticesCard(state.propertyConfig.autoEmailNotices !== false);
      }
    }

    renderCurrentView();

    // Force immediate table & view updates across all active views without needing tab switches
    if (typeof renderDashboard === 'function') renderDashboard();
    if (typeof renderAllocationsTable === 'function') renderAllocationsTable();
    if (typeof renderAllocatedStudentsTable === 'function') renderAllocatedStudentsTable();
    if (typeof renderStudentsTable === 'function') renderStudentsTable();
    if (typeof renderRoomsCards === 'function') renderRoomsCards();
    if (typeof renderWaitingListTable === 'function') renderWaitingListTable();
  } catch (err) {
    showToast('Error refreshing data: ' + err.toString(), 'danger');
  } finally {
    showLoading(false);
  }
}

window.refreshAllData = refreshAllData;

// Auto-sync Warden Portal whenever student data changes in another tab / iframe
window.addEventListener('storage', (e) => {
  if (!e.key || e.key.startsWith('allotease_')) {
    if (typeof window.refreshAllData === 'function') {
      window.refreshAllData().catch(() => {});
    }
  }
});

let isNavPillInitialized = false;

/**
 * Update Traveling Active Pill Indicator Position
 */
function updateNavSlidingPill() {
  const activeItem = document.querySelector('.top-nav-bar .nav-item.active');
  const indicator = document.getElementById('nav-active-pill-indicator');
  const navMenu = document.getElementById('top-nav-menu');
  
  if (!activeItem || !indicator || !navMenu) return;
  
  const itemRect = activeItem.getBoundingClientRect();
  const menuRect = navMenu.getBoundingClientRect();
  
  if (itemRect.width === 0 || menuRect.width === 0) return;

  const left = itemRect.left - menuRect.left;
  const top = itemRect.top - menuRect.top;
  const width = itemRect.width;
  const height = itemRect.height;
  
  if (!isNavPillInitialized) {
    indicator.style.transition = 'none';
    indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    indicator.style.width = `${width}px`;
    indicator.style.height = `${height}px`;
    indicator.classList.add('initialized');
    void indicator.offsetWidth;
    indicator.style.transition = '';
    isNavPillInitialized = true;
  } else {
    indicator.style.transform = `translate3d(${left}px, ${top}px, 0)`;
    indicator.style.width = `${width}px`;
    indicator.style.height = `${height}px`;
  }
}

window.updateNavSlidingPill = updateNavSlidingPill;
window.addEventListener('resize', updateNavSlidingPill);

/**
 * Setup Navigation Listeners
 */
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item, .action-nav-item');
  navItems.forEach(item => {
    item.addEventListener('click', (e) => {
      const view = item.getAttribute('data-view');
      if (!view) return;

      navItems.forEach(i => {
        if (i.getAttribute('data-view') === view) {
          i.classList.add('active');
        } else {
          i.classList.remove('active');
        }
      });

      updateNavSlidingPill();
      state.currentView = view;
      renderCurrentView();
      if (window.closeMobileSidebar) window.closeMobileSidebar();
    });
  });

  setTimeout(updateNavSlidingPill, 50);
  setTimeout(updateNavSlidingPill, 200);
}

/**
 * Render Active SPA View (6 Streamlined Navigation Views)
 */
function renderCurrentView() {
  const views = ['dashboard', 'intake-form', 'students', 'rooms', 'allocation', 'property-setup'];
  views.forEach(v => {
    const el = document.getElementById(`view-${v}`);
    if (el) el.style.display = (v === state.currentView) ? 'block' : 'none';
  });

  const pageTitle = document.getElementById('page-title-text');
  const pageSubtitle = document.getElementById('page-subtitle-text');

  const subtitles = {
    'dashboard': 'Hostel occupancy & live allocations',
    'intake-form': 'Submit student applications & view active forms',
    'students': 'Manage applicants & priority queue',
    'rooms': 'Hostel inventory & 3D visualizer',
    'allocation': 'Run automated allocation engine',
    'property-setup': 'System parameters & layout config'
  };

  if (pageTitle) {
    if (state.currentView === 'property-setup') pageTitle.textContent = 'Settings';
    else if (state.currentView === 'intake-form') pageTitle.textContent = 'Applications';
    else pageTitle.textContent = capitalize(state.currentView.replace('-', ' '));
  }

  if (pageSubtitle) {
    pageSubtitle.textContent = subtitles[state.currentView] || 'Hostel Allocation System';
  }

  if (state.currentView === 'dashboard') renderDashboard();
  else if (state.currentView === 'intake-form') renderIntakeFormView();
  else if (state.currentView === 'students') renderStudentsTable();
  else if (state.currentView === 'rooms') renderRoomsCards();
  else if (state.currentView === 'allocation') {
    if (typeof renderAllocationView === 'function') renderAllocationView();
    else if (typeof renderAllocationsView === 'function') renderAllocationsView();
  }
  else if (state.currentView === 'property-setup') renderPropertySetupView();

  setTimeout(updateNavSlidingPill, 10);
  setTimeout(updateNavSlidingPill, 150);
}
