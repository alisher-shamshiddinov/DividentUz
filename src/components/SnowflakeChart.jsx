import { useId } from 'react'

export function SnowflakeRadar({ snowflake, axesLabels, size = 196 }) {
  const gradId = useId()
  if (!snowflake) return null

  const keys = ['value', 'growth', 'past', 'health', 'dividend']
  const maxScore = 6
  const cx = size / 2
  const cy = size / 2
  const radius = size * 0.34

  const pointAt = (idx, score) => {
    const angle = (-Math.PI / 2) + (idx * 2 * Math.PI) / keys.length
    const r = (score / maxScore) * radius
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const labelAt = (idx) => {
    const angle = (-Math.PI / 2) + (idx * 2 * Math.PI) / keys.length
    const r = radius + 21
    return {
      x: cx + r * Math.cos(angle),
      y: cy + r * Math.sin(angle),
    }
  }

  const rings = [2, 4, 6]
  const dataPts = keys.map((k, i) => pointAt(i, snowflake[k] ?? 0))
  const polyPath =
    dataPts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ') +
    ' Z'

  const totalScore = keys.reduce((acc, k) => acc + (snowflake[k] ?? 0), 0)
  const fillCol =
    totalScore >= 22 ? '#10b981' : totalScore >= 16 ? '#eab308' : '#f97316'

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="snowflake-svg"
      role="img"
      aria-label="Fundamental Snowflake Score"
    >
      <defs>
        <radialGradient id={gradId} cx="50%" cy="50%" r="55%">
          <stop offset="0%" stopColor={fillCol} stopOpacity="0.48" />
          <stop offset="100%" stopColor={fillCol} stopOpacity="0.18" />
        </radialGradient>
      </defs>

      {/* Concentric pentagon rings */}
      {rings.map((ring) => {
        const ringPath =
          keys
            .map((_, i) => {
              const p = pointAt(i, ring)
              return `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`
            })
            .join(' ') + ' Z'
        return (
          <path
            key={ring}
            d={ringPath}
            fill="none"
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeOpacity="0.6"
          />
        )
      })}

      {/* Spokes */}
      {keys.map((_, i) => {
        const outer = pointAt(i, maxScore)
        return (
          <line
            key={i}
            x1={cx}
            y1={cy}
            x2={outer.x}
            y2={outer.y}
            stroke="var(--border-strong)"
            strokeWidth="1"
            strokeOpacity="0.5"
          />
        )
      })}

      {/* Data polygon */}
      <path
        d={polyPath}
        fill={`url(#${gradId})`}
        stroke={fillCol}
        strokeWidth="2.2"
        strokeLinejoin="round"
      />

      {dataPts.map((p, i) => (
        <circle
          key={i}
          cx={p.x}
          cy={p.y}
          r="3.2"
          fill={fillCol}
          stroke="var(--bg-card)"
          strokeWidth="1.5"
        />
      ))}

      {/* Axis labels */}
      {keys.map((k, i) => {
        const lp = labelAt(i)
        return (
          <text
            key={k}
            x={lp.x}
            y={lp.y + 3}
            textAnchor="middle"
            className="snowflake-label"
          >
            {axesLabels[k]}
          </text>
        )
      })}
    </svg>
  )
}

export function TechnicalGauge({ score = 75, ratingLabel }) {
  const clamped = Math.max(0, Math.min(100, score))
  // Angle from -90 deg (left) to +90 deg (right)
  const angleDeg = -90 + (clamped / 100) * 180
  const angleRad = ((angleDeg - 90) * Math.PI) / 180

  const cx = 100
  const cy = 92
  const needleLen = 54
  const nx = cx + needleLen * Math.cos(angleRad)
  const ny = cy + needleLen * Math.sin(angleRad)

  const tone =
    clamped >= 75
      ? '#059669'
      : clamped >= 55
        ? '#10b981'
        : clamped >= 40
          ? '#eab308'
          : '#dc2626'

  return (
    <div className="tech-gauge-wrap">
      <svg viewBox="0 0 200 112" className="tech-gauge-svg" aria-hidden="true">
        {/* Colored arc segments */}
        <path
          d="M 32 92 A 68 68 0 0 1 60 37"
          fill="none"
          stroke="#dc2626"
          strokeWidth="10"
          strokeLinecap="round"
          strokeOpacity="0.85"
        />
        <path
          d="M 65 34 A 68 68 0 0 1 135 34"
          fill="none"
          stroke="#eab308"
          strokeWidth="10"
          strokeOpacity="0.85"
        />
        <path
          d="M 140 37 A 68 68 0 0 1 168 92"
          fill="none"
          stroke="#10b981"
          strokeWidth="10"
          strokeLinecap="round"
          strokeOpacity="0.9"
        />

        {/* Needle */}
        <line
          x1={cx}
          y1={cy}
          x2={nx}
          y2={ny}
          stroke="var(--text)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cx={cx} cy={cy} r="5.5" fill="var(--text)" />
        <circle cx={cx} cy={cy} r="2.5" fill="var(--bg-card)" />
      </svg>

      <div className="tech-gauge-caption">
        <strong style={{ color: tone }}>{ratingLabel}</strong>
        <span className="mono">{clamped}/100</span>
      </div>
    </div>
  )
}
