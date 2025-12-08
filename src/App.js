import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import {
  Users,
  LayoutDashboard,
  MapPin,
  Clock,
  DollarSign,
  BarChart3,
  Settings,
  Search,
  Bell,
  Plus,
  MoreHorizontal,
  ChevronDown,
  Mail,
  Phone,
  FileText,
  CheckCircle,
  AlertCircle,
  Sparkles,
  Loader2,
  X,
  Trash2,
  Save,
  Briefcase,
  Building2,
  Shield,
  Filter,
  Download,
  Camera,
  User,
  Upload,
  Globe,

  Image as ImageIcon,
  Menu, // Hamburger Menu
  LogOut // Logout Icon
} from 'lucide-react';
import { auth, db } from './firebase'; // Firebase
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  linkWithPopup
} from 'firebase/auth';

import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,

  onSnapshot,
  writeBatch,
  query,
  where,
  serverTimestamp
} from 'firebase/firestore';

// --- Subcomponents ---
function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button onClick={onClick} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mb-1 transition-all duration-200 ${active ? 'bg-blue-600 text-white shadow-md shadow-blue-900/20' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}>
      <div>{icon}</div>
      <span className="font-medium text-sm">{label}</span>
      {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-sm"></div>}
    </button>
  );
}

function InfoRow({ label, value }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
      <span className="text-sm text-gray-500">{label}</span>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );
}

