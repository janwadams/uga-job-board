import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setErrorMsg('Login failed: ' + authError.message);
      setLoading(false);
      return;
    }

    // This client-side logic will not be executed because the middleware takes over after a successful login.
    // The middleware is responsible for redirecting the user.
    // The router.push() call is a fallback for development and local testing.
    router.push('/rep/dashboard');

    setLoading(false);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow">
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

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          className="w-full border p-2 rounded"
        />

        {errorMsg && <p className="text-red-600 text-sm">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded"
        >
          {loading ? 'Logging in...' : 'Log In'}
        </button>
      </form>
    </div>
  );
}
