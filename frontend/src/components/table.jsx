<table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#0f417a] text-white text-xs font-bold uppercase tracking-wider border-b border-blue-900">
                <th className="px-4 py-3.5 text-center w-14">S.No</th>
                
                <th 
                  onClick={() => handleSort('projectId')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-[#0c3666] transition-colors"
                >
                  <div className="flex items-center space-x-1">
                    <span>Project ID</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                
                <th className="px-4 py-3.5 text-center">Sub Project ID</th>
                
                <th 
                  onClick={() => handleSort('projectName')}
                  className="px-4 py-3.5 cursor-pointer hover:bg-[#0c3666] transition-colors w-72"
                >
                  <div className="flex items-center space-x-1">
                    <span>Project Name</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                
                <th className="px-4 py-3.5">Category</th>
                
                <th 
                  onClick={() => handleSort('cost')}
                  className="px-4 py-3.5 text-right cursor-pointer hover:bg-[#0c3666] transition-colors"
                >
                  <div className="flex items-center justify-end space-x-1">
                    <span>Sanctioned Cost (In Cr.)</span>
                    <ArrowUpDown className="h-3 w-3" />
                  </div>
                </th>
                
                <th className="px-4 py-3.5">Primary Implementing Agency</th>
                <th className="px-4 py-3.5 text-center">Current Stage</th>
                <th className="px-4 py-3.5 text-center">Physical (%)</th>
                <th className="px-4 py-3.5 text-center">Financial (%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {paginatedProjects.length > 0 ? (
                paginatedProjects.map((project, index) => (
                  <tr 
                    key={project.id} 
                    className="hover:bg-slate-50/60 transition-colors duration-150"
                  >
                    <td className="px-4 py-4 text-center font-semibold text-slate-500">
                      {(currentPage - 1) * entriesLimit + index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer hover:underline flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-orange-500 inline-block"></span>
                        {project.projectId}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center text-slate-400 font-medium">{project.subProjectId || '-'}</td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-slate-800 block text-xs hover:text-blue-600 cursor-pointer transition-colors leading-relaxed">
                        {project.projectName}
                      </span>
                      {project.subProjectName && project.subProjectName !== '-' && (
                        <span className="text-[10px] text-slate-500 font-bold block mt-1 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded w-fit">
                          Sub-Project: {project.subProjectName}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-lg bg-blue-50 text-blue-700 border border-blue-100">
                        {project.category || 'Uncategorized'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right font-extrabold text-slate-700">
                      {project.cost ? parseFloat(project.cost).toFixed(2) : '-'}
                    </td>
                    <td className="px-4 py-4 text-slate-600 font-medium">{project.agency}</td>
                    <td className="px-4 py-4 text-center">
                      <span className={`inline-flex items-center px-2.5 py-1 text-[10px] font-bold rounded-full border ${getStageStyle(project.stage)}`}>
                        {project.stage}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="font-bold text-slate-700">{project.physicalProgress}%</span>
                        {/* Progress mini indicator */}
                        <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="bg-blue-600 h-1.5 rounded-full" 
                            style={{ width: `${project.physicalProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-center">
                      <div className="flex items-center justify-center space-x-1.5">
                        <span className="font-bold text-slate-700">{project.financialProgress}%</span>
                        <div className="w-10 bg-slate-100 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div 
                            className="bg-emerald-500 h-1.5 rounded-full" 
                            style={{ width: `${project.financialProgress}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="10" className="px-4 py-8 text-center text-slate-400 font-medium">
                    No matching records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>