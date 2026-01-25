import { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  Package,
  AlertTriangle,
  Settings,
  Boxes,
  Bell,
  Truck,
  Users,
  UserCog,
  ClipboardList,
  PackageCheck,
  UtensilsCrossed,
  LogOut,
} from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { useLogout } from './hooks/useAuth';
import { useNotifications, useAlerts, usePendingDeliveriesCount } from './hooks/useData';
import {
  LoginPage,
  DashboardPage,
  StockPage,
  AlertsPage,
  BatchesPage,
  NotificationsPage,
  SettingsPage,
  UsersPage,
  KitchenPage,
} from './pages';
import TripsPage from './pages/TripsPage';
import VehiclesPage from './pages/VehiclesPage';
import DriversPage from './pages/DriversPage';
import RequestsPage from './pages/RequestsPage';
import DeliveriesPage from './pages/DeliveriesPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';

type PublicPage = 'login' | 'forgot-password' | 'accept-invite' | 'reset-password';

type TabId =
  | 'dashboard'
  | 'stock'
  | 'alerts'
  | 'batches'
  | 'trips'
  | 'vehicles'
  | 'drivers'
  | 'requests'
  | 'deliveries'
  | 'users'
  | 'notifications'
  | 'kitchen'
  | 'settings';

function App() {
  const { isAuthenticated, isManager, isDriver, user } = useAuthStore();
  const logoutMutation = useLogout();
  const [activeTab, setActiveTab] = useState<TabId>('stock');
  const [publicPage, setPublicPage] = useState<PublicPage>('login');
  const [inviteToken, setInviteToken] = useState<string>('');
  const [resetToken, setResetToken] = useState<string>('');
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [pendingTripRequest, setPendingTripRequest] = useState<string | null>(null);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const { data: notificationsData } = useNotifications();
  const { data: pendingDeliveriesCount = 0 } = usePendingDeliveriesCount();

  const handleLogout = async () => {
    await logoutMutation.mutateAsync();
    setShowLogoutConfirm(false);
  };

  // Navigate to trips page with specific trip selected
  const handleNavigateToTrip = (tripId: string) => {
    setSelectedTripId(tripId);
    setActiveTab('trips');
  };

  // Navigate to trips page with request pre-selected for trip creation
  const handleNavigateToCreateTrip = (requestId: string) => {
    setPendingTripRequest(requestId);
    setActiveTab('trips');
  };

  // Check URL for invite/reset tokens on load
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const invite = params.get('invite');
    const reset = params.get('reset');
    const type = params.get('type');

    if (invite) {
      setInviteToken(invite);
      setPublicPage('accept-invite');
    } else if (reset || type === 'recovery') {
      // Handle Supabase recovery token from hash
      const hash = window.location.hash;
      if (hash) {
        const hashParams = new URLSearchParams(hash.substring(1));
        const accessToken = hashParams.get('access_token');
        if (accessToken) {
          setResetToken(accessToken);
          setPublicPage('reset-password');
        }
      } else if (reset) {
        setResetToken(reset);
        setPublicPage('reset-password');
      }
    }
  }, []);

  const clearUrlParams = () => {
    window.history.replaceState({}, document.title, window.location.pathname);
    setInviteToken('');
    setResetToken('');
    setPublicPage('login');
  };

  if (!isAuthenticated) {
    // Handle public pages
    if (publicPage === 'accept-invite' && inviteToken) {
      return (
        <AcceptInvitePage
          token={inviteToken}
          onSuccess={clearUrlParams}
          onCancel={clearUrlParams}
        />
      );
    }

    if (publicPage === 'forgot-password') {
      return (
        <ForgotPasswordPage
          onBack={() => setPublicPage('login')}
        />
      );
    }

    if (publicPage === 'reset-password' && resetToken) {
      return (
        <ResetPasswordPage
          token={resetToken}
          onSuccess={clearUrlParams}
          onCancel={clearUrlParams}
        />
      );
    }

    return <LoginPage onForgotPassword={() => setPublicPage('forgot-password')} />;
  }

  // Filter main tabs based on role - drivers have limited access
  const mainTabs = [
    { id: 'stock' as const, label: 'Stock', icon: Package },
    ...(!isDriver() ? [{ id: 'kitchen' as const, label: 'Kitchen', icon: UtensilsCrossed }] : []),
    { id: 'requests' as const, label: 'Requests', icon: ClipboardList },
    { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
    ...(!isDriver() ? [{ id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle }] : []),
    ...(!isDriver() ? [{ id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard }] : []),
  ];

  // Filter more tabs based on role - drivers only see notifications and settings
  const moreTabs = [
    ...(!isDriver() ? [{ id: 'deliveries' as const, label: 'Verification', icon: PackageCheck }] : []),
    ...(isManager()
      ? [
        { id: 'drivers' as const, label: 'Drivers', icon: Users },
        { id: 'batches' as const, label: 'Batches', icon: Boxes },
        { id: 'users' as const, label: 'User Management', icon: UserCog },
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
        return <DashboardPage onNavigate={setActiveTab} />;
      case 'stock':
        return <StockPage />;
      case 'alerts':
        return <AlertsPage />;
      case 'batches':
        return <BatchesPage />;
      case 'trips':
        return (
          <TripsPage
            highlightTripId={selectedTripId}
            pendingRequestId={pendingTripRequest}
            onTripViewed={() => setSelectedTripId(null)}
            onRequestHandled={() => setPendingTripRequest(null)}
          />
        );
      case 'vehicles':
        return <VehiclesPage />;
      case 'drivers':
        return <DriversPage />;
      case 'requests':
        return (
          <RequestsPage
            onNavigateToTrip={handleNavigateToTrip}
            onNavigateToCreateTrip={handleNavigateToCreateTrip}
            onNavigateToDeliveries={() => setActiveTab('deliveries')}
          />
        );
      case 'deliveries':
        return <DeliveriesPage />;
      case 'users':
        return <UsersPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'kitchen':
        return <KitchenPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-950 flex flex-col">
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

        <nav className="flex-1 px-3 space-y-1">
          {/* Main Tabs */}
          {mainTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
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
            <p className="px-4 text-xs font-medium text-indigo-400 uppercase tracking-wider">
              More
            </p>
          </div>

          {/* More Tabs */}
          {moreTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm font-medium rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 ${activeTab === tab.id
                ? 'bg-orange-500 text-white'
                : 'text-indigo-200 hover:bg-indigo-900 hover:text-white'
                }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
              {tab.id === 'notifications' && unreadCount > 0 && (
                <span className="ml-auto px-2 py-0.5 bg-red-500 text-white text-xs font-medium rounded-full">
                  {unreadCount}
                </span>
              )}
              {tab.id === 'deliveries' && pendingDeliveriesCount > 0 && (
                <span className="ml-auto px-1.5 py-0.5 bg-orange-600 text-white text-[10px] font-medium rounded-full min-w-[18px] text-center">
                  {pendingDeliveriesCount > 99 ? '99+' : pendingDeliveriesCount}
                </span>
              )}
            </button>
          ))}
        </nav>

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
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-indigo-200 bg-indigo-900 hover:bg-indigo-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleLogout}
                  disabled={logoutMutation.isPending}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {logoutMutation.isPending ? 'Signing out...' : 'Sign Out'}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-200 hover:text-white hover:bg-indigo-900 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          )}

          <p className="text-xs text-indigo-500 text-center mt-3">v1.0.0</p>
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
  const criticalCount = alertsData?.summary?.reorder_now_count || 0;
  const warningCount =
    (alertsData?.summary?.low_stock_count || 0) +
    (alertsData?.summary?.expiring_soon_count || 0);
  const totalAlerts = criticalCount + warningCount;

  if (totalAlerts === 0) return null;

  // Cap at 99+ for cleaner display
  const displayCount = totalAlerts > 99 ? '99+' : totalAlerts;

  // Red only for critical, muted for warnings/counts - don't compete with brand orange
  const style = criticalCount > 0
    ? 'bg-red-500 text-white'
    : 'bg-indigo-200 text-indigo-700';

  return (
    <span className={`ml-auto px-1.5 py-0.5 ${style} text-[10px] font-medium rounded-full min-w-[18px] text-center`}>
      {displayCount}
    </span>
  );
}

export default App;
