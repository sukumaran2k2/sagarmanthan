import React, { useState, useMemo, useRef } from 'react';
import { Search, Filter, ChevronUp, ChevronDown, HelpCircle, FileSpreadsheet, Copy, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import { AgGridReact } from 'ag-grid-react';
import { AllCommunityModule, ModuleRegistry } from 'ag-grid-community';
ModuleRegistry.registerModules([AllCommunityModule]);
// Mock data based on user request
const ACTS_RULES_DATA = [
    {
        sno: 1,
        wing: 'IWT',
        act: [
            '1. The IWAI Act, 1985',
            '2. The National Waterways Act, 2016',
            '3. Inland Vessels Act, 2021'
        ],
        rule: [
            '1. Inland Vessels (Survey and Certification) Rules, 2022',
            '2. Inland Vessels (Registration and other Technical Issues) Rules, 2022',
            '3. Inland Vessels (Manning) Rules, 2022',
            '4. Inland Vessels (Crew and Passenger Accommodation) Rules, 2022',
            '5. Inland Vessels (Safe Navigation, Communication and Signals) Rules, 2022',
            '6. Inland Vessels (Life Saving Appliances) Rules, 2022',
            '7. Inland Vessels (Fire Fighting Appliances) Rules, 2022',
            '8. Inland Vessels (Prevention and Containment of Pollution) Rules, 2022',
            '9. Inland Vessels (Insurance & Liability) Rules, 2022',
            '10. The IWAI Rules, 1986',
            '11. Inland Vessels (Design and Construction) Rules, 2023'
        ]
    },
    {
        sno: 2,
        wing: 'Ports',
        act: [
            '1. The Major Port Authorities Act, 2021'
        ],
        rule: [
            '1. The Major Port Adjudicatory Board Rules, 2023',
            '2. The Major Port Authorities (Audit and Accounts) Rule 2021.',
            '3. The Major Port Authorities (Chairperson, Deputy Chairperson and Board Members) Rules, 2022',
            '4. The Major Port Authorities (Master Plan and Application of Funds from Non Port related Use) Rules, 2022',
            '5. The Major Port Authorities (Application of Money in Sinking Fund) Rules, 2021',
            '6. The Major Port Authorities (Fixation and Implementation of Scale of Rates, Fees and Conditions) Rules, 2021',
            '7. The Major Port Authorities (Corporate Social Responsibility) Rules, 2021'
        ]
    },
    {
        sno: 3,
        wing: 'Shipping Wing',
        act: [
            '1. The Merchant Shipping Act, 1958',
            '2. The Multimodal Transportation of Goods Act, 1993 (as amended in December, 2000)',
            '3. Admiralty (Jurisdiction & Settlement of Maritime Claims) Act, 2017',
            '4. Indian Bills of Lading Act, 1856-No Rules',
            '5. The Seamens Provident Fund Act, 1966-No Rules',
            '6. The Indian Carriage of Goods by Sea Act, 1925 [as amended in the year 2000]- No Rules',
            '7. Coasting Vessels Act, 1838-No Rules',
            '8. The Recycling of Ships Act, 2019',
            '9. The Indian Maritime University Act, 2008-No Rules',
            '10. The Suppression of Unlawful Acts Against Safety of Maritime Navigation and Fixed Platforms on Continental Shelf Act, 2002-No Rules'
        ],
        rule: [
            '1. The Merchant Shipping (Maritime Labour) Rules, 2016 (alongwith the 2016 amendments)',
            '2. The Merchant Shipping (Control of Anti-fouling System) Rules, 2016',
            '3. The Merchant Shipping (Limitation of Liability for Maritime Claims) Rules, 2015 (alongwith the 2017 amendments to the said Rules)',
            '4. The Merchant Shipping (Apprenticeship To Sea-Service) Rules, 1960',
            '5. The Merchant Shipping (Cancellation or Suspension of Certificate of Competency) Rules, 2003',
            '6. The Merchant Shipping Cargo ship Construction & Survey Rules, 1991',
            '7. The Merchant Shipping (Carriage of Cargo) Rules, 1995',
            '8. The Merchant Shipping (Condition for carriage of Livestocks) Rules,2020',
            '9. The Merchant Shipping (Carriage Of Medical Officer) Rule, 1961',
            '10. The Merchant Shipping (Certificates of Competency) Rules, 1989',
            '11. The Merchant Shipping (Certificate of Service) Rules, 1970',
            '12. The Merchant Shipping (Construction and Survey of Passenger Ships Rules, 1981',
            '13. Merchant Shipping (Continues Discharge Certificate) Rules, 2017',
            '14. Merchant Shipping (Seafarers Bio-metric Identity Document) Rules, 2016',
            '15. Merchant Shipping (Crew Accommodation) Rules, 1960 (along with amendments of 1967, 1970, 1984, 1993, 1999)',
            '16. Merchant Shipping (Seafarer Accommodation) Rules, 2016',
            '17. Merchant Shipping (Distressed and Safety Radio Communication) Rules, 1995',
            '18. Merchant Shipping (Examination of Dredge Driver and Dredge Engineers) Rules, 1982',
            '19. Merchant Shipping Examination of Dredged Masters & Dredged Mates, Rule 1985',
            '20. Merchant Shipping (Examination of Engineers & Engine Drivers of Fishing Vessels), Rules 1973 (along with amendments of 1975, 1976 and 1991)',
            '21. Merchant Shipping (Examination of Engine Drivers of sea going ships), Rules 1973 (along with amendments of 1991 and 1992)',
            '22. Merchant Shipping (Examination Of Engineer Officers in the Merchant Navy) Rules, 1989 (alongwith the amendments of 1994)',
            '23. Merchant Shipping (Examination of Masters and Mates) Rules, 1985 (along with the amendments of 1990)',
            '24. The Merchant Shipping (Examination of Skippers and Mate of Fishing Vessels) Rules, 1987',
            '25. Merchant Shipping (Fees For Load Lines Surveys) Rules, 1979',
            '26. Merchant Shipping (Fire Appliances) Rule, 1990 (along with the amendment of 1994)',
            '27. The Merchant Shipping (Form of Certificate of Insurance for Civil Liability for Oil Pollution Damage) Rules, 1985 (along with the amendments of 1990)',
            '28. The Merchant Shipping (Form of Particulars of Certificates and Employment) Rules, 1980',
            '29. The Merchant Shipping (Form of Passenger Ships\' Survey Certificates) Rules, 1992',
            '30. The Merchant Shipping (Forms of Licences) Rules, 1960',
            '31. The Merchant Shipping (Shipping Office Forms) Rules, 1963 (along with the amendments of 1976)',
            '32. The Merchant Shipping (Levy of Oil Pollution Cess) Rules 1988',
            '33. The Merchant Shipping (Life Saving Appliances) Rules 1991 (along with the amendments of 1995)',
            '34. Lifeboatmans (Qualifications & Certificates) Rules,1963 (along with the amendments of 1970, 1973, 1974)',
            '35. Merchant Shipping (Load Line) Rules, 1979 (along with the amendments of 1982, 1989 and 2001)',
            '35. Merchant Shipping (Management for the Safe Operation of Ships) Rules, 2000 (along with amendments of 2002, 2003 and 2014)',
            '36. Merchant Shipping (Medical Examination) Rules, 2000 (along with the 2016 amendment to the said rules)',
            '37. Merchant Shipping (Medical Examination) TT Rules, 1986',
            '38. Merchant Shipping (Medicines, Medical Stores and Appliances) Rules, 1994',
            '39. The National Shipping Board Rules, 1960 (along with the 1991 amendment to the said rules)',
            '40. The National Welfare Board for Seafarers Rules, 1963',
            '41. Merchant Shipping (Payment of expenses to Witness) Rules, 1986',
            '42. Indian Pilgrim Ship Rules, 1933',
            '43. Merchant Shipping (Pilot Ladder) Rule, 1967',
            '44. Merchant Shipping (Prevention of Collisions at Sea) Rule, 1975 (along with the 1986 and 1990 amendment to the Regulations)',
            '45. Merchant Shipping (Radio Direction Finders) Rules, 1968',
            '46. Merchant Shipping (Radio) Rules, 1983 (along with the 1992 amendment to the Rules)',
            '47. Merchant Shipping (Rates)Rules, 1977',
            '48. Merchant Shipping (Recruitment and Placement of Seafarers) Rules, 2016 (along with the 2022 amendment to the rules)',
            '49. The Merchant Shipping (Registration of Indian Fishing Boats), Rules, 1988',
            '50. Merchant Shipping (Indian Fishing Boats Inspection) Rules, 1988',
            '51. Merchant Shipping (Conditions for Carriage of Livestock) Rules, 2020',
            '52. Merchant Shipping (Sailing Vessels) Rules, 1997',
            '53. Merchant Shipping (Registration of Indian Ships) Rules, 1960 (along with the 1994 and 1997 amendment to the Rules)',
            '54. Merchant Shipping Seamens Employment Offices Rules,1986',
            '55. Merchant Shipping (Levy of Seamen’s Welfare Fee) Rules, 1974 (along with the 1982, 2015 and 2017 amendments) to the said Rules',
            '56. The Seamen (Supply of Articles for Personal use) Rules, 1966 (along with 1976, 1978 and 1988 amendments to the said Rules)',
            '57. Merchant Shipping (Safety Convention Certificates) Rules, 1968 (along with the 1978, 1988 and 1995 amendments to the said Rules)',
            '58. Merchant Shipping (Safety of Navigation) Rules, 1997',
            '59. Merchant Shipping (Standards of Training, Certification & Watch keeping for Seafarers) Rules, 2014 (along with 2019 amendment to the said Rules)',
            '60. Merchant Shipping (Tonnage Measurement of Ships) Rules, 1987(along with 1991, 1992 and 1995 amendments to the said Rules)',
            '61. Merchant Shipping (Wrecks and Salvage) Rules, 1974(along with 1975 amendment to the said Rules)',
            '62. The Merchant Shipping (control of Pollution by Noxious Liquid Substance in Bulk) Rules, 2010',
            '63. The Merchant Shipping (Prevention of Pollution by Harmful Substances carried by Sea in Packaged Form) Rules, 2010',
            '64. The Merchant Shipping (Prevention of Pollution by Sewage from ships) Rules, 2010. (Annex-IV)',
            '65. The Merchant Shipping (Prevention of Pollution by Garbage from Ships) Rules, 2010. (Annex-V)',
            '66. Merchant Shipping (Prevention of Pollution by Oil from Ships) Rules, 2010',
            '67. The Merchant Shipping (Civil Lability for Oil Pollution Damage) Rules, 2008',
            '68. The Merchant Shipping (International Fund for Compensation for Oil Pollution Damage) Rules, 2008',
            '69. Merchant Shipping (Regulations of Entry of Ships into Ports, Anchorages and Offshore facilities) Rules, 2012',
            '70. The Registration of Multimodal Transport Operators Rules, 1992 & MTD Rules, 1994',
            '71. The Admiralty (Assessors) Rules, 2018',
            '72. The Calcutta High Court Admiralty (Jurisdiction and settlement of Maritime claims) Rules, 2019',
            '73. Rules for Regulating the Procedure and Practice in cases brought before the High Court under the Admiralty Jurisdiction And Settlement Of Maritime Claims Act, 2017',
            '74. The Rules for Regulating the Procedure and Practice in cases brought before the High Court of Judicature at Madras in the exercise of its Admiralty Jurisdiction framed by the High Court',
            '75. The Orissa High Court Admiralty (Jurisdiction and Settlement of Maritime Claims) Rules, 2020'
        ]
    },
    {
        sno: 4,
        wing: 'PHRD',
        act: [
            '1. The Dock Workers (Regulation of Employment) (Inapplicability to Major Ports) Act, 1997-Not yet implemented',
            '2. The Dock Workers (Regulation of Employment) Act, 1948',
            '3. The Hooghly Docking and Engineering Company Limited (Acquisition and Transfer of Undertakings) Act, 1984'
        ],
        rule: []
    },
    {
        sno: 5,
        wing: 'DGLL',
        act: [
            '1. Marine Aids to Navigation Act, 2021'
        ],
        rule: [
            '1. Marine Aids to Navigation (Duties of Director General) Rules, 2022',
            '2. Marine Aids to Navigation (Development of Heritage td) Rules, 2022',
            '3. Marine Aids Navigation (Accreditation of Training Organisations) Rules, 2022',
            '4. Marine Aids to Navigation (Central Advisory Committee Procedural) Rules, 2022',
            '5. Marine Aids to Navigation (Accounting and Financial Powers) Rules, 2022',
            '6. Marine Aids to Navigation (Training and Certification) Rules, 2025'
        ]
    },
    {
        sno: 6,
        wing: 'Sagarmala',
        act: [
            '1. The Indian Ports Act 1908'
        ],
        rule: [
            'Major Port Rules',
            '1. The Cochin Harbour Crafts Rules, 1947',
            '2. The Port of Kandla (Handling and Storage of Compresses Gas Cylinders) Rules, 1955',
            '3. Indian Port Health Rules, 1955',
            '4. Madras Port (Harbour Craft) Rules, 1980',
            '5. The Major Ports (Regulation of Entry, Stay, Movement & Exit of Vessels) Rules, 1989',
            '6. Jawaharlal Nehru Port (Harbour Craft) Rules, 2007',
            '7. Major Ports (Prevention & Control of Pollution Rules, 1991',
            '8. Mormugao Port Rules, 1966',
            '9. New Mangalore Port (Harbour Craft) Rules, 1976',
            '10. New Mangalore Port Rules, 1976',
            '11. Paradip Port Rules, 1966',
            '12. Paradip Port (Harbour Craft) Rules, 1967',
            '13. Calcutta Port Rules, 1994',
            '14. Port of Tuticorin Rules, 1977',
            '15. Port of Tuticorin (Harbour Craft) Rules, 1976',
            '16. Vishakhapatnam (Harbour Craft) Rule, 1950',
            'Non-Major Port Rules',
            '17. Andaman & Nicobar Island Port Rule, 2004',
            '18. Rules and Scale of Rates for the Port Services to be Levied at Ports of Andaman & Nicobar Islands, 2019'
        ]
    }
];
const WINGS = [
    'All Wings',
    'IWT',
    'Ports',
    'Shipping Wing',
    'PHRD',
    'DGLL',
    'Sagarmala'
];
export default function ActsRulesView() {
    const gridRef = useRef();
    const [selectedWing, setSelectedWing] = useState('All Wings');
    const [searchQuery, setSearchQuery] = useState('');
    const [isFiltersExpanded, setIsFiltersExpanded] = useState(true);
    const [entriesLimit, setEntriesLimit] = useState(10);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const filteredData = useMemo(() => {
        return ACTS_RULES_DATA.filter(row => {
            // Filter by Wing
            if (selectedWing !== 'All Wings' && row.wing !== selectedWing) {
                return false;
            }
            // Filter by Search Query
            if (searchQuery.trim() !== '') {
                const query = searchQuery.toLowerCase();
                const wingMatch = row.wing.toLowerCase().includes(query);
                const actMatch = row.act.some(a => a.toLowerCase().includes(query));
                const ruleMatch = row.rule.some(r => r.toLowerCase().includes(query));
                return wingMatch || actMatch || ruleMatch;
            }
            return true;
        });
    }, [selectedWing, searchQuery]);
    const handleGridWheel = (e) => {
        const container = e.currentTarget;
        if (container) {
            const gridBodyViewport = container.querySelector('.ag-body-viewport');
            if (gridBodyViewport && gridBodyViewport.scrollWidth > gridBodyViewport.clientWidth) {
                if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
                    gridBodyViewport.scrollLeft += e.deltaY;
                    const isAtStart = gridBodyViewport.scrollLeft <= 0 && e.deltaY < 0;
                    const isAtEnd = gridBodyViewport.scrollLeft + gridBodyViewport.clientWidth >= gridBodyViewport.scrollWidth && e.deltaY > 0;
                    if (!isAtStart && !isAtEnd) {
                        e.preventDefault();
                    }
                }
            }
        }
    };
    const colDefs = useMemo(() => [
        {
            headerName: 'S.No',
            field: 'sno',
            width: 70,
            pinned: 'left',
            cellClass: 'text-center font-bold text-slate-500 border-r border-slate-200 flex items-center justify-center'
        },
        {
            headerName: 'Wing',
            field: 'wing',
            minWidth: 150,
            pinned: 'left',
            cellClass: 'font-semibold text-slate-800 border-r border-slate-200 flex items-center justify-center bg-slate-50/10'
        },
        {
            headerName: 'Act',
            field: 'act',
            minWidth: 350,
            flex: 1.5,
            wrapText: true,
            autoHeight: true,
            cellClass: 'py-2 px-3 align-top flex flex-col justify-start border-r border-slate-100',
            cellRenderer: (params) => {
                const acts = params.value || [];
                if (acts.length === 0) return <span className="text-slate-400 italic text-[11px]">No Acts</span>;
                return (
                    <div className="flex flex-col space-y-1.5 py-1 text-slate-700">
                        {acts.map((act, i) => (
                            <span key={i} className="text-xs font-semibold leading-relaxed whitespace-normal block">
                                {act}
                            </span>
                        ))}
                    </div>
                );
            }
        },
        {
            headerName: 'Rule',
            field: 'rule',
            minWidth: 450,
            flex: 2,
            wrapText: true,
            autoHeight: true,
            cellClass: 'py-2 px-3 align-top flex flex-col justify-start',
            cellRenderer: (params) => {
                const rules = params.value || [];
                if (rules.length === 0) return <span className="text-slate-400 italic text-[11px]">No Rules</span>;
                return (
                    <div className="flex flex-col space-y-1.5 py-1 text-slate-700">
                        {rules.map((rule, i) => {
                            const isSectionHeader = rule === 'Major Port Rules' || rule === 'Non-Major Port Rules';
                            return (
                                <span
                                    key={i}
                                    className={`text-xs leading-relaxed whitespace-normal block ${isSectionHeader
                                        ? 'font-bold text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md mt-1 mb-0.5 border border-blue-100 w-fit'
                                        : 'font-normal pl-2'
                                        }`}
                                >
                                    {rule}
                                </span>
                            );
                        })}
                    </div>
                );
            }
        }
    ], []);
    const totalEntries = filteredData.length;
    const onPaginationChanged = () => {
        if (gridRef.current && gridRef.current.api) {
            const page = gridRef.current.api.paginationGetCurrentPage() + 1;
            const total = gridRef.current.api.paginationGetTotalPages();
            setCurrentPage(page);
            setTotalPages(total || 1);
        }
    };
    const handlePageChange = (page) => {
        if (gridRef.current && gridRef.current.api && page >= 1 && page <= totalPages) {
            gridRef.current.api.paginationGoToPage(page - 1);
        }
    };
    return (
        <div className="space-y-6 animate-fade-in pb-12">
            {/* Header Info Block */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 font-display">Acts & Rules</h2>
                    <div className="flex items-center space-x-1.5 text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                        <span>Home</span>
                        <ChevronRight className="h-3 w-3" />
                        <span className="text-slate-600">Acts & Rules</span>
                    </div>
                </div>
            </div>
            {/* Categories Filter Banner Container (Similar layout as Project Categories) */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
                <button
                    onClick={() => setIsFiltersExpanded(!isFiltersExpanded)}
                    className={`w-full flex items-center justify-between text-left transition cursor-pointer ${isFiltersExpanded ? 'pb-3 border-b border-slate-100 mb-4' : ''
                        }`}
                >
                    <div className="flex items-center space-x-2">
                        <Filter className="h-4 w-4 text-blue-600" />
                        <span className="text-xs font-bold text-slate-800 font-display">Acts & Rules Wings Categories & Filters</span>
                    </div>
                    <div className="flex items-center space-x-1.5 text-slate-400">
                        <span className="text-[10px] font-normal">Click to {isFiltersExpanded ? 'collapse' : 'expand'}</span>
                        {isFiltersExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                </button>
                {isFiltersExpanded && (
                    <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-fade-in">
                        {/* Left selector */}
                        {/* <div className="space-y-1.5 lg:border-r lg:border-slate-150 lg:pr-6 flex flex-col justify-center">
                            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Wing Select</label>
                            <select
                                value={selectedWing}
                                onChange={(e) => { setSelectedWing(e.target.value); setCurrentPage(1); }}
                                className="w-full text-xs px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-100 font-semibold"
                            >
                                {WINGS.map((w, idx) => (
                                    <option key={idx} value={w}>{w}</option>
                                ))}
                            </select>
                        </div> */}
                        {/* Wings Category Cards Selection (Visual / Modern) */}
                        <div className="lg:col-span-3 space-y-1.5">
                            <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">Select Wings Category</span>
                            <div className="flex space-x-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-slate-200">
                                {WINGS.map((wing, i) => {
                                    const isActive = selectedWing === wing;
                                    // Modern gradient images for various wings
                                    const imageUrl = {
                                        'All Wings': 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=300&q=80',
                                        'IWT': 'https://images.unsplash.com/photo-1501785888041-af3ef285b470?auto=format&fit=crop&w=300&q=80',
                                        'Ports': 'https://images.unsplash.com/photo-1520262454473-a1a82276a574?auto=format&fit=crop&w=300&q=80',
                                        'Shipping Wing': 'https://images.unsplash.com/photo-1578575437130-527eed3abbec?auto=format&fit=crop&w=300&q=80',
                                        'PHRD': 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?auto=format&fit=crop&w=300&q=80',
                                        'DGLL': 'https://images.unsplash.com/photo-1518241353330-0f7941c2d9b5?auto=format&fit=crop&w=300&q=80',
                                        'Sagarmala': 'https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=300&q=80'
                                    }[wing];
                                    return (
                                        <button
                                            key={i}
                                            onClick={() => { setSelectedWing(wing); setCurrentPage(1); }}
                                            className={`relative w-40 h-16 rounded-xl overflow-hidden flex-shrink-0 cursor-pointer shadow border transition-all duration-300 ${isActive
                                                ? 'ring-4 ring-[#0f417a] scale-95 shadow-md font-bold'
                                                : 'border-slate-200 opacity-85 hover:opacity-100 hover:scale-[1.02]'
                                                }`}
                                        >
                                            <img
                                                src={imageUrl}
                                                alt={wing}
                                                className="w-full h-full object-cover"
                                            />
                                            <div className="absolute inset-0 bg-slate-950/50 transition-colors"></div>
                                            <div className="absolute inset-0 flex items-center justify-center p-2 text-center">
                                                <span className="text-[10px] font-black text-white uppercase tracking-wider leading-tight">
                                                    {wing}
                                                </span>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            {/* Grid Controls (Show Entries & Search) */}
            <div className="bg-white rounded-xl shadow-md border border-slate-200 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                {/* Export / Quick Actions */}
                <div className="flex items-center space-x-1.5 border-b md:border-b-0 pb-3 md:pb-0 border-slate-100">
                    <button
                        onClick={() => { }}
                        className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                        <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                    <button
                        onClick={() => { }}
                        className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                        <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                    </button>
                    <button
                        onClick={() => { }}
                        className="p-2 hover:bg-slate-100 text-slate-600 rounded-lg text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                    >
                        <FileText className="h-3.5 w-3.5" /> PDF
                    </button>
                </div>
                {/* Search Input */}
                <div className="flex items-center gap-4 w-full md:w-auto justify-end">
                    <div className="relative w-full sm:w-64">
                        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Search className="h-3.5 w-3.5 text-slate-400" />
                        </span>
                        <input
                            type="text"
                            placeholder="Search Acts & Rules..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full text-xs pl-9 pr-3.5 py-1.5 bg-slate-50 border border-slate-350 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-500 font-semibold"
                        />
                    </div>
                </div>
            </div>
            {/* Main Responsive Table */}
            <div className="ag-theme-quartz rounded-xl border border-slate-200 shadow-md overflow-x-auto" onWheel={handleGridWheel}>
                <AgGridReact
                    ref={gridRef}
                    theme="legacy"
                    rowData={filteredData}
                    columnDefs={colDefs}
                    pagination={true}
                    paginationPageSize={entriesLimit}
                    suppressPaginationPanel={true}
                    onPaginationChanged={onPaginationChanged}
                    domLayout="autoHeight"
                    rowHeight={0}
                    headerHeight={48}
                    suppressColumnVirtualisation={true}
                    autoSizeStrategy={{
                        type: 'fitGridWidth'
                    }}
                />
                {/* Custom Pagination Footer */}
                <div className="flex flex-col sm:flex-row items-center justify-between px-5 py-4 bg-white border-t border-slate-200 text-xs gap-4 font-semibold">
                    <span className="text-slate-505 font-medium text-center sm:text-left">
                        Showing <span className="font-bold text-slate-800">{totalEntries > 0 ? (currentPage - 1) * entriesLimit + 1 : 0}</span> to{' '}
                        <span className="font-bold text-slate-800">{Math.min(currentPage * entriesLimit, totalEntries)}</span> of{' '}
                        <span className="font-bold text-slate-800">{totalEntries}</span> entries
                    </span>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                            <ChevronLeft className="h-4 w-4" />
                        </button>

                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => {
                            if (totalPages > 6 && Math.abs(currentPage - p) > 1 && p !== 1 && p !== totalPages) {
                                if (p === 2 || p === totalPages - 1) {
                                    return <span key={p} className="px-1.5 text-slate-400 font-bold">...</span>;
                                }
                                return null;
                            }
                            return (
                                <button
                                    key={p}
                                    onClick={() => handlePageChange(p)}
                                    className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${currentPage === p
                                        ? 'bg-[#0f417a] text-white shadow-sm'
                                        : 'border border-slate-200 text-slate-650 hover:bg-slate-50'
                                        }`}
                                >
                                    {p}
                                </button>
                            );
                        })}

                        <button
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages || totalPages === 0}
                            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition cursor-pointer"
                        >
                            <ChevronRight className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
