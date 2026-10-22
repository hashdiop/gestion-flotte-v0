'use client';

import { startTransition, useActionState, useState } from 'react';
import { closeDay } from '@/actions/closure';
import { formatNumber } from '@/lib/format';
import Field from './Field';

// Formulaire de clôture : comptage de caisse, note, confirmation
export default function CloseDayForm({ day, dayLabel, cashExpected, convertCount }) {
  const [state, formAction, pending] = useActionState(closeDay, {});
  const [counted, setCounted] = useState('');
  const n = Number(counted.replace(/[\s  ]/g, ''));
  const gap = counted !== '' && Number.isInteger(n) ? n - cashExpected : null;

  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    const warn = convertCount ? `\n${convertCount} ligne(s) sans saisie passeront « Non versé ».` : '';
    if (!window.confirm(`Clôturer la journée du ${dayLabel} ?${warn}\nLa journée sera figée : seules des corrections avec motif resteront possibles.`)) return;
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="form" noValidate>
      <input type="hidden" name="date" value={day} />
      <div className="form-grid">
        <Field label="Espèces comptées en caisse (FCFA)" hint={`Espèces enregistrées : ${formatNumber(cashExpected)} FCFA`}>
          <input name="cashCounted" inputMode="numeric" value={counted} onChange={(e) => setCounted(e.target.value)} autoComplete="off" />
        </Field>
        <div className="field">
          <span>Écart de caisse</span>
          <div className={`gap-box${gap === null ? '' : gap === 0 ? ' ok' : ' bad'}`}>
            {gap === null ? '—' : gap === 0 ? 'Caisse juste' : `${gap > 0 ? '+' : '−'}${formatNumber(Math.abs(gap))} FCFA`}
          </div>
        </div>
        <Field label="Note de clôture" hint="Facultatif : explication d’un écart, incident de la journée…" wide>
          <input name="note" autoComplete="off" />
        </Field>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
      <div className="form-actions">
        <button type="submit" className="btn primary" disabled={pending}>
          {pending ? 'Clôture…' : `Clôturer la journée du ${dayLabel}`}
        </button>
      </div>
    </form>
  );
}
