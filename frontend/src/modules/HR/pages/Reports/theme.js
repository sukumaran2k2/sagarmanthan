// Report palette as CSS tokens (maroon, matching the Capex and YP reports). Values come from the
// shared --module-report-* tokens (styles/module-report.css) where one exists, otherwise from the
// --hr-report-* tokens in hrTables.css; both have dark-mode values, so pages never hard-code a colour.
export const REPORT_THEME = {
  brand: 'var(--module-report-brand-color, #4b2424)', // headings and text accents
  brandSolid: 'var(--module-report-header-bg, #4b2424)', // filled badges (white text)
  brandHover: 'var(--module-report-brand-color-hover, #6b3535)',
  brandSoft: 'var(--hr-report-brand-soft, #8c4242)', // eyebrow and meta text
  headBorder: 'var(--module-report-brand-color-hover, #6b3535)', // borders inside the dark header / total rows
  totalTopBorder: 'var(--hr-report-total-top, #2c1313)',
  accent: 'var(--hr-report-accent, #f5eeea)', // filter bar
  surface: 'var(--hr-report-surface, #fcf9f7)', // panels, inputs
  tint: 'var(--module-report-accent-color, #f7f3f3)',
  border: 'var(--hr-report-border, #e8d5c8)', // panel borders
  inputBorder: 'var(--hr-report-input-border, #d7c4b7)',
  line: 'var(--hr-report-line, #eadede)', // cell borders
  pill: 'var(--hr-report-pill, #f4ebe6)', // reset button
  text: 'var(--hr-report-text, #334155)', // body text in menus
};
