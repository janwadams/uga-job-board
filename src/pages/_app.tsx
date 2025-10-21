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

const Footer = () => (
  <footer className="bg-[#333] text-white mt-auto">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Main footer content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 py-10">
        {/* Column 1 - MIS Info */}
        <div>
          <h3 className="text-xl font-bold mb-4">MIS Career Network</h3>
          <p className="text-gray-300 text-sm leading-relaxed">
            Terry College of Business<br />
            Management Information Systems<br />
            Benson Hall C420<br />
            630 South Lumpkin Street<br />
            Athens, GA 30602
          </p>
          <p className="text-gray-300 text-sm mt-3">
            Phone: (706) 542-3703<br />
            Email: <a href="mailto:mis@terry.uga.edu" className="hover:text-white underline">mis@terry.uga.edu</a>
          </p>
          
          {/* Social Media Icons */}
          <div className="flex space-x-4 mt-4">
            <a href="https://www.facebook.com/terrycollegeuga" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/facebook.svg" alt="Facebook" className="h-5 w-5 invert" />
            </a>
            <a href="https://twitter.com/terrycollege" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/x.svg" alt="Twitter/X" className="h-5 w-5 invert" />
            </a>
            <a href="https://www.linkedin.com/school/terry-college-of-business/" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/linkedin.svg" alt="LinkedIn" className="h-5 w-5 invert" />
            </a>
            <a href="https://www.instagram.com/terrycollege/" target="_blank" rel="noopener noreferrer" className="opacity-70 hover:opacity-100 transition-opacity">
              <img src="https://cdn.jsdelivr.net/npm/simple-icons@v9/icons/instagram.svg" alt="Instagram" className="h-5 w-5 invert" />
            </a>
          </div>
        </div>
        
        {/* Column 2 - Quick Links */}
        <div>
          <h3 className="text-xl font-bold mb-4">Resources</h3>
          <ul className="space-y-2">
            <li>
              <a href="/jobs" className="text-gray-300 text-sm hover:text-white transition-colors">
                Browse Jobs
              </a>
            </li>
            <li>
              <a href="/login" className="text-gray-300 text-sm hover:text-white transition-colors">
                Student Login
              </a>
            </li>
            <li>
              <a href="/employer-login" className="text-gray-300 text-sm hover:text-white transition-colors">
                Employer Portal
              </a>
            </li>
            <li>
              <a href="/post-job" className="text-gray-300 text-sm hover:text-white transition-colors">
                Post a Job
              </a>
            </li>
          </ul>
        </div>

        {/* Column 3 - Connect */}
        <div>
          <h3 className="text-xl font-bold mb-4">Connect</h3>
          <ul className="space-y-2">
            <li>
              <a 
                href="https://terry.uga.edu/management-information-systems/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 text-sm hover:text-white transition-colors"
              >
                MIS Department
              </a>
            </li>
            <li>
              <a 
                href="https://terry.uga.edu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 text-sm hover:text-white transition-colors"
              >
                Terry College of Business
              </a>
            </li>
            <li>
              <a 
                href="https://www.uga.edu" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-gray-300 text-sm hover:text-white transition-colors"
              >
                University of Georgia
              </a>
            </li>
          </ul>
          
          {/* Terry College Logo */}
          <div className="mt-4">
            <img 
              src="https://brand.uga.edu/wp-content/uploads/Terry_College_W-1200x386.png" 
              alt="Terry College of Business" 
              className="h-12 opacity-80 hover:opacity-100 transition-opacity"
            />
          </div>
        </div>
      </div>

      {/* Bottom bar with UGA logo and legal links */}
      <div className="border-t border-gray-600 py-6">
        <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
          {/* UGA Logo */}
          <div>
            <a href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">
              <img 
                src="https://www.uga.edu/_resources/images/uga-logo-footer.png" 
                alt="University of Georgia" 
                className="h-10"
              />
            </a>
          </div>
          
          {/* Copyright */}
          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} University of Georgia. All rights reserved.
          </div>
          
          {/* Legal Links */}
          <div className="flex flex-wrap justify-center gap-3 text-xs">
            <a 
              href="https://www.uga.edu/privacy/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Privacy
            </a>
            <span className="text-gray-600">|</span>
            <a 
              href="https://www.uga.edu/terms/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Terms
            </a>
            <span className="text-gray-600">|</span>
            <a 
              href="https://eits.uga.edu/access_and_security/infosec/pols_regs/policies/privacy/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              FERPA
            </a>
            <span className="text-gray-600">|</span>
            <a 
              href="https://www.uga.edu/accessibility/" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-gray-400 hover:text-white transition-colors"
            >
              Accessibility
            </a>
          </div>
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