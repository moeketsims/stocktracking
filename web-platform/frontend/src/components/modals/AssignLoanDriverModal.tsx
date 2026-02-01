import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '../ui';
import type { Loan, Vehicle, Driver } from '../../types';

interface AssignLoanDriverModalProps {
  loan: Loan;
  type: 'pickup' | 'return';
  vehicles: Vehicle[];
  drivers: Driver[];
  onClose: () => void;
  onSubmit: (data: { driver_id: string; vehicle_id?: string; notes?: string }) => void;
  isSubmitting: boolean;
}

export default function AssignLoanDriverModal({
  loan,
  type,
  vehicles,
  drivers,
  onClose,
  onSubmit,
  isSubmitting,
}: AssignLoanDriverModalProps) {
  const [vehicleId, setVehicleId] = useState('');
  const [driverId, setDriverId] = useState('');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  const availableVehicles = vehicles.filter(v => v.is_active && (v.is_available !== false));
  const isPickup = type === 'pickup';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Driver is always required
    if (!driverId) return setError('Please select a driver');
    // Vehicle is only required for return, not for pickup (driver selects when accepting)
    if (!isPickup && !vehicleId) return setError('Please select a vehicle');
    setError(null);
    onSubmit({
      driver_id: driverId,
      vehicle_id: vehicleId || undefined,
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
              <h2 className="text-lg font-semibold text-gray-900">
                Assign {isPickup ? 'Pickup' : 'Return'} Driver
              </h2>
              <p className="text-xs text-gray-500">
                {loan.quantity_approved || loan.quantity_requested} bags{' '}
                {isPickup ? `from ${loan.lender_location?.name}` : `to ${loan.lender_location?.name}`}
              </p>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Driver *</label>
              <select
                value={driverId}
                onChange={(e) => setDriverId(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">Select a driver...</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.full_name}
                  </option>
                ))}
              </select>
              {isPickup && (
                <p className="text-xs text-gray-500 mt-1">Driver will select vehicle when accepting</p>
              )}
            </div>

            {/* Vehicle selection - only shown for return, not pickup */}
            {!isPickup && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Vehicle *</label>
                <select
                  value={vehicleId}
                  onChange={(e) => setVehicleId(e.target.value)}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">Select a vehicle...</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} - {v.make} {v.model}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Notes (optional)</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500 resize-none text-sm"
                placeholder="Any special instructions..."
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" onClick={onClose} className="flex-1">
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {isSubmitting ? 'Assigning...' : 'Assign'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
