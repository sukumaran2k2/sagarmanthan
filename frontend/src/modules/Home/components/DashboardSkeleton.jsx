const Block = ({ className }) => <div className={`animate-pulse rounded-xl bg-slate-200/70 dark:bg-slate-800 ${className}`} />;

/** Placeholder while the dashboard loads. */
export default function DashboardSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading the data entry status">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Block key={i} className="h-[104px]" />
        ))}
      </div>
      <Block className="h-72" />
      <Block className="h-80" />
    </div>
  );
}
