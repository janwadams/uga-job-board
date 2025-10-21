// pages/_app.tsx // //
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer'; // added for footer
import '../styles/globals.css';
import '../styles/mobile-fixes.css';

function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  const [supabaseClient] = useState(() =>
    createBrowserSupabaseClient()
  );

  return (
    <SessionContextProvider
      supabaseClient={supabaseClient}
      initialSession={pageProps.initialSession}
    >
      {/* UPDATE: Change to flex container with min-height */}
      <div className="font-merriweather-sans bg-uga-light-gray min-h-screen flex flex-col">
        <Navbar />
        {/* UPDATE: Add flex-grow to push footer to bottom */}
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          <Component {...pageProps} />
        </main>
        <Footer /> {/* added for footer */}
      </div>
    </SessionContextProvider>
  );
}

export default App;