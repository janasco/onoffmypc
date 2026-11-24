import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function RefundPolicyPage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Legal"
          title="Refund Policy"
          description="Last updated: July 2026"
        />

        <div className="type-body mt-8 flex max-w-[68ch] flex-col gap-6 text-zinc-300">
          <p>
            This Refund Policy applies to paid OnOffMyPC device unlocks and related purchases when billing
            is enabled. During the public free launch, paid unlocks may not be offered; this policy applies
            when checkout is available. It supplements the{" "}
            <Link href="/terms" className="text-emerald-400 underline-offset-2 hover:underline">
              Terms of Service
            </Link>
            .
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">Merchant of Record</h2>
          <p>
            When paid unlocks are offered, payment collection, taxes, invoices, receipts, and refund
            processing are handled by Polar, which acts as merchant of record and authorised reseller. By completing checkout you also agree to Polar’s Checkout Buyer Terms. Polar’s systems and policies may set final timing and eligibility for refund issuance to your original payment method.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">What you buy</h2>
          <p>
            A device unlock is typically a one-time purchase that unlocks remote control for the specific logical device record selected at checkout — not a recurring subscription — unless we clearly state otherwise at purchase. Unlock entitlement is tied to that cloud device record in your account, not automatically to a physical ESP32 serial number or a replacement board.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">How to request a refund</h2>
          <p>
            Email us directly at <a href="mailto:support@onoffmypc.com" className="text-emerald-400 underline-offset-2 hover:underline">support@onoffmypc.com</a> with:
          </p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-500">
            <li>The email address on your OnOffMyPC account</li>
            <li>Order or receipt reference if you have it (Polar receipt or order ID)</li>
            <li>Which device unlock the request concerns</li>
            <li>A short explanation of the issues or reasons</li>
          </ul>
          <p>
            For unused unlocks (little or no productive use of paid remote control after purchase), please contact us within <strong>14 days</strong> of purchase. Approved refunds revoke the corresponding device unlock entitlement.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
