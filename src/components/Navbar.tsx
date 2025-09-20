import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- Navbar Component ---
export default function Navbar() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ first_name: string, role: string } | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data: profileData } = await supabase
          .from('user_roles')
          .select('first_name, role')
          .eq('user_id', session.user.id)
          .single();
        setUserProfile(profileData);
      }
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        // Re-fetch profile when auth state changes to logged in
        fetchSessionAndProfile();
      } else {
        // Clear profile on logout
        setUserProfile(null);
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const getDashboardLink = () => {
    if (!userProfile) return "/";
    switch (userProfile.role) {
      case 'student': return '/student/dashboard';
      case 'faculty': return '/faculty/dashboard';
      case 'rep': return '/rep/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return "/";
    }
  };

  return (
    <header className="w-full bg-uga-black text-uga-white shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer">
              {/* CORRECTED: Replaced placeholder with official UGA Arch Logo SVG */}
              <svg width="50" height="50" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M128 128H0V0H128V128ZM38.3999 92.8V60.9333H21.3333V92.8H38.3999ZM52.2666 92.8V35.2H69.3333V92.8H52.2666ZM73.1999 92.8V60.9333H90.2666V92.8H73.1999ZM107.733 92.8V35.2H90.2666V57.0667H73.1999V35.2H52.2666V57.0667H38.3999V35.2H21.3333V57.0667H3.8147e-06V96.6667H128V0H111.6V92.8H107.733Z" fill="white"/>
              </svg>
              <span className="text-2xl font-heading font-bold hover:text-uga-red transition-colors">
                UGA Job Board
              </span>
            </div>
          </Link>
          <div className="flex items-center space-x-6">
            {session ? (
              <>
                <span className="font-body">Welcome, {userProfile?.first_name || 'User'}</span>
                {router.pathname === "/" && userProfile && (
                   <Link href={getDashboardLink()}>
                     <span className="font-body font-bold text-uga-white bg-uga-red px-4 py-2 rounded-md hover:bg-opacity-80 transition-colors cursor-pointer">
                      My Dashboard
                     </span>
                   </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="font-body font-bold bg-gray-700 hover:bg-uga-red px-4 py-2 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span className="font-body hover:text-uga-red transition-colors cursor-pointer">Login</span>
                </Link>
                <Link href="/signup-student">
                  <span className="font-body hover:text-uga-red transition-colors cursor-pointer">Student Sign Up</span>
                </Link>
                <Link href="/signup">
                  <span className="font-body font-bold text-uga-white bg-uga-red px-4 py-2 rounded-md hover:bg-opacity-80 transition-colors cursor-pointer">
                    Company Sign Up
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

