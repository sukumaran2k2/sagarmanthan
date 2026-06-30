export default function PhysicalProgressTable() {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-2">
        <div className="flex items-center space-x-2">
          <span className="h-1.5 w-1.5 rounded-full bg-blue-600"></span>
          <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Physical Progress (20% Buckets)</h3>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-150">
        <table className="w-full text-center text-xs text-slate-700 border-collapse">
          <thead>
            <tr className="bg-[#0f417a] text-white font-bold text-[10px] uppercase tracking-wider border-b border-blue-900">
              <th className="py-3 px-3 text-left border-r border-blue-900/30">Progress Range</th>
              <th className="py-3 px-2 border-r border-blue-900/30">ChPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">CoPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">DPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">JNPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">KPL</th>
              <th className="py-3 px-2 border-r border-blue-900/30">MbPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">MgPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">NMPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">PPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">SMPA-HDC</th>
              <th className="py-3 px-2 border-r border-blue-900/30">SMPA-KDS</th>
              <th className="py-3 px-2 border-r border-blue-900/30">VOCPA</th>
              <th className="py-3 px-2 border-r border-blue-900/30">VPA</th>
              <th className="py-3 px-3 font-extrabold bg-[#0d3666]">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-150 font-semibold">
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3 px-3 text-left font-bold text-slate-800 border-r border-slate-150 bg-slate-50/50">0%-20%</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">15</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">17</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">61</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">22</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">15</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">24</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">3</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">5</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">16</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">11</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">17</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">43</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">29</td>
              <td className="py-3 px-3 font-bold text-slate-900 bg-slate-50">278</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3 px-3 text-left font-bold text-slate-800 border-r border-slate-150 bg-slate-50/50">20%-40%</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">2</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">9</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">5</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">1</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">1</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">2</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">4</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">5</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">5</td>
              <td className="py-3 px-3 font-bold text-slate-900 bg-slate-50">34</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3 px-3 text-left font-bold text-slate-800 border-r border-slate-150 bg-slate-50/50">40%-60%</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">1</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">1</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">5</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">3</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">2</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">3</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">1</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">3</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">2</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">5</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">6</td>
              <td className="py-3 px-3 font-bold text-slate-900 bg-slate-50">32</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3 px-3 text-left font-bold text-slate-800 border-r border-slate-150 bg-slate-50/50">60%-80%</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">1</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">1</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">6</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">6</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">2</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">0</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">6</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">2</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">2</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">4</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">4</td>
              <td className="py-3 px-3 font-bold text-slate-900 bg-slate-50">34</td>
            </tr>
            <tr className="hover:bg-slate-50 transition-colors">
              <td className="py-3 px-3 text-left font-bold text-slate-800 border-r border-slate-150 bg-slate-50/50">80%-100%</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">18</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">3</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">56</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">28</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">17</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">19</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">15</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">13</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">25</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">25</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">17</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">28</td>
              <td className="py-3 px-2 border-r border-slate-100 text-blue-600">31</td>
              <td className="py-3 px-3 font-bold text-slate-900 bg-slate-50">295</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
