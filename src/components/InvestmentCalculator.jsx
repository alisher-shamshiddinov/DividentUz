import { useEffect, useId, useMemo, useRef, useState } from 'react'
import {
  ArrowUpRight,
  Briefcase,
  Calculator,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Layers,
  RefreshCw,
  Search,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import { STOCKS, calculateInvestmentProjection } from '../data/stocks'
import { formatMoney, formatShares, fromUSD, getCurrencyConfig, toUSD } from '../utils/formatters'

const QUICK_TICKERS = ['AAPL', 'NVDA', 'VOO', 'KO', 'O', 'TSLA', 'UZMT', 'HMKB']

const PRESETS_BY_CURRENCY = {
  USD: [100, 500, 1000, 5000, 10000],
  UZS: [1_000_000, 5_000_000, 10_000_000, 50_000_000, 100_000_000],
  RUB: [10_000, 50_000, 100_000, 500_000, 1_000_000],
}

const YEAR_PRESETS = [1, 3, 5, 10, 15, 20]

function formatPresetChip(val, currencyCode) {
  if (currencyCode === 'USD') {
    return val >= 1000 ? `$${val / 1000}K` : `$${val}`
  }
  if (currencyCode === 'UZS') {
    return `${val / 1_000_000}M`
  }
  if (val >= 1_000_000) return `${val / 1_000_000}M ₽`
  return `${val / 1000}K ₽`
}

function ProjectionChart({ baseData, conservativeData, optimisticData, currency, t }) {
  const gradTotalId = useId()
  const gradBandId = useId()
  const [hoverIdx, setHoverIdx] = useState(null)

  if (!baseData || baseData.length < 2) return null

  const width = 680
  const height = 270
  const pad = { top: 20, right: 20, bottom: 34, left: 68 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const allValues = [
    ...optimisticData.map((d) => d.totalValue),
    ...baseData.map((d) => d.totalValue),
    ...baseData.map((d) => d.invested),
  ]
  const maxVal = Math.max(...allValues, 1)
  const minVal = 0

  const xFor = (idx) => pad.left + (idx / (baseData.length - 1)) * plotW
  const yFor = (val) =>
    pad.top + plotH - ((val - minVal) / (maxVal - minVal || 1)) * plotH

  const buildPath = (arr, key) =>
    arr
      .map((d, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d[key]).toFixed(1)}`)
      .join(' ')

  const basePath = buildPath(baseData, 'totalValue')
  const investedPath = buildPath(baseData, 'invested')
  const consPath = buildPath(conservativeData, 'totalValue')
  const optPath = buildPath(optimisticData, 'totalValue')

  const baseArea = `${basePath} L ${xFor(baseData.length - 1).toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`

  // Band between conservative and optimistic
  const optPoints = optimisticData.map((d, i) => `${xFor(i).toFixed(1)},${yFor(d.totalValue).toFixed(1)}`)
  const consPointsRev = [...conservativeData]
    .reverse()
    .map((d, i) => {
      const origIdx = conservativeData.length - 1 - i
      return `${xFor(origIdx).toFixed(1)},${yFor(d.totalValue).toFixed(1)}`
    })
  const bandPolygon = `M ${optPoints.join(' L ')} L ${consPointsRev.join(' L ')} Z`

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((ratio) => ({
    val: maxVal * ratio,
    y: pad.top + plotH * (1 - ratio),
  }))

  const activeIdx = hoverIdx !== null ? hoverIdx : baseData.length - 1
  const activeBase = baseData[activeIdx]
  const activeCons = conservativeData[activeIdx]
  const activeOpt = optimisticData[activeIdx]

  return (
    <div className="chart-wrap">
      <div className="chart-header-row">
        <h3 className="chart-title">{t.chartTitle}</h3>
        <div className="chart-legend">
          <span className="legend-item">
            <span className="legend-dot dot-projected" />
            {t.chartProjected}
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-invested" />
            {t.chartPrincipal}
          </span>
          <span className="legend-item">
            <span className="legend-dot dot-range" />
            {t.chartConservativeLine} – {t.chartOptimisticLine}
          </span>
        </div>
      </div>

      {/* Live readout bar for hovered or final year */}
      <div className="chart-hover-strip">
        <span className="hover-year-pill">
          {activeBase.year === 0
            ? '0'
            : `${activeBase.year} ${t.yearsUnit}`}
        </span>
        <span className="hover-stat">
          {t.chartProjected}:{' '}
          <strong>{formatMoney(activeBase.totalValue, currency)}</strong>
        </span>
        <span className="hover-stat muted">
          {t.chartPrincipal}:{' '}
          <strong>{formatMoney(activeBase.invested, currency)}</strong>
        </span>
        <span className="hover-stat muted hide-sm">
          {t.chartConservativeLine}–{t.chartOptimisticLine}:{' '}
          <strong>
            {formatMoney(activeCons.totalValue, currency, { compact: true })} –{' '}
            {formatMoney(activeOpt.totalValue, currency, { compact: true })}
          </strong>
        </span>
      </div>

      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="projection-svg"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradTotalId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.02" />
          </linearGradient>
          <linearGradient id={gradBandId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.11" />
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0.04" />
          </linearGradient>
        </defs>

        {/* Grid lines & Y-axis labels */}
        {yTicks.map((tick, i) => (
          <g key={i}>
            <line
              x1={pad.left}
              y1={tick.y}
              x2={width - pad.right}
              y2={tick.y}
              stroke="var(--border)"
              strokeDasharray={i === 0 ? undefined : '4 4'}
            />
            <text
              x={pad.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="chart-axis-text"
            >
              {formatMoney(tick.val, currency, { compact: true })}
            </text>
          </g>
        ))}

        {/* Scenario uncertainty band */}
        <path d={bandPolygon} fill={`url(#${gradBandId})`} />
        <path
          d={optPath}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.35"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />
        <path
          d={consPath}
          fill="none"
          stroke="var(--accent)"
          strokeOpacity="0.35"
          strokeWidth="1.25"
          strokeDasharray="4 4"
        />

        {/* Principal invested line */}
        <path
          d={investedPath}
          fill="none"
          stroke="var(--text-muted)"
          strokeWidth="2"
          strokeDasharray="6 4"
        />

        {/* Main projected value area & line */}
        <path d={baseArea} fill={`url(#${gradTotalId})`} />
        <path
          d={basePath}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* X-axis ticks */}
        {baseData.map((d, i) => {
          const step = baseData.length > 14 ? 3 : baseData.length > 8 ? 2 : 1
          if (i !== 0 && i !== baseData.length - 1 && i % step !== 0) return null
          return (
            <text
              key={d.year}
              x={xFor(i)}
              y={height - 10}
              textAnchor="middle"
              className="chart-axis-text"
            >
              {d.year === 0 ? '0' : `${d.year}${t.yearShort}`}
            </text>
          )
        })}

        {/* Active vertical guide & points */}
        <line
          x1={xFor(activeIdx)}
          y1={pad.top}
          x2={xFor(activeIdx)}
          y2={pad.top + plotH}
          stroke="var(--accent)"
          strokeWidth="1.25"
          strokeOpacity="0.5"
        />
        <circle
          cx={xFor(activeIdx)}
          cy={yFor(activeBase.invested)}
          r="4"
          fill="var(--bg-card)"
          stroke="var(--text-muted)"
          strokeWidth="2"
        />
        <circle
          cx={xFor(activeIdx)}
          cy={yFor(activeBase.totalValue)}
          r="5.5"
          fill="var(--accent)"
          stroke="var(--bg-card)"
          strokeWidth="2.5"
        />

        {/* Invisible hover columns */}
        {baseData.map((d, i) => {
          const colW = plotW / Math.max(baseData.length - 1, 1)
          const xStart = Math.max(pad.left, xFor(i) - colW / 2)
          const w = i === 0 || i === baseData.length - 1 ? colW / 2 : colW
          return (
            <rect
              key={d.year}
              x={xStart}
              y={pad.top}
              width={w}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              onClick={() => setHoverIdx(i)}
              style={{ cursor: 'crosshair' }}
            />
          )
        })}
      </svg>
    </div>
  )
}

export function InvestmentCalculator({
  selectedSymbol,
  onSelectSymbol,
  amountUSD,
  onChangeAmountUSD,
  monthlyUSD,
  onChangeMonthlyUSD,
  years,
  onChangeYears,
  drip,
  onChangeDrip,
  scenario,
  onChangeScenario,
  onAddToPortfolio,
  isInPortfolio,
  currency,
  lang,
  t,
}) {
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [showTable, setShowTable] = useState(false)
  const pickerRef = useRef(null)

  useEffect(() => {
    if (!pickerOpen) return undefined
    const handleOutside = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setPickerOpen(false)
      }
    }
    const handleEsc = (e) => {
      if (e.key === 'Escape') setPickerOpen(false)
    }
    document.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleEsc)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleEsc)
    }
  }, [pickerOpen])

  const selectedStock = useMemo(
    () => STOCKS.find((s) => s.symbol === selectedSymbol) || STOCKS[0],
    [selectedSymbol],
  )

  const currencyCfg = getCurrencyConfig(currency)
  const displayAmount = Math.round(fromUSD(amountUSD, currency))
  const displayMonthly = Math.round(fromUSD(monthlyUSD, currency))

  const presets = PRESETS_BY_CURRENCY[currency] || PRESETS_BY_CURRENCY.USD
  const sliderMaxDisplay =
    currency === 'USD' ? 25000 : currency === 'UZS' ? 250_000_000 : 2_500_000
  const sliderStepDisplay =
    currency === 'USD' ? 100 : currency === 'UZS' ? 500_000 : 5000

  const filteredStocks = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    if (!q) return STOCKS
    return STOCKS.filter(
      (s) =>
        s.symbol.toLowerCase().includes(q) ||
        s.name.toLowerCase().includes(q) ||
        s.exchange.toLowerCase().includes(q),
    )
  }, [pickerQuery])

  const projBase = useMemo(
    () =>
      calculateInvestmentProjection({
        stock: selectedStock,
        initialAmountUSD: amountUSD,
        monthlyContributionUSD: monthlyUSD,
        years,
        drip,
        scenario,
      }),
    [selectedStock, amountUSD, monthlyUSD, years, drip, scenario],
  )

  const projConservative = useMemo(
    () =>
      calculateInvestmentProjection({
        stock: selectedStock,
        initialAmountUSD: amountUSD,
        monthlyContributionUSD: monthlyUSD,
        years,
        drip,
        scenario: 'conservative',
      }),
    [selectedStock, amountUSD, monthlyUSD, years, drip],
  )

  const projOptimistic = useMemo(
    () =>
      calculateInvestmentProjection({
        stock: selectedStock,
        initialAmountUSD: amountUSD,
        monthlyContributionUSD: monthlyUSD,
        years,
        drip,
        scenario: 'optimistic',
      }),
    [selectedStock, amountUSD, monthlyUSD, years, drip],
  )

  const handleDisplayAmountChange = (rawValue) => {
    const cleaned = Number(String(rawValue).replace(/[^\d.]/g, ''))
    if (Number.isNaN(cleaned)) return
    onChangeAmountUSD(Math.max(0, toUSD(cleaned, currency)))
  }

  const handleDisplayMonthlyChange = (rawValue) => {
    const cleaned = Number(String(rawValue).replace(/[^\d.]/g, ''))
    if (Number.isNaN(cleaned)) return
    onChangeMonthlyUSD(Math.max(0, toUSD(cleaned, currency)))
  }

  return (
    <section id="calculator" className="section calculator-section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">
              <Calculator size={15} />
              {t.navCalculator}
            </span>
            <h2 className="section-title">{t.calcTitle}</h2>
            <p className="section-subtitle">{t.calcSubtitle}</p>
          </div>
        </div>

        <div className="calc-shell">
          {/* LEFT PANEL: Inputs */}
          <div className="calc-inputs-panel">
            {/* Stock picker */}
            <div className="input-block">
              <label className="input-label">{t.selectStockLabel}</label>

              <div className="stock-picker-wrap" ref={pickerRef}>
                <button
                  type="button"
                  className="stock-picker-trigger"
                  onClick={() => setPickerOpen((v) => !v)}
                  aria-expanded={pickerOpen}
                >
                  <div className="picker-stock-left">
                    <span
                      className="ticker-avatar"
                      style={{ backgroundColor: selectedStock.color }}
                    >
                      {selectedStock.symbol.slice(0, 4)}
                    </span>
                    <div>
                      <div className="picker-stock-title">
                        <strong>{selectedStock.symbol}</strong>
                        <span className="exchange-tag">
                          {selectedStock.exchange}
                        </span>
                      </div>
                      <div className="picker-stock-name">
                        {selectedStock.name}
                      </div>
                    </div>
                  </div>
                  <div className="picker-stock-right">
                    <div className="picker-stock-price">
                      {formatMoney(selectedStock.priceUSD, currency)}
                    </div>
                    <div className="picker-stock-meta">
                      +{selectedStock.annualGrowthPct}% / {t.yearShort} · Div{' '}
                      {selectedStock.dividendYieldPct}%
                    </div>
                  </div>
                  <ChevronDown size={18} className="picker-chevron" />
                </button>

                {pickerOpen && (
                  <div className="stock-picker-dropdown">
                    <div className="picker-search-box">
                      <Search size={15} />
                      <input
                        type="text"
                        value={pickerQuery}
                        onChange={(e) => setPickerQuery(e.target.value)}
                        placeholder={t.searchStockPlaceholder}
                        autoFocus
                      />
                    </div>
                    <div className="picker-list">
                      {filteredStocks.map((s) => (
                        <button
                          key={s.symbol}
                          type="button"
                          className={`picker-option ${s.symbol === selectedStock.symbol ? 'active' : ''}`}
                          onClick={() => {
                            onSelectSymbol(s.symbol)
                            setPickerOpen(false)
                            setPickerQuery('')
                          }}
                        >
                          <div className="picker-opt-left">
                            <span
                              className="ticker-avatar sm"
                              style={{ backgroundColor: s.color }}
                            >
                              {s.symbol.slice(0, 4)}
                            </span>
                            <div>
                              <div className="opt-sym">
                                {s.symbol}{' '}
                                <span className="opt-ex">{s.exchange}</span>
                              </div>
                              <div className="opt-name">{s.name}</div>
                            </div>
                          </div>
                          <div className="picker-opt-right">
                            <div>{formatMoney(s.priceUSD, currency)}</div>
                            <div className="opt-growth">
                              +{s.annualGrowthPct}% · {s.dividendYieldPct}% div
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick pick chips */}
              <div className="quick-tickers-row">
                {QUICK_TICKERS.map((sym) => (
                  <button
                    key={sym}
                    type="button"
                    className={`chip-btn ${selectedStock.symbol === sym ? 'active' : ''}`}
                    onClick={() => onSelectSymbol(sym)}
                  >
                    {sym}
                  </button>
                ))}
              </div>
            </div>

            {/* Investment Amount */}
            <div className="input-block">
              <div className="label-row">
                <label className="input-label" htmlFor="invest-amount-input">
                  {t.investAmountLabel}
                </label>
                <span className="currency-badge">{currencyCfg.code}</span>
              </div>

              <div className="money-input-box">
                {currencyCfg.code === 'USD' && (
                  <span className="money-prefix">$</span>
                )}
                <input
                  id="invest-amount-input"
                  type="text"
                  inputMode="numeric"
                  className="money-input"
                  value={displayAmount.toLocaleString('en-US').replace(/,/g, ' ')}
                  onChange={(e) => handleDisplayAmountChange(e.target.value)}
                />
                {currencyCfg.code !== 'USD' && (
                  <span className="money-suffix">{currencyCfg.symbol}</span>
                )}
              </div>

              <input
                type="range"
                className="range-slider"
                min={0}
                max={sliderMaxDisplay}
                step={sliderStepDisplay}
                value={Math.min(displayAmount, sliderMaxDisplay)}
                onChange={(e) => handleDisplayAmountChange(e.target.value)}
                aria-label={t.investAmountLabel}
              />

              <div className="preset-chips-row">
                {presets.map((val) => (
                  <button
                    key={val}
                    type="button"
                    className={`chip-btn ${Math.abs(displayAmount - val) <= 1 ? 'active' : ''}`}
                    onClick={() => handleDisplayAmountChange(val)}
                  >
                    {formatPresetChip(val, currency)}
                  </button>
                ))}
              </div>
            </div>

            {/* Investment Horizon */}
            <div className="input-block">
              <div className="label-row">
                <label className="input-label" htmlFor="horizon-slider">
                  {t.horizonLabel}
                </label>
                <span className="value-pill">
                  {years} {t.yearsUnit}
                </span>
              </div>

              <input
                id="horizon-slider"
                type="range"
                className="range-slider"
                min={1}
                max={25}
                step={1}
                value={years}
                onChange={(e) => onChangeYears(Number(e.target.value))}
              />

              <div className="preset-chips-row">
                {YEAR_PRESETS.map((yr) => (
                  <button
                    key={yr}
                    type="button"
                    className={`chip-btn ${years === yr ? 'active' : ''}`}
                    onClick={() => onChangeYears(yr)}
                  >
                    {yr} {t.yearShort}
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Monthly Contribution */}
            <div className="input-block">
              <div className="label-row">
                <label className="input-label" htmlFor="monthly-add-input">
                  {t.monthlyAddLabel}
                </label>
                <span className="muted-unit">{t.perMonth}</span>
              </div>
              <div className="money-input-box compact">
                {currencyCfg.code === 'USD' && (
                  <span className="money-prefix">$</span>
                )}
                <input
                  id="monthly-add-input"
                  type="text"
                  inputMode="numeric"
                  className="money-input"
                  value={displayMonthly.toLocaleString('en-US').replace(/,/g, ' ')}
                  onChange={(e) => handleDisplayMonthlyChange(e.target.value)}
                />
                {currencyCfg.code !== 'USD' && (
                  <span className="money-suffix">{currencyCfg.symbol}</span>
                )}
              </div>
            </div>

            {/* Growth Scenario */}
            <div className="input-block">
              <div className="label-row">
                <span className="input-label">{t.scenarioLabel}</span>
                <span className="muted-unit">
                  {t.scenarioRateHint}:{' '}
                  <strong>+{projBase?.effectiveAnnualGrowthPct.toFixed(1)}%</strong>
                </span>
              </div>
              <div className="scenario-grid">
                {[
                  { id: 'conservative', label: t.scenarioConservative },
                  { id: 'base', label: t.scenarioBase },
                  { id: 'optimistic', label: t.scenarioOptimistic },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    className={`scenario-btn ${scenario === opt.id ? 'active' : ''}`}
                    onClick={() => onChangeScenario(opt.id)}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* DRIP toggle */}
            <div className="drip-row">
              <div className="drip-info">
                <div className="drip-title">
                  <RefreshCw size={15} />
                  <span>{t.dripLabel}</span>
                </div>
                <p className="drip-hint">{t.dripHint}</p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={drip}
                className={`toggle-switch ${drip ? 'on' : ''}`}
                onClick={() => onChangeDrip(!drip)}
              >
                <span className="toggle-thumb" />
              </button>
            </div>
          </div>

          {/* RIGHT PANEL: Output Summary + Chart + Table */}
          {projBase && (
            <div className="calc-results-panel">
              {/* Clear human sentence banner */}
              <div className="outcome-hero-card">
                <div className="outcome-top-row">
                  <div className="outcome-badge">
                    <Sparkles size={14} />
                    {t.resultHeroBadge}
                  </div>
                  {onAddToPortfolio && (
                    <button
                      type="button"
                      className={`btn-secondary-sm ${isInPortfolio ? 'in-port' : ''}`}
                      onClick={() =>
                        onAddToPortfolio(
                          selectedStock.symbol,
                          Math.max(amountUSD, 100),
                        )
                      }
                    >
                      {isInPortfolio ? <Check size={14} /> : <Briefcase size={14} />}
                      {isInPortfolio ? t.addedToPortfolioBadge : t.btnAddToPortfolio}
                    </button>
                  )}
                </div>

                <p className="outcome-sentence">
                  {lang === 'uz' && (
                    <>
                      {t.resultBannerPrefix}{' '}
                      <strong>{selectedStock.symbol}</strong>{' '}
                      {t.resultBannerMid}{' '}
                      <strong>
                        {years} {t.resultBannerTime}
                      </strong>{' '}
                      <strong>{formatMoney(amountUSD, currency)}</strong>
                      {monthlyUSD > 0 && (
                        <> (+{formatMoney(monthlyUSD, currency)}{t.perMonth})</>
                      )}{' '}
                      {t.resultBannerVerb}{' '}
                      <span className="outcome-highlight">
                        {formatMoney(projBase.finalValue, currency)}
                      </span>{' '}
                      {t.resultBannerEnd}
                    </>
                  )}
                  {lang === 'ru' && (
                    <>
                      {t.resultBannerPrefix}{' '}
                      <strong>{selectedStock.symbol}</strong>{' '}
                      {t.resultBannerMid}{' '}
                      <strong>{formatMoney(amountUSD, currency)}</strong>
                      {monthlyUSD > 0 && (
                        <> (+{formatMoney(monthlyUSD, currency)}{t.perMonth})</>
                      )}{' '}
                      {t.resultBannerTime}{' '}
                      <strong>{years} {t.yearsUnit}</strong>,{' '}
                      {t.resultBannerVerb}{' '}
                      <span className="outcome-highlight">
                        {formatMoney(projBase.finalValue, currency)}
                      </span>
                    </>
                  )}
                  {lang === 'en' && (
                    <>
                      {t.resultBannerPrefix}{' '}
                      <strong>{formatMoney(amountUSD, currency)}</strong>
                      {monthlyUSD > 0 && (
                        <> (+{formatMoney(monthlyUSD, currency)}{t.perMonth})</>
                      )}{' '}
                      {t.resultBannerMid}{' '}
                      <strong>{selectedStock.symbol}</strong>{' '}
                      {t.resultBannerTime}{' '}
                      <strong>{years} {t.yearsUnit}</strong>{' '}
                      {t.resultBannerVerb}{' '}
                      <span className="outcome-highlight">
                        {formatMoney(projBase.finalValue, currency)}
                      </span>
                    </>
                  )}
                </p>

                <div className="outcome-main-metrics">
                  <div className="hero-metric-box primary">
                    <span className="metric-label">{t.resultFinalValue}</span>
                    <strong className="metric-big-num">
                      {formatMoney(projBase.finalValue, currency)}
                    </strong>
                    <span className="metric-sub-pos">
                      <ArrowUpRight size={15} />
                      {formatMoney(projBase.netProfit, currency, { showSign: true })}{' '}
                      ({projBase.netProfitPct >= 0 ? '+' : ''}
                      {projBase.netProfitPct.toFixed(1)}%)
                    </span>
                  </div>

                  <div className="hero-metric-box">
                    <span className="metric-label">{t.resultNetProfit}</span>
                    <strong className="metric-num positive">
                      {formatMoney(projBase.netProfit, currency, { showSign: true })}
                    </strong>
                    <span className="metric-sub">
                      {t.resultTotalInvested}:{' '}
                      {formatMoney(projBase.totalInvested, currency)}
                    </span>
                  </div>
                </div>

                {/* 4 compact secondary KPIs */}
                <div className="kpi-mini-grid">
                  <div className="kpi-mini-card">
                    <span className="kpi-mini-icon">
                      <Layers size={15} />
                    </span>
                    <div>
                      <span className="kpi-mini-label">{t.resultSharesBought}</span>
                      <strong className="kpi-mini-val">
                        {formatShares(projBase.startingShares)} →{' '}
                        {formatShares(projBase.finalShares)} {t.sharesUnit}
                      </strong>
                    </div>
                  </div>

                  <div className="kpi-mini-card">
                    <span className="kpi-mini-icon">
                      <Coins size={15} />
                    </span>
                    <div>
                      <span className="kpi-mini-label">{t.resultTotalDividends}</span>
                      <strong className="kpi-mini-val">
                        {formatMoney(projBase.totalDividendsEarned, currency)}
                      </strong>
                    </div>
                  </div>

                  <div className="kpi-mini-card">
                    <span className="kpi-mini-icon">
                      <TrendingUp size={15} />
                    </span>
                    <div>
                      <span className="kpi-mini-label">{t.resultAnnualDivFinal}</span>
                      <strong className="kpi-mini-val">
                        {formatMoney(projBase.finalAnnualDividend, currency)}
                        <span className="kpi-mini-inline">
                          {' '}
                          ({formatMoney(projBase.finalMonthlyDividend, currency)}
                          {t.perMonth})
                        </span>
                      </strong>
                    </div>
                  </div>

                  <div className="kpi-mini-card">
                    <span className="kpi-mini-icon">
                      <ArrowUpRight size={15} />
                    </span>
                    <div>
                      <span className="kpi-mini-label">
                        {t.resultInitialPrice} → {t.resultProjectedPrice}
                      </span>
                      <strong className="kpi-mini-val">
                        {formatMoney(selectedStock.priceUSD, currency)} →{' '}
                        {formatMoney(projBase.finalSharePrice, currency)}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive SVG Chart */}
              <div className="calc-chart-card">
                <ProjectionChart
                  baseData={projBase.yearlyBreakdown}
                  conservativeData={projConservative.yearlyBreakdown}
                  optimisticData={projOptimistic.yearlyBreakdown}
                  currency={currency}
                  t={t}
                />

                <div className="table-toggle-wrap">
                  <button
                    type="button"
                    className="btn-secondary-sm"
                    onClick={() => setShowTable((v) => !v)}
                  >
                    {showTable ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    {showTable ? t.tableToggleHide : t.tableToggleShow}
                  </button>
                </div>

                {showTable && (
                  <div className="breakdown-table-scroll">
                    <table className="breakdown-table">
                      <thead>
                        <tr>
                          <th>{t.colYear}</th>
                          <th>{t.colSharePrice}</th>
                          <th>{t.colInvested}</th>
                          <th>{t.colDividends}</th>
                          <th>{t.colAnnualDiv}</th>
                          <th>{t.colTotalValue}</th>
                          <th>{t.colProfit}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {projBase.yearlyBreakdown.map((row) => (
                          <tr key={row.year}>
                            <td>{row.year}</td>
                            <td className="mono">{formatMoney(row.sharePrice, currency)}</td>
                            <td className="mono">{formatMoney(row.invested, currency)}</td>
                            <td className="mono">
                              {formatMoney(row.totalDividendsEarned, currency)}
                            </td>
                            <td className="mono">
                              {formatMoney(row.annualDividendRate, currency)}
                            </td>
                            <td className="mono strong">
                              {formatMoney(row.totalValue, currency)}
                            </td>
                            <td className="mono positive">
                              {formatMoney(row.profit, currency, { showSign: true })}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
