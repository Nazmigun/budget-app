import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wallet, TrendingUp, Calendar, Plus, X, Check, ArrowRight, Coffee, ShoppingBag, Car, Home, Heart, Sparkles, MoreHorizontal, ChevronRight, ChevronLeft, Tag, CalendarDays, TrendingDown, LogOut, Cloud, CloudOff, Loader } from 'lucide-react';
import { supabase } from './supabase';
import Auth from './Auth';

const STORAGE_KEY = 'budget_app_data_v1';

export default function App() {
  // Auth state
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'loading' | 'syncing' | 'synced' | 'error'
  
  const [step, setStep] = useState('setup'); // setup, dashboard
  const [salary, setSalary] = useState('');
  const [salaryDay, setSalaryDay] = useState('');
  const [investmentEnabled, setInvestmentEnabled] = useState(false);
  const [investmentPercent, setInvestmentPercent] = useState(15);
  const [investmentAmount, setInvestmentAmount] = useState('');
  const [investmentMode, setInvestmentMode] = useState('percent'); // percent or fixed
  
  // Daily tracking
  const [currentDay, setCurrentDay] = useState(1);
  const [expenses, setExpenses] = useState([]); // {day, amount, category, note}
  const [todayExpenses, setTodayExpenses] = useState([]);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [daySummary, setDaySummary] = useState(null);
  const [carryOver, setCarryOver] = useState(0); // önceki günden kalan
  
  // Calendar / History
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarMonth, setCalendarMonth] = useState(new Date().getMonth());
  const [calendarYear, setCalendarYear] = useState(new Date().getFullYear());
  const [selectedDate, setSelectedDate] = useState(null); // YYYY-MM-DD string
  const [dayHistory, setDayHistory] = useState({}); // { 'YYYY-MM-DD': { budget, spent, remaining, expenses } }
  const [hasLoaded, setHasLoaded] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null); // { dateKey, index, ...exp }
  const [showHistoryAddModal, setShowHistoryAddModal] = useState(false);
  const [historyAddDate, setHistoryAddDate] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null); // { title, message, onConfirm }
  
  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseNote, setExpenseNote] = useState('');
  
  // Senkronizasyon için ref'ler
  const saveTimeoutRef = useRef(null);
  const lastSyncedDataRef = useRef(null);

  // Bugünün tarih anahtarı (YYYY-MM-DD)
  const getDateKey = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };
  const todayKey = getDateKey(new Date());

  // ============ AUTH STATE LISTENER ============
  useEffect(() => {
    // İlk açılışta mevcut session'ı kontrol et
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setAuthChecked(true);
    });

    // Auth state değişikliklerini dinle (giriş, çıkış, vs)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        // Çıkış yapıldı: state'i temizle
        setSalary('');
        setSalaryDay('');
        setInvestmentEnabled(false);
        setInvestmentPercent(15);
        setInvestmentAmount('');
        setInvestmentMode('percent');
        setTodayExpenses([]);
        setExpenses([]);
        setCarryOver(0);
        setDayHistory({});
        setStep('setup');
        setHasLoaded(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // ============ SUPABASE'DEN VERİ YÜKLE (giriş yapınca) ============
  useEffect(() => {
    if (!session) return;
    
    const loadData = async () => {
      setSyncStatus('loading');
      try {
        // Supabase'den kullanıcının verisini çek
        const { data: rows, error } = await supabase
          .from('user_data')
          .select('data')
          .eq('user_id', session.user.id)
          .maybeSingle();
        
        if (error) throw error;
        
        let dataToLoad = null;
        
        if (rows && rows.data && Object.keys(rows.data).length > 0) {
          // Bulutta veri var, onu kullan
          dataToLoad = rows.data;
        } else {
          // Bulutta veri yok — localStorage'a bak (migrasyon)
          const saved = localStorage.getItem(STORAGE_KEY);
          if (saved) {
            const localData = JSON.parse(saved);
            if (localData.salary) {
              dataToLoad = localData;
              // Yeni hesaba migrasyon: localStorage'daki verileri buluta yükle
              await supabase
                .from('user_data')
                .upsert({ 
                  user_id: session.user.id, 
                  data: localData,
                  updated_at: new Date().toISOString()
                });
            }
          }
        }
        
        if (dataToLoad) {
          if (dataToLoad.salary) setSalary(dataToLoad.salary);
          if (dataToLoad.salaryDay) setSalaryDay(dataToLoad.salaryDay);
          if (dataToLoad.investmentEnabled !== undefined) setInvestmentEnabled(dataToLoad.investmentEnabled);
          if (dataToLoad.investmentPercent) setInvestmentPercent(dataToLoad.investmentPercent);
          if (dataToLoad.investmentAmount) setInvestmentAmount(dataToLoad.investmentAmount);
          if (dataToLoad.investmentMode) setInvestmentMode(dataToLoad.investmentMode);
          if (dataToLoad.dayHistory) setDayHistory(dataToLoad.dayHistory);
          if (dataToLoad.carryOver) setCarryOver(dataToLoad.carryOver);
          if (dataToLoad.todayExpenses && dataToLoad.todayExpensesDate === todayKey) {
            setTodayExpenses(dataToLoad.todayExpenses);
          }
          if (dataToLoad.salary && dataToLoad.setupComplete) {
            setStep('dashboard');
          }
          lastSyncedDataRef.current = JSON.stringify(dataToLoad);
        }
        
        setSyncStatus('synced');
      } catch (e) {
        console.error('Veri yükleme hatası:', e);
        setSyncStatus('error');
      } finally {
        setHasLoaded(true);
      }
    };
    
    loadData();
  }, [session]);

  // ============ SUPABASE'E VERİ KAYDET (debounced - 1 saniye bekler) ============
  useEffect(() => {
    if (!hasLoaded || !session) return;
    
    const data = {
      salary,
      salaryDay,
      investmentEnabled,
      investmentPercent,
      investmentAmount,
      investmentMode,
      dayHistory,
      carryOver,
      todayExpenses,
      todayExpensesDate: todayKey,
      setupComplete: step === 'dashboard'
    };
    
    const dataStr = JSON.stringify(data);
    if (dataStr === lastSyncedDataRef.current) return; // Değişiklik yok
    
    // localStorage'a hemen kaydet (yedek olarak)
    try {
      localStorage.setItem(STORAGE_KEY, dataStr);
    } catch (e) {
      console.error('localStorage hatası:', e);
    }
    
    // Supabase'e debounced kaydet (yazıyı bitirsin, sonra yolla)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    
    setSyncStatus('syncing');
    saveTimeoutRef.current = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from('user_data')
          .upsert({ 
            user_id: session.user.id, 
            data,
            updated_at: new Date().toISOString()
          });
        if (error) throw error;
        lastSyncedDataRef.current = dataStr;
        setSyncStatus('synced');
      } catch (e) {
        console.error('Senkronizasyon hatası:', e);
        setSyncStatus('error');
      }
    }, 1000);
    
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, [salary, salaryDay, investmentEnabled, investmentPercent, investmentAmount, investmentMode, dayHistory, carryOver, todayExpenses, step, hasLoaded, todayKey, session]);

  // Çıkış yap
  const handleLogout = async () => {
    if (saveTimeoutRef.current) {
      // Bekleyen kaydetme varsa hemen yap
      clearTimeout(saveTimeoutRef.current);
      try {
        const data = {
          salary, salaryDay, investmentEnabled, investmentPercent, investmentAmount,
          investmentMode, dayHistory, carryOver, todayExpenses, todayExpensesDate: todayKey,
          setupComplete: step === 'dashboard'
        };
        await supabase.from('user_data').upsert({ 
          user_id: session.user.id, data, updated_at: new Date().toISOString()
        });
      } catch (e) { console.error(e); }
    }
    await supabase.auth.signOut();
  };

  const categories = [
    { id: 'yemek', label: 'Yemek', icon: Coffee, color: '#C97B5C' },
    { id: 'alisveris', label: 'Alışveriş', icon: ShoppingBag, color: '#8B6F47' },
    { id: 'ulasim', label: 'Ulaşım', icon: Car, color: '#5C7C8A' },
    { id: 'fatura', label: 'Fatura', icon: Home, color: '#7A5C8A' },
    { id: 'saglik', label: 'Sağlık', icon: Heart, color: '#A85751' },
    { id: 'eglence', label: 'Eğlence', icon: Sparkles, color: '#B8924A' },
    { id: 'diger', label: 'Diğer', icon: MoreHorizontal, color: '#6B6B6B' },
  ];

  // Hesaplamalar
  const calculations = useMemo(() => {
    const salaryNum = parseFloat(salary) || 0;
    let invAmount = 0;
    if (investmentEnabled) {
      if (investmentMode === 'percent') {
        invAmount = salaryNum * (investmentPercent / 100);
      } else {
        invAmount = parseFloat(investmentAmount) || 0;
      }
    }
    const remaining = salaryNum - invAmount;
    
    // Bugünün gerçek tarihi
    const today = new Date();
    const todayDay = today.getDate();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const sDayParsed = parseInt(salaryDay);
    const hasSalaryDay = !isNaN(sDayParsed) && sDayParsed >= 1 && sDayParsed <= 31;
    
    let daysUntilNextSalary;
    let nextSalaryDate = null;
    
    if (hasSalaryDay) {
      // Maaş günü girilmişse: bir sonraki maaş gününe kadar olan gün sayısı
      const sDay = Math.min(sDayParsed, lastDayOfMonth);
      if (todayDay < sDay) {
        daysUntilNextSalary = sDay - todayDay;
        nextSalaryDate = new Date(today.getFullYear(), today.getMonth(), sDay);
      } else {
        // Sonraki ayın maaş gününe kadar
        const nextMonth = today.getMonth() + 1;
        const nextMonthLastDay = new Date(today.getFullYear(), nextMonth + 1, 0).getDate();
        const nextSDay = Math.min(sDayParsed, nextMonthLastDay);
        nextSalaryDate = new Date(today.getFullYear(), nextMonth, nextSDay);
        daysUntilNextSalary = Math.ceil((nextSalaryDate - today) / (1000 * 60 * 60 * 24));
      }
      if (daysUntilNextSalary === 0) daysUntilNextSalary = 1;
    } else {
      // Maaş günü girilmemişse: ay sonuna kadar olan gün sayısı (varsayılan)
      daysUntilNextSalary = lastDayOfMonth - todayDay + 1;
    }
    
    // YAYILMIŞ MOD: Geçmişte tamamlanan günlerin net harcamasını topla
    // Bunlar dayHistory'de kayıtlı (her birinin spent tutarı var)
    // Sadece BU dönem'e ait olanları say (önceki maaş gününden bugüne kadar)
    let periodStart;
    if (hasSalaryDay) {
      const sDayUsed = Math.min(sDayParsed, lastDayOfMonth);
      if (todayDay >= sDayUsed) {
        // Bu ayın maaş gününden başlıyor
        periodStart = new Date(today.getFullYear(), today.getMonth(), sDayUsed);
      } else {
        // Önceki ayın maaş gününden başlıyor
        const prevMonth = today.getMonth() - 1;
        const prevMonthLastDay = new Date(today.getFullYear(), prevMonth + 1, 0).getDate();
        const prevSDay = Math.min(sDayParsed, prevMonthLastDay);
        periodStart = new Date(today.getFullYear(), prevMonth, prevSDay);
      }
    } else {
      // Maaş günü yoksa: ayın 1'inden başlasın
      periodStart = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    // Bu döneme ait kapanmış günlerin toplam harcaması
    const periodStartKey = (() => {
      const y = periodStart.getFullYear();
      const m = String(periodStart.getMonth() + 1).padStart(2, '0');
      const d = String(periodStart.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
    const todayKeyLocal = (() => {
      const y = today.getFullYear();
      const m = String(today.getMonth() + 1).padStart(2, '0');
      const d = String(today.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    })();
    
    const periodHistorySpent = Object.values(dayHistory)
      .filter(h => h.date >= periodStartKey && h.date < todayKeyLocal)
      .reduce((sum, h) => sum + (h.spent || 0), 0);
    
    // Kalan para = Toplam harcanabilir − Geçmişte harcanan
    const moneyLeftBeforeToday = remaining - periodHistorySpent;
    // Bugün + kalan günler için ortak günlük limit (yayılmış)
    const dailyLimit = moneyLeftBeforeToday / daysUntilNextSalary;
    
    return {
      salaryNum,
      invAmount,
      remaining,
      daysUntilNextSalary,
      dailyLimit,
      hasSalaryDay,
      nextSalaryDate,
      todayDate: today,
      periodHistorySpent,
      moneyLeftBeforeToday
    };
  }, [salary, investmentEnabled, investmentPercent, investmentAmount, investmentMode, salaryDay, dayHistory]);

  // Tarih formatlama
  const formatDate = (date) => {
    const months = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
    const days = ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'];
    return {
      full: `${date.getDate()} ${months[date.getMonth()]} ${days[date.getDay()]}`,
      short: `${date.getDate()} ${months[date.getMonth()]}`,
      dayName: days[date.getDay()]
    };
  };
  
  const todayFormatted = formatDate(calculations.todayDate);

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayBudget = calculations.dailyLimit; // Yayılmış mod: dinamik
  const todayRemaining = todayBudget - todayTotal;

  // Aylık bakiye = Toplam harcanabilir − Bu döneme ait tüm harcamalar (geçmiş + bugün)
  const totalSpent = calculations.periodHistorySpent + todayTotal;
  const totalBudget = calculations.remaining;
  const overallRemaining = totalBudget - totalSpent;

  const handleSetupComplete = () => {
    if (salary) {
      setStep('dashboard');
    }
  };

  const handleAddExpense = () => {
    if (expenseAmount && expenseCategory) {
      const newExp = {
        day: currentDay,
        amount: parseFloat(expenseAmount),
        category: expenseCategory,
        note: expenseNote,
        time: new Date().toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
      };
      setTodayExpenses([...todayExpenses, newExp]);
      setExpenseAmount('');
      setExpenseCategory('');
      setExpenseNote('');
      setShowExpenseModal(false);
    }
  };

  const handleEndDay = () => {
    const summary = {
      day: currentDay,
      budget: todayBudget,
      spent: todayTotal,
      remaining: todayRemaining,
      expenses: todayExpenses,
      saved: todayRemaining > 0 ? todayRemaining : 0,
      over: todayRemaining < 0 ? Math.abs(todayRemaining) : 0
    };
    setDaySummary(summary);
    setShowSummaryModal(true);
  };

  const confirmEndDay = () => {
    // Geçmişe kaydet
    const dateKey = todayKey;
    const newHistoryEntry = {
      date: dateKey,
      budget: todayBudget,
      spent: todayTotal,
      remaining: todayRemaining,
      expenses: todayExpenses,
    };
    setDayHistory({ ...dayHistory, [dateKey]: newHistoryEntry });
    
    setExpenses([...expenses, ...todayExpenses]);
    setTodayExpenses([]);
    setCurrentDay(currentDay + 1);
    setShowSummaryModal(false);
    setDaySummary(null);
  };
  
  // Tüm verileri sıfırla
  const handleReset = () => {
    setConfirmDialog({
      title: 'Tüm verileri sıfırla',
      message: 'Maaş bilgileri, harcamalar ve geçmiş — bulutta ve cihazda her şey silinecek. Bu işlem geri alınamaz. Devam edilsin mi?',
      onConfirm: async () => {
        localStorage.removeItem(STORAGE_KEY);
        // Bulutta da boşalt
        if (session) {
          try {
            await supabase
              .from('user_data')
              .upsert({ 
                user_id: session.user.id, 
                data: {},
                updated_at: new Date().toISOString()
              });
          } catch (e) {
            console.error('Bulut sıfırlama hatası:', e);
          }
        }
        lastSyncedDataRef.current = null;
        setSalary('');
        setSalaryDay('');
        setInvestmentEnabled(false);
        setInvestmentPercent(15);
        setInvestmentAmount('');
        setInvestmentMode('percent');
        setTodayExpenses([]);
        setExpenses([]);
        setCarryOver(0);
        setDayHistory({});
        setStep('setup');
        setShowCalendar(false);
        setSelectedDate(null);
        setConfirmDialog(null);
      }
    });
  };

  // GEÇMİŞ DÜZENLEME FONKSİYONLARI
  
  // Bir günün spent ve remaining değerlerini expenses dizisinden yeniden hesapla
  const recalculateDayEntry = (entry) => {
    const newSpent = entry.expenses.reduce((sum, e) => sum + e.amount, 0);
    const newRemaining = entry.budget - newSpent;
    return { ...entry, spent: newSpent, remaining: newRemaining };
  };
  
  // Geçmişteki bir harcamayı sil
  const deleteHistoryExpense = (dateKey, expenseIndex) => {
    setConfirmDialog({
      title: 'Harcamayı sil',
      message: 'Bu harcama kalıcı olarak silinecek. Devam edilsin mi?',
      onConfirm: () => {
        const entry = dayHistory[dateKey];
        if (!entry) return;
        const newExpenses = entry.expenses.filter((_, i) => i !== expenseIndex);
        const updatedEntry = recalculateDayEntry({ ...entry, expenses: newExpenses });
        setDayHistory({ ...dayHistory, [dateKey]: updatedEntry });
        setConfirmDialog(null);
      }
    });
  };
  
  // Geçmişteki bir harcamayı güncelle
  const updateHistoryExpense = (dateKey, expenseIndex, updatedFields) => {
    const entry = dayHistory[dateKey];
    if (!entry) return;
    const newExpenses = entry.expenses.map((e, i) => 
      i === expenseIndex ? { ...e, ...updatedFields } : e
    );
    const updatedEntry = recalculateDayEntry({ ...entry, expenses: newExpenses });
    setDayHistory({ ...dayHistory, [dateKey]: updatedEntry });
    setEditingExpense(null);
  };
  
  // Geçmişe yeni harcama ekle (ister mevcut bir güne, ister hiç verisi olmayan bir güne)
  const addExpenseToHistory = (dateKey, newExp) => {
    const entry = dayHistory[dateKey];
    if (entry) {
      // Var olan güne ekle
      const newExpenses = [...entry.expenses, newExp];
      const updatedEntry = recalculateDayEntry({ ...entry, expenses: newExpenses });
      setDayHistory({ ...dayHistory, [dateKey]: updatedEntry });
    } else {
      // Yeni gün oluştur (budget olarak o günkü dailyLimit'i alalım — basitçe şu anki limiti)
      const budget = calculations.dailyLimit > 0 ? calculations.dailyLimit : 0;
      const newEntry = {
        date: dateKey,
        budget,
        spent: newExp.amount,
        remaining: budget - newExp.amount,
        expenses: [newExp],
      };
      setDayHistory({ ...dayHistory, [dateKey]: newEntry });
    }
  };
  
  // Bir günü tamamen sil
  const deleteHistoryDay = (dateKey) => {
    setConfirmDialog({
      title: 'Günü sil',
      message: 'Bu güne ait tüm veriler (harcamalar, bilanço) kalıcı olarak silinecek. Devam edilsin mi?',
      onConfirm: () => {
        const newHistory = { ...dayHistory };
        delete newHistory[dateKey];
        setDayHistory(newHistory);
        setSelectedDate(null);
        setConfirmDialog(null);
      }
    });
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getCategoryInfo = (id) => categories.find(c => c.id === id) || categories[6];

  // ============ AUTH KONTROL EKRANLARI ============
  
  // İlk auth kontrolü yapılana kadar yükleme
  if (!authChecked) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #F5EFE6 0%, #E8DDC9 100%)',
        fontFamily: "'Fraunces', Georgia, serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap');
          @keyframes spin { to { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
        <div className="text-center">
          <Loader size={32} className="spin mx-auto mb-4" style={{ color: '#8B7355' }} />
          <div className="text-sm" style={{ color: '#8B7355', letterSpacing: '0.1em' }}>
            Yükleniyor...
          </div>
        </div>
      </div>
    );
  }
  
  // Giriş yapılmamış: Auth ekranı
  if (!session) {
    return <Auth />;
  }
  
  // Giriş yapıldı, veriler yükleniyor
  if (syncStatus === 'loading' && !hasLoaded) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center" style={{
        background: 'linear-gradient(135deg, #F5EFE6 0%, #E8DDC9 100%)',
        fontFamily: "'Fraunces', Georgia, serif",
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&family=Inter:wght@300;400;500;600&display=swap');
          @keyframes spin { to { transform: rotate(360deg); } }
          .spin { animation: spin 1s linear infinite; }
        `}</style>
        <div className="text-center">
          <Cloud size={32} className="mx-auto mb-4" style={{ color: '#8B7355' }} />
          <div style={{ fontWeight: 300, fontSize: '24px', marginBottom: '4px' }}>
            <em>Verilerin</em> yükleniyor
          </div>
          <div className="text-sm" style={{ fontFamily: 'Inter, sans-serif', color: '#8B7355' }}>
            Buluttan getiriliyor...
          </div>
        </div>
      </div>
    );
  }

  // SETUP SCREEN
  if (step === 'setup') {
    return (
      <div className="min-h-screen w-full" style={{
        fontFamily: "'Fraunces', Georgia, serif",
        background: 'linear-gradient(135deg, #F5EFE6 0%, #E8DDC9 100%)',
        color: '#2C2416'
      }}>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@300;400;500;600&display=swap');
          
          .num-font { font-family: 'Fraunces', serif; font-feature-settings: 'tnum'; }
          .ui-font { font-family: 'Inter', sans-serif; }
          
          input[type=range] {
            -webkit-appearance: none;
            background: transparent;
          }
          input[type=range]::-webkit-slider-runnable-track {
            height: 4px;
            background: #D4C4A8;
            border-radius: 2px;
          }
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            height: 22px;
            width: 22px;
            border-radius: 50%;
            background: #2C2416;
            margin-top: -9px;
            cursor: pointer;
            border: 3px solid #F5EFE6;
            box-shadow: 0 2px 8px rgba(44,36,22,0.2);
          }
          input[type=range]::-moz-range-track {
            height: 4px;
            background: #D4C4A8;
            border-radius: 2px;
          }
          input[type=range]::-moz-range-thumb {
            height: 22px;
            width: 22px;
            border-radius: 50%;
            background: #2C2416;
            cursor: pointer;
            border: 3px solid #F5EFE6;
          }
          
          .number-input::-webkit-outer-spin-button,
          .number-input::-webkit-inner-spin-button {
            -webkit-appearance: none;
            margin: 0;
          }
          .number-input { -moz-appearance: textfield; }
          
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .fade-up { animation: fadeUp 0.7s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
          .delay-1 { animation-delay: 0.1s; }
          .delay-2 { animation-delay: 0.25s; }
          .delay-3 { animation-delay: 0.4s; }
          .delay-4 { animation-delay: 0.55s; }
          .delay-5 { animation-delay: 0.7s; }
        `}</style>

        <div className="max-w-2xl mx-auto px-6 py-12 md:py-20">
          {/* Header */}
          <div className="fade-up delay-1 mb-12">
            <div className="flex items-center gap-2 mb-6 ui-font" style={{ fontSize: '11px', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355' }}>
              <span style={{ width: '24px', height: '1px', background: '#8B7355' }}></span>
              Bütçe Kurulumu
            </div>
            <h1 className="text-5xl md:text-6xl mb-4" style={{ fontWeight: 300, lineHeight: 0.95, letterSpacing: '-0.02em' }}>
              Mali <em style={{ fontWeight: 400 }}>düzenin</em>
              <br />
              başlangıcı.
            </h1>
            <p className="ui-font text-base max-w-md mt-6" style={{ color: '#5C4F3A', lineHeight: 1.6 }}>
              Maaşını ve harcama alışkanlıklarını paylaş; sana her gün için sürdürülebilir bir bütçe önereceğim.
            </p>
          </div>

          {/* Salary Input */}
          <div className="fade-up delay-2 mb-10">
            <label className="ui-font block mb-3" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
              01 — Aylık Maaş
            </label>
            <div className="relative">
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="0"
                className="number-font w-full bg-transparent border-0 border-b-2 outline-none transition-colors num-font"
                style={{
                  borderColor: '#2C2416',
                  fontSize: '48px',
                  fontWeight: 300,
                  paddingBottom: '8px',
                  paddingRight: '60px',
                  color: '#2C2416'
                }}
              />
              <span className="num-font absolute right-0 bottom-3 text-2xl" style={{ color: '#8B7355', fontWeight: 300 }}>₺</span>
            </div>
          </div>

          {/* Salary Day */}
          <div className="fade-up delay-3 mb-10">
            <label className="ui-font block mb-3" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
              02 — Maaş Günü <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: 'normal' }}>(opsiyonel)</span>
            </label>
            <div className="flex items-baseline gap-3">
              <span className="ui-font" style={{ color: '#5C4F3A', fontSize: '15px' }}>Her ayın</span>
              <input
                type="number"
                min="1"
                max="31"
                value={salaryDay}
                onChange={(e) => setSalaryDay(e.target.value)}
                placeholder="15"
                className="number-input bg-transparent border-0 border-b-2 outline-none num-font text-center"
                style={{
                  borderColor: '#2C2416',
                  fontSize: '32px',
                  fontWeight: 400,
                  width: '70px',
                  color: '#2C2416'
                }}
              />
              <span className="ui-font" style={{ color: '#5C4F3A', fontSize: '15px' }}>'inde alıyorum.</span>
            </div>
            <p className="ui-font mt-3" style={{ fontSize: '13px', color: '#8B7355', lineHeight: 1.5, fontStyle: 'italic' }}>
              Eğer girerseniz daha kişisel tavsiyeler alabilirsiniz. Aksi takdirde ay sonuna kadar olan günlere göre hesaplanır.
            </p>
          </div>

          {/* Investment Toggle */}
          <div className="fade-up delay-4 mb-10">
            <label className="ui-font block mb-3" style={{ fontSize: '11px', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
              03 — Yatırım <span style={{ fontStyle: 'italic', textTransform: 'none', letterSpacing: 'normal' }}>(opsiyonel)</span>
            </label>
            
            <div 
              onClick={() => setInvestmentEnabled(!investmentEnabled)}
              className="cursor-pointer p-5 transition-all"
              style={{
                background: investmentEnabled ? '#2C2416' : 'rgba(255,255,255,0.4)',
                color: investmentEnabled ? '#F5EFE6' : '#2C2416',
                border: '1px solid #2C2416',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="num-font text-lg" style={{ fontWeight: 400 }}>
                    {investmentEnabled ? 'Aktif' : 'Yatırım ayır'}
                  </div>
                  <div className="ui-font text-xs mt-1" style={{ opacity: 0.7 }}>
                    Maaşının bir kısmını harcama dışı tut
                  </div>
                </div>
                <div className="w-10 h-10 flex items-center justify-center" style={{
                  border: '1px solid currentColor',
                  borderRadius: '50%'
                }}>
                  {investmentEnabled ? <Check size={16} /> : <Plus size={16} />}
                </div>
              </div>
            </div>

            {investmentEnabled && (
              <div className="fade-up mt-5 p-6" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid #D4C4A8' }}>
                {/* Mode toggle */}
                <div className="flex gap-1 mb-6 p-1" style={{ background: '#E8DDC9' }}>
                  <button
                    onClick={() => setInvestmentMode('percent')}
                    className="ui-font flex-1 py-2 text-xs transition-all"
                    style={{
                      background: investmentMode === 'percent' ? '#2C2416' : 'transparent',
                      color: investmentMode === 'percent' ? '#F5EFE6' : '#5C4F3A',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 500
                    }}
                  >
                    Yüzde
                  </button>
                  <button
                    onClick={() => setInvestmentMode('fixed')}
                    className="ui-font flex-1 py-2 text-xs transition-all"
                    style={{
                      background: investmentMode === 'fixed' ? '#2C2416' : 'transparent',
                      color: investmentMode === 'fixed' ? '#F5EFE6' : '#5C4F3A',
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                      fontWeight: 500
                    }}
                  >
                    Sabit Tutar
                  </button>
                </div>

                {investmentMode === 'percent' ? (
                  <div>
                    <div className="flex items-baseline justify-between mb-4">
                      <span className="ui-font text-xs" style={{ color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                        Maaş Yüzdesi
                      </span>
                      <div className="flex items-baseline gap-1">
                        <span className="num-font text-3xl" style={{ fontWeight: 400 }}>{investmentPercent}</span>
                        <span className="num-font text-lg" style={{ color: '#8B7355' }}>%</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={investmentPercent}
                      onChange={(e) => setInvestmentPercent(parseInt(e.target.value))}
                      className="w-full"
                    />
                    <div className="flex justify-between mt-2 ui-font text-xs" style={{ color: '#8B7355' }}>
                      <span>%5</span>
                      <span>%30</span>
                    </div>
                    {salary && (
                      <div className="mt-4 pt-4" style={{ borderTop: '1px solid #D4C4A8' }}>
                        <div className="flex justify-between items-baseline">
                          <span className="ui-font text-xs" style={{ color: '#5C4F3A' }}>Yatırıma ayrılacak</span>
                          <span className="num-font text-xl">{formatCurrency(parseFloat(salary) * investmentPercent / 100)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <label className="ui-font text-xs block mb-3" style={{ color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      Yatırım Tutarı
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        value={investmentAmount}
                        onChange={(e) => setInvestmentAmount(e.target.value)}
                        placeholder="0"
                        className="number-input w-full bg-transparent border-0 border-b outline-none num-font"
                        style={{
                          borderColor: '#8B7355',
                          fontSize: '28px',
                          fontWeight: 300,
                          paddingBottom: '6px',
                          paddingRight: '40px'
                        }}
                      />
                      <span className="num-font absolute right-0 bottom-2 text-lg" style={{ color: '#8B7355' }}>₺</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Summary Preview */}
          {salary && (
            <div className="fade-up delay-5 mb-10 p-6" style={{
              background: '#2C2416',
              color: '#F5EFE6',
            }}>
              <div className="ui-font text-xs mb-4" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', opacity: 0.6 }}>
                Önizleme
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-baseline">
                  <span className="ui-font text-sm" style={{ opacity: 0.7 }}>Maaş</span>
                  <span className="num-font text-xl">{formatCurrency(calculations.salaryNum)}</span>
                </div>
                {investmentEnabled && (
                  <div className="flex justify-between items-baseline">
                    <span className="ui-font text-sm" style={{ opacity: 0.7 }}>− Yatırım</span>
                    <span className="num-font text-xl">{formatCurrency(calculations.invAmount)}</span>
                  </div>
                )}
                <div className="pt-3 flex justify-between items-baseline" style={{ borderTop: '1px solid rgba(245,239,230,0.2)' }}>
                  <span className="ui-font text-sm">Harcanabilir</span>
                  <span className="num-font text-2xl" style={{ fontWeight: 400 }}>{formatCurrency(calculations.remaining)}</span>
                </div>
                <div className="pt-3 flex justify-between items-baseline">
                  <span className="ui-font text-sm" style={{ opacity: 0.7 }}>
                    Günlük limit ({calculations.daysUntilNextSalary} gün)
                  </span>
                  <span className="num-font text-2xl" style={{ fontWeight: 500, color: '#E8C77F' }}>
                    {formatCurrency(calculations.dailyLimit)}
                  </span>
                </div>
                {!calculations.hasSalaryDay && (
                  <div className="pt-3 ui-font text-xs" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                    Ay sonuna kadar olan günlere göre hesaplandı.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleSetupComplete}
            disabled={!salary}
            className="fade-up delay-5 w-full ui-font py-5 transition-all flex items-center justify-center gap-3 group"
            style={{
              background: (!salary) ? '#D4C4A8' : '#2C2416',
              color: (!salary) ? '#8B7355' : '#F5EFE6',
              cursor: (!salary) ? 'not-allowed' : 'pointer',
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              fontSize: '12px',
              fontWeight: 500
            }}
          >
            Panele Geç
            <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
          </button>
        </div>
      </div>
    );
  }

  // DASHBOARD
  const progressPercent = todayBudget > 0 ? Math.min((todayTotal / todayBudget) * 100, 100) : 0;
  const isOverBudget = todayTotal > todayBudget;

  return (
    <div className="min-h-screen w-full" style={{
      fontFamily: "'Fraunces', Georgia, serif",
      background: 'linear-gradient(135deg, #F5EFE6 0%, #E8DDC9 100%)',
      color: '#2C2416'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500;9..144,600;9..144,700;9..144,800&family=Inter:wght@300;400;500;600&display=swap');
        .num-font { font-family: 'Fraunces', serif; font-feature-settings: 'tnum'; }
        .ui-font { font-family: 'Inter', sans-serif; }
        
        .number-input::-webkit-outer-spin-button,
        .number-input::-webkit-inner-spin-button {
          -webkit-appearance: none;
          margin: 0;
        }
        .number-input { -moz-appearance: textfield; }
        
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(15px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .slide-up { animation: slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .scale-in { animation: scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
        
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .fade-in { animation: fadeIn 0.3s ease forwards; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>

      <div className="max-w-2xl mx-auto px-5 py-8 md:py-12">
        {/* User bar */}
        <div className="flex items-center justify-between mb-6 ui-font text-xs">
          <div className="flex items-center gap-2 min-w-0" style={{ color: '#8B7355' }}>
            {syncStatus === 'syncing' ? (
              <><Loader size={11} className="spin flex-shrink-0" style={{ color: '#B8924A' }} /><span className="truncate">Senkronize ediliyor...</span></>
            ) : syncStatus === 'error' ? (
              <><CloudOff size={11} className="flex-shrink-0" style={{ color: '#C97B5C' }} /><span>Bağlantı hatası</span></>
            ) : (
              <><Cloud size={11} className="flex-shrink-0" style={{ color: '#7AB05E' }} /><span className="truncate">{session.user.email}</span></>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-1 transition-all"
            style={{ color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}
          >
            <LogOut size={11} />
            <span>Çıkış</span>
          </button>
        </div>
        
        {/* Header */}
        <div className="flex items-center justify-between mb-8 gap-3">
          <div className="min-w-0">
            <div className="ui-font text-xs mb-1 truncate" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355' }}>
              {todayFormatted.full}
            </div>
            <h1 className="text-3xl md:text-4xl" style={{ fontWeight: 300, letterSpacing: '-0.02em' }}>
              <em style={{ fontWeight: 400 }}>Bugünkü</em> bütçen
            </h1>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button 
              onClick={() => {
                setCalendarMonth(new Date().getMonth());
                setCalendarYear(new Date().getFullYear());
                setShowCalendar(true);
              }}
              className="ui-font text-xs flex items-center gap-2 px-4 py-2 transition-all hover:bg-[#2C2416] hover:text-[#F5EFE6]"
              style={{
                border: '1px solid #2C2416',
                background: '#2C2416',
                color: '#F5EFE6',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 500
              }}
              title="Takvim & Geçmiş"
            >
              <CalendarDays size={14} />
              <span className="hidden sm:inline">Takvim</span>
            </button>
            <button 
              onClick={() => setStep('setup')}
              className="ui-font text-xs px-4 py-2 transition-all"
              style={{
                border: '1px solid #2C2416',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 500
              }}
            >
              Ayarlar
            </button>
          </div>
        </div>

        {/* Main Budget Card */}
        <div className="mb-6 p-7 md:p-9 relative overflow-hidden" style={{
          background: '#2C2416',
          color: '#F5EFE6'
        }}>
          {/* decorative corner */}
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10" style={{
            background: 'radial-gradient(circle at top right, #E8C77F 0%, transparent 70%)'
          }}></div>

          <div className="ui-font text-xs mb-2 relative" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>
            Bugün Kalan
          </div>
          
          <div className="num-font text-6xl md:text-7xl mb-6 relative" style={{ 
            fontWeight: 300, 
            letterSpacing: '-0.03em',
            color: isOverBudget ? '#E89B7F' : '#F5EFE6'
          }}>
            {formatCurrency(todayRemaining)}
          </div>

          {/* Progress bar */}
          <div className="relative mb-2">
            <div className="h-1 w-full rounded-full overflow-hidden" style={{ background: 'rgba(245,239,230,0.15)' }}>
              <div 
                className="h-full rounded-full transition-all duration-500"
                style={{ 
                  width: `${progressPercent}%`,
                  background: isOverBudget ? '#E89B7F' : '#E8C77F'
                }}
              ></div>
            </div>
          </div>

          <div className="flex justify-between items-baseline mt-3 ui-font text-xs" style={{ opacity: 0.7 }}>
            <span>{formatCurrency(todayTotal)} harcandı</span>
            <span>{formatCurrency(todayBudget)} limit</span>
          </div>

          {calculations.periodHistorySpent > 0 && (
            <div className="mt-4 pt-4 ui-font text-xs flex justify-between items-center" style={{ borderTop: '1px solid rgba(245,239,230,0.15)', opacity: 0.7 }}>
              <span>Bu döneme kadar harcanan</span>
              <span className="num-font">
                {formatCurrency(calculations.periodHistorySpent)}
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="p-5" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid #D4C4A8' }}>
            <div className="ui-font text-xs mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355' }}>
              Aylık Bakiye
            </div>
            <div className="num-font text-2xl" style={{ fontWeight: 400 }}>
              {formatCurrency(overallRemaining)}
            </div>
          </div>
          <div className="p-5" style={{ background: 'rgba(255,255,255,0.5)', border: '1px solid #D4C4A8' }}>
            <div className="ui-font text-xs mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355' }}>
              {calculations.hasSalaryDay ? 'Maaşa Kalan' : 'Aya Kalan'}
            </div>
            <div className="flex items-baseline gap-2">
              <div className="num-font text-2xl" style={{ fontWeight: 400 }}>
                {calculations.daysUntilNextSalary}
              </div>
              <div className="ui-font text-xs" style={{ color: '#8B7355' }}>gün</div>
            </div>
          </div>
        </div>

        {/* Personalized Message */}
        {calculations.hasSalaryDay && calculations.nextSalaryDate && (
          <div className="mb-6 p-4" style={{ background: 'rgba(232, 199, 127, 0.15)', borderLeft: '3px solid #B8924A' }}>
            <div className="ui-font text-xs flex items-start gap-2" style={{ color: '#5C4F3A', lineHeight: 1.5 }}>
              <Calendar size={14} className="flex-shrink-0 mt-0.5" style={{ color: '#B8924A' }} />
              <span>
                Bir sonraki maaş günün <strong>{formatDate(calculations.nextSalaryDate).short}</strong> — {calculations.daysUntilNextSalary} gün sonra. Günlük {formatCurrency(calculations.dailyLimit)} ile rahat ulaşırsın.
              </span>
            </div>
          </div>
        )}

        {/* Today's Expenses */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="ui-font text-xs" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
              Bugünkü Harcamalar — {todayExpenses.length}
            </h2>
            <button
              onClick={() => setShowExpenseModal(true)}
              className="ui-font text-xs flex items-center gap-2 px-4 py-2 transition-all"
              style={{
                background: '#2C2416',
                color: '#F5EFE6',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                fontWeight: 500
              }}
            >
              <Plus size={14} />
              Ekle
            </button>
          </div>

          {todayExpenses.length === 0 ? (
            <div className="text-center py-12" style={{ background: 'rgba(255,255,255,0.3)', border: '1px dashed #D4C4A8' }}>
              <div className="ui-font text-sm" style={{ color: '#8B7355' }}>
                Henüz harcama yok
              </div>
              <div className="ui-font text-xs mt-1" style={{ color: '#A89678' }}>
                Yukarıdaki "Ekle" düğmesini kullan
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {todayExpenses.slice().reverse().map((exp, idx) => {
                const cat = getCategoryInfo(exp.category);
                const Icon = cat.icon;
                return (
                  <div key={idx} className="slide-up flex items-center gap-4 p-4" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #E8DDC9' }}>
                    <div className="w-10 h-10 flex items-center justify-center flex-shrink-0" style={{ background: cat.color, color: '#F5EFE6' }}>
                      <Icon size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="num-font text-base" style={{ fontWeight: 500 }}>
                        {cat.label}
                      </div>
                      {exp.note && (
                        <div className="ui-font text-xs mt-0.5 truncate" style={{ color: '#8B7355' }}>
                          {exp.note}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="num-font text-lg" style={{ fontWeight: 500 }}>
                        −{formatCurrency(exp.amount)}
                      </div>
                      <div className="ui-font text-xs" style={{ color: '#A89678' }}>
                        {exp.time}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* End of Day Button */}
        <button
          onClick={handleEndDay}
          className="w-full ui-font py-5 transition-all flex items-center justify-center gap-3 group"
          style={{
            background: 'transparent',
            border: '2px solid #2C2416',
            color: '#2C2416',
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            fontSize: '12px',
            fontWeight: 500
          }}
        >
          Günü Bitir
          <ChevronRight size={16} className="transition-transform group-hover:translate-x-1" />
        </button>

        {/* Reset link */}
        <div className="mt-8 text-center">
          <button
            onClick={handleReset}
            className="ui-font text-xs underline transition-all"
            style={{ color: '#A89678', letterSpacing: '0.05em' }}
          >
            Tüm verileri sıfırla
          </button>
        </div>
      </div>

      {/* Calendar Modal */}
      {showCalendar && (() => {
        const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
        const dayNamesShort = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
        
        const firstDay = new Date(calendarYear, calendarMonth, 1);
        const lastDay = new Date(calendarYear, calendarMonth + 1, 0);
        const daysInMonth = lastDay.getDate();
        // Pazartesi başlangıçlı haftalar (0 = Pazartesi)
        let firstDayOfWeek = firstDay.getDay() - 1;
        if (firstDayOfWeek < 0) firstDayOfWeek = 6;
        
        const daysArray = [];
        for (let i = 0; i < firstDayOfWeek; i++) daysArray.push(null);
        for (let d = 1; d <= daysInMonth; d++) daysArray.push(d);
        
        const goPrevMonth = () => {
          if (calendarMonth === 0) {
            setCalendarMonth(11);
            setCalendarYear(calendarYear - 1);
          } else {
            setCalendarMonth(calendarMonth - 1);
          }
        };
        const goNextMonth = () => {
          if (calendarMonth === 11) {
            setCalendarMonth(0);
            setCalendarYear(calendarYear + 1);
          } else {
            setCalendarMonth(calendarMonth + 1);
          }
        };
        
        // İstatistikler bu ay için
        const monthHistory = Object.values(dayHistory).filter(h => {
          const d = new Date(h.date);
          return d.getMonth() === calendarMonth && d.getFullYear() === calendarYear;
        });
        const totalSaved = monthHistory.reduce((sum, h) => sum + (h.remaining > 0 ? h.remaining : 0), 0);
        const totalOver = monthHistory.reduce((sum, h) => sum + (h.remaining < 0 ? Math.abs(h.remaining) : 0), 0);
        const goodDays = monthHistory.filter(h => h.remaining >= 0).length;
        const badDays = monthHistory.filter(h => h.remaining < 0).length;
        
        const selectedEntry = selectedDate ? dayHistory[selectedDate] : null;
        
        return (
          <div 
            className="fade-in fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
            style={{ background: 'rgba(44,36,22,0.7)' }}
            onClick={() => { setShowCalendar(false); setSelectedDate(null); }}
          >
            <div 
              className="scale-in w-full max-w-lg"
              style={{ background: '#F5EFE6', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 md:p-7 flex items-center justify-between" style={{ background: '#2C2416', color: '#F5EFE6' }}>
                <div>
                  <div className="ui-font text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>
                    Geçmiş
                  </div>
                  <div className="text-2xl" style={{ fontWeight: 400 }}>
                    <em>{monthNames[calendarMonth]}</em> {calendarYear}
                  </div>
                </div>
                <button
                  onClick={() => { setShowCalendar(false); setSelectedDate(null); }}
                  className="w-9 h-9 flex items-center justify-center"
                  style={{ border: '1px solid #F5EFE6' }}
                >
                  <X size={16} />
                </button>
              </div>

              <div className="p-6 md:p-7">
                {/* Month nav */}
                <div className="flex items-center justify-between mb-6">
                  <button
                    onClick={goPrevMonth}
                    className="w-9 h-9 flex items-center justify-center transition-all"
                    style={{ border: '1px solid #2C2416', color: '#2C2416' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="ui-font text-sm" style={{ color: '#5C4F3A', fontWeight: 500 }}>
                    {monthNames[calendarMonth]} {calendarYear}
                  </div>
                  <button
                    onClick={goNextMonth}
                    className="w-9 h-9 flex items-center justify-center transition-all"
                    style={{ border: '1px solid #2C2416', color: '#2C2416' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNamesShort.map(d => (
                    <div key={d} className="ui-font text-xs text-center py-2" style={{ color: '#8B7355', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                      {d}
                    </div>
                  ))}
                </div>

                {/* Calendar grid */}
                <div className="grid grid-cols-7 gap-1 mb-6">
                  {daysArray.map((day, idx) => {
                    if (day === null) {
                      return <div key={`empty-${idx}`}></div>;
                    }
                    const dateKey = `${calendarYear}-${String(calendarMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                    const entry = dayHistory[dateKey];
                    const isToday = dateKey === todayKey;
                    const isSelected = dateKey === selectedDate;
                    const hasData = !!entry;
                    const isPositive = entry && entry.remaining >= 0;
                    const isFuture = new Date(calendarYear, calendarMonth, day) > new Date();
                    
                    let bgColor = 'transparent';
                    let textColor = '#2C2416';
                    let borderColor = 'transparent';
                    
                    if (hasData) {
                      bgColor = isPositive ? '#A8D08D' : '#E89B7F';
                      textColor = '#2C2416';
                    } else if (isFuture) {
                      textColor = '#C9B89A';
                    }
                    
                    if (isToday) {
                      borderColor = '#2C2416';
                    }
                    if (isSelected) {
                      borderColor = '#2C2416';
                    }
                    
                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          if (isFuture) return; // gelecek tıklanamaz
                          setSelectedDate(isSelected ? null : dateKey);
                        }}
                        disabled={isFuture}
                        className="aspect-square flex items-center justify-center num-font text-sm transition-all relative"
                        style={{
                          background: bgColor,
                          color: textColor,
                          border: `2px solid ${borderColor}`,
                          fontWeight: hasData ? 500 : 400,
                          cursor: isFuture ? 'default' : 'pointer',
                          opacity: isFuture ? 0.4 : 1
                        }}
                      >
                        {day}
                        {isToday && !hasData && (
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#2C2416' }}></div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-6 pb-6" style={{ borderBottom: '1px solid #D4C4A8' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ background: '#A8D08D' }}></div>
                    <span className="ui-font text-xs" style={{ color: '#5C4F3A' }}>Tasarruf</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ background: '#E89B7F' }}></div>
                    <span className="ui-font text-xs" style={{ color: '#5C4F3A' }}>Aşım</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ border: '2px solid #2C2416' }}></div>
                    <span className="ui-font text-xs" style={{ color: '#5C4F3A' }}>Bugün</span>
                  </div>
                </div>

                {/* Selected day detail OR month stats */}
                {selectedDate ? (
                  selectedEntry ? (
                    <div className="scale-in">
                      <div className="flex items-center justify-between mb-4">
                        <div className="ui-font text-xs" style={{ color: '#8B7355', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
                          {formatDate(new Date(selectedDate)).full}
                        </div>
                        <button
                          onClick={() => setSelectedDate(null)}
                          className="ui-font text-xs underline"
                          style={{ color: '#8B7355' }}
                        >
                          kapat
                        </button>
                      </div>
                      
                      <div className="p-5 mb-4" style={{ 
                        background: selectedEntry.remaining >= 0 ? 'rgba(168, 208, 141, 0.2)' : 'rgba(232, 155, 127, 0.2)',
                        borderLeft: `3px solid ${selectedEntry.remaining >= 0 ? '#7AB05E' : '#C97B5C'}`
                      }}>
                        <div className="ui-font text-xs mb-1" style={{ color: '#5C4F3A' }}>
                          {selectedEntry.remaining >= 0 ? 'Tasarruf' : 'Aşım'}
                        </div>
                        <div className="num-font text-3xl" style={{ 
                          fontWeight: 400,
                          color: selectedEntry.remaining >= 0 ? '#5C8A3E' : '#A8554E'
                        }}>
                          {selectedEntry.remaining >= 0 ? '+' : ''}{formatCurrency(selectedEntry.remaining)}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-5">
                        <div className="flex justify-between items-baseline">
                          <span className="ui-font text-sm" style={{ color: '#5C4F3A' }}>Günlük limit</span>
                          <span className="num-font text-base">{formatCurrency(selectedEntry.budget)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="ui-font text-sm" style={{ color: '#5C4F3A' }}>Toplam harcama</span>
                          <span className="num-font text-base">−{formatCurrency(selectedEntry.spent)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="ui-font text-sm" style={{ color: '#5C4F3A' }}>İşlem sayısı</span>
                          <span className="num-font text-base">{selectedEntry.expenses.length}</span>
                        </div>
                      </div>
                      
                      {/* Harcama listesi (silinebilir/düzenlenebilir) */}
                      {selectedEntry.expenses.length > 0 && (
                        <div className="mb-5">
                          <div className="ui-font text-xs mb-3" style={{ color: '#8B7355', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 }}>
                            Harcamalar
                          </div>
                          <div className="space-y-2">
                            {selectedEntry.expenses.map((exp, idx) => {
                              const cat = getCategoryInfo(exp.category);
                              const Icon = cat.icon;
                              return (
                                <div key={idx} className="flex items-center gap-3 p-3" style={{ background: 'rgba(255,255,255,0.6)', border: '1px solid #E8DDC9' }}>
                                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: cat.color, color: '#F5EFE6' }}>
                                    <Icon size={14} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="num-font text-sm" style={{ fontWeight: 500 }}>
                                      {cat.label}
                                    </div>
                                    {exp.note && (
                                      <div className="ui-font text-xs truncate" style={{ color: '#8B7355' }}>
                                        {exp.note}
                                      </div>
                                    )}
                                  </div>
                                  <div className="num-font text-sm flex-shrink-0" style={{ fontWeight: 500 }}>
                                    −{formatCurrency(exp.amount)}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => setEditingExpense({ dateKey: selectedDate, index: idx, ...exp })}
                                      className="w-7 h-7 flex items-center justify-center transition-all"
                                      style={{ border: '1px solid #8B7355', color: '#5C4F3A' }}
                                      title="Düzenle"
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => deleteHistoryExpense(selectedDate, idx)}
                                      className="w-7 h-7 flex items-center justify-center transition-all"
                                      style={{ border: '1px solid #C97B5C', color: '#A85751' }}
                                      title="Sil"
                                    >
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="flex gap-2 mb-4">
                        <button
                          onClick={() => {
                            setHistoryAddDate(selectedDate);
                            setShowHistoryAddModal(true);
                            setExpenseAmount('');
                            setExpenseCategory('');
                            setExpenseNote('');
                          }}
                          className="flex-1 ui-font py-3 transition-all flex items-center justify-center gap-2"
                          style={{
                            background: '#2C2416',
                            color: '#F5EFE6',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          <Plus size={12} />
                          Harcama Ekle
                        </button>
                        <button
                          onClick={() => deleteHistoryDay(selectedDate)}
                          className="ui-font py-3 px-4 transition-all"
                          style={{
                            background: 'transparent',
                            border: '1px solid #C97B5C',
                            color: '#A85751',
                            letterSpacing: '0.1em',
                            textTransform: 'uppercase',
                            fontSize: '11px',
                            fontWeight: 500
                          }}
                        >
                          Günü Sil
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Seçilen gün ama veri yok */
                    <div className="scale-in">
                      <div className="flex items-center justify-between mb-4">
                        <div className="ui-font text-xs" style={{ color: '#8B7355', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
                          {formatDate(new Date(selectedDate)).full}
                        </div>
                        <button
                          onClick={() => setSelectedDate(null)}
                          className="ui-font text-xs underline"
                          style={{ color: '#8B7355' }}
                        >
                          kapat
                        </button>
                      </div>
                      <div className="p-6 text-center mb-4" style={{ background: 'rgba(255,255,255,0.5)', border: '1px dashed #D4C4A8' }}>
                        <div className="ui-font text-sm mb-2" style={{ color: '#5C4F3A' }}>
                          Bu güne ait kayıt yok
                        </div>
                        <div className="ui-font text-xs" style={{ color: '#8B7355', lineHeight: 1.5 }}>
                          Unuttuğun bir harcamayı geriye dönük olarak ekleyebilirsin
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setHistoryAddDate(selectedDate);
                          setShowHistoryAddModal(true);
                          setExpenseAmount('');
                          setExpenseCategory('');
                          setExpenseNote('');
                        }}
                        className="w-full ui-font py-3 transition-all flex items-center justify-center gap-2"
                        style={{
                          background: '#2C2416',
                          color: '#F5EFE6',
                          letterSpacing: '0.1em',
                          textTransform: 'uppercase',
                          fontSize: '11px',
                          fontWeight: 500
                        }}
                      >
                        <Plus size={12} />
                        Harcama Ekle
                      </button>
                    </div>
                  )
                ) : (
                  <div>
                    <div className="ui-font text-xs mb-3" style={{ color: '#8B7355', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
                      Bu Ay Özet
                    </div>
                    {monthHistory.length === 0 ? (
                      <div className="text-center py-8 ui-font text-sm" style={{ color: '#8B7355' }}>
                        Bu ay için henüz veri yok.
                        <div className="text-xs mt-1" style={{ color: '#A89678' }}>
                          Gün sonunda "Günü Bitir" butonuna basınca takvime kayıt düşer.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="p-4" style={{ background: 'rgba(168, 208, 141, 0.2)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp size={12} style={{ color: '#5C8A3E' }} />
                              <span className="ui-font text-xs" style={{ color: '#5C4F3A' }}>Tasarruf</span>
                            </div>
                            <div className="num-font text-lg" style={{ color: '#5C8A3E', fontWeight: 500 }}>
                              {formatCurrency(totalSaved)}
                            </div>
                            <div className="ui-font text-xs mt-1" style={{ color: '#8B7355' }}>{goodDays} gün</div>
                          </div>
                          <div className="p-4" style={{ background: 'rgba(232, 155, 127, 0.2)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingDown size={12} style={{ color: '#A8554E' }} />
                              <span className="ui-font text-xs" style={{ color: '#5C4F3A' }}>Aşım</span>
                            </div>
                            <div className="num-font text-lg" style={{ color: '#A8554E', fontWeight: 500 }}>
                              {formatCurrency(totalOver)}
                            </div>
                            <div className="ui-font text-xs mt-1" style={{ color: '#8B7355' }}>{badDays} gün</div>
                          </div>
                        </div>
                        <div className="ui-font text-xs text-center py-2" style={{ color: '#8B7355', fontStyle: 'italic' }}>
                          Detay için bir güne tıkla — verisiz günlere de geriye dönük harcama ekleyebilirsin
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* History Add Expense Modal — geçmişe veya verisiz güne harcama ekle */}
      {showHistoryAddModal && (
        <div 
          className="fade-in fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          style={{ background: 'rgba(44,36,22,0.7)' }}
          onClick={() => setShowHistoryAddModal(false)}
        >
          <div 
            className="scale-in w-full max-w-lg p-7 md:p-9"
            style={{ background: '#F5EFE6', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-7">
              <div>
                <div className="ui-font text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355' }}>
                  {historyAddDate && formatDate(new Date(historyAddDate)).full}
                </div>
                <h3 className="text-2xl" style={{ fontWeight: 400 }}>
                  Geriye dönük <em>harcama</em>
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryAddModal(false)}
                className="w-9 h-9 flex items-center justify-center"
                style={{ border: '1px solid #2C2416' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-6">
              <label className="ui-font text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="number-input w-full bg-transparent border-0 border-b-2 outline-none num-font"
                  style={{
                    borderColor: '#2C2416',
                    fontSize: '40px',
                    fontWeight: 300,
                    paddingBottom: '8px',
                    paddingRight: '50px'
                  }}
                />
                <span className="num-font absolute right-0 bottom-2 text-2xl" style={{ color: '#8B7355' }}>₺</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="ui-font text-xs block mb-3" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Kategori
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isActive = expenseCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setExpenseCategory(cat.id)}
                      className="flex flex-col items-center gap-2 py-3 px-2 transition-all"
                      style={{
                        background: isActive ? cat.color : 'rgba(255,255,255,0.5)',
                        color: isActive ? '#F5EFE6' : '#2C2416',
                        border: `1px solid ${isActive ? cat.color : '#D4C4A8'}`
                      }}
                    >
                      <Icon size={20} />
                      <span className="ui-font text-xs" style={{ fontWeight: 500 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-7">
              <label className="ui-font text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Not <span style={{ textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic' }}>(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="örn. öğle yemeği"
                className="ui-font w-full bg-transparent border-0 border-b outline-none py-2"
                style={{
                  borderColor: '#8B7355',
                  fontSize: '15px',
                  color: '#2C2416'
                }}
              />
            </div>

            <button
              onClick={() => {
                if (expenseAmount && expenseCategory && historyAddDate) {
                  const newExp = {
                    amount: parseFloat(expenseAmount),
                    category: expenseCategory,
                    note: expenseNote,
                    time: '—'
                  };
                  addExpenseToHistory(historyAddDate, newExp);
                  setSelectedDate(historyAddDate);
                  setShowHistoryAddModal(false);
                }
              }}
              disabled={!expenseAmount || !expenseCategory}
              className="w-full ui-font py-4 transition-all"
              style={{
                background: (!expenseAmount || !expenseCategory) ? '#D4C4A8' : '#2C2416',
                color: (!expenseAmount || !expenseCategory) ? '#8B7355' : '#F5EFE6',
                cursor: (!expenseAmount || !expenseCategory) ? 'not-allowed' : 'pointer',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Geçmişe Ekle
            </button>
          </div>
        </div>
      )}

      {/* Edit Expense Modal — geçmiş bir harcamayı düzenle */}
      {editingExpense && (
        <div 
          className="fade-in fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          style={{ background: 'rgba(44,36,22,0.7)' }}
          onClick={() => setEditingExpense(null)}
        >
          <div 
            className="scale-in w-full max-w-lg p-7 md:p-9"
            style={{ background: '#F5EFE6', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-7">
              <div>
                <div className="ui-font text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355' }}>
                  Düzenle
                </div>
                <h3 className="text-2xl" style={{ fontWeight: 400 }}>
                  <em>Harcamayı</em> güncelle
                </h3>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="w-9 h-9 flex items-center justify-center"
                style={{ border: '1px solid #2C2416' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-6">
              <label className="ui-font text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  autoFocus
                  className="number-input w-full bg-transparent border-0 border-b-2 outline-none num-font"
                  style={{
                    borderColor: '#2C2416',
                    fontSize: '40px',
                    fontWeight: 300,
                    paddingBottom: '8px',
                    paddingRight: '50px'
                  }}
                />
                <span className="num-font absolute right-0 bottom-2 text-2xl" style={{ color: '#8B7355' }}>₺</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="ui-font text-xs block mb-3" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Kategori
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isActive = editingExpense.category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setEditingExpense({ ...editingExpense, category: cat.id })}
                      className="flex flex-col items-center gap-2 py-3 px-2 transition-all"
                      style={{
                        background: isActive ? cat.color : 'rgba(255,255,255,0.5)',
                        color: isActive ? '#F5EFE6' : '#2C2416',
                        border: `1px solid ${isActive ? cat.color : '#D4C4A8'}`
                      }}
                    >
                      <Icon size={20} />
                      <span className="ui-font text-xs" style={{ fontWeight: 500 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-7">
              <label className="ui-font text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Not
              </label>
              <input
                type="text"
                value={editingExpense.note || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, note: e.target.value })}
                placeholder="örn. öğle yemeği"
                className="ui-font w-full bg-transparent border-0 border-b outline-none py-2"
                style={{
                  borderColor: '#8B7355',
                  fontSize: '15px',
                  color: '#2C2416'
                }}
              />
            </div>

            <button
              onClick={() => {
                if (editingExpense.amount > 0 && editingExpense.category) {
                  updateHistoryExpense(editingExpense.dateKey, editingExpense.index, {
                    amount: editingExpense.amount,
                    category: editingExpense.category,
                    note: editingExpense.note || ''
                  });
                }
              }}
              disabled={!editingExpense.amount || !editingExpense.category}
              className="w-full ui-font py-4 transition-all"
              style={{
                background: (!editingExpense.amount || !editingExpense.category) ? '#D4C4A8' : '#2C2416',
                color: (!editingExpense.amount || !editingExpense.category) ? '#8B7355' : '#F5EFE6',
                cursor: (!editingExpense.amount || !editingExpense.category) ? 'not-allowed' : 'pointer',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Güncelle
            </button>
          </div>
        </div>
      )}

      {/* Add Expense Modal */}
      {showExpenseModal && (
        <div 
          className="fade-in fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          style={{ background: 'rgba(44,36,22,0.6)' }}
          onClick={() => setShowExpenseModal(false)}
        >
          <div 
            className="scale-in w-full max-w-lg p-7 md:p-9"
            style={{ background: '#F5EFE6', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-7">
              <div>
                <div className="ui-font text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355' }}>
                  Yeni Kayıt
                </div>
                <h3 className="text-2xl" style={{ fontWeight: 400 }}>
                  <em>Harcama</em> ekle
                </h3>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-9 h-9 flex items-center justify-center"
                style={{ border: '1px solid #2C2416' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="ui-font text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="number-input w-full bg-transparent border-0 border-b-2 outline-none num-font"
                  style={{
                    borderColor: '#2C2416',
                    fontSize: '40px',
                    fontWeight: 300,
                    paddingBottom: '8px',
                    paddingRight: '50px'
                  }}
                />
                <span className="num-font absolute right-0 bottom-2 text-2xl" style={{ color: '#8B7355' }}>₺</span>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <label className="ui-font text-xs block mb-3" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Kategori
              </label>
              <div className="grid grid-cols-4 gap-2">
                {categories.map(cat => {
                  const Icon = cat.icon;
                  const isActive = expenseCategory === cat.id;
                  return (
                    <button
                      key={cat.id}
                      onClick={() => setExpenseCategory(cat.id)}
                      className="flex flex-col items-center gap-2 py-3 px-2 transition-all"
                      style={{
                        background: isActive ? cat.color : 'rgba(255,255,255,0.5)',
                        color: isActive ? '#F5EFE6' : '#2C2416',
                        border: `1px solid ${isActive ? cat.color : '#D4C4A8'}`
                      }}
                    >
                      <Icon size={20} />
                      <span className="ui-font text-xs" style={{ fontWeight: 500 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="mb-7">
              <label className="ui-font text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                Not <span style={{ textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic' }}>(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="örn. öğle yemeği"
                className="ui-font w-full bg-transparent border-0 border-b outline-none py-2"
                style={{
                  borderColor: '#8B7355',
                  fontSize: '15px',
                  color: '#2C2416'
                }}
              />
            </div>

            <button
              onClick={handleAddExpense}
              disabled={!expenseAmount || !expenseCategory}
              className="w-full ui-font py-4 transition-all"
              style={{
                background: (!expenseAmount || !expenseCategory) ? '#D4C4A8' : '#2C2416',
                color: (!expenseAmount || !expenseCategory) ? '#8B7355' : '#F5EFE6',
                cursor: (!expenseAmount || !expenseCategory) ? 'not-allowed' : 'pointer',
                letterSpacing: '0.15em',
                textTransform: 'uppercase',
                fontSize: '12px',
                fontWeight: 500
              }}
            >
              Kaydet
            </button>
          </div>
        </div>
      )}

      {/* Day Summary Modal */}
      {showSummaryModal && daySummary && (
        <div 
          className="fade-in fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6"
          style={{ background: 'rgba(44,36,22,0.7)' }}
        >
          <div 
            className="scale-in w-full max-w-lg"
            style={{ background: '#F5EFE6', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header dark */}
            <div className="p-7 md:p-9" style={{ background: '#2C2416', color: '#F5EFE6' }}>
              <div className="ui-font text-xs mb-2" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>
                {todayFormatted.full} — Bilanço
              </div>
              <div className="text-4xl mb-1" style={{ fontWeight: 300 }}>
                {daySummary.remaining >= 0 ? <span><em style={{ fontWeight: 400, color: '#A8D08D' }}>Tasarruf</em> ettin.</span> : <span><em style={{ fontWeight: 400, color: '#E89B7F' }}>Limit</em> aşıldı.</span>}
              </div>
              <div className="num-font text-5xl mt-4" style={{ 
                fontWeight: 400, 
                letterSpacing: '-0.02em',
                color: daySummary.remaining >= 0 ? '#A8D08D' : '#E89B7F'
              }}>
                {daySummary.remaining >= 0 ? '+' : ''}{formatCurrency(daySummary.remaining)}
              </div>
            </div>

            {/* Body */}
            <div className="p-7 md:p-9">
              {/* Stats */}
              <div className="space-y-4 mb-7 pb-7" style={{ borderBottom: '1px solid #D4C4A8' }}>
                <div className="flex justify-between items-baseline">
                  <span className="ui-font text-sm" style={{ color: '#5C4F3A' }}>Günlük limit</span>
                  <span className="num-font text-lg">{formatCurrency(daySummary.budget)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="ui-font text-sm" style={{ color: '#5C4F3A' }}>Toplam harcama</span>
                  <span className="num-font text-lg">−{formatCurrency(daySummary.spent)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="ui-font text-sm" style={{ color: '#5C4F3A' }}>İşlem sayısı</span>
                  <span className="num-font text-lg">{daySummary.expenses.length}</span>
                </div>
              </div>

              {/* Category breakdown */}
              {daySummary.expenses.length > 0 && (
                <div className="mb-7">
                  <div className="ui-font text-xs mb-4" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355', fontWeight: 500 }}>
                    Kategori Dağılımı
                  </div>
                  <div className="space-y-3">
                    {Object.entries(
                      daySummary.expenses.reduce((acc, e) => {
                        acc[e.category] = (acc[e.category] || 0) + e.amount;
                        return acc;
                      }, {})
                    )
                    .sort((a, b) => b[1] - a[1])
                    .map(([catId, amount]) => {
                      const cat = getCategoryInfo(catId);
                      const Icon = cat.icon;
                      const pct = (amount / daySummary.spent) * 100;
                      return (
                        <div key={catId}>
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 flex items-center justify-center" style={{ background: cat.color, color: '#F5EFE6' }}>
                                <Icon size={12} />
                              </div>
                              <span className="ui-font text-sm" style={{ fontWeight: 500 }}>{cat.label}</span>
                            </div>
                            <span className="num-font text-sm">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-1 w-full" style={{ background: '#E8DDC9' }}>
                            <div className="h-full transition-all" style={{ width: `${pct}%`, background: cat.color }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="mb-6 p-4" style={{ background: 'rgba(255,255,255,0.5)', borderLeft: `3px solid ${daySummary.remaining >= 0 ? '#A8D08D' : '#E89B7F'}` }}>
                <div className="ui-font text-sm" style={{ color: '#5C4F3A', lineHeight: 1.6 }}>
                  {daySummary.remaining >= 0 
                    ? `Harika! ${formatCurrency(daySummary.remaining)} tasarruf ettin. Bu tutar kalan günlere yayılacak — ileriki günlerin biraz daha rahat geçecek.`
                    : `Limit ${formatCurrency(Math.abs(daySummary.remaining))} aşıldı. Bu fark kalan günlere yayılacak, tek güne yüklenmeyecek.`
                  }
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowSummaryModal(false)}
                  className="flex-1 ui-font py-4 transition-all"
                  style={{
                    background: 'transparent',
                    border: '1px solid #2C2416',
                    color: '#2C2416',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 500
                  }}
                >
                  Geri
                </button>
                <button
                  onClick={confirmEndDay}
                  className="flex-1 ui-font py-4 transition-all"
                  style={{
                    background: '#2C2416',
                    color: '#F5EFE6',
                    letterSpacing: '0.15em',
                    textTransform: 'uppercase',
                    fontSize: '11px',
                    fontWeight: 500
                  }}
                >
                  Onayla & Sonraki Gün
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog — özel onay penceresi (window.confirm yerine) */}
      {confirmDialog && (
        <div 
          className="fade-in fixed inset-0 flex items-center justify-center p-4"
          style={{ background: 'rgba(44,36,22,0.85)', zIndex: 100 }}
          onClick={() => setConfirmDialog(null)}
        >
          <div 
            className="scale-in w-full max-w-sm p-7"
            style={{ background: '#F5EFE6' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="ui-font text-xs mb-2" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#A85751', fontWeight: 500 }}>
              Onay Gerekli
            </div>
            <h3 className="text-2xl mb-3" style={{ fontWeight: 400, letterSpacing: '-0.01em' }}>
              {confirmDialog.title}
            </h3>
            <p className="ui-font text-sm mb-7" style={{ color: '#5C4F3A', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 ui-font py-3 transition-all"
                style={{
                  background: 'transparent',
                  border: '1px solid #2C2416',
                  color: '#2C2416',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  fontWeight: 500
                }}
              >
                Vazgeç
              </button>
              <button
                onClick={confirmDialog.onConfirm}
                className="flex-1 ui-font py-3 transition-all"
                style={{
                  background: '#A85751',
                  color: '#F5EFE6',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  fontSize: '11px',
                  fontWeight: 500
                }}
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
