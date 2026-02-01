import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';

interface CreateLoanModalProps {
  locations: { id: string; name: string; current_stock_bags?: number }[];
  onClose: () => void;
  onSubmit: (data: { lender_location_id: string; quantity_requested: number; estimated_return_date?: string; notes?: string }) => void;
  isSubmitting: boolean;
}

export default function CreateLoanModal({
  locations,
  onClose,
  onSubmit,
  isSubmitting,
}: CreateLoanModalProps) {
  const [lenderId, setLenderId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lenderId) return setError('Please select a shop to borrow from');
    if (!quantity || parseInt(quantity) <= 0) return setError('Please enter a valid quantity');

    // Validate return date only if provided
    if (returnDate) {
      const returnDateObj = new Date(returnDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (returnDateObj < today) return setError('Return date must be in the future');
    }

    setError(null);
    onSubmit({
      lender_location_id: lenderId,
      quantity_requested: parseInt(quantity),
      estimated_return_date: returnDate || undefined,
      notes: notes || undefined,
    });
  };

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
                    {loc.name}
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
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estimated Return Date (optional)</label>
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
