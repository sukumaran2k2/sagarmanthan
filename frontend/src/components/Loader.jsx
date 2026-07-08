export default function Loader({ message = "Fetching real-time telemetry from Ministry databases...", fullPage = false }) {
  const containerClass = fullPage 
    ? "fixed inset-0 z-55 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-md animate-fade-in"
    : "flex flex-col items-center justify-center p-10 space-y-4 bg-white border border-slate-200 rounded-2xl shadow-lg max-w-md mx-auto my-8 animate-fade-in";

  return (
    <div className={containerClass}>
      <div className="relative flex items-center justify-center mb-6">
        
        {/* Glowing backdrop pulse */}
        <div className="absolute inset-0 bg-blue-500/10 rounded-full blur-3xl animate-pulse"></div>
        
        {/* Concentric animated wave rings */}
        <div className="absolute h-36 w-36 border-2 border-blue-400/10 rounded-full animate-ping [animation-duration:3s]"></div>
        <div className="absolute h-28 w-28 border border-blue-400/20 rounded-full animate-ping [animation-duration:2s]"></div>
        <div className="absolute h-20 w-20 border border-blue-400/30 rounded-full animate-ping [animation-duration:1.5s]"></div>
        
        {/* Custom Animated SVG - Shipping / Maritime Radar theme */}
        <div className="relative z-10 p-6 bg-slate-900 border-2 border-blue-500/40 rounded-full shadow-2xl flex items-center justify-center">
          <svg className="w-16 h-16 text-blue-400" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Outer rotating dashed ring */}
            <circle cx="50" cy="50" r="44" stroke="currentColor" strokeWidth="2" strokeDasharray="6 6" className="animate-spin [animation-duration:20s] origin-center opacity-80" />
            
            {/* Inner counter-rotating ring */}
            <circle cx="50" cy="50" r="34" stroke="#00d2ff" strokeWidth="1.5" strokeDasharray="12 4" className="animate-spin [animation-duration:10s] [animation-direction:reverse] origin-center opacity-90" />
            
            {/* Pulsing center radar sweep or core */}
            <circle cx="50" cy="50" r="10" fill="#00d2ff" className="animate-pulse" />
            
            {/* Ship hull / Anchor decorative lines */}
            <path d="M50 24V76M32 40H68M35 58C35 58 42 66 50 66C58 66 65 58 65 58" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" opacity="0.75" />
          </svg>
        </div>
      </div>
      
      <div className="text-center z-10">
        <p className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-widest uppercase font-display bg-gradient-to-r from-blue-600 to-cyan-500 bg-clip-text text-transparent">
          SAGARMANTHAN
        </p>
        <p className="text-xs text-slate-500 dark:text-slate-400 font-bold mt-2.5 px-4 max-w-sm leading-relaxed">
          {message}
        </p>
      </div>
    </div>
  );
}
