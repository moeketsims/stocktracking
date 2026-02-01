import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Clock, AlertTriangle, Calendar, Truck, CheckCircle } from 'lucide-react';
import { Button } from '../ui';
import { stockRequestsApi } from '../../lib/api';
import type { StockRequest, ProposalReason } from '../../types';

// Helper to get today's date in YYYY-MM-DD format
const getTodayDate = () => {
  const today = new Date();
  return today.toISOString().split('T')[0];
};

// Helper to get tomorrow's date
const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

// Helper to get default time (9:00 AM)
const getDefaultTime = () => '09:00';

interface ProposeTimeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  request: StockRequest;
}

const REASON_OPTIONS: { value: ProposalReason; label: string; description: string }[] = [
  { value: 'vehicle_issue', label: 'Vehicle Issue', description: 'Vehicle broke down or needs repairs' },
  { value: 'another_urgent_request', label: 'Urgent Request', description: 'Another urgent request took priority' },
  { value: 'route_conditions', label: 'Route Conditions', description: 'Weather or road issues on the route' },
  { value: 'schedule_conflict', label: 'Schedule Conflict', description: 'Conflict with existing commitments' },
  { value: 'other', label: 'Other', description: 'Other reason (please specify in notes)' },
];

export default function ProposeTimeModal({
  isOpen,
  onClose,
  onSuccess,
  request,
}: ProposeTimeModalProps) {
  const queryClient = useQueryClient();
  const [proposedDate, setProposedDate] = useState(getTomorrowDate());
  const [proposedTime, setProposedTime] = useState(getDefaultTime());
  const [reason, setReason] = useState<ProposalReason>('schedule_conflict');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (data: { proposed_delivery_time: string; reason: string; notes?: string }) =>
      stockRequestsApi.proposeTime(request.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-requests'] });
      setSuccess(true);
      onSuccess();
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    },
    onError: (err: any) => {
      const detail = err.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Failed to submit proposal. Please try again.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposedDate || !proposedTime) {
      setError('Please select a date and time');
      return;
    }
    setError(null);

    // Combine date and time into ISO string
    const proposedDeliveryTime = new Date(`${proposedDate}T${proposedTime}:00`).toISOString();

    mutation.mutate({
      proposed_delivery_time: proposedDeliveryTime,
      reason,
      notes: notes || undefined,
    });
  };

  if (!isOpen) return null;

  // Success state
  if (success) {
    return (
      <>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50" />
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-8 text-center animate-in fade-in zoom-in duration-300">
            <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-emerald-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Proposal Submitted!
            </h2>
            <p className="text-gray-600 text-sm">
              The store manager will review your proposed delivery time.
            </p>
          </div>
        </div>
      </>
    );
  }

  // Format the original requested time
  const requestedTimeDisplay = request.requested_delivery_time
    ? new Date(request.requested_delivery_time).toLocaleString('en-ZA', {
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
      })
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
                <h2 className="text-lg font-semibold text-gray-900">Propose Different Time</h2>
                <p className="text-sm text-gray-500">{request.location?.name}</p>
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
          <div className="p-5 bg-blue-50 border-b border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Truck className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Original Request</span>
            </div>
            <div className="space-y-1 text-sm text-blue-700">
              <p><strong>Quantity:</strong> {request.quantity_bags} bags</p>
              <p><strong>Requested Delivery:</strong> {requestedTimeDisplay}</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-5 space-y-5">
            {error && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {error}
              </div>
            )}

            {/* Proposed Time */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  When can you deliver? *
                </div>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Date</label>
                  <input
                    type="date"
                    value={proposedDate}
                    onChange={(e) => setProposedDate(e.target.value)}
                    min={getTodayDate()}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Time</label>
                  <input
                    type="time"
                    value={proposedTime}
                    onChange={(e) => setProposedTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Reason Selection */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Why can't you deliver at the requested time? *
              </label>
              <div className="space-y-2">
                {REASON_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setReason(option.value)}
                    className={`w-full p-3 rounded-xl border-2 text-left transition-all ${
                      reason === option.value
                        ? 'border-amber-500 bg-amber-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className={`font-medium ${reason === option.value ? 'text-amber-700' : 'text-gray-700'}`}>
                      {option.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-0.5">{option.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Details (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                placeholder="Any additional context for the manager..."
              />
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={onClose}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={mutation.isPending}
                className="flex-1 bg-amber-600 hover:bg-amber-700"
              >
                {mutation.isPending ? 'Submitting...' : 'Submit Proposal'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
