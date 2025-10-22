//footer.tsx

//import React from 'react';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';

// This is the new Footer component using the official UGA CSS classes
const Footer = () => (
  <footer className="ugafooter">
    <div className="ugafooter__container">
      {/* Primary Row: Contains the Logo and the main navigation links */}
      <div className="ugafooter__row ugafooter__row--primary">
        <div className="ugafooter__logo">
          <a href="https://www.uga.edu" className="ugafooter__logo-link" aria-label="University of Georgia">
            University of Georgia
          </a>
        </div>
        <div className="ugafooter__links">
          <ul className="ugafooter__links-list">
            <li className="ugafooter__links-list-item"><a href="https://www.uga.edu/directory/" className="ugafooter__links-list-link">Directory</a></li>
            <li className="ugafooter__links-list-item"><a href="https://hr.uga.edu/employees/employment/employment-opportunities/" className="ugafooter__links-list-link">Employment Opportunities</a></li>
            <li className="ugafooter__links-list-item"><a href="https://www.uga.edu/privacy/" className="ugafooter__links-list-link">Privacy</a></li>
            <li className="ugafooter__links-list-item"><a href="#" className="ugafooter__links-list-link">Schools and Colleges</a></li>
            <li className="ugafooter__links-list-item"><a href="#" className="ugafooter__links-list-link">MyUGA</a></li>
            <li className="ugafooter__links-list-item"><a href="#" className="ugafooter__links-list-link">Copyright and Trademarks</a></li>
          </ul>
        </div>
      </div>
      
      {/* Secondary Row: Contains the address and social media links */}
      <div className="ugafooter__row ugafooter__row--secondary">
        <div className="ugafooter__address">
          <strong>University of Georgia</strong><br />
          Athens, Georgia 30602<br />
          <a href="tel:7065423000" className="ugafooter__address-telephone">(706) 542-3000</a>
        </div>
        <div className="ugafooter__social">
          <span className="ugafooter__social-label">#UGA on</span>
          <a href="https://www.facebook.com/universityofgeorgia" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on Facebook">
             <img src="/images/facebook-icon.png" alt="Facebook" style={{ display: 'inline', height: '1.2em', width: 'auto' }} />
          </a>
          <a href="https://twitter.com/universityofga" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on Twitter">
             <img src="/images/x-icon.png" alt="X" style={{ display: 'inline', height: '1.2em', width: 'auto' }} />
          </a>
          <a href="https://www.instagram.com/universityofga/" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on Instagram">
             <img src="/images/instagram-icon.png" alt="Instagram" style={{ display: 'inline', height: '1.2em', width: 'auto' }} />
          </a>
          <a href="https://www.youtube.com/user/UnivGa" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on YouTube">
             <img src="/images/youtube-icon.png" alt="YouTube" style={{ display: 'inline', height: '1.2em', width: 'auto' }} />
          </a>
          <a href="https://www.linkedin.com/school/university-of-georgia/" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on LinkedIn">
             <img src="/images/linkedin-icon.png" alt="LinkedIn" style={{ display: 'inline', height: '1.2em', width: 'auto' }} />
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;