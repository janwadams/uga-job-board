// src/pages/_app.tsx
import type { AppProps } from 'next/app';
import Navbar from '../components/Navbar';            // ✅ Correct relative path
import '../styles/globals.css';                       // ✅ Update this line to relative import

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Navbar />
      <main className="max-w-4xl mx-auto p-4">
        <Component {...pageProps} />
      </main>
    </>
  );
}
