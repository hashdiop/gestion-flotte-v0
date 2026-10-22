import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/PrintButton';
import { connectDB } from '@/lib/db';
import { formatLongDay, parseDay } from '@/lib/dates';
import { formatDate, formatNumber } from '@/lib/format';
import { PAYMENT_METHODS } from '@/lib/payment-methods';
import DayClosure from '@/models/DayClosure';
import PaymentAdjustment from '@/models/PaymentAdjustment';

export const dynamic = 'force-dynamic';

const timeFmt = new Intl.DateTimeFormat('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' });
const signed = (n) => (n > 0 ? `+${formatNumber(n)}` : n < 0 ? `−${formatNumber(-n)}` : '0');

export async function generateMetadata({ params }) {
  const { date } = await params;
  return { title: `Clôture du ${date} · Gestion de flotte` };
}

// Rapport de clôture : l'état figé au moment de la clôture, puis les écritures passées depuis
export default async function ClosureReportPage({ params }) {
  const { date } = await params;
  const day = parseDay(date);
  if (!day) notFound();
  await connectDB();
  const closure = await DayClosure.findOne({ date: day }).lean();
  if (!closure) notFound();

  const [corrections, refundsReceived] = await Promise.all([
    // Écritures sur cette journée, passées après sa clôture
    PaymentAdjustment.find({ targetDate: day }).sort({ createdAt: 1 }).populate('driver', 'firstName lastName').lean(),
    // Remboursements encaissés ce jour-là (manques de journées précédentes) : ils entrent dans sa caisse
    PaymentAdjustment.find({ entryDate: day, kind: 'remboursement' }).sort({ createdAt: 1 }).populate('driver', 'firstName lastName').lean(),
  ]);
  const gap = closure.cashCounted - closure.cashExpected;
  const name = (d) => (d ? `${d.firstName} ${d.lastName}` : '—');

  return (
    <>
      <div className="row noprint">
        <Link href="/versements/cloture" className="back"><ArrowLeft size={15} aria-hidden="true" />Clôtures</Link>
        <Link href={`/versements?date=${date}`} className="back">Ouvrir la journée</Link>
      </div>

      <article className="doc-paper">
        <header className="report-head">
          <div className="stack">
            <span className="muted small">FLOTTE · Banlieu Transport</span>
            <h1>Rapport de clôture</h1>
            <span className="report-day">{formatLongDay(day)}</span>
          </div>
          <PrintButton />
        </header>

        <p className="muted small">
          Clôturée le {formatDate(closure.closedAt)} à {timeFmt.format(closure.closedAt)} par {closure.closedBy}.
          {closure.convertedCount > 0 && ` ${closure.convertedCount} ligne${closure.convertedCount > 1 ? 's' : ''} sans saisie passée${closure.convertedCount > 1 ? 's' : ''} « Non versé » à la clôture.`}
        </p>

        <div className="report-totals">
          <div><span>Attendu</span><b>{formatNumber(closure.expected)}</b></div>
          <div><span>Encaissé</span><b>{formatNumber(closure.paid)}</b></div>
          <div><span>Manque</span><b>{formatNumber(Math.max(0, closure.expected - closure.paid))}</b></div>
          <div><span>Lignes non versées</span><b>{closure.missingCount}</b></div>
        </div>

        <h2>Versements</h2>
        <table>
          <thead>
            <tr>
              <th>Véhicule</th>
              <th>Chauffeur</th>
              <th className="num">Attendu</th>
              <th className="num">Versé</th>
              <th>Mode</th>
              <th>Statut</th>
            </tr>
          </thead>
          <tbody>
            {closure.lines.map((l) => (
              <tr key={String(l.driver)}>
                <td className="mono">{l.plate}</td>
                <td>{l.driverName}</td>
                <td className="num">{formatNumber(l.expected)}</td>
                <td className="num">{formatNumber(l.paid)}</td>
                <td className="small">{l.method ? PAYMENT_METHODS[l.method] : '—'}</td>
                <td className="small">{l.status}{l.note ? <span className="muted"> · {l.note}</span> : null}</td>
              </tr>
            ))}
            <tr className="tot">
              <td colSpan={2}>Total</td>
              <td className="num">{formatNumber(closure.expected)}</td>
              <td className="num">{formatNumber(closure.paid)}</td>
              <td colSpan={2} />
            </tr>
          </tbody>
        </table>

        <h2>Caisse</h2>
        <table>
          <tbody>
            <tr><td>Versements en espèces</td><td className="num">{formatNumber(closure.byMethod.especes)}</td></tr>
            <tr><td>Remboursements en espèces reçus ce jour</td><td className="num">{formatNumber(closure.cashExpected - closure.byMethod.especes)}</td></tr>
            <tr><td><b>Espèces attendues</b></td><td className="num"><b>{formatNumber(closure.cashExpected)}</b></td></tr>
            <tr><td><b>Espèces comptées</b></td><td className="num"><b>{formatNumber(closure.cashCounted)}</b></td></tr>
            <tr><td>Écart de caisse</td><td className={`num${gap < 0 ? ' neg' : ''}`}>{gap === 0 ? 'Caisse juste' : signed(gap)}</td></tr>
            <tr><td className="muted">Mobile money (hors caisse)</td><td className="num muted">{formatNumber(closure.byMethod.mobile_money)}</td></tr>
          </tbody>
        </table>
        {closure.note && <p><b>Note :</b> {closure.note}</p>}

        {refundsReceived.length > 0 && (
          <>
            <h2>Remboursements reçus ce jour</h2>
            <table>
              <tbody>
                {refundsReceived.map((a) => (
                  <tr key={String(a._id)}>
                    <td>{name(a.driver)}</td>
                    <td className="small">Manque du {formatDate(a.targetDate)} · {PAYMENT_METHODS[a.method]} · {a.reason}</td>
                    <td className="num">{formatNumber(a.deltaPaid)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        <h2>Écritures passées après la clôture</h2>
        {corrections.length === 0 ? (
          <p className="muted small">Aucune : la journée est telle qu’à sa clôture.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Le</th>
                <th>Chauffeur</th>
                <th>Type</th>
                <th className="num">Attendu</th>
                <th className="num">Versé</th>
                <th>Motif · par</th>
              </tr>
            </thead>
            <tbody>
              {corrections.map((a) => (
                <tr key={String(a._id)}>
                  <td className="mono">{formatDate(a.createdAt)}</td>
                  <td>{name(a.driver)}</td>
                  <td className="small">{a.kind === 'remboursement' ? `Remboursement (${PAYMENT_METHODS[a.method]})` : 'Correction'}</td>
                  <td className="num">{signed(a.deltaExpected)}</td>
                  <td className="num">{signed(a.deltaPaid)}</td>
                  <td className="small">{a.reason} · {a.by}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </article>
    </>
  );
}
