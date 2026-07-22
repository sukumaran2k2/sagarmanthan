import { useReducer } from "react";
import axios from "axios";
import { encryptPassword } from "./utils";
import { API_BASE_URL } from "./constants";

// Import Components
import BackgroundRotator from "./components/BackgroundRotator";
import LeftBranding from "./components/LeftBranding";
import LoginCard from "./components/LoginCard";
import ForgotCard from "./components/ForgotCard";

const initialState = {
  email: "",
  password: "",
  showPassword: false,
  rememberMe: false,
  captchaVerified: false,
  recaptchaToken: "",
  view: "login",
  forgotEmail: "",
  forgotStep: 1,
  otp: "",
  newPassword: "",
  confirmPassword: "",
  showNewPassword: false,
  forgotError: "",
  loginError: "",
  isSubmitting: false,
  forgotRecaptchaToken: ""
};

function loginReducer(state, action) {
  switch (action.type) {
    case 'SET_FIELD':
      return { ...state, [action.field]: action.value };
    case 'RESET_FLOW':
      return {
        ...state,
        view: "login",
        forgotStep: 1,
        forgotEmail: "",
        otp: "",
        newPassword: "",
        confirmPassword: "",
        forgotError: "",
        loginError: "",
        isSubmitting: false
      };
    case 'SWITCH_VIEW':
      return { ...state, view: action.view, loginError: "", forgotError: "" };
    case 'START_SUBMIT':
      return { ...state, isSubmitting: true, loginError: "", forgotError: "" };
    case 'SUBMIT_SUCCESS':
      return { ...state, isSubmitting: false };
    case 'SUBMIT_FAILURE':
      return { ...state, isSubmitting: false, loginError: action.error };
    case 'SEND_OTP_SUCCESS':
      return { ...state, forgotStep: 2, forgotError: "" };
    case 'SEND_OTP_FAILURE':
      return { ...state, forgotError: action.error };
    case 'VERIFY_OTP_SUCCESS':
      return { ...state, forgotStep: 3, forgotError: "" };
    case 'VERIFY_OTP_FAILURE':
      return { ...state, forgotError: action.error };
    default:
      return state;
  }
}

