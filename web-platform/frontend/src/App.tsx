import { useState, useEffect, Suspense, lazy } from 'react';
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
  MapPin,
  Navigation,
  ArrowLeftRight,
  Briefcase,
  BarChart3,
  Shield,
} from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { useLogout } from './hooks/useAuth';
import { useNotifications, usePendingDeliveriesCount } from './hooks/useData';
import Sidebar, { type TabGroup } from './components/Sidebar';
import { MobileMenuButton, MobileDrawer } from './components/MobileMenu';
import KmSubmissionBlocker from './components/KmSubmissionBlocker';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastContainer } from './components/ui/Toast';

// Eagerly loaded pages (critical path)
import LoginPage from './pages/LoginPage';
import AcceptInvitePage from './pages/AcceptInvitePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import SubmitKmPage from './pages/SubmitKmPage';

// Lazy loaded pages (code splitting)
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const StockPage = lazy(() => import('./pages/StockPage'));
const AlertsPage = lazy(() => import('./pages/AlertsPage'));
const BatchesPage = lazy(() => import('./pages/BatchesPage'));
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const UsersPage = lazy(() => import('./pages/UsersPage'));
const KitchenPage = lazy(() => import('./pages/KitchenPage'));
const TripsPage = lazy(() => import('./pages/TripsPage'));
const VehiclesPage = lazy(() => import('./pages/VehiclesPage'));
const DriversPage = lazy(() => import('./pages/DriversPage'));
const RequestsPage = lazy(() => import('./pages/RequestsPage'));
const DeliveriesPage = lazy(() => import('./pages/DeliveriesPage'));
const LocationsPage = lazy(() => import('./pages/LocationsPage'));
const FleetStatusPage = lazy(() => import('./pages/FleetStatusPage'));
const LoansPage = lazy(() => import('./pages/LoansPage'));

// Page loading skeleton for Suspense fallback
function PageLoader() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-pulse space-y-4 w-full max-w-2xl p-8">
        <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        <div className="h-32 bg-gray-200 rounded"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    </div>
  );
}

type PublicPage = 'login' | 'forgot-password' | 'accept-invite' | 'reset-password' | 'submit-km';

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
  | 'loans'
  | 'users'
  | 'locations'
  | 'notifications'
  | 'kitchen'
  | 'fleet-status'
  | 'settings';

// Helper to parse URL params for initial state (avoids race condition)
function getInitialPublicPageState(): { publicPage: PublicPage; inviteToken: string; resetToken: string; kmSubmissionToken: string } {
  const params = new URLSearchParams(window.location.search);
  const invite = params.get('invite');
  const reset = params.get('reset');
  const type = params.get('type');
  const token = params.get('token');
  const pathname = window.location.pathname;

  // Handle submit-km page (public, no auth required)
  if (pathname === '/submit-km' && token) {
    return { publicPage: 'submit-km', inviteToken: '', resetToken: '', kmSubmissionToken: token };
  }

  // Handle invitation
  if (invite) {
    return { publicPage: 'accept-invite', inviteToken: invite, resetToken: '', kmSubmissionToken: '' };
  }

  // Handle password reset
  if (reset || type === 'recovery') {
    const hash = window.location.hash;
    if (hash) {
      const hashParams = new URLSearchParams(hash.substring(1));
      const accessToken = hashParams.get('access_token');
      if (accessToken) {
        return { publicPage: 'reset-password', inviteToken: '', resetToken: accessToken, kmSubmissionToken: '' };
      }
    } else if (reset) {
      return { publicPage: 'reset-password', inviteToken: '', resetToken: reset, kmSubmissionToken: '' };
    }
  }

  return { publicPage: 'login', inviteToken: '', resetToken: '', kmSubmissionToken: '' };
}

// Parse URL params once outside component to avoid race condition with auth state
const initialUrlState = getInitialPublicPageState();

