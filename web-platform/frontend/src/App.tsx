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
  MapPin,
  Navigation,
  ArrowLeftRight,
} from 'lucide-react';
import { useAuthStore } from './stores/authStore';
import { useLogout } from './hooks/useAuth';
import { useNotifications, usePendingDeliveriesCount } from './hooks/useData';
import Sidebar from './components/Sidebar';
import { MobileMenuButton, MobileDrawer } from './components/MobileMenu';
import KmSubmissionBlocker from './components/KmSubmissionBlocker';
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
import LocationsPage from './pages/LocationsPage';
import SubmitKmPage from './pages/SubmitKmPage';
import FleetStatusPage from './pages/FleetStatusPage';
import LoansPage from './pages/LoansPage';

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
    window.history.replaceState({}, document.title, '/');
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

  // Filter main tabs based on role - drivers, vehicle managers, and staff have limited access
  const isAdmin = user?.role === 'admin';
  const isVehicleMgr = isVehicleManager();
  const isStaffUser = user?.role === 'staff';

  // Staff only sees Kitchen
  // Vehicle Manager only sees Vehicles and Fleet Status
  const mainTabs = isStaffUser
    ? [
        { id: 'kitchen' as const, label: 'Kitchen', icon: UtensilsCrossed },
      ]
    : isVehicleMgr
    ? [
        { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
        { id: 'fleet-status' as const, label: 'Fleet Status', icon: Navigation },
      ]
    : [
        { id: 'stock' as const, label: 'Stocks', icon: Package },
        ...(!isDriver() ? [{ id: 'kitchen' as const, label: isAdmin ? 'Kitchens' : 'Kitchen', icon: UtensilsCrossed }] : []),
        { id: 'requests' as const, label: 'Requests', icon: ClipboardList },
        ...(!isDriver() ? [{ id: 'loans' as const, label: 'Loans', icon: ArrowLeftRight }] : []),
        { id: 'vehicles' as const, label: 'Vehicles', icon: Truck },
        ...(!isDriver() ? [{ id: 'alerts' as const, label: 'Alerts', icon: AlertTriangle }] : []),
        ...(!isDriver() ? [{ id: 'dashboard' as const, label: 'Dashboard', icon: LayoutDashboard }] : []),
      ];

  // Filter more tabs based on role
  // Staff only sees Settings
  // Vehicle Manager sees: Drivers, User Management, Notifications, Settings
  const moreTabs = isStaffUser
    ? [
        { id: 'settings' as const, label: 'Settings', icon: Settings },
      ]
    : isVehicleMgr
    ? [
        { id: 'drivers' as const, label: 'Drivers', icon: Users },
        { id: 'users' as const, label: 'User Management', icon: UserCog },
        { id: 'notifications' as const, label: 'Notifications', icon: Bell },
        { id: 'settings' as const, label: 'Settings', icon: Settings },
      ]
    : [
        ...(!isDriver() ? [{ id: 'deliveries' as const, label: 'Verification', icon: PackageCheck }] : []),
        ...(isManager()
          ? [
            { id: 'drivers' as const, label: 'Drivers', icon: Users },
            { id: 'batches' as const, label: 'Batches', icon: Boxes },
            { id: 'users' as const, label: 'User Management', icon: UserCog },
          ]
          : []),
        ...(isAdmin ? [{ id: 'locations' as const, label: 'Locations', icon: MapPin }] : []),
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
    <div className="min-h-screen bg-gray-100 flex">
      {/* KM Submission Blocker - blocks driver navigation until km is submitted */}
      <KmSubmissionBlocker />

      {/* Mobile Drawer Overlay */}
      <MobileDrawer
        mainTabs={mainTabs}
        moreTabs={moreTabs}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadCount={unreadCount}
        pendingDeliveriesCount={pendingDeliveriesCount}
      />

      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:flex w-72 flex-shrink-0">
        <Sidebar
          mainTabs={mainTabs}
          moreTabs={moreTabs}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadCount={unreadCount}
          pendingDeliveriesCount={pendingDeliveriesCount}
        />
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto min-w-0">
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
        <div className="p-4 md:p-8">{renderPage()}</div>
      </main>
    </div>
  );
}

export default App;
