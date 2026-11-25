import { useEffect, useId, useMemo, useState } from 'react'
import { Briefcase, Calculator, Check, X } from 'lucide-react'
import { STOCKS, calculateInvestmentProjection } from '../data/stocks'
import { formatMarketCap, formatMoney } from '../utils/formatters'
import { SnowflakeRadar, TechnicalGauge } from './SnowflakeChart'

const TIMEFRAMES = ['3M', '6M', '1Y', '3Y', '5Y']

function MultiTimeframeChart({ data, positive, currency }) {
  const gradId = useId()
  const [hoverIdx, setHoverIdx] = useState(null)

  if (!data || data.length < 2) return null

  const width = 520
  const height = 160
  const pad = { top: 14, right: 14, bottom: 16, left: 54 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1

  const xFor = (i) => pad.left + (i / (data.length - 1)) * plotW
  const yFor = (val) => pad.top + plotH - ((val - min) / range) * plotH

  const linePath = data
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(v).toFixed(1)}`)
    .join(' ')
  const areaPath = `${linePath} L ${xFor(data.length - 1).toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${xFor(0).toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`

  const stroke = positive ? 'var(--positive)' : 'var(--negative)'
  const activeIdx = hoverIdx !== null && hoverIdx < data.length ? hoverIdx : data.length - 1

  return (
    <div className="modal-chart-wrap">
      <div className="modal-chart-readout mono">
        {formatMoney(data[activeIdx], currency)}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="projection-svg"
        onMouseLeave={() => setHoverIdx(null)}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {[min, (min + max) / 2, max].map((tick, idx) => (
          <g key={idx}>
            <line
              x1={pad.left}
              y1={yFor(tick)}
              x2={width - pad.right}
              y2={yFor(tick)}
              stroke="var(--border)"
              strokeDasharray="4 4"
            />
            <text
              x={pad.left - 8}
              y={yFor(tick) + 4}
              textAnchor="end"
              className="chart-axis-text"
            >
              {formatMoney(tick, currency, { compact: true })}
            </text>
          </g>
        ))}

        <path d={areaPath} fill={`url(#${gradId})`} />
        <path
          d={linePath}
          fill="none"
          stroke={stroke}
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        <circle
          cx={xFor(activeIdx)}
          cy={yFor(data[activeIdx])}
          r="4.5"
          fill={stroke}
          stroke="var(--bg-card)"
          strokeWidth="2"
        />

        {data.map((_, i) => {
          const colW = plotW / Math.max(data.length - 1, 1)
          const xStart = Math.max(pad.left, xFor(i) - colW / 2)
          return (
            <rect
              key={i}
              x={xStart}
              y={pad.top}
              width={colW}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHoverIdx(i)}
              style={{ cursor: 'crosshair' }}
            />
          )
        })}
      </svg>
    </div>
  )
}

export function StockDetailModal({
  symbol,
  onClose,
  onCalculateStock,
  onAddToPortfolio,
  isInPortfolio,
  amountUSD,
  monthlyUSD = 0,
  drip,
  currency,
  lang,
  t,
}) {
  const [timeframe, setTimeframe] = useState('1Y')

  const stock = useMemo(
    () => STOCKS.find((s) => s.symbol === symbol) || null,
    [symbol],
  )

  useEffect(() => {
    if (!stock) return undefined
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [stock, onClose])

  const quickHorizons = useMemo(() => {
    if (!stock) return []
    return [1, 3, 5, 10].map((yr) => ({
      yr,
      proj: calculateInvestmentProjection({
        stock,
        initialAmountUSD: amountUSD,
        monthlyContributionUSD: monthlyUSD,
        years: yr,
        drip,
        scenario: 'base',
      }),
    }))
  }, [stock, amountUSD, monthlyUSD, drip])

  if (!stock) return null

  const rangeSpan = stock.week52High - stock.week52Low || 1
  const rangePct = Math.min(
    100,
    Math.max(0, ((stock.priceUSD - stock.week52Low) / rangeSpan) * 100),
  )

  const tfSeries = stock.timeframes?.[timeframe] || stock.history
  const tfPositive = tfSeries[tfSeries.length - 1] >= tfSeries[0]
  const tfChangePct =
    tfSeries[0] > 0
      ? ((tfSeries[tfSeries.length - 1] - tfSeries[0]) / tfSeries[0]) * 100
      : 0

  const fairDiffPct = ((stock.fairValueUSD - stock.priceUSD) / stock.priceUSD) * 100
  const fairFillPct = Math.min(
    100,
    Math.max(12, (stock.priceUSD / (stock.fairValueUSD * 1.35)) * 100),
  )
  const fairMarkerPct = Math.min(92, Math.max(15, (1 / 1.35) * 100))

  const techRatingText =
    t.techRatings[stock.analystConsensus] || t.techRatings.buy

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stock-modal-title"
      onClick={onClose}
    >
      <div className="modal-panel wide" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div className="stock-id-row">
            <span
              className="ticker-avatar lg"
              style={{ backgroundColor: stock.color }}
            >
              {stock.symbol.slice(0, 4)}
            </span>
            <div>
              <div className="stock-sym-line">
                <h2 id="stock-modal-title" className="modal-title">
                  {stock.name}
                </h2>
                <span className="exchange-tag">{stock.exchange}</span>
              </div>
              <div className="modal-subtitle">
                {stock.symbol} · {t.sectors[stock.sector]}
              </div>
            </div>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            aria-label={t.modalClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Price + Timeframe Chart */}
        <div className="modal-chart-card">
          <div className="modal-chart-top">
            <div>
              <div className="modal-big-price mono">
                {formatMoney(stock.priceUSD, currency)}
              </div>
              <div className="card-badges-inline">
                <span
                  className={`day-change ${stock.dayChangePct >= 0 ? 'pos' : 'neg'}`}
                >
                  {stock.dayChangePct >= 0 ? '+' : ''}
                  {stock.dayChangePct.toFixed(2)}% (24h)
                </span>
                <span className={`day-change ${tfPositive ? 'pos' : 'neg'}`}>
                  {tfPositive ? '+' : ''}
                  {tfChangePct.toFixed(1)}% ({timeframe})
                </span>
              </div>
            </div>

            <div className="control-group" role="tablist">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf}
                  type="button"
                  role="tab"
                  aria-selected={timeframe === tf}
                  className={`seg-btn ${timeframe === tf ? 'active' : ''}`}
                  onClick={() => setTimeframe(tf)}
                >
                  {tf}
                </button>
              ))}
            </div>
          </div>

          <MultiTimeframeChart
            data={tfSeries}
            positive={tfPositive}
            currency={currency}
          />
        </div>

        {/* Simply Wall St Snowflake + TradingView Gauge */}
        <div className="modal-analytics-split">
          <div className="modal-subcard">
            <h4>{t.modalSnowflakeTitle}</h4>
            <div className="snowflake-center">
              <SnowflakeRadar
                snowflake={stock.snowflake}
                axesLabels={t.snowflakeAxes}
                size={196}
              />
            </div>
          </div>

          <div className="modal-subcard">
            <h4>{t.modalTechGaugeTitle}</h4>
            <TechnicalGauge
              score={stock.technicalScore}
              ratingLabel={techRatingText}
            />

            <div className="fair-val-block">
              <div className="label-row">
                <span className="muted-small">{t.modalFairValueTitle}</span>
                <strong className={`mono ${fairDiffPct >= 0 ? 'positive' : 'negative'}`}>
                  {formatMoney(stock.fairValueUSD, currency)} (
                  {fairDiffPct >= 0 ? '+' : ''}
                  {fairDiffPct.toFixed(1)}%)
                </strong>
              </div>
              <div className="range52-track">
                <div className="range52-fill" style={{ width: `${fairFillPct}%` }} />
                <div
                  className="fair-target-tick"
                  style={{ left: `${fairMarkerPct}%` }}
                  title={t.modalFairValueTitle}
                />
              </div>
            </div>
          </div>
        </div>

        {/* 52-week range */}
        <div className="range52-box">
          <div className="label-row">
            <span className="muted-small">{t.modal52Week}</span>
            <span className="mono muted-small">
              {formatMoney(stock.week52Low, currency)} —{' '}
              {formatMoney(stock.week52High, currency)}
            </span>
          </div>
          <div className="range52-track">
            <div className="range52-fill" style={{ width: `${rangePct}%` }} />
            <div className="range52-dot" style={{ left: `${rangePct}%` }} />
          </div>
        </div>

        <div className="modal-overview">
          <h4>{t.modalOverview}</h4>
          <p>{stock.summary[lang] || stock.summary.en}</p>
        </div>

        {/* Yahoo Finance Key Fundamentals Grid */}
        <div>
          <h4 className="modal-section-heading">{t.modalFundamentalsTitle}</h4>
          <div className="modal-metrics-grid">
            <div className="modal-stat">
              <span>{t.cardGrowth}</span>
              <strong className="positive">+{stock.annualGrowthPct}%</strong>
            </div>
            <div className="modal-stat">
              <span>{t.cardDividend}</span>
              <strong>{stock.dividendYieldPct}%</strong>
            </div>
            <div className="modal-stat">
              <span>{t.divFreqLabel}</span>
              <strong>{t.divFreq[stock.dividendFrequency]}</strong>
            </div>
            <div className="modal-stat">
              <span>{t.cardCap}</span>
              <strong>{formatMarketCap(stock.marketCapB, currency)}</strong>
            </div>
            <div className="modal-stat">
              <span>{t.cardPE}</span>
              <strong>{stock.peRatio}x</strong>
            </div>
            <div className="modal-stat">
              <span>{t.statEPS}</span>
              <strong>{formatMoney(stock.eps, currency)}</strong>
            </div>
            <div className="modal-stat">
              <span>{t.statROE}</span>
              <strong>{stock.roePct}%</strong>
            </div>
            <div className="modal-stat">
              <span>{t.statDebtEq}</span>
              <strong>{stock.debtToEquity}</strong>
            </div>
            <div className="modal-stat">
              <span>{t.statExDiv}</span>
              <strong>{stock.exDivDate}</strong>
            </div>
          </div>
        </div>

        {/* Quick investment preview */}
        <div className="modal-quick-box">
          <h4>
            {t.modalQuickProjection}{' '}
            <span className="mono">{formatMoney(amountUSD, currency)}</span>
          </h4>
          <div className="modal-quick-grid">
            {quickHorizons.map(({ yr, proj }) => (
              <div key={yr} className="modal-quick-cell">
                <span className="muted-small">
                  {yr} {t.yearsUnit}
                </span>
                <strong className="mono">
                  {formatMoney(proj.finalValue, currency)}
                </strong>
                <span className="positive mono">
                  +{proj.netProfitPct.toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer-split">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => onAddToPortfolio(stock.symbol, Math.max(amountUSD, 100))}
          >
            {isInPortfolio ? <Check size={16} /> : <Briefcase size={16} />}
            {isInPortfolio ? t.addedToPortfolioBadge : t.btnAddToPortfolio}
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={() => {
              onCalculateStock(stock.symbol)
              onClose()
            }}
          >
            <Calculator size={17} />
            {t.modalOpenCalc}
          </button>
        </div>
      </div>
    </div>
  )
}
