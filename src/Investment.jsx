import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Plus, X, RefreshCw, Search, ArrowUpRight, ArrowDownRight, AlertCircle, Wallet, BarChart3, Activity } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';

const COLORS = {
  bg: '#020617',
  bgPanel: '#0F172A',
  bgPanelLight: '#111827',
  border: '#1E293B',
  borderLight: '#334155',
  text: '#94A3B8',
  textBright: '#E2E8F0',
  textBrightest: '#F8FAFC',
  textDim: '#64748B',
  textDimmer: '#475569',
  accent: '#00FF85',
  positive: '#22C55E',
  negative: '#F43F5E',
  gold: '#FACC15',
  neon: '#00FF85',
  softGreen: '#4ADE80'
};

const PIE_COLORS = ['#7AE07A', '#5CB85C', '#3D8B3D', '#9FE89F', '#2A6B2A', '#C0F0C0', '#1F4F1F'];

const DEFAULT_ASSETS = [
  { id: 'usd', symbol: 'USD', name: 'ABD Doları', type: 'fiat', source: 'frankfurter' },
  { id: 'eur', symbol: 'EUR', name: 'Euro', type: 'fiat', source: 'frankfurter' },
  { id: 'gbp', symbol: 'GBP', name: 'İngiliz Sterlini', type: 'fiat', source: 'frankfurter' },
  { id: 'gold', symbol: 'GRAM', name: 'Gram Altın', type: 'commodity', source: 'gold' },
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', source: 'coingecko', cgId: 'bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', type: 'crypto', source: 'coingecko', cgId: 'ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', type: 'crypto', source: 'coingecko', cgId: 'solana' },
];

