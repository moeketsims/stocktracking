import { Menu, X } from 'lucide-react';
import { useUIStore } from '../stores/uiStore';
import Sidebar from './Sidebar';
import type { LucideIcon } from 'lucide-react';
import { useEffect } from 'react';

interface Tab {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface MobileMenuProps {
  mainTabs: Tab[];
  moreTabs: Tab[];
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
    >
      {sidebarOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
    </button>
  );
}

export function MobileDrawer({
  mainTabs,
  moreTabs,
  activeTab,
  setActiveTab,
  unreadCount,
  pendingDeliveriesCount,
}: MobileMenuProps) {
  const { sidebarOpen, closeSidebar } = useUIStore();

  // Close drawer on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && sidebarOpen) {
        closeSidebar();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [sidebarOpen, closeSidebar]);

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

      {/* Drawer */}
      <div className="fixed inset-y-0 left-0 w-72 max-w-[85vw] shadow-xl transform transition-transform duration-300 ease-in-out">
        <Sidebar
          mainTabs={mainTabs}
          moreTabs={moreTabs}
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
