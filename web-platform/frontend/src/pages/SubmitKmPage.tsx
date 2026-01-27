import { useState, useEffect } from 'react';
import { Truck, CheckCircle, AlertTriangle, Loader2 } from 'lucide-react';
import { Card, Button, Input } from '../components/ui';
import api from '../lib/api';

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
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600">Loading...</p>
        </Card>
      </div>
    );
  }

  if (error && !info) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600">{error}</p>
        </Card>
      </div>
    );
  }

  if (submitted && result) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center py-12">
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

          <p className="text-sm text-gray-400 mt-6">You can close this page now.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
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

        <p className="text-xs text-gray-400 text-center mt-4">
          Potato Stock Tracking System
        </p>
      </Card>
    </div>
  );
}
