// components/Footer.tsx filename
import Link from 'next/link';

export default function Footer() {
  return (
    <>
      {/* UGA standard footer - based on bitbucket repo structure */}
      <footer id="ugafooter" className="uga-footer">
        <div className="uga-footer-container">
          {/* Row 1 - Main content area */}
          <div className="uga-footer-row">
            <div className="uga-footer-col">
              <h3 className="uga-footer-heading">MIS Career Network</h3>
              <p>Terry College of Business<br />
                Management Information Systems<br />
                Benson Hall C420<br />
                630 South Lumpkin Street<br />
                Athens, GA 30602</p>
              <p>Phone: (706) 542-3703</p>
            </div>
            
            <div className="uga-footer-col">
              <h3 className="uga-footer-heading">Resources</h3>
              <ul className="uga-footer-links">
                <li><Link href="/jobs"><a>Browse Jobs</a></Link></li>
                <li><Link href="/login"><a>Student Login</a></Link></li>
                <li><Link href="/employer-login"><a>Employer Portal</a></Link></li>
                <li><Link href="/post-job"><a>Post a Job</a></Link></li>
              </ul>
            </div>

            <div className="uga-footer-col">
              <h3 className="uga-footer-heading">Connect</h3>
              <ul className="uga-footer-links">
                <li><a href="https://terry.uga.edu/management-information-systems/" target="_blank" rel="noopener noreferrer">MIS Department</a></li>
                <li><a href="https://terry.uga.edu" target="_blank" rel="noopener noreferrer">Terry College</a></li>
                <li><a href="mailto:mis@terry.uga.edu">Contact Us</a></li>
              </ul>
            </div>
          </div>

          {/* Row 2 - UGA standard footer bar */}
          <div className="uga-footer-bar">
            <div className="uga-footer-bar-container">
              <div className="uga-footer-logo">
                <a href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">
                  <img src="https://www.uga.edu/_resources/images/uga-logo-footer.png" alt="University of Georgia" />
                </a>
              </div>
              <div className="uga-footer-links-bar">
                <a href="https://www.uga.edu/privacy/">Privacy</a>
                <span className="uga-footer-divider">|</span>
                <a href="https://www.uga.edu/terms/">Terms</a>
                <span className="uga-footer-divider">|</span>
                <a href="https://eits.uga.edu/access_and_security/infosec/pols_regs/policies/privacy/">FERPA</a>
                <span className="uga-footer-divider">|</span>
                <a href="https://www.uga.edu/copyright/">Copyright</a>
              </div>
              <div className="uga-footer-copyright">
                © {new Date().getFullYear()} University of Georgia
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style jsx>{`
        .uga-footer {
          background-color: #333;
          color: #fff;
          margin-top: auto;
          font-family: 'Lato', sans-serif;
        }

        .uga-footer-container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .uga-footer-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 40px;
          padding: 40px 0;
        }

        .uga-footer-heading {
          font-family: 'Merriweather', serif;
          font-size: 1.25rem;
          font-weight: 700;
          margin-bottom: 1rem;
          color: #fff;
        }

        .uga-footer-col p {
          color: #ccc;
          font-size: 0.875rem;
          line-height: 1.6;
          margin-bottom: 0.5rem;
        }

        .uga-footer-links {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .uga-footer-links li {
          margin-bottom: 0.5rem;
        }

        .uga-footer-links a {
          color: #ccc;
          text-decoration: none;
          font-size: 0.875rem;
          transition: color 0.2s;
        }

        .uga-footer-links a:hover {
          color: #fff;
        }

        .uga-footer-bar {
          background-color: #252525;
          border-top: 1px solid #444;
        }

        .uga-footer-bar-container {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          justify-content: space-between;
          padding: 20px 0;
          gap: 20px;
        }

        .uga-footer-logo img {
          height: 40px;
          width: auto;
        }

        .uga-footer-links-bar {
          display: flex;
          gap: 10px;
          font-size: 0.75rem;
        }

        .uga-footer-links-bar a {
          color: #999;
          text-decoration: none;
          transition: color 0.2s;
        }

        .uga-footer-links-bar a:hover {
          color: #fff;
        }

        .uga-footer-divider {
          color: #666;
        }

        .uga-footer-copyright {
          font-size: 0.75rem;
          color: #999;
        }

        @media (max-width: 768px) {
          .uga-footer-bar-container {
            flex-direction: column;
            text-align: center;
          }

          .uga-footer-links-bar {
            order: 2;
          }

          .uga-footer-copyright {
            order: 3;
          }
        }
      `}</style>
    </>
  );
}