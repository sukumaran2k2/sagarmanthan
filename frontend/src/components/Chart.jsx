import React from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell } from 'recharts';

export default function Chart({
  data = [],
  dataKey = 'Active Modules',
  xAxisKey = 'name',
  barColor1 = '#0f417a',
  barColor2 = '#1e3a8a',
  height = 320,
  margin = { top: 10, right: 10, left: -20, bottom: 20 },
  angle = -25,
  xAxisHeight = 50
}) {
  return (
    <div className="w-full pt-4 bg-slate-50/50 rounded-2xl border border-slate-100 p-4" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#cbd5e140" />
          <XAxis 
            dataKey={xAxisKey} 
            tick={{ fill: '#64748b', fontSize: 9, fontWeight: 600 }} 
            axisLine={false} 
            tickLine={false} 
            angle={angle} 
            textAnchor="end" 
            height={xAxisHeight} 
          />
          <YAxis 
            tick={{ fill: '#64748b', fontSize: 10, fontWeight: 600 }} 
            axisLine={false} 
            tickLine={false} 
            allowDecimals={false} 
          />
          <Tooltip 
            cursor={{ fill: '#0f417a0a' }} 
            contentStyle={{ backgroundColor: '#1e293b', border: 'none', borderRadius: '12px', fontSize: '11px', color: '#fff' }} 
          />
          <Bar dataKey={dataKey} fill={barColor1} radius={[4, 4, 0, 0]}>
            {data.map((_, idx) => (
              <Cell key={`cell-${idx}`} fill={idx % 2 === 0 ? barColor1 : barColor2} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
