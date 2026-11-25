import { useMemo, useState } from 'react'
import {
  ArrowUpDown,
  Briefcase,
  Calculator,
  Check,
  GitCompare,
  Info,
  LayoutGrid,
  List,
  Search,
  Star,
} from 'lucide-react'
import { STOCKS } from '../data/stocks'
import { formatMarketCap, formatMoney } from '../utils/formatters'
import { Sparkline } from './Sparkline'

const SECTOR_ORDER = [
  'all',
  'tech',
  'dividend',
  'finance',
  'consumer',
  'energy',
  'etf',
  'uzse',
  'watchlist',
]

function getValuationInfo(stock, t) {
  const diffPct = ((stock.fairValueUSD - stock.priceUSD) / stock.priceUSD) * 100
  if (diffPct >= 8) {
    return {
      label: `${t.valuationUnder} +${diffPct.toFixed(0)}%`,
      cls: 'val-under',
      diffPct,
    }
  }
  if (diffPct <= -5) {
    return {
      label: `${t.valuationPremium} ${diffPct.toFixed(0)}%`,
      cls: 'val-premium',
      diffPct,
    }
  }
  return {
    label: t.valuationFair,
    cls: 'val-fair',
    diffPct,
  }
}

function getSnowflakeTotal(snowflake) {
  if (!snowflake) return 0
  return (
    (snowflake.value || 0) +
    (snowflake.growth || 0) +
    (snowflake.past || 0) +
    (snowflake.health || 0) +
    (snowflake.dividend || 0)
  )
}

