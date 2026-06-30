import React, { useState, useRef, useEffect } from 'react';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { orgData } from '../../mock/dashboard';

export default function OrgProjectCountChart() {
  const [zoomScale, setZoomScale] = useState(1);
  const chartContainerRef = useRef(null);

  useEffect(() => {
    const handleWheel = (e) => {
      if (!chartContainerRef.current) return;
      // Only zoom if the mouse is hovering over the chart element
      if (chartContainerRef.current.contains(e.target)) {
        e.preventDefault();
        const direction = e.deltaY > 0 ? -1 : 1;
        const factor = 0.08;
        setZoomScale(prev => {
          const next = prev + direction * factor;
          return Math.max(0.5, Math.min(3.0, next));
        });
      }
    };

    const container = chartContainerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
    }
    return () => {
      if (container) {
        container.removeEventListener('wheel', handleWheel);
      }
    };
  }, []);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-150 pb-4 mb-6">
          <div className="flex items-center space-x-2">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Organisations Wise Project Count</h3>
          </div>
          
          {/* Zoom Controls */}
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-semibold bg-slate-50 border border-slate-200/60 rounded-xl p-1.5 shadow-sm">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider px-1">Scroll to Zoom</span>
            <div className="h-4 w-[1px] bg-slate-200"></div>
            <button 
              onClick={() => setZoomScale(prev => Math.max(0.5, prev - 0.1))}
              className="p-1 hover:bg-slate-200/70 hover:text-slate-850 rounded transition-colors cursor-pointer"
              title="Zoom Out"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </button>
            <span className="text-[10px] font-bold min-w-10 text-center text-slate-700 bg-white border border-slate-200 rounded px-1.5 py-0.5 shadow-xs select-none">
              {Math.round(zoomScale * 100)}%
            </span>
            <button 
              onClick={() => setZoomScale(prev => Math.min(3.0, prev + 0.1))}
              className="p-1 hover:bg-slate-200/70 hover:text-slate-850 rounded transition-colors cursor-pointer"
              title="Zoom In"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setZoomScale(1.0)}
              className="p-1 hover:bg-slate-200/70 hover:text-slate-850 rounded transition-colors text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Reset Zoom"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        
        {/* Custom Interactive SVG/CSS Bar Chart wrapper for mobile scrollability */}
        <div 
          ref={chartContainerRef}
          className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-200 cursor-zoom-in"
        >
          <div 
            className="relative h-72 w-full flex items-end justify-between px-4 pb-10 border-b border-slate-150 transition-all duration-150"
            style={{ 
              minWidth: `${768 * zoomScale}px`,
            }}
          >
            
            {/* Y-Axis Gridlines */}
            <div className="absolute inset-x-0 top-0 h-full pointer-events-none flex flex-col justify-between text-[9px] text-slate-400">
              <div className="w-full border-t border-slate-100 flex justify-between pt-1">
                <span>150</span>
              </div>
              <div className="w-full border-t border-slate-100 flex justify-between pt-1">
                <span>100</span>
              </div>
              <div className="w-full border-t border-slate-100 flex justify-between pt-1">
                <span>50</span>
              </div>
              <div className="w-full flex justify-between pt-1">
                <span>0</span>
              </div>
            </div>

            {/* Bars Container */}
            <div className="w-full h-full flex items-end justify-between relative z-10 px-6">
              {orgData.map((org, idx) => {
                // Scale the height: max is 150 -> map to percentage of container
                const heightPercent = (org.count / 150) * 100;
                return (
                  <div key={idx} className="flex flex-col justify-end items-center group relative flex-1 mx-2 h-full">
                    {/* Tooltip */}
                    <div className="absolute -top-9 bg-slate-900 text-white text-[9px] px-2.5 py-1 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-20 whitespace-nowrap font-bold">
                      {org.name}: {org.count}
                    </div>
                    
                    {/* Bar */}
                    <div 
                      className={`w-full rounded-t-md ${org.color} shadow-md hover:brightness-90 hover:shadow-lg transition-all duration-500`}
                      style={{ height: `${heightPercent}%` }}
                    ></div>
                    
                    {/* Label (Slanted/Rotated) */}
                    <span className="absolute top-full mt-3 text-[9px] font-bold text-slate-500 origin-center rotate-45 whitespace-nowrap">
                      {org.name}
                    </span>
                  </div>
                );
              })}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
