import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Landmark, MapPin, TrendingUp, IndianRupee } from 'lucide-react';
import StatCard from '../../../components/StatCard';
import { fetchNmpDashboard } from '../api';

const STAT_CARDS = [
  { key: 'totalParcels', label: 'Total Parcels', icon: MapPin, color: 'blue' },
  { key: 'totalArea', label: 'Total Area (Acres)', icon: Landmark, color: 'emerald' },
  { key: 'totalMonetisation', label: 'Total Monetisation Value (INR Cr)', icon: IndianRupee, color: 'amber' },
  { key: 'activeLeasesCount', label: 'Active Leases', icon: TrendingUp, color: 'violet' },
];

export default function NmpDashboard({ onNavigateToTab }) {
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    fetchNmpDashboard()
      .then((res) => {
        if (mounted) setStats(res.data || {});
      })
      .catch(() => {})
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STAT_CARDS.map((card) => (
          <StatCard
            key={card.key}
            title={card.label}
            value={loading ? '—' : (stats[card.key] ?? '—')}
            icon={card.icon}
            color={card.color}
          />
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-8 text-center">
        <LayoutDashboard className="h-12 w-12 text-blue-500 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-700 dark:text-slate-200">
          National Monetization Plan — Dashboard
        </h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-xl mx-auto">
          Overview of National Monetization Plans across all Major Ports. View summary statistics, monetisation targets and lease performance metrics.
        </p>
      </div>
    </div>
  );
}
