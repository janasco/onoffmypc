"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { api } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;
    setLoading(true);
    setError(null);

    const { data, error: apiError } = await api.login(email, password);
    setLoading(false);

    if (apiError) {
      setError(apiError === "unauthorized" ? "Invalid email or password." : apiError);
    } else if (data) {
      router.push("/dashboard");
    }
  };

  const handleSocialAuth = (provider: string) => {
    // Social login flows: Redirect to identity providers or open MSAL/Google overlays
    console.log(`OAuth login initiated for provider: ${provider}`);
    // Redirect to API OIDC endpoints (which is what Apple/Microsoft redirect flows do)
    window.location.href = `https://api.onoffmypc.com/auth/${provider}`;
  };

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col justify-center items-center p-4 selection:bg-emerald-500/30 selection:text-emerald-400">
      <div className="w-full max-w-sm flex flex-col gap-6">
        <Link href="/" className="flex items-center gap-2 font-semibold text-lg hover:opacity-90 transition-opacity self-center text-zinc-100">
          <span className="text-emerald-500">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M12 3v9" />
              <path d="M8.5 6.5a6.5 6.5 0 1 0 7 0" />
            </svg>
          </span>
          OnOffMyPC
        </Link>

        <Card className="bg-zinc-900 border-zinc-800">
          <CardHeader>
            <CardTitle className="text-zinc-100 text-xl font-bold">Welcome back</CardTitle>
            <CardDescription className="text-zinc-400">
              Sign in to your remote power dashboard
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div className="bg-red-950/40 border border-red-900/50 text-red-400 text-sm px-3.5 py-2.5 rounded-lg">
                  {error}
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-zinc-400" htmlFor="email">Email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-zinc-400" htmlFor="password">Password</label>
                  <Link href="/forgot-password" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                    Forgot password?
                  </Link>
                </div>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="bg-zinc-950 border border-zinc-800 focus:border-zinc-700 rounded-lg h-10 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none transition-colors"
                />
              </div>
              <Button type="submit" disabled={loading} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-10 mt-2">
                {loading ? "Signing in…" : "Sign In"}
              </Button>
            </form>

            <div className="relative my-6 text-center">
              <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-b border-zinc-800"></span>
              <span className="relative bg-zinc-900 px-3 text-xs text-zinc-500 uppercase tracking-wider">or</span>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                variant="outline"
                onClick={() => handleSocialAuth("google")}
                className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-950 hover:text-zinc-100 h-10 flex gap-2 justify-center items-center font-medium"
              >
                <span className="text-lg">Google</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialAuth("apple")}
                className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-950 hover:text-zinc-100 h-10 flex gap-2 justify-center items-center font-medium"
              >
                <span className="text-lg">Apple</span>
              </Button>
              <Button
                variant="outline"
                onClick={() => handleSocialAuth("microsoft")}
                className="w-full border-zinc-800 text-zinc-300 hover:bg-zinc-950 hover:text-zinc-100 h-10 flex gap-2 justify-center items-center font-medium"
              >
                <span className="text-lg">Microsoft</span>
              </Button>
            </div>
          </CardContent>
          <CardFooter className="justify-center border-t border-zinc-800/60 pt-6">
            <p className="text-sm text-zinc-400">
              Don't have an account?{" "}
              <Link href="/register" className="text-emerald-500 hover:text-emerald-400 font-semibold transition-colors">
                Sign up
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
