
import 'styles/globals.css';
import type { AppProps } from 'next/app';
import Navbar from 'components/Navbar';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Component {...pageProps} />
      </main>
    </>
  );
}

export default MyApp;

