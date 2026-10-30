import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

// Contrôle de santé (Docker, supervision) : public, il ne révèle rien sur la base
export async function GET() {
  try {
    await connectDB();
    return Response.json({ status: 'ok' });
  } catch {
    return Response.json({ status: 'error' }, { status: 503 });
  }
}
