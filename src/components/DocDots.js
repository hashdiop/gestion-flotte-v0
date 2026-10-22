import { BadgeCheck, ClipboardCheck, IdCard, ShieldCheck, Ticket } from 'lucide-react';
import { DOCUMENT_TYPES } from '@/lib/document-types';
import { daysLabel, documentStatus } from '@/lib/documents';

export const DOC_ICONS = {
  carte_grise: IdCard,
  autorisation_transport: BadgeCheck,
  assurance: ShieldCheck,
  visite_technique: ClipboardCheck,
  vignette: Ticket,
};

const TONE_VARS = {
  ok: { background: 'var(--ok-bg)', color: 'var(--ok-fg)' },
  warn: { background: 'var(--warn-bg)', color: 'var(--warn-fg)' },
  bad: { background: 'var(--bad-bg)', color: 'var(--bad-fg)' },
};

// Les 5 documents d'un véhicule en mini-icônes colorées par état ; le détail au survol
export default function DocDots({ docsByType = {}, today }) {
  return (
    <span className="docdots" role="list" aria-label="Documents">
      {Object.entries(DOCUMENT_TYPES).map(([type, t]) => {
        const s = documentStatus(docsByType[type], today);
        const Icon = DOC_ICONS[type];
        const tip = `${t.label} : ${s.label}${s.days !== null && s.key !== 'ok' ? ` (${daysLabel(s.days)})` : ''}`;
        return (
          // title (infobulle native) : une infobulle CSS serait coupée par le tableau qui défile
          <span key={type} role="listitem" title={tip} aria-label={tip} style={TONE_VARS[s.tone] ?? TONE_VARS.ok}>
            <Icon size={14} aria-hidden="true" />
          </span>
        );
      })}
    </span>
  );
}
