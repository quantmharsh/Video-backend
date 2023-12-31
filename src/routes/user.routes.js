import {Router} from  "express"
import { registerUser } from "../controllers/user.controller.js";

const router= Router();

//3. now router will go to /register 
router.route("/register").post(registerUser)
// router.route("/login").post(loginUser)

export default router;