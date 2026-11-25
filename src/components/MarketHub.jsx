import { useMemo, useState } from 'react'
import { Flame, Grid, Info, TrendingUp } from 'lucide-react'
import { STOCKS } from '../data/stocks'
import { formatMoney } from '../utils/formatters'
import { Sparkline } from './Sparkline'

const HEATMAP_TICKERS = [
  'NVDA',
  'AAPL',
  'MSFT',
  'AMZN',
  'GOOGL',
  'META',
  'TSLA',
  'TSM',
  'AVGO',
  'VOO',
  'QQQ',
  'JPM',
  'V',
  'WMT',
  'KO',
  'O',
  'XOM',
  'UZMT',
  'HMKB',
  'OKMK',
]

function heatColor(val, metric) {
  if (metric === '24h') {
    if (val >= 2.0) return { bg: 'rgba(5, 150, 105, 0.92)', text: '#ffffff' }
    if (val >= 1.1) return { bg: 'rgba(16, 185, 129, 0.76)', text: '#ffffff' }
    if (val >= 0.4) return { bg: 'rgba(16, 185, 129, 0.34)', text: 'var(--text)' }
    if (val >= 0) return { bg: 'rgba(148, 163, 184, 0.22)', text: 'var(--text)' }
    return { bg: 'rgba(220, 38, 38, 0.78)', text: '#ffffff' }
  }
  if (metric === 'growth') {
    if (val >= 16) return { bg: 'rgba(5, 150, 105, 0.9)', text: '#ffffff' }
    if (val >= 12) return { bg: 'rgba(16, 185, 129, 0.68)', text: '#ffffff' }
    if (val >= 8) return { bg: 'rgba(16, 185, 129, 0.3)', text: 'var(--text)' }
    return { bg: 'rgba(148, 163, 184, 0.22)', text: 'var(--text)' }
  }
  // dividend
  if (val >= 6) return { bg: 'rgba(5, 150, 105, 0.92)', text: '#ffffff' }
  if (val >= 3) return { bg: 'rgba(16, 185, 129, 0.66)', text: '#ffffff' }
  if (val >= 1) return { bg: 'rgba(16, 185, 129, 0.28)', text: 'var(--text)' }
  return { bg: 'rgba(148, 163, 184, 0.18)', text: 'var(--text-muted)' }
}

