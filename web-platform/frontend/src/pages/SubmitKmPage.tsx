import { useState, useEffect } from 'react';
import { Truck, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../components/ui';
import api from '../lib/api';

function BackgroundPattern() {
  const iconColor = "#6366f1"; // indigo-500
  const bgColor = "#1e1b4b"; // indigo-950

  const Potato = ({ scale = 1, opacity = 0.04 }: { scale?: number; opacity?: number }) => (
    <g opacity={opacity} fill={iconColor} transform={`scale(${scale})`}>
      <ellipse cx="20" cy="15" rx="18" ry="14" />
      <circle cx="12" cy="10" r="2" fill={bgColor} />
      <circle cx="25" cy="8" r="1.5" fill={bgColor} />
      <circle cx="18" cy="18" r="1.5" fill={bgColor} />
    </g>
  );

  const TruckIcon = ({ scale = 1, opacity = 0.04 }: { scale?: number; opacity?: number }) => (
    <g opacity={opacity} fill={iconColor} transform={`scale(${scale})`}>
      <rect x="0" y="10" width="35" height="20" rx="2" />
      <rect x="35" y="15" width="15" height="15" rx="2" />
      <circle cx="10" cy="32" r="5" />
      <circle cx="42" cy="32" r="5" />
    </g>
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
        {/* Far corners - largest icons */}
        <g transform="translate(30, 30) rotate(-15)">
          <Potato scale={2.5} opacity={0.09} />
        </g>
        <g transform="translate(130, 120) rotate(30)">
          <TruckIcon scale={1.8} opacity={0.07} />
        </g>
        <g transform="translate(920, 40) rotate(20)">
          <TruckIcon scale={2.2} opacity={0.08} />
        </g>
        <g transform="translate(820, 130) rotate(-30)">
          <Potato scale={1.7} opacity={0.07} />
        </g>
        <g transform="translate(50, 900) rotate(10)">
          <TruckIcon scale={2.3} opacity={0.08} />
        </g>
        <g transform="translate(140, 780) rotate(-25)">
          <Potato scale={1.8} opacity={0.07} />
        </g>
        <g transform="translate(900, 880) rotate(-25)">
          <Potato scale={2.4} opacity={0.09} />
        </g>
        <g transform="translate(800, 770) rotate(18)">
          <TruckIcon scale={1.7} opacity={0.07} />
        </g>

        {/* Mid-distance from center - medium icons */}
        <g transform="translate(180, 200) rotate(25)">
          <Potato scale={1.5} opacity={0.07} />
        </g>
        <g transform="translate(800, 180) rotate(-10)">
          <Potato scale={1.4} opacity={0.07} />
        </g>
        <g transform="translate(150, 700) rotate(-20)">
          <TruckIcon scale={1.5} opacity={0.06} />
        </g>
        <g transform="translate(820, 750) rotate(15)">
          <TruckIcon scale={1.4} opacity={0.06} />
        </g>

        {/* Closer to center - smaller icons */}
        <g transform="translate(300, 350) rotate(-5)">
          <Potato scale={0.9} opacity={0.05} />
        </g>
        <g transform="translate(680, 380) rotate(12)">
          <TruckIcon scale={0.8} opacity={0.04} />
        </g>
        <g transform="translate(320, 620) rotate(8)">
          <TruckIcon scale={0.85} opacity={0.04} />
        </g>
        <g transform="translate(700, 650) rotate(-8)">
          <Potato scale={0.9} opacity={0.05} />
        </g>
      </svg>
    </div>
  );
}

interface KmSubmissionInfo {
  trip_id: string;
  delivery_id: string;
  driver_name: string;
  vehicle_id: string;
  starting_km: number;
  valid: boolean;
}

interface SubmissionResult {
  success: boolean;
  message: string;
  trip_distance: number;
  new_vehicle_total_km: number;
  starting_km: number;
  closing_km: number;
}

export default function SubmitKmPage() {
  // Get token from URL parameters
  const [token] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('token');
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<KmSubmissionInfo | null>(null);
  const [closingKm, setClosingKm] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [result, setResult] = useState<SubmissionResult | null>(null);

  useEffect(() => {
    if (!token) {
      setError('No token provided. Please use the link from your email.');
      setLoading(false);
      return;
    }

    // Fetch submission info
    const fetchInfo = async () => {
      try {
        const response = await api.get(`/api/pending-deliveries/km-submission/${token}`);
        setInfo(response.data);
        setLoading(false);
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load submission info';
        const axiosError = err as { response?: { data?: { detail?: string } } };
        setError(axiosError.response?.data?.detail || errorMessage);
        setLoading(false);
      }
    };

    fetchInfo();
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!closingKm || !token) return;

    const closingKmNum = parseInt(closingKm, 10);
    if (isNaN(closingKmNum)) {
      setError('Please enter a valid number');
      return;
    }

    if (info && closingKmNum < info.starting_km) {
      setError(`Closing km (${closingKmNum.toLocaleString()}) cannot be less than starting km (${info.starting_km.toLocaleString()})`);
      return;
    }

    // Feature 3: Upper bound validation - max 2000 km per trip
    const MAX_TRIP_DISTANCE = 2000;
    if (info && closingKmNum > info.starting_km + MAX_TRIP_DISTANCE) {
      setError(`Closing km (${closingKmNum.toLocaleString()}) exceeds maximum expected (${(info.starting_km + MAX_TRIP_DISTANCE).toLocaleString()} km). Contact your manager if this is correct.`);
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await api.post(`/api/pending-deliveries/km-submission/${token}`, {
        closing_km: closingKmNum
      });
      setResult(response.data);
      setSubmitted(true);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit closing km';
      const axiosError = err as { response?: { data?: { detail?: string } } };
      setError(axiosError.response?.data?.detail || errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-4 relative">
        <BackgroundPattern />
        <Card className="w-full max-w-md text-center py-12 relative z-10">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-4 relative">
        <BackgroundPattern />
        <Card className="w-full max-w-md text-center py-12 relative z-10">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-4 relative">
        <BackgroundPattern />
        <Card className="w-full max-w-md text-center py-12 relative z-10">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Thank You!</h2>
          <p className="text-gray-600 mb-6">{result.message}</p>

          <div className="bg-gray-50 rounded-lg p-4 text-left space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Starting Km</span>
              <span className="font-medium">{result.starting_km.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Closing Km</span>
              <span className="font-medium">{result.closing_km.toLocaleString()} km</span>
            </div>
            <div className="flex justify-between border-t pt-2">
              <span className="text-gray-500">Trip Distance</span>
              <span className="font-bold text-green-600">{result.trip_distance.toLocaleString()} km</span>
            </div>
          </div>

          <p className="text-sm text-gray-500 mt-6">You can close this page now.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-4 relative">
      <BackgroundPattern />
      <Card className="w-full max-w-md relative z-10">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Submit Closing Km</h1>
          <p className="text-gray-500 mt-1">
            Hi {info?.driver_name}, please enter your closing odometer reading
          </p>
        </div>

        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-500">Starting Km</span>
            <span className="text-xl font-bold text-gray-900">
              {info?.starting_km.toLocaleString()} km
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="closingKm" className="block text-sm font-medium text-gray-700 mb-1">
              Closing Odometer Reading (km)
            </label>
            <Input
              id="closingKm"
              type="number"
              value={closingKm}
              onChange={(e) => {
                setClosingKm(e.target.value);
                setError(null);
              }}
              placeholder={`Enter km (min: ${info?.starting_km.toLocaleString()})`}
              min={info?.starting_km}
              required
              className="text-lg"
            />
            {closingKm && info && parseInt(closingKm, 10) >= info.starting_km && (
              <p className="text-sm text-green-600 mt-1">
                Trip distance: {(parseInt(closingKm, 10) - info.starting_km).toLocaleString()} km
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={submitting || !closingKm}>
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit Closing Km'
            )}
          </Button>
        </form>

        <p className="text-xs text-gray-500 text-center mt-4">
          Potato Stock Tracking System
        </p>
      </Card>
    </div>
  );
}
