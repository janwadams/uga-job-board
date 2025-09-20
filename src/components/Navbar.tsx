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
            <div className="flex items-center space-x-4 cursor-pointer group">
              {/* UPDATED: Replaced inline SVG with an img tag pointing to the official PNG logo */}
              <img 
                src="https://bitbucket.org/ugamc/uga-icons/src/master/icons/mstile-70x70.png?format=raw" 
                alt="UGA Arch Logo" 
                className="h-12 w-12"
              />
              <span className="text-2xl font-heading font-bold group-hover:text-uga-red transition-colors">
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