function App() {
  const { isAuthenticated, isManager, isDriver, isVehicleManager, user } = useAuthStore();
  const logoutMutation = useLogout();
  const [activeTab, setActiveTab] = useState<TabId>('stock');

  // Initialize from URL params immediately (parsed once above)
  const [publicPage, setPublicPage] = useState<PublicPage>(initialUrlState.publicPage);
  const [inviteToken, setInviteToken] = useState<string>(initialUrlState.inviteToken);
  const [resetToken, setResetToken] = useState<string>(initialUrlState.resetToken);
  const [kmSubmissionToken, setKmSubmissionToken] = useState<string>(initialUrlState.kmSubmissionToken);

  const [selectedTripId, setSelectedTripId] = useState<string | null>(null);
  const [pendingTripRequest, setPendingTripRequest] = useState<string | null>(null);
  const { data: notificationsData } = useNotifications();
  const { data: pendingDeliveriesCount = 0 } = usePendingDeliveriesCount();

  // Set default tab based on role and reset if current tab is invalid for user's role
  useEffect(() => {
    if (isVehicleManager()) {
      // Vehicle managers can only access vehicles and fleet-status
      if (!['vehicles', 'fleet-status', 'drivers', 'users', 'notifications', 'settings'].includes(activeTab)) {
        setActiveTab('vehicles');
      }
    } else if (user?.role === 'staff') {
      // Staff can only access kitchen and settings
      if (!['kitchen', 'settings'].includes(activeTab)) {
        setActiveTab('kitchen');
      }
    } else if (isDriver()) {
      // Drivers have limited access - no loans, alerts, dashboard, deliveries, batches, users, locations, kitchen
      const driverTabs = ['stock', 'requests', 'vehicles', 'notifications', 'settings'];
      if (!driverTabs.includes(activeTab)) {
        setActiveTab('requests');
      }
    }
  }, [user?.role, activeTab]);

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

  // URL params are now parsed during state initialization (getInitialPublicPageState)
  // to avoid race conditions with auth state on first render

  const clearUrlParams = () => {
    window.history.replaceState({}, document.title, import.meta.env.BASE_URL || '/');
    setInviteToken('');
    setResetToken('');
    setKmSubmissionToken('');
    setPublicPage('login');
  };

  // Handle km submission - completely public page, no auth check needed
  if (publicPage === 'submit-km' && kmSubmissionToken) {
    return <SubmitKmPage />;
  }

  // Handle invitation acceptance - this should work regardless of auth status
  // If someone opens an invite link while logged in as admin, show the invite page
  if (publicPage === 'accept-invite' && inviteToken) {
    return (
      <AcceptInvitePage
        token={inviteToken}
        onSuccess={() => {
          // Log out any existing user before redirecting to login
          if (isAuthenticated) {
            logoutMutation.mutate();
          }
          clearUrlParams();
        }}
        onCancel={() => {
          // If cancelling, just clear params but keep current session
          clearUrlParams();
        }}
      />
    );
  }

  // Handle password reset - also works regardless of auth status
  if (publicPage === 'reset-password' && resetToken) {
    return (
      <ResetPasswordPage
        token={resetToken}
        onSuccess={() => {
          if (isAuthenticated) {
            logoutMutation.mutate();
          }
          clearUrlParams();
        }}
        onCancel={clearUrlParams}
      />
    );
  }

  if (!isAuthenticated) {
    if (publicPage === 'forgot-password') {
      return (
        <ForgotPasswordPage
          onBack={() => setPublicPage('login')}
        />
      );
    }

    return <LoginPage onForgotPassword={() => setPublicPage('forgot-password')} />;
  }

  // Filter tabs based on role - drivers, vehicle managers, and staff have limited access
  const isAdmin = user?.role === 'admin';
  const isVehicleMgr = isVehicleManager();
  const isStaffUser = user?.role === 'staff';

  // Build tab groups based on role
  const tabGroups: TabGroup[] = (() => {
    // Staff only sees Kitchen (Settings is pinned separately)
    if (isStaffUser) {
      return [
        {
          id: 'operations',
          label: 'Operations',
          icon: Briefcase,
          tabs: [
            { id: 'kitchen' as const, label: 'Kitchen', icon: UtensilsCrossed },
          ],
        },
      ];
    }

    // Vehicle Manager: Vehicles, Fleet Status + Admin tabs (Settings is pinned separately)
    if (isVehicleMgr) {
      return [
        {
          id: 'operations',
          label: 'Operations',
          icon: Briefcase,
          tabs: [
            { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
            { id: 'fleet-status' as const, label: 'Fleet Status', icon: Navigation },
          ],
        },
        {
          id: 'admin',
          label: 'Admin',
          icon: Shield,
          tabs: [
            { id: 'drivers' as const, label: 'Drivers', icon: Users },
            { id: 'users' as const, label: 'User Management', icon: UserCog },
            { id: 'notifications' as const, label: 'Notifications', icon: Bell },
          ],
        },
      ];
    }

    // Driver: Limited access (Settings is pinned separately)
    if (isDriver()) {
      return [
        {
          id: 'operations',
          label: 'Operations',
          icon: Briefcase,
          tabs: [
            { id: 'stock' as const, label: 'Stocks', icon: Package },
            { id: 'requests' as const, label: 'Requests', icon: ClipboardList },
            { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
            { id: 'notifications' as const, label: 'Notifications', icon: Bell },
          ],
        },
      ];
    }

    // Manager/Admin: Full access with groups
    const operationsTabs = [
      { id: 'stock' as const, label: 'Stocks', icon: Package },
      { id: 'kitchen' as const, label: isAdmin ? 'Kitchens' : 'Kitchen', icon: UtensilsCrossed },
      { id: 'requests' as const, label: 'Requests', icon: ClipboardList },
      { id: 'loans' as const, label: 'Loans', icon: ArrowLeftRight },
      { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
    ];

    const monitoringTabs = [
      { id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle },
      { id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard },
      { id: 'deliveries' as const, label: 'Verification', icon: PackageCheck },
    ];

    // Settings is pinned separately at the bottom of the sidebar
    const adminTabs = [
      ...(isManager() ? [
        { id: 'drivers' as const, label: 'Drivers', icon: Users },
        { id: 'batches' as const, label: 'Batches', icon: Boxes },
        { id: 'users' as const, label: 'User Management', icon: UserCog },
      ] : []),
      ...(isAdmin ? [{ id: 'locations' as const, label: 'Locations', icon: MapPin }] : []),
      { id: 'notifications' as const, label: 'Notifications', icon: Bell },
    ];

    return [
      { id: 'operations', label: 'Operations', icon: Briefcase, tabs: operationsTabs },
      { id: 'monitoring', label: 'Monitoring', icon: BarChart3, tabs: monitoringTabs },
      { id: 'admin', label: 'Admin', icon: Shield, tabs: adminTabs },
    ];
  })();

  // Include Settings which is pinned separately in the sidebar
  const allTabs = [
    ...tabGroups.flatMap(group => group.tabs),
    { id: 'settings' as const, label: 'Settings', icon: Settings },
  ];
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
      case 'loans':
        return <LoansPage onNavigateToTrip={handleNavigateToTrip} />;
      case 'users':
        return <UsersPage />;
      case 'locations':
        return <LocationsPage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage />;
      case 'kitchen':
        return <KitchenPage />;
      case 'fleet-status':
        return <FleetStatusPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="h-screen bg-gray-100 flex overflow-hidden">
      {/* Skip link for keyboard accessibility */}
      <a
        href="#main-content"
        className="sr-only sr-only-focusable fixed top-0 left-0 z-50 bg-orange-500 text-white px-4 py-2 rounded-br-lg focus:not-sr-only"
      >
        Skip to main content
      </a>

      {/* KM Submission Blocker - blocks driver navigation until km is submitted */}
      <KmSubmissionBlocker />

      {/* Mobile Drawer Overlay */}
      <MobileDrawer
        tabGroups={tabGroups}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        pendingDeliveriesCount={pendingDeliveriesCount}
      />

      {/* Desktop Sidebar - fixed height with internal scroll */}
      <aside className="hidden md:flex w-72 flex-shrink-0 h-full">
        <Sidebar
          tabGroups={tabGroups}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
          pendingDeliveriesCount={pendingDeliveriesCount}
        />
      </aside>

      {/* Main Content - scrolls independently */}
      <main id="main-content" className="flex-1 overflow-auto min-w-0">
        <header className="bg-white border-b border-gray-200 px-4 md:px-8 py-3 md:py-4 sticky top-0 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 md:gap-3">
              {/* Mobile Menu Button */}
              <MobileMenuButton />
              {currentTab && <currentTab.icon className="w-5 h-5 text-emerald-600" />}
              <h2 className="text-base md:text-lg font-semibold text-gray-800 truncate">
                {currentTab?.label || 'Dashboard'}
              </h2>
            </div>
            <div className="flex items-center gap-2 md:gap-4">
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
                )}
              </button>
              <button
                onClick={() => setActiveTab('settings')}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
                aria-label="Settings"
              >
                <Settings className="w-5 h-5" />
              </button>
            </div>
          </div>
        </header>
        <ErrorBoundary>
          <Suspense fallback={<PageLoader />}>
            <div className="p-4 md:p-8">{renderPage()}</div>
          </Suspense>
        </ErrorBoundary>
      </main>

      {/* Toast notifications */}
      <ToastContainer />
    </div>
  );
}

export default App;
