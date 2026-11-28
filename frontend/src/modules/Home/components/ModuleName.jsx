import { ArrowUpRight } from 'lucide-react';
import { hasModuleReadAccess } from '../../../utils/moduleAccess';

/** A module's name; a link to the module when the user can open it. */
export default function ModuleName({ label, moduleCode, config, onNavigate, className = '' }) {
  const code = config?.readCode || moduleCode;
  const canOpen = Boolean(onNavigate && config?.tab && code && hasModuleReadAccess(code));

  if (!canOpen) return <span className={className}>{label}</span>;

  return (
    <button
      type="button"
      onClick={() => onNavigate(config.tab)}
      className={`group inline-flex items-center gap-1 text-left hover:text-[#0f417a] dark:hover:text-sky-300 focus:outline-none focus-visible:underline ${className}`}
      title={`Open ${label}`}
    >
      {label}
      <ArrowUpRight className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-70" aria-hidden="true" />
    </button>
  );
}
