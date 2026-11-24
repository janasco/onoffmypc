# Security assessment status

The private cross-repository architecture and threat model are maintained in the separate private repository (`onoffmypc-private`), under `app/docs/cross-repository/`. They are not public.

Android has an origin-bound session-cookie jar (HTTPS plus exact API host/port, host-only/Secure/HttpOnly, redirects disabled), TLS-only network configuration, backup exclusions, and sensitive credential clipboard/screenshot controls. iOS stores the session in a device-bound, non-synchronizing Keychain item, and credential copies are local-only. iOS source now also requires HTTPS plus the exact API host/port for cookie capture, rejects empty/invalid cookies, blocks redirects, and disables the URL cache; those controls still need macOS/device validation and remain tracked as MP-13/OMP-19. A static mobile-hardening gate scans all Gradle sources plus optional local release artifacts and rejects unreviewed analytics/ads/attribution/crash SDKs including Adjust. The source-level privacy inventory is in [`DEPENDENCY_PRIVACY_INVENTORY.md`](DEPENDENCY_PRIVACY_INVENTORY.md); repeatable physical-device and iOS checks are in [`ON_DEVICE_VALIDATION.md`](ON_DEVICE_VALIDATION.md).

Android `:app:testDebugUnitTest` passed on 2026-11-24 with SDK 36. Physical-device backup/restore and screenshot validation, macOS/device validation of the new iOS cookie/redirect controls, the iOS release/push pipeline, a staged API environment, and the remaining privacy risks listed in the inventory are still open. No on-device or iOS build/test result is claimed by the documentation alone.

Do not copy the private assessment into a public repository or release artifact.
