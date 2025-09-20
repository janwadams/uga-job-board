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
    <header className="w-full bg-uga-black text-uga-white shadow-md">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <Link href="/">
            <div className="flex items-center space-x-4 cursor-pointer group">
              {/* CORRECTED: Official UGA Arch Logo SVG */}
              <svg className="h-10 w-10" viewBox="0 0 100 100" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path fillRule="evenodd" clipRule="evenodd" d="M50 0C22.3858 0 0 22.3858 0 50C0 77.6142 22.3858 100 50 100C77.6142 100 100 77.6142 100 50C100 22.3858 77.6142 0 50 0ZM50 93C26.2924 93 7 73.7076 7 50C7 26.2924 26.2924 7 50 7C73.7076 7 93 26.2924 93 50C93 73.7076 73.7076 93 50 93Z"/>
                <path d="M60 56.5H67V63.5H60V56.5Z"/>
                <path d="M33 56.5H40V63.5H33V56.5Z"/>
                <path d="M50 25C40.0751 25 32 33.0751 32 43V50H68V43C68 33.0751 59.9249 25 50 25ZM50 43C48.067 43 46.5 41.433 46.5 39.5C46.5 37.567 48.067 36 50 36C51.933 36 53.5 37.567 53.5 39.5C53.5 41.433 51.933 43 50 43Z"/>
              </svg>
              <span className="text-2xl font-heading font-bold text-white group-hover:text-uga-red transition-colors">
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
                  <span className="font-body bg-uga-red px-4 py-2 rounded-md hover:bg-opacity-80 transition-colors cursor-pointer">
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

