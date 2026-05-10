'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useAuth } from '@ridendine/auth';
import { Button, Input } from '@ridendine/ui';
import { AuthLayout } from '../../../components/auth/auth-layout';

export default function ChefForgotPasswordPage() {
  const { resetPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await resetPassword(email);
      if (result.success) {
        setIsSubmitted(true);
        return;
      }
      setError(result.error || 'Failed to send reset email. Please try again.');
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <AuthLayout title="Check your email" subtitle="Password reset instructions are on the way">
        <div className="space-y-6">
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            We sent reset instructions to <span className="font-semibold">{email}</span>. Check your inbox and spam folder, then return here to sign in.
          </div>
          <div className="flex flex-col gap-3">
            <Link href="/auth/login">
              <Button className="w-full bg-[#E85D26] hover:bg-[#D04D16]">Back to sign in</Button>
            </Link>
            <button
              type="button"
              onClick={() => setIsSubmitted(false)}
              className="text-sm font-medium text-slate-600 hover:text-slate-900"
            >
              Send another reset email
            </button>
          </div>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Reset your password" subtitle="Enter your chef account email">
      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <Input
          label="Email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="chef@example.com"
          required
          autoComplete="email"
          autoFocus
        />

        <Button
          type="submit"
          className="w-full bg-[#E85D26] hover:bg-[#D04D16]"
          size="lg"
          loading={isSubmitting}
        >
          Send reset link
        </Button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/auth/login"
          className="text-sm font-medium text-[#E85D26] hover:text-[#D04D16]"
        >
          Back to sign in
        </Link>
      </div>
    </AuthLayout>
  );
}
