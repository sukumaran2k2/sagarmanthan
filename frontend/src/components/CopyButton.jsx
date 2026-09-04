import React from 'react';
import { Copy } from 'lucide-react';

export default function CopyButton({
  onCopy,
  onClick,
  headers = [],
  data = [],
  rows = [],
  onSuccess,
  triggerNotification,
  color = '#0f417a',
  hoverBg = '#f1f5f9',
  className = ''
}) {
  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).catch(() => {
        // Fallback if permission rejected
        return fallbackCopy(text);
      });
    }
    return fallbackCopy(text);
  };

  const fallbackCopy = (text) => {
    try {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.top = '-9999px';
      textArea.style.left = '-9999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      if (successful) return Promise.resolve();
      return Promise.reject(new Error('execCommand failed'));
    } catch (err) {
      return Promise.reject(err);
    }
  };

  const handleClick = (e) => {
    e?.preventDefault?.();
    const handler = onCopy || onClick;
    if (typeof handler === 'function') {
      handler();
      return;
    }

    const rowList = (data && data.length > 0) ? data : rows;
    if (!rowList || rowList.length === 0) {
      if (typeof onSuccess === 'function') {
        onSuccess();
      } else if (typeof triggerNotification === 'function') {
        triggerNotification('Table copied to clipboard!', 'success');
      }
      return;
    }

    let tsv = '';
    if (headers && headers.length > 0) {
      tsv += `${headers.join('\t')}\n`;
    }

    rowList.forEach((row) => {
      if (Array.isArray(row)) {
        const line = row.map((cell) => {
          let str = String(cell ?? '');
          if (str.startsWith('"') && str.endsWith('"')) {
            str = str.slice(1, -1).replace(/""/g, '"');
          }
          return str.replace(/\t/g, ' ').replace(/\n/g, ' ');
        });
        tsv += `${line.join('\t')}\n`;
      } else if (typeof row === 'object' && row !== null) {
        tsv += `${Object.values(row).join('\t')}\n`;
      }
    });

    copyToClipboard(tsv)
      .then(() => {
        if (typeof onSuccess === 'function') {
          onSuccess();
        } else if (typeof triggerNotification === 'function') {
          triggerNotification('Table copied to clipboard!', 'success');
        }
      })
      .catch((err) => {
        console.error('Failed to copy to clipboard:', err);
        if (typeof triggerNotification === 'function') {
          triggerNotification('Failed to copy to clipboard', 'error');
        }
      });
  };

  return (
    <button
      type="button"
      onClick={handleClick}
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
      title="Copy Table"
    >
      <Copy className="h-3.5 w-3.5" />
      <span>Copy</span>
    </button>
  );
}
