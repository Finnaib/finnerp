import React, { useState, useEffect } from 'react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import { Analytics } from '@vercel/analytics/react';
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
  LogOut, // Logout Icon
  Calculator, // General Accounts
  ShoppingCart, // Sales & Purchases
  Package, // Warehouses
  FileText as InvoiceIcon, // Electronic Invoice
  CreditCard,
  Truck,
  Printer
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
  getDoc,
  setDoc,
  runTransaction,

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
  const [printFormat, setPrintFormat] = useState('Thermal'); // 'Thermal' or 'A4'
  const [printDual, setPrintDual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [securityPin, setSecurityPin] = useState('1234'); // Default PIN
  const [pinInput, setPinInput] = useState('');
  const [showSensitiveData, setShowSensitiveData] = useState(false); // Warehouse Buy Price toggle
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [shopSettings, setShopSettings] = useState({ name: 'Finn ERP', address: '123 Business St', phone: '+1 234 567 890' });
  const [currency, setCurrency] = useState('EGP');
  const formatCurrency = (val) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(Number(val) || 0);
    } catch (e) {
      return currency + ' ' + (Number(val) || 0).toLocaleString();
    }
  };
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

      // New Modules
      menuAccounts: 'Accounts',
      menuSalesPurchases: 'Sell', // Renamed
      menuWarehouses: 'Warehouses',
      menuInvoices: 'History',
      weeklySales: 'Weekly Sales Report',
      weeklyBuy: 'Weekly Buy/Inventory Report',
      walkIn: 'Walk-in',
      takeaway: 'Takeaway',
      walkInCustomer: 'Walk-in Customer',
      takeawayCustomer: 'Takeaway Customer',
      customerCopy: 'Customer Copy',
      shopCopy: 'Shop Copy',
      printSettings: 'Print Settings',
      thermal: 'Thermal (80mm)',
      a4: 'A4 (Standard)',
      dualPrint: 'Dual Print (Client + Shop)',

      // POS & Warehouse
      posTerminal: 'POS Terminal',
      searchProducts: 'Search products...',
      todaysSales: "Today's Sales",
      time: 'Time',
      amount: 'Amount',
      items: 'Items',
      receipt: 'Receipt',
      currentBill: 'Current Bill',
      cartEmpty: 'Cart is empty',
      selectItems: 'Select items from grid to add',
      subtotal: 'Subtotal',
      tax: 'Tax',
      checkout: 'Checkout',
      customerNameOptional: 'Customer Name (Optional)',

      inventorySubtitle: 'Inventory levels and stock movements',
      searchInventory: 'Search inventory by name or SKU...',
      itemName: 'Item Name',
      buyPrice: 'Buy Price',
      sellPrice: 'Sell Price',
      quantity: 'Quantity',
      refinement: 'Refinement',
      noInventory: 'No inventory items found',
      hideCosts: 'Hide Costs',
      showCosts: 'Show Costs',
      securityCheck: 'Security Check',
      addItem: 'Add Item',
      edit: 'Edit',

      // Settings
      shopSettings: 'Shop Settings',
      shopName: 'Shop Name',
      shopAddress: 'Shop Address',
      shopPhone: 'Shop Phone',
      updateSettings: 'Update Settings',


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
      dark: 'डार्क',

      // New Modules
      menuAccounts: 'Accounts',
      menuSalesPurchases: 'बेचना (Sell)',
      menuWarehouses: 'गोदाम (Warehouses)',
      menuInvoices: 'इतिहास (History)',
      weeklySales: 'साप्ताहिक बिक्री रिपोर्ट',
      weeklyBuy: 'साप्ताहिक खरीद/स्टॉक रिपोर्ट',
      walkIn: 'वॉक-इन (Walk-in)',
      takeaway: 'टेकअवे (Takeaway)',
      // New additions
      customerCopy: 'ग्राहक प्रति',
      shopCopy: 'दुकान प्रति',
      printSettings: 'प्रिंट सेटिंग्स',
      thermal: 'थर्मल (80mm)',
      a4: 'A4 (मानक)',
      dualPrint: 'दोहरी प्रिंट (ग्राहक + दुकान)',
      posTerminal: 'POS टर्मिनल',
      searchProducts: 'उत्पाद खोजें...',
      todaysSales: 'आज की बिक्री',
      time: 'समय',
      amount: 'राशि',
      items: 'वस्तुएं',
      receipt: 'रसीद',
      currentBill: 'वर्तमान बिल',
      cartEmpty: 'कार्ट खाली है',
      selectItems: 'जोड़ने के लिए ग्रिड से आइटम चुनें',
      subtotal: 'उपयोग योग',
      tax: 'कर',
      checkout: 'चेकआउट',
      customerNameOptional: 'ग्राहक का नाम (वैकल्पिक)',
      inventorySubtitle: 'इन्वेंटरी स्तर और स्टॉक गतिविधियां',
      searchInventory: 'नाम या SKU द्वारा इन्वेंट्री खोजें...',
      itemName: 'आइटम का नाम',
      buyPrice: 'खरीद मूल्य',
      sellPrice: 'विक्रय मूल्य',
      quantity: 'मात्रा',
      refinement: 'शोधन',
      noInventory: 'कोई इन्वेंट्री आइटम नहीं मिला',
      hideCosts: 'लागत छिपाएं',
      showCosts: 'लागत दिखाएं',
      securityCheck: 'सुरक्षा जाँच',
      addItem: 'आइटम जोड़ें',
      edit: 'संपादित करें',
      shopSettings: 'दुकान सेटिंग्स',
      shopName: 'दुकान का नाम',
      shopAddress: 'दुकान का पता',
      shopPhone: 'दुकान का फोन',
      updateSettings: 'सेटिंग्स अपडेट करें'
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

      // New Modules
      menuAccounts: 'الحسابات العامة',
      menuSalesPurchases: 'بيع',
      menuWarehouses: 'المخازن',
      menuInvoices: 'السجل',
      weeklySales: 'تقرير المبيعات الأسبوعي',
      weeklyBuy: 'تقرير الشراء/المخزون الأسبوعي',
      weeklyBuy: 'تقرير الشراء/المخزون الأسبوعي',
      walkIn: 'زبون عادي',
      takeaway: 'طلبات خارجية',
      walkInCustomer: 'زبون عادي',
      takeawayCustomer: 'زبون طلبات خارجية',

      photoUrl: 'صورة الموظف',
      uploadPhoto: 'تحميل صورة',
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
      dark: 'داكن',
      // New additions
      customerCopy: 'نسخة العميل',
      shopCopy: 'نسخة المتجر',
      printSettings: 'إعدادات الطباعة',
      thermal: 'حراري (80 مم)',
      a4: 'A4 (قياسي)',
      dualPrint: 'طباعة مزدوجة',
      posTerminal: 'محطة نقطة البيع',
      searchProducts: 'بحث عن المنتجات...',
      todaysSales: 'مبيعات اليوم',
      time: 'الوقت',
      amount: 'المبلغ',
      items: 'العناصر',
      receipt: 'إيصال',
      currentBill: 'الفاتورة الحالية',
      cartEmpty: 'السلة فارغة',
      selectItems: 'اختر عناصر لإضافتها',
      subtotal: 'المجموع الفرعي',
      tax: 'الضريبة',
      checkout: 'الدفع',
      customerNameOptional: 'اسم العميل (اختياري)',
      inventorySubtitle: 'مستويات المخزون وحركات المخزون',
      searchInventory: 'بحث في المخزون بالاسم أو SKU...',
      itemName: 'اسم العنصر',
      buyPrice: 'سعر الشراء',
      sellPrice: 'سعر البيع',
      quantity: 'الكمية',
      refinement: 'التنقية',
      noInventory: 'لم يتم العثور على عناصر',
      hideCosts: 'إخفاء التكاليف',
      showCosts: 'إظهار التكاليف',
      securityCheck: 'فحص أمني',
      addItem: 'إضافة عنصر',
      edit: 'تعديل',
      shopSettings: 'إعدادات المتجر',
      shopName: 'اسم المتجر',
      shopAddress: 'عنوان المتجر',
      shopPhone: 'هاتف المتجر',
      updateSettings: 'تحديث الإعدادات'
    },
    zh: {
      appName: 'Finn ERP',
      appSubtitle: '企业资源规划',
      menuDashboard: '仪表板',
      menuEmployees: '员工',
      menuSites: '地点/站点',
      menuAttendance: '考勤',
      menuPayroll: '工资单',
      menuReports: '报表',
      settings: '设置',
      search: '搜索...',
      allEmployees: '所有员工',
      manageStaff: '管理员工和班次。',
      addEmployee: '添加员工',
      name: '姓名',
      role: '职位',
      dept: '部门',
      salary: '基本工资',
      bonus: '奖金',
      overtime: '加班费',
      deductions: '扣款',
      total: '总计',
      netPay: '实发工资',
      actions: '操作',
      login: '登录',
      signup: '注册',
      email: '电子邮件',
      password: '密码',
      welcome: '欢迎回来',
      signInToAccess: '登录以访问您的仪表板',
      createAccount: '创建账户',
      haveAccount: '已有账户？',
      noAccount: '没有账户？',
      logout: '登出',
      location: '地点',
      shift: '班次',
      totalComp: '总薪酬',
      dailyAttendance: '每日考勤记录',
      trackAttendance: '跟踪员工签到和班次。',
      checkIn: '签到',
      checkOut: '签退',
      status: '状态',
      import: '导入',
      export: '导出',
      payrollMgmt: '工资管理',
      costAnalysis: '实时成本分析。',
      aiInsights: 'AI 洞察',
      siteStats: '站点统计',
      assignedGuards: '已分配员工',
      deleteLocation: '删除地点',
      terminateGuard: '终止/删除员工',
      aiAssistant: 'AI 助手',
      genReview: '生成绩效评估',
      generating: '生成中...',
      downloadReport: '下载报表',
      editLocation: '编辑地点',
      manageDetails: '管理详情',
      siteName: '站点名称',
      city: '城市/区域',
      manager: '经理',
      operationalStatus: '运营状态',

      // New Modules
      menuAccounts: '帐户',
      menuSalesPurchases: '销售',
      menuWarehouses: '仓库',
      menuInvoices: '历史',
      weeklySales: '每周销售报告',
      weeklyBuy: '每周采购/库存报告',
      walkIn: '直接客户',
      takeaway: '外卖',
      walkInCustomer: '直接客户',
      takeawayCustomer: '外卖客户',

      photoUrl: '员工照片',
      uploadPhoto: '上传照片',
      unassigned: '未分配',
      securityTeam: '团队',
      guards: '员工',
      addLocation: '添加新地点',
      createLocation: '创建地点',
      cancel: '取消',
      filterAll: '所有地点',
      morningShift: '早班',
      nightShift: '晚班',
      operational: '运营中',
      renovating: '装修中',
      active: '活跃',
      closed: '已关闭',
      onTime: '准时',
      late: '迟到',
      absent: '缺席',
      design: '设计',
      engineering: '工程',
      hr: '人力资源',
      marketing: '市场',
      operations: '运营',
      security: '安保',
      it: 'IT',
      headquarters: '总部',
      addAttendance: '添加考勤',
      editAttendance: '编辑考勤',
      deleteAttendance: '删除考勤',
      selectEmployee: '选择员工',
      selectDate: '选择日期',
      selectStatus: '选择状态',
      save: '保存',
      actions: '操作',
      replacementFor: '替班',
      coveringFor: '顶班',
      lateDeductions: '迟到扣款',
      absentDeductions: '缺席扣款',
      manualDeduction: '手动扣款',
      cost: '成本',
      none: '无',
      dashboardTotal: '总计',
      activeGuards: '活跃员工',
      operationalSites: '运营站点',
      checkedInToday: '今日签到',
      issuesToday: '今日问题',
      quickActions: '快速操作',
      addStaff: '添加员工',
      addSite: '添加站点',
      systemStatus: '系统状态',
      systemOperational: '所有系统运行正常。数据库已同步。',
      online: '在线',
      attendanceReport: '考勤报表',
      payrollReport: '工资报表',
      staffReport: '员工报表',
      taxReport: '税务报表',
      today: '今天',
      lateAbsent: '迟到/缺席',
      lateHours: '迟到小时数',
      attendanceExists: '该员工在此日期已有考勤记录。',
      theme: '主题',
      light: '浅色',
      dark: '深色',
      // New additions
      customerCopy: '客户联',
      shopCopy: '店铺联',
      printSettings: '打印设置',
      thermal: '热敏 (80mm)',
      a4: 'A4 (标准)',
      dualPrint: '双重打印',
      posTerminal: 'POS 终端',
      searchProducts: '搜索产品...',
      todaysSales: '今日销售',
      time: '时间',
      amount: '金额',
      items: '项目',
      receipt: '收据',
      currentBill: '当前账单',
      cartEmpty: '购物车是空的',
      selectItems: '从网格中选择项目以添加',
      subtotal: '小计',
      tax: '税',
      checkout: '结账',
      customerNameOptional: '客户名称 (可选)',
      inventorySubtitle: '库存水平和库存变动',
      searchInventory: '按名称或SKU搜索库存...',
      itemName: '项目名称',
      buyPrice: '购买价格',
      sellPrice: '销售价格',
      quantity: '数量',
      refinement: '细化',
      noInventory: '未找到库存项目',
      hideCosts: '隐藏成本',
      showCosts: '显示成本',
      securityCheck: '安全检查',
      addItem: '添加项目',
      edit: '编辑',
      shopSettings: '店铺设置',
      shopName: '店铺名称',
      shopAddress: '店铺地址',
      shopPhone: '店铺电话',
      updateSettings: '更新设置'
    }
  };

  const [language, setLanguage] = useState('en');
  const t = (key) => translations[language][key] || key;





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
  const [globalError, setGlobalError] = useState(null); // Explicit Error State

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

  const handleFactoryReset = async () => {
    if (!user) return;
    if (!window.confirm("CRITICAL WARNING: This will DELETE ALL DATA (Employees, Sales, Inventory, etc.) PERMANENTLY. Are you sure?")) return;

    const confirmPin = prompt("Enter Security PIN to confirm Factory Reset:");
    if (confirmPin !== securityPin) {
      alert("Incorrect PIN. Reset Aborted.");
      return;
    }

    setLoading(true);
    try {
      const collections = ['employees', 'sites', 'attendance', 'payroll', 'inventory', 'sales', 'purchases', 'invoices', 'accounts', 'journal_entries', 'suppliers', 'settings'];

      for (const colName of collections) {
        // We need to fetch all docs to delete them. 
        // Note: Client-side deletion of entire collections is slow for large datasets.
        const q = query(collection(db, colName), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const batch = writeBatch(db);
        let count = 0;

        snapshot.docs.forEach((doc) => {
          batch.delete(doc.ref);
          count++;
        });

        if (count > 0) await batch.commit();
      }

      alert("Factory Reset Complete. All data has been wiped.");
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Factory Reset Failed: " + err.message);
    } finally {
      setLoading(false);
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
    }, (error) => {
      console.error("Employees Listener Error:", error);
      setGlobalError("Access Denied: Employees List. " + error.message);
    });

    // Sites Listener
    const qSites = query(collection(db, 'sites'), where('userId', '==', user.uid));
    const unsubSites = onSnapshot(qSites, (snapshot) => {
      setSites(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Sites Listener Error:", error);
      setGlobalError("Access Denied: Sites List. " + error.message);
    });

    // Attendance Listener
    const qAtt = query(collection(db, 'attendance'), where('userId', '==', user.uid));
    const unsubAtt = onSnapshot(qAtt, (snapshot) => {
      setAttendance(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Attendance Listener Error:", error);
      setGlobalError("Access Denied: Attendance List. " + error.message);
    });

    return () => {
      unsubEmp();
      unsubSites();
      unsubAtt();
    };
  }, [user]);

  // --- New Modules State & Listeners ---
  const [accounts, setAccounts] = useState([]);
  const [journalEntries, setJournalEntries] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [inventory, setInventory] = useState([]);
  const [invoices, setInvoices] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Accounts Listener
    const unsubAccounts = onSnapshot(query(collection(db, 'accounts'), where('userId', '==', user.uid)), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Journal Entries Listener
    const unsubJournal = onSnapshot(query(collection(db, 'journal_entries'), where('userId', '==', user.uid)), (snapshot) => {
      setJournalEntries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sales Listener
    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('userId', '==', user.uid)), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Purchases Listener
    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), where('userId', '==', user.uid)), (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Suppliers Listener
    const unsubSuppliers = onSnapshot(query(collection(db, 'suppliers'), where('userId', '==', user.uid)), (snapshot) => {
      setSuppliers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Inventory Listener
    const unsubInventory = onSnapshot(query(collection(db, 'inventory'), where('userId', '==', user.uid)), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Electronic Invoices Listener
    const unsubInvoices = onSnapshot(query(collection(db, 'invoices'), where('userId', '==', user.uid)), (snapshot) => {
      setInvoices(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Mobile/Shop Settings Listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'shop_' + user.uid), (doc) => {
      if (doc.exists()) {
        setShopSettings(doc.data());
      }
    });

    return () => {
      unsubAccounts();
      unsubJournal();
      unsubSales();
      unsubPurchases();
      unsubSuppliers();
      unsubInventory();
      unsubInvoices();
      unsubSettings();
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

  // --- Accounts Logic ---
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [newAccountForm, setNewAccountForm] = useState({ name: '', type: 'Asset', balance: 0 });

  const handleAddAccount = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'accounts'), {
        ...newAccountForm,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAddAccountModalOpen(false);
      setNewAccountForm({ name: '', type: 'Asset', balance: 0 });
    } catch (err) {
      console.error(err);
      alert("Error adding account: " + err.message);
    }
  };

  // --- Inventory Logic ---
  const [isAddItemModalOpen, setIsAddItemModalOpen] = useState(false);
  const [newItemForm, setNewItemForm] = useState({ name: '', quantity: 0, location: '', category: '', buyPrice: 0, sellPrice: 0 }); // SKU removed
  const [inventorySearch, setInventorySearch] = useState('');

  const [editingItem, setEditingItem] = useState(null); // For Edit Flow

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItemForm,
        userId: user.uid,
        updatedAt: serverTimestamp()
      });
      setIsAddItemModalOpen(false);
      setNewItemForm({ name: '', quantity: 0, location: '', category: '', buyPrice: 0, sellPrice: 0 });
    } catch (err) {
      console.error(err);
      alert("Error adding item: " + err.message);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!user || !editingItem) return;
    try {
      await updateDoc(doc(db, 'inventory', editingItem.id), {
        name: editingItem.name,
        quantity: Number(editingItem.quantity),
        location: editingItem.location,
        category: editingItem.category,
        buyPrice: Number(editingItem.buyPrice),
        sellPrice: Number(editingItem.sellPrice),
        updatedAt: serverTimestamp()
      });
      setEditingItem(null);
      setIsAddItemModalOpen(false); // Close generic modal if used, or edit modal
    } catch (err) {
      console.error(err);
      alert("Error updating item: " + err.message);
    }
  };

  // --- Sales & Purchases (POS) Logic ---
  const [isAddSaleModalOpen, setIsAddSaleModalOpen] = useState(false);
  const [newSaleForm, setNewSaleForm] = useState({ customer: 'Walk-in Customer', amount: 0, status: 'Completed', items: '' });
  const [orderType, setOrderType] = useState('Walk-in'); // 'Walk-in' or 'Takeaway'
  const [historyFilter, setHistoryFilter] = useState('All'); // 'All', 'Sale', 'Stock Update'
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, price: item.sellPrice || 0 }];
    });
  };

  const removeFromCart = (itemId) => {
    setCart(prev => prev.filter(i => i.id !== itemId));
  };

  const updateCartQuantity = (itemId, delta) => {
    setCart(prev => prev.map(i => {
      if (i.id === itemId) {
        return { ...i, quantity: Math.max(1, i.quantity + delta) };
      }
      return i;
    }));
  };

  const calculateTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

  const handleCheckout = async () => {
    if (!user || cart.length === 0) return;
    try {
      const totalAmount = calculateTotal();
      const prefix = orderType === 'Walk-in' ? 'W' : 'T';
      let uniqueId;

      try {
        uniqueId = await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, 'counters', 'daily_invoice');
          const counterDoc = await transaction.get(counterRef);
          const today = new Date().toISOString().split('T')[0];

          let data = counterDoc.exists() ? counterDoc.data() : { date: today, W: 0, T: 0 };

          if (data.date !== today) {
            data = { date: today, W: 0, T: 0 };
          }

          const count = (data[prefix] || 0) + 1;
          data[prefix] = count;

          transaction.set(counterRef, data);
          return `${prefix}-${count.toString().padStart(4, '0')}`;
        });
      } catch (e) {
        console.error("Counter failed, using fallback", e);
        uniqueId = prefix + '-' + Date.now().toString().slice(-6);
      }

      const saleData = {
        invoiceId: uniqueId,
        orderType: orderType,
        customer: newSaleForm.customer || (orderType === 'Walk-in' ? t('walkInCustomer') : t('takeawayCustomer')),
        amount: totalAmount,
        status: 'Completed',
        items: cart.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price })),
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      };

      // 1. Save Sale
      const saleRef = await addDoc(collection(db, 'sales'), saleData);

      // 2. Update Inventory (Decrement Stock)
      const batch = writeBatch(db);
      cart.forEach(item => {
        const itemRef = doc(db, 'inventory', item.id);
        // Note: In a real app, check for negative stock. Here we just decrement.
        // We need the current stock. Since we have 'inventory' state, we can use it, 
        // but for concurrency, Firestore transactions are better. 
        // For simplicity in this demo, we assume 'inventory' state is close enough 
        // or we just use increment(-qty).
        // However, 'increment' import is needed. Let's just use the state value logic for now 
        // or assumes the user manages it manually if complex. 
        // BETTER: Use existing item data from state to calculate new qty.
        const currentItem = inventory.find(inv => inv.id === item.id);
        if (currentItem) {
          batch.update(itemRef, { quantity: Number(currentItem.quantity) - item.quantity });
        }
      });
      await batch.commit();

      // 3. Print Invoice (Optional auto-print)
      handlePrintInvoice({ ...saleData, id: saleRef.id }, 'Sales Receipt');

      // Reset
      setCart([]);
      setNewSaleForm({ customer: 'Walk-in Customer', amount: 0, status: 'Completed', items: '' });
      alert("Sale Completed!");
    } catch (err) {
      console.error(err);
      alert("Checkout Error: " + err.message);
    }
  };

  // Legacy function kept for compatibility if needed, but replaced by handleCheckout
  const handleAddSale = async (e) => {
    e.preventDefault();
    if (!user) return;
    // ... existing logic if still used by modal, but we are moving to POS
  };

  const [isAddPurchaseModalOpen, setIsAddPurchaseModalOpen] = useState(false);
  const [newPurchaseForm, setNewPurchaseForm] = useState({ supplier: '', amount: 0, status: 'Ordered', items: '' });

  const handleAddPurchase = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      await addDoc(collection(db, 'purchases'), {
        ...newPurchaseForm,
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      setIsAddPurchaseModalOpen(false);
      setNewPurchaseForm({ supplier: '', amount: 0, status: 'Ordered', items: '' });
    } catch (err) {
      console.error(err);
      alert("Error adding purchase: " + err.message);
    }
  };

  // --- Invoice Logic ---
  const [isAddInvoiceModalOpen, setIsAddInvoiceModalOpen] = useState(false);
  const [newInvoiceForm, setNewInvoiceForm] = useState({ client: '', status: 'Issued', date: new Date().toISOString().split('T')[0], items: [] });
  const [tempInvoiceItem, setTempInvoiceItem] = useState({ itemId: '', quantity: 1 }); // Logic for adding lines

  const handleAddInvoice = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      const totalAmount = newInvoiceForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      await addDoc(collection(db, 'invoices'), {
        ...newInvoiceForm,
        amount: totalAmount,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsAddInvoiceModalOpen(false);
      setNewInvoiceForm({ client: '', status: 'Issued', date: new Date().toISOString().split('T')[0], items: [] });
    } catch (err) {
      console.error(err);
      alert("Error generating invoice: " + err.message);
    }
  };

  const handlePrintInvoice = (invoiceData, type = 'Invoice') => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const styles = printFormat === 'Thermal' ? `
      @page { margin: 0; }
      body { font-family: 'Courier New', monospace; width: 80mm; padding: 5px; margin: 0 auto; color: #000; }
      .page { padding-bottom: 20px; display: block; position: relative; }
      .page:last-child { page-break-after: avoid; }
      .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 10px; margin-bottom: 10px; }
      .title { font-size: 1.2em; font-weight: bold; }
      .subtitle { font-size: 0.9em; margin-bottom: 5px; }
      .details { font-size: 0.8em; margin-bottom: 10px; }
      .details p { margin: 2px 0; }
      table { width: 100%; font-size: 0.8em; border-collapse: collapse; }
      th { text-align: left; border-bottom: 1px solid #000; }
      td { padding: 4px 0; vertical-align: top; }
      .amount { text-align: right; font-weight: bold; font-size: 1.2em; border-top: 1px dashed #000; margin-top: 10px; padding-top: 5px; }
      .footer { text-align: center; font-size: 0.7em; margin-top: 20px; border-top: 1px solid #ccc; padding-top: 5px; }
      .copy-label { text-align: center; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; font-size: 0.8em; border: 1px solid #000; display: inline-block; padding: 2px 5px; }
    ` : `
      @page { margin: 0; }
      body { font-family: Helvetica, Arial, sans-serif; padding: 0; color: #333; margin: 0; width: 100%; }
      .page { padding: 40px; min-height: 90vh; position: relative; box-sizing: border-box; }
      .page:last-child { page-break-after: avoid; }
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-bottom: 2px solid #eee; padding-bottom: 20px; }
      .brand h1 { margin: 0; color: #2c3e50; font-size: 24px; }
      .invoice-info { text-align: right; }
      .invoice-info h2 { margin: 0 0 10px; color: #2c3e50; }
      .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
      th { text-align: left; padding: 12px; background: #f8f9fa; font-weight: 600; color: #2c3e50; border-bottom: 2px solid #eee; }
      td { padding: 12px; border-bottom: 1px solid #eee; color: #555; }
      .totals { margin-left: auto; width: 300px; }
      .row { display: flex; justify-content: space-between; padding: 8px 0; }
      .row.final { font-weight: bold; font-size: 1.2em; color: #2c3e50; border-top: 2px solid #eee; margin-top: 10px; padding-top: 10px; }
      .footer { margin-top: 50px; text-align: center; font-size: 0.8em; color: #999; }
      .copy-label { position: absolute; top: 20px; right: 20px; font-size: 10px; font-weight: bold; color: #ccc; text-transform: uppercase; border: 1px solid #ccc; padding: 4px 8px; border-radius: 4px; }
    `;

    const getPageContent = (copyMatch) => `
      <div class="page">
        ${copyMatch ? `<div class="copy-label">${copyMatch}</div>` : ''}
        <div class="header">
          <div class="brand">
            <div class="title">${shopSettings.name}</div>
            <div class="subtitle">${shopSettings.address} | ${shopSettings.phone}</div>
          </div>
          ${printFormat === 'A4' ? `
          <div class="invoice-info">
            <h2>${type.toUpperCase()}</h2>
            <p>#${invoiceData.invoiceId || 'N/A'}</p>
            <p>${invoiceData.date || new Date().toLocaleDateString()}</p>
          </div>` : ''}
        </div>

        <div class="${printFormat === 'A4' ? 'grid' : 'details'}">
          <div>
            <strong>${t('billTo')}:</strong>
            <p>${invoiceData.client || invoiceData.customer || 'Customer'}</p>
            <p>${invoiceData.orderType || ''}</p>
          </div>
          ${printFormat === 'Thermal' ? `
          <div style="margin-top:5px;">
            <p><strong>${t('id')}:</strong> ${invoiceData.invoiceId || 'N/A'}</p>
            <p><strong>${t('date')}:</strong> ${invoiceData.date || new Date().toLocaleDateString()}</p>
          </div>` : ''}
        </div>

        <table>
          <thead>
            <tr>
              <th width="50%">${t('item')}</th>
              <th width="15%" style="text-align:center">${t('qty')}</th>
              <th width="15%" style="text-align:right">${t('price')}</th>
              <th width="20%" style="text-align:right">${t('total')}</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(invoiceData.items) ? invoiceData.items.map(item => `
              <tr>
                <td>${item.name}</td>
                <td style="text-align:center">${item.qty || item.quantity}</td>
                <td style="text-align:right">${formatCurrency(item.price)}</td>
                <td style="text-align:right">${formatCurrency((item.price) * (item.qty || item.quantity))}</td>
              </tr>
            `).join('') : `<tr><td colspan="4">${invoiceData.items}</td></tr>`}
          </tbody>
        </table>

        <div class="${printFormat === 'A4' ? 'totals' : ''}">
          <div class="amount ${printFormat === 'A4' ? 'row final' : ''}">
            <span>${t('total')}:</span>
            <span>${formatCurrency(invoiceData.amount)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${t('thankYou') || 'Thank you for your business!'}</p>
        </div>
      </div>
    `;

    // Explicitly handle dual printing by concatenating copies
    let finalHtml = getPageContent(printDual ? t('customerCopy') : '');
    if (printDual) {
      finalHtml += getPageContent(t('shopCopy'));
    }

    const content = `
      <html>
        <head>
          <title>Print ${type}</title>
          <style>${styles}</style>
        </head>
        <body>
          ${finalHtml}
        </body>
      </html>
    `;

    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
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
      case 'weekly_sales':
        headers = ['Date', 'Invoice ID', 'Type', 'Customer', 'Items Summary', 'Total Amount'];
        const sevenDaysAgoSales = new Date();
        sevenDaysAgoSales.setDate(sevenDaysAgoSales.getDate() - 7);

        data = sales
          .filter(s => {
            const date = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date);
            return date >= sevenDaysAgoSales;
          })
          .map(s => {
            const date = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date);
            const itemsSummary = Array.isArray(s.items) ? s.items.map(i => `${i.qty}x ${i.name}`).join('; ') : 'N/A';
            return [
              date.toLocaleString(),
              s.invoiceId || 'N/A',
              s.orderType || 'Walk-in',
              s.customer || 'Walk-in',
              itemsSummary,
              s.amount
            ];
          });
        filename = 'Weekly_Sales_Report.csv';
        break;
      case 'weekly_buy':
        // For "Buy Report", we look at Inventory items updated recently
        headers = ['Last Updated', 'Item Name', 'Location', 'Buy Price', 'Sell Price', 'Quantity', 'Stock Value (Buy Price)', 'Stock Value (Sell Price)'];
        const sevenDaysAgoInv = new Date();
        sevenDaysAgoInv.setDate(sevenDaysAgoInv.getDate() - 7);

        data = inventory
          .filter(i => {
            const date = i.updatedAt?.seconds ? new Date(i.updatedAt.seconds * 1000) : new Date();
            // If no updatedAt, assume standard report of all items, but user asked for "Buy Report" weekly based.
            // Best interpretation: Items active/updated recently. If strict weekly, use date filter:
            return date >= sevenDaysAgoInv;
          })
          .map(i => {
            const date = i.updatedAt?.seconds ? new Date(i.updatedAt.seconds * 1000) : new Date();
            return [
              date.toLocaleString(),
              i.name,
              i.location,
              i.buyPrice || 0,
              i.sellPrice || 0,
              i.quantity,
              (i.buyPrice || 0) * i.quantity,
              (i.sellPrice || 0) * i.quantity
            ];
          });
        filename = 'Weekly_Inventory_Buy_Report.csv';
        break;
      default: return;
    }
    generateCSV(headers, data, filename);
  };



  // --- Login Screen ---
  if (authLoading) return <div className="flex h-screen items-center justify-center bg-gray-50"><Loader2 className="animate-spin text-blue-600" size={48} /></div>;

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-4">
        <div className="w-full max-w-md bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          <div className="p-8">
            <div className="text-center mb-8">
              <div className="inline-flex p-4 bg-blue-50 text-blue-600 rounded-2xl mb-4 shadow-inner">
                <Shield size={48} />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{authMode === 'login' ? t('welcome') : t('createAccount')}</h1>
              <p className="text-gray-500 mt-2 text-sm">{t('signInToAccess')}</p>
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
                    autoComplete="off"
                    name="new-password-field-hack-email"
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
                    autoComplete="new-password"
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
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-100 border-none text-xs font-medium text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 cursor-pointer focus:ring-0"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
              </select>
            </div>
          </div>
        </div >
      </div >
    );
  }
  return (
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900">
      <SpeedInsights />
      <Analytics />
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

          <div className="my-2 border-t border-slate-700/50"></div>

          <SidebarItem icon={<ShoppingCart size={20} />} label={t('menuSalesPurchases')} active={activeTab === 'sales_purchases'} onClick={() => { setActiveTab('sales_purchases'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Package size={20} />} label={t('menuWarehouses')} active={activeTab === 'warehouses'} onClick={() => { setActiveTab('warehouses'); setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Clock size={20} />} label={t('menuInvoices')} active={activeTab === 'history'} onClick={() => { setActiveTab('history'); setIsSidebarOpen(false); }} />
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
              {activeTab === 'accounts' && <Calculator className="text-emerald-600" />}
              {activeTab === 'sales_purchases' && <ShoppingCart className="text-blue-600" />}
              {activeTab === 'warehouses' && <Package className="text-orange-600" />}
              {activeTab === 'invoices' && <InvoiceIcon className="text-indigo-600" />}
              <span>
                {activeTab === 'dashboard' && t('menuDashboard')}
                {activeTab === 'employees' && t('menuEmployees')}
                {activeTab === 'sites' && t('menuSites')}
                {activeTab === 'attendance' && t('menuAttendance')}
                {activeTab === 'payroll' && t('menuPayroll')}
                {activeTab === 'reports' && t('menuReports')}
                {activeTab === 'accounts' && t('menuAccounts')}
                {activeTab === 'sales_purchases' && t('menuSalesPurchases')}
                {activeTab === 'warehouses' && t('menuWarehouses')}
                {activeTab === 'invoices' && t('menuInvoices')}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-gray-100 border-none text-sm font-medium text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 cursor-pointer focus:ring-0"
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="CNY">CNY</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
              </select>

              {/* Language Selector */}
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-100 border-none text-sm font-medium text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 cursor-pointer focus:ring-0"
              >
                <option value="en">English</option>
                <option value="hi">हिंदी</option>
                <option value="ar">العربية</option>
                <option value="zh">中文</option>
              </select>
            </div>

            <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold border border-blue-200">
              AD
            </div>
          </div>
        </header>

        {/* Global Error Banner */}
        {globalError && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 m-4 mb-0">
            <div className="flex">
              <div className="flex-shrink-0">
                <AlertCircle className="h-5 w-5 text-red-500" />
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700 font-bold">
                  Connection Error:
                </p>
                <p className="text-sm text-red-700">
                  {globalError} <button onClick={() => setGlobalError(null)} className="underline ml-2">Dismiss</button>
                </p>
              </div>
            </div>
          </div>
        )}

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
                            <td className="px-6 py-4 text-right font-mono text-green-600">+{formatCurrency(bonus)}</td>
                            <td className="px-6 py-4 text-right font-mono text-orange-600">+{formatCurrency(overtime)}</td>

                            {/* Detailed Deductions Columns */}
                            <td className="px-6 py-4 text-right font-mono text-amber-600">
                              {lateDeduction > 0 ? `-${formatCurrency(lateDeduction)}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-red-600">
                              {absentDeduction > 0 ? `-${formatCurrency(absentDeduction)}` : '-'}
                            </td>
                            <td className="px-6 py-4 text-right font-mono text-red-800 font-bold">-{formatCurrency(deductionAmount)}</td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(netPay)}</td>
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
                { id: 'weekly_sales', label: t('weeklySales'), icon: <ShoppingCart />, color: 'text-indigo-600', bg: 'bg-indigo-50' },
                { id: 'weekly_buy', label: t('weeklyBuy'), icon: <Package />, color: 'text-teal-600', bg: 'bg-teal-50' },
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

          {/* --- New Modules Views --- */}

          {activeTab === 'accounts' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('menuAccounts')}</h2>
                  <p className="text-gray-500">Track assets, liabilities, and expenses.</p>
                </div>
                <button onClick={() => setIsAddAccountModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                  <Plus size={20} /> Add Account
                </button>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-gray-900">Account Name</th>
                      <th className="px-6 py-4 font-semibold text-gray-900">Type</th>
                      <th className="px-6 py-4 font-semibold text-right text-gray-900">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {accounts.length === 0 ? (
                      <tr><td colSpan="3" className="px-6 py-8 text-center text-gray-500">No accounts found. Add one to get started.</td></tr>
                    ) : (
                      accounts.map(acc => (
                        <tr key={acc.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 font-medium text-gray-900">{acc.name}</td>
                          <td className="px-6 py-4 text-gray-500"><span className={`px-2 py-1 rounded text-xs font-bold ${acc.type === 'Asset' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{acc.type}</span></td>
                          <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(acc.balance)}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'sales_purchases' && (
            <div className="flex h-[calc(100vh-140px)] gap-6 animate-in fade-in duration-500">
              {/* Left: Product Grid */}
              <div className="flex-1 flex flex-col gap-4">
                <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex items-center gap-4">
                    <h2 className="text-xl font-bold text-gray-900">{shopSettings.name || t('posTerminal')}</h2>
                    <div className="flex items-center gap-2 bg-gray-50 p-1 rounded-lg border border-gray-200">
                      <select
                        value={printFormat}
                        onChange={(e) => setPrintFormat(e.target.value)}
                        className="bg-transparent text-sm font-medium text-gray-700 outline-none px-2 py-1 cursor-pointer hover:text-blue-600"
                        title={t('printSettings')}
                      >
                        <option value="Thermal">{t('thermal')}</option>
                        <option value="A4">{t('a4')}</option>
                      </select>
                      <button
                        onClick={() => setPrintDual(!printDual)}
                        className={`text-xs font-bold px-2 py-1 rounded transition-colors ${printDual ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-gray-600'}`}
                        title={t('dualPrint')}
                      >
                        2x
                      </button>
                    </div>
                  </div>
                  <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      name="search-products-custom"
                      autoComplete="off"
                      placeholder={t('searchProducts')}
                      className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                    />
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                    {inventory
                      .filter(item => (item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()))
                      .map(item => (
                        <button
                          key={item.id}
                          onClick={() => addToCart(item)}
                          className="flex flex-col items-start p-4 bg-gray-50 hover:bg-blue-50 border border-gray-100 hover:border-blue-200 rounded-xl transition-all group text-left"
                        >
                          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform">
                            <Package size={20} className="text-gray-500 group-hover:text-blue-600" />
                          </div>
                          <h4 className="font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                          <span className="text-xs text-gray-500 mb-2">{item.location}</span>
                          <div className="mt-auto w-full flex justify-between items-center">
                            <span className="font-mono font-bold text-blue-600">{formatCurrency(item.sellPrice || 0)}</span>
                            <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">{item.quantity} left</span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {/* Daily History Toggle / View */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-h-48 overflow-y-auto">
                  <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Clock size={16} /> {t('todaysSales')}</h3>
                  <table className="w-full text-sm text-left">
                    <thead className="bg-gray-50 sticky top-0"><tr><th className="p-2">{t('time')}</th><th className="p-2">{t('amount')}</th><th className="p-2">{t('items')}</th><th className="p-2">{t('actions')}</th></tr></thead>
                    <tbody className="divide-y divide-gray-100">
                      {sales
                        .filter(s => s.date === new Date().toISOString().split('T')[0])
                        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                        .map(s => (
                          <tr key={s.id}>
                            <td className="p-2 text-gray-500">{s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</td>
                            <td className="p-2 font-mono font-bold text-gray-900">{formatCurrency(s.amount)}</td>
                            <td className="p-2 text-xs truncate max-w-[150px]">{Array.isArray(s.items) ? s.items.map(i => `${i.qty}x ${i.name}`).join(', ') : s.items}</td>
                            <td className="p-2">
                              <button onClick={() => handlePrintInvoice(s, t('receipt'))} className="text-gray-400 hover:text-gray-600"><Printer size={16} /></button>
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right: Cart */}
              <div className="w-96 bg-white flex flex-col rounded-xl shadow-xl border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <h3 className="font-bold text-lg flex items-center gap-2"><ShoppingCart size={20} /> {t('currentBill')}</h3>
                  <span className="bg-blue-600 text-white text-xs font-bold px-2 py-1 rounded-full">{cart.reduce((a, b) => a + b.quantity, 0)} {t('items')}</span>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {cart.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-400">
                      <ShoppingCart size={48} className="mb-4 opacity-20" />
                      <p>{t('cartEmpty')}</p>
                      <p className="text-sm">{t('selectItems')}</p>
                    </div>
                  ) : (
                    cart.map(item => (
                      <div key={item.id} className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 group">
                        <div className="flex-1">
                          <div className="font-bold text-gray-900">{item.name}</div>
                          <div className="text-xs text-gray-500 font-mono">{formatCurrency(item.price)} x {item.quantity}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center bg-white border border-gray-200 rounded-lg">
                            <button onClick={() => updateCartQuantity(item.id, -1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600 rounded-l-lg">-</button>
                            <span className="font-mono text-sm px-2">{item.quantity}</span>
                            <button onClick={() => updateCartQuantity(item.id, 1)} className="px-2 py-1 hover:bg-gray-100 text-gray-600 rounded-r-lg">+</button>
                          </div>
                          <span className="font-mono font-bold text-gray-900 w-16 text-right">{formatCurrency(item.price * item.quantity)}</span>
                          <button onClick={() => removeFromCart(item.id)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="p-4 bg-gray-50 border-t border-gray-200">
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{t('subtotal')}</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{t('tax')} (0%)</span>
                      <span>{formatCurrency(0)}</span>
                    </div>
                    <div className="flex justify-between text-xl font-bold text-gray-900 border-t border-gray-200 pt-2">
                      <span>{t('total')}</span>
                      <span>{formatCurrency(calculateTotal())}</span>
                    </div>
                  </div>

                  {/* Order Type Toggle */}
                  <div className="flex bg-gray-100 p-1 rounded-lg mb-4">
                    <button
                      onClick={() => {
                        setOrderType('Walk-in');
                        // Set default if empty or matches previous default
                        if (!newSaleForm.customer || newSaleForm.customer === t('takeawayCustomer')) {
                          setNewSaleForm(prev => ({ ...prev, customer: t('walkInCustomer') }));
                        }
                      }}
                      className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${orderType === 'Walk-in' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t('walkIn')}
                    </button>
                    <button
                      onClick={() => {
                        setOrderType('Takeaway');
                        if (!newSaleForm.customer || newSaleForm.customer === t('walkInCustomer')) {
                          setNewSaleForm(prev => ({ ...prev, customer: t('takeawayCustomer') }));
                        }
                      }}
                      className={`flex-1 py-1 text-sm font-medium rounded-md transition-all ${orderType === 'Takeaway' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                      {t('takeaway')}
                    </button>
                  </div>

                  <input
                    className="w-full mb-3 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                    placeholder={t('customerNameOptional')}
                    value={newSaleForm.customer}
                    autoComplete="off"
                    onChange={e => setNewSaleForm({ ...newSaleForm, customer: e.target.value })}
                  />

                  <button
                    onClick={handleCheckout}
                    disabled={cart.length === 0}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                  >
                    <CheckCircle size={20} /> {t('checkout')}
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'warehouses' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{t('menuWarehouses')}</h2>
                  <p className="text-gray-500">{t('inventorySubtitle')}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => showSensitiveData ? setShowSensitiveData(false) : setIsPinModalOpen(true)}
                    className={`px-4 py-2 rounded-lg flex items-center gap-2 font-medium transition-all ${showSensitiveData ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                  >
                    {showSensitiveData ? <Shield size={20} /> : <Shield size={20} />} {showSensitiveData ? t('hideCosts') : t('showCosts')}
                  </button>
                  <button onClick={() => setIsAddItemModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2">
                    <Plus size={20} /> {t('addItem')}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-4 border-b border-gray-100">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                      type="text"
                      placeholder={t('searchInventory')}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={inventorySearch}
                      onChange={(e) => setInventorySearch(e.target.value)}
                      autoComplete="off"
                      name="inventory-search-field-unique"
                    />
                  </div>
                </div>
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-gray-900">{t('itemName')}</th>
                      <th className="px-6 py-4 font-semibold text-gray-900">{t('location')}</th>
                      <th className="px-6 py-4 font-semibold text-right text-gray-900">{t('buyPrice')}</th>
                      <th className="px-6 py-4 font-semibold text-right text-gray-900">{t('sellPrice')}</th>
                      <th className="px-6 py-4 font-semibold text-right text-gray-900">{t('quantity')}</th>
                      <th className="px-6 py-4 font-semibold text-right text-gray-900">{t('refinement')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {inventory.length === 0 ? (
                      <tr><td colSpan="6" className="px-6 py-8 text-center text-gray-500">{t('noInventory')}</td></tr>
                    ) : (
                      inventory
                        .filter(item =>
                          (item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                          (item.sku?.toLowerCase() || '').includes(inventorySearch.toLowerCase())
                        )
                        .map(item => (
                          <tr key={item.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                            <td className="px-6 py-4 text-gray-500">{item.location}</td>
                            <td className="px-6 py-4 text-right font-mono text-gray-500">
                              {showSensitiveData ? formatCurrency(item.buyPrice || 0) : '****'}
                            </td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(item.sellPrice || 0)}</td>
                            <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{item.quantity}</td>
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => { setEditingItem(item); setIsAddItemModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm">
                                {t('edit') || 'Edit'}
                              </button>
                            </td>
                          </tr>
                        ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'history' && (
            <div className="space-y-6 animate-in fade-in duration-500">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">History Log</h2>
                  <p className="text-gray-500">Comprehensive log of sales and warehouse activities.</p>
                </div>
                <div className="flex gap-3">
                  <select
                    value={historyFilter}
                    onChange={(e) => setHistoryFilter(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="All">All Types</option>
                    <option value="Sale">Sales</option>
                    <option value="Stock Update">Stock Updates</option>
                  </select>
                  <input type="date" className="border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="px-6 py-4 font-semibold text-gray-900">Time</th>
                      <th className="px-6 py-4 font-semibold text-gray-900">Type</th>
                      <th className="px-6 py-4 font-semibold text-gray-900">Description</th>
                      <th className="px-6 py-4 font-semibold text-right text-gray-900">Value / Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(() => {
                      // Merge Sales and Relevant Inventory Updates
                      const logs = [
                        ...sales.map(s => ({
                          id: 'sale-' + s.id,
                          type: 'Sale',
                          date: s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date),
                          desc: `Sold ${Array.isArray(s.items) ? s.items.length : 1} items to ${s.customer || 'Walk-in'}`,
                          val: s.amount,
                          isCurrency: true
                        })),
                        ...inventory.map(i => ({
                          id: 'inv-' + i.id,
                          type: 'Stock Update',
                          date: i.updatedAt?.seconds ? new Date(i.updatedAt.seconds * 1000) : new Date(), // Fallback if no update time
                          desc: `Stock Check: ${i.name} at ${i.location}`,
                          val: `${i.quantity} Units`,
                          isCurrency: false
                        }))
                      ].sort((a, b) => b.date - a.date);

                      // Apply Filter
                      const filteredLogs = historyFilter === 'All' ? logs : logs.filter(l => l.type === historyFilter);

                      if (filteredLogs.length === 0) return <tr><td colSpan="4" className="px-6 py-8 text-center text-gray-500">No history records found.</td></tr>;

                      return filteredLogs.map(log => (
                        <tr key={log.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-gray-500 font-mono text-sm">{log.date.toLocaleString()}</td>
                          <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${log.type === 'Sale' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{log.type}</span></td>
                          <td className="px-6 py-4 text-gray-900">{log.desc}</td>
                          <td className="px-6 py-4 text-right font-bold text-gray-900">{log.isCurrency ? formatCurrency(log.val) : log.val}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* --- Modals --- */}

      {/* Employee Modal */}
      {
        isAddModalOpen && (
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
        )
      }

      {/* Site Modal */}
      {
        isAddSiteModalOpen && (
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
        )
      }

      {/* Detail Sidebar (Employee/Site) */}
      {
        (selectedEmployee || selectedSite) && (
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
                        <div className="flex justify-between text-sm pt-2 border-t border-blue-200 font-bold">
                          <span className="text-blue-900">{t('totalComp')}</span>
                          <span className="text-blue-900">{formatCurrency((selectedEmployee.salary || 0) + (selectedEmployee.bonus || 0) + (selectedEmployee.overtime || 0))}</span>
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

      {/* Add Account Modal */}
      {
        isAddAccountModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">Add Account</h3>
                <button onClick={() => setIsAddAccountModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddAccount} className="p-6 space-y-4">
                <input className="input-field" placeholder="Account Name" value={newAccountForm.name} onChange={e => setNewAccountForm({ ...newAccountForm, name: e.target.value })} required />

                <select className="input-field" value={newAccountForm.type} onChange={e => setNewAccountForm({ ...newAccountForm, type: e.target.value })}>
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>

                <input type="number" className="input-field" placeholder="Initial Balance" value={newAccountForm.balance} onChange={e => setNewAccountForm({ ...newAccountForm, balance: Number(e.target.value) })} />

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAddAccountModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">Create Account</button>
                </div>
              </form>
            </div>
          </div>
        )
      }
      {/* Add / Edit Item Modal */}
      {
        isAddItemModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{editingItem ? 'Edit Item' : 'Add Inventory Item'}</h3>
                <button onClick={() => { setIsAddItemModalOpen(false); setEditingItem(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={editingItem ? handleUpdateItem : handleAddItem} className="p-6 space-y-4">
                <input className="input-field" placeholder="Item Name" value={editingItem ? editingItem.name : newItemForm.name} onChange={e => editingItem ? setEditingItem({ ...editingItem, name: e.target.value }) : setNewItemForm({ ...newItemForm, name: e.target.value })} required />

                <select className="input-field" value={editingItem ? editingItem.location : newItemForm.location} onChange={e => editingItem ? setEditingItem({ ...editingItem, location: e.target.value }) : setNewItemForm({ ...newItemForm, location: e.target.value })}>
                  <option value="">Select Location</option>
                  {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                </select>

                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="input-field" placeholder="Buy Price" value={editingItem ? editingItem.buyPrice : newItemForm.buyPrice} onChange={e => editingItem ? setEditingItem({ ...editingItem, buyPrice: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, buyPrice: Number(e.target.value) })} required />
                  <input type="number" className="input-field" placeholder="Sell Price" value={editingItem ? editingItem.sellPrice : newItemForm.sellPrice} onChange={e => editingItem ? setEditingItem({ ...editingItem, sellPrice: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, sellPrice: Number(e.target.value) })} required />
                </div>
                <input type="number" className="input-field" placeholder="Quantity" value={editingItem ? editingItem.quantity : newItemForm.quantity} onChange={e => editingItem ? setEditingItem({ ...editingItem, quantity: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, quantity: Number(e.target.value) })} required />

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => { setIsAddItemModalOpen(false); setEditingItem(null); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">{editingItem ? 'Update' : 'Add Item'}</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Add Sale Modal */}
      {
        isAddSaleModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">New Sale</h3>
                <button onClick={() => setIsAddSaleModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddSale} className="p-6 space-y-4">
                <input className="input-field" placeholder="Customer Name" value={newSaleForm.customer} onChange={e => setNewSaleForm({ ...newSaleForm, customer: e.target.value })} required />
                <input type="number" className="input-field" placeholder="Total Amount" value={newSaleForm.amount} onChange={e => setNewSaleForm({ ...newSaleForm, amount: Number(e.target.value) })} required />
                <select className="input-field" value={newSaleForm.status} onChange={e => setNewSaleForm({ ...newSaleForm, status: e.target.value })}>
                  <option value="Pending">Pending</option>
                  <option value="Completed">Completed</option>
                  <option value="Shipped">Shipped</option>
                </select>
                <input className="input-field" placeholder="Items (Summary)" value={newSaleForm.items} onChange={e => setNewSaleForm({ ...newSaleForm, items: e.target.value })} />

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAddSaleModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 font-medium shadow-lg shadow-emerald-600/20">Create Sale</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Add Purchase Modal */}
      {
        isAddPurchaseModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">New Purchase</h3>
                <button onClick={() => setIsAddPurchaseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
                <input className="input-field" placeholder="Supplier Name" value={newPurchaseForm.supplier} onChange={e => setNewPurchaseForm({ ...newPurchaseForm, supplier: e.target.value })} required />
                <input type="number" className="input-field" placeholder="Total Cost" value={newPurchaseForm.amount} onChange={e => setNewPurchaseForm({ ...newPurchaseForm, amount: Number(e.target.value) })} required />
                <select className="input-field" value={newPurchaseForm.status} onChange={e => setNewPurchaseForm({ ...newPurchaseForm, status: e.target.value })}>
                  <option value="Ordered">Ordered</option>
                  <option value="Received">Received</option>
                  <option value="Paid">Paid</option>
                </select>
                <input className="input-field" placeholder="Items (Summary)" value={newPurchaseForm.items} onChange={e => setNewPurchaseForm({ ...newPurchaseForm, items: e.target.value })} />

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAddPurchaseModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">Create Order</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Add Invoice Modal */}
      {
        isAddInvoiceModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">Create Invoice</h3>
                <button onClick={() => setIsAddInvoiceModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddInvoice} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <input className="input-field" placeholder="Client / Customer" value={newInvoiceForm.client} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, client: e.target.value })} required />
                  <input type="date" className="input-field" value={newInvoiceForm.date} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, date: e.target.value })} required />
                </div>

                {/* Line Items Section */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h4 className="font-bold text-sm text-gray-700 mb-2">Invoice Items</h4>
                  {newInvoiceForm.items.length > 0 && (
                    <ul className="mb-3 space-y-2">
                      {newInvoiceForm.items.map((item, idx) => (
                        <li key={idx} className="flex justify-between items-center text-sm bg-white p-2 rounded border border-gray-200 shadow-sm">
                          <span>{item.name} x {item.quantity}</span>
                          <span className="font-mono font-bold text-gray-900">{formatCurrency(item.price * item.quantity)}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex gap-2 items-end">
                    <div className="flex-1">
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Item</label>
                      <select
                        className="input-field text-sm"
                        value={tempInvoiceItem.itemId}
                        onChange={e => setTempInvoiceItem({ ...tempInvoiceItem, itemId: e.target.value })}
                      >
                        <option value="">Select Item...</option>
                        {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({formatCurrency(i.sellPrice || 0)})</option>)}
                      </select>
                    </div>
                    <div className="w-20">
                      <label className="text-xs font-semibold text-gray-500 mb-1 block">Qty</label>
                      <input
                        type="number"
                        className="input-field text-sm"
                        min="1"
                        value={tempInvoiceItem.quantity}
                        onChange={e => setTempInvoiceItem({ ...tempInvoiceItem, quantity: Number(e.target.value) })}
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const selectedInvItem = inventory.find(i => i.id === tempInvoiceItem.itemId);
                        if (selectedInvItem && tempInvoiceItem.quantity > 0) {
                          setNewInvoiceForm({
                            ...newInvoiceForm,
                            items: [...newInvoiceForm.items, {
                              id: selectedInvItem.id,
                              name: selectedInvItem.name,
                              price: selectedInvItem.sellPrice || 0,
                              quantity: tempInvoiceItem.quantity
                            }]
                          });
                          setTempInvoiceItem({ itemId: '', quantity: 1 });
                        }
                      }}
                      className="bg-gray-900 text-white px-3 py-2 rounded-lg hover:bg-gray-800 text-sm h-[42px]"
                    >Add</button>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2 px-2">
                  <span className="font-bold text-gray-500">Total Amount:</span>
                  <span className="font-mono text-2xl font-bold text-indigo-600">
                    {formatCurrency(newInvoiceForm.items.reduce((sum, item) => sum + (item.price * item.quantity), 0))}
                  </span>
                </div>

                <select className="input-field" value={newInvoiceForm.status} onChange={e => setNewInvoiceForm({ ...newInvoiceForm, status: e.target.value })}>
                  <option value="Issued">Issued</option>
                  <option value="Paid">Paid</option>
                  <option value="Cancelled">Cancelled</option>
                </select>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAddInvoiceModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" disabled={newInvoiceForm.items.length === 0} className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium shadow-lg shadow-indigo-600/20 disabled:opacity-50 disabled:cursor-not-allowed">Generate Invoice</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* PIN Verification Modal */}
      {
        isPinModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('securityCheck') || 'Security Check'}</h3>
                <button onClick={() => { setIsPinModalOpen(false); setPinInput(''); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6">
                <div className="flex justify-center mb-6">
                  <div className="p-4 bg-blue-50 rounded-full text-blue-600">
                    <Shield size={48} />
                  </div>
                </div>
                <p className="text-center text-gray-500 mb-4 text-sm">Enter your 4-digit security PIN to view sensitive information.</p>

                <div className="flex justify-center mb-6">
                  <input
                    type="password"
                    autoFocus
                    className="w-32 text-center text-2xl font-bold tracking-[0.5em] border-b-2 border-gray-300 focus:border-blue-600 outline-none py-2"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^\d*$/.test(val)) setPinInput(val);
                      if (val === securityPin) {
                        setShowSensitiveData(true);
                        setIsPinModalOpen(false);
                        setPinInput('');
                        // Optional success feedback
                      }
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Settings Modal */}
      {
        showSettings && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('settings')}</h3>
                <button onClick={() => setShowSettings(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-6">
                {/* Shop Settings */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Building2 size={16} /> {t('shopSettings') || 'Shop Settings'}
                  </h4>
                  <div className="space-y-2">
                    <input
                      className="input-field"
                      placeholder={t('shopName')}
                      value={shopSettings.name}
                      autoComplete="off"
                      name="shop_name_field_no_autofill"
                      onChange={(e) => setShopSettings({ ...shopSettings, name: e.target.value })}
                    />
                    <input
                      className="input-field"
                      placeholder={t('shopAddress')}
                      value={shopSettings.address}
                      autoComplete="off"
                      name="shop_address_field_no_autofill"
                      onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                    />
                    <input
                      className="input-field"
                      placeholder={t('shopPhone')}
                      value={shopSettings.phone}
                      autoComplete="off"
                      name="shop_phone_field_no_autofill"
                      onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                    />
                    <button
                      onClick={async () => {
                        if (!user) return;
                        try {
                          await setDoc(doc(db, 'settings', 'shop_' + user.uid), shopSettings);
                          alert("Shop Settings Saved to Cloud");
                        } catch (e) {
                          console.error(e);
                          alert("Error saving settings");
                        }
                      }}
                      className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2"
                    >
                      {t('updateSettings') || 'Update Settings'}
                    </button>
                  </div>
                </div>
                {/* Language Settings */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Globe size={16} /> {t('language')}
                  </h4>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="input-field"
                  >
                    <option value="en">English</option>
                    <option value="hi">हिंदी</option>
                    <option value="ar">العربية</option>
                    <option value="zh">中文</option>
                  </select>
                </div>

                {/* Security Settings */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Shield size={16} /> {t('securityPin') || 'Security PIN'}
                  </h4>
                  <p className="text-xs text-gray-500 mb-2">PIN required to view sensitive warehouse data.</p>
                  <input
                    type="password"
                    className="input-field"
                    placeholder="Enter new 4-digit PIN"
                    maxLength={4}
                    value={pinInput}
                    onChange={(e) => setPinInput(e.target.value)}
                  />
                  <div className="flex justify-end mt-2">
                    <button
                      onClick={() => {
                        if (pinInput.length === 4) {
                          setSecurityPin(pinInput);
                          setPinInput('');
                          alert('PIN Updated Successfully');
                        } else {
                          alert('PIN must be 4 digits');
                        }
                      }}
                      className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
                    >
                      Update PIN
                    </button>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> Danger Zone
                  </h4>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs text-red-700 mb-3">Irreversible action. Deletes all data.</p>
                    <button
                      onClick={handleFactoryReset}
                      className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                    >
                      Factory Reset System
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button type="button" onClick={() => setShowSettings(false)} className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('close')}</button>
                </div>
              </div>
            </div>
          </div >
        )
      }

    </div >
  );
}

