export const validateProjectForm = (formData) => {
  const newErrors = {};
  if (!formData.projectName?.trim()) newErrors.projectName = 'Project Name is required';
  if (!formData.cost || parseFloat(formData.cost) <= 0) newErrors.cost = 'Valid Estimated Cost is required';
  if (!formData.category) newErrors.category = 'Project Category is required';
  if (!formData.initiatedDate) newErrors.initiatedDate = 'Initiated Date is required';
  if (!formData.completionDate) newErrors.completionDate = 'Completion Date is required';
  if (!formData.agency?.trim()) newErrors.agency = 'Primary Implementing Agency is required';
  if (!formData.fundingSource) newErrors.fundingSource = 'Funding Source is required';
  if (!formData.state) newErrors.state = 'State is required';
  if (!formData.district) newErrors.district = 'District is required';
  if (!formData.mpConstituency) newErrors.mpConstituency = 'MP Constituency is required';

  return newErrors;
};
