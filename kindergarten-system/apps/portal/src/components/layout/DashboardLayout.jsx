import AccountMenu from './AccountMenu'
import MyProfile from '../../pages/MyProfile'
import ThemeToggle from '../ThemeToggle'
import RoleDashboard from './RoleDashboard'
import OnboardingChecklist from './OnboardingChecklist'
import MasterDataManagement from '../../pages/master/MasterDataManagement'
import { useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { canAccessModule } from "../../config/permissions";
import BranchManagement from "../../pages/branches/BranchManagement";
import BranchDetail from "../../pages/branches/BranchDetail";
import UserManagement from "../../pages/users/UserManagement";
import StudentManagement from "../../pages/students/StudentManagement";
import StudentDetail from "../../pages/students/StudentDetail";
import StaffManagement from "../../pages/staff/StaffManagement";
import ClassManagement from "../../pages/classes/ClassManagement";
import ParentManagement from "../../pages/parents/ParentManagement";
import AttendanceManagement from "../../pages/attendance/AttendanceManagement";
import SchoolPayments from "../../pages/payments/SchoolPayments";
import PaymentNotifications from "./PaymentNotifications";
import FinanceManagement from "../../pages/finance/FinanceManagement";
import HomeworkManagement from "../../pages/homework/HomeworkManagement";
import AnnouncementManagement from "../../pages/announcements/AnnouncementManagement";
import ReportsManagement from "../../pages/reports/ReportsManagement";
import AIAnalyticsManagement from "../../pages/analytics/AIAnalyticsManagement";
import SubscriptionManagement from "../../pages/subscriptions/SubscriptionManagement";
import { getPageTitle } from "../../config/modulePages";
import SystemSettings from "../../pages/settings/SystemSettings";
import PlatformIdentity from "./PlatformIdentity";
import AuditLogs from "../../pages/audit/AuditLogs";
import ModulePlaceholder from "../ModulePlaceholder";
import logoPortal from "../../assets/logo-green.png";
import {
  IconSearch,
  IconChevronLeft,
  IconChevronRight,
} from "../icons/DashboardIcons";

function NavItem({ item, onLogout, collapsed, active, onSelect }) {
  const Icon = item.icon;
  const isLogout = item.action === "logout";
  const isActive = active;

  return (
    <button
      type="button"
      onClick={() => {
        if (isLogout) onLogout();
        else onSelect?.(item.id);
      }}
      title={collapsed ? item.label : undefined}
      className={`flex items-center transition-all duration-200 ${
        collapsed
          ? `h-10 w-10 justify-center rounded-full ${isActive ? "bg-[#174B2B] text-[#FAF4E7] shadow-md" : "text-[#888] hover:bg-[#F2F0DF] hover:text-[#174B2B]"}`
          : `w-full gap-3 rounded-2xl px-3 py-2.5 ${isActive ? "bg-[#174B2B] text-[#FAF4E7] shadow-md" : "text-[#555] hover:bg-[#F2F0DF] hover:text-[#174B2B]"}`
      }`}
    >
      {Icon && (
        <span
          className={`flex shrink-0 items-center justify-center ${collapsed ? "" : "h-8 w-8"}`}
        >
          <Icon />
        </span>
      )}
      {!collapsed && (
        <span className="truncate text-sm font-semibold">{item.label}</span>
      )}
    </button>
  );
}

function NavSection({ section, onLogout, collapsed, activeId, onSelect }) {
  if (collapsed) {
    return section.items.map((item) => (
      <NavItem
        key={item.id}
        item={item}
        onLogout={onLogout}
        collapsed={collapsed}
        active={activeId === item.id}
        onSelect={onSelect}
      />
    ));
  }

  return (
    <div className="mt-4 first:mt-0">
      <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-wider text-[#B0B0B0]">
        {section.label}
      </p>
      <div className="flex flex-col gap-1">
        {section.items.map((item) => (
          <NavItem
            key={item.id}
            item={item}
            onLogout={onLogout}
            collapsed={collapsed}
            active={activeId === item.id}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function Sidebar({
  sidebarNav,
  onLogout,
  collapsed,
  onToggleCollapse,
  activeId,
  onSelect,
}) {
  const flatItems = sidebarNav.sections.flatMap((section) => section.items);

  return (
    <aside
      className={`flex shrink-0 flex-col py-6 transition-all duration-300 ${
        collapsed ? "w-[72px]" : "w-[240px]"
      }`}
    >
      <div className="portal-sidebar-panel relative flex max-h-[calc(100svh-3rem)] flex-1 flex-col rounded-[28px] bg-white px-3 py-5 shadow-[0_4px_24px_rgba(0,0,0,0.06)]">
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          aria-expanded={!collapsed}
          className="sidebar-collapse-toggle"
        >
          {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
          <div
            className={`flex flex-col ${collapsed ? "items-center gap-2.5" : "gap-1"}`}
          >
            <NavItem
              item={sidebarNav.dashboard}
              onLogout={onLogout}
              collapsed={collapsed}
              active={activeId === sidebarNav.dashboard.id}
              onSelect={onSelect}
            />

            {collapsed
              ? flatItems.map((item) => (
                  <NavItem
                    key={item.id}
                    item={item}
                    onLogout={onLogout}
                    collapsed={collapsed}
                    active={activeId === item.id}
                    onSelect={onSelect}
                  />
                ))
              : sidebarNav.sections.map((section) => (
                  <NavSection
                    key={section.id}
                    section={section}
                    onLogout={onLogout}
                    collapsed={collapsed}
                    activeId={activeId}
                    onSelect={onSelect}
                  />
                ))}
          </div>
        </div>


      </div>
    </aside>
  );
}

function Header({ pageTitle, userName, roleLabel, showTitle, onProfile }) {
  return (
    <header className="portal-topbar flex items-center gap-4 px-2 pb-5 pt-1">
      {showTitle && (
        <>
          <div className="flex shrink-0 items-center gap-2.5">
            <img
              src={logoPortal}
              alt="PAPA"
              className="h-15 w-15 object-contain"
            />
          </div>

          <h1 className="hidden shrink-0 text-xl font-bold text-[#174B2B] sm:block">
            {pageTitle}
          </h1>
        </>
      )}

      <div
        className={`relative w-full max-w-md ${showTitle ? "mx-auto flex-1" : "flex-1"}`}
      >
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#999]" />
        <input
          type="search"
          placeholder="Search..."
          className="w-full rounded-full border border-[#EBEBEB] bg-white py-2.5 pl-11 pr-4 text-sm text-[#174B2B] outline-none transition-shadow placeholder:text-[#AAA] focus:border-[#638753] focus:shadow-[0_0_0_3px_rgba(23,75,43,0.25)]"
        />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-3">
        <ThemeToggle />
        <PaymentNotifications />
        <AccountMenu userName={userName} roleLabel={roleLabel} onProfile={onProfile} />
      </div>
    </header>
  );
}

function MainContent({
  onNavigate,
  activeId,
  config,
  selectedBranchId,
  selectedStudentId,
  onViewBranch,
  onBackFromBranch,
  onViewStudent,
  onBackFromStudent,
}) {
  if (activeId === 'my-profile') return <MyProfile roleLabel={config.roleLabel} />;
  if (['branches', 'students', 'children', 'staff', 'parents', 'classes'].includes(activeId)) {
    return <main className="min-h-0 flex-1 overflow-y-auto pr-1"><MasterDataManagement key={activeId} moduleId={activeId} /></main>;
  }

  if (activeId === "dashboard") {
    return <main className="min-h-0 flex-1 overflow-y-auto pr-1"><RoleDashboard onNavigate={onNavigate} /></main>;
  }

  if (activeId === "branches") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          {selectedBranchId ? (
            <BranchDetail
              branchId={selectedBranchId}
              onBack={onBackFromBranch}
            />
          ) : (
            <BranchManagement onViewBranch={onViewBranch} />
          )}
        </main>
      </div>
    );
  }

  if (activeId === "users") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <UserManagement />
        </main>
      </div>
    );
  }

  if (activeId === "students" || activeId === "children") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          {selectedStudentId ? (
            <StudentDetail
              studentId={selectedStudentId}
              onBack={onBackFromStudent}
            />
          ) : (
            <StudentManagement
              moduleId={activeId}
              onViewStudent={onViewStudent}
            />
          )}
        </main>
      </div>
    );
  }

  if (activeId === "staff") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <StaffManagement />
        </main>
      </div>
    );
  }

  if (activeId === "classes") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <ClassManagement />
        </main>
      </div>
    );
  }

  if (activeId === "parents") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <ParentManagement />
        </main>
      </div>
    );
  }

  if (activeId === "attendance") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <AttendanceManagement />
        </main>
      </div>
    );
  }

  if (activeId === "payments") {
    return <div className="flex min-h-0 flex-1 overflow-hidden"><main className="min-w-0 flex-1 overflow-y-auto pr-1"><SchoolPayments /></main></div>;
  }

  if (activeId === "finance") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <FinanceManagement />
        </main>
      </div>
    );
  }

  if (activeId === "homework") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <HomeworkManagement />
        </main>
      </div>
    );
  }

  if (activeId === "announcement") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <AnnouncementManagement />
        </main>
      </div>
    );
  }

  if (activeId === "reports") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <ReportsManagement />
        </main>
      </div>
    );
  }

  if (activeId === "dashboard-analytics") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <AIAnalyticsManagement />
        </main>
      </div>
    );
  }

  if (activeId === "system-settings") {
    return <div className="flex min-h-0 flex-1 overflow-hidden"><main className="min-w-0 flex-1 overflow-y-auto pr-1"><SystemSettings /></main></div>;
  }

  if (activeId === "audit-logs") {
    return <div className="flex min-h-0 flex-1 overflow-hidden"><main className="min-w-0 flex-1 overflow-y-auto pr-1"><AuditLogs /></main></div>;
  }

  if (activeId === "subscription") {
    return (
      <div className="flex min-h-0 flex-1 overflow-hidden">
        <main className="min-w-0 flex-1 overflow-y-auto pr-1">
          <SubscriptionManagement />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <main className="min-w-0 flex-1 overflow-y-auto pr-1">
        <ModulePlaceholder title={getPageTitle(activeId)} />
      </main>
    </div>
  );
}

