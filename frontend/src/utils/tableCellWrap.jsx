/**
 * Shared AG Grid cell-wrap helpers.
 * Pair with wrapText + autoHeight so row height grows with multi-line content.
 * Class `mopsw-wrap-cell` is required by Table.jsx / index.css overrides
 * (keeps flex centering from breaking autoHeight measurement).
 */

export const WRAP_CELL_CLASS = 'mopsw-wrap-cell';

export const WRAP_CELL_STYLE = {
  display: 'block',
  whiteSpace: 'normal',
  wordBreak: 'break-word',
  overflowWrap: 'anywhere',
  lineHeight: 1.4,
  paddingTop: 8,
  paddingBottom: 8,
};

/**
 * @param {unknown} value
 * @param {string} [className]
 * @param {string} [emptyFallback='-']
 */
export function renderWrappedText(value, className = '', emptyFallback = '-') {
  const display =
    value === null || value === undefined || value === '' ? emptyFallback : value;

  return (
    <div
      className={`w-full max-w-full whitespace-normal break-words leading-snug py-0.5 ${className}`.trim()}
    >
      {display}
    </div>
  );
}

/**
 * Spread into an AG Grid column def for wrapped, auto-height cells.
 * @param {string} [extraCellClass]
 * @param {Record<string, unknown>} [styleOverrides]
 */
export function getWrapColumnProps(extraCellClass = '', styleOverrides = {}) {
  return {
    wrapText: true,
    autoHeight: true,
    cellClass: extraCellClass
      ? `${WRAP_CELL_CLASS} ${extraCellClass}`.trim()
      : WRAP_CELL_CLASS,
    cellStyle: { ...WRAP_CELL_STYLE, ...styleOverrides },
  };
}
