import { useState, useCallback, useEffect, useMemo } from 'react';
import { useZxing } from 'react-zxing';
import { DecodeHintType, BarcodeFormat } from '@zxing/library';
import { Camera, CameraOff, AlertCircle, Keyboard, FlipHorizontal } from 'lucide-react';
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
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  // Decode hints: try harder + common barcode formats
  const hints = useMemo(() => {
    const map = new Map();
    map.set(DecodeHintType.TRY_HARDER, true);
    map.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
      BarcodeFormat.CODE_39,
      BarcodeFormat.ITF,
      BarcodeFormat.QR_CODE,
    ]);
    return map;
  }, []);

  const { ref, torch } = useZxing({
    onDecodeResult(result) {
      const barcode = result.getText();
      // Debounce to prevent multiple scans of the same barcode
      if (barcode !== lastScanned) {
        setLastScanned(barcode);
        onScan(barcode);
        // Reset after 2 seconds to allow re-scanning same barcode
        setTimeout(() => setLastScanned(null), 2000);
      }
    },
    onError(error) {
      // Only handle actual camera errors, not decode failures (NotFoundException)
      if (error.name === 'NotAllowedError') {
        setCameraError('Camera access denied. Please allow camera access in your browser settings.');
        onError?.(error.message || 'Camera access denied');
      } else if (error.name === 'NotFoundError') {
        setCameraError('No camera found on this device.');
        onError?.(error.message || 'No camera found');
      }
    },
    hints,
    timeBetweenDecodingAttempts: 50,
    paused: !isActive || disabled || showManualEntry,
    constraints: {
      video: {
        facingMode: facingMode,
        width: { ideal: 1920 },
        height: { ideal: 1080 },
        // @ts-ignore — focusMode is valid but not in all TS typings
        focusMode: { ideal: 'continuous' },
      } as MediaTrackConstraints,
    },
  });

  const handleManualSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode('');
    }
  }, [manualBarcode, onScan]);

  const toggleCamera = useCallback(() => {
    setFacingMode(prev => prev === 'environment' ? 'user' : 'environment');
  }, []);

  // Reset camera error when becoming active
  useEffect(() => {
    if (isActive) {
      setCameraError(null);
    }
  }, [isActive]);

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
                <video
                  ref={ref}
                  className="w-full h-full object-cover"
                />
                {/* Scan overlay */}
                <div className="absolute inset-0 pointer-events-none">
                  {/* Scanning guide box */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-3/4 h-1/3 border-2 border-green-400 rounded-lg shadow-lg">
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

          {/* Camera controls */}
          <div className="absolute top-3 right-3 flex gap-2">
            <button
              onClick={toggleCamera}
              className="p-2 bg-black/50 text-white rounded-lg hover:bg-black/70 transition-colors"
              title="Switch camera"
            >
              <FlipHorizontal className="w-5 h-5" />
            </button>
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
