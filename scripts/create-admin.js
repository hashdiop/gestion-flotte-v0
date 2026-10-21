// Crée le compte gestionnaire, ou met à jour son nom et son mot de passe s'il existe déjà.
// Usage : npm run user:admin   (lit ADMIN_EMAIL, ADMIN_PASSWORD et ADMIN_NAME dans .env.local)
import mongoose from 'mongoose';
import User from '../src/models/User.js';
import { hashPassword } from '../src/lib/password.js';

const { MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME = 'Gestionnaire' } = process.env;

if (!MONGODB_URI || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  console.error('MONGODB_URI, ADMIN_EMAIL et ADMIN_PASSWORD doivent être définis dans .env.local');
  process.exit(1);
}
if (ADMIN_PASSWORD.length < 8) {
  console.error('ADMIN_PASSWORD doit contenir au moins 8 caractères');
  process.exit(1);
}

await mongoose.connect(MONGODB_URI);
const email = ADMIN_EMAIL.trim().toLowerCase();
const existed = await User.exists({ email });
await User.updateOne(
  { email },
  { $set: { name: ADMIN_NAME, passwordHash: await hashPassword(ADMIN_PASSWORD), active: true } },
  { upsert: true, runValidators: true }
);
console.log(existed ? `Compte mis à jour : ${email}` : `Compte créé : ${email}`);
await mongoose.disconnect();
