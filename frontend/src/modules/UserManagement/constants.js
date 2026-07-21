export const ORG_LIST = [
  'Ministry of Ports, Shipping and Waterways',
  'Major Ports',
  'CSL',
  'SCI',
  'DGLL',
  'DGS',
  'ALHW',
  'IWAI',
  'DCI',
  'IMU',
  'IPRCL',
  'SDCL',
  'Maritime Boards',
  'Other Organisations',
  'IPA',
  'CMEC',
  'CAG'
];

export const FULL_MODULE_LIST = [
  'Dashboard', 'User List', 'Role Authorization', 'Assign Projects', 'User Activity', 'Master Management', 'Set Alerts', 'Escalation Matrix', 'Proposal List', 'Project List', 'View Proposals- MoPSW', 'View Project Drop Requests', 'Budget', 'Capex', 'KPI-Major Ports', 'KPI - IWAI', 'HR Management', 'Young Professionals', 'Consultant Appointment', 'Asset Management', 'File and Receipt Pendency', 'File Disposal', 'Attendance', 'GEM Procurements', 'CPGRAMS', 'Cabinet Notes - MoPSW', 'Cabinet Notes - Other Ministries', 'VIP Reference', 'Media Outreach', 'Parlimentary Issues', 'Audit Paras', 'Court Cases', 'Bills/Pre-Constitution Act', 'MIV 2030', 'Amrit Kaal Vision 2047', 'Reports', 'View Proposal Drop Request', 'IWAI Master', 'Issues Tracking', 'Expenditure', 'E Office', 'Knowledge Repository', 'Project Report', 'One Vision One Document', 'Official Foreign Visit', 'Cruise Shipping', 'Flagged Ships', 'GMIS-MoU', 'Import On FOB Basis', 'Acts & Rules', 'MoM of PSW Meetings', 'User Management', 'KPI - DGLL', 'KPI - CSL', 'KPI - IMU', 'KPI - SCI', 'KPI - CMEC', 'KPI - DGS', 'Inter State & Inter Ministerial', 'Module Management', 'Form Builder', 'Review Items', 'MoPSW Tracker'
];

export const MODULES_MASTER = [
  {id:'attendance', name:'Attendance'},
  {id:'gem', name:'GEM Procurements'},
  {id:'cpgrams', name:'CPGRAMS'},
  {id:'cn_mopsw', name:'Cabinet Notes - MoPSW'},
  {id:'cn_other', name:'Cabinet Notes - Other Ministries'},
  {id:'vip', name:'VIP Reference'},
  {id:'eoffice', name:'E Office'},
  {id:'media', name:'Media Outreach'},
  {id:'parl', name:'Parliamentary Issues'},
  {id:'audit', name:'Audit Paras'},
  {id:'interstate', name:'Inter State & Inter Ministerial'},
  {id:'foreign', name:'Foreign Visit'},
  {id:'cruise', name:'Cruise Shipping'},
  {id:'flagged', name:'Flagged Ships / FOB Basis'},
  {id:'mom', name:'MOM Of PSW Meetings'},
  {id:'review', name:'Review Items'}
];

export const PERMS = ['create','read','update','delete'];

export const USERS_RAW = [
  {name:'Samarth Verma',email:'samarth.verma1@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Sandeep Gupta',email:'sandeepkr.gupta@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Rajesh Sharma',email:'rajeshsharma-cwc@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'APS Sirohi',email:'ajay.sirohi@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Other User'},
  {name:'Super Admin',email:'SUPERADMIN',org:'Ministry of Ports,Shipping and Waterways',role_original:'SUPERADMIN'},
  {name:'Rajesh Asati',email:'rajesh.asati@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Mandeep Singh Randhawa',email:'director-ship@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Vinay Prajapati',email:'vinay.prajapati@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'Shailendra Kureel',email:'shailendra.kureel@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'test',email:'test1@gmail.com',org:'Jawaharlal Nehru Port Authority',role_original:'Organisation-Senior Officer'},
  {name:'Vipul Singhal',email:'dir1-psw@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'R. Lakshmanan',email:'jscord-psw@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'N Vinod Kumar',email:'chairman@mptgoa.gov.in',org:'Mormugao Port Authority',role_original:'Organisation-Senior Officer'},
  {name:'Test 2',email:'test2@gmail.com',org:'Jawaharlal Nehru Port Authority',role_original:'Organisation-Senior Officer'},
  {name:'Kundan Bharti Sinha',email:'kb.sinha@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW Admin'},
  {name:'R. K. Sinha',email:'as-psw@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sushil Kumar Singh',email:'js-ports@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sunil Kumar Singh',email:'sunilk.singh@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'H.N Aswath',email:'hn.aswath@nic.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sanjay Kumar',email:'sanjay.kalonia@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Bhushan Kumar',email:'bhushan.k@gov.in',org:'Ministry of Ports,Shipping and Waterways',role_original:'MoPSW-Wing Head'},
  {name:'Sunil Paliwal',email:'chairman@chennaiport.gov.in',org:'Chennai Port Authority',role_original:'Organisation- Senior Officer'},
  {name:'P. L. Haranadh',email:'chm@paradipport.gov.in',org:'Paradip Port Authority',role_original:'Organisation- Senior Officer'},
  {name:'Gaurav Dayal',email:'chairman@jnport.gov.in',org:'Jawaharlal Nehru Port Authority',role_original:'Organisation- Senior Officer'},
  {name:'sunand Gs',email:'sunand.g1@gmail.com',org:'Visakhapatnam Port Authority',role_original:'Organisation-Nodal Officer'},
  {name:'Chitra Nayak',email:'chitra.nayak@mptgoa.gov.in',org:'Mormugao Port Authority',role_original:'Organisation-Nodal Officer'},
  {name:'Tarannum Havaldar',email:'nodalofficermedia.mpt@gmail.com',org:'Mormugao Port Authority',role_original:'Organisation-Nodal Officer'}
];
