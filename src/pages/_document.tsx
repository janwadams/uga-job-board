// pages/_document.tsx
import Document, { Html, Head, Main, NextScript } from 'next/document'

class MyDocument extends Document {
  render() {
    return (
      <Html>
        <Head>
          {/* Connect to Google Fonts for faster loading */}
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
          
          {/* UGA Official Typography - Based on Brand Guidelines */}
          
          {/* Primary Sans-Serif: Oswald */}
          {/* Use for: Headlines, subheads, and infographics */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Oswald:wght@300;400;500;600;700&display=swap" 
            rel="stylesheet" 
          />
          
          {/* Primary Serif: Merriweather */}
          {/* Use for: Sophisticated headlines and body copy */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Merriweather:wght@300;400;700;900&display=swap" 
            rel="stylesheet" 
          />
          
          {/* Secondary Sans-Serif: Merriweather Sans */}
          {/* Use for: Small text sizes and longer-form content */}
          <link 
            href="https://fonts.googleapis.com/css2?family=Merriweather+Sans:wght@300;400;500;600;700;800&display=swap" 
            rel="stylesheet" 
          />
          
          {/* Note: Georgia is a system font (already on most computers), no import needed */}
          {/* Use Georgia for: Body copy, documents, and dense text blocks */}
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