import { Moon, Sun, TrendingUp } from 'lucide-react'
import { CURRENCIES, LANGUAGES } from '../data/translations'

export function Header({
  lang,
  onChangeLang,
  currency,
  onChangeCurrency,
  theme,
  onToggleTheme,
  t,
  compareCount,
  portfolioCount,
}) {
  return (
    <header className="site-header">
      <div className="container header-inner">
        <a href="#top" className="brand-link">
          <span className="brand-mark">
            <TrendingUp size={20} strokeWidth={2.4} />
          </span>
          <span className="brand-text">
            <span className="brand-name">
              Divident<span className="brand-accent">Uz</span>
            </span>
            <span className="brand-tagline">{t.brandTagline}</span>
          </span>
        </a>

        <nav className="header-nav" aria-label="Main navigation">
          <a href="#market-hub" className="nav-pill">
            {t.navMarket}
          </a>
          <a href="#calculator" className="nav-pill">
            {t.navCalculator}
          </a>
          <a href="#catalog" className="nav-pill">
            {t.navCatalog}
          </a>
          <a href="#portfolio" className="nav-pill">
            {t.navPortfolio}
            {portfolioCount > 0 && (
              <span className="nav-badge">{portfolioCount}</span>
            )}
          </a>
          <a href="#compare" className="nav-pill">
            {t.navCompare}
            {compareCount > 0 && (
              <span className="nav-badge">{compareCount}</span>
            )}
          </a>
        </nav>

        <div className="header-controls">
          <div className="control-group" role="group" aria-label="Currency">
            {CURRENCIES.map((cur) => (
              <button
                key={cur.code}
                type="button"
                className={`seg-btn ${currency === cur.code ? 'active' : ''}`}
                onClick={() => onChangeCurrency(cur.code)}
                title={cur.code}
              >
                {cur.code}
              </button>
            ))}
          </div>

          <div className="control-group lang-group" role="group" aria-label="Language">
            {LANGUAGES.map((item) => (
              <button
                key={item.code}
                type="button"
                className={`seg-btn ${lang === item.code ? 'active' : ''}`}
                onClick={() => onChangeLang(item.code)}
                title={item.name}
                aria-pressed={lang === item.code}
              >
                {item.short}
              </button>
            ))}
          </div>

          <button
            type="button"
            className="icon-btn"
            onClick={onToggleTheme}
            title={theme === 'dark' ? t.themeLight : t.themeDark}
            aria-label={theme === 'dark' ? t.themeLight : t.themeDark}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