export function MarketHub({
  selectedSymbol,
  onCalculateStock,
  onInspectStock,
  currency,
  t,
}) {
  const [moverTab, setMoverTab] = useState('gainers')
  const [heatmapMetric, setHeatmapMetric] = useState('24h')

  const moversList = useMemo(() => {
    if (moverTab === 'dividend') {
      return [...STOCKS]
        .sort((a, b) => b.dividendYieldPct - a.dividendYieldPct)
        .slice(0, 6)
    }
    if (moverTab === 'uzse') {
      return STOCKS.filter((s) => s.sector === 'uzse').slice(0, 6)
    }
    if (moverTab === 'growth') {
      return [...STOCKS]
        .sort((a, b) => b.annualGrowthPct - a.annualGrowthPct)
        .slice(0, 6)
    }
    return [...STOCKS].sort((a, b) => b.dayChangePct - a.dayChangePct).slice(0, 6)
  }, [moverTab])

  const heatmapStocks = useMemo(
    () =>
      HEATMAP_TICKERS.map((sym) => STOCKS.find((s) => s.symbol === sym)).filter(
        Boolean,
      ),
    [],
  )

  return (
    <section id="market-hub" className="section market-hub-section">
      <div className="container">
        <div className="section-head">
          <div>
            <span className="section-eyebrow">
              <TrendingUp size={15} />
              {t.marketHubEyebrow}
            </span>
            <h2 className="section-title">{t.marketHubTitle}</h2>
            <p className="section-subtitle">{t.marketHubSubtitle}</p>
          </div>
        </div>

        <div className="market-hub-grid">
          {/* LEFT: Market Movers (Yahoo Finance / StockAnalysis style) */}
          <div className="hub-panel">
            <div className="hub-panel-head">
              <div className="hub-panel-title">
                <Flame size={17} className="accent-ic" />
                <h3>{t.moversTitle}</h3>
              </div>
              <div className="hub-tabs" role="tablist">
                {[
                  { id: 'gainers', label: t.moversTabGainers },
                  { id: 'dividend', label: t.moversTabDividend },
                  { id: 'growth', label: t.moversTabGrowth },
                  { id: 'uzse', label: t.moversTabUzse },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={moverTab === tab.id}
                    className={`hub-tab-btn ${moverTab === tab.id ? 'active' : ''}`}
                    onClick={() => setMoverTab(tab.id)}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="movers-list">
              {moversList.map((stock) => {
                const pos = stock.dayChangePct >= 0
                return (
                  <div
                    key={stock.symbol}
                    className={`mover-row ${selectedSymbol === stock.symbol ? 'active' : ''}`}
                  >
                    <button
                      type="button"
                      className="mover-main-btn"
                      onClick={() => onCalculateStock(stock.symbol)}
                    >
                      <span
                        className="ticker-avatar sm"
                        style={{ backgroundColor: stock.color }}
                      >
                        {stock.symbol.slice(0, 4)}
                      </span>
                      <div className="mover-id">
                        <div className="stock-sym-line">
                          <strong>{stock.symbol}</strong>
                          <span className="exchange-tag">{stock.exchange}</span>
                        </div>
                        <span className="mover-name">{stock.name}</span>
                      </div>
                    </button>

                    <div className="mover-spark hide-sm">
                      <Sparkline
                        data={stock.history}
                        positive={
                          stock.history[stock.history.length - 1] >=
                          stock.history[0]
                        }
                        width={68}
                        height={26}
                      />
                    </div>

                    <div className="mover-nums">
                      <strong className="mono">
                        {formatMoney(stock.priceUSD, currency)}
                      </strong>
                      {moverTab === 'dividend' ? (
                        <span className="mover-badge pos mono">
                          Div {stock.dividendYieldPct}%
                        </span>
                      ) : moverTab === 'growth' ? (
                        <span className="mover-badge pos mono">
                          +{stock.annualGrowthPct}% / {t.yearShort}
                        </span>
                      ) : (
                        <span className={`mover-badge ${pos ? 'pos' : 'neg'} mono`}>
                          {pos ? '+' : ''}
                          {stock.dayChangePct.toFixed(2)}%
                        </span>
                      )}
                    </div>

                    <button
                      type="button"
                      className="btn-icon-outline sm"
                      onClick={() => onInspectStock(stock.symbol)}
                      title={t.btnDetails}
                      aria-label={`${t.btnDetails} ${stock.symbol}`}
                    >
                      <Info size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          </div>

          {/* RIGHT: Interactive Market Map (Jett.uz / Finviz Heatmap style) */}
          <div className="hub-panel">
            <div className="hub-panel-head">
              <div className="hub-panel-title">
                <Grid size={17} className="accent-ic" />
                <h3>{t.heatmapTitle}</h3>
              </div>
              <div className="hub-tabs" role="group">
                {[
                  { id: '24h', label: t.heatmapMetric24h },
                  { id: 'growth', label: t.heatmapMetricGrowth },
                  { id: 'dividend', label: t.heatmapMetricDividend },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    className={`hub-tab-btn ${heatmapMetric === m.id ? 'active' : ''}`}
                    onClick={() => setHeatmapMetric(m.id)}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="heatmap-grid">
              {heatmapStocks.map((stock, idx) => {
                const metricVal =
                  heatmapMetric === '24h'
                    ? stock.dayChangePct
                    : heatmapMetric === 'growth'
                      ? stock.annualGrowthPct
                      : stock.dividendYieldPct
                const { bg, text } = heatColor(metricVal, heatmapMetric)
                const isMega = idx < 4
                return (
                  <button
                    key={stock.symbol}
                    type="button"
                    className={`heat-tile ${isMega ? 'mega' : ''} ${selectedSymbol === stock.symbol ? 'selected' : ''}`}
                    style={{ backgroundColor: bg, color: text }}
                    onClick={() => onCalculateStock(stock.symbol)}
                    title={`${stock.name} — ${formatMoney(stock.priceUSD, currency)}`}
                  >
                    <div className="heat-top">
                      <strong>{stock.symbol}</strong>
                      <span className="heat-ex">{stock.exchange}</span>
                    </div>
                    <div className="heat-val mono">
                      {heatmapMetric === 'dividend'
                        ? `${metricVal.toFixed(1)}%`
                        : `${metricVal >= 0 ? '+' : ''}${metricVal.toFixed(1)}%`}
                    </div>
                    <div className="heat-price mono">
                      {formatMoney(stock.priceUSD, currency)}
                    </div>
                  </button>
                )
              })}
            </div>
            <p className="heatmap-hint">{t.heatmapHint}</p>
          </div>
        </div>
      </div>
    </section>
  )
}
