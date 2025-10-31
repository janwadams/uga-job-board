//pages/_app.tsx

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from 'components/Navbar';
import 'styles/globals.css';

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // Your existing Supabase client setup is preserved
  const [supabaseClient] = useState(() =>
    createBrowserSupabaseClient()
  );

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      {/* This wrapper applies the UGA brand fonts and background color to every page */}
      <div className="font-body bg-uga-light-gray min-h-screen">
        <Navbar />
        {/* This main tag ensures every page has a consistent layout and padding */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Component {...pageProps} />
        </main>
      </div>
    </SessionContextProvider>
  );
}

export default App;

