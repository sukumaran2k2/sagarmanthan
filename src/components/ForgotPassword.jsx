import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Lock, Eye, EyeOff, X, ArrowRight, ArrowLeft, CheckCircle } from 'lucide-react';

export default function ForgotPassword({ isOpen, onClose, triggerNotification }) {
  const [currentSlide, setCurrentSlide] = useState(0); // 0: Old Password, 1: New Password
  const [showPassword, setShowPassword] = useState({
    old: false,
    new: false,
    confirm: false,
  });

  const [form, setForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  React.useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => ({ ...prev, [name]: '' }));
  };

  const handleConfirmOldPassword = (e) => {
    e.preventDefault();
    if (!form.oldPassword.trim()) {
      setErrors({ oldPassword: 'Old password is required' });
      return;
    }
    if (form.oldPassword.length < 4) {
      setErrors({ oldPassword: 'Password is too short' });
      return;
    }
    // Proceed to next slide
    setCurrentSlide(1);
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    const newErrors = {};
    if (!form.newPassword) {
      newErrors.newPassword = 'New password is required';
    } else if (form.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters';
    }

    if (form.newPassword !== form.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    // Success
    if (triggerNotification) {
      triggerNotification('Password changed successfully.');
    } else {
      alert('Password changed successfully.');
    }

    // Reset and close
    setForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
    setCurrentSlide(0);
    onClose();
  };

  const toggleShow = (field) => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl border border-slate-150 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col transition-all duration-300">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/80">
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 tracking-tight font-display">
              Change Security Password
            </h3>
            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider mt-0.5">
              Step {currentSlide + 1} of 2
            </p>
          </div>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Carousel Slider Wrapper */}
        <div className="relative overflow-hidden w-full flex-grow min-h-[280px]">
          <div 
            className="flex w-[200%] transition-transform duration-300 ease-out h-full"
            style={{ transform: `translateX(-${currentSlide * 50}%)` }}
          >
            {/* Slide 1: Enter Old Password */}
            <div className="w-1/2 p-6 flex flex-col justify-between">
              <form onSubmit={handleConfirmOldPassword} className="space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-4">
                  <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-3 text-[11px] text-[#0f417a] dark:text-blue-300 font-medium leading-relaxed">
                    Please enter your current active password to proceed with setting up a new security credential.
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Current Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.old ? "text" : "password"}
                        name="oldPassword"
                        value={form.oldPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full text-xs pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 transition font-semibold text-slate-800 dark:text-slate-105 ${errors.oldPassword ? 'border-red-300 dark:border-red-900/50 focus:ring-red-100 dark:focus:ring-red-950/30 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-100 dark:focus:ring-blue-950/30 focus:border-blue-500'
                          }`}
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <button
                        type="button"
                        onClick={() => toggleShow('old')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword.old ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.oldPassword && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold mt-1">{errors.oldPassword}</p>
                    )}
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0f417a] dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Next</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>

            {/* Slide 2: Enter New Password */}
            <div className="w-1/2 p-6 flex flex-col justify-between">
              <form onSubmit={handleResetPassword} className="space-y-4 flex-grow flex flex-col justify-between">
                <div className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.new ? "text" : "password"}
                        name="newPassword"
                        value={form.newPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full text-xs pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 transition font-semibold text-slate-800 dark:text-slate-105 ${errors.newPassword ? 'border-red-300 dark:border-red-900/50 focus:ring-red-100 dark:focus:ring-red-950/30 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-100 dark:focus:ring-blue-950/30 focus:border-blue-500'
                          }`}
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <button
                        type="button"
                        onClick={() => toggleShow('new')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword.new ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.newPassword && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold mt-1">{errors.newPassword}</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword.confirm ? "text" : "password"}
                        name="confirmPassword"
                        value={form.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        className={`w-full text-xs pl-9 pr-10 py-2.5 bg-slate-50 dark:bg-slate-800/50 border rounded-xl focus:outline-none focus:ring-2 transition font-semibold text-slate-800 dark:text-slate-105 ${errors.confirmPassword ? 'border-red-300 dark:border-red-900/50 focus:ring-red-100 dark:focus:ring-red-950/30 focus:border-red-500' : 'border-slate-200 dark:border-slate-700 focus:ring-blue-100 dark:focus:ring-blue-950/30 focus:border-blue-500'
                          }`}
                      />
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
                      <button
                        type="button"
                        onClick={() => toggleShow('confirm')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 cursor-pointer"
                      >
                        {showPassword.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {errors.confirmPassword && (
                      <p className="text-[10px] text-red-500 dark:text-red-400 font-semibold mt-1">{errors.confirmPassword}</p>
                    )}
                  </div>
                </div>

                <div className="pt-6 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setCurrentSlide(0)}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs rounded-xl border border-slate-200 dark:border-slate-700 transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <ArrowLeft className="h-3.5 w-3.5" />
                    <span>Back</span>
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-[#0f417a] dark:bg-blue-600 hover:bg-blue-800 dark:hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow transition cursor-pointer flex items-center space-x-1.5"
                  >
                    <span>Submit Reset</span>
                    <CheckCircle className="h-3.5 w-3.5" />
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
}
