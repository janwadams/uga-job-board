//pages/signup-student.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

export default function StudentSignupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    
    // --- Front-end Validation ---
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (!formData.email.toLowerCase().endsWith('.edu')) {
      setError('A valid .edu email address is required.');
      return;
    }
    
    setLoading(true);
    
    try {
      const response = await fetch('/api/auth/register-student', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
        }),
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMessage(data.message + ' Redirecting to login...');
        setTimeout(() => {
          router.push('/login');
        }, 2000);
      } else {
        setError(data.error || 'An unknown error occurred.');
      }
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100">
      <div className="p-8 bg-white rounded-lg shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-center text-red-700">UGA Student Sign Up</h1>
        <form onSubmit={handleSignup} className="space-y-4">
          <div className="flex gap-4">
            <input name="firstName" type="text" placeholder="First Name" value={formData.firstName} onChange={handleChange} required className="w-full border p-2 rounded" />
            <input name="lastName" type="text" placeholder="Last Name" value={formData.lastName} onChange={handleChange} required className="w-full border p-2 rounded" />
          </div>
          <input name="email" type="email" placeholder="UGA Email Address (e.g., test@uga.edu)" value={formData.email} onChange={handleChange} required className="w-full border p-2 rounded" />
          
          {/* Password Field with Toggle */}
          <div className="relative">
            <input name="password" type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={handleChange} required className="w-full border p-2 rounded pr-10" />
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
          
          {/* Confirm Password Field with Toggle */}
          <div className="relative">
            <input name="confirmPassword" type={showConfirmPassword ? 'text' : 'password'} placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} required className="w-full border p-2 rounded pr-10" />
            <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute inset-y-0 right-0 px-3 flex items-center text-gray-500">
              {showConfirmPassword ? 'Hide' : 'Show'}
            </button>
          </div>

          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
          {message && <p className="text-green-600 text-sm text-center">{message}</p>}

          <button type="submit" disabled={loading} className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded disabled:bg-gray-400">
            {loading ? 'Creating Account...' : 'Create Account'}
          </button>
        </form>
        <p className="text-center text-sm text-gray-600 mt-4">
          Already have an account?{' '}
          <Link href="/login">
            <span className="text-red-700 hover:underline cursor-pointer">Log In</span>
          </Link>
        </p>
      </div>
    </div>
  );
}

