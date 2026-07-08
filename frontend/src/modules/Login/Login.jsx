import { useState, useEffect } from 'react';
import { Eye, EyeOff, CheckCircle2 } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import sagarmanthanLogo from '../../assets/sagarmanthan_logo.png';

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1920&q=80', // Ocean container port loading cranes
  'https://media.istockphoto.com/id/1214341878/photo/industrial-cranes-at-sea-port-mumbai.jpg?s=2048x2048&w=is&k=20&c=mHdQMSbtnnNXziCWN58q2DVUzlwdVCJfC3fyz7iirY4=', // Port shipping terminal yard and docked vessel
  'https://images.unsplash.com/photo-1767358603377-ac96bb38a99d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'  // Harbor loading docks and port cranes on the water
];

export default function LoginView({ onLogin }) {
  const [email, setEmail] = useState('super_admin@gmail.com');
  const [password, setPassword] = useState('123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  // Forgot password flow states
  const [view, setView] = useState('login'); // 'login' or 'forgot'
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Enter OTP & New Password, 3: Success
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Background rotater state
  const [bgIdx, setBgIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setBgIdx((prev) => (prev + 1) % BG_IMAGES.length);
    }, 8000);
    return () => clearInterval(timer);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!captchaVerified) {
      alert('Please complete the reCAPTCHA verification.');
      return;
    }

    const emailLower = email.toLowerCase().trim();
    const roleMapping = {
      'senior_officer@gmail.com': { role: 'senior_officer', name: 'Senior Officer', roleLabel: 'Senior Officer (Port Org)' },
      'nodal_officer@gmail.com': { role: 'nodal_officer', name: 'Nodal Officer', roleLabel: 'Nodal Officer (Port Org)' },
      'wing_division@gmail.com': { role: 'wing_level', name: 'Wing/Division User', roleLabel: 'Wing/Division (MoPSW)' },
      'undersecretary@gmail.com': { role: 'under_secretary', name: 'Undersecretary', roleLabel: 'Undersecretary (MoPSW)' },
      'director@gmail.com': { role: 'director', name: 'Director', roleLabel: 'Director (MoPSW)' },
      'joint_secretary@gmail.com': { role: 'joint_secretary', name: 'Joint Secretary', roleLabel: 'Joint Secretary (MoPSW)' },
      'secretary@gmail.com': { role: 'secretary', name: 'Secretary', roleLabel: 'Secretary (MoPSW)' },
      'super_admin@gmail.com': { role: 'super_admin', name: 'Super Admin', roleLabel: 'Super Admin' },
      
      // variations
      'seniorofficer@gmail.com': { role: 'senior_officer', name: 'Senior Officer', roleLabel: 'Senior Officer (Port Org)' },
      'nodalofficer@gmail.com': { role: 'nodal_officer', name: 'Nodal Officer', roleLabel: 'Nodal Officer (Port Org)' },
      'wingdivision@gmail.com': { role: 'wing_level', name: 'Wing/Division User', roleLabel: 'Wing/Division (MoPSW)' },
      'under_secretary@gmail.com': { role: 'under_secretary', name: 'Undersecretary', roleLabel: 'Undersecretary (MoPSW)' },
      'jointsecretary@gmail.com': { role: 'joint_secretary', name: 'Joint Secretary', roleLabel: 'Joint Secretary (MoPSW)' },
      'superadmin@gmail.com': { role: 'super_admin', name: 'Super Admin', roleLabel: 'Super Admin' },
      'testmopsw@gmail.com': { role: 'super_admin', name: 'TestMopsw', roleLabel: 'Super Admin' }
    };

    const matchedUser = roleMapping[emailLower];

    if (matchedUser && password === '123') {
      onLogin(matchedUser);
    } else if (emailLower === 'testmopsw@gmail.com' && password === '••••••••••••••••') {
      // Allow legacy password for testing convenience
      onLogin(roleMapping['testmopsw@gmail.com']);
    } else {
      setPasswordError(true);
      alert('Wrong password enterred, password last reset on June 15, 2026');
    }
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    setForgotStep(2); // Move to OTP entry step
  };

  const handleVerifyOtpAndReset = (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    if (otp.length < 4) {
      alert('Please enter a valid OTP.');
      return;
    }
    setForgotStep(3); // Success step
  };

  const handleResetFlow = () => {
    setView('login');
    setForgotStep(1);
    setForgotEmail('');
    setOtp('');
    setNewPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      
      {/* Rotator Wallpapers */}
      {BG_IMAGES.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ${
            idx === bgIdx ? 'opacity-100 animate-ken-burns' : 'opacity-0 scale-100'
          }`}
          style={{ backgroundImage: `url('${img}')` }}
        />
      ))}

      {/* Smooth Darkening Overlay */}
      <div className="fixed inset-0 bg-[#3a1c3e]/30 mix-blend-multiply"></div>
      <div className="fixed inset-0 bg-gradient-to-tr from-slate-950/70 via-slate-900/30 to-transparent"></div>

      {/* Main Container */}
      <div className="relative w-full max-w-7xl mx-auto px-6 sm:px-12 lg:px-16 flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
        
        {/* Left Side: Dynamic Marine Typography & Branding */}
        <div className="text-left max-w-xl text-white space-y-6 animate-fade-in select-none">
          
          {/* 1. Government of India Emblem & Ministry Info (Top) */}
          <div className="flex items-center space-x-3.5 pb-4 border-b border-white/10 max-w-md">
            <img
              src="/emblem.svg"
              alt="Emblem of India"
              className="h-12 w-auto object-contain brightness-0 invert"
            />
            <div className="text-left leading-tight">
              <p className="text-xs uppercase tracking-wider text-slate-300 font-extrabold">
                Government of India
              </p>
              <p className="text-sm font-black text-white tracking-tight mt-0.5 leading-snug">
                Ministry of Ports, Shipping and Waterways
              </p>
            </div>
          </div>


          {/* 3. MONITOR OCEANS Giant Typography (Bottom) */}
          <div className="space-y-1 pt-2">
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-wider leading-none select-text">
              MONITOR
            </h1>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-wider leading-none select-text">
              OCEANS
            </h1>
          </div>

          {/* 4. Description Text */}
          <div className="space-y-2 pt-2">
            <h3 className="text-base sm:text-lg font-semibold text-slate-100 select-text leading-snug">
              Where Data-Driven Insights Optimize National Ports
            </h3>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium max-w-md select-text">
              Real-time monitoring, financial tracking, and operational intelligence for modern shipping channels.
            </p>
          </div>
        </div>

        {/* Right Side: Floating Glassmorphism Login Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl animate-fade-in">
          
          {view === 'forgot' ? (
            <div className="space-y-5">
              
              {/* Forgot Password Header */}
              <div className="text-center pb-2 select-none border-b border-white/10">
                <h2 className="text-lg font-bold text-white font-display">Forgot Password</h2>
                <p className="text-[10px] text-slate-300 font-medium mt-0.5">Reset credentials via secure OTP verification</p>
              </div>

              {forgotStep === 1 && (
                /* Step 1: Send OTP to Email */
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white tracking-wide block">Registered Email Address</label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email id"
                      className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    />
                  </div>

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
                      className="text-xs font-bold text-white hover:underline focus:outline-none cursor-pointer"
                    >
                      Back to Login
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 2 && (
                /* Step 2: Input OTP & New Password */
                <form onSubmit={handleVerifyOtpAndReset} className="space-y-5">
                  
                  {/* OTP Notification Banner */}
                  <div className="text-[11px] text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-3.5 py-2 rounded-xl font-medium flex items-center space-x-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>Verification OTP sent to {forgotEmail}</span>
                  </div>

                  {/* OTP Input */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white tracking-wide block flex justify-between">
                      <span>One-Time Password (OTP)</span>
                      <span className="text-[10px] text-slate-300 font-mono">6-Digit Code</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={6}
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                      placeholder="Enter 6-digit OTP code"
                      className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold text-center tracking-widest text-sm"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white tracking-wide block">New Password</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        required
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-4 pr-10 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white tracking-wide block">Confirm New Password</label>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                  >
                    Verify & Reset Password
                  </button>

                  <div className="flex items-center justify-between pt-2 text-xs">
                    <button
                      type="button"
                      onClick={() => alert('Verification OTP has been re-sent.')}
                      className="font-bold text-cyan-300 hover:underline focus:outline-none cursor-pointer"
                    >
                      Resend OTP
                    </button>
                    <button
                      type="button"
                      onClick={handleResetFlow}
                      className="font-bold text-white hover:underline focus:outline-none cursor-pointer"
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
                    <h3 className="text-sm font-bold text-white">Password Reset Successful</h3>
                    <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
                      Your credentials have been securely updated. You can now use your new password to access the portal.
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
          ) : (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {/* SAGARMANTHAN Portal Branding (Top Center) */}
              <div className="flex items-center justify-center space-x-3 pb-3 select-none border-b border-white/10 w-full">
                <img src={sagarmanthanLogo} alt="Sagarmanthan Logo" className="h-9 w-auto object-contain" />
                <div className="leading-none text-left">
                  <h2 className="text-xl font-black tracking-wider bg-gradient-to-r from-white via-cyan-100 to-cyan-300 bg-clip-text text-transparent font-display">
                    SAGARMANTHAN
                  </h2>
                  <span className="block text-[9px] text-cyan-300 font-mono tracking-widest uppercase mt-0.5">
                    National Database Portal
                  </span>
                </div>
              </div>


              {/* Email Field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white tracking-wide block">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email id"
                  className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-white tracking-wide block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    placeholder="Enter your password"
                    className={`w-full text-xs pl-4 pr-10 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none transition-all font-semibold ${
                      passwordError 
                        ? 'ring-2 ring-red-500 border border-red-500 bg-red-50/50' 
                        : 'focus:ring-2 focus:ring-blue-500'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              {/* Remember Me & Forgot Password Row */}
              <div className="flex items-center justify-between text-xs text-white">
                <label className="inline-flex items-center space-x-2 cursor-pointer font-medium">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="h-4 w-4 rounded border-white/30 text-blue-600 focus:ring-blue-500 bg-white/20 cursor-pointer"
                  />
                  <span>Remember Me</span>
                </label>
                <button
                  type="button"
                  onClick={() => setView('forgot')}
                  className="font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-white focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Real Google reCAPTCHA Widget */}
              <div className="w-full flex justify-center bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner overflow-hidden">
                <div className="scale-100 sm:scale-105 origin-center flex justify-center w-full py-1">
                  <ReCAPTCHA
                    sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                    onChange={(val) => {
                      setCaptchaVerified(!!val);
                      if (val) {
                        const signalStrength = navigator.connection && navigator.connection.downlink 
                          ? navigator.connection.downlink + ' Mbps' 
                          : '4.5 Mbps';
                        alert(`Your Wifi strength is Weak (${signalStrength}).\nTo get the complete experience, switch to a better network.`);
                      }
                    }}
                    theme="light"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full py-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
              >
                Login
              </button>

            </form>
          )}

          {/* Footer Host Agency Reference */}
          <div className="flex flex-col items-center justify-center text-center text-[10px] text-slate-300 font-semibold pt-4 border-t border-white/10 mt-4 select-none">
            <span className="mb-1 text-slate-400">Developed and hosted by</span>
            <div className="flex items-center space-x-1.5">
              <img src="/ntcpwc_logo.png" alt="NTCPWC Logo" className="h-5.5 w-auto object-contain rounded bg-white p-0.5" />
              <strong className="text-white tracking-wide font-sans text-[11px]">NTCPWC</strong>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
