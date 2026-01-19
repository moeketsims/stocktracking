import { useState, useEffect } from 'react';
import { X, Edit3 } from 'lucide-react';
import { stockRequestsApi } from '../../lib/api';
import type { StockRequest } from '../../types';

interface EditRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: StockRequest | null;
  onSuccess: () => void;
}

export function EditRequestModal({ isOpen, onClose, request, onSuccess }: EditRequestModalProps) {
  const [quantityBags, setQuantityBags] = useState<number>(0);
  const [urgency, setUrgency] = useState<'urgent' | 'normal'>('normal');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (request) {
      setQuantityBags(request.quantity_bags);
      setUrgency(request.urgency);
      setNotes(request.notes || '');
    }
  }, [request]);

  if (!isOpen || !request) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (quantityBags <= 0) {
      setError('Quantity must be greater than 0');
      return;
    }

    // Check if anything changed
    const hasChanges =
      quantityBags !== request.quantity_bags ||
      urgency !== request.urgency ||
      notes !== (request.notes || '');

    if (!hasChanges) {
      setError('No changes detected');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await stockRequestsApi.update(request.id, {
        quantity_bags: quantityBags !== request.quantity_bags ? quantityBags : undefined,
        urgency: urgency !== request.urgency ? urgency : undefined,
        notes: notes !== (request.notes || '') ? notes : undefined,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to update request');
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
            <div className="p-2 bg-blue-100 rounded-lg">
              <Edit3 className="w-6 h-6 text-blue-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Edit Request</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-sm text-gray-600">
              Editing request for <strong>{locationName}</strong>
            </p>
            {request.accepted_by && (
              <p className="text-sm text-amber-600 mt-2">
                This request has been accepted. The driver will be notified of changes.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Quantity (Bags)
            </label>
            <input
              type="number"
              value={quantityBags}
              onChange={(e) => setQuantityBags(Number(e.target.value))}
              min="1"
              max="10000"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
            <p className="text-xs text-gray-500 mt-1">
              Original: {request.quantity_bags} bags
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Urgency
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUrgency('normal')}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  urgency === 'normal'
                    ? 'border-blue-500 bg-blue-50 text-blue-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Normal
              </button>
              <button
                type="button"
                onClick={() => setUrgency('urgent')}
                className={`py-3 px-4 rounded-lg border-2 font-medium transition-all ${
                  urgency === 'urgent'
                    ? 'border-red-500 bg-red-50 text-red-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                Urgent
              </button>
            </div>
            {urgency !== request.urgency && (
              <p className="text-xs text-amber-600 mt-1">
                Changed from {request.urgency}. Escalation timing will be recalculated.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this request..."
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
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
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
