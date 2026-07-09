import React, { useState, useEffect } from 'react';
import { AlertTriangle, WifiOff, X, Monitor, CheckCircle } from 'lucide-react';

/* 
========================================================================
RESTORE INSTRUCTIONS:
To restore the real production diagnostics and bandwidth checks:
1. Delete the "MOCK DIAGNOSTICS LOGIC" block below.
2. Uncomment the "ORIGINAL DIAGNOSTICS LOGIC" block at the bottom of the file.
3. In App.jsx, revert the setInterval mock timing if applicable.
========================================================================
*/

// ========================================================================
// MOCK DIAGNOSTICS LOGIC
// ========================================================================
// export default function CompatibilityChecker() {
//   const [showAlert, setShowAlert] = useState(false);
//   const [alertType, setAlertType] = useState('bandwidth'); // 'browser' | 'bandwidth' | 'offline'
//   const [mockSpeed, setMockSpeed] = useState('45.2 Mbps');
//   const [isSpeedGood, setIsSpeedGood] = useState(true);

//   // Triggered when captcha is validated in Login.jsx
//   useEffect(() => {
//     const handleCaptchaChecked = () => {
//       // Simulate random bandwidth speed
//       const speed = (0.5 + Math.random() * 80).toFixed(1);
//       const isGood = parseFloat(speed) >= 2.0;

//       setMockSpeed(`${speed} Mbps`);
//       setIsSpeedGood(isGood);
//       setAlertType(isGood ? 'browser' : 'bandwidth'); // Show alert if slow or just general check
//       setShowAlert(true);
//     };

//     window.addEventListener('captcha-checked', handleCaptchaChecked);
//     return () => window.removeEventListener('captcha-checked', handleCaptchaChecked);
//   }, []);

//   // Dispatch a notification popup every 10 seconds
//   useEffect(() => {
//     const triggerMockNotification = () => {
//       const currentSpeed = (0.5 + Math.random() * 80).toFixed(1);
//       window.dispatchEvent(
//         new CustomEvent('show-notification', {
//           detail: { message: `Bandwidth is ${currentSpeed} Mbps` }
//         })
//       );
//     };

//     // Run initial notification
//     triggerMockNotification();

//     const interval = setInterval(triggerMockNotification, 10000); // 10 seconds
//     return () => clearInterval(interval);
//   }, []);

//   if (!showAlert) return null;

//   return (
//     <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
//       <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in text-slate-800 dark:text-slate-100">

//         {/* WhatsApp-style warning/status banner header */}
//         <div className={`px-5 py-4 flex items-center justify-between text-slate-950 ${isSpeedGood ? 'bg-emerald-500' : 'bg-amber-500'
//           }`}>
//           <div className="flex items-center space-x-2.5">
//             {isSpeedGood ? <CheckCircle className="h-5 w-5 stroke-[2.5]" /> : <AlertTriangle className="h-5 w-5 stroke-[2.5]" />}
//             <span className="font-black font-display text-sm uppercase tracking-wider">
//               {isSpeedGood ? 'Connection Diagnostics Stable' : 'Weak Connection Detected'}
//             </span>
//           </div>
//           {/* Close button */}
//           <button
//             onClick={() => setShowAlert(false)}
//             className="p-1 hover:bg-slate-950/10 active:scale-95 rounded-lg transition cursor-pointer"
//             title="Dismiss Alert"
//           >
//             <X className="h-4.5 w-4.5 stroke-[2.5]" />
//           </button>
//         </div>

//         <div className="p-6 space-y-4">
//           <div className="space-y-3">
//             <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
//               <span className="text-xs font-bold text-slate-500">Browser Compatibility</span>
//               <span className="text-xs font-black text-emerald-600 dark:text-emerald-450 uppercase">Compatible (Good)</span>
//             </div>
//             <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-2">
//               <span className="text-xs font-bold text-slate-500">Network Bandwidth</span>
//               <span className={`text-xs font-black uppercase ${isSpeedGood ? 'text-emerald-600 dark:text-emerald-450' : 'text-amber-600'
//                 }`}>
//                 {isSpeedGood ? 'Good' : 'Bad'} ({mockSpeed})
//               </span>
//             </div>
//           </div>

