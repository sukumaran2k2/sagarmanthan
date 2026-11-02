/**
 * Shared column defaults for every Traffic grid.
 * The shared Table makes each cell a flex box, so text-align alone does not centre it;
 * justify-content does (text-align still centres wrapped, multi-line cells).
 */
export const CENTER_CELL_STYLE = { justifyContent: 'center', textAlign: 'center' };

export const TRAFFIC_DEFAULT_COL_DEF = {
  minWidth: 90,
  filter: false,
  sortable: false,
  resizable: true,
  wrapHeaderText: true,
  autoHeaderHeight: true,
  cellStyle: CENTER_CELL_STYLE,
};
