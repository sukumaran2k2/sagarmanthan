import { useState, useEffect } from "react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";
import ReCAPTCHA from "react-google-recaptcha";
import sagarmanthanLogo from "../../assets/sagarmanthan_logo.png";
import axios from "axios";
import forge from "node-forge";

const PUBLIC_KEY_PEM = (import.meta.env.VITE_RSA_PUBLIC_KEY || "").replace(/\\n/g, "\n");

function encryptPassword(password) {
  const publicKey = forge.pki.publicKeyFromPem(PUBLIC_KEY_PEM);
  const bytes = forge.util.encodeUtf8(password);
  const encrypted = publicKey.encrypt(bytes, "RSA-OAEP", {
    md: forge.md.sha256.create(),
    mgf1: { md: forge.md.sha256.create() },
  });
  return forge.util.encode64(encrypted);
}

const BG_IMAGES = [
  "https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=1920&q=80", // Ocean container port loading cranes
  "https://media.istockphoto.com/id/1214341878/photo/industrial-cranes-at-sea-port-mumbai.jpg?s=2048x2048&w=is&k=20&c=mHdQMSbtnnNXziCWN58q2DVUzlwdVCJfC3fyz7iirY4=", // Port shipping terminal yard and docked vessel
  "https://images.unsplash.com/photo-1767358603377-ac96bb38a99d?q=80&w=1170&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D", // Harbor loading docks and port cranes on the water
];

