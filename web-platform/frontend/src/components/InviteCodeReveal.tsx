import { useState } from 'react';
import { Copy, Check, MessageCircle, Share2 } from 'lucide-react';

interface Props {
  /** 6-character code returned by the backend (raw, no dashes). */
  code: string;
  /** Display name or email of the recipient — used in copy text. */
  recipient: string;
  /** Role label, used in the WhatsApp message text. */
  role?: string;
  /** Optional phone number (any format) — pre-targets the WhatsApp deep-link. */
  phone?: string;
  /** Whether the backend successfully sent the email invitation. */
  emailSent?: boolean;
  /** Called when the manager taps "Done". */
  onDone: () => void;
}

/**
 * Post-create view that surfaces the in-person invite code with copy +
 * WhatsApp + system share affordances. Used by both InviteUserModal and
 * DriverModal after a successful create. Backend always sends the email
 * (when applicable); this view is the offline / non-email path.
 */
export default function InviteCodeReveal({
  code,
  recipient,
  role = 'user',
  phone,
  emailSent,
  onDone,
}: Props) {
  const [copied, setCopied] = useState(false);

  // Display the code as DDD-DDD for readability when read aloud.
  const display = code.length === 6 ? `${code.slice(0, 3)}-${code.slice(3)}` : code;

  const message =
    `Hello — your Potato Stock invite code is ${code}. ` +
    `Open the app, tap "Have an invite code?" on the sign-in screen, and enter it to set up your account.`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // Clipboard API failed (HTTP context, etc.) — fall back to alert.
      window.prompt('Copy this code', code);
    }
  };

  const handleWhatsApp = () => {
    const digits = phone ? phone.replace(/[^0-9]/g, '') : '';
    const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ text: message });
        return;
      } catch {
        // User cancelled or share API failed — fall through to copy.
      }
    }
    await handleCopy();
  };

  return (
    <div className="space-y-5">
      {/* Status line */}
      <div
        className={
          emailSent
            ? 'bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-700'
            : 'bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-700'
        }
      >
        {emailSent
          ? `Email sent to ${recipient}. You can also share the code below in person.`
          : `Share this code with ${recipient} — they enter it on the login screen, no email needed.`}
      </div>

      {/* Code display */}
      <div className="border-2 border-gray-900 rounded-lg p-6 bg-amber-50 text-center">
        <div className="text-xs uppercase tracking-widest font-mono text-gray-500 mb-2">
          {role.toUpperCase()} INVITE CODE
        </div>
        <div className="font-mono text-5xl font-bold tracking-[0.4em] text-gray-900">
          {display}
        </div>
        <div className="text-xs uppercase tracking-wider font-mono text-gray-500 mt-3">
          Expires in 7 days · single use
        </div>
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <button
          type="button"
          onClick={handleCopy}
          className={
            copied
              ? 'border-2 border-green-600 text-green-700 rounded-lg px-4 py-3 text-sm font-medium flex items-center justify-center gap-2 transition'
              : 'border-2 border-gray-300 text-gray-800 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition'
          }
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? 'Copied' : 'Copy code'}
        </button>
        <button
          type="button"
          onClick={handleWhatsApp}
          className="bg-[#25D366] text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-[#1eb854] flex items-center justify-center gap-2 transition"
        >
          <MessageCircle className="w-4 h-4" />
          Share via WhatsApp
        </button>
        <button
          type="button"
          onClick={handleShare}
          className="border-2 border-gray-300 text-gray-800 rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-50 flex items-center justify-center gap-2 transition"
        >
          <Share2 className="w-4 h-4" />
          Share
        </button>
      </div>

      {/* What they do */}
      <div>
        <div className="text-xs uppercase tracking-widest font-mono text-gray-700 mb-2">
          What they do
        </div>
        <ol className="space-y-2 text-sm text-gray-700">
          <li className="flex gap-3">
            <span className="font-mono text-gray-400 w-6">01</span>
            <span>Open the Potato Stock app or website</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-gray-400 w-6">02</span>
            <span>Tap <strong>"Have an invite code?"</strong> on the sign-in screen</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-gray-400 w-6">03</span>
            <span>Type <span className="font-mono font-bold">{display || 'the code'}</span> and pick a password</span>
          </li>
          <li className="flex gap-3">
            <span className="font-mono text-gray-400 w-6">04</span>
            <span>On mobile, set a 4-digit PIN — they're in</span>
          </li>
        </ol>
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onDone}
          className="w-full bg-gray-900 text-white rounded-lg px-4 py-3 text-sm font-medium hover:bg-gray-800 transition"
        >
          Done
        </button>
      </div>
    </div>
  );
}
