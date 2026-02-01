import { X, User } from 'lucide-react';
import { Button } from '../ui';
import type { Loan } from '../../types';
import { LOAN_STATUS_CONFIG } from '../../constants/loan';

interface LoanDetailsModalProps {
  loan: Loan;
  onClose: () => void;
  onNavigateToTrip?: (tripId: string) => void;
}

export default function LoanDetailsModal({
  loan,
  onClose,
  onNavigateToTrip,
}: LoanDetailsModalProps) {
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
