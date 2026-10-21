import { connectDB } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const conn = await connectDB();
    return Response.json({ status: 'ok', db: conn.connection.name });
  } catch (err) {
    return Response.json({ status: 'error', message: err.message }, { status: 503 });
  }
}
