import React from 'react';
import { Copy } from 'lucide-react';

export default function CopyButton({
  onCopy,
  color = '#0f417a',
  hoverBg = '#f1f5f9',
  className = ''
}) {
  return (
    <button
      type="button"
      onClick={onCopy}
      style={{
        color: color,
        borderColor: `${color}33`,
        transition: 'all 0.15s ease'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = hoverBg;
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'transparent';
      }}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-lg text-xs font-semibold cursor-pointer bg-transparent ${className}`}
    >
      <Copy className="h-3.5 w-3.5" />
      <span>Copy</span>
    </button>
  );
}
