import { useState } from 'react';
import {
  LayoutDashboard,
  Package,
  History,
  AlertTriangle,
  Settings,
  Boxes,
  BarChart3,
  FileText,
  MapPin,
  Bell,
  Truck,
  Users,
  Route,
} from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { useNotifications, useAlerts } from './hooks/useData';
import {
  LoginPage,
  DashboardPage,
  StockPage,
  TransactionsPage,
  AlertsPage,
  BatchesPage,
  AnalyticsPage,
  ReportsPage,
  ZoneOverviewPage,
  NotificationsPage,
  SettingsPage,
} from './pages';
import TripsPage from './pages/TripsPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';

type TabId =
  | 'dashboard'
  | 'stock'
  | 'transactions'
  | 'alerts'
  | 'batches'
  | 'analytics'
  | 'reports'
  | 'zone'
  | 'trips'
  | 'vehicles'
  | 'drivers'
  | 'notifications'
  | 'settings';

function App() {
  const { isAuthenticated, isManager } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabId>('dashboard');
  const { data: notificationsData } = useNotifications();

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  const mainTabs = [
    { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'stock' as const, label: 'Stock', icon: Package },
    { id: 'transactions' as const, label: 'Transactions', icon: History },
    { id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle },
  ];

  const moreTabs = [
    { id: 'batches' as const, label: 'Batches', icon: Boxes },
    { id: 'analytics' as const, label: 'Analytics', icon: BarChart3 },
    { id: 'trips' as const, label: 'Trips', icon: Route },
    { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
    { id: 'drivers' as const, label: 'Drivers', icon: Users },
    ...(isManager()
      ? [
          { id: 'reports' as const, label: 'Reports', icon: FileText },
          { id: 'zone' as const, label: 'Zone Overview', icon: MapPin },
        ]
      : []),
    { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];

  const allTabs = [...mainTabs, ...moreTabs];
  const currentTab = allTabs.find((t) => t.id === activeTab);
  const unreadCount = notificationsData?.unread_count || 0;

  const renderPage = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'stock':
        return <StockPage />;
      case 'transactions':
        return <TransactionsPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'batches':
        return <BatchesPage />;
      case 'analytics':
        return <AnalyticsPage />;
      case 'reports':
        return <ReportsPage />;
      case 'zone':
        return <ZoneOverviewPage />;
      case 'trips':
        return <TripsPage />;
      case 'vehicles':
        return <VehiclesPage />;
      case 'drivers':
        return <DriversPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 flex flex-col">
        <div className="p-6">
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <div className="w-8 h-8 bg-emerald-600 rounded-lg flex items-center justify-center">
              🥔
            </div>
            Potato Stock
          </h1>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {/* Main Tabs */}
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-emerald-400 before:rounded-full'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.id === 'alerts' && (
                <AlertBadge />
              )}
            </button>
          ))}

          {/* Divider */}
          <div className="pt-4 pb-2">
            <p className="px-4 text-xs font-medium text-gray-500 uppercase tracking-wider">
              More
            </p>
          </div>

          {/* More Tabs */}
          {moreTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors relative focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 ${
                activeTab === tab.id
                  ? 'bg-emerald-600 text-white before:absolute before:left-0 before:top-1 before:bottom-1 before:w-1 before:bg-emerald-400 before:rounded-full'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.id === 'notifications' && unreadCount > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </nav>

        {/* Version */}
        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">v1.0.0</p>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <header className="bg-white border-b border-gray-200 px-8 py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentTab && <currentTab.icon className="w-5 h-5 text-emerald-600" />}
              <h2 className="text-lg font-semibold text-gray-800">
                {currentTab?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
        <div className="p-8">{renderPage()}</div>
      </main>
    </div>
  );
}

function AlertBadge() {
  const { data: alertsData } = useAlerts();
  const totalAlerts =
    (alertsData?.summary?.low_stock_count || 0) +
    (alertsData?.summary?.reorder_now_count || 0) +
    (alertsData?.summary?.expiring_soon_count || 0);

  if (totalAlerts === 0) return null;

  return (
    <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
      {totalAlerts}
    </span>
  );
}

export default App;
