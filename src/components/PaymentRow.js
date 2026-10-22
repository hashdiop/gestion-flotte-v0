'use client';

import Link from 'next/link';
import { startTransition, useActionState, useEffect, useState } from 'react';
import { recordPayment } from '@/actions/payments';
import { addAdjustment } from '@/actions/closure';
import { PAYMENT_METHODS } from '@/lib/payment-methods';
import { formatNumber } from '@/lib/format';
import Badge from './Badge';
import { Check, CircleMinus, PenLine, Pencil, Plus, Send, X } from 'lucide-react';

const LOG_LABELS = {
  saisie: 'Saisie',
  modification: 'Modification',
  cloture: 'Clôture',
  correction: 'Correction',
  remboursement: 'Remboursement',
};
const timeFmt = new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const snap = (s) => (s ? `${formatNumber(s.paid)} / ${formatNumber(s.expected)}${s.method ? ` · ${PAYMENT_METHODS[s.method]}` : ''}` : '—');
const signed = (n) => (n > 0 ? `+${formatNumber(n)}` : `−${formatNumber(-n)}`);

// Une ligne de la journée : affichage + panneau dépliable.
//  journée ouverte  : saisie (encaisser, non versé, non dû)
//  journée clôturée : écriture correctrice (remboursement d'un manque ou correction), motif obligatoire
// row : { driverId, driverName, vehicleId, plate, rate, expected, paid, payment, autoNotDue, status, hint, adjustments, logs }
export default function PaymentRow({ row, day, colCount, closed }) {
  const [open, setOpen] = useState(false);
  const p = row.payment;

  return (
    <>
      <tr>
        <td><Link href={`/vehicules/${row.vehicleId}`} className="plate">{row.plate}</Link></td>
        <td>
          <span className="ent">
            <span className="av" aria-hidden="true">{row.driverName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}</span>
            <span className="ent-txt">
              <Link href={`/chauffeurs/${row.driverId}`} className="ref">{row.driverName}</Link>
              {row.hint && <span className="muted" title={row.hint}>{row.hint.split(' ce jour')[0]}</span>}
            </span>
          </span>
        </td>
        <td className="num">{formatNumber(row.expected)}</td>
        <td className="num">{p || closed ? formatNumber(row.paid) : '—'}</td>
        <td>
          <Badge tone={row.status.tone}>{row.status.label}</Badge>
          {p?.method && <div className="muted small">{PAYMENT_METHODS[p.method]}</div>}
          {p?.note && <div className="muted small">{p.note}</div>}
          {row.adjustments.map((a) => (
            <div key={a.id} className="small adj">
              {a.kind === 'remboursement'
                ? `Remboursé ${formatNumber(a.deltaPaid)} (${PAYMENT_METHODS[a.method]})`
                : `Corrigé${a.deltaExpected ? ` · attendu ${signed(a.deltaExpected)}` : ''}${a.deltaPaid ? ` · versé ${signed(a.deltaPaid)}` : ''}`}
              <span className="muted"> — {a.reason}</span>
            </div>
          ))}
        </td>
        <td className="actions-cell">
          <ToggleButton label={open ? 'Fermer' : closed ? 'Corriger' : p ? 'Modifier' : row.autoNotDue ? 'Corriger' : 'Saisir'} onClick={() => setOpen((o) => !o)} open={open} />
        </td>
      </tr>
      {open && (
        <tr className="edit-row">
          <td colSpan={colCount}>
            {closed ? <AdjustmentForm row={row} day={day} onDone={() => setOpen(false)} /> : <EntryForm row={row} day={day} onDone={() => setOpen(false)} />}
            {row.logs.length > 0 && (
              <details className="log">
                <summary>Historique de la ligne ({row.logs.length})</summary>
                <ul>
                  {row.logs.map((l) => (
                    <li key={l.id}>
                      <span className="mono">{timeFmt.format(new Date(l.at))}</span> · {LOG_LABELS[l.action]} par {l.by} : {snap(l.before)} → {snap(l.after)}
                      {l.reason && <span className="muted"> — {l.reason}</span>}
                      {!l.reason && l.after?.note && <span className="muted"> — {l.after.note}</span>}
                    </li>
                  ))}
                </ul>
              </details>
            )}
          </td>
        </tr>
      )}
    </>
  );
}

