import PageHeader from '@/components/PageHeader';
import FilterTabs from '@/components/FilterTabs';
import { connectDB } from '@/lib/db';
import { dayKey, mondayOf, parseDay, todayUTC } from '@/lib/dates';
import DayView from './DayView';
import WeekView from './WeekView';

export const metadata = { title: 'Versements · Gestion de flotte' };

export default async function PaymentsPage({ searchParams }) {
  const { vue, date } = await searchParams;
  const today = todayUTC();
  const parsed = parseDay(date);
  // Pas de journée future : on revient à aujourd'hui
  const day = parsed && parsed <= today ? parsed : today;
  const week = vue === 'semaine';

  await connectDB();
  return (
    <>
      <PageHeader title="Versements" sub="Encaissement journalier par chauffeur, du lundi au samedi" />
      <FilterTabs
        basePath="/versements"
        param="vue"
        current={week ? 'semaine' : ''}
        label="Vue"
        options={[
          { value: '', label: 'Jour' },
          { value: 'semaine', label: 'Semaine' },
        ]}
      />
      {week ? <WeekView monday={mondayOf(day)} /> : <DayView key={dayKey(day)} day={day} />}
    </>
  );
}
