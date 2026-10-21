'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { recordPayment } from '@/actions/payments';
import { PAYMENT_METHODS } from '@/lib/payment-methods';
import { formatNumber } from '@/lib/format';
import Badge from './Badge';

// Une ligne de la journée : affichage + saisie dépliable
// row : { driverId, driverName, vehicleId, plate, model, expected, payment, status, hint }
export default function PaymentRow({ row, day, colCount }) {
  const [state, formAction, pending] = useActionState(recordPayment, {});
  const [open, setOpen] = useState(false);

  // Referme la saisie après un enregistrement réussi
  useEffect(() => {
    if (state.ok) setOpen(false);
  }, [state.ts, state.ok]);

  const p = row.payment;

  function onSubmit(ev) {
    ev.preventDefault();
    // submitter : le bouton cliqué fournit le champ « mode »
    const fd = new FormData(ev.currentTarget, ev.nativeEvent.submitter);
    startTransition(() => formAction(fd));
  }

  return (
    <>
      <tr>
        <td className="mono"><Link href={`/vehicules/${row.vehicleId}`} className="ref">{row.plate}</Link></td>
        <td>
          <Link href={`/chauffeurs/${row.driverId}`} className="ref">{row.driverName}</Link>
          {row.hint && <div className="muted small">{row.hint}</div>}
        </td>
        <td className="num">{formatNumber(row.expected)}</td>
        <td className="num">{p ? formatNumber(p.paid) : '—'}</td>
        <td>
          <Badge tone={row.status.tone}>{row.status.label}</Badge>
          {p?.method && <div className="muted small">{PAYMENT_METHODS[p.method]}</div>}
          {p?.note && <div className="muted small">{p.note}</div>}
        </td>
        <td className="actions-cell">
          <button type="button" className="btn small-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Fermer' : p ? 'Modifier' : 'Saisir'}
          </button>
        </td>
      </tr>
      {open && (
        <tr className="edit-row">
          <td colSpan={colCount}>
            <form onSubmit={onSubmit} className="pay-form">
              <input type="hidden" name="date" value={day} />
              <input type="hidden" name="driverId" value={row.driverId} />
              <input type="hidden" name="vehicleId" value={row.vehicleId} />
              <label className="field">
                <span>Montant versé (FCFA)</span>
                <input name="amount" inputMode="numeric" defaultValue={p?.paid || row.expected || ''} autoFocus />
              </label>
              <label className="field">
                <span>Mode</span>
                <select name="method" defaultValue={p?.method || 'especes'}>
                  {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
                    <option key={k} value={k}>{label}</option>
                  ))}
                </select>
              </label>
              <label className="field grow">
                <span>Note</span>
                <input name="note" defaultValue={p?.note || (row.hint ?? '')} placeholder="Obligatoire pour « Non dû »" autoComplete="off" />
              </label>
              <div className="pay-buttons">
                <button type="submit" name="mode" value="paid" className="btn primary" disabled={pending}>Encaisser</button>
                <button type="submit" name="mode" value="unpaid" className="btn" disabled={pending}>Non versé</button>
                <button type="submit" name="mode" value="notdue" className="btn" disabled={pending}>Non dû</button>
              </div>
              {state.error && <p className="form-error" role="alert">{state.error}</p>}
            </form>
          </td>
        </tr>
      )}
    </>
  );
}
