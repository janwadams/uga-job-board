// /pages/forgot-password.tsx
// page where users request a password reset link
// in test mode, bypasses email and goes directly to reset page

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';
import { useRouter } from 'next/router';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// check if we're in test mode - set this to true for development
const IS_TEST_MODE = true; // change this to false for production

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

    // in test mode, skip email and go directly to reset page
    if (IS_TEST_MODE) {
      // store the email temporarily so we know which user is resetting
      localStorage.setItem('reset_email', email);
      
      // show success message briefly then redirect
      setSuccess(true);
      setLoading(false);
      
      setTimeout(() => {
        router.push('/reset-password?test=true');
      }, 2000);
      
      return;
    }

    // production mode - send actual email
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
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

      {/* test mode warning banner */}
      {IS_TEST_MODE && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Test Mode Active:</strong> Email sending is bypassed for testing.
          </p>
        </div>
      )}

      {!success ? (
        <>
          <p className="text-gray-600 mb-6 text-center">
            {IS_TEST_MODE 
              ? "Enter your email address to test the password reset flow."
              : "Enter your email address and we'll send you a link to reset your password."
            }
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
              {loading ? 'Processing...' : IS_TEST_MODE ? 'Continue to Reset' : 'Send Reset Link'}
            </button>
          </form>
        </>
      ) : (
        // success message after email is sent or test mode activated
        <div className="text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          {IS_TEST_MODE ? (
            <>
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Test Mode: Redirecting...</h2>
              <p className="text-gray-600 mb-6">
                Taking you to the password reset page for <strong>{email}</strong>
              </p>
            </>
          ) : (
            <>
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
            </>
          )}
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