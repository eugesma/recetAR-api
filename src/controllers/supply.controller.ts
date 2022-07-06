import { Request, Response } from 'express';
import Supply from '../models/supply.model';
import ISupply from '../interfaces/supply.interface';
import { BaseController } from '../interfaces/classes/base-controllers.interface';
import _ from 'lodash';

class SupplyController implements BaseController{

  public index = async (req: Request, res: Response): Promise<Response> => {
    const supplies: ISupply[] = await Supply.find();
    return res.status(200).json({supplies});
  }

  public create = async (req: Request, res: Response): Promise<Response> => {
    const { 
      name,
      activePrinciple,
      power,
      unity,
      firstPresentation,
      secondPresentation,
      description,
      observation,
      pharmaceutical_form
     } = req.body;
    const newSupply: ISupply = new Supply({
      name,
      activePrinciple,
      power,
      unity,
      firstPresentation,
      secondPresentation,
      description,
      observation,
      pharmaceutical_form
    });
    try{
      await newSupply.save();
      return res.status(200).json({ newSupply });
    }catch(err){
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public show = async (req: Request, res: Response): Promise<Response> => {
    try{
      const id: string = req.params.id;
      const supply: ISupply | null = await Supply.findOne({_id: id});
      return res.status(200).json(supply);
    }catch(err){
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public update = async (req: Request, res: Response): Promise<Response> => {
    // "name", "activePrinciple", "pharmaceutical_form", "power", "unity", "firstPresentation", "secondPresentation", "description", "observation"
    // son los campos que permitiremos actualizar.
    const { id } = req.params;
    const values: any = {};
    try{

      _(req.body).forEach((value: string, key: string) => {
        values[key] = value;
          if (!_.isEmpty(value) && _.includes(["name", "activePrinciple", "pharmaceutical_form", "power", "unity", "firstPresentation", "secondPresentation", "description", "observation" ], key)){
        }
      });
      const opts: any = { runValidators: true, new: true };
      const supply: ISupply | null = await Supply.findOneAndUpdate({_id: id}, values, opts);

      return res.status(200).json(supply);
    }catch(e){
      // formateamos los errores de validacion
      if(e.name !== 'undefined' && e.name === 'ValidationError'){
        let errors: { [key: string]: string } = {};
        Object.keys(e.errors).forEach(prop => {
          errors[ prop ] = e.errors[prop].message;
        });
        return res.status(422).json(errors);
      }
      console.log(e);
      return res.status(500).json("Server Error");
    }
  }

  public delete =  async (req: Request, res: Response): Promise<Response> => {
    try{

      const { id } = req.params;
      await Supply.findByIdAndDelete(id);
      return res.status(200).json('deleted');
    }catch(err){
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

  public getByName = async (req: Request, res: Response): Promise<Response> => {
    try{
      const { supplyName } = req.query;
      let target: string = decodeURIComponent(supplyName);
      target = target.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      let search: string = "";
      let supplies: ISupply[];
      // first word should apper in all coincidence
      const words = target.split(" ");
      if(words.length > 1){
        // find by multiple words
        for(let i =  0; i < words.length; i++){
          search += '\"' + words[i].trim() + '\"' + " ";
        }
        supplies = await Supply.find({$text: {$search: search}}).select('name').limit(20);
      }else{
        // find by regex with the first word
        supplies = await Supply.find({name: { $regex: new RegExp( target, "ig")}  }).select('name').limit(20);
      }

      return res.status(200).json(supplies);
    }catch(err){
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

}

export default new SupplyController();
