import Link from 'next/link';
import mongoose from 'mongoose';
import PageHeader from '@/components/PageHeader';
import Badge from '@/components/Badge';
import { connectDB } from '@/lib/db';
import { dayKey, todayUTC } from '@/lib/dates';
import { formatDate, formatFCFA, formatNumber } from '@/lib/format';
import { EXPENSE_CATEGORIES, EXPENSE_TYPES, categoryLabel } from '@/lib/expense-categories';
import { vehicleOptions } from '@/lib/vehicle-options';
import Expense from '@/models/Expense';

export const metadata = { title: 'Dépenses · Gestion de flotte' };

const monthFmt = new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' });

// « AAAA-MM » → premier jour du mois (UTC), ou null
function parseMonth(s) {
  if (typeof s !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return null;
  return new Date(`${s}-01T00:00:00Z`);
}
const addMonths = (d, n) => new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
const monthKey = (d) => dayKey(d).slice(0, 7);

export default async function ExpensesPage({ searchParams }) {
  const sp = await searchParams;
  const thisMonth = addMonths(todayUTC(), 0);
  const parsed = parseMonth(sp.mois);
  const month = parsed && parsed <= thisMonth ? parsed : thisMonth;
  const type = EXPENSE_TYPES[sp.type] ? sp.type : '';
  const vehicle = mongoose.isValidObjectId(sp.vehicule) ? sp.vehicule : '';
  const category = EXPENSE_CATEGORIES.vehicule[sp.categorie] || EXPENSE_CATEGORIES.divers[sp.categorie] ? sp.categorie : '';

  const filter = { deletedAt: null, date: { $gte: month, $lt: addMonths(month, 1) } };
  if (type) filter.type = type;
  if (vehicle) {
    filter.vehicle = new mongoose.Types.ObjectId(vehicle);
    filter.type = 'vehicule';
  }
  if (category) filter.category = category;

  await connectDB();
  const [expenses, byCategory, vehicles] = await Promise.all([
    Expense.find(filter).sort({ date: -1, createdAt: -1 }).populate('vehicle', 'plate brand model').lean(),
    Expense.aggregate([{ $match: filter }, { $group: { _id: '$category', total: { $sum: '$amount' }, n: { $sum: 1 } } }, { $sort: { total: -1 } }]),
    vehicleOptions(vehicle || undefined),
  ]);

  const total = expenses.reduce((s, x) => s + x.amount, 0);
  const totalVehicle = expenses.filter((x) => x.type === 'vehicule').reduce((s, x) => s + x.amount, 0);

  // Total par véhicule (dépenses véhicule de la sélection)
  const perVehicle = new Map();
  for (const x of expenses) {
    if (x.type !== 'vehicule' || !x.vehicle) continue;
    const k = String(x.vehicle._id);
    const cur = perVehicle.get(k) ?? { id: k, plate: x.vehicle.plate, total: 0, n: 0 };
    cur.total += x.amount;
    cur.n += 1;
    perVehicle.set(k, cur);
  }
  const vehicleRows = [...perVehicle.values()].sort((a, b) => b.total - a.total);

  // Conserve les filtres en changeant de mois
  const qs = (m) => {
    const p = new URLSearchParams({ mois: monthKey(m) });
    if (type) p.set('type', type);
    if (vehicle) p.set('vehicule', vehicle);
    if (category) p.set('categorie', category);
    return `/depenses?${p}`;
  };
  const next = addMonths(month, 1);
  const filtered = type || vehicle || category;

  return (
    <>
      <PageHeader title="Dépenses" sub="Par véhicule ou dépenses diverses de l’entreprise">
        <Link href={vehicle ? `/depenses/nouvelle?vehicule=${vehicle}` : '/depenses/nouvelle'} className="btn primary">Ajouter une dépense</Link>
      </PageHeader>

      <div className="daynav">
        <Link href={qs(addMonths(month, -1))} className="btn">← Mois précédent</Link>
        <h2 className="day-title month">{monthFmt.format(month)}</h2>
        {next <= thisMonth && <Link href={qs(next)} className="btn">Mois suivant →</Link>}
      </div>

      <form action="/depenses" className="card pad filters">
        <input type="hidden" name="mois" value={monthKey(month)} />
        <label className="field">
          <span>Type</span>
          <select name="type" defaultValue={type}>
            <option value="">Tous</option>
            {Object.entries(EXPENSE_TYPES).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Véhicule</span>
          <select name="vehicule" defaultValue={vehicle}>
            <option value="">Tous</option>
            {vehicles.map((v) => <option key={v.value} value={v.value}>{v.label}</option>)}
          </select>
        </label>
        <label className="field">
          <span>Catégorie</span>
          <select name="categorie" defaultValue={category}>
            <option value="">Toutes</option>
            {Object.entries(EXPENSE_TYPES).map(([t, tLabel]) => (
              <optgroup key={t} label={tLabel}>
                {Object.entries(EXPENSE_CATEGORIES[t]).map(([k, label]) => <option key={k} value={k}>{label}</option>)}
              </optgroup>
            ))}
          </select>
        </label>
        <div className="form-actions">
          <button type="submit" className="btn">Filtrer</button>
          {filtered && <Link href={`/depenses?mois=${monthKey(month)}`} className="btn">Effacer</Link>}
        </div>
      </form>

      <div className="kpis">
        <div className="card kpi">
          <span className="sub">Total{filtered ? ' (filtré)' : ''}</span>
          <span className="v">{formatFCFA(total)}</span>
        </div>
        <div className="card kpi">
          <span className="sub">Dont véhicules</span>
          <span className="v">{formatFCFA(totalVehicle)}</span>
        </div>
        <div className="card kpi">
          <span className="sub">Dont divers</span>
          <span className="v">{formatFCFA(total - totalVehicle)}</span>
        </div>
      </div>

      <div className="card scroll">
        {expenses.length === 0 ? (
          <p className="empty-state">Aucune dépense pour cette période{filtered ? ' et ces filtres' : ''}.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Concerne</th>
                <th>Catégorie</th>
                <th>Description</th>
                <th className="num">Montant</th>
                <th><span className="sr">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((x) => (
                <tr key={String(x._id)}>
                  <td className="mono">{formatDate(x.date)}</td>
                  <td>
                    {x.type === 'vehicule' && x.vehicle ? (
                      <Link href={`/vehicules/${x.vehicle._id}`} className="ref mono">{x.vehicle.plate}</Link>
                    ) : (
                      <Badge tone="neu">Divers</Badge>
                    )}
                  </td>
                  <td>{categoryLabel(x.category)}</td>
                  <td className="muted small">{x.description || '—'}</td>
                  <td className="num">{formatNumber(x.amount)}</td>
                  <td className="actions-cell"><Link href={`/depenses/${x._id}/modifier`} className="btn small-btn">Modifier</Link></td>
                </tr>
              ))}
              <tr className="total">
                <td colSpan={4}>Total · {expenses.length} dépense{expenses.length > 1 ? 's' : ''}</td>
                <td className="num">{formatNumber(total)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        )}
      </div>

      {expenses.length > 0 && (
        <div className="split">
          <section className="card">
            <div className="card-h"><h2>Par catégorie</h2></div>
            <table>
              <tbody>
                {byCategory.map((c) => (
                  <tr key={c._id}>
                    <td>{categoryLabel(c._id)} <span className="muted small">· {c.n}</span></td>
                    <td className="num">{formatNumber(c.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          {vehicleRows.length > 0 && (
            <section className="card">
              <div className="card-h"><h2>Par véhicule</h2></div>
              <table>
                <tbody>
                  {vehicleRows.map((v) => (
                    <tr key={v.id}>
                      <td className="mono"><Link href={`/vehicules/${v.id}`} className="ref">{v.plate}</Link> <span className="muted small">· {v.n}</span></td>
                      <td className="num">{formatNumber(v.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
        </div>
      )}
    </>
  );
}
