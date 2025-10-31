// pages/_app.tsx
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