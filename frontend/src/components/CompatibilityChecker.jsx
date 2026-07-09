import React, { useState, useEffect } from 'react';
import { AlertTriangle, WifiOff, X, ShieldAlert, Monitor } from 'lucide-react';

export default function CompatibilityChecker() {
  const [showAlert, setShowAlert] = useState(false);
  const [alertType, setAlertType] = useState(null); // 'browser' | 'bandwidth' | 'offline'
  const [speedInfo, setSpeedInfo] = useState('');

  // 1. Browser compatibility check (Runs once on mount)
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

  // 2. Bandwidth/Internet speed check
  const checkBandwidth = async () => {
    // Check if offline
    if (!navigator.onLine) {
      setAlertType('offline');
      setShowAlert(true);
      return;
    }

    // Try detecting via Network Information API if available (Chrome, Edge, Opera, Android)
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (conn && typeof conn.downlink === 'number') {
      if (conn.downlink < 1.5) {
        setAlertType('bandwidth');
        setSpeedInfo(`${conn.downlink.toFixed(1)} Mbps`);
        setShowAlert(true);
        return;
      }
    }

    // Fallback: Perform a quick latency check
    try {
      const start = performance.now();
      await fetch('http://localhost:3000/userlist', { cache: 'no-store' });
      const end = performance.now();
      const durationMs = end - start;

      // If response takes more than 1200ms, classify as low speed
      if (durationMs > 1200) {
        setAlertType('bandwidth');
        setSpeedInfo('High latency detected');
        setShowAlert(true);
      }
    } catch (error) {
      // If endpoint is unreachable, check if we're actually online
      if (!navigator.onLine) {
        setAlertType('offline');
        setShowAlert(true);
      }
    }
  };

  useEffect(() => {
    // Run browser compatibility check on mount
    const ok = checkBrowserCompatibility();
    
    // If browser is compatible, check bandwidth
    if (ok) {
      checkBandwidth();
    }

    // Check bandwidth every 5 minutes in the background
    const interval = setInterval(() => {
      checkBandwidth();
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(interval);
  }, []);

  if (!showAlert) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/60 dark:bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-2xl animate-fade-in text-slate-800 dark:text-slate-100">
        
        {/* WhatsApp-style warning banner header */}
        <div className="bg-amber-500 text-slate-950 px-5 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            {alertType === 'browser' && <Monitor className="h-5 w-5 stroke-[2.5]" />}
            {alertType === 'bandwidth' && <AlertTriangle className="h-5 w-5 stroke-[2.5]" />}
            {alertType === 'offline' && <WifiOff className="h-5 w-5 stroke-[2.5]" />}
            <span className="font-black font-display text-sm uppercase tracking-wider">
              {alertType === 'browser' && 'Compatibility Warning'}
              {alertType === 'bandwidth' && 'Weak Network Warning'}
              {alertType === 'offline' && 'Connection Offline'}
            </span>
          </div>
          {/* Close button */}
          <button 
            onClick={() => setShowAlert(false)}
            className="p-1 hover:bg-slate-950/10 active:scale-95 rounded-lg transition cursor-pointer"
            title="Dismiss Alert"
          >
            <X className="h-4.5 w-4.5 stroke-[2.5]" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <p className="text-xs font-semibold leading-relaxed text-slate-600 dark:text-slate-400">
            {alertType === 'browser' && (
              'Your web browser does not support all modern JavaScript standards required for SAGARMANTHAN 3.0. Please update your browser to Google Chrome, Microsoft Edge, or Mozilla Firefox for a compatible experience.'
            )}
            {alertType === 'bandwidth' && (
              `Slow network connection detected (${speedInfo || 'Low Speed'}). Proceeding may result in delayed telemetry synchronization, slow image loading, or sluggish dashboard interactions.`
            )}
            {alertType === 'offline' && (
              'You are currently offline. Please check your internet connectivity. The portal will automatically reconnect once your network is stable.'
            )}
          </p>

          <div className="flex gap-3">
            <button
              onClick={() => setShowAlert(false)}
              className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-[0.98] text-slate-950 font-extrabold text-xs rounded-xl shadow-md transition cursor-pointer text-center"
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
