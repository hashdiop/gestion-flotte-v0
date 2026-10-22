'use client';

export default function PrintButton() {
  return (
    <button type="button" className="btn noprint" onClick={() => window.print()}>
      Imprimer
    </button>
  );
}
