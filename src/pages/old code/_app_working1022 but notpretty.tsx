//pages/_app.tsx
// added import '../styles/mobile-fixes.css'; on 10/02

import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';
import { SessionContextProvider, Session } from '@supabase/auth-helpers-react';
import { AppProps } from 'next/app';
import { useState } from 'react';
import Navbar from 'components/Navbar';

import 'styles/globals.css';
import '../styles/mobile-fixes.css';



// Defining Footer directly here since  I couldnt get the import to work
// Define Footer directly here - based on official UGA footer structure
// Define Footer directly here - OFFICIAL UGA FOOTER ONLY
const Footer = () => (
  <footer id="ugafooter" className="bg-[#333333] text-white">
    <div className="container mx-auto px-4 py-10">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Column 1 - UGA Info */}
        <div>
          <img 
            src="https://www.uga.edu/_resources/images/uga-footer-logo.png" 
            alt="University of Georgia" 
            className="h-12 mb-4"
          />
          <p className="text-xs text-gray-400">
            University of Georgia<br />
            Athens, GA 30602<br />
            (706) 542-3000
          </p>
        </div>

        {/* Column 2 - Schools and Colleges */}
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase">Schools and Colleges</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://www.uga.edu/directory/" className="text-gray-400 hover:text-white">Directory</a></li>
          </ul>
        </div>

        {/* Column 3 - MyUGA */}
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase">MyUGA</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://my.uga.edu" className="text-gray-400 hover:text-white">Employment Opportunities</a></li>
          </ul>
        </div>

        {/* Column 4 - Copyright and Trademarks */}
        <div>
          <h3 className="text-sm font-semibold mb-3 uppercase">Copyright and Trademarks</h3>
          <ul className="text-sm space-y-1">
            <li><a href="https://www.uga.edu/privacy/" className="text-gray-400 hover:text-white">Privacy</a></li>
          </ul>
        </div>
      </div>

      {/* Social Media Section */}
      <div className="mt-8 pt-8 border-t border-gray-600">
        <p className="text-sm mb-2">#UGA on</p>
      </div>
    </div>

    {/* Bottom Bar */}
    <div className="bg-[#252525] py-4">
      <div className="container mx-auto px-4 text-center">
        <p className="text-xs text-gray-500">
          © {new Date().getFullYear()} University of Georgia. All rights reserved.
        </p>
        <div className="mt-2 text-xs">
          <a href="https://www.uga.edu/privacy/" className="text-gray-500 hover:text-white mx-2">Privacy</a>
          <a href="https://www.uga.edu/terms/" className="text-gray-500 hover:text-white mx-2">Terms</a>
          <a href="https://eits.uga.edu/access_and_security/infosec/pols_regs/policies/privacy/" className="text-gray-500 hover:text-white mx-2">FERPA</a>
          <a href="https://www.uga.edu/accessibility/" className="text-gray-500 hover:text-white mx-2">Accessibility</a>
        </div>
      </div>
    </div>
  </footer>
);






function App({ Component, pageProps }: AppProps<{ initialSession: Session }>) {
  // existing Supabase client setup is preserved
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
		<Footer /> 
      </div>
    </SessionContextProvider>
  );
}

export default App;