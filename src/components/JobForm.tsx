// src/components/JobForm.tsx
import { useState } from 'react';
//import { supabase } from '@/utils/supabaseClient';
import { supabase } from '../utils/supabaseClient';
import { useRouter } from 'next/router';

export default function JobForm({ userRole }: { userRole: string }) {
  const router = useRouter();
  const [form, setForm] = useState({
    title: '',
    company: '',
    description: '',
    deadline: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase.from('jobs').insert({
      ...form,
      status: userRole === 'faculty' ? 'approved' : 'pending',
      created_by: (await supabase.auth.getUser()).data.user?.id,
    });

    if (error) {
      alert('Error submitting job: ' + error.message);
    } else {
      alert('Job submitted!');
      router.push(`/${userRole}/dashboard`);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-white p-6 rounded shadow-md">
      <input type="text" name="title" placeholder="Job Title" required onChange={handleChange} className="w-full p-2 border rounded" />
      <input type="text" name="company" placeholder="Company" required onChange={handleChange} className="w-full p-2 border rounded" />
      <textarea name="description" placeholder="Description" required onChange={handleChange} className="w-full p-2 border rounded" />
      <input type="date" name="deadline" required onChange={handleChange} className="w-full p-2 border rounded" />
      <button type="submit" className="bg-uga-red text-white px-4 py-2 rounded">Submit</button>
    </form>
  );
}
