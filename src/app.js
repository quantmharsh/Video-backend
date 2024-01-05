import  express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import e from "cors";
const app = express();
//using cors
// app.use(cors())
app.use(cors(
    {
        origin:process.env.CORS_ORIGIN,
        credentials:true
    }
))
    //for getting data in json formate can do this also
    // app.use(express.json())
  //making limit for 
app.use(express.json( {limit:'40kb'}))
//for getting data from url we will use encoder
   // app.use(express.urlencoded())
app.use(express.urlencoded({ extended:true ,limit:"40kb"}));
//if we want to store pic , files or folder in our server for this we use 
//it is name of our public folder keep it same as folder name
app.use(express.static("public"))

//for cookies
app.use(cookieParser());


//Setting up routes
//1. importing routes
import userRouter  from "./routes/user.routes.js"
//2. routes declaration user  gos  to /users  then userRouter will handle next step
app.use("/api/v1/users" ,userRouter);
export {app}