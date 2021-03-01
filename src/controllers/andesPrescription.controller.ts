import { Request, Response } from 'express';

class AndesPrescriptionController {

  public create = async (req: Request, res: Response): Promise<Response> => {
    try{
      const body = req.body;
      const params = req.params;
      console.log( body, params);
    
      return res.status(200).json( { msg: "Success", body: req.body} );
    }catch(err){
      console.log(err);
      return res.status(500).json('Server Error');
    }
  }

}

export default new AndesPrescriptionController();
