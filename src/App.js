import React, { useState, useEffect } from 'react';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

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
  Database,

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

// DEBUG: Global Error Handler to catch white screen cause
window.onerror = function (message, source, lineno, colno, error) {
  alert('App Error: ' + message + '\nLine: ' + lineno);
};

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
    // Safety check: if t is undefined (not passed), return original string
    if (typeof t !== 'function') return s;

    if (s === 'On Time') return t('onTime');
    if (s === 'Late') {
      const base = t('late');
      return lateHours ? `${base} (${lateHours})` : base;
    }
    if (s === 'Absent') return t('absent');
    return s;
  };

  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${styles[status] || styles['Pending']}`}>
      {getStatusLabel(status)}
    </span>
  );
}

export default function App() {
  // --- Auth & UI State (Moved to top to fix TDZ) ---
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile Sidebar
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', apiKey: '' });
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null); // Explicit Error State
  const [printFormat, setPrintFormat] = useState('Thermal'); // 'Thermal' or 'A4'
  const [printDual, setPrintDual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [securityPin, setSecurityPin] = useState('1234'); // Default until loaded
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [isSettingsLoaded, setIsSettingsLoaded] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showSensitiveData, setShowSensitiveData] = useState(false); // Warehouse Buy Price toggle
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [shopSettings, setShopSettings] = useState({ name: 'Finn ERP', address: '123 Business St', phone: '+1 234 567 890' });
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'EGP');
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);

  // Sync Settings from Firestore
  useEffect(() => {
    if (user) {
      const fetchSettings = async () => {
        try {
          const docRef = doc(db, 'settings', 'user_prefs_' + user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.securityPin) setSecurityPin(data.securityPin);
            if (data.securityQuestion) setSecurityQuestion(data.securityQuestion);
            if (data.securityAnswer) setSecurityAnswer(data.securityAnswer);
          }
          setIsSettingsLoaded(true);
        } catch (error) {
          console.error("Error fetching settings:", error);
        }
      };
      fetchSettings();
    }
  }, [user]);

  // Helper to save settings
  const saveUserSettings = async (newSettings) => {
    if (!user) return;
    try {
      const docRef = doc(db, 'settings', 'user_prefs_' + user.uid);
      await setDoc(docRef, newSettings, { merge: true });
    } catch (error) {
      console.error("Error saving settings:", error);
      alert(t('saveError') + ': ' + error.message);
    }
  };

  const [historyFilter, setHistoryFilter] = useState('All');
  // Set default to current week start (Monday)
  const getWeekStart = () => {
    const today = new Date();
    const day = today.getDay();
    const diff = today.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const monday = new Date(today.setDate(diff));
    return monday.toISOString().split('T')[0];
  };
  const [isSelectSalesEmployeeModalOpen, setIsSelectSalesEmployeeModalOpen] = useState(false);
  const [salesEmployee, setSalesEmployee] = useState(null);
  const [pinAction, setPinAction] = useState('showCosts'); // 'showCosts' | 'changeSalesEmployee'
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'Visa' | 'Online'

  const [historyDateFilter, setHistoryDateFilter] = useState(new Date().toISOString().split('T')[0]);
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

      // Report Headers
      lastUpdated: 'Last Updated',
      stockValueBuy: 'Stock Value (Buy)',
      stockValueSell: 'Stock Value (Sell)',
      itemsSummary: 'Items Summary',
      invoiceId: 'Invoice ID',
      type: 'Type',
      soldBy: 'Sold By',
      customerId: 'Customer ID',
      taxed: 'Taxed',
      advanceSalary: 'Advance Salary',
      image: 'Image',
      salesEmployee: 'Sales Employee',
      adminDefault: 'Admin (Default)',

      // History
      historyLog: 'History Log',
      historySubtitle: 'Comprehensive log of sales and warehouse activities.',
      allTypes: 'All Types',
      sales: 'Sales',
      stockUpdates: 'Stock Updates',
      valueStatus: 'Value / Status',
      noHistory: 'No history records found.',
      sold: 'Sold',
      to: 'to',
      units: 'Units',
      stockCheck: 'Stock Check',
      items: 'items',


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
      searchInventory: 'Search inventory by name ...',
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
      securityPin: 'Security PIN',
      language: 'Language',
      close: 'Close',

      // Invoice Print
      retailInvoice: 'Retail Invoice',
      invoice: 'INVOICE',
      customerCopy: 'Customer Copy',
      shopCopy: 'Shop Copy',
      date: 'Date',
      billNo: 'Bill No',
      paymentMode: 'Payment Mode',
      cash: 'Cash',
      item: 'Item',
      qty: 'Qty',
      amt: 'Amt',
      price: 'Price',
      amount: 'Amount',
      subtotal: 'Subtotal',
      taxVAT: 'Tax/VAT',
      taxRate: 'Tax rate',
      total: 'TOTAL',
      makeChecksPayable: 'Make all checks payable to',
      thankYou: 'Thank you for your business!',
      billTo: 'BILL TO',
      description: 'DESCRIPTION',
      unitPrice: 'UNIT PRICE',
      lineTotal: 'LINE TOTAL',
      comments: 'COMMENTS',
      termsConditions: 'Terms & Conditions',
      paymentTerms: '1. Total payment due in 30 days',
      includeInvoiceNumber: '2. Please include the invoice number on your check',
      phone: 'Phone',
      customer: 'Customer',
      contactQuestions: 'If you have any questions about this invoice, please contact',


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
      sales: 'Sales',
      marketing: 'Marketing',
      kitchen: 'Kitchen',
      service: 'Service',
      bar: 'Bar',
      retail: 'Retail',
      warehouse: 'Warehouse',
      inventory: 'Inventory',
      accounts: 'Accounts',
      management: 'Management',
      cleaning: 'Cleaning',
      maintenance: 'Maintenance',
      morning12: 'Morning (12 Hours)',
      night12: 'Night (12 Hours)',
      importSuccess: 'Successfully imported {0} records.',
      importError: 'Error importing: ',
      payrollUpdateSuccess: 'Successfully updated payroll for {0} employees.',
      payrollUpdateError: 'Error updating payroll: ',
      myProfile: 'My Profile',
      emailLabel: 'Email:',
      userIdLabel: 'User ID:',
      accountTypeLabel: 'Account Type:',
      admin: 'Admin',
      shopSettingsSaved: 'Shop Settings Saved to Cloud',
      shopSettingsError: 'Error saving settings',
      localization: 'Localization',
      language: 'Language',
      currency: 'Currency',
      departmentSettings: 'Department Settings',
      departments: 'Departments',
      manageDepartments: 'Add or remove departments',
      addDepartment: 'Add Department',
      backupRestore: 'Backup & Restore',
      exportBackup: 'Export Backup',
      importBackup: 'Import Backup',
      backupDescription: 'Export your data as JSON or restore from a previous backup.',
      dangerZone: 'Danger Zone',
      irreversibleAction: 'Irreversible action. Deletes all data.',
      factoryReset: 'Factory Reset System',
      compensation: 'Compensation',
      advance: 'Advance',
      totalLabel: 'Total',
      delete: 'Delete',
      terminateService: 'Terminate Service',
      actions: 'Actions',

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
      dark: 'Dark',
      // Payroll Slip
      payrollSlip: 'PAYROLL SLIP',
      payrollFor: 'Payroll for',
      employeeName: 'Employee Name',
      employeeId: 'Employee ID',
      department: 'Department',
      payPeriod: 'Pay Period',
      basicSalary: 'Basic Salary',
      grossPay: 'Gross Pay',
      totalDeductions: 'Total Deductions',
      otherDeductions: 'Other Deductions',
      employeeSignature: 'Employee Signature',
      authorizedSignature: 'Authorized Signature',
      computerGenerated: 'This is a computer-generated payroll slip. No signature required.',
      generatedOn: 'Generated on',
      at: 'at',
      companyName: 'Company Name',
      companyAddress: 'Company Address',
      selectLocation: 'Select Location',
      noLocations: 'No locations available - Please create a location first',
      // Alerts
      authError: 'Auth Error: ',
      googleSignInError: 'Google Sign In Error: ',
      factoryResetWarning: 'CRITICAL WARNING: This will DELETE ALL DATA (Employees, Sales, Inventory, etc.) PERMANENTLY. Are you sure?',
      pinPrompt: 'Enter Security PIN to confirm Factory Reset:',
      incorrectPin: 'Incorrect PIN. Reset Aborted.',
      resetComplete: 'Factory Reset Complete. All data has been wiped.',
      resetFailed: 'Factory Reset Failed: ',
      backupExported: 'Backup exported successfully!',
      exportFailed: 'Export failed: ',
      backupImported: 'Backup imported successfully! Reloading...',
      importFailed: 'Import failed: ',
      overwriteWarning: 'WARNING: This will OVERWRITE all existing data. Continue?',
      linkSuccess: 'Google Account Linked Successfully!',
      linkError: 'Link Error: ',
      accountLinked: 'This Google Account is already active. Please Log Out and use "Sign in with Google" directly.',
      employeeSaved: 'Employee Saved Successfully!',
      saveError: 'Error saving: ',
      deleteConfirm: 'Are you sure?',
      updateError: 'Error updating item: ',
      addPurchaseError: 'Error adding purchase: ',
      genInvoiceError: 'Error generating invoice: ',
      addItemError: 'Error adding item: ',
      deleteLocationWarning: 'Cannot delete. Employees assigned.',
      deleteLocationConfirm: 'Delete this location?',
      errorNoUser: 'Error: No user logged in.',
      totalIncome: 'Total Income',
      visa: 'Visa',
      onlinePayment: 'Online',

      // PIN & Security
      forgotPin: 'Forgot PIN?',
      securityQuestion: 'Security Question',
      securityAnswer: 'Security Answer',
      enterSecurityAnswer: 'Enter Security Answer',
      pinResetSuccess: 'PIN Reset Successfully! Your new PIN is 1234.',
      incorrectAnswer: 'Incorrect Answer.',
      setSecurityQuestion: 'Set Security Question',
      changePin: 'Change Security PIN',
      newPin: 'New PIN',
      saveSettings: 'Save Settings',
      currentPin: 'Current PIN',
      enterNewPin: 'Enter New PIN',
      pinChanged: 'PIN Updated Successfully!',
      pinSetMessage: 'PIN is set. Use "Forgot PIN" to reset.',
      confirmChangePin: 'Set new PIN?',

      // Security Questions
      secQ_pet: "What is your first pet's name?",
      secQ_mother: "What is your mother's maiden name?",
      secQ_city: "In what city were you born?",
      secQ_school: "What is the name of your first school?"
    },
    hi: {
      appName: 'Finn ERP',
      appSubtitle: 'एंटरप्राइज़ रिसोर्स प्लानिंग',
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
      bonus: 'बोनस',
      overtime: 'ओवरटाइम',
      deductions: 'कटौती',
      image: 'चिवि',
      salesEmployee: 'बिक्री कर्मचारी',
      adminDefault: 'एडमिन (डिफ़ॉल्ट)',

      // History
      historyLog: 'इतिहास लॉग',
      historySubtitle: 'बिक्री और गोदाम गतिविधियों का व्यापक लॉग।',
      allTypes: 'सभी प्रकार',
      sales: 'बिक्री',
      stockUpdates: 'स्टॉक अपडेट',
      valueStatus: 'मूल्य / स्थिति',
      noHistory: 'कोई इतिहास रिकॉर्ड नहीं मिला।',
      sold: 'बेचा',
      to: 'को',
      units: 'इकाइयाँ',
      stockCheck: 'स्टॉक चेक',
      items: 'वस्तुएं',

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
      sales: 'बिक्री',
      marketing: 'मार्केटिंग',
      kitchen: 'रसोई',
      service: 'सेवा',
      bar: 'बार',
      retail: 'खुदरा',
      warehouse: 'गोदाम',
      inventory: 'इन्वेंटरी',
      accounts: 'खाते',
      management: 'प्रबंधन',
      cleaning: 'साफ-सफाई',
      maintenance: 'रखरखाव',
      morning12: 'सुबह (12 घंटे)',
      night12: 'रात (12 घंटे)',
      importSuccess: '{0} रिकॉर्ड सफलतापूर्वक आयात किए गए।',
      importError: 'आयात करने में त्रुटि: ',
      payrollUpdateSuccess: '{0} कर्मचारियों के लिए वेतन अद्यतन किया गया।',
      payrollUpdateError: 'वेतन अद्यतन करने में त्रुटि: ',
      myProfile: 'मेरी प्रोफाइल',
      emailLabel: 'ईमेल:',
      userIdLabel: 'उपयोगकर्ता आईडी:',
      accountTypeLabel: 'खाता प्रकार:',
      admin: 'व्यवस्थापक',
      shopSettingsSaved: 'दुकान सेटिंग्स क्लाउड पर सहेजी गईं',
      shopSettingsError: 'सेटिंग्स सहेजने में त्रुटि',
      localization: 'स्थानीयकरण',
      language: 'भाषा',
      currency: 'मुद्रा',
      departmentSettings: 'विभाग सेटिंग्स',
      departments: 'विभाग',
      manageDepartments: 'विभाग जोड़ें या हटाएँ',
      addDepartment: 'विभाग जोड़ें',
      backupRestore: 'बैकअप और पुनर्स्थापना',
      exportBackup: 'बैकअप निर्यात करें',
      importBackup: 'बैकअप आयात करें',
      backupDescription: 'अपना डेटा JSON के रूप में निर्यात करें या पिछले बैकअप से पुनर्स्थापित करें।',
      dangerZone: 'खतरा क्षेत्र',
      irreversibleAction: 'अपरिवर्तनीय कार्रवाई। सभी डेटा हटा दिया जाएगा।',
      factoryReset: 'सिस्टम फैक्टरी रीसेट',
      compensation: 'मुआवजा',
      advance: 'अग्रिम',
      totalLabel: 'कुल',
      delete: 'हटाएं',
      terminateService: 'सेवा समाप्त करें',
      actions: 'क्रियाएँ',

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
      payrollSlip: 'वेतन पर्ची',
      payrollFor: 'वेतन के लिए',
      employeeName: 'कर्मचारी का नाम',
      employeeId: 'कर्मचारी आईडी',
      department: 'विभाग',
      payPeriod: 'वेतन अवधि',
      basicSalary: 'मूल वेतन',
      grossPay: 'सकल वेतन',
      totalDeductions: 'कुल कटौती',
      otherDeductions: 'अन्य कटौती',
      employeeSignature: 'कर्मचारी के हस्ताक्षर',
      authorizedSignature: 'अधिकृत हस्ताक्षर',
      computerGenerated: 'यह कंप्यूटर जनित वेतन पर्ची है। हस्ताक्षर की आवश्यकता नहीं है।',
      generatedOn: 'उत्पन्न',
      at: 'पर',
      companyName: 'कंपनी का नाम',
      companyAddress: 'कंपनी का पता',
      selectLocation: 'स्थान चुनें',
      noLocations: 'कोई स्थान उपलब्ध नहीं है - कृपया पहले एक स्थान बनाएं',
      // Alerts & Errors (Extensions)

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

      // Report Headers
      lastUpdated: 'अंतिम अपडेट',
      stockValueBuy: 'स्टॉक मूल्य (खरीद)',
      stockValueSell: 'स्टॉक मूल्य (बिक्री)',
      itemsSummary: 'वस्तु सारांश',
      invoiceId: 'चालान आईडी',
      type: 'प्रकार',
      posTerminal: 'POS टर्मिनल',
      searchProducts: 'उत्पाद खोजें...',
      todaysSales: 'आज की बिक्री',
      time: 'समय',
      amount: 'राशि',
      items: 'वस्तुएं',
      receipt: 'रसीद',
      currentBill: 'वर्तमान बिल',
      cartEmpty: 'कार्ट खाली है',
      selectItems: 'ग्रिड से आइटम चुनें',
      subtotal: 'उप-योग (Subtotal)',
      tax: 'कर (Tax)',
      checkout: 'चेकआउट',
      customerNameOptional: 'ग्राहक का नाम (वैकल्पिक)',
      soldBy: 'विक्रेता (Sold By)',
      customerId: 'ग्राहक आईडी',
      taxed: 'कर',
      advanceSalary: 'अग्रिम वेतन',
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
      updateSettings: 'सेटिंग्स अपडेट करें',
      securityPin: 'सुरक्षा पिन',
      language: 'भाषा',
      close: 'बंद करें',

      // Invoice Print
      retailInvoice: 'खुदरा चालान',
      invoice: 'चालान',
      customerCopy: 'ग्राहक प्रति',
      shopCopy: 'दुकान प्रति',
      date: 'तारीख',
      billNo: 'बिल नंबर',
      paymentMode: 'भुगतान मोड',
      cash: 'नकद',
      item: 'वस्तु',
      qty: 'मात्रा',
      amt: 'राशि',
      price: 'मूल्य',
      amount: 'राशि',
      subtotal: 'उप-योग',
      taxVAT: 'कर/वैट',
      taxRate: 'कर दर',
      total: 'कुल',
      makeChecksPayable: 'सभी चेक देय बनाएं',
      thankYou: 'आपके व्यवसाय के लिए धन्यवाद!',
      billTo: 'बिल प्राप्तकर्ता',
      description: 'विवरण',
      unitPrice: 'इकाई मूल्य',
      lineTotal: 'पंक्ति कुल',
      comments: 'टिप्पणियाँ',
      termsConditions: 'नियम और शर्तें',
      paymentTerms: '1. 30 दिनों में कुल भुगतान देय',
      includeInvoiceNumber: '2. कृपया अपने चेक पर चालान संख्या शामिल करें',
      phone: 'फोन',
      customer: 'ग्राहक',
      contactQuestions: 'यदि इस चालान के बारे में आपके कोई प्रश्न हैं, तो कृपया संपर्क करें',
      // Alerts
      authError: 'प्रमाणीकरण त्रुटि: ',
      googleSignInError: 'Google साइन इन त्रुटि: ',
      factoryResetWarning: 'महत्वपूर्ण चेतावनी: यह सभी डेटा को स्थायी रूप से हटा देगा। क्या आपको यकीन है?',
      pinPrompt: 'पुष्टि करने के लिए सुरक्षा पिन दर्ज करें:',
      incorrectPin: 'गलत पिन। रीसेट रद्द।',
      resetComplete: 'रीसेट पूर्ण। डेटा मिटा दिया गया।',
      resetFailed: 'रीसेट विफल: ',
      backupExported: 'बैकअप सफलतापूर्वक निर्यात किया गया!',
      exportFailed: 'निर्यात विफल: ',
      backupImported: 'बैकअप आयातित! रीलोड हो रहा है...',
      importFailed: 'आयात विफल: ',
      overwriteWarning: 'चेतावनी: यह सभी मौजूदा डेटा को अधिलेखित कर देगा। जारी रखें?',
      linkSuccess: 'Google खाता सफलतापूर्वक लिंक किया गया!',
      linkError: 'लिंक त्रुटि: ',
      accountLinked: 'यह Google खाता पहले से सक्रिय है।',
      employeeSaved: 'कर्मचारी सफलतापूर्वक सहेजा गया!',
      saveError: 'सहेजने में त्रुटि: ',
      deleteConfirm: 'क्या आपको यकीन है?',
      updateError: 'आद्यतन त्रुटि: ',
      addPurchaseError: 'खरीद जोड़ने में त्रुटि: ',
      genInvoiceError: 'चालान त्रुटि: ',
      addItemError: 'आइटम जोड़ने में त्रुटि: ',
      deleteLocationWarning: 'हटा नहीं सकते। कर्मचारी नियुक्त हैं।',
      deleteLocationConfirm: 'इस स्थान को हटाएं?',
      errorNoUser: 'त्रुटि: कोई उपयोगकर्ता लॉग इन नहीं है।',

      // Invoice Print (Extensions)
      retailInvoice: 'खुदरा चालान',
      invoice: 'चालान',
      customerCopy: 'ग्राहक प्रति',
      shopCopy: 'दुकान प्रति',
      date: 'तारीख',
      billNo: 'बिल नंबर',
      paymentMode: 'भुगतान मोड',
      cash: 'नकद',
      item: 'वस्तु',
      qty: 'मात्रा',
      amt: 'राशि',
      price: 'मूल्य',
      amount: 'राशि',
      subtotal: 'उप-योग',
      taxVAT: 'कर/वैट',
      taxRate: 'कर दर',
      total: 'कुल',
      makeChecksPayable: 'सभी चेक देय बनाएं',
      thankYou: 'आपके व्यवसाय के लिए धन्यवाद!',
      billTo: 'बिल प्राप्तकर्ता',
      description: 'विवरण',
      unitPrice: 'इकाई मूल्य',
      lineTotal: 'पंक्ति कुल',
      comments: 'टिप्पणियाँ',
      termsConditions: 'नियम और शर्तें',
      paymentTerms: '1. 30 दिनों में कुल भुगतान देय',
      includeInvoiceNumber: '2. कृपया अपने चेक पर चालान संख्या शामिल करें',
      phone: 'फोन',
      customer: 'ग्राहक',
      contactQuestions: 'यदि इस चालान के बारे में आपके कोई प्रश्न हैं, तो कृपया संपर्क करें',
      status: 'स्थिति',
      totalIncome: 'कुल आय',
      visa: 'वीज़ा',
      onlinePayment: 'ऑनलाइन',

      // PIN & Security
      forgotPin: 'पिन भूल गए?',
      securityQuestion: 'सुरक्षा प्रश्न',
      securityAnswer: 'सुरक्षा उत्तर',
      enterSecurityAnswer: 'सुरक्षा उत्तर दर्ज करें',
      pinResetSuccess: 'पिन सफलतापूर्वक रीसेट किया गया! आपका नया पिन 1234 है।',
      incorrectAnswer: 'गलत उत्तर।',
      setSecurityQuestion: 'सुरक्षा प्रश्न सेट करें',
      changePin: 'सुरक्षा पिन बदलें',
      newPin: 'नया पिन',
      saveSettings: 'सेटिंग्स सहेजें',
      currentPin: 'वर्तमान पिन',
      enterNewPin: 'नया पिन दर्ज करें',
      pinChanged: 'पिन सफलतापूर्वक अपडेट किया गया!',
      pinSetMessage: 'पिन सेट है। रीसेट करने के लिए "पिन भूल गए" का उपयोग करें।',

      // Security Questions
      secQ_pet: "आपके पहले पालतू जानवर का नाम क्या है?",
      secQ_mother: "आपकी माँ का मायके का नाम क्या है?",
      secQ_city: "आपका जन्म किस शहर में हुआ था?",
      secQ_school: "आपके पहले स्कूल का नाम क्या है?"
    },

    ar: {
      appName: 'Finn ERP',
      appSubtitle: 'تخطيط موارد المؤسسة',
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
      image: 'صورة',
      salesEmployee: 'موظف المبيعات',
      adminDefault: 'Admin (افتراضي)',

      // Payroll Slip
      payrollSlip: 'قسيمة الراتب',
      payrollFor: 'راتب عن',
      employeeName: 'اسم الموظف',
      employeeId: 'معرف الموظف',
      department: 'القسم',
      payPeriod: 'فترة الدفع',
      basicSalary: 'الراتب الأساسي',
      grossPay: 'إجمالي الراتب',
      totalDeductions: 'إجمالي الخصومات',
      otherDeductions: 'خصومات أخرى',
      employeeSignature: 'توقيع الموظف',
      authorizedSignature: 'توقيع المسؤول',
      computerGenerated: 'هذه قسيمة راتب تم إنشاؤها بواسطة الكمبيوتر. لا يلزم التوقيع.',
      generatedOn: 'تم إنشاؤها في',
      at: 'في',
      companyName: 'اسم الشركة',
      companyAddress: 'عنوان الشركة',
      selectLocation: 'اختر الموقع',
      noLocations: 'لا توجد مواقع متاحة - يرجى إنشاء موقع أولاً',

      // Invoice Print (Extensions)
      retailInvoice: 'فاتورة بيع بالتجزئة',
      invoice: 'فاتورة',
      customerCopy: 'نسخة العميل',
      shopCopy: 'نسخة المتجر',
      date: 'تاريخ',
      billNo: 'رقم الفاتورة',
      paymentMode: 'طريقة الدفع',
      cash: 'نقد',
      item: 'عنصر',
      qty: 'كمية',
      amt: 'مبلغ',
      price: 'سعر',
      amount: 'مبلغ',
      subtotal: 'المجموع الفرعي',
      taxVAT: 'ضريبة',
      taxRate: 'معدل الضريبة',
      total: 'الإجمالي',
      makeChecksPayable: 'اجعل جميع الشيكات مستحقة الدفع لـ',
      thankYou: 'شكرا لتعاملكم معنا!',
      billTo: 'فاتورة إلى',
      description: 'الوصف',
      unitPrice: 'سعر الوحدة',
      lineTotal: 'إجمالي السطر',
      comments: 'تعليقات',
      termsConditions: 'الشروط والأحكام',
      phone: 'هاتف',
      customer: 'عميل',
      contactQuestions: 'إذا كان لديك أي أسئلة حول هذه الفاتورة، يرجى الاتصال',
      status: 'حالة',


      // History
      historyLog: 'سجل التاريخ',
      historySubtitle: 'سجل شامل للمبيعات وأنشطة المستودعات.',
      allTypes: 'جميع الأنواع',
      sales: 'المبيعات',
      stockUpdates: 'تحديثات المخزون',
      valueStatus: 'القيمة / الحالة',
      noHistory: 'لم يتم العثور على سجلات.',
      sold: 'تم بيع',
      to: 'إلى',
      units: 'وحدات',
      stockCheck: 'فحص المخزون',
      items: 'عناصر',

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
      sales: 'المبيعات',
      marketing: 'التسويق',
      kitchen: 'المطبخ',
      service: 'الخدمة',
      bar: 'البار',
      retail: 'البيع بالتجزئة',
      warehouse: 'المستودع',
      inventory: 'المخزون',
      accounts: 'الحسابات',
      management: 'الإدارة',
      cleaning: 'التنظيف',
      maintenance: 'الصيانة',
      morning12: 'صباحي (12 ساعة)',
      night12: 'ليلي (12 ساعة)',
      importSuccess: 'تم استيراد {0} سجل بنجاح.',
      importError: 'خطأ في الاستيراد: ',
      payrollUpdateSuccess: 'تم تحديث الرواتب لـ {0} موظف بنجاح.',
      payrollUpdateError: 'خطأ في تحديث الرواتب: ',
      myProfile: 'ملفي الشخصي',
      emailLabel: 'البريد الإلكتروني:',
      userIdLabel: 'معرف المستخدم:',
      accountTypeLabel: 'نوع الحساب:',
      admin: 'مسؤول',
      shopSettingsSaved: 'تم حفظ إعدادات المتجر في السحابة',
      shopSettingsError: 'خطأ في حفظ الإعدادات',
      localization: 'التعريب',
      language: 'اللغة',
      currency: 'العملة',
      departmentSettings: 'إعدادات القسم',
      departments: 'الأقسام',
      manageDepartments: 'إضافة أو إزالة الأقسام',
      addDepartment: 'إضافة قسم',
      backupRestore: 'النسخ الاحتياطي والاستعادة',
      exportBackup: 'تصدير النسخة الاحتياطية',
      importBackup: 'استيراد نسخة احتياطية',
      backupDescription: 'تصدير بياناتك كملف JSON أو استعادتها من نسخة احتياطية سابقة.',
      dangerZone: 'منطقة الخطر',
      irreversibleAction: 'إجراء لا رجعة فيه. يحذف جميع البيانات.',
      factoryReset: 'إعادة ضبط المصنع للنظام',
      compensation: 'التعويضات',
      advance: 'سلفة',
      totalLabel: 'الإجمالي',
      delete: 'حذف',
      terminateService: 'إنهاء الخدمة',
      actions: 'إجراءات',

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
      // Payroll Slip
      payrollSlip: 'قسيمة الراتب',
      payrollFor: 'الراتب لشهر',
      employeeName: 'اسم الموظف',
      employeeId: 'رقم الموظف',
      department: 'القسم',
      payPeriod: 'فترة الدفع',
      basicSalary: 'الراتب الأساسي',
      grossPay: 'إجمالي الراتب',
      totalDeductions: 'إجمالي الخصومات',
      otherDeductions: 'خصومات أخرى',
      employeeSignature: 'توقيع الموظف',
      authorizedSignature: 'التوقيع المعتمد',
      computerGenerated: 'هذه قسيمة راتب إلكترونية. لا يلزم التوقيع.',
      generatedOn: 'تم الإنشاء في',
      at: 'في',
      companyName: 'اسم الشركة',
      companyAddress: 'عنوان الشركة',
      selectLocation: 'اختر الموقع',
      noLocations: 'لا توجد مواقع متاحة - يرجى إنشاء موقع أولاً',
      // New additions
      customerCopy: 'نسخة العميل',
      shopCopy: 'نسخة المتجر',
      printSettings: 'إعدادات الطباعة',
      thermal: 'حراري (80 مم)',
      a4: 'A4 (قياسي)',
      dualPrint: 'طباعة مزدوجة',

      // Report Headers
      lastUpdated: 'آخر تحديث',
      stockValueBuy: 'قيمة المخزون (شراء)',
      stockValueSell: 'قيمة المخزون (بيع)',
      itemsSummary: 'ملخص العناصر',
      invoiceId: 'رقم الفاتورة',
      type: 'النوع',
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
      updateSettings: 'تحديث الإعدادات',
      securityPin: 'رمز الأمان',
      language: 'اللغة',
      close: 'إغلاق',

      // Invoice Print
      retailInvoice: 'فاتورة التجزئة',
      invoice: 'فاتورة',
      customerCopy: 'نسخة العميل',
      shopCopy: 'نسخة المتجر',
      date: 'التاريخ',
      billNo: 'رقم الفاتورة',
      paymentMode: 'طريقة الدفع',
      cash: 'نقدي',
      item: 'الصنف',
      qty: 'الكمية',
      amt: 'المبلغ',
      price: 'السعر',
      amount: 'المبلغ',
      subtotal: 'المجموع الفرعي',
      taxVAT: 'الضريبة/القيمة المضافة',
      taxRate: 'معدل الضريبة',
      total: 'الإجمالي',
      makeChecksPayable: 'اجعل جميع الشيكات مستحقة الدفع إلى',
      thankYou: 'شكراً لتعاملكم معنا!',
      billTo: 'الفاتورة إلى',
      description: 'الوصف',
      unitPrice: 'سعر الوحدة',
      lineTotal: 'إجمالي السطر',
      comments: 'ملاحظات',
      termsConditions: 'الشروط والأحكام',
      paymentTerms: '1. إجمالي الدفع مستحق خلال 30 يومًا',
      includeInvoiceNumber: '2. يرجى تضمين رقم الفاتورة على الشيك الخاص بك',
      phone: 'هاتف',
      customer: 'عميل',
      contactQuestions: 'إذا كان لديك أي أسئلة حول هذه الفاتورة، يرجى الاتصال',
      // Alerts
      authError: 'خطأ في المصادقة: ',
      googleSignInError: 'خطأ في تسجيل الدخول عبر Google: ',
      factoryResetWarning: 'تحذير هام: سيؤدي هذا إلى حذف جميع البيانات بشكل دائم. هل أنت متأكد؟',
      pinPrompt: 'أدخل رمز الأمان للتأكيد:',
      incorrectPin: 'رمز غير صحيح. تم الإلغاء.',
      resetComplete: 'تمت إعادة تعيين المصنع.',
      resetFailed: 'فشل إعادة التعيين: ',
      backupExported: 'تم تصدير النسخة الاحتياطية بنجاح!',
      exportFailed: 'فشل التصدير: ',
      backupImported: 'تم استيراد النسخة الاحتياطية! جاري إعادة التحميل...',
      importFailed: 'فشل الاستيراد: ',
      overwriteWarning: 'تحذير: سيتم استبدال جميع البيانات. استمرار؟',
      linkSuccess: 'تم ربط حساب Google بنجاح!',
      linkError: 'خطأ في الربط: ',
      accountLinked: 'حساب Google هذا نشط بالفعل.',
      employeeSaved: 'تم حفظ الموظف بنجاح!',
      saveError: 'خطأ في الحفظ: ',
      deleteConfirm: 'هل أنت متأكد؟',
      updateError: 'خطأ في التحديث: ',
      addPurchaseError: 'خطأ في إضافة الشراء: ',
      genInvoiceError: 'خطأ في إنشاء الفاتورة: ',
      addItemError: 'خطأ في إضافة العنصر: ',
      deleteLocationWarning: 'لا يمكن الحذف. يوجد موظفين مرتبطين.',
      deleteLocationConfirm: 'حذف هذا الموقع؟',
      errorNoUser: 'خطأ: لا يوجد مستخدم مسجل الدخول.',
      totalIncome: 'إجمالي الدخل',
      visa: 'فيزا',
      onlinePayment: 'دفع عبر الإنترنت',

      // PIN & Security
      forgotPin: 'نسيت رقم التعريف الشخصي؟',
      securityQuestion: 'سؤال الأمان',
      securityAnswer: 'إجابة الأمان',
      enterSecurityAnswer: 'أدخل إجابة الأمان',
      pinResetSuccess: 'تم إعادة تعيين PIN بنجاح! الرمز الجديد هو 1234.',
      incorrectAnswer: 'إجابة خاطئة.',
      setSecurityQuestion: 'تعيين سؤال الأمان',
      changePin: 'تغيير رمز PIN',
      newPin: 'PIN جديد',
      saveSettings: 'حفظ الإعدادات',
      currentPin: 'PIN الحالي',
      enterNewPin: 'أدخل PIN الجديد',
      pinChanged: 'تم تحديث PIN بنجاح!',
      pinSetMessage: 'تم تعيين الرقم السري. استخدم "نسيت الرقم السري" لإعادة تعيينه.',

      // Security Questions
      secQ_pet: "ما هو اسم حيوانك الأليف الأول؟",
      secQ_mother: "ما هو اسم عائلة والدتك؟",
      secQ_city: "في أي مدينة ولدت؟",
      secQ_school: "ما هو اسم مدرستك الأولى؟"
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

      // History
      historyLog: '历史记录',
      historySubtitle: '销售和仓库活动日志。',
      allTypes: '所有类型',
      sales: '销售',
      stockUpdates: '库存更新',
      valueStatus: '价值 / 状态',
      noHistory: '未找到历史记录。',
      sold: '已售',
      to: '至',
      units: '单位',
      stockCheck: '库存检查',
      items: '项目',

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
      sales: '销售',
      marketing: '市场营销',
      kitchen: '厨房',
      service: '服务',
      bar: '酒吧',
      retail: '零售',
      warehouse: '仓库',
      inventory: '库存',
      accounts: '账户',
      management: '管理',
      cleaning: '清洁',
      maintenance: '维护',
      morning12: '早班 (12小时)',
      night12: '夜班 (12小时)',
      importSuccess: '成功导入 {0} 条记录。',
      importError: '导入错误：',
      payrollUpdateSuccess: '成功更新 {0} 名员工的工资单。',
      payrollUpdateError: '更新工资单错误：',
      myProfile: '我的资料',
      emailLabel: '电子邮件:',
      userIdLabel: '用户ID:',
      accountTypeLabel: '账户类型:',
      admin: '管理员',
      shopSettingsSaved: '商店设置已保存到云端',
      shopSettingsError: '保存设置错误',
      localization: '本地化',
      language: '语言',
      currency: '货币',
      departmentSettings: '部门设置',
      departments: '部门',
      manageDepartments: '添加或删除部门',
      addDepartment: '添加部门',
      backupRestore: '备份与恢复',
      exportBackup: '导出备份',
      importBackup: '导入备份',
      backupDescription: '将数据导出为 JSON 或从以前的备份恢复。',
      dangerZone: '危险区域',
      irreversibleAction: '不可逆转的操作。删除所有数据。',
      factoryReset: '系统出厂重置',
      compensation: '薪酬',
      advance: '预支',
      totalLabel: '总计',
      delete: '删除',
      terminateService: '终止服务',
      actions: '操作',
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

      // Report Headers
      lastUpdated: '最后更新',
      stockValueBuy: '库存价值 (买入)',
      stockValueSell: '库存价值 (卖出)',
      itemsSummary: '项目摘要',
      invoiceId: '发票 ID',
      type: '类型',
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
      updateSettings: '更新设置',
      securityPin: '安全密码',
      language: '语言',
      close: '关闭',

      // Invoice Print
      retailInvoice: '零售发票',
      invoice: '发票',
      customerCopy: '客户联',
      shopCopy: '店铺联',
      date: '日期',
      billNo: '账单号',
      paymentMode: '付款方式',
      cash: '现金',
      item: '项目',
      qty: '数量',
      amt: '金额',
      price: '价格',
      amount: '金额',
      subtotal: '小计',
      taxVAT: '税/增值税',
      taxRate: '税率',
      total: '总计',
      makeChecksPayable: '所有支票抬头请写',
      thankYou: '感谢您的惠顾！',
      billTo: '账单收件人',
      description: '描述',
      unitPrice: '单价',
      lineTotal: '行总计',
      comments: '备注',
      termsConditions: '条款和条件',
      paymentTerms: '1. 总付款应在30天内支付',
      includeInvoiceNumber: '2. 请在支票上注明发票号码',
      phone: '电话',
      customer: '客户',
      contactQuestions: '如果您对此发票有任何疑问，请联系',
      // Payroll Slip
      payrollSlip: '工资单',
      payrollFor: '工资期间',
      employeeName: '员工姓名',
      employeeId: '员工编号',
      department: '部门',
      payPeriod: '工资期间',
      basicSalary: '基本工资',
      grossPay: '总工资',
      totalDeductions: '总扣除额',
      otherDeductions: '其他扣除',
      employeeSignature: '员工签名',
      authorizedSignature: '授权签名',
      computerGenerated: '这是计算机生成的工资单。无需签名。',
      generatedOn: '生成于',
      at: '在',
      companyName: '公司名称',
      companyAddress: '公司地址',
      selectLocation: '选择位置',
      noLocations: '没有可用位置 - 请先创建位置',
      // Alerts
      authError: '认证错误: ',
      googleSignInError: 'Google 登录错误: ',
      factoryResetWarning: '严重警告：这将永久删除所有数据。你确定吗？',
      pinPrompt: '输入安全 PIN 以确认：',
      incorrectPin: 'PIN 错误。重置已中止。',
      resetComplete: '出厂重置完成。',
      resetFailed: '重置失败: ',
      backupExported: '备份导出成功！',
      exportFailed: '导出失败: ',
      backupImported: '备份导入成功！正在重新加载...',
      importFailed: '导入失败: ',
      overwriteWarning: '警告：这将覆盖所有现有数据。继续吗？',
      linkSuccess: 'Google 帐户关联成功！',
      linkError: '关联错误: ',
      accountLinked: '此 Google 帐户已处于活动状态。',
      employeeSaved: '员工保存成功！',
      saveError: '保存错误: ',
      deleteConfirm: '你确定吗？',
      updateError: '更新错误: ',
      addPurchaseError: '添加购买错误: ',
      genInvoiceError: '生成发票错误: ',
      addItemError: '添加项目错误: ',
      deleteLocationWarning: '无法删除。已分配员工。',
      deleteLocationConfirm: '删除此位置？',
      errorNoUser: '错误：没有登录用户。',
      totalIncome: '总收入',
      visa: 'Visa',
      onlinePayment: '在线支付',
      salesEmployee: '销售员',

      // PIN & Security
      forgotPin: '忘记 PIN？',
      securityQuestion: '安全问题',
      securityAnswer: '安全答案',
      enterSecurityAnswer: '输入安全答案',
      pinResetSuccess: 'PIN 重置成功！您的新 PIN 是 1234。',
      incorrectAnswer: '答案错误。',
      setSecurityQuestion: '设置安全问题',
      changePin: '更改安全 PIN',
      newPin: '新 PIN',
      saveSettings: '保存设置',
      currentPin: '当前 PIN',
      enterNewPin: '输入新 PIN',
      pinChanged: 'PIN 更新成功！',
      pinSetMessage: 'PIN 已设置。使用“忘记 PIN”重置。',

      // Security Questions
      secQ_pet: "你第一只宠物的名字是什么？",
      secQ_mother: "你母亲的娘家姓是什么？",
      secQ_city: "你在哪个城市出生？",
      secQ_school: "你第一所学校的名字是什么？"
    }
  };



  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  useEffect(() => { localStorage.setItem('language', language); }, [language]);

  const t = (key) => {
    const lang = translations[language] ? language : 'en';
    return (translations[lang] && translations[lang][key]) || key;
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
  const [payrollMonthFilter, setPayrollMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM format
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null); // For edit modal




  // --- Auth Effects ---
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // --- PIN Modal Keyboard Support ---
  useEffect(() => {
    if (!isPinModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setPinInput(prev => (prev.length < 4 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        setPinInput(prev => prev.slice(0, -1));
      } else if (e.key === 'Enter') {
        // Trigger verification (logic copied from button click)
        const currentPin = pinInput; // pinInput state might be stale in closure? No, pinInput is dependency.
        // Actually, best to rely on useEffect dependency on pinInput or just check current state in a ref?
        // Simpler: Just allow typing, user still waits for auto-submit or we can trigger it.
        // The existing logic triggers when length === 4.
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPinModalOpen, pinInput]);

  // Auto-submit PIN when length is 4 (for keyboard support)
  useEffect(() => {
    if (isPinModalOpen && pinInput.length === 4) {
      if (pinInput === securityPin) {
        setIsPinModalOpen(false);
        setPinInput('');
        if (pinAction === 'showCosts') setShowSensitiveData(true);
        if (pinAction === 'changeSalesEmployee') setIsSelectSalesEmployeeModalOpen(true);
      } else {
        setTimeout(() => {
          setPinInput('');
          alert(t('incorrectPin'));
        }, 200);
      }
    }
  }, [pinInput, isPinModalOpen, pinAction, securityPin, t]);

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
      alert(t('authError') + error.message);
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
      alert(t('googleSignInError') + error.message);
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
    if (!window.confirm(t('factoryResetWarning'))) return;

    const confirmPin = prompt(t('pinPrompt'));
    if (confirmPin !== securityPin) {
      alert(t('incorrectPin'));
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

      alert(t('resetComplete'));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(t('resetFailed') + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportBackup = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const collections = ['employees', 'sites', 'attendance', 'inventory', 'sales', 'purchases', 'invoices', 'accounts', 'journal_entries', 'suppliers', 'settings'];
      const backup = {
        exportDate: new Date().toISOString(),
        userId: user.uid,
        userEmail: user.email,
        data: {}
      };

      for (const colName of collections) {
        const q = query(collection(db, colName), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        backup.data[colName] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      const dataStr = JSON.stringify(backup, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `finnerp-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      alert(t('backupExported'));
    } catch (err) {
      console.error(err);
      alert(t('exportFailed') + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImportBackup = async (event) => {
    const file = event.target.files[0];
    if (!file || !user) return;

    if (!window.confirm(t('overwriteWarning'))) {
      event.target.value = null;
      return;
    }

    setLoading(true);
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const backup = JSON.parse(e.target.result);

        if (!backup.data) {
          throw new Error('Invalid backup file format');
        }

        for (const [colName, items] of Object.entries(backup.data)) {
          if (!Array.isArray(items)) continue;

          for (const item of items) {
            const { id, ...data } = item;
            data.userId = user.uid;
            await setDoc(doc(db, colName, id), data);
          }
        }

        alert(t('backupImported'));
        window.location.reload();
      } catch (err) {
        console.error(err);
        alert(t('importFailed') + err.message);
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    event.target.value = null;
  };

  const handleLinkGoogle = async () => {
    if (!auth.currentUser) return;
    try {
      const provider = new GoogleAuthProvider();
      await linkWithPopup(auth.currentUser, provider);
      alert(t('linkSuccess'));
    } catch (error) {
      console.error(error);
      if (error.code === 'auth/credential-already-in-use') {
        alert(t('accountLinked'));
      } else {
        alert(t('linkError') + error.message);
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
    name: '', role: '', dept: 'Security', location: '', shift: 'Morning (12 Hours)', salary: 60000, bonus: 0, overtime: 0, deductionHours: 0, photo: ''
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

  /* --- Excel Import/Export Handling with exceljs --- */

  const generateExcel = async (headers, data, filename, extraMetadata = []) => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Report');

    // 1. Metadata Section (Rows 1-4)
    worksheet.mergeCells('A1:E1');
    const titleCell = worksheet.getCell('A1');
    titleCell.value = `${t('companyName') || 'Company'}: Finn ERP`;
    titleCell.font = { name: 'Arial', size: 16, bold: true };
    titleCell.alignment = { horizontal: 'center' };

    worksheet.mergeCells('A2:E2');
    worksheet.getCell('A2').value = `${t('menuReports') || 'Report'}: ${filename.replace('.xlsx', '').replace(/_/g, ' ')}`;
    worksheet.getCell('A2').alignment = { horizontal: 'center' };

    worksheet.mergeCells('A3:E3');
    worksheet.getCell('A3').value = `${t('date')}: ${new Date().toLocaleString()}`;
    worksheet.getCell('A3').alignment = { horizontal: 'center' };

    if (extraMetadata.length > 0) {
      worksheet.mergeCells('A4:E4');
      worksheet.getCell('A4').value = extraMetadata.join(' | ');
      worksheet.getCell('A4').alignment = { horizontal: 'center' };
      worksheet.getCell('A4').font = { italic: true };
    }

    // 2. Header Row (Row 6)
    const headerRow = worksheet.getRow(6);
    headerRow.values = headers;
    headerRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF4F46E5' }, // Indigo-600
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // 3. Data Rows
    data.forEach((rowData) => {
      const row = worksheet.addRow(rowData);
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // 4. Determine Columns Width
    worksheet.columns.forEach((column) => {
      let maxLength = 0;
      if (column && column.eachCell) {
        column.eachCell({ includeEmpty: true }, (cell) => {
          const columnLength = cell.value ? cell.value.toString().length : 10;
          if (columnLength > maxLength) {
            maxLength = columnLength;
          }
        });
      }
      column.width = maxLength < 12 ? 12 : maxLength + 2;
    });

    // 5. Generate and Save
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, filename);
  };

  const handleExportAttendance = () => {
    const headers = ['Employee', 'Date', 'Location', 'Status'];
    const data = attendance.map(r => [r.name, r.date, getEmployeeLocation(r.name), r.status]);
    generateExcel(headers, data, 'Attendance_Export.xlsx');
  };

  const handleExportPayroll = () => {
    const headers = ['Employee', 'Role', 'Base Salary', 'Bonus', 'Overtime'];
    const data = employees.map(e => [e.name, e.role, e.salary, e.bonus, e.overtime]);
    generateExcel(headers, data, 'Payroll_Export.xlsx');
  };

  const handleImportPayroll = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target.result;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1); // First sheet

      const batch = writeBatch(db);
      let updatedCount = 0;

      let headerRowIndex = 1;
      worksheet.eachRow((row, rowNumber) => {
        if (row.values.includes('Employee') || row.values.includes('Name')) {
          headerRowIndex = rowNumber;
        }
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;

        const rowVal = row.values;
        // Assume export order: [1]Name, [2]Role, [3]Salary, [4]Bonus, [5]Overtime
        const name = rowVal[1];

        if (!name) return;

        const salary = parseFloat(rowVal[3]);
        const bonus = parseFloat(rowVal[4]);
        const overtime = parseFloat(rowVal[5]);

        const emp = employees.find(e => e.name.toLowerCase() === name.toString().toLowerCase());

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
        alert(t('payrollUpdateSuccess').replace('{0}', updatedCount));
      } catch (err) {
        console.error(err);
        alert(t('payrollUpdateError') + err.message);
      }
    };
    reader.readAsArrayBuffer(file);
    event.target.value = null;
  };

  const handleImportAttendance = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (e) => {
      const buffer = e.target.result;
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1);

      const batch = writeBatch(db);
      let count = 0;

      let headerRowIndex = 1;
      worksheet.eachRow((row, rowNumber) => {
        if (row.values.includes('Employee') || row.values.includes('Name')) headerRowIndex = rowNumber;
      });

      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber <= headerRowIndex) return;

        const rowVal = row.values;
        const name = rowVal[1];
        const date = rowVal[2];
        const status = rowVal[4]; // [3] is Location usually

        if (!name || !date) return;

        const newRef = doc(collection(db, 'attendance'));
        batch.set(newRef, {
          name: name,
          date: new Date(date).toISOString().split('T')[0],
          status: status || 'Pending',
          userId: user.uid
        });
        count++;
      });

      try {
        await batch.commit();
        alert(t('importSuccess').replace('{0}', count));
      } catch (err) {
        console.error(err);
        alert(t('importError') + err.message);
      }
    }
    reader.readAsArrayBuffer(file);
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
  const [newItemForm, setNewItemForm] = useState({ name: '', quantity: 0, location: '', category: '', buyPrice: 0, sellPrice: 0, photo: '' }); // SKU removed
  const [inventorySearch, setInventorySearch] = useState('');

  const [editingItem, setEditingItem] = useState(null); // For Edit Flow

  const handleNewItemImage = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (editingItem) {
        setEditingItem({ ...editingItem, photo: reader.result });
      } else {
        setNewItemForm({ ...newItemForm, photo: reader.result });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddItem = async (e) => {
    e.preventDefault();
    if (!user) return;

    // Check for duplicates
    if (inventory.some(item => item.name.toLowerCase() === newItemForm.name.trim().toLowerCase())) {
      alert(t('itemExists') || "Item already exists!");
      return;
    }

    try {
      await addDoc(collection(db, 'inventory'), {
        ...newItemForm,
        userId: user.uid,
        updatedAt: serverTimestamp()
      });
      setIsAddItemModalOpen(false);
      setNewItemForm({ name: '', quantity: 0, location: '', category: '', buyPrice: 0, sellPrice: 0, photo: '' });
    } catch (err) {
      console.error(err);
      alert(t('addItemError') + err.message);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!user || !editingItem) return;

    // Check for duplicates (excluding current item)
    if (inventory.some(item => item.id !== editingItem.id && item.name.toLowerCase() === editingItem.name.trim().toLowerCase())) {
      alert(t('itemExists') || "Item already exists!");
      return;
    }

    try {
      await updateDoc(doc(db, 'inventory', editingItem.id), {
        name: editingItem.name,
        quantity: Number(editingItem.quantity),
        location: editingItem.location,
        category: editingItem.category,
        buyPrice: Number(editingItem.buyPrice),
        sellPrice: Number(editingItem.sellPrice),
        photo: editingItem.photo || '',
        updatedAt: serverTimestamp()
      });
      setEditingItem(null);
      setIsAddItemModalOpen(false); // Close generic modal if used, or edit modal
    } catch (err) {
      console.error(err);
      alert(t('updateError') + err.message);
    }
  };

  const handleDeleteWarehouseItem = async (id) => {
    if (!window.confirm(t('confirmDelete') || "Are you sure you want to delete this item?")) return;
    if (!user) return;
    try {
      await deleteDoc(doc(db, 'inventory', id));
      // optional: alert removed for smoother UX, or keep if consistent with other deletes
    } catch (err) {
      console.error(err);
      alert(t('deleteError') + err.message);
    }
  };

  // --- Sales & Purchases (POS) Logic ---
  const [isAddSaleModalOpen, setIsAddSaleModalOpen] = useState(false);
  const [newSaleForm, setNewSaleForm] = useState({ customer: 'Walk-in Customer', amount: 0, status: 'Completed', items: '' });
  const [orderType, setOrderType] = useState('Walk-in'); // 'Walk-in' or 'Takeaway'
  const [cart, setCart] = useState([]);

  const addToCart = (item) => {
    if (item.quantity <= 0) return;
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

    if (!salesEmployee) {
      alert(t('selectEmployeeAlert') || "Please select a sales employee!");
      return;
    }
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
        paymentMethod: paymentMethod,
        customer: newSaleForm.customer || (orderType === 'Walk-in' ? t('walkInCustomer') : t('takeawayCustomer')),
        amount: totalAmount,
        status: 'Completed',
        items: cart.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price })),
        userId: user.uid,
        soldBy: salesEmployee ? salesEmployee.name : (user.email || 'Admin'),
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
      alert(t('addPurchaseError') + err.message);
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
        items: cart.map(i => ({ id: i.id, name: i.name, qty: i.quantity, price: i.price })),
        soldBy: salesEmployee ? salesEmployee.name : (user.email || 'Admin'),
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      });
      setIsAddInvoiceModalOpen(false);
      setNewInvoiceForm({ client: '', status: 'Issued', date: new Date().toISOString().split('T')[0], items: [] });
    } catch (err) {
      console.error(err);
      alert(t('genInvoiceError') + err.message);
    }
  };

  const handlePrintInvoice = (invoiceData, type = 'Invoice') => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const styles = printFormat === 'Thermal' ? `
      @page { margin: 0; }
      body { font-family: 'Courier New', monospace; width: 80mm; padding: 10px; margin: 0 auto; color: #000; background: #fff; }
      .page { padding-bottom: 20px; display: block; position: relative; }
      .page-break { page-break-after: always; }
      
      /* Header */
      .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 8px; margin-bottom: 12px; }
      .title { font-size: 1.1em; font-weight: bold; text-transform: uppercase; margin-bottom: 3px; }
      .subtitle { font-size: 0.75em; line-height: 1.3; margin: 2px 0; }
      .invoice-title { font-size: 1em; font-weight: bold; margin: 8px 0; text-decoration: underline; }
      .seller-info { font-size: 0.75em; border: 1px dashed #000; padding: 4px; margin: 5px 0; text-align: center; }
      
      /* Details */
      .details { font-size: 0.8em; margin: 10px 0; line-height: 1.4; }
      .details p { margin: 3px 0; }
      .details strong { font-weight: bold; }
      
      /* Table */
      table { width: 100%; font-size: 0.75em; border-collapse: collapse; margin: 10px 0; }
      thead { border-bottom: 1px dashed #000; }
      th { text-align: left; padding: 5px 2px; font-weight: bold; }
      th.right { text-align: right; }
      td { padding: 5px 2px; border-bottom: 1px dotted #ccc; }
      td.right { text-align: right; }
      tbody tr:last-child td { border-bottom: none; }
      
      /* Totals */
      .totals { margin-top: 10px; border-top: 1px dashed #000; padding-top: 8px; }
      .totals-row { display: flex; justify-content: space-between; padding: 3px 0; font-size: 0.8em; }
      .totals-row.subtotal { font-weight: normal; }
      .totals-row.total { font-weight: bold; font-size: 1em; border-top: 1px solid #000; margin-top: 5px; padding-top: 5px; }
      
      /* Footer */
      .footer { text-align: center; font-size: 0.7em; margin-top: 15px; border-top: 1px dashed #000; padding-top: 8px; font-style: italic; }
      .copy-label { text-align: center; font-weight: bold; margin-bottom: 8px; text-transform: uppercase; font-size: 0.75em; border: 1px solid #000; display: inline-block; padding: 3px 8px; }
    ` : `
      @page { margin: 0; size: A4; }
      body { font-family: Arial, Helvetica, sans-serif; padding: 0; color: #333; margin: 0; background: #fff; }
      .page { padding: 50px; min-height: 90vh; position: relative; box-sizing: border-box; }
      .page-break { page-break-after: always; }
      
      /* Header */
      .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 30px; padding-bottom: 20px; border-bottom: 3px solid #4a5f8f; }
      .brand { flex: 1; }
      .brand .title { font-size: 24px; font-weight: bold; color: #333; margin: 0 0 5px 0; }
      .brand .subtitle { font-size: 11px; color: #666; line-height: 1.5; margin: 2px 0; }
      .sold-by { font-size: 12px; color: #4a5f8f; font-weight: bold; margin-top: 5px; }
      
      .invoice-info { text-align: right; }
      .invoice-info h2 { font-size: 36px; font-weight: bold; color: #7891c7; margin: 0 0 15px 0; text-transform: uppercase; }
      .invoice-info table { margin: 0; }
      .invoice-info td { padding: 4px 8px; font-size: 11px; }
      .invoice-info td:first-child { text-align: right; font-weight: bold; background: #f5f5f5; }
      .invoice-info td:last-child { text-align: left; border: 1px solid #ddd; background: #fff; }
      
      /* Bill To */
      .bill-to { background: #4a5f8f; color: #fff; padding: 8px 12px; font-weight: bold; font-size: 12px; margin: 20px 0 10px 0; }
      .bill-to-content { padding: 10px 12px; font-size: 11px; line-height: 1.6; color: #333; margin-bottom: 20px; }
      
      /* Table */
      table.items { width: 100%; border-collapse: collapse; margin: 20px 0; }
      table.items thead { background: #4a5f8f; color: #fff; }
      table.items th { padding: 12px; text-align: left; font-size: 12px; font-weight: bold; }
      table.items th.center { text-align: center; }
      table.items th.right { text-align: right; }
      table.items td { padding: 10px 12px; border-bottom: 1px solid #e0e0e0; font-size: 11px; color: #555; }
      table.items td.center { text-align: center; }
      table.items td.right { text-align: right; font-weight: bold; }
      table.items tbody tr:hover { background: #f9f9f9; }
      
      /* Totals */
      .totals-section { display: flex; justify-content: space-between; margin-top: 30px; }
      .comments { flex: 1; max-width: 50%; }
      .comments-title { background: #4a5f8f; color: #fff; padding: 8px 12px; font-weight: bold; font-size: 12px; margin-bottom: 10px; }
      .comments-content { padding: 10px 12px; font-size: 11px; line-height: 1.8; color: #555; border: 1px solid #e0e0e0; }
      
      .totals { width: 300px; }
      .totals-row { display: flex; justify-content: space-between; padding: 8px 12px; font-size: 12px; border-bottom: 1px solid #e0e0e0; }
      .totals-row strong { font-weight: bold; }
      .totals-row.total { background: #f5f5f5; font-weight: bold; font-size: 14px; border-top: 2px solid #4a5f8f; border-bottom: 2px solid #4a5f8f; margin-top: 5px; }
      
      /* Footer */
      .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #666; padding-top: 20px; border-top: 1px solid #e0e0e0; }
      .footer p { margin: 5px 0; }
      .footer .thank-you { font-style: italic; font-weight: bold; color: #333; margin-top: 10px; }
      .copy-label { position: absolute; top: 30px; right: 30px; font-size: 9px; font-weight: bold; color: #999; text-transform: uppercase; border: 1px solid #ddd; padding: 4px 8px; border-radius: 3px; background: #f9f9f9; }
    `;

    const getPageContent = (copyLabel, isFirstPage) => {
      const subtotal = Array.isArray(invoiceData.items)
        ? invoiceData.items.reduce((sum, item) => sum + ((item.price || 0) * (item.qty || item.quantity || 0)), 0)
        : invoiceData.amount || 0;
      const tax = subtotal * 0.0625; // 6.25% tax
      const total = invoiceData.amount || subtotal;

      if (printFormat === 'Thermal') {
        return `
      <div class="page ${isFirstPage && printDual ? 'page-break' : ''}">
        ${copyLabel ? `<div class="copy-label">${copyLabel}</div>` : ''}
        
        <div class="header">
          <div class="title">${shopSettings.name}</div>
          <div class="subtitle">${shopSettings.address} | ${shopSettings.phone}</div>
        </div>
        <div class="seller-info">${t('soldBy')}: ${invoiceData.soldBy || 'Admin'}</div>
        <div class="invoice-title">${t('retailInvoice')}</div>

        <div class="details">
          <p><strong>${t('date')}:</strong> ${invoiceData.date || new Date().toLocaleDateString()}</p>
          <p><strong>${invoiceData.client || invoiceData.customer || t('customer')}</strong></p>
          <p><strong>${t('billNo')}:</strong> ${invoiceData.invoiceId || 'N/A'}</p>
          <p><strong>${t('paymentMode')}:</strong> ${invoiceData.paymentMethod || t('cash')}</p>
        </div>

        <table>
          <thead>
            <tr>
              <th>${t('item')}</th>
              <th class="right">${t('qty')}</th>
              <th class="right">${t('amt')}</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(invoiceData.items) ? invoiceData.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="right">${item.qty || item.quantity}</td>
              <td class="right">${formatCurrency((item.price || 0) * (item.qty || item.quantity || 0))}</td>
            </tr>
            `).join('') : `<tr><td colspan="3">${invoiceData.items}</td></tr>`}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row subtotal">
            <span>${t('subtotal')}</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          <div class="totals-row total">
            <span>${t('total')}</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${t('thankYou')}</p>
        </div>
      </div>
        `;
      } else {
        // A4 Format
        return `
      <div class="page ${isFirstPage && printDual ? 'page-break' : ''}">
        ${copyLabel ? `<div class="copy-label">${copyLabel}</div>` : ''}
        
        <div class="header">
          <div class="brand">
            <div class="title">${shopSettings.name}</div>
            <div class="subtitle">${shopSettings.address}</div>
            <div class="subtitle">${t('phone')}: ${shopSettings.phone}</div>
            <div class="sold-by">${t('soldBy')}: ${invoiceData.soldBy || 'Admin'}</div>
          </div>
          <div class="invoice-info">
            <h2>${t('invoice')}</h2>
            <table>
              <tr><td>${t('date').toUpperCase()}</td><td>${invoiceData.date || new Date().toLocaleDateString()}</td></tr>
              <tr><td>${t('invoice').toUpperCase()} #</td><td>${invoiceData.invoiceId || 'N/A'}</td></tr>
              <tr><td>${t('customerId').toUpperCase()}</td><td>${invoiceData.customerId || '123'}</td></tr>
              <tr><td>${t('paymentMode').toUpperCase()}</td><td>${invoiceData.paymentMethod || 'Cash'}</td></tr>
            </table>
          </div>
        </div>

        <div class="bill-to">${t('billTo')}</div>
        <div class="bill-to-content">
          <strong>${invoiceData.client || invoiceData.customer || 'Customer Name'}</strong>
        </div>

        <table class="items">
          <thead>
            <tr>
              <th>${t('description')}</th>
              <th class="center">${t('taxed')}</th>
              <th class="right">${t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(invoiceData.items) ? invoiceData.items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td class="center">X</td>
              <td class="right">${formatCurrency((item.price || 0) * (item.qty || item.quantity || 1))}</td>
            </tr>
            `).join('') : `<tr><td colspan="3">${invoiceData.items}</td></tr>`}
          </tbody>
        </table>

        <div class="totals-section">
          <div class="comments">
            <div class="comments-title">${t('comments')}</div>
            <div class="comments-content">
              ${t('paymentTerms') || '1. Total payment due in 30 days'}<br>
              ${t('includeInvoiceNumber') || '2. Please include the invoice number on your check'}
            </div>
          </div>
          <div class="totals">
            <div class="totals-row">
              <span>${t('subtotal')}</span>
              <span>${formatCurrency(subtotal)}</span>
            </div>
            <div class="totals-row">
              <span>${t('taxVAT')}</span>
              <span>${formatCurrency(tax)}</span>
            </div>
            <div class="totals-row">
              <span>${t('taxRate')}</span>
              <span>6.250%</span>
            </div>
            <div class="totals-row total">
              <span>${t('total')}</span>
              <span>$ ${formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div class="footer">
          <p>${t('makeChecksPayable')} <strong>${shopSettings.name}</strong></p>
          <p>${t('contactQuestions')}</p>
          <p>${shopSettings.name}, ${t('phone')}: ${shopSettings.phone}</p>
          <p class="thank-you">${t('thankYou')}</p>
        </div>
      </div>
        `;
      }
    };

    // Explicitly handle dual printing by concatenating copies
    let finalHtml = getPageContent(printDual ? t('customerCopy') : '', true);
    if (printDual) {
      finalHtml += getPageContent(t('shopCopy'), false);
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

  // Print Payroll Slip
  const handlePrintPayrollSlip = (employee, payrollData, month) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      alert('Please allow popups to print payroll slip');
      return;
    }

    // Get translated month name based on current language
    const locale = language === 'ar' ? 'ar-EG' : language === 'hi' ? 'hi-IN' : language === 'zh' ? 'zh-CN' : 'en-US';
    const monthName = new Date(month + '-01').toLocaleDateString(locale, { month: 'long', year: 'numeric' });
    const currentDate = new Date().toLocaleDateString(locale);
    const currentTime = new Date().toLocaleTimeString(locale);

    // Pre-translate all strings (t() function won't work in print window)
    const translatedStrings = {
      payrollSlip: t('payrollSlip'),
      employeeName: t('employeeName'),
      department: t('department'),
      role: t('role'),
      location: t('location'),
      payPeriod: t('payPeriod'),
      description: t('description'),
      amount: t('amount'),
      basicSalary: t('basicSalary'),
      bonus: t('bonus'),
      overtime: t('overtime'),
      grossPay: t('grossPay'),
      lateDeductions: t('lateDeductions'),
      absentDeductions: t('absentDeductions'),
      advanceSalary: t('advanceSalary') || 'Advance Salary',
      totalDeductions: t('totalDeductions'),
      netPay: t('netPay'),
      employeeSignature: t('employeeSignature'),
      authorizedSignature: t('authorizedSignature'),
      computerGenerated: t('computerGenerated'),
      generatedOn: t('generatedOn'),
      at: t('at'),
      phone: t('phone'),
      companyName: shopSettings.name || t('companyName'),
      companyAddress: shopSettings.address || t('companyAddress')
    };

    const styles = `
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Arial', sans-serif; padding: 20px; background: #f5f5f5; }
        .slip { background: white; max-width: 700px; margin: 0 auto; padding: 25px; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 12px; margin-bottom: 20px; }
        .header h1 { color: #1e40af; font-size: 22px; margin-bottom: 3px; }
        .header p { color: #64748b; font-size: 12px; margin: 2px 0; }
        .title { text-align: center; color: #1e40af; margin-bottom: 20px; font-size: 18px; font-weight: 700; }
        .info-section { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin-bottom: 20px; }
        .info-box { background: #f8fafc; padding: 10px; border-radius: 6px; border-left: 3px solid #3b82f6; }
        .info-box label { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: 600; display: block; margin-bottom: 3px; }
        .info-box value { font-size: 13px; color: #1e293b; font-weight: 600; }
        .salary-table { width: 100%; border-collapse: collapse; margin: 15px 0; }
        .salary-table th { background: #f1f5f9; padding: 8px; text-align: left; font-size: 11px; color: #475569; border-bottom: 2px solid #e2e8f0; }
        .salary-table td { padding: 8px; border-bottom: 1px solid #e2e8f0; font-size: 12px; }
        .salary-table tr:last-child td { border-bottom: none; }
        .amount { text-align: right; font-family: 'Courier New', monospace; font-weight: 600; }
        .positive { color: #16a34a; }
        .negative { color: #dc2626; }
        .total-row { background: #eff6ff; font-weight: 700; font-size: 14px; }
        .total-row td { padding: 10px 8px; border-top: 2px solid #3b82f6; }
        .footer { margin-top: 25px; padding-top: 12px; border-top: 1px solid #e2e8f0; text-align: center; color: #64748b; font-size: 10px; }
        .signature-section { display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-top: 30px; }
        .signature-box { text-align: center; }
        .signature-line { border-top: 1px solid #1e293b; padding-top: 8px; margin-top: 35px; font-weight: 600; color: #475569; font-size: 11px; }
        @media print {
          body { padding: 0; background: white; }
          .slip { box-shadow: none; padding: 15px; }
          .header { padding-bottom: 10px; margin-bottom: 15px; }
          .info-section { margin-bottom: 15px; gap: 10px; }
          .salary-table { margin: 10px 0; }
          .signature-section { margin-top: 20px; }
        }
      </style>
    `;

    const content = `
      <html>
        <head>
          <title>${translatedStrings.payrollSlip} - ${employee.name}</title>
          ${styles}
        </head>
        <body>
          <div class="slip">
            <div class="header">
              <h1>${translatedStrings.companyName}</h1>
              <p>${translatedStrings.companyAddress}</p>
              <p>${translatedStrings.phone}: ${shopSettings.phone || 'N/A'}</p>
            </div>

            <div class="title">${translatedStrings.payrollSlip}</div>

            <div class="info-section">
              <div class="info-box">
                <label>${translatedStrings.employeeName}</label>
                <value>${employee.name}</value>
              </div>
              <div class="info-box">
                <label>${translatedStrings.department}</label>
                <value>${employee.dept}</value>
              </div>
              <div class="info-box">
                <label>${translatedStrings.role}</label>
                <value>${employee.role}</value>
              </div>
              <div class="info-box">
                <label>${translatedStrings.location}</label>
                <value>${employee.location}</value>
              </div>
              <div class="info-box">
                <label>${translatedStrings.payPeriod}</label>
                <value>${monthName}</value>
              </div>
            </div>

            <table class="salary-table">
              <thead>
                <tr>
                  <th>${translatedStrings.description}</th>
                  <th class="amount">${translatedStrings.amount}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td><strong>${translatedStrings.basicSalary}</strong></td>
                  <td class="amount">${formatCurrency(payrollData.baseSalary)}</td>
                </tr>
                <tr>
                  <td>${translatedStrings.bonus}</td>
                  <td class="amount positive">+ ${formatCurrency(payrollData.bonus)}</td>
                </tr>
                <tr>
                  <td>${translatedStrings.overtime}</td>
                  <td class="amount positive">+ ${formatCurrency(payrollData.overtime)}</td>
                </tr>
                <tr>
                  <td><strong>${translatedStrings.grossPay}</strong></td>
                  <td class="amount"><strong>${formatCurrency(payrollData.baseSalary + payrollData.bonus + payrollData.overtime)}</strong></td>
                </tr>
                <tr style="height: 8px;"><td colspan="2"></td></tr>
                <tr>
                  <td>${translatedStrings.lateDeductions}</td>
                  <td class="amount negative">- ${formatCurrency(payrollData.lateDeduction)}</td>
                </tr>
                <tr>
                  <td>${translatedStrings.absentDeductions}</td>
                  <td class="amount negative">- ${formatCurrency(payrollData.absentDeduction)}</td>
                </tr>
                <tr>
                  <td>${translatedStrings.advanceSalary}</td>
                  <td class="amount negative">- ${formatCurrency(payrollData.advanceSalary)}</td>
                </tr>
                <tr>
                  <td><strong>${translatedStrings.totalDeductions}</strong></td>
                  <td class="amount negative"><strong>- ${formatCurrency(payrollData.deductionAmount)}</strong></td>
                </tr>
                <tr class="total-row">
                  <td>${translatedStrings.netPay}</td>
                  <td class="amount">${formatCurrency(payrollData.netPay)}</td>
                </tr>
              </tbody>
            </table>

            <div class="signature-section">
              <div class="signature-box">
                <div class="signature-line">${translatedStrings.employeeSignature}</div>
              </div>
              <div class="signature-box">
                <div class="signature-line">${translatedStrings.authorizedSignature}</div>
              </div>
            </div>

            <div class="footer">
              <p>${translatedStrings.computerGenerated}</p>
              <p>${translatedStrings.generatedOn} ${currentDate} ${translatedStrings.at} ${currentTime}</p>
            </div>
          </div>
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
      alert(t('errorNoUser'));
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
      alert(t('employeeSaved')); // Debug Confirmation
      setIsAddModalOpen(false);
      setNewEmployeeForm({ name: '', role: '', dept: 'Security', location: '', shift: 'Morning (12 Hours)', salary: 60000, bonus: 0, overtime: 0, deductionHours: 0, photo: '' });
    } catch (err) {
      console.error(err);
      alert(t('saveError') + err.message);
    }
  };

  const handleDeleteEmployee = async (id) => {
    if (!user) return;
    if (window.confirm(t('deleteConfirm'))) {
      await deleteDoc(doc(db, 'employees', id));
      setSelectedEmployee(null);
    }
  };

  const handleUpdateEmployee = async (id, field, value) => {
    if (!user) return;

    // Name Propagation
    if (field === 'name' && selectedEmployee && selectedEmployee.id === id) {
      const oldName = selectedEmployee.name;
      const newName = value;
      try {
        const batch = writeBatch(db);
        const q = query(collection(db, 'attendance'), where('name', '==', oldName));
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach((doc) => {
          batch.update(doc.ref, { name: newName });
        });
        await batch.commit();
      } catch (err) {
        console.error("Error propagating name change:", err);
      }
    }

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
      alert(t('deleteLocationWarning'));
      return;
    }
    if (window.confirm(t('deleteLocationConfirm'))) {
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
    let headers = [], data = [], filename = '', extraMetadata = [];

    // Helper to translate status
    const translateStatus = (s) => {
      if (s === 'On Time') return t('onTime');
      if (s === 'Late') return t('late');
      if (s === 'Absent') return t('absent');
      return s;
    };

    switch (reportType) {
      case 'attendance':
        headers = [t('employeeName'), t('date'), t('location'), t('status')];
        data = attendance.map(r => [r.name, r.date, getEmployeeLocation(r.name), translateStatus(r.status)]);
        filename = 'FinnERP_Attendance.xlsx';
        break;
      case 'payroll':
        headers = [t('employeeName'), t('role'), t('dept'), `${t('basicSalary')} (${currency})`, `${t('bonus')} (${currency})`, `${t('overtime')} (${currency})`, `${t('total')} (${currency})`];
        data = employees.map(e => [e.name, e.role, e.dept, e.salary, e.bonus, e.overtime, e.salary + e.bonus + e.overtime]);

        // Add Totals Row
        const totalSalary = employees.reduce((sum, e) => sum + (e.salary || 0), 0);
        const totalBonus = employees.reduce((sum, e) => sum + (e.bonus || 0), 0);
        const totalOvertime = employees.reduce((sum, e) => sum + (e.overtime || 0), 0);
        const totalTotal = employees.reduce((sum, e) => sum + (e.salary || 0) + (e.bonus || 0) + (e.overtime || 0), 0);

        // Add empty row then totals
        data.push([]);
        data.push(['', '', t('dashboardTotal').toUpperCase(), totalSalary, totalBonus, totalOvertime, totalTotal]);

        extraMetadata = [`${t('payPeriod')}: ${payrollMonthFilter}`];
        filename = 'FinnERP_Payroll.xlsx';
        break;
      case 'turnover':
        headers = [t('employeeName'), t('role'), t('dept'), t('status'), t('location')];
        data = employees.map(e => [e.name, e.role, e.dept, e.status, e.location]);
        filename = 'FinnERP_Staff.xlsx';
        break;
      case 'tax':
        headers = [t('employeeName'), `${t('total')} (${currency})`, `${t('tax')} (20%)`, t('netPay')];
        data = employees.map(e => {
          const total = e.salary + e.bonus + e.overtime;
          const tax = total * 0.2;
          return [e.name, total, tax, total - tax];
        });
        filename = 'FinnERP_Tax.xlsx';
        break;
      case 'weekly_sales':
        headers = [t('date'), t('invoiceId'), t('type'), t('customer'), t('itemsSummary'), t('total')];
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
            const typeLabel = s.orderType === 'Walk-in' ? t('walkIn') : (s.orderType === 'Takeaway' ? t('takeaway') : s.orderType);

            return [
              date.toLocaleString(),
              s.invoiceId || 'N/A',
              typeLabel,
              s.customer || t('walkInCustomer'),
              itemsSummary,
              s.amount
            ];
          });
        filename = 'Weekly_Sales_Report.xlsx';
        break;
      case 'weekly_buy':
        // For "Buy Report", we look at Inventory items updated recently
        headers = [t('lastUpdated'), t('itemName'), t('location'), t('buyPrice'), t('sellPrice'), t('quantity'), t('stockValueBuy'), t('stockValueSell')];
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
        filename = 'Weekly_Inventory_Buy_Report.xlsx';
        break;
      default: return;
    }
    generateExcel(headers, data, filename, extraMetadata);
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
    <div className="flex h-screen bg-gray-50 font-sans text-gray-900 overflow-hidden">
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
          <div className="my-2 border-t border-slate-700/50"></div>



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
            <h2 className="text-lg md:text-xl font-bold text-gray-800 flex items-center gap-2">
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

          <div className="hidden sm:flex items-center gap-4">
            <div className="flex items-center gap-2">
              {/* Currency Selector */}
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="bg-gray-100 border-none text-sm font-medium text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 cursor-pointer focus:ring-0"
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="GBP">GBP</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
                <option value="INR">INR</option>
                <option value="CNY">CNY</option>
                <option value="JPY">JPY</option>
                <option value="CAD">CAD</option>
                <option value="AUD">AUD</option>
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
        <div className="flex-1 overflow-auto p-4 md:p-6 lg:p-8 bg-gray-50">

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
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('allEmployees')}</h3>
                  <p className="text-sm text-gray-500">{t('manageStaff')}</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                  <select
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                    value={employeeLocationFilter}
                    onChange={e => setEmployeeLocationFilter(e.target.value)}
                  >
                    <option value="">{t('filterAll')}</option>
                    {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <button onClick={() => setIsAddModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20 transition-all w-full sm:w-auto">
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
                        <div className="flex items-center gap-2"><Briefcase size={14} className="text-gray-400" /> {translations[language]?.[(emp.dept || '').toLowerCase()] || emp.dept}</div>
                        <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /> {emp.location || t('unassigned')}</div>
                        <div className="flex items-center gap-2"><Clock size={14} className="text-gray-400" /> {emp.shift === 'Morning (12 Hours)' ? t('morning12') : emp.shift === 'Night (12 Hours)' ? t('night12') : emp.shift}</div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {activeTab === 'sites' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">{t('filterAll')}</h3>
                  <p className="text-sm text-gray-500">{t('manageDetails')}</p>
                </div>
                <button onClick={() => setIsAddSiteModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all w-full sm:w-auto">
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
                <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
                  <select
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-full sm:w-auto"
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
                    className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-full sm:w-auto"
                    value={attendanceDateFilter}
                    onChange={(e) => setAttendanceDateFilter(e.target.value)}
                  />

                  <button onClick={() => setIsAddAttendanceModalOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2 w-full sm:w-auto">
                    <Plus size={16} /> {t('addAttendance')}
                  </button>

                  <div className="hidden md:block h-6 w-px bg-gray-200 mx-1"></div>

                  <label className="flex items-center gap-2 bg-gray-50 px-3 py-2.5 rounded-lg cursor-pointer border hover:bg-gray-100 transition-colors w-full sm:w-auto justify-center">
                    <Upload size={16} className="text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">{t('import')}</span>
                    <input type="file" accept=".xlsx" onChange={handleImportAttendance} className="hidden" />
                  </label>
                  <button onClick={handleExportAttendance} className="flex items-center justify-center gap-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2.5 rounded-lg transition-colors w-full sm:w-auto">
                    <Download size={16} /> {t('export')}
                  </button>
                </div>
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="w-full text-sm text-left min-w-[640px]">
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
          )
          }

          {
            activeTab === 'payroll' && (
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">{t('payrollMgmt')}</h3>
                    <p className="text-sm text-slate-500">{t('costAnalysis')}</p>
                  </div>
                  <div className="flex flex-wrap gap-3 w-full md:w-auto">
                    <select
                      className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-full sm:w-auto"
                      value={payrollLocationFilter}
                      onChange={(e) => setPayrollLocationFilter(e.target.value)}
                    >
                      <option value="">{t('filterAll')}</option>
                      {sites.map(site => (
                        <option key={site.id} value={site.name}>{site.name}</option>
                      ))}
                    </select>

                    <input
                      type="month"
                      className="bg-white border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2.5 w-full sm:w-auto"
                      value={payrollMonthFilter}
                      onChange={(e) => setPayrollMonthFilter(e.target.value)}
                    />

                    <label className="flex items-center justify-center gap-2 bg-white border border-gray-300 px-3 py-2.5 rounded-lg cursor-pointer hover:bg-gray-50 text-sm font-medium w-full sm:w-auto">
                      <Upload size={16} /> {t('import')}
                      <input type="file" accept=".xlsx" onChange={handleImportPayroll} className="hidden" />
                    </label>
                    <button onClick={handleExportPayroll} className="bg-white border border-gray-300 px-3 py-2.5 rounded-lg flex items-center justify-center gap-2 text-sm font-medium hover:bg-gray-50 w-full sm:w-auto">
                      <Download size={16} /> {t('export')}
                    </button>
                  </div>
                </div>

                {/* Month Period Indicator */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 rounded-lg p-4 flex items-center gap-3 shadow-sm">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{t('payPeriod')}</div>
                    <div className="text-base font-bold text-gray-900 mt-0.5">
                      {new Date(payrollMonthFilter + '-01').toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'hi' ? 'hi-IN' : language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
                    </div>
                  </div>
                </div>


                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                  <table className="w-full text-sm text-left min-w-[900px]">
                    <thead className="bg-gray-50 text-gray-500 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-3">{t('name')}</th>
                        <th className="px-6 py-3">{t('location')}</th>
                        <th className="px-6 py-3">{t('role')}</th>
                        <th className="px-6 py-3 text-right">{t('salary')}</th>
                        <th className="px-6 py-3 text-right">{t('bonus')}</th>
                        <th className="px-6 py-4 font-semibold text-gray-900">{t('overtime')}</th>
                        <th className="px-6 py-4 font-semibold text-gray-900 text-red-600">{t('advance') || 'Advance'}</th>
                        <th className="px-6 py-4 font-semibold text-right text-amber-600">{t('late')}</th>
                        <th className="px-6 py-3 text-right text-red-600">{t('absent')}</th>
                        <th className="px-6 py-3 text-right text-red-800">{t('deductions')}</th>
                        <th className="px-6 py-3 text-right">{t('netPay')}</th>
                        <th className="px-6 py-3 text-center">{t('actions')}</th>
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

                          // Filter attendance by selected month
                          const empAttendance = attendance.filter(a => {
                            if (a.name !== emp.name) return false;
                            // Check if attendance date is in selected month
                            if (!a.date) return false;

                            // Handle different date formats
                            let attendanceMonth;
                            if (typeof a.date === 'string') {
                              attendanceMonth = a.date.substring(0, 7); // YYYY-MM
                            } else if (a.date.toDate) {
                              // Firestore Timestamp
                              attendanceMonth = a.date.toDate().toISOString().substring(0, 7);
                            } else if (a.date instanceof Date) {
                              attendanceMonth = a.date.toISOString().substring(0, 7);
                            } else {
                              return false;
                            }

                            return attendanceMonth === payrollMonthFilter;
                          });

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
                          deductionAmount += Number(emp.advanceSalary || 0);

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
                              <td className="px-6 py-4 text-right font-mono text-red-600">-{formatCurrency(emp.advanceSalary || 0)}</td>

                              {/* Detailed Deductions Columns */}
                              <td className="px-6 py-4 text-right font-mono text-amber-600">
                                {lateDeduction > 0 ? `-${formatCurrency(lateDeduction)}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-red-600">
                                {absentDeduction > 0 ? `-${formatCurrency(absentDeduction)}` : '-'}
                              </td>
                              <td className="px-6 py-4 text-right font-mono text-red-800 font-bold">-{formatCurrency(deductionAmount)}</td>
                              <td className="px-6 py-4 text-right font-bold text-gray-900">{formatCurrency(netPay)}</td>
                              <td className="px-6 py-4 text-center">
                                <button
                                  onClick={() => handlePrintPayrollSlip(emp, {
                                    baseSalary,
                                    bonus,
                                    overtime,
                                    lateDeduction,
                                    absentDeduction,
                                    manualDeduction,
                                    deductionAmount,
                                    advanceSalary: emp.advanceSalary || 0,
                                    netPay
                                  }, payrollMonthFilter)}
                                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                                  title="Print Payroll Slip"
                                >
                                  <Printer size={16} /> Print
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div >
            )
          }

          {
            activeTab === 'reports' && (
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
            )
          }

          {/* --- New Modules Views --- */}

          {
            activeTab === 'accounts' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('menuAccounts')}</h2>
                    <p className="text-sm text-gray-500">Track assets, liabilities, and expenses.</p>
                  </div>
                  <button onClick={() => setIsAddAccountModalOpen(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto">
                    <Plus size={20} /> Add Account
                  </button>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                  <table className="w-full text-left min-w-[500px]">
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
            )
          }

          {
            activeTab === 'sales_purchases' && (
              <div className="flex flex-col lg:flex-row h-auto lg:h-[calc(100vh-140px)] gap-4 lg:gap-6 animate-in fade-in duration-500">
                {/* Left: Product Grid */}
                <div className="flex-1 flex flex-col gap-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                      <h2 className="text-lg sm:text-xl font-bold text-gray-900">{shopSettings.name || t('posTerminal')}</h2>
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
                    <div className="relative w-full sm:w-64">
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

                  <div className="flex-1 overflow-y-auto bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-h-[400px] lg:max-h-none">
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                      {inventory
                        .filter(item => (item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()))
                        .map(item => (
                          <button
                            key={item.id}
                            onClick={() => addToCart(item)}
                            disabled={item.quantity <= 0}
                            className={`flex flex-col items-start p-4 border border-gray-100 rounded-xl transition-all group text-left ${item.quantity <= 0 ? 'bg-gray-100 opacity-60 cursor-not-allowed' : 'bg-gray-50 hover:bg-blue-50 hover:border-blue-200'}`}
                          >
                            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center mb-3 shadow-sm group-hover:scale-110 transition-transform overflow-hidden">
                              {item.photo ? (
                                <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={20} className="text-gray-500 group-hover:text-blue-600" />
                              )}
                            </div>
                            <h4 className="font-bold text-gray-900 line-clamp-1">{item.name}</h4>
                            <span className="text-xs text-gray-500 mb-2">{item.location}</span>
                            <div className="mt-auto w-full flex justify-between items-center">
                              <span className="font-mono font-bold text-blue-600">{formatCurrency(item.sellPrice || 0)}</span>
                              {item.quantity <= 0 ? (
                                <span className="text-xs font-bold px-2 py-0.5 rounded bg-red-100 text-red-600">Out of Stock</span>
                              ) : (
                                <span className="text-xs font-medium px-2 py-0.5 rounded bg-gray-200 text-gray-600">{item.quantity} left</span>
                              )}
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>

                  {/* Daily History Toggle / View */}
                  <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 max-h-48 overflow-y-auto">
                    <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><Clock size={16} /> {t('todaysSales')}</h3>
                    <table className="w-full text-sm text-left">
                      <thead className="bg-gray-50 sticky top-0"><tr><th className="p-2">{t('time')}</th><th className="p-2">{t('invoiceId')} #</th><th className="p-2">{t('amount')}</th><th className="p-2">{t('items')}</th><th className="p-2">{t('actions')}</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {sales
                          .filter(s => s.date === new Date().toISOString().split('T')[0])
                          .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                          .map(s => (
                            <tr key={s.id}>
                              <td className="p-2 text-gray-500">{s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</td>
                              <td className="p-2 font-mono text-xs text-blue-600 font-bold">{s.invoiceId || '-'}</td>
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
                <div className="w-full lg:w-96 bg-white flex flex-col rounded-xl shadow-xl border border-gray-100 overflow-hidden h-[calc(100vh-140px)]">
                  <div className="p-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
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
                        <div key={item.id} className="flex justify-between items-center bg-gray-50 p-2 rounded-lg border border-gray-100 group">
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

                  <div className="p-3 bg-gray-50 border-t border-gray-200">
                    <div className="space-y-1 mb-2">
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
                    {/* Sales Employee Selection */}
                    <div className="mb-2">
                      <button
                        onClick={() => { setPinAction('changeSalesEmployee'); setIsPinModalOpen(true); }}
                        className="w-full flex items-center justify-between p-2 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <User size={18} className="text-blue-600" />
                          <div className="text-left">
                            <div className="text-xs text-blue-500 font-bold uppercase tracking-wide">{t('salesEmployee')}</div>
                            <div className="font-bold text-gray-900">{salesEmployee ? salesEmployee.name : t('selectEmployee') || 'Select Employee'}</div>
                          </div>
                        </div>
                        <ChevronDown size={16} className="text-blue-400" />
                      </button>
                    </div>

                    {/* Order Type Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg mb-2">
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
                      className="w-full mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                      placeholder={t('customerNameOptional')}
                      value={newSaleForm.customer}
                      autoComplete="off"
                      onChange={e => setNewSaleForm({ ...newSaleForm, customer: e.target.value })}
                    />

                    <div className="grid grid-cols-3 gap-2 mb-2">
                      {['Cash', 'Visa', 'Online'].map(method => (
                        <button
                          key={method}
                          onClick={() => setPaymentMethod(method)}
                          className={`py-1 text-sm font-bold rounded-lg border transition-colors ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'}`}
                        >
                          {method === 'Online' ? (t('onlinePayment') || method) : (t(method.toLowerCase()) || method)}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleCheckout}
                      disabled={cart.length === 0}
                      className="w-full bg-blue-600 text-white py-2 rounded-xl font-bold text-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
                    >
                      <CheckCircle size={20} /> {t('checkout')}
                    </button>
                  </div>
                </div>
              </div>
            )
          }

          {
            activeTab === 'warehouses' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('menuWarehouses')}</h2>
                    <p className="text-sm text-gray-500">{t('inventorySubtitle')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => {
                        if (showSensitiveData) {
                          setShowSensitiveData(false);
                        } else {
                          setPinAction('showCosts');
                          setIsPinModalOpen(true);
                        }
                      }}
                      className={`px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 font-medium transition-all w-full sm:w-auto ${showSensitiveData ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                      {showSensitiveData ? <Shield size={20} /> : <Shield size={20} />} {showSensitiveData ? t('hideCosts') : t('showCosts')}
                    </button>
                    <button onClick={() => setIsAddItemModalOpen(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto">
                      <Plus size={20} /> {t('addItem')}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                  <div className="p-4 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                      <input
                        type="text"
                        placeholder={t('searchInventory')}
                        className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={inventorySearch}
                        onChange={(e) => setInventorySearch(e.target.value)}
                        autoComplete="new-password"
                        name="search-inventory-xyz-unique"
                        data-form-type="other"
                        readOnly
                        onFocus={(e) => e.target.removeAttribute('readonly')}
                      />
                    </div>
                  </div>
                  <table className="w-full text-left min-w-[640px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-gray-900">{t('image') || 'Image'}</th>
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
                              <td className="px-6 py-4">
                                <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-100 overflow-hidden">
                                  {item.photo ? (
                                    <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={20} className="text-gray-400" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4 font-medium text-gray-900">{item.name}</td>
                              <td className="px-6 py-4 text-gray-500">{item.location}</td>
                              <td className="px-6 py-4 text-right font-mono text-gray-500">
                                {showSensitiveData ? formatCurrency(item.buyPrice || 0) : '****'}
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">{formatCurrency(item.sellPrice || 0)}</td>
                              <td className="px-6 py-4 text-right font-mono font-bold text-gray-900">
                                {item.quantity === 0 ? (
                                  <span className="flex items-center justify-end gap-1 text-red-600">
                                    <AlertCircle size={14} /> Out of Stock
                                  </span>
                                ) : (
                                  item.quantity
                                )}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <button onClick={() => { setEditingItem(item); setIsAddItemModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors font-medium text-sm">
                                  {t('edit') || 'Edit'}
                                </button>
                                <button onClick={() => handleDeleteWarehouseItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors font-medium text-sm ml-2">
                                  {t('delete')}
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }

          {
            activeTab === 'history' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-900">{t('historyLog')}</h2>
                    <p className="text-sm text-gray-500">{t('historySubtitle')}</p>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                    <select
                      value={historyFilter}
                      onChange={(e) => setHistoryFilter(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                    >
                      <option value="All">{t('allTypes')}</option>
                      <option value="Sale">{t('sales')}</option>
                      <option value="Stock Update">{t('stockUpdates')}</option>
                    </select>
                    <input
                      type="date"
                      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm w-full sm:w-auto"
                      value={historyDateFilter}
                      onChange={(e) => setHistoryDateFilter(e.target.value)}
                    />
                  </div>
                </div>

                {/* Income Summary Dashboard */}
                {(() => {
                  const relevantSales = sales.filter(s => {
                    const sDate = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000).toISOString().split('T')[0] : s.date;
                    return !historyDateFilter || sDate === historyDateFilter;
                  });
                  const total = relevantSales.reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                  const cash = relevantSales.filter(s => (s.paymentMethod || 'Cash') === 'Cash').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                  const visa = relevantSales.filter(s => s.paymentMethod === 'Visa').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);
                  const online = relevantSales.filter(s => s.paymentMethod === 'Online').reduce((sum, s) => sum + (Number(s.amount) || 0), 0);

                  return (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={24} /></div>
                        <div><p className="text-sm text-gray-500">{t('totalIncome') || 'Total Income'}</p><h3 className="text-xl font-bold text-gray-900">{formatCurrency(total)}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-green-50 text-green-600 rounded-lg"><DollarSign size={24} /></div>
                        <div><p className="text-sm text-gray-500">{t('cash') || 'Cash'}</p><h3 className="text-xl font-bold text-gray-900">{formatCurrency(cash)}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><CreditCard size={24} /></div>
                        <div><p className="text-sm text-gray-500">{t('visa') || 'Visa'}</p><h3 className="text-xl font-bold text-gray-900">{formatCurrency(visa)}</h3></div>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Globe size={24} /></div>
                        <div><p className="text-sm text-gray-500">{t('onlinePayment') || 'Online'}</p><h3 className="text-xl font-bold text-gray-900">{formatCurrency(online)}</h3></div>
                      </div>
                    </div>
                  );
                })()}

                <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-x-auto">
                  <table className="w-full text-left min-w-[640px]">
                    <thead className="bg-gray-50 border-b border-gray-100">
                      <tr>
                        <th className="px-6 py-4 font-semibold text-gray-900">{t('time')}</th>
                        <th className="px-6 py-4 font-semibold text-gray-900">{t('type')}</th>
                        <th className="px-6 py-4 font-semibold text-gray-900">{t('description')}</th>
                        <th className="px-6 py-4 font-semibold text-gray-900">{t('paymentMode') || 'Payment Mode'}</th>
                        <th className="px-6 py-4 font-semibold text-right text-gray-900">{t('valueStatus')}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(() => {
                        // Merge Sales and Relevant Inventory Updates
                        const logs = [
                          ...sales.map(s => ({
                            id: 'sale-' + s.id,
                            type: t('sales'),
                            category: 'Sale',
                            date: s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date),
                            desc: `${t('sold')} ${Array.isArray(s.items) ? s.items.length : 1} ${t('items')} ${t('to')} ${s.customer || t('walkIn')}`,
                            val: s.amount,
                            isCurrency: true,
                            paymentMethod: s.paymentMethod
                          })),
                          ...inventory.map(i => ({
                            id: 'inv-' + i.id,
                            type: t('stockUpdates'),
                            category: 'Stock Update',
                            date: i.updatedAt?.seconds ? new Date(i.updatedAt.seconds * 1000) : new Date(), // Fallback if no update time
                            desc: `${t('stockCheck')}: ${i.name} @ ${i.location}`,
                            val: `${i.quantity} ${t('units')}`,
                            isCurrency: false,
                            paymentMethod: null
                          }))
                        ].sort((a, b) => b.date - a.date);

                        // Apply Filters
                        let filteredLogs = historyFilter === 'All' ? logs : logs.filter(l => l.category === historyFilter);

                        // Apply Date Filter
                        if (historyDateFilter) {
                          filteredLogs = filteredLogs.filter(l => {
                            const logDate = new Date(l.date).toISOString().split('T')[0];
                            return logDate === historyDateFilter;
                          });
                        }

                        if (filteredLogs.length === 0) return <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t('noHistory')}</td></tr>;

                        return filteredLogs.map(log => (
                          <tr key={log.id} className="hover:bg-gray-50">
                            <td className="px-6 py-4 text-gray-500 font-mono text-sm">{log.date.toLocaleString()}</td>
                            <td className="px-6 py-4"><span className={`px-2 py-1 rounded text-xs font-bold ${log.category === 'Sale' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>{log.type}</span></td>
                            <td className="px-6 py-4 text-gray-900">{log.desc}</td>
                            <td className="px-6 py-4 text-gray-900">
                              {log.paymentMethod ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                                  {log.paymentMethod === 'Online' ? (t('onlinePayment') || 'Online') : (t(log.paymentMethod.toLowerCase()) || log.paymentMethod)}
                                </span>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-right font-bold text-gray-900">{log.isCurrency ? formatCurrency(log.val) : log.val}</td>
                          </tr>
                        ));
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          }
        </div >
      </main >

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
                  {(shopSettings.departments || ['Security', 'Operations', 'HR', 'IT', 'Sales', 'Marketing', 'Kitchen', 'Service', 'Bar', 'Retail', 'Warehouse', 'Inventory', 'Accounts', 'Management', 'Cleaning', 'Maintenance']).map(d => (
                    <option key={d} value={d}>{translations[language]?.[d.toLowerCase()] || d}</option>
                  ))}
                </select>

                <select className="input-field" value={newEmployeeForm.location} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, location: e.target.value })} required>
                  {sites.length === 0 ? (
                    <option value="">{t('noLocations') || 'No locations available - Please create a location first'}</option>
                  ) : (
                    <>
                      <option value="">{t('selectLocation') || 'Select Location'}</option>
                      {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </>
                  )}
                </select>

                <select className="input-field" value={newEmployeeForm.shift} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, shift: e.target.value })}>
                  {shifts.map(s => <option key={s} value={s}>{s === 'Morning (12 Hours)' ? t('morning12') : s === 'Night (12 Hours)' ? t('night12') : s}</option>)}
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
                    <input
                      className="text-xl font-bold text-gray-900 text-center bg-transparent border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:outline-none transition-colors w-full"
                      value={selectedEmployee.name}
                      onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'name', e.target.value)}
                    />
                    <span className="text-sm font-medium text-slate-500">{selectedEmployee.role}</span>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 bg-gray-50 rounded-xl space-y-3">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-500">{t('dept')}</span>
                        <select
                          className="text-sm font-medium bg-transparent text-right outline-none cursor-pointer hover:text-blue-600"
                          value={selectedEmployee.dept || ''}
                          onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'dept', e.target.value)}
                        >
                          {(shopSettings.departments || ['Security', 'Operations', 'HR', 'IT', 'Sales', 'Marketing', 'Kitchen', 'Service', 'Bar', 'Retail', 'Warehouse', 'Inventory', 'Accounts', 'Management', 'Cleaning', 'Maintenance']).map(d => (
                            <option key={d} value={d}>{translations[language]?.[d.toLowerCase()] || d}</option>
                          ))}
                        </select>
                      </div>
                      {/* Location Select for Update */}
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-500">{t('location')}</span>
                        <select className="text-sm font-medium bg-transparent text-right outline-none cursor-pointer hover:text-blue-600" value={selectedEmployee.location || ''} onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'location', e.target.value)}>
                          <option value="">{t('selectLocation') || 'Select Location'}</option>
                          {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                        <span className="text-sm text-gray-500">{t('shift')}</span>
                        <select className="text-sm font-medium bg-transparent text-right outline-none cursor-pointer hover:text-blue-600" value={selectedEmployee.shift} onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'shift', e.target.value)}>
                          {shifts.map(s => <option key={s} value={s}>{s === 'Morning (12 Hours)' ? t('morning12') : s === 'Night (12 Hours)' ? t('night12') : s}</option>)}
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
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><DollarSign size={16} /> {t('compensation')}</h4>
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
                        <div className="flex justify-between text-sm">
                          <span className="text-red-500">{t('advance')}</span>
                          <input type="number" className="w-20 text-right bg-white rounded px-1 text-sm border-red-200 text-red-600 font-medium" value={selectedEmployee.advanceSalary} onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'advanceSalary', Number(e.target.value))} />
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

                          // Advance Salary
                          const advanceSalary = Number(selectedEmployee.advanceSalary) || 0;
                          deductionAmount += advanceSalary;

                          const netPay = baseSalary + (Number(selectedEmployee.bonus) || 0) + (Number(selectedEmployee.overtime) || 0) - deductionAmount;

                          return (
                            <>


                              {lateDeduction > 0 && (
                                <div className="flex justify-between text-sm text-amber-600">
                                  <span>{t('lateDeductions')}</span>
                                  <span>-{formatCurrency(lateDeduction)}</span>
                                </div>
                              )}
                              {absentDeduction > 0 && (
                                <div className="flex justify-between text-sm text-red-600">
                                  <span>{t('absentDeductions')}</span>
                                  <span>-{formatCurrency(absentDeduction)}</span>
                                </div>
                              )}

                              {advanceSalary > 0 && (
                                <div className="flex justify-between text-sm text-red-500 font-medium pt-1">
                                  <span>{t('advance')}</span>
                                  <span>-{formatCurrency(advanceSalary)}</span>
                                </div>
                              )}

                              <div className="flex justify-between text-sm text-red-600 font-bold pt-2 border-t border-red-100 mt-1">
                                <span>{t('totalDeductions')}</span>
                                <span>-{formatCurrency(deductionAmount)}</span>
                              </div>

                              <div className="flex justify-between text-lg text-blue-900 font-bold pt-3 border-t-2 border-blue-100 mt-2">
                                <span>{t('netPay')}</span>
                                <span>{formatCurrency(netPay)}</span>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>

                    <div className="pt-4 border-t border-gray-100">


                      <button onClick={() => handleDeleteEmployee(selectedEmployee.id)} className="w-full mt-4 text-red-600 hover:bg-red-50 py-2.5 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors">
                        <Trash2 size={18} /> {t('terminateService')}
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
                    <p className="text-xs text-gray-500 mb-4">Link your Google account to login with it instead of password.</p>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-bold text-gray-800 mb-3">{t('changePin')}</h4>
                      {securityPin === '1234' ? (
                        <input
                          type="password"
                          placeholder={t('newPin')}
                          maxLength={4}
                          className="w-full px-3 py-2 border border-blue-200 rounded-lg mb-2 text-sm bg-blue-50 focus:ring-2 focus:ring-blue-500"
                          onBlur={(e) => {
                            if (e.target.value.length === 4) {
                              if (window.confirm(t('confirmChangePin') || "Set new PIN?")) {
                                setSecurityPin(e.target.value);
                                saveUserSettings({ securityPin: e.target.value });
                                e.target.value = '';
                                alert(t('pinChanged'));
                              }
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm text-gray-500 italic bg-gray-50 p-3 rounded-lg border border-gray-100">
                          {t('pinSetMessage')}
                        </p>
                      )}
                    </div>

                    <div className="border-t border-gray-100 pt-4 mt-4">
                      <h4 className="font-bold text-gray-800 mb-3">{t('setSecurityQuestion')}</h4>
                      <div className="space-y-2">
                        <select
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white"
                          value={securityQuestion}
                          onChange={(e) => setSecurityQuestion(e.target.value)}
                        >
                          <option value="">{t('securityQuestion')}</option>
                          <option value="secQ_pet">{t('secQ_pet')}</option>
                          <option value="secQ_mother">{t('secQ_mother')}</option>
                          <option value="secQ_city">{t('secQ_city')}</option>
                          <option value="secQ_school">{t('secQ_school')}</option>
                        </select>
                        <input
                          type="text"
                          placeholder={t('securityAnswer')}
                          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          value={securityAnswer}
                          onChange={(e) => setSecurityAnswer(e.target.value)}
                        />
                        <button
                          onClick={() => {
                            if (!securityQuestion || !securityAnswer) {
                              alert("Please select a question and answer!");
                              return;
                            }
                            saveUserSettings({ securityQuestion, securityAnswer });
                            alert(t('saveSettings') + ' Success!');
                          }}
                          className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-blue-700"
                        >
                          {t('saveSettings')}
                        </button>
                      </div>
                    </div>
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
                {/* Image Upload */}
                <div className="flex justify-center mb-4">
                  <label className="relative cursor-pointer group">
                    <div className="w-24 h-24 rounded-lg bg-gray-100 flex items-center justify-center overflow-hidden border-2 border-dashed border-gray-300 group-hover:border-blue-500 transition-colors">
                      {(editingItem ? editingItem.photo : newItemForm.photo) ? (
                        <img src={editingItem ? editingItem.photo : newItemForm.photo} alt="Preview" className="w-full h-full object-cover" />
                      ) : (
                        <Camera className="text-gray-400 group-hover:text-blue-500" size={32} />
                      )}
                    </div>
                    <input type="file" accept="image/*" onChange={handleNewItemImage} className="hidden" />
                  </label>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Item Name</label>
                  <input className="input-field" placeholder="Item Name" value={editingItem ? editingItem.name : newItemForm.name} onChange={e => editingItem ? setEditingItem({ ...editingItem, name: e.target.value }) : setNewItemForm({ ...newItemForm, name: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Location</label>
                  <select className="input-field" value={editingItem ? editingItem.location : newItemForm.location} onChange={e => editingItem ? setEditingItem({ ...editingItem, location: e.target.value }) : setNewItemForm({ ...newItemForm, location: e.target.value })}>
                    <option value="">Select Location</option>
                    {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Buy Price</label>
                    <input type="number" className="input-field" placeholder="0.00" value={editingItem ? editingItem.buyPrice : newItemForm.buyPrice} onChange={e => editingItem ? setEditingItem({ ...editingItem, buyPrice: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, buyPrice: Number(e.target.value) })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">Sell Price</label>
                    <input type="number" className="input-field" placeholder="0.00" value={editingItem ? editingItem.sellPrice : newItemForm.sellPrice} onChange={e => editingItem ? setEditingItem({ ...editingItem, sellPrice: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, sellPrice: Number(e.target.value) })} required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Quantity</label>
                  <input type="number" className="input-field" placeholder="0" value={editingItem ? editingItem.quantity : newItemForm.quantity} onChange={e => editingItem ? setEditingItem({ ...editingItem, quantity: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, quantity: Number(e.target.value) })} required />
                </div>

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

      {/* Select Sales Employee Modal */}
      {
        isSelectSalesEmployeeModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">Select Sales Employee</h3>
                <button onClick={() => setIsSelectSalesEmployeeModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1">
                  {/* Admin option removed */}
                  {employees.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => { setSalesEmployee(emp); setIsSelectSalesEmployeeModalOpen(false); }}
                      className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-50 transition-colors ${salesEmployee?.id === emp.id ? 'bg-blue-50 border border-blue-100' : ''}`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden">
                        {emp.photo ? <img src={emp.photo} alt={emp.name} className="w-full h-full object-cover" /> : <User size={20} className="text-gray-400 m-auto mt-2" />}
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{emp.name}</div>
                        <div className="text-xs text-gray-500">{emp.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* PIN Verification Modal */}
      {
        isPinModalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce">
                  <Shield size={32} className="text-blue-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">{t('securityCheck')}</h3>
                <p className="text-sm text-gray-500 mb-6">{t('pinPrompt')}</p>

                <div className="flex justify-center gap-3 mb-6">
                  {[0, 1, 2, 3].map((i) => (
                    <div key={i} className={`w-4 h-4 rounded-full transition-all duration-300 ${pinInput.length > i ? 'bg-blue-600 scale-110' : 'bg-gray-200'}`} />
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                    <button
                      key={num}
                      onClick={() => {
                        const newPin = pinInput + num;
                        if (newPin.length <= 4) {
                          setPinInput(newPin);
                          if (newPin.length === 4) {
                            if (newPin === securityPin) {
                              setIsPinModalOpen(false);
                              setPinInput('');
                              // Execute Action
                              if (pinAction === 'showCosts') setShowSensitiveData(true);
                              if (pinAction === 'changeSalesEmployee') setIsSelectSalesEmployeeModalOpen(true);
                            } else {
                              setTimeout(() => {
                                setPinInput('');
                                alert(t('incorrectPin'));
                              }, 200);
                            }
                          }
                        }
                      }}
                      className="h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-lg font-bold text-gray-700 transition-colors flex items-center justify-center active:scale-95"
                    >
                      {num}
                    </button>
                  ))}
                  <button onClick={() => setPinInput('')} className="h-12 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 font-bold flex items-center justify-center transition-colors active:scale-95">C</button>
                  <button
                    onClick={() => {
                      const newPin = pinInput + '0';
                      if (newPin.length <= 4) {
                        setPinInput(newPin);
                        if (newPin.length === 4) {
                          if (newPin === securityPin) {
                            setIsPinModalOpen(false);
                            setPinInput('');
                            if (pinAction === 'showCosts') setShowSensitiveData(true);
                            if (pinAction === 'changeSalesEmployee') setIsSelectSalesEmployeeModalOpen(true);
                          } else {
                            setTimeout(() => {
                              setPinInput('');
                              alert(t('incorrectPin'));
                            }, 200);
                          }
                        }
                      }
                    }}
                    className="h-12 rounded-xl bg-gray-50 hover:bg-gray-100 text-lg font-bold text-gray-700 transition-colors flex items-center justify-center active:scale-95"
                  >
                    0
                  </button>
                  <button onClick={() => setIsPinModalOpen(false)} className="h-12 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-500 font-bold flex items-center justify-center transition-colors active:scale-95"><X size={20} /></button>
                </div>

                {/* Forgot PIN Link */}
                <button
                  onClick={() => {
                    if (!securityQuestion || !securityAnswer) {
                      alert(t('setSecurityQuestion') + " in Settings first!");
                      return;
                    }
                    const ans = prompt(`${t('securityQuestion')}: ${t(securityQuestion) || securityQuestion}\n${t('enterSecurityAnswer')}:`);
                    if (ans && ans.toLowerCase().trim() === securityAnswer.toLowerCase().trim()) {
                      const resetPin = '1234';
                      setSecurityPin(resetPin);
                      saveUserSettings({ securityPin: resetPin });
                      alert(t('pinResetSuccess'));
                    } else {
                      alert(t('incorrectAnswer'));
                    }
                  }}
                  className="text-sm text-blue-500 hover:text-blue-700 underline mt-2"
                >
                  {t('forgotPin')}
                </button>
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
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* My Profile */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-3 flex items-center gap-2">
                    <User size={16} /> {t('myProfile')}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">{t('emailLabel')}</p>
                      <p className="text-sm text-gray-900">{user?.email || 'Not available'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">{t('userIdLabel')}</p>
                      <p className="text-sm text-gray-900 font-mono">{user?.uid || 'Not available'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 font-semibold">{t('accountTypeLabel')}</p>
                      <p className="text-sm text-gray-900">{t('admin')}</p>
                    </div>
                  </div>
                </div>

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
                          alert(t('shopSettingsSaved'));
                        } catch (e) {
                          console.error(e);
                          alert(t('shopSettingsError'));
                        }
                      }}
                      className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors mt-2"
                    >
                      {t('updateSettings') || 'Update Settings'}
                    </button>
                  </div>
                </div>

                {/* Localization Settings */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Globe size={16} /> {t('localization')}
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{t('language')}</label>
                      <select
                        className="input-field"
                        value={language}
                        onChange={() => { }} // Managed by effect
                        disabled
                      >
                        <option value="en">English</option>
                        <option value="ar">Arabic (العربية)</option>
                        <option value="hi">Hindi (हिंदी)</option>
                        <option value="zh">Chinese (中文)</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-1">Language changes apply instantly.</p>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-1">{t('currency')}</label>
                      <select
                        className="input-field"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                      >
                        <option value="EGP">EGP (Egyptian Pound)</option>
                        <option value="USD">USD ($)</option>
                        <option value="EUR">EUR (€)</option>
                        <option value="GBP">GBP (£)</option>
                        <option value="SAR">SAR (Saudi Riyal)</option>
                        <option value="AED">AED (UAE Dirham)</option>
                        <option value="INR">INR (₹)</option>
                        <option value="CNY">CNY (¥)</option>
                        <option value="JPY">JPY (¥)</option>
                        <option value="CAD">CAD ($)</option>
                        <option value="AUD">AUD ($)</option>
                      </select>
                    </div>
                  </div>
                </div>


                {/* Security Settings */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Shield size={16} /> {t('changePin') || 'Security PIN'}
                  </h4>

                  {/* PIN Change Section */}
                  {securityPin === '1234' ? (
                    <div className="mb-4">
                      <p className="text-xs text-gray-500 mb-2">Current PIN is default '1234'. Please change it.</p>
                      <input
                        type="password"
                        className="input-field"
                        placeholder={t('newPin') || "Enter new 4-digit PIN"}
                        maxLength={4}
                        // Use a local temp state or reuse pinInput (carefully)
                        // Using pinInput for Settings as well
                        value={pinInput}
                        onChange={(e) => setPinInput(e.target.value)}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => {
                            if (pinInput.length === 4) {
                              setSecurityPin(pinInput);
                              saveUserSettings({ securityPin: pinInput });
                              setPinInput('');
                              alert(t('pinChanged'));
                            } else {
                              alert('PIN must be 4 digits');
                            }
                          }}
                          className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded-lg hover:bg-blue-700 font-medium"
                        >
                          {t('saveSettings') || "Update PIN"}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-gray-50 p-3 rounded-lg border border-gray-100 mb-4">
                      <p className="text-sm text-gray-600 flex items-center gap-2">
                        <CheckCircle size={14} className="text-green-500" />
                        {t('pinSetMessage') || "PIN is set."}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">Use "Forgot PIN" on the lock screen to reset.</p>
                    </div>
                  )}

                  {/* Security Question Section */}
                  <div className="border-t border-gray-100 pt-4">
                    <h4 className="font-bold text-sm text-gray-700 mb-2">{t('setSecurityQuestion') || "Security Questions"}</h4>
                    <div className="space-y-2">
                      <select
                        className="input-field"
                        value={securityQuestion}
                        onChange={(e) => setSecurityQuestion(e.target.value)}
                      >
                        <option value="">{t('securityQuestion') || "Select Question"}</option>
                        <option value="secQ_pet">{t('secQ_pet')}</option>
                        <option value="secQ_mother">{t('secQ_mother')}</option>
                        <option value="secQ_city">{t('secQ_city')}</option>
                        <option value="secQ_school">{t('secQ_school')}</option>
                      </select>
                      <input
                        type="text"
                        placeholder={t('securityAnswer') || "Answer"}
                        className="input-field"
                        value={securityAnswer}
                        onChange={(e) => setSecurityAnswer(e.target.value)}
                      />
                      <button
                        onClick={() => {
                          if (!securityQuestion || !securityAnswer) {
                            alert("Please select a question and answer!");
                            return;
                          }
                          saveUserSettings({ securityQuestion, securityAnswer });
                          alert(t('saveSettings') + ' Success!');
                        }}
                        className="w-full bg-gray-800 text-white py-2 rounded-lg text-sm font-bold hover:bg-gray-900"
                      >
                        {t('saveSettings') || "Save Security Settings"}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Backup & Restore */}
                <div>
                  <h4 className="font-bold text-sm text-gray-700 mb-2 flex items-center gap-2">
                    <Database size={16} /> {t('backupRestore')}
                  </h4>
                  <div className="space-y-2">
                    <button
                      onClick={handleExportBackup}
                      disabled={loading}
                      className="w-full bg-green-600 text-white font-bold py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Download size={16} /> {t('exportBackup')}
                    </button>
                    <label className="w-full bg-blue-600 text-white font-bold py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 cursor-pointer">
                      <Upload size={16} /> {t('importBackup')}
                      <input
                        type="file"
                        accept=".json"
                        onChange={handleImportBackup}
                        disabled={loading}
                        className="hidden"
                      />
                    </label>
                    <p className="text-xs text-gray-500 mt-2">{t('backupDescription')}</p>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-red-600 mb-2 flex items-center gap-2">
                    <AlertCircle size={16} /> {t('dangerZone')}
                  </h4>
                  <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                    <p className="text-xs text-red-700 mb-3">{t('irreversibleAction')}</p>
                    <button
                      onClick={handleFactoryReset}
                      className="w-full bg-red-600 text-white font-bold py-2 rounded-lg hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
                    >
                      {t('factoryReset')}
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

