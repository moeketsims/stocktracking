import { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, Fuel, DollarSign } from 'lucide-react';
import { Modal, Button, Input } from '../ui';
import { useCompleteTrip } from '../../hooks/useData';
import type { Trip, CompleteTripForm } from '../../types';

interface CompleteTripModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  trip: Trip | null;
}

export default function CompleteTripModal({
  isOpen,
  onClose,
  onSuccess,
  trip,
}: CompleteTripModalProps) {
  const [form, setForm] = useState<CompleteTripForm>({
    fuel_cost: 0,
    fuel_litres: undefined,
    toll_cost: 0,
    other_cost: 0,
    other_cost_description: '',
    odometer_start: undefined,
    odometer_end: undefined,
    notes: '',
  });
  const [error, setError] = useState('');

  const completeMutation = useCompleteTrip();

  useEffect(() => {
    if (isOpen && trip) {
      setForm({
        fuel_cost: trip.fuel_cost || 0,
        fuel_litres: trip.fuel_litres,
        toll_cost: trip.toll_cost || 0,
        other_cost: trip.other_cost || 0,
        other_cost_description: trip.other_cost_description || '',
        odometer_start: trip.odometer_start,
        odometer_end: trip.odometer_end,
        notes: trip.notes || '',
      });
      setError('');
    }
  }, [isOpen, trip]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!trip) return;

    if (form.fuel_cost < 0 || form.toll_cost < 0 || form.other_cost < 0) {
      setError('Costs cannot be negative');
      return;
    }

    try {
      await completeMutation.mutateAsync({ tripId: trip.id, data: form });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to complete trip');
    }
  };

  const totalCost = (form.fuel_cost || 0) + (form.toll_cost || 0) + (form.other_cost || 0);
  const distance = form.odometer_start && form.odometer_end
    ? form.odometer_end - form.odometer_start
    : null;

  if (!trip) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Complete Trip" size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {/* Trip Info */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-900">{trip.trip_number}</span>
            <span className="text-sm text-gray-500">{trip.vehicles?.registration_number}</span>
          </div>
          <p className="text-sm text-gray-600">Driver: {trip.driver_name}</p>
          {trip.origin_description && trip.destination_description && (
            <p className="text-sm text-gray-500">
              {trip.origin_description} → {trip.destination_description}
            </p>
          )}
        </div>

        {/* Cost Tracking Section */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <DollarSign className="w-4 h-4" />
            Trip Costs
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Fuel Cost (R) *"
              value={form.fuel_cost || ''}
              onChange={(e) => setForm({ ...form, fuel_cost: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
              placeholder="0.00"
            />
            <Input
              type="number"
              label="Fuel Litres"
              value={form.fuel_litres || ''}
              onChange={(e) => setForm({ ...form, fuel_litres: parseFloat(e.target.value) || undefined })}
              min={0}
              step={0.1}
              placeholder="Optional"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mt-3">
            <Input
              type="number"
              label="Toll Cost (R)"
              value={form.toll_cost || ''}
              onChange={(e) => setForm({ ...form, toll_cost: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
              placeholder="0.00"
            />
            <Input
              type="number"
              label="Other Costs (R)"
              value={form.other_cost || ''}
              onChange={(e) => setForm({ ...form, other_cost: parseFloat(e.target.value) || 0 })}
              min={0}
              step={0.01}
              placeholder="0.00"
            />
          </div>

          {form.other_cost > 0 && (
            <Input
              type="text"
              label="Other Costs Description"
              value={form.other_cost_description || ''}
              onChange={(e) => setForm({ ...form, other_cost_description: e.target.value })}
              placeholder="e.g., Parking fees, repairs..."
              className="mt-3"
            />
          )}
        </div>

        {/* Odometer Section */}
        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
            <Fuel className="w-4 h-4" />
            Distance Tracking (Optional)
          </h3>

          <div className="grid grid-cols-2 gap-4">
            <Input
              type="number"
              label="Odometer Start (km)"
              value={form.odometer_start || ''}
              onChange={(e) => setForm({ ...form, odometer_start: parseFloat(e.target.value) || undefined })}
              min={0}
              step={0.1}
              placeholder="Optional"
            />
            <Input
              type="number"
              label="Odometer End (km)"
              value={form.odometer_end || ''}
              onChange={(e) => setForm({ ...form, odometer_end: parseFloat(e.target.value) || undefined })}
              min={0}
              step={0.1}
              placeholder="Optional"
            />
          </div>

          {distance !== null && distance > 0 && (
            <p className="text-sm text-gray-500 mt-2">
              Distance: <span className="font-medium text-gray-900">{distance.toFixed(1)} km</span>
            </p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            className="block w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
            rows={2}
            value={form.notes || ''}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Additional notes..."
          />
        </div>

        {/* Total Cost Summary */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-green-800">Total Cost</span>
            <span className="text-xl font-bold text-green-900">R{totalCost.toFixed(2)}</span>
          </div>
          <div className="mt-2 text-xs text-green-700 space-x-3">
            <span>Fuel: R{(form.fuel_cost || 0).toFixed(2)}</span>
            <span>Tolls: R{(form.toll_cost || 0).toFixed(2)}</span>
            {form.other_cost > 0 && <span>Other: R{form.other_cost.toFixed(2)}</span>}
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            type="submit"
            className="flex-1"
            isLoading={completeMutation.isPending}
          >
            <CheckCircle className="w-4 h-4 mr-1" />
            Complete Trip
          </Button>
        </div>
      </form>
    </Modal>
  );
}