//           <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
//             {isSpeedGood
//               ? 'Your browser capabilities and network bandwidth are sufficient for a premium data portal experience.'
//               : 'Slow network connection detected. Proceeding may result in delayed telemetry synchronization or sluggish dashboard interactions.'
//             }
//           </p>

//           <div className="flex gap-3">
//             <button
//               onClick={() => setShowAlert(false)}
//               className={`flex-1 py-2.5 font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer text-center text-slate-950 ${isSpeedGood ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-amber-500 hover:bg-amber-600'
//                 }`}
//             >
//               Acknowledge & Continue
//             </button>
//           </div>
//         </div>

//       </div>
//     </div>
//   );
// }

// ========================================================================
// ORIGINAL DIAGNOSTICS LOGIC (Commented out for mock purposes)
// ========================================================================
export function ProductionCompatibilityChecker() {
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState(null); // 'browser' | 'bandwidth' | 'offline'
  const [speedInfo, setSpeedInfo] = useState('');

  const checkBrowserCompatibility = () => {
    const isCompatible =
      typeof window.fetch === 'function' &&
      typeof window.localStorage !== 'undefined' &&
      typeof window.Promise !== 'undefined';

    if (!isCompatible) {
      setAlertType('browser');
      setShowAlert(true);
      return false;
    }
    return true;
  };

  const checkBandwidth = async () => {
    if (!navigator.onLine) {
      setAlertType('offline');
      setShowAlert(true);
      return;
    }

    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && typeof conn.downlink === 'number') {
      if (conn.downlink < 1.5) {
        setAlertType('bandwidth');
        setSpeedInfo(`${conn.downlink.toFixed(1)} Mbps`);
        setShowAlert(true);
        return;
      }
    }

    try {
      const start = performance.now();
      await fetch('http://localhost:3000/userlist', { cache: 'no-store' });
      const end = performance.now();
      const durationMs = end - start;

      if (durationMs > 1200) {
        setAlertType('bandwidth');
        setSpeedInfo('High latency detected');
        setShowAlert(true);
      }
    } catch (error) {
      if (!navigator.onLine) {
        setAlertType('offline');
        setShowAlert(true);
      }
    }
  };

  useEffect(() => {
    const ok = checkBrowserCompatibility();
    if (ok) {
      checkBandwidth();
    }

    const interval = setInterval(() => {
      checkBandwidth();
    }, 5 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  if (!showAlert) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in text-slate-800 dark:text-slate-100">
        <div className="bg-amber-500 text-slate-950 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {alertType === 'browser' && <Monitor className="h-5 w-5 stroke-[2.5]" />}
            {alertType === 'bandwidth' && <AlertTriangle className="h-5 w-5 stroke-[2.5]" />}
            {alertType === 'offline' && <WifiOff className="h-5 w-5 stroke-[2.5]" />}
            <span className="font-black font-display text-sm uppercase tracking-wider">
              {alertType === 'browser' ? 'Compatibility Warning' : alertType === 'bandwidth' ? 'Weak Network Warning' : 'Connection Offline'}
            </span>
          </div>
          <button onClick={() => setShowAlert(false)} className="p-1 hover:bg-slate-950/10 active:scale-95 rounded-lg transition cursor-pointer">
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
            {alertType === 'browser' && 'Your web browser does not support all modern JavaScript standards.'}
            {alertType === 'bandwidth' && `Slow network connection detected (${speedInfo || 'Low Speed'}).`}
            {alertType === 'offline' && 'You are currently offline.'}
          </p>
          <div className="flex gap-3">
            <button onClick={() => setShowAlert(false)} className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-extrabold text-xs rounded-xl">
              Acknowledge & Continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
