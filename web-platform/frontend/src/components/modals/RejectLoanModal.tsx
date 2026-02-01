import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';
import type { Loan } from '../../types';

interface RejectLoanModalProps {
  loan: Loan;
  onClose: () => void;
  onSubmit: (reason: string) => void;
  isSubmitting: boolean;
}

export default function RejectLoanModal({
  loan,
  onClose,
  onSubmit,
  isSubmitting,
}: RejectLoanModalProps) {
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
