import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Clock, AlertTriangle, CheckCircle, XCircle, User, MapPin, Package } from 'lucide-react';
import { Button } from '../ui';
import { stockRequestsApi } from '../../lib/api';
import type { StockRequest } from '../../types';

interface ReviewProposalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: StockRequest;
}

// Map reason codes to human-readable text
const REASON_LABELS: Record<string, string> = {
  vehicle_issue: 'Vehicle broke down or needs repairs',
  another_urgent_request: 'Another urgent request took priority',
  route_conditions: 'Route conditions (weather/road issues)',
  schedule_conflict: 'Schedule conflict with existing commitments',
  other: 'Other reason',
};

export default function ReviewProposalModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: ReviewProposalModalProps) {
  const queryClient = useQueryClient();
  const [declineNotes, setDeclineNotes] = useState('');
  const [showDeclineForm, setShowDeclineForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successType, setSuccessType] = useState<'accepted' | 'declined' | null>(null);

  const acceptMutation = useMutation({
    mutationFn: () => stockRequestsApi.acceptProposal(request.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stock-requests', 'all'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-requests', 'my'] });
      setSuccessType('accepted');
      onSuccess();
      setTimeout(() => {
        setSuccessType(null);
        onClose();
      }, 2000);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to accept proposal. Please try again.');
    },
  });

  const declineMutation = useMutation({
    mutationFn: (notes?: string) => stockRequestsApi.declineProposal(request.id, { notes }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['stock-requests', 'all'] });
      await queryClient.invalidateQueries({ queryKey: ['stock-requests', 'my'] });
      setSuccessType('declined');
      onSuccess();
      setTimeout(() => {
        setSuccessType(null);
        onClose();
      }, 2000);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to decline proposal. Please try again.');
    },
  });

  const handleAccept = () => {
    setError(null);
    acceptMutation.mutate();
  };

  const handleDecline = () => {
    setError(null);
    declineMutation.mutate(declineNotes || undefined);
  };

  if (!isOpen) return null;

  // Success state
  if (successType) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              successType === 'accepted' ? 'bg-emerald-100' : 'bg-red-100'
            }`}>
              {successType === 'accepted' ? (
                <CheckCircle className="w-8 h-8 text-emerald-600" />
              ) : (
                <XCircle className="w-8 h-8 text-red-600" />
              )}
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {successType === 'accepted' ? 'Proposal Accepted!' : 'Proposal Declined'}
            </h2>
            <p className="text-gray-600 text-sm">
              {successType === 'accepted'
                ? 'The driver has been notified and can now create a trip.'
                : 'The request is now available for other drivers.'}
            </p>
          </div>
        </div>
      </>
    );
  }

  // Format times for display
  const requestedTimeDisplay = request.requested_delivery_time
    ? new Date(request.requested_delivery_time).toLocaleString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not specified';

  const proposedTimeDisplay = request.proposed_delivery_time
    ? new Date(request.proposed_delivery_time).toLocaleString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
    : 'Not specified';

  const reasonText = request.proposal_reason
    ? REASON_LABELS[request.proposal_reason] || request.proposal_reason
    : 'Not specified';

  return (
    <>
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" onClick={onClose} />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl w-full max-w-md shadow-xl max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="flex items-center justify-between p-5 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Review Time Proposal</h2>
                <p className="text-sm text-gray-500">Driver proposed a different time</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Request Info */}
          <div className="p-5 bg-gray-50 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Location</p>
                  <p className="font-medium text-gray-900">{request.location?.name}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Package className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Quantity</p>
                  <p className="font-medium text-gray-900">{request.quantity_bags} bags</p>
                </div>
              </div>
              <div className="flex items-start gap-2 col-span-2">
                <User className="w-4 h-4 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-gray-500">Driver</p>
                  <p className="font-medium text-gray-900">{request.acceptor?.full_name || 'Unknown'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Time Comparison */}
          <div className="p-5 border-b border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-center">
                <p className="text-xs text-red-600 font-medium mb-1">Your Request</p>
                <p className="text-sm font-semibold text-red-800">{requestedTimeDisplay}</p>
              </div>
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                <p className="text-xs text-emerald-600 font-medium mb-1">Driver's Proposal</p>
                <p className="text-sm font-semibold text-emerald-800">{proposedTimeDisplay}</p>
              </div>
            </div>
          </div>

          {/* Reason */}
          <div className="p-5 border-b border-gray-100">
            <p className="text-sm text-gray-500 mb-1">Reason for proposal</p>
            <p className="text-sm font-medium text-gray-900">{reasonText}</p>
          </div>

          {/* Error */}
          {error && (
            <div className="mx-5 mt-5 p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="p-5">
            {showDeclineForm ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Reason for declining (optional)
                  </label>
                  <textarea
                    value={declineNotes}
                    onChange={(e) => setDeclineNotes(e.target.value)}
                    rows={2}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                    placeholder="Let the driver know why you're declining..."
                  />
                </div>
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => setShowDeclineForm(false)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button
                    type="button"
                    onClick={handleDecline}
                    disabled={declineMutation.isPending}
                    className="flex-1 bg-red-600 hover:bg-red-700"
                  >
                    {declineMutation.isPending ? 'Declining...' : 'Confirm Decline'}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <Button
                  type="button"
                  onClick={handleAccept}
                  disabled={acceptMutation.isPending}
                  className="w-full bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {acceptMutation.isPending ? 'Accepting...' : `Accept ${proposedTimeDisplay}`}
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setShowDeclineForm(true)}
                  className="w-full border-red-200 text-red-600 hover:bg-red-50"
                >
                  <XCircle className="w-4 h-4 mr-2" />
                  Decline & Re-open Request
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
