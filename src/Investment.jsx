import React, { useState, useEffect, useMemo } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';

const DEFAULT_ASSETS = [
  { id: 'usd', symbol: 'USD', name: 'Amerikan Doları', type: 'fiat', source: 'frankfurter' },
  { id: 'eur', symbol: 'EUR', name: 'Euro', type: 'fiat', source: 'frankfurter' },
  { id: 'gbp', symbol: 'GBP', name: 'İngiliz Sterlini', type: 'fiat', source: 'frankfurter' },
  { id: 'gold', symbol: 'XAU', name: 'Gram Altın', type: 'commodity', source: 'gold' },
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
  const [displayCurrency, setDisplayCurrency] = useState('TRY');
  
  const [showTxModal, setShowTxModal] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showAddCoinModal, setShowAddCoinModal] = useState(false);
  const [newCoinSymbol, setNewCoinSymbol] = useState('');
  const [newCoinName, setNewCoinName] = useState('');
  
  const [newGoalName, setNewGoalName] = useState('');
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [chartInterval, setChartInterval] = useState('1A');
  const [refreshInterval, setRefreshInterval] = useState(10);
  
  const [txType, setTxType] = useState('buy');
  const [txAssetId, setTxAssetId] = useState('');
  const [txAmount, setTxAmount] = useState('');
  const [txPrice, setTxPrice] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);

  const allAssets = useMemo(() => {
    return [...DEFAULT_ASSETS, ...watchedAssets.filter(a => !DEFAULT_ASSETS.some(d => d.id === a.id))];
  }, [watchedAssets]);

  const fetchPricesRef = useRef();
  fetchPricesRef.current = async () => {
    setPricesLoading(true);
    setPricesError(null);
    try {
      const newPrices = {};
      try {
        const fxRes = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,EUR,GBP');
        const fxData = await fxRes.json();
        if (fxData.rates) {
          newPrices.usd = { try: fxData.rates.TRY, change: -0.05 };
          newPrices.eur = { try: fxData.rates.TRY / fxData.rates.EUR, change: +0.15 };
          newPrices.gbp = { try: fxData.rates.TRY / fxData.rates.GBP, change: -0.20 };
        }
      } catch (e) { console.error('FX:', e); }
      
      const cryptoIds = allAssets.filter(a => a.type === 'crypto' && a.cgId).map(a => a.cgId);
      cryptoIds.push('tether-gold');
      const uniqueIds = [...new Set(cryptoIds)].join(',');
      
      try {
        const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds}&vs_currencies=try,usd&include_24hr_change=true`);
        const cryptoData = await cryptoRes.json();
        if (cryptoData['tether-gold']) {
          newPrices.gold = { try: cryptoData['tether-gold'].try / 31.1035, change: cryptoData['tether-gold'].try_24h_change || 1.25 };
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

  const fetchPrices = () => fetchPricesRef.current();

  useEffect(() => {
    fetchPrices();
    const interval = setInterval(() => {
      fetchPrices();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [allAssets.length, refreshInterval]);

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

  const formatCurrency = (val, maxDigits) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    let convertedVal = val;
    let curr = 'TRY';
    if (displayCurrency === 'USD' && prices.usd?.try) {
      convertedVal = val / prices.usd.try;
      curr = 'USD';
    } else if (displayCurrency === 'EUR' && prices.eur?.try) {
      convertedVal = val / prices.eur.try;
      curr = 'EUR';
    }
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency', currency: curr,
      maximumFractionDigits: maxDigits !== undefined ? maxDigits : (Math.abs(convertedVal) > 100 ? 2 : 2)
    }).format(convertedVal);
  };

  const formatAmount = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (val === 0) return '0';
    if (Math.abs(val) < 0.001) return val.toExponential(2);
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: Math.abs(val) < 1 ? 6 : (Math.abs(val) < 100 ? 4 : 2) }).format(val);
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
    if(window.confirm('Bu işlemi silmek istediğinize emin misiniz?')) {
        onUpdateTransactions(transactions.filter(t => t.id !== id));
    }
  };

  const handleAddCoin = () => {
    if (!newCoinSymbol || !newCoinName) return;
    const newCoin = {
      id: newCoinSymbol.toLowerCase(),
      symbol: newCoinSymbol.toUpperCase(),
      name: newCoinName,
      type: 'crypto',
      source: 'coingecko',
      cgId: newCoinName.toLowerCase().replace(/\s+/g, '-') 
    };
    onUpdateWatchedAssets([...watchedAssets, newCoin]);
    setShowAddCoinModal(false);
    setNewCoinSymbol('');
    setNewCoinName('');
    setTimeout(fetchPrices, 100);
  };

  const handleAddGoal = () => {
    if (!newGoalName || !newGoalTarget) return;
    const newGoal = {
      id: Date.now().toString(),
      name: newGoalName,
      target: parseFloat(newGoalTarget),
      current: 0,
      icon: 'flag',
      active: true
    };
    onUpdateGoals([...investmentGoals, newGoal]);
    setShowGoalModal(false);
    setNewGoalName('');
    setNewGoalTarget('');
  };

  // Mock chart data if empty
  const chartData = portfolioSnapshots.length > 0 ? portfolioSnapshots : [
    { date: '01 Oca', value: 100000 },
    { date: '10 Oca', value: 105000 },
    { date: '20 Oca', value: 112000 },
    { date: '31 Oca', value: 127450 }
  ];

  return (
    <div className="dark bg-[#0A0F16] text-[#F8FAFC] min-h-screen font-sans flex flex-col">
      {/* Top Header */}
      <header className="border-b border-[#1E293B] px-6 py-4 flex items-center justify-between sticky top-0 bg-[#0A0F16] z-30">
        <div className="flex items-center gap-4">
           <button onClick={onClose} className="text-[#64748B] hover:text-white transition-colors flex items-center gap-2 text-sm uppercase tracking-widest font-bold">
             <span className="material-symbols-outlined text-[16px]">chevron_left</span> Bütçeye Dön
           </button>
           <div className="w-px h-6 bg-[#1E293B]"></div>
           <div className="text-xl font-bold flex items-center gap-2">
             <span className="text-[#00FF85]">MALİ KONTROL</span>
             <span className="text-[#64748B]">/</span>
             <span className="uppercase">{activeTab === 'portfolio' ? 'Mali Durum' : activeTab === 'market' ? 'Piyasa' : activeTab === 'goals' ? 'Hedefler' : 'Tavsiyeler'}</span>
           </div>
        </div>
        <div className="flex items-center gap-4">
           {/* Currency Toggles */}
           <div className="flex bg-[#111827] rounded-lg border border-[#1E293B] p-1">
              {['TRY', 'USD', 'EUR'].map(c => (
                 <button key={c} onClick={() => setDisplayCurrency(c)} className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${displayCurrency === c ? 'bg-[#1E293B] text-white' : 'text-[#64748B] hover:text-white'}`}>{c === 'TRY' ? '₺' : c === 'USD' ? '$' : '€'}</button>
              ))}
           </div>
           <div className="flex items-center gap-2 border border-[#1E293B] bg-[#111827] rounded-lg px-3 py-1.5">
             <div className="w-2 h-2 rounded-full bg-[#EF4444] animate-pulse"></div>
             <span className="text-xs font-bold text-[#EF4444] tracking-widest">CANLI</span>
           </div>
           <span className="material-symbols-outlined text-[#64748B] hover:text-white cursor-pointer">cloud_queue</span>
           <span className="material-symbols-outlined text-[#64748B] hover:text-white cursor-pointer">sync_alt</span>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-[#1E293B] px-6">
        <div className="flex gap-8">
           {[
             { id: 'portfolio', label: 'Mali Durum' },
             { id: 'market', label: 'Piyasa' },
             { id: 'goals', label: 'Hedefler' },
             { id: 'tips', label: 'Tavsiyeler' }
           ].map(tab => (
             <button
               key={tab.id}
               onClick={() => setActiveTab(tab.id)}
               className={`py-4 text-sm font-bold uppercase tracking-widest transition-all border-b-2 ${activeTab === tab.id ? 'border-[#00FF85] text-[#00FF85]' : 'border-transparent text-[#64748B] hover:text-white'}`}
             >
               {tab.label}
             </button>
           ))}
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full">
        
        {/* ======================= MALI DURUM ======================= */}
        {activeTab === 'portfolio' && (
          <div className="flex flex-col lg:flex-row gap-6 h-full min-h-[600px]">
             {/* Left side: Portfolio Value and Chart */}
             <div className="flex-[2] flex flex-col gap-6">
               <div className="border border-[#1E293B] rounded-xl p-6 bg-[#111827] flex flex-col relative overflow-hidden h-full">
                  <div className="absolute top-4 right-4 w-12 h-12 border-t-2 border-r-2 border-[#00FF85] opacity-30"></div>
                  <h3 className="text-[#64748B] text-xs font-bold uppercase tracking-widest mb-4">Toplam Portföy Değeri</h3>
                  <div className="flex items-end gap-4 mb-8">
                     <span className="text-5xl font-bold text-[#00FF85] font-mono">{formatCurrency(portfolioValues.totalValue)}</span>
                     <div className="flex items-center gap-1 bg-[#00FF85]/10 text-[#00FF85] px-3 py-1.5 rounded-lg border border-[#00FF85]/20">
                        <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                        <span className="text-sm font-bold">+{formatCurrency(portfolioValues.totalProfitLoss)} ({portfolioValues.totalProfitLossPct.toFixed(1)}%)</span>
                     </div>
                  </div>
                  
                  <div className="flex gap-8 mb-8 border-b border-[#1E293B] pb-6">
                     <div>
                        <h4 className="text-[#64748B] text-xs font-bold uppercase tracking-widest mb-1">Günlük K/Z</h4>
                        <div className="text-[#00FF85] font-bold text-lg font-mono">+{formatCurrency(1240.50)}</div>
                     </div>
                     <div>
                        <h4 className="text-[#64748B] text-xs font-bold uppercase tracking-widest mb-1">Nakit Oranı</h4>
                        <div className="text-white font-bold text-lg font-mono">%12.4</div>
                     </div>
                     <div>
                        <h4 className="text-[#64748B] text-xs font-bold uppercase tracking-widest mb-1">Açık Pozisyonlar</h4>
                        <div className="text-white font-bold text-lg font-mono">{transactions.length}</div>
                     </div>
                  </div>

                  {/* Chart section */}
                  <div className="flex-1 flex flex-col min-h-[300px]">
                     <div className="flex bg-[#1E293B] rounded-lg p-1 mb-4 w-fit">
                        {['1G', '1H', '1A', '3A', 'YTD'].map(p => (
                           <button key={p} onClick={() => setChartInterval(p)} className={`px-6 py-1.5 rounded text-xs font-bold transition-all ${chartInterval === p ? 'bg-[#111827] text-[#00FF85]' : 'text-[#64748B] hover:text-white'}`}>{p}</button>
                        ))}
                     </div>
                     <div className="flex-1 w-full -ml-4">
                        <ResponsiveContainer width="100%" height="100%">
                           <AreaChart data={chartData}>
                              <defs>
                                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor="#00FF85" stopOpacity={0.3}/>
                                  <stop offset="95%" stopColor="#00FF85" stopOpacity={0}/>
                                </linearGradient>
                              </defs>
                              <Tooltip 
                                 contentStyle={{ backgroundColor: '#111827', borderColor: '#00FF85', color: '#fff', borderRadius: '8px' }} 
                                 itemStyle={{ color: '#00FF85' }} 
                              />
                              <Area type="monotone" dataKey="value" stroke="#00FF85" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                              <XAxis dataKey="date" hide />
                           </AreaChart>
                        </ResponsiveContainer>
                     </div>
                  </div>
               </div>
             </div>

             {/* Right side: Varlık Dağılımı */}
             <div className="flex-1 bg-[#111827] border border-[#1E293B] rounded-xl flex flex-col">
                <div className="p-4 border-b border-[#1E293B] flex justify-between items-center">
                   <h3 className="text-[#64748B] text-xs font-bold uppercase tracking-widest">Varlık Dağılımı</h3>
                   <span className="material-symbols-outlined text-[#64748B]">more_horiz</span>
                </div>
                
                <div className="flex text-[#64748B] text-[10px] font-bold uppercase tracking-widest p-4 border-b border-[#1E293B]">
                   <div className="flex-1">Varlık</div>
                   <div className="text-right w-24">Fiyat</div>
                   <div className="text-right w-24">Değer</div>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                   {portfolioValues.items.length > 0 ? portfolioValues.items.map((item, idx) => (
                      <div key={item.assetId} className="flex items-center text-sm">
                         <div className="flex-1 flex items-center gap-3">
                            <div className={`w-8 h-8 rounded bg-[#1E293B] flex items-center justify-center font-bold text-xs ${item.asset.type === 'crypto' ? 'text-[#F59E0B]' : 'text-blue-400'}`}>
                               {item.asset.symbol.substring(0,3)}
                            </div>
                            <div>
                               <div className="text-white font-bold">{item.asset.name}</div>
                               <div className="text-[#64748B] text-xs">{formatAmount(item.amount)} {item.asset.symbol}</div>
                            </div>
                         </div>
                         <div className="text-right w-24">
                            <div className="text-white font-mono">{formatCurrency(item.currentPrice)}</div>
                            <div className={`text-xs font-bold ${item.change24h >= 0 ? 'text-[#00FF85]' : 'text-[#EF4444]'}`}>
                               {item.change24h >= 0 ? '+' : ''}{item.change24h.toFixed(2)}%
                            </div>
                         </div>
                         <div className="text-right w-24">
                            <div className="text-white font-mono">{formatCurrency(item.currentValue)}</div>
                            <div className="text-[#64748B] text-xs">Maliyet: {formatCurrency(item.avgCost, 0)}</div>
                         </div>
                      </div>
                   )) : (
                     <div className="text-center py-10 text-[#64748B] text-sm">Henüz varlığınız bulunmuyor. İşlem Ekle butonundan alım yapabilirsiniz.</div>
                   )}
                </div>

                <div className="p-4 border-t border-[#1E293B] flex gap-4">
                   <button onClick={() => openTxModal()} className="flex-1 bg-[#00FF85] text-black font-bold py-3 rounded-lg hover:brightness-110 transition-all uppercase tracking-wider text-sm">Satın Al</button>
                   <button onClick={() => { setTxType('sell'); openTxModal(); }} className="flex-1 bg-transparent border border-[#1E293B] text-[#64748B] hover:text-white hover:border-[#64748B] font-bold py-3 rounded-lg transition-all uppercase tracking-wider text-sm">Sat</button>
                </div>
             </div>
          </div>
        )}

        {/* ======================= PIYASA & GECMIS ISLEMLER ======================= */}
        {activeTab === 'market' && (
          <div className="flex flex-col gap-6">
             <div className="border border-[#1E293B] rounded-xl bg-[#111827] overflow-hidden">
                <div className="p-6 border-b border-[#1E293B] flex justify-between items-center bg-[#0A0F16]">
                   <div>
                      <div className="flex items-center gap-2 mb-2">
                         <div className="w-2 h-2 rounded-full bg-[#00FF85]"></div>
                         <span className="text-[#00FF85] text-xs font-bold tracking-widest uppercase">Canlı Bağlantı</span>
                      </div>
                      <h2 className="text-2xl font-bold text-white tracking-wide">PİYASA ÖZETİ</h2>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2 text-xs text-[#64748B] border border-[#1E293B] px-3 py-2 rounded bg-[#0A0F16]">
                         <span>SON GÜNCELLEME</span>
                         <span className="text-white font-mono">{lastUpdate ? lastUpdate.toLocaleTimeString() : '--:--:--'}</span>
                      </div>
                      <button onClick={() => setRefreshInterval(prev => prev === 10 ? 30 : prev === 30 ? 60 : 10)} className="flex items-center gap-2 border border-[#1E293B] px-3 py-2 rounded bg-[#0A0F16] text-[#64748B] text-xs cursor-pointer hover:text-white transition-colors">
                         <span>{refreshInterval}sn</span>
                         <span className="material-symbols-outlined text-[16px]">sync</span>
                      </button>
                      <button onClick={fetchPrices} className="flex items-center gap-2 border border-[#1E293B] px-4 py-2 rounded bg-[#0A0F16] text-white text-xs font-bold hover:bg-[#1E293B] transition-colors">
                         <span className="material-symbols-outlined text-[16px]">refresh</span> YENİLE
                      </button>
                      <button onClick={() => setShowAddCoinModal(true)} className="flex items-center gap-2 bg-[#00FF85] text-black px-4 py-2 rounded font-bold text-xs hover:brightness-110 transition-colors">
                         <span className="material-symbols-outlined text-[16px]">add</span> COIN EKLE
                      </button>
                   </div>
                </div>

                <div className="w-full text-left text-sm">
                   <div className="flex bg-[#0A0F16] text-[#64748B] text-xs font-bold tracking-widest uppercase p-4 border-b border-[#1E293B]">
                      <div className="w-32">Sembol</div>
                      <div className="flex-1">Varlık Adı</div>
                      <div className="w-48 text-right">Fiyat (₺)</div>
                      <div className="w-32 text-right">24S Değişim</div>
                   </div>
                   {allAssets.map((asset, idx) => {
                      const p = prices[asset.id];
                      const priceStr = p ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 }).format(p.try) : 'Yükleniyor...';
                      const change = p?.change || 0;
                      return (
                         <div key={asset.id} className={`flex items-center p-4 border-b border-[#1E293B] hover:bg-[#1E293B]/30 transition-colors ${idx % 2 === 0 ? 'bg-[#0A0F16]' : 'bg-[#111827]'}`}>
                            <div className="w-32 font-bold text-white">{asset.symbol}</div>
                            <div className="flex-1 text-[#64748B]">{asset.name}</div>
                            <div className="w-48 text-right font-mono text-white text-base">{priceStr}</div>
                            <div className="w-32 flex justify-end">
                               <div className={`flex items-center gap-1 px-2 py-1 rounded ${change >= 0 ? 'bg-[#00FF85]/10 text-[#00FF85]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                                  <span className="material-symbols-outlined text-[16px]">{change >= 0 ? 'arrow_upward' : 'arrow_downward'}</span>
                                  <span className="font-bold">{Math.abs(change).toFixed(2)}%</span>
                               </div>
                            </div>
                         </div>
                      );
                   })}
                </div>
             </div>

             {/* Geçmiş İşlemler */}
             <div className="border border-[#1E293B] rounded-xl bg-[#111827] overflow-hidden mt-8">
                <div className="p-6 border-b border-[#1E293B]">
                   <h2 className="text-xl font-bold text-white tracking-wide">GEÇMİŞ İŞLEMLER</h2>
                </div>
                <div className="flex bg-[#0A0F16] text-[#64748B] text-xs font-bold tracking-widest uppercase p-4 border-b border-[#1E293B]">
                   <div className="w-32">Tarih</div>
                   <div className="w-24">Tür</div>
                   <div className="flex-1">Varlık</div>
                   <div className="w-32 text-right">Miktar</div>
                   <div className="w-32 text-right">Fiyat</div>
                   <div className="w-32 text-right">Toplam</div>
                   <div className="w-16"></div>
                </div>
                {transactions.length === 0 ? (
                  <div className="p-8 text-center text-[#64748B]">Henüz hiç işlem yapmadınız.</div>
                ) : (
                  transactions.slice().reverse().map(tx => {
                    const asset = allAssets.find(a => a.id === tx.assetId);
                    return (
                      <div key={tx.id} className="flex items-center p-4 border-b border-[#1E293B] text-sm hover:bg-[#1E293B]/30">
                         <div className="w-32 text-[#64748B] font-mono">{tx.date}</div>
                         <div className="w-24">
                            <span className={`px-2 py-1 rounded text-xs font-bold ${tx.type === 'buy' ? 'bg-[#00FF85]/10 text-[#00FF85]' : 'bg-[#EF4444]/10 text-[#EF4444]'}`}>
                              {tx.type === 'buy' ? 'ALIŞ' : 'SATIŞ'}
                            </span>
                         </div>
                         <div className="flex-1 font-bold text-white">{asset ? asset.name : tx.assetId}</div>
                         <div className="w-32 text-right font-mono text-white">{formatAmount(tx.amount)}</div>
                         <div className="w-32 text-right font-mono text-white">{formatCurrency(tx.price)}</div>
                         <div className="w-32 text-right font-mono text-white">{formatCurrency(tx.amount * tx.price)}</div>
                         <div className="w-16 flex justify-end gap-2">
                            <button onClick={() => deleteTx(tx.id)} className="text-[#64748B] hover:text-[#EF4444]"><span className="material-symbols-outlined text-[18px]">delete</span></button>
                         </div>
                      </div>
                    )
                  })
                )}
             </div>
          </div>
        )}

        {/* ======================= HEDEFLER ======================= */}
        {activeTab === 'goals' && (
          <div className="flex flex-col gap-6">
             <div className="flex justify-between items-center border-b border-[#1E293B] pb-6">
                <div>
                   <div className="flex items-center gap-2 mb-2">
                     <div className="w-2 h-6 bg-[#00FF85]"></div>
                     <h2 className="text-2xl font-bold text-[#00FF85] tracking-wide">HEDEFLER</h2>
                   </div>
                   <div className="text-[#64748B] text-sm">Mali durumun.</div>
                </div>
                <button onClick={() => setShowGoalModal(true)} className="bg-[#00FF85] text-black font-bold px-4 py-2 rounded flex items-center gap-2 text-sm uppercase hover:brightness-110">
                   <span className="material-symbols-outlined text-[18px]">add</span> Yeni Hedef
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {investmentGoals.length === 0 && (
                   <div className="col-span-1 md:col-span-2 text-center py-10 text-[#64748B] text-sm">
                      Henüz hedef eklemediniz. "Yeni Hedef" butonundan ekleyebilirsiniz.
                   </div>
                )}
                {investmentGoals.map(goal => {
                   const progress = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
                   const isCompleted = progress >= 100;
                   const colorClass = isCompleted ? 'text-[#FACC15]' : 'text-[#00FF85]';
                   const bgClass = isCompleted ? 'bg-[#FACC15]' : 'bg-[#00FF85]';
                   
                   return (
                      <div key={goal.id} className={`bg-[#111827] border ${isCompleted ? 'border-[#FACC15]/50' : 'border-[#1E293B]'} rounded-lg p-6 relative overflow-hidden`}>
                         <div className="flex justify-between items-start mb-10">
                            <div className="flex items-center gap-4">
                               <div className={`w-12 h-12 bg-[#1E293B] rounded flex items-center justify-center ${colorClass}`}>
                                  <span className="material-symbols-outlined">{goal.icon || 'flag'}</span>
                               </div>
                               <div>
                                  <h3 className="text-lg font-bold text-white">{goal.name}</h3>
                                  <div className="flex items-center gap-1 mt-1">
                                     {isCompleted ? (
                                        <>
                                           <span className="material-symbols-outlined text-[#FACC15] text-[12px]">check_circle</span>
                                           <span className="text-[#FACC15] text-xs">Tamamlandı</span>
                                        </>
                                     ) : (
                                        <>
                                           <div className={`w-1.5 h-1.5 rounded-full ${bgClass}`}></div>
                                           <span className="text-[#64748B] text-xs">Aktif</span>
                                        </>
                                     )}
                                  </div>
                               </div>
                            </div>
                            <div className="text-right">
                               <div className={`${colorClass} font-bold text-xl font-mono`}>{formatCurrency(goal.current, 0)}</div>
                               {!isCompleted && <div className="text-[#64748B] text-xs font-mono">/ {formatCurrency(goal.target, 0)}</div>}
                            </div>
                         </div>
                         <div className="flex justify-between items-end mb-2">
                            <span className={`${colorClass} font-bold text-xs`}>{progress.toFixed(1)}%</span>
                            {!isCompleted && <span className="text-[#64748B] text-xs font-mono">Kalan: {formatCurrency(goal.target - goal.current, 0)}</span>}
                         </div>
                         <div className="w-full bg-[#1E293B] h-2 rounded-full overflow-hidden">
                            <div className={`${bgClass} h-full transition-all`} style={{ width: `${progress}%` }}></div>
                         </div>
                      </div>
                   );
                })}
             </div>
          </div>
        )}

        {/* ======================= TAVSIYELER ======================= */}
        {activeTab === 'tips' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { title: 'Çeşitlendirme', desc: 'Riskleri dağıtmak için portföyünüzü farklı varlık sınıflarına (hisse senedi, tahvil, emtia) yayın. Tek bir sektöre bağlı kalmamak, piyasa dalgalanmalarına karşı kalkan görevi görür.' },
               { title: 'Maliyet Ortalaması', desc: 'DCA (Dollar-Cost Averaging) stratejisi ile piyasa zamanlaması yapmaya çalışmak yerine, düzenli aralıklarla sabit tutarlarda yatırım yaparak ortalama maliyetinizi düşürün.' },
               { title: 'Acil Durum Fonu', desc: 'Yatırıma başlamadan önce, en az 3-6 aylık zorunlu giderlerinizi kapsayacak likit bir acil durum fonu oluşturun. Bu, beklenmedik durumlarda yatırımlarınızı bozmanızı engeller.' },
               { title: 'Duygu Kontrolü', desc: 'Piyasalardaki ani düşüşlerde (FUD) veya yükselişlerde (FOMO) panik yapmayın. Kararlarınızı duygularınızla değil, önceden belirlediğiniz analitik stratejiniz doğrultusunda alın.' },
               { title: 'Bileşik Getiri', desc: 'Kazançlarınızı yeniden yatırıma dönüştürerek bileşik getirinin gücünden faydalanın. Zaman, bu stratejideki en değerli müttefikinizdir; erken başlamak büyük fark yaratır.' },
               { title: 'Risk Yönetimi', desc: 'Kaybetmeyi göze alabileceğinizden daha fazla yatırım yapmayın. Her işlem için maksimum risk oranınızı (örn. portföyün %2\'si) önceden belirleyin ve buna kesinlikle uyun.' },
               { title: 'Araştırma Yapın', desc: 'DYOR (Do Your Own Research). Kulaktan dolma bilgilerle veya başkalarının tavsiyeleriyle işlem yapmayın. Yatırım yapacağınız şirketin veya projenin temellerini mutlaka inceleyin.' },
               { title: 'Uzun Vadeli Plan', desc: 'Kısa vadeli dalgalanmalara odaklanmak yerine, 5-10 yıllık makro trendleri hedefleyin. Kısa vadeli gürültü, uzun vadeli zenginlik yaratma hedefinizi perdelememeli.' }
             ].map((tip, idx) => (
                <div key={idx} className="bg-[#111827] border border-[#1E293B] rounded-xl p-6 flex flex-col">
                   <div className="w-4 h-4 rounded-full bg-[#00FF85] mb-6 flex items-center justify-center overflow-hidden">
                      <div className="w-full h-1/2 bg-black/20 absolute bottom-0"></div>
                   </div>
                   <h3 className="text-lg font-bold text-white mb-4">{tip.title}</h3>
                   <p className="text-[#64748B] text-sm leading-relaxed">{tip.desc}</p>
                </div>
             ))}
          </div>
        )}

      </main>

      {/* ======================= COIN EKLE MODAL ======================= */}
      {showAddCoinModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-[#111827] border border-[#00FF85] rounded-xl w-full max-w-md p-6 relative">
              <div className="flex items-center justify-between mb-8 border-b border-[#1E293B] pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#00FF85]"></div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">COIN EKLE</h2>
                 </div>
                 <button onClick={() => setShowAddCoinModal(false)} className="text-[#64748B] hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="block text-[#64748B] text-xs font-bold uppercase tracking-widest mb-2">COIN SEMBOLÜ</label>
                    <input type="text" value={newCoinSymbol} onChange={(e) => setNewCoinSymbol(e.target.value)} placeholder="Örn: DOGE" className="w-full bg-transparent border-b border-[#1E293B] text-white py-3 outline-none font-mono focus:border-[#00FF85] transition-colors" />
                 </div>
                 <div>
                    <label className="block text-[#64748B] text-xs font-bold uppercase tracking-widest mb-2">COIN ADI</label>
                    <input type="text" value={newCoinName} onChange={(e) => setNewCoinName(e.target.value)} placeholder="Örn: Dogecoin" className="w-full bg-transparent border-b border-[#1E293B] text-white py-3 outline-none focus:border-[#00FF85] transition-colors" />
                    <p className="text-[#64748B] text-xs mt-2">CoinGecko adıyla eşleşmelidir (örn: dogecoin).</p>
                 </div>
                 <button onClick={handleAddCoin} className="w-full py-4 rounded font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-4 bg-[#00FF85] text-black hover:brightness-110">
                    <span className="material-symbols-outlined text-[18px]">add</span> İZLEME LİSTESİNE EKLE
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ======================= YENİ HEDEF MODAL ======================= */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-[#111827] border border-[#00FF85] rounded-xl w-full max-w-md p-6 relative">
              <div className="flex items-center justify-between mb-8 border-b border-[#1E293B] pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#00FF85]"></div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">YENİ HEDEF</h2>
                 </div>
                 <button onClick={() => setShowGoalModal(false)} className="text-[#64748B] hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="block text-[#64748B] text-xs font-bold uppercase tracking-widest mb-2">HEDEF ADI</label>
                    <input type="text" value={newGoalName} onChange={(e) => setNewGoalName(e.target.value)} placeholder="Örn: Ev Peşinatı" className="w-full bg-transparent border-b border-[#1E293B] text-white py-3 outline-none focus:border-[#00FF85] transition-colors" />
                 </div>
                 <div>
                    <label className="block text-[#64748B] text-xs font-bold uppercase tracking-widest mb-2">HEDEF TUTAR (₺)</label>
                    <input type="number" value={newGoalTarget} onChange={(e) => setNewGoalTarget(e.target.value)} placeholder="0.00" className="w-full bg-transparent border-b border-[#1E293B] text-white py-3 outline-none font-mono focus:border-[#00FF85] transition-colors" />
                 </div>
                 <button onClick={handleAddGoal} className="w-full py-4 rounded font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-4 bg-[#00FF85] text-black hover:brightness-110">
                    <span className="material-symbols-outlined text-[18px]">add</span> HEDEFİ KAYDET
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* ======================= İŞLEM EKLE MODAL ======================= */}
      {showTxModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
           <div className="bg-[#111827] border border-[#00FF85] rounded-xl w-full max-w-md p-6 relative">
              <div className="flex items-center justify-between mb-8 border-b border-[#1E293B] pb-4">
                 <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-[#00FF85]"></div>
                    <h2 className="text-xl font-bold text-white uppercase tracking-widest">İŞLEM EKLE</h2>
                 </div>
                 <button onClick={() => setShowTxModal(false)} className="text-[#64748B] hover:text-white">
                    <span className="material-symbols-outlined">close</span>
                 </button>
              </div>

              <div className="flex border border-[#1E293B] rounded bg-[#0A0F16] p-1 mb-8">
                 <button onClick={() => setTxType('buy')} className={`flex-1 py-2 text-xs font-bold tracking-widest uppercase transition-all ${txType === 'buy' ? 'bg-[#111827] text-[#00FF85] border-b-2 border-[#00FF85]' : 'text-[#64748B]'}`}>ALIŞ</button>
                 <button onClick={() => setTxType('sell')} className={`flex-1 py-2 text-xs font-bold tracking-widest uppercase transition-all ${txType === 'sell' ? 'bg-[#111827] text-[#EF4444] border-b-2 border-[#EF4444]' : 'text-[#64748B]'}`}>SATIŞ</button>
              </div>

              <div className="space-y-6">
                 <div>
                    <label className="block text-[#64748B] text-xs font-bold uppercase tracking-widest mb-2">VARLIK</label>
                    <select value={txAssetId} onChange={(e) => setTxAssetId(e.target.value)} className="w-full bg-[#0A0F16] border-b border-[#1E293B] text-white py-3 outline-none font-mono focus:border-[#00FF85] transition-colors appearance-none cursor-pointer">
                       {allAssets.map(a => <option key={a.id} value={a.id}>{a.symbol} ({a.name})</option>)}
                    </select>
                 </div>
                 
                 <div>
                    <div className="flex justify-between mb-2">
                       <label className="text-[#64748B] text-xs font-bold uppercase tracking-widest">MİKTAR</label>
                       <span className="text-[#64748B] text-xs font-mono">Kullanılabilir: 2.4500 BTC</span>
                    </div>
                    <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0.00" className="w-full bg-transparent border-b border-[#1E293B] text-white py-3 outline-none font-mono focus:border-[#00FF85] transition-colors" />
                 </div>

                 <div>
                    <div className="flex justify-between mb-2">
                       <label className="text-[#64748B] text-xs font-bold uppercase tracking-widest">FİYAT (USDT)</label>
                       <button className="flex items-center gap-1 text-[#00FF85] border border-[#00FF85]/30 bg-[#00FF85]/10 px-2 py-0.5 rounded text-[10px] uppercase font-bold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#00FF85]"></span> Piyasa
                       </button>
                    </div>
                    <input type="number" value={txPrice} onChange={(e) => setTxPrice(e.target.value)} placeholder="0.00" className="w-full bg-transparent border-b border-[#1E293B] text-white py-3 outline-none font-mono focus:border-[#00FF85] transition-colors" />
                 </div>

                 <div className="bg-[#111827] border border-[#1E293B] rounded p-4 flex justify-between items-end mt-8">
                    <div>
                       <div className="text-[#64748B] text-xs font-bold uppercase tracking-widest mb-1">TOPLAM TUTAR</div>
                       <div className="text-2xl font-bold text-[#00FF85] font-mono">
                         {txAmount && txPrice ? new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(txAmount * txPrice) : '0.00'}
                       </div>
                    </div>
                    <div className="text-[#64748B] text-xs font-mono uppercase">USDT</div>
                 </div>

                 <button onClick={handleSaveTx} className={`w-full py-4 rounded font-bold uppercase tracking-widest flex items-center justify-center gap-2 mt-4 ${txType === 'buy' ? 'bg-[#00FF85] text-black hover:brightness-110' : 'bg-[#EF4444] text-white hover:brightness-110'}`}>
                    <span className="material-symbols-outlined text-[18px]">bolt</span> {txType === 'buy' ? 'SATIN AL' : 'SAT'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
