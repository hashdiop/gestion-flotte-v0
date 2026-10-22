// Indicateur : icône dans une tuile colorée, valeur, libellé court.
// color : une rubrique (veh, pay…) ou un état (ok, warn, bad, info) ; tip : valeur exacte ou précision au survol.
export default function Kpi({ icon: Icon, color = 'dash', label, value, tip, valueClass = '', children }) {
  const vars = ['ok', 'warn', 'bad', 'info', 'neu'].includes(color)
    ? { '--c': `var(--${color}-fg)`, '--cb': `var(--${color}-bg)` }
    : { '--c': `var(--${color})`, '--cb': `var(--${color}-bg)` };
  return (
    <div className="card kpi2" style={vars}>
      <span className="dom" aria-hidden="true"><Icon size={18} /></span>
      <div className="kpi2-body">
        <span className={`kpi2-v tip ${valueClass}`} data-tip={tip || undefined}>{value}</span>
        <span className="kpi2-l">{label}</span>
        {children}
      </div>
    </div>
  );
}
