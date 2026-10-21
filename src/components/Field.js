// Libellé + champ + message d'erreur. Le champ est passé en enfant.
export default function Field({ label, hint, error, children, wide }) {
  return (
    <label className={`field${wide ? ' wide' : ''}`}>
      <span>{label}</span>
      {children}
      {hint && !error && <small className="hint">{hint}</small>}
      {error && <small className="field-error">{error}</small>}
    </label>
  );
}
