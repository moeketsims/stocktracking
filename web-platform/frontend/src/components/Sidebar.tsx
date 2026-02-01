import { LogOut, Settings, ChevronDown, ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useLogout } from '../hooks/useAuth';
import { useAlerts, useDriverLoanTripsCount } from '../hooks/useData';
import { useState, useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

export type TabGroup = {
  id: string;
  label: string;
  icon: LucideIcon;
  tabs: Tab[];
};

interface SidebarProps {
  tabGroups: TabGroup[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount: number;
  pendingDeliveriesCount: number;
  onClose?: () => void;
}

export default function Sidebar({
  tabGroups,
  activeTab,
  setActiveTab,
  unreadCount,
  pendingDeliveriesCount,
  onClose,
}: SidebarProps) {
  const { user, isDriver } = useAuthStore();
  const logoutMutation = useLogout();
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Get driver loan trips count for badge on Requests tab
  const { data: loanTripsCount = 0 } = useDriverLoanTripsCount();

  // Find which group contains the active tab
  const findActiveGroup = () => {
    for (const group of tabGroups) {
      if (group.tabs.some(tab => tab.id === activeTab)) {
        return group.id;
      }
    }
    return null;
  };

  // Track expanded groups - auto-expand the group containing active tab
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    tabGroups.forEach(group => {
      // By default, expand Operations and Monitoring, collapse Admin
      initial[group.id] = group.id !== 'admin';
    });
    return initial;
  });

  // Auto-expand group when active tab changes
  useEffect(() => {
    const activeGroup = findActiveGroup();
    if (activeGroup && !expandedGroups[activeGroup]) {
      setExpandedGroups(prev => ({ ...prev, [activeGroup]: true }));
    }
  }, [activeTab]);

  // Sync expanded state when tabGroups change (e.g., role change)
  useEffect(() => {
    setExpandedGroups(prev => {
      const updated: Record<string, boolean> = {};
      tabGroups.forEach(group => {
        // Preserve existing state or default based on group id
        updated[group.id] = prev[group.id] ?? group.id !== 'admin';
      });
      return updated;
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabGroups.map(g => g.id).join(',')]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Check if we should show groups (only if total tabs > 5)
  const totalTabs = tabGroups.reduce((sum, g) => sum + g.tabs.length, 0);
  const showGroups = totalTabs > 5;

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setShowLogoutConfirm(false);
  };

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId);
    onClose?.();
  };

  // Render badge for specific tabs
  const renderBadge = (tabId: string) => {
    if (tabId === 'alerts') {
      return <AlertBadge />;
    }
    if (tabId === 'requests' && isDriver() && loanTripsCount > 0) {
      return (
        <span className="ml-auto px-1.5 py-0.5 bg-orange-600 text-white text-[10px] font-medium rounded-full min-w-[18px] text-center">
          {loanTripsCount > 99 ? '99+' : loanTripsCount}
        </span>
      );
    }
    if (tabId === 'notifications' && unreadCount > 0) {
      return (
        <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
          {unreadCount}
        </span>
      );
    }
    if (tabId === 'deliveries' && pendingDeliveriesCount > 0) {
      return (
        <span className="ml-auto px-1.5 py-0.5 bg-orange-600 text-white text-[10px] font-medium rounded-full min-w-[18px] text-center">
          {pendingDeliveriesCount > 99 ? '99+' : pendingDeliveriesCount}
        </span>
      );
    }
    return null;
  };

  return (
    <div className="h-full bg-indigo-950 flex flex-col">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center">
            <span className="text-xl">🥔</span>
          </div>
          <div>
            <h1 className="text-lg font-bold text-white">Potato Stock</h1>
            <p className="text-xs text-indigo-300">Inventory Manager</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 overflow-y-auto sidebar-scroll">
        {showGroups ? (
          /* Grouped Navigation */
          <div className="space-y-1">
            {tabGroups.map((group) => (
              <div key={group.id} className="mb-1">
                {/* Group Header */}
                <button
                  onClick={() => toggleGroup(group.id)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs font-semibold text-indigo-400 uppercase tracking-wider hover:text-indigo-200 transition-colors rounded-lg"
                >
                  <div className="flex items-center gap-2">
                    <group.icon className="w-3.5 h-3.5" />
                    {group.label}
                  </div>
                  {expandedGroups[group.id] ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </button>

                {/* Collapsible Items */}
                {expandedGroups[group.id] && (
                  <div className="space-y-0.5 mt-0.5">
                    {group.tabs.map((tab) => (
                      <NavButton
                        key={tab.id}
                        tab={tab}
                        isActive={activeTab === tab.id}
                        onClick={() => handleTabClick(tab.id)}
                        badge={renderBadge(tab.id)}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          /* Flat Navigation (for roles with few items) */
          <div className="space-y-1">
            {tabGroups.flatMap(group => group.tabs).map((tab) => (
              <NavButton
                key={tab.id}
                tab={tab}
                isActive={activeTab === tab.id}
                onClick={() => handleTabClick(tab.id)}
                badge={renderBadge(tab.id)}
              />
            ))}
          </div>
        )}
      </nav>

      {/* Settings - Pinned above profile */}
      <div className="px-3 pb-2">
        <button
          onClick={() => handleTabClick('settings')}
          className={`w-full flex items-center gap-3 px-4 py-3 md:py-2.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
            activeTab === 'settings'
              ? 'bg-orange-500 text-white'
              : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
          }`}
        >
          <Settings className="w-5 h-5" />
          Settings
        </button>
      </div>

      {/* User Profile & Sign Out */}
      <div className="p-4 border-t border-indigo-900">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-9 h-9 bg-orange-500 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-sm font-semibold text-white">
              {user?.full_name?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {user?.full_name || 'User'}
            </p>
            <p className="text-xs text-indigo-300 capitalize">
              {user?.role?.replace('_', ' ') || 'Staff'}
            </p>
          </div>
        </div>

        {showLogoutConfirm ? (
          <div className="space-y-2">
            <p className="text-xs text-indigo-200 text-center">Sign out?</p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 px-3 py-2 md:py-1.5 text-xs font-medium text-indigo-200 bg-indigo-900 hover:bg-indigo-800 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                disabled={logoutMutation.isPending}
                className="flex-1 px-3 py-2 md:py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
              >
                {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 md:py-2 text-sm font-medium text-indigo-200 hover:text-white hover:bg-indigo-900 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        )}

        <p className="text-xs text-indigo-500 text-center mt-3">v1.0.0</p>
      </div>
    </div>
  );
}

function AlertBadge() {
  const { data: alertsData } = useAlerts();
  const criticalCount = alertsData?.summary?.reorder_now_count || 0;
  const warningCount =
    (alertsData?.summary?.low_stock_count || 0) +
    (alertsData?.summary?.expiring_soon_count || 0);
  const totalAlerts = criticalCount + warningCount;

  if (totalAlerts === 0) return null;

  const displayCount = totalAlerts > 99 ? '99+' : totalAlerts;

  const style =
    criticalCount > 0
      ? 'bg-red-500 text-white'
      : 'bg-indigo-200 text-indigo-700';

  return (
    <span
      className={`ml-auto px-1.5 py-0.5 ${style} text-[10px] font-medium rounded-full min-w-[18px] text-center`}
    >
      {displayCount}
    </span>
  );
}

// Reusable nav button component
interface NavButtonProps {
  tab: { id: string; label: string; icon: LucideIcon };
  isActive: boolean;
  onClick: () => void;
  badge?: React.ReactNode;
}

function NavButton({ tab, isActive, onClick, badge }: NavButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 md:py-2.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${
        isActive
          ? 'bg-orange-500 text-white'
          : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
      }`}
    >
      <tab.icon className="w-5 h-5" />
      {tab.label}
      {badge}
    </button>
  );
}
