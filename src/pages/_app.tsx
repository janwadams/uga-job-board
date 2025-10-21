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
const Footer = () => (
  <footer>
    {/* UGA Footer CSS - inline since we can't use PHP includes */}
    <style jsx global>{`
      #uga-footer {
        background: #333;
        color: #fff;
        padding: 40px 0 20px;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      }
      
      #uga-footer .container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }
      
      #uga-footer h3 {
        color: #fff;
        font-size: 14px;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 1px;
        margin-bottom: 15px;
      }
      
      #uga-footer ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      
      #uga-footer ul li {
        margin-bottom: 8px;
      }
      
      #uga-footer a {
        color: #999;
        text-decoration: none;
        font-size: 14px;
        transition: color 0.2s;
      }
      
      #uga-footer a:hover {
        color: #fff;
      }
      
      #uga-footer-bottom {
        background: #252525;
        padding: 15px 0;
        margin-top: 40px;
      }
      
      #uga-footer-bottom .container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
      }
      
      @media (max-width: 768px) {
        #uga-footer-bottom .container {
          flex-direction: column;
          text-align: center;
        }
      }
    `}</style>

    <div id="uga-footer">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Column 1 - MIS Specific Info */}
          <div>
            <h3>MIS Career Network</h3>
            <ul>
              <li>Terry College of Business</li>
              <li>Benson Hall C420</li>
              <li>Athens, GA 30602</li>
              <li>(706) 542-3703</li>
            </ul>
          </div>
          
          {/* Column 2 - Resources */}
          <div>
            <h3>Resources</h3>
            <ul>
              <li><a href="/jobs">Browse Jobs</a></li>
              <li><a href="/login">Student Login</a></li>
              <li><a href="/post-job">Post a Job</a></li>
            </ul>
          </div>
          
          {/* Column 3 - UGA Links */}
          <div>
            <h3>University Links</h3>
            <ul>
              <li><a href="https://terry.uga.edu" target="_blank" rel="noopener noreferrer">Terry College</a></li>
              <li><a href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">UGA Home</a></li>
              <li><a href="https://my.uga.edu" target="_blank" rel="noopener noreferrer">MyUGA</a></li>
            </ul>
          </div>
          
          {/* Column 4 - Connect */}
          <div>
            <h3>Connect</h3>
            <ul>
              <li><a href="mailto:mis@terry.uga.edu">Contact Us</a></li>
              <li><a href="https://terry.uga.edu/directory" target="_blank" rel="noopener noreferrer">Directory</a></li>
            </ul>
          </div>
        </div>
      </div>
      
      <div id="uga-footer-bottom">
        <div className="container">
          <div>
            <img 
              src="https://www.uga.edu/_resources/images/uga-footer-logo.png" 
              alt="University of Georgia" 
              height="48"
            />
          </div>
          <div className="text-xs text-gray-400">
            © {new Date().getFullYear()} University of Georgia. All rights reserved.
          </div>
          <div className="text-xs">
            <a href="https://www.uga.edu/privacy/" className="mr-3">Privacy</a>
            <a href="https://www.uga.edu/terms/" className="mr-3">Terms</a>
            <a href="https://eits.uga.edu/access_and_security/infosec/pols_regs/policies/privacy/" className="mr-3">FERPA</a>
            <a href="https://www.uga.edu/accessibility/">Accessibility</a>
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