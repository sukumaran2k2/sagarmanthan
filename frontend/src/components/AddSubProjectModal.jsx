import { useState } from 'react';
import { X, CheckCircle2 } from 'lucide-react';

export default function AddSubProjectModal({ isOpen, onClose, onAdd, projects }) {
  const defaultProject = projects && projects.length > 0 ? projects[0].projectId : '';
  
  const [parentProjectId, setParentProjectId] = useState(defaultProject);
  const [hasSubProject, setHasSubProject] = useState('Yes');
  const [numSubProjects, setNumSubProjects] = useState('');
  const [subProjectNames, setSubProjectNames] = useState([]);
  const [errors, setErrors] = useState({});

  if (!isOpen) return null;

  const handleNumSubProjectsChange = (e) => {
    const val = e.target.value;
    // Allow empty string or digits only
    if (val === '' || /^\d+$/.test(val)) {
      setNumSubProjects(val);
      const count = parseInt(val) || 0;
      setSubProjectNames(prev => {
        const next = [...prev];
        if (next.length < count) {
          // Add empty strings up to count
          while (next.length < count) {
            next.push('');
          }
        } else if (next.length > count) {
          // Trim array to count
          next.splice(count);
        }
        return next;
      });
    }
  };

  const handleSubProjectNameChange = (index, value) => {
    setSubProjectNames(prev => {
      const next = [...prev];
      next[index] = value;
      return next;
    });
  };

  const validate = () => {
    const newErrors = {};
    if (!parentProjectId) {
      newErrors.parentProjectId = 'Parent project selection is required';
    }
    
    if (hasSubProject === 'Yes') {
      const count = parseInt(numSubProjects) || 0;
      if (count <= 0) {
        newErrors.numSubProjects = 'Number of subprojects must be greater than 0';
      }
      
      const nameErrors = [];
      subProjectNames.forEach((name, i) => {
        if (!name.trim()) {
          nameErrors[i] = `Sub Project Name ${i + 1} is required`;
        }
      });
      if (nameErrors.length > 0) {
        newErrors.subProjectNames = nameErrors;
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const parent = projects.find(p => p.projectId === parentProjectId);
    if (!parent) return;

    if (hasSubProject === 'Yes') {
      // Add each subproject as a new row in project list
      subProjectNames.forEach((name, index) => {
        const subIdNum = index + 1;
        const subProjId = `${parent.projectId}-S${subIdNum.toString().padStart(2, '0')}`;
        
        onAdd({
          id: Date.now() + index,
          projectId: parent.projectId,
          subProjectId: subProjId,
          projectName: parent.projectName,
          subProjectName: name,
          cost: (parseFloat(parent.cost) / (subProjectNames.length || 1)).toFixed(2),
          agency: parent.agency,
          stage: parent.stage,
          category: parent.category,
          physicalProgress: '0',
          financialProgress: '0',
        });
      });
    }

    // Reset local state variables before closing
    setNumSubProjects('');
    setSubProjectNames([]);
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-55 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in">
      <div className="bg-white rounded-xl w-full max-w-2xl shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        {/* Modal Header */}
        <div className="bg-[#0070d2] px-6 py-4 flex items-center justify-between text-white">
          <h3 className="font-bold text-base tracking-tight">Add Sub Project Details</h3>
          <button 
            type="button"
            onClick={onClose}
            className="p-1 hover:bg-white/10 rounded transition-colors cursor-pointer"
          >
            <X className="h-5 w-5 text-white" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Project List Dropdown */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">Project List</label>
            <div className="relative">
              <select
                value={parentProjectId}
                onChange={(e) => setParentProjectId(e.target.value)}
                className={`w-full text-xs pl-3.5 pr-10 py-2.5 bg-white border ${errors.parentProjectId ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100'} rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500 appearance-none`}
              >
                <option value="">Select a Project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.projectId}>
                    {p.projectId} - {p.projectName}
                  </option>
                ))}
              </select>
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                {parentProjectId && (
                  <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                )}
              </div>
            </div>
            {errors.parentProjectId && (
              <span className="text-[10px] text-red-500 font-semibold">{errors.parentProjectId}</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Does this project have sub project? */}
            <div className="space-y-2">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Does this project have sub project?
              </label>
              <div className="flex items-center space-x-6 pt-1">
                <label className="inline-flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="hasSubProject"
                    value="Yes"
                    checked={hasSubProject === 'Yes'}
                    onChange={(e) => setHasSubProject(e.target.value)}
                    className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span>Yes</span>
                </label>
                <label className="inline-flex items-center space-x-2 cursor-pointer text-xs font-semibold text-slate-800">
                  <input
                    type="radio"
                    name="hasSubProject"
                    value="No"
                    checked={hasSubProject === 'No'}
                    onChange={(e) => setHasSubProject(e.target.value)}
                    className="h-4.5 w-4.5 text-blue-600 focus:ring-blue-500 border-slate-300 cursor-pointer"
                  />
                  <span>No</span>
                </label>
              </div>
            </div>

            {/* No. of SubProjects */}
            {hasSubProject === 'Yes' && (
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                  No. of SubProjects
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Enter number"
                    value={numSubProjects}
                    onChange={handleNumSubProjectsChange}
                    className={`w-full text-xs pl-3.5 pr-10 py-2.5 bg-white border ${errors.numSubProjects ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100'} rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500`}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    {parseInt(numSubProjects) > 0 && (
                      <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                    )}
                  </div>
                </div>
                {errors.numSubProjects && (
                  <span className="text-[10px] text-red-500 font-semibold">{errors.numSubProjects}</span>
                )}
              </div>
            )}
          </div>

          {/* Dynamic Sub Project Names */}
          {hasSubProject === 'Yes' && subProjectNames.length > 0 && (
            <div className="space-y-3 pt-2 max-h-60 overflow-y-auto pr-1">
              {subProjectNames.map((name, index) => (
                <div key={index} className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                    Sub Project Name <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder={`Enter name for sub project ${index + 1}`}
                      value={name}
                      onChange={(e) => handleSubProjectNameChange(index, e.target.value)}
                      className={`w-full text-xs pl-3.5 pr-10 py-2.5 bg-white border ${
                        errors.subProjectNames?.[index] ? 'border-red-400 focus:ring-red-100' : 'border-slate-300 focus:ring-blue-100'
                      } rounded-lg focus:outline-none focus:ring-2 focus:border-blue-500`}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                      {name.trim() !== '' && (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 fill-emerald-50" />
                      )}
                    </div>
                  </div>
                  {errors.subProjectNames?.[index] && (
                    <span className="text-[10px] text-red-500 font-semibold">{errors.subProjectNames[index]}</span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Footer Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="submit"
              className="px-6 py-2 bg-[#00a86b] hover:bg-[#00945e] text-white text-xs font-bold rounded shadow hover:shadow-md transition cursor-pointer"
            >
              Submit
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-[#ea001e] hover:bg-[#d1001a] text-white text-xs font-bold rounded shadow hover:shadow-md transition cursor-pointer"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
