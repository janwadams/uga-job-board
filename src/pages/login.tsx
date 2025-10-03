//src/pages/login.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// eye icon for showing password
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// eye off icon for hiding password
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.673.124 2.468.352M10.582 10.582a3 3 0 11-4.243 4.243M8 12a4 4 0 004 4m0 0l6-6m-6 6l-6-6" />
  </svg>
);


export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // controls password visibility

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMsg('Login failed: ' + authError.message);
      setLoading(false);
      return;
    }

    const userId = authData.user?.id;
    if (!userId) {
      setErrorMsg('Login failed. No user ID found.');
      setLoading(false);
      return;
    }

    // fetch user role from 'user_roles' table
    const { data: userData, error: userError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .single();

    if (userError || !userData) {
      setErrorMsg('Could not retrieve user role.');
      setLoading(false);
      return;
    }

    const role = userData.role;

    // route user by role
    switch (role) {
      case 'student':
        router.push('/student/dashboard');
        break;
      case 'faculty':
        router.push('/faculty/dashboard');
        break;
      case 'rep':
        router.push('/rep/dashboard');
        break;
      case 'admin':
        router.push('/admin/dashboard');
        break;
      default:
        setErrorMsg('Unknown role.');
        break;
    }

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center text-red-700">UGA Job Board Login</h1>

      <form onSubmit={handleLogin} className="space-y-4">
        <input
          type="email"
          placeholder="Email (e.g., student@demo.edu)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        {/* password input container with toggle button */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full border p-2 rounded"
            style={{ paddingRight: '45px' }}  // make room for the eye icon on the right
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            style={{
              position: 'absolute',
              right: '8px',  // position from the right edge
              top: '50%',  // center vertically
              transform: 'translateY(-50%)',  // center vertically
              background: 'none',
              border: 'none',
              padding: '4px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
			  zIndex: 10
            }}
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>

      {/* forgot password link */}
      <div className="mt-4 text-center">
        <Link href="/forgot-password">
          <span className="text-sm text-red-600 hover:text-red-800 hover:underline cursor-pointer">
            Forgot your password?
          </span>
        </Link>
      </div>
    </div>
  );
}