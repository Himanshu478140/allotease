# AllotEase — Smart Hostel Allocation & Optimization System

**AllotEase** is a low-cost, high-efficiency hostel room allocation system built using **Google Sheets as the database** and **Google Apps Script as the backend**, paired with a modern, responsive web application interface.

---

## 🌟 Key Features

1. **Smart Weighted Allocation Engine**:
   - Strictly enforces hard constraints (Gender isolation, Room status availability, Bed capacity limits, Ground floor medical accessibility).
   - Maximizes soft preference satisfaction scores (Room Type, Block, Floor, Roommate Compatibility).
   - Strict priority queue processing (Emergency/Disability ➔ Final Year ➔ New Students ➔ General).

2. **Before vs After Optimization Metrics**:
   - Real-time comparison panel demonstrating optimization gains in bed utilization and student satisfaction.

3. **What-If Strategy Simulator**:
   - Interactive weight tuning sliders allowing administrators to dry-run alternative allocation strategies without mutating live database records.

4. **Manual Room Override & Audit Ledger**:
   - Supports administrative manual re-allocations with audit logging.

5. **Responsive Modern SaaS Design**:
   - Full dark-mode UI with custom scrollbars, mobile slide-out drawer, and custom modals complying strictly with [AGENTS.md](AGENTS.md).

---

## 🚀 Deployment & Google Apps Script URL Routing

When deployed as a Google Apps Script Web App:
- **Admin Dashboard**: Accessible directly via your main Web App deployment URL.
- **Public Student Registration Form**: Sharing your Web App URL with the `?view=student` query parameter (e.g., `https://script.google.com/.../exec?view=student`) serves the clean, standalone public student registration form while keeping your main deployment URL secure for admin dashboard access.

---

## 📁 Modular Project Structure

```text
c:\WEBSITE\SIH\
├── index.html       # Primary SPA Entry Point
├── README.md        # Documentation
├── AGENTS.md        # Architecture & UI Rules
├── core/            # System Config, Database Utilities & API Adapter
├── features/        # Domain Services (students, rooms, allocation, simulation, waitinglist, reports, demo)
└── ui/              # Visual Styles (ui/styles/) & Component Controllers (ui/scripts/)
```
