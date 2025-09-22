//pages/_app.tsx

import 'styles/globals.css';
import type { AppProps } from 'next/app';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { useState } from 'react';
import Navbar from 'components/Navbar';
import UgaGlobalHeader from 'components/UgaGlobalHeader'; // Import the new component

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
      {/* This wrapper applies the UGA brand fonts and background color */}
      <div className="font-body bg-uga-light-gray min-h-screen">
        <UgaGlobalHeader /> {/* The new black UGA global header */}
        <Navbar />          {/* Your existing red job board navbar */}
        
        {/* This main tag ensures every page has a consistent layout and padding */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Component {...pageProps} />
        </main>
      </div>
    </SessionContextProvider>
  );
}

export default App;

