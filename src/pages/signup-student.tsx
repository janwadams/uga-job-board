//pages/signup-student.tsx

import { useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';

// eye icon for showing password
const EyeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
  </svg>
);

// eye off icon for hiding password
const EyeOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7a3 3 0 10-4.243 4.243m5.428-2.256a3 3 0 004.243-4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
  </svg>
);

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
    
    //front-end Validation
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
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              name="password" 
              type={showPassword ? 'text' : 'password'} 
              placeholder="Password" 
              value={formData.password} 
              onChange={handleChange} 
              required 
              className="w-full border p-2 rounded" 
              style={{ paddingRight: '45px' }}
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)} 
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
              aria-label="Toggle password visibility"
            >
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
          
          {/* Confirm Password Field with Toggle */}
          <div style={{ position: 'relative', width: '100%' }}>
            <input 
              name="confirmPassword" 
              type={showConfirmPassword ? 'text' : 'password'} 
              placeholder="Confirm Password" 
              value={formData.confirmPassword} 
              onChange={handleChange} 
              required 
              className="w-full border p-2 rounded" 
              style={{ paddingRight: '45px' }}
            />
            <button 
              type="button" 
              onClick={() => setShowConfirmPassword(!showConfirmPassword)} 
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                padding: '4px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10
              }}
              aria-label="Toggle confirm password visibility"
            >
              {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
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