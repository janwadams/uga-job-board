import { useState } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@supabase/supabase-js';
import Link from 'next/link';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// --- SVG Icon Components ---
const EyeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
);
  
const EyeOffIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.542-7 1.274-4.057 5.064-7 9.542-7 .847 0 1.673.124 2.468.352M10.582 10.582a3 3 0 11-4.243 4.243M8 12a4 4 0 004 4m0 0l6-6m-6 6l-6-6" />
    </svg>
);

export default function StudentSignUpPage() {
  const router = useRouter();

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    // --- Client-side validation ---
    if (!formData.email.endsWith('.edu')) {
      setErrorMsg('Please use a valid .edu email address.');
      setLoading(false);
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setErrorMsg('Passwords do not match.');
      setLoading(false);
      return;
    }
    if (formData.password.length < 6) {
        setErrorMsg('Password must be at least 6 characters long.');
        setLoading(false);
        return;
    }

    // --- Sign up user with Supabase Auth ---
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authError) {
      setErrorMsg('Sign up failed: ' + authError.message);
      setLoading(false);
      return;
    }
    
    // Check if user was created
    const user = authData.user;
    if (!user) {
        setErrorMsg('Sign up failed. Please try again.');
        setLoading(false);
        return;
    }

    // --- Insert user role into 'user_roles' table ---
    const { error: roleError } = await supabase
      .from('user_roles')
      .insert({ 
          user_id: user.id, 
          role: 'student',
          // Optionally add first/last name if your table supports it
          // first_name: formData.firstName,
          // last_name: formData.lastName,
      });
      
    if (roleError) {
        // This part is tricky. The user is created in auth, but failed to get a role.
        // For now, we'll show an error. In a real app, you might want to handle this more gracefully.
        setErrorMsg('Could not assign student role. Please contact support.');
        setLoading(false);
        return;
    }

    setSuccessMsg('Sign up successful! Redirecting to your dashboard...');
    
    // Automatically log the user in after successful sign-up and role assignment
    const { error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
    });

    if (signInError) {
        setErrorMsg('Account created, but auto-login failed. Please log in manually.');
        setLoading(false);
        setTimeout(() => router.push('/login'), 2000);
        return;
    }

    // Redirect to the student dashboard
    setTimeout(() => {
        router.push('/student/dashboard');
    }, 2000);
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 border rounded shadow bg-white">
      <h1 className="text-2xl font-bold mb-6 text-center text-red-700">Student Sign Up</h1>

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="flex gap-4">
            <input
              type="text"
              name="firstName"
              placeholder="First Name"
              value={formData.firstName}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
            <input
              type="text"
              name="lastName"
              placeholder="Last Name"
              value={formData.lastName}
              onChange={handleChange}
              required
              className="w-full border p-2 rounded"
            />
        </div>
        <input
          type="email"
          name="email"
          placeholder="UGA Email Address (.edu)"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full border p-2 rounded"
        />

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password (min. 6 characters)"
            value={formData.password}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded pr-10"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute inset-y-0 right-0 px-3 flex items-center"
            aria-label="Toggle password visibility"
          >
            {showPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>
        
        <div className="relative">
          <input
            type={showConfirmPassword ? 'text' : 'password'}
            name="confirmPassword"
            placeholder="Confirm Password"
            value={formData.confirmPassword}
            onChange={handleChange}
            required
            className="w-full border p-2 rounded pr-10"
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute inset-y-0 right-0 px-3 flex items-center"
            aria-label="Toggle confirm password visibility"
          >
            {showConfirmPassword ? <EyeOffIcon /> : <EyeIcon />}
          </button>
        </div>

        {errorMsg && <p className="text-red-600 text-sm text-center">{errorMsg}</p>}
        {successMsg && <p className="text-green-600 text-sm text-center">{successMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-red-700 hover:bg-red-800 text-white font-semibold py-2 px-4 rounded"
        >
          {loading ? 'Creating Account...' : 'Create Account'}
        </button>
      </form>
      
      <p className="text-center text-sm text-gray-600 mt-4">
        Already have an account?{' '}
        <Link href="/login">
          <span className="font-semibold text-red-700 hover:underline cursor-pointer">
            Log In
          </span>
        </Link>
      </p>
    </div>
  );
}

