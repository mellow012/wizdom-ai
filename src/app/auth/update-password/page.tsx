'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function validateRecoverySession() {
      try {
        const hash = window.location.hash.startsWith('#') ? window.location.hash.slice(1) : window.location.hash;
        const params = new URLSearchParams(hash);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (!mounted) return;

        if (!accessToken || !refreshToken) {
          setError('This password reset link is invalid or has expired. Please request a new reset link.');
          setCheckingSession(false);
          return;
        }

        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (!mounted) return;

        if (sessionError || !data.session) {
          setError('This password reset link is invalid or has expired. Please request a new reset link.');
          setCheckingSession(false);
          return;
        }

        setCheckingSession(false);
      } catch {
        if (!mounted) return;
        setError('This password reset link is invalid or has expired. Please request a new reset link.');
        setCheckingSession(false);
      }
    }

    void validateRecoverySession();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!newPassword || !confirmPassword) {
      setError('Both password fields are required.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    setLoading(true);

    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    setLoading(false);

    if (updateError) {
      const message = updateError.message || 'Failed to update your password.';
      setError(message);
      return;
    }

    setSuccess(true);
    setNewPassword('');
    setConfirmPassword('');

    setTimeout(() => {
      router.push('/login');
    }, 1800);
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Checking reset link…</CardTitle>
            <CardDescription>Please wait while we verify your recovery session.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-3 flex flex-col items-center justify-center gap-2">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-xl bg-transparent">
              <Image
                src="/wizdom-ai lgo.png"
                alt="Wizdom AI logo"
                width={64}
                height={64}
                className="h-full w-full scale-[0.9] rounded-xl object-cover"
                style={{ filter: 'contrast(1.12) saturate(1.08)' }}
              />
            </div>
            <CardTitle className="text-2xl font-bold">Wizdom AI</CardTitle>
          </div>
          <CardDescription>Choose a strong password for your Wizdom account.</CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 space-y-3">
              <p className="text-sm text-destructive">{error}</p>
              <Button type="button" variant="outline" className="w-full" onClick={() => router.push('/auth/forgot-password')}>
                Request a new reset link
              </Button>
            </div>
          )}

          {success ? (
            <div className="space-y-3 text-center">
              <p className="text-sm text-foreground/80">Your password has been updated successfully.</p>
              <p className="text-sm text-muted-foreground">Redirecting to login…</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowNewPassword((value) => !value)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm password</Label>
                <div className="relative">
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                    className="pr-10"
                  />
                  <button
                    type="button"
                    aria-label={showConfirmPassword ? 'Hide confirmation password' : 'Show confirmation password'}
                    onClick={() => setShowConfirmPassword((value) => !value)}
                    className="absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
