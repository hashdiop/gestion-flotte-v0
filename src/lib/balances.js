import mongoose from 'mongoose';
import Payment from '@/models/Payment';
import PaymentAdjustment from '@/models/PaymentAdjustment';

// Solde des chauffeurs : versements saisis + écritures correctrices (remboursements, corrections).
// Renvoie Map(driverId → { expected, paid, due, unpaid, last }) ; due > 0 = le chauffeur doit de l'argent.
export async function driverBalances(driverId) {
  const match = driverId ? { driver: new mongoose.Types.ObjectId(String(driverId)) } : {};
  const [payments, adjustments] = await Promise.all([
    Payment.aggregate([
      { $match: match },
      {
        $group: {
          _id: '$driver',
          expected: { $sum: '$expected' },
          paid: { $sum: '$paid' },
          unpaid: { $sum: { $cond: [{ $and: [{ $gt: ['$expected', 0] }, { $eq: ['$paid', 0] }] }, 1, 0] } },
          last: { $max: '$date' },
        },
      },
    ]),
    PaymentAdjustment.aggregate([
      { $match: match },
      { $group: { _id: '$driver', expected: { $sum: '$deltaExpected' }, paid: { $sum: '$deltaPaid' } } },
    ]),
  ]);
  const adjOf = new Map(adjustments.map((a) => [String(a._id), a]));
  const result = new Map();
  for (const p of payments) {
    const a = adjOf.get(String(p._id));
    const expected = p.expected + (a?.expected ?? 0);
    const paid = p.paid + (a?.paid ?? 0);
    result.set(String(p._id), { expected, paid, due: expected - paid, unpaid: p.unpaid, last: p.last });
  }
  return result;
}
