// footer.tsx
// official uga branded footer component that appears at the bottom of every page

// this is the footer component using the official uga css classes and font awesome icons
const Footer = () => (
  <footer className="ugafooter">
    <div className="ugafooter__container">
      {/* primary row: contains the logo and the main navigation links */}
      <div className="ugafooter__row ugafooter__row--primary">
        <div className="ugafooter__logo">
          <a href="https://www.uga.edu" className="ugafooter__logo-link" aria-label="University of Georgia">
            University of Georgia
          </a>
        </div>
        <div className="ugafooter__links">
          <ul className="ugafooter__links-list">
            <li className="ugafooter__links-list-item">
              <a href="https://www.uga.edu/a-z-site-index/" className="ugafooter__links-list-link">Schools and Colleges</a>
            </li>
            <li className="ugafooter__links-list-item">
              <a href="https://www.uga.edu/directory/" className="ugafooter__links-list-link">Directory</a>
            </li>
            <li className="ugafooter__links-list-item">
              <a href="https://my.uga.edu/" className="ugafooter__links-list-link">MyUGA</a>
            </li>
            <li className="ugafooter__links-list-item">
              <a href="https://hr.uga.edu/employees/employment/employment-opportunities/" className="ugafooter__links-list-link">Employment Opportunities</a>
            </li>
            <li className="ugafooter__links-list-item">
              <a href="https://www.uga.edu/copyright-trademarks/" className="ugafooter__links-list-link">Copyright and Trademarks</a>
            </li>
            <li className="ugafooter__links-list-item">
              <a href="https://www.uga.edu/privacy/" className="ugafooter__links-list-link">Privacy</a>
            </li>
          </ul>
        </div>
      </div>
      
      {/* secondary row: contains the address and social media links */}
      <div className="ugafooter__row ugafooter__row--secondary">
        <div className="ugafooter__address">
          <strong>University of Georgia</strong><br />
          Athens, GA 30602<br />
          <a href="tel:7065423000" className="ugafooter__address-telephone">706-542-3000</a>
        </div>
        <div className="ugafooter__social">
          <span className="ugafooter__social-label">#UGA on </span>
          <a href="https://www.facebook.com/universityofgeorgia" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on Facebook">
            <i className="fab fa-facebook-f"></i>
          </a>
          <a href="https://twitter.com/universityofga" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on Twitter">
            <i className="fab fa-x-twitter"></i>
          </a>
          <a href="https://www.instagram.com/universityofga/" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on Instagram">
            <i className="fab fa-instagram"></i>
          </a>
          <a href="https://www.youtube.com/user/UnivGa" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on YouTube">
            <i className="fab fa-youtube"></i>
          </a>
          <a href="https://www.linkedin.com/school/university-of-georgia/" className="ugafooter__social-link" target="_blank" rel="noopener noreferrer" aria-label="UGA on LinkedIn">
            <i className="fab fa-linkedin-in"></i>
          </a>
        </div>
      </div>
    </div>
  </footer>
);

export default Footer;