//components folder
//UgaGlobalHeader.tsx

import Link from 'next/link';

// This is the official UGA Arch logo SVG, colored white for the header.
const UgaLogo = () => (
  <svg className="h-8 w-auto" viewBox="0 0 128 128" fill="white" xmlns="http://www.w3.org/2000/svg">
    <path d="M124 128V114.867H4V128H124V128ZM124 106.133V0H4V106.133H25.3333V50.6667H42.6667V106.133H56.1333V34.1333H71.8667V106.133H85.3333V50.6667H102.667V106.133H124V106.133Z" />
  </svg>
);

// This is the Search icon SVG
const SearchIcon = () => (
    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
);

const UgaGlobalHeader = () => {
  return (
    <div className="w-full bg-uga-black text-uga-white text-sm font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-12">
          <div className="flex-shrink-0">
            <a href="https://www.uga.edu" target="_blank" rel="noopener noreferrer">
              <UgaLogo />
            </a>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <a href="https://www.uga.edu" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">UGA</a>
            <a href="https://give.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Give</a>
            <a href="https://calendar.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">Calendar</a>
            <a href="https://news.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">News</a>
            <a href="https://my.uga.edu/" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">MyUGA</a>
            <a href="https://www.uga.edu/search.php" target="_blank" rel="noopener noreferrer" className="hover:text-gray-300">
                <SearchIcon />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UgaGlobalHeader;
