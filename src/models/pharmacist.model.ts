import { Schema, Model, model } from 'mongoose';
import IPharmacist from '../interfaces/pharmacist.interface';

// Schema
const pharmacistSchema = new Schema({
  enrollment: {
    type: String,
    required: '{PATH} is required',
    unique: true
  },
  last_name: {
    type: String,
    required: '{PATH} is required'
  },
  first_name: {
    type: String,
    required: '{PATH} is required'
  },
  sex: {
    type: String,
    required: '{PATH} is required'
  },
  image: {
    type: String
  },
  createdAt: { 
    type: Date,
    default: Date.now 
  },
  updatedAt: Date,
});

// Model
const Pharmacist: Model<IPharmacist> = model<IPharmacist>('Pharmacist', pharmacistSchema);


export default Pharmacist;