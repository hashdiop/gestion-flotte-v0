import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

// En développement, Next recharge les modules à chaque modification :
// on garde la connexion sur l'objet global pour ne pas en ouvrir une nouvelle à chaque fois.
let cached = globalThis._mongoose;
if (!cached) cached = globalThis._mongoose = { conn: null, promise: null };

export async function connectDB() {
  if (!MONGODB_URI) throw new Error('MONGODB_URI manquant dans .env.local');
  if (cached.conn) return cached.conn;
  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, { bufferCommands: false });
  }
  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    throw err;
  }
  return cached.conn;
}