export default function InvestmentPage({ 
  onClose, 
  investmentGoals = [], 
  onUpdateGoals, 
  transactions = [],
  onUpdateTransactions,
  watchedAssets = [],
  onUpdateWatchedAssets,
  portfolioSnapshots = [],
  onUpdateSnapshots,
  monthlyInvestmentBudget = 0
}) {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [prices, setPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('30d');
  
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showAddAssetModal, setShowAddAssetModal] = useState(false);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [editingGoalId, setEditingGoalId] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState(null);
  
  const [txType, setTxType] = useState('buy');
  const [txAssetId, setTxAssetId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  
  const [goalName, setGoalName] = useState('');
  const [goalAmount, setGoalAmount] = useState('');
  const [goalCurrent, setGoalCurrent] = useState('');
  const [goalPeriod, setGoalPeriod] = useState('yearly');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const allAssets = useMemo(() => {
    return [...DEFAULT_ASSETS, ...watchedAssets.filter(a => !DEFAULT_ASSETS.some(d => d.id === a.id))];
  }, [watchedAssets]);

  const fetchPrices = async () => {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const newPrices = {};
      try {
        const fxRes = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,EUR,GBP');
        const fxData = await fxRes.json();
        if (fxData.rates) {
          newPrices.usd = { try: fxData.rates.TRY, change: 0 };
          newPrices.eur = { try: fxData.rates.TRY / fxData.rates.EUR, change: 0 };
          newPrices.gbp = { try: fxData.rates.TRY / fxData.rates.GBP, change: 0 };
        }
      } catch (e) { console.error('FX:', e); }
      
      const cryptoIds = allAssets.filter(a => a.type === 'crypto' && a.cgId).map(a => a.cgId);
      cryptoIds.push('tether-gold');
      const uniqueIds = [...new Set(cryptoIds)].join(',');
      
      try {
        const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds}&vs_currencies=try,usd&include_24hr_change=true`);
        const cryptoData = await cryptoRes.json();
        if (cryptoData['tether-gold']) {
          newPrices.gold = { try: cryptoData['tether-gold'].try / 31.1035, change: cryptoData['tether-gold'].try_24h_change || 0 };
        }
        allAssets.filter(a => a.type === 'crypto' && a.cgId).forEach(asset => {
          if (cryptoData[asset.cgId]) {
            newPrices[asset.id] = {
              try: cryptoData[asset.cgId].try,
              usd: cryptoData[asset.cgId].usd,
              change: cryptoData[asset.cgId].try_24h_change || 0
            };
          }
        });
      } catch (e) { console.error('Crypto:', e); }
      
      setPrices(newPrices);
      setLastUpdate(new Date());
    } catch (e) {
      setPricesError('Fiyatlar yüklenemedi.');
    } finally {
      setPricesLoading(false);
    }
  };

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(fetchPrices, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [allAssets.length]);

  const portfolio = useMemo(() => {
    const holdings = {};
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date));
    sortedTxs.forEach(tx => {
      if (!holdings[tx.assetId]) holdings[tx.assetId] = { amount: 0, totalCost: 0, lots: [] };
      const h = holdings[tx.assetId];
      if (tx.type === 'buy') {
        h.amount += tx.amount;
        h.totalCost += tx.amount * tx.price;
        h.lots.push({ amount: tx.amount, price: tx.price });
      } else {
        let toSell = tx.amount;
        while (toSell > 0 && h.lots.length > 0) {
          const lot = h.lots[0];
          if (lot.amount <= toSell) {
            toSell -= lot.amount;
            h.totalCost -= lot.amount * lot.price;
            h.amount -= lot.amount;
            h.lots.shift();
          } else {
            lot.amount -= toSell;
            h.totalCost -= toSell * lot.price;
            h.amount -= toSell;
            toSell = 0;
          }
        }
      }
    });
    Object.keys(holdings).forEach(id => { if (holdings[id].amount < 0.0000001) delete holdings[id]; });
    return holdings;
  }, [transactions]);

  const portfolioValues = useMemo(() => {
    const items = [];
    let totalValue = 0, totalCost = 0;
    Object.entries(portfolio).forEach(([assetId, h]) => {
      const asset = allAssets.find(a => a.id === assetId);
      if (!asset) return;
      const currentPrice = prices[assetId]?.try || 0;
      const currentValue = h.amount * currentPrice;
      const profitLoss = currentValue - h.totalCost;
      items.push({
        assetId, asset, amount: h.amount,
        avgCost: h.totalCost / h.amount,
        totalCost: h.totalCost,
        currentPrice, currentValue, profitLoss,
        profitLossPct: h.totalCost > 0 ? (profitLoss / h.totalCost) * 100 : 0,
        change24h: prices[assetId]?.change || 0
      });
      totalValue += currentValue;
      totalCost += h.totalCost;
    });
    items.sort((a, b) => b.currentValue - a.currentValue);
    return {
      items, totalValue, totalCost,
      totalProfitLoss: totalValue - totalCost,
      totalProfitLossPct: totalCost > 0 ? ((totalValue - totalCost) / totalCost) * 100 : 0
    };
  }, [portfolio, prices, allAssets]);

  useEffect(() => {
    if (portfolioValues.totalValue <= 0 || !onUpdateSnapshots) return;
    const today = new Date().toISOString().split('T')[0];
    const lastSnapshot = portfolioSnapshots[portfolioSnapshots.length - 1];
    if (!lastSnapshot || lastSnapshot.date !== today) {
      onUpdateSnapshots([...portfolioSnapshots, { date: today, value: portfolioValues.totalValue, cost: portfolioValues.totalCost }].slice(-365));
    } else if (Math.abs(lastSnapshot.value - portfolioValues.totalValue) > 1) {
      const updated = [...portfolioSnapshots];
      updated[updated.length - 1] = { date: today, value: portfolioValues.totalValue, cost: portfolioValues.totalCost };
      onUpdateSnapshots(updated);
    }
  }, [portfolioValues.totalValue]);

  const chartData = useMemo(() => {
    if (portfolioSnapshots.length === 0) return [];
    const now = new Date();
    let cutoff;
    if (chartPeriod === '7d') cutoff = new Date(now - 7 * 86400000);
    else if (chartPeriod === '30d') cutoff = new Date(now - 30 * 86400000);
    else if (chartPeriod === '90d') cutoff = new Date(now - 90 * 86400000);
    else cutoff = new Date(0);
    return portfolioSnapshots.filter(s => new Date(s.date) >= cutoff).map(s => ({
      date: s.date, value: s.value, cost: s.cost, profit: s.value - s.cost
    }));
  }, [portfolioSnapshots, chartPeriod]);

  const pieData = useMemo(() => portfolioValues.items.map((item, idx) => ({
    name: item.asset.symbol, value: item.currentValue, color: PIE_COLORS[idx % PIE_COLORS.length]
  })), [portfolioValues]);

  const periodPerformance = useMemo(() => {
    if (portfolioSnapshots.length < 2) return null;
    const periods = [
      { label: '24S', days: 1 }, { label: '7G', days: 7 },
      { label: '30G', days: 30 }, { label: '90G', days: 90 }, { label: '1Y', days: 365 },
    ];
    return periods.map(p => {
      const cutoff = new Date(Date.now() - p.days * 86400000);
      const oldSnapshot = [...portfolioSnapshots].reverse().find(s => new Date(s.date) <= cutoff);
      if (!oldSnapshot) return { ...p, changePct: null };
      const changePct = oldSnapshot.value > 0 ? ((portfolioValues.totalValue - oldSnapshot.value) / oldSnapshot.value) * 100 : 0;
      return { ...p, changePct };
    });
  }, [portfolioSnapshots, portfolioValues.totalValue]);

  const formatCurrency = (val, maxDigits) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: 'TRY',
      maximumFractionDigits: maxDigits !== undefined ? maxDigits : (Math.abs(val) > 100 ? 0 : 2)
    }).format(val);
  };
  const formatAmount = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (val < 0.001) return val.toExponential(2);
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: val < 1 ? 6 : (val < 100 ? 4 : 2) }).format(val);
  };

  const openTxModal = (existingTx = null) => {
    if (existingTx) {
      setEditingTx(existingTx);
      setTxType(existingTx.type);
      setTxAssetId(existingTx.assetId);
      setTxAmount(existingTx.amount.toString());
      setTxPrice(existingTx.price.toString());
      setTxDate(existingTx.date);
    } else {
      setEditingTx(null);
      setTxType('buy');
      setTxAssetId(allAssets[0]?.id || '');
      setTxAmount(''); setTxPrice('');
      setTxDate(new Date().toISOString().split('T')[0]);
    }
    setShowTxModal(true);
  };

  const handleSaveTx = () => {
    if (!txAssetId || !txAmount || !txPrice) return;
    const newTx = {
      id: editingTx?.id || Date.now().toString(),
      type: txType, assetId: txAssetId,
      amount: parseFloat(txAmount), price: parseFloat(txPrice),
      date: txDate,
      createdAt: editingTx?.createdAt || new Date().toISOString()
    };
    if (editingTx) onUpdateTransactions(transactions.map(t => t.id === editingTx.id ? newTx : t));
    else onUpdateTransactions([...transactions, newTx]);
    setShowTxModal(false);
  };

  const deleteTx = (id) => {
    setConfirmDialog({
      title: 'İşlemi sil',
      message: 'Bu işlem kalıcı olarak silinecek ve portföyün yeniden hesaplanacak.',
      onConfirm: () => {
        onUpdateTransactions(transactions.filter(t => t.id !== id));
        setConfirmDialog(null);
      }
    });
  };

  const searchCoins = async (q) => {
    if (!q || q.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`https://api.coingecko.com/api/v3/search?query=${encodeURIComponent(q)}`);
      const data = await res.json();
      setSearchResults((data.coins || []).slice(0, 8));
    } catch (e) { console.error(e); }
    finally { setSearching(false); }
  };
  useEffect(() => {
    const timer = setTimeout(() => searchCoins(searchQuery), 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const addCoinToWatchlist = (coin) => {
    const newAsset = { id: coin.id, symbol: coin.symbol.toUpperCase(), name: coin.name, type: 'crypto', source: 'coingecko', cgId: coin.id };
    if (!watchedAssets.some(a => a.id === newAsset.id) && !DEFAULT_ASSETS.some(a => a.id === newAsset.id)) {
      onUpdateWatchedAssets([...watchedAssets, newAsset]);
    }
    setShowAddAssetModal(false);
    setSearchQuery(''); setSearchResults([]);
  };

  const handleSaveGoal = () => {
    if (!goalName || !goalAmount) return;
    const newGoal = {
      id: editingGoalId || Date.now().toString(),
      name: goalName, target: parseFloat(goalAmount),
      current: parseFloat(goalCurrent) || 0,
      period: goalPeriod,
      createdAt: editingGoalId ? investmentGoals.find(g => g.id === editingGoalId)?.createdAt : new Date().toISOString()
    };
    if (editingGoalId) onUpdateGoals(investmentGoals.map(g => g.id === editingGoalId ? newGoal : g));
    else onUpdateGoals([...investmentGoals, newGoal]);
    setShowGoalModal(false);
    setGoalName(''); setGoalAmount(''); setGoalCurrent(''); setGoalPeriod('yearly'); setEditingGoalId(null);
  };

  const tips = [
    { title: 'Çeşitlendirme', icon: '◐', body: 'Tüm yumurtalarını tek sepete koyma. Birikimini farklı varlık türleri arasında dağıt: hisse, altın, döviz, mevduat. Bir tanesi düşse bile diğerleri seni korur.' },
    { title: 'Dolar Maliyetleme (DCA)', icon: '◔', body: 'Her ay sabit miktar yatır, fiyatı düşünme. Düşük fiyatta çok, yüksek fiyatta az alırsın — uzun vadede ortalama maliyetin düşer.' },
    { title: 'Acil Durum Fonu', icon: '◑', body: 'Yatırım yapmadan önce 3-6 aylık giderini kapsayacak nakit yastığı oluştur. İşini kaybedersen yatırımlarını bozmak zorunda kalmazsın.' },
    { title: 'Uzun Vade Düşün', icon: '◒', body: 'Borsa kısa vadede gürültülü, uzun vadede yükselişe meyilli. Günlük dalgalanmalardan değil, 5-10 yıllık trendlerden yararlanmaya odaklan.' },
    { title: 'Borçla Yatırım Yapma', icon: '◓', body: 'Asla kredi veya kredi kartı borcuyla yatırım yapma. Faiz oranları çoğu yatırımın getirisinden yüksektir.' },
    { title: 'Duygularını Kontrol Et', icon: '◕', body: 'Korkuyla satma, açgözlülükle alma. Plana sadık kal, duyguya değil.' },
    { title: 'Anlamadığına Yatırma', icon: '◖', body: 'Bir varlığın ne olduğunu, nasıl para kazandığını ve risklerini açıklayamıyorsan ona yatırım yapma.' },
    { title: 'Vergileri Unutma', icon: '◗', body: 'Türkiye\'de yatırım gelirinin vergilendirme rejimini bil: hisse, kripto, döviz, kira gelirinin vergisi farklıdır.' }
  ];

  const styles = ``; // Styles handled by index.css and tailwind

  return (
    <div className="min-h-screen w-full animate-fade-in transition-all duration-700" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{styles}</style>
      <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 md:py-10">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onClose} className="ui-font flex items-center gap-2 text-xs px-3 py-2 transition-all"
            style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright, background: COLORS.bgPanel, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 }}>
            <ArrowLeft size={13} /><span className="hidden sm:inline">Bütçeye Dön</span><span className="sm:hidden">Geri</span>
          </button>
          <div className="flex items-center gap-2 ui-font text-xs" style={{ color: COLORS.textDim, letterSpacing: '0.15em' }}>
            <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: COLORS.accent }}></div>
            <span>CANLI</span>
          </div>
        </div>

        <div className="animate-fade-up delay-1 mb-6">
          <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.3em', textTransform: 'uppercase' }}>▌Yatırım Terminali</div>
          <h1 className="display-font text-4xl md:text-5xl transition-all duration-500 hover:neon-text-glow" style={{ fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, color: COLORS.textBrightest }}>
            <em style={{ fontWeight: 400, color: COLORS.accent }}>Mali</em> durumun.
          </h1>
        </div>

        <div className="animate-fade-up delay-2 grid grid-cols-4 gap-1 mb-6 p-1" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
          {[
            { id: 'portfolio', label: 'Mali Durum', icon: Wallet },
            { id: 'market', label: 'Piyasa', icon: BarChart3 },
            { id: 'goals', label: 'Hedefler', icon: Target },
            { id: 'tips', label: 'Tavsiyeler', icon: Activity }
          ].map(tab => {
            const Icon = tab.icon; const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="ui-font flex items-center justify-center gap-1.5 py-2.5 transition-all"
                className={`ui-font flex items-center justify-center gap-1.5 py-2.5 transition-all duration-300 rounded-lg ${isActive ? 'neon-border-glow' : 'hover:bg-slate-800'}`} style={{ background: isActive ? 'rgba(0, 255, 133, 0.1)' : 'transparent', color: isActive ? COLORS.bg : COLORS.textBright, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600 }}>
                <Icon size={11} /><span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div>
            <div className="animate-fade-up delay-3 mb-6 p-6 md:p-7" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', borderLeft: `3px solid ${COLORS.accent}` }}>
              <div className="ui-font text-xs mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Toplam Portföy Değeri</div>
              <div className="num-font text-4xl md:text-5xl mb-3" style={{ color: COLORS.textBrightest, fontWeight: 500, letterSpacing: '-0.02em' }}>
                {formatCurrency(portfolioValues.totalValue)}
              </div>
              {portfolioValues.totalCost > 0 && (
                <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <div className="num-font text-sm flex items-center gap-1" style={{ color: portfolioValues.totalProfitLoss >= 0 ? COLORS.positive : COLORS.negative }}>
                    {portfolioValues.totalProfitLoss >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                    {portfolioValues.totalProfitLoss >= 0 ? '+' : ''}{formatCurrency(portfolioValues.totalProfitLoss)} ({portfolioValues.totalProfitLossPct >= 0 ? '+' : ''}{portfolioValues.totalProfitLossPct.toFixed(2)}%)
                  </div>
                  <div className="num-font text-xs" style={{ color: COLORS.textDim }}>Maliyet: {formatCurrency(portfolioValues.totalCost)}</div>
                </div>
              )}
            </div>

            {periodPerformance && periodPerformance.some(p => p.changePct !== null) && (
              <div className="animate-fade-up delay-4 mb-6 p-4" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Dönemsel Performans</div>
                <div className="grid grid-cols-5 gap-2">
                  {periodPerformance.map(p => (
                    <div key={p.label} className="text-center p-2" style={{ background: COLORS.bgPanelLight }}>
                      <div className="num-font text-xs mb-1" style={{ color: COLORS.textDim }}>{p.label}</div>
                      {p.changePct !== null ? (
                        <div className="num-font text-xs" style={{ color: p.changePct >= 0 ? COLORS.positive : COLORS.negative, fontWeight: 600 }}>
                          {p.changePct >= 0 ? '+' : ''}{p.changePct.toFixed(1)}%
                        </div>
                      ) : <div className="num-font text-xs" style={{ color: COLORS.textDimmer }}>—</div>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {chartData.length > 1 && (
              <div className="animate-fade-up delay-4 mb-6 p-5" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <div className="flex items-center justify-between mb-4">
                  <div className="ui-font text-xs" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Değer Geçmişi</div>
                  <div className="flex gap-1">
                    {['7d', '30d', '90d', 'all'].map(p => (
                      <button key={p} onClick={() => setChartPeriod(p)} className="ui-font px-2 py-1 transition-all"
                        style={{ background: chartPeriod === p ? COLORS.accent : 'transparent', color: chartPeriod === p ? COLORS.bg : COLORS.textBright, border: `1px solid ${chartPeriod === p ? COLORS.accent : COLORS.border}`, fontSize: '10px', fontWeight: 600 }}>
                        {p === '7d' ? '7G' : p === '30d' ? '30G' : p === '90d' ? '90G' : 'Tümü'}
                      </button>
                    ))}
                  </div>
                </div>
                <div style={{ width: '100%', height: 220 }}>
                  <ResponsiveContainer>
                    <AreaChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="valueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.4}/>
                          <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <XAxis dataKey="date" stroke={COLORS.textDim} fontSize={10} tick={{ fill: COLORS.textDim }}
                        tickFormatter={(v) => { const d = new Date(v); return `${d.getDate()}/${d.getMonth() + 1}`; }} />
                      <YAxis stroke={COLORS.textDim} fontSize={10} tick={{ fill: COLORS.textDim }}
                        tickFormatter={(v) => v >= 1000 ? `${(v/1000).toFixed(0)}K` : v} />
                      <Tooltip contentStyle={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                        labelFormatter={(v) => new Date(v).toLocaleDateString('tr-TR')}
                        formatter={(v) => [formatCurrency(v), 'Değer']} />
                      <Area type="monotone" dataKey="value" stroke={COLORS.accent} strokeWidth={2} fill="url(#valueGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
                {chartData.length < 7 && (
                  <div className="ui-font text-xs mt-3" style={{ color: COLORS.textDimmer, fontStyle: 'italic' }}>
                    Grafik her gün uygulamayı açtığında zenginleşir. Şu an {chartData.length} gün veri var.
                  </div>
                )}
              </div>
            )}

            {portfolioValues.items.length > 0 && (
              <div className="animate-fade-up delay-5 mb-6 p-5" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <div className="ui-font text-xs mb-4" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Varlık Dağılımı</div>
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, idx) => (<Cell key={idx} fill={entry.color} stroke={COLORS.bg} strokeWidth={2} />))}
                        </Pie>
                        <Tooltip contentStyle={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
                          formatter={(v) => formatCurrency(v)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {portfolioValues.items.slice(0, 7).map((item, idx) => {
                      const pct = (item.currentValue / portfolioValues.totalValue) * 100;
                      return (
                        <div key={item.assetId} className="flex items-center gap-2">
                          <div className="w-3 h-3 flex-shrink-0" style={{ background: PIE_COLORS[idx % PIE_COLORS.length] }}></div>
                          <span className="ui-font text-xs flex-1 truncate" style={{ color: COLORS.textBright }}>{item.asset.symbol}</span>
                          <span className="num-font text-xs" style={{ color: COLORS.textDim }}>%{pct.toFixed(1)}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            <div className="animate-fade-up delay-6 mb-6">
              <div className="flex items-center justify-between mb-3">
                <div className="ui-font text-xs" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  Varlıklar ({portfolioValues.items.length})
                </div>
                <button onClick={() => openTxModal()} className="ui-font flex items-center gap-1.5 text-xs px-3 py-2 transition-all"
                  style={{ background: COLORS.accent, color: COLORS.bg, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                  <Plus size={11} />Yeni İşlem
                </button>
              </div>

              {portfolioValues.items.length === 0 ? (
                <div className="text-center py-12 px-6" style={{ background: COLORS.bgPanel, border: `1px dashed ${COLORS.border}` }}>
                  <Wallet size={32} className="mx-auto mb-3" style={{ color: COLORS.textDim }} />
                  <div className="ui-font text-sm mb-2" style={{ color: COLORS.textBright }}>Henüz varlığın yok</div>
                  <div className="ui-font text-xs" style={{ color: COLORS.textDim, lineHeight: 1.5 }}>"Yeni İşlem" butonuyla ilk al-sat işlemini ekle</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {portfolioValues.items.map(item => (
                    <div key={item.assetId} className="p-4" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="min-w-0">
                          <div className="display-font text-base mb-0.5" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{item.asset.name}</div>
                          <div className="num-font text-xs" style={{ color: COLORS.textDim }}>{formatAmount(item.amount)} {item.asset.symbol}</div>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="num-font text-base" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{formatCurrency(item.currentValue)}</div>
                          <div className="num-font text-xs" style={{ color: item.profitLoss >= 0 ? COLORS.positive : COLORS.negative }}>
                            {item.profitLoss >= 0 ? '+' : ''}{formatCurrency(item.profitLoss)} ({item.profitLossPct >= 0 ? '+' : ''}{item.profitLossPct.toFixed(1)}%)
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap justify-between text-xs pt-2 mt-2 num-font gap-x-3 gap-y-1" style={{ borderTop: `1px solid ${COLORS.border}`, color: COLORS.textDim }}>
                        <span>Maliyet: {formatCurrency(item.avgCost)}</span>
                        <span>Anlık: {formatCurrency(item.currentPrice)}</span>
                        {item.change24h !== 0 && (
                          <span style={{ color: item.change24h >= 0 ? COLORS.positive : COLORS.negative }}>
                            24S: {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {transactions.length > 0 && (
              <div className="animate-fade-up delay-7 mb-6">
                <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  İşlem Geçmişi ({transactions.length})
                </div>
                <div className="space-y-1.5">
                  {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(tx => {
                    const asset = allAssets.find(a => a.id === tx.assetId);
                    if (!asset) return null;
                    const isBuy = tx.type === 'buy';
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                        <div className="w-8 h-8 flex items-center justify-center flex-shrink-0" style={{ background: isBuy ? 'rgba(122, 224, 122, 0.1)' : 'rgba(255, 107, 107, 0.1)', border: `1px solid ${isBuy ? COLORS.borderLight : '#5A2A2A'}`, color: isBuy ? COLORS.positive : COLORS.negative }}>
                          {isBuy ? <ArrowDownRight size={14} /> : <ArrowUpRight size={14} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="ui-font text-xs" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{isBuy ? 'AL' : 'SAT'} {asset.symbol}</div>
                          <div className="num-font text-xs" style={{ color: COLORS.textDim }}>{formatAmount(tx.amount)} × {formatCurrency(tx.price)}</div>
                        </div>
                        <div className="text-right">
                          <div className="num-font text-sm" style={{ color: COLORS.textBright }}>{formatCurrency(tx.amount * tx.price)}</div>
                          <div className="ui-font text-xs" style={{ color: COLORS.textDimmer }}>
                            {new Date(tx.date).toLocaleDateString('tr-TR', { day: '2-digit', month: 'short' })}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button onClick={() => openTxModal(tx)} className="w-6 h-6 flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBright }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button onClick={() => deleteTx(tx.id)} className="w-6 h-6 flex items-center justify-center" style={{ border: '1px solid #F43F5E', borderRadius: '6px', color: COLORS.negative }}>
                            <X size={10} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {monthlyInvestmentBudget > 0 && (
              <div className="animate-fade-up delay-8 mb-6 p-5" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Aylık Yatırım Bütçen</div>
                <div className="num-font text-2xl mb-2" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{formatCurrency(monthlyInvestmentBudget)}</div>
                <div className="ui-font text-xs" style={{ color: COLORS.textDim, lineHeight: 1.5 }}>
                  Bütçe sayfanda her ay maaşının bir kısmını yatırıma ayırıyorsun. Bu tutarı buradan kripto/altın/dövize dönüştürebilirsin.
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKET TAB */}
        {activeTab === 'market' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="ui-font text-xs" style={{ color: COLORS.textDim }}>
                {lastUpdate ? `Son: ${lastUpdate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : 'Yükleniyor...'}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowAddAssetModal(true)} className="ui-font flex items-center gap-1.5 text-xs px-3 py-2 transition-all"
                  style={{ background: COLORS.accent, color: COLORS.bg, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                  <Plus size={11} />Coin Ekle
                </button>
                <button onClick={fetchPrices} disabled={pricesLoading} className="ui-font flex items-center gap-1.5 text-xs px-3 py-2 transition-all"
                  style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright, background: 'transparent', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                  <RefreshCw size={11} className={pricesLoading ? 'spin' : ''} />Yenile
                </button>
              </div>
            </div>

            {pricesError && (
              <div className="p-4 mb-5 ui-font text-sm flex items-start gap-2" style={{ background: 'rgba(255, 107, 107, 0.05)', border: '1px solid #F43F5E', borderRadius: '6px', color: COLORS.negative }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />{pricesError}
              </div>
            )}

            <div className="grid gap-2">
              {allAssets.map((asset, idx) => {
                const p = prices[asset.id];
                const change = p?.change;
                const isCustom = !DEFAULT_ASSETS.some(d => d.id === asset.id);
                return (
                  <div key={asset.id} className={`fade-up delay-${Math.min(idx + 1, 8)} p-4`}
                    className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', borderLeft: `3px solid ${COLORS.accent}` }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="num-font text-xs mb-0.5" style={{ color: COLORS.textDim, letterSpacing: '0.1em' }}>{asset.symbol}</div>
                        <div className="ui-font text-sm truncate" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{asset.name}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="num-font text-base" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>
                          {p?.try ? formatCurrency(p.try) : '—'}
                        </div>
                        {change !== undefined && change !== 0 && (
                          <div className="num-font text-xs flex items-center justify-end gap-1" style={{ color: change > 0 ? COLORS.positive : COLORS.negative }}>
                            {change > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                            {change.toFixed(2)}%
                          </div>
                        )}
                      </div>
                      {isCustom && (
                        <button onClick={() => onUpdateWatchedAssets(watchedAssets.filter(a => a.id !== asset.id))} className="w-6 h-6 flex items-center justify-center flex-shrink-0"
                          style={{ border: '1px solid #F43F5E', borderRadius: '6px', color: COLORS.negative }} title="Kaldır">
                          <X size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 p-3 ui-font text-xs" style={{ color: COLORS.textDimmer, lineHeight: 1.5 }}>
              Veri kaynakları: Frankfurter (döviz), CoinGecko (kripto, altın). 5 dakikada bir otomatik güncellenir.
            </div>
          </div>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <div>
            <div className="flex items-center justify-between mb-5">
              <div className="ui-font text-xs" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>{investmentGoals.length} Hedef</div>
              <button onClick={() => { setEditingGoalId(null); setGoalName(''); setGoalAmount(''); setGoalCurrent(''); setGoalPeriod('yearly'); setShowGoalModal(true); }}
                className="ui-font flex items-center gap-1.5 text-xs px-3 py-2 transition-all"
                style={{ background: COLORS.accent, color: COLORS.bg, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                <Plus size={11} />Yeni Hedef
              </button>
            </div>

            {investmentGoals.length === 0 ? (
              <div className="text-center py-12 px-6" style={{ background: COLORS.bgPanel, border: `1px dashed ${COLORS.border}` }}>
                <Target size={32} className="mx-auto mb-3" style={{ color: COLORS.textDim }} />
                <div className="ui-font text-sm mb-2" style={{ color: COLORS.textBright }}>Henüz hedef yok</div>
                <div className="ui-font text-xs" style={{ color: COLORS.textDim, lineHeight: 1.5 }}>
                  Mevcut tutar girilirse manuel takip,<br/>boş bırakılırsa portföy değerine bağlanır.
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {investmentGoals.map((goal, idx) => {
                  const usingPortfolio = !goal.current || goal.current === 0;
                  const current = usingPortfolio ? portfolioValues.totalValue : goal.current;
                  const pct = Math.min((current / goal.target) * 100, 100);
                  const isComplete = pct >= 100;
                  return (
                    <div key={goal.id} className={`fade-up delay-${Math.min(idx + 1, 7)} p-5`}
                      style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', borderLeft: `3px solid ${isComplete ? COLORS.gold : COLORS.accent}` }}>
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="display-font text-xl mb-1" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{goal.name}</div>
                          <div className="num-font text-xs" style={{ color: COLORS.textDim }}>
                            {formatCurrency(current)} / {formatCurrency(goal.target)}
                            {usingPortfolio && <span style={{ marginLeft: '6px', color: COLORS.textDimmer }}>(portföye bağlı)</span>}
                            {goal.period && <span style={{ marginLeft: '6px', color: COLORS.textDimmer }}>· {goal.period === 'monthly' ? 'aylık' : 'yıllık'}</span>}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <button onClick={() => { setEditingGoalId(goal.id); setGoalName(goal.name); setGoalAmount(goal.target.toString()); setGoalCurrent((goal.current || 0).toString()); setGoalPeriod(goal.period || 'yearly'); setShowGoalModal(true); }}
                            className="w-7 h-7 flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBright }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button onClick={() => onUpdateGoals(investmentGoals.filter(g => g.id !== goal.id))} className="w-7 h-7 flex items-center justify-center" style={{ border: '1px solid #F43F5E', borderRadius: '6px', color: COLORS.negative }}>
                            <X size={11} />
                          </button>
                        </div>
                      </div>
                      <div className="h-1.5 w-full mb-2" style={{ background: 'rgba(122, 224, 122, 0.15)' }}>
                        <div className="h-full transition-all" style={{ width: `${pct}%`, background: isComplete ? COLORS.gold : COLORS.accent }}></div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="num-font text-xs" style={{ color: isComplete ? COLORS.gold : COLORS.accent, fontWeight: 600 }}>%{pct.toFixed(1)}</div>
                        {!isComplete ? (
                          <div className="num-font text-xs" style={{ color: COLORS.textDim }}>{formatCurrency(goal.target - current)} kaldı</div>
                        ) : (
                          <div className="ui-font text-xs" style={{ color: COLORS.gold, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>✓ Tamamlandı</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TIPS TAB */}
        {activeTab === 'tips' && (
          <div className="space-y-3">
            {tips.map((tip, idx) => (
              <div key={idx} className={`fade-up delay-${Math.min(idx + 1, 7)} p-5`} className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <div className="flex items-start gap-4">
                  <div className="display-font text-3xl flex-shrink-0" style={{ color: COLORS.accent, lineHeight: 1 }}>{tip.icon}</div>
                  <div className="min-w-0 flex-1">
                    <div className="display-font text-lg mb-2" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{tip.title}</div>
                    <div className="ui-font text-sm" style={{ color: COLORS.textBright, lineHeight: 1.6 }}>{tip.body}</div>
                  </div>
                </div>
              </div>
            ))}
            <div className="p-4 ui-font text-xs" style={{ color: COLORS.textDimmer, lineHeight: 1.5 }}>
              <strong style={{ color: COLORS.textBright }}>Not:</strong> Bu bilgiler genel finansal okuryazarlık içeriğidir, yatırım tavsiyesi değildir.
            </div>
          </div>
        )}
      </div>

      {/* TX MODAL */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setShowTxModal(false)}>
          <div className="scale-in w-full max-w-md p-6 md:p-7" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{editingTx ? 'Düzenle' : 'Yeni İşlem'}</div>
                <h3 className="display-font text-xl" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>Al veya <em style={{ color: COLORS.accent }}>sat</em></h3>
              </div>
              <button onClick={() => setShowTxModal(false)} className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright }}>
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 mb-5 p-1" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
              <button onClick={() => setTxType('buy')} className="ui-font py-2.5"
                style={{ background: txType === 'buy' ? COLORS.positive : 'transparent', color: txType === 'buy' ? COLORS.bg : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ALIŞ</button>
              <button onClick={() => setTxType('sell')} className="ui-font py-2.5"
                style={{ background: txType === 'sell' ? COLORS.negative : 'transparent', color: txType === 'sell' ? '#FFFFFF' : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>SATIŞ</button>
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Varlık</label>
              <select value={txAssetId} onChange={(e) => { setTxAssetId(e.target.value); const p = prices[e.target.value]?.try; if (p && !txPrice) setTxPrice(p.toFixed(2)); }}
                className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBright, fontSize: '14px' }}>
                <option value="">Seç...</option>
                {allAssets.map(a => (<option key={a.id} value={a.id} style={{ background: COLORS.bgPanel }}>{a.symbol} — {a.name}</option>))}
              </select>
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Miktar</label>
              <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0" step="any"
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBrightest, fontSize: '20px' }} />
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs flex items-center justify-between mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                <span>Birim Fiyat (₺)</span>
                {txAssetId && prices[txAssetId]?.try && (
                  <button onClick={() => setTxPrice(prices[txAssetId].try.toFixed(2))} className="num-font" style={{ color: COLORS.accent, fontSize: '10px', textTransform: 'none', letterSpacing: 0 }}>
                    Şu an: {formatCurrency(prices[txAssetId].try)}
                  </button>
                )}
              </label>
              <input type="number" value={txPrice} onChange={(e) => setTxPrice(e.target.value)} placeholder="0" step="any"
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBrightest, fontSize: '20px' }} />
            </div>

            <div className="mb-5">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Tarih</label>
              <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBright, fontSize: '14px', colorScheme: 'dark' }} />
            </div>

            {txAmount && txPrice && (
              <div className="mb-5 p-3" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Toplam</div>
                <div className="num-font text-xl" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{formatCurrency(parseFloat(txAmount) * parseFloat(txPrice))}</div>
              </div>
            )}

            <button onClick={handleSaveTx} disabled={!txAssetId || !txAmount || !txPrice} className="w-full ui-font py-3 transition-all"
              style={{
                background: (!txAssetId || !txAmount || !txPrice) ? COLORS.border : (txType === 'buy' ? COLORS.positive : COLORS.negative),
                color: (!txAssetId || !txAmount || !txPrice) ? COLORS.textDim : (txType === 'buy' ? COLORS.bg : '#FFFFFF'),
                cursor: (!txAssetId || !txAmount || !txPrice) ? 'not-allowed' : 'pointer',
                letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '12px', fontWeight: 600
              }}>
              {editingTx ? 'Güncelle' : (txType === 'buy' ? 'Alış İşlemini Kaydet' : 'Satış İşlemini Kaydet')}
            </button>
          </div>
        </div>
      )}

      {/* ADD ASSET MODAL */}
      {showAddAssetModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setShowAddAssetModal(false)}>
          <div className="scale-in w-full max-w-md p-6 md:p-7" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Coin Ekle</div>
                <h3 className="display-font text-xl" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>Piyasaya <em style={{ color: COLORS.accent }}>ekle</em></h3>
              </div>
              <button onClick={() => setShowAddAssetModal(false)} className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright }}>
                <X size={14} />
              </button>
            </div>

            <div className="relative mb-4">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textDim }} />
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="örn: avalanche, cardano, dogecoin..." autoFocus
                className="ui-font w-full pl-10 p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBrightest, fontSize: '14px' }} />
            </div>

            {searching && <div className="text-center py-4 ui-font text-xs" style={{ color: COLORS.textDim }}>Aranıyor...</div>}

            <div className="space-y-1.5 mb-4">
              {searchResults.map(coin => {
                const alreadyAdded = watchedAssets.some(a => a.id === coin.id) || DEFAULT_ASSETS.some(a => a.id === coin.id);
                return (
                  <button key={coin.id} onClick={() => !alreadyAdded && addCoinToWatchlist(coin)} disabled={alreadyAdded}
                    className="w-full flex items-center gap-3 p-3 transition-all text-left"
                    style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', opacity: alreadyAdded ? 0.5 : 1, cursor: alreadyAdded ? 'not-allowed' : 'pointer' }}>
                    {coin.thumb && <img src={coin.thumb} alt="" className="w-7 h-7 flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <div className="ui-font text-sm" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{coin.name}</div>
                      <div className="num-font text-xs" style={{ color: COLORS.textDim }}>
                        {coin.symbol?.toUpperCase()} {coin.market_cap_rank ? `· #${coin.market_cap_rank}` : ''}
                      </div>
                    </div>
                    {alreadyAdded ? (<span className="ui-font text-xs" style={{ color: COLORS.textDim }}>Ekli</span>) : (<Plus size={14} style={{ color: COLORS.accent }} />)}
                  </button>
                );
              })}
            </div>

            {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
              <div className="text-center py-6 ui-font text-xs" style={{ color: COLORS.textDim }}>"{searchQuery}" için sonuç yok</div>
            )}
            {!searchQuery && (
              <div className="text-center py-6 ui-font text-xs" style={{ color: COLORS.textDim, lineHeight: 1.5 }}>
                Coin adı veya sembolü yaz<br/>
                <span style={{ color: COLORS.textDimmer }}>10.000+ kripto destekleniyor</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* GOAL MODAL */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setShowGoalModal(false)}>
          <div className="scale-in w-full max-w-md p-6 md:p-7" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{editingGoalId ? 'Düzenle' : 'Yeni'}</div>
                <h3 className="display-font text-xl" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>Yatırım <em style={{ color: COLORS.accent }}>hedefi</em></h3>
              </div>
              <button onClick={() => setShowGoalModal(false)} className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright }}>
                <X size={14} />
              </button>
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Ad</label>
              <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Örn: Emeklilik fonu" autoFocus
                className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBrightest, fontSize: '14px' }} />
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Hedef Tutar (₺)</label>
              <input type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="100000"
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBrightest, fontSize: '20px' }} />
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Mevcut <span style={{ textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic' }}>(boş = portföye bağlanır)</span>
              </label>
              <input type="number" value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} placeholder="0"
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px', color: COLORS.textBright, fontSize: '16px' }} />
            </div>

            <div className="mb-6">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Periyot</label>
              <div className="grid grid-cols-2 gap-1 p-1" className="rounded-xl transition-all duration-300 hover:neon-border-glow" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderRadius: '8px' }}>
                <button onClick={() => setGoalPeriod('monthly')} className="ui-font py-2"
                  style={{ background: goalPeriod === 'monthly' ? COLORS.accent : 'transparent', color: goalPeriod === 'monthly' ? COLORS.bg : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Aylık</button>
                <button onClick={() => setGoalPeriod('yearly')} className="ui-font py-2"
                  style={{ background: goalPeriod === 'yearly' ? COLORS.accent : 'transparent', color: goalPeriod === 'yearly' ? COLORS.bg : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Yıllık</button>
              </div>
            </div>

            <button onClick={handleSaveGoal} disabled={!goalName || !goalAmount} className="w-full ui-font py-3"
              style={{ background: (!goalName || !goalAmount) ? COLORS.border : COLORS.accent, color: (!goalName || !goalAmount) ? COLORS.textDim : COLORS.bg, cursor: (!goalName || !goalAmount) ? 'not-allowed' : 'pointer', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
              {editingGoalId ? 'Güncelle' : 'Hedef Oluştur'}
            </button>
          </div>
        </div>
      )}

      {/* CONFIRM DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 100 }} onClick={() => setConfirmDialog(null)}>
          <div className="w-full max-w-sm p-6" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px' }} onClick={(e) => e.stopPropagation()}>
            <div className="ui-font text-xs mb-2" style={{ color: COLORS.negative, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Onay Gerekli</div>
            <h3 className="display-font text-xl mb-3" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>{confirmDialog.title}</h3>
            <p className="ui-font text-sm mb-6" style={{ color: COLORS.textBright, lineHeight: 1.5 }}>{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 ui-font py-3" style={{ background: 'transparent', border: `1px solid ${COLORS.borderLight}`, borderRadius: '8px', color: COLORS.textBright, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 500 }}>Vazgeç</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 ui-font py-3" style={{ background: COLORS.negative, color: '#FFFFFF', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
