import React, { useState, useEffect, useMemo } from 'react';
import { Wallet, TrendingUp, Calendar, Plus, X, Check, ArrowRight, Coffee, ShoppingBag, Car, Home, Heart, Sparkles, MoreHorizontal, ChevronRight, Tag } from 'lucide-react';

export default function App() {
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
  
  // Expense form
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('');
  const [expenseNote, setExpenseNote] = useState('');

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
    
    // Bir sonraki maaş gününe kadar kaç gün var
    const today = new Date();
    const todayDay = today.getDate();
    const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const sDay = parseInt(salaryDay) || 1;
    
    let daysUntilNextSalary;
    if (todayDay < sDay) {
      daysUntilNextSalary = sDay - todayDay;
    } else {
      daysUntilNextSalary = (lastDayOfMonth - todayDay) + sDay;
    }
    if (daysUntilNextSalary === 0) daysUntilNextSalary = 30;
    
    const dailyLimit = remaining / daysUntilNextSalary;
    
    return {
      salaryNum,
      invAmount,
      remaining,
      daysUntilNextSalary,
      dailyLimit
    };
  }, [salary, investmentEnabled, investmentPercent, investmentAmount, investmentMode, salaryDay]);

  const todayTotal = todayExpenses.reduce((sum, e) => sum + e.amount, 0);
  const todayBudget = calculations.dailyLimit + carryOver;
  const todayRemaining = todayBudget - todayTotal;

  const totalSpent = expenses.reduce((sum, e) => sum + e.amount, 0) + todayTotal;
  const totalBudget = calculations.remaining;
  const overallRemaining = totalBudget - totalSpent;

  const handleSetupComplete = () => {
    if (salary && salaryDay) {
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
    setExpenses([...expenses, ...todayExpenses]);
    setCarryOver(todayRemaining); // pozitif veya negatif olabilir
    setTodayExpenses([]);
    setCurrentDay(currentDay + 1);
    setShowSummaryModal(false);
    setDaySummary(null);
  };

  const formatCurrency = (val) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const getCategoryInfo = (id) => categories.find(c => c.id === id) || categories[6];

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
              02 — Maaş Günü
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
          {salary && salaryDay && (
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
                  <span className="ui-font text-sm" style={{ opacity: 0.7 }}>Günlük limit ({calculations.daysUntilNextSalary} gün)</span>
                  <span className="num-font text-2xl" style={{ fontWeight: 500, color: '#E8C77F' }}>
                    {formatCurrency(calculations.dailyLimit)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Continue Button */}
          <button
            onClick={handleSetupComplete}
            disabled={!salary || !salaryDay}
            className="fade-up delay-5 w-full ui-font py-5 transition-all flex items-center justify-center gap-3 group"
            style={{
              background: (!salary || !salaryDay) ? '#D4C4A8' : '#2C2416',
              color: (!salary || !salaryDay) ? '#8B7355' : '#F5EFE6',
              cursor: (!salary || !salaryDay) ? 'not-allowed' : 'pointer',
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
      `}</style>

      <div className="max-w-2xl mx-auto px-5 py-8 md:py-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <div className="ui-font text-xs mb-1" style={{ letterSpacing: '0.2em', textTransform: 'uppercase', color: '#8B7355' }}>
              Gün {currentDay}
            </div>
            <h1 className="text-3xl md:text-4xl" style={{ fontWeight: 300, letterSpacing: '-0.02em' }}>
              <em style={{ fontWeight: 400 }}>Bugünkü</em> bütçen
            </h1>
          </div>
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

          {carryOver !== 0 && (
            <div className="mt-4 pt-4 ui-font text-xs flex justify-between" style={{ borderTop: '1px solid rgba(245,239,230,0.15)', opacity: 0.7 }}>
              <span>Önceki günden devir</span>
              <span className="num-font" style={{ color: carryOver > 0 ? '#A8D08D' : '#E89B7F' }}>
                {carryOver > 0 ? '+' : ''}{formatCurrency(carryOver)}
              </span>
            </div>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-6">
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
              Kalan Gün
            </div>
            <div className="num-font text-2xl" style={{ fontWeight: 400 }}>
              {Math.max(calculations.daysUntilNextSalary - currentDay + 1, 0)}
            </div>
          </div>
        </div>

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
      </div>

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
                Gün {daySummary.day} — Bilanço
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
                    ? `Harika! ${formatCurrency(daySummary.remaining)} yarına devredilecek ve günlük limitine eklenecek.`
                    : `Limit ${formatCurrency(Math.abs(daySummary.remaining))} aşıldı. Bu fark yarınki bütçeden düşülecek.`
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
    </div>
  );
}
