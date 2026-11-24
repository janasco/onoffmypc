"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";
import { AppHeader } from "@/components/app-header";
import { PlatformPageHeader } from "@/components/platform-page-header";
import { describeUserAgent, formatWhen, type SessionSummary } from "@/lib/sessions";

interface UserProfile {
  email: string;
  created_at: string;
  email_verified: boolean;
  deletion_at: string | null;
}

const FIELD_CLASS =
  "h-11 w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3 text-base text-zinc-100 placeholder:text-zinc-400 transition-colors focus:border-emerald-500/60 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/80 md:text-sm";

const FIELD_LABEL_CLASS = "type-label text-zinc-300";

export default function AccountPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Email form
  const [newEmail, setNewEmail] = useState("");
  const [emailPw, setEmailPw] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);
  const [emailLoading, setEmailLoading] = useState(false);

  // Password form
  const [curPw, setCurPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSuccess, setPwSuccess] = useState<string | null>(null);
  const [pwLoading, setPwLoading] = useState(false);

  // Active sessions
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [sessionsLoading, setSessionsLoading] = useState(true);
  const [sessionsError, setSessionsError] = useState<string | null>(null);
  const [sessionsBusy, setSessionsBusy] = useState<string | null>(null);

  // Countdown timer for deletion. Only the clock tick is state; the displayed
  // string is derived from it.
  const [now, setNow] = useState(() => Date.now());

  // Deletion Modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      // `loading` starts as true, so the first state write happens only after
      // the request resolves — no cascading render on mount.
      const { data, status } = await api.me<UserProfile>();
      if (cancelled) return;
      if (status === 401) {
        router.push("/login");
        return;
      }
      if (data) setProfile(data);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [router]);

  // Derived from the profile, so the timer and the rendered string always agree.
  const deletionAt = profile?.deletion_at ?? null;

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data, error } = await api.sessions<{ sessions: SessionSummary[] }>();
      if (cancelled) return;
      if (error) setSessionsError(error);
      else setSessions(data?.sessions ?? []);
      setSessionsLoading(false);
    })();
    return () => { cancelled = true; };
  }, []);

  const handleRevokeSession = async (id: string) => {
    setSessionsBusy(id);
    setSessionsError(null);
    const { error } = await api.revokeSession(id);
    if (error) {
      setSessionsError(error);
    } else {
      setSessions((prev) => prev.filter((session) => session.id !== id));
    }
    setSessionsBusy(null);
  };

  const handleRevokeOtherSessions = async () => {
    setSessionsBusy("others");
    setSessionsError(null);
    const { error } = await api.revokeOtherSessions();
    if (error) {
      setSessionsError(error);
    } else {
      setSessions((prev) => prev.filter((session) => session.current));
    }
    setSessionsBusy(null);
  };

  useEffect(() => {
    if (!deletionAt) return;

    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [deletionAt]);

  const countdown = useMemo(() => {
    if (!deletionAt) return "";

    const ms = new Date(deletionAt).getTime() - now;
    if (ms <= 0) return "Deleting now…";

    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${d}d ${h}h ${m}m ${sec}s`;
  }, [deletionAt, now]);

  const handleResendVerify = async () => {
    await api.resendVerify();
    alert("Verification email sent — check your inbox");
  };

  const handleExportData = async () => {
    const { data, error } = await api.exportData();
    if (error) {
      alert(`Export failed: ${error}`);
      return;
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `onoffmypc-export-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail || !emailPw) return;
    setEmailError(null);
    setEmailSuccess(null);
    setEmailLoading(true);

    const { error } = await api.changeEmail(newEmail, emailPw);
    setEmailLoading(false);

    if (error) {
      setEmailError(error);
    } else {
      setEmailPw("");
      setEmailSuccess("Email updated — check your new inbox to verify it.");
      if (profile) setProfile({ ...profile, email: newEmail });
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!curPw || !newPw || !confirmPw) return;
    if (newPw.length < 8) {
      setPwError("New password must be at least 8 characters.");
      return;
    }
    if (newPw !== confirmPw) {
      setPwError("New passwords do not match.");
      return;
    }
    setPwError(null);
    setPwSuccess(null);
    setPwLoading(true);

    const { error } = await api.changePassword(curPw, newPw);
    setPwLoading(false);

    if (error) {
      setPwError(error);
    } else {
      setCurPw("");
      setNewPw("");
      setConfirmPw("");
      setPwSuccess("Password changed. Other devices have been signed out.");
    }
  };

  const handleCancelDeletion = async () => {
    const { error } = await api.cancelDeletion();
    if (error) {
      alert(`Failed to cancel: ${error}`);
      return;
    }
    if (profile) setProfile({ ...profile, deletion_at: null });
    alert("Account deletion cancelled.");
  };

  const handleConfirmDeletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || deleteConfirmEmail.trim().toLowerCase() !== profile.email.toLowerCase()) {
      setDeleteError("Email does not match.");
      return;
    }
    setDeleteError(null);
    setDeleteLoading(true);

    const { data, error } = await api.deleteAccount<{ deletion_at: string }>();
    setDeleteLoading(false);

    if (error) {
      setDeleteError(error);
    } else {
      setDeleteOpen(false);
      setDeleteConfirmEmail("");
      if (profile && data) setProfile({ ...profile, deletion_at: data.deletion_at });
      alert("Account scheduled for deletion. You can cancel any time before the timer ends.");
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 flex flex-col selection:bg-emerald-500/30 selection:text-emerald-400">
      <AppHeader email={profile?.email} />

      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-8 sm:px-6">
        <PlatformPageHeader
          eyebrow="Account"
          title="Your account"
          description="Profile, security, and active sessions."
        />

        {/* Deletion Countdown Banner */}
        {profile?.deletion_at && (
          <div className="flex flex-col gap-4 rounded-xl border border-red-900/50 bg-red-950/80 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex flex-col gap-0.5">
              <span className="type-label text-red-200">Account scheduled for deletion</span>
              <span className="type-metadata text-red-300">
                Your account will be deleted in: <strong className="type-mono font-semibold">{countdown}</strong>
              </span>
            </div>
            <Button variant="outline" onClick={handleCancelDeletion} className="min-h-11 border-red-900/80 text-red-300 hover:bg-red-900/20">
              Cancel deletion
            </Button>
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center type-body-sm text-zinc-400">Loading account settings…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Account Details */}
            <div className="flex flex-col gap-6 md:col-span-1">
              <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
                <CardHeader>
                  <CardTitle className="type-card-title text-zinc-100">Profile info</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm">
                  <div className="flex flex-col gap-1">
                    <span className="type-overline text-zinc-400">Email address</span>
                    <span className="break-all text-zinc-100">{profile?.email}</span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="type-overline text-zinc-400">Member since</span>
                    <span className="type-metadata text-zinc-200">
                      {profile ? new Date(profile.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  {!profile?.email_verified && (
                    <div className="mt-2 flex flex-col gap-2 rounded-lg border border-amber-900/40 bg-amber-950/20 p-3">
                      <span className="type-body-sm text-amber-300">Email is not verified yet. Verify it to unlock all fleet actions.</span>
                      <Button size="sm" variant="outline" onClick={handleResendVerify} className="min-h-11 w-full border-amber-900/60 text-amber-300 hover:bg-amber-900/10">
                        Resend email
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GDPR Portability & Export */}
              <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
                <CardHeader>
                  <CardTitle className="type-card-title text-zinc-100">Data privacy</CardTitle>
                  <p className="type-body-sm text-zinc-400">
                    GDPR data portability
                  </p>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportData} className="min-h-11 w-full bg-zinc-800 text-zinc-100 hover:bg-zinc-700">
                    Download my data
                  </Button>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              {!profile?.deletion_at && (
                <Card className="bg-zinc-900 p-4 ring-1 ring-red-900/40">
                  <div className="flex flex-col gap-3">
                    <div className="flex flex-col gap-1">
                      <span className="type-card-title text-zinc-100">Delete account</span>
                      <span className="type-body-sm text-zinc-400">
                        Permanently delete your profile and telemetry logs.
                      </span>
                    </div>
                    <Button
                      variant="destructive"
                      onClick={() => setDeleteOpen(true)}
                      className="min-h-11 w-full"
                    >
                      Delete account
                    </Button>
                  </div>
                </Card>
              )}
            </div>

            {/* Forms section */}
            <div className="flex flex-col gap-6 md:col-span-2">
              {/* Update Email */}
              <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
                <CardHeader>
                  <CardTitle className="type-card-title text-zinc-100">Update email</CardTitle>
                  <p className="type-body-sm text-zinc-400">
                    Change the email address used to log in
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateEmail} className="flex flex-col gap-4">
                    {emailError && (
                      <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 type-body-sm text-red-300">
                        {emailError}
                      </div>
                    )}
                    {emailSuccess && (
                      <div role="status" className="rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3.5 py-2.5 type-body-sm text-emerald-300">
                        {emailSuccess}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className={FIELD_LABEL_CLASS} htmlFor="newEmail">New email</label>
                      <input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        required
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={FIELD_LABEL_CLASS} htmlFor="emailPw">Current password</label>
                      <input
                        id="emailPw"
                        type="password"
                        value={emailPw}
                        onChange={(e) => setEmailPw(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={FIELD_CLASS}
                      />
                    </div>
                    <Button type="submit" disabled={emailLoading} className="min-h-11 self-start px-6">
                      {emailLoading ? "Updating…" : "Update email"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Active sessions */}
              <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
                <CardHeader>
                  <CardTitle className="type-card-title text-zinc-100">Active sessions</CardTitle>
                  <p className="type-body-sm text-zinc-400">
                    Where your account is signed in. Revoke anything you do not recognise.
                  </p>
                </CardHeader>
                <CardContent className="flex flex-col gap-4">
                  {sessionsError && (
                    <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 type-body-sm text-red-300">
                      {sessionsError}
                    </div>
                  )}

                  {sessionsLoading ? (
                    <p className="type-body-sm text-zinc-400">Loading sessions…</p>
                  ) : sessions.length === 0 ? (
                    <p className="type-body-sm text-zinc-400">No active sessions.</p>
                  ) : (
                    <ul className="flex flex-col divide-y divide-zinc-800 rounded-lg border border-zinc-800">
                      {sessions.map((session) => (
                        <li key={session.id} className="flex flex-col justify-between gap-3 p-3 sm:flex-row sm:items-center">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="type-label text-zinc-100">
                                {describeUserAgent(session.user_agent)}
                              </span>
                              {session.current && (
                                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                                  This device
                                </span>
                              )}
                            </div>
                            <div className="type-metadata mt-0.5 text-zinc-400">
                              <span className="type-mono">{session.ip ?? "IP unknown"}</span> · active {formatWhen(session.last_seen_at, now)}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={sessionsBusy !== null}
                            onClick={() => handleRevokeSession(session.id)}
                            className="min-h-11 whitespace-nowrap border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                          >
                            {sessionsBusy === session.id
                              ? "Revoking…"
                              : session.current ? "Sign out this device" : "Revoke"}
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={sessionsBusy !== null || sessions.length < 2}
                      onClick={handleRevokeOtherSessions}
                      className="min-h-11 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                    >
                      {sessionsBusy === "others" ? "Signing out…" : "Sign out other devices"}
                    </Button>
                    <span className="type-metadata text-zinc-400">
                      Revoking takes effect immediately, even for a copied token.
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Update Password */}
              <Card className="bg-zinc-900 ring-1 ring-zinc-800/80">
                <CardHeader>
                  <CardTitle className="type-card-title text-zinc-100">Change password</CardTitle>
                  <p className="type-body-sm text-zinc-400">
                    Change password and sign out other sessions
                  </p>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                    {pwError && (
                      <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 type-body-sm text-red-300">
                        {pwError}
                      </div>
                    )}
                    {pwSuccess && (
                      <div role="status" className="rounded-lg border border-emerald-900/50 bg-emerald-950/40 px-3.5 py-2.5 type-body-sm text-emerald-300">
                        {pwSuccess}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className={FIELD_LABEL_CLASS} htmlFor="curPw">Current password</label>
                      <input
                        id="curPw"
                        type="password"
                        value={curPw}
                        onChange={(e) => setCurPw(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={FIELD_LABEL_CLASS} htmlFor="newPw">New password</label>
                      <input
                        id="newPw"
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min 8 characters"
                        required
                        className={FIELD_CLASS}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className={FIELD_LABEL_CLASS} htmlFor="confirmPw">Confirm new password</label>
                      <input
                        id="confirmPw"
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder="••••••••"
                        required
                        className={FIELD_CLASS}
                      />
                    </div>
                    <Button type="submit" disabled={pwLoading} className="min-h-11 self-start px-6">
                      {pwLoading ? "Changing…" : "Change password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); setDeleteError(null); }}>
        <DialogContent className="bg-zinc-900 text-zinc-100 ring-zinc-800/80">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete account</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete your account, paired devices, and history logs after a 30-day grace period.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDeletion} className="flex flex-col gap-4 py-4">
            {deleteError && (
              <div role="alert" className="rounded-lg border border-red-900/50 bg-red-950/40 px-3.5 py-2.5 type-body-sm text-red-300">
                {deleteError}
              </div>
            )}
            <div className="flex flex-col gap-1.5">
              <label className={FIELD_LABEL_CLASS} htmlFor="confirmEmail">
                Type your email <strong className="type-mono font-semibold text-zinc-100">{profile?.email}</strong> to confirm:
              </label>
              <input
                id="confirmEmail"
                type="text"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder="Type email address"
                required
                className={FIELD_CLASS}
              />
            </div>
            <DialogFooter className="mt-2 gap-2 sm:gap-0">
              <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} className="min-h-11 text-zinc-400 hover:text-zinc-100">
                Cancel
              </Button>
              <Button type="submit" disabled={deleteLoading} variant="destructive" className="min-h-11">
                {deleteLoading ? "Scheduling…" : "Schedule deletion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
