import React from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import sagarmanthanLogo from '../../../assets/sagarmanthan_logo.png';
import { RECAPTCHA_SITE_KEY } from '../constants';

export default function LoginCard({
  email,
  password,
  showPassword,
  rememberMe,
  loginError,
  isSubmitting,
  dispatch,
  onSubmit,
  onForgotPasswordClick
}) {
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {/* SAGARMANTHAN Portal Branding (Top Center) */}
      <div className="flex items-center justify-center space-x-3 pb-3 select-none border-b border-white/10 w-full">
        <img
          src={sagarmanthanLogo}
          alt="Sagarmanthan Logo"
          className="h-9 w-auto object-contain"
        />
        <div className="leading-none text-left">
          <h2 className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent font-display font-sans">
            SAGARMANTHAN
          </h2>
          <span className="block text-[9px] text-cyan-300 font-mono tracking-widest uppercase mt-0.5">
            National Database Portal
          </span>
        </div>
      </div>

      {/* Email/Username Field */}
      <div className="space-y-2 text-left">
        <label className="text-xs font-semibold text-white tracking-wide block">
          Email / Username
        </label>
        <input
          type="text"
          required
          value={email}
          onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'email', value: e.target.value })}
          placeholder="Enter your email id or username"
          className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
        />
      </div>

      {/* Password Field */}
      <div className="space-y-2 text-left">
        <label className="text-xs font-semibold text-white tracking-wide block">
          Password
        </label>
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            required
            value={password}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'password', value: e.target.value })}
            placeholder="Enter your password"
            className="w-full text-xs pl-4 pr-10 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
          />
          <button
            type="button"
            onClick={() => dispatch({ type: 'SET_FIELD', field: 'showPassword', value: !showPassword })}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-450 hover:text-slate-700 cursor-pointer"
            style={{ border: 'none', background: 'none' }}
          >
            {showPassword ? (
              <EyeOff className="h-4.5 w-4.5" />
            ) : (
              <Eye className="h-4.5 w-4.5" />
            )}
          </button>
        </div>
      </div>

      {/* Remember Me & Forgot Password Row */}
      <div className="flex items-center justify-between text-xs text-white">
        <label className="inline-flex items-center space-x-2 cursor-pointer font-medium select-none">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => dispatch({ type: 'SET_FIELD', field: 'rememberMe', value: e.target.checked })}
            className="h-4 w-4 rounded border-white/30 text-blue-600 focus:ring-blue-500 bg-white/20 cursor-pointer"
          />
          <span>Remember Me</span>
        </label>
        <button
          type="button"
          onClick={onForgotPasswordClick}
          className="font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-white focus:outline-none"
          style={{ border: 'none', background: 'none' }}
        >
          Forgot Password?
        </button>
      </div>

      {/* Google reCAPTCHA Widget */}
      <div className="w-full flex justify-center bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner overflow-hidden">
        <div className="scale-100 sm:scale-105 origin-center flex justify-center w-full py-1">
          <ReCAPTCHA
            sitekey={RECAPTCHA_SITE_KEY}
            onChange={(val) => {
              dispatch({ type: 'SET_FIELD', field: 'recaptchaToken', value: val || "" });
              dispatch({ type: 'SET_FIELD', field: 'captchaVerified', value: !!val });
            }}
            theme="light"
          />
        </div>
      </div>

      {/* Error Message */}
      {loginError && (
        <div className="w-full text-center text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg animate-fade-in whitespace-pre-line text-left">
          {loginError}
        </div>
      )}

      {/* Submit Button */}
      <button
        type="submit"
        disabled={isSubmitting}
        className={`w-full py-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer flex items-center justify-center gap-2 ${
          isSubmitting ? "opacity-75 cursor-not-allowed" : ""
        }`}
      >
        {isSubmitting ? (
          <>
            <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Verifying details...</span>
          </>
        ) : (
          "Login"
        )}
      </button>
    </form>
  );
}
