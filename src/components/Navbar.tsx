
//components/Navbar.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Search Icon SVG for the UGA global links
const SearchIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

// --- Unified Navbar Component ---
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
    <header className="w-full bg-uga-red text-uga-white shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer group">
              <img 
                src="/images/uga-logo.png" 
                alt="UGA Logo" 
                className="h-12 w-auto"
              />
              <span className="text-2xl font-heading font-bold text-uga-white transition-colors">
                UNIVERSITY OF GEOGIA Job Board
              </span>
            </div>
          </Link>

          {/* Combined Navigation Links */}
          <div className="flex items-center space-x-6">
            {/* App-Specific Links */}
            <div className="flex items-center space-x-6">
                 {session ? (
                  <>
                    <span className="font-body">Welcome, {userProfile?.first_name || 'User'}</span>
                    {router.pathname === "/" && userProfile && (
                       <Link href={getDashboardLink()}>
                         <span className="font-body font-bold text-uga-red bg-uga-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors cursor-pointer">
                          My Dashboard
                         </span>
                       </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="font-body font-bold bg-uga-black bg-opacity-20 hover:bg-opacity-40 px-4 py-2 rounded-md transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <span className="font-body hover:text-gray-200 transition-colors cursor-pointer">Login</span>
                    </Link>
                    <Link href="/signup-student">
                      <span className="font-body hover:text-gray-200 transition-colors cursor-pointer">Student Sign Up</span>
                    </Link>
                    <Link href="/signup">
                      <span className="font-body font-bold text-uga-red bg-uga-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors cursor-pointer">
                        Company Sign Up
                      </span>
                    </Link>
                  </>
                )}
            </div>

            {/* Subtle Separator */}
            <div className="h-6 w-px bg-white bg-opacity-30"></div>

            {/* UGA Global Links */}
            <div className="hidden md:flex items-center space-x-5 text-sm">
                <a href="https://www.uga.edu" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">UGA</a>
                <a href="https://give.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">Give</a>
                <a href="https://calendar.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">Calendar</a>
                <a href="https://news.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">News</a>
                <a href="https://my.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">MyUGA</a>
                <a href="https://www.uga.edu/search.php" target="_blank" rel="noopener noreferrer" className="hover:text-gray-200">
                    <SearchIcon />
                </a>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

