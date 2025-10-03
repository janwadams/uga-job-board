//components/Navbar.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// search icon svg for the uga global links
const SearchIcon = () => (
    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);


// mobile menu hamburger icon - three lines
const MenuIcon = () => (
    <div className="w-6 h-6 flex flex-col justify-center gap-1">
        <div className="w-full h-0.5 bg-black"></div>
        <div className="w-full h-0.5 bg-black"></div>
        <div className="w-full h-0.5 bg-black"></div>
    </div>
);





// close x icon for mobile menu
const CloseIcon = () => (
    <div className="w-6 h-6 flex items-center justify-center">
        <span className="text-uga-red text-2xl font-bold leading-none">×</span>
    </div>
);

// main navbar component that appears on all pages
export default function Navbar() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<{ first_name: string, role: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
    setMobileMenuOpen(false);
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
        <div className="flex items-center justify-between h-16 sm:h-20">
          {/* logo section - smaller on mobile, bigger on desktop */}
          <Link href="/">
            <div className="flex items-center space-x-2 sm:space-x-4 cursor-pointer group">
              <img 
                src="/images/uga-logo.png" 
                alt="UGA Logo" 
                className="h-8 sm:h-12 w-auto"
              />
              {/* hide full university name on small screens */}
              <span className="hidden sm:block text-lg md:text-2xl font-oswald font-bold text-uga-white transition-colors tracking-wide">
                UNIVERSITY OF GEORGIA
              </span>
              {/* show short version on mobile */}
              <span className="sm:hidden text-lg font-oswald font-bold text-uga-white">
                UGA
              </span>
            </div>
          </Link>

          {/* desktop navigation - hidden on tablets and phones */}
          <div className="hidden md:flex items-center space-x-6">
            {/* main app navigation links */}
            <div className="flex items-center space-x-6 font-merriweather-sans">
                 {session ? (
                  <>
                    <span className="font-medium">Welcome, {userProfile?.first_name || 'User'}</span>
                    {router.pathname === "/" && userProfile && (
                       <Link href={getDashboardLink()}>
                         <span className="font-semibold text-uga-red bg-uga-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors cursor-pointer">
                          My Dashboard
                         </span>
                       </Link>
                    )}
                    <button
                      onClick={handleSignOut}
                      className="font-semibold bg-uga-black bg-opacity-20 hover:bg-opacity-40 px-4 py-2 rounded-md transition-colors"
                    >
                      Sign Out
                    </button>
                  </>
                ) : (
                  <>
                    <Link href="/login">
                      <span className="hover:text-gray-200 transition-colors cursor-pointer">Login</span>
                    </Link>
                    <Link href="/signup-student">
                      <span className="hover:text-gray-200 transition-colors cursor-pointer">Student Sign Up</span>
                    </Link>
                    <Link href="/signup">
                      <span className="font-semibold text-uga-red bg-uga-white px-4 py-2 rounded-md hover:bg-opacity-90 transition-colors cursor-pointer">
                        Company Sign Up
                      </span>
                    </Link>
                  </>
                )}
            </div>

            {/* vertical divider line */}
            <div className="h-6 w-px bg-white bg-opacity-30"></div>

            {/* uga external links */}
            <div className="flex items-center space-x-5 text-sm font-merriweather-sans">
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

          {/* mobile menu hamburger button - make it stand out with better visibility */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-md bg-white text-uga-red transition-colors hover:bg-gray-100 flex items-center gap-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <CloseIcon /> : <MenuIcon />}
            <span className="text-sm font-medium">Menu</span>
          </button>
        </div>

        {/* mobile dropdown menu - shows when hamburger is clicked */}
        {mobileMenuOpen && (
          <div className="md:hidden pb-4 bg-uga-red">
            <div className="flex flex-col space-y-3 pt-4 border-t border-red-700">
              {session ? (
                <>
                  {/* logged in user mobile menu */}
                  <span className="text-sm text-white opacity-90 px-3">Welcome, {userProfile?.first_name || 'User'}</span>
                  {router.pathname === "/" && userProfile && (
                    <Link href={getDashboardLink()}>
                      <span 
                        onClick={() => setMobileMenuOpen(false)}
                        className="block mx-3 px-3 py-2 text-sm font-semibold bg-white text-uga-red rounded-md text-center"
                      >
                        My Dashboard
                      </span>
                    </Link>
                  )}
                  <button
                    onClick={handleSignOut}
                    className="mx-3 px-3 py-2 text-sm font-semibold bg-red-700 text-white rounded-md text-left"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  {/* not logged in mobile menu with login and signup options */}
                  <Link href="/login">
                    <span 
                      onClick={() => setMobileMenuOpen(false)}
                      className="block mx-3 px-3 py-2 text-white bg-red-700 hover:bg-red-800 rounded-md"
                    >
                      Login
                    </span>
                  </Link>
                  <Link href="/signup-student">
                    <span 
                      onClick={() => setMobileMenuOpen(false)}
                      className="block mx-3 px-3 py-2 text-white bg-red-700 hover:bg-red-800 rounded-md"
                    >
                      Student Sign Up
                    </span>
                  </Link>
                  <Link href="/signup">
                    <span 
                      onClick={() => setMobileMenuOpen(false)}
                      className="block mx-3 px-3 py-2 font-semibold bg-white text-uga-red rounded-md text-center"
                    >
                      Company Sign Up
                    </span>
                  </Link>
                </>
              )}
              
              {/* uga external links for mobile */}
              <div className="border-t border-red-700 pt-3 mt-3">
                <div className="grid grid-cols-3 gap-2 text-xs px-3">
                  <a href="https://www.uga.edu" target="_blank" rel="noopener noreferrer" className="text-center py-2 text-white">UGA</a>
                  <a href="https://give.uga.edu/" target="_blank" rel="noopener noreferrer" className="text-center py-2 text-white">Give</a>
                  <a href="https://calendar.uga.edu/" target="_blank" rel="noopener noreferrer" className="text-center py-2 text-white">Calendar</a>
                  <a href="https://news.uga.edu/" target="_blank" rel="noopener noreferrer" className="text-center py-2 text-white">News</a>
                  <a href="https://my.uga.edu/" target="_blank" rel="noopener noreferrer" className="text-center py-2 text-white">MyUGA</a>
                  <a href="https://www.uga.edu/search.php" target="_blank" rel="noopener noreferrer" className="text-center py-2 text-white">Search</a>
                </div>
              </div>
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}