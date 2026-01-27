import { useState, useEffect } from 'react';
import { AlertCircle, AlertTriangle, Package } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { useUpdateLocationThresholds } from '../../hooks/useData';

interface Location {
  id: string;
  name: string;
  type: 'shop' | 'warehouse';
  critical_stock_threshold?: number;
  low_stock_threshold?: number;
}

interface EditThresholdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  location: Location | null;
}

export default function EditThresholdsModal({
  isOpen,
  onClose,
  onSuccess,
  location,
}: EditThresholdsModalProps) {
  const [criticalThreshold, setCriticalThreshold] = useState<number>(20);
  const [lowThreshold, setLowThreshold] = useState<number>(50);
  const [error, setError] = useState('');

  const updateMutation = useUpdateLocationThresholds();

  useEffect(() => {
    if (isOpen && location) {
      setCriticalThreshold(location.critical_stock_threshold || 20);
      setLowThreshold(location.low_stock_threshold || 50);
      setError('');
    }
  }, [isOpen, location]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!location) return;

    if (criticalThreshold >= lowThreshold) {
      setError('Critical threshold must be less than low stock threshold');
      return;
    }

    if (criticalThreshold < 0 || lowThreshold < 0) {
      setError('Thresholds cannot be negative');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        locationId: location.id,
        data: {
          critical_stock_threshold: criticalThreshold,
          low_stock_threshold: lowThreshold,
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to update thresholds');
    }
  };

  if (!location) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Edit Stock Thresholds">
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Location Info */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
            <Package className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <p className="font-medium text-gray-900">{location.name}</p>
            <p className="text-sm text-gray-500">
              {location.type === 'shop' ? 'Shop' : 'Warehouse'}
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Critical Stock Level (bags)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Below this level triggers critical alerts (red)
          </p>
          <Input
            type="number"
            min={0}
            max={1000}
            value={criticalThreshold}
            onChange={(e) => setCriticalThreshold(parseInt(e.target.value) || 0)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Low Stock Level (bags)
          </label>
          <p className="text-xs text-gray-500 mb-2">
            Below this level triggers low stock warnings (amber)
          </p>
          <Input
            type="number"
            min={0}
            max={2000}
            value={lowThreshold}
            onChange={(e) => setLowThreshold(parseInt(e.target.value) || 0)}
          />
        </div>

        {/* Preview of thresholds */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm">
          <p className="font-medium text-blue-800 mb-2">Threshold Preview:</p>
          <div className="space-y-1 text-blue-700">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-green-500" />
              <span>Healthy: {lowThreshold}+ bags</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-amber-500" />
              <span>Low Stock: {criticalThreshold} - {lowThreshold - 1} bags</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500" />
              <span>Critical: Below {criticalThreshold} bags</span>
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={updateMutation.isPending}
          >
            Save Thresholds
          </Button>
        </div>
      </form>
    </Modal>
  );
}
