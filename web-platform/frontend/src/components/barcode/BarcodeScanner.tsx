import { useState, useCallback, useEffect, useRef } from 'react';
import { BarcodeScanner as Scanner, BarcodeFormat } from 'react-barcode-scanner';
import 'react-barcode-scanner/polyfill';
import type { DetectedBarcode } from 'react-barcode-scanner';
import { Camera, CameraOff, AlertCircle, Keyboard } from 'lucide-react';
import { Button } from '../ui';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onError?: (error: string) => void;
  isActive?: boolean;
  disabled?: boolean;
}

export default function BarcodeScanner({
  onScan,
  onError,
  isActive = true,
  disabled = false,
}: BarcodeScannerProps) {
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScanned, setLastScanned] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const lastScannedRef = useRef<string | null>(null);

  const isPaused = !isActive || disabled || showManualEntry;

  // Pre-check camera access to detect errors (NotAllowedError, NotFoundError)
  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' } })
      .then((stream) => {
        // Camera access OK — stop the pre-check stream immediately
        stream.getTracks().forEach((t) => t.stop());
      })
      .catch((err: Error) => {
        const msg =
          err.name === 'NotAllowedError'
            ? 'Camera access denied. Please allow camera access in your browser settings.'
            : err.name === 'NotFoundError'
              ? 'No camera found on this device.'
              : err.message;
        setCameraError(msg);
        onError?.(msg);
      });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle detected barcodes via callback (no setState-in-effect)
  const handleCapture = useCallback(
    (barcodes: DetectedBarcode[]) => {
      if (!barcodes.length) return;
      const barcode = barcodes[0].rawValue;
      if (!barcode) return;

      // Debounce: skip if same as last scanned
      if (barcode === lastScannedRef.current) return;

      lastScannedRef.current = barcode;
      setLastScanned(barcode);
      onScan(barcode);

      // Reset after 2 seconds to allow re-scanning same barcode
      setTimeout(() => {
        lastScannedRef.current = null;
        setLastScanned(null);
      }, 2000);
    },
    [onScan],
  );

  const handleManualSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (manualBarcode.trim()) {
        onScan(manualBarcode.trim());
        setManualBarcode('');
      }
    },
    [manualBarcode, onScan],
  );

  if (disabled) {
    return (
      <div className="bg-gray-100 rounded-xl p-8 text-center">
        <CameraOff className="w-12 h-12 text-gray-400 mx-auto mb-3" />
        <p className="text-gray-500">Scanner disabled</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Camera view or manual entry */}
      {showManualEntry ? (
        <div className="bg-gray-50 rounded-xl p-6">
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Enter Barcode Manually
              </label>
              <input
                type="text"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="e.g., 6001234567890"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-lg font-mono"
                autoFocus
              />
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={!manualBarcode.trim()}>
                Add Barcode
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowManualEntry(false)}
              >
                <Camera className="w-4 h-4 mr-2" />
                Use Camera
              </Button>
            </div>
          </form>
        </div>
      ) : (
        <div className="relative">
          {/* Camera viewfinder */}
          <div className="relative bg-black rounded-xl overflow-hidden aspect-video">
            {cameraError ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
                <p className="text-red-300 mb-4">{cameraError}</p>
                <Button
                  variant="outline"
                  onClick={() => setShowManualEntry(true)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  Enter Manually
                </Button>
              </div>
            ) : (
              <>
                <Scanner
                  onCapture={handleCapture}
                  options={{
                    formats: [
                      BarcodeFormat.EAN_13,
                      BarcodeFormat.EAN_8,
                      BarcodeFormat.UPC_A,
                      BarcodeFormat.UPC_E,
                      BarcodeFormat.CODE_128,
                      BarcodeFormat.CODE_39,
                      BarcodeFormat.ITF,
                      BarcodeFormat.QR_CODE,
                    ],
                    delay: 500,
                  }}
                  trackConstraints={{
                    facingMode: 'environment',
                    width: { ideal: 1920 },
                    height: { ideal: 1080 },
                  }}
                  paused={isPaused}
                />
                {/* Scan overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Scanning guide box */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-1/3 border-2 border-green-400 rounded-lg shadow-lg relative">
                      {/* Corner highlights */}
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-green-400 rounded-tl-lg" />
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-green-400 rounded-tr-lg" />
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-green-400 rounded-bl-lg" />
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-green-400 rounded-br-lg" />
                    </div>
                  </div>
                  {/* Scanning line animation */}
                  {isActive && (
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-green-400/50 animate-pulse" />
                  )}
                </div>
                {/* Status indicator */}
                <div className="absolute top-3 left-3 flex items-center gap-2 bg-black/50 px-3 py-1.5 rounded-full">
                  <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`} />
                  <span className="text-white text-sm">
                    {isActive ? 'Scanning...' : 'Paused'}
                  </span>
                </div>
                {/* Last scanned indicator */}
                {lastScanned && (
                  <div className="absolute bottom-3 left-3 right-3 bg-green-500/90 text-white px-4 py-2 rounded-lg text-center font-mono">
                    Scanned: {lastScanned}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Toggle manual entry */}
      {!showManualEntry && !cameraError && (
        <button
          onClick={() => setShowManualEntry(true)}
          className="w-full flex items-center justify-center gap-2 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <Keyboard className="w-4 h-4" />
          Type barcode manually
        </button>
      )}
    </div>
  );
}
