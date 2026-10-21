import mongoose from 'mongoose';
import { VEHICLE_STATUS_KEYS } from '../lib/vehicle-status.js';

const vehicleSchema = new mongoose.Schema(
  {
    plate: { type: String, required: true, unique: true, uppercase: true, trim: true },
    brand: { type: String, required: true, trim: true },
    model: { type: String, required: true, trim: true },
    year: { type: Number, min: 1980 },
    color: { type: String, trim: true },
    mileage: { type: Number, min: 0, default: 0 },
    dailyRate: { type: Number, required: true, min: 1 }, // FCFA dus par jour ouvré
    status: { type: String, enum: VEHICLE_STATUS_KEYS, default: 'en_service' },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

export default mongoose.models.Vehicle || mongoose.model('Vehicle', vehicleSchema);
