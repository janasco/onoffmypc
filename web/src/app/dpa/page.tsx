import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function DpaPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Legal"
          title="Data Processing Addendum"
          description="Draft template — July 2026"
        />

        <div className="type-body mt-8 flex max-w-[68ch] flex-col gap-6 text-muted-foreground [&_strong]:font-semibold [&_strong]:text-foreground">
          <p>
            <strong>Status:</strong> This page is a <em>draft template</em> for business customers. It becomes effective only when Customer and OnOffMyPC execute it in writing or it is incorporated into a signed{" "}
            <Link href="/msa" className="font-semibold text-primary underline-offset-2 hover:underline">
              Master Service Agreement
            </Link>
            . Consumer self-serve accounts are governed by the Privacy Policy and Terms of Service, not this DPA.
          </p>

          <h2 className="type-section-title mt-4 border-b border-border pb-2 text-foreground">1. Parties and Roles</h2>
          <p>
            <strong>“OnOffMyPC” / “Processor”</strong> means the Operator of the OnOffMyPC Service.{" "}
            <strong>“Customer” / “Controller”</strong> means the business entity determining the purposes of processing Personal Data. Processor processes data solely on Customer instructions.
          </p>

          <h2 className="type-section-title mt-4 border-b border-border pb-2 text-foreground">2. Subject Matter and Nature of Processing</h2>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted-foreground">
            <li><strong>Subject matter:</strong> hosting and operation of remote PC power-control accounts, devices, commands, and telemetry.</li>
            <li><strong>Purpose:</strong> providing the Service to Customer as agreed.</li>
            <li><strong>Types of Personal Data:</strong> account emails, device logs, command histories, push tokens, and diagnostic IPs.</li>
          </ul>

          <h2 className="type-section-title mt-4 border-b border-border pb-2 text-foreground">3. Security Measures</h2>
          <p>
            Processor implements transport encryption (TLS), hashing passwords, rate limits, access controls, and database sanitizations to protect Personal Data.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
