import { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Clock,
  AlertTriangle,
  Check,
  Truck,
  RefreshCw,
  Filter,
  User,
  X,
  Bell,
  Info,
  UserCheck,
  MoreVertical,
  Edit3,
  XCircle,
  Store,
  ExternalLink,
  ChevronDown,
  Send,
  Flame,
} from 'lucide-react';
import { Button } from '../components/ui';
import { stockRequestsApi, vehiclesApi, referenceApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import { CancelRequestModal } from '../components/modals/CancelRequestModal';
import { EditRequestModal } from '../components/modals/EditRequestModal';
import AcceptDeliveryModal from '../components/modals/AcceptDeliveryModal';
import { REQUEST_STATUS_CONFIG, getShortRequestId } from '../utils/statusConfig';
import type { StockRequest, StockRequestStatus, Vehicle, Supplier } from '../types';

// Re-export for local use
const STATUS_CONFIG = REQUEST_STATUS_CONFIG;

type TabFilter = 'available' | 'my' | 'attention' | 'all';
type ViewDensity = 'comfortable' | 'compact';

interface RequestsPageProps {
  onNavigateToTrip?: (tripId: string) => void;
  onNavigateToCreateTrip?: (requestId: string) => void;
  onNavigateToDeliveries?: () => void;
}

export default function RequestsPage({ onNavigateToTrip, onNavigateToCreateTrip, onNavigateToDeliveries }: RequestsPageProps) {
  const queryClient = useQueryClient();
  const { user, isManager, isDriver, isLocationManager } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('available');
  const [selectedRequest, setSelectedRequest] = useState<StockRequest | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFulfillRemainingModal, setShowFulfillRemainingModal] = useState(false);
  const [showAcceptDeliveryModal, setShowAcceptDeliveryModal] = useState(false);
  const [viewDensity, setViewDensity] = useState<ViewDensity>('compact');
  const [linkedRequestBanner, setLinkedRequestBanner] = useState<{
    show: boolean;
    request: StockRequest | null;
    message: string;
    type: 'info' | 'warning' | 'success';
  }>({ show: false, request: null, message: '', type: 'info' });

  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [urgencyFilter, setUrgencyFilter] = useState<'all' | 'urgent' | 'normal'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | StockRequestStatus>('all');
  const [dateRange, setDateRange] = useState<'7days' | '30days' | 'all'>('7days');

  const currentUserId = user?.id;

  const [linkedRequestId, setLinkedRequestId] = useState<string | null>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('id');
  });

  const { data: allRequestsData, isLoading: loadingAll, refetch: refetchAll } = useQuery({
    queryKey: ['stock-requests', 'all', dateRange],
    queryFn: () => stockRequestsApi.list({ limit: 200 }).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: myRequestsData, isLoading: loadingMy, refetch: refetchMy } = useQuery({
    queryKey: ['stock-requests', 'my'],
    queryFn: () => stockRequestsApi.getMyRequests(undefined, 100).then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles'],
    queryFn: () => vehiclesApi.list(true).then(r => r.data),
    enabled: showFulfillRemainingModal,
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => referenceApi.getSuppliers().then(r => r.data),
    enabled: showFulfillRemainingModal,
  });

  const { data: linkedRequestData } = useQuery({
    queryKey: ['stock-request', linkedRequestId],
    queryFn: () => stockRequestsApi.get(linkedRequestId!).then(r => r.data),
    enabled: !!linkedRequestId,
  });

  // Re-request mutation (resend notification to all drivers)
  const reRequestMutation = useMutation({
    mutationFn: (requestId: string) => stockRequestsApi.reRequest(requestId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
    },
  });

  // Mark urgent mutation
  const markUrgentMutation = useMutation({
    mutationFn: (requestId: string) => stockRequestsApi.update(requestId, { urgency: 'urgent' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
    },
  });

  useEffect(() => {
    if (linkedRequestId && linkedRequestData?.request) {
      const request = linkedRequestData.request as StockRequest;
      const status = request.status;

      if (status === 'pending') {
        setLinkedRequestBanner({
          show: true,
          request,
          message: `Request for ${request.location?.name} is available. Click "Accept & Deliver" to start.`,
          type: 'success',
        });
      } else if (status === 'accepted') {
        // Legacy: requests that were accepted before the new flow
        const acceptorName = request.acceptor?.full_name || 'another driver';
        const isMe = request.accepted_by === currentUserId;
        if (isMe) {
          setLinkedRequestBanner({
            show: true,
            request,
            message: `You've accepted this request. Click "Start Delivery" to begin.`,
            type: 'info',
          });
          setActiveTab('my');
        } else {
          setLinkedRequestBanner({
            show: true,
            request,
            message: `This request was already accepted by ${acceptorName}.`,
            type: 'warning',
          });
        }
      } else if (status === 'trip_created' || status === 'in_delivery') {
        setLinkedRequestBanner({
          show: true,
          request,
          message: `This request already has a delivery in progress.`,
          type: 'warning',
        });
      } else if (status === 'fulfilled') {
        setLinkedRequestBanner({
          show: true,
          request,
          message: `This request has been fulfilled.`,
          type: 'info',
        });
      } else {
        setLinkedRequestBanner({
          show: true,
          request,
          message: `This request is no longer available (${status}).`,
          type: 'warning',
        });
      }

      window.history.replaceState({}, '', window.location.pathname);
      setLinkedRequestId(null);
    }
  }, [linkedRequestId, linkedRequestData, currentUserId]);

  const isLoading = loadingAll || loadingMy;

  const myAcceptedRequests = useMemo(() => {
    return (myRequestsData?.accepted || []).filter(
      (r: StockRequest) => r.status === 'accepted'
    );
  }, [myRequestsData]);

  const pendingActionCount = myAcceptedRequests.length;

  const filterByDateRange = (requests: StockRequest[]) => {
    if (dateRange === 'all') return requests;
    const now = new Date();
    const cutoff = new Date();
    if (dateRange === '7days') {
      cutoff.setDate(now.getDate() - 7);
    } else if (dateRange === '30days') {
      cutoff.setDate(now.getDate() - 30);
    }
    return requests.filter(r => new Date(r.created_at) >= cutoff);
  };

  // Calculate "needs attention" requests: partial, urgent pending, or pending > 3 days
  const needsAttentionRequests = useMemo(() => {
    const allRequests = allRequestsData?.requests || [];
    const now = new Date();
    const threeDaysMs = 3 * 24 * 60 * 60 * 1000;

    return allRequests.filter((r: StockRequest) => {
      // Partial fulfillment
      if (r.status === 'partially_fulfilled') return true;

      // Urgent pending
      if (r.status === 'pending' && r.urgency === 'urgent') return true;

      // Pending older than 3 days
      if (r.status === 'pending') {
        const createdAt = new Date(r.created_at);
        if (now.getTime() - createdAt.getTime() > threeDaysMs) return true;
      }

      return false;
    });
  }, [allRequestsData]);

  const getRequests = (): StockRequest[] => {
    let requests: StockRequest[] = [];

    if (activeTab === 'available') {
      requests = (allRequestsData?.requests || []).filter(
        (r: StockRequest) => r.status === 'pending'
      );
    } else if (activeTab === 'my') {
      const created = myRequestsData?.created || [];
      const accepted = myRequestsData?.accepted || [];
      requests = [...created, ...accepted];
    } else if (activeTab === 'attention') {
      requests = needsAttentionRequests;
    } else {
      requests = allRequestsData?.requests || [];
    }

    // Skip date filter for attention tab (we want to see all)
    if (activeTab !== 'attention') {
      requests = filterByDateRange(requests);
    }

    if (urgencyFilter !== 'all') {
      requests = requests.filter(r => r.urgency === urgencyFilter);
    }
    if (statusFilter !== 'all') {
      requests = requests.filter(r => r.status === statusFilter);
    }

    return requests.sort((a, b) => {
      if (a.urgency === 'urgent' && b.urgency !== 'urgent') return -1;
      if (a.urgency !== 'urgent' && b.urgency === 'urgent') return 1;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  };

  const requests = getRequests();

  const availableCount = (allRequestsData?.requests || []).filter(
    (r: StockRequest) => r.status === 'pending'
  ).length;

  const myCount = (myRequestsData?.created?.length || 0) + (myRequestsData?.accepted?.length || 0);
  const attentionCount = needsAttentionRequests.length;
  const allCount = allRequestsData?.requests?.length || 0;

  // Only managers (admin, zone_manager, location_manager) see the Needs Attention tab
  const showAttentionTab = isManager() || isLocationManager();

  const handleRefresh = () => {
    refetchAll();
    refetchMy();
  };

  const getRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHours < 24) return `${diffHours}h`;
    if (diffDays < 7) return `${diffDays}d`;
    return date.toLocaleDateString();
  };

  const isMyRequest = (request: StockRequest): boolean => {
    if (!currentUserId) return false;
    return request.requested_by === currentUserId || request.accepted_by === currentUserId;
  };

  const clearFilters = () => {
    setUrgencyFilter('all');
    setStatusFilter('all');
    setDateRange('7days');
  };

  const hasActiveFilters = urgencyFilter !== 'all' || statusFilter !== 'all' || dateRange !== '7days';

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-14 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Linked Request Banner */}
      {linkedRequestBanner.show && linkedRequestBanner.request && (
        <div className={`rounded-xl p-3 flex items-center justify-between ${
          linkedRequestBanner.type === 'success' ? 'bg-emerald-50 border border-emerald-200' :
          linkedRequestBanner.type === 'warning' ? 'bg-amber-50 border border-amber-200' :
          'bg-blue-50 border border-blue-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
              linkedRequestBanner.type === 'success' ? 'bg-emerald-100' :
              linkedRequestBanner.type === 'warning' ? 'bg-amber-100' :
              'bg-blue-100'
            }`}>
              {linkedRequestBanner.type === 'success' ? (
                <Check className="w-4 h-4 text-emerald-600" />
              ) : linkedRequestBanner.type === 'warning' ? (
                <UserCheck className="w-4 h-4 text-amber-600" />
              ) : (
                <Info className="w-4 h-4 text-blue-600" />
              )}
            </div>
            <div>
              <span className={`font-medium ${
                linkedRequestBanner.type === 'success' ? 'text-emerald-800' :
                linkedRequestBanner.type === 'warning' ? 'text-amber-800' :
                'text-blue-800'
              }`}>
                {linkedRequestBanner.request.location?.name}
              </span>
              <span className={`text-sm ml-2 ${
                linkedRequestBanner.type === 'success' ? 'text-emerald-600' :
                linkedRequestBanner.type === 'warning' ? 'text-amber-600' :
                'text-blue-600'
              }`}>
                {linkedRequestBanner.message}
              </span>
            </div>
          </div>
          <button
            onClick={() => setLinkedRequestBanner({ show: false, request: null, message: '', type: 'info' })}
            className="w-7 h-7 rounded-lg hover:bg-black/5 flex items-center justify-center"
          >
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>
      )}

      {/* Pending Actions Banner - for legacy accepted requests */}
      {pendingActionCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
              <Bell className="w-4 h-4 text-amber-600" />
            </div>
            <span className="text-sm text-amber-800">
              <span className="font-semibold">{pendingActionCount}</span> accepted order{pendingActionCount > 1 ? 's' : ''} need{pendingActionCount === 1 ? 's' : ''} to be started
            </span>
          </div>
          <Button
            onClick={() => setActiveTab('my')}
            size="sm"
            className="bg-amber-500 hover:bg-amber-600 text-white h-8 text-xs"
          >
            Start Deliveries
          </Button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock Requests</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {activeTab === 'available' ? 'Accept requests to deliver' : activeTab === 'my' ? 'Your orders' : 'All requests'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Density Toggle - hidden on mobile */}
          <div className="hidden md:flex items-center bg-gray-100 rounded-lg p-0.5">
            <button
              onClick={() => setViewDensity('compact')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewDensity === 'compact' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Compact
            </button>
            <button
              onClick={() => setViewDensity('comfortable')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                viewDensity === 'comfortable' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'
              }`}
            >
              Comfortable
            </button>
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`gap-1.5 h-8 ${hasActiveFilters ? 'ring-2 ring-orange-500' : ''}`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleRefresh}
            className="gap-1.5 h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-xs text-orange-600 hover:text-orange-700">
                Clear all
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Urgency</label>
              <select
                value={urgencyFilter}
                onChange={(e) => setUrgencyFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All</option>
                <option value="urgent">Urgent</option>
                <option value="normal">Normal</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="all">All</option>
                <option value="pending">Pending</option>
                <option value="accepted">Accepted</option>
                <option value="trip_created">Trip Created</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-600 mb-1">Date Range</label>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as any)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="7days">7 days</option>
                <option value="30days">30 days</option>
                <option value="all">All time</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('available')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'available' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Available
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
            activeTab === 'available' ? 'bg-orange-100 text-orange-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {availableCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('my')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'my' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          My Orders
          {pendingActionCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-amber-100 text-amber-700 animate-pulse">
              {pendingActionCount}
            </span>
          )}
        </button>
        {showAttentionTab && (
          <button
            onClick={() => setActiveTab('attention')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'attention' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <AlertTriangle className={`w-3.5 h-3.5 ${attentionCount > 0 ? 'text-red-500' : ''}`} />
            Needs Attention
            {attentionCount > 0 && (
              <span className={`px-1.5 py-0.5 text-xs rounded-full ${
                activeTab === 'attention' ? 'bg-red-100 text-red-700' : 'bg-red-100 text-red-600'
              }`}>
                {attentionCount}
              </span>
            )}
          </button>
        )}
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          All
          <span className={`px-1.5 py-0.5 text-xs rounded-full ${
            activeTab === 'all' ? 'bg-gray-200 text-gray-700' : 'bg-gray-200 text-gray-600'
          }`}>
            {allCount}
          </span>
        </button>
      </div>

      {/* Requests List */}
      {requests.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-medium text-gray-600">No requests found</h3>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === 'available' ? 'No pending stock requests' : hasActiveFilters ? 'Try adjusting filters' : 'No requests to display'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {/* Table Header - Hidden on mobile */}
          <div className="hidden md:block bg-gray-50 border-b border-gray-200 sticky top-0 z-10">
            <div className={`grid ${(isDriver() || (activeTab === 'attention' && showAttentionTab)) ? 'grid-cols-[70px_1fr_65px_55px_120px_45px_90px_120px]' : 'grid-cols-[70px_1fr_65px_55px_120px_45px_90px]'} gap-2 px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider`}>
              <div>Req #</div>
              <div>Location</div>
              <div className="text-right pr-1">Qty</div>
              <div className="text-center">Stock</div>
              <div>Requested By</div>
              <div className="text-center">Age</div>
              <div className="text-center">Status</div>
              {(isDriver() || (activeTab === 'attention' && showAttentionTab)) && <div className="text-right">Action</div>}
            </div>
          </div>

          {/* Table Body */}
          <div className="divide-y divide-gray-100">
            {requests.map((request) => (
              <RequestRow
                key={request.id}
                request={request}
                isOwner={isMyRequest(request)}
                isManager={isManager()}
                isDriver={isDriver()}
                showManagerActions={activeTab === 'attention' && showAttentionTab}
                density={viewDensity}
                onAcceptAndDeliver={() => {
                  setSelectedRequest(request);
                  setShowAcceptDeliveryModal(true);
                }}
                onCreateTrip={() => {
                  // Navigate to TripsPage with this request pre-selected
                  onNavigateToCreateTrip?.(request.id);
                }}
                onEdit={() => {
                  setSelectedRequest(request);
                  setShowEditModal(true);
                }}
                onCancel={() => {
                  setSelectedRequest(request);
                  setShowCancelModal(true);
                }}
                onFulfillRemaining={() => {
                  setSelectedRequest(request);
                  setShowFulfillRemainingModal(true);
                }}
                onViewTrip={(tripId: string) => onNavigateToTrip?.(tripId)}
                onTrackDelivery={() => onNavigateToDeliveries?.()}
                onReRequest={() => reRequestMutation.mutate(request.id)}
                onMarkUrgent={() => markUrgentMutation.mutate(request.id)}
                isReRequesting={reRequestMutation.isPending && reRequestMutation.variables === request.id}
                isMarkingUrgent={markUrgentMutation.isPending && markUrgentMutation.variables === request.id}
                getRelativeTime={getRelativeTime}
              />
            ))}
          </div>
        </div>
      )}

      {/* Modals */}
      <CancelRequestModal
        isOpen={showCancelModal}
        onClose={() => { setShowCancelModal(false); setSelectedRequest(null); }}
        request={selectedRequest}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['stock-requests'] })}
      />

      <EditRequestModal
        isOpen={showEditModal}
        onClose={() => { setShowEditModal(false); setSelectedRequest(null); }}
        request={selectedRequest}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['stock-requests'] })}
      />

      <AcceptDeliveryModal
        isOpen={showAcceptDeliveryModal}
        onClose={() => { setShowAcceptDeliveryModal(false); setSelectedRequest(null); }}
        request={selectedRequest}
        onSuccess={() => queryClient.invalidateQueries({ queryKey: ['stock-requests'] })}
      />

      {showFulfillRemainingModal && selectedRequest && (
        <FulfillRemainingModal
          request={selectedRequest}
          vehicles={vehiclesData?.vehicles || []}
          suppliers={suppliersData?.suppliers || []}
          onClose={() => { setShowFulfillRemainingModal(false); setSelectedRequest(null); }}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
            setShowFulfillRemainingModal(false);
            setSelectedRequest(null);
          }}
        />
      )}
    </div>
  );
}

// Refined Request Row Component
function RequestRow({
  request,
  isOwner,
  isManager,
  isDriver,
  showManagerActions,
  density,
  onAcceptAndDeliver,
  onCreateTrip,
  onEdit,
  onCancel,
  onFulfillRemaining,
  onViewTrip,
  onTrackDelivery,
  onReRequest,
  onMarkUrgent,
  isReRequesting,
  isMarkingUrgent,
  getRelativeTime,
}: {
  request: StockRequest;
  isOwner: boolean;
  isManager: boolean;
  isDriver: boolean;
  showManagerActions?: boolean;
  density: ViewDensity;
  onAcceptAndDeliver: () => void;
  onCreateTrip: () => void;
  onEdit: () => void;
  onCancel: () => void;
  onFulfillRemaining: () => void;
  onViewTrip: (tripId: string) => void;
  onTrackDelivery: () => void;
  onReRequest?: () => void;
  onMarkUrgent?: () => void;
  isReRequesting?: boolean;
  isMarkingUrgent?: boolean;
  getRelativeTime: (date: string) => string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showManagerMenu, setShowManagerMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const managerMenuRef = useRef<HTMLDivElement>(null);

  const statusConfig = STATUS_CONFIG[request.status];
  const isUrgent = request.urgency === 'urgent';
  const capacityPct = request.capacity_percent || (
    request.current_stock_kg && request.target_stock_kg
      ? Math.round((request.current_stock_kg / request.target_stock_kg) * 100)
      : null
  );

  // Stock color thresholds - red <15%, amber <30%
  const getStockColor = (pct: number) => {
    if (pct < 15) return 'bg-red-500';
    if (pct < 30) return 'bg-amber-500';
    return 'bg-emerald-400';
  };

  const getStockTextColor = (pct: number) => {
    if (pct < 15) return 'text-red-600 font-semibold';
    if (pct < 30) return 'text-amber-600 font-medium';
    return 'text-gray-500';
  };

  // Only drivers can accept requests and perform delivery actions
  const canAccept = request.status === 'pending' && isDriver;
  const canCreateTrip = request.status === 'accepted' && isOwner && isDriver;
  const canEdit = (request.status === 'pending' || request.status === 'accepted') && isOwner && isDriver;
  const canCancel = (request.status === 'pending' || request.status === 'accepted') && isOwner && isDriver;
  const canFulfillRemaining = request.status === 'partially_fulfilled' && isManager;
  const isInDelivery = request.status === 'in_delivery' && isManager;
  const hasTrip = request.status === 'trip_created' || request.status === 'fulfilled';
  // Only show secondary actions menu for drivers
  const hasSecondaryActions = isDriver && (canEdit || canCancel);

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
      if (managerMenuRef.current && !managerMenuRef.current.contains(event.target as Node)) {
        setShowManagerMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Primary action - ALWAYS show something
  const renderPrimaryAction = () => {
    if (canAccept) {
      return (
        <Button
          onClick={onAcceptAndDeliver}
          size="sm"
          className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-3 whitespace-nowrap"
        >
          Accept & Deliver
        </Button>
      );
    }
    if (canCreateTrip) {
      // This is for requests that were accepted before the new flow
      return (
        <Button
          onClick={onCreateTrip}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 h-7 text-xs px-3 whitespace-nowrap"
        >
          Start Delivery
        </Button>
      );
    }
    if (canFulfillRemaining) {
      return (
        <Button
          onClick={onFulfillRemaining}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 h-7 text-xs px-3 whitespace-nowrap"
        >
          Fulfill Rest
        </Button>
      );
    }
    if (isInDelivery) {
      return (
        <Button
          onClick={onTrackDelivery}
          size="sm"
          className="bg-orange-500 hover:bg-orange-600 h-7 text-xs px-3 whitespace-nowrap gap-1"
        >
          <Truck className="w-3 h-3" />
          Track Delivery
        </Button>
      );
    }
    if (hasTrip && request.trips) {
      return (
        <button
          onClick={() => onViewTrip(request.trips!.id)}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 border border-gray-300 bg-white hover:bg-gray-50 px-2.5 py-1 rounded-md transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          View Trip
        </button>
      );
    }
    // No action available
    return <span className="text-gray-300 text-sm">—</span>;
  };

  // Manager action split-button for "Needs Attention" tab
  const renderManagerActions = () => {
    if (!showManagerActions) return null;

    // Only show for pending or partially_fulfilled
    if (!['pending', 'partially_fulfilled'].includes(request.status)) {
      return <span className="text-gray-300 text-sm">—</span>;
    }

    const isAlreadyUrgent = request.urgency === 'urgent';

    return (
      <div className="relative inline-flex" ref={managerMenuRef}>
        {/* Primary action: Re-request */}
        <button
          onClick={onReRequest}
          disabled={isReRequesting}
          className="inline-flex items-center gap-1 h-7 px-2.5 text-xs font-medium text-white bg-orange-500 hover:bg-orange-600 disabled:bg-orange-300 rounded-l-md transition-colors whitespace-nowrap"
        >
          <Send className="w-3 h-3 flex-shrink-0" />
          {isReRequesting ? 'Sending...' : 'Resend'}
        </button>

        {/* Dropdown toggle */}
        <button
          onClick={() => setShowManagerMenu(!showManagerMenu)}
          className="inline-flex items-center justify-center h-7 px-1.5 text-white bg-orange-500 hover:bg-orange-600 border-l border-orange-400 rounded-r-md transition-colors"
        >
          <ChevronDown className="w-3 h-3" />
        </button>

        {/* Dropdown menu */}
        {showManagerMenu && (
          <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {!isAlreadyUrgent && request.status === 'pending' && (
              <button
                onClick={() => {
                  setShowManagerMenu(false);
                  onMarkUrgent?.();
                }}
                disabled={isMarkingUrgent}
                className="w-full px-3 py-1.5 text-left text-xs text-amber-700 hover:bg-amber-50 flex items-center gap-2"
              >
                <Flame className="w-3 h-3" />
                {isMarkingUrgent ? 'Marking...' : 'Mark Urgent'}
              </button>
            )}
            <button
              onClick={() => {
                setShowManagerMenu(false);
                onCancel();
              }}
              className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <XCircle className="w-3 h-3" />
              Cancel
            </button>
          </div>
        )}
      </div>
    );
  };

  const rowPadding = density === 'compact' ? 'py-2' : 'py-3';

  return (
    <>
      {/* Mobile Card Layout */}
      <div className={`md:hidden p-4 hover:bg-gray-50 transition-colors ${
        isUrgent && request.status === 'pending' ? 'bg-red-50/50' : ''
      }`}>
        {/* Top row: Location + Status */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
              isOwner ? 'bg-emerald-100' : 'bg-gray-100'
            }`}>
              <Store className={`w-4 h-4 ${isOwner ? 'text-emerald-600' : 'text-gray-400'}`} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-sm font-semibold text-gray-900 truncate">
                  {request.location?.name || 'Unknown'}
                </span>
                {isUrgent && request.status === 'pending' && (
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                )}
              </div>
              <span className="text-xs text-gray-500 font-mono">
                {getShortRequestId(request.id)}
              </span>
            </div>
          </div>
          <span className={`px-2 py-1 rounded border text-xs font-semibold flex-shrink-0 ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Middle row: Key metrics */}
        <div className="flex items-center gap-4 mb-3 text-sm">
          <div className="flex items-center gap-1.5">
            <Package className="w-4 h-4 text-gray-400" />
            <span className="font-bold text-gray-900">{request.quantity_bags}</span>
            <span className="text-gray-500 text-xs">bags</span>
          </div>
          {capacityPct !== null && (
            <div className="flex items-center gap-1.5">
              <div className="w-12 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getStockColor(capacityPct)}`}
                  style={{ width: `${Math.min(capacityPct, 100)}%` }}
                />
              </div>
              <span className={`text-xs font-medium ${getStockTextColor(capacityPct)}`}>
                {capacityPct}%
              </span>
            </div>
          )}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            {getRelativeTime(request.created_at)}
          </div>
        </div>

        {/* Requested by + Trip info */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <User className="w-3.5 h-3.5" />
          <span>{request.requester?.full_name || 'Unknown'}</span>
          {request.trips && (
            <>
              <span className="text-gray-300">•</span>
              <span>{request.trips.trip_number}</span>
            </>
          )}
          {request.acceptor && !request.trips && (
            <>
              <span className="text-gray-300">•</span>
              <Truck className="w-3.5 h-3.5" />
              <span>{request.acceptor.full_name}</span>
            </>
          )}
        </div>

        {/* Actions (for drivers or manager actions) */}
        {(isDriver || showManagerActions) && (
          <div className="flex items-center gap-2">
            <div className="flex-1">
              {showManagerActions ? renderManagerActions() : renderPrimaryAction()}
            </div>
            {hasSecondaryActions && !showManagerActions && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-9 h-9 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical className="w-5 h-5" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 bottom-full mb-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {canEdit && (
                      <button
                        onClick={() => { setShowMenu(false); onEdit(); }}
                        className="w-full px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit3 className="w-4 h-4" />
                        Edit
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => { setShowMenu(false); onCancel(); }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Desktop Table Row */}
      <div className={`hidden md:grid ${(isDriver || showManagerActions) ? 'grid-cols-[70px_1fr_65px_55px_120px_45px_90px_120px]' : 'grid-cols-[70px_1fr_65px_55px_120px_45px_90px]'} gap-2 px-4 ${rowPadding} items-center hover:bg-gray-50 transition-colors ${
        isUrgent && request.status === 'pending' ? 'bg-red-50/50' : ''
      }`}>
        {/* Request # */}
        <div>
          <span className="text-xs font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
            {getShortRequestId(request.id)}
          </span>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded flex items-center justify-center flex-shrink-0 ${
            isOwner ? 'bg-emerald-100' : 'bg-gray-100'
          }`}>
            <Store className={`w-3 h-3 ${isOwner ? 'text-emerald-600' : 'text-gray-400'}`} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium text-gray-900 truncate">
                {request.location?.name || 'Unknown'}
              </span>
              {isUrgent && request.status === 'pending' && (
                <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />
              )}
            </div>
            {/* Trip info inline - compact */}
            {request.trips && (
              <span className="text-[10px] text-gray-400">
                {request.trips.trip_number} • {request.trips.status}
              </span>
            )}
            {request.acceptor && !request.trips && (
              <span className="text-[10px] text-gray-400">
                <Truck className="w-2.5 h-2.5 inline mr-0.5" />
                {request.acceptor.full_name}
              </span>
            )}
          </div>
        </div>

        {/* Quantity - right aligned, more readable */}
        <div className="text-right pr-1">
          <span className="text-sm font-bold tabular-nums text-gray-900">{request.quantity_bags}</span>
          <span className="text-[10px] text-gray-400 block -mt-0.5">bags</span>
        </div>

        {/* Stock - as metric with mini progress bar */}
        <div className="flex flex-col items-center">
          {capacityPct !== null ? (
            <>
              <div className="w-10 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${getStockColor(capacityPct)}`}
                  style={{ width: `${Math.min(capacityPct, 100)}%` }}
                />
              </div>
              <span className={`text-[10px] font-medium mt-0.5 ${getStockTextColor(capacityPct)}`}>
                {capacityPct}%
              </span>
            </>
          ) : (
            <span className="text-xs text-gray-300">—</span>
          )}
        </div>

        {/* Requested By */}
        <div className="min-w-0">
          <div className="flex items-center gap-1 text-xs text-gray-600 truncate">
            <User className="w-3 h-3 text-gray-400 flex-shrink-0" />
            <span className="truncate">{request.requester?.full_name || 'Unknown'}</span>
          </div>
        </div>

        {/* Age - centered */}
        <div className="text-center">
          <span className="text-xs text-gray-500 flex items-center justify-center gap-0.5">
            <Clock className="w-3 h-3" />
            {getRelativeTime(request.created_at)}
          </span>
        </div>

        {/* Status - centered chip with border */}
        <div className="flex justify-center">
          <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
            {statusConfig.label}
          </span>
        </div>

        {/* Actions - right aligned (for drivers or manager actions) */}
        {(isDriver || showManagerActions) && (
          <div className="flex items-center justify-end gap-1.5">
            {showManagerActions ? renderManagerActions() : renderPrimaryAction()}

            {hasSecondaryActions && !showManagerActions && (
              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setShowMenu(!showMenu)}
                  className="w-7 h-7 rounded hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>

                {showMenu && (
                  <div className="absolute right-0 top-full mt-1 w-32 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                    {canEdit && (
                      <button
                        onClick={() => { setShowMenu(false); onEdit(); }}
                        className="w-full px-3 py-1.5 text-left text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit
                      </button>
                    )}
                    {canCancel && (
                      <button
                        onClick={() => { setShowMenu(false); onCancel(); }}
                        className="w-full px-3 py-1.5 text-left text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
                      >
                        <XCircle className="w-3 h-3" />
                        Cancel
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function FulfillRemainingModal({
  request,
  vehicles,
  suppliers,
  onClose,
  onSuccess,
}: {
  request: StockRequest;
  vehicles: Vehicle[];
  suppliers: Supplier[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (data: any) => stockRequestsApi.fulfillRemaining(request.id, data),
    onSuccess,
    onError: (err: any) => setError(err.response?.data?.detail || 'Failed to create trip'),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return setError('Please select a vehicle');
    if (!supplierId) return setError('Please select a supplier');
    setError(null);
    mutation.mutate({
      vehicle_id: vehicleId,
      supplier_id: supplierId,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/50 z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Fulfill Remaining</h2>
              <p className="text-xs text-gray-500">{request.location?.name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="p-3 bg-orange-50 rounded-xl text-sm">
              <p className="font-medium text-orange-800">Partial Delivery</p>
              <p className="text-orange-600 text-xs mt-0.5">
                Original: {request.quantity_bags} bags - remaining will be calculated
              </p>
            </div>

            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>{v.registration_number} - {v.make} {v.model}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Supplier *</label>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="">Select supplier...</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 resize-none text-sm"
                placeholder="Optional notes..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">Cancel</Button>
              <Button type="submit" disabled={mutation.isPending} className="flex-1 bg-orange-500 hover:bg-orange-600">
                {mutation.isPending ? 'Creating...' : 'Create Trip'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