// Bouton icône de la ligne ; son nom accessible reste le mot (Saisir, Modifier, Corriger, Fermer)
const TOGGLE_ICONS = { Fermer: X, Corriger: PenLine, Modifier: Pencil, Saisir: Plus };
function ToggleButton({ label, onClick, open }) {
  const Icon = TOGGLE_ICONS[label];
  return (
    <button type="button" className={`btn icon${label === 'Saisir' ? ' primary' : ' ghost'}`} onClick={onClick} aria-expanded={open} aria-label={label} title={label}>
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}

// Saisie sur une journée ouverte
function EntryForm({ row, day, onDone }) {
  const [state, formAction, pending] = useActionState(recordPayment, {});
  const p = row.payment;

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ts, state.ok]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(ev) {
    ev.preventDefault();
    // submitter : le bouton cliqué fournit le champ « mode »
    const fd = new FormData(ev.currentTarget, ev.nativeEvent.submitter);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="pay-form">
      <input type="hidden" name="date" value={day} />
      <input type="hidden" name="driverId" value={row.driverId} />
      <input type="hidden" name="vehicleId" value={row.vehicleId} />
      <label className="field">
        <span>Montant versé (FCFA)</span>
        <input name="amount" inputMode="numeric" defaultValue={p?.paid || row.rate || ''} autoFocus />
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
        <input name="note" defaultValue={p?.note || ''} placeholder="Obligatoire pour « Non dû »" autoComplete="off" />
      </label>
      <div className="pay-buttons">
        <button type="submit" name="mode" value="paid" className="btn primary" disabled={pending}><Check size={16} aria-hidden="true" />Encaisser</button>
        <button type="submit" name="mode" value="unpaid" className="btn" disabled={pending}><X size={16} aria-hidden="true" />Non versé</button>
        <button type="submit" name="mode" value="notdue" className="btn" disabled={pending}><CircleMinus size={16} aria-hidden="true" />Non dû</button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}

// Écriture correctrice sur une journée clôturée
function AdjustmentForm({ row, day, onDone }) {
  const [state, formAction, pending] = useActionState(addAdjustment, {});
  const remaining = row.expected - row.paid;
  const [kind, setKind] = useState(remaining > 0 ? 'remboursement' : 'correction');

  useEffect(() => {
    if (state.ok) onDone();
  }, [state.ts, state.ok]); // eslint-disable-line react-hooks/exhaustive-deps

  function onSubmit(ev) {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => formAction(fd));
  }

  return (
    <form onSubmit={onSubmit} className="pay-form" noValidate>
      <input type="hidden" name="date" value={day} />
      <input type="hidden" name="driverId" value={row.driverId} />
      <p className="muted small fullrow">Journée clôturée : elle reste telle quelle, l’écriture s’ajoute avec son motif et apparaît dans le rapport.</p>
      <fieldset className="field radios fullrow">
        <legend>Type d’écriture</legend>
        <div className="row">
          {remaining > 0 && (
            <label className="radio">
              <input type="radio" name="kind" value="remboursement" checked={kind === 'remboursement'} onChange={() => setKind('remboursement')} />
              Remboursement du manque ({formatNumber(remaining)})
            </label>
          )}
          <label className="radio">
            <input type="radio" name="kind" value="correction" checked={kind === 'correction'} onChange={() => setKind('correction')} />
            Correction d’une erreur
          </label>
        </div>
      </fieldset>
      {/* key : sans elle, React réutiliserait les mêmes champs en changeant de type d'écriture,
          et « Attendu corrigé » garderait la valeur saisie dans « Montant remboursé » */}
      {kind === 'remboursement' ? (
        <>
          <label className="field" key="amount">
            <span>Montant remboursé (FCFA)</span>
            <input name="amount" inputMode="numeric" defaultValue={remaining} />
          </label>
          <label className="field" key="method">
            <span>Mode</span>
            <select name="method" defaultValue="especes">
              {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
                <option key={k} value={k}>{label}</option>
              ))}
            </select>
          </label>
        </>
      ) : (
        <>
          <label className="field" key="expected">
            <span>Attendu corrigé (FCFA)</span>
            <input name="expected" inputMode="numeric" defaultValue={row.expected} />
          </label>
          <label className="field" key="paid">
            <span>Versé corrigé (FCFA)</span>
            <input name="paid" inputMode="numeric" defaultValue={row.paid} />
          </label>
        </>
      )}
      <label className="field grow">
        <span>Motif (obligatoire)</span>
        <input name="reason" autoComplete="off" placeholder={kind === 'remboursement' ? 'Ex. : rattrapage du 21/10' : 'Ex. : montant mal saisi, reçu n° 124'} />
      </label>
      <div className="pay-buttons">
        <button type="submit" className="btn primary" disabled={pending}><Send size={16} aria-hidden="true" />Enregistrer l’écriture</button>
      </div>
      {state.error && <p className="form-error" role="alert">{state.error}</p>}
    </form>
  );
}
