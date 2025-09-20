//componemts/Navbar.tsx
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
        // Re-fetch profile when auth state changes
        fetchSessionAndProfile();
      } else {
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
    <header className="w-full bg-uga-black text-uga-white shadow-md font-body">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer group">
              {/* UGA Arch Logo SVG */}
              <svg className="h-10 w-10 text-white" fill="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z"/>
                <path d="M12 6c-2.21 0-4 1.79-4 4v2h8v-2c0-2.21-1.79-4-4-4zm0 6c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" fill="white"/>
                <path d="M8 14h2v2H8zm6 0h2v2h-2z" fill="white"/>
              </svg>
              <span className="text-2xl font-heading font-bold group-hover:text-uga-red transition-colors">
                UGA Job Board
              </span>
            </div>
          </Link>
          <div className="flex items-center space-x-6">
            {session ? (
              <>
                <span>Welcome, {userProfile?.first_name || 'User'}</span>
                {router.pathname === "/" && userProfile && (
                   <Link href={getDashboardLink()}>
                     <span className="font-bold text-uga-white bg-uga-red px-4 py-2 rounded-md hover:bg-opacity-80 transition-colors cursor-pointer">
                      My Dashboard
                     </span>
                   </Link>
                )}
                <button
                  onClick={handleSignOut}
                  className="font-bold bg-gray-700 hover:bg-uga-red px-4 py-2 rounded-md transition-colors"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <span className="hover:text-uga-red transition-colors cursor-pointer">Login</span>
                </Link>
                <Link href="/signup-student">
                  <span className="hover:text-uga-red transition-colors cursor-pointer">Student Sign Up</span>
                </Link>
                <Link href="/signup">
                  <span className="bg-uga-red px-4 py-2 rounded-md hover:bg-opacity-80 transition-colors cursor-pointer">
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

