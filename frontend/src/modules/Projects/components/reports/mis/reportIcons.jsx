import {
  BadgeCheck,
  CalendarCheck2,
  FilePenLine,
  Hourglass,
  Scale,
  Timer,
} from 'lucide-react';

export function ReportIcon({ reportId, className }) {
  if (reportId === 'delayed-progress') return <Timer className={className} />;
  if (reportId === 'awarded-current-fy') return <BadgeCheck className={className} />;
  if (reportId === 'completion-current-fy') return <CalendarCheck2 className={className} />;
  if (reportId === 'to-be-awarded-current-fy') return <FilePenLine className={className} />;
  if (reportId === 'progress-gap') return <Scale className={className} />;
  return <Hourglass className={className} />;
}
