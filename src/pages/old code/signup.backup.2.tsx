import { useState } from 'react';

// Eye icon component for the password toggle
const EyeIcon = ({ SvgClassName, pathClassName }: { SvgClassName?: string, pathClassName?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 20 20"
    fill="currentColor"
    className={SvgClassName || "h-5 w-5"}
  >
    <path
      d="M10 12a2 2 0 100-4 2 2 0 000 4z"
      className={pathClassName}
    />
    <path
      fillRule="evenodd"
      d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.522 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z"
      clipRule="evenodd"
      className={pathClassName}
    />
  </svg>
);

// Eye-slashed icon component for the password toggle
const EyeSlashedIcon = ({ SvgClassName, pathClassName }: { SvgClassName?: string, pathClassName?: string }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 20 20" 
        fill="currentColor" 
        className={SvgClassName || "h-5 w-5"}
    >
        <path d="M3.28 2.22a.75.75 0 00-1.06 1.06l14.5 14.5a.75.75 0 101.06-1.06l-1.745-1.745a10.029 10.029 0 003.3-4.38c-1.28-4.05-5.523-7-9.5-7-1.57 0-3.044.4-4.333 1.11L3.28 2.22z" />
        <path d="M10 5a5 5 0 015 5c0 .638-.112 1.246-.317 1.807l-1.036-1.036A3.5 3.5 0 0010 7.5a3.5 3.5 0 00-3.149 2.256l-1.036-1.036A4.954 4.954 0 0110 5zM2.05 10a10.028 10.028 0 003.3 4.38l1.036-1.036A3.5 3.5 0 0110 12.5a3.5 3.5 0 01.522-1.842l1.036-1.036A4.99 4.99 0 002.05 10z" />
    </svg>
);


export default function Signup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessage('');
    setError('');

    // --- Validation ---
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    try {
      const response = await fetch('/api/auth/register-rep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, company_name: companyName }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage(data.message);
      } else {
        setError(data.error);
      }
    } catch (err) {
      console.error('Signup error:', err);
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="flex justify-center items-center h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-red-800">Company Rep Signup</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="companyName">
              Company Name
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="companyName"
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
              Company Email
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="relative">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="password">
              Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-sm leading-5"
            >
                {showPassword ? <EyeSlashedIcon SvgClassName="h-5 w-5 text-gray-500"/> : <EyeIcon SvgClassName="h-5 w-5 text-gray-500" />}
            </button>
          </div>
          <div className="relative">
            <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 mb-3 leading-tight focus:outline-none focus:shadow-outline"
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
             <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 top-7 pr-3 flex items-center text-sm leading-5"
            >
                {showPassword ? <EyeSlashedIcon SvgClassName="h-5 w-5 text-gray-500"/> : <EyeIcon SvgClassName="h-5 w-5 text-gray-500" />}
            </button>
          </div>
          <div className="flex items-center justify-between pt-2">
            <button
              className="bg-red-800 hover:bg-red-900 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline w-full"
              type="submit"
            >
              Request Account
            </button>
          </div>
        </form>
        {message && <p className="text-green-500 text-center mt-4">{message}</p>}
        {error && <p className="text-red-500 text-center mt-4">{error}</p>}
      </div>
    </div>
  );
}
