// Crée le compte admin initial, ou remet un compte existant en admin actif avec ce mot de passe.
// Usage : npm run user:admin   (lit ADMIN_EMAIL, ADMIN_PASSWORD et ADMIN_NAME dans .env.local)
//
// En production : on crée ce premier admin une seule fois sur la vraie base, puis, depuis la page
// « Comptes », il crée un autre admin nominatif qui gère ensuite les comptes. Le compte initial
// peut alors être désactivé depuis cette même page.
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { hashPassword } from '../src/lib/password.js';
import { MIN_PASSWORD } from '../src/lib/roles.js';

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Administrateur' } = process.env;

if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('MONGODB_URI, ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env.local');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < MIN_PASSWORD) {
  console.error(`ADMIN_PASSWORD doit contenir au moins ${MIN_PASSWORD} caractères`);
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
const email = ADMIN_EMAIL.trim().toLowerCase();
const existed = await User.exists({ email });
await User.updateOne(
  { email },
  {
    $set: { name: ADMIN_NAME, passwordHash: await hashPassword(ADMIN_PASSWORD), role: 'admin', active: true, mustChangePassword: false },
    // Les sessions ouvertes avec l'ancien mot de passe expirent
    $inc: { sessionVersion: 1 },
    $setOnInsert: { createdBy: 'script user:admin' },
  },
  { upsert: true, runValidators: true }
);
console.log(existed ? `Compte admin mis à jour : ${email}` : `Compte admin créé : ${email}`);
await mongoose.disconnect();
