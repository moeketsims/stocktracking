import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Package,
  Clock,
  AlertTriangle,
  Check,
  RefreshCw,
  Filter,
  X,
  ArrowLeftRight,
  ArrowDownLeft,
  ArrowUpRight,
  Plus,
  Store,
  Calendar,
  User,
  Truck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Eye,
} from 'lucide-react';
import { Button } from '../components/ui';
import { loansApi, vehiclesApi, driversApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';
import type { Loan, LoanStatus, Vehicle, Driver } from '../types';

// Status configuration for loan badges
const LOAN_STATUS_CONFIG: Record<LoanStatus | 'pickup_pending' | 'collected', { label: string; bgColor: string; color: string; borderColor: string }> = {
  pending: { label: 'Pending', bgColor: 'bg-amber-50', color: 'text-amber-700', borderColor: 'border-amber-200' },
  accepted: { label: 'Accepted', bgColor: 'bg-blue-50', color: 'text-blue-700', borderColor: 'border-blue-200' },
  rejected: { label: 'Rejected', bgColor: 'bg-red-50', color: 'text-red-700', borderColor: 'border-red-200' },
  confirmed: { label: 'Confirmed', bgColor: 'bg-purple-50', color: 'text-purple-700', borderColor: 'border-purple-200' },
  pickup_pending: { label: 'Pending', bgColor: 'bg-orange-50', color: 'text-orange-700', borderColor: 'border-orange-200' },
  in_transit: { label: 'In Transit', bgColor: 'bg-indigo-50', color: 'text-indigo-700', borderColor: 'border-indigo-200' },
  collected: { label: 'Collected', bgColor: 'bg-teal-50', color: 'text-teal-700', borderColor: 'border-teal-200' },
  active: { label: 'Received', bgColor: 'bg-emerald-50', color: 'text-emerald-700', borderColor: 'border-emerald-200' },
  return_in_transit: { label: 'Return In Transit', bgColor: 'bg-cyan-50', color: 'text-cyan-700', borderColor: 'border-cyan-200' },
  completed: { label: 'Completed', bgColor: 'bg-gray-50', color: 'text-gray-600', borderColor: 'border-gray-200' },
  overdue: { label: 'Overdue', bgColor: 'bg-red-100', color: 'text-red-800', borderColor: 'border-red-300' },
};

type TabFilter = 'borrowed' | 'lent' | 'requests' | 'all';
type StatusFilter = 'all' | 'active' | 'pending' | 'completed';

interface LoansPageProps {
  onNavigateToTrip?: (tripId: string) => void;
}

export default function LoansPage({ onNavigateToTrip }: LoansPageProps) {
  const queryClient = useQueryClient();
  const { user, isManager } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabFilter>('borrowed');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('active');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAssignDriverModal, setShowAssignDriverModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [assignDriverType, setAssignDriverType] = useState<'pickup' | 'return'>('pickup');

  // Success/error toasts
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const userLocationId = user?.location_id;

  // Fetch loans
  const { data: loansData, isLoading, refetch } = useQuery({
    queryKey: ['loans', activeTab, statusFilter],
    queryFn: () => {
      const params: any = { limit: 100 };

      // Tab-specific filtering
      if (activeTab === 'borrowed') {
        params.as_borrower = true;
        // Borrowed shows loans once they're accepted (borrower needs to confirm or it's in progress)
        params.status = 'accepted,confirmed,in_transit,active,overdue,return_in_transit,completed';
      } else if (activeTab === 'lent') {
        params.as_lender = true;
        // Lent out shows loans once accepted by lender (they've agreed to lend)
        params.status = 'accepted,confirmed,in_transit,active,overdue,return_in_transit,completed';
      } else if (activeTab === 'requests') {
        // Requests tab shows only PENDING requests (waiting for decision)
        // Once accepted, it moves to Borrowed/Lent Out tabs
        params.status = 'pending';
      } else {
        // All tab - apply status filter
        if (statusFilter !== 'all') {
          if (statusFilter === 'active') {
            params.status = 'active,in_transit,return_in_transit,overdue';
          } else if (statusFilter === 'pending') {
            params.status = 'pending,accepted,confirmed';
          } else if (statusFilter === 'completed') {
            params.status = 'completed,rejected';
          }
        }
      }
      return loansApi.list(params).then(r => r.data);
    },
    refetchInterval: 30000,
  });

  // Fetch pending count for badge
  const { data: pendingCountData } = useQuery({
    queryKey: ['loans-pending-count'],
    queryFn: () => loansApi.getPendingCount().then(r => r.data),
    refetchInterval: 30000,
  });

  // Fetch other locations for creating loans
  const { data: otherLocationsData } = useQuery({
    queryKey: ['loans-other-locations'],
    queryFn: () => loansApi.getOtherLocations().then(r => r.data),
    enabled: showCreateModal,
  });

  // Fetch vehicles for driver assignment
  const { data: vehiclesData } = useQuery({
    queryKey: ['vehicles', 'active'],
    queryFn: () => vehiclesApi.list(true, true).then(r => r.data),
    enabled: showAssignDriverModal,
  });

  // Fetch drivers for assignment
  const { data: driversData } = useQuery({
    queryKey: ['drivers', 'active'],
    queryFn: () => driversApi.list(true).then(r => r.data),
    enabled: showAssignDriverModal,
  });

  const loans = loansData?.loans || [];
  // Badge counts for each tab
  const requestsCount = (pendingCountData?.incoming_pending || 0) + (pendingCountData?.outgoing_pending || 0);
  const lentOutNewCount = pendingCountData?.lent_out_new || 0;
  const borrowedNewCount = pendingCountData?.borrowed_new || 0;

  // Count loans by tab
  const borrowedCount = useMemo(() => {
    if (activeTab === 'borrowed') return loans.length;
    return 0;
  }, [loans, activeTab]);

  const lentCount = useMemo(() => {
    if (activeTab === 'lent') return loans.length;
    return 0;
  }, [loans, activeTab]);

  // Mutations
  const createLoanMutation = useMutation({
    mutationFn: (data: { lender_location_id: string; quantity_requested: number; estimated_return_date: string; notes?: string }) =>
      loansApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans-pending-count'] });
      setShowCreateModal(false);
      setActiveTab('requests'); // Switch to Requests tab to see the new request
      setSuccessMessage('Your loan request has been submitted! The shop manager will review it and get back to you shortly.');
      setTimeout(() => setSuccessMessage(null), 5000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to create loan request');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const acceptLoanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { quantity_approved: number; notes?: string } }) =>
      loansApi.accept(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans-pending-count'] });
      setShowAcceptModal(false);
      setSelectedLoan(null);
      setSuccessMessage('Loan request accepted');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to accept loan');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const rejectLoanMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      loansApi.reject(id, { reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans-pending-count'] });
      setShowRejectModal(false);
      setSelectedLoan(null);
      setSuccessMessage('Loan request rejected');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to reject loan');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const confirmLoanMutation = useMutation({
    mutationFn: (id: string) => loansApi.confirm(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      queryClient.invalidateQueries({ queryKey: ['loans-pending-count'] });
      setSuccessMessage('Loan confirmed, ready for pickup');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to confirm loan');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const assignPickupMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { driver_id?: string; vehicle_id: string; notes?: string } }) =>
      loansApi.assignPickup(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowAssignDriverModal(false);
      setSelectedLoan(null);
      setSuccessMessage('Pickup driver assigned');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to assign pickup');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const confirmPickupMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      loansApi.confirmPickup(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setSuccessMessage('Pickup confirmed, loan is now active');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to confirm pickup');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const initiateReturnMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      loansApi.initiateReturn(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setSuccessMessage('Return initiated');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to initiate return');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const assignReturnMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: { driver_id?: string; vehicle_id: string; notes?: string } }) =>
      loansApi.assignReturn(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setShowAssignDriverModal(false);
      setSelectedLoan(null);
      setSuccessMessage('Return driver assigned');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to assign return');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const confirmReturnMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      loansApi.confirmReturn(id, { notes }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['loans'] });
      setSuccessMessage('Loan completed');
      setTimeout(() => setSuccessMessage(null), 3000);
    },
    onError: (err: any) => {
      setErrorMessage(err.response?.data?.detail || 'Failed to confirm return');
      setTimeout(() => setErrorMessage(null), 5000);
    },
  });

  const getRelativeTime = (dateStr: string): string => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatDate = (dateStr: string): string => {
    return new Date(dateStr).toLocaleDateString('en-ZA', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const getDaysUntilReturn = (dateStr: string): { days: number; isOverdue: boolean } => {
    const returnDate = new Date(dateStr);
    const now = new Date();
    const diffMs = returnDate.getTime() - now.getTime();
    const days = Math.ceil(diffMs / 86400000);
    return { days, isOverdue: days < 0 };
  };

  // Check if user can perform actions
  const isBorrower = (loan: Loan) => loan.borrower_location_id === userLocationId;
  const isLender = (loan: Loan) => loan.lender_location_id === userLocationId;

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 bg-gray-200 rounded-lg animate-pulse" />
          <div className="h-9 w-28 bg-gray-200 rounded-lg animate-pulse" />
        </div>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success/Error Toasts */}
      {successMessage && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-emerald-600" />
          </div>
          <span className="text-sm text-emerald-800">{successMessage}</span>
        </div>
      )}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <span className="text-sm text-red-800">{errorMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Stock Loans</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            Borrow and lend stock between shops
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="gap-1.5 h-8"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => refetch()}
            className="gap-1.5 h-8"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
          {isManager() && (
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="gap-1.5 h-8 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Request Loan
            </Button>
          )}
        </div>
      </div>

      {/* Filter Panel */}
      {showFilters && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Filters</h3>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-600 mb-1">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-2.5 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="all">All</option>
                <option value="active">Active Loans</option>
                <option value="pending">Pending/Processing</option>
                <option value="completed">Completed/Rejected</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex items-center gap-1.5 bg-gray-100 p-1 rounded-xl w-fit overflow-x-auto">
        <button
          onClick={() => setActiveTab('requests')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'requests' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Clock className="w-3.5 h-3.5" />
          Requests
          {requestsCount > 0 && activeTab !== 'requests' && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-orange-100 text-orange-700 animate-pulse">
              {requestsCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('borrowed')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'borrowed' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowDownLeft className="w-3.5 h-3.5" />
          Borrowed
          {borrowedNewCount > 0 && activeTab !== 'borrowed' && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700 animate-pulse">
              {borrowedNewCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('lent')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'lent' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowUpRight className="w-3.5 h-3.5" />
          Lent Out
          {lentOutNewCount > 0 && activeTab !== 'lent' && (
            <span className="px-1.5 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-700 animate-pulse">
              {lentOutNewCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'all' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowLeftRight className="w-3.5 h-3.5" />
          All
        </button>
      </div>

      {/* Loans List */}
      {loans.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <Package className="w-10 h-10 mx-auto mb-3 text-gray-300" />
          <h3 className="text-sm font-medium text-gray-600">No loans found</h3>
          <p className="text-xs text-gray-400 mt-1">
            {activeTab === 'requests'
              ? 'No pending requests'
              : activeTab === 'borrowed'
              ? 'You have no borrowed stock'
              : activeTab === 'lent'
              ? 'You have no stock lent out'
              : 'No loan records'}
          </p>
          {isManager() && (activeTab === 'borrowed' || activeTab === 'requests') && (
            <Button
              size="sm"
              onClick={() => setShowCreateModal(true)}
              className="mt-4 gap-1.5 bg-emerald-600 hover:bg-emerald-700"
            >
              <Plus className="w-3.5 h-3.5" />
              Request a Loan
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {loans.map((loan) => (
            <LoanCard
              key={loan.id}
              loan={loan}
              isBorrower={isBorrower(loan)}
              isLender={isLender(loan)}
              activeTab={activeTab}
              getRelativeTime={getRelativeTime}
              formatDate={formatDate}
              getDaysUntilReturn={getDaysUntilReturn}
              onViewDetails={() => {
                setSelectedLoan(loan);
                setShowDetailsModal(true);
              }}
              onAccept={() => {
                setSelectedLoan(loan);
                setShowAcceptModal(true);
              }}
              onReject={() => {
                setSelectedLoan(loan);
                setShowRejectModal(true);
              }}
              onConfirm={() => confirmLoanMutation.mutate(loan.id)}
              onAssignPickup={() => {
                setSelectedLoan(loan);
                setAssignDriverType('pickup');
                setShowAssignDriverModal(true);
              }}
              onConfirmPickup={() => confirmPickupMutation.mutate({ id: loan.id })}
              onInitiateReturn={() => initiateReturnMutation.mutate({ id: loan.id })}
              onAssignReturn={() => {
                setSelectedLoan(loan);
                setAssignDriverType('return');
                setShowAssignDriverModal(true);
              }}
              onConfirmReturn={() => confirmReturnMutation.mutate({ id: loan.id })}
              onNavigateToTrip={onNavigateToTrip}
              isManager={isManager()}
              isConfirmPending={confirmLoanMutation.isPending}
            />
          ))}
        </div>
      )}

      {/* Modals */}
      {showCreateModal && (
        <CreateLoanModal
          locations={otherLocationsData?.locations || []}
          onClose={() => setShowCreateModal(false)}
          onSubmit={(data) => createLoanMutation.mutate(data)}
          isSubmitting={createLoanMutation.isPending}
        />
      )}

      {showAcceptModal && selectedLoan && (
        <AcceptLoanModal
          loan={selectedLoan}
          onClose={() => { setShowAcceptModal(false); setSelectedLoan(null); }}
          onSubmit={(data) => acceptLoanMutation.mutate({ id: selectedLoan.id, data })}
          isSubmitting={acceptLoanMutation.isPending}
        />
      )}

      {showRejectModal && selectedLoan && (
        <RejectLoanModal
          loan={selectedLoan}
          onClose={() => { setShowRejectModal(false); setSelectedLoan(null); }}
          onSubmit={(reason) => rejectLoanMutation.mutate({ id: selectedLoan.id, reason })}
          isSubmitting={rejectLoanMutation.isPending}
        />
      )}

      {showAssignDriverModal && selectedLoan && (
        <AssignDriverModal
          loan={selectedLoan}
          type={assignDriverType}
          vehicles={vehiclesData?.vehicles || []}
          drivers={driversData?.drivers || []}
          onClose={() => { setShowAssignDriverModal(false); setSelectedLoan(null); }}
          onSubmit={(data) => {
            if (assignDriverType === 'pickup') {
              assignPickupMutation.mutate({ id: selectedLoan.id, data });
            } else {
              assignReturnMutation.mutate({ id: selectedLoan.id, data });
            }
          }}
          isSubmitting={assignPickupMutation.isPending || assignReturnMutation.isPending}
        />
      )}

      {showDetailsModal && selectedLoan && (
        <LoanDetailsModal
          loan={selectedLoan}
          onClose={() => { setShowDetailsModal(false); setSelectedLoan(null); }}
          onNavigateToTrip={onNavigateToTrip}
        />
      )}
    </div>
  );
}

// Loan Card Component
function LoanCard({
  loan,
  isBorrower,
  isLender,
  activeTab,
  getRelativeTime,
  formatDate,
  getDaysUntilReturn,
  onViewDetails,
  onAccept,
  onReject,
  onConfirm,
  onAssignPickup,
  onConfirmPickup,
  onInitiateReturn,
  onAssignReturn,
  onConfirmReturn,
  onNavigateToTrip,
  isManager,
  isConfirmPending,
}: {
  loan: Loan;
  isBorrower: boolean;
  isLender: boolean;
  activeTab: TabFilter;
  getRelativeTime: (date: string) => string;
  formatDate: (date: string) => string;
  getDaysUntilReturn: (date: string) => { days: number; isOverdue: boolean };
  onViewDetails: () => void;
  onAccept: () => void;
  onReject: () => void;
  onConfirm: () => void;
  onAssignPickup: () => void;
  onConfirmPickup: () => void;
  onInitiateReturn: () => void;
  onAssignReturn: () => void;
  onConfirmReturn: () => void;
  onNavigateToTrip?: (tripId: string) => void;
  isManager: boolean;
  isConfirmPending?: boolean;
}) {
  // Status badge always shows the actual loan status
  const statusConfig = LOAN_STATUS_CONFIG[loan.status as keyof typeof LOAN_STATUS_CONFIG];
  const returnInfo = getDaysUntilReturn(loan.estimated_return_date);
  const quantity = loan.quantity_approved || loan.quantity_requested;

  // Check pickup progress for the action area (replaces "Assign Pickup" button)
  const hasPickupAssigned = loan.status === 'confirmed' && loan.pickup_trip_id;

  // Determine which shop to show based on perspective
  const otherShop = isBorrower ? loan.lender_location : loan.borrower_location;
  const directionLabel = isBorrower ? 'from' : 'to';
  const directionIcon = isBorrower ? <ArrowDownLeft className="w-3.5 h-3.5 text-blue-500" /> : <ArrowUpRight className="w-3.5 h-3.5 text-orange-500" />;

  // Determine available actions
  const renderActions = () => {
    // Lender actions
    if (isLender) {
      if (loan.status === 'pending') {
        return (
          <div className="flex items-center gap-2">
            <Button size="sm" onClick={onAccept} className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-3">
              <Check className="w-3 h-3 mr-1" /> Accept
            </Button>
            <Button size="sm" variant="secondary" onClick={onReject} className="h-7 text-xs px-3 text-red-600 hover:bg-red-50">
              <XCircle className="w-3 h-3 mr-1" /> Reject
            </Button>
          </div>
        );
      }
      // When driver is on the way, lender sees "In Transit" status
      if (loan.status === 'in_transit') {
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">Driver En Route</span>
          </div>
        );
      }
      // When loan is "collected", lender has already confirmed - show status
      if (loan.status === 'collected') {
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-teal-50 border border-teal-200 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-xs font-medium text-teal-700">Stock Released</span>
          </div>
        );
      }
      // When loan is "active", show "Received" status for lender too
      if (loan.status === 'active') {
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="text-xs font-medium text-emerald-700">Received by Borrower</span>
          </div>
        );
      }
      if (loan.status === 'return_in_transit' && isManager) {
        return (
          <Button size="sm" onClick={onConfirmReturn} className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-3">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm Return
          </Button>
        );
      }
    }

    // Borrower actions
    if (isBorrower) {
      if (loan.status === 'accepted') {
        return (
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={onConfirm}
              disabled={isConfirmPending}
              className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-3 disabled:opacity-50"
            >
              <Check className="w-3 h-3 mr-1" /> {isConfirmPending ? 'Confirming...' : 'Confirm'}
            </Button>
            <Button size="sm" variant="secondary" onClick={onReject} disabled={isConfirmPending} className="h-7 text-xs px-3 text-red-600 hover:bg-red-50">
              Reject Counter
            </Button>
          </div>
        );
      }
      // Check if pickup is assigned but driver hasn't accepted yet
      if (loan.status === 'confirmed' && loan.pickup_trip_id) {
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
            <Clock className="w-3.5 h-3.5 text-orange-600 animate-pulse" />
            <span className="text-xs font-medium text-orange-700">Awaiting Driver</span>
          </div>
        );
      }
      if (loan.status === 'confirmed' && isManager && !loan.pickup_trip_id) {
        return (
          <Button size="sm" onClick={onAssignPickup} className="bg-blue-600 hover:bg-blue-700 h-7 text-xs px-3">
            <Truck className="w-3 h-3 mr-1" /> Assign Pickup
          </Button>
        );
      }
      // When driver has accepted and is in transit, show "In Transit" status
      if (loan.status === 'in_transit') {
        return (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 border border-indigo-200 rounded-lg">
            <Truck className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-xs font-medium text-indigo-700">In Transit</span>
          </div>
        );
      }
      // When lender has confirmed collection, borrower can confirm receipt
      if (loan.status === 'collected' && isManager) {
        return (
          <Button size="sm" onClick={onConfirmPickup} className="bg-emerald-600 hover:bg-emerald-700 h-7 text-xs px-3">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Confirm Receipt
          </Button>
        );
      }
      if ((loan.status === 'active' || loan.status === 'overdue') && isManager) {
        return (
          <Button size="sm" onClick={onInitiateReturn} className="bg-orange-500 hover:bg-orange-600 h-7 text-xs px-3">
            <RotateCcw className="w-3 h-3 mr-1" /> Start Return
          </Button>
        );
      }
    }

    // View details for completed/other states
    return (
      <Button size="sm" variant="secondary" onClick={onViewDetails} className="h-7 text-xs px-3">
        <Eye className="w-3 h-3 mr-1" /> Details
      </Button>
    );
  };

  return (
    <div className={`bg-white rounded-xl border ${loan.status === 'overdue' ? 'border-red-300' : 'border-gray-200'} p-4 hover:shadow-sm transition-shadow`}>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left side - Main info */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
            isBorrower ? 'bg-blue-100' : 'bg-orange-100'
          }`}>
            {directionIcon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-gray-900">{quantity} bags</span>
              <span className="text-gray-400">{directionLabel}</span>
              <span className="font-medium text-gray-700 truncate">{otherShop?.name || 'Unknown'}</span>
              <span className={`px-2 py-0.5 rounded border text-[11px] font-semibold ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                {statusConfig.label}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500 flex-wrap">
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" />
                {loan.requester?.full_name || 'Unknown'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {getRelativeTime(loan.created_at)}
              </span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                Return: {formatDate(loan.estimated_return_date)}
                {loan.status === 'active' || loan.status === 'overdue' ? (
                  <span className={`ml-1 ${returnInfo.isOverdue ? 'text-red-600 font-medium' : returnInfo.days <= 3 ? 'text-amber-600' : 'text-gray-500'}`}>
                    ({returnInfo.isOverdue ? `${Math.abs(returnInfo.days)}d overdue` : `${returnInfo.days}d left`})
                  </span>
                ) : null}
              </span>
            </div>
            {loan.notes && (
              <p className="mt-1.5 text-xs text-gray-500 truncate">Note: {loan.notes}</p>
            )}
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {renderActions()}
        </div>
      </div>
    </div>
  );
}

// Create Loan Modal
function CreateLoanModal({
  locations,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  locations: { id: string; name: string; current_stock_bags?: number }[];
  onClose: () => void;
  onSubmit: (data: { lender_location_id: string; quantity_requested: number; estimated_return_date: string; notes?: string }) => void;
  isSubmitting: boolean;
}) {
  const [lenderId, setLenderId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const selectedLender = locations.find(l => l.id === lenderId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderId) return setError('Please select a shop to borrow from');
    if (!quantity || parseInt(quantity) <= 0) return setError('Please enter a valid quantity');
    if (!returnDate) return setError('Please select an estimated return date');

    const returnDateObj = new Date(returnDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (returnDateObj < today) return setError('Return date must be in the future');

    setError(null);
    onSubmit({
      lender_location_id: lenderId,
      quantity_requested: parseInt(quantity),
      estimated_return_date: returnDate,
      notes: notes || undefined,
    });
  };

  // Default return date to 7 days from now
  const defaultReturnDate = new Date();
  defaultReturnDate.setDate(defaultReturnDate.getDate() + 7);
  const minDate = new Date().toISOString().split('T')[0];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Request Stock Loan</h2>
              <p className="text-xs text-gray-500">Borrow stock from another shop</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Borrow From *</label>
              <select
                value={lenderId}
                onChange={(e) => setLenderId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a shop...</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name} {loc.current_stock_bags !== undefined ? `(${loc.current_stock_bags} bags available)` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Quantity (bags) *</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Enter number of bags"
              />
              {selectedLender?.current_stock_bags !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  {selectedLender.name} has {selectedLender.current_stock_bags} bags available
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Return Date *</label>
              <input
                type="date"
                value={returnDate}
                onChange={(e) => setReturnDate(e.target.value)}
                min={minDate}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                placeholder="Reason for loan, etc."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {isSubmitting ? 'Sending...' : 'Send Request'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Accept Loan Modal
function AcceptLoanModal({
  loan,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  loan: Loan;
  onClose: () => void;
  onSubmit: (data: { quantity_approved: number; notes?: string }) => void;
  isSubmitting: boolean;
}) {
  const [quantity, setQuantity] = useState(loan.quantity_requested.toString());
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = parseInt(quantity);
    if (!qty || qty <= 0) return setError('Please enter a valid quantity');
    if (qty > loan.quantity_requested) return setError('Cannot approve more than requested');

    setError(null);
    onSubmit({
      quantity_approved: qty,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Accept Loan Request</h2>
              <p className="text-xs text-gray-500">From {loan.borrower_location?.name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="p-3 bg-blue-50 rounded-xl">
              <p className="text-sm text-blue-800">
                <span className="font-semibold">{loan.borrower_location?.name}</span> requested{' '}
                <span className="font-bold">{loan.quantity_requested} bags</span>
              </p>
              <p className="text-xs text-blue-600 mt-1">
                Return by: {new Date(loan.estimated_return_date).toLocaleDateString()}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Quantity to Approve (bags) *
              </label>
              <input
                type="number"
                min="1"
                max={loan.quantity_requested}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                You can approve the full amount or a smaller quantity
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                placeholder="Any notes for the borrower..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700">
                {isSubmitting ? 'Accepting...' : 'Accept'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Reject Loan Modal
function RejectLoanModal({
  loan,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  loan: Loan;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}) {
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) return setError('Please provide a reason');
    setError(null);
    onSubmit(reason);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Reject Loan</h2>
              <p className="text-xs text-gray-500">{loan.quantity_requested} bags from {loan.borrower_location?.name}</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 resize-none text-sm"
                placeholder="Why are you rejecting this request?"
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-red-600 hover:bg-red-700 text-white">
                {isSubmitting ? 'Rejecting...' : 'Reject'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Assign Driver Modal
function AssignDriverModal({
  loan,
  type,
  vehicles,
  drivers,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  loan: Loan;
  type: 'pickup' | 'return';
  vehicles: Vehicle[];
  drivers: Driver[];
  onClose: () => void;
  onSubmit: (data: { driver_id?: string; vehicle_id: string; notes?: string }) => void;
  isSubmitting: boolean;
}) {
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableVehicles = vehicles.filter(v => v.is_active && (v.is_available !== false));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicleId) return setError('Please select a vehicle');
    setError(null);
    onSubmit({
      vehicle_id: vehicleId,
      driver_id: driverId || undefined,
      notes: notes || undefined,
    });
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
          <div className="flex items-center justify-between p-4 border-b border-gray-100">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Assign {type === 'pickup' ? 'Pickup' : 'Return'} Driver
              </h2>
              <p className="text-xs text-gray-500">
                {loan.quantity_approved || loan.quantity_requested} bags{' '}
                {type === 'pickup' ? `from ${loan.lender_location?.name}` : `to ${loan.lender_location?.name}`}
              </p>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle *</label>
              <select
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a vehicle...</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} - {v.make} {v.model}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Driver (optional)</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                placeholder="Any special instructions..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}

// Loan Details Modal
function LoanDetailsModal({
  loan,
  onClose,
  onNavigateToTrip,
}: {
  loan: Loan;
  onClose: () => void;
  onNavigateToTrip?: (tripId: string) => void;
}) {
  const statusConfig = LOAN_STATUS_CONFIG[loan.status];

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-xl max-h-[90vh] overflow-y-auto">
          <div className="flex items-center justify-between p-4 border-b border-gray-100 sticky top-0 bg-white">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Loan Details</h2>
              <span className={`px-2 py-0.5 rounded border text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.color} ${statusConfig.borderColor}`}>
                {statusConfig.label}
              </span>
            </div>
            <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center">
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Parties */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 font-medium">Borrower</p>
                <p className="text-sm font-semibold text-blue-900">{loan.borrower_location?.name}</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-xl">
                <p className="text-xs text-orange-600 font-medium">Lender</p>
                <p className="text-sm font-semibold text-orange-900">{loan.lender_location?.name}</p>
              </div>
            </div>

            {/* Quantity */}
            <div className="p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500">Requested</p>
                  <p className="text-lg font-bold text-gray-900">{loan.quantity_requested} bags</p>
                </div>
                {loan.quantity_approved && loan.quantity_approved !== loan.quantity_requested && (
                  <div>
                    <p className="text-xs text-gray-500">Approved</p>
                    <p className="text-lg font-bold text-emerald-600">{loan.quantity_approved} bags</p>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-xs text-gray-500">Created</p>
                <p className="text-gray-900">{new Date(loan.created_at).toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Est. Return</p>
                <p className="text-gray-900">{new Date(loan.estimated_return_date).toLocaleDateString()}</p>
              </div>
              {loan.actual_return_date && (
                <div>
                  <p className="text-xs text-gray-500">Actual Return</p>
                  <p className="text-gray-900">{new Date(loan.actual_return_date).toLocaleString()}</p>
                </div>
              )}
            </div>

            {/* People */}
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-400" />
                <span className="text-gray-500">Requested by:</span>
                <span className="text-gray-900">{loan.requester?.full_name || loan.requester?.email}</span>
              </div>
              {loan.approver && (
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-500">Approved by:</span>
                  <span className="text-gray-900">{loan.approver?.full_name || loan.approver?.email}</span>
                </div>
              )}
            </div>

            {/* Trips */}
            {(loan.pickup_trip_id || loan.return_trip_id) && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-gray-500 uppercase">Trips</p>
                {loan.pickup_trip_id && (
                  <button
                    onClick={() => {
                      onNavigateToTrip?.(loan.pickup_trip_id!);
                      onClose();
                    }}
                    className="w-full p-3 bg-indigo-50 rounded-xl text-left hover:bg-indigo-100 transition-colors"
                  >
                    <p className="text-xs text-indigo-600 font-medium">Pickup Trip</p>
                    <p className="text-sm font-semibold text-indigo-900">
                      {loan.pickup_trip?.trip_number || 'View Trip'}
                    </p>
                  </button>
                )}
                {loan.return_trip_id && (
                  <button
                    onClick={() => {
                      onNavigateToTrip?.(loan.return_trip_id!);
                      onClose();
                    }}
                    className="w-full p-3 bg-cyan-50 rounded-xl text-left hover:bg-cyan-100 transition-colors"
                  >
                    <p className="text-xs text-cyan-600 font-medium">Return Trip</p>
                    <p className="text-sm font-semibold text-cyan-900">
                      {loan.return_trip?.trip_number || 'View Trip'}
                    </p>
                  </button>
                )}
              </div>
            )}

            {/* Notes */}
            {loan.notes && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Notes</p>
                <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-xl">{loan.notes}</p>
              </div>
            )}

            {/* Rejection Reason */}
            {loan.rejection_reason && (
              <div>
                <p className="text-xs font-medium text-red-500 uppercase mb-1">Rejection Reason</p>
                <p className="text-sm text-red-700 bg-red-50 p-3 rounded-xl">{loan.rejection_reason}</p>
              </div>
            )}
          </div>

          <div className="p-4 border-t border-gray-100">
            <Button variant="secondary" onClick={onClose} className="w-full">
              Close
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
