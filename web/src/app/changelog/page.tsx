import { PublicFooter } from "@/components/public-footer";
import { PublicHeader } from "@/components/public-header";
import { PublicPageHeader } from "@/components/public-page-header";

export default function ChangelogPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:py-14">
        <PublicPageHeader
          eyebrow="Product"
          title="What's New"
          description="OnOffMyPC product updates, releases, and platform enhancements."
        />

        <div className="mt-10 flex max-w-[68ch] flex-col gap-10">
          {/* Release November 2026 */}
          <section className="relative border-l-2 border-emerald-300 pl-5 sm:pl-6">
            <span
              aria-hidden="true"
              className="absolute -left-[8px] top-1.5 h-3.5 w-3.5 rounded-full border-4 border-background bg-primary"
            />
            <h2 className="type-section-title text-foreground">November 2026</h2>
            <ul className="type-body mt-3 flex list-disc flex-col gap-2.5 pl-5 text-muted-foreground marker:text-muted-foreground">
              <li><strong className="font-semibold text-foreground">New OnOffMyPC identity:</strong> the Toggle mark now appears across the web, Android, desktop, and Play listing.</li>
              <li><strong className="font-semibold text-foreground">Android 0.4.9:</strong> compact device list with OS icons and status pills, a unified device detail screen, and a production release.</li>
              <li><strong className="font-semibold text-foreground">Desktop 0.1.5:</strong> refreshed installer icon and hostname, local IP, and MAC reporting in telemetry.</li>
              <li><strong className="font-semibold text-foreground">Direct downloads refreshed:</strong> Android 0.4.9 APK and desktop 0.1.5 installers are now on the downloads page.</li>
            </ul>
          </section>

          {/* Release July 2026 */}
          <section className="relative border-l-2 border-border pl-5 sm:pl-6">
            <span
              aria-hidden="true"
              className="absolute -left-[8px] top-1.5 h-3.5 w-3.5 rounded-full border-4 border-background bg-muted-foreground/50"
            />
            <h2 className="type-section-title text-foreground">July 2026</h2>
            <ul className="type-body mt-3 flex list-disc flex-col gap-2.5 pl-5 text-muted-foreground marker:text-muted-foreground">
              <li><strong className="font-semibold text-foreground">Public Launch:</strong> Account registration is open and remote power controls are free for every device during our launch window.</li>
              <li><strong className="font-semibold text-foreground">Connection Status &amp; Banners:</strong> Device cards now support offline detection and display a warning banner if communication is lost.</li>
              <li><strong className="font-semibold text-foreground">Refactored Dashboard Design:</strong> Sleek dark-mode grid cards with live telemetry graphs and recent command history records.</li>
              <li><strong className="font-semibold text-foreground">Adaptive Mobile Navigation:</strong> Optimized viewports and collapsible menus make managing workstation PCs easy on phone screens.</li>
            </ul>
          </section>

          {/* Release June 2026 */}
          <section className="relative border-l-2 border-border pl-5 sm:pl-6">
            <span
              aria-hidden="true"
              className="absolute -left-[8px] top-1.5 h-3.5 w-3.5 rounded-full border-4 border-background bg-muted-foreground/50"
            />
            <h2 className="type-section-title text-foreground">June 2026</h2>
            <ul className="type-body mt-3 flex list-disc flex-col gap-2.5 pl-5 text-muted-foreground marker:text-muted-foreground">
              <li><strong className="font-semibold text-foreground">System Light &amp; Dark Modes:</strong> Persistent theme selection that respects user preference state.</li>
              <li><strong className="font-semibold text-foreground">Command Scheduling:</strong> Queue power-on, power-off, or reset actions to execute at a scheduled date/time.</li>
              <li><strong className="font-semibold text-foreground">7-Day Telemetry Trends:</strong> Aggregated hourly telemetry charts detailing CPU and GPU metrics.</li>
              <li><strong className="font-semibold text-foreground">One-Click Browser Flasher:</strong> Connect and configure your ESP32 module using the native Web Serial flasher without local compilers.</li>
            </ul>
          </section>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
