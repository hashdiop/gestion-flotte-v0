import { KeyRound, Mail, ShieldCheck } from 'lucide-react';
import Alert from '@/components/Alert';
import Badge from '@/components/Badge';
import PageHeader from '@/components/PageHeader';
import PasswordForm from '@/components/PasswordForm';
import { domainVars } from '@/components/domains';
import { getSession } from '@/lib/session';
import { ROLES } from '@/lib/roles';

export const metadata = { title: 'Mon compte · Gestion de flotte' };

export default async function MyAccountPage() {
  const me = await getSession();
  const role = ROLES[me.role];

  return (
    <>
      <PageHeader title="Mon compte" domain="acc" />

      {me.mustChangePassword && (
        <Alert tone="warn" icon={KeyRound}>Mot de passe provisoire : choisis-en un nouveau pour continuer</Alert>
      )}

      <section className="card fiche-h">
        <div className="id">
          <span className="dom lg avatar-drv" style={domainVars('acc')} aria-hidden="true">
            {me.name.split(/\s+/).map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
          </span>
          <div className="stack">
            <h2 className="fiche-name">{me.name}</h2>
            <div className="facts">
              <span><Mail size={13} aria-hidden="true" /> {me.email}</span>
            </div>
          </div>
        </div>
        <span className="tip" data-tip={role?.hint}>
          <Badge tone={role?.tone ?? 'neu'} icon={ShieldCheck}>{role?.label}</Badge>
        </span>
      </section>

      <section className="card">
        <div className="card-h">
          <span className="h-ico">
            <span className="dom sm" style={domainVars('acc')} aria-hidden="true"><KeyRound size={15} /></span>
            <h2>Mot de passe</h2>
          </span>
        </div>
        <div className="pad top-line">
          <PasswordForm forced={me.mustChangePassword} />
        </div>
      </section>
    </>
  );
}
