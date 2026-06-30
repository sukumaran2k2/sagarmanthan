import React from 'react';

export default function DashboardGrid({ children, columns = 1, className = "" }) {
  const gridClass = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
    5: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5'
  }[columns] || 'grid-cols-1';

  return (
    <div className={`grid ${gridClass} gap-4 ${className}`}>
      {children}
    </div>
  );
}
