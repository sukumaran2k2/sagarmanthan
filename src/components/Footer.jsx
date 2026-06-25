import { Globe, Calendar, ShieldCheck, Mail, Info } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-[#0a2540] text-slate-300 border-t-4 border-[#008ca3] text-xs font-medium mt-auto">
      {/* Upper Footer: Links and Policies */}
      <div className="w-full max-w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 border-b border-slate-700/50 pb-8">
          
          {/* Column 1: Website Policies & GIGW Compliance */}
          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <ShieldCheck className="h-4 w-4 text-cyan-400" />
              <span>Website Policies</span>
            </h4>
            <div className="flex flex-col space-y-2">
              <a href="#policies" className="hover:text-cyan-300 transition-colors">Privacy Policy</a>
              <a href="#policies" className="hover:text-cyan-300 transition-colors">Hyperlink Policy</a>
              <a href="#policies" className="hover:text-cyan-300 transition-colors">Copyright Policy</a>
              <a href="#policies" className="hover:text-cyan-300 transition-colors">Terms & Conditions</a>
              <a href="#policies" className="hover:text-cyan-300 transition-colors">Disclaimer</a>
            </div>
          </div>

          {/* Column 2: Help & Contact */}
          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-cyan-400" />
              <span>Help & Support</span>
            </h4>
            <div className="flex flex-col space-y-2">
              <a href="#contact" className="hover:text-cyan-300 transition-colors">Contact Us</a>
              <a href="#help" className="hover:text-cyan-300 transition-colors">User Manual & Helpdesk</a>
              <a href="#feedback" className="hover:text-cyan-300 transition-colors">Feedback & Grievances</a>
              <a href="#sitemap" className="hover:text-cyan-300 transition-colors">Sitemap</a>
            </div>
          </div>

          {/* Column 3: Portal Info & Metadata */}
          <div className="space-y-3">
            <h4 className="text-white font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Info className="h-4 w-4 text-cyan-400" />
              <span>Portal Info</span>
            </h4>
            <p className="leading-relaxed text-slate-450 text-[11px]">
              SAGARMANTHAN National Database Portal serves as the unified dashboard for real-time telemetry, maritime statistics, and project progress monitoring under the Ministry of Ports, Shipping and Waterways.
            </p>
            <div className="flex items-center space-x-2 text-[10px] text-slate-400 pt-2 font-mono">
              <Calendar className="h-3.5 w-3.5 text-cyan-500" />
              <span>Last Updated: 25 Jun 2026</span>
            </div>
          </div>

        </div>

        {/* Lower Footer: Copyright, Ownership, NIC Disclaimer */}
        <div className="pt-6 flex flex-col md:flex-row md:items-center justify-between gap-4 text-[11px] text-slate-400 font-semibold leading-relaxed">
          <div className="space-y-1">
            <p className="text-slate-300">
              © {currentYear} Ministry of Ports, Shipping and Waterways, Government of India. All Rights Reserved.
            </p>
            <p className="text-[10px] text-slate-500">
              Website owned, designed, hosted and maintained by the Ministry of Ports, Shipping and Waterways.
            </p>
          </div>

          {/* Compliance Logos */}
          <div className="flex items-center space-x-4">
            <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-lg flex items-center space-x-2">
              <Globe className="h-4 w-4 text-cyan-400" />
              <span className="text-[10px] font-mono uppercase tracking-wider text-slate-300">GIGW Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
