import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Wallet, TrendingUp, Calendar, Plus, X, Check, ArrowRight, Coffee, ShoppingBag, Car, Home, Heart, Sparkles, MoreHorizontal, ChevronRight, ChevronLeft, Tag, CalendarDays, TrendingDown, LogOut, Cloud, CloudOff, Loader, Activity, HelpCircle } from 'lucide-react';
import { supabase } from './supabase';
import Auth from './Auth';
import InvestmentPage from './Investment';

const STORAGE_KEY = 'budget_app_data_v1';

export default function App() {
  // Auth state
  const [session, setSession] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [syncStatus, setSyncStatus] = useState('idle'); // 'idle' | 'loading' | 'syncing' | 'synced' | 'error'
  
    const [showTutorial, setShowTutorial] = useState(false);
  const [tutorialStep, setTutorialStep] = useState(0);
  const [tutorialCompleted, setTutorialCompleted] = useState(true);

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
  
  // Investment / yatırım sayfası
  const [showInvestment, setShowInvestment] = useState(false);
  const [investmentGoals, setInvestmentGoals] = useState([]); // [{ id, name, target, current, period }]
  const [transactions, setTransactions] = useState([]); // [{ id, type, assetId, amount, price, date }]
  const [watchedAssets, setWatchedAssets] = useState([]); // kullanıcının eklediği custom coinler
  const [portfolioSnapshots, setPortfolioSnapshots] = useState([]); // [{ date, value, cost }]
  
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
        setInvestmentGoals([]);
        setTransactions([]);
        setWatchedAssets([]);
        setPortfolioSnapshots([]);
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
          if (dataToLoad.tutorialCompleted !== undefined) setTutorialCompleted(dataToLoad.tutorialCompleted);
          else setTutorialCompleted(false);
          if (dataToLoad.salary) setSalary(dataToLoad.salary);
          if (dataToLoad.salaryDay) setSalaryDay(dataToLoad.salaryDay);
          if (dataToLoad.investmentEnabled !== undefined) setInvestmentEnabled(dataToLoad.investmentEnabled);
          if (dataToLoad.investmentPercent) setInvestmentPercent(dataToLoad.investmentPercent);
          if (dataToLoad.investmentAmount) setInvestmentAmount(dataToLoad.investmentAmount);
          if (dataToLoad.investmentMode) setInvestmentMode(dataToLoad.investmentMode);
          if (dataToLoad.dayHistory) setDayHistory(dataToLoad.dayHistory);
          if (dataToLoad.carryOver) setCarryOver(dataToLoad.carryOver);
          if (dataToLoad.investmentGoals) setInvestmentGoals(dataToLoad.investmentGoals);
          if (dataToLoad.transactions) setTransactions(dataToLoad.transactions);
          if (dataToLoad.watchedAssets) setWatchedAssets(dataToLoad.watchedAssets);
          if (dataToLoad.portfolioSnapshots) setPortfolioSnapshots(dataToLoad.portfolioSnapshots);
          
          // OTOMATİK GÜN GEÇİŞİ: todayExpensesDate dünden veya daha eskiyse, o günü kapat
          if (dataToLoad.todayExpenses && dataToLoad.todayExpensesDate) {
            if (dataToLoad.todayExpensesDate === todayKey) {
              // Aynı gün, normal devam
              setTodayExpenses(dataToLoad.todayExpenses);
            } else if (dataToLoad.todayExpenses.length > 0) {
              // Farklı (önceki) gün — otomatik kapatma
              const oldDate = dataToLoad.todayExpensesDate;
              const oldExpenses = dataToLoad.todayExpenses;
              const oldSpent = oldExpenses.reduce((sum, e) => sum + e.amount, 0);
              
              // O günün dailyLimit'ini hesaplamak zor (geriye dönük) — basitçe son bilinen limit kullanılır
              // Daha iyisi: dataLoad'daki dailyLimit'i sakla. Şimdilik basit yaklaşım:
              const sNum = parseFloat(dataToLoad.salary) || 0;
              let invAmt = 0;
              if (dataToLoad.investmentEnabled) {
                if (dataToLoad.investmentMode === 'percent') invAmt = sNum * ((dataToLoad.investmentPercent || 15) / 100);
                else invAmt = parseFloat(dataToLoad.investmentAmount) || 0;
              }
              const oldDateObj = new Date(oldDate);
              const lastDayOldMonth = new Date(oldDateObj.getFullYear(), oldDateObj.getMonth() + 1, 0).getDate();
              const sDay = parseInt(dataToLoad.salaryDay);
              let estimatedDays = lastDayOldMonth - oldDateObj.getDate() + 1;
              if (!isNaN(sDay) && sDay >= 1 && sDay <= 31) {
                if (oldDateObj.getDate() < sDay) estimatedDays = sDay - oldDateObj.getDate();
                else estimatedDays = (lastDayOldMonth - oldDateObj.getDate()) + Math.min(sDay, lastDayOldMonth);
                if (estimatedDays < 1) estimatedDays = 1;
              }
              const estimatedBudget = (sNum - invAmt) / estimatedDays;
              const oldRemaining = estimatedBudget - oldSpent;
              
              const closedEntry = {
                date: oldDate,
                budget: estimatedBudget,
                spent: oldSpent,
                remaining: oldRemaining,
                expenses: oldExpenses,
                autoClosed: true
              };
              
              const newDayHistory = { ...(dataToLoad.dayHistory || {}), [oldDate]: closedEntry };
              setDayHistory(newDayHistory);
              setTodayExpenses([]); // bugüne sıfır harcamayla başla
              
              // Bilanço modal'ını otomatik göster
              setDaySummary({ ...closedEntry, day: oldDate, autoClosed: true });
              setShowSummaryModal(true);
            } else {
              // Farklı gün ama harcama yoktu, sadece sıfırla
              setTodayExpenses([]);
            }
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
      tutorialCompleted,
      setupComplete: step === 'dashboard',
      investmentGoals,
      transactions,
      watchedAssets,
      portfolioSnapshots
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
  }, [salary, salaryDay, investmentEnabled, investmentPercent, investmentAmount, investmentMode, dayHistory, carryOver, todayExpenses, step, hasLoaded, todayKey, session, tutorialCompleted, investmentGoals, transactions, watchedAssets, portfolioSnapshots]);

  // Çıkış yap
  
  useEffect(() => {
    if (step === 'dashboard' && !tutorialCompleted && hasLoaded) {
      setShowTutorial(true);
      setTutorialStep(1);
    }
  }, [step, tutorialCompleted, hasLoaded]);

  const nextTutorialStep = () => {
    if (tutorialStep >= 4) {
      setShowTutorial(false);
      setTutorialCompleted(true);
    } else {
      setTutorialStep(tutorialStep + 1);
    }
  };

  const skipTutorial = () => {
    setShowTutorial(false);
    setTutorialCompleted(true);
  };
