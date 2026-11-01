// Returns 'major_port' | 'ministry' | 'non_port' from the row's category, else the organisation list
export function getOrgCategory(orgId, rowCatName, organisations = []) {
  let catName = rowCatName;
  if (!catName && Array.isArray(organisations)) {
    const org = organisations.find(o => o.organisation_id === orgId || String(o.organisation_id) === String(orgId));
    catName = org?.organisation_category_name;
  }
  
  const val = String(catName || '').trim();
  if (val === 'Major Ports' || val === 'Major Port') return 'major_port';
  if (val === 'Ministry') return 'ministry';
  if (val === 'Non Major Port' || val === 'Non Major Ports') return 'non_port';

  const lower = val.toLowerCase();
  if (lower.includes('major port') && !lower.includes('non')) return 'major_port';
  if (lower.includes('ministry')) return 'ministry';

  return 'non_port';
}

// Counts rows per category for the category cards
export function calculateCategoryCounts(baseFiltered, organisations, getCategoryFn) {
  let majorPort = 0;
  let ministry = 0;
  let nonPort = 0;

  baseFiltered.forEach(row => {
    const cat = getCategoryFn(row.organisation_id, row.organisation_category_name, organisations);
    if (cat === 'major_port') majorPort++;
    else if (cat === 'ministry') ministry++;
    else nonPort++;
  });

  return { majorPort, ministry, nonPort };
}
