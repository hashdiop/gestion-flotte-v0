import { Clock, ShieldCheck, UserPlus, Users } from 'lucide-react';
import Badge from '@/components/Badge';
import Denied from '@/components/Denied';
import PageHeader from '@/components/PageHeader';
import { CreateUserForm, UserRowActions } from '@/components/UserForms';
import { domainVars } from '@/components/domains';
import { connectDB } from '@/lib/db';
import { formatDate } from '@/lib/format';
import { can, ROLES } from '@/lib/roles';
import { getSession } from '@/lib/session';
import User from '@/models/User';

export const metadata = { title: 'Comptes · Gestion de flotte' };

const initials = (name) => name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase();

export default async function AccountsPage() {
  const me = await getSession();
  if (!can(me, 'manageUsers')) return <Denied />;

  await connectDB();
  const users = await User.find().sort({ active: -1, role: 1, name: 1 }).lean();

  return (
    <>
      <PageHeader
        title="Comptes"
        domain="acc"
        sub="Admin : tout, dont les comptes et la clôture. Gestionnaire : véhicules, chauffeurs, versements, dépenses, documents. Agent : consultation et versements du jour."
      />

      <section className="card">
        <div className="card-h">
          <span className="h-ico">
            <span className="dom sm" style={domainVars('acc')} aria-hidden="true"><UserPlus size={15} /></span>
            <h2>Nouveau compte</h2>
          </span>
        </div>
        <div className="pad top-line">
          <CreateUserForm />
        </div>
      </section>

      <section className="card">
        <div className="card-h">
          <span className="h-ico">
            <span className="dom sm" style={domainVars('acc')} aria-hidden="true"><Users size={15} /></span>
            <h2>Comptes ({users.length})</h2>
          </span>
        </div>
        {users.map((u) => {
          const role = ROLES[u.role];
          const self = String(u._id) === me.uid;
          return (
            <div key={String(u._id)} className={`user-row${u.active ? '' : ' inactive'}`}>
              <span className="ent">
                <span className="av" aria-hidden="true">{initials(u.name)}</span>
                <span className="ent-txt">
                  <span>{u.name}{self && <span className="muted"> (toi)</span>}</span>
                  <span className="muted">{u.email}</span>
                </span>
              </span>
              <span className="user-meta">
                <Badge tone={role?.tone ?? 'neu'} icon={ShieldCheck}>{role?.label}</Badge>
                {!u.active && <Badge tone="neu">Désactivé</Badge>}
                {u.mustChangePassword && u.active && <Badge tone="warn">Mot de passe provisoire</Badge>}
                <span className="muted small" title="Dernière connexion">
                  <Clock size={12} aria-hidden="true" /> {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'jamais'}
                </span>
              </span>
              <UserRowActions
                user={{ id: String(u._id), name: u.name, role: u.role, active: u.active }}
                isSelf={self}
              />
            </div>
          );
        })}
      </section>
    </>
  );
}
