import sagarmanthanLogo from '../assets/sagarmanthan_logo.png';

export default function Footer() {
  return (
    <footer className="bg-[#0a2540] text-slate-355 border-t-4 border-[#008ca3] text-[11px] font-medium mt-auto py-5">
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-4 text-center">
          
          {/* Column 1: Brand Logo & Ministry Subtitle - Left aligned on desktop */}
          <div className="flex items-center justify-center md:justify-start space-x-3">
            <img src={sagarmanthanLogo} alt="Sagarmanthan Logo" className="h-8.5 w-auto object-contain" />
            <div className="text-left leading-tight">
              <span className="text-xs font-black tracking-wider text-white font-display">
                SAGARMANTHAN
              </span>
              <span className="block text-[8.5px] text-cyan-300 font-mono tracking-wider uppercase mt-0.5">
                Ministry of Ports, Shipping and Waterways
              </span>
            </div>
          </div>

          {/* Column 2: Copyright & Government Ownership Statement - Centered */}
          <div className="text-center font-semibold leading-relaxed">
            <p className="text-slate-300">
              Copyright © 2026 Made by NTCPWC for Ministry of Ports, Shipping and Waterways,
            </p>
            <p className="text-[10px] text-slate-400">
              Government of India, All Rights Reserved
            </p>
          </div>

          {/* Column 3: Empty spacer to balance layout grid and keep copyright centered */}
          <div className="hidden md:block"></div>

        </div>
      </div>
    </footer>
  );
}
