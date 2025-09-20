//src/components/navbar.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface UserProfile {
  first_name: string;
  role: string;
}

export default function Navbar() {
  const [session, setSession] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const router = useRouter();

  useEffect(() => {
    const fetchSessionAndProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);

      if (session?.user) {
        const { data: profileData, error } = await supabase
          .from('user_roles')
          .select('first_name, role')
          .eq('user_id', session.user.id)
          .single();
        
        if (profileData) {
          setUserProfile(profileData);
        }
      } else {
        setUserProfile(null);
      }
    };

    fetchSessionAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (event === 'SIGNED_IN' && session?.user) {
          fetchSessionAndProfile();
        }
        if (event === 'SIGNED_OUT') {
          setUserProfile(null);
        }
      }
    );

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
    switch(userProfile.role) {
      case 'student': return '/student/dashboard';
      case 'rep': return '/rep/dashboard';
      case 'faculty': return '/faculty/dashboard';
      case 'admin': return '/admin/dashboard';
      default: return '/';
    }
  }

  return (
    <nav className="w-full p-4 bg-red-700 text-white flex justify-between items-center shadow-md">
      <Link href="/">
        <span className="text-lg font-bold cursor-pointer hover:opacity-90">UGA Job Board</span>
      </Link>

      <div className="flex items-center space-x-4">
        {session ? (
          <>
            {userProfile?.first_name && (
              <span className="text-sm">
                Welcome, {userProfile.first_name}
              </span>
            )}
            <Link href={getDashboardLink()}>
                <span className="text-sm font-medium underline cursor-pointer hover:text-gray-200">
                    My Dashboard
                </span>
            </Link>
            <button
              onClick={handleSignOut}
              className="bg-white text-red-700 px-3 py-1 rounded font-semibold hover:bg-gray-100"
            >
              Sign Out
            </button>
          </>
        ) : (
          <>
            <Link href="/login">
              <span className="underline cursor-pointer hover:text-gray-200">Login</span>
            </Link>
            <Link href="/signup-student">
              <span className="underline cursor-pointer hover:text-gray-200">Student Sign Up</span>
            </Link>
            <Link href="/signup">
              <span className="underline cursor-pointer hover:text-gray-200">Company Sign Up</span>
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}

