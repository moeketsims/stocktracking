const supportEmail = 'bricoleurmosia@gmail.com';

export default function PrivacyPolicyPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <section className="border-b border-slate-200 bg-white">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <p className="text-sm font-semibold uppercase tracking-wide text-orange-600">Potato Stock</p>
          <h1 className="mt-3 text-3xl font-bold text-slate-950">Privacy Policy</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">
            Last updated: 9 May 2026
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-6 py-8">
        <div className="space-y-8 text-sm leading-7 text-slate-700">
          <section>
            <h2 className="text-lg font-semibold text-slate-950">Who This Policy Covers</h2>
            <p className="mt-2">
              Potato Stock is a stock, delivery, and fleet operations platform for business users. This policy
              explains how information is handled when managers, staff, and drivers use the web and mobile apps.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Information We Collect</h2>
            <p className="mt-2">
              We collect account details such as name, email address, role, assigned location, invite status, and
              authentication information. We also collect operational records created through the app, including
              stock requests, stock movements, deliveries, trip details, vehicle assignments, odometer readings
              when provided, barcode scans, notifications, and audit logs.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Device Features</h2>
            <p className="mt-2">
              The mobile app may use the camera for barcode scanning and push notification tokens for operational
              alerts. Camera access is used only when a user opens scanning functionality. The app does not require
              microphone access.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">How We Use Information</h2>
            <p className="mt-2">
              Information is used to authenticate users, control access by role and location, manage stock and
              deliveries, assign trips and vehicles, send operational notifications, investigate issues, and keep
              immutable audit records for business accountability.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Sharing</h2>
            <p className="mt-2">
              Information is shared only with the business tenant that owns the operational data and with service
              providers required to run the platform, such as hosting, database, email, and mobile notification
              providers. We do not sell user data.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Security And Retention</h2>
            <p className="mt-2">
              Data is transmitted over encrypted connections. Access is restricted by authentication, role, and
              assigned business location. Operational and audit records are retained for business, compliance, and
              troubleshooting purposes unless deletion is required and legally permitted.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Account And Data Requests</h2>
            <p className="mt-2">
              To request account help, correction, export, or deletion, contact{' '}
              <a className="font-semibold text-orange-700 underline" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
              . Some operational records may need to be retained where they form part of stock, delivery, or audit
              history.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-slate-950">Contact</h2>
            <p className="mt-2">
              Questions about this policy can be sent to{' '}
              <a className="font-semibold text-orange-700 underline" href={`mailto:${supportEmail}`}>
                {supportEmail}
              </a>
              .
            </p>
          </section>
        </div>
      </section>
    </main>
  );
}
