import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function Navbar() {
  const [session, setSession] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    const getSession = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
    };
    getSession();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <nav className="w-full p-4 bg-red-700 text-white flex justify-between items-center">
      <Link href="/">
        <span className="text-lg font-bold cursor-pointer">UGA Job Board</span>
      </Link>

      <div className="space-x-4">
        {session ? (
          <button
            onClick={handleSignOut}
            className="bg-white text-red-700 px-3 py-1 rounded font-semibold"
          >
            Sign Out
          </button>
        ) : (
          <Link href="/login">
            <span className="underline cursor-pointer">Login</span>
          </Link>
        )}
      </div>
    </nav>
  );
}
