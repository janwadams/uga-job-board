// /pages/forgot-password.tsx
// page where users request a password reset link

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleResetRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccess(false);

    // request password reset from supabase
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      // this is where the user will be sent after clicking the link in their email
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMsg('Error sending reset email: ' + error.message);
      setLoading(false);
      return;
    }

    // show success message
    setSuccess(true);
    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center text-red-700">Reset Your Password</h1>

      {!success ? (
        <>
          <p className="text-gray-600 mb-6 text-center">
            Enter your email address and we'll send you a link to reset your password.
          </p>

          <form onSubmit={handleResetRequest} className="space-y-4">
            <input
              type="email"
              placeholder="Enter your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border p-2 rounded"
              disabled={loading}
            />

            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded disabled:bg-gray-400"
            >
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>
          </form>
        </>
      ) : (
        // success message after email is sent
        <div className="text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Check Your Email!</h2>
          
          <p className="text-gray-600 mb-6">
            We've sent a password reset link to <strong>{email}</strong>
          </p>
          
          <p className="text-sm text-gray-500 mb-6">
            The link will expire in 1 hour. If you don't see the email, check your spam folder.
          </p>

          <button
            onClick={() => setSuccess(false)}
            className="text-red-600 hover:text-red-800 text-sm underline"
          >
            Didn't receive the email? Try again
          </button>
        </div>
      )}

      {/* link back to login */}
      <div className="mt-6 text-center">
        <Link href="/login">
          <span className="text-sm text-gray-600 hover:text-gray-800 hover:underline cursor-pointer">
            ← Back to Login
          </span>
        </Link>
      </div>
    </div>
  );
}