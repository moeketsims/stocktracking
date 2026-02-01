import { Menu, X } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import Sidebar, { type TabGroup } from './Sidebar';
import { useEffect } from 'react';
import { useFocusTrap } from '../hooks/useFocusTrap';

interface MobileMenuProps {
  tabGroups: TabGroup[];
  activeTab: string;
  setActiveTab: (tab: string) => void;
  unreadCount: number;
  pendingDeliveriesCount: number;
}

export function MobileMenuButton() {
  const { sidebarOpen, toggleSidebar } = useUIStore();

  return (
    <button
      onClick={toggleSidebar}
      className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500"
      aria-label={sidebarOpen ? 'Close menu' : 'Open menu'}
      aria-expanded={sidebarOpen}
      aria-controls="mobile-navigation-drawer"
    >
      {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  );
}

export function MobileDrawer({
  tabGroups,
  activeTab,
  setActiveTab,
  unreadCount,
  pendingDeliveriesCount,
}: MobileMenuProps) {
  const { sidebarOpen, closeSidebar } = useUIStore();

  // Focus trap with Escape key handling
  const drawerRef = useFocusTrap<HTMLDivElement>({
    isActive: sidebarOpen,
    onEscape: closeSidebar,
  });

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [sidebarOpen]);

  if (!sidebarOpen) return null;

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 transition-opacity"
        onClick={closeSidebar}
        aria-hidden="true"
      />

      {/* Drawer with dialog semantics */}
      <div
        ref={drawerRef}
        id="mobile-navigation-drawer"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation menu"
        tabIndex={-1}
        className="fixed inset-y-0 left-0 w-64 max-w-[80vw] shadow-xl transform transition-transform duration-300 ease-in-out"
      >
        <Sidebar
          tabGroups={tabGroups}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
          pendingDeliveriesCount={pendingDeliveriesCount}
          onClose={closeSidebar}
        />
      </div>
    </div>
  );
}
