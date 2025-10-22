const Footer = () => (
  <footer 
    className="text-white relative"
    style={{
      backgroundImage: 'url("/images/background-arch.jpg")',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center center',
      backgroundSize: 'cover',
      backgroundColor: '#333333'
    }}
  >
    {/* Much lighter overlay - just enough to ensure text readability */}
    <div className="absolute inset-0 bg-black bg-opacity-30"></div>
    
    {/* Main content */}
    <div className="relative z-10">
      <div className="container mx-auto px-4 py-10 max-w-7xl">
        {/* First Row - Main Links */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Column 1 - UGA Logo and Info */}
          <div>
            <img 
              src="/images/footeruga.png" 
              alt="University of Georgia" 
              className="h-20 mb-4"
            />
            <p className="text-xs text-gray-300">
              University of Georgia<br />
              Athens, GA 30602<br />
              (706) 542-3000
            </p>
          </div>

          {/* Column 2 - Schools and Colleges */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Schools and Colleges</h3>
            <ul className="text-sm space-y-2">
              <li><a href="https://www.uga.edu/directory/" className="text-gray-300 hover:text-white">Directory</a></li>
            </ul>
          </div>

          {/* Column 3 - MyUGA */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3">MyUGA</h3>
            <ul className="text-sm space-y-2">
              <li><a href="https://hr.uga.edu/employees/employment/employment-opportunities/" className="text-gray-300 hover:text-white">Employment Opportunities</a></li>
            </ul>
          </div>

          {/* Column 4 - Copyright and Trademarks */}
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-3">Copyright and Trademarks</h3>
            <ul className="text-sm space-y-2">
              <li><a href="https://www.uga.edu/privacy/" className="text-gray-300 hover:text-white">Privacy</a></li>
            </ul>
          </div>
        </div>

        {/* Second Row - Social Media (moved down and to the right) */}
        <div className="border-t border-gray-600 pt-6 flex justify-center">
          <div className="flex items-center space-x-4">
            <span className="text-sm font-bold">#UGA on</span>
            <a href="https://www.facebook.com/universityofgeorgia" target="_blank" rel="noopener noreferrer">
              <img src="/images/facebook-icon.png" alt="Facebook" className="h-5 w-5 opacity-70 hover:opacity-100" />
            </a>
            <a href="https://twitter.com/universityofga" target="_blank" rel="noopener noreferrer">
              <img src="/images/x-icon.png" alt="X" className="h-5 w-5 opacity-70 hover:opacity-100" />
            </a>
            <a href="https://www.instagram.com/universityofga/" target="_blank" rel="noopener noreferrer">
              <img src="/images/instagram-icon.png" alt="Instagram" className="h-5 w-5 opacity-70 hover:opacity-100" />
            </a>
            <a href="https://www.youtube.com/user/UnivGa" target="_blank" rel="noopener noreferrer">
              <img src="/images/youtube-icon.png" alt="YouTube" className="h-5 w-5 opacity-70 hover:opacity-100" />
            </a>
            <a href="https://www.linkedin.com/school/university-of-georgia/" target="_blank" rel="noopener noreferrer">
              <img src="/images/linkedin-icon.png" alt="LinkedIn" className="h-5 w-5 opacity-70 hover:opacity-100" />
            </a>
          </div>
        </div>
      </div>
    </div>
  </footer>
);