export default function LoginView({ onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);
  const [recaptchaToken, setRecaptchaToken] = useState("");

  // Forgot password flow states
  const [view, setView] = useState("login"); // 'login' or 'forgot'
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotStep, setForgotStep] = useState(1); // 1: Send OTP, 2: Enter OTP & New Password, 3: Success
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [forgotError, setForgotError] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotRecaptchaToken, setForgotRecaptchaToken] = useState("");

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
    setForgotError("");
    setLoginError("");
    setIsSubmitting(true);

    if (!recaptchaToken) {
      setLoginError("Please complete the reCAPTCHA verification.");
      setIsSubmitting(false);
      return;
    }

    let encrypted;
    try {
      encrypted = encryptPassword(password);
    } catch (err) {
      setLoginError("Encryption failed: " + err.message);
      setIsSubmitting(false);
      return;
    }

    axios
      .post("http://localhost:3000/login-validation", {
        email,
        password: encrypted,
        recaptchaResponse: recaptchaToken,
      })
      .then((res) => {
        setIsSubmitting(false);
        if (res.data.accessToken) {
          localStorage.setItem("accessToken", res.data.accessToken);
          localStorage.setItem("refreshToken", res.data.refreshToken);
          onLogin();
        } else {
          let errMsg = res.data.message || "Invalid credentials.";
          if (res.data.passwordUpdatedOn) {
            try {
              const d = new Date(res.data.passwordUpdatedOn);
              // Cancel timezone offset shift
              const userOffset = d.getTimezoneOffset() * 60000;
              const adjustedDate = new Date(d.getTime() + userOffset);
              const formattedDate = adjustedDate.toLocaleString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
                hour12: true
              });
              errMsg += `\n(Password was last reset on: ${formattedDate})`;
            } catch (e) {
              errMsg += `\n(Password was last reset on: ${res.data.passwordUpdatedOn})`;
            }
          }
          setLoginError(errMsg);
        }
      })
      .catch((err) => {
        setIsSubmitting(false);
        const msg = err.response?.data?.message || "Login request failed.";
        setLoginError(msg);
      });
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    setForgotError("");

    if (!forgotRecaptchaToken) {
      setForgotError("Please complete the reCAPTCHA verification.");
      return;
    }

    axios
      .post("http://localhost:3000/password-reset-validation", {
        email: forgotEmail,
        updated_on: new Date().toISOString().slice(0, 19).replace("T", " "),
        recaptchaResponse: forgotRecaptchaToken,
      })
      .then((res) => {
        if (res.status === 200 || res.status === 204) {
          setForgotStep(2); // Move to OTP entry step
        } else {
          setForgotError("Email not registered or invalid.");
        }
      })
      .catch((err) => {
        setForgotError(
          err.response?.data?.message || "Request failed. Try again.",
        );
      });
  };

  const handleVerifyOtpAndReset = (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      setForgotError("Please enter a valid 6-digit temporary password.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setForgotError("Passwords do not match.");
      return;
    }
    setForgotError("");

    let encryptedOld, encryptedNew;
    try {
      encryptedOld = encryptPassword(otp);
      encryptedNew = encryptPassword(newPassword);
    } catch (encryptionErr) {
      console.error(encryptionErr);
      setForgotError("Encryption failed.");
      return;
    }

    // First fetch the user list to find the matching userID
    axios
      .get("http://localhost:3000/userlist")
      .then((userListRes) => {
        const users = userListRes.data || [];
        const matchedUser = users.find(
          (u) => u.email.toLowerCase() === forgotEmail.toLowerCase(),
        );

        if (!matchedUser) {
          setForgotError("User not found.");
          return;
        }

        // Send request with userID and loginUser properties
        return axios.put("http://localhost:3000/edit-password", {
          userID: matchedUser.user_id,
          email: forgotEmail,
          loginUser: matchedUser.name,
          oldPassword: encryptedOld,
          newPassword: encryptedNew,
        });
      })
      .then((res) => {
        if (res) {
          setForgotStep(3); // Success step
        }
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.message || "";
        if (errorMsg.includes("Current password is incorrect")) {
          setForgotError("OTP is wrong. Please enter correct.");
        } else {
          setForgotError(errorMsg || "Failed to update password.");
        }
      });
  };

  const handleResetFlow = () => {
    setView("login");
    setForgotStep(1);
    setForgotEmail("");
    setOtp("");
    setNewPassword("");
    setConfirmPassword("");
    setForgotError("");
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      {/* Rotator Wallpapers */}
      {BG_IMAGES.map((img, idx) => (
        <div
          key={idx}
          className={`absolute inset-0 bg-cover bg-center transition-opacity duration-[2000ms] ${
            idx === bgIdx
              ? "opacity-100 animate-ken-burns"
              : "opacity-0 scale-100"
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
              Real-time monitoring, financial tracking, and operational
              intelligence for modern shipping channels.
            </p>
          </div>
        </div>

        {/* Right Side: Floating Glassmorphism Login Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl animate-fade-in">
          {view === "forgot" ? (
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
                <form onSubmit={handleSendOtp} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-xs font-semibold text-white tracking-wide block">
                      Registered Email Address
                    </label>
                    <input
                      type="email"
                      required
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      placeholder="Enter your registered email id"
                      className="w-full text-xs px-4 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold"
                    />
                  </div>

                  {/* Google reCAPTCHA Widget for Password Reset */}
                  <div className="w-full flex justify-center bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner overflow-hidden animate-fade-in">
                    <div className="scale-95 origin-center flex justify-center w-full py-1">
                      <ReCAPTCHA
                        sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY }
                        onChange={(val) => {
                          setForgotRecaptchaToken(val || "");
                        }}
                        theme="light"
                      />
                    </div>
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
                        setOtp(e.target.value.replace(/\D/g, ""))
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
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full text-xs pl-4 pr-10 py-3 bg-white text-slate-800 rounded-lg placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-semibold disabled:bg-slate-200/50 disabled:text-slate-400 disabled:cursor-not-allowed"
                      />
                      <button
                        type="button"
                        disabled={otp.length !== 6}
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-700 cursor-pointer disabled:pointer-events-none"
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
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
          ) : (
            /* Login Form */
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* SAGARMANTHAN Portal Branding (Top Center) */}
              <div className="flex items-center justify-center space-x-3 pb-3 select-none border-b border-white/10 w-full">
                <img
                  src={sagarmanthanLogo}
                  alt="Sagarmanthan Logo"
                  className="h-9 w-auto object-contain"
                />
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
                <label className="text-xs font-semibold text-white tracking-wide block">
                  Email
                </label>
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
                <label className="text-xs font-semibold text-white tracking-wide block">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
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
                  onClick={() => setView("forgot")}
                  className="font-bold hover:underline bg-transparent border-none p-0 cursor-pointer text-white focus:outline-none"
                >
                  Forgot Password?
                </button>
              </div>

              {/* Real Google reCAPTCHA Widget */}
              <div className="w-full flex justify-center bg-white/5 p-2 rounded-lg border border-white/10 shadow-inner overflow-hidden">
                <div className="scale-100 sm:scale-105 origin-center flex justify-center w-full py-1">
                  <ReCAPTCHA
                    sitekey={import.meta.env.VITE_RECAPTCHA_SITE_KEY || "6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI"}
                    onChange={(val) => {
                      setRecaptchaToken(val || "");
                      setCaptchaVerified(!!val);
                    }}
                    theme="light"
                  />
                </div>
              </div>

              {/* Error Message */}
              {loginError && (
                <div className="w-full text-center text-xs font-bold text-red-500 bg-red-500/10 border border-red-500/20 px-3 py-2.5 rounded-lg animate-fade-in whitespace-pre-line">
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
          )}

          {/* Footer Host Agency Reference */}
          <div className="flex flex-col items-center justify-center text-center text-[10px] text-slate-300 font-semibold pt-4 border-t border-white/10 mt-4 select-none">
            <span className="mb-1 text-slate-400">Developed and hosted by</span>
            <div className="flex items-center space-x-1.5">
              <img
                src="/logo-01.png"
                alt="Logo"
                className="h-14 w-auto object-contain"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
