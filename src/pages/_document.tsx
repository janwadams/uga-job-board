// pages/_document.tsx
// this file sets up the html structure and loads fonts/icons for the entire app

import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* connect to google fonts for faster loading */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          
          {/* uga official typography - based on brand guidelines */}
          
          {/* primary sans-serif: oswald */}
          {/* use for: headlines, subheads, and infographics */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap" 
            rel="stylesheet" 
          />
          
          {/* primary serif: merriweather */}
          {/* use for: sophisticated headlines and body copy */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap" 
            rel="stylesheet" 
          />
          
          {/* secondary sans-serif: merriweather sans */}
          {/* use for: small text sizes and longer-form content */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@300;400;500;600;700;800&display=swap" 
            rel="stylesheet" 
          />
          
          {/* font awesome for social media icons in footer */}
          <link 
            rel="stylesheet" 
            href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css"
            integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw=="
            crossOrigin="anonymous"
            referrerPolicy="no-referrer"
          />
          
          {/* note: georgia is a system font (already on most computers), no import needed */}
          {/* use georgia for: body copy, documents, and dense text blocks */}
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    )
  }
}

export default MyDocument