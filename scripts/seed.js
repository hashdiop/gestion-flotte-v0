// Données de démonstration reprises de docs/maquette/Gestion flotte V2.html (fictives).
// Usage : npm run seed            → refuse si des véhicules ou chauffeurs existent déjà
//         npm run seed -- --reset → vide véhicules, chauffeurs, affectations, versements, dépenses et documents, puis réinsère la démo
import mongoose from 'mongoose';
import Vehicle from '../src/models/Vehicle.js';
import Driver from '../src/models/Driver.js';
import Assignment from '../src/models/Assignment.js';
import Payment from '../src/models/Payment.js';
import Expense from '../src/models/Expense.js';
import VehicleDocument from '../src/models/VehicleDocument.js';

const VEHICLES = [
  { plate: 'DK-4821-AF', brand: 'Toyota', model: 'Corolla', year: 2019, color: 'Blanc', mileage: 98400, dailyRate: 15000 },
  { plate: 'DK-3307-BC', brand: 'Hyundai', model: 'Accent', year: 2020, color: 'Gris', mileage: 74300, dailyRate: 13000 },
  { plate: 'DK-9154-AD', brand: 'Kia', model: 'Rio', year: 2017, color: 'Blanc', mileage: 151200, dailyRate: 13000, status: 'en_atelier', notes: 'Remplacement embrayage en cours.' },
  { plate: 'DK-1196-AG', brand: 'Renault', model: 'Symbol', year: 2018, color: 'Gris', mileage: 120300, dailyRate: 13000, notes: 'Véhicule de réserve.' },
  { plate: 'DK-6612-BA', brand: 'Peugeot', model: '301', year: 2021, color: 'Noir', mileage: 61250, dailyRate: 15000 },
  { plate: 'DK-2078-AE', brand: 'Toyota', model: 'Yaris', year: 2018, color: 'Rouge', mileage: 142000, dailyRate: 13000, notes: 'Compteur défectueux : kilométrage estimé.' },
  { plate: 'DK-5539-AC', brand: 'Dacia', model: 'Logan', year: 2022, color: 'Blanc', mileage: 88700, dailyRate: 12000 },
  { plate: 'DK-8840-BB', brand: 'Suzuki', model: 'Dzire', year: 2021, color: 'Bleu', mileage: 79800, dailyRate: 12000 },
];

// Numéros clairement fictifs (77 000 00 0X)
const DRIVERS = [
  { firstName: 'Ibrahima', lastName: 'Fall', phone: '77 000 00 01', hiredAt: '2024-03-01' },
  { firstName: 'Cheikh', lastName: 'Ndiaye', phone: '77 000 00 02', hiredAt: '2024-07-01' },
  { firstName: 'Ousmane', lastName: 'Sarr', phone: '77 000 00 03', hiredAt: '2023-11-01' },
  { firstName: 'Mamadou', lastName: 'Ba', phone: '77 000 00 04', hiredAt: '2025-01-01' },
  { firstName: 'Abdoulaye', lastName: 'Gueye', phone: '77 000 00 05', hiredAt: '2024-05-01' },
  { firstName: 'Pape', lastName: 'Diallo', phone: '77 000 00 06', hiredAt: '2026-09-02' },
  { firstName: 'Modou', lastName: 'Faye', phone: '77 000 00 07', hiredAt: '2025-03-01' },
].map((d) => ({ ...d, address: 'Dakar', hiredAt: day(d.hiredAt) }));

// Affectations de la maquette : [chauffeur, plaque, début, fin, motif].
// Ousmane Sarr passe sur le véhicule de réserve pendant la réparation de son Kia Rio.
const ASSIGNMENTS = [
  ['Ibrahima Fall', 'DK-4821-AF', '2024-03-01', null, 'Attitré'],
  ['Cheikh Ndiaye', 'DK-3307-BC', '2024-07-01', null, 'Attitré'],
  ['Ousmane Sarr', 'DK-9154-AD', '2023-11-01', '2026-10-15', 'Attitré'],
  ['Ousmane Sarr', 'DK-1196-AG', '2026-10-15', null, 'Temporaire pendant la réparation de DK-9154-AD'],
  ['Mamadou Ba', 'DK-6612-BA', '2025-01-01', null, 'Attitré'],
  ['Abdoulaye Gueye', 'DK-2078-AE', '2024-05-01', null, 'Attitré'],
  ['Pape Diallo', 'DK-5539-AC', '2026-09-02', null, 'Attitré'],
  ['Modou Faye', 'DK-8840-BB', '2025-03-01', null, 'Attitré'],
];

