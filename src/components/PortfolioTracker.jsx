import { useMemo, useState } from 'react'
import { Briefcase, Calendar, PieChart, Plus, RotateCcw, Trash2 } from 'lucide-react'
import { STOCKS } from '../data/stocks'
import { formatMoney, formatShares, fromUSD, getCurrencyConfig, toUSD } from '../utils/formatters'

const SECTOR_PALETTE = {
  tech: '#2563EB',
  dividend: '#059669',
  finance: '#7C3AED',
  consumer: '#D97706',
  energy: '#DC2626',
  etf: '#0D9488',
  uzse: '#0284C7',
}

function SectorDonut({ slices, totalUSD, currency, t }) {
  if (!slices.length || totalUSD <= 0) return null

  const size = 168
  const r = 60
  const circ = 2 * Math.PI * r

  const arcs = slices.reduce((acc, sl) => {
    const prevEnd = acc.length ? acc[acc.length - 1].endPct : 0
    const pct = sl.valueUSD / totalUSD
    acc.push({
      ...sl,
      dash: pct * circ,
      gap: circ - pct * circ,
      offset: -prevEnd * circ,
      endPct: prevEnd + pct,
    })
    return acc
  }, [])

  return (
    <div className="donut-layout">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="donut-svg">
        {arcs.map((sl) => (
          <circle
            key={sl.sector}
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={SECTOR_PALETTE[sl.sector] || '#64748b'}
            strokeWidth="22"
            strokeDasharray={`${sl.dash} ${sl.gap}`}
            strokeDashoffset={sl.offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        ))}
        <text
          x={size / 2}
          y={size / 2 - 4}
          textAnchor="middle"
          className="donut-center-label"
        >
          {slices.length}
        </text>
        <text
          x={size / 2}
          y={size / 2 + 14}
          textAnchor="middle"
          className="donut-center-sub"
        >
          {t.navCatalog}
        </text>
      </svg>

      <div className="donut-legend">
        {slices.map((sl) => {
          const pct = (sl.valueUSD / totalUSD) * 100
          return (
            <div key={sl.sector} className="donut-legend-row">
              <span
                className="legend-dot"
                style={{ backgroundColor: SECTOR_PALETTE[sl.sector] || '#64748b' }}
              />
              <span className="donut-sector-name">{t.sectors[sl.sector]}</span>
              <span className="mono donut-pct">{pct.toFixed(1)}%</span>
              <span className="mono muted-unit">
                {formatMoney(sl.valueUSD, currency, { compact: true })}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DividendCalendarChart({ monthlyDivsUSD, monthsShort, currency }) {
  const maxVal = Math.max(...monthlyDivsUSD, 1)

  return (
    <div className="div-calendar-grid">
      {monthlyDivsUSD.map((val, idx) => {
        const pctHeight = maxVal > 0 ? (val / maxVal) * 100 : 0
        return (
          <div key={idx} className="cal-month-col">
            <span className="cal-val mono">
              {val > 0 ? formatMoney(val, currency, { compact: true }) : '—'}
            </span>
            <div className="cal-bar-track">
              <div
                className={`cal-bar-fill ${val > 0 ? 'has-div' : ''}`}
                style={{ height: `${Math.max(val > 0 ? 8 : 0, pctHeight)}%` }}
                title={`${monthsShort[idx]}: ${formatMoney(val, currency)}`}
              />
            </div>
            <span className="cal-month-label">{monthsShort[idx]}</span>
          </div>
        )
      })}
    </div>
  )
}

export function PortfolioTracker({
  holdings,
  onAddHolding,
  onUpdateHoldingAmount,
  onRemoveHolding,
  onClearPortfolio,
  onLoadSamplePortfolio,
  onCalculateStock,
  currency,
  t,
}) {
  const [addSymbol, setAddSymbol] = useState('AAPL')
  const [addAmountInput, setAddAmountInput] = useState('')

  const currencyCfg = getCurrencyConfig(currency)

  const defaultDisplayAdd = useMemo(() => {
    if (currency === 'USD') return 1000
    if (currency === 'UZS') return 10_000_000
    return 100_000
  }, [currency])

  const enriched = useMemo(() => {
    return holdings
      .map((h) => {
        const stock = STOCKS.find((s) => s.symbol === h.symbol)
        if (!stock) return null
        const shares = stock.priceUSD > 0 ? h.amountUSD / stock.priceUSD : 0
        const annualDivUSD = h.amountUSD * (stock.dividendYieldPct / 100)
        const totalAnnualRate =
          (stock.annualGrowthPct + stock.dividendYieldPct) / 100
        const projected5YUSD = h.amountUSD * Math.pow(1 + totalAnnualRate, 5)
        return {
          ...h,
          stock,
          shares,
          annualDivUSD,
          projected5YUSD,
        }
      })
      .filter(Boolean)
  }, [holdings])

  const summary = useMemo(() => {
    const totalUSD = enriched.reduce((acc, item) => acc + item.amountUSD, 0)
    const annualDivUSD = enriched.reduce((acc, item) => acc + item.annualDivUSD, 0)
    const projected5YUSD = enriched.reduce((acc, item) => acc + item.projected5YUSD, 0)
    const yieldPct = totalUSD > 0 ? (annualDivUSD / totalUSD) * 100 : 0

    // Sector slices
    const sectorMap = {}
    for (const item of enriched) {
      sectorMap[item.stock.sector] =
        (sectorMap[item.stock.sector] || 0) + item.amountUSD
    }
    const slices = Object.entries(sectorMap)
      .map(([sector, valueUSD]) => ({ sector, valueUSD }))
      .sort((a, b) => b.valueUSD - a.valueUSD)

    // 12-month dividend calendar
    const monthlyDivsUSD = new Array(12).fill(0)
    for (const item of enriched) {
      const months = item.stock.payoutMonths || []
      if (months.length > 0 && item.annualDivUSD > 0) {
        const perPayout = item.annualDivUSD / months.length
        for (const m of months) {
          if (m >= 1 && m <= 12) {
            monthlyDivsUSD[m - 1] += perPayout
          }
        }
      }
    }

    return {
      totalUSD,
      annualDivUSD,
      monthlyAvgUSD: annualDivUSD / 12,
      yieldPct,
      projected5YUSD,
      slices,
      monthlyDivsUSD,
    }
  }, [enriched])

  const handleAddSubmit = (e) => {
    e.preventDefault()
    const rawNum = addAmountInput
      ? Number(String(addAmountInput).replace(/[^\d.]/g, ''))
      : defaultDisplayAdd
    if (!Number.isFinite(rawNum) || rawNum <= 0) return
    onAddHolding(addSymbol, toUSD(rawNum, currency))
    setAddAmountInput('')
  }

  return (
    <section id="portfolio" className="section portfolio-section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">
              <Briefcase size={15} />
              {t.portfolioEyebrow}
            </span>
            <h2 className="section-title">{t.portfolioTitle}</h2>
            <p className="section-subtitle">{t.portfolioSubtitle}</p>
          </div>
          <div className="portfolio-head-btns">
            <button
              type="button"
              className="btn-secondary-sm"
              onClick={onLoadSamplePortfolio}
            >
              <RotateCcw size={14} />
              {t.portfolioSample}
            </button>
            {enriched.length > 0 && (
              <button
                type="button"
                className="btn-secondary-sm"
                onClick={onClearPortfolio}
              >
                <Trash2 size={14} />
                {t.portfolioClear}
              </button>
            )}
          </div>
        </div>

        {/* Add position bar */}
        <form className="portfolio-add-bar" onSubmit={handleAddSubmit}>
          <div className="p-add-field">
            <label htmlFor="p-stock-select">{t.selectStockLabel}</label>
            <select
              id="p-stock-select"
              value={addSymbol}
              onChange={(e) => setAddSymbol(e.target.value)}
            >
              {STOCKS.map((s) => (
                <option key={s.symbol} value={s.symbol}>
                  {s.symbol} — {s.name} ({s.exchange})
                </option>
              ))}
            </select>
          </div>

          <div className="p-add-field">
            <label htmlFor="p-amount-input">
              {t.investAmountLabel} ({currencyCfg.code})
            </label>
            <input
              id="p-amount-input"
              type="text"
              inputMode="numeric"
              placeholder={defaultDisplayAdd.toLocaleString('en-US').replace(/,/g, ' ')}
              value={addAmountInput}
              onChange={(e) => setAddAmountInput(e.target.value)}
            />
          </div>

          <button type="submit" className="btn-primary p-add-submit">
            <Plus size={17} />
            {t.portfolioAddBtn}
          </button>
        </form>

        {enriched.length === 0 ? (
          <div className="empty-state-box">
            <Briefcase size={28} />
            <p>{t.portfolioEmpty}</p>
            <button
              type="button"
              className="btn-secondary"
              onClick={onLoadSamplePortfolio}
            >
              {t.portfolioSample}
            </button>
          </div>
        ) : (
          <>
            {/* 4 Portfolio KPIs */}
            <div className="portfolio-kpi-grid">
              <div className="p-kpi-card">
                <span>{t.portfolioTotalInvested}</span>
                <strong className="mono">
                  {formatMoney(summary.totalUSD, currency)}
                </strong>
              </div>
              <div className="p-kpi-card">
                <span>{t.portfolioAnnualDiv}</span>
                <strong className="mono positive">
                  {formatMoney(summary.annualDivUSD, currency)}
                </strong>
                <small className="mono">
                  {formatMoney(summary.monthlyAvgUSD, currency)}
                  {t.perMonth}
                </small>
              </div>
              <div className="p-kpi-card">
                <span>{t.portfolioYieldAvg}</span>
                <strong className="mono positive">
                  {summary.yieldPct.toFixed(2)}%
                </strong>
              </div>
              <div className="p-kpi-card">
                <span>{t.portfolioProjected5Y}</span>
                <strong className="mono">
                  {formatMoney(summary.projected5YUSD, currency)}
                </strong>
              </div>
            </div>

            {/* Visual Analytics: Sector Donut + 12-Month Dividend Calendar */}
            <div className="portfolio-analytics-grid">
              <div className="hub-panel">
                <div className="hub-panel-title mb-14">
                  <PieChart size={17} className="accent-ic" />
                  <h3>{t.portfolioAllocationTitle}</h3>
                </div>
                <SectorDonut
                  slices={summary.slices}
                  totalUSD={summary.totalUSD}
                  currency={currency}
                  t={t}
                />
              </div>

              <div className="hub-panel">
                <div className="hub-panel-title mb-14">
                  <Calendar size={17} className="accent-ic" />
                  <h3>{t.portfolioCalendarTitle}</h3>
                </div>
                <DividendCalendarChart
                  monthlyDivsUSD={summary.monthlyDivsUSD}
                  monthsShort={t.monthsShort}
                  currency={currency}
                />
              </div>
            </div>

            {/* Holdings Table */}
            <div className="catalog-table-wrap">
              <table className="catalog-table">
                <thead>
                  <tr>
                    <th>{t.colStock}</th>
                    <th>{t.colInvested}</th>
                    <th>{t.colShares}</th>
                    <th>{t.colWeight}</th>
                    <th>{t.cardDividend}</th>
                    <th>{t.colAnnualIncome}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {enriched.map(({ stock, amountUSD, shares, annualDivUSD }) => {
                    const weightPct =
                      summary.totalUSD > 0
                        ? (amountUSD / summary.totalUSD) * 100
                        : 0
                    const displayAmt = Math.round(fromUSD(amountUSD, currency))
                    return (
                      <tr key={stock.symbol}>
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
                                <span className="exchange-tag">
                                  {stock.exchange}
                                </span>
                              </div>
                              <div className="opt-name">{stock.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <input
                            type="number"
                            min={0}
                            className="inline-amt-input mono"
                            value={displayAmt}
                            onChange={(e) => {
                              const val = Number(e.target.value)
                              if (Number.isFinite(val) && val >= 0) {
                                onUpdateHoldingAmount(
                                  stock.symbol,
                                  toUSD(val, currency),
                                )
                              }
                            }}
                            aria-label={`${stock.symbol} ${t.colInvested}`}
                          />
                        </td>
                        <td className="mono">{formatShares(shares)}</td>
                        <td className="mono">{weightPct.toFixed(1)}%</td>
                        <td className="mono">{stock.dividendYieldPct}%</td>
                        <td className="mono positive strong">
                          {formatMoney(annualDivUSD, currency)}
                        </td>
                        <td>
                          <div className="table-row-btns">
                            <button
                              type="button"
                              className="btn-calc-sm"
                              onClick={() => onCalculateStock(stock.symbol)}
                            >
                              {t.btnCalculate}
                            </button>
                            <button
                              type="button"
                              className="btn-icon-outline sm"
                              onClick={() => onRemoveHolding(stock.symbol)}
                              aria-label={`Remove ${stock.symbol}`}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
