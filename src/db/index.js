import mongoose from "mongoose";
import {DB_NAME} from "../contasts.js";
const connectDB= async()=>{
    
    try{
   const  connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
   console.log(`Mongodb connected to host : ${connectionInstance.connection.host}`);
    }
    catch(error)
    {
        console.log("Connection to db Unsuccesfull" ,error)
    }
}
export default connectDB