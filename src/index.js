import { app } from './app.js';
import connectDB from './db/index.js';
import  dotenv from 'dotenv'
const port=process.env.PORT||8000;

// console.log(process.env);
dotenv.config({
    path:'./env'
})
//since its asynchronus so it will return promises
//for this we are doing .then
connectDB()
.then(()=>{
    app.listen(port , ()=>{
        console.log(`Server Listening on port : ${port}`);
    });
})
.catch( ()=>{
    console.log("Mongodb connection failed!!");
})


















//THIS IS ONE WAY OF CONNECTING MONGODB USING  IIF()()
// import mongoose from "mongoose";
// import { DB_NAME } from "./contasts";




//  ;( async () =>{
//       try{
//         await mongoose.connect(`${procee.env.MONGODB_URI}/${DB_NAME}`)
//        }
//       catch(error){
//        console.log("Unable to connect to db" ,error);
//       }
//  })()
