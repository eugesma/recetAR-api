import { Router } from 'express';
import authController from '../controllers/auth.controller';

class PublicRoutes{

  constructor(private router: Router = Router()){}

  // deefine your public routes inside of routes function
  public routes(): Router{
    // this.router.get('home', (req: Request, res: Response): Response => { return res.send('Welcome home') } ) // example
    this.router.post('/auth/register', authController.register);
    return this.router;
  }
}

const publicRoutes: PublicRoutes = new PublicRoutes();
export default publicRoutes.routes();
