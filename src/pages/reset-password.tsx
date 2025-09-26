// /pages/reset-password.tsx
// page where users set their new password
// in test mode, allows password reset without email verification

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { useRouter } from 'next/router';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// eye icon components
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.673.124 2.468.352M10.582 10.582a3 3 0 11-4.243 4.243M8 12a4 4 0 004 4m0 0l6-6m-6 6l-6-6" />
  </svg>
);

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [success, setSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isValidToken, setIsValidToken] = useState(false);
  const [checkingToken, setCheckingToken] = useState(true);
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    // check if we're in test mode
    const isTestMode = router.query.test === 'true';
    
    if (isTestMode) {
      // test mode - get email from localStorage
      const email = localStorage.getItem('reset_email');
      if (email) {
        setTestEmail(email);
        setIsValidToken(true);
      } else {
        setErrorMsg('Test mode error: No email found. Please start from forgot password page.');
      }
      setCheckingToken(false);
    } else {
      // production mode - check for valid session from reset link
      const checkSession = async () => {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session) {
          setIsValidToken(true);
        } else {
          // check if there's an error in the URL (happens with expired links)
          const error = new URLSearchParams(window.location.search).get('error');
          if (error) {
            setErrorMsg('Password reset link is invalid or has expired. Please request a new one.');
          }
        }
        setCheckingToken(false);
      };

      checkSession();
    }
  }, [router.query.test]);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    // validate passwords match
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match.');
      return;
    }

    // validate password strength
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    // check if we're in test mode
    const isTestMode = router.query.test === 'true';
    
    if (isTestMode && testEmail) {
      // test mode - update password using our api endpoint
      try {
        const response = await fetch('/api/admin/reset-password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: testEmail,
            newPassword: password,
            testMode: true
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          setErrorMsg(data.error || 'Failed to update password');
          setLoading(false);
          return;
        }

        // clear the stored email
        localStorage.removeItem('reset_email');
        
        // show success
        setSuccess(true);
        setLoading(false);
        
        // redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
        
      } catch (error) {
        console.error('Error updating password:', error);
        setErrorMsg('Failed to update password. Please try again.');
        setLoading(false);
        return;
      }
      
    } else {
      // production mode - update via supabase
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setErrorMsg('Error updating password: ' + error.message);
        setLoading(false);
        return;
      }

      // success - show message and redirect
      setSuccess(true);
      setLoading(false);

      // redirect to login after 3 seconds
      setTimeout(() => {
        router.push('/login');
      }, 3000);
    }
  };

  // show loading while checking token
  if (checkingToken) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow bg-white">
        <div className="text-center">
          <p className="text-gray-600">Verifying reset link...</p>
        </div>
      </div>
    );
  }

  // show error if token is invalid
  if (!isValidToken && !success) {
    return (
      <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow bg-white">
        <div className="text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Invalid or Expired Link</h2>
          
          <p className="text-gray-600 mb-6">
            {errorMsg || "This password reset link is invalid or has expired."}
          </p>

          <Link href="/forgot-password">
            <button className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded">
              Request New Reset Link
            </button>
          </Link>

          <div className="mt-4">
            <Link href="/login">
              <span className="text-sm text-gray-600 hover:text-gray-800 hover:underline cursor-pointer">
                Back to Login
              </span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center text-red-700">Set New Password</h1>

      {/* test mode warning banner */}
      {router.query.test === 'true' && (
        <div className="bg-yellow-50 border border-yellow-200 rounded p-3 mb-4">
          <p className="text-sm text-yellow-800">
            <strong>Test Mode Active:</strong> Resetting password for {testEmail}
          </p>
        </div>
      )}

      {!success ? (
        <>
          <p className="text-gray-600 mb-6 text-center">
            Enter your new password below. Make sure it's at least 6 characters long.
          </p>

          <form onSubmit={handlePasswordReset} className="space-y-4">
            {/* new password field */}
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="New Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full border p-2 rounded pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center"
                aria-label="Toggle password visibility"
              >
                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {/* confirm password field */}
            <div className="relative">
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Confirm New Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full border p-2 rounded pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 px-3 flex items-center"
                aria-label="Toggle confirm password visibility"
              >
                {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
              </button>
            </div>

            {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded disabled:bg-gray-400"
            >
              {loading ? 'Updating...' : 'Update Password'}
            </button>
          </form>
        </>
      ) : (
        // success message
        <div className="text-center">
          <div className="mb-6">
            <svg className="mx-auto h-12 w-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          
          <h2 className="text-xl font-semibold text-gray-800 mb-4">
            {router.query.test === 'true' ? 'Test Password Updated!' : 'Password Updated!'}
          </h2>
          
          <p className="text-gray-600 mb-6">
            {router.query.test === 'true' 
              ? `Password for ${testEmail} has been updated (simulated). You will be redirected to login...`
              : 'Your password has been successfully updated. You will be redirected to the login page in a moment...'
            }
          </p>

          <Link href="/login">
            <button className="bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded">
              Go to Login Now
            </button>
          </Link>
        </div>
      )}

      {/* link back to login */}
      {!success && (
        <div className="mt-6 text-center">
          <Link href="/login">
            <span className="text-sm text-gray-600 hover:text-gray-800 hover:underline cursor-pointer">
              ← Back to Login
            </span>
          </Link>
        </div>
      )}
    </div>
  );
}