export function StockCatalog({
  selectedSymbol,
  onCalculateStock,
  onInspectStock,
  onAddToPortfolio,
  portfolioSymbols = [],
  amountUSD = 1000,
  compareSymbols,
  onToggleCompare,
  watchlist,
  onToggleWatchlist,
  currency,
  lang,
  t,
}) {
  const [search, setSearch] = useState('')
  const [sector, setSector] = useState('all')
  const [sortBy, setSortBy] = useState('marketCap')
  const [viewMode, setViewMode] = useState('grid')

  const sectorCounts = useMemo(() => {
    const counts = { all: STOCKS.length, watchlist: watchlist.length }
    for (const s of STOCKS) {
      counts[s.sector] = (counts[s.sector] || 0) + 1
    }
    return counts
  }, [watchlist])

  const filteredStocks = useMemo(() => {
    const q = search.trim().toLowerCase()
    const list = STOCKS.filter((s) => {
      if (sector === 'watchlist') {
        if (!watchlist.includes(s.symbol)) return false
      } else if (sector !== 'all' && s.sector !== sector) {
        return false
      }

      if (!q) return true
      return (
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.exchange.toLowerCase().includes(q) ||
        (s.summary[lang] || s.summary.en).toLowerCase().includes(q)
      )
    })

    return [...list].sort((a, b) => {
      if (sortBy === 'growthDesc') return b.annualGrowthPct - a.annualGrowthPct
      if (sortBy === 'dividendDesc') return b.dividendYieldPct - a.dividendYieldPct
      if (sortBy === 'priceAsc') return a.priceUSD - b.priceUSD
      if (sortBy === 'priceDesc') return b.priceUSD - a.priceUSD
      if (sortBy === 'valuation') {
        const va = (a.fairValueUSD - a.priceUSD) / a.priceUSD
        const vb = (b.fairValueUSD - b.priceUSD) / b.priceUSD
        return vb - va
      }
      return b.marketCapB - a.marketCapB
    })
  }, [search, sector, sortBy, watchlist, lang])

  const resetFilters = () => {
    setSearch('')
    setSector('all')
    setSortBy('marketCap')
  }

  return (
    <section id="catalog" className="section catalog-section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">
              {t.statTotalStocks}: {STOCKS.length}
            </span>
            <h2 className="section-title">{t.catalogTitle}</h2>
            <p className="section-subtitle">{t.catalogSubtitle}</p>
          </div>
        </div>

        {/* Sector Filter Pills */}
        <div className="sector-pills-scroll" role="tablist" aria-label="Sectors">
          {SECTOR_ORDER.map((sec) => (
            <button
              key={sec}
              type="button"
              role="tab"
              aria-selected={sector === sec}
              className={`sector-pill ${sector === sec ? 'active' : ''}`}
              onClick={() => setSector(sec)}
            >
              <span>{t.sectors[sec]}</span>
              <span className="pill-count">{sectorCounts[sec] || 0}</span>
            </button>
          ))}
        </div>

        {/* Search + Sort + View Controls */}
        <div className="catalog-toolbar">
          <div className="catalog-search-box">
            <Search size={17} />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t.searchCatalogPlaceholder}
            />
          </div>

          <div className="catalog-actions-right">
            <label className="sort-select-wrap">
              <ArrowUpDown size={15} />
              <span className="hide-sm">{t.sortLabel}</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                aria-label={t.sortLabel}
              >
                <option value="marketCap">{t.sortMarketCap}</option>
                <option value="growthDesc">{t.sortGrowth}</option>
                <option value="dividendDesc">{t.sortDividend}</option>
                <option value="valuation">{t.sortValuation}</option>
                <option value="priceAsc">{t.sortPriceAsc}</option>
                <option value="priceDesc">{t.sortPriceDesc}</option>
              </select>
            </label>

            <div className="view-toggle-group" role="group">
              <button
                type="button"
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
                title={t.viewGrid}
                aria-label={t.viewGrid}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                type="button"
                className={`view-btn ${viewMode === 'table' ? 'active' : ''}`}
                onClick={() => setViewMode('table')}
                title={t.viewTable}
                aria-label={t.viewTable}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Empty state */}
        {filteredStocks.length === 0 ? (
          <div className="empty-state-box">
            <p>{t.noResults}</p>
            <button type="button" className="btn-secondary" onClick={resetFilters}>
              {t.resetFilters}
            </button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="stocks-grid">
            {filteredStocks.map((stock) => {
              const isSelected = stock.symbol === selectedSymbol
              const isCompared = compareSymbols.includes(stock.symbol)
              const isWatch = watchlist.includes(stock.symbol)
              const inPort = portfolioSymbols.includes(stock.symbol)
              const isPositive = stock.dayChangePct >= 0
              const valInfo = getValuationInfo(stock, t)
              const snowScore = getSnowflakeTotal(stock.snowflake)

              return (
                <article
                  key={stock.symbol}
                  className={`stock-card ${isSelected ? 'selected' : ''}`}
                >
                  <div className="stock-card-top">
                    <div className="stock-id-row">
                      <span
                        className="ticker-avatar"
                        style={{ backgroundColor: stock.color }}
                      >
                        {stock.symbol.slice(0, 4)}
                      </span>
                      <div>
                        <div className="stock-sym-line">
                          <h3 className="stock-symbol">{stock.symbol}</h3>
                          <span className="exchange-tag">{stock.exchange}</span>
                        </div>
                        <p className="stock-name" title={stock.name}>
                          {stock.name}
                        </p>
                      </div>
                    </div>

                    <div className="card-top-right">
                      <span className="snow-pill mono" title={t.modalSnowflakeTitle}>
                        ★ {snowScore}/30
                      </span>
                      <button
                        type="button"
                        className={`star-btn ${isWatch ? 'active' : ''}`}
                        onClick={() => onToggleWatchlist(stock.symbol)}
                        title={t.btnWatchlist}
                        aria-label={`${t.btnWatchlist} ${stock.symbol}`}
                      >
                        <Star
                          size={16}
                          fill={isWatch ? 'currentColor' : 'none'}
                        />
                      </button>
                    </div>
                  </div>

                  <div className="stock-price-spark-row">
                    <div>
                      <div className="stock-price mono">
                        {formatMoney(stock.priceUSD, currency)}
                      </div>
                      <div className="card-badges-inline">
                        <span
                          className={`day-change ${isPositive ? 'pos' : 'neg'}`}
                        >
                          {isPositive ? '+' : ''}
                          {stock.dayChangePct.toFixed(2)}%
                        </span>
                        <span className={`val-badge ${valInfo.cls}`}>
                          {valInfo.label}
                        </span>
                      </div>
                    </div>
                    <Sparkline
                      data={stock.history}
                      positive={
                        stock.history[stock.history.length - 1] >=
                        stock.history[0]
                      }
                    />
                  </div>

                  <p className="stock-summary-clamp">
                    {stock.summary[lang] || stock.summary.en}
                  </p>

                  <div className="stock-metrics-row">
                    <div className="stock-metric-pill">
                      <span>{t.cardGrowth}</span>
                      <strong className="positive">
                        +{stock.annualGrowthPct}%
                      </strong>
                    </div>
                    <div className="stock-metric-pill">
                      <span>{t.cardDividend}</span>
                      <strong>{stock.dividendYieldPct}%</strong>
                    </div>
                    <div className="stock-metric-pill">
                      <span>{t.cardPE}</span>
                      <strong>{stock.peRatio}x</strong>
                    </div>
                  </div>

                  <div className="stock-card-actions">
                    <button
                      type="button"
                      className="btn-calc-card"
                      onClick={() => onCalculateStock(stock.symbol)}
                    >
                      <Calculator size={15} />
                      {t.btnCalculate}
                    </button>
                    <button
                      type="button"
                      className="btn-icon-outline"
                      onClick={() => onInspectStock(stock.symbol)}
                      title={t.btnDetails}
                      aria-label={`${t.btnDetails} ${stock.symbol}`}
                    >
                      <Info size={16} />
                    </button>
                    <button
                      type="button"
                      className={`btn-icon-outline ${inPort ? 'active' : ''}`}
                      onClick={() =>
                        onAddToPortfolio(stock.symbol, Math.max(amountUSD, 100))
                      }
                      title={inPort ? t.addedToPortfolioBadge : t.btnAddToPortfolio}
                      aria-label={`${t.btnAddToPortfolio} ${stock.symbol}`}
                    >
                      <Briefcase size={15} />
                    </button>
                    <button
                      type="button"
                      className={`btn-icon-outline ${isCompared ? 'active' : ''}`}
                      onClick={() => onToggleCompare(stock.symbol)}
                      title={isCompared ? t.btnCompareAdded : t.btnCompareAdd}
                      aria-label={`${t.btnCompareAdd} ${stock.symbol}`}
                    >
                      {isCompared ? <Check size={16} /> : <GitCompare size={16} />}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        ) : (
          <div className="catalog-table-wrap">
            <table className="catalog-table">
              <thead>
                <tr>
                  <th>{t.selectStockLabel}</th>
                  <th>{t.cardPrice}</th>
                  <th>24h</th>
                  <th>{t.cardGrowth}</th>
                  <th>{t.cardDividend}</th>
                  <th className="hide-md">{t.cardFairValue}</th>
                  <th className="hide-md">{t.cardCap}</th>
                  <th className="hide-md">{t.riskLabel}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filteredStocks.map((stock) => {
                  const isPositive = stock.dayChangePct >= 0
                  const isCompared = compareSymbols.includes(stock.symbol)
                  const isWatch = watchlist.includes(stock.symbol)
                  const valInfo = getValuationInfo(stock, t)
                  return (
                    <tr
                      key={stock.symbol}
                      className={stock.symbol === selectedSymbol ? 'selected-row' : ''}
                    >
                      <td>
                        <div className="table-stock-cell">
                          <span
                            className="ticker-avatar sm"
                            style={{ backgroundColor: stock.color }}
                          >
                            {stock.symbol.slice(0, 4)}
                          </span>
                          <div>
                            <div className="stock-sym-line">
                              <strong>{stock.symbol}</strong>
                              <span className="exchange-tag">{stock.exchange}</span>
                            </div>
                            <div className="opt-name">{stock.name}</div>
                          </div>
                        </div>
                      </td>
                      <td className="mono strong">
                        {formatMoney(stock.priceUSD, currency)}
                      </td>
                      <td className={`mono ${isPositive ? 'positive' : 'negative'}`}>
                        {isPositive ? '+' : ''}
                        {stock.dayChangePct.toFixed(2)}%
                      </td>
                      <td className="mono positive">+{stock.annualGrowthPct}%</td>
                      <td className="mono">{stock.dividendYieldPct}%</td>
                      <td className="hide-md">
                        <span className={`val-badge ${valInfo.cls}`}>
                          {valInfo.label}
                        </span>
                      </td>
                      <td className="mono hide-md">
                        {formatMarketCap(stock.marketCapB, currency)}
                      </td>
                      <td className="hide-md">
                        <span className={`risk-badge risk-${stock.risk}`}>
                          {t.riskLevels[stock.risk]}
                        </span>
                      </td>
                      <td>
                        <div className="table-row-btns">
                          <button
                            type="button"
                            className={`star-btn ${isWatch ? 'active' : ''}`}
                            onClick={() => onToggleWatchlist(stock.symbol)}
                            aria-label={t.btnWatchlist}
                          >
                            <Star
                              size={15}
                              fill={isWatch ? 'currentColor' : 'none'}
                            />
                          </button>
                          <button
                            type="button"
                            className={`btn-icon-outline sm ${isCompared ? 'active' : ''}`}
                            onClick={() => onToggleCompare(stock.symbol)}
                            title={t.btnCompareAdd}
                          >
                            {isCompared ? <Check size={14} /> : <GitCompare size={14} />}
                          </button>
                          <button
                            type="button"
                            className="btn-icon-outline sm"
                            onClick={() => onInspectStock(stock.symbol)}
                            title={t.btnDetails}
                          >
                            <Info size={14} />
                          </button>
                          <button
                            type="button"
                            className="btn-calc-sm"
                            onClick={() => onCalculateStock(stock.symbol)}
                          >
                            {t.btnCalculate}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  )
}