export default function LoginView({ onLogin }) {
  const [state, dispatch] = useReducer(loginReducer, initialState);

  const {
    email,
    password,
    showPassword,
    rememberMe,
    captchaVerified,
    recaptchaToken,
    view,
    forgotEmail,
    forgotStep,
    otp,
    newPassword,
    confirmPassword,
    showNewPassword,
    forgotError,
    loginError,
    isSubmitting,
    forgotRecaptchaToken
  } = state;

  const handleSubmit = (e) => {
    e.preventDefault();
    dispatch({ type: 'START_SUBMIT' });

    if (!recaptchaToken) {
      dispatch({ type: 'SUBMIT_FAILURE', error: "Please complete the reCAPTCHA verification." });
      return;
    }

    let encrypted;
    try {
      encrypted = encryptPassword(password);
    } catch (err) {
      dispatch({ type: 'SUBMIT_FAILURE', error: "Encryption failed: " + err.message });
      return;
    }

    axios
      .post(`${API_BASE_URL}/login-validation`, {
        email,
        password: encrypted,
        recaptchaResponse: recaptchaToken,
      })
      .then((res) => {
        dispatch({ type: 'SUBMIT_SUCCESS' });
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
          dispatch({ type: 'SUBMIT_FAILURE', error: errMsg });
        }
      })
      .catch((err) => {
        const msg = err.response?.data?.message || "Login request failed.";
        dispatch({ type: 'SUBMIT_FAILURE', error: msg });
      });
  };

  const handleSendOtp = (e) => {
    e.preventDefault();
    dispatch({ type: 'SET_FIELD', field: 'forgotError', value: "" });

    if (!forgotRecaptchaToken) {
      dispatch({ type: 'SEND_OTP_FAILURE', error: "Please complete the reCAPTCHA verification." });
      return;
    }

    axios
      .post(`${API_BASE_URL}/password-reset-validation`, {
        email: forgotEmail,
        updated_on: new Date().toISOString().slice(0, 19).replace("T", " "),
        recaptchaResponse: forgotRecaptchaToken,
      })
      .then((res) => {
        if (res.status === 200 || res.status === 204) {
          dispatch({ type: 'SEND_OTP_SUCCESS' });
        } else {
          dispatch({ type: 'SEND_OTP_FAILURE', error: "Email not registered or invalid." });
        }
      })
      .catch((err) => {
        dispatch({
          type: 'SEND_OTP_FAILURE',
          error: err.response?.data?.message || "Request failed. Try again."
        });
      });
  };

  const handleVerifyOtpAndReset = (e) => {
    e.preventDefault();
    if (otp.length < 6) {
      dispatch({ type: 'VERIFY_OTP_FAILURE', error: "Please enter a valid 6-digit temporary password." });
      return;
    }
    if (newPassword !== confirmPassword) {
      dispatch({ type: 'VERIFY_OTP_FAILURE', error: "Passwords do not match." });
      return;
    }
    dispatch({ type: 'SET_FIELD', field: 'forgotError', value: "" });

    let encryptedOld, encryptedNew;
    try {
      encryptedOld = encryptPassword(otp);
      encryptedNew = encryptPassword(newPassword);
    } catch (encryptionErr) {
      console.error(encryptionErr);
      dispatch({ type: 'VERIFY_OTP_FAILURE', error: "Encryption failed." });
      return;
    }

    // First fetch the user list to find the matching userID
    axios
      .get(`${API_BASE_URL}/userlist`)
      .then((userListRes) => {
        const users = userListRes.data || [];
        const matchedUser = users.find(
          (u) => u.email.toLowerCase() === forgotEmail.toLowerCase(),
        );

        if (!matchedUser) {
          dispatch({ type: 'VERIFY_OTP_FAILURE', error: "User not found." });
          return;
        }

        // Send request with userID and loginUser properties
        return axios.put(`${API_BASE_URL}/edit-password`, {
          userID: matchedUser.user_id,
          email: forgotEmail,
          loginUser: matchedUser.name,
          oldPassword: encryptedOld,
          newPassword: encryptedNew,
        });
      })
      .then((res) => {
        if (res) {
          dispatch({ type: 'VERIFY_OTP_SUCCESS' });
        }
      })
      .catch((err) => {
        const errorMsg = err.response?.data?.message || "";
        if (errorMsg.includes("Current password is incorrect")) {
          dispatch({ type: 'VERIFY_OTP_FAILURE', error: "OTP is wrong. Please enter correct." });
        } else {
          dispatch({ type: 'VERIFY_OTP_FAILURE', error: errorMsg || "Failed to update password." });
        }
      });
  };

  const handleResetFlow = () => {
    dispatch({ type: 'RESET_FLOW' });
  };

  return (
    <div className="relative min-h-screen w-full flex items-center justify-center overflow-hidden font-sans">
      <BackgroundRotator />

      {/* Main Container */}
      <div className="relative w-full max-w-7xl mx-auto pl-1 pr-6 sm:pl-2 sm:pr-12 lg:pl-0 lg:pr-16 flex flex-col lg:flex-row items-center justify-between gap-12 z-10">
        <LeftBranding />

        {/* Floating Glassmorphism Input Card */}
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 shadow-2xl animate-fade-in">
          {view === "forgot" ? (
            <ForgotCard
              forgotStep={forgotStep}
              forgotEmail={forgotEmail}
              forgotError={forgotError}
              otp={otp}
              newPassword={newPassword}
              confirmPassword={confirmPassword}
              showNewPassword={showNewPassword}
              dispatch={dispatch}
              handleSendOtp={handleSendOtp}
              handleResetFlow={handleResetFlow}
              handleVerifyOtpAndReset={handleVerifyOtpAndReset}
            />
          ) : (
            <LoginCard
              email={email}
              password={password}
              showPassword={showPassword}
              rememberMe={rememberMe}
              loginError={loginError}
              isSubmitting={isSubmitting}
              dispatch={dispatch}
              onSubmit={handleSubmit}
              onForgotPasswordClick={() => dispatch({ type: 'SWITCH_VIEW', view: 'forgot' })}
            />
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
