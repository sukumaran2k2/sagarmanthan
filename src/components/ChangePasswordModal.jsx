import React, { useState } from 'react';
import { X, ChevronRight, CheckCircle2, Lock, Mail, KeyRound } from 'lucide-react';

export default function ChangePasswordModal({ isOpen, onClose, isForgotPassword = false }) {
  const [step, setStep] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reset step when opened
  React.useEffect(() => {
    if (isOpen) {
      setStep(0);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNext = (e) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      onClose();
      // Reset state after close animation
      setTimeout(() => setStep(0), 300);
    }, 1000);
  };
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
        onClick={() => !isSubmitting && onClose()}
      />
      
      {/* Modal Dialog */}
      <div className="relative bg-white dark:bg-[#1e293b] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-fade-in border border-slate-200 dark:border-slate-700">
        
        {/* Close button */}
        <button 
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Progress indicator */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-100 dark:bg-slate-800">
          <div 
            className="h-full bg-blue-600 transition-all duration-300 ease-out"
            style={{ width: `${((step + 1) / 4) * 100}%` }}
          />
        </div>

        <div className="p-8 pb-10">
          {/* Carousel container */}
          <div className="overflow-hidden">
            <div 
              className="flex transition-transform duration-500 ease-in-out"
              style={{ transform: `translateX(-${step * 100}%)` }}
            >
              {/* Step 0: Current Password */}
              <div className="w-full flex-shrink-0 animate-fade-in px-1">
                <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-2">Verify Current Password</h3>
                <p className="text-sm text-slate-500 mb-6">Enter your current password to authorize this change.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Current Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="password" 
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors dark:text-white"
                        placeholder="Enter current password"
                        required
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleNext}
                    disabled={!currentPassword}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Continue <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Step 1: Email */}
              <div className="w-full flex-shrink-0 px-1">
                <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-2">Verify Email</h3>
                <p className="text-sm text-slate-500 mb-6">Enter your registered email address to receive an OTP.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Email Address</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="email" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors dark:text-white"
                        placeholder="Enter your email"
                        required
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleNext}
                    disabled={!email || !email.includes('@')}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Send OTP <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Step 2: OTP */}
              <div className="w-full flex-shrink-0 px-1">
                <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-2">Enter OTP</h3>
                <p className="text-sm text-slate-500 mb-6">Enter the 6-digit code sent to your email.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">One Time Password</label>
                    <div className="relative">
                      <KeyRound className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="text" 
                        value={otp}
                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors tracking-widest text-center dark:text-white"
                        placeholder="000000"
                        required
                      />
                    </div>
                  </div>
                  <button 
                    onClick={handleNext}
                    disabled={otp.length !== 6}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    Verify OTP <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Step 3: New Password */}
              <div className="w-full flex-shrink-0 px-1">
                <h3 className="text-xl font-display font-bold text-slate-800 dark:text-white mb-2">Create New Password</h3>
                <p className="text-sm text-slate-500 mb-6">Your new password must be different from previous passwords.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">New Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="password" 
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors dark:text-white"
                        placeholder="New password"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Confirm Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                      <input 
                        type="password" 
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className={`w-full pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-800/50 border rounded-lg text-sm focus:outline-none focus:ring-1 transition-colors dark:text-white ${
                          confirmPassword && newPassword !== confirmPassword 
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500' 
                            : 'border-slate-200 dark:border-slate-700 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                        placeholder="Confirm new password"
                        required
                      />
                    </div>
                    {confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-[10px] text-red-500 mt-1">Passwords do not match</p>
                    )}
                  </div>
                  <button 
                    onClick={handleSubmit}
                    disabled={!newPassword || newPassword !== confirmPassword || isSubmitting}
                    className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
                  >
                    {isSubmitting ? (
                      <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                    ) : (
                      <>Update Password <CheckCircle2 className="h-4 w-4" /></>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
