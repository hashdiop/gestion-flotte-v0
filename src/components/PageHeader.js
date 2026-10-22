import InfoTip from './InfoTip';
import { DomainIcon } from './domains';

// En-tête de page : icône de la rubrique, titre, explication en infobulle (ⓘ) et actions à droite
export default function PageHeader({ title, sub, domain, children }) {
  return (
    <div className="top">
      <div className="t">
        {domain && <DomainIcon domain={domain} size={20} className="lg" />}
        <h1>{title}</h1>
        <InfoTip text={sub} />
      </div>
      {children && <div className="actions">{children}</div>}
    </div>
  );
}
