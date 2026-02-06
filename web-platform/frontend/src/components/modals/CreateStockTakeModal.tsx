import { useState, useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal, Button } from '../ui';
import { useCreateStockTake } from '../../hooks/useData';
import { toast } from '../ui/Toast';

interface CreateStockTakeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (stockTakeId: string) => void;
}

export default function CreateStockTakeModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateStockTakeModalProps) {
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');
  const createMutation = useCreateStockTake();

  useEffect(() => {
    if (isOpen) {
      setNotes('');
      setError('');
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      const result = await createMutation.mutateAsync({
        notes: notes || undefined,
      });
      toast.success(`Stock take started with ${result.lines_created} item(s)`);
      onSuccess(result.stock_take_id);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start stock take');
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Start Stock Take">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 flex-shrink-0" />
            {error}
          </div>
        )}

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-800">
            This will create a stock take session for your location with all inventory items.
            You can then enter physical counts for each item and review variances.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes (Optional)
          </label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder:text-gray-400 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Reason for stock take, special instructions..."
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="submit" className="flex-1" isLoading={createMutation.isPending}>
            Start Stock Take
          </Button>
        </div>
      </form>
    </Modal>
  );
}
