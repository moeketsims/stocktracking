import { useState } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { stockRequestsApi } from '../../lib/api';
import type { StockRequest } from '../../types';

interface CancelRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: StockRequest | null;
  onSuccess: () => void;
}

export function CancelRequestModal({ isOpen, onClose, request, onSuccess }: CancelRequestModalProps) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reason.trim()) {
      setError('Please provide a reason for cancellation');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await stockRequestsApi.cancel(request.id, reason.trim());
      setReason('');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to cancel request');
    } finally {
      setLoading(false);
    }
  };

  const locationName = typeof request.location === 'object' ? request.location?.name : 'Unknown';

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Cancel Request</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800">
              You are about to cancel the stock request for <strong>{request.quantity_bags} bags</strong> to{' '}
              <strong>{locationName}</strong>.
            </p>
            {request.accepted_by && (
              <p className="text-sm text-red-700 mt-2">
                This request has been accepted by a driver. They will be notified of the cancellation.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Cancellation Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Please explain why this request is being cancelled..."
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="flex space-x-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              Keep Request
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Cancelling...' : 'Cancel Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
