import { useState, useEffect } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import ReCAPTCHA from 'react-google-recaptcha';
import ChangePasswordModal from './ChangePasswordModal';

const BG_IMAGES = [
  'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1920&q=80', // Ocean container port loading cranes
  'https://media.istockphoto.com/id/1214341878/photo/industrial-cranes-at-sea-port-mumbai.jpg?s=2048x2048&w=is&k=20&c=mHdQMSbtnnNXziCWN58q2DVUzlwdVCJfC3fyz7iirY4=', // Port shipping terminal yard and docked vessel
  'https://images.unsplash.com/photo-1767358603377-ac96bb38a99d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'  // Harbor loading docks and port cranes on the water
];

export default function LoginView({ onLogin }) {
  const [email, setEmail] = useState('testmopsw@gmail.com');
  const [password, setPassword] = useState('••••••••••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [currentBgIndex, setCurrentBgIndex] = useState(0);

  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  // Cycle background images every 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentBgIndex((prev) => (prev + 1) % BG_IMAGES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!captchaVerified) {
      alert('Please check the CAPTCHA box to verify you are not a robot.');
      return;
    }
    onLogin();
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-slate-950 font-sans select-none overflow-y-auto py-10 md:py-16 relative z-50">
      
      {/* Background Image Carousel (Smooth Opacity Transition) */}
      {BG_IMAGES.map((imgUrl, idx) => (
        <div
          key={idx}
          className={`fixed inset-0 bg-cover bg-center transition-opacity duration-1000 ease-in-out ${
            idx === currentBgIndex ? 'opacity-100' : 'opacity-0'
          }`}
          style={{ backgroundImage: `url('${imgUrl}')` }}
        />
      ))}

      {/* Smooth Darkening Overlay to Match Colors of Reference */}
      <div className="fixed inset-0 bg-[#3a1c3e]/30 mix-blend-multiply"></div>
      <div className="fixed inset-0 bg-gradient-to-tr from-slate-950/70 via-slate-900/30 to-transparent"></div>

      {/* Main Container */}
      <div className="relative w-full max-w-6xl mx-auto px-6 sm:px-12 flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
        
        {/* Left Side: Dynamic Marine Typography */}
        <div className="text-left max-w-xl text-white space-y-5 animate-fade-in">
          <div className="space-y-1">
            {/* Styled title matching Travel layout */}
            {/*<div className="flex items-center space-x-1.5 text-2xl font-light tracking-wide text-cyan-300">*/}
            {/*  <img src="src/assets/sagarmanthan_logo.png" />*/}
            {/*  <span className="text-sm sm:text-lg font-black tracking-wider bg-gradient-to-r from-white to-cyan-200 bg-clip-text text-transparent font-display">*/}
            {/*      SAGARMANTHAN*/}
            {/*  </span>*/}

            {/*</div>*/}
            
            {/* Giant Bold Headers */}
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-wider leading-none mt-1 select-text">
              MONITOR
            </h1>
            <h1 className="text-5xl sm:text-7xl font-extrabold tracking-wider leading-none select-text">
              OCEANS
            </h1>
          </div>

          <div className="space-y-2">
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
          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* Government of India & Sagarmanthan Branding Header Image */}
            <div className="bg-white/95 p-4 rounded-xl shadow-inner flex justify-center items-center">
              <img
                src="/sagarmanthanLogin.png"
                alt="Government of India - Ministry of Ports, Shipping and Waterways - SAGARMANTHAN"
                className="w-full h-auto max-h-16 object-contain"
              />
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
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full text-xs pl-4 pr-10 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
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
              <a
                href="#forgot"
                className="font-bold hover:underline"
                onClick={(e) => { e.preventDefault(); setIsForgotModalOpen(true); }}
              >
                Forgot Password?
              </a>
            </div>

            {/* Real Google reCAPTCHA Widget */}
            <div className="w-full flex justify-center bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner">
              <ReCAPTCHA
                sitekey="6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"
                onChange={(val) => setCaptchaVerified(!!val)}
                theme="light"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full py-3.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.98] rounded-lg shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
            >
              Login
            </button>

            {/* Or separator */}
            {/* <div className="flex items-center my-4">
              <div className="flex-grow border-t border-white/20"></div>
              <span className="px-3 text-xs text-slate-300 font-semibold uppercase tracking-wider">or</span>
              <div className="flex-grow border-t border-white/20"></div>
            </div> */}

            {/* Secure MoPSW SSO Login option */}
            {/* <button
              type="button"
              onClick={handleSubmit}
              className="w-full py-3.5 text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 active:scale-[0.98] rounded-lg shadow transition-all focus:outline-none focus:ring-2 focus:ring-slate-300 flex items-center justify-center space-x-2 cursor-pointer"
            >
              <Shield className="h-4 w-4 text-amber-600 fill-amber-50" />
              <span>Login with MoPSW SSO</span>
            </button> */}

            {/* Footer Host Agency Reference */}
            <div className="text-center text-[10px] text-slate-300 font-medium pt-2">
              Developed and Hosted by <span className="text-white font-bold">NTCPWC, IIT Madras</span>
            </div>

          </form>
        </div>

      </div>
      <ChangePasswordModal 
        isOpen={isForgotModalOpen} 
        onClose={() => setIsForgotModalOpen(false)} 
        isForgotPassword={true} 
      />
    </div>
  );
}