// Versements : la semaine du 12 au 17 octobre de la maquette, puis lundi 19 et mardi 20 (tout payé).
// Une colonne par jour de PAY_DAYS ; null = pas de saisie (autre véhicule ce jour-là).
const EARLY_PAY_DAYS = ['2026-10-01', '2026-10-02', '2026-10-03', '2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09', '2026-10-10'];
const PAY_DAYS = ['2026-10-12', '2026-10-13', '2026-10-14', '2026-10-15', '2026-10-16', '2026-10-17', '2026-10-19', '2026-10-20'];
const PAYMENTS = [
  ['Ibrahima Fall', 'DK-4821-AF', 'especes', [15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000]],
  ['Cheikh Ndiaye', 'DK-3307-BC', 'especes', [13000, 13000, 9000, 13000, 13000, 13000, 13000, 13000]],
  ['Ousmane Sarr', 'DK-9154-AD', 'especes', [13000, 13000, 13000, null, null, null, null, null]],
  ['Ousmane Sarr', 'DK-1196-AG', 'especes', [null, null, null, 13000, 13000, 13000, 13000, 13000]],
  ['Mamadou Ba', 'DK-6612-BA', 'mobile_money', [15000, 15000, 15000, 15000, 15000, 15000, 15000, 15000]],
  ['Abdoulaye Gueye', 'DK-2078-AE', 'especes', [13000, 13000, 13000, 13000, 13000, 10000, 13000, 13000]],
  ['Pape Diallo', 'DK-5539-AC', 'especes', [12000, 12000, 12000, 12000, 12000, 0, 12000, 12000]],
  ['Modou Faye', 'DK-8840-BB', 'mobile_money', [12000, 12000, 12000, 12000, 12000, 12000, 12000, 12000]],
];

// Dépenses : réparations et entretiens de la maquette (septembre-octobre), plus quelques dépenses diverses fictives.
// [date, plaque ou null pour « divers », catégorie, montant, description]
const EXPENSES = [
  ['2026-09-20', 'DK-4821-AF', 'reparation', 45000, 'Alternateur'],
  ['2026-09-25', 'DK-3307-BC', 'reparation', 40000, 'Radiateur'],
  ['2026-09-28', 'DK-9154-AD', 'reparation', 35000, 'Démarreur'],
  ['2026-09-30', null, 'loyer', 150000, 'Loyer du bureau, septembre'],
  ['2026-10-01', null, 'loyer', 150000, 'Loyer du bureau, octobre'],
  ['2026-10-05', null, 'salaires', 100000, 'Agent d’exploitation, septembre'],
  ['2026-10-07', 'DK-2078-AE', 'pneus', 3000, 'Crevaison, pneu réparé'],
  ['2026-10-11', 'DK-1196-AG', 'pneus', 25000, 'Pneus avant (2)'],
  ['2026-10-11', 'DK-5539-AC', 'pieces', 20000, 'Courroie d’accessoires'],
  ['2026-10-12', null, 'telephone_internet', 10000, 'Crédit téléphone et internet'],
  ['2026-10-15', 'DK-9154-AD', 'reparation', 95000, 'Remplacement embrayage'],
  ['2026-10-16', 'DK-4821-AF', 'lavage', 2000, 'Lavage complet'],
  ['2026-10-19', null, 'fournitures', 7500, 'Cahiers de caisse et stylos'],
];

// Documents : un jeu complet par véhicule, avec les cas de la maquette (expiré, critique, à renouveler).
// Échéances par défaut, puis exceptions [plaque, type] → date d'expiration (null = document manquant).
const DOC_DEFAULTS = { carte_grise: null, autorisation_transport: '2027-06-30', assurance: '2027-03-31', visite_technique: '2027-04-30', vignette: '2026-12-31' };
const DOC_OVERRIDES = {
  'DK-2078-AE|visite_technique': '2026-10-12', // expirée (maquette)
  'DK-5539-AC|assurance': '2026-10-24', // critique
  'DK-8840-BB|assurance': '2026-11-05', // à renouveler
  'DK-6612-BA|assurance': '2027-01-15',
  'DK-3307-BC|visite_technique': '2027-02-03',
  'DK-1196-AG|autorisation_transport': 'manquant', // véhicule de réserve : autorisation jamais fournie
};
// Ancienne assurance déjà renouvelée : reste dans l'historique, la nouvelle est « en vigueur »
const DOC_HISTORY = [['DK-4821-AF', 'assurance', '2026-03-31', '2025-04-02']];