const handleLogout = async () => {
    if (saveTimeoutRef.current) {
      // Bekleyen kaydetme varsa hemen yap
      clearTimeout(saveTimeoutRef.current);
      try {
        const data = {
          salary, salaryDay, investmentEnabled, investmentPercent, investmentAmount,
          investmentMode, dayHistory, carryOver, todayExpenses, todayExpensesDate: todayKey,
          setupComplete: step === 'dashboard', investmentGoals,
          transactions, watchedAssets, portfolioSnapshots
        };
        await supabase.from('user_data').upsert({ 
          user_id: session.user.id, data, updated_at: new Date().toISOString()
        });
      } catch (e) { console.error(e); }
    }
    await supabase.auth.signOut();
  };

  const categories = [
    { id: 'yemek', label: 'Yemek', icon: Coffee, color: '#EF4444' },
    { id: 'alisveris', label: 'Alışveriş', icon: ShoppingBag, color: '#8B6F47' },
    { id: 'ulasim', label: 'Ulaşım', icon: Car, color: '#5C7C8A' },
    { id: 'fatura', label: 'Fatura', icon: Home, color: '#7A5C8A' },
    { id: 'saglik', label: 'Sağlık', icon: Heart, color: '#EF4444' },
    { id: 'eglence', label: 'Eğlence', icon: Sparkles, color: '#F59E0B' },
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
        setInvestmentGoals([]);
        setTransactions([]);
        setWatchedAssets([]);
        setPortfolioSnapshots([]);
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
        background: 'linear-gradient(135deg, #F8FAFC 0%, #F8FAFC 100%)',
        fontFamily: "'Fraunces', Georgia, serif",
      }}>
        
        <div className="text-center">
          <Loader size={32} className="spin mx-auto mb-4" style={{ color: '#64748B' }} />
          <div className="text-sm" style={{ color: '#64748B', letterSpacing: '0.1em' }}>
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
        background: 'linear-gradient(135deg, #F8FAFC 0%, #F8FAFC 100%)',
        fontFamily: "'Fraunces', Georgia, serif",
      }}>
        
        <div className="text-center">
          <Cloud size={32} className="mx-auto mb-4" style={{ color: '#64748B' }} />
          <div style={{ fontWeight: 300, fontSize: '24px', marginBottom: '4px' }}>
            <em>Verilerin</em> yükleniyor
          </div>
          <div className="text-sm" style={{  color: '#64748B' }}>
            Buluttan getiriliyor...
          </div>
        </div>
      </div>
    );
  }

  // SETUP SCREEN
  if (step === 'setup') {
    return (
      <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col items-center justify-center p-container-margin md:p-stack-lg">
        <header className="w-full max-w-2xl mb-stack-lg text-center">
          <h1 className="font-display-tr text-display-tr text-primary mb-stack-sm">Mali Kontrol</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">Kişisel ekonominizi düzenlemek için ilk adımı atın.</p>
        </header>

        <main className="w-full max-w-2xl">
          {/* Step 1: Monthly Salary */}
          <section className="bg-surface-container-lowest rounded-2xl p-container-margin shadow-sm mb-stack-md flex flex-col gap-stack-md">
            <div className="flex items-center gap-stack-sm">
              <span className="material-symbols-outlined text-primary text-xl">payments</span>
              <h2 className="font-headline-tr text-headline-tr text-on-surface">1. Aylık Gelir</h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Net aylık maaşınızı girin.</p>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-numeric-lg text-numeric-lg text-on-surface-variant">₺</span>
              <input
                type="number"
                value={salary}
                onChange={(e) => setSalary(e.target.value)}
                placeholder="0"
                className="hide-number-arrows w-full pl-12 pr-4 py-4 rounded-xl border border-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-numeric-lg text-numeric-lg text-on-surface bg-surface-container-lowest transition-colors"
              />
            </div>
          </section>

          {/* Step 2: Salary Day */}
          <section className="bg-surface-container-lowest rounded-2xl p-container-margin shadow-sm mb-stack-md flex flex-col gap-stack-md">
            <div className="flex items-center gap-stack-sm">
              <span className="material-symbols-outlined text-primary text-xl">calendar_today</span>
              <h2 className="font-headline-tr text-headline-tr text-on-surface">2. Maaş Günü</h2>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Bütçe döngünüzün başlayacağı günü seçin.</p>
            <div className="relative mt-stack-sm">
              <input
                type="number"
                min="1"
                max="31"
                value={salaryDay}
                onChange={(e) => setSalaryDay(e.target.value)}
                placeholder="Örn: 15"
                className="w-full px-4 py-4 rounded-xl border border-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-numeric-lg text-numeric-lg text-on-surface bg-surface-container-lowest transition-colors"
              />
            </div>
          </section>

          {/* Step 3: Investment Allocation */}
          <section className="bg-surface-container-lowest rounded-2xl p-container-margin shadow-sm mb-stack-lg flex flex-col gap-stack-md">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-stack-sm">
                <span className="material-symbols-outlined text-primary text-xl">trending_up</span>
                <h2 className="font-headline-tr text-headline-tr text-on-surface">3. Yatırım Tahsisi</h2>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" className="sr-only peer" checked={investmentEnabled} onChange={() => setInvestmentEnabled(!investmentEnabled)} />
                <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
              </label>
            </div>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Maaşınız yattığı an otomatik olarak ayrılacak yatırım miktarını belirleyin.</p>
            
            {investmentEnabled && (
              <div className="flex flex-col sm:flex-row gap-stack-md mt-stack-sm">
                <div className="flex-1 flex flex-col gap-stack-sm">
                  <label className="font-label-caps text-label-caps text-on-surface-variant">YÖNTEM</label>
                  <div className="flex rounded-xl bg-surface-container p-1">
                    <button
                      onClick={() => setInvestmentMode('percent')}
                      className={`flex-1 py-2 px-4 rounded-lg font-body-sm text-body-sm font-medium transition-all ${investmentMode === 'percent' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Yüzde (%)
                    </button>
                    <button
                      onClick={() => setInvestmentMode('fixed')}
                      className={`flex-1 py-2 px-4 rounded-lg font-body-sm text-body-sm font-medium transition-all ${investmentMode === 'fixed' ? 'bg-surface-container-lowest shadow-sm text-on-surface' : 'text-on-surface-variant hover:text-on-surface'}`}
                    >
                      Sabit (₺)
                    </button>
                  </div>
                </div>

                <div className="flex-1 flex flex-col gap-stack-sm">
                  {investmentMode === 'percent' ? (
                    <>
                      <div className="flex justify-between items-center">
                        <label className="font-label-caps text-label-caps text-on-surface-variant">ORAN</label>
                        <span className="font-numeric-md text-numeric-md text-on-surface">{investmentPercent}%</span>
                      </div>
                      <div className="flex flex-col justify-center h-full pt-1">
                        <input 
                          type="range" 
                          min="5" max="30" 
                          value={investmentPercent}
                          onChange={(e) => setInvestmentPercent(parseInt(e.target.value))}
                          className="w-full h-2 bg-surface-variant rounded-lg appearance-none cursor-pointer accent-primary" 
                        />
                        <div className="flex justify-between mt-2">
                          <span className="font-body-sm text-[12px] text-on-surface-variant">%5</span>
                          <span className="font-body-sm text-[12px] text-on-surface-variant">%30</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between items-center">
                        <label className="font-label-caps text-label-caps text-on-surface-variant">TUTAR</label>
                      </div>
                      <div className="relative mt-2">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-numeric-md text-on-surface-variant">₺</span>
                        <input
                          type="number"
                          value={investmentAmount}
                          onChange={(e) => setInvestmentAmount(e.target.value)}
                          placeholder="0"
                          className="w-full pl-8 pr-3 py-2 rounded-lg border border-surface-variant focus:border-primary focus:ring-1 focus:ring-primary outline-none font-numeric-md text-on-surface bg-surface-container-lowest transition-colors"
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </section>

          {/* Bottom Preview Card & CTA */}
          <section className="bg-surface-container-lowest rounded-2xl p-container-margin shadow-sm border border-surface-variant mb-stack-lg relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 bg-primary opacity-5 rounded-full blur-2xl pointer-events-none"></div>
            <h3 className="font-label-caps text-label-caps text-on-surface-variant mb-stack-md">ÖNGÖRÜLEN BÜTÇE</h3>
            
            <div className="flex flex-col gap-stack-sm mb-stack-lg">
              <div className="flex justify-between items-center py-2 border-b border-surface-variant/50">
                <span className="font-body-md text-body-md text-on-surface">Maaş</span>
                <span className="font-numeric-md text-numeric-md text-on-surface">{formatCurrency(calculations.salaryNum)}</span>
              </div>
              <div className="flex justify-between items-center py-2 border-b border-surface-variant/50">
                <span className="font-body-md text-body-md text-on-surface-variant">Yatırım (Otomatik)</span>
                <span className="font-numeric-md text-numeric-md text-secondary">-{formatCurrency(calculations.invAmount)}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="font-body-md text-body-md font-semibold text-on-surface">Harcanabilir Bakiye</span>
                <span className="font-numeric-lg text-numeric-lg text-primary">{formatCurrency(calculations.remaining)}</span>
              </div>
            </div>

            <div className="bg-surface-container rounded-xl p-4 flex justify-between items-center mb-stack-lg">
              <div className="flex flex-col">
                <span className="font-label-caps text-label-caps text-on-surface-variant mb-1">GÜNLÜK LİMİT</span>
                <span className="font-body-sm text-body-sm text-on-surface">Kalan {calculations.daysUntilNextSalary} gün için ortalama</span>
              </div>
              <span className="font-numeric-md text-numeric-md text-on-surface">{formatCurrency(calculations.dailyLimit)}</span>
            </div>

            <button
              onClick={handleSetupComplete}
              disabled={!salary}
              className={`w-full py-4 rounded-xl font-headline-tr text-headline-tr transition-all flex justify-center items-center gap-2 ${!salary ? 'bg-surface-variant text-on-surface-variant opacity-50 cursor-not-allowed' : 'bg-primary-container text-on-primary text-on-primary hover:opacity-90'}`}
            >
              Panele Geç
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </section>
        </main>
      </div>
    );
  }


  // DASHBOARD
  const progressPercent = todayBudget > 0 ? Math.min((todayTotal / todayBudget) * 100, 100) : 0;
  const isOverBudget = todayTotal > todayBudget;

  // Yatırım sayfası gösteriliyorsa onu render et
  if (showInvestment) {
    return (
      <InvestmentPage 
        onClose={() => setShowInvestment(false)}
        investmentGoals={investmentGoals}
        onUpdateGoals={setInvestmentGoals}
        transactions={transactions}
        onUpdateTransactions={setTransactions}
        watchedAssets={watchedAssets}
        onUpdateWatchedAssets={setWatchedAssets}
        portfolioSnapshots={portfolioSnapshots}
        onUpdateSnapshots={setPortfolioSnapshots}
        monthlyInvestmentBudget={calculations.invAmount}
      />
    );
  }

  return (
    <div className="bg-surface text-on-surface font-body-md antialiased min-h-screen flex flex-col pb-[100px] md:pb-0">
      
      {/* TopAppBar */}
      <header className="bg-surface w-full sticky top-0 z-40 shadow-sm transition-all duration-300">
        <div className="flex justify-between items-center px-container-margin py-4 w-full max-w-7xl mx-auto">
          <div className="font-display-tr text-display-tr font-bold text-primary flex items-center gap-3">
            Mali Kontrol
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex items-center gap-2 mr-2">
              <span className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-secondary' : syncStatus === 'error' ? 'bg-error' : 'bg-primary-container'}`}></span>
              <span className="font-body-sm text-body-sm text-on-surface-variant">{session.user.email}</span>
            </div>
            <button onClick={() => { setShowTutorial(true); setTutorialStep(1); }} aria-label="Yardım" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">help</span>
            </button>
            <button onClick={() => { setCalendarMonth(new Date().getMonth()); setCalendarYear(new Date().getFullYear()); setShowCalendar(true); }} aria-label="Takvim" className={`w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary ${showTutorial && tutorialStep === 3 ? 'tutorial-target-interactive' : ''}`}>
              <span className="material-symbols-outlined">event</span>
            </button>
            <button onClick={() => setStep('setup')} aria-label="Ayarlar" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary">
              <span className="material-symbols-outlined">settings</span>
            </button>
            <button onClick={handleLogout} aria-label="Çıkış" className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-surface-container-low transition-colors text-primary">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto w-full px-container-margin pt-stack-md flex-1 flex flex-col gap-stack-lg">
        <div className="md:hidden flex items-center gap-2 mb-[-8px]">
          <span className={`w-2 h-2 rounded-full ${syncStatus === 'syncing' ? 'bg-secondary' : syncStatus === 'error' ? 'bg-error' : 'bg-primary-container'}`}></span>
          <span className="font-body-sm text-body-sm text-on-surface-variant truncate">{session.user.email}</span>
        </div>

        {/* Hero Card: Today's Budget */}
        <section className={`bg-surface-container-lowest rounded-xl shadow-sm p-6 flex flex-col relative overflow-hidden group ${showTutorial && tutorialStep === 1 ? 'tutorial-target' : ''}`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary-container opacity-5 rounded-bl-full pointer-events-none transition-transform group-hover:scale-110 duration-500"></div>
          <h2 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">BUGÜN KALAN</h2>
          <div className="mt-4 flex items-baseline gap-2">
            <span className={`font-numeric-lg text-[48px] tracking-tight ${isOverBudget ? 'text-error' : 'text-on-surface'}`}>
              {formatCurrency(todayRemaining)}
            </span>
          </div>

          <div className="mt-8 relative">
            <div className="h-3 w-full bg-surface-container rounded-full overflow-hidden flex">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${isOverBudget ? 'bg-error' : 'bg-primary-container'}`} 
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
          </div>

          <div className="mt-3 flex justify-between items-center font-body-sm text-body-sm text-on-surface-variant">
            <span>{formatCurrency(todayTotal)} harcandı</span>
            <span>{formatCurrency(todayBudget)} limit</span>
          </div>
          
          {calculations.periodHistorySpent > 0 && (
            <div className="mt-4 pt-4 font-body-sm flex justify-between items-center text-on-surface-variant border-t border-surface-container">
              <span>Bu döneme kadar harcanan</span>
              <span className="font-numeric-md">{formatCurrency(calculations.periodHistorySpent)}</span>
            </div>
          )}
        </section>

        {/* Stats Grid */}
        <section className="grid grid-cols-2 gap-gutter">
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant mb-3">Aylık Bakiye</span>
            <span className="font-numeric-md text-[24px] text-on-surface">{formatCurrency(overallRemaining)}</span>
          </div>
          <div className="bg-surface-container-lowest rounded-xl shadow-sm p-5 flex flex-col justify-between">
            <span className="font-label-caps text-label-caps text-on-surface-variant mb-3">
              {calculations.hasSalaryDay ? 'Maaşa Kalan' : 'Aya Kalan'}
            </span>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary-container text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>event</span>
              <span className="font-numeric-md text-[24px] text-on-surface">{calculations.daysUntilNextSalary} Gün</span>
            </div>
          </div>
        </section>

        {calculations.hasSalaryDay && calculations.nextSalaryDate && (
          <div className="bg-secondary-container rounded-xl p-4 text-on-secondary-container flex items-start gap-3">
            <span className="material-symbols-outlined text-primary mt-0.5">info</span>
            <span className="font-body-sm">
              Bir sonraki maaş günün <strong>{formatDate(calculations.nextSalaryDate).short}</strong>. Günlük {formatCurrency(calculations.dailyLimit)} limitin var.
            </span>
          </div>
        )}

        {/* Expenses List */}
        <section className="flex flex-col gap-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
              BUGÜNKÜ HARCAMALAR — {todayExpenses.length}
            </h3>
            <button 
              onClick={() => setShowExpenseModal(true)}
              className={`font-label-caps text-label-caps text-primary-container hover:opacity-80 transition-opacity flex items-center gap-1 ${showTutorial && tutorialStep === 2 ? 'tutorial-target-interactive' : ''}`}
            >
              <span className="material-symbols-outlined text-[16px]">add</span> Ekle
            </button>
          </div>
          
          {todayExpenses.length === 0 ? (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm p-8 text-center border border-surface-variant border-dashed flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-surface-variant text-4xl">receipt_long</span>
              <span className="font-body-md text-on-surface-variant">Henüz harcama yok</span>
            </div>
          ) : (
            <div className="bg-surface-container-lowest rounded-xl shadow-sm overflow-hidden flex flex-col">
              {todayExpenses.slice().reverse().map((exp, revIdx) => {
                const cat = getCategoryInfo(exp.category);
                const realIdx = todayExpenses.length - 1 - revIdx;
                
                let msIcon = "receipt_long";
                if(cat.label === 'Kahve') msIcon = "local_cafe";
                else if(cat.label === 'Market') msIcon = "shopping_cart";
                else if(cat.label === 'Ulaşım') msIcon = "directions_car";
                else if(cat.label === 'Yemek') msIcon = "restaurant";
                else if(cat.label === 'Alışveriş') msIcon = "local_mall";
                else if(cat.label === 'Fatura') msIcon = "receipt";
                else if(cat.label === 'Eğlence') msIcon = "sports_esports";
                else if(cat.label === 'Sağlık') msIcon = "medical_services";
                
                return (
                  <div key={realIdx} className="flex items-center justify-between p-4 border-b border-surface-container-low hover:bg-surface-bright transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full flex items-center justify-center" style={{ backgroundColor: `${cat.color}20`, color: cat.color }}>
                        <span className="material-symbols-outlined text-[20px]">{msIcon}</span>
                      </div>
                      <div className="flex flex-col">
                        <span className="font-body-md text-body-md text-on-surface font-medium">{cat.label}</span>
                        {exp.note && <span className="font-body-sm text-body-sm text-on-surface-variant">{exp.note}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col items-end">
                        <span className="font-numeric-md text-[18px] text-on-surface">-{formatCurrency(exp.amount)}</span>
                        <span className="font-body-sm text-[12px] text-on-surface-variant">{exp.time}</span>
                      </div>
                      <button
                        onClick={() => {
                          setConfirmDialog({
                            title: 'Harcamayı sil',
                            message: 'Bu harcama kalıcı olarak silinecek. Devam edilsin mi?',
                            onConfirm: () => {
                              setTodayExpenses(todayExpenses.filter((_, i) => i !== realIdx));
                              setConfirmDialog(null);
                            }
                          });
                        }}
                        className="w-8 h-8 rounded-full flex items-center justify-center text-error hover:bg-error-container transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">close</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Actions */}
        <section className="mt-4 mb-stack-lg flex flex-col gap-4">
          <button 
            onClick={handleEndDay}
            className="w-full h-[56px] bg-primary-container text-on-primary rounded-xl font-label-caps text-label-caps uppercase tracking-wider flex items-center justify-center gap-2 hover:opacity-90 active:scale-[0.98] transition-all shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">check_circle</span>
            Günü Bitir
          </button>
          <button 
            onClick={handleReset}
            className="text-center font-body-sm text-body-sm text-on-surface-variant hover:text-on-surface transition-colors mt-2 underline"
          >
            Tüm verileri sıfırla
          </button>
        </section>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="md:hidden fixed bottom-0 left-0 w-full z-50 flex justify-around items-center px-gutter py-stack-sm pb-safe bg-surface-container-lowest shadow-[0_-4px_24px_rgba(0,0,0,0.02)] rounded-t-xl">
        <button className="flex flex-col items-center justify-center text-primary-container rounded-xl px-4 py-2">
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: "'FILL' 1" }}>payments</span>
          <span className="font-body-sm text-body-sm text-[11px] mt-1 font-medium">Bütçe</span>
        </button>
        <button onClick={() => setShowInvestment(true)} className={`flex flex-col items-center justify-center text-on-surface-variant hover:text-on-surface rounded-xl px-4 py-2 ${showTutorial && tutorialStep === 4 ? 'tutorial-target-interactive' : ''}`}>
          <span className="material-symbols-outlined text-[24px]">trending_up</span>
          <span className="font-body-sm text-body-sm text-[11px] mt-1 font-medium">Yatırım</span>
        </button>
      </nav>

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
              style={{ background: '#F8FAFC', maxHeight: '90vh', overflowY: 'auto' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="p-6 md:p-7 flex items-center justify-between" style={{ background: '#0F172A', color: '#F8FAFC' }}>
                <div>
                  <div className="font-sans text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>
                    Geçmiş
                  </div>
                  <div className="text-2xl" style={{ fontWeight: 400 }}>
                    <em>{monthNames[calendarMonth]}</em> {calendarYear}
                  </div>
                </div>
                <button
                  onClick={() => { setShowCalendar(false); setSelectedDate(null); }}
                  className="w-9 h-9 flex items-center justify-center"
                  style={{ border: '1px solid #F8FAFC' }}
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
                    style={{ border: '1px solid #0F172A', color: '#0F172A' }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <div className="font-sans text-sm" style={{ color: '#64748B', fontWeight: 500 }}>
                    {monthNames[calendarMonth]} {calendarYear}
                  </div>
                  <button
                    onClick={goNextMonth}
                    className="w-9 h-9 flex items-center justify-center transition-all"
                    style={{ border: '1px solid #0F172A', color: '#0F172A' }}
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>

                {/* Day labels */}
                <div className="grid grid-cols-7 gap-1 mb-2">
                  {dayNamesShort.map(d => (
                    <div key={d} className="font-sans text-xs text-center py-2" style={{ color: '#64748B', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
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
                    let textColor = '#0F172A';
                    let borderColor = 'transparent';
                    
                    if (hasData) {
                      bgColor = isPositive ? '#22C55E' : '#EF4444';
                      textColor = '#0F172A';
                    } else if (isFuture) {
                      textColor = '#C9B89A';
                    }
                    
                    if (isToday) {
                      borderColor = '#0F172A';
                    }
                    if (isSelected) {
                      borderColor = '#0F172A';
                    }
                    
                    return (
                      <button
                        key={dateKey}
                        onClick={() => {
                          if (isFuture) return; // gelecek tıklanamaz
                          setSelectedDate(isSelected ? null : dateKey);
                        }}
                        disabled={isFuture}
                        className="aspect-square flex items-center justify-center font-mono-num text-sm transition-all relative"
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
                          <div className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full" style={{ background: '#0F172A' }}></div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Legend */}
                <div className="flex flex-wrap gap-3 mb-6 pb-6" style={{ borderBottom: '1px solid #E2E8F0' }}>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ background: '#22C55E' }}></div>
                    <span className="font-sans text-xs" style={{ color: '#64748B' }}>Tasarruf</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ background: '#EF4444' }}></div>
                    <span className="font-sans text-xs" style={{ color: '#64748B' }}>Aşım</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3" style={{ border: '2px solid #0F172A' }}></div>
                    <span className="font-sans text-xs" style={{ color: '#64748B' }}>Bugün</span>
                  </div>
                </div>

                {/* Selected day detail OR month stats */}
                {selectedDate ? (
                  selectedEntry ? (
                    <div className="scale-in">
                      <div className="flex items-center justify-between mb-4">
                        <div className="font-sans text-xs" style={{ color: '#64748B', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
                          {formatDate(new Date(selectedDate)).full}
                        </div>
                        <button
                          onClick={() => setSelectedDate(null)}
                          className="font-sans text-xs underline"
                          style={{ color: '#64748B' }}
                        >
                          kapat
                        </button>
                      </div>
                      
                      <div className="p-5 mb-4" style={{ 
                        background: selectedEntry.remaining >= 0 ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                        borderLeft: `3px solid ${selectedEntry.remaining >= 0 ? '#22C55E' : '#EF4444'}`
                      }}>
                        <div className="font-sans text-xs mb-1" style={{ color: '#64748B' }}>
                          {selectedEntry.remaining >= 0 ? 'Tasarruf' : 'Aşım'}
                        </div>
                        <div className="font-mono-num text-3xl" style={{ 
                          fontWeight: 400,
                          color: selectedEntry.remaining >= 0 ? '#22C55E' : '#A8554E'
                        }}>
                          {selectedEntry.remaining >= 0 ? '+' : ''}{formatCurrency(selectedEntry.remaining)}
                        </div>
                      </div>
                      
                      <div className="space-y-2 mb-5">
                        <div className="flex justify-between items-baseline">
                          <span className="font-sans text-sm" style={{ color: '#64748B' }}>Günlük limit</span>
                          <span className="font-mono-num text-base">{formatCurrency(selectedEntry.budget)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="font-sans text-sm" style={{ color: '#64748B' }}>Toplam harcama</span>
                          <span className="font-mono-num text-base">−{formatCurrency(selectedEntry.spent)}</span>
                        </div>
                        <div className="flex justify-between items-baseline">
                          <span className="font-sans text-sm" style={{ color: '#64748B' }}>İşlem sayısı</span>
                          <span className="font-mono-num text-base">{selectedEntry.expenses.length}</span>
                        </div>
                      </div>
                      
                      {/* Harcama listesi (silinebilir/düzenlenebilir) */}
                      {selectedEntry.expenses.length > 0 && (
                        <div className="mb-5">
                          <div className="font-sans text-xs mb-3" style={{ color: '#64748B', letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 }}>
                            Harcamalar
                          </div>
                          <div className="space-y-2">
                            {selectedEntry.expenses.map((exp, idx) => {
                              const cat = getCategoryInfo(exp.category);
                              const Icon = cat.icon;
                              return (
                                <div key={idx} className="flex items-center gap-3 p-3" style={{ background: '#FFFFFF', border: '1px solid #F8FAFC' }}>
                                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: cat.color, color: '#F8FAFC' }}>
                                    <Icon size={14} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-mono-num text-sm" style={{ fontWeight: 500 }}>
                                      {cat.label}
                                    </div>
                                    {exp.note && (
                                      <div className="font-sans text-xs truncate" style={{ color: '#64748B' }}>
                                        {exp.note}
                                      </div>
                                    )}
                                  </div>
                                  <div className="font-mono-num text-sm flex-shrink-0" style={{ fontWeight: 500 }}>
                                    −{formatCurrency(exp.amount)}
                                  </div>
                                  <div className="flex gap-1 flex-shrink-0">
                                    <button
                                      onClick={() => setEditingExpense({ dateKey: selectedDate, index: idx, ...exp })}
                                      className="w-7 h-7 flex items-center justify-center transition-all"
                                      style={{ border: '1px solid #64748B', color: '#64748B' }}
                                      title="Düzenle"
                                    >
                                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
                                      </svg>
                                    </button>
                                    <button
                                      onClick={() => deleteHistoryExpense(selectedDate, idx)}
                                      className="w-7 h-7 flex items-center justify-center transition-all"
                                      style={{ border: '1px solid #EF4444', color: '#EF4444' }}
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
                          className="flex-1 font-sans py-3 transition-all flex items-center justify-center gap-2"
                          style={{
                            background: '#0F172A',
                            color: '#F8FAFC',
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
                          className="font-sans py-3 px-4 transition-all"
                          style={{
                            background: 'transparent',
                            border: '1px solid #EF4444',
                            color: '#EF4444',
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
                        <div className="font-sans text-xs" style={{ color: '#64748B', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
                          {formatDate(new Date(selectedDate)).full}
                        </div>
                        <button
                          onClick={() => setSelectedDate(null)}
                          className="font-sans text-xs underline"
                          style={{ color: '#64748B' }}
                        >
                          kapat
                        </button>
                      </div>
                      <div className="p-6 text-center mb-4" style={{ background: '#FFFFFF', border: '1px dashed #E2E8F0' }}>
                        <div className="font-sans text-sm mb-2" style={{ color: '#64748B' }}>
                          Bu güne ait kayıt yok
                        </div>
                        <div className="font-sans text-xs" style={{ color: '#64748B', lineHeight: 1.5 }}>
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
                        className="w-full font-sans py-3 transition-all flex items-center justify-center gap-2"
                        style={{
                          background: '#0F172A',
                          color: '#F8FAFC',
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
                    <div className="font-sans text-xs mb-3" style={{ color: '#64748B', letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 500 }}>
                      Bu Ay Özet
                    </div>
                    {monthHistory.length === 0 ? (
                      <div className="text-center py-8 font-sans text-sm" style={{ color: '#64748B' }}>
                        Bu ay için henüz veri yok.
                        <div className="text-xs mt-1" style={{ color: '#A89678' }}>
                          Gün sonunda "Günü Bitir" butonuna basınca takvime kayıt düşer.
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                          <div className="p-4" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingUp size={12} style={{ color: '#22C55E' }} />
                              <span className="font-sans text-xs" style={{ color: '#64748B' }}>Tasarruf</span>
                            </div>
                            <div className="font-mono-num text-lg" style={{ color: '#22C55E', fontWeight: 500 }}>
                              {formatCurrency(totalSaved)}
                            </div>
                            <div className="font-sans text-xs mt-1" style={{ color: '#64748B' }}>{goodDays} gün</div>
                          </div>
                          <div className="p-4" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                            <div className="flex items-center gap-2 mb-1">
                              <TrendingDown size={12} style={{ color: '#A8554E' }} />
                              <span className="font-sans text-xs" style={{ color: '#64748B' }}>Aşım</span>
                            </div>
                            <div className="font-mono-num text-lg" style={{ color: '#A8554E', fontWeight: 500 }}>
                              {formatCurrency(totalOver)}
                            </div>
                            <div className="font-sans text-xs mt-1" style={{ color: '#64748B' }}>{badDays} gün</div>
                          </div>
                        </div>
                        <div className="font-sans text-xs text-center py-2" style={{ color: '#64748B', fontStyle: 'italic' }}>
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
            className="scale-in w-full max-w-lg p-7 md:p-9 rounded-3xl shadow-xl"
            style={{ background: '#F8FAFC', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-7">
              <div>
                <div className="font-sans text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748B' }}>
                  {historyAddDate && formatDate(new Date(historyAddDate)).full}
                </div>
                <h3 className="text-2xl" style={{ fontWeight: 400 }}>
                  Geriye dönük <em>harcama</em>
                </h3>
              </div>
              <button
                onClick={() => setShowHistoryAddModal(false)}
                className="w-9 h-9 flex items-center justify-center"
                style={{ border: '1px solid #0F172A' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-6">
              <label className="font-sans text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="number-input w-full bg-transparent border-0 border-b-2 outline-none font-mono-num"
                  style={{
                    borderColor: '#0F172A',
                    fontSize: '40px',
                    fontWeight: 300,
                    paddingBottom: '8px',
                    paddingRight: '50px'
                  }}
                />
                <span className="font-mono-num absolute right-0 bottom-2 text-2xl" style={{ color: '#64748B' }}>₺</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="font-sans text-xs block mb-3" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
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
                        background: isActive ? cat.color : '#FFFFFF',
                        color: isActive ? '#F8FAFC' : '#0F172A',
                        border: `1px solid ${isActive ? cat.color : '#E2E8F0'}`
                      }}
                    >
                      <Icon size={20} />
                      <span className="font-sans text-xs" style={{ fontWeight: 500 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-7">
              <label className="font-sans text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
                Not <span style={{ textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic' }}>(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="örn. öğle yemeği"
                className="font-sans w-full bg-transparent border-0 border-b outline-none py-2"
                style={{
                  borderColor: '#64748B',
                  fontSize: '15px',
                  color: '#0F172A'
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
              className="w-full font-sans py-4 transition-all rounded-xl shadow-sm"
              style={{
                background: (!expenseAmount || !expenseCategory) ? '#E2E8F0' : '#0F172A',
                color: (!expenseAmount || !expenseCategory) ? '#64748B' : '#F8FAFC',
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
            className="scale-in w-full max-w-lg p-7 md:p-9 rounded-3xl shadow-xl"
            style={{ background: '#F8FAFC', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-7">
              <div>
                <div className="font-sans text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748B' }}>
                  Düzenle
                </div>
                <h3 className="text-2xl" style={{ fontWeight: 400 }}>
                  <em>Harcamayı</em> güncelle
                </h3>
              </div>
              <button
                onClick={() => setEditingExpense(null)}
                className="w-9 h-9 flex items-center justify-center"
                style={{ border: '1px solid #0F172A' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="mb-6">
              <label className="font-sans text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={editingExpense.amount}
                  onChange={(e) => setEditingExpense({ ...editingExpense, amount: parseFloat(e.target.value) || 0 })}
                  autoFocus
                  className="number-input w-full bg-transparent border-0 border-b-2 outline-none font-mono-num"
                  style={{
                    borderColor: '#0F172A',
                    fontSize: '40px',
                    fontWeight: 300,
                    paddingBottom: '8px',
                    paddingRight: '50px'
                  }}
                />
                <span className="font-mono-num absolute right-0 bottom-2 text-2xl" style={{ color: '#64748B' }}>₺</span>
              </div>
            </div>

            <div className="mb-6">
              <label className="font-sans text-xs block mb-3" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
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
                        background: isActive ? cat.color : '#FFFFFF',
                        color: isActive ? '#F8FAFC' : '#0F172A',
                        border: `1px solid ${isActive ? cat.color : '#E2E8F0'}`
                      }}
                    >
                      <Icon size={20} />
                      <span className="font-sans text-xs" style={{ fontWeight: 500 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mb-7">
              <label className="font-sans text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
                Not
              </label>
              <input
                type="text"
                value={editingExpense.note || ''}
                onChange={(e) => setEditingExpense({ ...editingExpense, note: e.target.value })}
                placeholder="örn. öğle yemeği"
                className="font-sans w-full bg-transparent border-0 border-b outline-none py-2"
                style={{
                  borderColor: '#64748B',
                  fontSize: '15px',
                  color: '#0F172A'
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
              className="w-full font-sans py-4 transition-all rounded-xl shadow-sm"
              style={{
                background: (!editingExpense.amount || !editingExpense.category) ? '#E2E8F0' : '#0F172A',
                color: (!editingExpense.amount || !editingExpense.category) ? '#64748B' : '#F8FAFC',
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
            className="scale-in w-full max-w-lg p-7 md:p-9 rounded-3xl shadow-xl"
            style={{ background: '#F8FAFC', maxHeight: '90vh', overflowY: 'auto' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-7">
              <div>
                <div className="font-sans text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748B' }}>
                  Yeni Kayıt
                </div>
                <h3 className="text-2xl" style={{ fontWeight: 400 }}>
                  <em>Harcama</em> ekle
                </h3>
              </div>
              <button
                onClick={() => setShowExpenseModal(false)}
                className="w-9 h-9 flex items-center justify-center"
                style={{ border: '1px solid #0F172A' }}
              >
                <X size={16} />
              </button>
            </div>

            {/* Amount */}
            <div className="mb-6">
              <label className="font-sans text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
                Tutar
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(e.target.value)}
                  placeholder="0"
                  autoFocus
                  className="number-input w-full bg-transparent border-0 border-b-2 outline-none font-mono-num"
                  style={{
                    borderColor: '#0F172A',
                    fontSize: '40px',
                    fontWeight: 300,
                    paddingBottom: '8px',
                    paddingRight: '50px'
                  }}
                />
                <span className="font-mono-num absolute right-0 bottom-2 text-2xl" style={{ color: '#64748B' }}>₺</span>
              </div>
            </div>

            {/* Categories */}
            <div className="mb-6">
              <label className="font-sans text-xs block mb-3" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
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
                        background: isActive ? cat.color : '#FFFFFF',
                        color: isActive ? '#F8FAFC' : '#0F172A',
                        border: `1px solid ${isActive ? cat.color : '#E2E8F0'}`
                      }}
                    >
                      <Icon size={20} />
                      <span className="font-sans text-xs" style={{ fontWeight: 500 }}>{cat.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Note */}
            <div className="mb-7">
              <label className="font-sans text-xs block mb-2" style={{ letterSpacing: '0.15em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
                Not <span style={{ textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic' }}>(opsiyonel)</span>
              </label>
              <input
                type="text"
                value={expenseNote}
                onChange={(e) => setExpenseNote(e.target.value)}
                placeholder="örn. öğle yemeği"
                className="font-sans w-full bg-transparent border-0 border-b outline-none py-2"
                style={{
                  borderColor: '#64748B',
                  fontSize: '15px',
                  color: '#0F172A'
                }}
              />
            </div>

            <button
              onClick={handleAddExpense}
              disabled={!expenseAmount || !expenseCategory}
              className="w-full font-sans py-4 transition-all rounded-xl shadow-sm"
              style={{
                background: (!expenseAmount || !expenseCategory) ? '#E2E8F0' : '#0F172A',
                color: (!expenseAmount || !expenseCategory) ? '#64748B' : '#F8FAFC',
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
            style={{ background: '#F8FAFC', maxHeight: '90vh', overflowY: 'auto' }}
          >
            {/* Header dark */}
            <div className="p-7 md:p-9" style={{ background: '#0F172A', color: '#F8FAFC' }}>
              <div className="font-sans text-xs mb-2" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', opacity: 0.6 }}>
                {daySummary.autoClosed && daySummary.date 
                  ? `${formatDate(new Date(daySummary.date)).full} — Otomatik Kapatıldı`
                  : `${todayFormatted.full} — Bilanço`
                }
              </div>
              {daySummary.autoClosed && (
                <div className="font-sans text-xs mb-3" style={{ opacity: 0.5, fontStyle: 'italic' }}>
                  Saat 00:00 geçtiği için sistem önceki günü otomatik kapattı.
                </div>
              )}
              <div className="text-4xl mb-1" style={{ fontWeight: 300 }}>
                {daySummary.remaining >= 0 ? <span><em style={{ fontWeight: 400, color: '#22C55E' }}>Tasarruf</em> ettin.</span> : <span><em style={{ fontWeight: 400, color: '#EF4444' }}>Limit</em> aşıldı.</span>}
              </div>
              <div className="font-mono-num text-5xl mt-4" style={{ 
                fontWeight: 400, 
                letterSpacing: '-0.02em',
                color: daySummary.remaining >= 0 ? '#22C55E' : '#EF4444'
              }}>
                {daySummary.remaining >= 0 ? '+' : ''}{formatCurrency(daySummary.remaining)}
              </div>
            </div>

            {/* Body */}
            <div className="p-7 md:p-9">
              {/* Stats */}
              <div className="space-y-4 mb-7 pb-7" style={{ borderBottom: '1px solid #E2E8F0' }}>
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-sm" style={{ color: '#64748B' }}>Günlük limit</span>
                  <span className="font-mono-num text-lg">{formatCurrency(daySummary.budget)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-sm" style={{ color: '#64748B' }}>Toplam harcama</span>
                  <span className="font-mono-num text-lg">−{formatCurrency(daySummary.spent)}</span>
                </div>
                <div className="flex justify-between items-baseline">
                  <span className="font-sans text-sm" style={{ color: '#64748B' }}>İşlem sayısı</span>
                  <span className="font-mono-num text-lg">{daySummary.expenses.length}</span>
                </div>
              </div>

              {/* Category breakdown */}
              {daySummary.expenses.length > 0 && (
                <div className="mb-7">
                  <div className="font-sans text-xs mb-4" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#64748B', fontWeight: 500 }}>
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
                              <div className="w-6 h-6 flex items-center justify-center" style={{ background: cat.color, color: '#F8FAFC' }}>
                                <Icon size={12} />
                              </div>
                              <span className="font-sans text-sm" style={{ fontWeight: 500 }}>{cat.label}</span>
                            </div>
                            <span className="font-mono-num text-sm">{formatCurrency(amount)}</span>
                          </div>
                          <div className="h-1 w-full" style={{ background: '#F8FAFC' }}>
                            <div className="h-full transition-all" style={{ width: `${pct}%`, background: cat.color }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Message */}
              <div className="mb-6 p-4" style={{ background: '#FFFFFF', borderLeft: `3px solid ${daySummary.remaining >= 0 ? '#22C55E' : '#EF4444'}` }}>
                <div className="font-sans text-sm" style={{ color: '#64748B', lineHeight: 1.6 }}>
                  {daySummary.remaining >= 0 
                    ? `Harika! ${formatCurrency(daySummary.remaining)} tasarruf ettin. Bu tutar kalan günlere yayılacak — ileriki günlerin biraz daha rahat geçecek.`
                    : `Limit ${formatCurrency(Math.abs(daySummary.remaining))} aşıldı. Bu fark kalan günlere yayılacak, tek güne yüklenmeyecek.`
                  }
                </div>
              </div>

              <div className="flex gap-3">
                {daySummary.autoClosed ? (
                  // Otomatik kapatılmışsa zaten geçildi, sadece "Tamam" göster
                  <button
                    onClick={() => {
                      setShowSummaryModal(false);
                      setDaySummary(null);
                    }}
                    className="flex-1 font-sans py-4 transition-all"
                    style={{
                      background: '#0F172A',
                      color: '#F8FAFC',
                      letterSpacing: '0.15em',
                      textTransform: 'uppercase',
                      fontSize: '11px',
                      fontWeight: 500
                    }}
                  >
                    Yeni Güne Başla
                  </button>
                ) : (
                  <>
                    <button
                      onClick={() => setShowSummaryModal(false)}
                      className="flex-1 font-sans py-4 transition-all"
                      style={{
                        background: 'transparent',
                        border: '1px solid #0F172A',
                        color: '#0F172A',
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
                      className="flex-1 font-sans py-4 transition-all"
                      style={{
                        background: '#0F172A',
                        color: '#F8FAFC',
                        letterSpacing: '0.15em',
                        textTransform: 'uppercase',
                        fontSize: '11px',
                        fontWeight: 500
                      }}
                    >
                      Onayla & Sonraki Gün
                    </button>
                  </>
                )}
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
            style={{ background: '#F8FAFC' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="font-sans text-xs mb-2" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#EF4444', fontWeight: 500 }}>
              Onay Gerekli
            </div>
            <h3 className="text-2xl mb-3" style={{ fontWeight: 400, letterSpacing: '-0.01em' }}>
              {confirmDialog.title}
            </h3>
            <p className="font-sans text-sm mb-7" style={{ color: '#64748B', lineHeight: 1.5 }}>
              {confirmDialog.message}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="flex-1 font-sans py-3 transition-all"
                style={{
                  background: 'transparent',
                  border: '1px solid #0F172A',
                  color: '#0F172A',
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
                className="flex-1 font-sans py-3 transition-all"
                style={{
                  background: '#EF4444',
                  color: '#F8FAFC',
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
    
      {showTutorial && (
        <div className="fixed inset-0 z-40" style={{ backdropFilter: 'blur(8px)', background: 'rgba(248, 250, 252, 0.7)' }}>
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6" style={{ zIndex: 60 }}>
            <div className="bg-white p-6 rounded-2xl shadow-2xl max-w-sm animate-fade-up border border-[#E2E8F0]" style={{
              position: 'absolute',
              top: tutorialStep === 1 ? '50%' : tutorialStep === 2 ? '40%' : '20%',
              transform: 'translateY(-50%)'
            }}>
              <div className="text-[#22C55E] font-display font-semibold mb-2 text-lg">
                {tutorialStep === 1 && "Günlük Bütçen"}
                {tutorialStep === 2 && "Harcama Ekle"}
                {tutorialStep === 3 && "Takvim ve Geçmiş"}
                {tutorialStep === 4 && "Yatırım Modu"}
              </div>
              <div className="text-[#64748B] font-sans text-sm mb-6 leading-relaxed">
                {tutorialStep === 1 && "Burası senin ana hedefin. Her gün bu tutarın altında kalmaya çalışarak ay sonunu rahat getirebilirsin."}
                {tutorialStep === 2 && "Yaptığın harcamaları buradan ekle. Her harcama günlük bütçenden düşer."}
                {tutorialStep === 3 && "Önceki günleri ve ayın genel özetini buradan görebilir, unuttuğun harcamaları girebilirsin."}
                {tutorialStep === 4 && "Tasarruflarını büyütmek için yatırım terminaline geçiş yap. Güçlü analizler seni bekliyor."}
              </div>
              <div className="flex justify-between items-center">
                <button onClick={skipTutorial} className="text-[#64748B] text-xs font-sans hover:text-[#0F172A]">Atla</button>
                <div className="flex gap-1">
                  {[1,2,3,4].map(s => (
                    <div key={s} className={`w-2 h-2 rounded-full ${s === tutorialStep ? 'bg-[#22C55E]' : 'bg-[#E2E8F0]'}`} />
                  ))}
                </div>
                <button onClick={nextTutorialStep} className="bg-[#0F172A] text-white px-4 py-2 rounded-xl text-xs font-sans font-medium hover:bg-[#22C55E] transition-colors">
                  {tutorialStep === 4 ? 'Bitir' : 'İleri'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
