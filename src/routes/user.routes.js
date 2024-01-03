import {Router} from  "express"
import { logOutUser, loginUser, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { vertifyJWT } from "../middlewares/auth.middleware.js";

const router= Router();

//3. now router will go to /register 
// router.route("/register").post(registerUser)
//4. since we  have to also upload two files that we will do here by using middleware(upload)
router.route("/register").post(
    upload.fields([
        {
            name:"avatar", //name should be same as field name on frontend
            maxCount:1
        },{
            name:"coverImage",
            maxCount:1
        }
    ]),
    registerUser)
    
router.route("/login").post(loginUser) ;
//using Middleware created by me 
router.route("/logout").post(vertifyJWT , logOutUser);

export default router;