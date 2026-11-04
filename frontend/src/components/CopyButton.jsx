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

    // rows may be a function so callers can build copy rows only when needed
    const rowList = (data && data.length > 0) ? data : (typeof rows === 'function' ? rows() : rows);
    // Nothing to copy: say so instead of reporting a successful copy.
    if (!rowList || rowList.length === 0) {
      if (typeof triggerNotification === 'function') {
        triggerNotification('No data to copy.', 'warning');
      }
      return;
    }

    // Normalise headers: support both string[] and {label, key}[] formats
    const headerLabels = headers.map(h => (typeof h === 'object' && h !== null ? h.label : h) ?? '');
    const headerKeys   = headers.map(h => (typeof h === 'object' && h !== null ? h.key  : null));
    const hasKeys      = headerKeys.some(k => k !== null);

    const rowValues = (row) => {
      if (Array.isArray(row)) return row;
      if (typeof row !== 'object' || row === null) return [];
      return hasKeys ? headerKeys.map(k => (k != null ? row[k] : '')) : Object.values(row);
    };

    let tsv = '';
    if (headerLabels.length > 0) {
      tsv += `${headerLabels.join('\t')}\n`;
    }

    rowList.forEach((row) => {
      const line = rowValues(row).map((cell) => {
        let str = String(cell ?? '');
        if (str.startsWith('"') && str.endsWith('"')) {
          str = str.slice(1, -1).replace(/""/g, '"');
        }
        return str.replace(/\t/g, ' ').replace(/\n/g, ' ');
      });
      tsv += `${line.join('\t')}\n`;
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
