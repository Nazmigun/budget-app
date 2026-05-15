import React, { useState, useEffect, useMemo } from 'react';
import { ArrowLeft, TrendingUp, TrendingDown, Target, Plus, X, RefreshCw, Search, ArrowUpRight, ArrowDownRight, AlertCircle, Wallet, BarChart3, Activity, ChevronUp, ChevronDown, Eye, EyeOff, Trash2, Settings2 } from 'lucide-react';
import { LineChart, Line, PieChart, Pie, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';

const COLORS = {
  bg: '#000000',
  bgPanel: '#050D05',
  bgPanelLight: '#0A1A0A',
  border: '#1F3A1F',
  borderLight: '#2D5A2D',
  text: '#7AE07A',
  textBright: '#A8E6A1',
  textBrightest: '#D4F4D0',
  textDim: '#3D6B3D',
  textDimmer: '#2A4A2A',
  accent: '#7AE07A',
  positive: '#7AE07A',
  negative: '#FF6B6B',
  gold: '#FFD700',
};

const PIE_COLORS = ['#7AE07A', '#5CB85C', '#3D8B3D', '#9FE89F', '#2A6B2A', '#C0F0C0', '#1F4F1F'];

const getFGColor = (v) => {
  if (v <= 24) return '#FF4444';
  if (v <= 44) return '#FF8844';
  if (v <= 55) return '#FFD700';
  if (v <= 74) return '#7AE07A';
  return '#22C55E';
};
const getFGLabel = (v) => {
  if (v <= 24) return 'Aşırı Korku';
  if (v <= 44) return 'Korku';
  if (v <= 55) return 'Nötr';
  if (v <= 74) return 'Açgözlülük';
  return 'Aşırı Açgözlülük';
};

const FearGreedGauge = ({ value }) => {
  const r = 75, cx = 100, cy = 100, sw = 15;
  const C = Math.PI * r;
  const dashOffset = C * (1 - Math.max(0, Math.min(100, value)) / 100);
  const angle = Math.PI * (1 - value / 100);
  const nx = (cx + r * Math.cos(angle)).toFixed(1);
  const ny = (cy - r * Math.sin(angle)).toFixed(1);
  const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 0 ${cx + r} ${cy}`;
  const color = getFGColor(value);
  return (
    <svg viewBox="0 0 200 115" style={{ width: '100%', maxWidth: 240, overflow: 'visible' }}>
      <defs>
        <linearGradient id="fgi-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF4444" />
          <stop offset="25%" stopColor="#FF8844" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="75%" stopColor="#7AE07A" />
          <stop offset="100%" stopColor="#22C55E" />
        </linearGradient>
      </defs>
      <path d={arcPath} fill="none" stroke="#0A1A0A" strokeWidth={sw} strokeLinecap="round" />
      <path d={arcPath} fill="none" stroke="url(#fgi-grad)" strokeWidth={sw}
        strokeDasharray={`${C}`} strokeDashoffset={dashOffset} strokeLinecap="round" />
      <circle cx={nx} cy={ny} r={9} fill="#050D05" />
      <circle cx={nx} cy={ny} r={5} fill="white" />
      <circle cx={nx} cy={ny} r={2.5} fill={color} />
      <text x="100" y="80" textAnchor="middle" fill={color} fontSize="30" fontWeight="700" fontFamily="'Courier New', monospace">{value}</text>
      <text x="100" y="97" textAnchor="middle" fill={color} fontSize="9" fontFamily="'Inter', sans-serif" letterSpacing="2">{getFGLabel(value).toUpperCase()}</text>
    </svg>
  );
};

const FGMiniChart = ({ data }) => {
  if (!data || data.length === 0) return null;
  const items = [...data].reverse().slice(-30);
  const count = items.length;
  const bw = 5, gap = 1.5, h = 36;
  const totalW = count * (bw + gap) - gap;
  return (
    <svg viewBox={`0 0 ${totalW} ${h}`} style={{ width: '100%', height: h }}>
      {items.map((d, i) => {
        const v = parseInt(d.value);
        const bh = Math.max(2, (v / 100) * (h - 2));
        return (
          <rect key={i} x={i * (bw + gap)} y={h - bh} width={bw} height={bh}
            fill={getFGColor(v)} opacity={i === count - 1 ? 1 : 0.55} rx={1} />
        );
      })}
    </svg>
  );
};

const DEFAULT_ASSETS = [
  // Döviz / Altın
  { id: 'usd', symbol: 'USD', name: 'ABD Doları', type: 'fiat', source: 'frankfurter' },
  { id: 'eur', symbol: 'EUR', name: 'Euro', type: 'fiat', source: 'frankfurter' },
  { id: 'gbp', symbol: 'GBP', name: 'İngiliz Sterlini', type: 'fiat', source: 'frankfurter' },
  { id: 'gold', symbol: 'GRAM', name: 'Gram Altın', type: 'commodity', source: 'gold' },
  // Kripto
  { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', type: 'crypto', source: 'coingecko', cgId: 'bitcoin' },
  { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', type: 'crypto', source: 'coingecko', cgId: 'ethereum' },
  { id: 'solana', symbol: 'SOL', name: 'Solana', type: 'crypto', source: 'coingecko', cgId: 'solana' },
  // BIST Hisseleri
  { id: 'GARAN', symbol: 'GARAN', name: 'Garanti BBVA', type: 'bist', source: 'yahoo', yahooSymbol: 'GARAN.IS' },
  { id: 'THYAO', symbol: 'THYAO', name: 'Türk Hava Yolları', type: 'bist', source: 'yahoo', yahooSymbol: 'THYAO.IS' },
  { id: 'ASELS', symbol: 'ASELS', name: 'Aselsan', type: 'bist', source: 'yahoo', yahooSymbol: 'ASELS.IS' },
  { id: 'AKBNK', symbol: 'AKBNK', name: 'Akbank', type: 'bist', source: 'yahoo', yahooSymbol: 'AKBNK.IS' },
  { id: 'EREGL', symbol: 'EREGL', name: 'Ereğli Demir Çelik', type: 'bist', source: 'yahoo', yahooSymbol: 'EREGL.IS' },
  { id: 'KCHOL', symbol: 'KCHOL', name: 'Koç Holding', type: 'bist', source: 'yahoo', yahooSymbol: 'KCHOL.IS' },
  { id: 'BIMAS', symbol: 'BIMAS', name: 'BİM', type: 'bist', source: 'yahoo', yahooSymbol: 'BIMAS.IS' },
  { id: 'SAHOL', symbol: 'SAHOL', name: 'Sabancı Holding', type: 'bist', source: 'yahoo', yahooSymbol: 'SAHOL.IS' },
  { id: 'SISE', symbol: 'SISE', name: 'Şişe Cam', type: 'bist', source: 'yahoo', yahooSymbol: 'SISE.IS' },
  { id: 'YKBNK', symbol: 'YKBNK', name: 'Yapı Kredi', type: 'bist', source: 'yahoo', yahooSymbol: 'YKBNK.IS' },
  // ABD / NASDAQ
  { id: 'AAPL', symbol: 'AAPL', name: 'Apple', type: 'nasdaq', source: 'yahoo', yahooSymbol: 'AAPL' },
  { id: 'MSFT', symbol: 'MSFT', name: 'Microsoft', type: 'nasdaq', source: 'yahoo', yahooSymbol: 'MSFT' },
  { id: 'NVDA', symbol: 'NVDA', name: 'NVIDIA', type: 'nasdaq', source: 'yahoo', yahooSymbol: 'NVDA' },
  { id: 'TSLA', symbol: 'TSLA', name: 'Tesla', type: 'nasdaq', source: 'yahoo', yahooSymbol: 'TSLA' },
  { id: 'AMZN', symbol: 'AMZN', name: 'Amazon', type: 'nasdaq', source: 'yahoo', yahooSymbol: 'AMZN' },
  { id: 'GOOGL', symbol: 'GOOGL', name: 'Alphabet', type: 'nasdaq', source: 'yahoo', yahooSymbol: 'GOOGL' },
  { id: 'META', symbol: 'META', name: 'Meta', type: 'nasdaq', source: 'yahoo', yahooSymbol: 'META' },
  // Türk Yatırım Fonları (TEFAS)
  { id: 'AGB', symbol: 'AGB', name: 'Ak Port. Altın BYF', type: 'turkishfund', source: 'tefas', tefasCode: 'AGB' },
  { id: 'TI2', symbol: 'TI2', name: 'İş Port. His. Senedi', type: 'turkishfund', source: 'tefas', tefasCode: 'TI2' },
  { id: 'AFY', symbol: 'AFY', name: 'Ak Port. Yab. BYF', type: 'turkishfund', source: 'tefas', tefasCode: 'AFY' },
  { id: 'GAF', symbol: 'GAF', name: 'Garanti Port. His.', type: 'turkishfund', source: 'tefas', tefasCode: 'GAF' },
  { id: 'GIH', symbol: 'GIH', name: 'Garanti Port. Altın', type: 'turkishfund', source: 'tefas', tefasCode: 'GIH' },
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
  monthlyInvestmentBudget = 0,
  marketAssetConfig = [],
  onUpdateMarketAssetConfig,
  showTutorial = false,
  tutorialStep = 5,
  onTutorialNext,
  onTutorialSkip,
}) {
  const [activeTab, setActiveTab] = useState('portfolio');
  const [prices, setPrices] = useState({});
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [chartPeriod, setChartPeriod] = useState('30d');
  
  // Para birimi seçici — localStorage'dan oku
  const [currency, setCurrencyState] = useState(() => {
    try { return localStorage.getItem('investment_currency') || 'TRY'; } catch { return 'TRY'; }
  });
  const setCurrency = (c) => {
    setCurrencyState(c);
    try { localStorage.setItem('investment_currency', c); } catch {}
  };
  
  // Piyasa düzenleme modu
  const [marketEditMode, setMarketEditMode] = useState(false);
  
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

  const [fearGreedData, setFearGreedData] = useState(null);
  const [fearGreedLoading, setFearGreedLoading] = useState(false);
  const [fearGreedError, setFearGreedError] = useState(null);
  const [marketFilter, setMarketFilter] = useState('all');
  const [stocksError, setStocksError] = useState(null);

  const [marketAnalysisData, setMarketAnalysisData] = useState(null);
  const [marketAnalysisLoading, setMarketAnalysisLoading] = useState(false);
  const [marketAnalysisError, setMarketAnalysisError] = useState(null);

  // Add asset modal - tip seçici
  const [addAssetType, setAddAssetType] = useState('crypto');
  const [stockSymbol, setStockSymbol] = useState('');
  const [stockMarket, setStockMarket] = useState('bist');
  const [stockName, setStockName] = useState('');
  const [fundCode, setFundCode] = useState('');
  const [fundName, setFundName] = useState('');

  const [invSpotlightRect, setInvSpotlightRect] = useState(null);

  useEffect(() => {
    if (!showTutorial || tutorialStep < 5 || tutorialStep > 7) {
      setInvSpotlightRect(null);
      return;
    }
    if (tutorialStep === 5) setActiveTab('market');
    else if (tutorialStep === 6) setActiveTab('portfolio');
    else if (tutorialStep === 7) setActiveTab('goals');

    const targetIds = { 5: 'inv-tutorial-market-table', 6: 'inv-tutorial-portfolio-card', 7: 'inv-tutorial-goals-section' };
    const targetId = targetIds[tutorialStep];
    let prevEl = null;

    const updateRect = () => {
      const el = document.getElementById(targetId);
      if (!el) { setInvSpotlightRect(null); return; }
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 && rect.height === 0) { setInvSpotlightRect(null); return; }
      setInvSpotlightRect({ top: rect.top, left: rect.left, width: rect.width, height: rect.height });
    };

    const el = document.getElementById(targetId);
    if (el) {
      prevEl = el;
      el.style.transform = 'scale(1.02)';
      el.style.transition = 'transform 0.35s cubic-bezier(0.16,1,0.3,1)';
      el.style.transformOrigin = 'center center';
      setTimeout(() => {
        updateRect();
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 150);
    }

    window.addEventListener('resize', updateRect);
    window.addEventListener('scroll', updateRect, { passive: true });

    return () => {
      if (prevEl) { prevEl.style.transform = ''; prevEl.style.transition = ''; }
      window.removeEventListener('resize', updateRect);
      window.removeEventListener('scroll', updateRect);
    };
  }, [showTutorial, tutorialStep]);

  const allAssets = useMemo(() => {
    return [...DEFAULT_ASSETS, ...watchedAssets.filter(a => !DEFAULT_ASSETS.some(d => d.id === a.id))];
  }, [watchedAssets]);

  // Piyasa tablosu için sıralanmış ve filtre edilmiş varlık listesi
  const orderedMarketAssets = useMemo(() => {
    if (!marketAssetConfig || marketAssetConfig.length === 0) return allAssets;
    // Config'deki sıraya göre düzenleme, eksik olanları sona ekle
    const ordered = [];
    const seen = new Set();
    marketAssetConfig.forEach(cfg => {
      const asset = allAssets.find(a => a.id === cfg.id);
      if (asset) {
        if (cfg.visible !== false) ordered.push(asset);
        seen.add(cfg.id);
      }
    });
    // Config'te olmayan yeni varlıklar (yeni eklenenler)
    allAssets.forEach(a => {
      if (!seen.has(a.id)) ordered.push(a);
    });
    return ordered;
  }, [allAssets, marketAssetConfig]);

  const filteredMarketAssets = useMemo(() => {
    const typeMap = { crypto: ['crypto', 'commodity', 'fiat'], bist: ['bist'], nasdaq: ['nasdaq'], fund: ['turkishfund'] };
    if (marketFilter === 'all') return orderedMarketAssets;
    return orderedMarketAssets.filter(a => (typeMap[marketFilter] || []).includes(a.type));
  }, [orderedMarketAssets, marketFilter]);

  // Düzenleme modunda tüm varlıkları (görünür + gizli) göster
  const allMarketAssetsForEdit = useMemo(() => {
    if (!marketAssetConfig || marketAssetConfig.length === 0)
      return allAssets.map(a => ({ ...a, visible: true }));
    const result = [];
    const seen = new Set();
    marketAssetConfig.forEach(cfg => {
      const asset = allAssets.find(a => a.id === cfg.id);
      if (asset) {
        result.push({ ...asset, visible: cfg.visible !== false });
        seen.add(cfg.id);
      }
    });
    allAssets.forEach(a => {
      if (!seen.has(a.id)) result.push({ ...a, visible: true });
    });
    return result;
  }, [allAssets, marketAssetConfig]);

  const fetchPrices = async () => {
    setPricesLoading(true);
    setPricesError(null);
    const errors = [];
    try {
      const newPrices = {};
      
      // --- DÖVİZ (Frankfurter API) ---
      try {
        // Bugünkü ve önceki günün kurlarını al (24s değişim hesabı için)
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const [fxRes, fxYesterdayRes] = await Promise.all([
          fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,EUR,GBP'),
          fetch(`https://api.frankfurter.dev/v1/${yesterdayStr}?base=USD&symbols=TRY,EUR,GBP`)
        ]);
        
        if (!fxRes.ok) throw new Error(`Frankfurter HTTP ${fxRes.status}`);
        const fxData = await fxRes.json();
        
        let fxYesterdayData = null;
        if (fxYesterdayRes.ok) {
          fxYesterdayData = await fxYesterdayRes.json();
        }
        
        if (fxData.rates) {
          const usdTry = fxData.rates.TRY;
          const eurTry = fxData.rates.TRY / fxData.rates.EUR;
          const gbpTry = fxData.rates.TRY / fxData.rates.GBP;
          
          let usdChange = 0, eurChange = 0, gbpChange = 0;
          if (fxYesterdayData?.rates) {
            const prevUsdTry = fxYesterdayData.rates.TRY;
            const prevEurTry = fxYesterdayData.rates.TRY / fxYesterdayData.rates.EUR;
            const prevGbpTry = fxYesterdayData.rates.TRY / fxYesterdayData.rates.GBP;
            if (prevUsdTry > 0) usdChange = ((usdTry - prevUsdTry) / prevUsdTry) * 100;
            if (prevEurTry > 0) eurChange = ((eurTry - prevEurTry) / prevEurTry) * 100;
            if (prevGbpTry > 0) gbpChange = ((gbpTry - prevGbpTry) / prevGbpTry) * 100;
          }
          
          newPrices.usd = { try: usdTry, change: usdChange };
          newPrices.eur = { try: eurTry, change: eurChange };
          newPrices.gbp = { try: gbpTry, change: gbpChange };
        }
      } catch (e) {
        console.error('FX hatası:', e);
        errors.push('Döviz');
      }
      
      // --- KRİPTO & ALTIN (CoinGecko API) ---
      const cryptoIds = allAssets.filter(a => a.type === 'crypto' && a.cgId).map(a => a.cgId);
      cryptoIds.push('tether-gold');
      const uniqueIds = [...new Set(cryptoIds)].join(',');
      
      const fetchCoinGecko = async (retryCount = 0) => {
        const cryptoRes = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${uniqueIds}&vs_currencies=try,usd&include_24hr_change=true`);
        
        if (cryptoRes.status === 429) {
          // Rate limit — bir kez daha dene, 5 saniye bekleyerek
          if (retryCount < 1) {
            console.warn('CoinGecko rate limit, 5sn sonra tekrar deneniyor...');
            await new Promise(r => setTimeout(r, 5000));
            return fetchCoinGecko(retryCount + 1);
          }
          throw new Error('CoinGecko rate limit aşıldı');
        }
        
        if (!cryptoRes.ok) throw new Error(`CoinGecko HTTP ${cryptoRes.status}`);
        
        const cryptoData = await cryptoRes.json();
        
        // CoinGecko bazen rate limit'te error objesi döner
        if (cryptoData.status?.error_code) {
          throw new Error(cryptoData.status.error_message || 'CoinGecko API hatası');
        }
        
        return cryptoData;
      };
      
      try {
        const cryptoData = await fetchCoinGecko();
        
        if (cryptoData['tether-gold']) {
          newPrices.gold = { 
            try: cryptoData['tether-gold'].try / 31.1035, 
            change: cryptoData['tether-gold'].try_24h_change || 0 
          };
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
      } catch (e) {
        console.error('Kripto hatası:', e);
        errors.push('Kripto/Altın');
      }
      
      // Kısmi başarı durumunda: en az bir veri geldiyse güncelle
      if (Object.keys(newPrices).length > 0) {
        setPrices(prev => ({ ...prev, ...newPrices }));
        setLastUpdate(new Date());
      }
      
      if (errors.length > 0 && Object.keys(newPrices).length === 0) {
        setPricesError('Fiyatlar yüklenemedi. Lütfen internet bağlantınızı kontrol edin.');
      } else if (errors.length > 0) {
        setPricesError(`${errors.join(' ve ')} verileri alınamadı, diğerleri güncellendi.`);
      }
    } catch (e) {
      console.error('Genel fiyat hatası:', e);
      setPricesError('Fiyatlar yüklenemedi. Lütfen tekrar deneyin.');
    } finally {
      setPricesLoading(false);
    }
  };

  const fetchFearGreed = async () => {
    setFearGreedLoading(true);
    setFearGreedError(null);
    try {
      const res = await fetch('https://api.alternative.me/fng/?limit=90&format=json');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (json?.data?.length > 0) setFearGreedData(json.data);
      else throw new Error('Veri boş');
    } catch (e) {
      console.error('Fear & Greed hatası:', e);
      setFearGreedError('Veri alınamadı');
    } finally {
      setFearGreedLoading(false);
    }
  };

  const fetchMarketAnalysisData = async () => {
    setMarketAnalysisLoading(true);
    setMarketAnalysisError(null);
    const results = {};
    try {
      // CoinGecko Global: BTC dominance + stablecoin %
      try {
        const res = await fetch('https://api.coingecko.com/api/v3/global');
        if (res.ok) {
          const data = await res.json();
          const g = data.data;
          results.btcDominance = g.market_cap_percentage?.btc || 0;
          results.ethDominance = g.market_cap_percentage?.eth || 0;
          results.totalMarketCapUsd = g.total_market_cap?.usd || 0;
          results.totalMarketCapChange24h = g.market_cap_change_percentage_24h_usd || 0;
          const stablecoins = ['usdt', 'usdc', 'busd', 'dai', 'tusd', 'fdusd'];
          results.stablecoinDominance = stablecoins.reduce((sum, k) => sum + (g.market_cap_percentage?.[k] || 0), 0);
        }
      } catch (e) { console.warn('CG global:', e); }

      // Binance Futures: Funding Rate
      try {
        const res = await fetch('https://fapi.binance.com/fapi/v1/premiumIndex?symbol=BTCUSDT');
        if (res.ok) {
          const d = await res.json();
          results.fundingRate = parseFloat(d.lastFundingRate) * 100;
          results.nextFundingTime = d.nextFundingTime;
        }
      } catch (e) { console.warn('Funding rate:', e); }

      // Binance Futures: Open Interest (BTC)
      try {
        const res = await fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT');
        if (res.ok) {
          const d = await res.json();
          results.openInterestBtc = parseFloat(d.openInterest);
        }
      } catch (e) { console.warn('Open interest:', e); }

      // Binance Futures: Long/Short Ratio
      try {
        const res = await fetch('https://fapi.binance.com/futures/data/globalLongShortAccountRatio?symbol=BTCUSDT&period=5m&limit=1');
        if (res.ok) {
          const d = await res.json();
          if (d.length > 0) {
            results.longRatio = parseFloat(d[0].longAccount) * 100;
            results.shortRatio = parseFloat(d[0].shortAccount) * 100;
          }
        }
      } catch (e) { console.warn('LS ratio:', e); }

      // Binance Futures: Open Interest değişim (history)
      try {
        const res = await fetch('https://fapi.binance.com/futures/data/openInterestHist?symbol=BTCUSDT&period=1h&limit=25');
        if (res.ok) {
          const d = await res.json();
          if (d.length >= 2) {
            const latest = parseFloat(d[d.length - 1].sumOpenInterest);
            const prev = parseFloat(d[0].sumOpenInterest);
            results.openInterestChange24h = prev > 0 ? ((latest - prev) / prev) * 100 : 0;
            results.openInterestUsd = parseFloat(d[d.length - 1].sumOpenInterestValue);
          }
        }
      } catch (e) { console.warn('OI hist:', e); }

      // Binance Spot: Exchange inflow proxy (taker buy/sell ratio on BTC)
      try {
        const res = await fetch('https://fapi.binance.com/futures/data/takerlongshortRatio?symbol=BTCUSDT&period=1h&limit=24');
        if (res.ok) {
          const d = await res.json();
          if (d.length > 0) {
            const avg = d.reduce((s, x) => s + parseFloat(x.buySellRatio), 0) / d.length;
            results.takerBuySellRatio = avg;
          }
        }
      } catch (e) { console.warn('Taker ratio:', e); }

      setMarketAnalysisData(results);
    } catch (e) {
      console.error('Market analysis hatası:', e);
      setMarketAnalysisError('Veriler alınamadı');
    } finally {
      setMarketAnalysisLoading(false);
    }
  };

  const fetchStocksAndFunds = async (usdTryOverride) => {
    setStocksError(null);
    // --- USD/TRY kuru ---
    let usdTry = usdTryOverride || prices.usd?.try;
    if (!usdTry) {
      try {
        const r = await fetch('https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY');
        const d = await r.json();
        usdTry = d.rates?.TRY || 38;
      } catch { usdTry = 38; }
    }

    // --- Yahoo Finance: BIST + NASDAQ ---
    const yahooAssets = allAssets.filter(a => a.source === 'yahoo');
    if (yahooAssets.length > 0) {
      const symbols = yahooAssets.map(a => a.yahooSymbol).join(',');
      let result = null;
      const tryFetch = async (base) => {
        const r = await fetch(`${base}/v7/finance/quote?symbols=${encodeURIComponent(symbols)}`);
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      };
      try {
        const data = await tryFetch('https://query1.finance.yahoo.com');
        result = data.quoteResponse?.result;
      } catch {
        try {
          const data = await tryFetch('https://query2.finance.yahoo.com');
          result = data.quoteResponse?.result;
        } catch (e) {
          console.warn('Yahoo Finance ulaşılamıyor:', e.message);
          setStocksError('Hisse verileri alınamadı (Yahoo Finance)');
        }
      }
      if (result?.length > 0) {
        const updates = {};
        result.forEach(q => {
          const asset = yahooAssets.find(a => a.yahooSymbol === q.symbol);
          if (!asset) return;
          const price = q.regularMarketPrice;
          const change = q.regularMarketChangePercent || 0;
          updates[asset.id] = {
            try: q.currency === 'USD' ? price * usdTry : price,
            usd: q.currency === 'USD' ? price : undefined,
            change,
          };
        });
        setPrices(prev => ({ ...prev, ...updates }));
        setLastUpdate(new Date());
      }
    }

    // --- TEFAS: Türk Yatırım Fonları ---
    const tefasAssets = allAssets.filter(a => a.source === 'tefas');
    if (tefasAssets.length > 0) {
      const today = new Date();
      const fmt = (d) => d.toISOString().split('T')[0].replace(/-/g, '');
      const endDate = fmt(today);
      const startDate = fmt(new Date(today - 3 * 86400000));
      await Promise.allSettled(tefasAssets.map(async (asset) => {
        try {
          const r = await fetch(
            `https://www.tefas.gov.tr/api/DB/BindHistoryInfo?fontip=YAT&sfonkod=${asset.tefasCode}&bastarih=${startDate}&bittarih=${endDate}`
          );
          if (!r.ok) return;
          const d = await r.json();
          if (d.data?.length > 0) {
            const items = d.data;
            const latest = items[items.length - 1];
            const prev = items.length > 1 ? items[items.length - 2] : latest;
            const price = parseFloat(latest.FIYAT);
            const prevPrice = parseFloat(prev.FIYAT);
            if (!isNaN(price)) {
              const change = prevPrice > 0 ? ((price - prevPrice) / prevPrice) * 100 : 0;
              setPrices(p => ({ ...p, [asset.id]: { try: price, change } }));
            }
          }
        } catch (e) { console.warn(`TEFAS ${asset.tefasCode}:`, e.message); }
      }));
    }
  };

  useEffect(() => {
    fetchPrices();
    fetchStocksAndFunds();
    fetchFearGreed();
    fetchMarketAnalysisData();
    const interval = setInterval(() => { fetchPrices(); fetchStocksAndFunds(); fetchFearGreed(); fetchMarketAnalysisData(); }, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [allAssets.length]);

  const fgStats = useMemo(() => {
    if (!fearGreedData || fearGreedData.length === 0) return null;
    const avg = (arr) => Math.round(arr.reduce((s, d) => s + parseInt(d.value), 0) / arr.length);
    return {
      current: parseInt(fearGreedData[0].value),
      avg7: avg(fearGreedData.slice(0, Math.min(7, fearGreedData.length))),
      avg30: avg(fearGreedData.slice(0, Math.min(30, fearGreedData.length))),
      avg90: avg(fearGreedData.slice(0, Math.min(90, fearGreedData.length))),
      history: fearGreedData,
    };
  }, [fearGreedData]);

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

  // Döviz kurları (fiyatlardan al)
  const fxRates = useMemo(() => ({
    TRY: 1,
    USD: prices.usd?.try ? 1 / prices.usd.try : null,
    EUR: prices.eur?.try ? 1 / prices.eur.try : null,
  }), [prices]);

  const currencySymbols = { TRY: '₺', USD: '$', EUR: '€' };

  const convertFromTRY = (valTRY) => {
    if (currency === 'TRY' || !fxRates[currency]) return valTRY;
    return valTRY * fxRates[currency];
  };

  const formatCurrency = (val, maxDigits) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    const converted = convertFromTRY(val);
    const sym = currencySymbols[currency] || '₺';
    const digits = maxDigits !== undefined ? maxDigits : (Math.abs(converted) > 100 ? 0 : 2);
    const formatted = new Intl.NumberFormat('tr-TR', {
      maximumFractionDigits: digits, minimumFractionDigits: 0
    }).format(converted);
    return `${sym}${formatted}`;
  };
  const formatAmount = (val) => {
    if (val === null || val === undefined || isNaN(val)) return '—';
    if (val < 0.001) return val.toExponential(2);
    return new Intl.NumberFormat('tr-TR', { maximumFractionDigits: val < 1 ? 6 : (val < 100 ? 4 : 2) }).format(val);
  };

  // Piyasa tablosu sıralama yardımcıları
  const getConfigList = () => {
    if (marketAssetConfig && marketAssetConfig.length > 0) return [...marketAssetConfig];
    return allAssets.map(a => ({ id: a.id, visible: true }));
  };

  const moveAsset = (assetId, direction) => {
    const list = getConfigList();
    const idx = list.findIndex(c => c.id === assetId);
    if (idx < 0) return;
    const newIdx = idx + direction;
    if (newIdx < 0 || newIdx >= list.length) return;
    [list[idx], list[newIdx]] = [list[newIdx], list[idx]];
    onUpdateMarketAssetConfig(list);
  };

  const toggleAssetVisibility = (assetId) => {
    const list = getConfigList();
    const item = list.find(c => c.id === assetId);
    if (item) item.visible = !item.visible;
    else list.push({ id: assetId, visible: false });
    onUpdateMarketAssetConfig(list);
  };

  const removeAssetFromMarket = (assetId) => {
    // Custom coin ise watchedAssets'ten de kaldır
    const isCustom = !DEFAULT_ASSETS.some(d => d.id === assetId);
    if (isCustom) {
      onUpdateWatchedAssets(watchedAssets.filter(a => a.id !== assetId));
    }
    // Config'den kaldır
    const list = getConfigList().filter(c => c.id !== assetId);
    onUpdateMarketAssetConfig(list);
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

  const addStockToWatchlist = () => {
    if (!stockSymbol.trim()) return;
    const sym = stockSymbol.trim().toUpperCase();
    const yahooSymbol = stockMarket === 'bist' ? `${sym}.IS` : sym;
    const id = `custom_${yahooSymbol.toLowerCase().replace(/\./g, '_')}`;
    const newAsset = {
      id, symbol: sym,
      name: stockName.trim() || sym,
      type: stockMarket === 'bist' ? 'bist' : 'nasdaq',
      source: 'yahoo',
      yahooSymbol,
    };
    if (!watchedAssets.some(a => a.id === newAsset.id) && !DEFAULT_ASSETS.some(a => a.yahooSymbol === yahooSymbol)) {
      onUpdateWatchedAssets([...watchedAssets, newAsset]);
    }
    setShowAddAssetModal(false);
    setStockSymbol(''); setStockName('');
  };

  const addFundToWatchlist = () => {
    if (!fundCode.trim()) return;
    const code = fundCode.trim().toUpperCase();
    const id = `fund_${code.toLowerCase()}`;
    const newAsset = {
      id, symbol: code,
      name: fundName.trim() || code,
      type: 'turkishfund',
      source: 'tefas',
      tefasCode: code,
    };
    if (!watchedAssets.some(a => a.id === newAsset.id) && !DEFAULT_ASSETS.some(a => a.tefasCode === code)) {
      onUpdateWatchedAssets([...watchedAssets, newAsset]);
    }
    setShowAddAssetModal(false);
    setFundCode(''); setFundName('');
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

  const styles = `
    @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Fraunces:opsz,wght@9..144,300;9..144,400;9..144,500&display=swap');
    .num-font { font-family: 'JetBrains Mono', monospace; font-feature-settings: 'tnum'; }
    .ui-font { font-family: 'Inter', sans-serif; }
    .display-font { font-family: 'Fraunces', serif; }
    @keyframes fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
    .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; }
    .delay-1 { animation-delay: 0.05s; } .delay-2 { animation-delay: 0.1s; }
    .delay-3 { animation-delay: 0.15s; } .delay-4 { animation-delay: 0.2s; }
    .delay-5 { animation-delay: 0.25s; } .delay-6 { animation-delay: 0.3s; }
    .delay-7 { animation-delay: 0.35s; } .delay-8 { animation-delay: 0.4s; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .spin { animation: spin 1.5s linear infinite; }
    @keyframes pulse-dot { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
    .pulse-dot { animation: pulse-dot 2s ease-in-out infinite; }
    @keyframes scaleIn { from { opacity: 0; transform: scale(0.97); } to { opacity: 1; transform: scale(1); } }
    .scale-in { animation: scaleIn 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
    .number-input::-webkit-outer-spin-button, .number-input::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; }
    .number-input { -moz-appearance: textfield; }
    .recharts-tooltip-wrapper { outline: none !important; }
  `;

  return (
    <div className="min-h-screen w-full" style={{ background: COLORS.bg, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{styles}</style>
      <div className="max-w-4xl mx-auto px-4 sm:px-5 py-6 md:py-10">
        <div className="flex items-center justify-between mb-8">
          <button onClick={onClose} className="ui-font flex items-center gap-2 text-xs px-3 py-2 transition-all"
            style={{ border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright, background: COLORS.bgPanel, letterSpacing: '0.15em', textTransform: 'uppercase', fontWeight: 500 }}>
            <ArrowLeft size={13} /><span className="hidden sm:inline">Bütçeye Dön</span><span className="sm:hidden">Geri</span>
          </button>
          <div className="flex items-center gap-3">
            {/* Para birimi seçici */}
            <div className="flex gap-0.5 p-0.5" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
              {['TRY', 'USD', 'EUR'].map(c => (
                <button key={c} onClick={() => setCurrency(c)} className="ui-font px-2 py-1.5 transition-all"
                  style={{
                    background: currency === c ? COLORS.accent : 'transparent',
                    color: currency === c ? COLORS.bg : COLORS.textBright,
                    fontSize: '10px', fontWeight: 600, letterSpacing: '0.05em',
                    minWidth: '36px'
                  }}>
                  {c === 'TRY' ? '₺' : c === 'USD' ? '$' : '€'} {c}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 ui-font text-xs" style={{ color: COLORS.textDim, letterSpacing: '0.15em' }}>
              <div className="w-1.5 h-1.5 rounded-full pulse-dot" style={{ background: COLORS.accent }}></div>
              <span>CANLI</span>
            </div>
          </div>
        </div>

        <div className="fade-up delay-1 mb-6">
          <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.3em', textTransform: 'uppercase' }}>▌Yatırım Terminali</div>
          <h1 className="display-font text-4xl md:text-5xl" style={{ fontWeight: 300, letterSpacing: '-0.02em', lineHeight: 1, color: COLORS.textBrightest }}>
            <em style={{ fontWeight: 400, color: COLORS.accent }}>Mali</em> durumun.
          </h1>
        </div>

        <div className="fade-up delay-2 flex gap-1 mb-6 p-1 overflow-x-auto" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {[
            { id: 'portfolio', label: 'Mali Durum', icon: Wallet },
            { id: 'analysis', label: 'Piyasa Analizi', icon: Activity },
            { id: 'market', label: 'Piyasa', icon: BarChart3 },
            { id: 'goals', label: 'Hedefler', icon: Target },
            { id: 'tips', label: 'Tavsiyeler', icon: Activity }
          ].map(tab => {
            const Icon = tab.icon; const isActive = activeTab === tab.id;
            return (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} className="ui-font flex-shrink-0 flex items-center justify-center gap-1.5 py-2.5 px-3 transition-all"
                style={{ background: isActive ? COLORS.accent : 'transparent', color: isActive ? COLORS.bg : COLORS.textBright, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '10px', fontWeight: 600, minWidth: 'fit-content' }}>
                <Icon size={11} /><span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* PORTFOLIO TAB */}
        {activeTab === 'portfolio' && (
          <div>
            <div id="inv-tutorial-portfolio-card" className="fade-up delay-3 mb-6 p-6 md:p-7" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.accent}` }}>
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
              <div className="fade-up delay-4 mb-6 p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
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
              <div className="fade-up delay-4 mb-6 p-5" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
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
                      <Tooltip contentStyle={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
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
              <div className="fade-up delay-5 mb-6 p-5" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
                <div className="ui-font text-xs mb-4" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Varlık Dağılımı</div>
                <div className="grid md:grid-cols-2 gap-4 items-center">
                  <div style={{ width: '100%', height: 180 }}>
                    <ResponsiveContainer>
                      <PieChart>
                        <Pie data={pieData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value">
                          {pieData.map((entry, idx) => (<Cell key={idx} fill={entry.color} stroke={COLORS.bg} strokeWidth={2} />))}
                        </Pie>
                        <Tooltip contentStyle={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright, fontFamily: 'JetBrains Mono, monospace', fontSize: '11px' }}
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

            <div className="fade-up delay-6 mb-6">
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
                    <div key={item.assetId} className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
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
              <div className="fade-up delay-7 mb-6">
                <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
                  İşlem Geçmişi ({transactions.length})
                </div>
                <div className="space-y-1.5">
                  {[...transactions].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20).map(tx => {
                    const asset = allAssets.find(a => a.id === tx.assetId);
                    if (!asset) return null;
                    const isBuy = tx.type === 'buy';
                    return (
                      <div key={tx.id} className="flex items-center gap-3 p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
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
                          <button onClick={() => openTxModal(tx)} className="w-6 h-6 flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textBright }}>
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button onClick={() => deleteTx(tx.id)} className="w-6 h-6 flex items-center justify-center" style={{ border: '1px solid #5A2A2A', color: COLORS.negative }}>
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
              <div className="fade-up delay-8 mb-6 p-5" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
                <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Aylık Yatırım Bütçen</div>
                <div className="num-font text-2xl mb-2" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{formatCurrency(monthlyInvestmentBudget)}</div>
                <div className="ui-font text-xs" style={{ color: COLORS.textDim, lineHeight: 1.5 }}>
                  Bütçe sayfanda her ay maaşının bir kısmını yatırıma ayırıyorsun. Bu tutarı buradan kripto/altın/dövize dönüştürebilirsin.
                </div>
              </div>
            )}
          </div>
        )}

        {/* MARKET ANALYSIS TAB */}
        {activeTab === 'analysis' && (
          <div>
            <div className="fade-up delay-3 mb-2">
              <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.25em', textTransform: 'uppercase' }}>▌ Piyasa Analizi</div>
              <p className="ui-font text-xs" style={{ color: COLORS.textDimmer, lineHeight: 1.5 }}>Kripto piyasasının genel durumunu ve duygu göstergelerini takip et.</p>
            </div>

            {/* FEAR & GREED */}
            <div className="fade-up delay-3 mb-5" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${fgStats ? getFGColor(fgStats.current) : COLORS.accent}` }}>
              <div className="p-4 pb-0 flex items-center justify-between">
                <div className="ui-font text-xs" style={{ color: COLORS.textDim, letterSpacing: '0.25em', textTransform: 'uppercase' }}>▌ Korku &amp; Açgözlülük Endeksi</div>
                <div className="flex items-center gap-3">
                  {fearGreedLoading && <div className="w-1.5 h-1.5 rounded-full spin" style={{ border: `1.5px solid ${COLORS.accent}`, borderTopColor: 'transparent' }} />}
                  <button onClick={fetchFearGreed} className="ui-font text-xs" style={{ color: COLORS.textDimmer, letterSpacing: '0.1em' }}>↻ Yenile</button>
                </div>
              </div>
              {fearGreedError && !fgStats ? (
                <div className="p-4 ui-font text-xs flex items-center gap-2" style={{ color: COLORS.textDim }}>
                  <AlertCircle size={12} />{fearGreedError} — <button onClick={fetchFearGreed} className="underline" style={{ color: COLORS.textBright }}>tekrar dene</button>
                </div>
              ) : !fgStats ? (
                <div className="p-4 flex items-center justify-center gap-2 ui-font text-xs" style={{ color: COLORS.textDim }}>
                  <div className="w-3 h-3 rounded-full spin" style={{ border: `1.5px solid ${COLORS.textDim}`, borderTopColor: COLORS.accent }} />yükleniyor...
                </div>
              ) : (
                <>
                  <div className="p-4 flex flex-col sm:flex-row items-center gap-4">
                    <div className="flex-shrink-0 w-full sm:w-auto" style={{ maxWidth: 200 }}>
                      <FearGreedGauge value={fgStats.current} />
                    </div>
                    <div className="flex-1 w-full grid grid-cols-2 gap-2">
                      {[
                        { label: 'ANLIK', sublabel: 'bugün', val: fgStats.current },
                        { label: 'KISA VADE', sublabel: '7 günlük ort.', val: fgStats.avg7 },
                        { label: 'ORTA VADE', sublabel: '30 günlük ort.', val: fgStats.avg30 },
                        { label: 'UZUN VADE', sublabel: '90 günlük ort.', val: fgStats.avg90 },
                      ].map(({ label, sublabel, val }) => {
                        const c = getFGColor(val); const lbl = getFGLabel(val);
                        return (
                          <div key={label} className="p-3 flex flex-col gap-1.5" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.border}`, borderTop: `2px solid ${c}` }}>
                            <div className="ui-font text-[9px] font-semibold" style={{ color: COLORS.textDim, letterSpacing: '0.2em' }}>{label}</div>
                            <div className="num-font text-2xl font-bold leading-none" style={{ color: c }}>{val}</div>
                            <div className="ui-font text-[10px]" style={{ color: c, opacity: 0.85 }}>{lbl}</div>
                            <div className="mt-1 h-1 rounded-full overflow-hidden" style={{ background: COLORS.border }}>
                              <div className="h-full rounded-full" style={{ width: `${val}%`, background: `linear-gradient(90deg, #FF4444 0%, #FFD700 50%, #22C55E 100%)`, backgroundSize: '300% 100%', backgroundPosition: `${100 - val}% 0` }} />
                            </div>
                            <div className="ui-font text-[9px]" style={{ color: COLORS.textDimmer }}>{sublabel}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="ui-font text-[9px] mb-2 flex justify-between" style={{ color: COLORS.textDimmer, letterSpacing: '0.15em' }}>
                      <span>SON 90 GÜN</span><span>alternative.me</span>
                    </div>
                    <FGMiniChart data={fgStats.history} />
                    <div className="mt-3 flex items-center gap-0.5">
                      {[
                        { label: 'Aş.Korku', color: '#FF4444', range: '0–24' },
                        { label: 'Korku', color: '#FF8844', range: '25–44' },
                        { label: 'Nötr', color: '#FFD700', range: '45–55' },
                        { label: 'Açgöz.', color: '#7AE07A', range: '56–74' },
                        { label: 'Aş.Açgöz.', color: '#22C55E', range: '75–100' },
                      ].map(z => (
                        <div key={z.label} className="flex-1 text-center py-1" style={{ background: `${z.color}18`, borderTop: `2px solid ${z.color}` }}>
                          <div className="ui-font" style={{ fontSize: '8px', color: z.color, letterSpacing: '0.05em', lineHeight: 1.3 }}>{z.label}</div>
                          <div className="num-font" style={{ fontSize: '8px', color: COLORS.textDimmer }}>{z.range}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* BTC DOMINANCE + MARKET CAPS */}
            <div className="fade-up delay-4 mb-5">
              <div className="ui-font text-xs mb-3" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Piyasa Yapısı</div>
              {marketAnalysisLoading && !marketAnalysisData ? (
                <div className="flex items-center gap-2 p-4 ui-font text-xs" style={{ color: COLORS.textDim, background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
                  <div className="w-3 h-3 rounded-full spin" style={{ border: `1.5px solid ${COLORS.textDim}`, borderTopColor: COLORS.accent }} />yükleniyor...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {/* BTC Dominance */}
                  <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid #F7931A` }}>
                    <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>BTC Dominance</div>
                    <div className="num-font text-2xl font-bold mb-1" style={{ color: '#F7931A' }}>
                      {marketAnalysisData?.btcDominance ? `%${marketAnalysisData.btcDominance.toFixed(1)}` : '—'}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: COLORS.border }}>
                      <div className="h-full rounded-full" style={{ width: `${marketAnalysisData?.btcDominance || 0}%`, background: '#F7931A' }} />
                    </div>
                    <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>Bitcoin piyasa payı</div>
                  </div>

                  {/* ETH Dominance */}
                  <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid #627EEA` }}>
                    <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>ETH Dominance</div>
                    <div className="num-font text-2xl font-bold mb-1" style={{ color: '#627EEA' }}>
                      {marketAnalysisData?.ethDominance ? `%${marketAnalysisData.ethDominance.toFixed(1)}` : '—'}
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: COLORS.border }}>
                      <div className="h-full rounded-full" style={{ width: `${marketAnalysisData?.ethDominance || 0}%`, background: '#627EEA' }} />
                    </div>
                    <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>Ethereum piyasa payı</div>
                  </div>

                  {/* Stablecoin Dominance */}
                  <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid #26A17B` }}>
                    <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Stablecoin Dominance</div>
                    <div className="num-font text-2xl font-bold mb-1" style={{ color: '#26A17B' }}>
                      {marketAnalysisData?.stablecoinDominance ? `%${marketAnalysisData.stablecoinDominance.toFixed(1)}` : '—'}
                    </div>
                    <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>
                      {marketAnalysisData?.stablecoinDominance
                        ? marketAnalysisData.stablecoinDominance > 10 ? '↑ Yüksek — beklemede sermaye var' : '↓ Düşük — sermaye piyasada'
                        : 'USDT · USDC · DAI · BUSD'}
                    </div>
                  </div>

                  {/* Total Market Cap */}
                  <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${COLORS.accent}` }}>
                    <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Toplam Piyasa Değeri</div>
                    <div className="num-font text-lg font-bold mb-1" style={{ color: COLORS.textBrightest }}>
                      {marketAnalysisData?.totalMarketCapUsd
                        ? `$${(marketAnalysisData.totalMarketCapUsd / 1e12).toFixed(2)}T`
                        : '—'}
                    </div>
                    {marketAnalysisData?.totalMarketCapChange24h !== undefined && (
                      <div className="num-font text-xs" style={{ color: marketAnalysisData.totalMarketCapChange24h >= 0 ? COLORS.positive : COLORS.negative }}>
                        {marketAnalysisData.totalMarketCapChange24h >= 0 ? '+' : ''}{marketAnalysisData.totalMarketCapChange24h.toFixed(2)}% (24s)
                      </div>
                    )}
                    <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>Tüm kripto varlıklar</div>
                  </div>
                </div>
              )}
            </div>

            {/* FUTURES INDICATORS */}
            <div className="fade-up delay-5 mb-5">
              <div className="flex items-center justify-between mb-3">
                <div className="ui-font text-xs" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Türev Piyasa Göstergeleri</div>
                <button onClick={fetchMarketAnalysisData} className="ui-font text-xs flex items-center gap-1" style={{ color: COLORS.textDimmer }}>
                  <RefreshCw size={10} className={marketAnalysisLoading ? 'spin' : ''} />Yenile
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {/* Funding Rate */}
                <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${marketAnalysisData?.fundingRate !== undefined ? (marketAnalysisData.fundingRate >= 0 ? COLORS.positive : COLORS.negative) : COLORS.textDim}` }}>
                  <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Funding Rate</div>
                  <div className="num-font text-2xl font-bold" style={{ color: marketAnalysisData?.fundingRate !== undefined ? (marketAnalysisData.fundingRate >= 0 ? COLORS.positive : COLORS.negative) : COLORS.textDim }}>
                    {marketAnalysisData?.fundingRate !== undefined ? `${marketAnalysisData.fundingRate >= 0 ? '+' : ''}${marketAnalysisData.fundingRate.toFixed(4)}%` : '—'}
                  </div>
                  <div className="ui-font text-[9px] mt-2" style={{ color: COLORS.textDimmer }}>
                    {marketAnalysisData?.fundingRate !== undefined
                      ? marketAnalysisData.fundingRate > 0.05 ? "Pozitif — long'lar ödüyor (ısınan piyasa)"
                        : marketAnalysisData.fundingRate < -0.01 ? "Negatif — short'lar ödüyor (panik modu)"
                        : 'Nötr bölge'
                      : 'BTC-USDT Perp · Binance'}
                  </div>
                  {marketAnalysisData?.nextFundingTime && (
                    <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>
                      Sonraki: {new Date(marketAnalysisData.nextFundingTime).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  )}
                </div>

                {/* Open Interest */}
                <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid #8B5CF6` }}>
                  <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Open Interest</div>
                  <div className="num-font text-xl font-bold" style={{ color: '#8B5CF6' }}>
                    {marketAnalysisData?.openInterestUsd
                      ? `$${(marketAnalysisData.openInterestUsd / 1e9).toFixed(2)}B`
                      : marketAnalysisData?.openInterestBtc
                        ? `${(marketAnalysisData.openInterestBtc / 1000).toFixed(1)}K BTC`
                        : '—'}
                  </div>
                  {marketAnalysisData?.openInterestChange24h !== undefined && (
                    <div className="num-font text-xs mt-1" style={{ color: marketAnalysisData.openInterestChange24h >= 0 ? COLORS.positive : COLORS.negative }}>
                      {marketAnalysisData.openInterestChange24h >= 0 ? '+' : ''}{marketAnalysisData.openInterestChange24h.toFixed(2)}% (24s)
                    </div>
                  )}
                  <div className="ui-font text-[9px] mt-2" style={{ color: COLORS.textDimmer }}>
                    {marketAnalysisData?.openInterestChange24h !== undefined
                      ? marketAnalysisData.openInterestChange24h > 5 ? '↑ Artan OI — trend güçleniyor'
                        : marketAnalysisData.openInterestChange24h < -5 ? '↓ Azalan OI — pozisyonlar kapatılıyor'
                        : 'Stabil — yatay seyir'
                      : 'BTC vadeli kontrat · Binance'}
                  </div>
                </div>

                {/* Long/Short Ratio */}
                <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid #EC4899` }}>
                  <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Long / Short Oranı</div>
                  {marketAnalysisData?.longRatio !== undefined ? (
                    <>
                      <div className="flex items-center gap-2 mb-2">
                        <div className="num-font text-base font-bold" style={{ color: COLORS.positive }}>L %{marketAnalysisData.longRatio.toFixed(1)}</div>
                        <div className="num-font text-base font-bold" style={{ color: COLORS.negative }}>S %{marketAnalysisData.shortRatio.toFixed(1)}</div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: COLORS.negative }}>
                        <div className="h-full rounded-full" style={{ width: `${marketAnalysisData.longRatio}%`, background: COLORS.positive }} />
                      </div>
                      <div className="ui-font text-[9px] mt-2" style={{ color: COLORS.textDimmer }}>
                        {marketAnalysisData.longRatio > 60 ? 'Çoğunluk long — dikkat: sürü psikolojisi'
                          : marketAnalysisData.longRatio < 40 ? 'Çoğunluk short — potansiyel sıkışma riski'
                          : 'Dengeli dağılım'}
                      </div>
                    </>
                  ) : (
                    <div className="num-font text-2xl font-bold" style={{ color: COLORS.textDim }}>—</div>
                  )}
                </div>

                {/* Taker Buy/Sell (Exchange Inflow proxy) */}
                <div className="p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid #F59E0B` }}>
                  <div className="ui-font text-[9px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Alım/Satım Baskısı</div>
                  {marketAnalysisData?.takerBuySellRatio !== undefined ? (
                    <>
                      <div className="num-font text-2xl font-bold mb-1" style={{ color: marketAnalysisData.takerBuySellRatio >= 1 ? COLORS.positive : COLORS.negative }}>
                        {marketAnalysisData.takerBuySellRatio.toFixed(3)}
                      </div>
                      <div className="ui-font text-[9px]" style={{ color: COLORS.textDimmer }}>
                        {marketAnalysisData.takerBuySellRatio >= 1.05 ? '↑ Alım baskısı ağır basıyor'
                          : marketAnalysisData.takerBuySellRatio <= 0.95 ? '↓ Satım baskısı ağır basıyor'
                          : '≈ Dengeli akış'}
                      </div>
                      <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>Taker alım/satım oranı (24s ort.)</div>
                    </>
                  ) : (
                    <>
                      <div className="num-font text-2xl font-bold" style={{ color: COLORS.textDim }}>—</div>
                      <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>Exchange inflow/outflow proxy</div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Liquidations — açıklama kartı */}
            <div className="fade-up delay-6 mb-5 p-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid #EF4444` }}>
              <div className="ui-font text-xs mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Tasfiyeler (Liquidations)</div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="num-font text-[10px] mb-1" style={{ color: COLORS.textDimmer, letterSpacing: '0.1em' }}>LONG TASFİYELER</div>
                  <div className="num-font text-base font-bold" style={{ color: COLORS.negative }}>
                    {marketAnalysisData?.longRatio !== undefined && marketAnalysisData?.openInterestUsd
                      ? `~$${((marketAnalysisData.openInterestUsd * 0.02 * (100 - marketAnalysisData.longRatio) / 100) / 1e6).toFixed(0)}M`
                      : '—'}
                  </div>
                  <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>Tahmini risk tasfiyesi</div>
                </div>
                <div>
                  <div className="num-font text-[10px] mb-1" style={{ color: COLORS.textDimmer, letterSpacing: '0.1em' }}>SHORT TASFİYELER</div>
                  <div className="num-font text-base font-bold" style={{ color: COLORS.positive }}>
                    {marketAnalysisData?.longRatio !== undefined && marketAnalysisData?.openInterestUsd
                      ? `~$${((marketAnalysisData.openInterestUsd * 0.02 * marketAnalysisData.longRatio / 100) / 1e6).toFixed(0)}M`
                      : '—'}
                  </div>
                  <div className="ui-font text-[9px] mt-1" style={{ color: COLORS.textDimmer }}>Tahmini risk tasfiyesi</div>
                </div>
              </div>
              <div className="ui-font text-[9px] mt-3 pt-3" style={{ color: COLORS.textDimmer, borderTop: `1px solid ${COLORS.border}` }}>
                ⚠ Tasfiye verileri OI ve long/short oranından türetilmiştir. Gerçek zamanlı tasfiye için CoinGlass veya Coingecko Pro gereklidir.
              </div>
            </div>

            <div className="fade-up delay-7 p-3 ui-font text-xs" style={{ color: COLORS.textDimmer, lineHeight: 1.7 }}>
              <strong style={{ color: COLORS.textDim }}>Veri kaynakları:</strong> CoinGecko (piyasa yapısı) · Binance Futures (funding rate, OI, L/S oranı) · alternative.me (F&G)
              <br />Analiz amaçlıdır, yatırım tavsiyesi değildir.
            </div>
          </div>
        )}

        {/* MARKET TAB */}
        {activeTab === 'market' && (
          <div>
            {/* Filtre sekmeleri */}
            <div className="flex gap-1 overflow-x-auto pb-2 mb-3" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {[
                { id: 'all', label: 'Tümü' },
                { id: 'crypto', label: 'Kripto/Döviz' },
                { id: 'bist', label: '📈 BIST' },
                { id: 'nasdaq', label: '🇺🇸 ABD' },
                { id: 'fund', label: 'T. Fonlar' },
              ].map(f => (
                <button key={f.id} onClick={() => setMarketFilter(f.id)}
                  className="ui-font flex-shrink-0 text-xs px-3 py-1.5 transition-all"
                  style={{ background: marketFilter === f.id ? COLORS.accent : 'transparent', color: marketFilter === f.id ? COLORS.bg : COLORS.textBright, border: `1px solid ${marketFilter === f.id ? COLORS.accent : COLORS.border}`, letterSpacing: '0.08em', fontWeight: 600, whiteSpace: 'nowrap' }}>
                  {f.label}
                </button>
              ))}
            </div>

            <div className="flex items-center justify-between mb-4">
              <div className="ui-font text-xs" style={{ color: COLORS.textDim }}>
                {lastUpdate ? `Son: ${lastUpdate.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}` : 'Yükleniyor...'}
                {stocksError && <span style={{ color: COLORS.negative, marginLeft: 8 }}>⚠ Hisse verileri kısmi</span>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setMarketEditMode(!marketEditMode)} className="ui-font flex items-center gap-1.5 text-xs px-3 py-2 transition-all"
                  style={{ border: `1px solid ${marketEditMode ? COLORS.accent : COLORS.borderLight}`, color: marketEditMode ? COLORS.accent : COLORS.textBright, background: marketEditMode ? 'rgba(122, 224, 122, 0.08)' : 'transparent', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                  <Settings2 size={11} />{marketEditMode ? 'Bitti' : 'Düzenle'}
                </button>
                {!marketEditMode && (
                  <>
                    <button onClick={() => setShowAddAssetModal(true)} className="ui-font flex items-center gap-1.5 text-xs px-3 py-2 transition-all"
                      style={{ background: COLORS.accent, color: COLORS.bg, letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 600 }}>
                      <Plus size={11} />Ekle
                    </button>
                    <button onClick={() => { fetchPrices(); fetchStocksAndFunds(); }} disabled={pricesLoading} className="ui-font flex items-center gap-1.5 text-xs px-3 py-2 transition-all"
                      style={{ border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright, background: 'transparent', letterSpacing: '0.1em', textTransform: 'uppercase', fontWeight: 500 }}>
                      <RefreshCw size={11} className={pricesLoading ? 'spin' : ''} />Yenile
                    </button>
                  </>
                )}
              </div>
            </div>

            {pricesError && (
              <div className="p-4 mb-5 ui-font text-sm flex items-start gap-2" style={{ background: 'rgba(255, 107, 107, 0.05)', border: '1px solid #5A2A2A', color: COLORS.negative }}>
                <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />{pricesError}
              </div>
            )}

            {/* Fear & Greed özet linki */}
            {!marketEditMode && (marketFilter === 'all' || marketFilter === 'crypto') && fgStats && (
              <button onClick={() => setActiveTab('analysis')} className="mb-4 w-full p-3 flex items-center justify-between transition-all"
                style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${getFGColor(fgStats.current)}` }}>
                <div className="flex items-center gap-3">
                  <div className="num-font text-lg font-bold" style={{ color: getFGColor(fgStats.current) }}>{fgStats.current}</div>
                  <div>
                    <div className="ui-font text-[10px] font-semibold" style={{ color: getFGColor(fgStats.current), letterSpacing: '0.1em', textTransform: 'uppercase' }}>{getFGLabel(fgStats.current)}</div>
                    <div className="ui-font text-[9px]" style={{ color: COLORS.textDimmer }}>Korku &amp; Açgözlülük Endeksi</div>
                  </div>
                </div>
                <div className="ui-font text-[10px] flex items-center gap-1" style={{ color: COLORS.textDim }}>Analiz <ArrowUpRight size={10} /></div>
              </button>
            )}

            {/* DÜZENLEME MODU */}
            {marketEditMode ? (
              <div className="grid gap-1.5">
                {allMarketAssetsForEdit.map((asset, idx) => (
                  <div key={asset.id} className="p-3 flex items-center gap-3"
                    style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, opacity: asset.visible ? 1 : 0.45 }}>
                    {/* Sıralama okları */}
                    <div className="flex flex-col gap-0.5 flex-shrink-0">
                      <button onClick={() => moveAsset(asset.id, -1)} disabled={idx === 0}
                        className="w-6 h-5 flex items-center justify-center transition-all"
                        style={{ border: `1px solid ${COLORS.border}`, color: idx === 0 ? COLORS.textDimmer : COLORS.textBright, cursor: idx === 0 ? 'not-allowed' : 'pointer' }}>
                        <ChevronUp size={12} />
                      </button>
                      <button onClick={() => moveAsset(asset.id, 1)} disabled={idx === allMarketAssetsForEdit.length - 1}
                        className="w-6 h-5 flex items-center justify-center transition-all"
                        style={{ border: `1px solid ${COLORS.border}`, color: idx === allMarketAssetsForEdit.length - 1 ? COLORS.textDimmer : COLORS.textBright, cursor: idx === allMarketAssetsForEdit.length - 1 ? 'not-allowed' : 'pointer' }}>
                        <ChevronDown size={12} />
                      </button>
                    </div>
                    {/* Varlık bilgisi */}
                    <div className="min-w-0 flex-1">
                      <div className="num-font text-xs mb-0.5" style={{ color: COLORS.textDim, letterSpacing: '0.1em' }}>{asset.symbol}</div>
                      <div className="ui-font text-sm truncate" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{asset.name}</div>
                    </div>
                    {/* Görünürlük toggle */}
                    <button onClick={() => toggleAssetVisibility(asset.id)}
                      className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ border: `1px solid ${asset.visible ? COLORS.borderLight : COLORS.border}`, color: asset.visible ? COLORS.accent : COLORS.textDim }}
                      title={asset.visible ? 'Gizle' : 'Göster'}>
                      {asset.visible ? <Eye size={13} /> : <EyeOff size={13} />}
                    </button>
                    {/* Silme */}
                    <button onClick={() => removeAssetFromMarket(asset.id)}
                      className="w-8 h-8 flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ border: '1px solid #5A2A2A', color: COLORS.negative }}
                      title="Kaldır">
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
                {allMarketAssetsForEdit.length === 0 && (
                  <div className="text-center py-8 ui-font text-xs" style={{ color: COLORS.textDim }}>
                    Listeye "Coin Ekle" ile varlık ekleyebilirsin.
                  </div>
                )}
              </div>
            ) : (
              /* NORMAL GÖRÜNÜM */
              <div id="inv-tutorial-market-table" className="grid gap-2">
                {filteredMarketAssets.map((asset, idx) => {
                  const p = prices[asset.id];
                  const change = p?.change;
                  const typeMeta = {
                    bist: { label: 'BIST', color: '#F59E0B' },
                    nasdaq: { label: 'ABD', color: '#60A5FA' },
                    crypto: { label: 'KRİPTO', color: COLORS.accent },
                    fiat: { label: 'DÖVİZ', color: '#94A3B8' },
                    commodity: { label: 'ALTIN', color: COLORS.gold },
                    turkishfund: { label: 'FON', color: '#F472B6' },
                  }[asset.type] || { label: asset.type, color: COLORS.textDim };
                  return (
                    <div key={asset.id} className={`fade-up delay-${Math.min(idx + 1, 8)}`}
                      style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${typeMeta.color}` }}>
                      <div className="flex items-center gap-3 p-3">
                        {/* Sol: sembol + isim + tip badge */}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="num-font text-xs font-bold" style={{ color: typeMeta.color }}>{asset.symbol}</span>
                            <span className="ui-font px-1 py-0.5 text-[8px] font-bold rounded-sm" style={{ background: `${typeMeta.color}22`, color: typeMeta.color, letterSpacing: '0.08em' }}>{typeMeta.label}</span>
                          </div>
                          <div className="ui-font text-xs truncate" style={{ color: COLORS.textBright }}>{asset.name}</div>
                        </div>
                        {/* Sağ: fiyat + değişim */}
                        <div className="text-right flex-shrink-0">
                          {p?.try ? (
                            <>
                              <div className="num-font text-sm font-bold" style={{ color: COLORS.textBrightest }}>{formatCurrency(p.try)}</div>
                              {asset.type === 'nasdaq' && p.usd && (
                                <div className="num-font text-[10px]" style={{ color: COLORS.textDimmer }}>${p.usd.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
                              )}
                              {change !== undefined && change !== 0 && (
                                <div className="num-font text-xs flex items-center justify-end gap-0.5 mt-0.5" style={{ color: change > 0 ? COLORS.positive : COLORS.negative }}>
                                  {change > 0 ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
                                  {change > 0 ? '+' : ''}{change.toFixed(2)}%
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="num-font text-sm" style={{ color: COLORS.textDimmer }}>—</div>
                          )}
                        </div>
                        {/* Portföye ekle butonu */}
                        <button
                          onClick={() => { setEditingTx(null); setTxType('buy'); setTxAssetId(asset.id); setTxAmount(''); setTxPrice(p?.try ? p.try.toFixed(2) : ''); setTxDate(new Date().toISOString().split('T')[0]); setShowTxModal(true); }}
                          className="flex-shrink-0 w-7 h-7 flex items-center justify-center transition-all"
                          style={{ border: `1px solid ${COLORS.borderLight}`, color: COLORS.accent }}
                          title="Portföye ekle (simüle al/sat)">
                          <Plus size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
                {filteredMarketAssets.length === 0 && (
                  <div className="text-center py-12 px-6" style={{ background: COLORS.bgPanel, border: `1px dashed ${COLORS.border}` }}>
                    <BarChart3 size={32} className="mx-auto mb-3" style={{ color: COLORS.textDim }} />
                    <div className="ui-font text-sm mb-2" style={{ color: COLORS.textBright }}>Bu kategoride varlık yok</div>
                    <div className="ui-font text-xs" style={{ color: COLORS.textDim, lineHeight: 1.5 }}>
                      "Düzenle" ile gizlenenleri açabilir veya "Ekle" ile yeni varlık ekleyebilirsin.
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="mt-6 p-3 ui-font text-xs" style={{ color: COLORS.textDimmer, lineHeight: 1.7 }}>
              <strong style={{ color: COLORS.textDim }}>Veri kaynakları:</strong> Frankfurter (döviz) · CoinGecko (kripto/altın) · Yahoo Finance (BIST/ABD) · TEFAS (T. Fonlar) · alternative.me (F&G)
              <br />Simülasyon amaçlıdır, gerçek yatırım tavsiyesi değildir. 5 dakikada bir otomatik güncellenir.
            </div>
          </div>
        )}

        {/* GOALS TAB */}
        {activeTab === 'goals' && (
          <div id="inv-tutorial-goals-section">
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
                      style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, borderLeft: `3px solid ${isComplete ? COLORS.gold : COLORS.accent}` }}>
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
                            className="w-7 h-7 flex items-center justify-center" style={{ border: `1px solid ${COLORS.border}`, color: COLORS.textBright }}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
                          </button>
                          <button onClick={() => onUpdateGoals(investmentGoals.filter(g => g.id !== goal.id))} className="w-7 h-7 flex items-center justify-center" style={{ border: '1px solid #5A2A2A', color: COLORS.negative }}>
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
              <div key={idx} className={`fade-up delay-${Math.min(idx + 1, 7)} p-5`} style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
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
          <div className="scale-in w-full max-w-md p-6 md:p-7" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{editingTx ? 'Düzenle' : 'Yeni İşlem'}</div>
                <h3 className="display-font text-xl" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>Al veya <em style={{ color: COLORS.accent }}>sat</em></h3>
              </div>
              <button onClick={() => setShowTxModal(false)} className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright }}>
                <X size={14} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1 mb-5 p-1" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
              <button onClick={() => setTxType('buy')} className="ui-font py-2.5"
                style={{ background: txType === 'buy' ? COLORS.positive : 'transparent', color: txType === 'buy' ? COLORS.bg : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>ALIŞ</button>
              <button onClick={() => setTxType('sell')} className="ui-font py-2.5"
                style={{ background: txType === 'sell' ? COLORS.negative : 'transparent', color: txType === 'sell' ? '#FFFFFF' : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>SATIŞ</button>
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Varlık</label>
              <select value={txAssetId} onChange={(e) => { setTxAssetId(e.target.value); const p = prices[e.target.value]?.try; if (p) setTxPrice(p.toFixed(2)); }}
                className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBright, fontSize: '13px' }}>
                <option value="">Varlık seç...</option>
                {[
                  { key: 'crypto', label: '── Kripto Para ──', types: ['crypto'] },
                  { key: 'fiat', label: '── Döviz / Altın ──', types: ['fiat', 'commodity'] },
                  { key: 'bist', label: '── BIST Hisseleri ──', types: ['bist'] },
                  { key: 'nasdaq', label: '── ABD Hisseleri (NASDAQ) ──', types: ['nasdaq'] },
                  { key: 'fund', label: '── Türk Yatırım Fonları ──', types: ['turkishfund'] },
                ].map(group => {
                  const groupAssets = allAssets.filter(a => group.types.includes(a.type));
                  if (groupAssets.length === 0) return null;
                  return (
                    <optgroup key={group.key} label={group.label} style={{ background: COLORS.bgPanelLight, color: COLORS.textDim }}>
                      {groupAssets.map(a => {
                        const p = prices[a.id];
                        const priceStr = p?.try ? ` · ${formatCurrency(p.try)}` : '';
                        return (
                          <option key={a.id} value={a.id} style={{ background: COLORS.bgPanel }}>
                            {a.symbol} — {a.name}{priceStr}
                          </option>
                        );
                      })}
                    </optgroup>
                  );
                })}
              </select>
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Miktar</label>
              <input type="number" value={txAmount} onChange={(e) => setTxAmount(e.target.value)} placeholder="0" step="any"
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBrightest, fontSize: '20px' }} />
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
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBrightest, fontSize: '20px' }} />
            </div>

            <div className="mb-5">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Tarih</label>
              <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)}
                className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBright, fontSize: '14px', colorScheme: 'dark' }} />
            </div>

            {txAmount && txPrice && (
              <div className="mb-5 p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
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
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => { setShowAddAssetModal(false); setStockSymbol(''); setStockName(''); setFundCode(''); setFundName(''); setSearchQuery(''); setSearchResults([]); }}>
          <div className="scale-in w-full max-w-md p-6 md:p-7" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, maxHeight: '92vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <div>
                <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>Enstrüman Ekle</div>
                <h3 className="display-font text-xl" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>Piyasaya <em style={{ color: COLORS.accent }}>ekle</em></h3>
              </div>
              <button onClick={() => { setShowAddAssetModal(false); setStockSymbol(''); setStockName(''); setFundCode(''); setFundName(''); setSearchQuery(''); setSearchResults([]); }} className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright }}>
                <X size={14} />
              </button>
            </div>

            {/* Tip seçici */}
            <div className="grid grid-cols-3 gap-1 p-1 mb-5" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
              {[
                { id: 'crypto', label: 'Kripto' },
                { id: 'stock', label: 'Hisse' },
                { id: 'fund', label: 'T. Fon' },
              ].map(t => (
                <button key={t.id} onClick={() => setAddAssetType(t.id)} className="ui-font py-2.5 transition-all"
                  style={{ background: addAssetType === t.id ? COLORS.accent : 'transparent', color: addAssetType === t.id ? COLORS.bg : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                  {t.label}
                </button>
              ))}
            </div>

            {/* KRİPTO */}
            {addAssetType === 'crypto' && (
              <>
                <div className="relative mb-4">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: COLORS.textDim }} />
                  <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="örn: avalanche, cardano, dogecoin..." autoFocus
                    className="ui-font w-full pl-10 p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBrightest, fontSize: '14px' }} />
                </div>
                {searching && <div className="text-center py-4 ui-font text-xs" style={{ color: COLORS.textDim }}>Aranıyor...</div>}
                <div className="space-y-1.5 mb-4">
                  {searchResults.map(coin => {
                    const alreadyAdded = watchedAssets.some(a => a.id === coin.id) || DEFAULT_ASSETS.some(a => a.id === coin.id);
                    return (
                      <button key={coin.id} onClick={() => !alreadyAdded && addCoinToWatchlist(coin)} disabled={alreadyAdded}
                        className="w-full flex items-center gap-3 p-3 transition-all text-left"
                        style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, opacity: alreadyAdded ? 0.5 : 1, cursor: alreadyAdded ? 'not-allowed' : 'pointer' }}>
                        {coin.thumb && <img src={coin.thumb} alt="" className="w-7 h-7 flex-shrink-0" />}
                        <div className="flex-1 min-w-0">
                          <div className="ui-font text-sm" style={{ color: COLORS.textBrightest, fontWeight: 500 }}>{coin.name}</div>
                          <div className="num-font text-xs" style={{ color: COLORS.textDim }}>{coin.symbol?.toUpperCase()} {coin.market_cap_rank ? `· #${coin.market_cap_rank}` : ''}</div>
                        </div>
                        {alreadyAdded ? <span className="ui-font text-xs" style={{ color: COLORS.textDim }}>Ekli</span> : <Plus size={14} style={{ color: COLORS.accent }} />}
                      </button>
                    );
                  })}
                </div>
                {searchQuery.length >= 2 && !searching && searchResults.length === 0 && (
                  <div className="text-center py-6 ui-font text-xs" style={{ color: COLORS.textDim }}>"{searchQuery}" için sonuç yok</div>
                )}
                {!searchQuery && (
                  <div className="text-center py-6 ui-font text-xs" style={{ color: COLORS.textDim, lineHeight: 1.5 }}>
                    Coin adı veya sembolü yaz<br/><span style={{ color: COLORS.textDimmer }}>10.000+ kripto destekleniyor</span>
                  </div>
                )}
              </>
            )}

            {/* HİSSE SENEDİ */}
            {addAssetType === 'stock' && (
              <>
                <div className="grid grid-cols-2 gap-1 p-1 mb-4" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
                  {[{ id: 'bist', label: '📈 BIST (TR)' }, { id: 'nasdaq', label: '🇺🇸 ABD' }].map(m => (
                    <button key={m.id} onClick={() => setStockMarket(m.id)} className="ui-font py-2 transition-all"
                      style={{ background: stockMarket === m.id ? COLORS.accent : 'transparent', color: stockMarket === m.id ? COLORS.bg : COLORS.textBright, fontSize: '11px', fontWeight: 600, letterSpacing: '0.06em' }}>
                      {m.label}
                    </button>
                  ))}
                </div>
                <div className="mb-4">
                  <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                    Sembol {stockMarket === 'bist' ? '(örn: SASA, TOGG, PGSUS)' : '(örn: AMD, PLTR, META)'}
                  </label>
                  <input type="text" value={stockSymbol} onChange={(e) => setStockSymbol(e.target.value.toUpperCase())} placeholder={stockMarket === 'bist' ? 'SASA' : 'NVDA'} autoFocus
                    className="ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBrightest, fontSize: '18px', letterSpacing: '0.1em' }} />
                  {stockMarket === 'bist' && stockSymbol && (
                    <div className="ui-font text-[10px] mt-1" style={{ color: COLORS.textDimmer }}>Yahoo Finance: {stockSymbol}.IS</div>
                  )}
                </div>
                <div className="mb-5">
                  <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Şirket Adı <span style={{ textTransform: 'none', fontStyle: 'italic' }}>(opsiyonel)</span></label>
                  <input type="text" value={stockName} onChange={(e) => setStockName(e.target.value)} placeholder="örn: Sasa Polyester"
                    className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBright, fontSize: '14px' }} />
                </div>
                <button onClick={addStockToWatchlist} disabled={!stockSymbol.trim()} className="w-full ui-font py-3 transition-all"
                  style={{ background: stockSymbol.trim() ? COLORS.accent : COLORS.border, color: stockSymbol.trim() ? COLORS.bg : COLORS.textDim, cursor: stockSymbol.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                  {stockMarket === 'bist' ? 'BIST' : 'NASDAQ'} — Piyasaya Ekle
                </button>
                <div className="mt-3 ui-font text-[10px]" style={{ color: COLORS.textDimmer, lineHeight: 1.5 }}>
                  Eklenen hisse Yahoo Finance API üzerinden anlık fiyat çeker. Piyasa saatleri dışında son kapanış fiyatı gösterilir.
                </div>
              </>
            )}

            {/* TÜRK YATIRIM FONU */}
            {addAssetType === 'fund' && (
              <>
                <div className="mb-4">
                  <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>TEFAS Fon Kodu <span style={{ textTransform: 'none', fontStyle: 'italic' }}>(3-4 harf)</span></label>
                  <input type="text" value={fundCode} onChange={(e) => setFundCode(e.target.value.toUpperCase())} placeholder="örn: AGB, TI2, AFY" autoFocus
                    className="ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBrightest, fontSize: '22px', letterSpacing: '0.15em' }} />
                </div>
                <div className="mb-4">
                  <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Fon Adı <span style={{ textTransform: 'none', fontStyle: 'italic' }}>(opsiyonel)</span></label>
                  <input type="text" value={fundName} onChange={(e) => setFundName(e.target.value)} placeholder="örn: Ak Port. Altın BYF"
                    className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBright, fontSize: '14px' }} />
                </div>
                <button onClick={addFundToWatchlist} disabled={!fundCode.trim()} className="w-full ui-font py-3 transition-all"
                  style={{ background: fundCode.trim() ? COLORS.accent : COLORS.border, color: fundCode.trim() ? COLORS.bg : COLORS.textDim, cursor: fundCode.trim() ? 'pointer' : 'not-allowed', letterSpacing: '0.15em', textTransform: 'uppercase', fontSize: '12px', fontWeight: 600 }}>
                  Türk Fonları — Piyasaya Ekle
                </button>
                <div className="mt-4 p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
                  <div className="ui-font text-[10px] mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Örnek Fon Kodları</div>
                  <div className="grid grid-cols-2 gap-1">
                    {[
                      { code: 'AGB', name: 'Ak Port. Altın BYF' },
                      { code: 'TI2', name: 'İş Port. Hisse' },
                      { code: 'AFY', name: 'Ak Port. Yab. BYF' },
                      { code: 'GAF', name: 'Garanti Port. His.' },
                      { code: 'GIH', name: 'Garanti Port. Altın' },
                      { code: 'YAP', name: 'Yapı Kredi Port.' },
                    ].map(f => (
                      <button key={f.code} onClick={() => { setFundCode(f.code); setFundName(f.name); }}
                        className="p-2 text-left transition-all" style={{ background: fundCode === f.code ? 'rgba(122,224,122,0.08)' : COLORS.bgPanelLight, border: `1px solid ${fundCode === f.code ? COLORS.borderLight : COLORS.border}` }}>
                        <div className="num-font text-xs font-bold" style={{ color: fundCode === f.code ? COLORS.accent : COLORS.textBright }}>{f.code}</div>
                        <div className="ui-font text-[9px]" style={{ color: COLORS.textDimmer }}>{f.name}</div>
                      </button>
                    ))}
                  </div>
                  <div className="ui-font text-[9px] mt-3" style={{ color: COLORS.textDimmer }}>
                    Fon kodu tefas.gov.tr'den bulunabilir. Fiyatlar TEFAS API üzerinden çekilir.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* GOAL MODAL */}
      {showGoalModal && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-6" style={{ background: 'rgba(0,0,0,0.9)' }} onClick={() => setShowGoalModal(false)}>
          <div className="scale-in w-full max-w-md p-6 md:p-7" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}`, maxHeight: '90vh', overflowY: 'auto' }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <div className="ui-font text-xs mb-1" style={{ color: COLORS.textDim, letterSpacing: '0.2em', textTransform: 'uppercase' }}>{editingGoalId ? 'Düzenle' : 'Yeni'}</div>
                <h3 className="display-font text-xl" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>Yatırım <em style={{ color: COLORS.accent }}>hedefi</em></h3>
              </div>
              <button onClick={() => setShowGoalModal(false)} className="w-8 h-8 flex items-center justify-center" style={{ border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright }}>
                <X size={14} />
              </button>
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Ad</label>
              <input type="text" value={goalName} onChange={(e) => setGoalName(e.target.value)} placeholder="Örn: Emeklilik fonu" autoFocus
                className="ui-font w-full p-3" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBrightest, fontSize: '14px' }} />
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Hedef Tutar (₺)</label>
              <input type="number" value={goalAmount} onChange={(e) => setGoalAmount(e.target.value)} placeholder="100000"
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBrightest, fontSize: '20px' }} />
            </div>

            <div className="mb-4">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>
                Mevcut <span style={{ textTransform: 'none', letterSpacing: 'normal', fontStyle: 'italic' }}>(boş = portföye bağlanır)</span>
              </label>
              <input type="number" value={goalCurrent} onChange={(e) => setGoalCurrent(e.target.value)} placeholder="0"
                className="number-input ui-font w-full p-3 num-font" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}`, color: COLORS.textBright, fontSize: '16px' }} />
            </div>

            <div className="mb-6">
              <label className="ui-font text-xs block mb-2" style={{ color: COLORS.textDim, letterSpacing: '0.15em', textTransform: 'uppercase' }}>Periyot</label>
              <div className="grid grid-cols-2 gap-1 p-1" style={{ background: COLORS.bgPanel, border: `1px solid ${COLORS.border}` }}>
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

      {/* TUTORIAL OVERLAY (steps 5-7) */}
      {showTutorial && tutorialStep >= 5 && tutorialStep <= 7 && (() => {
        const invSteps = [
          null, null, null, null, null,
          { icon: '📊', title: 'Canlı Piyasa Takibi', desc: 'Döviz, kripto para ve altın fiyatlarını anlık takip et. 24 saatlik değişim oranları renk kodlamasıyla görünür — yeşil artış, kırmızı düşüş demektir.' },
          { icon: '💼', title: 'Portföy Takibi', desc: 'Al-sat işlemlerini kaydet, toplam portföy değerini ve kar/zarar oranını izle. Dönemsel performans verisi ile birikiminin büyüme seyrini gör.' },
          { icon: '🎯', title: 'Yatırım Hedefleri', desc: 'Finansal hedef belirle ve ne kadar ilerlediğini takip et. Portföy değerine otomatik bağlanır veya manuel tutar girebilirsin.' },
        ];
        const s = invSteps[tutorialStep];
        const vw = window.innerWidth;
        const vh = window.innerHeight;

        if (!invSpotlightRect) {
          return (
            <div key={tutorialStep} className="fixed inset-0 z-[200] flex items-end justify-center pb-8 px-4" style={{ backdropFilter: 'blur(6px)', background: 'rgba(0,0,0,0.8)', pointerEvents: 'none' }}>
              <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5 w-full max-w-sm" style={{ pointerEvents: 'auto', animation: 'tutorial-card-enter 0.3s cubic-bezier(0.16,1,0.3,1) forwards' }}>
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 text-lg">{s.icon}</div>
                  <div><div className="font-semibold text-slate-800 text-sm mb-1">{s.title}</div><div className="text-slate-500 text-xs leading-relaxed">{s.desc}</div></div>
                </div>
                <div className="flex items-center justify-between">
                  <button onClick={onTutorialSkip} className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Atla</button>
                  <div className="flex items-center gap-1">{[1,2,3,4,5,6,7].map(n => (<div key={n} className={`rounded-full transition-all duration-200 ${n === tutorialStep ? 'w-4 h-2 bg-green-500' : 'w-2 h-2 bg-slate-200'}`} />))}</div>
                  <button onClick={onTutorialNext} className="bg-green-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-green-600 transition-colors shadow-sm">{tutorialStep === 7 ? 'Tamamla ✓' : 'İleri →'}</button>
                </div>
              </div>
            </div>
          );
        }

        const pad = 12;
        const t = invSpotlightRect.top - pad;
        const l = invSpotlightRect.left - pad;
        const b = invSpotlightRect.top + invSpotlightRect.height + pad;
        const r = invSpotlightRect.left + invSpotlightRect.width + pad;
        const cardW = Math.min(320, vw - 32);
        const holeCenter = l + (r - l) / 2;
        const cardLeft = Math.max(16, Math.min(holeCenter - cardW / 2, vw - cardW - 16));
        const showBelow = b + 240 < vh;
        const cardTop = showBelow ? b + 16 : Math.max(16, t - 240);
        const arrowLeft = Math.max(16, Math.min(holeCenter - cardLeft - 8, cardW - 32));

        return (
          <div key={tutorialStep} className="fixed inset-0 z-[200]" style={{ pointerEvents: 'none' }}>
            <div style={{
              position: 'fixed', inset: 0,
              background: 'rgba(0,0,0,0.82)',
              backdropFilter: 'blur(5px)',
              WebkitBackdropFilter: 'blur(5px)',
              clipPath: `path('M 0 0 L ${vw} 0 L ${vw} ${vh} L 0 ${vh} Z M ${l} ${t} L ${l} ${b} L ${r} ${b} L ${r} ${t} Z')`,
            }} />
            <div style={{
              position: 'fixed', top: t, left: l, width: r - l, height: b - t,
              border: '2px solid rgba(122,224,122,0.85)',
              borderRadius: 8,
              animation: 'tutorial-glow-pulse 2s ease-in-out infinite',
            }} />
            <div style={{
              position: 'fixed', top: cardTop, left: cardLeft, width: cardW,
              zIndex: 201, pointerEvents: 'auto',
              animation: 'tutorial-card-enter 0.3s cubic-bezier(0.16,1,0.3,1) forwards',
            }} className="bg-white rounded-2xl shadow-2xl border border-slate-200 p-5">
              {showBelow ? (
                <div style={{ position: 'absolute', top: -8, left: arrowLeft, width: 16, height: 16, background: 'white', borderTop: '1px solid #e2e8f0', borderLeft: '1px solid #e2e8f0', transform: 'rotate(45deg)' }} />
              ) : (
                <div style={{ position: 'absolute', bottom: -8, left: arrowLeft, width: 16, height: 16, background: 'white', borderBottom: '1px solid #e2e8f0', borderRight: '1px solid #e2e8f0', transform: 'rotate(45deg)' }} />
              )}
              <div className="flex items-start gap-3 mb-4">
                <div className="w-9 h-9 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0 mt-0.5 text-lg">{s.icon}</div>
                <div>
                  <div className="font-semibold text-slate-800 text-sm mb-1">{s.title}</div>
                  <div className="text-slate-500 text-xs leading-relaxed">{s.desc}</div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <button onClick={onTutorialSkip} className="text-slate-400 text-xs hover:text-slate-600 transition-colors">Atla</button>
                <div className="flex items-center gap-1">
                  {[1,2,3,4,5,6,7].map(n => (<div key={n} className={`rounded-full transition-all duration-200 ${n === tutorialStep ? 'w-4 h-2 bg-green-500' : 'w-2 h-2 bg-slate-200'}`} />))}
                </div>
                <button onClick={onTutorialNext} className="bg-green-500 text-white px-4 py-1.5 rounded-xl text-xs font-bold hover:bg-green-600 transition-colors shadow-sm">
                  {tutorialStep === 7 ? 'Tamamla ✓' : 'İleri →'}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* CONFIRM DIALOG */}
      {confirmDialog && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.9)', zIndex: 100 }} onClick={() => setConfirmDialog(null)}>
          <div className="w-full max-w-sm p-6" style={{ background: COLORS.bgPanelLight, border: `1px solid ${COLORS.borderLight}` }} onClick={(e) => e.stopPropagation()}>
            <div className="ui-font text-xs mb-2" style={{ color: COLORS.negative, letterSpacing: '0.2em', textTransform: 'uppercase', fontWeight: 600 }}>Onay Gerekli</div>
            <h3 className="display-font text-xl mb-3" style={{ color: COLORS.textBrightest, fontWeight: 400 }}>{confirmDialog.title}</h3>
            <p className="ui-font text-sm mb-6" style={{ color: COLORS.textBright, lineHeight: 1.5 }}>{confirmDialog.message}</p>
            <div className="flex gap-3">
              <button onClick={() => setConfirmDialog(null)} className="flex-1 ui-font py-3" style={{ background: 'transparent', border: `1px solid ${COLORS.borderLight}`, color: COLORS.textBright, letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 500 }}>Vazgeç</button>
              <button onClick={confirmDialog.onConfirm} className="flex-1 ui-font py-3" style={{ background: COLORS.negative, color: '#FFFFFF', letterSpacing: '0.1em', textTransform: 'uppercase', fontSize: '11px', fontWeight: 600 }}>Sil</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
