import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function MsaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Legal"
          title="Master Service Agreement"
          description="Draft template — July 2026"
        />

        <div className="type-body mt-8 flex max-w-[68ch] flex-col gap-6 text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
          <p>
            <strong>Status:</strong> This page is a <em>draft template</em> for business customers. It becomes binding only when Customer and OnOffMyPC execute an order form or MSA that incorporates this document. Consumer self-serve accounts are governed by the Terms of Service.
          </p>

          <h2 className="type-section-title mt-4 border-b border-border pb-2 text-foreground">1. Scope of Service</h2>
          <p>
            Provider will make available the OnOffMyPC cloud Service for remote PC power control via registered ESP32 devices. Hardware installation, front-panel wiring, and Wake-on-LAN configurations remain Customer’s responsibility.
          </p>

          <h2 className="type-section-title mt-4 border-b border-border pb-2 text-foreground">2. Fees and Invoicing</h2>
          <p>
            Fees are outlined in the order form. Late undisputed amounts may trigger account suspension after notice. All fees are non-refundable unless specified.
          </p>

          <h2 className="type-section-title mt-4 border-b border-border pb-2 text-foreground">3. Data Protection</h2>
          <p>
            Our processing of Customer Personal Data is governed by the{" "}
            <Link href="/dpa" className="font-semibold text-primary underline-offset-2 hover:underline">
              Data Processing Addendum (DPA)
            </Link>
            , which is incorporated into this agreement by reference.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
