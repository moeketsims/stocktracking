import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';
import type { Loan } from '../../types';

interface AcceptLoanModalProps {
  loan: Loan;
  onClose: () => void;
  onSubmit: (data: { quantity_approved: number; notes?: string }) => void;
  isSubmitting: boolean;
}

export default function AcceptLoanModal({
  loan,
  onClose,
  onSubmit,
  isSubmitting,
}: AcceptLoanModalProps) {
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