export default function DashboardLayout({ config, sidebarNav }) {
  const { session, signOut, userRole } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeId, setActiveId] = useState(sidebarNav.dashboard.id);
  const [selectedBranchId, setSelectedBranchId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const effectiveActiveId = userRole && !canAccessModule(userRole, activeId)
    ? "dashboard"
    : activeId;
  const email = session?.user?.email ?? "";
  const userName = email.split("@")[0] || "User";
  const pageTitle = selectedBranchId
    ? "Branch Details"
    : selectedStudentId
      ? "Student Profile"
      : getPageTitle(effectiveActiveId);

  function handleSelectNav(id) {
    if (userRole && !canAccessModule(userRole, id)) return;
    setActiveId(id);
    if (id !== "branches") setSelectedBranchId(null);
    if (id !== "students" && id !== "children") setSelectedStudentId(null);
  }

  return (
    <div className="dashboard-shell min-h-svh bg-[#F0F0EB] p-3 md:p-5">
      <div className="mx-auto flex min-h-[calc(100svh-2.5rem)] max-w-[1440px] gap-3 md:gap-4">
        <Sidebar
          sidebarNav={sidebarNav}
          onLogout={signOut}
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
          activeId={effectiveActiveId}
          onSelect={handleSelectNav}
        />

        <div className="flex min-w-0 flex-1 flex-col px-4 py-4 md:px-6 md:py-5">
          <Header
            onProfile={() => handleSelectNav("my-profile")}
            pageTitle={pageTitle}
            userName={userName}
            roleLabel={config.roleLabel}
            showTitle={effectiveActiveId === "dashboard"}
          />

          <PlatformIdentity />
          {effectiveActiveId === "dashboard" && <OnboardingChecklist key={`${session?.user?.id}:${userRole}`} onNavigate={handleSelectNav} />}

          <MainContent
            onNavigate={handleSelectNav}
            activeId={effectiveActiveId}
            config={config}
            selectedBranchId={selectedBranchId}
            selectedStudentId={selectedStudentId}
            onViewBranch={setSelectedBranchId}
            onBackFromBranch={() => setSelectedBranchId(null)}
            onViewStudent={setSelectedStudentId}
            onBackFromStudent={() => setSelectedStudentId(null)}
          />
        </div>
      </div>
    </div>
  );
}
