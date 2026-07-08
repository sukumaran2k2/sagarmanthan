
const COLOR_MAPs = {
  blue: {
    bg: 'from-[#1b4380] to-[#0f2e5a]',
    text: 'text-white',
    subText: 'text-blue-200',
    border: 'border-white/10',
    iconBg: 'bg-white/10',
    itemBg: 'bg-white/5 hover:bg-white/10 border-white/10'
  },
  cyan: {
    bg: 'from-[#009cb3] to-[#007b8f]',
    text: 'text-white',
    subText: 'text-cyan-100',
    border: 'border-white/10',
    iconBg: 'bg-white/10',
    itemBg: 'bg-white/5 hover:bg-white/10 border-white/10'
  },
  emerald: {
    bg: 'from-[#10b981] to-[#047857]',
    text: 'text-white',
    subText: 'text-emerald-100',
    border: 'border-white/10',
    iconBg: 'bg-white/10',
    itemBg: 'bg-white/5 hover:bg-white/10 border-white/10'
  },
  amber: {
    bg: 'from-[#f59e0b] to-[#b45309]',
    text: 'text-white',
    subText: 'text-amber-100',
    border: 'border-white/10',
    iconBg: 'bg-white/10',
    itemBg: 'bg-white/5 hover:bg-white/10 border-white/10'
  },
  rose: {
    bg: 'from-[#f43f5e] to-[#be123c]',
    text: 'text-white',
    subText: 'text-rose-100',
    border: 'border-white/10',
    iconBg: 'bg-white/10',
    itemBg: 'bg-white/5 hover:bg-white/10 border-white/10'
  },
  white: {
    bg: 'bg-white',
    text: 'text-slate-800',
    subText: 'text-slate-400',
    border: 'border-slate-100',
    iconBg: 'bg-slate-50',
    itemBg: 'bg-slate-50 hover:bg-slate-100/70 border-slate-200/60 text-slate-700'
  }
};

export default function StatCard({
  title,
  value,
  icon: IconComponent,
  color = 'blue',
  trend,
  stats = [],
  subItems = []
}) {
  const theme = COLOR_MAPs[color] || COLOR_MAPs.blue;
  const isWhite = color === 'white';

  return (
    <div className={`bg-gradient-to-b ${theme.bg} ${theme.text} rounded-2xl p-5 flex flex-col justify-between shadow-lg relative overflow-hidden transition hover:-translate-y-1 duration-300 border ${isWhite ? 'border-slate-200' : 'border-transparent'}`}>
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${theme.subText} block`}>
            {title}
          </span>
          <span className="text-3xl font-extrabold font-display tracking-tight block">
            {value}
          </span>
        </div>
        {IconComponent && (
          <div className={`p-2.5 ${theme.iconBg} rounded-xl backdrop-blur-sm`}>
            <IconComponent className={`h-5 w-5 ${isWhite ? 'text-[#0f417a]' : 'text-white'}`} />
          </div>
        )}
      </div>

      {(stats.length > 0 || subItems.length > 0) && (
        <div className={`mt-6 pt-4 border-t ${theme.border} space-y-2.5 text-[10px]`}>
          {stats.map((stat, i) => (
            <div key={i} className={`flex justify-between border-b ${theme.border} pb-1.5 last:border-b-0 last:pb-0`}>
              <span className={`${theme.subText} font-semibold uppercase`}>{stat.label}</span>
              <span className={`font-bold text-xs ${isWhite ? 'text-slate-800' : 'text-white'}`}>{stat.value}</span>
            </div>
          ))}

          {subItems.length > 0 && (
            <div className={`grid grid-cols-${Math.min(subItems.length, 2)} gap-2 text-center pt-2`}>
              {subItems.map((item, i) => (
                <div key={i} className={`border rounded-lg p-2 transition-colors ${theme.itemBg}`}>
                  <div className="font-bold text-[12px]">{item.value}</div>
                  <div className={`${theme.subText} text-[9px] font-medium mt-0.5`}>{item.label}</div>
                  {item.subText && (
                    <div className="text-[8px] font-bold mt-0.5 opacity-90">{item.subText}</div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {trend && (
        <div className="mt-4 flex items-center space-x-1.5 text-[10px] font-bold">
          <span className={trend.positive ? 'text-emerald-500' : 'text-rose-500'}>
            {trend.value}
          </span>
          <span className={`${theme.subText} font-medium`}>since last month</span>
        </div>
      )}
    </div>
  );
}
