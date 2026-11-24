import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function PrivacyPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Legal"
          title="Privacy Policy"
          description="Last updated: July 2026"
        />

        <div className="type-body mt-8 flex max-w-[68ch] flex-col gap-6 text-zinc-300">
          <p>
            This Privacy Policy explains how OnOffMyPC (“we”, “us”, “Operator”) collects, uses, and shares
            personal data when you use our websites, web app, mobile apps, and APIs (the “Service”).
            For consumer accounts we act as the <strong>data controller</strong> for account and device
            data we store to provide the Service.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">What we collect</h2>
          <p>
            <strong>Account:</strong> Email address; hashed password when you register with email/password
            (we never store passwords in plain text); account timestamps; and, if you use social sign-in,
            the provider subject identifier and email shared by that provider (Google, Apple, or Microsoft).
          </p>
          <p><strong>Devices and usage:</strong> When your ESP32 device is connected, we receive and store:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-500">
            <li>Commands you send (power on, power off, reset) and their delivery status</li>
            <li>Telemetry: PC power state, room temperature, room humidity, Wi-Fi signal strength</li>
            <li>Device registration details you provide (name, firmware version, last-seen time)</li>
            <li>Scheduled commands you create</li>
          </ul>
          <p>
            <strong>Push notifications:</strong> If you enable notifications in a supported mobile app, we
            store a push-notification token so we can send alerts (for example device offline/online or
            command delivered/failed). Android uses Google Firebase Cloud Messaging (FCM).
          </p>
          <p>
            <strong>Billing:</strong> Checkout is provided by Polar, our merchant of record. Polar collects contact, billing, tax, and payment details. We do not receive or store your full card number. We store Polar checkout, customer, order, receipt, amount, currency, refund status, and device identifiers so we can grant access and show purchase history.
          </p>
          <p>
            <strong>Security and operations:</strong> Client IP addresses are used transiently for rate
            limiting and may be recorded in a security audit log for security-relevant events. We may
            receive messages you send via the contact form. We do not use advertising or analytics SDKs in the OnOffMyPC apps, and we do not sell personal data.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">Why we use it</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-500">
            <li><strong>Provide the Service</strong> — authenticate you, route commands, show status and history, send transactional email, and deliver push alerts.</li>
            <li><strong>Secure the Service</strong> — rate limiting, abuse prevention, audit logging.</li>
            <li><strong>Billing</strong> — grant device unlocks and reconcile Polar notifications when paid features are enabled.</li>
            <li><strong>Support</strong> — respond to privacy or support requests.</li>
          </ul>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">Subprocessors</h2>
          <p>We use these processors to run the Service:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-500">
            <li><strong>Cloudflare</strong> — Workers, D1, Durable Objects, Pages, and edge hosting.</li>
            <li><strong>Resend</strong> — transactional email (verification, password reset).</li>
            <li><strong>Polar</strong> — hosted checkout/payments and invoice reconciliations.</li>
            <li><strong>Google Firebase</strong> — Cloud Messaging push delivery.</li>
          </ul>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">Retention</h2>
          <p>We apply the following retention windows in production:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-500">
            <li><strong>Raw telemetry</strong> — 30 days (max 2,000 rows per device).</li>
            <li><strong>Hourly telemetry aggregates</strong> — 90 days.</li>
            <li><strong>Commands &amp; logs</strong> — 30 days.</li>
            <li><strong>Finished scheduled commands</strong> — 30 days after run/cancellation.</li>
            <li><strong>Security audit logs</strong> — 180 days.</li>
            <li><strong>Accounts and devices</strong> — until you delete them; account deletion has a <strong>15-day grace period</strong> before permanent purge.</li>
          </ul>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">Your rights</h2>
          <p>
            Depending on where you live, you may have rights to access, correct, delete, restrict, or object to certain processing, and to data portability. You can download a machine-readable copy of your account data anytime from the web app under <strong>Account → Download my data</strong> (JSON export). To exercise these rights, email us at <a href="mailto:privacy@onoffmypc.com" className="text-emerald-400 underline-offset-2 hover:underline">privacy@onoffmypc.com</a>.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
