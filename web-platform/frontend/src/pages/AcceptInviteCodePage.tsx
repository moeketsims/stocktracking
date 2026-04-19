import { useState } from 'react';
import { AlertCircle, ArrowLeft, Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from 'lucide-react';
import { Button, Input } from '../components/ui';
import { authExtApi } from '../lib/api';
import { useAuthStore } from '../stores/authStore';

const CODE_ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
const CODE_LEN = 6;

function normaliseCode(raw: string): string {
  return Array.from(raw.toUpperCase())
    .filter((ch) => CODE_ALPHABET.includes(ch))
    .slice(0, CODE_LEN)
    .join('');
}

interface Props {
  onSuccess: () => void;
  onBack: () => void;
}

/**
 * Recipient-side: redeem an in-person invite code, set a password, and
 * land directly inside the app (the backend auto-signs us in via the
 * accept-invite response). Falls back to the login screen if the
 * backend's auto-sign-in step is unavailable.
 */
export default function AcceptInviteCodePage({ onSuccess, onBack }: Props) {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const cleanCode = normaliseCode(code);
  const display = cleanCode.length > 3 ? `${cleanCode.slice(0, 3)}-${cleanCode.slice(3)}` : cleanCode;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (cleanCode.length !== CODE_LEN) {
      setError('The invite code is 6 characters.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    try {
      setSubmitting(true);
      const response = await authExtApi.acceptInvite({
        short_code: cleanCode,
        password,
      });
      const data: any = response.data;

      // If the backend auto-sign-in step succeeded, we get tokens back —
      // hydrate the auth store and we're in. Otherwise fall back to the
      // login screen with a clear message.
      if (data?.access_token && data?.refresh_token && data?.user) {
        await setAuth(data.user, data.access_token, data.refresh_token);
        onSuccess();
        return;
      }

      // Legacy response — account created but client must log in manually.
      onBack();
      // The login page can't show a flash message yet, but at least the
      // user knows what to do because the email field stays focused on it.
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Could not redeem this code. Check it and try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-indigo-950 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 w-full max-w-md">
        <button
          type="button"
          onClick={onBack}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sign in
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-3">
            <KeyRound className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Welcome aboard</h1>
          <p className="text-gray-500 mt-1 text-sm">
            Enter the 6-character code your manager gave you, then choose a password.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <div className="flex items-baseline justify-between mb-1">
              <label className="block text-sm font-medium text-gray-700">
                Invite code
              </label>
              <span className="text-xs font-mono text-gray-400">
                {cleanCode.length}/{CODE_LEN}
              </span>
            </div>
            <input
              type="text"
              value={display}
              onChange={(e) => {
                setCode(e.target.value);
                setError('');
              }}
              placeholder="ABC-123"
              autoCapitalize="characters"
              autoComplete="one-time-code"
              autoCorrect="off"
              spellCheck={false}
              maxLength={CODE_LEN + 1}
              className="w-full text-center font-mono text-3xl tracking-[0.4em] py-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none uppercase"
            />
          </div>

          <Input
            type={showPassword ? 'text' : 'password'}
            label="New password"
            placeholder="At least 8 characters"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="new-password"
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            }
          />

          <Input
            type={showPassword ? 'text' : 'password'}
            label="Confirm password"
            placeholder="Type it again"
            value={confirm}
            onChange={(e) => {
              setConfirm(e.target.value);
              setError('');
            }}
            autoComplete="new-password"
          />

          <Button
            type="submit"
            className="w-full"
            size="lg"
            isLoading={submitting}
            disabled={submitting}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Activate account'}
          </Button>
        </form>

        <div className="mt-6 pt-4 border-t border-gray-200 text-xs text-gray-500 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 flex-shrink-0 text-gray-400" />
          <span>
            Lost your code? Ask your manager to read it again or send a new one.
          </span>
        </div>
      </div>
    </div>
  );
}
