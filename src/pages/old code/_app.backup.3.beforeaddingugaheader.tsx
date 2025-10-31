
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from 'components/Navbar';
import 'styles/globals.css';

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // This Supabase client setup from your original file is correct and important.
  const [supabaseClient] = useState(() =>
    createBrowserSupabaseClient({
      supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL,
      supabaseKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    })
  );

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      {/* ADDED: Main wrapper to apply UGA fonts and background */}
      <div className="font-body bg-uga-light-gray min-h-screen">
        <Navbar />
        {/* UPDATED: main tag now has consistent padding and max-width */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Component {...pageProps} />
        </main>
      </div>
    </SessionContextProvider>
  );
}

export default App;







/*
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient());

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Navbar />
      <main className="max-w-4xl mx-auto p-4">
        <Component {...pageProps} />
      </main>
    </SessionContextProvider>
  );
}

export default App;

*/






// pages/_app.tsx
/**
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient({
    cookieOptions: {
      domain: process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost',
      path: '/'
    }
  }));

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Navbar />
      <main className="max-w-4xl mx-auto p-4">
        <Component {...pageProps} />
      </main>
    </SessionContextProvider>
  );
}

export default App;
*/

/*
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import '../styles/globals.css';

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const [supabaseClient] = useState(() => createBrowserSupabaseClient({
    cookieOptions: {
      domain: process.env.NEXT_PUBLIC_VERCEL_URL || 'localhost',
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Lax',
    },
  }));

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      <Navbar />
      <main className="max-w-4xl mx-auto p-4">
        <Component {...pageProps} />
      </main>
    </SessionContextProvider>
  );
}

export default App;
*/