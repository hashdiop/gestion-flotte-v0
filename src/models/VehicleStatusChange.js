import mongoose from 'mongoose';
import { VEHICLE_STATUS_KEYS } from '../lib/vehicle-status.js';

// Historique des statuts d'un véhicule : à partir de « date » (journée, minuit UTC), le véhicule a « status ».
// Sert à savoir si une journée passée était due (véhicule en atelier ou immobilisé = non dû).
const vehicleStatusChangeSchema = new mongoose.Schema(
  {
    vehicle: { type: mongoose.Schema.Types.ObjectId, ref: 'Vehicle', required: true },
    status: { type: String, enum: VEHICLE_STATUS_KEYS, required: true },
    date: { type: Date, required: true },
    reason: { type: String, trim: true },
  },
  { timestamps: true }
);

vehicleStatusChangeSchema.index({ vehicle: 1, date: 1, createdAt: 1 });

export default mongoose.models.VehicleStatusChange || mongoose.model('VehicleStatusChange', vehicleStatusChangeSchema);
