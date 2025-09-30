// components/QuickApplyModal.tsx
import { useState, useEffect } from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface QuickApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: ApplicationData) => void;
  jobTitle: string;
  companyName: string;
  userEmail?: string;
}

interface ApplicationData {
  contact_email: string;
  contact_phone: string;
  resume_url: string;
  cover_letter: string;
}

export default function QuickApplyModal({ 
  isOpen, 
  onClose, 
  onSubmit, 
  jobTitle, 
  companyName,
  userEmail = ''
}: QuickApplyModalProps) {
  const [formData, setFormData] = useState<ApplicationData>({
    contact_email: userEmail,
    contact_phone: '',
    resume_url: '',
    cover_letter: ''
  });
  const [errors, setErrors] = useState<Partial<ApplicationData>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // reset form when modal opens with new job
  useEffect(() => {
    if (isOpen) {
      setFormData({
        contact_email: userEmail,
        contact_phone: '',
        resume_url: '',
        cover_letter: ''
      });
      setErrors({});
    }
  }, [isOpen, userEmail]);

  const validateForm = () => {
    const newErrors: Partial<ApplicationData> = {};
    
    // email is required
    if (!formData.contact_email) {
      newErrors.contact_email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)) {
      newErrors.contact_email = 'Please enter a valid email';
    }
    
    // phone is optional but if provided should be valid
    if (formData.contact_phone && !/^[\d\s\-\+\(\)]+$/.test(formData.contact_phone)) {
      newErrors.contact_phone = 'Please enter a valid phone number';
    }
    
    // resume is required
    if (!formData.resume_url) {
      newErrors.resume_url = 'Resume link is required';
    } else if (!/^https?:\/\/.+/.test(formData.resume_url) && !formData.resume_url.includes('drive.google.com') && !formData.resume_url.includes('linkedin.com')) {
      newErrors.resume_url = 'Please enter a valid URL (e.g., Google Drive, LinkedIn, personal website)';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    await onSubmit(formData);
    setIsSubmitting(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" onClick={onClose} />
      
      {/* modal */}
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
          {/* header */}
          <div className="mb-4">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Quick Apply</h3>
                <p className="text-sm text-gray-600 mt-1">
                  {jobTitle} at {companyName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>
          </div>

          {/* form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* email field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contact Email *
              </label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.contact_email ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="your.email@example.com"
              />
              {errors.contact_email && (
                <p className="text-red-500 text-xs mt-1">{errors.contact_email}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                Employers will use this to contact you
              </p>
            </div>

            {/* phone field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number (Optional)
              </label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.contact_phone ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="(555) 123-4567"
              />
              {errors.contact_phone && (
                <p className="text-red-500 text-xs mt-1">{errors.contact_phone}</p>
              )}
            </div>

            {/* resume link field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Resume Link *
              </label>
              <input
                type="url"
                value={formData.resume_url}
                onChange={(e) => setFormData({ ...formData, resume_url: e.target.value })}
                className={`w-full px-3 py-2 border rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  errors.resume_url ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="https://drive.google.com/your-resume"
              />
              {errors.resume_url && (
                <p className="text-red-500 text-xs mt-1">{errors.resume_url}</p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                Share a link to your resume (Google Drive, LinkedIn, etc.)
              </p>
            </div>

            {/* cover letter field */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Cover Letter / Note (Optional)
              </label>
              <textarea
                value={formData.cover_letter}
                onChange={(e) => setFormData({ ...formData, cover_letter: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell the employer why you're interested in this position..."
                maxLength={500}
              />
              <p className="text-gray-500 text-xs mt-1">
                {formData.cover_letter.length}/500 characters
              </p>
            </div>

            {/* buttons */}
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 font-medium"
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-red-700 text-white rounded-md hover:bg-red-800 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}