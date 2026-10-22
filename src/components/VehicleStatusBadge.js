import { Archive, Ban, CircleCheck, Wrench } from 'lucide-react';
import Badge from './Badge';
import { VEHICLE_STATUS } from '@/lib/vehicle-status';

const ICONS = { en_service: CircleCheck, en_atelier: Wrench, immobilise: Ban, sorti_du_parc: Archive };

export default function VehicleStatusBadge({ status }) {
  const s = VEHICLE_STATUS[status];
  return <Badge tone={s.tone} icon={ICONS[status]}>{s.label}</Badge>;
}
