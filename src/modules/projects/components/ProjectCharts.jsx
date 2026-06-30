import React from 'react';
import OrgProjectCountChart from './ProjectCharts/OrgProjectCountChart';
import DelayStatusChart from './ProjectCharts/DelayStatusChart';

export default function ProjectCharts() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <OrgProjectCountChart />
      <DelayStatusChart />
    </div>
  );
}
