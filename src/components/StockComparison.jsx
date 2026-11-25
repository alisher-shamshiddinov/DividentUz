import { useMemo } from 'react'
import { Award, GitCompare, Trash2, X } from 'lucide-react'
import { STOCKS, calculateInvestmentProjection } from '../data/stocks'
import { formatMoney, formatShares } from '../utils/formatters'

const LINE_COLORS = ['#059669', '#2563EB', '#D97706', '#E11D48']

function CompareMultiChart({ seriesList, currency, t }) {
  if (seriesList.length < 2) return null

  const width = 680
  const height = 240
  const pad = { top: 20, right: 20, bottom: 32, left: 68 }
  const plotW = width - pad.left - pad.right
  const plotH = height - pad.top - pad.bottom

  const allValues = seriesList.flatMap((s) =>
    s.projection.yearlyBreakdown.map((d) => d.totalValue),
  )
  const maxVal = Math.max(...allValues, 1)
  const steps = seriesList[0].projection.yearlyBreakdown.length

  const xFor = (idx) => pad.left + (idx / Math.max(steps - 1, 1)) * plotW
  const yFor = (val) => pad.top + plotH - (val / maxVal) * plotH

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((r) => ({
    val: maxVal * r,
    y: pad.top + plotH * (1 - r),
  }))

  return (
    <div className="compare-chart-box">
      <div className="chart-legend compare-legend">
        {seriesList.map((item, idx) => (
          <span key={item.stock.symbol} className="legend-item">
            <span
              className="legend-dot"
              style={{ backgroundColor: LINE_COLORS[idx % LINE_COLORS.length] }}
            />
            <strong>{item.stock.symbol}</strong> (
            {formatMoney(item.projection.finalValue, currency, { compact: true })})
          </span>
        ))}
      </div>

      <svg viewBox={`0 0 ${width} ${height}`} className="projection-svg">
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

        {seriesList[0].projection.yearlyBreakdown.map((d, i) => {
          const step = steps > 14 ? 3 : steps > 8 ? 2 : 1
          if (i !== 0 && i !== steps - 1 && i % step !== 0) return null
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

        {seriesList.map((item, idx) => {
          const color = LINE_COLORS[idx % LINE_COLORS.length]
          const path = item.projection.yearlyBreakdown
            .map(
              (d, i) =>
                `${i === 0 ? 'M' : 'L'} ${xFor(i).toFixed(1)} ${yFor(d.totalValue).toFixed(1)}`,
            )
            .join(' ')
          const last =
            item.projection.yearlyBreakdown[
              item.projection.yearlyBreakdown.length - 1
            ]
          return (
            <g key={item.stock.symbol}>
              <path
                d={path}
                fill="none"
                stroke={color}
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={xFor(steps - 1)}
                cy={yFor(last.totalValue)}
                r="4.5"
                fill={color}
                stroke="var(--bg-card)"
                strokeWidth="2"
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}

export function StockComparison({
  compareSymbols,
  onRemoveCompare,
  onClearCompare,
  onCalculateStock,
  amountUSD,
  monthlyUSD,
  years,
  drip,
  scenario,
  currency,
  t,
}) {
  const compared = useMemo(() => {
    const items = compareSymbols
      .map((sym) => STOCKS.find((s) => s.symbol === sym))
      .filter(Boolean)
      .map((stock) => ({
        stock,
        projection: calculateInvestmentProjection({
          stock,
          initialAmountUSD: amountUSD,
          monthlyContributionUSD: monthlyUSD,
          years,
          drip,
          scenario,
        }),
      }))
      .filter((item) => item.projection)

    let bestSymbol = null
    let bestValue = -Infinity
    for (const item of items) {
      if (item.projection.finalValue > bestValue) {
        bestValue = item.projection.finalValue
        bestSymbol = item.stock.symbol
      }
    }
    return { items, bestSymbol }
  }, [compareSymbols, amountUSD, monthlyUSD, years, drip, scenario])

  return (
    <section id="compare" className="section compare-section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">
              <GitCompare size={15} />
              {t.navCompare}
            </span>
            <h2 className="section-title">{t.compareTitle}</h2>
            <p className="section-subtitle">
              {t.compareSubtitle}{' '}
              <span className="compare-params-inline">
                ({t.compareSettingsNote}{' '}
                <strong>{formatMoney(amountUSD, currency)}</strong> ·{' '}
                <strong>
                  {years} {t.yearsUnit}
                </strong>
                )
              </span>
            </p>
          </div>
          {compared.items.length > 0 && (
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onClearCompare}
            >
              <Trash2 size={14} />
              {t.compareClear}
            </button>
          )}
        </div>

        {compared.items.length < 2 ? (
          <div className="empty-state-box">
            <GitCompare size={28} className="empty-icon" />
            <p>{t.compareEmpty}</p>
          </div>
        ) : (
          <div className="compare-content">
            <div className="compare-cards-grid">
              {compared.items.map(({ stock, projection }, idx) => {
                const isBest = stock.symbol === compared.bestSymbol
                const accentColor = LINE_COLORS[idx % LINE_COLORS.length]
                return (
                  <div
                    key={stock.symbol}
                    className={`compare-card ${isBest ? 'best' : ''}`}
                    style={{ borderTopColor: accentColor }}
                  >
                    <div className="compare-card-head">
                      <div className="stock-id-row">
                        <span
                          className="ticker-avatar sm"
                          style={{ backgroundColor: stock.color }}
                        >
                          {stock.symbol.slice(0, 4)}
                        </span>
                        <div>
                          <strong>{stock.symbol}</strong>
                          <div className="opt-name">{stock.name}</div>
                        </div>
                      </div>
                      <button
                        type="button"
                        className="icon-btn sm"
                        onClick={() => onRemoveCompare(stock.symbol)}
                        aria-label={`Remove ${stock.symbol}`}
                      >
                        <X size={15} />
                      </button>
                    </div>

                    {isBest && (
                      <div className="best-badge">
                        <Award size={14} />
                        {t.compareBestBadge}
                      </div>
                    )}

                    <div className="compare-final-val mono">
                      {formatMoney(projection.finalValue, currency)}
                    </div>
                    <div className="compare-profit-sub positive mono">
                      {formatMoney(projection.netProfit, currency, {
                        showSign: true,
                      })}{' '}
                      (+{projection.netProfitPct.toFixed(1)}%)
                    </div>

                    <div className="compare-rows">
                      <div className="compare-kv">
                        <span>{t.cardGrowth}</span>
                        <strong>+{stock.annualGrowthPct}%</strong>
                      </div>
                      <div className="compare-kv">
                        <span>{t.cardDividend}</span>
                        <strong>{stock.dividendYieldPct}%</strong>
                      </div>
                      <div className="compare-kv">
                        <span>{t.resultSharesBought}</span>
                        <strong>
                          {formatShares(projection.finalShares)} {t.sharesUnit}
                        </strong>
                      </div>
                      <div className="compare-kv">
                        <span>{t.resultAnnualDivFinal}</span>
                        <strong>
                          {formatMoney(projection.finalAnnualDividend, currency)}
                        </strong>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="btn-calc-card"
                      onClick={() => onCalculateStock(stock.symbol)}
                    >
                      {t.btnCalculate}
                    </button>
                  </div>
                )
              })}
            </div>

            <CompareMultiChart
              seriesList={compared.items}
              currency={currency}
              t={t}
            />
          </div>
        )}
      </div>
    </section>
  )
}
