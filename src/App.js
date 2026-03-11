import React, { useState, useEffect, useCallback, useRef } from 'react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Html5QrcodeScanner, Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';

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
  Plus,
  ChevronDown,
  ChevronRight,
  Mail,
  Phone,
  Edit,
  Save,
  FileText,
  CheckCircle,
  AlertCircle,
  Receipt,
  Loader2,
  X,
  Trash2,
  Briefcase,
  Building2,
  Shield,
  Download,
  Camera,
  User,
  Upload,
  Globe,
  Database,

  Menu, // Hamburger Menu
  LogOut, // Logout Icon
  Calculator, // General Accounts
  ShoppingCart, // Sales & Purchases
  Package, // Warehouses
  FileText as InvoiceIcon, // Electronic Invoice
  CreditCard,
  Printer,
  Scan,
  QrCode,
  Sparkles,
  Zap,
  ArrowLeft,
  RefreshCw,
  Coffee,
  Monitor,
  Disc,
  Minus,
  History,
  Play,
  Wrench,
  Smartphone,
  Laptop,
  ClipboardList,
  CheckSquare,
  AlertTriangle,
  Tag,
  Hammer,
  UserPlus,
  Activity,
  ShoppingBag,
  PlusCircle,
  CheckCircle2,
  Smartphone as MobileIcon,
} from 'lucide-react';
import { auth, db, storage } from './firebase'; // Firebase
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { translations } from './i18n/translations';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  linkWithPopup,
  signInAnonymously
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

// SILENCED: Global Error Handler no longer interrupts user
window.onerror = function (message, source, lineno, colno, error) {
  console.error('App Error:', message, 'Line:', lineno);
};

