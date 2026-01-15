import { useState, useCallback, useEffect, useMemo } from 'react';
import { Package, Scale, AlertCircle, CheckCircle, XCircle, Loader2, Truck } from 'lucide-react';
import { Card, Button, Badge } from '../ui';
import BarcodeScanner from './BarcodeScanner';
import ScanResultCard from './ScanResultCard';
import {
  useCreateScanSession,
  useScanSession,
  useRecordScan,
  useUpdateScanStatus,
  useBulkReceive,
  useCancelSession,
} from '../../hooks/useBarcode';
import type {
  ScanSession,
  ScanLogItem,
  QualityScore,
  Supplier,
  Trip,
  Location,
} from '../../types';

interface ScanSessionManagerProps {
  locationId: string;
  supplierId?: string;
  tripId?: string;
  onComplete?: (session: ScanSession) => void;
  onCancel?: () => void;
  suppliers?: Supplier[];
  trips?: Trip[];
  location?: Location;
}

export default function ScanSessionManager({
  locationId,
  supplierId,
  tripId,
  onComplete,
  onCancel,
  suppliers = [],
  trips = [],
  location,
}: ScanSessionManagerProps) {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState(supplierId || '');
  const [selectedTrip, setSelectedTrip] = useState(tripId || '');
  const [isScannerActive, setIsScannerActive] = useState(true);
  const [showReceiveForm, setShowReceiveForm] = useState(false);

  // Filter to in-progress trips only
  const availableTrips = useMemo(() =>
    trips.filter(t => t.status === 'in_progress'),
    [trips]
  );

  // Filter trips by selected supplier (if supplier has supplier_id on trip)
  const tripsForSupplier = useMemo(() => {
    if (!selectedSupplier) return availableTrips;
    // Show trips that match the supplier OR trips without a specific supplier
    return availableTrips.filter(t =>
      t.supplier_id === selectedSupplier || !t.supplier_id
    );
  }, [availableTrips, selectedSupplier]);

  // Auto-select trip when there's only one available for this supplier
  useEffect(() => {
    if (tripsForSupplier.length === 1 && !selectedTrip) {
      setSelectedTrip(tripsForSupplier[0].id);
    }
  }, [tripsForSupplier, selectedTrip]);

  // Receive form state
  const [qualityScore, setQualityScore] = useState<QualityScore>(1);
  const [expiryDate, setExpiryDate] = useState('');
  const [costPerUnit, setCostPerUnit] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');

  // Hooks
  const createSessionMutation = useCreateScanSession();
  const { data: session, isLoading: sessionLoading, refetch } = useScanSession(sessionId);
  const recordScanMutation = useRecordScan(sessionId || '');
  const updateStatusMutation = useUpdateScanStatus(sessionId || '');
  const bulkReceiveMutation = useBulkReceive(sessionId || '');
  const cancelSessionMutation = useCancelSession(sessionId || '');

  // Check if can start session (both supplier and trip required)
  const canStartSession = selectedSupplier && selectedTrip;

  // Start session when supplier and trip are selected
  const handleStartSession = useCallback(async () => {
    if (!selectedSupplier || !selectedTrip) return;

    try {
      const newSession = await createSessionMutation.mutateAsync({
        location_id: locationId,
        supplier_id: selectedSupplier,
        trip_id: selectedTrip,
        session_type: 'receive',
      });
      setSessionId(newSession.id);
    } catch (error) {
      console.error('Failed to start session:', error);
    }
  }, [locationId, selectedSupplier, selectedTrip, createSessionMutation]);

  // Handle barcode scan
  const handleScan = useCallback(async (barcode: string) => {
    if (!sessionId) return;

    try {
      await recordScanMutation.mutateAsync({ barcode });
      // Vibrate on mobile if supported
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
    } catch (error) {
      console.error('Failed to record scan:', error);
    }
  }, [sessionId, recordScanMutation]);

  // Handle status updates
  const handleConfirmScan = useCallback(async (scanId: string) => {
    try {
      await updateStatusMutation.mutateAsync({ scanId, status: 'confirmed' });
    } catch (error) {
      console.error('Failed to confirm scan:', error);
    }
  }, [updateStatusMutation]);

  const handleRejectScan = useCallback(async (scanId: string, reason: string) => {
    try {
      await updateStatusMutation.mutateAsync({ scanId, status: 'rejected', reason });
    } catch (error) {
      console.error('Failed to reject scan:', error);
    }
  }, [updateStatusMutation]);

  // Handle bulk receive
  const handleBulkReceive = useCallback(async () => {
    if (!sessionId) return;

    try {
      const result = await bulkReceiveMutation.mutateAsync({
        quality_score: qualityScore,
        expiry_date: expiryDate || undefined,
        cost_per_unit: costPerUnit ? parseFloat(costPerUnit) : undefined,
        delivery_note_number: deliveryNote || undefined,
      });
      onComplete?.(result);
    } catch (error) {
      console.error('Failed to bulk receive:', error);
    }
  }, [sessionId, qualityScore, expiryDate, costPerUnit, deliveryNote, bulkReceiveMutation, onComplete]);

  // Handle cancel
  const handleCancel = useCallback(async () => {
    if (sessionId) {
      try {
        await cancelSessionMutation.mutateAsync();
      } catch (error) {
        console.error('Failed to cancel session:', error);
      }
    }
    onCancel?.();
  }, [sessionId, cancelSessionMutation, onCancel]);

  // Calculate totals
  const scans = session?.scans || [];
  const pendingScans = scans.filter(s => s.status === 'pending' || s.status === 'confirmed');
  const confirmedScans = scans.filter(s => s.status === 'confirmed');
  const totalQuantity = pendingScans.reduce((sum, s) => sum + s.final_quantity_kg, 0);
  const totalBags = pendingScans.length;

  // Check if can receive
  const canReceive = pendingScans.length > 0;

  // If no session yet, show supplier and trip selection
  if (!sessionId) {
    const noTripsAvailable = availableTrips.length === 0;
    const selectedTripData = tripsForSupplier.find(t => t.id === selectedTrip);

    return (
      <div className="space-y-6">
        {/* Warning if no trips available */}
        {noTripsAvailable && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-amber-900">No Active Trips</h3>
                <p className="text-sm text-amber-700 mt-1">
                  You need an in-progress trip to receive stock. Start a trip first so we can track which delivery brought this stock.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">Start Scanning Session</h3>
          <p className="text-sm text-blue-700 mb-4">
            Select a supplier and the trip that delivered this stock. All scanned items will be linked to this delivery.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Supplier *
              </label>
              <select
                value={selectedSupplier}
                onChange={(e) => {
                  setSelectedSupplier(e.target.value);
                  setSelectedTrip(''); // Reset trip when supplier changes
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">Select supplier...</option>
                {suppliers.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <span className="flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Delivery Trip *
                </span>
              </label>
              <select
                value={selectedTrip}
                onChange={(e) => setSelectedTrip(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 ${
                  tripsForSupplier.length === 0 ? 'border-amber-300 bg-amber-50' : 'border-gray-300'
                }`}
                disabled={tripsForSupplier.length === 0}
              >
                <option value="">Select trip...</option>
                {tripsForSupplier.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.trip_number} - {t.drivers?.full_name || t.driver_name} ({t.vehicles?.registration_number || 'Unknown vehicle'})
                  </option>
                ))}
              </select>
              {tripsForSupplier.length === 0 && selectedSupplier && (
                <p className="text-xs text-amber-600 mt-1">
                  No in-progress trips available. Start a trip first.
                </p>
              )}
              {tripsForSupplier.length === 1 && selectedTrip && (
                <p className="text-xs text-green-600 mt-1">
                  Auto-selected the only available trip.
                </p>
              )}
            </div>

            {/* Show selected trip details */}
            {selectedTripData && (
              <div className="bg-white border border-gray-200 rounded-lg p-3 text-sm">
                <div className="flex items-center gap-2 text-gray-700 mb-1">
                  <Truck className="w-4 h-4 text-blue-600" />
                  <span className="font-medium">{selectedTripData.trip_number}</span>
                </div>
                <div className="text-gray-500 space-y-0.5">
                  <p>Driver: {selectedTripData.drivers?.full_name || selectedTripData.driver_name}</p>
                  <p>Vehicle: {selectedTripData.vehicles?.registration_number || 'Unknown'}</p>
                  {selectedTripData.origin_description && (
                    <p>From: {selectedTripData.origin_description}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleStartSession}
            disabled={!canStartSession || createSessionMutation.isPending}
          >
            {createSessionMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : null}
            Start Scanning
          </Button>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  // Loading state
  if (sessionLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-green-600 animate-spin" />
      </div>
    );
  }

  // Show receive form
  if (showReceiveForm) {
    return (
      <div className="space-y-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <h3 className="font-medium text-green-900 mb-2">Confirm Receipt</h3>
          <p className="text-sm text-green-700">
            Receiving {totalBags} bags ({totalQuantity.toFixed(1)} kg)
          </p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quality Score
            </label>
            <select
              value={qualityScore}
              onChange={(e) => setQualityScore(Number(e.target.value) as QualityScore)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            >
              <option value={1}>Good (Score 1)</option>
              <option value={2}>OK (Score 2)</option>
              <option value={3}>Poor (Score 3)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Expiry Date (optional)
            </label>
            <input
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Cost per kg (R)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 12.50"
              value={costPerUnit}
              onChange={(e) => setCostPerUnit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Delivery Note Number
            </label>
            <input
              type="text"
              placeholder="e.g., DN-2026-0001"
              value={deliveryNote}
              onChange={(e) => setDeliveryNote(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleBulkReceive}
            disabled={bulkReceiveMutation.isPending}
          >
            {bulkReceiveMutation.isPending ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4 mr-2" />
            )}
            Receive {totalBags} Bags
          </Button>
          <Button variant="outline" onClick={() => setShowReceiveForm(false)}>
            Back to Scanning
          </Button>
        </div>
      </div>
    );
  }

  // Main scanning interface
  return (
    <div className="space-y-6">
      {/* Scanner */}
      <BarcodeScanner
        onScan={handleScan}
        isActive={isScannerActive}
        disabled={recordScanMutation.isPending}
      />

      {/* Session stats */}
      <div className="grid grid-cols-3 gap-3">
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-gray-900">{totalBags}</div>
          <div className="text-xs text-gray-500">Bags Scanned</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-green-600">{totalQuantity.toFixed(1)}</div>
          <div className="text-xs text-gray-500">Total kg</div>
        </Card>
        <Card padding="sm" className="text-center">
          <div className="text-2xl font-bold text-amber-600">
            {scans.filter(s => !s.item_id && s.status === 'pending').length}
          </div>
          <div className="text-xs text-gray-500">Unknown</div>
        </Card>
      </div>

      {/* Scanned items list */}
      {scans.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-medium text-gray-900">Scanned Items</h3>
            <Badge variant="default" size="sm">
              {pendingScans.length} items
            </Badge>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {scans.slice().reverse().map((scan) => (
              <ScanResultCard
                key={scan.id}
                scan={scan}
                onConfirm={() => handleConfirmScan(scan.id)}
                onReject={(reason) => handleRejectScan(scan.id, reason)}
                disabled={updateStatusMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {scans.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <Package className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Point your camera at a barcode to start scanning</p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 pt-4 border-t border-gray-200">
        <Button
          onClick={() => setShowReceiveForm(true)}
          disabled={!canReceive}
          className="flex-1"
        >
          <CheckCircle className="w-4 h-4 mr-2" />
          Receive {totalBags} Bags
        </Button>
        <Button variant="outline" onClick={handleCancel}>
          <XCircle className="w-4 h-4 mr-2" />
          Cancel
        </Button>
      </div>

      {/* Loading indicator for scan */}
      {recordScanMutation.isPending && (
        <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" />
          Processing...
        </div>
      )}
    </div>
  );
}
