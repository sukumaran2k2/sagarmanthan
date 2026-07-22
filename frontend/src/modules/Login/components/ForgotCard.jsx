import React from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import { RECAPTCHA_SITE_KEY } from '../constants';

export default function ForgotCard({
  forgotStep,
  forgotEmail,
  forgotError,
  otp,
  newPassword,
  confirmPassword,
  showNewPassword,
  dispatch,
  handleSendOtp,
  handleResetFlow,
  handleVerifyOtpAndReset
}) {
  return (
    <div className="space-y-5">
      {/* Forgot Password Header */}
      <div className="text-center pb-2 select-none border-b border-white/10">
        <h2 className="text-lg font-bold text-white font-display">
          Forgot Password
        </h2>
        <p className="text-[10px] text-slate-300 font-medium mt-0.5">
          Reset credentials via secure OTP verification
        </p>
      </div>

      {forgotStep === 1 && (
        /* Step 1: Send OTP to Email */
        <form onSubmit={handleSendOtp} className="space-y-5 text-left">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white tracking-wide block">
              Registered Email Address
            </label>
            <input
              type="email"
              required
              value={forgotEmail}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'forgotEmail', value: e.target.value })}
              placeholder="Enter your registered email id"
              className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
            />
          </div>

          {/* Google reCAPTCHA Widget for Password Reset */}
          <div className="w-full flex justify-center bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner overflow-hidden animate-fade-in">
            <div className="scale-95 origin-center flex justify-center w-full py-1">
              <ReCAPTCHA
                sitekey={RECAPTCHA_SITE_KEY}
                onChange={(val) => {
                  dispatch({ type: 'SET_FIELD', field: 'forgotRecaptchaToken', value: val || "" });
                }}
                theme="light"
              />
            </div>
          </div>

          {forgotError && (
            <div className="w-full text-center text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg animate-fade-in whitespace-pre-line text-left">
              {forgotError}
            </div>
          )}

          <button
            type="submit"
            className="w-full py-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          >
            Send Verification OTP
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={handleResetFlow}
              className="text-xs font-bold text-white hover:underline focus:outline-none cursor-pointer border-none bg-none"
              style={{ border: 'none', background: 'none' }}
            >
              Back to Login
            </button>
          </div>
        </form>
      )}

      {forgotStep === 2 && (
        /* Step 2: Input OTP & New Password */
        <form onSubmit={handleVerifyOtpAndReset} className="space-y-5 text-left">
          {/* OTP Notification Banner */}
          <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl font-medium flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>Verification OTP sent to {forgotEmail}</span>
          </div>

          {/* Forgot Error Banner */}
          {forgotError && (
            <div className="text-[11px] text-red-200 bg-red-600/20 border border-red-500/30 px-3.5 py-2 rounded-xl font-semibold flex items-center space-x-2 animate-fade-in">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400"></span>
              <span>{forgotError}</span>
            </div>
          )}

          {/* OTP Input */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white tracking-wide block flex justify-between">
              <span>One-Time Password (OTP)</span>
              <span className="text-[10px] text-slate-300 font-mono">
                6-Digit Code
              </span>
            </label>
            <input
              type="text"
              required
              maxLength={6}
              value={otp}
              onChange={(e) =>
                dispatch({ type: 'SET_FIELD', field: 'otp', value: e.target.value.replace(/\D/g, "") })
              }
              placeholder="Enter 6-digit OTP code"
              className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-center tracking-widest text-sm"
            />
          </div>

          {/* New Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white tracking-wide block">
              New Password
            </label>
            <div className="relative">
              <input
                type={showNewPassword ? "text" : "password"}
                required
                disabled={otp.length !== 6}
                value={newPassword}
                onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'newPassword', value: e.target.value })}
                placeholder="••••••••"
                className="w-full text-xs pl-4 pr-10 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold disabled:bg-slate-200/50 disabled:text-slate-400 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                disabled={otp.length !== 6}
                onClick={() => dispatch({ type: 'SET_FIELD', field: 'showNewPassword', value: !showNewPassword })}
                className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-slate-700 cursor-pointer disabled:pointer-events-none"
                style={{ border: 'none', background: 'none' }}
              >
                {showNewPassword ? (
                  <EyeOff className="h-4.5 w-4.5" />
                ) : (
                  <Eye className="h-4.5 w-4.5" />
                )}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-white tracking-wide block">
              Confirm New Password
            </label>
            <input
              type="password"
              required
              disabled={otp.length !== 6}
              value={confirmPassword}
              onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'confirmPassword', value: e.target.value })}
              placeholder="••••••••"
              className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold disabled:bg-slate-200/50 disabled:text-slate-400 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={otp.length !== 6}
            className="w-full py-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Verify & Reset Password
          </button>

          <div className="flex items-center justify-between pt-2 text-xs">
            <button
              type="button"
              onClick={() =>
                alert("Verification OTP has been re-sent.")
              }
              className="font-bold text-cyan-300 hover:underline focus:outline-none cursor-pointer"
              style={{ border: 'none', background: 'none' }}
            >
              Resend OTP
            </button>
            <button
              type="button"
              onClick={handleResetFlow}
              className="font-bold text-white hover:underline focus:outline-none cursor-pointer"
              style={{ border: 'none', background: 'none' }}
            >
              Back to Login
            </button>
          </div>
        </form>
      )}

      {forgotStep === 3 && (
        /* Step 3: Success Confirmation */
        <div className="space-y-5 text-center py-4">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-sm font-bold text-white">
              Password Reset Successful
            </h3>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              Your credentials have been securely updated. You can now
              use your new password to access the portal.
            </p>
          </div>
          <button
            onClick={handleResetFlow}
            className="w-full py-2.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 rounded-lg shadow-md cursor-pointer transition-all focus:outline-none"
          >
            Back to Login
          </button>
        </div>
      )}
    </div>
  );
}
