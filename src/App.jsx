import { useEffect, useMemo, useState } from 'react'
import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  Briefcase,
  ShieldAlert,
  TrendingUp,
} from 'lucide-react'
import { Header } from './components/Header'
import { InvestmentCalculator } from './components/InvestmentCalculator'
import { MarketHub } from './components/MarketHub'
import { PortfolioTracker } from './components/PortfolioTracker'
import { StockCatalog } from './components/StockCatalog'
import { StockComparison } from './components/StockComparison'
import { StockDetailModal } from './components/StockDetailModal'
import { MARKET_INDICES, STOCKS } from './data/stocks'
import { TRANSLATIONS } from './data/translations'
import { formatMoney } from './utils/formatters'
import './App.css'

const SAMPLE_PORTFOLIO = [
  { symbol: 'VOO', amountUSD: 3000 },
  { symbol: 'AAPL', amountUSD: 2000 },
  { symbol: 'O', amountUSD: 2500 },
  { symbol: 'UZMT', amountUSD: 1500 },
  { symbol: 'HMKB', amountUSD: 1000 },
]

function readStored(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function App() {
  const [lang, setLang] = useState(() => readStored('divuz_lang', 'uz'))
  const [currency, setCurrency] = useState(() => readStored('divuz_currency', 'USD'))
  const [theme, setTheme] = useState(() => readStored('divuz_theme', 'light'))
  const [watchlist, setWatchlist] = useState(() =>
    readStored('divuz_watchlist', ['AAPL', 'O', 'VOO', 'UZMT']),
  )
  const [compareSymbols, setCompareSymbols] = useState(() =>
    readStored('divuz_compare', ['AAPL', 'NVDA', 'KO', 'UZMT']),
  )
  const [portfolio, setPortfolio] = useState(() =>
    readStored('divuz_portfolio', SAMPLE_PORTFOLIO),
  )

  const [selectedSymbol, setSelectedSymbol] = useState('AAPL')
  const [amountUSD, setAmountUSD] = useState(1000)
  const [monthlyUSD, setMonthlyUSD] = useState(0)
  const [years, setYears] = useState(5)
  const [drip, setDrip] = useState(true)
  const [scenario, setScenario] = useState('base')
  const [modalSymbol, setModalSymbol] = useState(null)

  const t = TRANSLATIONS[lang] || TRANSLATIONS.uz

  useEffect(() => {
    document.documentElement.lang = lang
    document.title = t.pageTitle
    try {
      localStorage.setItem('divuz_lang', JSON.stringify(lang))
    } catch {
      // ignore storage errors
    }
  }, [lang, t.pageTitle])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    try {
      localStorage.setItem('divuz_theme', JSON.stringify(theme))
    } catch {
      // ignore
    }
  }, [theme])

  useEffect(() => {
    try {
      localStorage.setItem('divuz_currency', JSON.stringify(currency))
    } catch {
      // ignore
    }
  }, [currency])

  useEffect(() => {
    try {
      localStorage.setItem('divuz_watchlist', JSON.stringify(watchlist))
    } catch {
      // ignore
    }
  }, [watchlist])

  useEffect(() => {
    try {
      localStorage.setItem('divuz_compare', JSON.stringify(compareSymbols))
    } catch {
      // ignore
    }
  }, [compareSymbols])

  useEffect(() => {
    try {
      localStorage.setItem('divuz_portfolio', JSON.stringify(portfolio))
    } catch {
      // ignore
    }
  }, [portfolio])

  const marketStats = useMemo(() => {
    const divStocks = STOCKS.filter((s) => s.dividendYieldPct > 0)
    const avgDiv =
      divStocks.reduce((acc, s) => acc + s.dividendYieldPct, 0) /
      Math.max(divStocks.length, 1)
    const topGrowth = Math.max(...STOCKS.map((s) => s.annualGrowthPct))
    return {
      total: STOCKS.length,
      avgDiv: avgDiv.toFixed(1),
      topGrowth: topGrowth.toFixed(0),
    }
  }, [])

  const tickerHighlights = useMemo(
    () =>
      STOCKS.filter((s) =>
        ['AAPL', 'MSFT', 'NVDA', 'TSLA', 'VOO', 'KO', 'O', 'UZMT', 'HMKB', 'OKMK'].includes(
          s.symbol,
        ),
      ),
    [],
  )

  const portfolioSymbols = useMemo(
    () => portfolio.map((p) => p.symbol),
    [portfolio],
  )

  const handleCalculateStock = (symbol) => {
    setSelectedSymbol(symbol)
    const el = document.getElementById('calculator')
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const handleToggleWatchlist = (symbol) => {
    setWatchlist((prev) =>
      prev.includes(symbol) ? prev.filter((s) => s !== symbol) : [...prev, symbol],
    )
  }

  const handleToggleCompare = (symbol) => {
    setCompareSymbols((prev) => {
      if (prev.includes(symbol)) return prev.filter((s) => s !== symbol)
      if (prev.length >= 4) return [...prev.slice(1), symbol]
      return [...prev, symbol]
    })
  }

  const handleAddHolding = (symbol, addAmtUSD) => {
    setPortfolio((prev) => {
      const existing = prev.find((item) => item.symbol === symbol)
      if (existing) {
        return prev.map((item) =>
          item.symbol === symbol
            ? { ...item, amountUSD: item.amountUSD + addAmtUSD }
            : item,
        )
      }
      return [...prev, { symbol, amountUSD: addAmtUSD }]
    })
  }

  const handleUpdateHoldingAmount = (symbol, newAmtUSD) => {
    setPortfolio((prev) =>
      prev.map((item) =>
        item.symbol === symbol ? { ...item, amountUSD: newAmtUSD } : item,
      ),
    )
  }

  const handleRemoveHolding = (symbol) => {
    setPortfolio((prev) => prev.filter((item) => item.symbol !== symbol))
  }

  return (
    <div id="top" className="app-shell">
      <Header
        lang={lang}
        onChangeLang={setLang}
        currency={currency}
        onChangeCurrency={setCurrency}
        theme={theme}
        onToggleTheme={() => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))}
        t={t}
        compareCount={compareSymbols.length}
        portfolioCount={portfolio.length}
      />

      {/* Global Indices + Featured Ticker Tape */}
      <div className="indices-bar">
        <div className="container indices-inner">
          {MARKET_INDICES.map((idx) => (
            <div key={idx.id} className="index-item">
              <span className="index-name">{idx.name}</span>
              <span className="index-val mono">{idx.value}</span>
              <span className="index-chg pos mono">+{idx.changePct}%</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ticker-strip" aria-label="Featured tickers">
        <div className="container ticker-strip-inner">
          {tickerHighlights.map((s) => {
            const pos = s.dayChangePct >= 0
            return (
              <button
                key={s.symbol}
                type="button"
                className={`ticker-chip ${selectedSymbol === s.symbol ? 'active' : ''}`}
                onClick={() => handleCalculateStock(s.symbol)}
              >
                <span className="ticker-chip-sym">{s.symbol}</span>
                <span className="ticker-chip-price mono">
                  {formatMoney(s.priceUSD, currency)}
                </span>
                <span className={`ticker-chip-chg ${pos ? 'pos' : 'neg'}`}>
                  {pos ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
                  {Math.abs(s.dayChangePct).toFixed(2)}%
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <main>
        {/* Hero */}
        <section className="hero-section">
          <div className="container hero-grid">
            <div className="hero-copy">
              <span className="hero-badge">
                <TrendingUp size={14} />
                {t.heroBadge}
              </span>
              <h1 className="hero-title">{t.heroTitle}</h1>
              <p className="hero-subtitle">{t.heroSubtitle}</p>
              <div className="hero-ctas">
                <a href="#calculator" className="btn-primary">
                  {t.heroBtnCalc}
                </a>
                <a href="#catalog" className="btn-secondary">
                  <BarChart3 size={17} />
                  {t.heroBtnBrowse}
                </a>
                <a href="#portfolio" className="btn-secondary">
                  <Briefcase size={17} />
                  {t.heroBtnPortfolio}
                </a>
              </div>
            </div>

            <div className="hero-stats-grid">
              <div className="hero-stat-card">
                <span className="stat-label">{t.statTotalStocks}</span>
                <strong className="stat-value mono">{marketStats.total}</strong>
              </div>
              <div className="hero-stat-card">
                <span className="stat-label">{t.statAvgDividend}</span>
                <strong className="stat-value mono positive">
                  {marketStats.avgDiv}%
                </strong>
              </div>
              <div className="hero-stat-card">
                <span className="stat-label">{t.statTopGrowth}</span>
                <strong className="stat-value mono positive">
                  +{marketStats.topGrowth}%
                </strong>
              </div>
              <div className="hero-stat-card">
                <span className="stat-label">{t.statMarkets}</span>
                <strong className="stat-value sm">{t.statMarketsValue}</strong>
              </div>
            </div>
          </div>
        </section>

        {/* Market Movers & Interactive Heatmap */}
        <MarketHub
          selectedSymbol={selectedSymbol}
          onCalculateStock={handleCalculateStock}
          onInspectStock={(sym) => setModalSymbol(sym)}
          currency={currency}
          t={t}
        />

        {/* Investment Calculator */}
        <InvestmentCalculator
          selectedSymbol={selectedSymbol}
          onSelectSymbol={setSelectedSymbol}
          amountUSD={amountUSD}
          onChangeAmountUSD={setAmountUSD}
          monthlyUSD={monthlyUSD}
          onChangeMonthlyUSD={setMonthlyUSD}
          years={years}
          onChangeYears={setYears}
          drip={drip}
          onChangeDrip={setDrip}
          scenario={scenario}
          onChangeScenario={setScenario}
          onAddToPortfolio={handleAddHolding}
          isInPortfolio={portfolioSymbols.includes(selectedSymbol)}
          currency={currency}
          lang={lang}
          t={t}
        />

        {/* Stock Screener / Catalog */}
        <StockCatalog
          selectedSymbol={selectedSymbol}
          onCalculateStock={handleCalculateStock}
          onInspectStock={(sym) => setModalSymbol(sym)}
          onAddToPortfolio={handleAddHolding}
          portfolioSymbols={portfolioSymbols}
          amountUSD={amountUSD}
          compareSymbols={compareSymbols}
          onToggleCompare={handleToggleCompare}
          watchlist={watchlist}
          onToggleWatchlist={handleToggleWatchlist}
          currency={currency}
          lang={lang}
          t={t}
        />

        {/* Portfolio Builder & 12-Month Dividend Calendar */}
        <PortfolioTracker
          holdings={portfolio}
          onAddHolding={handleAddHolding}
          onUpdateHoldingAmount={handleUpdateHoldingAmount}
          onRemoveHolding={handleRemoveHolding}
          onClearPortfolio={() => setPortfolio([])}
          onLoadSamplePortfolio={() => setPortfolio(SAMPLE_PORTFOLIO)}
          onCalculateStock={handleCalculateStock}
          currency={currency}
          t={t}
        />

        {/* Stock Comparison */}
        <StockComparison
          compareSymbols={compareSymbols}
          onRemoveCompare={(sym) =>
            setCompareSymbols((prev) => prev.filter((s) => s !== sym))
          }
          onClearCompare={() => setCompareSymbols([])}
          onCalculateStock={handleCalculateStock}
          amountUSD={amountUSD}
          monthlyUSD={monthlyUSD}
          years={years}
          drip={drip}
          scenario={scenario}
          currency={currency}
          t={t}
        />
      </main>

      {/* Footer & Disclaimer */}
      <footer className="site-footer">
        <div className="container">
          <div className="disclaimer-box">
            <ShieldAlert size={18} className="disclaimer-icon" />
            <div>
              <strong>{t.disclaimerTitle}</strong> {t.disclaimerText}
            </div>
          </div>
          <div className="footer-bottom">
            <span>{t.footerRights}</span>
            <span className="mono">UZB · RUS · ENG</span>
          </div>
        </div>
      </footer>

      <StockDetailModal
        symbol={modalSymbol}
        onClose={() => setModalSymbol(null)}
        onCalculateStock={handleCalculateStock}
        onAddToPortfolio={handleAddHolding}
        isInPortfolio={modalSymbol ? portfolioSymbols.includes(modalSymbol) : false}
        amountUSD={amountUSD}
        monthlyUSD={monthlyUSD}
        drip={drip}
        currency={currency}
        lang={lang}
        t={t}
      />
    </div>
  )
}

export default App