function day(s) {
  return new Date(`${s}T00:00:00Z`);
}

const { MONGODB_URI } = process.env;
if (!MONGODB_URI) {
  console.error('MONGODB_URI manquant dans .env.local');
  process.exit(1);
}
const reset = process.argv.includes('--reset');

await mongoose.connect(MONGODB_URI);
try {
  const existing = (await Vehicle.countDocuments()) + (await Driver.countDocuments());
  if (existing && !reset) {
    console.error(`La base contient déjà ${existing} véhicule(s)/chauffeur(s). Relance avec « npm run seed -- --reset » pour les remplacer.`);
    process.exitCode = 1;
  } else {
    if (reset) {
      await Promise.all([
        Vehicle.deleteMany({}),
        Driver.deleteMany({}),
        Assignment.deleteMany({}),
        Payment.deleteMany({}),
        Expense.deleteMany({}),
        VehicleDocument.deleteMany({}),
      ]);
    }
    await Assignment.syncIndexes();
    const vehicles = await Vehicle.insertMany(VEHICLES);
    const drivers = await Driver.insertMany(DRIVERS);
    const vehicleId = Object.fromEntries(vehicles.map((v) => [v.plate, v._id]));
    const driverId = Object.fromEntries(drivers.map((d) => [`${d.firstName} ${d.lastName}`, d._id]));
    await Assignment.insertMany(
      ASSIGNMENTS.map(([name, plate, start, end, reason]) => ({
        driver: driverId[name],
        vehicle: vehicleId[plate],
        startDate: day(start),
        endDate: end ? day(end) : null,
        current: !end,
        reason,
      }))
    );
    const rateOf = Object.fromEntries(vehicles.map((v) => [v.plate, v.dailyRate]));
    const payments = PAYMENTS.flatMap(([name, plate, method, amounts]) =>
      amounts.flatMap((paid, i) =>
        paid === null
          ? []
          : [{
              date: day(PAY_DAYS[i]),
              driver: driverId[name],
              vehicle: vehicleId[plate],
              expected: rateOf[plate],
              paid,
              method: paid > 0 ? method : null,
              note: paid === 0 ? 'Injoignable' : paid < rateOf[plate] ? 'Promet de compléter' : undefined,
            }]
      )
    );
    // Début du mois (1er au 10 octobre) : tout payé, pour que le mois en cours soit complet
    for (const d of EARLY_PAY_DAYS.map(day)) {
      for (const [name, plate, start, end] of ASSIGNMENTS) {
        if (day(start) <= d && (!end || day(end) > d)) {
          payments.push({ date: d, driver: driverId[name], vehicle: vehicleId[plate], expected: rateOf[plate], paid: rateOf[plate], method: 'especes' });
        }
      }
    }
    await Payment.syncIndexes();
    await Payment.insertMany(payments);
    // create() plutôt qu'insertMany : les validateurs croisés type/véhicule/catégorie s'appliquent
    await Expense.create(
      EXPENSES.map(([date, plate, category, amount, description]) => ({
        date: day(date),
        type: plate ? 'vehicule' : 'divers',
        vehicle: plate ? vehicleId[plate] : null,
        category,
        amount,
        description,
      }))
    );
    const documents = vehicles.flatMap((v) =>
      Object.entries(DOC_DEFAULTS).flatMap(([type, def]) => {
        const exp = DOC_OVERRIDES[`${v.plate}|${type}`] ?? def;
        if (exp === 'manquant') return [];
        return [{ vehicle: v._id, type, expiresAt: exp ? day(exp) : null, verifiedAt: day('2026-01-15'), verifiedBy: 'Gestionnaire' }];
      })
    );
    for (const [plate, type, exp, verified] of DOC_HISTORY) {
      documents.push({ vehicle: vehicleId[plate], type, expiresAt: day(exp), verifiedAt: day(verified), verifiedBy: 'Gestionnaire' });
    }
    await VehicleDocument.insertMany(documents);
    console.log(
      `Seed terminé : ${VEHICLES.length} véhicules, ${DRIVERS.length} chauffeurs, ${ASSIGNMENTS.length} affectations, ` +
        `${payments.length} versements, ${EXPENSES.length} dépenses, ${documents.length} documents.`
    );
  }
} finally {
  await mongoose.disconnect();
}