function StatusBadge({ status, lateHours, t }) {
  const styles = {
    'On Time': 'bg-green-100 text-green-700',
    'Late': 'bg-amber-100 text-amber-700',
    'Absent': 'bg-red-100 text-red-700',
    'Pending': 'bg-gray-100 text-gray-600'
  };

  // Clean status string to matching translation key if possible, or leave as is
  const getStatusLabel = (s) => {
    if (s === 'On Time') return t ? t('onTime') : s;
    if (s === 'Late') {
      const base = t ? t('late') : s;
      return lateHours ? `${base} (${lateHours})` : base;
    }
    if (s === 'Absent') return t ? t('absent') : s;
    return s;
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[status] || styles['Pending']}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export default function App() {
  const formatCurrency = (val) => 'EGP ' + (Number(val) || 0).toLocaleString();
  // --- Translations Configuration ---
  const translations = {
    en: {
      appName: 'Finn ERP',
      appSubtitle: 'Enterprise Resource Planning',
      menuDashboard: 'Dashboard',
      menuEmployees: 'Employees',
      menuSites: 'Locations / Sites',
      menuAttendance: 'Attendance',
      menuPayroll: 'Payroll',
      menuReports: 'Reports',
      settings: 'Settings',
      search: 'Search...',
      allEmployees: 'All Employees',
      manageStaff: 'Manage employees and shifts.',
      addEmployee: 'Add Employee',
      name: 'Name',
      role: 'Role',
      dept: 'Department',
      salary: 'Base Salary',
      bonus: 'Bonus',
      overtime: 'Overtime',
      deductions: 'Deductions',
      total: 'Total',
      netPay: 'Net Pay',
      actions: 'Actions',
      login: 'Login',
      signup: 'Sign Up',
      email: 'Email',
      password: 'Password',
      welcome: 'Welcome Back',
      signInToAccess: 'Sign in to access your dashboard',
      createAccount: 'Create Account',
      haveAccount: 'Already have an account?',
      noAccount: 'Don\'t have an account?',
      logout: 'Logout',
      location: 'Location',
      shift: 'Shift',
      totalComp: 'Total Comp',
      dailyAttendance: 'Daily Attendance Log',
      trackAttendance: 'Track employee check-ins and shifts.',
      checkIn: 'Check In',
      checkOut: 'Check Out',
      status: 'Status',
      import: 'Import',
      export: 'Export',
      payrollMgmt: 'Payroll Management',
      costAnalysis: 'Real-time cost analysis.',
      aiInsights: 'AI Insights',
      siteStats: 'Site Statistics',
      assignedGuards: 'Assigned Employees',
      deleteLocation: 'Delete Location',
      terminateGuard: 'Terminate / Delete Employee',
      aiAssistant: 'AI Assistant',
      genReview: 'Generate Performance Review',
      generating: 'Generating...',
      downloadReport: 'Download Report',
      editLocation: 'Edit Location',
      details: 'Employee Info',
      manageDetails: 'Manage Selection',
      siteName: 'Site Name',
      city: 'City / Region',
      manager: 'Manager',
      operationalStatus: 'Operational Status',
      photoUrl: 'Employee Photo',
      uploadPhoto: 'Upload Photo',
      unassigned: 'Unassigned',
      securityTeam: 'Team',
      guards: 'Employees',
      addLocation: 'Add New Location',
      createLocation: 'Create Location',
      cancel: 'Cancel',
      filterAll: 'All Locations',
      morningShift: 'Morning (9AM - 5PM)',
      nightShift: 'Evening (5PM - 1AM)',
      operational: 'Operational',
      renovating: 'Renovating',
      active: 'Active',
      closed: 'Closed',
      onTime: 'On Time',
      late: 'Late',
      absent: 'Absent',
      design: 'Design',
      engineering: 'Engineering',
      hr: 'Human Resources',
      marketing: 'Marketing',
      operations: 'Operations',
      security: 'Security',
      it: 'IT',
      headquarters: 'Headquarters',

      addAttendance: 'Add Attendance',
      editAttendance: 'Edit Attendance',
      deleteAttendance: 'Delete Attendance',
      selectEmployee: 'Select Employee',
      selectDate: 'Select Date',
      selectStatus: 'Select Status',
      save: 'Save',
      actions: 'Actions',
      replacementFor: 'Replacement For',
      coveringFor: 'Covering For',
      lateDeductions: 'Late Deductions',
      absentDeductions: 'Absent Deductions',
      manualDeduction: 'Manual Deduction',
      cost: 'Cost',
      none: 'None',
      // Dashboard & Reports
      dashboardTotal: 'Total',
      activeGuards: 'Active Employees',
      operationalSites: 'Operational Sites',
      checkedInToday: 'Checked In Today',
      issuesToday: 'Issues Today',
      quickActions: 'Quick Actions',
      addStaff: 'Add Staff',
      addSite: 'Add Site',
      systemStatus: 'System Status',
      systemOperational: 'All systems operational. Database synced.',
      online: 'Online',
      attendanceReport: 'Attendance Report',
      payrollReport: 'Payroll Report',
      staffReport: 'Staff Report',
      taxReport: 'Tax Report',
      today: 'Today',
      lateAbsent: 'Late/Absent',
      lateHours: 'Late Hours',
      attendanceExists: 'Attendance already exists for this employee on this date.',
      theme: 'Theme',
      light: 'Light',
      dark: 'Dark'
    },
    hi: {
      appName: 'ग्रैंड वोल्फ',
      appSubtitle: 'सुरक्षा और गार्डिंग',
      menuDashboard: 'डैशबोर्ड',
      menuEmployees: 'कर्मचारी',
      menuSites: 'स्थान / साइट्स',
      menuAttendance: 'उपस्थिति',
      menuPayroll: 'वेतन',
      menuReports: 'रिपोर्ट',
      settings: 'सेटिंग्स',
      search: 'खोजें...',
      allEmployees: 'सभी कर्मचारी',
      manageStaff: 'सुरक्षा कर्मियों और शिफ्ट का प्रबंधन करें।',
      addEmployee: 'गार्ड जोड़ें',
      name: 'नाम',
      role: 'पद',
      dept: 'विभाग',
      salary: 'मूल वेतन',
      bonus: ' बोनस',
      overtime: 'ओ ओवरटाइम',
      deductions: 'कटौती',
      total: 'कुल',
      netPay: 'शुद्ध वेतन',
      actions: 'कार्रवाई',
      login: 'लॉग इन करें',
      signup: 'साइन अप करें',
      email: 'ईमेल',
      password: 'पासवर्ड',
      welcome: 'स्वागत है',
      signInToAccess: 'डैशबोर्ड का उपयोग करने के लिए साइन इन करें',
      createAccount: 'खाता बनाएं',
      haveAccount: 'क्या आपके पास खाता है?',
      noAccount: 'खाता नहीं है?',
      logout: 'लॉग आउट',
      location: 'स्थान',
      shift: 'शिफ्ट',
      totalComp: 'कुल आय',
      dailyAttendance: 'दैनिक उपस्थिति लॉग',
      trackAttendance: 'गार्ड चेक-इन और शिफ्ट ट्रैक करें।',
      checkIn: 'चेक इन',
      checkOut: 'चेक आउट',
      status: 'स्थिति',
      import: 'आयात (Import)',
      export: 'निर्यात (Export)',
      payrollMgmt: 'वेतन प्रबंधन',
      costAnalysis: 'वास्तविक समय लागत विश्लेषण।',
      aiInsights: 'AI विश्लेषण',
      siteStats: 'साइट आँकड़े',
      assignedGuards: 'नियुक्त गार्ड',
      deleteLocation: 'स्थान हटाएं',
      terminateGuard: 'कर्मचारी हटाएं',
      aiAssistant: 'AI सहायक',
      genReview: 'प्रदर्शन समीक्षा बनाएं',
      generating: 'बना रहा है...',
      downloadReport: 'रिपोर्ट डाउनलोड करें',
      editLocation: 'स्थान संपादित करें',
      manageDetails: 'साइट विवरण प्रबंधित करें',
      siteName: 'साइट का नाम',
      city: 'शहर / क्षेत्र',
      manager: 'साइट मैनेजर',
      operationalStatus: 'परिचालन स्थिति',
      photoUrl: 'कर्मचारी फोटो',
      uploadPhoto: 'फोटो अपलोड करें',
      unassigned: 'अनसाइंड',
      securityTeam: 'सुरक्षा टीम',
      guards: 'गार्ड',
      addLocation: 'नया स्थान जोड़ें',
      createLocation: 'स्थान बनाएं',
      cancel: 'रद्द करें',
      filterAll: 'सभी स्थान',
      morningShift: 'सुबह (12 घंटे)',
      nightShift: 'रात (12 घंटे)',
      operational: 'चालू',
      renovating: 'मरम्मत',
      active: 'सक्रिय',
      closed: 'बंद',
      onTime: 'समय पर',
      late: 'देर से',
      absent: 'अनुपस्थित',
      design: 'डिजाइन',
      engineering: 'इंजीनियरिंग',
      hr: 'मानव संसाधन',
      marketing: 'मार्केटिंग',
      operations: 'संचालन',
      security: 'सुरक्षा',
      it: 'IT',
      headquarters: 'मुख्यालय',

      addAttendance: 'हाजिरी जोड़ें',
      editAttendance: 'हाजिरी संपादित करें',
      deleteAttendance: 'हाजिरी हटाएं',
      selectEmployee: 'कर्मचारी चुनें',
      selectDate: 'दिनांक चुनें',
      selectStatus: 'स्थिति चुनें',
      save: 'सहेजें',
      actions: 'कार्रवाई',
      replacementFor: 'की जगह (Replacement)',
      coveringFor: 'कवरिंग (Covering)',
      lateDeductions: 'देरी कटौती',
      absentDeductions: 'अनुपस्थिति कटौती',
      manualDeduction: 'मैनुअल कटौती',
      cost: 'लागत',
      none: 'कोई नहीं',
      // Dashboard & Reports
      dashboardTotal: 'कुल',
      activeGuards: 'सक्रिय गार्ड',
      operationalSites: 'परिचालन स्थल',
      checkedInToday: 'आज चेक-इन किया',
      issuesToday: 'आज की समस्याएं',
      quickActions: 'त्वरित कार्रवाई',
      addStaff: 'स्टाफ जोड़ें',
      addSite: 'साइट जोड़ें',
      systemStatus: 'सिस्टम की स्थिति',
      systemOperational: 'सभी सिस्टम चालू हैं। डेटाबेस सिंक किया गया।',
      online: 'ऑनलाइन',
      attendanceReport: 'उपस्थिति रिपोर्ट',
      payrollReport: 'वेतन रिपोर्ट',
      staffReport: 'स्टाफ रिपोर्ट',
      taxReport: 'कर रिपोर्ट',
      today: 'आज',
      lateAbsent: 'देर/अनुपस्थित',
      lateHours: 'विलंब घंटे',
      attendanceExists: 'इस कर्मचारी के लिए इस तारीख को उपस्थिति पहले से मौजूद है।',
      theme: 'थीम',
      light: 'लाइट',
      dark: 'डार्क'
    },
    ar: {
      appName: 'جراند وولف',
      appSubtitle: 'للأمن والحراسة',
      menuDashboard: 'لوحة التحكم',
      menuEmployees: 'الموظفين',
      menuSites: 'المواقع',
      menuAttendance: 'الحضور',
      menuPayroll: 'الرواتب',
      menuReports: 'التقارير',
      settings: 'الإعدادات',
      search: 'بحث...',
      allEmployees: 'جميع الموظفين',
      manageStaff: 'إدارة موظفي الأمن والورديات والتفاصيل.',
      addEmployee: 'إضافة حارس',
      name: 'الاسم',
      role: 'الدور',
      dept: 'القسم',
      salary: 'الراتب الأساسي',
      bonus: 'المكافأة',
      overtime: 'العمل الإضافي',
      deductions: 'الخصومات',
      total: 'الإجمالي',
      netPay: 'صافي الراتب',
      actions: 'إجراءات',
      login: 'تسجيل الدخول',
      signup: 'إنشاء حساب',
      email: 'البريد الإلكتروني',
      password: 'كلمة المرور',
      welcome: 'مرحبًا بك',
      signInToAccess: 'سجل الدخول للوصول إلى لوحة التحكم',
      createAccount: 'إنشاء حساب جديد',
      haveAccount: 'لديك حساب؟',
      noAccount: 'ليس لديك حساب؟',
      logout: 'تسجيل خروج',
      location: 'الموقع',
      shift: 'الوردية',
      totalComp: 'إجمالي الراتب',
      dailyAttendance: 'سجل الحضور اليومي',
      trackAttendance: 'تتبع حضور وانصراف الحراس.',
      checkIn: 'دخول',
      checkOut: 'خروج',
      status: 'الحالة',
      import: 'استيراد',
      export: 'تصدير',
      payrollMgmt: 'إدارة الرواتب',
      costAnalysis: 'تحليل التكلفة في الوقت الفعلي.',
      aiInsights: 'تحليلات AI',
      siteStats: 'إحصائيات الموقع',
      assignedGuards: 'الحراس المعينين',
      deleteLocation: 'حذف الموقع',
      terminateGuard: 'إنهاء خدمة / حذف',
      aiAssistant: 'مساعد الذكاء الاصطناعي',
      genReview: 'إنشاء مراجعة الأداء',
      generating: 'جاري الإنشاء...',
      downloadReport: 'تنزيل التقرير',
      editLocation: 'تعديل الموقع',
      manageDetails: 'إدارة تفاصيل الموقع',
      siteName: 'اسم الموقع',
      city: 'المدينة / المنطقة',
      manager: 'مدير الموقع',
      operationalStatus: 'الحالة التشغيلية',
      photoUrl: 'صورة الموظف',
      uploadPhoto: 'رفع صورة',
      unassigned: 'غير معين',
      securityTeam: 'الفريق الأمني',
      guards: 'حراس',
      addLocation: 'إضافة موقع جديد',
      createLocation: 'إنشاء موقع',
      cancel: 'إلغاء',
      filterAll: 'جميع المواقع',
      morningShift: 'صباحي (12 ساعة)',
      nightShift: 'ليلي (12 ساعة)',
      operational: 'تشغيلي',
      renovating: 'تحت التجديد',
      active: 'نشط',
      closed: 'مغلق',
      onTime: 'في الوقت',
      late: 'متأخر',
      absent: 'غائب',
      design: 'تطوير',
      engineering: 'هندسة',
      hr: 'الموارد البشرية',
      marketing: 'التسويق',
      operations: 'العمليات',
      security: 'الأمن',
      it: 'IT',
      headquarters: 'المقر الرئيسي',

      addAttendance: 'إضافة حضور',
      editAttendance: 'تعديل الحضور',
      deleteAttendance: 'حذف الحضور',
      selectEmployee: 'اختر الموظف',
      selectDate: 'اختر التاريخ',
      selectStatus: 'اختر الحالة',
      save: 'حفظ',
      actions: 'إجراءات',
      replacementFor: 'بديل عن',
      coveringFor: 'تغطية عن',
      lateDeductions: 'خصومات التأخير',
      absentDeductions: 'خصومات الغياب',
      manualDeduction: 'خصم يدوي',
      cost: 'التكلفة',
      none: 'لا يوجد',
      // Dashboard & Reports
      dashboardTotal: 'الإجمالي',
      activeGuards: 'الحراس النشطين',
      operationalSites: 'المواقع التشغيلية',
      checkedInToday: 'تم تسجيل الدخول اليوم',
      issuesToday: 'مشاكل اليوم',
      quickActions: 'إجراءات سريعة',
      addStaff: 'إضافة موظف',
      addSite: 'إضافة موقع',
      systemStatus: 'حالة النظام',
      systemOperational: 'جميع الأنظمة تعمل. قاعدة البيانات متزامنة.',
      online: 'متصل',
      attendanceReport: 'تقرير الحضور',
      payrollReport: 'تقرير الرواتب',
      staffReport: 'تقرير الموظفين',
      taxReport: 'تقرير الضرائب',
      today: 'اليوم',
      lateAbsent: 'تأخير/غياب',
      lateHours: 'ساعات التأخير',
      attendanceExists: 'تم تسجيل الحضور لهذا الموظف في هذا التاريخ بالفعل.',
      theme: 'المظهر',
      light: 'فاتح',
      dark: 'داكن'
    }
  };

  const [language, setLanguage] = useState('en');
  const t = (key) => translations[language][key] || key;

  // Toggle Language Handler
  const toggleLanguage = () => {
    setLanguage(prev => {
      if (prev === 'en') return 'hi';
      if (prev === 'hi') return 'ar';
      return 'en';
    });
  };



  // State Persistence for Tabs
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('activeTab') || 'dashboard');

  useEffect(() => {
    localStorage.setItem('activeTab', activeTab);
  }, [activeTab]);

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedSite, setSelectedSite] = useState(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isAddSiteModalOpen, setIsAddSiteModalOpen] = useState(false);

  const [attendanceSiteFilter, setAttendanceSiteFilter] = useState('All');
  const [employeeLocationFilter, setEmployeeLocationFilter] = useState('');
  const [payrollLocationFilter, setPayrollLocationFilter] = useState('');
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null); // For edit modal

  // --- Auth & UI State ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', apiKey: '' });
  const [loading, setLoading] = useState(false);

  // --- Auth Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- Auth Handlers ---
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (authMode === 'login') {
        await signInWithEmailAndPassword(auth, authForm.email, authForm.password);
      } else {
        await createUserWithEmailAndPassword(auth, authForm.email, authForm.password);
      }
      setAuthForm({ email: '', password: '' });
    } catch (error) {
      alert("Auth Error: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error(error);
      alert("Google Sign In Error: " + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(error);
    }
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      alert("Google Account Linked Successfully!");
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/credential-already-in-use') {
        alert("This Google Account is already active. Please Log Out and use 'Sign in with Google' directly.");
      } else {
        alert("Link Error: " + error.message);
      }
    }
  };




  // Settings State
  const [showSettings, setShowSettings] = useState(false);

  // --- Initial Data (Only used if localStorage is empty) ---
  const initialEmployees = [
    {
      id: 1,
      name: 'Sarah Connor',
      role: 'Security Supervisor',
      dept: 'Operations',
      status: 'Active',
      location: 'Headquarters',
      shift: 'Morning (12 Hours)',
      salary: 120000,
      bonus: 5000,
      overtime: 200,
      photo: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80'
    },
    {
      id: 2,
      name: 'James Cameron',
      role: 'Senior Guard',
      dept: 'Security',
      status: 'Active',
      location: 'Site Alpha',
      shift: 'Night (12 Hours)',
      salary: 145000,
      bonus: 8000,
      overtime: 0,
      photo: ''
    },
    { id: 3, name: 'Ellen Ripley', role: 'HR Manager', dept: 'Human Resources', status: 'On Leave', location: 'Headquarters', shift: 'Morning (12 Hours)', salary: 95000, bonus: 2000, overtime: 0, photo: '' },
    { id: 4, name: 'Kyle Reese', role: 'Patrol Lead', dept: 'Security', status: 'Active', location: 'NYC Branch', shift: 'Night (12 Hours)', salary: 110000, bonus: 6500, overtime: 1200, photo: '' },
    { id: 5, name: 'John Matrix', role: 'Surveillance Tech', dept: 'IT', status: 'Remote', location: 'Remote', shift: 'Night (12 Hours)', salary: 135000, bonus: 4000, overtime: 3500, photo: '' },
  ];

  const initialSites = [
    { id: 1, name: 'Headquarters', city: 'San Francisco', manager: 'Ellen Ripley', status: 'Operational' },
    { id: 2, name: 'NYC Branch', city: 'New York', manager: 'Kyle Reese', status: 'Operational' },
    { id: 3, name: 'Site Alpha', city: 'Nevada', manager: 'Sarah Connor', status: 'Renovating' },
    { id: 4, name: 'Remote Team', city: 'Global', manager: 'James Cameron', status: 'Active' },
  ];

  const initialAttendance = [
    { id: 1, name: 'Sarah Connor', date: '2025-12-07', status: 'On Time' },
    { id: 2, name: 'James Cameron', date: '2025-12-07', status: 'Late' },
    { id: 3, name: 'Kyle Reese', date: '2025-12-07', status: 'On Time' },
    { id: 4, name: 'John Matrix', date: '2025-12-07', status: 'Absent' },
  ];

  // --- State with Firestore Integration ---
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [attendance, setAttendance] = useState([]);

  // --- Firestore Listeners ---
  useEffect(() => {
    if (!user) return;

    // Employees Listener
    const qEmp = query(collection(db, 'employees'), where('userId', '==', user.uid));
    const unsubEmp = onSnapshot(qEmp, (snapshot) => {
      setEmployees(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Employees Listener Error:", error));

    // Sites Listener
    const qSites = query(collection(db, 'sites'), where('userId', '==', user.uid));
    const unsubSites = onSnapshot(qSites, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Sites Listener Error:", error));

    // Attendance Listener
    const qAtt = query(collection(db, 'attendance'), where('userId', '==', user.uid));
    const unsubAtt = onSnapshot(qAtt, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => console.error("Attendance Listener Error:", error));

    return () => {
      unsubEmp();
      unsubSites();
      unsubAtt();
    };
  }, [user]);

  // --- Persistence Effects replaced by Firestore Listeners ---

  const shifts = ['Morning (12 Hours)', 'Night (12 Hours)'];

  // Form State
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    name: '', role: '', dept: 'Security', location: 'Headquarters', shift: 'Morning (12 Hours)', salary: 60000, bonus: 0, overtime: 0, deductionHours: 0, photo: ''
  });

  const [newSiteForm, setNewSiteForm] = useState({
    name: '', city: '', manager: '', status: 'Operational'
  });



  const [newAttendanceForm, setNewAttendanceForm] = useState({
    employeeId: '', date: new Date().toISOString().split('T')[0], status: 'On Time', replacementFor: '', locationFilter: ''
  });
  const getEmployeeLocation = (employeeName) => {
    const emp = employees.find(e => e.name === employeeName);
    return emp ? emp.location : 'Unknown';
  };

  const generateCSV = (headers, data, filename) => {
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.map(item => `"${item}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.download !== undefined) {
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // --- Import / Export Handlers ---
  const handleExportAttendance = () => {
    const headers = ['Employee', 'Date', 'Location', 'Status'];
    const data = attendance.map(r => [r.name, r.date, getEmployeeLocation(r.name), r.status]);
    generateCSV(headers, data, 'Attendance_Export.csv');
  };

  const handleExportPayroll = () => {
    const headers = ['Employee', 'Role', 'Base Salary', 'Bonus', 'Overtime'];
    const data = employees.map(e => [e.name, e.role, e.salary, e.bonus, e.overtime]);
    generateCSV(headers, data, 'Payroll_Export.csv');
  };

  const handleImportAttendance = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split('\n').slice(1);

      const batch = writeBatch(db);
      let count = 0;

      rows.forEach((row, index) => {
        const cols = row.split(',').map(c => c.replace(/"/g, ''));
        if (cols.length < 4) return;

        const newRef = doc(collection(db, 'attendance'));
        batch.set(newRef, {
          name: cols[0],
          date: cols[1],
          status: cols[3] || 'Pending',
          userId: user.uid
        });
        count++;
      });

      try {
        await batch.commit();
        alert(`Successfully imported ${count} records to Cloud.`);
      } catch (err) {
        console.error(err);
        alert("Error importing: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleImportPayroll = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const text = e.target.result;
      const rows = text.split('\n').slice(1);

      const batch = writeBatch(db);
      let updatedCount = 0;

      rows.forEach(row => {
        const cols = row.split(',').map(c => c.replace(/"/g, ''));
        if (cols.length < 4) return;
        const name = cols[0];
        const salary = parseFloat(cols[2]);
        const bonus = parseFloat(cols[3]);
        const overtime = parseFloat(cols[4]);

        // Find employee by name (Case Insensitive)
        const emp = employees.find(e => e.name.toLowerCase() === name.toLowerCase());

        if (emp && !isNaN(salary)) {
          const empRef = doc(db, 'employees', emp.id);
          batch.update(empRef, {
            salary: salary,
            bonus: isNaN(bonus) ? 0 : bonus,
            overtime: isNaN(overtime) ? 0 : overtime
          });
          updatedCount++;
        }
      });

      try {
        await batch.commit();
        alert(`Successfully updated payroll for ${updatedCount} employees in Cloud.`);
      } catch (err) {
        console.error(err);
        alert("Error updating payroll: " + err.message);
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  // --- Image Handling Handlers ---
  const handleNewEmployeeImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewEmployeeForm(prev => ({ ...prev, photo: reader.result }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateEmployeeImage = (id, e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        handleUpdateEmployee(id, 'photo', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Actions (Firestore) ---
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!user) {
      alert("Error: No user logged in.");
      return;
    }

    // Debug
    console.log("Adding employee...");

    try {
      await addDoc(collection(db, 'employees'), {
        ...newEmployeeForm,
        salary: Number(newEmployeeForm.salary) || 0,
        bonus: Number(newEmployeeForm.bonus) || 0,
        overtime: Number(newEmployeeForm.overtime) || 0,
        userId: user.uid,
        status: 'Active',
        createdAt: serverTimestamp()
      });
      alert("Employee Saved Successfully!"); // Debug Confirmation
      setIsAddModalOpen(false);
      setNewEmployeeForm({ name: '', role: '', dept: 'Security', location: 'Headquarters', shift: 'Morning (12 Hours)', salary: 60000, bonus: 0, overtime: 0, deductionHours: 0, photo: '' });
    } catch (err) {
      console.error(err);
      alert("Error saving: " + err.message);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!user) return;
    if (window.confirm("Are you sure?")) {
      await deleteDoc(doc(db, 'employees', id));
      setSelectedEmployee(null);
    }
  };

  const handleUpdateEmployee = async (id, field, value) => {
    if (!user) return;
    await updateDoc(doc(db, 'employees', id), { [field]: value });
    setSelectedEmployee(prev => ({ ...prev, [field]: value }));
  };

  const handleAddSite = async (e) => {
    e.preventDefault();
    if (!user) return;
    await addDoc(collection(db, 'sites'), {
      ...newSiteForm,
      userId: user.uid
    });
    setIsAddSiteModalOpen(false);
    setNewSiteForm({ name: '', city: '', manager: '', status: 'Operational' });
  };

  const handleUpdateSite = async (id, field, value) => {
    await updateDoc(doc(db, 'sites', id), { [field]: value });
    setSelectedSite(prev => ({ ...prev, [field]: value }));
  };

  const handleDeleteSite = async (id, siteName) => {
    const assignedEmployees = employees.filter(e => e.location === siteName).length;
    if (assignedEmployees > 0) {
      alert(`Cannot delete. ${assignedEmployees} employees assigned.`);
      return;
    }
    if (window.confirm("Delete this location?")) {
      await deleteDoc(doc(db, 'sites', id));
      setSelectedSite(null);
    }
  };

  const handleAddAttendance = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Get Employee Name
    const emp = employees.find(e => e.id.toString() === newAttendanceForm.employeeId.toString());
    const empName = emp ? emp.name : 'Unknown';

    // Prevent Duplicates
    if (attendance.some(r => r.name === empName && r.date === newAttendanceForm.date)) {
      alert(t('attendanceExists'));
      return;
    }

    await addDoc(collection(db, 'attendance'), {
      name: empName,
      date: newAttendanceForm.date,
      status: newAttendanceForm.status,
      replacementFor: newAttendanceForm.replacementFor || null,
      lateHours: newAttendanceForm.lateHours ? Number(newAttendanceForm.lateHours) : 0,
      userId: user.uid
    });

    setIsAddAttendanceModalOpen(false);
    setIsAddAttendanceModalOpen(false);
    setNewAttendanceForm({ employeeId: '', date: new Date().toISOString().split('T')[0], status: 'On Time', replacementFor: '', locationFilter: '', lateHours: 0 });
  };

  const handleDeleteAttendance = async (id) => {
    if (window.confirm(t('deleteAttendance') + "?")) {
      await deleteDoc(doc(db, 'attendance', id));
    }
  };

  const handleUpdateAttendance = async (e) => {
    e.preventDefault();
    if (!editingAttendance) return;

    await updateDoc(doc(db, 'attendance', editingAttendance.id), {
      date: editingAttendance.date,
      status: editingAttendance.status,
      replacementFor: editingAttendance.replacementFor || null,
      lateHours: editingAttendance.lateHours ? Number(editingAttendance.lateHours) : 0
    });

    setEditingAttendance(null);
  };


  const downloadReport = (reportType) => {
    let headers = [], data = [], filename = '';
    switch (reportType) {
      case 'attendance':
        headers = ['Employee', 'Date', 'Location', 'Status'];
        data = attendance.map(r => [r.name, r.date, getEmployeeLocation(r.name), r.status]);
        filename = 'GrandWolf_Attendance.csv';
        break;
      case 'payroll':
        headers = ['Employee', 'Role', 'Dept', 'Base (EGP)', 'Bonus (EGP)', 'Overtime (EGP)', 'Total (EGP)'];
        data = employees.map(e => [e.name, e.role, e.dept, e.salary, e.bonus, e.overtime, e.salary + e.bonus + e.overtime]);
        filename = 'GrandWolf_Payroll.csv';
        break;
      case 'turnover':
        headers = ['Employee', 'Role', 'Dept', 'Status', 'Location'];
        data = employees.map(e => [e.name, e.role, e.dept, e.status, e.location]);
        filename = 'GrandWolf_Staff.csv';
        break;
      case 'tax':
        headers = ['Employee', 'Total (EGP)', 'Tax (20%)', 'Net Pay'];
        data = employees.map(e => {
          const total = e.salary + e.bonus + e.overtime;
          const tax = total * 0.2;
          return [e.name, total, tax, total - tax];
        });
        filename = 'GrandWolf_Tax.csv';
        break;
      default: return;
    }
    generateCSV(headers, data, filename);
  };



  // --- Login Screen ---
  if (authLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="text-center mb-6">
              <div className="inline-flex p-3 bg-blue-100 text-blue-600 rounded-xl mb-4">
                <Shield size={40} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">{authMode === 'login' ? t('welcome') : t('createAccount')}</h1>
              <p className="text-gray-500 mt-2">{t('signInToAccess')}</p>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                  <input
                    type="email"
                    className="pl-10 input-field"
                    placeholder="name@example.com"
                    value={authForm.email}
                    onChange={e => setAuthForm({ ...authForm, email: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('password')}</label>
                <div className="relative">
                  <div className="absolute left-3 top-3 text-gray-400"><Shield size={18} /></div>
                  <input
                    type="password"
                    className="pl-10 input-field"
                    placeholder="••••••••"
                    value={authForm.password}
                    onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
                    required
                  />
                </div>
              </div>



              <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? t('login') : t('signup'))}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
              <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">Or continue with</span></div>
            </div>

            <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mb-6">
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
              Sign in with Google
            </button>

            <div className="mt-6 text-center text-sm">
              <span className="text-gray-500">{authMode === 'login' ? t('noAccount') : t('haveAccount')}</span>
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="ml-2 text-blue-600 font-bold hover:underline"
              >
                {authMode === 'login' ? t('signup') : t('login')}
              </button>
            </div>

            <div className="mt-4 flex justify-center gap-4">
              <button onClick={toggleLanguage} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-xs font-medium transition-colors flex items-center gap-2">
                <Globe size={14} /> {language.toUpperCase()}
              </button>
            </div>
          </div>
        </div >
      </div >
    );
  }
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <SpeedInsights />
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 w-64 bg-slate-900 text-white flex flex-col shadow-xl z-30 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 md:relative`}>
        <div className="p-6 border-b border-slate-700 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg">
              <Shield size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg tracking-tight">{t('appName')}</h1>
              <p className="text-xs text-slate-400">{t('appSubtitle')}</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-400 hover:text-white"><X size={24} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label={t('menuDashboard')} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Users size={20} />} label={t('menuEmployees')} active={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<MapPin size={20} />} label={t('menuSites')} active={activeTab === 'sites'} onClick={() => { setActiveTab('sites'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Clock size={20} />} label={t('menuAttendance')} active={activeTab === 'attendance'} onClick={() => { setActiveTab('attendance'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<DollarSign size={20} />} label={t('menuPayroll')} active={activeTab === 'payroll'} onClick={() => { setActiveTab('payroll'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<BarChart3 size={20} />} label={t('menuReports')} active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setIsSidebarOpen(false); }} />
        </nav>

        <div className="p-4 border-t border-slate-800 space-y-2">
          <button onClick={() => setShowSettings(true)} className="flex items-center w-full px-4 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
            <Settings size={18} className="mr-3" />
            {t('settings')}
          </button>
          <button onClick={handleLogout} className="flex items-center w-full px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-slate-800 rounded-lg transition-colors">
            <LogOut size={18} className="mr-3" />
            {t('logout')}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header Overlay */}
        {isSidebarOpen && <div className="fixed inset-0 bg-black/50 z-20 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* Header */}
        <header className="bg-white border-b border-gray-200 h-16 flex items-center justify-between px-4 md:px-8 shadow-sm z-10">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-gray-600 hover:text-gray-900"><Menu size={24} /></button>
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              {activeTab === 'dashboard' && <LayoutDashboard className="text-sky-600" />}
              {activeTab === 'employees' && <Users className="text-blue-600" />}
              {activeTab === 'sites' && <MapPin className="text-emerald-600" />}
              {activeTab === 'attendance' && <Clock className="text-orange-600" />}
              {activeTab === 'payroll' && <DollarSign className="text-purple-600" />}
              {activeTab === 'reports' && <BarChart3 className="text-indigo-600" />}
              <span>
                {activeTab === 'dashboard' && t('menuDashboard')}
                {activeTab === 'employees' && t('menuEmployees')}
                {activeTab === 'sites' && t('menuSites')}
                {activeTab === 'attendance' && t('menuAttendance')}
                {activeTab === 'payroll' && t('menuPayroll')}
                {activeTab === 'reports' && t('menuReports')}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <button onClick={toggleLanguage} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2">
              <Globe size={16} />
              {language.toUpperCase()}
            </button>
            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
              AD
            </div>
          </div>
        </header>

        {/* Views */}
        <div className="flex-1 overflow-auto p-8 bg-gray-50">

          {activeTab === 'dashboard' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg shadow-blue-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg"><Users size={24} /></div>
                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">{t('dashboardTotal')}</span>
                  </div>
                  <h3 className="text-3xl font-bold">{employees.length}</h3>
                  <p className="text-blue-100 text-sm mt-1">{t('activeGuards')}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg shadow-emerald-200">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-white/20 rounded-lg"><MapPin size={24} /></div>
                    <span className="bg-white/20 px-2 py-1 rounded text-xs font-medium">{t('active')}</span>
                  </div>
                  <h3 className="text-3xl font-bold">{sites.filter(s => s.status === 'Operational').length}</h3>
                  <p className="text-emerald-100 text-sm mt-1">{t('operationalSites')}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-orange-100 text-orange-600 rounded-lg"><Clock size={24} /></div>
                    <span className="text-gray-400 text-xs">{t('today')}</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800">
                    {attendance.filter(a => a.date === new Date().toISOString().split('T')[0]).length}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">{t('checkedInToday')}</p>
                </div>

                <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-2 bg-red-100 text-red-600 rounded-lg"><AlertCircle size={24} /></div>
                    <span className="text-gray-400 text-xs">{t('lateAbsent')}</span>
                  </div>
                  <h3 className="text-3xl font-bold text-gray-800">
                    {attendance.filter(a => (a.status === 'Late' || a.status === 'Absent') && a.date === new Date().toISOString().split('T')[0]).length}
                  </h3>
                  <p className="text-gray-500 text-sm mt-1">{t('issuesToday')}</p>
                </div>
              </div>

              {/* Quick Links */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h3 className="font-bold text-lg mb-4 text-gray-800">{t('quickActions')}</h3>
                  <div className="flex gap-4">
                    <button onClick={() => { setActiveTab('employees'); setIsAddModalOpen(true); }} className="flex-1 py-3 bg-blue-50 text-blue-600 rounded-xl font-medium hover:bg-blue-100 transition-colors flex flex-col items-center gap-2">
                      <Users size={20} /> {t('addStaff')}
                    </button>
                    <button onClick={() => { setActiveTab('sites'); setIsAddSiteModalOpen(true); }} className="flex-1 py-3 bg-emerald-50 text-emerald-600 rounded-xl font-medium hover:bg-emerald-100 transition-colors flex flex-col items-center gap-2">
                      <MapPin size={20} /> {t('addSite')}
                    </button>
                  </div>
                </div>
                <div className="bg-slate-900 p-6 rounded-2xl shadow-lg text-white relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-32 bg-blue-500 rounded-full blur-3xl opacity-20 -mr-16 -mt-16"></div>
                  <h3 className="font-bold text-lg mb-2 relative z-10">{t('systemStatus')}</h3>
                  <p className="text-slate-400 text-sm mb-4 relative z-10">{t('systemOperational')}</p>
                  <div className="flex items-center gap-2 text-emerald-400 text-sm font-mono relative z-10">
                    <span className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></span>
                    {t('online')}
                  </div>
                </div>
              </div>

            </div>
          )}
          {activeTab === 'employees' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('allEmployees')}</h3>
                  <p className="text-sm text-gray-500">{t('manageStaff')}</p>
                </div>
                <div className="flex gap-3">
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={employeeLocationFilter}
                    onChange={e => setEmployeeLocationFilter(e.target.value)}
                  >
                    <option value="">{t('filterAll')}</option>
                    {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-blue-600/20 transition-all">
                    <Plus size={18} /> {t('addEmployee')}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {employees
                  .filter(emp => !employeeLocationFilter || emp.location === employeeLocationFilter)
                  .map(emp => (
                    <div key={emp.id} onClick={() => setSelectedEmployee(emp)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer relative overflow-hidden group">
                      <div className={`absolute top-0 left-0 w-1 h-full ${emp.status === 'Active' ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden border-2 border-white shadow-sm flex items-center justify-center">
                            {emp.photo ? <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" /> : <User size={24} className="text-gray-400" />}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 leading-tight">{emp.name}</h4>
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">{emp.role}</span>
                          </div>
                        </div>
                        {emp.status === 'Active' ? <CheckCircle size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-gray-400" />}
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><Briefcase size={14} className="text-gray-400" /> {emp.dept}</div>
                        <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {emp.location || t('unassigned')}</div>
                        <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {emp.shift}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'sites' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('filterAll')}</h3>
                  <p className="text-sm text-gray-500">{t('manageDetails')}</p>
                </div>
                <button onClick={() => setIsAddSiteModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all">
                  <Plus size={18} /> {t('addLocation')}
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {sites.map(site => (
                  <div key={site.id} onClick={() => setSelectedSite(site)} className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-lg ${site.status === 'Operational' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                        <Building2 size={24} />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-gray-900">{site.name}</h4>
                        <p className="text-slate-500 flex items-center gap-1 text-sm"><MapPin size={14} /> {site.city}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="hidden md:block text-right">
                        <p className="text-gray-500">{t('manager')}</p>
                        <p className="font-medium text-gray-800">{site.manager || '-'}</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${site.status === 'Operational' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                        {site.status === 'Operational' ? t('operational') : t('renovating')}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'attendance' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div>
                  <h3 className="font-bold text-gray-900">{t('dailyAttendance')}</h3>
                  <p className="text-xs text-slate-500">{new Date(attendanceDateFilter).toDateString()}</p>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    value={attendanceSiteFilter}
                    onChange={(e) => setAttendanceSiteFilter(e.target.value)}
                  >
                    <option value="All">{t('filterAll')}</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.name}>{site.name}</option>
                    ))}
                  </select>

                  <input
                    type="date"
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    value={attendanceDateFilter}
                    onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  />

                  <button onClick={() => setIsAddAttendanceModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                    <Plus size={16} /> {t('addAttendance')}
                  </button>

                  <div className="h-6 w-px bg-gray-200 mx-1"></div>

                  <label className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg cursor-pointer border hover:bg-gray-100 transition-colors">
                    <Upload size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{t('import')} CSV</span>
                    <input type="file" accept=".csv" onChange={handleImportAttendance} className="hidden" />
                  </label>
                  <button onClick={handleExportAttendance} className="flex items-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-lg transition-colors">
                    <Download size={16} /> {t('export')}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3 font-medium">{t('name')}</th>
                      <th className="px-6 py-3 font-medium">{t('location')}</th>
                      <th className="px-6 py-3 font-medium">{t('selectDate')}</th>
                      <th className="px-6 py-3 font-medium">{t('coveringFor')}</th>
                      <th className="px-6 py-3 font-medium">{t('status')}</th>
                      <th className="px-6 py-3 font-medium text-right">{t('actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {attendance.filter(r =>
                      (attendanceSiteFilter === 'All' || getEmployeeLocation(r.name) === attendanceSiteFilter) &&
                      (r.date === attendanceDateFilter)
                    ).map(record => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 font-medium text-gray-900">{record.name}</td>
                        <td className="px-6 py-4 text-gray-500">{getEmployeeLocation(record.name)}</td>
                        <td className="px-6 py-4 text-gray-500 font-mono">{record.date}</td>
                        <td className="px-6 py-4 text-gray-500 italic">{record.replacementFor || '-'}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={record.status} lateHours={record.lateHours} t={t} />
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button onClick={() => setEditingAttendance(record)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                              {/* Edit Icon */}
                              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                            </button>
                            <button onClick={() => handleDeleteAttendance(record.id)} className="p-1 text-red-600 hover:bg-red-50 rounded">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payroll' && (
            <div className="space-y-6">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">{t('payrollMgmt')}</h3>
                  <p className="text-sm text-slate-500">{t('costAnalysis')}</p>
                </div>
                <div className="flex gap-3">
                  <select
                    className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5"
                    value={payrollLocationFilter}
                    onChange={(e) => setPayrollLocationFilter(e.target.value)}
                  >
                    <option value="">{t('filterAll')}</option>
                    {sites.map(site => (
                      <option key={site.id} value={site.name}>{site.name}</option>
                    ))}
                  </select>

                  <label className="flex items-center gap-2 bg-white border border-gray-300 px-3 py-2 rounded-lg cursor-pointer hover:bg-gray-50 text-sm font-medium">
                    <Upload size={16} /> {t('import')}
                    <input type="file" accept=".csv" onChange={handleImportPayroll} className="hidden" />
                  </label>
                  <button onClick={handleExportPayroll} className="bg-white border border-gray-300 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium hover:bg-gray-50">
                    <Download size={16} /> {t('export')}
                  </button>
                </div>
              </div>



              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-3">{t('name')}</th>
                      <th className="px-6 py-3">{t('location')}</th>
                      <th className="px-6 py-3">{t('role')}</th>
                      <th className="px-6 py-3 text-right">{t('salary')}</th>
                      <th className="px-6 py-3 text-right">{t('bonus')}</th>
                      <th className="px-6 py-3 text-right">{t('overtime')}</th>
                      <th className="px-6 py-3 text-right text-amber-600">{t('late')}</th>
                      <th className="px-6 py-3 text-right text-red-600">{t('absent')}</th>
                      <th className="px-6 py-3 text-right text-red-800">{t('deductions')}</th>
                      <th className="px-6 py-3 text-right">{t('netPay')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {employees
                      .filter(emp => !payrollLocationFilter || emp.location === payrollLocationFilter)
                      .map(emp => {
                        const baseSalary = Number(emp.salary) || 0;
                        const bonus = Number(emp.bonus) || 0;
                        const overtime = Number(emp.overtime) || 0;
                        let deductionAmount = 0;
                        let lateDeduction = 0;
                        let absentDeduction = 0;
                        const empAttendance = attendance.filter(a => a.name === emp.name); // Simple match by name

                        empAttendance.forEach(record => {
                          if (record.status === 'Late') {
                            // Hourly Rate = Salary / 360
                            const hourlyRate = baseSalary / 360;
                            const lateCost = (Number(record.lateHours) || 0) * hourlyRate;
                            if (lateCost > 0) {
                              lateDeduction += lateCost;
                              deductionAmount += lateCost;
                            } else {
                              // Fallback if no hours set but late? Maybe 0 or assume 1 hour? 
                              // Let's assume 0 for now as user explicitely asked for "chosen" hours.
                            }
                          }
                          if (record.status === 'Absent') {
                            const cost = baseSalary / 30;
                            absentDeduction += cost;
                            deductionAmount += cost;
                          }
                        });

                        // Add Manual Hourly Deductions
                        // Hourly Rate = Salary / 30 / 12 (assuming 12 hour shift, 30 days) => Salary / 360
                        const hourlyRate = baseSalary / 360;
                        const manualDeduction = (Number(emp.deductionHours) || 0) * hourlyRate;
                        deductionAmount += manualDeduction;

                        const netPay = baseSalary + bonus + overtime - deductionAmount;

                        return (
                          <tr key={emp.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">
                              <div>{emp.name}</div>
                              <div className="text-xs text-gray-500">{emp.dept}</div>
                            </td>
                            <td className="px-6 py-4 text-gray-500">{emp.location}</td>
                            <td className="px-6 py-4 text-gray-500">{emp.role}</td>
                            <td className="px-6 py-4 text-right font-mono">{formatCurrency(baseSalary)}</td>
                            <td className="px-6 py-4 text-right font-mono text-green-600">+EGP {bonus.toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-mono text-orange-600">+EGP {overtime.toLocaleString()}</td>

                            {/* Detailed Deductions Columns */}
                            <td className="px-6 py-4 text-right font-mono text-amber-600">
                              {lateDeduction > 0 ? `-EGP ${Math.round(lateDeduction).toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-red-600">
                              {absentDeduction > 0 ? `-EGP ${Math.round(absentDeduction).toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-red-800 font-bold">-EGP {Math.round(deductionAmount).toLocaleString()}</td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">EGP {Math.round(netPay).toLocaleString()}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { id: 'attendance', label: t('attendanceReport'), icon: <Clock />, color: 'text-orange-600', bg: 'bg-orange-50' },
                { id: 'payroll', label: t('payrollReport'), icon: <DollarSign />, color: 'text-purple-600', bg: 'bg-purple-50' },
                { id: 'turnover', label: t('staffReport'), icon: <Users />, color: 'text-blue-600', bg: 'bg-blue-50' },
                { id: 'tax', label: t('taxReport'), icon: <FileText />, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              ].map(report => (
                <button key={report.id} onClick={() => downloadReport(report.id)} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all text-left group">
                  <div className={`w-12 h-12 ${report.bg} ${report.color} rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    {React.cloneElement(report.icon, { size: 24 })}
                  </div>
                  <h4 className="font-bold text-gray-900 mb-1">{report.label}</h4>
                  <div className="flex items-center text-sm text-gray-500 gap-1 group-hover:text-blue-600">
                    {t('downloadReport')} <Download size={14} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </main>

      {/* --- Modals --- */}

      {/* Employee Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">{t('addEmployee')}</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddEmployee} className="p-6 space-y-4">
              <div className="flex justify-center mb-4">
                <label className="relative cursor-pointer group">
                  <div className="w-24 h-24 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-blue-500 transition-colors">
                    {newEmployeeForm.photo ? <img src={newEmployeeForm.photo} alt="Preview" className="w-full h-full object-cover" /> : <Camera className="text-gray-400 group-hover:text-blue-500" size={32} />}
                  </div>
                  <input type="file" accept="image/*" onChange={handleNewEmployeeImage} className="hidden" />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <input className="input-field" placeholder={t('name')} value={newEmployeeForm.name} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, name: e.target.value })} required />
                <input className="input-field" placeholder={t('role')} value={newEmployeeForm.role} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, role: e.target.value })} required />
              </div>

              <select className="input-field" value={newEmployeeForm.dept} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, dept: e.target.value })}>
                {['Security', 'Operations', 'HR', 'IT'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>

              <select className="input-field" value={newEmployeeForm.location} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, location: e.target.value })}>
                {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>

              <select className="input-field" value={newEmployeeForm.shift} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, shift: e.target.value })}>
                {shifts.map(s => <option key={s} value={s}>{s}</option>)}
              </select>

              <input type="number" className="input-field" placeholder={t('salary')} value={newEmployeeForm.salary} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, salary: Number(e.target.value) })} required />

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">{t('addEmployee')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Site Modal */}
      {isAddSiteModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h3 className="font-bold text-lg text-gray-900">{t('createLocation')}</h3>
              <button onClick={() => setIsAddSiteModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <form onSubmit={handleAddSite} className="p-6 space-y-4">
              <input className="input-field" placeholder={t('siteName')} value={newSiteForm.name} onChange={e => setNewSiteForm({ ...newSiteForm, name: e.target.value })} required />
              <input className="input-field" placeholder={t('city')} value={newSiteForm.city} onChange={e => setNewSiteForm({ ...newSiteForm, city: e.target.value })} required />
              <input className="input-field" placeholder={t('manager')} value={newSiteForm.manager} onChange={e => setNewSiteForm({ ...newSiteForm, manager: e.target.value })} />

              <select className="input-field" value={newSiteForm.status} onChange={e => setNewSiteForm({ ...newSiteForm, status: e.target.value })}>
                <option value="Operational">Operational</option>
                <option value="Renovating">Renovating</option>
                <option value="Active">Active</option>
                <option value="Closed">Closed</option>
              </select>

              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setIsAddSiteModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-600/20">{t('createLocation')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Sidebar (Employee/Site) */}
      {(selectedEmployee || selectedSite) && (
        <div className="fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-40 transform transition-transform duration-300 ease-in-out border-l border-gray-100 overflow-y-auto">
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-bold text-xl text-gray-900">{selectedEmployee ? t('details') : t('manageDetails')}</h3>
              <button onClick={() => { setSelectedEmployee(null); setSelectedSite(null); }} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
            </div>

            {selectedEmployee && (
              <div className="space-y-6">
                <div className="flex flex-col items-center">
                  <div className="relative group cursor-pointer" >
                    <div className="w-24 h-24 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-md mb-3">
                      {selectedEmployee.photo ? <img src={selectedEmployee.photo} alt={selectedEmployee.name} className="w-full h-full object-cover" /> : <User size={40} className="text-gray-300 m-auto mt-6" />}
                    </div>
                    <label className="absolute bottom-3 right-0 bg-blue-600 p-1.5 rounded-full text-white shadow-sm cursor-pointer hover:bg-blue-700 transition-colors">
                      <Camera size={14} />
                      <input type="file" className="hidden" accept="image/*" onChange={(e) => handleUpdateEmployeeImage(selectedEmployee.id, e)} />
                    </label>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedEmployee.name}</h2>
                  <span className="text-sm font-medium text-slate-500">{selectedEmployee.role}</span>
                </div>

                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <InfoRow label={t('dept')} value={selectedEmployee.dept} />
                    {/* Location Select for Update */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{t('location')}</span>
                      <select className="text-sm font-medium bg-transparent text-right outline-none cursor-pointer hover:text-blue-600" value={selectedEmployee.location} onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'location', e.target.value)}>
                        {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{t('shift')}</span>
                      <select className="text-sm font-medium bg-transparent text-right outline-none cursor-pointer hover:text-blue-600" value={selectedEmployee.shift} onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'shift', e.target.value)}>
                        {shifts.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    {/* Replacement Field (Dropdown) */}
                    <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                      <span className="text-sm text-gray-500">{t('replacementFor')}</span>
                      <select
                        className="text-sm font-medium bg-transparent text-right outline-none cursor-pointer hover:text-blue-600 max-w-[150px]"
                        value={selectedEmployee.replacementFor || ''}
                        onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'replacementFor', e.target.value)}
                      >
                        <option value="">{t('none')}</option>
                        {employees.filter(e => e.id !== selectedEmployee.id && e.location === selectedEmployee.location).map(emp => (
                          <option key={emp.id} value={emp.name}>{emp.name}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><DollarSign size={16} /> Compensation</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">{t('salary')}</span>
                        <input
                          type="number"
                          className="w-24 text-right bg-white rounded px-1 text-sm border-blue-200"
                          value={selectedEmployee.salary}
                          onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'salary', Number(e.target.value))}
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">{t('bonus')}</span>
                        <input type="number" className="w-20 text-right bg-white rounded px-1 text-sm border-blue-200" value={selectedEmployee.bonus} onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'bonus', Number(e.target.value))} />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-blue-700">{t('overtime')}</span>
                        <input type="number" className="w-20 text-right bg-white rounded px-1 text-sm border-blue-200" value={selectedEmployee.overtime} onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'overtime', Number(e.target.value))} />
                      </div>



                      {/* Deductions in Sidebar */}
                      {(() => {
                        const baseSalary = Number(selectedEmployee.salary) || 0;
                        let deductionAmount = 0;
                        let lateDeduction = 0;
                        let absentDeduction = 0;
                        const empAttendance = attendance.filter(a => a.name === selectedEmployee.name);

                        empAttendance.forEach(record => {
                          if (record.status === 'Late') {
                            lateDeduction += 50;
                            deductionAmount += 50;
                          }
                          if (record.status === 'Absent') {
                            const absCost = baseSalary / 30;
                            absentDeduction += absCost;
                            deductionAmount += absCost;
                          }
                        });

                        // Manual Deduction Calc
                        const hourlyRate = baseSalary / 360;
                        const manualHours = Number(selectedEmployee.deductionHours) || 0;
                        const manualDeductionCost = manualHours * hourlyRate;
                        deductionAmount += manualDeductionCost;

                        const netPay = baseSalary + (Number(selectedEmployee.bonus) || 0) + (Number(selectedEmployee.overtime) || 0) - deductionAmount;

                        return (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-red-500">{t('manualDeduction')} (Hours)</span>
                              <input
                                type="number"
                                className="w-20 text-right bg-white rounded px-1 text-sm border-red-200 text-red-600"
                                value={manualHours}
                                onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'deductionHours', Number(e.target.value))}
                              />
                            </div>
                            {manualHours > 0 && (
                              <div className="flex justify-between text-xs text-red-400 italic">
                                <span>{t('cost')} ({manualHours} hrs)</span>
                                <span>-EGP {Math.round(manualDeductionCost).toLocaleString()}</span>
                              </div>
                            )}

                            {/* Detailed Deductions */}
                            {lateDeduction > 0 && (
                              <div className="flex justify-between text-sm text-amber-600">
                                <span>{t('lateDeductions')}</span>
                                <span>-EGP {Math.round(lateDeduction).toLocaleString()}</span>
                              </div>
                            )}
                            {absentDeduction > 0 && (
                              <div className="flex justify-between text-sm text-red-600">
                                <span>{t('absentDeductions')}</span>
                                <span>-EGP {Math.round(absentDeduction).toLocaleString()}</span>
                              </div>
                            )}

                            <div className="flex justify-between text-sm text-red-600 pt-2 border-t border-dashed border-red-100 mt-1">
                              <span>Total {t('deductions')}</span>
                              <span>-EGP {Math.round(deductionAmount).toLocaleString()}</span>
                            </div>
                            <div className="pt-2 border-t border-blue-200 flex justify-between font-bold text-blue-900">
                              <span>{t('netPay')}</span>
                              <span>EGP {Math.round(netPay).toLocaleString()}</span>
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-100">


                    <button onClick={() => handleDeleteEmployee(selectedEmployee.id)} className="w-full mt-4 text-red-600 hover:bg-red-50 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                      <Trash2 size={18} /> {t('terminateGuard')}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {selectedSite && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-gray-400">{t('siteName')}</label>
                      <input className="bg-white border border-gray-200 rounded p-2 text-sm font-medium" value={selectedSite.name} onChange={(e) => handleUpdateSite(selectedSite.id, 'name', e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-gray-400">{t('city')}</label>
                      <input className="bg-white border border-gray-200 rounded p-2 text-sm font-medium" value={selectedSite.city} onChange={(e) => handleUpdateSite(selectedSite.id, 'city', e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-gray-400">{t('manager')}</label>
                      <input className="bg-white border border-gray-200 rounded p-2 text-sm font-medium" value={selectedSite.manager} onChange={(e) => handleUpdateSite(selectedSite.id, 'manager', e.target.value)} />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-bold uppercase text-gray-400">{t('operationalStatus')}</label>
                      <select className="bg-white border border-gray-200 rounded p-2 text-sm font-medium" value={selectedSite.status} onChange={(e) => handleUpdateSite(selectedSite.id, 'status', e.target.value)}>
                        <option value="Operational">{t('operational')}</option>
                        <option value="Renovating">{t('renovating')}</option>
                        <option value="Active">{t('active')}</option>
                        <option value="Closed">{t('closed')}</option>
                      </select>
                    </div>
                  </div>

                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100">
                    <h4 className="font-bold text-emerald-900 mb-2 flex items-center gap-2"><Users size={16} /> {t('assignedGuards')}</h4>
                    <div className="space-y-2">
                      {employees.filter(e => e.location === selectedSite.name).map(e => (
                        <div key={e.id} className="flex items-center gap-2 text-sm text-emerald-800 bg-white/50 p-2 rounded">
                          <div className="w-6 h-6 rounded-full bg-emerald-200 flex items-center justify-center text-xs font-bold text-emerald-700">{e.name[0]}</div>
                          <span>{e.name}</span>
                        </div>
                      ))}
                      {employees.filter(e => e.location === selectedSite.name).length === 0 && <p className="text-sm text-emerald-600 italic">No guards assigned.</p>}
                    </div>
                  </div>

                  <button onClick={() => handleDeleteSite(selectedSite.id, selectedSite.name)} className="w-full text-red-600 hover:bg-red-50 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors mt-auto">
                    <Trash2 size={18} /> {t('deleteLocation')}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )
      }

      {/* Settings Modal */}
      {
        showSettings && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
              <button onClick={() => setShowSettings(false)} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"><X size={20} /></button>
              <h3 className="text-xl font-bold mb-4 flex items-center gap-2"><Settings className="text-slate-600" /> {t('settings')}</h3>

              <div className="space-y-4">
                <div className="space-y-4">

                  <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <h4 className="font-bold text-gray-800 mb-2">My Profile</h4>
                    <div className="space-y-2 mb-4">
                      <p className="text-sm text-gray-600"><strong className="text-gray-900">Email:</strong> {user?.email}</p>
                      <p className="text-sm text-gray-600"><strong className="text-gray-900">User ID:</strong> <span className="font-mono text-xs">{user?.uid}</span></p>
                      <p className="text-sm text-gray-600"><strong className="text-gray-900">Account Type:</strong> Admin</p>
                    </div>

                    <h4 className="font-bold text-gray-800 mb-2 mt-6">Account Handling</h4>
                    <button onClick={handleLinkGoogle} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-2 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mb-2">
                      <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-4 h-4" alt="Google" />
                      Connect Google Account
                    </button>
                    <p className="text-xs text-gray-500">Link your Google account to login with it instead of password.</p>
                  </div>



                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Add Attendance Modal */}
      {
        isAddAttendanceModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('addAttendance')}</h3>
                <button onClick={() => setIsAddAttendanceModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddAttendance} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('location')}</label>
                  <select
                    className="input-field"
                    value={newAttendanceForm.locationFilter || ''}
                    onChange={e => setNewAttendanceForm({ ...newAttendanceForm, locationFilter: e.target.value, employeeId: '' })}
                  >
                    <option value="">{t('filterAll')}</option>
                    {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectEmployee')}</label>
                  <select className="input-field" value={newAttendanceForm.employeeId} onChange={e => setNewAttendanceForm({ ...newAttendanceForm, employeeId: e.target.value })} required>
                    <option value="">{t('selectEmployee')}</option>
                    {employees
                      .filter(e => !newAttendanceForm.locationFilter || e.location === newAttendanceForm.locationFilter)
                      .map(e => <option key={e.id} value={e.id}>{e.name} ({e.location})</option>)
                    }
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectDate')}</label>
                  <input type="date" className="input-field" value={newAttendanceForm.date} onChange={e => setNewAttendanceForm({ ...newAttendanceForm, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectStatus')}</label>
                  <select className="input-field" value={newAttendanceForm.status} onChange={e => setNewAttendanceForm({ ...newAttendanceForm, status: e.target.value })}>
                    <option value="On Time">On Time</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>

                {newAttendanceForm.status === 'Late' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('lateHours')}</label>
                    <input
                      type="number"
                      className="input-field"
                      min="0"
                      step="0.5"
                      value={newAttendanceForm.lateHours || ''}
                      onChange={e => setNewAttendanceForm({ ...newAttendanceForm, lateHours: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* Daily Replacement Dropdown */}
                {newAttendanceForm.employeeId && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('replacementFor')} ({t('optional') || 'Optional'})</label>
                    <select
                      className="input-field"
                      value={newAttendanceForm.replacementFor || ''}
                      onChange={e => setNewAttendanceForm({ ...newAttendanceForm, replacementFor: e.target.value })}
                    >
                      <option value="">{t('none')}</option>
                      {(() => {
                        const selectedEmp = employees.find(e => e.id.toString() === newAttendanceForm.employeeId.toString());
                        if (!selectedEmp) return null;

                        const candidates = employees.filter(e => e.id !== selectedEmp.id);
                        const locations = [...new Set(candidates.map(e => e.location))].sort();

                        return locations.map(loc => (
                          <optgroup key={loc} label={loc}>
                            {candidates.filter(e => e.location === loc).map(e => (
                              <option key={e.id} value={e.name}>{e.name}</option>
                            ))}
                          </optgroup>
                        ));
                      })()}
                    </select>
                  </div>
                )}

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAddAttendanceModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">{t('save')}</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Edit Attendance Modal */}
      {
        editingAttendance && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('editAttendance')}</h3>
                <button onClick={() => setEditingAttendance(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleUpdateAttendance} className="p-6 space-y-4">
                <div>
                  <h4 className="text-lg font-bold text-gray-800">{editingAttendance.name}</h4>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectDate')}</label>
                  <input type="date" className="input-field" value={editingAttendance.date} onChange={e => setEditingAttendance({ ...editingAttendance, date: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('selectStatus')}</label>
                  <select className="input-field" value={editingAttendance.status} onChange={e => setEditingAttendance({ ...editingAttendance, status: e.target.value })}>
                    <option value="On Time">On Time</option>
                    <option value="Late">Late</option>
                    <option value="Absent">Absent</option>
                  </select>
                </div>

                {editingAttendance.status === 'Late' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('lateHours')}</label>
                    <input
                      type="number"
                      className="input-field"
                      min="0"
                      step="0.5"
                      value={editingAttendance.lateHours || ''}
                      onChange={e => setEditingAttendance({ ...editingAttendance, lateHours: e.target.value })}
                      required
                    />
                  </div>
                )}

                {/* Edit Replacement */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('replacementFor')} ({t('optional') || 'Optional'})</label>
                  <select
                    className="input-field"
                    value={editingAttendance.replacementFor || ''}
                    onChange={e => setEditingAttendance({ ...editingAttendance, replacementFor: e.target.value })}
                  >
                    <option value="">{t('none')}</option>
                    {(() => {
                      const recName = editingAttendance.name;
                      const candidates = employees.filter(e => e.name !== recName);
                      const locations = [...new Set(candidates.map(e => e.location))].sort();

                      return locations.map(loc => (
                        <optgroup key={loc} label={loc}>
                          {candidates.filter(e => e.location === loc).map(e => (
                            <option key={e.id} value={e.name}>{e.name}</option>
                          ))}
                        </optgroup>
                      ));
                    })()}
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setEditingAttendance(null)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">{t('save')}</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

    </div >
  );
}