// --- Subcomponents ---
function SidebarItem({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl mb-2 transition-all duration-300 group ${active
        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 -translate-y-0.5'
        : 'text-slate-400 hover:text-white hover:bg-slate-800'
        }`}
    >
      <div className={`transition-transform duration-300 ${active ? 'scale-110' : 'group-hover:scale-110'}`}>{icon}</div>
      <span className={`font-bold text-sm tracking-wide transition-all ${active ? 'opacity-100' : 'opacity-80 group-hover:opacity-100'}`}>{label}</span>
      {active && (
        <div className="ml-auto w-1 h-4 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)] animate-pulse"></div>
      )}
    </button>
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
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth >= 1024); // Default open on Desktop
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'signup'
  const [authForm, setAuthForm] = useState({ email: '', password: '', apiKey: '' });
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState(null); // Explicit Error State
  const [printFormat, setPrintFormat] = useState('Thermal'); // 'Thermal' or 'A4'
  const [printDual, setPrintDual] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [securityPin, setSecurityPin] = useState('1234'); // Default until loaded
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [pinInput, setPinInput] = useState('');
  const [showSensitiveData, setShowSensitiveData] = useState(false); // Warehouse Buy Price toggle
  const [isPinModalOpen, setIsPinModalOpen] = useState(false);
  const [shopSettings, setShopSettings] = useState({
    name: '',
    address: '',
    phone: '',
    upiId: '',
    instapayId: ''
  });
  const [cameras, setCameras] = useState([]);
  const [activeCameraId, setActiveCameraId] = useState(null);
  const [heldCarts, setHeldCarts] = useState([]); // Multiple selling sessions
  const [scannerMode, setScannerMode] = useState('sell'); // 'sell' or 'buy'
  const [showUpiQr, setShowUpiQr] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);
  const [upiQrTimer, setUpiQrTimer] = useState(15);
  const [digitalSubMethod, setDigitalSubMethod] = useState('UPI');
  const [currency, setCurrency] = useState(() => localStorage.getItem('currency') || 'EGP');
  const [barcodePrintMode, setBarcodePrintMode] = useState('sticker'); // 'sticker' or 'a4'
  const [selectedInventoryItems, setSelectedInventoryItems] = useState([]);
  const [externalPayment, setExternalPayment] = useState(null); // { invoiceId, amount, upiId, expiry }
  useEffect(() => { localStorage.setItem('currency', currency); }, [currency]);

  // --- Barcode / Scanner Buffering (Hardware Scanners) ---
  const barcodeBuffer = useRef('');
  const lastKeyTime = useRef(0);


  // Handle Incoming Payment QR Codes from Prints
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payId = params.get('pay');
    const amt = params.get('amt');
    const upi = params.get('upi') || params.get('id'); // Support both legacy and new 'id'
    const method = params.get('method') || 'UPI'; // Default to UPI for legacy
    const pn = params.get('pn');
    const exp = params.get('exp');

    if (payId && amt && upi && exp) {
      const now = Date.now();
      const expiryTime = parseInt(exp);
      if (now < expiryTime) {
        setExternalPayment({
          invoiceId: payId,
          amount: parseFloat(amt),
          upiId: upi,
          paymentMethod: method,
          merchantName: pn || 'Merchant',
          expiry: expiryTime,
          expired: false
        });
        setActiveTab('payment_portal');
      } else {
        setExternalPayment({ expired: true });
        setActiveTab('payment_portal');
      }
    }
  }, []);



  const [language, setLanguage] = useState(() => localStorage.getItem('language') || 'en');
  useEffect(() => { localStorage.setItem('language', language); }, [language]);

  const [orderType, setOrderType] = useState('Walk-in'); // 'Walk-in' or 'Takeaway'

  const t = useCallback((key) => {
    const lang = translations[language] ? language : 'en';
    return (translations[lang] && translations[lang][key]) || key;
  }, [language]);

  const [newSaleForm, setNewSaleForm] = useState({ customer: '', customerId: '', amount: 0, status: 'Completed', items: '' });

  // Sync document direction and language for RTL support (Arabic)
  useEffect(() => {
    document.documentElement.dir = language === 'ar' ? 'rtl' : 'ltr';
    document.documentElement.lang = language;
  }, [language]);

  // Reactive default customer names for POS (fixes untranslated defaults on language switch)
  useEffect(() => {
    const defaults = {
      en: { walkIn: 'Walk-in Customer', takeaway: 'Takeaway Customer' },
      ar: { walkIn: 'عميل محلي', takeaway: 'عميل تيك أواي' },
      hi: { walkIn: 'कैश ग्राहक (Walk-in)', takeaway: 'ले जाने वाला ग्राहक (Takeaway)' },
      zh: { walkIn: '回客', takeaway: '外带客户' }
    };
    const isCurrentDefault = Object.values(defaults).some(d =>
      newSaleForm.customer === d.walkIn || newSaleForm.customer === d.takeaway || !newSaleForm.customer
    );
    if (isCurrentDefault) {
      setNewSaleForm(prev => ({
        ...prev,
        customer: orderType === 'Walk-in' ? t('walkInCustomer') : t('takeawayCustomer')
      }));
    }
  }, [language, orderType, t]);
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
            if (data.language) setLanguage(data.language);
            if (data.currency) setCurrency(data.currency);
          }
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
      alert((translations[language]?.saveError || 'Error saving') + ': ' + error.message);
    }
  };

  const [isSelectSalesEmployeeModalOpen, setIsSelectSalesEmployeeModalOpen] = useState(false);
  const [salesEmployee, setSalesEmployee] = useState(null);
  const [pinAction, setPinAction] = useState('showCosts'); // 'showCosts' | 'changeSalesEmployee'
  const [paymentMethod, setPaymentMethod] = useState('Cash'); // 'Cash' | 'Visa' | 'Online'


  // [Added] Location Filters for new modules
  const [warehouseLocationFilter, setWarehouseLocationFilter] = useState('');
  const [posLocationFilter, setPosLocationFilter] = useState('');
  const [posSubTab, setPosSubTab] = useState('products'); // 'products' or 'services'
  const [homeLocationFilter, setHomeLocationFilter] = useState('');
  const [historyLocationFilter, setHistoryLocationFilter] = useState('');
  const [reportLocationFilter, setReportLocationFilter] = useState('');
  const [historyFilter, setHistoryFilter] = useState('All');





  const [historyDateFilter, setHistoryDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const formatCurrency = (val) => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: currency }).format(Number(val) || 0);
    } catch (e) {
      return currency + ' ' + (Number(val) || 0).toLocaleString();
    }
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
  const [employeeMonthFilter, setEmployeeMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // For Employees tab
  const [profitMonthFilter, setProfitMonthFilter] = useState(new Date().toISOString().slice(0, 7));
  const [profitPeriod, setProfitPeriod] = useState('Monthly');
  const [profitDateFilter, setProfitDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [profitYearFilter, setProfitYearFilter] = useState(new Date().getFullYear().toString());
  const [attendanceDateFilter, setAttendanceDateFilter] = useState(new Date().toISOString().split('T')[0]);
  const [isAddAttendanceModalOpen, setIsAddAttendanceModalOpen] = useState(false);
  const [editingAttendance, setEditingAttendance] = useState(null); // For edit modal




  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);

      if (!currentUser) {
        // Clear all state data on logout to prevent leakage
        setEmployees([]);
        setSites([]);
        setAttendance([]);
        setPayrolls([]);
        setAccounts([]);
        setSales([]);
        setPurchases([]);
        setInventory([]);
        setHeldCarts([]);
        setCart([]);
        setShopSettings({
          name: '',
          address: '',
          phone: '',
          upiId: '',
          instapayId: ''
        });
        setSecurityPin('1234');
        setSecurityQuestion('');
        setSecurityAnswer('');
        setShowSensitiveData(false);
        setPinInput('');
      }
    });
    return () => unsubscribe();
  }, [auth]);

  const [cafeSessions, setCafeSessions] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [cafeRooms, setCafeRooms] = useState([]);
  const [isStartSessionModalOpen, setIsStartSessionModalOpen] = useState(false);
  const [sessionStartForm, setSessionStartForm] = useState({ customerName: '', customerPhone: '', sessionType: 'Open' });
  const [pendingRoom, setPendingRoom] = useState(null);
  const [isCafeOrderModalOpen, setIsCafeOrderModalOpen] = useState(false);
  const [activeCafeSession, setActiveCafeSession] = useState(null);
  const [activeCafeCategory, setActiveCafeCategory] = useState('Hot Drinks');
  const [cafeSubTab, setCafeSubTab] = useState('board'); // 'board' | 'rooms' | 'recipes'

  // --- Service / Repair Shop State ---
  const [serviceTickets, setServiceTickets] = useState([]);
  const [serviceSubTab, setServiceSubTab] = useState('board'); // 'board' | 'active' | 'new' | 'history' | 'customers' | 'inventory' | 'sales' | 'reports'
  const [serviceForm, setServiceForm] = useState({
    customerName: '', customerPhone: '', customerEmail: '', customerAddress: '',
    deviceType: 'Mobile', brand: '', model: '', serialNo: '',
    issue: '', priority: 'Normal', technician: '', estimatedCost: '', status: 'Received',
    notes: '', diagnostics: '', partsUsed: [], paymentStatus: 'Unpaid', amountPaid: 0, paymentMethod: 'Cash', laborCost: 0,
    photos: []
  });
  const [photoUploading, setPhotoUploading] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [serviceSearch, setServiceSearch] = useState('');
  const [serviceStatusFilter, setServiceStatusFilter] = useState('');
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [partSearchResults, setPartSearchResults] = useState([]);
  const [serviceCustomers, setServiceCustomers] = useState([]);
  const [selectedServiceCustomer, setSelectedServiceCustomer] = useState(null);
  const [serviceCustomerForm, setServiceCustomerForm] = useState({ name: '', phone: '', email: '', address: '', notes: '' });
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [serviceInventory, setServiceInventory] = useState([]);
  const [isServiceInventoryModalOpen, setIsServiceInventoryModalOpen] = useState(false);
  const [editingServiceInventory, setEditingServiceInventory] = useState(null); // Added this
  const [serviceInventoryForm, setServiceInventoryForm] = useState({ name: '', category: 'Phone Parts', stock: 0, minStock: 5, buyPrice: 0, sellPrice: 0 });
  const [serviceCart, setServiceCart] = useState([]);
  const [serviceInventorySearch, setServiceInventorySearch] = useState('');

  async function handleUploadRepairPhoto(file, ticketId) {
    if (!file) return null;
    const storageRef = ref(storage, `repairs/${ticketId}/${Date.now()}_${file.name}`);
    try {
      setPhotoUploading(true);
      const snapshot = await uploadBytes(storageRef, file);
      const url = await getDownloadURL(snapshot.ref);
      setPhotoUploading(false);
      return url;
    } catch (e) {
      console.error("Upload error:", e);
      setPhotoUploading(false);
      alert("Photo upload failed. Please check connection.");
      return null;
    }
  }

  const [roomForm, setRoomForm] = useState({ name: '', type: 'Cafe', hourlyPrice: 0 });
  const [recipeForm, setRecipeForm] = useState({ name: '', category: 'Hot Drinks', sellPrice: '', ingredients: [] });

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000); // Update every second for a real running clock
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'cafeSessions'), where('userId', '==', user.uid));
      return onSnapshot(q, (snapshot) => {
        setCafeSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'recipes'), where('userId', '==', user.uid));
      return onSnapshot(q, (snapshot) => {
        setRecipes(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      });
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      const q = query(collection(db, 'cafeRooms'), where('userId', '==', user.uid));
      return onSnapshot(q, (snapshot) => {
        const rooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        if (rooms.length === 0) {
          // One-time seed for new users
          const defaults = [
            { name: 'Room 1', type: 'PlayStation', userId: user.uid },
            { name: 'Table 1', type: 'Billiards', userId: user.uid },
            { name: 'Lounge 1', type: 'Cafe', userId: user.uid },
          ];
          defaults.forEach(d => addDoc(collection(db, 'cafeRooms'), d));
        }
        setCafeRooms(rooms);
      });
    }
  }, [user]);

  // Firestore: Service Tickets (Real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'serviceTickets'), where('userId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      setServiceTickets(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  // Firestore: Service Customers (Real-time)
  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'serviceCustomers'), where('userId', '==', user.uid));
    return onSnapshot(q, (snapshot) => {
      setServiceCustomers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, [user]);

  // --- PIN Modal Keyboard Support ---
  useEffect(() => {
    if (!isPinModalOpen) return;
    const handleKeyDown = (e) => {
      if (e.key >= '0' && e.key <= '9') {
        setPinInput(prev => (prev.length < 4 ? prev + e.key : prev));
      } else if (e.key === 'Backspace') {
        setPinInput(prev => prev.slice(0, -1));
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
        if (pinAction === 'accessReports') {
          setActiveTab('reports');
          if (window.innerWidth < 768) setIsSidebarOpen(false);
        }
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

  const handleAnonymousLogin = async () => {
    setLoading(true);
    try {
      await signInAnonymously(auth);
    } catch (error) {
      console.error(error);
      alert("Anonymous login failed: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    if (!resetEmail) {
      alert(t('enterEmail'));
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      alert(t('passwordResetSent'));
      setShowForgotPassword(false);
      setResetEmail('');
    } catch (error) {
      console.error(error);
      alert("Error: " + error.message);
    } finally {
      setLoading(false);
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


  // --- State with Firestore Integration ---
  const [employees, setEmployees] = useState([]);
  const [sites, setSites] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [payrolls, setPayrolls] = useState([]); // [New] Monthly Payroll Records

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

    // Payroll Listener
    const qPay = query(collection(db, 'payroll'), where('userId', '==', user.uid));
    const unsubPay = onSnapshot(qPay, (snapshot) => {
      setPayrolls(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    }, (error) => {
      console.error("Payroll Listener Error:", error);
    });

    return () => {
      unsubEmp();
      unsubSites();
      unsubAtt();
      unsubPay();
    };
  }, [user]);

  // --- New Modules State & Listeners ---
  const [accounts, setAccounts] = useState([]);
  const [sales, setSales] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [inventory, setInventory] = useState([]);

  useEffect(() => {
    if (!user) return;

    // Accounts Listener
    const unsubAccounts = onSnapshot(query(collection(db, 'accounts'), where('userId', '==', user.uid)), (snapshot) => {
      setAccounts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Sales Listener
    const unsubSales = onSnapshot(query(collection(db, 'sales'), where('userId', '==', user.uid)), (snapshot) => {
      setSales(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Purchases Listener
    const unsubPurchases = onSnapshot(query(collection(db, 'purchases'), where('userId', '==', user.uid)), (snapshot) => {
      setPurchases(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Inventory Listener
    const unsubInventory = onSnapshot(query(collection(db, 'inventory'), where('userId', '==', user.uid)), (snapshot) => {
      setInventory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Mobile/Shop Settings Listener
    const unsubSettings = onSnapshot(doc(db, 'settings', 'shop_' + user.uid), (doc) => {
      if (doc.exists()) {
        setShopSettings(doc.data());
      }
    });

    return () => {
      unsubAccounts();
      unsubSales();
      unsubPurchases();
      unsubInventory();
      unsubSettings();
    };
  }, [user]);

  // --- Persistence Effects replaced by Firestore Listeners ---

  const shifts = ['Morning (12 Hours)', 'Night (12 Hours)'];

  // Form State
  const [newEmployeeForm, setNewEmployeeForm] = useState({
    name: '', role: '', dept: 'Security', location: '', shift: 'Morning (12 Hours)', salary: 60000, salaryMethod: 'Monthly', bonus: 0, overtime: 0, deductionHours: 0, photo: ''
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

  /* --- PDF Generation Handling with jsPDF & AutoTable --- */

  const generatePDF = (headers, data, filename, extraMetadata = []) => {
    try {
      const doc = new jsPDF({
        orientation: headers.length > 7 ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.width;
      const pageHeight = doc.internal.pageSize.height;

      // Sanitization: Ensure data is clean (no nulls/undefined)
      const cleanData = data.map(row =>
        row.map(cell => (cell === null || cell === undefined) ? '' : cell)
      );

      // 1. Branding Header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(22);
      doc.setTextColor(15, 23, 42);
      doc.text(shopSettings.name?.toUpperCase() || (t('companyName') || 'FINN ERP'), 15, 20);

      doc.setFontSize(11);
      doc.setTextColor(59, 130, 246);
      const subTitle = filename.replace('.pdf', '').replace(/_/g, ' ').toUpperCase();
      doc.text(subTitle, 15, 27);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text(`${t('date')}: ${new Date().toLocaleString()}`, 15, 33);

      if (extraMetadata.length > 0) {
        doc.text(extraMetadata.join('  |  '), 15, 38);
        doc.setDrawColor(203, 213, 225);
        doc.line(15, 41, pageWidth - 15, 41);
      } else {
        doc.setDrawColor(203, 213, 225);
        doc.line(15, 36, pageWidth - 15, 36);
      }

      // 2. Table Implementation
      autoTable(doc, {
        head: [headers],
        body: cleanData,
        startY: extraMetadata.length > 0 ? 48 : 42,
        theme: 'striped',
        styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.5, valign: 'middle' },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 9.5,
          fontStyle: 'bold',
          halign: 'left',
          lineWidth: 0.1,
          lineColor: [255, 255, 255]
        },
        columnStyles: headers.length > 5 ? {
          0: { cellWidth: 50 }, // Category/Name
          2: { halign: 'center' }, // Qty
          [headers.length - 1]: { halign: 'right', fontStyle: 'bold' } // Final Amount
        } : {
          0: { cellWidth: 60 },
          2: { halign: 'right' }
        },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (cellData) => {
          const rowData = cellData.row.raw;
          const cellVal = String(cellData.cell.raw || '');
          const firstCellVal = String(rowData[0] || '').toUpperCase();

          // Style Totals
          const isTotal = firstCellVal.includes('TOTAL') || firstCellVal.includes('NET PRO') || firstCellVal.includes('GROSS PRO') || firstCellVal.includes('NET PAYA');
          if (isTotal) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.fillColor = [239, 246, 255];
            cellData.cell.styles.textColor = [30, 64, 175];
            cellData.cell.styles.fontSize = 9;
          }

          // Style Section Headers
          const nonEmptyCount = rowData.filter(x => x !== '' && x !== null).length;
          const isSection = nonEmptyCount === 1 && isNaN(rowData.find(x => x !== '' && x !== null));

          if (isSection) {
            cellData.cell.styles.fontStyle = 'bold';
            cellData.cell.styles.fillColor = [241, 245, 249];
            cellData.cell.styles.fontSize = 10.5;
            cellData.cell.styles.textColor = [15, 23, 42];
            cellData.cell.styles.cellPadding = 4;
          }

          // Indentation for sub-items (starting with space)
          if (cellVal.startsWith('  ')) {
            cellData.cell.styles.cellPadding = { left: 8 };
            cellData.cell.styles.textColor = [71, 85, 105];
          }

          // Number alignment
          if (typeof cellData.cell.raw === 'number' || (!isNaN(cellVal) && cellVal !== '')) {
            cellData.cell.styles.halign = 'right';
            const numVal = parseFloat(cellVal);
            if (numVal < 0) cellData.cell.styles.textColor = [220, 38, 38];
          }
        },
        margin: { left: 15, right: 15, bottom: 25 },
        didDrawPage: (pData) => {
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(`FINN ERP - ${filename.replace('.pdf', '')} - PRODUCED ON ${new Date().toLocaleDateString()}`, 15, pageHeight - 12);
          const pNum = `${t('page')} ${doc.internal.getNumberOfPages()}`;
          doc.text(pNum, pageWidth - 15 - doc.getTextWidth(pNum), pageHeight - 12);
        }
      });

      doc.save(filename);
    } catch (err) {
      console.error("PDF Generate Error:", err);
      alert("Error generating PDF: " + err.message);
    }
  };

  const handleExportAttendance = () => {
    const headers = [t('name'), t('date'), t('status'), t('replacementFor'), t('shift'), t('location')];
    const data = attendance.map(a => [
      a.name,
      a.date instanceof Date ? a.date.toLocaleDateString() : (a.date?.toDate ? a.date.toDate().toLocaleDateString() : String(a.date)),
      a.status,
      a.replacementFor || '-',
      a.shift || '-',
      a.location || '-'
    ]);

    const metadata = [
      `${t('totalRecords') || 'Total Records'}: ${data.length}`,
      `${t('location')}: ${reportLocationFilter || t('filterAll')}`
    ];

    generatePDF(headers, data, 'Attendance_Report.pdf', metadata);
  };

  const handleExportPayroll = () => {
    const headers = [
      t('name'), t('location'), t('role'),
      t('salary'), t('bonus'), t('overtime'),
      t('advance'), t('deductions'), t('netPay')
    ];

    const data = employees
      .filter(emp => !payrollLocationFilter || emp.location === payrollLocationFilter)
      .map(emp => {
        let baseSalary = Number(emp.salary) || 0;
        let bonus = Number(emp.bonus) || 0;
        let overtime = Number(emp.overtime) || 0;
        let deductionAmount = 0;

        const empAttendance = attendance.filter(a => {
          if (a.name !== emp.name) return false;
          let attendanceMonth;
          if (typeof a.date === 'string') attendanceMonth = a.date.substring(0, 7);
          else if (a.date?.toDate) attendanceMonth = a.date.toDate().toISOString().substring(0, 7);
          else if (a.date instanceof Date) attendanceMonth = a.date.toISOString().substring(0, 7);
          return attendanceMonth === payrollMonthFilter;
        });

        empAttendance.forEach(record => {
          if (record.status === 'Late') {
            const hourlyRate = baseSalary / 360;
            deductionAmount += (Number(record.lateHours) || 0) * hourlyRate;
          }
          if (record.status === 'Absent') {
            deductionAmount += baseSalary / 30;
          }
        });

        const hourlyRate = baseSalary / 360;
        const manualDeduction = (Number(emp.deductionHours) || 0) * hourlyRate;
        const storedRecord = payrolls.find(p => p.employeeId === emp.id && p.month === payrollMonthFilter);

        if (storedRecord) {
          baseSalary = Number(storedRecord.salary) || baseSalary;
          bonus = Number(storedRecord.bonus) || 0;
          overtime = Number(storedRecord.overtime) || 0;
        }

        const effectiveManualDeduction = storedRecord ? (Number(storedRecord.deductions) || 0) : manualDeduction;
        const effectiveAdvance = storedRecord ? (Number(storedRecord.advance) || 0) : (Number(emp.advanceSalary) || 0);

        const totalDeductions = deductionAmount + effectiveManualDeduction + effectiveAdvance;
        const netPay = baseSalary + bonus + overtime - totalDeductions;

        return [
          emp.name,
          emp.location,
          emp.role,
          baseSalary,
          bonus,
          overtime,
          effectiveAdvance,
          totalDeductions,
          netPay
        ];
      });

    const metadata = [
      `${t('payPeriod')}: ${payrollMonthFilter}`,
      `${t('location')}: ${payrollLocationFilter || t('filterAll')}`,
      `${t('totalNetPay') || 'Total Net'}: ${data.reduce((sum, row) => sum + row[8], 0).toFixed(2)}`
    ];

    generatePDF(headers, data, 'Payroll_Report.pdf', metadata);
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

  // --- Payroll Management Logic ---
  const [isManagePayrollModalOpen, setIsManagePayrollModalOpen] = useState(false);
  const [currentPayrollForm, setCurrentPayrollForm] = useState({
    id: '', // Employee ID
    name: '',
    role: '',
    month: '',
    salary: 0,
    bonus: 0,
    overtime: 0,
    advance: 0,
    deductions: 0, // Manual Deductions
    lateDeduction: 0, // For Display/Reference
    absentDeduction: 0 // For Display/Reference
  });

  const handleManagePayroll = (emp, month, calculatedLate, calculatedAbsent) => {
    // Check if record exists for this month
    const existingRecord = payrolls.find(p => p.employeeId === emp.id && p.month === month);

    if (existingRecord) {
      setCurrentPayrollForm({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        month: month,
        salary: Number(existingRecord.salary) || 0,
        bonus: Number(existingRecord.bonus) || 0,
        overtime: Number(existingRecord.overtime) || 0,
        advance: Number(existingRecord.advance) || 0,
        deductions: Number(existingRecord.deductions) || 0,
        lateDeduction: calculatedLate,
        absentDeduction: calculatedAbsent
      });
    } else {
      // Default from Profile
      setCurrentPayrollForm({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        month: month,
        salary: Number(emp.salary) || 0,
        bonus: Number(emp.bonus) || 0,
        overtime: Number(emp.overtime) || 0,
        advance: Number(emp.advanceSalary) || 0,
        deductions: Number(emp.deductionHours) || 0,
        lateDeduction: calculatedLate,
        absentDeduction: calculatedAbsent
      });
    }
    setIsManagePayrollModalOpen(true);
  };

  const handleSavePayroll = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      // Create a deterministic ID: employeeId_YYYY-MM
      const docId = `${currentPayrollForm.id}_${currentPayrollForm.month}`;
      const docRef = doc(db, 'payroll', docId);

      await setDoc(docRef, {
        employeeId: currentPayrollForm.id,
        month: currentPayrollForm.month,
        salary: Number(currentPayrollForm.salary),
        bonus: Number(currentPayrollForm.bonus),
        overtime: Number(currentPayrollForm.overtime),
        advance: Number(currentPayrollForm.advance),
        deductions: Number(currentPayrollForm.deductions),
        updatedAt: serverTimestamp(),
        userId: user.uid
      }, { merge: true });

      setIsManagePayrollModalOpen(false);
      // Optional: alert('Saved');
    } catch (err) {
      console.error(err);
      alert("Error saving payroll: " + err.message);
    }
  };

  const handleDeletePayrollRecord = async (employeeId, month) => {
    if (!user) return;

    const confirmDelete = window.confirm(`Reset payroll to default values for ${month}? This will delete any custom adjustments.`);
    if (!confirmDelete) return;

    try {
      const docId = `${employeeId}_${month}`;
      const docRef = doc(db, 'payroll', docId);
      await deleteDoc(docRef);
      setIsManagePayrollModalOpen(false);
      // Optional: alert('Reset to defaults');
    } catch (err) {
      console.error(err);
      alert("Error deleting record: " + err.message);
    }
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
  const [isPrintBarcodeModalOpen, setIsPrintBarcodeModalOpen] = useState(false);
  const [printConfigs, setPrintConfigs] = useState([]); // Array of { item, qty }
  const [newItemForm, setNewItemForm] = useState({ name: '', quantity: 0, location: '', category: '', buyPrice: 0, sellPrice: 0, photo: '', barcode: '' });
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

    // Check for duplicates (Name + Location)
    if (inventory.some(item =>
      item.name.trim().toLowerCase() === newItemForm.name.trim().toLowerCase() &&
      item.location === newItemForm.location
    )) {
      alert(t('itemExists') || "Item already exists at this location!");
      return;
    }

    try {
      const invData = {
        ...newItemForm,
        userId: user.uid,
        updatedAt: serverTimestamp()
      };
      await addDoc(collection(db, 'inventory'), invData);

      // Record as a purchase for P&L
      const totalCost = (Number(newItemForm.quantity) || 0) * (Number(newItemForm.buyPrice) || 0);
      if (totalCost > 0) {
        await addDoc(collection(db, 'purchases'), {
          name: newItemForm.name + " (Initial Stock)",
          amount: totalCost,
          quantity: Number(newItemForm.quantity),
          buyPrice: Number(newItemForm.buyPrice),
          location: newItemForm.location,
          category: newItemForm.category,
          userId: user.uid,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
          type: 'Inventory Add'
        });
      }

      setIsAddItemModalOpen(false);
      setNewItemForm({ name: '', quantity: 0, location: '', category: '', buyPrice: 0, sellPrice: 0, photo: '', barcode: '' });
    } catch (err) {
      console.error(err);
      alert(t('addItemError') + err.message);
    }
  };

  const handleUpdateItem = async (e) => {
    e.preventDefault();
    if (!user || !editingItem) return;

    // Check for duplicates (excluding current item) - Name + Location unique
    if (inventory.some(item =>
      item.id !== editingItem.id &&
      item.name.trim().toLowerCase() === editingItem.name.trim().toLowerCase() &&
      item.location === editingItem.location
    )) {
      alert(t('itemExists') || "Item already exists at this location!");
      return;
    }

    try {
      const oldItem = inventory.find(i => i.id === editingItem.id);
      const oldQty = oldItem ? Number(oldItem.quantity) || 0 : 0;
      const newQty = Number(editingItem.quantity) || 0;
      const qtyDiff = newQty - oldQty;

      await updateDoc(doc(db, 'inventory', editingItem.id), {
        name: editingItem.name,
        quantity: newQty,
        location: editingItem.location,
        category: editingItem.category,
        buyPrice: Number(editingItem.buyPrice),
        sellPrice: Number(editingItem.sellPrice),
        barcode: editingItem.barcode || '',
        photo: editingItem.photo || '',
        updatedAt: serverTimestamp()
      });

      // If quantity increased, record as a purchase for P&L
      if (qtyDiff > 0) {
        const totalCost = qtyDiff * (Number(editingItem.buyPrice) || 0);
        await addDoc(collection(db, 'purchases'), {
          name: editingItem.name + " (Stock Update)",
          amount: totalCost,
          quantity: qtyDiff,
          buyPrice: Number(editingItem.buyPrice),
          location: editingItem.location,
          category: editingItem.category,
          userId: user.uid,
          date: new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
          type: 'Stock Increase'
        });
      }

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
  const [posHistoryDate, setPosHistoryDate] = useState(new Date().toISOString().split('T')[0]);


  const [cart, setCart] = useState([]);
  const [cartDiscount, setCartDiscount] = useState(0);

  // Auto-select first location for Strict Mode
  useEffect(() => {
    if (!posLocationFilter && sites.length > 0) {
      setPosLocationFilter(sites[0].name);
    }
  }, [sites, posLocationFilter]);

  const addToCart = (item) => {
    if (item.quantity <= 0) return;

    // Strict Location Rule
    if (cart.length > 0) {
      const cartLocation = cart[0].location;
      if (item.location !== cartLocation) {
        alert(t('mixedLocationError') || "Cannot mix items from different locations! Please clear cart first.");
        return;
      }
    } else {
      // First item: Auto-lock filter if currently "All"
      if (!posLocationFilter) {
        setPosLocationFilter(item.location);
      }
    }

    setCart(prev => {
      const existing = prev.find(i => i.id === item.id);
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, quantity: 1, price: item.sellPrice || 0, barcode: item.barcode || '' }];
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
      calculateTotal();
      const prefix = orderType === 'Walk-in' ? 'W' : 'T';
      let uniqueId;

      try {
        uniqueId = await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, 'counters', 'daily_invoice');
          const counterDoc = await transaction.get(counterRef);
          const today = new Date().toISOString().split('T')[0];

          // Construct Key based on Location and Type
          const locationName = posLocationFilter || 'Main';
          const locCode = locationName.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 4); // First 4 alphanumeric chars
          const counterKey = `${locCode}_${prefix}`;

          let data = counterDoc.exists() ? counterDoc.data() : { date: today };

          // Reset if new day (keeping independent counters for now, or global day reset?)
          // Current logic resets ALL counters if date changes.
          if (data.date !== today) {
            data = { date: today };
          }

          const count = (data[counterKey] || 0) + 1;
          data[counterKey] = count;

          transaction.set(counterRef, data);
          return `${locCode}-${prefix}-${count.toString().padStart(4, '0')}`;
        });
      } catch (e) {
        console.error("Counter failed, using fallback", e);
        uniqueId = prefix + '-' + Date.now().toString().slice(-6);
      }

      const saleData = {
        invoiceId: uniqueId,
        type: 'sale',
        orderType: orderType,
        paymentMethod: paymentMethod,
        digitalSubMethod: paymentMethod === 'Online' ? digitalSubMethod : null,
        customer: newSaleForm.customer || (orderType === 'Walk-in' ? t('walkInCustomer') : t('takeawayCustomer')),
        customerId: newSaleForm.customerId || null,
        status: 'Completed',
        items: cart.map(i => ({
          id: i.id,
          name: i.name,
          price: i.sellPrice,
          qty: i.quantity
        })),
        amount: Math.max(0, calculateTotal() - cartDiscount), // Apply Discount
        discount: cartDiscount, // Save Discount
        location: posLocationFilter || 'Main',
        userId: user.uid,
        soldBy: salesEmployee ? salesEmployee.name : 'Unknown', // Sales Employee Name
        soldById: salesEmployee ? salesEmployee.id : null, // Sales Employee ID
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
        // HOWEVER, 'increment' import is needed. Let's just use the state value logic for now 
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
      setCartDiscount(0); // Reset Discount
      setNewSaleForm({ customer: 'Walk-in Customer', amount: 0, status: 'Completed', items: '' });
      setSalesEmployee(null);
    } catch (err) {
      console.error(err);
      alert("Checkout Error: " + err.message);
    }
  };

  // --- Cafe Handlers ---
  const handleStartCafeSession = (room) => {
    setPendingRoom(room);
    setSessionStartForm({ customerName: '', customerPhone: '', sessionType: 'Open' });
    setIsStartSessionModalOpen(true);
  };

  const handleConfirmStartSession = async (e) => {
    e.preventDefault();
    if (!user || !pendingRoom) return;
    try {
      let sessionNo = 'S-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
      try {
        sessionNo = await runTransaction(db, async (transaction) => {
          const counterRef = doc(db, 'counters', 'daily_cafe');
          const counterDoc = await transaction.get(counterRef);
          const today = new Date().toISOString().split('T')[0];

          let data = counterDoc.exists() ? counterDoc.data() : { date: today };
          if (data.date !== today) {
            data = { date: today };
          }

          const count = (data['session_count'] || 0) + 1;
          data['session_count'] = count;

          transaction.set(counterRef, data);
          return `S-${count.toString().padStart(4, '0')}`;
        });
      } catch (e) { console.error("Cafe counter failed", e); }

      await addDoc(collection(db, 'cafeSessions'), {
        sessionId: sessionNo,
        roomId: pendingRoom.id,
        roomName: pendingRoom.name,
        roomType: pendingRoom.type,
        hourlyRate: pendingRoom.hourlyPrice || 0,
        startTime: serverTimestamp(),
        status: 'Active',
        orders: [],
        customerName: sessionStartForm.customerName,
        customerPhone: sessionStartForm.customerPhone,
        sessionType: sessionStartForm.sessionType,
        userId: user.uid,
        createdAt: serverTimestamp()
      });
      setIsStartSessionModalOpen(false);
      setPendingRoom(null);
    } catch (err) {
      console.error(err);
    }
  };

  const handleStopCafeSession = async (session) => {
    if (!user) return;
    try {
      const end = new Date();
      const start = session.startTime?.seconds ? new Date(session.startTime.seconds * 1000) : new Date();
      const durationMs = Math.max(1, end - start);
      const durationMins = Math.floor(durationMs / 60000);
      const durationHours = durationMins / 60;

      const rate = session.hourlyRate || 30;

      const sessionCost = Math.ceil(durationHours * rate);
      const ordersCost = (session.orders || []).reduce((sum, o) => sum + (Number(o.sellPrice) * Number(o.quantity || 1)), 0);
      const totalAmount = sessionCost + ordersCost;

      await updateDoc(doc(db, 'cafeSessions', session.id), {
        status: 'Completed',
        endTime: serverTimestamp(),
        totalCost: totalAmount
      });

      const saleData = {
        invoiceId: session.sessionId || ('CAFE-' + Date.now().toString().slice(-6)),
        type: 'cafe',
        orderType: 'Dine-in',
        paymentMethod: 'Cash',
        customer: session.roomName,
        status: 'Completed',
        items: [
          { name: `Session Time (${durationMins}m)`, price: sessionCost, qty: 1 },
          ...(session.orders || []).map(o => ({ id: o.id, name: o.name, price: o.sellPrice, qty: o.quantity }))
        ],
        amount: totalAmount,
        location: 'Cafe',
        userId: user.uid,
        date: new Date().toISOString().split('T')[0],
        createdAt: serverTimestamp()
      };
      await addDoc(collection(db, 'sales'), saleData);
      handlePrintInvoice(saleData, 'Cafe Receipt');
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckoutCafeOrder = async (sessionId, cartItems) => {
    if (!user) return;
    try {
      const batch = writeBatch(db);
      for (const item of cartItems) {
        const recipe = recipes.find(r => r.id === item.id);
        if (recipe && recipe.ingredients) {
          recipe.ingredients.forEach(ing => {
            const ingRef = doc(db, 'inventory', ing.id);
            const invItem = inventory.find(i => i.id === ing.id);
            if (invItem) {
              const consumption = Number(ing.qty) * (Number(item.quantity) || 1);
              batch.update(ingRef, { quantity: Number(invItem.quantity) - consumption });
            }
          });
        } else {
          const itemRef = doc(db, 'inventory', item.id);
          const invItem = inventory.find(i => i.id === item.id);
          if (invItem) {
            batch.update(itemRef, { quantity: Number(invItem.quantity) - (Number(item.quantity) || 1) });
          }
        }
      }

      if (sessionId) {
        const session = cafeSessions.find(s => s.id === sessionId);
        const updatedOrders = [...(session.orders || []), ...cartItems];
        batch.update(doc(db, 'cafeSessions', sessionId), {
          orders: updatedOrders,
          updatedAt: serverTimestamp()
        });
      }
      await batch.commit();
      setCart([]);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveRoom = async (e) => {
    e.preventDefault();
    if (!user) return;
    try {
      if (roomForm.id) {
        await updateDoc(doc(db, 'cafeRooms', roomForm.id), {
          name: roomForm.name,
          type: roomForm.type,
          hourlyPrice: Number(roomForm.hourlyPrice)
        });
      } else {
        await addDoc(collection(db, 'cafeRooms'), {
          ...roomForm,
          hourlyPrice: Number(roomForm.hourlyPrice),
          userId: user.uid
        });
      }
      setRoomForm({ name: '', type: 'Cafe', hourlyPrice: 0 });
    } catch (err) { console.error(err); }
  };

  const handleDeleteRoom = async (id) => {
    if (!user || !window.confirm(t('confirmDelete'))) return;
    try { await deleteDoc(doc(db, 'cafeRooms', id)); } catch (err) { console.error(err); }
  };

  const handleSaveRecipe = async (e) => {
    e.preventDefault();
    if (!user || !recipeForm.name) return;
    try {
      if (recipeForm.id) {
        await updateDoc(doc(db, 'recipes', recipeForm.id), {
          name: recipeForm.name,
          category: recipeForm.category,
          sellPrice: recipeForm.sellPrice,
          ingredients: recipeForm.ingredients,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'recipes'), { ...recipeForm, userId: user.uid, createdAt: serverTimestamp() });
      }
      setRecipeForm({ name: '', category: 'Hot Drinks', sellPrice: '', ingredients: [] });
    } catch (err) { console.error(err); }
  };

  const handleDeleteRecipe = async (id) => {
    if (!user || !window.confirm(t('confirmDelete'))) return;
    try { await deleteDoc(doc(db, 'recipes', id)); } catch (err) { console.error(err); }
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

  const handlePrintInvoice = (invoiceData, type = 'Invoice', formatOverride = null) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const currentFormat = formatOverride || printFormat;

    const styles = currentFormat === 'Thermal' ? `
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
      .big-id { font-size: 3.5em; font-weight: 900; text-align: center; margin: 8px 0; border: 3px solid #000; padding: 5px; background: #fff; letter-spacing: 1px; line-height: 1; }
      .big-id-label { font-size: 0.8rem; font-weight: 900; text-transform: uppercase; display: block; margin-bottom: 2px; letter-spacing: 1px; color: #000; }
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
      // Resolve Site Details
      const site = sites.find(s => s.name === invoiceData.location) || {};
      // Logic: Use Site Name/Address/Phone if available, else fallback to Shop Settings
      // For Name: If Site Name exists, append it? Or replace? User asked for "details of that site".
      // Let's us Site Name if available, or Company Name.
      // Actually, maybe show Company Name AND Site Name?
      // User said "my site name also show...".
      const printName = shopSettings.name + (site.name ? ` - ${site.name}` : '');
      const printAddress = site.address || shopSettings.address;
      const printPhone = site.phone || shopSettings.phone;

      // Resolve Time
      let printTime = new Date().toLocaleTimeString();
      if (invoiceData.createdAt && invoiceData.createdAt.seconds) {
        printTime = new Date(invoiceData.createdAt.seconds * 1000).toLocaleTimeString();
      } else if (invoiceData.time) {
        printTime = invoiceData.time;
      }

      // Resolve Translated Payment Method
      const paymentMethodKey = (invoiceData.paymentMethod || 'Cash').toLowerCase().includes('visa') ? 'visa' :
        (invoiceData.paymentMethod || 'Cash').toLowerCase().includes('online') ? 'onlinePayment' : 'cash';
      const printPaymentMethod = t(paymentMethodKey);

      // Enhanced Calculation to handle different data structures
      const subtotal = Array.isArray(invoiceData.items)
        ? invoiceData.items.reduce((sum, item) => {
            const price = Number(item.price || item.sellPrice || 0);
            const qty = Number(item.qty || item.quantity || 1);
            return sum + (price * qty);
          }, 0)
        : Number(invoiceData.amount || 0);
      
      const total = subtotal; // Use calculated subtotal as primary truth

      if (printFormat === 'Thermal') {
        return `
      <div class="page ${isFirstPage && printDual ? 'page-break' : ''}">
        ${copyLabel ? `<div class="copy-label">${copyLabel}</div>` : ''}
        
        <div class="header">
          <div class="title">${printName}</div>
          <div class="subtitle">${printAddress} | ${printPhone}</div>
        </div>
        <div class="seller-info">${t('soldBy')}: ${invoiceData.soldBy || 'Admin'}</div>
        
        <div class="big-id">
          <span class="big-id-label">
            ${invoiceData.type === 'sale' ? t('orderNumber') : 
              (['cafe', 'service', 'service_pos', 'service_receipt'].includes(invoiceData.type) ? t('billNo') : t('id'))}
          </span>
          ${invoiceData.invoiceId ? (invoiceData.invoiceId.split('-').pop() || invoiceData.invoiceId) : 'N/A'}
        </div>

        <div class="invoice-title">${t('retailInvoice')}</div>

        <div class="details">
          <p><strong>${t('date')}:</strong> ${invoiceData.date || new Date().toLocaleDateString()}</p>
          <p><strong>${t('time')}:</strong> ${printTime}</p>
          <p><strong>${invoiceData.client || invoiceData.customer || t('customer')}</strong></p>
          <p><strong>ID:</strong> ${invoiceData.invoiceId || 'N/A'}</p>
          <p><strong>${t('paymentMode')}:</strong> ${printPaymentMethod}</p>
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
              <td class="right">${item.qty || item.quantity || 1}</td>
              <td class="right">${formatCurrency(Number(item.price || item.sellPrice || 0) * Number(item.qty || item.quantity || 1))}</td>
            </tr>
            `).join('') : `<tr><td colspan="3">${invoiceData.items}</td></tr>`}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row subtotal">
            <span>${t('subtotal')}</span>
            <span>${formatCurrency(subtotal)}</span>
          </div>
          ${(invoiceData.discount > 0) ? `
          <div class="totals-row discount">
             <span>${t('discount') || 'Discount'}</span>
             <span>-${formatCurrency(invoiceData.discount)}</span>
          </div>` : ''}
          <div class="totals-row total">
            <span>${t('total')}</span>
            <span>${formatCurrency(total)}</span>
          </div>
        </div>

        <div class="footer">
          <p>${t('thankYou')}</p>
        </div>

        ${(invoiceData.paymentMethod === 'Online') ? (() => {
            const subMethod = invoiceData.digitalSubMethod || digitalSubMethod || 'UPI';
            const payId = subMethod === 'InstaPay' ? shopSettings.instapayId : shopSettings.upiId;

            if (!payId) return '';

            const expiryTime = Date.now() + 600000; // 10 minutes
            const payUrl = `${window.location.origin}${window.location.pathname}?pay=${invoiceData.invoiceId || 'N/A'}&amt=${total.toFixed(2)}&id=${payId}&method=${subMethod}&pn=${encodeURIComponent(shopSettings.name)}&exp=${expiryTime}`;
            const label = subMethod === 'UPI' ? t('payWithUPI') : t('payWithInstapay');

            return `
          <div style="text-align: center; margin-top: 15px; border-top: 1px dashed #eee; padding-top: 10px;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(payUrl)}" style="width: 120px; height: 120px;" />
            <p style="font-size: 0.6em; margin-top: 5px; font-weight: bold;">${label || 'Scan to Pay'}</p>
            <p style="font-size: 0.5em; color: #666; margin-top: 2px;">(Valid for 10 minutes)</p>
          </div>
          `;
          })() : ''}
      </div>
        `;
      } else {
        // A4 Format (Improved Professional Layout)
        return `
      <div class="page ${isFirstPage && printDual ? 'page-break' : ''}">
        ${copyLabel ? `<div class="copy-label">${copyLabel}</div>` : ''}
        
        <div class="header" style="border-bottom: 4px solid #1e293b; padding-bottom: 15px; margin-bottom: 25px;">
          <div class="brand">
            <div class="title" style="font-size: 28px; color: #1e293b; letter-spacing: -0.5px;">${printName}</div>
            <div class="subtitle" style="font-size: 13px; font-weight: bold; color: #475569; margin-top: 4px;">${printAddress}</div>
            <div class="subtitle" style="font-size: 13px; color: #64748b;">${t('phone')}: ${printPhone}</div>
          </div>
          <div class="invoice-info">
            <h2 style="font-size: 32px; color: #cbd5e1; margin-bottom: 5px; font-weight: 900; text-transform: uppercase; line-height: 1;">${invoiceData.type === 'service' ? (t('serviceInvoice') || 'SERVICE INVOICE') : t('invoice')}</h2>
            <div style="font-size: 10px; color: #94a3b8; font-weight: bold; margin-bottom: 10px; text-align: right;">${t('retailInvoice').toUpperCase()}</div>
            <table style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; width: 100%;">
              <tr><td style="background: #f8fafc; border: none; font-size: 10px; width: 40%;">${t('date').toUpperCase()}</td><td style="border: none; font-weight: bold; font-size: 10px;">${invoiceData.date || new Date().toLocaleDateString()}</td></tr>
              <tr>
                <td style="background: #f8fafc; border: none; font-size: 10px;">
                  ${(invoiceData.type === 'sale' ? t('orderNumber') : 
                    (['cafe', 'service', 'service_pos', 'service_receipt'].includes(invoiceData.type) ? t('billNo') : t('id'))).toUpperCase()} #
                </td>
                <td style="border: none; font-weight: bold; font-size: 10px; color: #2563eb;">${invoiceData.invoiceId || 'N/A'}</td>
              </tr>
              ${invoiceData.sessionId ? `<tr><td style="background: #f8fafc; border: none; font-size: 10px;">SESSION #</td><td style="border: none; font-weight: bold; font-size: 10px;">${invoiceData.sessionId}</td></tr>` : ''}
              <tr><td style="background: #f8fafc; border: none; font-size: 10px;">${t('paymentMode').toUpperCase()}</td><td style="border: none; font-weight: bold; font-size: 10px;">${printPaymentMethod}</td></tr>
            </table>
          </div>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 30px;">
          <div style="flex: 1;">
            <div class="bill-to" style="background: #1e293b; border-radius: 4px; padding: 6px 15px; margin-bottom: 10px;">${t('billTo')}</div>
            <div class="bill-to-content" style="padding: 0 15px;">
              <div style="font-size: 14px; font-weight: bold; color: #1e293b; margin-bottom: 4px;">${invoiceData.client || invoiceData.customer || 'Customer Name'}</div>
              <div style="font-size: 12px; color: #64748b;">${invoiceData.customerPhone || ''}</div>
              <div style="font-size: 11px; color: #64748b; margin-top: 4px; font-style: italic;">ID: ${invoiceData.customerId || 'GEN-102'}</div>
            </div>
          </div>
          <div style="width: 180px; text-align: right;">
             ${(invoiceData.paymentMethod === 'Online') ? (() => {
            const subMethod = invoiceData.digitalSubMethod || digitalSubMethod || 'UPI';
            const payId = subMethod === 'InstaPay' ? shopSettings.instapayId : shopSettings.upiId;
            if (!payId) return '';
            const expiryTime = Date.now() + 600000;
            const payUrl = `${window.location.origin}${window.location.pathname}?pay=${invoiceData.invoiceId || 'N/A'}&amt=${total.toFixed(2)}&id=${payId}&method=${subMethod}&pn=${encodeURIComponent(shopSettings.name)}&exp=${expiryTime}`;
            return `<img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(payUrl)}" style="width: 80px; height: 80px; border: 1px solid #f1f5f9; padding: 5px; border-radius: 8px;" />
                    <p style="font-size: 8px; font-weight: bold; color: #94a3b8; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.5px;">Scan to Pay Online</p>`;
          })() : ''}
          </div>
        </div>

        <table class="items" style="margin-top: 10px;">
          <thead style="background: #f8fafc; border-bottom: 2px solid #e2e8f0;">
            <tr>
              <th style="color: #475569; padding: 14px 15px; width: 60%;">${t('description')}</th>
              <th class="center" style="color: #475569; padding: 14px 15px;">${t('qty')}</th>
              <th class="right" style="color: #475569; padding: 14px 15px;">${t('amount')}</th>
            </tr>
          </thead>
          <tbody>
            ${Array.isArray(invoiceData.items) ? invoiceData.items.map(item => `
            <tr>
              <td style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: 500;">
                 ${item.name}
                 ${item.serial ? `<div style="font-size: 9px; color: #94a3b8; font-family: monospace;">SN: ${item.serial}</div>` : ''}
              </td>
              <td class="center" style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #64748b;">${item.qty || item.quantity || 1}</td>
              <td class="right" style="padding: 12px 15px; border-bottom: 1px solid #f1f5f9; font-weight: bold; color: #1e293b;">${formatCurrency(Number(item.price || item.sellPrice || 0) * Number(item.qty || item.quantity || 1))}</td>
            </tr>
            `).join('') : `<tr><td colspan="3" style="padding: 12px 15px; text-align: center; color: #94a3b8;">${invoiceData.items}</td></tr>`}
          </tbody>
        </table>

        <div class="totals-section" style="margin-top: 40px;">
          <div class="comments" style="background: #f8fafc; border-radius: 12px; border: 1px dashed #e2e8f0;">
            <div class="comments-title" style="background: none; color: #475569; font-size: 11px;">${t('notes') || 'NOTES / REMARKS'}</div>
            <div class="comments-content" style="border: none; font-size: 10px; color: #64748b;">
              ${invoiceData.notes || t('thankYou')}
              <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #f1f5f9;">
                ${t('soldBy')}: <strong>${invoiceData.soldBy || 'Admin'}</strong>
              </div>
            </div>
          </div>
          <div class="totals">
            <div class="totals-row">
              <span style="color: #94a3b8;">${t('subtotal')}</span>
              <span style="font-weight: 600;">${formatCurrency(subtotal)}</span>
            </div>
            ${(invoiceData.discount > 0) ? `
            <div class="totals-row">
              <span style="color: #94a3b8;">${t('discount') || 'Discount'}</span>
              <span style="color: #ef4444; font-weight: 600;">-${formatCurrency(invoiceData.discount)}</span>
            </div>` : ''}
            <div class="totals-row total" style="background: #1e293b; color: #fff; border: none; border-radius: 8px; margin-top: 10px; padding: 12px 15px;">
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8;">${t('total')}</span>
              <span style="font-size: 18px;">${formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        <div class="footer" style="position: absolute; bottom: 50px; left: 50px; right: 50px;">
           <div style="display: flex; justify-content: space-between; border-top: 2px solid #f1f5f9; padding-top: 30px;">
              <div style="text-align: left;">
                 <p style="font-size: 9px; font-weight: bold; color: #94a3b8; margin-bottom: 40px;">AUTHORIZED SIGNATURE</p>
                 <div style="width: 150px; height: 1px; background: #e2e8f0;"></div>
              </div>
              <div style="text-align: right;">
                 <p style="font-size: 10px; font-weight: bold; color: #1e293b;">${shopSettings.name}</p>
                 <p style="font-size: 9px; color: #64748b;">${shopSettings.phone} | ${shopSettings.address}</p>
                 <p style="font-size: 9px; color: #94a3b8; margin-top: 8px;">THANK YOU FOR YOUR TRUST</p>
              </div>
           </div>
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



  // --- Barcode Generation & Printing ---
  const generateBarcode = () => {
    const random = Math.floor(10000000 + Math.random() * 90000000); // 8 digit random
    const code = `ITEM-${random}`;
    if (editingItem) {
      setEditingItem({ ...editingItem, barcode: code });
    } else {
      setNewItemForm({ ...newItemForm, barcode: code });
    }
  };

  const handlePrintBarcode = (item, mode = 'sticker') => {
    if (!item.barcode) return;
    const printWindow = window.open('', '', 'width=400,height=400');
    if (!printWindow) return;

    const isSticker = mode === 'sticker';

    const content = `
      <html>
        <head>
          <title>Barcode - ${item.name}</title>
          <style>
            body { margin: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: sans-serif; }
            .label { 
              text-align: center; 
              padding: 10px; 
              border: 1px dashed #eee; 
              width: 50mm; 
              height: 30mm; 
              display: flex; 
              flex-direction: column; 
              justify-content: center; 
              align-items: center;
            }
            @media print {
              .label { border: none; }
              body { height: auto; }
            }
            .name { font-size: 10px; font-weight: bold; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
            .price { font-size: 9px; font-weight: bold; margin-top: 2px; }
            #barcode { max-width: 100%; height: auto; }
          </style>
        </head>
        <body>
          <div class="label">
            <div style="font-size: 7px; font-weight: bold; color: #888; margin-bottom: 1px; text-transform: uppercase;">${shopSettings.name || 'FINN ERP'}</div>
            <div class="name">${item.name}</div>
            <svg id="barcode"></svg>
            <div class="price">${formatCurrency(item.sellPrice)}</div>
          </div>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
          <script>
            window.onload = function() {
              if (window.JsBarcode) {
                JsBarcode("#barcode", "${item.barcode}", {
                  format: "CODE128",
                  width: 1.5,
                  height: 35,
                  displayValue: true,
                  fontSize: 10,
                  margin: 2
                });
                window.focus();
                window.print();
              } else {
                // Retry if script not yet applied
                setTimeout(window.onload, 100);
              }
            };
          </script>
        </body>
      </html>
    `;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
  };

  const handlePrintBatchBarcodes = (itemConfigs, mode = barcodePrintMode) => {
    // itemConfigs can be an array of items (legacy) or an array of {item, qty}
    const expandedItems = [];
    itemConfigs.forEach(cfg => {
      if (cfg.item && cfg.qty !== undefined) {
        // New format: {item, qty}
        if (cfg.item.barcode && cfg.qty > 0) {
          for (let i = 0; i < cfg.qty; i++) {
            expandedItems.push(cfg.item);
          }
        }
      } else if (cfg.barcode) {
        // Legacy format: item object
        expandedItems.push(cfg);
      }
    });

    if (expandedItems.length === 0) {
      alert("No items with barcodes to print.");
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) return;

    const isSticker = mode === 'sticker';

    const content = `
    <html>
      <head>
        <title>Batch Barcodes - ${mode.toUpperCase()}</title>
        <style>
          body { margin: 0; padding: ${isSticker ? '0' : '20px'}; font-family: sans-serif; }
          .grid { 
            display: ${isSticker ? 'block' : 'grid'}; 
            grid-template-columns: ${isSticker ? 'none' : 'repeat(4, 1fr)'}; 
            gap: ${isSticker ? '0' : '10px'}; 
          }
          .label { 
            text-align: center; 
            padding: ${isSticker ? '10px' : '15px'}; 
            border: ${isSticker ? 'none' : '1px solid #eee'}; 
            break-inside: avoid;
            ${isSticker ? 'width: 50mm; height: 30mm; display: flex; flex-direction: column; justify-content: center; align-items: center; border-bottom: 1px dashed #ccc;' : ''}
          }
          @media print {
            .label { 
              border: ${isSticker ? 'none' : '1px solid #ddd'}; 
              ${isSticker ? 'page-break-after: always; border-bottom: none;' : ''}
            }
            body { margin: 0; padding: ${isSticker ? '0' : '10mm'}; }
          }
          .name { font-size: ${isSticker ? '10px' : '12px'}; font-weight: bold; margin-bottom: 2px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
          .price { font-size: ${isSticker ? '9px' : '10px'}; font-weight: bold; margin-top: 2px; }
          svg { max-width: 100%; height: auto; }
        </style>
      </head>
      <body>
        <div class="grid">
          ${expandedItems.map((item, idx) => `
            <div class="label">
              <div style="font-size: 7px; font-weight: bold; color: #888; margin-bottom: 1px; text-transform: uppercase;">${shopSettings.name || 'FINN ERP'}</div>
              <div class="name">${item.name}</div>
              <svg id="barcode-${idx}"></svg>
              <div class="price">${formatCurrency(item.sellPrice)}</div>
            </div>
          `).join('')}
        </div>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <script>
          window.onload = function() {
            if (window.JsBarcode) {
              ${expandedItems.map((item, idx) => `
                JsBarcode("#barcode-${idx}", "${item.barcode}", {
                  format: "CODE128",
                  width: ${isSticker ? '1.5' : '1.4'},
                  height: ${isSticker ? '35' : '40'},
                  displayValue: true,
                  fontSize: 8,
                  margin: 2
                });
              `).join('')}
              window.focus();
              window.print();
            } else {
              setTimeout(window.onload, 100);
            }
          };
        </script>
      </body>
    </html>
  `;
    printWindow.document.open();
    printWindow.document.write(content);
    printWindow.document.close();
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

  const handleCheckoutServiceCart = async (format) => {
    if (serviceCart.length === 0) return;
    const currentId = `SRV-${Math.random().toString(36).substr(2, 6).toUpperCase()}`;
    const total = serviceCart.reduce((a, b) => a + (Number(b.sellPrice) * Number(b.quantity)), 0);
    const invData = {
      invoiceId: currentId,
      type: 'service_pos',
      client: newSaleForm.customer || 'Service Customer',
      date: new Date().toLocaleDateString(),
      items: serviceCart.map(i => ({ ...i, price: i.sellPrice, qty: i.quantity })),
      amount: total,
      paymentMethod: paymentMethod,
      soldBy: salesEmployee ? salesEmployee.name : user.email,
      location: 'Repair Shop',
      userId: user.uid,
      createdAt: serverTimestamp(),
      orderType: orderType
    };
    try {
      const saleRef = await addDoc(collection(db, 'sales'), invData);
      const batch = writeBatch(db);
      serviceCart.forEach(item => {
        if (item.type === 'part') {
          const invItem = inventory.find(i => i.id === item.id);
          if (invItem) { batch.update(doc(db, 'inventory', item.id), { quantity: Number(invItem.quantity) - Number(item.quantity) }); }
        }
      });
      await batch.commit();
      handlePrintInvoice({ ...invData, id: saleRef.id }, format === 'Thermal' ? 'Service Receipt' : 'Service Invoice', format);
      setServiceCart([]);
      setNewSaleForm({ ...newSaleForm, customer: '', customerId: '' });
      alert('Sale Completed!');
    } catch (e) { console.error(e); }
  };

  // --- Actions (Firestore) ---
  const handleAddEmployee = async (e) => {
    e.preventDefault();
    if (!user) {
      alert(t('errorNoUser'));
      return;
    }

    // Debug


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
      setNewEmployeeForm({ name: '', role: '', dept: 'Security', location: '', shift: 'Morning (12 Hours)', salary: 60000, salaryMethod: 'Monthly', bonus: 0, overtime: 0, deductionHours: 0, photo: '' });
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
      address: newSiteForm.address || '',
      phone: newSiteForm.phone || '',
      userId: user.uid,
      createdAt: serverTimestamp()
    });
    setIsAddSiteModalOpen(false);
    setNewSiteForm({ name: '', city: '', manager: '', status: 'Operational', address: '', phone: '' });
  };

  const handleUpdateSite = async (id, field, value) => {
    // Basic validation or formatting if needed
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
        data = attendance
          .filter(r => !reportLocationFilter || getEmployeeLocation(r.name) === reportLocationFilter)
          .map(r => [r.name, r.date, getEmployeeLocation(r.name), translateStatus(r.status)]);
        filename = 'FinnERP_Attendance.pdf';
        break;
      case 'payroll':
        headers = [t('employeeName'), t('role'), t('dept'), `${t('basicSalary')} (${currency})`, `${t('bonus')} (${currency})`, `${t('overtime')} (${currency})`, `${t('total')} (${currency})`];
        const filteredEmployees = employees.filter(e => !reportLocationFilter || e.location === reportLocationFilter);
        data = filteredEmployees.map(e => {
          const salary = Number(e.salary) || 0;
          const bonus = Number(e.bonus) || 0;
          const overtime = Number(e.overtime) || 0;
          const total = salary + bonus + overtime;
          return [e.name, e.role, e.dept, salary, bonus, overtime, total];
        });

        // Add Totals Row
        const totalSalary = filteredEmployees.reduce((sum, e) => sum + (Number(e.salary) || 0), 0);
        const totalBonus = filteredEmployees.reduce((sum, e) => sum + (Number(e.bonus) || 0), 0);
        const totalOvertime = filteredEmployees.reduce((sum, e) => sum + (Number(e.overtime) || 0), 0);
        const totalTotal = totalSalary + totalBonus + totalOvertime;

        // Add empty row then totals
        data.push([]);
        data.push(['', '', t('dashboardTotal').toUpperCase(), totalSalary, totalBonus, totalOvertime, totalTotal]);

        extraMetadata = [`${t('payPeriod')}: ${payrollMonthFilter}`];
        filename = 'FinnERP_Payroll.pdf';
        break;
      case 'turnover':
        headers = [t('employeeName'), t('role'), t('dept'), t('status'), t('location')];
        data = employees
          .filter(e => !reportLocationFilter || e.location === reportLocationFilter)
          .map(e => [e.name, e.role, e.dept, e.status, e.location]);
        filename = 'FinnERP_Staff.pdf';
        break;
      case 'tax':
        headers = [t('employeeName'), `${t('total')} (${currency})`, `${t('tax')} (20%)`, t('netPay')];
        data = employees
          .filter(e => !reportLocationFilter || e.location === reportLocationFilter)
          .map(e => {
            const total = (Number(e.salary) || 0) + (Number(e.bonus) || 0) + (Number(e.overtime) || 0);
            const tax = total * 0.2;
            return [e.name, total, tax, total - tax];
          });
        filename = 'FinnERP_Tax.pdf';
        break;
      case 'weekly_sales':
        headers = [t('date'), t('invoiceId'), t('type'), t('customer'), t('itemsSummary'), t('total')];
        const sevenDaysAgoSales = new Date();
        sevenDaysAgoSales.setDate(sevenDaysAgoSales.getDate() - 7);

        data = sales
          .filter(s => {
            const date = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date);
            // Weekly filter AND Location Filter
            return date >= sevenDaysAgoSales &&
              (!reportLocationFilter || s.location === reportLocationFilter);
          })
          .map(s => {
            const date = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date);
            const itemsSummary = Array.isArray(s.items) ? s.items.map(i => `${i.qty}x ${i.name}`).join('; ') : t('na');
            const typeLabel = s.orderType === 'Walk-in' ? t('walkIn') : (s.orderType === 'Takeaway' ? t('takeaway') : s.orderType);

            return [
              date.toLocaleString(),
              s.invoiceId || t('na'),
              typeLabel,
              s.customer || t('walkInCustomer'),
              itemsSummary,
              s.amount
            ];
          });
        filename = 'Weekly_Sales_Report.pdf';
        break;
      case 'weekly_buy':
        // For "Buy Report", we look at Inventory items updated recently
        headers = [t('lastUpdated'), t('itemName'), t('location'), t('buyPrice'), t('sellPrice'), t('quantity'), t('stockValueBuy'), t('stockValueSell')];
        const sevenDaysAgoInv = new Date();
        sevenDaysAgoInv.setDate(sevenDaysAgoInv.getDate() - 7);

        data = inventory
          .filter(i => {
            const date = i.updatedAt?.seconds ? new Date(i.updatedAt.seconds * 1000) : new Date();
            // Weekly Filter AND Location Filter
            return date >= sevenDaysAgoInv &&
              (!reportLocationFilter || i.location === reportLocationFilter);
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
        filename = 'Weekly_Inventory_Buy_Report.pdf';
        break;
      case 'profit_loss':
        headers = [t('category'), t('details'), t('amount')];
        let startDate, endDate, periodLabel;

        if (profitPeriod === 'Daily') {
          startDate = new Date(profitDateFilter);
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(profitDateFilter);
          endDate.setHours(23, 59, 59, 999);
          periodLabel = profitDateFilter;
        } else if (profitPeriod === 'Weekly') {
          const selectedDate = new Date(profitDateFilter);
          const day = selectedDate.getDay();
          const diff = selectedDate.getDate() - day + (day === 0 ? -6 : 1); // Monday start
          startDate = new Date(selectedDate.setDate(diff));
          startDate.setHours(0, 0, 0, 0);
          endDate = new Date(startDate);
          endDate.setDate(startDate.getDate() + 6);
          endDate.setHours(23, 59, 59, 999);
          periodLabel = `${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`;
        } else if (profitPeriod === 'Yearly') {
          startDate = new Date(profitYearFilter + '-01-01');
          endDate = new Date(profitYearFilter + '-12-31');
          endDate.setHours(23, 59, 59, 999);
          periodLabel = profitYearFilter;
        } else {
          // Monthly
          startDate = new Date(profitMonthFilter + '-01');
          endDate = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0);
          endDate.setHours(23, 59, 59, 999);
          periodLabel = profitMonthFilter;
        }


        // 1. Revenue Analysis
        const filteredSales = sales.filter(s => {
          const d = s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date);
          return d >= startDate && d <= endDate && (!reportLocationFilter || s.location === reportLocationFilter);
        });

        const revByMethod = {};
        let totalRevenue = 0;
        filteredSales.forEach(s => {
          const method = s.paymentMethod || 'Cash';
          if (!revByMethod[method]) revByMethod[method] = 0;
          revByMethod[method] += (s.amount || 0);
          totalRevenue += (s.amount || 0);
        });

        // 2. COGS
        let totalCogs = 0;
        filteredSales.forEach(sale => {
          if (Array.isArray(sale.items)) {
            sale.items.forEach(soldItem => {
              const invItem = inventory.find(i => i.name === soldItem.name);
              const cost = invItem ? (invItem.buyPrice || 0) : 0;
              totalCogs += cost * (soldItem.qty || 0);
            });
          }
        });

        const grossProfitVal = totalRevenue - totalCogs;

        // 3. Operating Expenses - Employee Payroll by Department
        const periodEmployees = employees.filter(e => !reportLocationFilter || e.location === reportLocationFilter);

        // Calculate period duration in days
        const periodDays = Math.max(1, Math.round((endDate - startDate) / (1000 * 60 * 60 * 24)));

        // Group employees by department
        const employeesByDept = {};
        let totalPayrollExpenses = 0;

        periodEmployees.forEach(emp => {
          const dept = emp.dept || t('unassigned');
          if (!employeesByDept[dept]) {
            employeesByDept[dept] = [];
          }

          // Calculate employee's total compensation SCALEABLE for the period
          const rawSalary = Number(emp.salary) || 0;
          const salaryMethod = emp.salaryMethod || 'Monthly';
          let proportionalSalary = 0;

          // Scaling Logic based on Salary Method
          if (salaryMethod === 'Monthly') {
            proportionalSalary = (rawSalary / 30) * periodDays;
          } else if (salaryMethod === 'Weekly') {
            proportionalSalary = (rawSalary / 7) * periodDays;
          } else if (salaryMethod === 'Daily') {
            proportionalSalary = rawSalary * periodDays;
          } else if (salaryMethod === 'Hourly') {
            // Heuristic: Assuming 8 hour work day for hourly estimate if not explicitly tracked
            proportionalSalary = (rawSalary * 8) * periodDays;
          }

          const bonus = Number(emp.bonus) || 0;
          const overtime = Number(emp.overtime) || 0;

          // Scale bonus/overtime too if it's a short period? 
          // Usually bonus/overtime in the profile is a periodic estimate. 
          // For simplicity, we scale everything by the same logic to keep budget realistic.
          const totalComp = proportionalSalary + ((bonus + overtime) / 30) * periodDays;

          employeesByDept[dept].push({
            name: emp.name,
            totalComp: totalComp
          });

          totalPayrollExpenses += totalComp;
        });

        // 4. Other Expenses (Inventory Purchases)
        const periodPurchases = purchases.filter(p => {
          const d = p.date ? new Date(p.date) : new Date();
          return d >= startDate && d <= endDate && (!reportLocationFilter || p.location === reportLocationFilter);
        });
        const totalOtherExpenses = periodPurchases.reduce((sum, p) => sum + (p.amount || 0), 0);

        // Total Operating Expenses
        const totalOperatingExpenses = totalPayrollExpenses + totalOtherExpenses;

        // Net profit = Gross Profit - Operating Expenses
        const netProfitVal = grossProfitVal - totalOperatingExpenses;

        // ============================================================
        // P&L: Build a Premium Multi-Table PDF directly (bypass generic generatePDF)
        // ============================================================
        const plFilename = `Profit_Loss_${profitPeriod}_${periodLabel.replace(/\//g, '-')}.pdf`;
        const plMeta = [`${t('period')}: ${t(profitPeriod.toLowerCase())} (${periodLabel})`, `${t('location')}: ${reportLocationFilter || t('filterAll')}`];

        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
        const pageWidth = doc.internal.pageSize.width;
        const pageHeight = doc.internal.pageSize.height;

        const drawPageFooter = () => {
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(`FINN ERP - ${plFilename.replace('.pdf', '')}`, 15, pageHeight - 8);
          const pn = `${t('page')} ${doc.internal.getNumberOfPages()}`;
          doc.text(pn, pageWidth - 15 - doc.getTextWidth(pn), pageHeight - 8);
        };

        const tableDefaults = (startY) => ({
          startY,
          theme: 'striped',
          styles: { font: 'helvetica', fontSize: 8.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
          headStyles: { fillColor: [30, 41, 59], textColor: 255, fontSize: 9, fontStyle: 'bold' },
          alternateRowStyles: { fillColor: [248, 250, 252] },
          margin: { left: 15, right: 15, bottom: 18 },
          didDrawPage: drawPageFooter,
          didParseCell: (d) => {
            const v = d.cell.raw;
            if (typeof v === 'number') {
              d.cell.styles.halign = 'right';
              if (v < 0) d.cell.styles.textColor = [220, 38, 38];
              else if (v > 0 && d.column.index > 0) d.cell.styles.textColor = [22, 163, 74];
            }
          }
        });

        // ── DRAW HEADER ─────────────────────────────────────────────
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(20);
        doc.setTextColor(15, 23, 42);
        doc.text((shopSettings.name?.toUpperCase() || 'FINN ERP'), 15, 18);
        doc.setFontSize(10);
        doc.setTextColor(59, 130, 246);
        doc.text(`${t('profit_loss').toUpperCase()} — ${t(profitPeriod.toLowerCase()).toUpperCase()}`, 15, 25);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(100, 116, 139);
        doc.text(`${t('date')}: ${new Date().toLocaleString()}`, 15, 31);
        doc.text(plMeta.join('   |   '), 15, 36);
        doc.setDrawColor(203, 213, 225);
        doc.setLineWidth(0.4);
        doc.line(15, 39, pageWidth - 15, 39);

        // ── SECTION 1: INCOME STATEMENT ─────────────────────────────
        const incomeRows = [
          // Revenue
          ...Object.entries(revByMethod).map(([m, amt]) => [t(m.toLowerCase()) || m, amt]),
          [{ content: t('totalRevenue'), styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 64, 175] } }, { content: totalRevenue, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255], textColor: [30, 64, 175] } }],
          // COGS
          [t('cogsFull'), -totalCogs],
          [{ content: t('grossProfit'), styles: { fontStyle: 'bold' } }, { content: grossProfitVal, styles: { fontStyle: 'bold', halign: 'right', textColor: grossProfitVal >= 0 ? [22, 163, 74] : [220, 38, 38] } }],
          [t('grossMargin'), ((totalRevenue ? grossProfitVal / totalRevenue : 0) * 100).toFixed(1) + '%'],
          // Expenses
          ...Object.entries(employeesByDept).flatMap(([dept, emps]) => [
            [`  ${translations[language]?.[dept.toLowerCase()] || dept}`, ''],
            ...emps.map(emp => [`    ${emp.name}`, -emp.totalComp])
          ]),
          [t('invPurchases'), -totalOtherExpenses],
          [{ content: t('totalExpenses'), styles: { fontStyle: 'bold', fillColor: [254, 242, 242], textColor: [153, 27, 27] } }, { content: -totalOperatingExpenses, styles: { fontStyle: 'bold', halign: 'right', fillColor: [254, 242, 242], textColor: [153, 27, 27] } }],
          // Net
          [{ content: netProfitVal >= 0 ? t('netProfit') : t('netLoss'), styles: { fontStyle: 'bold', fillColor: netProfitVal >= 0 ? [240, 253, 244] : [254, 242, 242], textColor: netProfitVal >= 0 ? [21, 128, 61] : [153, 27, 27], fontSize: 10 } }, { content: netProfitVal, styles: { fontStyle: 'bold', halign: 'right', fillColor: netProfitVal >= 0 ? [240, 253, 244] : [254, 242, 242], textColor: netProfitVal >= 0 ? [21, 128, 61] : [153, 27, 27], fontSize: 10 } }],
          [t('netMargin'), ((totalRevenue ? netProfitVal / totalRevenue : 0) * 100).toFixed(1) + '%']
        ];

        const incomeHeadRows = [
          [{ content: t('incomeStatement').toUpperCase() + ` (${t(profitPeriod.toLowerCase())})`, colSpan: 2, styles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: 'bold', fontSize: 10, halign: 'left' } }],
          [t('description'), t('amount')]
        ];

        autoTable(doc, {
          head: incomeHeadRows,
          body: incomeRows,
          ...tableDefaults(44),
          columnStyles: {
            0: { cellWidth: 130 },
            1: { cellWidth: 40, halign: 'right' }
          },
          didParseCell: (d) => {
            if (d.row.section === 'head') return;
            const v = d.cell.raw;
            if (typeof v === 'number') {
              d.cell.styles.halign = 'right';
              if (v < 0) d.cell.styles.textColor = [220, 38, 38];
            }
            const t0 = String(d.row.raw[0]?.content || d.row.raw[0] || '');
            if (t0.startsWith('    ')) { d.cell.styles.cellPadding = { left: 12 }; d.cell.styles.textColor = [100, 116, 139]; }
            else if (t0.startsWith('  ')) { d.cell.styles.cellPadding = { left: 7 }; d.cell.styles.fontStyle = 'bold'; }
          }
        });

        // ── SECTION 2: SOLD ITEMS ────────────────────────────────────
        const soldRows = [];
        let sumSoldQty2 = 0, sumSoldSales2 = 0, sumSoldCost2 = 0, sumSoldProfit2 = 0;

        filteredSales.forEach(sale => {
          if (Array.isArray(sale.items)) {
            sale.items.forEach(item => {
              const invItem = inventory.find(i => i.name === item.name);
              const ubp = invItem ? (Number(invItem.buyPrice) || 0) : 0;
              const usp = Number(item.price) || 0;
              const qty = Number(item.qty) || 1;
              const ts = usp * qty, tc = ubp * qty, pr = ts - tc;
              sumSoldQty2 += qty; sumSoldSales2 += ts; sumSoldCost2 += tc; sumSoldProfit2 += pr;
              soldRows.push([item.name || t('unknown'), qty, usp, ubp, ts, tc, pr]);
            });
          }
        });
        soldRows.push([
          { content: t('totals').toUpperCase(), styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
          { content: sumSoldQty2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
          { content: '', styles: { fillColor: [239, 246, 255] } },
          { content: '', styles: { fillColor: [239, 246, 255] } },
          { content: sumSoldSales2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
          { content: sumSoldCost2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
          { content: sumSoldProfit2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255], textColor: sumSoldProfit2 >= 0 ? [21, 128, 61] : [153, 27, 27] } }
        ]);

        const nextY1 = doc.lastAutoTable.finalY + 8;
        autoTable(doc, {
          head: [
            [{ content: t('soldItemsDetail').toUpperCase(), colSpan: 7, styles: { fillColor: [15, 118, 110], textColor: 255, fontStyle: 'bold', fontSize: 10 } }],
            [t('itemName'), t('quantity'), t('sellPrice'), t('buyPrice'), t('total'), t('totalCost'), t('profit')]
          ],
          body: soldRows,
          ...tableDefaults(nextY1),
          columnStyles: {
            0: { cellWidth: 50 },
            1: { halign: 'right' },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right' },
            5: { halign: 'right' },
            6: { halign: 'right', fontStyle: 'bold' }
          },
          didParseCell: (d) => {
            if (d.row.section === 'head') return;
            const v = d.cell.raw;
            if (typeof v === 'number') {
              d.cell.styles.halign = 'right';
              if (v < 0) d.cell.styles.textColor = [220, 38, 38];
            }
          }
        });

        // ── SECTION 3: BOUGHT ITEMS ──────────────────────────────────
        const boughtRows = [];
        let sumBoughtQty2 = 0, sumBoughtAmt2 = 0;

        periodPurchases.forEach(p => {
          const label = p.name || p.description || p.itemName || '-';
          const dateStr = p.date ? new Date(p.date).toLocaleDateString() : '-';
          const amt = Number(p.amount) || 0;
          const qtyVal = Number(p.quantity) || Number(p.qty) || 1;
          const unitCost = qtyVal > 0 ? (amt / qtyVal).toFixed(2) : amt;
          const qtyDisplay = p.quantity ? p.quantity + (p.unit ? ' ' + p.unit : '') : (p.qty || '-');
          if (!isNaN(qtyVal)) sumBoughtQty2 += qtyVal;
          sumBoughtAmt2 += amt;
          boughtRows.push([label, dateStr, qtyDisplay, unitCost, amt]);
        });
        boughtRows.push([
          { content: t('totals').toUpperCase(), styles: { fontStyle: 'bold', fillColor: [239, 246, 255], textColor: [30, 64, 175] } },
          '',
          { content: sumBoughtQty2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255] } },
          '',
          { content: sumBoughtAmt2, styles: { fontStyle: 'bold', halign: 'right', fillColor: [239, 246, 255], textColor: [30, 64, 175] } }
        ]);

        const nextY2 = doc.lastAutoTable.finalY + 8;
        autoTable(doc, {
          head: [
            [{ content: t('boughtItemsDetail').toUpperCase(), colSpan: 5, styles: { fillColor: [124, 58, 237], textColor: 255, fontStyle: 'bold', fontSize: 10 } }],
            [t('description'), t('date'), t('quantity'), t('unitCost'), t('amount')]
          ],
          body: boughtRows,
          ...tableDefaults(nextY2),
          columnStyles: {
            0: { cellWidth: 60 },
            2: { halign: 'right' },
            3: { halign: 'right' },
            4: { halign: 'right', fontStyle: 'bold' }
          },
          didParseCell: (d) => {
            if (d.row.section === 'head') return;
            const v = d.cell.raw;
            if (typeof v === 'number') {
              d.cell.styles.halign = 'right';
              if (v < 0) d.cell.styles.textColor = [220, 38, 38];
            }
          }
        });

        drawPageFooter();
        doc.save(plFilename);
        return; // skip generic generatePDF call below

      default: return;
    }
    generatePDF(headers, data, filename, extraMetadata);
  };

  // --- High-Speed POS & Scanner Features (Grouped here to avoid TDZ) ---

  const handleHoldCart = () => {
    if (cart.length === 0) return;
    setHeldCarts(prev => [...prev, {
      id: Date.now(),
      cart: [...cart],
      cartDiscount,
      salesEmployee,
      customer: newSaleForm.customer,
      orderType,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }]);
    setCart([]);
    setCartDiscount(0);
    setSalesEmployee(null);
  };

  const handleResumeCart = (heldId) => {
    const held = heldCarts.find(h => h.id === heldId);
    if (!held) return;
    if (cart.length > 0) {
      if (!window.confirm(t('resumeWarning') || 'Resuming will overwrite current cart. Continue?')) return;
    }
    setCart(held.cart);
    setCartDiscount(held.cartDiscount);
    setSalesEmployee(held.salesEmployee);
    setNewSaleForm(prev => ({ ...prev, customer: held.customer }));
    setOrderType(held.orderType);
    setHeldCarts(prev => prev.filter(h => h.id !== heldId));
  };

  // Barcode Scanner
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const scannerRef = useRef(null);
  const activeTracksRef = useRef([]); // Critical for force-killing camera
  const inventoryRef = useRef(inventory);

  // Keep inventoryRef updated without triggering re-renders of stable callbacks
  useEffect(() => {
    inventoryRef.current = inventory;
  }, [inventory]);

  const onScanSuccess = useCallback(async (decodedText) => {
    const code = decodedText.trim();
    const item = inventoryRef.current.find(i => i.barcode === code);
    if (!item) {
      alert(t('itemNotFound') || 'Item with barcode: ' + code + ' not found in inventory.');
      return;
    }

    if (scannerMode === 'sell') {
      if (item.quantity > 0) {
        addToCart(item);
        setIsScannerOpen(false);
      } else {
        alert(item.name + " " + (t('outOfStock') || 'is out of stock!'));
      }
    } else if (scannerMode === 'buy') {
      const moreStock = prompt(`${t('quickStockIn') || 'Quick Stock In'}: ${item.name}\n${t('currentQuantity') || 'Current'}: ${item.quantity}\n${t('enterAddedQty') || 'Enter added quantity'}:`, "1");
      if (moreStock !== null && !isNaN(moreStock) && Number(moreStock) > 0) {
        try {
          const itemRef = doc(db, 'inventory', item.id);
          await updateDoc(itemRef, { quantity: Number(item.quantity) + Number(moreStock) });
        } catch (err) {
          alert("Error updating stock: " + err.message);
        }
      }
    }
  }, [addToCart, t, scannerMode]); // Removed inventory dependency to stop re-creation and flickering

  const onScanError = useCallback((err) => { }, []);

  // --- Barcode / Scanner Buffering (Hardware Scanners) ---
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // If we're typing in a search field, we might still want to catch barcodes
      // but if the user is in a modal or editing another field, maybe not.
      // However, hardware scanners usually act as a keyboard.
      // A common pattern is to only buffer if keys are typed very fast (<50ms apart).

      const currentTime = Date.now();
      const timeDiff = currentTime - lastKeyTime.current;
      lastKeyTime.current = currentTime;

      // Handle Enter (Common suffix for POS scanners)
      if (e.key === 'Enter') {
        if (barcodeBuffer.current.length >= 3) {
          // It looks like a barcode was scanned
          const scanned = barcodeBuffer.current;
          barcodeBuffer.current = '';

          // If we are in the Sales tab, try to add to cart
          if (activeTab === 'sales_purchases') {
            onScanSuccess(scanned);
            e.preventDefault();
            return;
          }

          // If we are in warehouse and scanning for something
          if (activeTab === 'warehouses' && scannerMode === 'buy') {
            onScanSuccess(scanned);
            e.preventDefault();
            return;
          }
        }
        barcodeBuffer.current = '';
        return;
      }

      // Buffer characters
      if (e.key.length === 1) {
        // If the gap between keys is too long, it's probably manual typing
        if (timeDiff > 50) {
          barcodeBuffer.current = e.key;
        } else {
          barcodeBuffer.current += e.key;
        }
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [activeTab, inventory, scannerMode, onScanSuccess]); // Re-bind when tab, inventory or onScanSuccess changes

  const [hasFlash, setHasFlash] = useState(false);
  const [isFlashOn, setIsFlashOn] = useState(false);
  const [hasZoom, setHasZoom] = useState(false);
  const [zoomRange, setZoomRange] = useState({ min: 1, max: 1, step: 0.1 });
  const [currentZoom, setCurrentZoom] = useState(1);

  useEffect(() => {
    let isMounted = true;
    let html5QrCode = null;
    const originalGetUserMedia = navigator.mediaDevices?.getUserMedia?.bind(navigator.mediaDevices);

    // Intercept all camera requests to ensure we can kill tracks even if the library hangs
    if (navigator.mediaDevices && originalGetUserMedia) {
      navigator.mediaDevices.getUserMedia = async (constraints) => {
        try {
          const stream = await originalGetUserMedia(constraints);
          if (!isMounted) {
            stream.getTracks().forEach(t => t.stop());
          } else {
            activeTracksRef.current = [...activeTracksRef.current, ...stream.getTracks()];
          }
          return stream;
        } catch (err) {
          throw err;
        }
      };
    }

    if (isScannerOpen) {
      // Small safety delay for React modal render
      const initTimeout = setTimeout(() => {
        if (!isMounted) return;
        startScannerLogic();
      }, 500);

      async function startScannerLogic() {
        const element = document.getElementById("reader");
        if (!element || !isMounted) return;

        html5QrCode = new Html5Qrcode("reader");
        scannerRef.current = html5QrCode;

        const startScanner = async (cameraId) => {
          if (!isMounted) return;
          try {
            // Simplified constraints for maximum compatibility
            const constraints = cameraId ? { deviceId: cameraId } : { facingMode: "environment" };

            await html5QrCode.start(
              constraints,
              {
                fps: 25,
                qrbox: { width: 280, height: 160 },
                disableFlip: true,
                formatsToSupport: [
                  Html5QrcodeSupportedFormats.QR_CODE,
                  Html5QrcodeSupportedFormats.UPC_A,
                  Html5QrcodeSupportedFormats.UPC_E,
                  Html5QrcodeSupportedFormats.EAN_13,
                  Html5QrcodeSupportedFormats.EAN_8,
                  Html5QrcodeSupportedFormats.CODE_39,
                  Html5QrcodeSupportedFormats.CODE_128,
                  Html5QrcodeSupportedFormats.ITF,
                ]
              },
              onScanSuccess,
              onScanError
            );

            // Capture the track immediately for robust cleanup
            const track = html5QrCode.getRunningTrack();
            if (track) {
              activeTracksRef.current = [track];
              const capabilities = track.getCapabilities();
              if (capabilities.focusMode?.includes("continuous")) {
                await track.applyConstraints({ focusMode: "continuous" });
              }
              if (capabilities.zoom) {
                setHasZoom(true);
                setZoomRange({
                  min: capabilities.zoom.min || 1,
                  max: capabilities.zoom.max || 1,
                  step: capabilities.zoom.step || 0.1
                });
                setCurrentZoom(track.getSettings().zoom || 1);
              }
              if (capabilities.torch) setHasFlash(true);
            }

            if (!isMounted) {
              html5QrCode.stop().then(() => {
                html5QrCode.clear();
                activeTracksRef.current.forEach(t => t.stop());
                activeTracksRef.current = [];
              }).catch(e => { });
              return;
            }
          } catch (err) {
            console.error("Scanner startup error:", err);
            // Deep Fallback: No constraints
            if (isMounted) {
              try {
                await html5QrCode.start({ facingMode: "environment" }, { fps: 15, qrbox: 250 }, onScanSuccess, onScanError);
                const track = html5QrCode.getRunningTrack();
                if (track) activeTracksRef.current = [track];
                if (!isMounted) {
                  html5QrCode.stop().then(() => {
                    activeTracksRef.current.forEach(t => t.stop());
                    activeTracksRef.current = [];
                  }).catch(e => { });
                }
              } catch (e) { }
            }
          }
        };

        Html5Qrcode.getCameras().then(devices => {
          if (!isMounted) return;
          if (devices && devices.length > 0) {
            setCameras(devices);
            const backCamera = devices.find(d =>
              (d.label?.toLowerCase().includes('back') || d.label?.toLowerCase().includes('rear')) &&
              !d.label?.toLowerCase().includes('wide') && !d.label?.toLowerCase().includes('2')
            ) || devices.find(d => d.label?.toLowerCase().includes('back') || d.label?.toLowerCase().includes('rear')) || devices[0];

            const selectedId = activeCameraId || backCamera.id;
            setActiveCameraId(selectedId);
            startScanner(selectedId);
          } else {
            startScanner();
          }
        }).catch(() => {
          if (isMounted) startScanner();
        });
      }

      return () => {
        isMounted = false;
        clearTimeout(initTimeout);

        // Restore original getUserMedia
        if (originalGetUserMedia) {
          navigator.mediaDevices.getUserMedia = originalGetUserMedia;
        }

        // Immediate hardware kill - doesn't rely on the DOM or library status
        const forceKillHardware = () => {
          activeTracksRef.current.forEach(track => {
            try { track.stop(); } catch (e) { }
          });
          activeTracksRef.current = [];

          // Last resort: search for any stray video elements
          const strayVideos = document.querySelectorAll('video');
          strayVideos.forEach(v => {
            if (v.srcObject) {
              v.srcObject.getTracks().forEach(t => t.stop());
              v.srcObject = null;
            }
          });
        };

        if (html5QrCode) {
          try {
            // Only stop if actually running to avoid "Cannot stop" error
            if (html5QrCode.isScanning) {
              html5QrCode.stop()
                .then(() => {
                  try { html5QrCode.clear(); } catch (e) { }
                  forceKillHardware();
                })
                .catch(() => forceKillHardware());
            } else {
              forceKillHardware();
            }
          } catch (e) {
            forceKillHardware();
          }
        } else {
          forceKillHardware();
        }
        scannerRef.current = null;
      };
    } else {
      setIsFlashOn(false);
      setHasFlash(false);
      setHasZoom(false);
      setCurrentZoom(1);
    }
  }, [isScannerOpen, activeCameraId]); // Only restart if camera ID or Open state changes explicitly

  const handleZoomChange = async (e) => {
    const value = parseFloat(e.target.value);
    setCurrentZoom(value);
    try {
      const video = document.querySelector('#reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        if (track) {
          await track.applyConstraints({
            advanced: [{ zoom: value }]
          });
        }
      }
    } catch (err) {
      console.error("Zoom error:", err);
    }
  };

  const toggleFlash = async () => {
    try {
      // Note: html5-qrcode doesn't expose a clean toggle for torch yet in all versions
      // so we use the underlying track if possible
      const video = document.querySelector('#reader video');
      if (video && video.srcObject) {
        const track = video.srcObject.getVideoTracks()[0];
        if (track) {
          const newState = !isFlashOn;
          await track.applyConstraints({
            advanced: [{ torch: newState }]
          });
          setIsFlashOn(newState);
        }
      }
    } catch (err) {
      console.error("Torch error:", err);
    }
  };

  // Keyboard Shortcuts
  useEffect(() => {
    const handleShortcuts = (e) => {
      if (activeTab === 'sales_purchases') {
        if (e.key === 'F1') { e.preventDefault(); document.getElementById('pos-search')?.focus(); }
        if (e.key === 'F2') { e.preventDefault(); handleCheckout(); }
        if (e.key === 'F4') { e.preventDefault(); handleHoldCart(); }
      }
    };
    window.addEventListener('keydown', handleShortcuts);
    return () => window.removeEventListener('keydown', handleShortcuts);
  }, [activeTab, cart, calculateTotal, handleHoldCart, handleCheckout]);

  // UPI QR Auto-hide logic (15 sec)
  useEffect(() => {
    let timer;
    let interval;
    if (paymentMethod === 'Online' && cart.length > 0 && activeTab === 'sales_purchases') {
      setShowUpiQr(true);
      setUpiQrTimer(15);
      timer = setTimeout(() => setShowUpiQr(false), 15000);
      interval = setInterval(() => {
        setUpiQrTimer(prev => Math.max(0, prev - 1));
      }, 1000);
      return () => {
        clearTimeout(timer);
        clearInterval(interval);
      };
    } else {
      setShowUpiQr(false);
    }
  }, [paymentMethod, cart.length, activeTab]);



  // --- Payment Portal (for Customers scanning Printed QR) ---
  if (externalPayment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white rounded-[2.5rem] shadow-2xl border border-gray-100 p-8 text-center animate-in zoom-in-95 duration-500">
          <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
            <QrCode size={40} className="text-blue-600" />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2 uppercase tracking-tight">{t('digitalPayment')}</h2>
          <p className="text-sm text-gray-500 mb-8 font-medium">{t('invoice')}: <span className="text-blue-600 font-bold">{externalPayment.invoiceId}</span></p>

          {externalPayment.expired ? (
            <div className="bg-rose-50 border border-rose-100 p-6 rounded-3xl mb-8">
              <div className="w-12 h-12 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle size={24} className="text-rose-600" />
              </div>
              <h3 className="font-black text-rose-900 uppercase tracking-wide text-sm mb-1">{t('linkExpired')}</h3>
              <p className="text-xs text-rose-600 font-medium">{t('linkExpiredDetail')}</p>
            </div>
          ) : (
            <>
              <div className="bg-blue-50/50 p-6 rounded-3xl mb-8 border border-blue-100/50">
                <p className="text-xs text-blue-600 font-black uppercase tracking-[0.2em] mb-2">{t('totalLabel') || 'Total Amount'}</p>
                <p className="text-4xl font-black text-gray-900 font-mono tracking-tighter">{formatCurrency(externalPayment.amount)}</p>
                <p className="text-[10px] text-gray-400 font-bold uppercase mt-2 tracking-widest">{externalPayment.paymentMethod} Payment</p>
              </div>

              {externalPayment.paymentMethod === 'UPI' ? (
                <a
                  href={`upi://pay?pa=${externalPayment.upiId}&pn=${encodeURIComponent(externalPayment.merchantName)}&am=${externalPayment.amount}&cu=INR`}
                  className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-5 rounded-[2rem] shadow-lg shadow-blue-600/20 transition-all hover:-translate-y-1 active:scale-95 text-lg uppercase tracking-widest"
                >
                  {t('payNow')}
                </a>
              ) : (
                <div className="bg-white border-2 border-dashed border-gray-200 p-6 rounded-[2rem]">
                  <p className="text-xs text-gray-500 font-bold uppercase mb-2 tracking-widest">Pay to ID:</p>
                  <p className="text-xl font-black text-blue-600 break-all">{externalPayment.upiId}</p>
                  <p className="text-[10px] text-gray-400 mt-4 leading-relaxed font-bold uppercase tracking-tighter">
                    Please use your {externalPayment.paymentMethod} app to pay {formatCurrency(externalPayment.amount)} to this ID.
                  </p>
                </div>
              )}

              <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                <Shield size={12} /> {t('securePayment') || 'Secure Digital Payment'}
              </p>
            </>
          )}

          <button
            onClick={() => {
              setExternalPayment(null);
              const url = new URL(window.location);
              url.search = '';
              window.history.replaceState({}, '', url);
            }}
            className="mt-8 text-xs font-bold text-gray-400 hover:text-gray-600 transition-colors uppercase tracking-[0.2em]"
          >
            {t('goBackToApp')}
          </button>
        </div>
      </div>
    );
  }

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
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{showForgotPassword ? t('resetPassword') : (authMode === 'login' ? t('welcome') : t('createAccount'))}</h1>
              <p className="text-gray-500 mt-2 text-sm">{showForgotPassword ? t('enterEmail') : t('signInToAccess')}</p>
            </div>

            {showForgotPassword ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{t('email')}</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 text-gray-400" size={18} />
                    <input
                      type="email"
                      className="pl-10 input-field"
                      placeholder="name@example.com"
                      value={resetEmail}
                      onChange={e => setResetEmail(e.target.value)}
                      required
                    />
                  </div>
                </div>
                <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                  {loading ? <Loader2 className="animate-spin" /> : t('sendResetLink')}
                </button>
                <div className="text-center">
                  <button type="button" onClick={() => setShowForgotPassword(false)} className="text-sm text-gray-600 hover:text-gray-900 font-medium hover:underline">
                    {t('backToLogin')}
                  </button>
                </div>
              </form>
            ) : (
              <>
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

                  {authMode === 'login' && (
                    <div className="flex justify-end">
                      <button type="button" onClick={() => setShowForgotPassword(true)} className="text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline">
                        {t('forgotPassword') || 'Forgot Password?'}
                      </button>
                    </div>
                  )}

                  <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                    {loading ? <Loader2 className="animate-spin" /> : (authMode === 'login' ? t('login') : t('signup'))}
                  </button>
                </form>

                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                  <div className="relative flex justify-center text-sm"><span className="px-2 bg-white text-gray-500">{t('orContinue')}</span></div>
                </div>

                <button onClick={handleGoogleLogin} className="w-full bg-white border border-gray-200 text-gray-700 font-bold py-3 rounded-xl hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mb-2">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                  {t('signInGoogle')}
                </button>

                <button onClick={handleAnonymousLogin} className="w-full bg-gray-800 text-white font-bold py-3 rounded-xl hover:bg-gray-900 transition-all flex items-center justify-center gap-2 mb-6">
                  <User size={20} />
                  {t('guestLogin') || 'Guest Login'}
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

              </>
            )}

            <div className="mt-4 flex justify-center gap-4">
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="bg-gray-100 border-none text-xs font-medium text-gray-700 px-2 py-1.5 rounded-lg hover:bg-gray-200 cursor:pointer focus:ring-0"
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
      {/* Sidebar (Responsive & High Z-Index) */}
      <aside className={`fixed md:relative inset-y-0 left-0 bg-slate-900 text-white flex flex-col shadow-2xl z-[70] transition-all duration-[400ms] ease-in-out overflow-hidden ${isSidebarOpen ? 'w-[280px] translate-x-0' : 'w-0 -translate-x-full opacity-0 md:w-0'}`}>
        <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-900/50 backdrop-blur-xl sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg ring-4 ring-blue-500/10">
              <Shield size={22} className="text-white" />
            </div>
            <div className="overflow-hidden">
              <h1 className="font-black text-sm uppercase tracking-widest truncate">{shopSettings.name || t('appName')}</h1>
              <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tighter truncate">{shopSettings.address || t('appSubtitle')}</p>
            </div>
          </div>
          <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-slate-800 rounded-full text-slate-400 hover:text-white transition-all bg-slate-800/50"><X size={18} /></button>
        </div>

        <nav className="flex-1 overflow-y-auto py-6 px-3 space-y-1">
          <SidebarItem icon={<LayoutDashboard size={20} />} label={t('menuDashboard')} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Users size={20} />} label={t('menuEmployees')} active={activeTab === 'employees'} onClick={() => { setActiveTab('employees'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<MapPin size={20} />} label={t('menuSites')} active={activeTab === 'sites'} onClick={() => { setActiveTab('sites'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Clock size={20} />} label={t('menuAttendance')} active={activeTab === 'attendance'} onClick={() => { setActiveTab('attendance'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<DollarSign size={20} />} label={t('menuPayroll')} active={activeTab === 'payroll'} onClick={() => { setActiveTab('payroll'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<BarChart3 size={20} />} label={t('menuReports')} active={activeTab === 'reports'} onClick={() => { setPinAction('accessReports'); setIsPinModalOpen(true); }} />

          <div className="my-2 border-t border-slate-700/50"></div>

          <SidebarItem icon={<ShoppingCart size={20} />} label={t('menuSalesPurchases')} active={activeTab === 'sales_purchases'} onClick={() => { setActiveTab('sales_purchases'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Coffee size={20} />} label={t('menuCafe')} active={activeTab === 'cafe'} onClick={() => { setActiveTab('cafe'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Wrench size={20} />} label={t('menuService') || 'Service'} active={activeTab === 'service'} onClick={() => { setActiveTab('service'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Package size={20} />} label={t('menuWarehouses')} active={activeTab === 'warehouses'} onClick={() => { setActiveTab('warehouses'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
          <SidebarItem icon={<Clock size={20} />} label={t('menuInvoices')} active={activeTab === 'history'} onClick={() => { setActiveTab('history'); if (window.innerWidth < 768) setIsSidebarOpen(false); }} />
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
      <main className="flex-1 flex flex-col overflow-hidden relative pb-20 lg:pb-0">
        {/* Mobile Sidebar Overlay with Blur Effect */}
        {isSidebarOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[65] md:hidden animate-in fade-in duration-300" onClick={() => setIsSidebarOpen(false)}></div>}

        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-50 transition-all">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className={`p-2 -ml-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-full transition-all ${isSidebarOpen ? 'md:hidden' : 'block'}`}><Menu size={24} /></button>
            <h2 className="text-lg font-black text-gray-900 flex items-center gap-2.5 tracking-tight">
              <span className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                {activeTab === 'dashboard' && <LayoutDashboard size={20} />}
                {activeTab === 'employees' && <Users size={20} />}
                {activeTab === 'sites' && <MapPin size={20} />}
                {activeTab === 'attendance' && <Clock size={20} />}
                {activeTab === 'payroll' && <DollarSign size={20} />}
                {activeTab === 'reports' && <BarChart3 size={20} />}
                {activeTab === 'accounts' && <Calculator size={20} />}
                {activeTab === 'cafe' && <Coffee size={20} />}
                {activeTab === 'service' && <Wrench size={20} />}
                {activeTab === 'sales_purchases' && <ShoppingCart size={20} />}
                {activeTab === 'warehouses' && <Package size={20} />}
                {activeTab === 'invoices' && <InvoiceIcon size={20} />}
              </span>
              <span className="hidden sm:inline">
                {activeTab === 'dashboard' && t('menuDashboard')}
                {activeTab === 'employees' && t('menuEmployees')}
                {activeTab === 'sites' && t('menuSites')}
                {activeTab === 'attendance' && t('menuAttendance')}
                {activeTab === 'payroll' && t('menuPayroll')}
                {activeTab === 'reports' && t('menuReports')}
                {activeTab === 'accounts' && t('menuAccounts')}
                {activeTab === 'cafe' && t('menuCafe')}
                {activeTab === 'service' && (t('menuService') || 'Service')}
                {activeTab === 'sales_purchases' && t('menuSalesPurchases')}
                {activeTab === 'warehouses' && t('menuWarehouses')}
                {activeTab === 'invoices' && t('menuInvoices')}
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
            <div className="hidden md:flex items-center bg-gray-100 p-1 rounded-xl">
              <select
                value={currency}
                onChange={(e) => {
                  const newCurrency = e.target.value;
                  setCurrency(newCurrency);
                  saveUserSettings({ currency: newCurrency });
                }}
                className="bg-transparent border-none text-[10px] font-black uppercase text-gray-600 px-2 py-1 cursor-pointer focus:ring-0"
              >
                <option value="EGP">EGP</option>
                <option value="USD">USD</option>
                <option value="EUR">EUR</option>
                <option value="INR">INR</option>
                <option value="SAR">SAR</option>
                <option value="AED">AED</option>
              </select>
              <div className="w-px h-3 bg-gray-300 mx-1"></div>
              <select
                value={language}
                onChange={(e) => {
                  const newLang = e.target.value;
                  setLanguage(newLang);
                  saveUserSettings({ language: newLang });
                }}
                className="bg-transparent border-none text-[10px] font-black uppercase text-gray-600 px-2 py-1 cursor-pointer focus:ring-0"
              >
                <option value="en">EN</option>
                <option value="hi">HI</option>
                <option value="ar">AR</option>
                <option value="zh">ZH</option>
              </select>
            </div>

            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center gap-2 pl-2 pr-1 py-1 bg-white border border-gray-100 rounded-2xl hover:border-blue-200 transition-all shadow-sm group"
            >
              <div className="hidden sm:block text-right mr-1">
                <div className="text-[10px] font-black text-gray-900 uppercase tracking-tighter leading-none">{t('adminUser')}</div>
                <div className="text-[8px] text-gray-400 font-bold tracking-tight lowercase truncate max-w-[80px]">{user.email}</div>
              </div>
              <div className="w-9 h-9 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 group-hover:scale-105 transition-transform duration-300">
                <User size={20} />
              </div>
            </button>
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
                  {t('connectionError')}
                </p>
                <p className="text-sm text-red-700">
                  {globalError} <button onClick={() => setGlobalError(null)} className="underline ml-2">{t('dismiss')}</button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Views */}
        <div className={`flex-1 overflow-auto bg-gray-50 ${activeTab === 'sales_purchases' ? 'p-0' : 'p-4 md:p-6 lg:p-8'}`}>

          {activeTab === 'dashboard' && (
            <div className="space-y-8 animate-in fade-in duration-700 max-w-7xl mx-auto">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-3xl font-black text-gray-900 tracking-tight">{t('menuDashboard')}</h1>
                  <p className="text-sm text-gray-500 font-medium">{t('welcome')}, {t('admin')}</p>
                </div>
                <div className="relative group w-full sm:w-auto">
                  <select
                    className="w-full sm:w-auto appearance-none bg-white border border-gray-100 rounded-2xl px-5 py-3 pr-10 text-sm font-bold text-gray-700 shadow-sm focus:outline-none focus:ring-4 focus:ring-blue-500/10 hover:border-blue-200 transition-all cursor-pointer"
                    value={homeLocationFilter}
                    onChange={e => setHomeLocationFilter(e.target.value)}
                  >
                    <option value="">{t('filterAll') || 'All Locations'}</option>
                    {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                  <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-blue-500 transition-colors" size={16} />
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[2rem] p-7 text-white shadow-2xl shadow-blue-200 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><Users size={28} /></div>
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{t('dashboardTotal')}</span>
                  </div>
                  <h3 className="text-4xl font-black tracking-tight mb-1 relative z-10">
                    {employees.filter(e => !homeLocationFilter || e.location === homeLocationFilter).length}
                  </h3>
                  <p className="text-blue-100/80 text-xs font-bold uppercase tracking-widest relative z-10">{t('activeGuards')}</p>
                </div>

                <div className="bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 rounded-[2rem] p-7 text-white shadow-2xl shadow-emerald-200 relative overflow-hidden group">
                  <div className="absolute bottom-0 left-0 -ml-8 -mb-8 w-32 h-32 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="p-3 bg-white/20 backdrop-blur-md rounded-2xl"><MapPin size={28} /></div>
                    <span className="bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{t('active')}</span>
                  </div>
                  <h3 className="text-4xl font-black tracking-tight mb-1 relative z-10">
                    {sites.filter(s => (!homeLocationFilter || s.name === homeLocationFilter) && s.status === 'Operational').length}
                  </h3>
                  <p className="text-emerald-100/80 text-xs font-bold uppercase tracking-widest relative z-10">{t('operationalSites')}</p>
                </div>

                <div className="bg-white rounded-[2rem] p-7 shadow-xl shadow-gray-200/50 border border-gray-100/50 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-110 transition-transform duration-500"><Clock size={28} /></div>
                    <span className="bg-orange-50 text-orange-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{t('today')}</span>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-1">
                    {attendance.filter(a =>
                      a.date === new Date().toISOString().split('T')[0] &&
                      (!homeLocationFilter || getEmployeeLocation(a.name) === homeLocationFilter)
                    ).length}
                  </h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{t('checkedInToday')}</p>
                </div>

                <div className="bg-white rounded-[2rem] p-7 shadow-xl shadow-gray-200/50 border border-gray-100/50 relative overflow-hidden group">
                  <div className="flex justify-between items-start mb-6">
                    <div className="p-3 bg-rose-50 text-rose-600 rounded-2xl group-hover:scale-110 transition-transform duration-500"><AlertCircle size={28} /></div>
                    <span className="bg-rose-50 text-rose-600 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest">{t('lateAbsent')}</span>
                  </div>
                  <h3 className="text-4xl font-black text-gray-900 tracking-tight mb-1">
                    {attendance.filter(a =>
                      (a.status === 'Late' || a.status === 'Absent') &&
                      a.date === new Date().toISOString().split('T')[0] &&
                      (!homeLocationFilter || getEmployeeLocation(a.name) === homeLocationFilter)
                    ).length}
                  </h3>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">{t('issuesToday')}</p>
                </div>
              </div>

              {/* Quick Links & Status */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-xl shadow-gray-200/50 border border-gray-100/50">
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="font-black text-xl text-gray-900 uppercase tracking-tight">{t('quickActions')}</h3>
                    <div className="w-12 h-1 bg-blue-100 rounded-full"></div>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <button onClick={() => { setActiveTab('employees'); setIsAddModalOpen(true); }} className="p-4 bg-blue-50/50 text-blue-600 rounded-[2rem] font-bold hover:bg-blue-600 hover:text-white transition-all duration-300 flex flex-col items-center gap-3 active:scale-95 group">
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-blue-500"><Users size={24} /></div>
                      <span className="text-xs uppercase tracking-tighter">{t('addStaff')}</span>
                    </button>
                    <button onClick={() => { setActiveTab('sites'); setIsAddSiteModalOpen(true); }} className="p-4 bg-emerald-50/50 text-emerald-600 rounded-[2rem] font-bold hover:bg-emerald-600 hover:text-white transition-all duration-300 flex flex-col items-center gap-3 active:scale-95 group">
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-emerald-500"><MapPin size={24} /></div>
                      <span className="text-xs uppercase tracking-tighter">{t('addSite')}</span>
                    </button>
                    <button onClick={() => { setActiveTab('sales_purchases'); }} className="p-4 bg-indigo-50/50 text-indigo-600 rounded-[2rem] font-bold hover:bg-indigo-600 hover:text-white transition-all duration-300 flex flex-col items-center gap-3 active:scale-95 group">
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-indigo-500"><ShoppingCart size={24} /></div>
                      <span className="text-xs uppercase tracking-tighter">{t('menuSalesPurchases')}</span>
                    </button>
                    <button onClick={() => setShowSettings(true)} className="p-4 bg-gray-50 text-gray-600 rounded-[2rem] font-bold hover:bg-gray-800 hover:text-white transition-all duration-300 flex flex-col items-center gap-3 active:scale-95 group">
                      <div className="p-3 bg-white rounded-2xl shadow-sm group-hover:bg-gray-700"><Settings size={24} /></div>
                      <span className="text-xs uppercase tracking-tighter">{t('settings')}</span>
                    </button>
                  </div>
                </div>

                <div className="bg-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden flex flex-col justify-center">
                  <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-blue-600 rounded-full blur-[80px] opacity-40"></div>
                  <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-indigo-600 rounded-full blur-[80px] opacity-30"></div>

                  <div className="relative z-10">
                    <h3 className="font-black text-2xl mb-2 uppercase tracking-tight">{t('systemStatus')}</h3>
                    <p className="text-slate-400 text-sm mb-6 font-medium">{t('systemOperational')}</p>
                    <div className="inline-flex items-center gap-3 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400 font-black text-xs uppercase tracking-widest">
                      <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping"></span>
                      {t('online')}
                    </div>
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
                  <input
                    type="month"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                    value={employeeMonthFilter}
                    onChange={e => setEmployeeMonthFilter(e.target.value)}
                    title={t('selectMonthInfo')}
                  />
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
                            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full mt-1 inline-block">{t(emp.role.toLowerCase()) || emp.role}</span>
                          </div>
                        </div>
                        {emp.status === 'Active' ? <CheckCircle size={18} className="text-green-500" /> : <AlertCircle size={18} className="text-gray-400" />}
                      </div>
                      <div className="space-y-2 text-sm text-gray-600">
                        <div className="flex items-center gap-2"><Briefcase size={14} className="text-gray-400" /> {t(emp.dept.toLowerCase()) || emp.dept}</div>
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
                  <p className="text-sm text-gray-500">{t('viewManageLocations')}</p>
                </div>
                <button onClick={() => setIsAddSiteModalOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all w-full sm:w-auto">
                  <Plus size={18} /> {t('addLocation')}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sites.map(site => {
                  const guardCount = employees.filter(e => e.location === site.name).length;
                  return (
                    <div key={site.id} onClick={() => setSelectedSite(site)} className="group bg-white rounded-xl shadow-sm border border-gray-200 p-5 hover:shadow-lg transition-all cursor-pointer hover:border-emerald-500 relative overflow-hidden">
                      <div className={`absolute top-0 left-0 w-1 h-full ${(site.status === 'Operational' || site.status === 'Active') ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                      <div className="flex justify-between items-start mb-4 pl-2">
                        <div className="flex items-center gap-3">
                          <div className={`p-2.5 rounded-lg ${(site.status === 'Operational' || site.status === 'Active') ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                            <Building2 size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-900 leading-tight">{site.name}</h4>
                            <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium mt-1 ${(site.status === 'Operational' || site.status === 'Active') ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                              {t(site.status.toLowerCase()) || site.status}
                            </span>
                          </div>
                        </div>
                        <div className="text-gray-300 group-hover:text-emerald-600 transition-colors">
                          <ChevronRight size={20} />
                        </div>
                      </div>

                      <div className="space-y-2 pl-2 text-sm text-gray-500">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2"><MapPin size={14} /> {site.city}</span>
                        </div>
                        <div className="flex items-center justify-between border-t border-gray-50 pt-2 mt-2">
                          <div className="flex flex-col">
                            <span className="text-xs text-gray-400 uppercase font-semibold tracking-wider">{t('manager')}</span>
                            <span className="text-gray-700 font-medium">{site.manager || '-'}</span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-xs text-gray-400 font-bold uppercase tracking-wider">{t('siteEmployees')}</span>
                            <span className="text-gray-700 font-medium">{guardCount}</span>
                          </div>
                        </div>
                        {site.phone && (
                          <div className="flex items-center gap-2 pt-1 text-xs text-emerald-600">
                            <Phone size={12} /> {site.phone}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
                        <th className="px-6 py-4 font-semibold text-gray-900 text-red-600">{t('advance')}</th>
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
                          let baseSalary = Number(emp.salary) || 0;
                          let bonus = Number(emp.bonus) || 0;
                          let overtime = Number(emp.overtime) || 0;
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

                          // [Modified] Check for Stored Payroll Record
                          const storedRecord = payrolls.find(p => p.employeeId === emp.id && p.month === payrollMonthFilter);

                          if (storedRecord) {
                            baseSalary = Number(storedRecord.salary) || baseSalary;
                            bonus = Number(storedRecord.bonus) || 0;
                            overtime = Number(storedRecord.overtime) || 0;
                            // Stored deductions in record usually implies "Manual/Other" deductions
                            // We will assume storedRecord.deductions replaces the manualDeduction part
                            // BUT Late/Absent is usually calculated from attendance unless we freeze that too.
                            // For valid snapshot, if record exists, we should probably stick to what's in record?
                            // But the prompt says "salary... automatic get normally ... until changes happen".
                            // This suggests "changes" are the overrides.
                            // Let's use stored values for the editable fields.

                            // We will still calculate Late/Absent dynamically for display context, 
                            // BUT the total net pay should ideally rely on the saved record if we want it "Frozen".
                            // However, keeping Late/Absent dynamic allows correcting attendance to fix payroll.

                            // Let's just override the manual components:
                            // deductionAmount (Total) = Late + Absent + Manual(Stored or Default)
                          }

                          const effectiveManualDeduction = storedRecord ? (Number(storedRecord.deductions) || 0) : manualDeduction;
                          const effectiveAdvance = storedRecord ? (Number(storedRecord.advance) || 0) : (Number(emp.advanceSalary) || 0);

                          deductionAmount = lateDeduction + absentDeduction + effectiveManualDeduction + effectiveAdvance;

                          const netPay = baseSalary + bonus + overtime - deductionAmount;

                          return (
                            <tr key={emp.id} className="hover:bg-gray-50">
                              <td className="px-6 py-4 font-medium text-gray-900">
                                <div>{emp.name}</div>
                                <div className="text-xs text-gray-500">{emp.dept}</div>
                              </td>
                              <td className="px-6 py-4 text-gray-500">{emp.location}</td>
                              <td className="px-6 py-4 text-gray-500">{t(emp.role.toLowerCase()) || emp.role}</td>
                              <td className="px-6 py-4 text-right font-mono">{formatCurrency(baseSalary)}</td>
                              <td className="px-6 py-4 text-right font-mono text-green-600">+{formatCurrency(bonus)}</td>
                              <td className="px-6 py-4 text-right font-mono text-orange-600">+{formatCurrency(overtime)}</td>
                              <td className="px-6 py-4 text-right font-mono text-red-600">-{formatCurrency(effectiveAdvance)}</td>

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
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => handleManagePayroll(emp, payrollMonthFilter, lateDeduction, absentDeduction)}
                                    className={`p-2 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium ${storedRecord ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'text-gray-600 hover:bg-gray-100'}`}
                                    title={t('manageEditMonth')}
                                  >
                                    <Edit size={16} /> {storedRecord ? t('edit') : t('management')}
                                  </button>
                                  <button
                                    onClick={() => handlePrintPayrollSlip(emp, {
                                      baseSalary,
                                      bonus,
                                      overtime,
                                      lateDeduction,
                                      absentDeduction,
                                      manualDeduction: effectiveManualDeduction,
                                      deductionAmount,
                                      advanceSalary: effectiveAdvance,
                                      netPay
                                    }, payrollMonthFilter)}
                                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex items-center gap-1 text-sm font-medium"
                                    title={t('printPayrollSlip')}
                                  >
                                    <Printer size={16} />
                                  </button>
                                </div>
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
              <div className="space-y-6">
                <div className="flex justify-end mb-4">
                  <select
                    className="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                    value={reportLocationFilter}
                    onChange={e => setReportLocationFilter(e.target.value)}
                  >
                    <option value="">{t('filterAll') || 'All Locations'}</option>
                    {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
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

                {/* Profit & Loss Report Section */}
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div>
                      <h3 className="font-bold text-gray-800 text-lg">{t('profitLossReport')}</h3>
                      <p className="text-sm text-gray-500">{t('plSubtitle')}</p>
                    </div>
                    <div className="flex flex-wrap gap-3 items-center justify-center">
                      <select
                        value={profitPeriod}
                        onChange={e => setProfitPeriod(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-gray-50 font-medium"
                      >
                        <option value="Daily">{t('daily')}</option>
                        <option value="Weekly">{t('weekly')}</option>
                        <option value="Monthly">{t('monthly')}</option>
                        <option value="Yearly">{t('yearly')}</option>
                      </select>

                      {profitPeriod === 'Daily' && (
                        <input
                          type="date"
                          value={profitDateFilter}
                          onChange={e => setProfitDateFilter(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      )}

                      {profitPeriod === 'Weekly' && (
                        <input
                          type="date"
                          value={profitDateFilter}
                          onChange={e => setProfitDateFilter(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                          title="Select any day in the target week"
                        />
                      )}

                      {profitPeriod === 'Monthly' && (
                        <input
                          type="month"
                          value={profitMonthFilter}
                          onChange={e => setProfitMonthFilter(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      )}

                      {profitPeriod === 'Yearly' && (
                        <select
                          value={profitYearFilter}
                          onChange={e => setProfitYearFilter(e.target.value)}
                          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white font-medium"
                        >
                          {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map(year => (
                            <option key={year} value={year}>{year}</option>
                          ))}
                        </select>
                      )}

                      <button onClick={() => downloadReport('profit_loss')} className="bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 transition-colors flex items-center gap-2 font-medium shadow-lg shadow-emerald-600/20">
                        <Download size={18} /> {t('downloadReport')}
                      </button>
                    </div>
                  </div>
                </div>
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 items-center justify-between flex">
                    <div>
                      <h3 className="font-bold text-gray-800">{t('taxReport')}</h3>
                      <p className="text-sm text-gray-500">Estimated tax deductions</p>
                    </div>
                    <button onClick={() => downloadReport('tax')} className="bg-orange-100 text-orange-600 p-3 rounded-xl hover:bg-orange-200 transition-colors">
                      <Download size={20} />
                    </button>
                  </div>
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
              <div className="relative flex flex-col lg:flex-row h-full overflow-hidden bg-gray-50">
                {/* Mobile Bottom Navigation (Premium Glassmorphism) */}
                <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 px-8 py-3 flex justify-between items-center z-[65] shadow-[0_-10px_30px_rgba(0,0,0,0.05)] rounded-t-[2.5rem]">
                  <div className="flex gap-10">
                    <button
                      onClick={() => setIsMobileCartOpen(false)}
                      className={`flex flex-col items-center gap-1.5 transition-all ${!isMobileCartOpen ? 'text-blue-600 scale-110' : 'text-gray-300 hover:text-gray-400'}`}
                    >
                      <div className={`p-2 rounded-xl transition-all ${!isMobileCartOpen ? 'bg-blue-50' : ''}`}><Package size={20} /></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em]">{t('products')}</span>
                    </button>
                    <button
                      onClick={() => setIsScannerOpen(true)}
                      className="flex flex-col items-center gap-1.5 text-gray-300 hover:text-gray-600 transition-all"
                    >
                      <div className="p-2 rounded-xl"><Scan size={20} /></div>
                      <span className="text-[9px] font-black uppercase tracking-[0.15em]">{t('scanner')}</span>
                    </button>
                  </div>
                  <button
                    onClick={() => setIsMobileCartOpen(true)}
                    className="relative -top-8 bg-gradient-to-br from-blue-600 to-indigo-700 text-white p-5 rounded-[2rem] shadow-[0_15px_40px_rgba(37,99,235,0.4)] transform active:scale-95 transition-all border-4 border-white group"
                  >
                    <ShoppingCart size={28} className="group-hover:rotate-12 transition-transform" />
                    {cart.length > 0 && (
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-6 h-6 flex items-center justify-center rounded-full border-2 border-white animate-bounce shadow-md">
                        {cart.reduce((a, b) => a + b.quantity, 0)}
                      </span>
                    )}
                  </button>
                </div>

                {/* Left: Product Grid */}
                <div className={`flex-1 flex flex-col h-full overflow-hidden ${isMobileCartOpen ? 'hidden lg:flex' : 'flex'}`}>
                  <div className="p-4 flex-shrink-0 bg-white border-b border-gray-200">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-gray-900">{shopSettings.name || t('posTerminal')}</h2>
                        <div className="h-6 w-px bg-gray-200 mx-2 hidden sm:block"></div>
                        <select
                          value={printFormat}
                          onChange={(e) => setPrintFormat(e.target.value)}
                          className="text-sm font-medium text-gray-600 bg-transparent outline-none cursor-pointer hover:text-blue-600"
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
                        <button
                          onClick={() => setIsScannerOpen(true)}
                          className="flex items-center gap-1 text-blue-600 hover:bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200 text-xs font-bold transition-all ml-2"
                        >
                          <Scan size={16} /> {t('scanBarcode')}
                        </button>

                        <button
                          onClick={() => {
                            const name = prompt('Item Name:');
                            if (!name) return;
                            const price = prompt('Price:');
                            if (!price) return;
                            addToCart({ id: 'custom-'+Date.now(), name, sellPrice: Number(price), category: 'Custom' });
                          }}
                          className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold transition-all ml-2"
                        >
                          <PlusCircle size={16} /> Custom
                        </button>
                        <button
                          onClick={() => {
                            const ready = serviceTickets.filter(t => t.status === 'Ready for Pickup' || t.status === 'Ready');
                            if (ready.length === 0) { alert('No repairs ready for pickup'); return; }
                            const choice = prompt('Ready Repairs:\n' + ready.map((t, i) => `${i+1}. ${t.customerName} - ${t.brand} (${formatCurrency(t.estimatedCost)})`).join('\n') + '\n\nEnter number to add:');
                            const idx = parseInt(choice) - 1;
                            if (ready[idx]) {
                              addToCart({
                                id: 'SRV-' + ready[idx].id,
                                name: `Repair: ${ready[idx].brand} ${ready[idx].model} (${ready[idx].id.slice(0, 6)})`,
                                sellPrice: Number(ready[idx].estimatedCost),
                                type: 'service'
                              });
                            }
                          }}
                          className="flex items-center gap-1 text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold transition-all ml-1"
                        >
                          <Wrench size={16} /> Ready
                        </button>

                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <select
                          className="bg-gray-50 border border-gray-200 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2"
                          value={posLocationFilter}
                          onChange={e => setPosLocationFilter(e.target.value)}
                          disabled={cart.length > 0}
                        >
                          {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                        </select>
                        <div className="relative flex-1 sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                          <input
                            type="text"
                            placeholder={t('searchInventory') || "Search Parts or Repair IDs..."}
                            id="pos-search"
                            className="w-full pl-9 pr-4 py-2 bg-gray-100 border-transparent rounded-lg focus:bg-white focus:border-blue-500 focus:ring-0 transition-all text-sm"
                            value={inventorySearch}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                // Search Inventory
                                const filteredInv = inventory.filter(item =>
                                  (!posLocationFilter || item.location === posLocationFilter) &&
                                  ((item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                                    (item.barcode || '').includes(inventorySearch))
                                );
                                if (filteredInv.length === 1) {
                                  addToCart(filteredInv[0]);
                                  setInventorySearch('');
                                  return;
                                }

                                // Search Repairs
                                if (inventorySearch.length >= 3) {
                                  const ticket = serviceTickets.find(t => t.id.toUpperCase().includes(inventorySearch.toUpperCase()) || t.customerPhone === inventorySearch);
                                  if (ticket) {
                                    if (!cart.some(i => i.id === 'SRV-' + ticket.id)) {
                                      setCart([...cart, {
                                        id: 'SRV-' + ticket.id,
                                        name: `Repair: ${ticket.brand} ${ticket.model} (${ticket.id.slice(0, 6)})`,
                                        sellPrice: Number(ticket.estimatedCost),
                                        quantity: 1,
                                        type: 'service'
                                      }]);
                                      setInventorySearch('');
                                    } else {
                                      alert('Repair already in cart!');
                                    }
                                  }
                                }
                              }
                            }}
                            onChange={(e) => setInventorySearch(e.target.value)}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 sm:p-4 pb-24 lg:pb-4">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4">
                      {inventory
                        .filter(item =>
                          (!posLocationFilter || item.location === posLocationFilter) &&
                          ((item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                            (item.barcode || '').includes(inventorySearch))
                        )
                        .map(item => (
                          <button
                            key={item.id}
                            onClick={() => addToCart(item)}
                            disabled={item.quantity <= 0}
                            className={`flex flex-col h-[210px] sm:h-[230px] bg-white rounded-2xl border border-gray-100 overflow-hidden transition-all active:scale-95 lg:hover:shadow-xl lg:hover:border-blue-200 lg:hover:-translate-y-1 relative group text-left ${item.quantity <= 0 ? 'opacity-50 grayscale' : 'shadow-sm'}`}
                          >
                            <div className="h-28 sm:h-32 w-full bg-gray-100 relative overflow-hidden">
                              {item.photo ? (
                                <img src={item.photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <Package size={28} />
                                </div>
                              )}
                              <div className="absolute top-2 right-2">
                                <span className={`backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg ${item.quantity <= 5 ? 'bg-red-500/80' : 'bg-black/40'}`}>
                                  {item.quantity}
                                </span>
                              </div>
                              {item.quantity <= 0 && (
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                  <span className="text-white text-[10px] font-black uppercase tracking-widest bg-red-600 px-2 py-1 rounded">Out of Stock</span>
                                </div>
                              )}
                            </div>
                            <div className="p-3 flex flex-col flex-1 justify-between bg-white">
                              <h4 className="font-bold text-gray-800 text-xs sm:text-sm line-clamp-2 leading-tight group-hover:text-blue-600 transition-colors uppercase tracking-tight">{item.name}</h4>
                              <div className="flex justify-between items-end mt-1">
                                <div className="text-blue-600 font-black font-mono text-base sm:text-lg">{formatCurrency(item.sellPrice || 0)}</div>
                                <div className="p-1.5 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-600 group-hover:text-white transition-all">
                                  <Plus size={14} />
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                    </div>

                  {/* Daily History Toggle / View - Responsive Card/Table */}
                  <div className="bg-white p-4 mx-4 mb-20 lg:mb-4 rounded-2xl shadow-sm border border-gray-100 max-h-64 overflow-y-auto shrink-0 animate-in slide-in-from-bottom-4 duration-500">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="font-bold text-gray-900 flex items-center gap-2 truncate">
                        <Clock size={18} className="text-blue-600" />
                        {posHistoryDate === new Date().toISOString().split('T')[0] ? t('todaysSales') : t('salesOn') + ' ' + posHistoryDate}
                      </h3>
                      <input
                        type="date"
                        value={posHistoryDate}
                        onChange={(e) => setPosHistoryDate(e.target.value)}
                        className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:ring-2 focus:ring-blue-500 outline-none"
                      />
                    </div>

                    {/* Desktop Table View */}
                    <div className="hidden sm:block">
                      <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 border-b border-gray-100 sticky top-0 z-10">
                          <tr>
                            <th className="p-3 font-bold text-gray-700">{t('time')}</th>
                            <th className="p-3 font-bold text-gray-700">{t('invoiceId')} #</th>
                            <th className="p-3 font-bold text-gray-700">{t('amount')}</th>
                            <th className="p-3 font-bold text-gray-700">{t('items')}</th>
                            <th className="p-3 font-bold text-gray-700">{t('actions')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {sales
                            .filter(s => s.date === posHistoryDate)
                            .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                            .map(s => (
                              <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                <td className="p-3 text-gray-500">{s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</td>
                                <td className="p-3 font-mono text-xs text-blue-600 font-bold">{s.invoiceId || '-'}</td>
                                <td className="p-3 font-mono font-bold text-gray-900">{formatCurrency(s.amount)}</td>
                                <td className="p-3 text-xs text-gray-600 truncate max-w-[150px]">{Array.isArray(s.items) ? s.items.map(i => `${i.qty}x ${i.name}`).join(', ') : s.items}</td>
                                <td className="p-3">
                                  <button onClick={() => handlePrintInvoice(s, t('receipt'))} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"><Printer size={18} /></button>
                                </td>
                              </tr>
                            ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="sm:hidden space-y-3">
                      {sales
                        .filter(s => s.date === posHistoryDate)
                        .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))
                        .map(s => (
                          <div key={s.id} className="p-3 border border-gray-100 rounded-xl bg-gray-50/50 flex flex-col gap-2">
                            <div className="flex justify-between items-center">
                              <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</span>
                              <span className="font-mono text-[10px] text-blue-600 font-bold">{s.invoiceId || '-'}</span>
                            </div>
                            <div className="flex justify-between items-end">
                              <div>
                                <div className="text-xs text-gray-500 mb-0.5">{Array.isArray(s.items) ? s.items.map(i => `${i.qty}x ${i.name}`).join(', ') : s.items}</div>
                                <div className="font-mono font-black text-gray-900">{formatCurrency(s.amount)}</div>
                              </div>
                              <button onClick={() => handlePrintInvoice(s, t('receipt'))} className="p-2.5 bg-white border border-gray-200 text-gray-600 rounded-xl shadow-sm active:bg-blue-50 active:text-blue-600 transition-all"><Printer size={20} /></button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>

                {/* Right: Cart Sidebar (Mobile Drawer) */}
                {isMobileCartOpen && <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[75] lg:hidden animate-in fade-in duration-300" onClick={() => setIsMobileCartOpen(false)}></div>}
                <div className={`fixed inset-y-0 right-0 lg:relative lg:inset-auto w-full lg:w-[420px] bg-white lg:border-l border-gray-200 flex flex-col h-full z-[80] lg:z-20 transition-transform duration-300 ease-in-out transform ${isMobileCartOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}`}>
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
                    <div className="flex items-center gap-3 text-gray-800">
                      <button onClick={() => setIsMobileCartOpen(false)} className="lg:hidden p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                        <ArrowLeft size={20} />
                      </button>
                      <ShoppingCart size={22} className="text-blue-600" />
                      <h3 className="font-bold text-xl tracking-tight">{t('currentBill')}</h3>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleHoldCart}
                        disabled={cart.length === 0}
                        className="p-2 text-amber-600 hover:bg-amber-50 rounded-xl transition-colors border border-amber-100 disabled:opacity-30"
                        title={t('hold') || 'Hold Cart'}
                      >
                        <Clock size={20} />
                      </button>
                      <span className="bg-blue-600 text-white text-xs font-black px-3 py-1.5 rounded-full shadow-lg shadow-blue-200">{cart.reduce((a, b) => a + b.quantity, 0)}</span>
                    </div>
                  </div>

                  {heldCarts.length > 0 && (
                    <div className="bg-amber-50/50 p-2 border-b border-amber-100 overflow-x-auto whitespace-nowrap scrollbar-none">
                      <div className="flex gap-2">
                        {heldCarts.map((h, idx) => (
                          <button
                            key={h.id}
                            onClick={() => handleResumeCart(h.id)}
                            className="bg-white border border-amber-200 px-3 py-1 rounded-full text-[10px] font-bold text-amber-700 shadow-sm hover:border-amber-400 transition-all flex items-center gap-1.5"
                          >
                            <Clock size={10} /> {h.time} - {h.customer || `Cart ${idx + 1}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-gray-200">
                    {cart.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-gray-300 p-8 text-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <ShoppingCart size={24} className="opacity-50" />
                        </div>
                        <p className="font-medium text-gray-500">{t('cartEmpty')}</p>
                        <p className="text-xs mt-1 text-gray-400">{t('selectItems')}</p>
                      </div>
                    ) : (
                      <div className="divide-y divide-gray-50">
                        {cart.map(item => (
                          <div key={item.id} className="p-3 flex gap-3 group hover:bg-gray-50 transition-colors">
                            <div className="flex-1 min-w-0">
                              <div className="flex justify-between items-start">
                                <h4 className="font-medium text-gray-900 text-sm truncate pr-2">{item.name}</h4>
                                <span className="font-mono font-bold text-gray-900 text-sm">{formatCurrency(item.price * item.quantity)}</span>
                              </div>
                              <div className="text-xs text-gray-500 mt-0.5">{formatCurrency(item.price)} / unit</div>
                            </div>

                            <div className="flex items-center gap-3 self-center">
                              <div className="flex items-center border border-gray-200 rounded-lg bg-white h-7 shadow-sm">
                                <button onClick={() => updateCartQuantity(item.id, -1)} className="px-2 h-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-l-lg transition-colors">-</button>
                                <span className="w-6 text-center text-xs font-semibold text-gray-700">{item.quantity}</span>
                                <button onClick={() => updateCartQuantity(item.id, 1)} className="px-2 h-full text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-r-lg transition-colors">+</button>
                              </div>
                              <button onClick={() => removeFromCart(item.id)} className="text-gray-300 hover:text-red-500 transition-colors p-1">
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Footer Section */}
                  <div className="bg-gray-50 border-t border-gray-200 p-4 space-y-4">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold">{t('subtotal')}</span>
                        </div>
                        <span className="font-mono">{formatCurrency(calculateTotal())}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs text-gray-500">
                        <span className="border-b border-dashed border-gray-300 pb-px cursor-help">{t('discount')}</span>
                        <div className="flex items-center bg-white border border-gray-200 rounded px-2 h-6 w-20">
                          <span className="text-gray-400 mr-1">-</span>
                          <input
                            type="number"
                            min="0"
                            className="w-full text-right bg-transparent border-none outline-none text-xs font-mono p-0 focus:ring-0"
                            placeholder="0"
                            value={cartDiscount || ''}
                            onChange={(e) => setCartDiscount(Math.max(0, Number(e.target.value)))}
                          />
                        </div>
                      </div>
                      <div className="pt-2 border-t border-gray-200 flex justify-between items-end">
                        <span className="text-sm font-bold text-gray-700">{t('total')}</span>
                        <span className="text-2xl font-bold text-gray-900 leading-none">{formatCurrency(Math.max(0, calculateTotal() - cartDiscount))}</span>
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

                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-black text-gray-400 ml-1">{t('customerId')}</label>
                      <input
                        className="w-full mb-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm"
                        placeholder={t('customerId') + " (" + t('optional') + ")"}
                        value={newSaleForm.customerId}
                        autoComplete="off"
                        onChange={e => setNewSaleForm({ ...newSaleForm, customerId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-3 mb-4">
                      <div className="grid grid-cols-3 gap-2">
                        {['Cash', 'Visa', 'Online'].map(method => (
                          <button
                            key={method}
                            onClick={() => {
                              setPaymentMethod(method);
                              if (method === 'Online') setShowUpiQr(true);
                            }}
                            className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all duration-300 ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200 scale-[1.02]' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                          >
                            {method === 'Online' ? (t('digitalPayment') || 'Digital') : (t(method.toLowerCase()) || method)}
                          </button>
                        ))}
                      </div>

                      {paymentMethod === 'Online' && (
                        <div className="flex flex-wrap gap-1.5 p-2 bg-gray-50 rounded-2xl animate-in slide-in-from-top-2 duration-300 border border-gray-100">
                          {['UPI', 'InstaPay'].map(sub => (
                            <button
                              key={sub}
                              onClick={() => { setDigitalSubMethod(sub); setShowUpiQr(true); }}
                              className={`px-3 py-1.5 text-[9px] font-black uppercase tracking-tight rounded-lg transition-all ${digitalSubMethod === sub ? 'bg-blue-600 text-white shadow-md' : 'bg-white text-gray-400 border border-gray-100 hover:text-gray-600'}`}
                            >
                              {sub}
                            </button>
                          ))}
                        </div>
                      )}
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
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                      <button
                        onClick={() => setBarcodePrintMode('sticker')}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${barcodePrintMode === 'sticker' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Thermal Sticker Printer"
                      > {t('sticker')} </button>
                      <button
                        onClick={() => setBarcodePrintMode('a4')}
                        className={`px-3 py-1.5 text-[10px] font-black uppercase rounded-md transition-all ${barcodePrintMode === 'a4' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        title="Standard A4 Paper Printer"
                      > {t('a4 sheet')} </button>
                    </div>
                    <button
                      onClick={() => {
                        const itemsToConfig = selectedInventoryItems.length > 0
                          ? inventory.filter(item => selectedInventoryItems.includes(item.id))
                          : inventory.filter(item =>
                            (!warehouseLocationFilter || item.location === warehouseLocationFilter) &&
                            ((item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                              (item.barcode?.toLowerCase() || '').includes(inventorySearch.toLowerCase()))
                          );
                        setPrintConfigs(itemsToConfig.map(item => ({ item, qty: 1 })));
                        setIsPrintBarcodeModalOpen(true);
                      }}
                      className="bg-slate-800 text-white px-4 py-2.5 rounded-lg hover:bg-slate-900 flex items-center justify-center gap-2 w-full sm:w-auto font-medium"
                    >
                      <Printer size={20} /> {selectedInventoryItems.length > 0 ? `${t('printSelected')} (${selectedInventoryItems.length})` : t('printAll')}
                    </button>
                    <button
                      onClick={() => { setScannerMode('buy'); setIsScannerOpen(true); }}
                      className="bg-emerald-600 text-white px-4 py-2.5 rounded-lg hover:bg-emerald-700 flex items-center justify-center gap-2 w-full sm:w-auto font-medium"
                    >
                      <Scan size={20} /> {t('quickStockIn') || 'Stock In'}
                    </button>
                    <button onClick={() => setIsAddItemModalOpen(true)} className="bg-blue-600 text-white px-4 py-2.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 w-full sm:w-auto">
                      <Plus size={20} /> {t('addItem')}
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                    <div className="flex flex-col sm:flex-row gap-3 w-full">
                      <select
                        className="bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto shadow-sm"
                        value={warehouseLocationFilter}
                        onChange={e => setWarehouseLocationFilter(e.target.value)}
                      >
                        <option value="">{t('filterAll') || 'All Locations'}</option>
                        {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                      </select>
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder={t('searchInventory')}
                          className="w-full pl-11 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                          value={inventorySearch}
                          onChange={(e) => setInventorySearch(e.target.value)}
                          autoComplete="off"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 w-10">
                            <input
                              type="checkbox"
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              onChange={(e) => {
                                const filtered = inventory.filter(item =>
                                  (!warehouseLocationFilter || item.location === warehouseLocationFilter) &&
                                  ((item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                                    (item.barcode?.toLowerCase() || '').includes(inventorySearch.toLowerCase()))
                                );
                                if (e.target.checked) {
                                  setSelectedInventoryItems(filtered.map(i => i.id));
                                } else {
                                  setSelectedInventoryItems([]);
                                }
                              }}
                              checked={(() => {
                                const filtered = inventory.filter(item =>
                                  (!warehouseLocationFilter || item.location === warehouseLocationFilter) &&
                                  ((item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                                    (item.barcode?.toLowerCase() || '').includes(inventorySearch.toLowerCase()))
                                );
                                return filtered.length > 0 && filtered.every(i => selectedInventoryItems.includes(i.id));
                              })()}
                            />
                          </th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('image') || 'Image'}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('itemName')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('barcode') || 'Barcode'}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('location')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap text-right">{t('buyPrice')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap text-right">{t('sellPrice')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap text-right">{t('quantity')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap text-right">{t('actions')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {inventory
                          .filter(item =>
                            (!warehouseLocationFilter || item.location === warehouseLocationFilter) &&
                            ((item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                              (item.barcode?.toLowerCase() || '').includes(inventorySearch.toLowerCase()))
                          )
                          .map(item => (
                            <tr key={item.id} className={`hover:bg-gray-50 transition-colors ${selectedInventoryItems.includes(item.id) ? 'bg-blue-50/50' : ''}`}>
                              <td className="px-6 py-4">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  checked={selectedInventoryItems.includes(item.id)}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setSelectedInventoryItems([...selectedInventoryItems, item.id]);
                                    } else {
                                      setSelectedInventoryItems(selectedInventoryItems.filter(id => id !== item.id));
                                    }
                                  }}
                                />
                              </td>
                              <td className="px-6 py-4">
                                <div className="w-12 h-12 bg-gray-50 rounded-xl flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner">
                                  {item.photo ? (
                                    <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                                  ) : (
                                    <Package size={20} className="text-gray-300" />
                                  )}
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className="font-bold text-gray-900 block">{item.name}</span>
                              </td>
                              <td className="px-6 py-4 text-xs font-mono text-gray-400">{item.barcode || '-'}</td>
                              <td className="px-6 py-4 text-xs font-bold text-gray-500">{item.location}</td>
                              <td className="px-6 py-4 text-right font-mono text-gray-500">
                                {showSensitiveData ? formatCurrency(item.buyPrice || 0) : '****'}
                              </td>
                              <td className="px-6 py-4 text-right font-mono font-black text-gray-900">{formatCurrency(item.sellPrice || 0)}</td>
                              <td className="px-6 py-4 text-right font-mono font-black text-gray-900">
                                {item.quantity === 0 ? <span className="text-red-600">0</span> : item.quantity}
                              </td>
                              <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2">
                                  <button onClick={() => { setPrintConfigs([{ item, qty: 1 }]); setIsPrintBarcodeModalOpen(true); }} disabled={!item.barcode} className="p-2 text-slate-600 hover:bg-slate-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100 disabled:opacity-30" title="Print Barcode"><Printer size={16} /></button>
                                  <button onClick={() => { setEditingItem(item); setIsAddItemModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100"><Edit size={16} /></button>
                                  <button onClick={() => handleDeleteWarehouseItem(item.id)} className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-all shadow-sm bg-white border border-gray-100"><Trash2 size={16} /></button>
                                </div>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Mobile Card View */}
                  <div className="md:hidden p-4 space-y-4 max-h-[60vh] overflow-y-auto bg-gray-50/30">
                    {inventory
                      .filter(item =>
                        (!warehouseLocationFilter || item.location === warehouseLocationFilter) &&
                        ((item.name?.toLowerCase() || '').includes(inventorySearch.toLowerCase()) ||
                          (item.barcode?.toLowerCase() || '').includes(inventorySearch.toLowerCase()))
                      )
                      .map(item => (
                        <div key={item.id} className={`bg-white p-4 rounded-2xl border transition-all duration-300 shadow-sm flex gap-4 animate-in fade-in duration-300 ${selectedInventoryItems.includes(item.id) ? 'border-blue-500 bg-blue-50/20' : 'border-gray-100'}`}>
                          <div className="flex flex-col items-center gap-2 shrink-0">
                            <input
                              type="checkbox"
                              className="w-5 h-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              checked={selectedInventoryItems.includes(item.id)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedInventoryItems([...selectedInventoryItems, item.id]);
                                } else {
                                  setSelectedInventoryItems(selectedInventoryItems.filter(id => id !== item.id));
                                }
                              }}
                            />
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center border border-gray-100 overflow-hidden shadow-inner">
                              {item.photo ? (
                                <img src={item.photo} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <Package size={20} className="text-gray-300" />
                              )}
                            </div>
                          </div>
                          <div className="flex-1 flex flex-col justify-between overflow-hidden">
                            <div>
                              <div className="flex justify-between items-start">
                                <h4 className="font-black text-gray-900 text-sm truncate uppercase tracking-tight pr-2">{item.name}</h4>
                                <p className="text-[10px] text-gray-400 font-mono mt-0.5">{item.barcode || 'NO BARCODE'}</p>
                              </div>
                              <div className="flex justify-between items-end mt-2">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{item.location}</span>
                                  <div className="font-mono font-black text-xs text-gray-900">
                                    {formatCurrency(item.sellPrice || 0)}
                                    <span className="text-[10px] text-gray-400 ml-1 font-normal opacity-50">/ UNIT</span>
                                  </div>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-[10px] font-black shadow-sm flex items-center gap-1 ${item.quantity <= 0 ? 'bg-red-50 text-red-600 border border-red-100' : 'bg-gray-900 text-white'}`}>
                                  {item.quantity <= 0 ? (
                                    <>OUT</>
                                  ) : (
                                    <>{item.quantity} IN STOCK</>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>

                  {inventory.length === 0 && (
                    <div className="p-12 text-center">
                      <Package size={48} className="mx-auto text-gray-200 mb-4" />
                      <p className="text-gray-500 font-bold">{t('noInventory')}</p>
                    </div>
                  )}
                </div>
              </div>
            )
          }

          {
            activeTab === 'cafe' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                {/* Sub-tab Navigation - ERP Style */}
                <div className="flex gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl w-fit border border-gray-200 mb-8 overflow-x-auto shadow-sm">
                  {[
                    { id: 'board', label: t('liveBoard'), icon: <LayoutDashboard size={14} /> },
                    { id: 'rooms', label: t('manageUnits'), icon: <Plus size={14} /> },
                    { id: 'recipes', label: t('menuRecipes'), icon: <Database size={14} /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setCafeSubTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${cafeSubTab === tab.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {cafeSubTab === 'board' && (
                  <div className="animate-in fade-in zoom-in-95 duration-700">
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <h2 className="text-gray-900 text-2xl font-black uppercase tracking-tight">{t('activeSessions')}</h2>
                        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-[0.1em] mt-1">{t('unitsMonitoring').replace('{0}', cafeRooms.length)}</p>
                      </div>
                      <div className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-gray-100 shadow-sm">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                        <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{t('online')}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {cafeRooms.map(room => {
                        const activeSession = cafeSessions.find(s => s.roomId === room.id && s.status === 'Active');
                        const roomIcon = room.type === 'PlayStation' ? <Monitor size={20} /> : room.type === 'Billiards' ? <Disc size={20} /> : <Coffee size={20} />;

                        return (
                          <div key={room.id} className={`p-6 rounded-[2.5rem] border transition-all duration-500 flex flex-col justify-between h-[300px] relative overflow-hidden group ${activeSession ? 'bg-white border-blue-200 shadow-xl shadow-blue-500/5' : 'bg-white border-gray-100 hover:border-blue-500/30 shadow-sm'}`}>

                            <div className="flex justify-between items-start">
                              <div className={`p-4 rounded-2xl transition-all duration-500 ${activeSession ? 'bg-blue-50 text-blue-600' : 'bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600'}`}>
                                {roomIcon}
                              </div>
                              <div className="text-right">
                                {activeSession ? (
                                  <div className="animate-in fade-in slide-in-from-top-2 duration-700">
                                    <div className="flex items-center justify-end gap-2 mb-1">
                                      <span className="text-[10px] uppercase font-bold tracking-widest text-blue-600/60">{t('inSession')}</span>
                                      <span className="flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-600"></span>
                                      </span>
                                    </div>
                                    <span className="text-3xl font-black text-slate-900 tabular-nums tracking-tighter leading-none">
                                      {activeSession.startTime?.seconds ? (() => {
                                        const now = currentTime;
                                        const start = new Date(activeSession.startTime.seconds * 1000);
                                        const diff = Math.max(0, Math.floor((now - start) / 60000));
                                        const h = Math.floor(diff / 60);
                                        const m = diff % 60;
                                        return `${h}h ${m}m`;
                                      })() : '...'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="animate-in fade-in duration-700">
                                    <span className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 block mb-1">{t('available')}</span>
                                    <span className="text-lg font-black text-slate-900/10 group-hover:text-slate-900/30 transition-colors">{formatCurrency(room.hourlyPrice || 0)}/HR</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            <div>
                              <h3 className="text-2xl font-black uppercase tracking-tight text-slate-900 mb-1 leading-none">{room.name}</h3>
                              <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 opacity-80">{room.type}</p>
                            </div>

                            <div className="flex gap-2 mt-6">
                              {!activeSession ? (
                                <button onClick={() => handleStartCafeSession(room)} className="flex-1 py-3.5 bg-slate-900 hover:bg-black text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-slate-200 active:scale-95">{t('startSession')}</button>
                              ) : (
                                <>
                                  <button onClick={() => { setActiveCafeSession(activeSession); setIsCafeOrderModalOpen(true); }} className="flex-1 py-3.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-blue-100 italic">{t('addOrder')}</button>
                                  <button onClick={() => handleStopCafeSession(activeSession)} className="flex-1 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 border border-rose-100 italic">{t('stop')}</button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {cafeSubTab === 'rooms' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/50">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-6 text-slate-800 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                        {t('manageUnitsTitle')}
                      </h3>
                      <form onSubmit={handleSaveRoom} className="space-y-5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">{t('roomName')}</label>
                          <input type="text" value={roomForm.name} onChange={e => setRoomForm({ ...roomForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300" placeholder="e.g. PS5 VIP 1" required />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">{t('unitType')}</label>
                          <select value={roomForm.type} onChange={e => setRoomForm({ ...roomForm, type: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer">
                            <option value="Cafe">{t('cafeTable')}</option>
                            <option value="PlayStation">{t('playStationRoom')}</option>
                            <option value="Billiards">{t('billiardsTable')}</option>
                          </select>
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">{t('hourlyRate')}</label>
                          <input type="number" value={roomForm.hourlyPrice} onChange={e => setRoomForm({ ...roomForm, hourlyPrice: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300" placeholder="0.00" required />
                        </div>
                        <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 mt-2">
                          <Plus size={18} strokeWidth={3} /> {roomForm.id ? t('updateItem') : t('saveUnit')}
                        </button>
                        {roomForm.id && <button type="button" onClick={() => setRoomForm({ name: '', type: 'Cafe', hourlyPrice: 0 })} className="w-full py-2 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">{t('cancel')}</button>}
                      </form>
                    </div>

                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {cafeRooms.map(room => (
                        <div key={room.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-blue-500/30 transition-all group relative overflow-hidden flex flex-col justify-between shadow-sm min-h-[160px]">
                          <div className="flex justify-between items-start">
                            <div className="flex items-center gap-4">
                              <div className="p-4 bg-slate-50 text-slate-400 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all duration-500">
                                {room.type === 'PlayStation' ? <Monitor size={20} /> : room.type === 'Billiards' ? <Disc size={20} /> : <Coffee size={20} />}
                              </div>
                              <div>
                                <h4 className="font-black uppercase tracking-tight text-lg text-slate-800 leading-none mb-1">{room.name}</h4>
                                <div className="flex items-center gap-2">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{room.type}</span>
                                  <div className="w-1 h-1 rounded-full bg-slate-200"></div>
                                  <span className="text-[9px] font-black text-emerald-500 uppercase tracking-widest">{formatCurrency(room.hourlyPrice || 0)}/HR</span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-all duration-500 transform translate-x-2 group-hover:translate-x-0">
                              <button onClick={() => setRoomForm(room)} className="p-3.5 bg-white/5 text-gray-400 hover:text-white hover:bg-blue-600 rounded-2xl transition-all shadow-lg active:scale-90"><Edit size={18} /></button>
                              <button onClick={() => handleDeleteRoom(room.id)} className="p-3.5 bg-white/5 text-gray-400 hover:text-white hover:bg-rose-600 rounded-2xl transition-all shadow-lg active:scale-90"><Trash2 size={18} /></button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {cafeSubTab === 'recipes' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="lg:col-span-4 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/50">
                      <h3 className="text-lg font-black uppercase tracking-tight mb-6 text-slate-800 flex items-center gap-2">
                        <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
                        {t('recipeBuilder')}
                      </h3>
                      <form onSubmit={handleSaveRecipe} className="space-y-5">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">{t('itemName')}</label>
                          <input type="text" value={recipeForm.name} onChange={e => setRecipeForm({ ...recipeForm, name: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300" placeholder="e.g. Mocha Premium" required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">{t('category')}</label>
                            <select value={recipeForm.category} onChange={e => setRecipeForm({ ...recipeForm, category: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all appearance-none cursor-pointer">
                              <option value="Hot Drinks">{t('hotDrinks')}</option>
                              <option value="Cold Drinks">{t('coldDrinks')}</option>
                              <option value="Snacks">{t('snacks')}</option>
                              <option value="Meals">{t('meals')}</option>
                            </select>
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">{t('offerPrice')}</label>
                            <input type="number" value={recipeForm.sellPrice} onChange={e => setRecipeForm({ ...recipeForm, sellPrice: e.target.value })} className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all placeholder:text-slate-300" placeholder="0.00" required />
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 pl-4">{t('composition')}</label>
                          <div className="space-y-2">
                            {recipeForm.ingredients.map((ing, idx) => (
                              <div key={idx} className="flex gap-2 items-center bg-slate-50 p-3 rounded-xl border border-slate-100 group/ing">
                                <span className="flex-1 text-[10px] font-bold text-slate-700 truncate uppercase">{ing.name}</span>
                                <input
                                  type="number"
                                  value={ing.qty}
                                  onChange={e => {
                                    const news = [...recipeForm.ingredients];
                                    news[idx].qty = e.target.value;
                                    setRecipeForm({ ...recipeForm, ingredients: news });
                                  }}
                                  className="w-14 bg-white border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-black text-slate-900 text-center"
                                />
                                <button type="button" onClick={() => setRecipeForm({ ...recipeForm, ingredients: recipeForm.ingredients.filter((_, i) => i !== idx) })} className="text-slate-300 hover:text-rose-500 transition-colors">
                                  <Minus size={14} strokeWidth={3} />
                                </button>
                              </div>
                            ))}
                          </div>
                          <select
                            onChange={e => {
                              const item = inventory.find(i => i.id === e.target.value);
                              if (item && !recipeForm.ingredients.find(ing => ing.id === item.id)) {
                                setRecipeForm({ ...recipeForm, ingredients: [...recipeForm.ingredients, { id: item.id, name: item.name, qty: 1 }] });
                              }
                              e.target.value = "";
                            }}
                            className="w-full bg-white border border-dashed border-slate-200 rounded-2xl px-6 py-4 text-[10px] font-black text-slate-400 text-center cursor-pointer hover:border-indigo-300 hover:text-indigo-400 transition-all font-mono"
                          >
                            <option value="">{t('linkStock')}</option>
                            {inventory.map(i => <option key={i.id} value={i.id}>{i.name} ({i.location})</option>)}
                          </select>
                        </div>

                        <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mt-4">
                          {recipeForm.id ? t('updateItem') : t('addToMenu')}
                        </button>
                      </form>
                    </div>

                    <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {recipes.map(recipe => (
                        <div key={recipe.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 hover:border-indigo-500/30 transition-all group relative overflow-hidden flex flex-col justify-between shadow-sm cursor-pointer" onClick={() => setRecipeForm(recipe)}>
                          <div className="flex justify-between items-start mb-4">
                            <span className="bg-indigo-50 text-indigo-600 text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-indigo-100">{recipe.category}</span>
                            <div className="flex gap-2">
                              <button onClick={(e) => { e.stopPropagation(); setRecipeForm(recipe); }} className="p-2 text-slate-300 hover:text-indigo-500"><Edit size={16} /></button>
                              <button onClick={(e) => { e.stopPropagation(); handleDeleteRecipe(recipe.id); }} className="p-2 text-slate-300 hover:text-rose-500"><Trash2 size={16} /></button>
                            </div>
                          </div>

                          <div>
                            <h4 className="font-black uppercase tracking-tight text-xl text-slate-800 mb-1 leading-none">{recipe.name}</h4>
                            <p className="text-lg font-black text-indigo-600 tracking-tight">{formatCurrency(recipe.sellPrice)}</p>

                            <div className="mt-6 flex flex-wrap gap-2">
                              {(recipe.ingredients || []).map((ing, idx) => (
                                <span key={idx} className="bg-slate-50 text-[9px] font-bold px-3 py-1.5 rounded-lg uppercase text-slate-500 border border-slate-100">
                                  {ing.qty}× {ing.name}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {cafeSubTab === 'history' && (
                  <div className="bg-white p-6 rounded-[2.5rem] border border-gray-100 shadow-xl shadow-slate-200/50 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    <div className="flex flex-col sm:flex-row justify-between items-center mb-6 px-2 gap-4">
                      <h2 className="text-gray-900 text-2xl font-black uppercase tracking-tight">{t('cafeHistory')}</h2>
                      <div className="flex items-center gap-3 w-full sm:w-auto">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">{t('searchByDate')}</span>
                        <input type="date" value={posHistoryDate} onChange={(e) => setPosHistoryDate(e.target.value)} className="w-full sm:w-auto bg-slate-50 border border-slate-100 rounded-xl px-4 py-2 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all" />
                      </div>
                    </div>
                    <div className="max-h-[600px] overflow-y-auto px-1">
                      <div className="hidden md:block">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10">
                            <tr>
                              <th className="p-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{t('time')}</th>
                              <th className="p-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{t('invoiceId')}</th>
                              <th className="p-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{t('amount')}</th>
                              <th className="p-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right">{t('actions')}</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {(sales || []).filter(s => s.location === 'Cafe' && s.date === posHistoryDate).map(s => (
                              <tr key={s.id} className="hover:bg-slate-50/50 transition-colors group">
                                <td className="p-4 text-slate-500 font-bold">{s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</td>
                                <td className="p-4 font-mono text-xs text-blue-600 font-black">{s.invoiceId || '-'}</td>
                                <td className="p-4 font-mono font-black text-slate-900">{formatCurrency(s.amount)}</td>
                                <td className="p-4 text-right"><button onClick={() => handlePrintInvoice(s, t('receipt'))} className="p-2 border border-slate-100 text-slate-400 hover:text-blue-600 rounded-lg"><Printer size={16} /></button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                      <div className="md:hidden space-y-4">
                        {(sales || []).filter(s => s.location === 'Cafe' && s.date === posHistoryDate).map(s => (
                          <div key={s.id} className="p-4 border border-slate-100 rounded-3xl bg-slate-50/50 flex justify-between items-center">
                            <div>
                              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{s.createdAt ? new Date(s.createdAt.seconds * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Now'}</div>
                              <div className="font-mono font-black text-slate-900">{formatCurrency(s.amount)}</div>
                            </div>
                            <button onClick={() => handlePrintInvoice(s, t('receipt'))} className="p-3 bg-white border border-slate-100 text-slate-600 rounded-2xl shadow-sm"><Printer size={20} /></button>
                          </div>
                        ))}
                      </div>
                      {(sales || []).filter(s => s.location === 'Cafe' && s.date === posHistoryDate).length === 0 && (
                        <div className="p-20 text-center"><Search size={40} className="mx-auto mb-4 text-slate-200" /><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('noHistory')}</p></div>
                      )}
                    </div>
                  </div>
                )}
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
                      value={historyLocationFilter}
                      onChange={(e) => setHistoryLocationFilter(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-auto"
                    >
                      <option value="">{t('filterAll') || 'All Locations'}</option>
                      {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                    </select>
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
                    // Check Date AND Location
                    return (!historyDateFilter || sDate === historyDateFilter) &&
                      (!historyLocationFilter || s.location === historyLocationFilter);
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

                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-20 lg:mb-0">
                  {/* Desktop Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-gray-50 border-b border-gray-100">
                        <tr>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('time')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('type')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('description')}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap">{t('paymentMode') || 'Payment'}</th>
                          <th className="px-6 py-4 font-bold text-[10px] uppercase tracking-widest text-gray-500 whitespace-nowrap text-right">{t('valueStatus')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(() => {
                          // ... same log filtering logic ...
                          const logs = [
                            ...sales
                              .filter(s => !historyLocationFilter || s.location === historyLocationFilter)
                              .map(s => ({
                                id: 'sale-' + s.id,
                                type: t('sales'),
                                category: 'Sale',
                                date: s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date),
                                desc: `${t('sold')} ${Array.isArray(s.items) ? s.items.length : 1} ${t('items')} ${t('to')} ${s.customer || t('walkIn')}`,
                                val: s.amount,
                                isCurrency: true,
                                paymentMethod: s.paymentMethod
                              })),
                            ...purchases
                              .filter(p => p.type === 'Stock Increase' || p.type === 'Inventory Add')
                              .filter(p => !historyLocationFilter || p.location === historyLocationFilter)
                              .map(p => ({
                                id: 'pur-' + p.id,
                                type: t('stockUpdates'),
                                category: 'Stock Update',
                                date: p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : (p.date ? new Date(p.date) : new Date()),
                                desc: `${t('stockCheck')}: ${p.name.replace(' (Stock Update)', '').replace(' (Initial Stock)', '')} @ ${p.location}`,
                                val: `${p.quantity || 0} ${t('units')}`,
                                isCurrency: false,
                                paymentMethod: null
                              }))
                          ].sort((a, b) => b.date - a.date);

                          let filteredLogs = historyFilter === 'All' ? logs : logs.filter(l => l.category === historyFilter);
                          if (historyDateFilter) {
                            filteredLogs = filteredLogs.filter(l => new Date(l.date).toISOString().split('T')[0] === historyDateFilter);
                          }

                          if (filteredLogs.length === 0) return <tr><td colSpan="5" className="px-6 py-8 text-center text-gray-500">{t('noHistory')}</td></tr>;

                          return filteredLogs.map(log => (
                            <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                              <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.date.toLocaleString()}</td>
                              <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${log.category === 'Sale' ? 'bg-blue-50 text-blue-700' : 'bg-orange-50 text-orange-700'}`}>{log.type}</span></td>
                              <td className="px-6 py-4 text-sm text-gray-700 font-bold">{log.desc}</td>
                              <td className="px-6 py-4 text-gray-500">
                                {log.paymentMethod && (
                                  <span className="flex items-center gap-1.5 text-xs font-bold">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    {log.paymentMethod}
                                  </span>
                                )}
                              </td>
                              <td className="px-6 py-4 text-right font-black font-mono text-gray-900">{log.isCurrency ? formatCurrency(log.val) : log.val}</td>
                            </tr>
                          ));
                        })()}
                      </tbody>
                    </table>
                  </div>

                  {/* Mobile Mobile Card View */}
                  <div className="md:hidden p-4 space-y-3 bg-gray-50/30 overflow-y-auto max-h-[60vh]">
                    {(() => {
                      const logs = [
                        ...sales.filter(s => !historyLocationFilter || s.location === historyLocationFilter).map(s => ({
                          id: 'sale-' + s.id,
                          type: t('sales'),
                          category: 'Sale',
                          date: s.createdAt?.seconds ? new Date(s.createdAt.seconds * 1000) : new Date(s.date),
                          desc: `${t('sold')} ${Array.isArray(s.items) ? s.items.length : 1} ${t('items')} ${t('to')} ${s.customer || t('walkIn')}`,
                          val: s.amount,
                          isCurrency: true,
                          paymentMethod: s.paymentMethod
                        })),
                        ...purchases
                          .filter(p => p.type === 'Stock Increase' || p.type === 'Inventory Add')
                          .filter(p => !historyLocationFilter || p.location === historyLocationFilter)
                          .map(p => ({
                            id: 'pur-' + p.id,
                            type: t('stockUpdates'),
                            category: 'Stock Update',
                            date: p.createdAt?.seconds ? new Date(p.createdAt.seconds * 1000) : (p.date ? new Date(p.date) : new Date()),
                            desc: `${t('stockCheck')}: ${p.name.replace(' (Stock Update)', '').replace(' (Initial Stock)', '')} @ ${p.location}`,
                            val: `${p.quantity || 0} ${t('units')}`,
                            isCurrency: false,
                            paymentMethod: null
                          }))
                      ].sort((a, b) => b.date - a.date);

                      let filteredLogs = historyFilter === 'All' ? logs : logs.filter(l => l.category === historyFilter);
                      if (historyDateFilter) filteredLogs = filteredLogs.filter(l => new Date(l.date).toISOString().split('T')[0] === historyDateFilter);

                      if (filteredLogs.length === 0) return <div className="text-center py-8 text-gray-400">{t('noHistory')}</div>;

                      return filteredLogs.map(log => (
                        <div key={log.id} className="p-4 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col gap-2">
                          <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                            <span className="text-gray-400">{log.date.toLocaleString()}</span>
                            <span className={log.category === 'Sale' ? 'text-blue-600' : 'text-orange-500'}>{log.type}</span>
                          </div>
                          <p className="text-xs font-bold text-gray-900 leading-relaxed">{log.desc}</p>
                          <div className="flex justify-between items-end border-t border-gray-50 pt-2 mt-1">
                            <div className="text-[10px] font-bold text-gray-400">
                              {log.paymentMethod && <span className="flex items-center gap-1 uppercase"> <CreditCard size={10} /> {log.paymentMethod}</span>}
                            </div>
                            <div className="font-mono font-black text-gray-900 border-b-2 border-blue-100">{log.isCurrency ? formatCurrency(log.val) : log.val}</div>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </div>
              </div>
            )
          }

          {/* ========================================================= */}
          {/* ================= SERVICE / REPAIR SHOP TAB ================= */}
          {/* ========================================================= */}
          {
            activeTab === 'service' && (
              <div className="space-y-6 animate-in fade-in duration-500">
                <div className="flex gap-2 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl w-fit border border-gray-200 mb-8 overflow-x-auto shadow-sm">
                  {[
                    { id: 'board', label: t('dashboard'), icon: <LayoutDashboard size={14} /> },
                    { id: 'sell', label: t('sell') || 'Sell', icon: <ShoppingCart size={14} /> },
                    { id: 'active', label: t('activeJobs'), icon: <Wrench size={14} /> },
                    { id: 'new', label: t('newTicket'), icon: <Plus size={14} /> },
                    { id: 'history', label: t('history') || 'History', icon: <History size={14} /> },
                    { id: 'reports', label: t('menuReports'), icon: <BarChart3 size={14} /> }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setServiceSubTab(tab.id)}
                      className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap ${serviceSubTab === tab.id ? 'bg-slate-900 text-white shadow-lg shadow-slate-200' : 'text-slate-400 hover:text-slate-600 hover:bg-white'}`}
                    >
                      {tab.icon} {tab.label}
                    </button>
                  ))}
                </div>

                {/* Sub Tab: BOARD (DASHBOARD) */}
                {serviceSubTab === 'board' && (
                  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
                    {/* Stats Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                      {[
                        { label: t('todaysRevenue') || "Today's Revenue", value: formatCurrency(serviceTickets.filter(t => t.status === 'Delivered' && t.createdAt?.seconds && new Date(t.createdAt.seconds * 1000).toDateString() === new Date().toDateString()).reduce((acc, curr) => acc + Number(curr.estimatedCost || 0), 0)), icon: <Zap className="text-amber-500" />, bg: 'bg-amber-50' },
                        { label: t('pendingRepairs'), value: serviceTickets.filter(t => t.status === 'Received' || t.status === 'In Progress').length, icon: <Clock className="text-orange-500" />, bg: 'bg-orange-50' },
                        { label: t('readyPickup'), value: serviceTickets.filter(t => t.status === 'Ready').length, icon: <CheckSquare className="text-emerald-500" />, bg: 'bg-emerald-50' },
                        { label: t('lowStock'), value: serviceInventory.filter(i => i.stock <= i.minStock).length, icon: <AlertTriangle className="text-rose-500" />, bg: 'bg-rose-50' },
                        { label: t('pendingPayments'), value: serviceTickets.filter(t => t.paymentStatus === 'Unpaid' || t.paymentStatus === 'Partial').length, icon: <CreditCard className="text-blue-500" />, bg: 'bg-blue-50' }
                      ].map((stat, i) => (
                        <div key={i} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm flex items-center gap-5">
                          <div className={`p-4 rounded-2xl ${stat.bg}`}>{stat.icon}</div>
                          <div>
                            <p className="text-[10px] font-black uppercase text-gray-400 tracking-widest">{stat.label}</p>
                            <h3 className="text-lg font-black text-gray-900 leading-none mt-1">{stat.value}</h3>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Quick Actions & Recent Activity */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                      <div className="lg:col-span-2 space-y-8">
                        {/* Quick Actions Grid */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                          <h3 className="text-sm font-black uppercase text-gray-900 tracking-widest mb-6 flex items-center gap-2">
                            <Zap size={16} className="text-amber-500" /> {t('quickActions')}
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                              { label: t('newTicket'), icon: <Wrench size={24} />, color: 'bg-blue-500', action: () => setServiceSubTab('new') },
                              { label: t('addCustomer'), icon: <UserPlus size={24} />, color: 'bg-indigo-500', action: () => { setServiceSubTab('customers'); setSelectedServiceCustomer(null); setIsCustomerModalOpen(true); } },
                              { label: t('activeJobs'), icon: <Activity size={24} />, color: 'bg-emerald-500', action: () => setServiceSubTab('active') },
                              { label: t('sell') || 'Sell', icon: <ShoppingCart size={24} />, color: 'bg-indigo-600', action: () => setServiceSubTab('sell') }
                            ].map((btn, i) => (
                              <button
                                key={i}
                                onClick={btn.action}
                                className="group flex flex-col items-center gap-3 p-6 rounded-3xl hover:bg-gray-50 transition-all border border-transparent hover:border-gray-100"
                              >
                                <div className={`w-14 h-14 rounded-2xl ${btn.color} text-white flex items-center justify-center shadow-lg transform group-hover:-translate-y-1 transition-transform`}>
                                  {btn.icon}
                                </div>
                                <span className="text-[10px] font-black uppercase text-gray-600 tracking-widest text-center">{btn.label}</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        {/* Recent Activity List */}
                        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                          <h3 className="text-sm font-black uppercase text-gray-900 tracking-widest mb-6 flex items-center gap-2">
                            <History size={16} className="text-blue-500" /> {t('recentActivity')}
                          </h3>
                          <div className="space-y-4">
                            {serviceTickets.sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).slice(0, 5).map(ticket => (
                              <div key={ticket.id} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-all border border-transparent hover:border-slate-100 group">
                                <div className="p-3 bg-slate-100 rounded-xl text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                                  {ticket.deviceType === 'Mobile' ? <Smartphone size={20} /> : <Laptop size={20} />}
                                </div>
                                <div className="flex-1">
                                  <h4 className="text-sm font-bold text-gray-900">{ticket.customerName} - {ticket.brand} {ticket.model}</h4>
                                  <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">{ticket.status} • {ticket.createdAt?.seconds ? new Date(ticket.createdAt.seconds * 1000).toLocaleString() : 'Just now'}</p>
                                </div>
                                <button onClick={() => { setEditingTicket(ticket); setIsTicketModalOpen(true); }} className="p-2 text-gray-300 hover:text-blue-600 transition-colors"><ChevronRight size={20} /></button>
                              </div>
                            ))}
                            {serviceTickets.length === 0 && (
                              <div className="text-center py-12 opacity-30">
                                <History size={48} className="mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">No activities recorded yet</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Side Section: Priority & Low Stock */}
                      <div className="space-y-8">
                        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl shadow-slate-200">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-slate-400">{t('urgent')} & {t('high')}</h3>
                          <div className="space-y-4">
                            {serviceTickets.filter(t => t.priority === 'Urgent' || t.priority === 'High').slice(0, 3).map(ticket => (
                              <div key={ticket.id} className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/5 group hover:bg-white/20 transition-all cursor-pointer" onClick={() => { setEditingTicket(ticket); setIsTicketModalOpen(true); }}>
                                <div className="flex justify-between items-start mb-2">
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded ${ticket.priority === 'Urgent' ? 'bg-red-500 text-white' : 'bg-orange-400 text-slate-900'}`}>{ticket.priority}</span>
                                  <span className="text-[8px] font-mono text-slate-500">#{ticket.id.slice(0, 6)}</span>
                                </div>
                                <h4 className="text-xs font-bold truncate">{ticket.customerName}</h4>
                                <p className="text-[10px] text-slate-400 mt-1 line-clamp-1">{ticket.issue}</p>
                              </div>
                            ))}
                            {serviceTickets.filter(t => t.priority === 'Urgent' || t.priority === 'High').length === 0 && (
                              <p className="text-[10px] text-slate-500 font-bold uppercase py-4">All high priority jobs cleared!</p>
                            )}
                          </div>
                        </div>

                        <div className="bg-white p-8 rounded-[2.5rem] border border-rose-100 shadow-sm border-dashed">
                          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-6 text-rose-500 flex items-center gap-2">
                            <AlertTriangle size={14} /> {t('lowStockAlerts')}
                          </h3>
                          <div className="space-y-4">
                            {serviceInventory.filter(i => i.stock <= i.minStock).slice(0, 4).map(item => (
                              <div key={item.id} className="flex justify-between items-center group">
                                <div>
                                  <h4 className="text-xs font-bold text-gray-800 uppercase tracking-tight">{item.name}</h4>
                                  <p className="text-[9px] text-gray-400 font-bold uppercase mt-0.5">{item.category}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs font-black text-rose-600 tabular-nums">{item.stock} / {item.minStock}</p>
                                  <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">{t('lowStock')}</p>
                                </div>
                              </div>
                            ))}
                            {serviceInventory.filter(i => i.stock <= i.minStock).length === 0 && (
                              <p className="text-[10px] text-slate-300 font-bold uppercase py-4">Inventory is healthy</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {/* Sub Tab: SELL (SERVICE POS) */}
                {serviceSubTab === 'sell' && (
                  <div className="flex flex-col lg:flex-row h-full -m-6 bg-gray-50 overflow-hidden relative">
                    {/* Left Side: Search & Items Grid */}
                    <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-gray-200">
                      {/* Top Action Bar */}
                      <div className="p-6 bg-white border-b border-gray-200">
                        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-200">
                              <ShoppingCart size={24} />
                            </div>
                            <div>
                              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight">{t('servicePOS') || 'Service POS'}</h2>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('activeJobs') || 'Sales & Repairs'}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 flex-1">
                            <div className="relative flex-1">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                              <input
                                type="text"
                                placeholder={t('searchRepairsAndStock') || 'Search Repairs or Stock...'}
                                className="w-full pl-12 pr-4 py-3 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 transition-all font-bold text-sm"
                                value={serviceInventorySearch}
                                onChange={e => setServiceInventorySearch(e.target.value)}
                              />
                            </div>
                            <button
                              onClick={() => {
                                const name = prompt('Item Name:');
                                if (!name) return;
                                const price = prompt('Price:');
                                if (!price) return;
                                setServiceCart([...serviceCart, { id: 'custom-'+Date.now(), name, sellPrice: Number(price), quantity: 1, type: 'part' }]);
                              }}
                              className="flex items-center gap-1 text-emerald-600 hover:bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 text-xs font-bold transition-all whitespace-nowrap"
                            >
                              <PlusCircle size={16} /> Custom
                            </button>
                            <button
                              onClick={() => {
                                const ready = serviceTickets.filter(t => t.status === 'Ready for Pickup' || t.status === 'Ready');
                                if (ready.length === 0) { alert('No repairs ready for pickup'); return; }
                                const choice = prompt('Ready Repairs:\n' + ready.map((t, i) => `${i+1}. ${t.customerName} - ${t.brand} (${formatCurrency(t.estimatedCost)})`).join('\n') + '\n\nEnter number to add:');
                                const idx = parseInt(choice) - 1;
                                if (ready[idx]) {
                                  setServiceCart([...serviceCart, {
                                    id: 'SRV-' + ready[idx].id,
                                    name: `Repair: ${ready[idx].brand} ${ready[idx].model} (${ready[idx].id.slice(0, 6)})`,
                                    sellPrice: Number(ready[idx].estimatedCost),
                                    quantity: 1,
                                    type: 'service'
                                  }]);
                                }
                              }}
                              className="flex items-center gap-1 text-amber-600 hover:bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-200 text-xs font-bold transition-all whitespace-nowrap"
                            >
                              <Wrench size={16} /> Ready
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                        {/* 1. Active Repairs Section */}
                        <section className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                              <Wrench size={14} className="text-blue-500" /> {t('activeRepairs') || 'Active Repairs'}
                            </h3>
                            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-full">{serviceTickets.filter(t => t.status !== 'Completed' && t.status !== 'Delivered').length} Jobs</span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                            {serviceTickets
                              .filter(ticket => (ticket.status !== 'Completed' && ticket.status !== 'Delivered') && 
                                (ticket.customerName.toLowerCase().includes(serviceInventorySearch.toLowerCase()) || 
                                 ticket.id.toLowerCase().includes(serviceInventorySearch.toLowerCase()) ||
                                 ticket.brand.toLowerCase().includes(serviceInventorySearch.toLowerCase())))
                              .map(ticket => (
                                <button
                                  key={ticket.id}
                                  onClick={() => {
                                    const laborPrice = Number(ticket.estimatedCost || 0);
                                    const items = [
                                      { id: 'SRV-'+ticket.id + '-LB', name: `Repair Labor: ${ticket.brand} ${ticket.model} (${ticket.id.slice(0, 6)})`, sellPrice: laborPrice, quantity: 1, type: 'service' },
                                      ...(ticket.partsUsed || []).map(p => ({ id: p.id || 'man-'+Date.now(), name: `Part: ${p.name}`, sellPrice: p.price, quantity: p.quantity, type: 'part' }))
                                    ];
                                    setServiceCart([...serviceCart, ...items]);
                                  }}
                                  className="text-left bg-white p-5 rounded-[2rem] border border-gray-100 hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-200/20 transition-all active:scale-95 group relative overflow-hidden"
                                >
                                  <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Wrench size={48} />
                                  </div>
                                  <div className="relative z-10 flex flex-col h-full justify-between">
                                    <div>
                                      <div className="flex justify-between items-start mb-2">
                                        <p className="text-sm font-black text-gray-900 uppercase tracking-tight line-clamp-1">{ticket.customerName}</p>
                                        <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-full ${ticket.status === 'Ready' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-amber-100 text-amber-700'}`}>{ticket.status}</span>
                                      </div>
                                      <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{ticket.brand} {ticket.model}</p>
                                    </div>
                                    <div className="mt-4 flex justify-between items-end border-t border-gray-50 pt-3">
                                      <div className="text-xl font-black text-blue-600 font-mono">{formatCurrency(ticket.estimatedCost)}</div>
                                      <div className="p-2 bg-blue-50 text-blue-600 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                        <Plus size={16} />
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                          </div>
                        </section>

                        {/* 2. Parts & Inventory Section */}
                        <section className="space-y-4">
                          <div className="flex items-center justify-between px-2">
                            <h3 className="text-xs font-black uppercase text-slate-400 tracking-[0.2em] flex items-center gap-2">
                              <Package size={14} className="text-indigo-500" /> {t('inventoryParts') || 'Inventory Parts'}
                            </h3>
                            <div className="flex gap-2">
                              {['All', 'Phone Parts', 'PC Components', 'Accessories'].map(cat => (
                                <button 
                                  key={cat}
                                  onClick={() => setServiceInventorySearch(cat === 'All' ? '' : cat)}
                                  className={`text-[8px] font-black uppercase px-3 py-1.5 rounded-full transition-all ${serviceInventorySearch === cat ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-200' : 'bg-white text-gray-400 hover:bg-gray-100'}`}
                                >
                                  {cat}
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-4 pb-20">
                            {inventory
                              .filter(item => item.name.toLowerCase().includes(serviceInventorySearch.toLowerCase()) || (item.category || '').toLowerCase().includes(serviceInventorySearch.toLowerCase()))
                              .map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => {
                                    const existing = serviceCart.find(c => c.id === item.id);
                                    if (existing) {
                                      setServiceCart(serviceCart.map(c => c.id === item.id ? { ...c, quantity: (c.quantity || 1) + 1 } : c));
                                    } else {
                                      setServiceCart([...serviceCart, { id: item.id, name: item.name, sellPrice: item.sellPrice, quantity: 1, type: 'part' }]);
                                    }
                                  }}
                                  className="bg-white p-4 rounded-[1.5rem] border border-gray-100 hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-200/20 transition-all active:scale-95 group flex flex-col gap-3 text-left"
                                >
                                  <div className="bg-gray-50 aspect-square rounded-2xl overflow-hidden relative">
                                    {item.photo ? (
                                      <img src={item.photo} alt={item.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                                        <Package size={24} />
                                      </div>
                                    )}
                                    <div className="absolute top-2 right-2 px-2 py-1 bg-white/80 backdrop-blur-md rounded-lg text-[8px] font-black">
                                       STOCK: {item.quantity || 0}
                                    </div>
                                  </div>
                                  <div className="space-y-1">
                                    <h4 className="text-xs font-black text-gray-800 uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-indigo-600 transition-colors">{item.name}</h4>
                                    <div className="flex justify-between items-end">
                                      <p className="text-sm font-black text-indigo-600 font-mono">{formatCurrency(item.sellPrice)}</p>
                                      <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-600 group-hover:text-white transition-all">
                                        <Plus size={14} />
                                      </div>
                                    </div>
                                  </div>
                                </button>
                              ))}
                            <button
                              onClick={() => {
                                const name = prompt('Custom Item Name:');
                                if (name) {
                                  const price = prompt('Price:');
                                  if (price) {
                                    setServiceCart([...serviceCart, { id: 'man-'+Date.now(), name: name, sellPrice: Number(price), quantity: 1, type: 'part' }]);
                                  }
                                }
                              }}
                              className="bg-white p-4 rounded-[1.5rem] border-2 border-dashed border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all active:scale-95 group flex flex-col items-center justify-center gap-2 text-center"
                            >
                              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center group-hover:bg-blue-600 group-hover:text-white transition-all">
                                <Plus size={20} />
                              </div>
                              <p className="text-[10px] font-black uppercase text-gray-400 group-hover:text-blue-600">Custom Item</p>
                            </button>
                          </div>
                        </section>
                      </div>
                    </div>

                    {/* Right Side: Cart Sidebar (Fixed) */}
                    <div className="w-full lg:w-[420px] bg-white border-l border-gray-200 flex flex-col h-full z-20 shadow-[-10px_0_30px_rgba(0,0,0,0.02)]">
                      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-30">
                        <div className="flex items-center gap-3">
                          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
                            <ShoppingCart size={20} />
                          </div>
                          <h3 className="font-black text-lg uppercase tracking-tight">{t('currentBill')}</h3>
                        </div>
                        <span className="bg-blue-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg shadow-blue-200">
                          {serviceCart.reduce((a, b) => a + (b.quantity || 1), 0)} ITEMS
                        </span>
                      </div>

                      <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                        {serviceCart.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-gray-300 p-8 text-center opacity-60">
                            <div className="w-20 h-20 bg-gray-50 rounded-[2rem] flex items-center justify-center mb-4 border border-dashed border-gray-200">
                              <ShoppingBag size={32} className="opacity-20" />
                            </div>
                            <p className="text-sm font-black uppercase tracking-widest text-gray-400">{t('cartEmpty')}</p>
                            <p className="text-[10px] uppercase font-bold text-gray-300 mt-2">{t('selectItems')}</p>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {serviceCart.map((item, i) => (
                              <div key={`${item.id}-${i}`} className="bg-gray-50 rounded-2xl p-4 flex flex-col gap-3 group border border-transparent hover:border-blue-100 hover:bg-white hover:shadow-xl hover:shadow-blue-200/10 transition-all active:scale-[0.98]">
                                <div className="flex justify-between items-start">
                                  <div className="flex-1">
                                    <h4 className="text-[11px] font-black text-gray-800 uppercase tracking-tight leading-tight">{item.name}</h4>
                                    <p className="text-[8px] text-gray-400 font-black uppercase mt-1 tracking-widest bg-white px-2 py-0.5 rounded-full inline-block border border-gray-100">{item.type === 'service' ? 'Maintenance Service' : 'Hardware Part'}</p>
                                  </div>
                                  <button onClick={() => setServiceCart(serviceCart.filter((_, idx) => idx !== i))} className="text-gray-300 hover:text-rose-500 transition-colors p-1"><X size={16} /></button>
                                </div>
                                <div className="flex justify-between items-center bg-white px-3 py-2 rounded-xl border border-gray-100">
                                  <div className="flex items-center gap-3">
                                    <button onClick={() => {
                                      const newCart = [...serviceCart];
                                      if (newCart[i].quantity > 1) {
                                        newCart[i].quantity -= 1;
                                        setServiceCart(newCart);
                                      } else {
                                        setServiceCart(serviceCart.filter((_, idx) => idx !== i));
                                      }
                                    }} className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-rose-50 hover:text-rose-600 transition-all border border-transparent hover:border-rose-100"><Minus size={14} /></button>
                                    <span className="text-xs font-black font-mono w-4 text-center">{item.quantity}</span>
                                    <button onClick={() => {
                                      const newCart = [...serviceCart];
                                      newCart[i].quantity += 1;
                                      setServiceCart(newCart);
                                    }} className="w-8 h-8 rounded-lg bg-gray-50 text-gray-400 flex items-center justify-center hover:bg-blue-50 hover:text-blue-600 transition-all border border-transparent hover:border-blue-100"><Plus size={14} /></button>
                                  </div>
                                  <p className="text-sm font-black text-gray-900 font-mono tracking-tighter">{formatCurrency(item.sellPrice * item.quantity)}</p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="p-6 bg-white border-t border-gray-100 space-y-4 shadow-[0_-10px_20px_rgba(0,0,0,0.02)]">
                        {/* Service POS Checkout Form - Match Sales Sidebar */}
                        <div className="space-y-3">
                          {/* Sales Employee Selection */}
                          <button
                            onClick={() => { setPinAction('changeSalesEmployee'); setIsPinModalOpen(true); }}
                            className="w-full flex items-center justify-between p-3 bg-blue-50 hover:bg-blue-100 rounded-2xl border border-blue-100 transition-all group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-200">
                                <User size={16} />
                              </div>
                              <div className="text-left">
                                <p className="text-[8px] text-blue-500 font-black uppercase tracking-[0.1em]">{t('salesEmployee')}</p>
                                <p className="text-xs font-black text-gray-900 uppercase">{salesEmployee ? salesEmployee.name : t('selectEmployee')}</p>
                              </div>
                            </div>
                            <ChevronRight size={16} className="text-blue-300 group-hover:translate-x-1 transition-transform" />
                          </button>

                          {/* Order Type Toggle */}
                          <div className="flex bg-gray-50 p-1 rounded-2xl border border-gray-100">
                            {['Walk-in', 'Takeaway'].map(type => (
                              <button
                                key={type}
                                onClick={() => setOrderType(type)}
                                className={`flex-1 py-2 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${orderType === type ? 'bg-white text-gray-900 shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
                              >
                                {t(type.toLowerCase()) || type}
                              </button>
                            ))}
                          </div>

                          {/* Customer Info */}
                          <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-blue-500 transition-colors" size={16} />
                            <input
                              className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-2xl text-xs font-bold focus:ring-2 focus:ring-blue-500 transition-all"
                              placeholder={t('customerNameOptional') || 'Customer Name'}
                              value={newSaleForm.customer}
                              onChange={e => setNewSaleForm({ ...newSaleForm, customer: e.target.value })}
                            />
                          </div>

                          {/* Payment Methods */}
                          <div className="grid grid-cols-3 gap-2">
                            {['Cash', 'Visa', 'Online'].map(method => (
                              <button
                                key={method}
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2 text-[10px] font-black uppercase tracking-widest rounded-xl border transition-all ${paymentMethod === method ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-200' : 'bg-gray-50 text-gray-400 border-gray-100 hover:border-gray-300'}`}
                              >
                                {method === 'Online' ? (t('digitalPayment') || 'Digital') : (t(method.toLowerCase()) || method)}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-4 border-t border-gray-50 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400 text-[9px] font-black uppercase tracking-[0.2em]">{t('subtotal')}</span>
                            <span className="text-sm font-black text-gray-400 font-mono">{formatCurrency(serviceCart.reduce((a, b) => a + (b.sellPrice * b.quantity), 0))}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]">{t('totalCost')}</span>
                            <span className="text-3xl font-black text-gray-900 font-mono tracking-tighter">{formatCurrency(serviceCart.reduce((a, b) => a + (b.sellPrice * b.quantity), 0))}</span>
                          </div>
                        </div>
                        
                        <div className="pt-2">
                          <button 
                            onClick={() => {
                              if (serviceCart.length > 0) {
                                const mode = prompt('Enter 1 for Thermal, 2 for A4 PRO:', '1');
                                if (mode === '1') handleCheckoutServiceCart('Thermal');
                                else if (mode === '2') handleCheckoutServiceCart('A4');
                              }
                            }}
                            className="w-full bg-slate-900 hover:bg-black text-white py-5 rounded-[2.5rem] transition-all active:scale-95 shadow-xl shadow-slate-200 flex items-center justify-center gap-3 group"
                          >
                            <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                              <CheckCircle2 size={20} />
                            </div>
                            <div className="text-left">
                              <p className="text-[10px] font-black uppercase tracking-widest opacity-60 leading-none mb-1">{t('completePayment') || 'Complete Payment'}</p>
                              <p className="text-sm font-black uppercase tracking-tight">{t('checkout')}</p>
                            </div>
                          </button>
                          
                          <div className="grid grid-cols-2 gap-2 mt-2">
                             <button onClick={() => handleCheckoutServiceCart('Thermal')} className="py-2.5 bg-gray-50 hover:bg-white border border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-blue-600 transition-all flex items-center justify-center gap-2">
                               <Printer size={14} /> Thermal
                             </button>
                             <button onClick={() => handleCheckoutServiceCart('A4')} className="py-2.5 bg-gray-50 hover:bg-white border border-gray-100 rounded-2xl text-[9px] font-black uppercase tracking-widest text-slate-500 hover:text-indigo-600 transition-all flex items-center justify-center gap-2">
                               <FileText size={14} /> A4 PRO
                             </button>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                )}


                {/* Sub Tab: NEW TICKET */}
                {serviceSubTab === 'new' && (
                  <div className="bg-white rounded-3xl p-6 md:p-8 shadow-sm border border-gray-100 animate-in fade-in zoom-in-95 duration-700">
                    <h2 className="text-gray-900 text-2xl font-black uppercase tracking-tight mb-6">{t('createNewRepairTicket') || 'Create New Repair Ticket'}</h2>

                    <form onSubmit={async (e) => {
                      e.preventDefault();
                      try {
                        await addDoc(collection(db, 'serviceTickets'), {
                          ...serviceForm,
                          userId: user.uid,
                          createdAt: serverTimestamp(),
                          statusLogs: [{ status: 'Received', date: new Date().toISOString(), by: 'System' }]
                        });
                        setServiceForm({ customerName: '', customerPhone: '', deviceType: 'Mobile', brand: '', model: '', serialNo: '', issue: '', priority: 'Normal', technician: '', estimatedCost: '', status: 'Received' });
                        setServiceSubTab('active');
                      } catch (err) { console.error(err); }
                    }} className="space-y-6">

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-4">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('customerInfo') || 'Customer Info'}</label>
                          <div className="relative group">
                            <input
                              className="input-field"
                              placeholder={t('customerName') || 'Customer Name'}
                              value={serviceForm.customerName}
                              onChange={e => setServiceForm({ ...serviceForm, customerName: e.target.value })}
                              required
                            />
                            {serviceForm.customerName.length > 1 && serviceCustomers.filter(c => c.name.toLowerCase().includes(serviceForm.customerName.toLowerCase())).length > 0 && (
                              <div className="absolute top-full left-0 right-0 bg-white border border-gray-100 rounded-2xl shadow-xl z-50 mt-1 max-h-48 overflow-y-auto">
                                {serviceCustomers.filter(c => c.name.toLowerCase().includes(serviceForm.customerName.toLowerCase())).slice(0, 5).map(c => (
                                  <button
                                    key={c.id}
                                    type="button"
                                    onClick={() => setServiceForm({ ...serviceForm, customerName: c.name, customerPhone: c.phone })}
                                    className="w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-gray-50 flex flex-col"
                                  >
                                    <span className="text-sm font-bold text-gray-900">{c.name}</span>
                                    <span className="text-[10px] font-mono text-slate-400">{c.phone}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <input className="input-field" placeholder={t('phone') || 'Phone Number'} value={serviceForm.customerPhone} onChange={e => setServiceForm({ ...serviceForm, customerPhone: e.target.value })} required />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('deviceDetails') || 'Device Details'}</label>
                          <select className="input-field" value={serviceForm.deviceType} onChange={e => setServiceForm({ ...serviceForm, deviceType: e.target.value })}>
                            <option value="Mobile">{t('mobile') || 'Mobile Phone'}</option>
                            <option value="PC">{t('pc') || 'PC / Laptop'}</option>
                            <option value="Tablet">{t('tablet') || 'Tablet'}</option>
                            <option value="Console">{t('console') || 'Gaming Console'}</option>
                            <option value="Other">{t('other') || 'Other Electronics'}</option>
                          </select>
                          <div className="flex gap-2">
                            <input className="input-field flex-1" placeholder={t('brand') || 'Brand'} value={serviceForm.brand} onChange={e => setServiceForm({ ...serviceForm, brand: e.target.value })} required />
                            <input className="input-field flex-1" placeholder={t('model') || 'Model'} value={serviceForm.model} onChange={e => setServiceForm({ ...serviceForm, model: e.target.value })} required />
                          </div>
                          <input className="input-field shadow-none border-dashed bg-gray-50" placeholder={t('serialNo') || 'Serial / IMEI (Optional)'} value={serviceForm.serialNo} onChange={e => setServiceForm({ ...serviceForm, serialNo: e.target.value })} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('issueDescription') || 'Issue Description'}</label>
                        <textarea className="input-field min-h-[100px] resize-none" placeholder={t('describeIssue') || 'Describe the problem in detail...'} value={serviceForm.issue} onChange={e => setServiceForm({ ...serviceForm, issue: e.target.value })} required></textarea>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('priority') || 'Priority'}</label>
                          <select className="input-field text-blue-600 font-bold" value={serviceForm.priority} onChange={e => setServiceForm({ ...serviceForm, priority: e.target.value })}>
                            <option value="Low">{t('low')}</option>
                            <option value="Normal">{t('normal')}</option>
                            <option value="High">{t('high')} ⚡</option>
                            <option value="Urgent">{t('urgent')} 🔥</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('assignedTechnician') || 'Assigned Technician'}</label>
                          <select className="input-field" value={serviceForm.technician} onChange={e => setServiceForm({ ...serviceForm, technician: e.target.value })}>
                            <option value="">{t('unassigned')}</option>
                            {employees.filter(e => e.dept === 'IT' || e.dept === 'Service' || e.role?.toLowerCase().includes('tech')).map(emp => (
                              <option key={emp.id} value={emp.name}>{emp.name}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('estimatedCost') || 'Estimated Cost'} ({currency})</label>
                          <input type="number" className="input-field font-mono font-bold text-emerald-600" placeholder="0.00" value={serviceForm.estimatedCost} onChange={e => setServiceForm({ ...serviceForm, estimatedCost: e.target.value })} />
                        </div>
                      </div>

                      <div className="pt-4 border-t border-gray-100 flex justify-end">
                        <button type="submit" className="px-8 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                          <Save size={18} /> {t('createTicket') || 'Create Repair Ticket'}
                        </button>
                      </div>
                    </form>
                  </div>
                )}

                {/* Sub Tab: ACTIVE JOBS */}
                {serviceSubTab === 'active' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                      <div className="flex bg-gray-100 p-1 rounded-xl w-full md:w-auto overflow-x-auto">
                        {['All', 'Received', 'In Progress', 'Waiting for Parts', 'Ready', 'Delivered'].map(stat => {
                          const labelMap = { 'All': t('filterAll'), 'Received': t('received'), 'In Progress': t('inProgress'), 'Waiting for Parts': t('waitingParts'), 'Ready': t('readyPickup'), 'Delivered': t('delivered') };
                          return (
                            <button
                              key={stat}
                              onClick={() => setServiceStatusFilter(stat === 'All' ? '' : stat)}
                              className={`px-4 py-2 text-[10px] font-black uppercase tracking-widest rounded-lg flex-1 md:flex-none whitespace-nowrap transition-all ${serviceStatusFilter === (stat === 'All' ? '' : stat) ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-800'}`}
                            >
                              {labelMap[stat] || stat}
                            </button>
                          );
                        })}
                      </div>
                      <div className="relative w-full md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                          type="text"
                          placeholder={t('searchTickets') || 'Search customer/device...'}
                          className="w-full pl-9 pr-4 py-2 bg-gray-50 border-none rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 transition-all"
                          value={serviceSearch}
                          onChange={e => setServiceSearch(e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {serviceTickets
                        .filter(t => t.status !== 'Delivered')
                        .filter(t => !serviceStatusFilter || t.status === serviceStatusFilter)
                        .filter(t => !serviceSearch || t.customerName.toLowerCase().includes(serviceSearch.toLowerCase()) || t.brand?.toLowerCase().includes(serviceSearch.toLowerCase()) || t.model?.toLowerCase().includes(serviceSearch.toLowerCase()))
                        .map(ticket => (
                          <div key={ticket.id} className="bg-white rounded-3xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-all flex flex-col group relative overflow-hidden">
                            {ticket.priority === 'Urgent' && <div className="absolute top-0 inset-x-0 h-1 bg-red-500"></div>}
                            {ticket.priority === 'High' && <div className="absolute top-0 inset-x-0 h-1 bg-orange-400"></div>}

                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.15em] font-mono">#{ticket.id.slice(0, 6)}</span>
                                <h3 className="font-bold text-gray-900 leading-tight mt-1">{ticket.customerName}</h3>
                                <p className="text-xs text-blue-500 font-bold mt-0.5">{ticket.customerPhone}</p>
                              </div>
                              <span className={`px-2.5 py-1 rounded-md text-[9px] font-black uppercase tracking-widest shrink-0 ${ticket.status === 'Ready' || ticket.status === 'Delivered' ? 'bg-emerald-100 text-emerald-700 shadow-sm shadow-emerald-50' :
                                ticket.status === 'In Progress' || ticket.status === 'Waiting for Parts' ? 'bg-amber-100 text-amber-700 shadow-sm shadow-amber-50' :
                                  'bg-rose-100 text-rose-700 shadow-sm shadow-rose-50'
                                }`}>
                                {t(ticket.status.toLowerCase().replace(/ /g, '')) || ticket.status}
                              </span>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-3 mb-4 flex-1 border border-slate-100">
                              <div className="flex items-center gap-2 mb-2">
                                {ticket.deviceType === 'Mobile' ? <Smartphone size={16} className="text-slate-400" /> :
                                  ticket.deviceType === 'PC' || ticket.deviceType === 'Tablet' ? <Laptop size={16} className="text-slate-400" /> :
                                    <Database size={16} className="text-slate-400" />}
                                <p className="text-sm font-bold text-slate-700">{ticket.brand} {ticket.model}</p>
                              </div>
                              <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{ticket.issue}</p>
                              {ticket.photos && ticket.photos.length > 0 && (
                                <div className="mt-2 flex gap-1 overflow-x-auto pb-1">
                                  {ticket.photos.map((url, i) => (
                                    <img key={i} src={url} alt="" className="w-8 h-8 rounded-lg object-cover border border-white shadow-sm" />
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="pt-3 border-t border-gray-50 flex items-center justify-between">
                              <div className="flex flex-col">
                                <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('technician') || 'Tech'}</span>
                                <span className="text-xs font-bold text-gray-900 truncate max-w-[100px]">{ticket.technician || '-'}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {ticket.estimatedCost && <span className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(ticket.estimatedCost)}</span>}
                                <button
                                  onClick={() => { setEditingTicket(ticket); setIsTicketModalOpen(true); }}
                                  className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
                                >
                                  <ChevronRight size={16} />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}

                      {serviceTickets.filter(t => t.status !== 'Delivered' && (!serviceStatusFilter || t.status === serviceStatusFilter)).length === 0 && (
                        <div className="col-span-full py-20 flex flex-col items-center justify-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
                          <CheckSquare size={48} className="text-gray-300 mb-4" />
                          <h3 className="text-lg font-black text-gray-400 uppercase tracking-widest">{t('noActiveJobs') || 'No Active Repair Jobs'}</h3>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Sub Tab: CUSTOMERS */}
                {serviceSubTab === 'customers' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <div className="relative flex-1 max-w-lg">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder={t('search') || 'Search customers by name or phone...'}
                          className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
                          onChange={e => setServiceSearch(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => { setSelectedServiceCustomer(null); setIsCustomerModalOpen(true); }}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
                      >
                        <UserPlus size={18} /> {t('addCustomer')}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {serviceCustomers
                        .filter(c => !serviceSearch || (c.name?.toLowerCase().includes(serviceSearch.toLowerCase())) || (c.phone?.includes(serviceSearch)))
                        .map(customer => (
                          <div key={customer.id} className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
                            <div className="flex justify-between items-start mb-4">
                              <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 font-black text-lg uppercase">
                                {customer.name?.slice(0, 1)}
                              </div>
                              <div className="flex gap-2">
                                <button onClick={() => { setSelectedServiceCustomer(customer); setServiceCustomerForm(customer); setIsCustomerModalOpen(true); }} className="p-2 text-slate-300 hover:text-blue-600 transition-colors"><Edit size={16} /></button>
                                <button onClick={async () => {
                                  if (window.confirm('Delete this customer?')) {
                                    await deleteDoc(doc(db, 'serviceCustomers', customer.id));
                                  }
                                }} className="p-2 text-slate-300 hover:text-rose-600 transition-colors"><Trash2 size={16} /></button>
                              </div>
                            </div>
                            <h3 className="text-lg font-black text-gray-900 tracking-tight">{customer.name}</h3>
                            <div className="space-y-2 mt-4">
                              <div className="flex items-center gap-3 text-gray-500">
                                <Phone size={14} /> <span className="text-xs font-bold">{customer.phone}</span>
                              </div>
                              {customer.email && (
                                <div className="flex items-center gap-3 text-gray-500">
                                  <Mail size={14} /> <span className="text-xs font-bold truncate">{customer.email}</span>
                                </div>
                              )}
                              {customer.address && (
                                <div className="flex items-center gap-3 text-gray-500">
                                  <MapPin size={14} /> <span className="text-xs font-bold truncate">{customer.address}</span>
                                </div>
                              )}
                            </div>
                            <div className="mt-6 pt-6 border-t border-gray-50 flex justify-between items-center">
                              <div className="text-[10px] font-black uppercase text-gray-400 tracking-widest">
                                {serviceTickets.filter(t => t.customerPhone === customer.phone).length} {t('repairHistory')}
                              </div>
                              <button onClick={() => { setServiceForm({ ...serviceForm, customerName: customer.name, customerPhone: customer.phone }); setServiceSubTab('new'); }} className="text-[10px] font-black uppercase text-blue-600 hover:underline">
                                {t('newTicket')}
                              </button>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: INVENTORY */}
                {serviceSubTab === 'inventory' && (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-700">
                    <div className="flex flex-col md:flex-row gap-4 items-center justify-between bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm">
                      <div className="relative flex-1 max-w-lg">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <input
                          type="text"
                          placeholder={t('searchInventory') || 'Search spare parts...'}
                          className="w-full pl-12 pr-6 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold focus:ring-4 focus:ring-blue-500/10 transition-all"
                          onChange={e => setServiceSearch(e.target.value)}
                        />
                      </div>
                      <button
                        onClick={() => setIsServiceInventoryModalOpen(true)}
                        className="px-8 py-4 bg-slate-900 text-white rounded-2xl hover:bg-black font-black uppercase tracking-widest text-[10px] shadow-lg shadow-slate-200 transition-all flex items-center gap-2"
                      >
                        <Plus size={18} /> {t('addInventoryItem')}
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {inventory
                        .filter(i => !serviceSearch || i.name?.toLowerCase().includes(serviceSearch.toLowerCase()))
                        .map(item => (
                          <div key={item.id} className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col group relative">
                            {item.quantity <= (item.minStock || 5) && <div className="absolute top-2 right-2 w-2 h-2 bg-rose-500 rounded-full animate-pulse shadow-sm shadow-rose-200"></div>}
                            <div className="flex justify-between items-start mb-4">
                              <div className="p-3 bg-slate-50 rounded-2xl text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                                <Package size={20} />
                              </div>
                            </div>
                            <h4 className="text-xs font-black uppercase text-gray-900 tracking-tight line-clamp-2 min-h-[32px]">{item.name}</h4>
                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1 mb-4">{item.category || 'Part'}</p>

                            <div className="mt-auto space-y-3">
                              <div className="flex justify-between items-end">
                                <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{t('sellPrice')}</div>
                                <div className="text-sm font-black text-blue-600 font-mono">{formatCurrency(item.sellPrice)}</div>
                              </div>
                              <div className="flex justify-between items-center bg-slate-50 p-2 rounded-xl border border-slate-100/50">
                                <span className={`text-[9px] font-black uppercase tracking-widest ${item.quantity <= (item.minStock || 5) ? 'text-rose-500' : 'text-slate-400'}`}>{t('units')}</span>
                                <span className="text-xs font-black tabular-nums">{item.quantity}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Sub Tab: HISTORY */}
                {serviceSubTab === 'history' && (
                  <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 animate-in fade-in zoom-in-95 duration-700">
                    <div className="flex justify-between items-end mb-6">
                      <h2 className="text-gray-900 text-2xl font-black uppercase tracking-tight">{t('serviceHistory') || 'Repair History'}</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead>
                          <tr className="border-b-2 border-slate-100">
                            <th className="py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest pl-4">ID</th>
                            <th className="py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{t('date')}</th>
                            <th className="py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{t('customer')}</th>
                            <th className="py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{t('device')}</th>
                            <th className="py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest">{t('status')}</th>
                            <th className="py-4 font-black text-[10px] text-slate-400 uppercase tracking-widest text-right pr-4">{t('cost')}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {serviceTickets.filter(t => t.status === 'Delivered').sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds).map(ticket => (
                            <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="py-4 pl-4 font-mono text-xs font-bold text-slate-400">#{ticket.id.slice(0, 6)}</td>
                              <td className="py-4 text-xs font-medium text-slate-600">{ticket.createdAt?.seconds ? new Date(ticket.createdAt.seconds * 1000).toLocaleDateString() : '-'}</td>
                              <td className="py-4 font-bold text-sm text-gray-900">{ticket.customerName}</td>
                              <td className="py-4 text-sm font-medium text-slate-700">{ticket.brand} {ticket.model}</td>
                              <td className="py-4">
                                <span className={`px-2 py-1 rounded-md text-[10px] font-black uppercase tracking-widest ${ticket.status === 'Delivered' || ticket.status === 'Ready' ? 'bg-emerald-50 text-emerald-600' :
                                  'bg-slate-100 text-slate-600'
                                  }`}>{ticket.status}</span>
                              </td>
                              <td className="py-4 pr-4 text-right font-mono font-black text-gray-900">{formatCurrency(ticket.estimatedCost || 0)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Sub Tab: REPORTS */}
                {serviceSubTab === 'reports' && (
                  <div className="space-y-8 animate-in fade-in zoom-in-95 duration-700">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {/* Revenue Summary */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h3 className="text-gray-900 text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                          <CreditCard className="text-blue-600" size={20} /> {t('monthlyServiceRevenue')}
                        </h3>
                        <div className="space-y-4">
                          {[
                            { label: t('totalRevenue') || 'Total Revenue', value: formatCurrency(serviceTickets.reduce((acc, curr) => acc + Number(curr.estimatedCost || 0), 0)), color: 'text-blue-600' },
                            { label: t('collected') || 'Collected', value: formatCurrency(serviceTickets.filter(t => t.paymentStatus === 'Paid').reduce((acc, curr) => acc + Number(curr.estimatedCost || 0), 0)), color: 'text-emerald-600' },
                            { label: t('unpaid') || 'Unpaid', value: formatCurrency(serviceTickets.filter(t => t.paymentStatus === 'Unpaid').reduce((acc, curr) => acc + Number(curr.estimatedCost || 0), 0)), color: 'text-rose-600' }
                          ].map((stat, i) => (
                            <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</span>
                              <span className={`text-sm font-black mono ${stat.color}`}>{stat.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Top Brands */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h3 className="text-gray-900 text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                          <Smartphone className="text-orange-600" size={20} /> {t('topRepairs')}
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(serviceTickets.reduce((acc, t) => {
                            acc[t.brand] = (acc[t.brand] || 0) + 1;
                            return acc;
                          }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([brand, count], i) => (
                            <div key={i} className="flex justify-between items-center group">
                              <span className="text-xs font-bold text-slate-600">{brand || 'Unknown'}</span>
                              <div className="flex items-center gap-3">
                                <div className="h-1 bg-blue-100 rounded-full w-24 overflow-hidden">
                                  <div className="h-full bg-blue-500 rounded-full transition-all duration-1000" style={{ width: `${(count / (serviceTickets.length || 1)) * 100}%` }}></div>
                                </div>
                                <span className="text-xs font-black text-slate-900">{count}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Tech Performance */}
                      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <h3 className="text-gray-900 text-lg font-black uppercase tracking-tight mb-6 flex items-center gap-2">
                          <User className="text-indigo-600" size={20} /> {t('technicianRevenue')}
                        </h3>
                        <div className="space-y-3">
                          {Object.entries(serviceTickets.reduce((acc, t) => {
                            if (t.technician) {
                              acc[t.technician] = (acc[t.technician] || 0) + Number(t.estimatedCost || 0);
                            }
                            return acc;
                          }, {})).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([tech, revenue], i) => (
                            <div key={i} className="flex justify-between items-center">
                              <span className="text-xs font-bold text-slate-600">{tech}</span>
                              <span className="text-xs font-black text-emerald-600 font-mono">{formatCurrency(revenue)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          }
        </div>
      </main>

      {/* --- Modals --- */}

      {/* Service / Repair Ticket Edit Modal */}
      {
        isTicketModalOpen && editingTicket && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20 flex flex-col max-h-[90vh]">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 shrink-0">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{t('editTicket') || 'Edit Repair Ticket'} <span className="text-sm font-mono text-gray-400 ml-2">#{editingTicket.id.slice(0, 6)}</span></h3>
                </div>
                <button onClick={() => { setIsTicketModalOpen(false); setEditingTicket(null); }} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>

              <div className="p-6 overflow-y-auto flex-1 space-y-6">
                {/* Customer Details Head */}
                <div className="flex justify-between items-start bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                  <div>
                    <h4 className="font-bold text-lg text-gray-900 leading-tight">{editingTicket.customerName}</h4>
                    <p className="text-sm text-blue-600 font-bold mt-1">{editingTicket.customerPhone}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-700">{editingTicket.brand} {editingTicket.model}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-1">{editingTicket.serialNo || 'N/A'}</p>
                  </div>
                </div>

                {/* Status & Assignment */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('status')}</label>
                    <select className="input-field font-bold" value={editingTicket.status} onChange={e => setEditingTicket({ ...editingTicket, status: e.target.value })}>
                      <option value="Received">{t('received')}</option>
                      <option value="In Progress">{t('inProgress')}</option>
                      <option value="Waiting for Parts">{t('waitingParts')}</option>
                      <option value="Ready">{t('readyPickup')}</option>
                      <option value="Delivered">{t('delivered')} ({t('closed') || 'Closed'})</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('assignedTechnician') || 'Technician'}</label>
                    <select className="input-field" value={editingTicket.technician || ''} onChange={e => setEditingTicket({ ...editingTicket, technician: e.target.value })}>
                      <option value="">{t('unassigned') || 'Unassigned'}</option>
                      {employees.filter(e => e.dept === 'IT' || e.dept === 'Service' || e.role?.toLowerCase().includes('tech')).map(emp => (
                        <option key={emp.id} value={emp.name}>{emp.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('issueDescription') || 'Issue'}</label>
                  <textarea className="input-field min-h-[80px] text-sm text-gray-700 bg-gray-50" value={editingTicket.issue} onChange={e => setEditingTicket({ ...editingTicket, issue: e.target.value })}></textarea>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('priority') || 'Priority'}</label>
                    <select className="input-field" value={editingTicket.priority} onChange={e => setEditingTicket({ ...editingTicket, priority: e.target.value })}>
                      <option value="Low">Low</option>
                      <option value="Normal">Normal</option>
                      <option value="High">High ⚡</option>
                      <option value="Urgent">Urgent 🔥</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('estimatedCost') || 'Grand Total Cost (Service + Parts)'} ({currency})</label>
                    <input type="number" className="input-field font-mono font-bold text-emerald-600" value={editingTicket.estimatedCost} onChange={e => setEditingTicket({ ...editingTicket, estimatedCost: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('paymentStatus') || 'Payment Status'}</label>
                    <select className="input-field" value={editingTicket.paymentStatus || 'Unpaid'} onChange={e => setEditingTicket({ ...editingTicket, paymentStatus: e.target.value })}>
                      <option value="Unpaid">{t('unpaid')}</option>
                      <option value="Partial">{t('partial')}</option>
                      <option value="Paid">{t('paid')}</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('paymentMethod') || 'Payment Method'}</label>
                    <select className="input-field" value={editingTicket.paymentMethod || 'Cash'} onChange={e => setEditingTicket({ ...editingTicket, paymentMethod: e.target.value })}>
                      <option value="Cash">{t('cash')}</option>
                      <option value="Card">{t('creditCard')}</option>
                      <option value="Digital Wallet">Digital Wallet (Vodafone/Instapay)</option>
                    </select>
                  </div>
                </div>

                  <div className="space-y-3 bg-gray-50 p-4 rounded-2xl border border-gray-100">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex justify-between items-center">
                      {t('partsUsed') || 'Spare Parts Used'}
                    </label>
                    <div className="relative">
                      <div className="flex gap-2">
                        <input 
                          type="text" 
                          id="part-search-input"
                          placeholder={t('searchInventory') || "Search parts..."}
                          className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-xs font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          autoComplete="off"
                          onChange={(e) => {
                            const val = e.target.value.toLowerCase();
                            const results = val ? inventory.filter(i => (i.name?.toLowerCase().includes(val) || i.barcode?.includes(val)) && i.quantity > 0).slice(0, 5) : [];
                            setPartSearchResults(results);
                          }}
                        />
                        <button 
                          type="button" 
                          onClick={() => {
                            const val = document.getElementById('part-search-input').value;
                            if (!val) return;
                            const price = prompt(`Enter price for ${val}:`);
                            if (price) {
                              setEditingTicket({ ...editingTicket, partsUsed: [...(editingTicket.partsUsed || []), { id: 'man-'+Date.now(), name: val, price: Number(price), quantity: 1, fromInventory: false }] });
                              document.getElementById('part-search-input').value = '';
                              setPartSearchResults([]);
                            }
                          }}
                          className="bg-slate-900 text-white px-4 rounded-lg text-[10px] font-black uppercase tracking-widest"
                        >
                          Manual
                        </button>
                      </div>

                      {/* Search Results Dropdown */}
                      {partSearchResults.length > 0 && (
                        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-xl z-[210] mt-1 overflow-hidden">
                          {partSearchResults.map(item => (
                            <button
                              key={item.id}
                              type="button"
                              onClick={() => {
                                setEditingTicket({ ...editingTicket, partsUsed: [...(editingTicket.partsUsed || []), { id: item.id, name: item.name, price: item.sellPrice, quantity: 1, fromInventory: true }] });
                                document.getElementById('part-search-input').value = '';
                                setPartSearchResults([]);
                              }}
                              className="w-full text-left p-3 hover:bg-blue-50 border-b border-gray-50 flex justify-between items-center group transition-colors"
                            >
                              <div>
                                <p className="text-xs font-bold text-gray-900">{item.name}</p>
                                <p className="text-[10px] text-slate-400 font-mono">{item.barcode || 'NO BARCODE'}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-xs font-black text-blue-600">{formatCurrency(item.sellPrice)}</p>
                                <p className="text-[9px] font-bold text-slate-400 capitalize">{item.quantity} in stock</p>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      {(editingTicket.partsUsed || []).map((part, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white p-2 rounded-lg border border-gray-100 text-xs">
                          <span className="font-bold text-gray-700">{part.name}</span>
                          <div className="flex items-center gap-3">
                            <span className="text-blue-600 font-mono">{formatCurrency(part.price)}</span>
                            <button
                              onClick={() => setEditingTicket({ ...editingTicket, partsUsed: editingTicket.partsUsed.filter((_, i) => i !== idx) })}
                              className="text-rose-400 hover:text-rose-600"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        </div>
                      ))}
                      {(editingTicket.partsUsed || []).length > 0 && (
                        <div className="flex justify-between items-center px-2 py-1 bg-emerald-50 rounded-lg text-[10px] font-bold text-emerald-700 border border-emerald-100 mb-2">
                          <span>Parts Total:</span>
                          <span>{formatCurrency((editingTicket.partsUsed || []).reduce((s, p) => s + (Number(p.price) * (p.quantity || 1)), 0))}</span>
                        </div>
                      )}
                      {(editingTicket.partsUsed || []).length === 0 && <p className="text-[10px] text-gray-400 italic text-center py-2">No spare parts used yet</p>}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest">{t('internalNotes') || 'Internal Technician Notes'}</label>
                    <textarea className="input-field min-h-[60px] text-xs bg-slate-50 border-dashed" placeholder="Diagnoses details, parts used, etc..." value={editingTicket.notes || ''} onChange={e => setEditingTicket({ ...editingTicket, notes: e.target.value })}></textarea>
                  </div>

                <div className="space-y-3">
                  <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest flex justify-between items-center">
                    {t('attachPhotos') || 'Device Photos'}
                    {photoUploading && <Loader2 size={12} className="animate-spin text-blue-600" />}
                  </label>
                  <div className="flex flex-wrap gap-4">
                    <label className="w-20 h-20 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-blue-600 hover:border-blue-200 transition-all cursor-pointer bg-gray-50">
                      <Camera size={20} />
                      <span className="text-[8px] font-black uppercase mt-1">{t('add')}</span>
                      <input type="file" className="hidden" accept="image/*" onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const url = await handleUploadRepairPhoto(file, editingTicket.id);
                          if (url) {
                            setEditingTicket({ ...editingTicket, photos: [...(editingTicket.photos || []), url] });
                          }
                        }
                      }} />
                    </label>
                    {(editingTicket.photos || []).map((url, i) => (
                      <div key={i} className="relative w-20 h-20 rounded-2xl overflow-hidden group">
                        <img src={url} alt="" className="w-full h-full object-cover" />
                        <button onClick={() => setEditingTicket({ ...editingTicket, photos: editingTicket.photos.filter((_, idx) => idx !== i) })} className="absolute inset-0 bg-rose-600/60 text-white opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

              <div className="p-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 shrink-0">
                <div className="flex gap-2">
                  {editingTicket.status === 'Delivered' && (
                    <button onClick={async () => {
                      if (window.confirm('Delete this ticket entirely?')) {
                        await deleteDoc(doc(db, 'serviceTickets', editingTicket.id));
                        setIsTicketModalOpen(false); setEditingTicket(null);
                      }
                    }} className="px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg text-sm font-bold flex items-center gap-2">
                      <Trash2 size={16} />
                    </button>
                  )}
                  <button onClick={() => {
                    // Send everything to Service POS cart
                    const laborPrice = Number(editingTicket.estimatedCost) - (editingTicket.partsUsed || []).reduce((s, p) => s + (Number(p.price) * (p.quantity || 1)), 0);
                    const repairItems = [
                      { id: 'SRV-'+editingTicket.id + '-LB', name: `Repair Labor: ${editingTicket.brand} ${editingTicket.model} (${editingTicket.id.slice(0, 6)})`, sellPrice: laborPrice, quantity: 1, type: 'service' },
                      ...(editingTicket.partsUsed || []).map(p => ({ id: p.id || 'man-'+Date.now(), name: `Part: ${p.name}`, sellPrice: p.price, quantity: p.quantity, type: 'part' }))
                    ];
                    setServiceCart([...serviceCart, ...repairItems]);
                    setServiceSubTab('sell');
                    setIsTicketModalOpen(false);
                    setEditingTicket(null);
                  }} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 font-black uppercase tracking-widest text-[10px] transition-all shadow-lg flex items-center gap-2">
                    <ShoppingCart size={16} /> {t('billToPOS') || 'Bill to Service Cart'}
                  </button>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => { setIsTicketModalOpen(false); setEditingTicket(null); }} className="px-4 py-2.5 bg-white text-gray-700 rounded-xl hover:bg-gray-100 font-bold border border-gray-200 text-xs transition-all">{t('cancel')}</button>
                  <button onClick={async () => {
                    try {
                      // Update the status log if the status changed
                      const origTicket = serviceTickets.find(t => t.id === editingTicket.id);
                      let newLogs = editingTicket.statusLogs || [];
                      if (origTicket && origTicket.status !== editingTicket.status) {
                        newLogs = [...newLogs, { status: editingTicket.status, date: new Date().toISOString(), by: user.email || 'System' }];

                        // Deduct parts if delivered
                        if (editingTicket.status === 'Delivered' && origTicket.status !== 'Delivered') {
                          const batch = writeBatch(db);
                          (editingTicket.partsUsed || []).forEach(part => {
                            const invRef = doc(db, 'inventory', part.id);
                            const currentInv = inventory.find(i => i.id === part.id);
                            if (currentInv) {
                              batch.update(invRef, { quantity: Number(currentInv.quantity) - (part.quantity || 1) });
                            }
                          });
                          await batch.commit();
                        }
                      }
                      await updateDoc(doc(db, 'serviceTickets', editingTicket.id), { ...editingTicket, statusLogs: newLogs });
                      setIsTicketModalOpen(false); setEditingTicket(null);
                    } catch (err) { console.error(err); }
                  }} className="px-8 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center gap-2">
                    <Save size={18} /> {t('saveChanges')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* --- Service Customer Modal --- */}
      {isCustomerModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                  <UserPlus size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{selectedServiceCustomer ? t('editCustomer') : t('addCustomer')}</h3>
                </div>
              </div>
              <button onClick={() => { setIsCustomerModalOpen(false); setSelectedServiceCustomer(null); setServiceCustomerForm({ name: '', phone: '', email: '', address: '', notes: '' }); }} className="p-2 text-slate-300 hover:text-rose-600 transition-all active:scale-95"><X size={24} /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (selectedServiceCustomer) {
                  await updateDoc(doc(db, 'serviceCustomers', selectedServiceCustomer.id), serviceCustomerForm);
                } else {
                  await addDoc(collection(db, 'serviceCustomers'), { ...serviceCustomerForm, userId: user.uid, createdAt: serverTimestamp() });
                }
                setIsCustomerModalOpen(false);
                setSelectedServiceCustomer(null);
                setServiceCustomerForm({ name: '', phone: '', email: '', address: '', notes: '' });
              } catch (err) { console.error(err); }
            }} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('customerName')}</label>
                <input type="text" className="input-field" value={serviceCustomerForm.name} onChange={e => setServiceCustomerForm({ ...serviceCustomerForm, name: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('phone')}</label>
                <input type="text" className="input-field" value={serviceCustomerForm.phone} onChange={e => setServiceCustomerForm({ ...serviceCustomerForm, phone: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('email')}</label>
                <input type="email" className="input-field" value={serviceCustomerForm.email} onChange={e => setServiceCustomerForm({ ...serviceCustomerForm, email: e.target.value })} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('address')}</label>
                <textarea className="input-field min-h-[60px]" value={serviceCustomerForm.address} onChange={e => setServiceCustomerForm({ ...serviceCustomerForm, address: e.target.value })}></textarea>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mt-4">
                <Save size={18} /> {selectedServiceCustomer ? t('saveChanges') : t('addCustomer')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* --- Service Inventory Modal --- */}
      {isServiceInventoryModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col p-8">
            <div className="flex justify-between items-center mb-8">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600">
                  <Package size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{editingServiceInventory ? t('editItem') : t('addStock')}</h3>
                </div>
              </div>
              <button onClick={() => { setIsServiceInventoryModalOpen(false); setEditingServiceInventory(null); setServiceInventoryForm({ name: '', category: 'Phone Parts', stock: 0, minStock: 5, buyPrice: 0, sellPrice: 0 }); }} className="p-2 text-slate-300 hover:text-rose-600 transition-all active:scale-95"><X size={24} /></button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const finalData = { 
                  ...serviceInventoryForm, 
                  quantity: Number(serviceInventoryForm.stock),
                  updatedAt: serverTimestamp()
                };
                delete finalData.stock; // Use quantity instead of stock for main inventory compatibility

                if (editingServiceInventory) {
                  await updateDoc(doc(db, 'inventory', editingServiceInventory.id), finalData);
                } else {
                  await addDoc(collection(db, 'inventory'), { ...finalData, userId: user.uid, createdAt: serverTimestamp() });
                }
                setIsServiceInventoryModalOpen(false);
                setEditingServiceInventory(null);
                setServiceInventoryForm({ name: '', category: 'Phone Parts', stock: 0, minStock: 5, buyPrice: 0, sellPrice: 0 });
              } catch (err) { console.error(err); }
            }} className="space-y-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('itemName')}</label>
                <input type="text" className="input-field" value={serviceInventoryForm.name} onChange={e => setServiceInventoryForm({ ...serviceInventoryForm, name: e.target.value })} required />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('category')}</label>
                <select className="input-field" value={serviceInventoryForm.category} onChange={e => setServiceInventoryForm({ ...serviceInventoryForm, category: e.target.value })}>
                  <option value="Phone Parts">{t('phoneParts')}</option>
                  <option value="PC Components">{t('pcComponents')}</option>
                  <option value="Accessories">{t('accessories')}</option>
                  <option value="Other">{t('other')}</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('quantity')}</label>
                  <input type="number" className="input-field font-mono" value={serviceInventoryForm.stock} onChange={e => setServiceInventoryForm({ ...serviceInventoryForm, stock: Number(e.target.value) })} required />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('minStock')}</label>
                  <input type="number" className="input-field font-mono" value={serviceInventoryForm.minStock} onChange={e => setServiceInventoryForm({ ...serviceInventoryForm, minStock: Number(e.target.value) })} required />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('buyPrice')}</label>
                  <input type="number" step="0.01" className="input-field font-mono" value={serviceInventoryForm.buyPrice} onChange={e => setServiceInventoryForm({ ...serviceInventoryForm, buyPrice: Number(e.target.value) })} />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('sellPrice')}</label>
                  <input type="number" step="0.01" className="input-field font-mono" value={serviceInventoryForm.sellPrice} onChange={e => setServiceInventoryForm({ ...serviceInventoryForm, sellPrice: Number(e.target.value) })} required />
                </div>
              </div>
              <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mt-4">
                <Save size={18} /> {editingServiceInventory ? t('saveChanges') : t('addStock')}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Barcode Print Configuration Modal */}
      {
        isPrintBarcodeModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[200] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('printWizard')}</h3>
                <button onClick={() => setIsPrintBarcodeModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="max-h-[50vh] overflow-y-auto space-y-2 pr-2">
                  {printConfigs.map((cfg, idx) => (
                    <div key={cfg.item.id} className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                      <div className="w-12 h-12 bg-white rounded-lg flex items-center justify-center border border-gray-200 overflow-hidden">
                        {cfg.item.photo ? <img src={cfg.item.photo} alt="" className="w-full h-full object-cover" /> : <Package size={20} className="text-gray-300" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm text-gray-900 truncate">{cfg.item.name}</p>
                        <p className="text-[10px] font-mono text-gray-400">{cfg.item.barcode || t('noBarcode') || 'No Barcode'}</p>
                      </div>
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                        <button
                          type="button"
                          onClick={() => {
                            const newConfigs = [...printConfigs];
                            newConfigs[idx].qty = Math.max(0, (newConfigs[idx].qty || 0) - 1);
                            setPrintConfigs(newConfigs);
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500"
                        >
                          <ChevronDown size={14} />
                        </button>
                        <input
                          type="number"
                          className="w-12 text-center text-sm font-bold bg-transparent outline-none"
                          value={cfg.qty}
                          onChange={(e) => {
                            const newConfigs = [...printConfigs];
                            newConfigs[idx].qty = parseInt(e.target.value) || 0;
                            setPrintConfigs(newConfigs);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const newConfigs = [...printConfigs];
                            newConfigs[idx].qty = (newConfigs[idx].qty || 0) + 1;
                            setPrintConfigs(newConfigs);
                          }}
                          className="p-1 hover:bg-gray-100 rounded text-gray-500"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-600 text-white rounded-lg">
                      <Printer size={20} />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{t('totalLabels')}</p>
                      <p className="text-xl font-black text-blue-900">{printConfigs.reduce((sum, c) => sum + (c.qty || 0), 0)}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <p className="text-[10px] font-black uppercase text-blue-600 tracking-widest">{t('layoutMode')}</p>
                    <p className="text-sm font-bold text-blue-900 uppercase">{t(barcodePrintMode.toLowerCase()) || barcodePrintMode}</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setIsPrintBarcodeModalOpen(false)}
                    className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <button
                    onClick={() => {
                      handlePrintBatchBarcodes(printConfigs);
                      setIsPrintBarcodeModalOpen(false);
                    }}
                    className="flex-1 px-4 py-3 bg-slate-900 text-white rounded-xl hover:bg-black font-bold shadow-lg shadow-slate-900/20 transition-all flex items-center justify-center gap-2"
                  >
                    <Printer size={20} /> {t('printNow')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Employee Modal (Premium) */}
      {
        isAddModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[120] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
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

                <div className="grid grid-cols-2 gap-4">
                  <input type="number" className="input-field" placeholder={t('salary')} value={newEmployeeForm.salary} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, salary: Number(e.target.value) })} required />
                  <select className="p-2 border rounded-xl text-xs font-bold bg-white" value={newEmployeeForm.salaryMethod || 'Monthly'} onChange={e => setNewEmployeeForm({ ...newEmployeeForm, salaryMethod: e.target.value })}>
                    <option value="Monthly">{t('monthly')}</option>
                    <option value="Weekly">{t('weekly')}</option>
                    <option value="Daily">{t('daily')}</option>
                    <option value="Hourly">Hourly</option>
                  </select>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsAddModalOpen(false)} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">{t('addEmployee')}</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Site Modal (Premium) */}
      {
        isAddSiteModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[120] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2rem] w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('createLocation')}</h3>
                <button onClick={() => setIsAddSiteModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddSite} className="p-6 space-y-4">
                <input className="input-field" placeholder={t('siteName')} value={newSiteForm.name} onChange={e => setNewSiteForm({ ...newSiteForm, name: e.target.value })} required />
                <input className="input-field" placeholder={t('city')} value={newSiteForm.city} onChange={e => setNewSiteForm({ ...newSiteForm, city: e.target.value })} required />
                <input className="input-field" placeholder={t('manager')} value={newSiteForm.manager} onChange={e => setNewSiteForm({ ...newSiteForm, manager: e.target.value })} />
                <input className="input-field" placeholder={t('shopAddress') || 'Address'} value={newSiteForm.address || ''} onChange={e => setNewSiteForm({ ...newSiteForm, address: e.target.value })} />
                <input className="input-field" placeholder={t('phone') || 'Phone'} value={newSiteForm.phone || ''} onChange={e => setNewSiteForm({ ...newSiteForm, phone: e.target.value })} />

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
                    <span className="text-sm font-medium text-slate-500">{t(selectedEmployee.role.toLowerCase()) || selectedEmployee.role}</span>
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

                    {/* Month Period Indicator */}
                    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-600 rounded-lg p-3 flex items-center gap-3 shadow-sm mb-4">
                      <div className="bg-blue-600 p-2 rounded-lg">
                        <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <div className="text-xs text-blue-600 font-semibold uppercase tracking-wide">{t('payPeriod')}</div>
                        <div className="text-sm font-bold text-gray-900 mt-0.5">
                          {new Date(employeeMonthFilter + '-01').toLocaleDateString(language === 'ar' ? 'ar-EG' : language === 'hi' ? 'hi-IN' : language === 'zh' ? 'zh-CN' : 'en-US', { month: 'long', year: 'numeric' })}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                      <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2"><DollarSign size={16} /> {t('compensation')}</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between items-center text-sm">
                          <span className="text-blue-700">{t('salary')}</span>
                          <div className="flex gap-1 items-center">
                            <input
                              type="number"
                              className="w-20 text-right bg-white rounded px-1 text-sm border-blue-200"
                              value={selectedEmployee.salary}
                              onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'salary', Number(e.target.value))}
                            />
                            <select
                              className="text-[10px] bg-white border border-blue-100 rounded p-0.5 font-bold"
                              value={selectedEmployee.salaryMethod || 'Monthly'}
                              onChange={(e) => handleUpdateEmployee(selectedEmployee.id, 'salaryMethod', e.target.value)}
                            >
                              <option value="Monthly">M</option>
                              <option value="Weekly">W</option>
                              <option value="Daily">D</option>
                              <option value="Hourly">H</option>
                            </select>
                          </div>
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




                        {/* Deductions in Sidebar - Filtered by Selected Month */}
                        {(() => {
                          let baseSalary = Number(selectedEmployee.salary) || 0;
                          let bonus = Number(selectedEmployee.bonus) || 0;
                          let overtime = Number(selectedEmployee.overtime) || 0;
                          let deductionAmount = 0;
                          let lateDeduction = 0;
                          let absentDeduction = 0;

                          // Filter attendance by selected month (same logic as Payroll tab)
                          const empAttendance = attendance.filter(a => {
                            if (a.name !== selectedEmployee.name) return false;
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

                            return attendanceMonth === employeeMonthFilter;
                          });

                          empAttendance.forEach(record => {
                            if (record.status === 'Late') {
                              // Hourly Rate = Salary / 360
                              const hourlyRate = baseSalary / 360;
                              const lateCost = (Number(record.lateHours) || 0) * hourlyRate;
                              if (lateCost > 0) {
                                lateDeduction += lateCost;
                                deductionAmount += lateCost;
                              }
                            }
                            if (record.status === 'Absent') {
                              const cost = baseSalary / 30;
                              absentDeduction += cost;
                              deductionAmount += cost;
                            }
                          });

                          // Add Manual Hourly Deductions
                          const hourlyRate = baseSalary / 360;
                          const manualDeduction = (Number(selectedEmployee.deductionHours) || 0) * hourlyRate;

                          // Check for Stored Payroll Record for selected month
                          const storedRecord = payrolls.find(p => p.employeeId === selectedEmployee.id && p.month === employeeMonthFilter);

                          if (storedRecord) {
                            baseSalary = Number(storedRecord.salary) || baseSalary;
                            bonus = Number(storedRecord.bonus) || 0;
                            overtime = Number(storedRecord.overtime) || 0;
                          }

                          const effectiveManualDeduction = storedRecord ? (Number(storedRecord.deductions) || 0) : manualDeduction;
                          const effectiveAdvance = storedRecord ? (Number(storedRecord.advance) || 0) : (Number(selectedEmployee.advanceSalary) || 0);

                          deductionAmount = lateDeduction + absentDeduction + effectiveManualDeduction + effectiveAdvance;

                          const netPay = baseSalary + bonus + overtime - deductionAmount;

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

                              {effectiveAdvance > 0 && (
                                <div className="flex justify-between text-sm text-red-500 font-medium pt-1">
                                  <span>{t('advance')}</span>
                                  <span>-{formatCurrency(effectiveAdvance)}</span>
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
                        <label className="text-xs font-bold uppercase text-gray-400">{t('shopAddress') || 'Address'}</label>
                        <input className="bg-white border border-gray-200 rounded p-2 text-sm font-medium" value={selectedSite.address || ''} onChange={(e) => handleUpdateSite(selectedSite.id, 'address', e.target.value)} />
                      </div>
                      <div className="flex flex-col gap-1">
                        <label className="text-xs font-bold uppercase text-gray-400">{t('phone') || 'Phone'}</label>
                        <input className="bg-white border border-gray-200 rounded p-2 text-sm font-medium" value={selectedSite.phone || ''} onChange={(e) => handleUpdateSite(selectedSite.id, 'phone', e.target.value)} />
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

      {/* Settings Modal (Premium with Scroll Padding) */}
      {
        showSettings && (
          <div className="fixed inset-0 bg-slate-900/80 flex items-center justify-center z-[150] backdrop-blur-xl p-0 sm:p-4 animate-in fade-in duration-300">
            <div className="bg-white sm:rounded-[2.5rem] w-full max-w-2xl h-full sm:h-[85vh] shadow-2xl overflow-hidden flex flex-col border border-white/20 relative">
              {/* Fixed Close Button for Mobile Accessibility */}
              <button
                onClick={() => setShowSettings(false)}
                className="absolute top-6 right-6 z-20 p-2.5 bg-gray-50 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-2xl transition-all shadow-sm border border-gray-100"
              >
                <X size={24} />
              </button>

              <div className="flex-1 overflow-y-auto p-6 sm:p-8 pb-32 sm:pb-8">
                {/* Header - Fixed */}
                <div className="p-6 border-b border-gray-100 flex-shrink-0 flex justify-between items-center bg-white z-10">
                  <h3 className="text-xl font-bold flex items-center gap-2 text-gray-800">
                    <div className="p-2 bg-slate-100 rounded-lg">
                      <Settings className="text-slate-600" size={24} />
                    </div>
                    {t('settings')}
                  </h3>
                  <button
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X size={20} />
                  </button>
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                    {/* Column 1: Profile & Localization */}
                    <div className="space-y-6">
                      {/* My Profile */}
                      <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                          <User size={18} className="text-blue-600" /> {t('myProfile')}
                        </h4>
                        <div className="space-y-3 mb-4">
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('emailLabel')}</span>
                            <span className="text-sm font-medium text-gray-900 break-all">{user?.email}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('userIdLabel')}</span>
                            <span className="text-xs font-mono bg-gray-50 px-2 py-1 rounded border border-gray-200 break-all select-all text-gray-600">{user?.uid}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('accountTypeLabel')}</span>
                            <span className="self-start bg-blue-100 text-blue-800 text-xs px-2.5 py-0.5 rounded-full font-bold">{t('admin')}</span>
                          </div>
                        </div>

                        <div className="pt-4 border-t border-gray-50">
                          <h5 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">{t('accountHandling')}</h5>
                          <button onClick={handleLinkGoogle} className="w-full bg-white border border-gray-300 text-gray-700 font-bold py-2.5 rounded-lg hover:bg-gray-50 transition-all flex items-center justify-center gap-2 mb-2 shadow-sm">
                            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" className="w-5 h-5" alt="Google" />
                            {t('connectGoogle')}
                          </button>
                          <p className="text-[10px] text-gray-400 text-center px-2">{t('linkGoogleDesc')}</p>
                        </div>
                      </div>

                      {/* Localization */}
                      <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                          <Globe size={18} className="text-indigo-600" /> {t('localization')}
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">{t('language')}</label>
                            <select
                              value={language}
                              onChange={(e) => {
                                const newLang = e.target.value;
                                setLanguage(newLang);
                                saveUserSettings({ language: newLang });
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                            >
                              <option value="en">English</option>
                              <option value="hi">हिंदी</option>
                              <option value="ar">العربية</option>
                              <option value="zh">中文</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1.5 uppercase">{t('currency')}</label>
                            <select
                              value={currency}
                              onChange={(e) => {
                                const newCurrency = e.target.value;
                                setCurrency(newCurrency);
                                saveUserSettings({ currency: newCurrency });
                              }}
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
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
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Column 2: Shop, Security, Backup, Danger */}
                    <div className="space-y-6">
                      {/* Shop Settings */}
                      <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                          <Building2 size={18} className="text-orange-600" /> {t('shopSettings')}
                        </h4>
                        <div className="space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t('shopName')}</label>
                            <input
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder="My Shop"
                              value={shopSettings.name}
                              autoComplete="off"
                              name="shop_name_no_autofill"
                              onChange={(e) => setShopSettings({ ...shopSettings, name: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t('shopAddress')}</label>
                            <input
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder="123 Main St"
                              value={shopSettings.address}
                              autoComplete="off"
                              name="shop_address_no_autofill"
                              onChange={(e) => setShopSettings({ ...shopSettings, address: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t('shopPhone')}</label>
                            <input
                              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 outline-none"
                              placeholder="+1 234..."
                              value={shopSettings.phone}
                              autoComplete="off"
                              name="shop_phone_no_autofill"
                              onChange={(e) => setShopSettings({ ...shopSettings, phone: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t('upiId') || 'UPI ID'} (for India)</label>
                            <input
                              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30"
                              placeholder="example@upi"
                              value={shopSettings.upiId || ''}
                              onChange={(e) => setShopSettings({ ...shopSettings, upiId: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-500 mb-1">{t('instapayId') || 'InstaPay ID'}</label>
                            <input
                              className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-blue-50/30"
                              placeholder="InstaPay ID"
                              value={shopSettings.instapayId || ''}
                              onChange={(e) => setShopSettings({ ...shopSettings, instapayId: e.target.value })}
                            />
                          </div>
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
                            className="w-full bg-gray-900 text-white font-bold py-2 rounded-lg hover:bg-black transition-colors text-sm mt-2"
                          >
                            {t('updateSettings')}
                          </button>
                        </div>
                      </div>

                      {/* Security */}
                      <div className="p-5 bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                        <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2 border-b border-gray-50 pb-2">
                          <Shield size={18} className="text-teal-600" /> {t('changePin')} & {t('setSecurityQuestion')}
                        </h4>

                        {/* PIN */}
                        <div className="mb-4">
                          <label className="block text-xs font-medium text-gray-500 mb-1">{t('securityPin')}</label>
                          {securityPin === '1234' ? (
                            <input
                              type="password"
                              placeholder={t('newPin')}
                              maxLength={4}
                              className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm bg-red-50 focus:ring-2 focus:ring-red-500 outline-none"
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
                            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 px-3 py-2 rounded-lg border border-emerald-100">
                              <CheckCircle size={16} /> <span className="font-medium">{t('pinSetMessage')}</span>
                            </div>
                          )}
                        </div>

                        {/* Security Question */}
                        <div className="space-y-2 pt-2 border-t border-gray-100">
                          <select
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-gray-50 focus:bg-white focus:ring-2 focus:ring-teal-500 outline-none"
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
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 outline-none"
                            value={securityAnswer}
                            onChange={(e) => setSecurityAnswer(e.target.value)}
                          />
                          <button
                            onClick={() => {
                              if (!securityQuestion || !securityAnswer) {
                                alert(t('Please select a question and answer!'));
                                return;
                              }
                              saveUserSettings({ securityQuestion, securityAnswer });
                              alert(t('saveSettings') + ' Success!');
                            }}
                            className="w-full bg-teal-600 text-white py-2 rounded-lg text-sm font-bold hover:bg-teal-700 shadow-sm"
                          >
                            {t('saveSettings')}
                          </button>
                        </div>
                      </div>

                      {/* Backup & Danger Zone Group */}
                      <div className="grid grid-cols-1 gap-4">
                        {/* Backup */}
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                          <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2 text-sm">
                            <Database size={16} /> {t('backupRestore')}
                          </h4>
                          <div className="flex gap-2">
                            <button onClick={handleExportBackup} disabled={loading} className="flex-1 bg-white text-blue-700 border border-blue-200 font-bold py-1.5 rounded-lg hover:bg-blue-100 flex items-center justify-center gap-1 text-xs shadow-sm">
                              <Download size={14} /> {t('export')}
                            </button>
                            <label className="flex-1 bg-blue-600 text-white font-bold py-1.5 rounded-lg hover:bg-blue-700 flex items-center justify-center gap-1 text-xs cursor-pointer shadow-sm">
                              <Upload size={14} /> {t('import')}
                              <input type="file" accept=".json" onChange={handleImportBackup} disabled={loading} className="hidden" />
                            </label>
                          </div>
                        </div>

                        {/* Danger */}
                        <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                          <h4 className="font-bold text-red-900 mb-2 flex items-center gap-2 text-sm">
                            <AlertCircle size={16} /> {t('dangerZone')}
                          </h4>
                          <button onClick={handleFactoryReset} className="w-full bg-white text-red-600 border border-red-200 font-bold py-2 rounded-lg hover:bg-red-100 transition-colors flex items-center justify-center gap-2 text-xs shadow-sm">
                            <Trash2 size={14} /> {t('factoryReset')}
                          </button>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div >
        )
      }

      {/* Add Attendance Modal */}
      {
        isAddAttendanceModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">{t('replacementFor')} ({t('optional')})</label>
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
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
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
                    <option value="On Time">{t('onTimeLabel')}</option>
                    <option value="Late">{t('lateLabel')}</option>
                    <option value="Absent">{t('absentLabel')}</option>
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
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('addAccount')}</h3>
                <button onClick={() => setIsAddAccountModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddAccount} className="p-6 space-y-4">
                <input className="input-field" placeholder={t('accountName')} value={newAccountForm.name} onChange={e => setNewAccountForm({ ...newAccountForm, name: e.target.value })} required />

                <select className="input-field" value={newAccountForm.type} onChange={e => setNewAccountForm({ ...newAccountForm, type: e.target.value })}>
                  <option value="Asset">Asset</option>
                  <option value="Liability">Liability</option>
                  <option value="Equity">Equity</option>
                  <option value="Revenue">Revenue</option>
                  <option value="Expense">Expense</option>
                </select>

                <input type="number" className="input-field" placeholder={t('initialBalance')} value={newAccountForm.balance} onChange={e => setNewAccountForm({ ...newAccountForm, balance: Number(e.target.value) })} />

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
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{editingItem ? t('editItem') : t('addInventoryItem')}</h3>
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
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t('itemName')}</label>
                  <input className="input-field" placeholder={t('itemName')} value={editingItem ? editingItem.name : newItemForm.name} onChange={e => editingItem ? setEditingItem({ ...editingItem, name: e.target.value }) : setNewItemForm({ ...newItemForm, name: e.target.value })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t('location')}</label>
                  <select className="input-field" value={editingItem ? editingItem.location : newItemForm.location} onChange={e => editingItem ? setEditingItem({ ...editingItem, location: e.target.value }) : setNewItemForm({ ...newItemForm, location: e.target.value })} required>
                    <option value="">{t('selectLocation')}</option>
                    {sites.map(s => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('buyPrice')}</label>
                    <input type="number" className="input-field" placeholder="0.00" value={editingItem ? editingItem.buyPrice : newItemForm.buyPrice} onChange={e => editingItem ? setEditingItem({ ...editingItem, buyPrice: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, buyPrice: Number(e.target.value) })} required />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 mb-1">{t('sellPrice')}</label>
                    <input type="number" className="input-field" placeholder="0.00" value={editingItem ? editingItem.sellPrice : newItemForm.sellPrice} onChange={e => editingItem ? setEditingItem({ ...editingItem, sellPrice: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, sellPrice: Number(e.target.value) })} required />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t('quantity')}</label>
                  <input type="number" className="input-field" placeholder="0" value={editingItem ? editingItem.quantity : newItemForm.quantity} onChange={e => editingItem ? setEditingItem({ ...editingItem, quantity: Number(e.target.value) }) : setNewItemForm({ ...newItemForm, quantity: Number(e.target.value) })} required />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">{t('barcode')}</label>
                  <div className="flex flex-col gap-2">
                    <div className="flex gap-2">
                      <input className="input-field flex-1" placeholder={t('barcode')} value={editingItem ? (editingItem.barcode || '') : (newItemForm.barcode || '')} onChange={e => editingItem ? setEditingItem({ ...editingItem, barcode: e.target.value }) : setNewItemForm({ ...newItemForm, barcode: e.target.value })} />
                      <button type="button" onClick={() => setIsScannerOpen(true)} className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"><Scan size={20} /></button>
                      <button type="button" onClick={generateBarcode} className="px-3 py-2 bg-slate-100 text-slate-600 rounded-lg hover:bg-slate-200 text-xs font-bold uppercase tracking-tighter" title={t('generate')}>{t('generate')}</button>
                    </div>
                    {(editingItem?.barcode || newItemForm.barcode) && (
                      <button
                        type="button"
                        onClick={() => handlePrintBarcode(editingItem || newItemForm)}
                        className="w-full flex items-center justify-center gap-2 py-2 bg-blue-50 text-blue-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        <Printer size={16} /> {t('printBarcodeLabel')}
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => { setIsAddItemModalOpen(false); setEditingItem(null); }} className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium">{t('cancel')}</button>
                  <button type="submit" className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium shadow-lg shadow-blue-600/20">{editingItem ? t('update') || 'Update' : t('addItem')}</button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Add Sale Modal */}
      {
        isAddSaleModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('newSale')}</h3>
                <button onClick={() => setIsAddSaleModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddSale} className="p-6 space-y-4">
                <input className="input-field" placeholder={t('customerName')} value={newSaleForm.customer} onChange={e => setNewSaleForm({ ...newSaleForm, customer: e.target.value })} required />
                <input type="number" className="input-field" placeholder={t('totalAmount')} value={newSaleForm.amount} onChange={e => setNewSaleForm({ ...newSaleForm, amount: Number(e.target.value) })} required />
                <select className="input-field" value={newSaleForm.status} onChange={e => setNewSaleForm({ ...newSaleForm, status: e.target.value })}>
                  <option value="Pending">{t('pendingLabel')}</option>
                  <option value="Completed">{t('completed')}</option>
                  <option value="Shipped">{t('shipped')}</option>
                </select>
                <input className="input-field" placeholder={t('itemsSummaryLabel')} value={newSaleForm.items} onChange={e => setNewSaleForm({ ...newSaleForm, items: e.target.value })} />

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
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">{t('newPurchase')}</h3>
                <button onClick={() => setIsAddPurchaseModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleAddPurchase} className="p-6 space-y-4">
                <input className="input-field" placeholder={t('supplierName')} value={newPurchaseForm.supplier} onChange={e => setNewPurchaseForm({ ...newPurchaseForm, supplier: e.target.value })} required />
                <input type="number" className="input-field" placeholder={t('totalCost')} value={newPurchaseForm.amount} onChange={e => setNewPurchaseForm({ ...newPurchaseForm, amount: Number(e.target.value) })} required />
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
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
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
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <h3 className="font-bold text-lg text-gray-900">Select Sales Employee</h3>
                <button onClick={() => setIsSelectSalesEmployeeModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <div className="p-2 max-h-[60vh] overflow-y-auto">
                <div className="space-y-1">
                  {/* Filtered Employees: Assigned to Location OR Covering Today */}
                  {employees.filter(emp => {
                    if (!posLocationFilter) return true; // Safety check
                    const isAssigned = emp.location === posLocationFilter;
                    const today = new Date().toISOString().split('T')[0];
                    const isCovering = attendance.some(a =>
                      a.name === emp.name &&
                      a.date === today &&
                      (a.locationFilter === posLocationFilter || a.site === posLocationFilter) // check both just in case
                    );
                    return isAssigned || isCovering;
                  }).map(emp => (
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
                        <div className="text-xs text-gray-500">{t(emp.role.toLowerCase()) || emp.role}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Manage Payroll Modal */}
      {
        isManagePayrollModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                <div>
                  <h3 className="font-bold text-lg text-gray-900">{t('managePayroll')}</h3>
                  <p className="text-xs text-slate-500">{currentPayrollForm.name} • {currentPayrollForm.month}</p>
                </div>
                <button onClick={() => setIsManagePayrollModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
              </div>
              <form onSubmit={handleSavePayroll} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">

                {/* Fixed Fields */}
                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">{t('basicSalary')}</label>
                    <input type="number" className="input-field bg-white" value={currentPayrollForm.salary} onChange={e => setCurrentPayrollForm({ ...currentPayrollForm, salary: e.target.value })} required title={t('basicSalary')} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">{t('advanceTaken')}</label>
                    <input type="number" className="input-field bg-white text-red-600" value={currentPayrollForm.advance} onChange={e => setCurrentPayrollForm({ ...currentPayrollForm, advance: e.target.value })} title={t('advance')} />
                  </div>
                </div>

                {/* Variable Fields */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">{t('bonus')} (+)</label>
                    <input type="number" className="input-field text-green-600 font-bold" value={currentPayrollForm.bonus} onChange={e => setCurrentPayrollForm({ ...currentPayrollForm, bonus: e.target.value })} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">{t('overtime')} (+)</label>
                    <input type="number" className="input-field text-orange-600 font-bold" value={currentPayrollForm.overtime} onChange={e => setCurrentPayrollForm({ ...currentPayrollForm, overtime: e.target.value })} />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold text-gray-500 block mb-1">{t('manualDeductions')} (-)</label>
                    <input type="number" className="input-field text-red-600 font-bold" value={currentPayrollForm.deductions} onChange={e => setCurrentPayrollForm({ ...currentPayrollForm, deductions: e.target.value })} />
                  </div>
                  <div className="opacity-70 pointer-events-none">
                    <label className="text-xs font-semibold text-gray-400 block mb-1">{t('lateAbsentAuto')}</label>
                    <input type="number" className="input-field bg-gray-100 text-gray-500" value={(currentPayrollForm.lateDeduction + currentPayrollForm.absentDeduction).toFixed(2)} readOnly />
                  </div>
                </div>

                {/* Summary Box */}
                <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 mt-2">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-medium text-blue-800">{t('grossEarnings')}:</span>
                    <span className="font-mono font-bold text-blue-900">{formatCurrency(Number(currentPayrollForm.salary) + Number(currentPayrollForm.bonus) + Number(currentPayrollForm.overtime))}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1 text-red-700">
                    <span className="text-sm font-medium">{t('totalDeductions')}:</span>
                    <span className="font-mono font-bold">-{formatCurrency(Number(currentPayrollForm.advance) + Number(currentPayrollForm.deductions) + Number(currentPayrollForm.lateDeduction) + Number(currentPayrollForm.absentDeduction))}</span>
                  </div>
                  <div className="h-px bg-blue-200 my-2"></div>
                  <div className="flex justify-between items-center">
                    <span className="text-base font-bold text-blue-900">{t('netPayable')}:</span>
                    <span className="text-xl font-bold text-blue-700 font-mono">
                      {formatCurrency(
                        (Number(currentPayrollForm.salary) + Number(currentPayrollForm.bonus) + Number(currentPayrollForm.overtime)) -
                        (Number(currentPayrollForm.advance) + Number(currentPayrollForm.deductions) + Number(currentPayrollForm.lateDeduction) + Number(currentPayrollForm.absentDeduction))
                      )}
                    </span>
                  </div>
                </div>

                <div className="pt-2 flex gap-3">
                  <button type="button" onClick={() => setIsManagePayrollModalOpen(false)} className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 font-bold transition-colors">{t('cancel')}</button>
                  {payrolls.find(p => p.employeeId === currentPayrollForm.id && p.month === currentPayrollForm.month) && (
                    <button
                      type="button"
                      onClick={() => handleDeletePayrollRecord(currentPayrollForm.id, currentPayrollForm.month)}
                      className="flex-1 px-4 py-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 font-bold transition-all flex items-center justify-center gap-2 border border-red-200"
                      title="Delete custom record and reset to employee defaults"
                    >
                      <X size={18} /> {t('reset')}
                    </button>
                  )}
                  <button type="submit" className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2">
                    <Save size={18} /> {t('saveRecord')}
                  </button>
                </div>

              </form>
            </div>
          </div>
        )
      }

      {/* PIN Verification Modal */}
      {
        isPinModalOpen && (
          <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-[130] backdrop-blur-md p-4 animate-in fade-in duration-300">
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
                              if (pinAction === 'accessReports') {
                                setActiveTab('reports');
                                if (window.innerWidth < 768) setIsSidebarOpen(false);
                              }
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
                            if (pinAction === 'accessReports') {
                              setActiveTab('reports');
                              if (window.innerWidth < 768) setIsSidebarOpen(false);
                            }
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







      {/* Scanner Modal */}
      {
        isScannerOpen && (
          <div className="fixed inset-0 bg-slate-950/90 flex flex-col items-center justify-center z-[150] p-4 backdrop-blur-sm">
            <style>{`
              @keyframes scan {
                0% { top: 10%; }
                100% { top: 90%; }
              }
              .scanner-overlay {
                position: absolute;
                inset: 0;
                background: linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0) 40%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.3));
                pointer-events: none;
                z-index: 5;
              }
              #reader video {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }
              .scanning-line {
                position: absolute;
                left: 10%;
                right: 10%;
                height: 2px;
                background: #ef4444;
                box-shadow: 0 0 15px #ef4444, 0 0 5px #ef4444;
                animation: scan 2s linear infinite;
                z-index: 20;
              }
            `}</style>

            <div className="bg-white rounded-[2.5rem] w-full max-w-lg overflow-hidden relative shadow-2xl border border-white/20 animate-in zoom-in-95 duration-300">
              <div className="p-5 border-b flex justify-between items-center bg-gray-50/50 backdrop-blur-xl">
                <div className="flex flex-col flex-1 text-left">
                  <h3 className="font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight text-sm"><Scan size={18} className="text-blue-600" /> {t('scanBarcode')}</h3>
                  <div className="flex items-center gap-2 mt-2">
                    {cameras.length > 1 && (
                      <select
                        className="text-[10px] bg-white border border-gray-100 rounded-full px-3 py-1.5 outline-none font-black text-gray-400 hover:text-blue-600 transition-colors uppercase tracking-widest shadow-sm"
                        value={activeCameraId || ''}
                        onChange={(e) => setActiveCameraId(e.target.value)}
                      >
                        {cameras.map(cam => (
                          <option key={cam.id} value={cam.id}>{cam.label || `Camera ${cam.id}`}</option>
                        ))}
                      </select>
                    )}
                    {hasFlash && (
                      <button
                        onClick={toggleFlash}
                        className={`p-2 rounded-full border transition-all shadow-sm ${isFlashOn ? 'bg-amber-100 border-amber-300 text-amber-600' : 'bg-white border-gray-100 text-gray-400'}`}
                        title="Toggle Flash"
                      >
                        <Zap size={16} fill={isFlashOn ? "currentColor" : "none"} />
                      </button>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setIsScannerOpen(false)}
                  className="p-3 hover:bg-red-50 rounded-full text-gray-400 hover:text-red-600 transition-all ml-2 bg-gray-100/50"
                >
                  <X size={24} />
                </button>
              </div>

              {/* Retry Overlay if black screen */}
              <div className="absolute top-24 right-6 z-[60]">
                <button
                  onClick={() => {
                    setIsScannerOpen(false);
                    setTimeout(() => setIsScannerOpen(true), 100);
                  }}
                  className="px-3 py-1.5 bg-blue-600/80 backdrop-blur-md text-white text-[10px] font-black uppercase rounded-full shadow-lg border border-white/20 hover:bg-blue-700 transition-all flex items-center gap-2"
                >
                  <RefreshCw size={12} className="animate-spin-slow" /> {t('retryCamera')}
                </button>
              </div>

              <div className="relative overflow-hidden bg-black aspect-square sm:aspect-video flex items-center justify-center">
                <div id="reader" className="w-full h-full"></div>

                {/* Manual Focus Trigger Overlay */}
                <button
                  onClick={async () => {
                    try {
                      const track = scannerRef.current?.getRunningTrack();
                      if (track) {
                        await track.applyConstraints({ focusMode: "continuous" });
                        // Visual focus pulse animation
                        const focusUI = document.getElementById('focus-pulse');
                        if (focusUI) {
                          focusUI.classList.remove('hidden');
                          setTimeout(() => focusUI.classList.add('hidden'), 500);
                        }
                      }
                    } catch (e) { }
                  }}
                  className="absolute inset-0 z-40 cursor-crosshair flex items-center justify-center"
                >
                  <div id="focus-pulse" className="hidden w-20 h-20 border border-blue-400 rounded-full animate-ping"></div>
                </button>

                {/* Visual Scanning Effects */}
                <div className="scanner-overlay"></div>
                <div className="scanning-line"></div>

                {/* Corner Frame */}
                <div className="absolute top-10 left-10 w-10 h-10 border-t-4 border-l-4 border-blue-500 rounded-tl-xl z-30"></div>
                <div className="absolute top-10 right-10 w-10 h-10 border-t-4 border-r-4 border-blue-500 rounded-tr-xl z-30"></div>
                <div className="absolute bottom-10 left-10 w-10 h-10 border-b-4 border-l-4 border-blue-500 rounded-bl-xl z-30"></div>
                <div className="absolute bottom-10 right-10 w-10 h-10 border-b-4 border-r-4 border-blue-500 rounded-br-xl z-30"></div>

                {/* Zoom Control UI overlayed on video */}
                {hasZoom && zoomRange.max > zoomRange.min && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-3/4 bg-black/60 backdrop-blur-xl px-4 py-3 rounded-full flex items-center gap-4 z-50 border border-white/20 shadow-lg">
                    <span className="text-white text-[10px] font-black opacity-50 uppercase">1x</span>
                    <input
                      type="range"
                      min={zoomRange.min}
                      max={zoomRange.max}
                      step={zoomRange.step}
                      value={currentZoom}
                      onChange={handleZoomChange}
                      className="flex-1 h-1.5 bg-white/20 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <span className="text-white text-[10px] font-black opacity-50 uppercase">{Math.round(zoomRange.max)}x</span>
                  </div>
                )}
              </div>

              <div className="p-6 bg-white text-center">
                <p className="text-gray-900 font-bold text-sm tracking-tight mb-1">
                  {hasZoom ? t('scanFocusInfo') : t('tapToFocus')}
                </p>
                <p className="text-[10px] text-gray-400 uppercase tracking-widest font-black leading-relaxed">
                  {t('centerCodeFrame')}<br />
                  <span className="text-blue-500">{t('holdAwayTap')}</span>
                </p>
              </div>
            </div>
          </div>
        )
      }

      {/* UPI QR Payment Modal (Improved with Close and Overlap fix) */}
      {
        activeTab === 'sales_purchases' && !showSettings && !isPinModalOpen && showUpiQr && paymentMethod === 'Online' && cart.length > 0 && (
          <div className="fixed bottom-24 left-1/2 -translate-x-1/2 w-[280px] bg-white rounded-[2rem] shadow-[0_20px_50px_rgba(0,0,.1)] border border-blue-50 p-6 animate-in slide-in-from-bottom-10 duration-500 z-[100]">
            <div className="flex items-center justify-between gap-2 mb-4">
              <div className="flex items-center gap-3 text-blue-800">
                <div className="p-2 bg-blue-50 rounded-xl"><QrCode size={20} /></div>
                <span className="font-black text-xs uppercase tracking-widest">
                  {digitalSubMethod === 'UPI' ? t('payWithUPI') : t('payWithInstapay')}
                </span>
              </div>
              <button
                onClick={() => setShowUpiQr(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 hover:text-gray-900 transition-all"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex justify-center bg-gray-50 p-5 rounded-3xl mb-4 border border-gray-100 shadow-inner">
              {digitalSubMethod === 'UPI' && shopSettings.upiId ? (
                <QRCodeSVG
                  value={`upi://pay?pa=${shopSettings.upiId}&pn=${shopSettings.name}&am=${(calculateTotal() - cartDiscount).toFixed(2)}&cu=${currency === 'INR' ? 'INR' : 'INR'}`}
                  size={180}
                  level="H"
                  includeMargin={true}
                />
              ) : digitalSubMethod === 'InstaPay' && shopSettings.instapayId ? (
                <div className="text-center">
                  <div className="bg-white p-2 rounded-lg inline-block border border-gray-100 shadow-sm mb-2">
                    <QRCodeSVG value={shopSettings.instapayId} size={150} />
                  </div>
                  <p className="text-[10px] font-bold text-gray-500">InstaPay ID: {shopSettings.instapayId}</p>
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-red-500 italic">
                  {t('paymentMethodNotConfigured') || 'Details not configured in Settings'}
                </div>
              )}
            </div>
            <div className="text-center mb-6">
              <p className="text-[10px] text-gray-400 uppercase font-black tracking-[0.2em] mb-1">
                {digitalSubMethod === 'UPI' ? shopSettings.upiId : shopSettings.instapayId}
              </p>
              <p className="text-lg font-black text-gray-900 font-mono tracking-tight">{formatCurrency(calculateTotal() - cartDiscount)}</p>
            </div>

            <div className="space-y-2">
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-all duration-1000 ease-linear rounded-full"
                  style={{ width: `${(upiQrTimer / 15) * 100}%` }}
                ></div>
              </div>
              <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest">
                <span className="text-blue-600">Auto-hide</span>
                <span className="text-gray-400">{upiQrTimer}s</span>
              </div>
            </div>
          </div>
        )
      }

      {/* Cafe Order Modal */}
      {
        isCafeOrderModalOpen && activeCafeSession && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[130] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-5xl max-h-[90vh] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col relative">
              <div className="px-8 py-6 border-b border-gray-50 flex justify-between items-center bg-white/50 backdrop-blur-xl">
                <div>
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight flex items-center gap-3">
                    <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
                    {t('addOrder')} <span className="text-slate-300 font-normal">/</span> {activeCafeSession.roomName}
                  </h3>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{t('appendSession')}</p>
                </div>
                <button
                  onClick={() => { setIsCafeOrderModalOpen(false); setCart([]); }}
                  className="p-3 hover:bg-rose-50 rounded-full text-slate-300 hover:text-rose-600 transition-all active:scale-95 bg-slate-50"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col md:flex-row">
                {/* Left: Menu */}
                <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-8 bg-slate-50/30">
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {['All', 'Hot Drinks', 'Cold Drinks', 'Snacks', 'Meals'].map(cat => (
                      <button
                        key={cat}
                        onClick={() => setActiveCafeCategory(cat)}
                        className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all whitespace-nowrap border ${activeCafeCategory === cat ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/20' : 'bg-white text-slate-400 border-gray-100 hover:border-blue-500/30 hover:text-blue-600'}`}
                      >
                        {cat === 'All' ? t('all') : cat === 'Hot Drinks' ? t('hotDrinks') : cat === 'Cold Drinks' ? t('coldDrinks') : cat === 'Snacks' ? t('snacks') : t('meals')}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {recipes
                      .filter(r => activeCafeCategory === 'All' || r.category === activeCafeCategory)
                      .map(item => (
                        <button
                          key={item.id}
                          onClick={() => {
                            const existing = cart.find(c => c.id === item.id);
                            if (existing) {
                              setCart(cart.map(c => c.id === item.id ? { ...c, quantity: Number(c.quantity) + 1 } : c));
                            } else {
                              setCart([...cart, { ...item, quantity: 1 }]);
                            }
                          }}
                          className="p-5 bg-white rounded-2xl border border-gray-100 hover:border-blue-500/30 hover:shadow-xl hover:shadow-slate-200/50 transition-all group relative text-left flex flex-col justify-between min-h-[130px] shadow-sm"
                        >
                          <div>
                            <p className="font-black text-slate-800 text-sm mb-1 uppercase tracking-tight leading-tight">{item.name}</p>
                            <p className="text-blue-600 font-bold text-xs tracking-widest">{formatCurrency(item.sellPrice)}</p>
                          </div>
                          <div className="w-8 h-8 bg-slate-50 rounded-lg flex items-center justify-center text-slate-300 group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-12">
                            <Plus size={16} strokeWidth={3} />
                          </div>
                        </button>
                      ))}
                  </div>

                  {recipes.filter(r => activeCafeCategory === 'All' || r.category === activeCafeCategory).length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-center p-12 opacity-30">
                      <Package size={48} className="mb-4 text-slate-300" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('menuItemsMissingTitle')}</p>
                    </div>
                  )}
                </div>

                {/* Right: Cart & History */}
                <div className="w-full md:w-[380px] bg-white border-l border-gray-100 p-8 flex flex-col h-full overflow-hidden">
                  <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
                    {(() => {
                      const currentSession = cafeSessions.find(s => s.id === activeCafeSession.id);
                      const history = currentSession?.orders || [];
                      if (history.length === 0) return null;
                      return (
                        <div className="bg-slate-50 p-6 rounded-3xl border border-gray-100/50">
                          <h4 className="font-black text-[9px] uppercase tracking-widest text-blue-600 mb-4 flex items-center gap-2">
                            <History size={14} /> {t('orderHistory')}
                          </h4>
                          <div className="space-y-3">
                            {history.map((item, idx) => (
                              <div key={idx} className="flex justify-between items-center px-1">
                                <span className="text-[11px] font-bold text-slate-600 uppercase tracking-tight truncate max-w-[150px]">{item.name}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-[10px] font-black text-slate-300">x{item.quantity}</span>
                                  <span className="text-[11px] font-mono font-bold text-slate-700">{formatCurrency(Number(item.sellPrice) * Number(item.quantity))}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{t('subtotalLabel')}</span>
                            <span className="text-sm font-black text-slate-900">{formatCurrency(history.reduce((sum, h) => sum + (Number(h.sellPrice) * Number(h.quantity)), 0))}</span>
                          </div>
                        </div>
                      );
                    })()}

                    <div>
                      <h4 className="font-black text-[9px] uppercase tracking-widest text-slate-400 mb-4 px-1">{t('newSelection')}</h4>
                      <div className="space-y-3">
                        {cart.length === 0 ? (
                          <div className="py-8 flex flex-col items-center justify-center opacity-20">
                            <ShoppingCart size={32} className="mb-2 text-slate-400" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('trayEmpty')}</p>
                          </div>
                        ) : (
                          cart.map((item, idx) => (
                            <div key={idx} className="bg-white p-4 rounded-2xl border border-gray-100 flex items-center gap-3 animate-in slide-in-from-right-4 duration-300 shadow-sm">
                              <div className="flex-1 overflow-hidden">
                                <p className="font-bold text-[11px] text-slate-800 truncate uppercase tracking-tight mb-0.5">{item.name}</p>
                                <p className="text-[10px] text-blue-600 font-black tracking-widest">{formatCurrency(item.sellPrice)}</p>
                              </div>
                              <div className="flex items-center gap-3 bg-slate-50 rounded-xl p-1.5 border border-gray-100">
                                <button onClick={() => setCart(cart.map(c => c.id === item.id ? { ...c, quantity: Math.max(0, Number(c.quantity) - 1) } : c).filter(c => c.quantity > 0))} className="p-1.5 hover:bg-white hover:text-rose-600 rounded-lg text-slate-400 transition-all"><Minus size={12} /></button>
                                <span className="text-[11px] font-black text-slate-700 tabular-nums min-w-[20px] text-center">{item.quantity}</span>
                                <button onClick={() => setCart(cart.map(c => c.id === item.id ? { ...c, quantity: Number(c.quantity) + 1 } : c))} className="p-1.5 hover:bg-white hover:text-blue-600 rounded-lg text-slate-400 transition-all"><Plus size={12} /></button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="pt-8 border-t border-gray-100 mt-auto">
                    <div className="flex justify-between items-end mb-6">
                      <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{t('trayTotal')}</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tight">{formatCurrency(cart.reduce((sum, i) => sum + (Number(i.sellPrice) * Number(i.quantity)), 0))}</span>
                    </div>
                    <button
                      disabled={cart.length === 0}
                      onClick={() => {
                        handleCheckoutCafeOrder(activeCafeSession.id, cart);
                        setIsCafeOrderModalOpen(false);
                      }}
                      className="w-full py-4 bg-slate-900 hover:bg-black text-white rounded-2xl font-black uppercase tracking-widest text-[10px] transition-all shadow-lg shadow-slate-200 disabled:opacity-20 flex items-center justify-center gap-2 transform active:scale-95"
                    >
                      <CheckCircle size={18} strokeWidth={3} /> {t('confirmOrder')}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Start Session Modal */}
      {
        isStartSessionModalOpen && pendingRoom && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center z-[130] p-4 animate-in fade-in duration-300">
            <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 border border-gray-100 flex flex-col p-8">
              <div className="flex justify-between items-center mb-8">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-50 rounded-2xl text-blue-600">
                    <Play size={24} fill="currentColor" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-800 tracking-tight uppercase">{t('startSessionTitle')}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{pendingRoom.name}</p>
                  </div>
                </div>
                <button onClick={() => setIsStartSessionModalOpen(false)} className="p-2 text-slate-300 hover:text-rose-600 transition-all active:scale-95"><X size={24} /></button>
              </div>

              <form onSubmit={handleConfirmStartSession} className="space-y-5">
                <div className="bg-slate-50 p-6 rounded-2xl border border-gray-100 flex justify-between items-center group transition-all">
                  <div>
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">{t('hourlyRateLabel')}</span>
                    <span className="text-xl font-black text-slate-900 tabular-nums">{formatCurrency(pendingRoom.hourlyPrice)}</span>
                  </div>
                  <div className="p-3 bg-white rounded-xl shadow-sm border border-gray-100 group-hover:bg-blue-600 group-hover:text-white transition-all text-slate-400">
                    <DollarSign size={20} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('sessionTypeLabel')}</label>
                  <select
                    value={sessionStartForm.sessionType}
                    onChange={e => setSessionStartForm({ ...sessionStartForm, sessionType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all appearance-none cursor-pointer"
                  >
                    <option value="Open">{t('openSession')}</option>
                    <option value="Fixed">{t('fixedDuration')}</option>
                  </select>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('customerPhone')}</label>
                  <input
                    type="text"
                    value={sessionStartForm.customerPhone}
                    onChange={e => setSessionStartForm({ ...sessionStartForm, customerPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300"
                    placeholder={t('phonePlaceholder')}
                    required
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-[10px] uppercase font-black tracking-widest text-slate-400 pl-4">{t('customerName')}</label>
                  <input
                    type="text"
                    value={sessionStartForm.customerName}
                    onChange={e => setSessionStartForm({ ...sessionStartForm, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4 text-sm font-bold text-slate-900 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-300"
                    placeholder={t('guestName')}
                  />
                </div>

                <button type="submit" className="w-full bg-slate-900 hover:bg-black text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] transition-all shadow-lg shadow-slate-200 flex items-center justify-center gap-2 mt-4 hover:scale-[1.02] active:scale-[0.98]">
                  <Play size={18} fill="currentColor" /> {t('startSession')}
                </button>
              </form>
            </div>
          </div>
        )
      }

      {/* Global Mobile Bottom Navigation for Service Shop Mode */}
      {activeTab === 'service' && (
        <div className="lg:hidden fixed bottom-6 left-1/2 -translate-x-1/2 w-[90%] bg-white/95 backdrop-blur-xl border border-gray-100 px-6 py-3 flex justify-between items-center z-[130] shadow-[0_15px_35px_rgba(0,0,0,0.1)] rounded-[2.5rem]">
          {[
            { id: 'board', label: t('dashboard'), icon: <LayoutDashboard size={20} /> },
            { id: 'active', label: t('activeJobs'), icon: <Wrench size={20} /> },
            { id: 'reports', label: t('menuReports'), icon: <BarChart3 size={20} /> }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setServiceSubTab(tab.id)}
              className={`flex flex-col items-center gap-1 p-2 transition-all ${serviceSubTab === tab.id ? 'text-blue-600 scale-110' : 'text-slate-400 opacity-60'}`}
            >
              {tab.icon}
              <span className="text-[8px] font-black uppercase tracking-tighter">{tab.label}</span>
            </button>
          ))}
        </div>
      )}

    </div>
  );
}


