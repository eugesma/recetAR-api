import { Document } from 'mongoose';

export default interface ISupply extends Document {
  id: string;
  name: string;
  activePrinciple: string;
  power: string;
  unity: string;
  firstPresentation: string;
  secondPresentation: string;
  description: string;
  observation: string;
  pharmaceutical_form: string;
}