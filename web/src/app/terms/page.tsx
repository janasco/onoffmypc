import Link from "next/link";
import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function TermsOfServicePage() {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-50 selection:bg-emerald-500/30 selection:text-emerald-400">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Legal"
          title="Terms of Service"
          description="Last updated: July 2026"
        />

        <div className="type-body mt-8 flex max-w-[68ch] flex-col gap-6 text-zinc-300">
          <p>
            These Terms of Service (“Terms”) govern your access to and use of OnOffMyPC — the websites,
            web app, mobile apps, APIs, and related services that let you remotely control PC power through
            an ESP32 device (together, the “Service”). The Service is operated under the name
            <strong>OnOffMyPC</strong> (the “Operator”).
          </p>
          <p>
            By creating an account, accessing the Service, or completing a purchase when paid features are
            offered, you agree to these Terms and to our{" "}
            <Link href="/privacy-policy" className="text-emerald-400 underline-offset-2 hover:underline">
              Privacy Policy
            </Link>
            . If you do not agree, do not use the Service.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">1. Eligibility</h2>
          <p>
            You must be at least 16 years old to use the Service. If you use the Service on behalf of an organization, you represent that you have authority to bind that organization.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">2. Accounts</h2>
          <p>
            You must provide a valid email address to register, or sign in with a supported identity provider (for example Google, Apple, or Microsoft). You are responsible for all activity under your account and for keeping credentials and session devices secure. Notify us immediately at support@onoffmypc.com if you believe your account has been compromised.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">3. Acceptable Use</h2>
          <p>You may use the Service only to control hardware that you own or have explicit permission to control. You must not:</p>
          <ul className="flex list-disc flex-col gap-1.5 pl-5 marker:text-zinc-500">
            <li>Access, register, or control devices without authorization from the owner.</li>
            <li>Attempt to bypass authentication, entitlement, rate limits, or security controls.</li>
            <li>Interfere with other users’ devices, accounts, or the Service infrastructure.</li>
            <li>Use the Service for unlawful surveillance, harassment, fraud, or other illegal activity.</li>
          </ul>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">4. Service Availability</h2>
          <p>
            OnOffMyPC is a live production service. We use commercially reasonable efforts to keep it available, but we do not guarantee uninterrupted uptime, and we make no guarantees that commands sent through the Service will be delivered or executed. Do not rely on this Service for time-critical, life-safety, industrial, medical, or other safety-critical operations.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">5. Disclaimer of Warranties</h2>
          <p className="uppercase text-zinc-300">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE,” WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
          </p>

          <h2 className="type-section-title mt-4 border-b border-zinc-900 pb-2 text-zinc-50">6. Limitation of Liability</h2>
          <p className="uppercase text-zinc-300">
            TO THE MAXIMUM EXTENT PERMITTED BY LAW, THE OPERATOR AND ITS SUPPLIERS WILL NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, LOST DATA, BUSINESS INTERRUPTION, OR COST OF SUBSTITUTE SERVICES, ARISING FROM OR RELATED TO YOUR USE OF THE SERVICE.
          </p>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
