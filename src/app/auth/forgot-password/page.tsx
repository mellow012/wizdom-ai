'use client';

import Image from 'next/image';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { createClient } from '@/lib/supabase/client';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');

    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
    if (!isValidEmail) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);

    const redirectUrl = `${window.location.origin}/auth/update-password`;
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
      redirectTo: redirectUrl,
    });

    if (resetError) {
      console.error('Password reset request failed:', resetError);
    }

    setLoading(false);
    setMessage("If an account exists for that email, we've sent you a password reset link.");
    setEmail('');
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
          <CardDescription>Enter your email and we’ll send you a password reset link.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
            {message && <p className="text-sm text-foreground/80">{message}</p>}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending...' : 'Send reset link'}
            </Button>

            <div className="text-center text-sm">
              <Button type="button" variant="link" className="h-auto p-0" onClick={() => router.push('/login')}>
                Back to login
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
