"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { api } from "@/lib/api";

interface UserProfile {
  email: string;
  created_at: string;
  email_verified: boolean;
  deletion_at: string | null;
}

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

  // Countdown timer for deletion
  const [countdown, setCountdown] = useState("");

  // Deletion Modal
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState("");
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const loadProfile = async () => {
    setLoading(true);
    const { data, status } = await api.me();
    if (status === 401) {
      router.push("/login.html");
      return;
    }
    if (data) setProfile(data);
    setLoading(false);
  };

  useEffect(() => {
    loadProfile();
  }, []);

  useEffect(() => {
    if (!profile?.deletion_at) {
      setCountdown("");
      return;
    }

    const target = new Date(profile.deletion_at).getTime();
    const tick = () => {
      const ms = target - Date.now();
      if (ms <= 0) {
        setCountdown("Deleting now…");
        return;
      }
      const s = Math.floor(ms / 1000);
      const d = Math.floor(s / 86400);
      const h = Math.floor((s % 86400) / 3600);
      const m = Math.floor((s % 3600) / 60);
      const sec = s % 60;
      setCountdown(`${d}d ${h}h ${m}m ${sec}s`);
    };

    tick();
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [profile?.deletion_at]);

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

    const { data, error } = await api.deleteAccount();
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
      {/* Header */}
      <header className="border-b border-zinc-900 bg-zinc-950">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-3 hover:opacity-90 transition-opacity">
            <span className="text-emerald-500">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 3v9" />
                <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
              </svg>
            </span>
            <span className="font-semibold text-lg text-zinc-100">OnOffMyPC</span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/dashboard">
              <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-zinc-100">
                ← Dashboard
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-8 flex flex-col gap-6">
        {/* Deletion Countdown Banner */}
        {profile?.deletion_at && (
          <div className="bg-red-950/80 border border-red-900/50 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-red-200 text-sm">Account scheduled for deletion</span>
              <span className="text-xs text-red-400">Your account will be deleted in: <strong className="font-mono">{countdown}</strong></span>
            </div>
            <Button variant="outline" onClick={handleCancelDeletion} className="border-red-900/80 hover:bg-red-900/20 text-red-300">
              Cancel deletion
            </Button>
          </div>
        )}

        {loading ? (
          <div className="text-center text-zinc-400 py-16">Loading account settings…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
            {/* Account Details */}
            <div className="md:col-span-1 flex flex-col gap-6">
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 text-lg font-bold">Profile Info</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 text-sm">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Email Address</span>
                    <span className="text-zinc-200 break-all">{profile?.email}</span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Member Since</span>
                    <span className="text-zinc-200">
                      {profile ? new Date(profile.created_at).toLocaleDateString() : ""}
                    </span>
                  </div>
                  {!profile?.email_verified && (
                    <div className="bg-amber-950/20 border border-amber-900/40 p-3 rounded-lg flex flex-col gap-2 mt-2">
                      <span className="text-xs text-amber-400">Email is not verified yet. Verify it to unlock all fleet actions.</span>
                      <Button size="sm" variant="outline" onClick={handleResendVerify} className="border-amber-900/60 hover:bg-amber-900/10 text-amber-300 w-full text-xs">
                        Resend email
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* GDPR Portability & Export */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 text-lg font-bold">Data Privacy</CardTitle>
                  <CardDescription className="text-zinc-400">
                    GDPR data portability
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button onClick={handleExportData} className="w-full bg-zinc-850 hover:bg-zinc-800 text-zinc-100 text-sm">
                    Download my data
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Forms section */}
            <div className="md:col-span-2 flex flex-col gap-6">
              {/* Update Email */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 text-lg font-bold">Update Email</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Change the email address used to log in
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdateEmail} className="flex flex-col gap-4">
                    {emailError && (
                      <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm px-3.5 py-2.5 rounded-lg">
                        {emailError}
                      </div>
                    )}
                    {emailSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-sm px-3.5 py-2.5 rounded-lg">
                        {emailSuccess}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400" htmlFor="newEmail">New Email</label>
                      <input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="new@example.com"
                        required
                        className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400" htmlFor="emailPw">Current Password</label>
                      <input
                        id="emailPw"
                        type="password"
                        value={emailPw}
                        onChange={(e) => setEmailPw(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <Button type="submit" disabled={emailLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 self-start px-6">
                      {emailLoading ? "Updating…" : "Update email"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Update Password */}
              <Card className="bg-zinc-900 border-zinc-800">
                <CardHeader>
                  <CardTitle className="text-zinc-100 text-lg font-bold">Change Password</CardTitle>
                  <CardDescription className="text-zinc-400">
                    Change password and sign out other sessions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleUpdatePassword} className="flex flex-col gap-4">
                    {pwError && (
                      <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm px-3.5 py-2.5 rounded-lg">
                        {pwError}
                      </div>
                    )}
                    {pwSuccess && (
                      <div className="bg-emerald-950/40 border border-emerald-900/50 text-emerald-400 text-sm px-3.5 py-2.5 rounded-lg">
                        {pwSuccess}
                      </div>
                    )}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400" htmlFor="curPw">Current Password</label>
                      <input
                        id="curPw"
                        type="password"
                        value={curPw}
                        onChange={(e) => setCurPw(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400" htmlFor="newPw">New Password</label>
                      <input
                        id="newPw"
                        type="password"
                        value={newPw}
                        onChange={(e) => setNewPw(e.target.value)}
                        placeholder="Min 8 characters"
                        required
                        className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-zinc-400" htmlFor="confirmPw">Confirm New Password</label>
                      <input
                        id="confirmPw"
                        type="password"
                        value={confirmPw}
                        onChange={(e) => setConfirmPw(e.target.value)}
                        placeholder="••••••••"
                        required
                        className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                      />
                    </div>
                    <Button type="submit" disabled={pwLoading} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 self-start px-6">
                      {pwLoading ? "Changing…" : "Change password"}
                    </Button>
                  </form>
                </CardContent>
              </Card>

              {/* Danger Zone */}
              {!profile?.deletion_at && (
                <Card className="bg-zinc-900 border-red-900/30 p-4">
                  <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-semibold text-zinc-200 text-sm">Delete account</span>
                      <span className="text-xs text-zinc-500">Permanently delete your profile and telemetry logs</span>
                    </div>
                    <Button variant="destructive" onClick={() => setDeleteOpen(true)} className="h-10 px-6 font-bold">
                      Delete account
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Delete Confirmation Modal */}
      <Dialog open={deleteOpen} onOpenChange={(open) => { setDeleteOpen(open); setDeleteError(null); }}>
        <DialogContent className="bg-zinc-900 border-zinc-800 text-zinc-100">
          <DialogHeader>
            <DialogTitle className="text-red-400 font-bold">Delete account</DialogTitle>
            <DialogDescription className="text-zinc-400">
              This will permanently delete your account, paired devices, and history logs after a 30-day grace period.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleConfirmDeletion} className="flex flex-col gap-4 py-4">
            {deleteError && (
              <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm px-3.5 py-2.5 rounded-lg">
                {deleteError}
              </div>
            )}
            <div className="flex flex-col gap-1.5 text-sm">
              <label className="text-xs font-semibold text-zinc-300" htmlFor="confirmEmail">
                Type your email <strong className="text-zinc-100 font-mono">{profile?.email}</strong> to confirm:
              </label>
              <input
                id="confirmEmail"
                type="text"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder="Type email address"
                required
                className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0 mt-2">
              <Button type="button" variant="ghost" onClick={() => setDeleteOpen(false)} className="text-zinc-400 hover:text-zinc-100">
                Cancel
              </Button>
              <Button type="submit" disabled={deleteLoading} variant="destructive">
                {deleteLoading ? "Scheduling…" : "Schedule deletion"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
