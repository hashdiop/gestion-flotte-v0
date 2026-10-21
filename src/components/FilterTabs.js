import Link from 'next/link';

// Onglets de filtre en liens (?param=valeur), au style « seg » de la maquette
export default function FilterTabs({ basePath, param, current, options, label }) {
  return (
    <nav className="seg" aria-label={label}>
      {options.map(({ value, label: text, count }) => {
        const href = value ? `${basePath}?${param}=${value}` : basePath;
        return (
          <Link key={value || 'all'} href={href} aria-current={current === value ? 'true' : undefined}>
            {text}
            {count !== undefined && <span className="count">{count}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
