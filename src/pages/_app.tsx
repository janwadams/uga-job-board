//pages/_app.tsx
// added import '../styles/mobile-fixes.css'; on 10/02

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from 'components/Navbar';
//import Footer from 'components/Footer';  //for footer
import 'styles/globals.css';
import '../styles/mobile-fixes.css';

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
      {/* Using Merriweather Sans as the default body font per UGA brand guidelines */}
      {/* It performs well at small sizes and in longer-form text */}
      <div className="font-merriweather-sans bg-uga-light-gray min-h-screen">
        <Navbar />
        {/* Main content area with consistent padding */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Component {...pageProps} />
        </main>
		{/* <Footer /> */} //added for footer
      </div>
    </SessionContextProvider>
  );
}

export default App;