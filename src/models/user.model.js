import mongoose ,{Schema} from "mongoose";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt"
const userSchema= new Schema({

    username:{
        type:String,
        required:true,
        unique:true,
        index:true,
        lowercase:true,
        trim:true
    },
    
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    
    fullName:{
        type:String,
        required:true,
        index:true,
        trim:true
    },
    
    avatar:{
        type:String, //cloudnary service url it will upload pic on its serrver and will provide url
        required:true,
       
    },
    
    coverImage:{
        type:String,
    },
    watchHistory:{
        type:Schema.Types.ObjectId,
        ref:"Video"
    } ,
    password:{
        type:String,
        required:[true,"Password is Required..."]
    },
    refereshToken:{
        type:String
    }

},
{
    timestamps:true
})
//pre is a hook
//save is  type of middleware
//since it is a middleware it requires next
userSchema.pre("save" , async function (next){
    //if password field is not modified then return next();
    if(!this.isModified("password")) return next();
   this.password=  await bcrypt.hash(this.password ,10);
   next();
})
//we have inserted paassword in db . but to check whether user has entered correct password
//or not then we wiill use .methods it will help to pass methods
userSchema.methods.isPasswordCorrect= async (password)=>{
    // compare password that user has enterd with password store in db  return true or false
      return  await bcrypt.compare(password , this.password )

}
//this both functions for generating jwt tokens
//since will be using this so cant use arrow function
userSchema.methods.generateAccessToken=async function (){
    //selecting payloads required for generating access token
  return   jwt.sign={
    _id:this.id,
    email:this.email,
    username:this.username,
    //naeme of payload: commig from db
    fullName:this.fullName,

   } ,process.env.ACCESS_TOKEN_SECRET ,
   {
    expiresIn:process.env.ACCESS_TOKEN_EXPIRY
   }
}
userSchema.methods.generateRefreshToken =async function(){
    return   jwt.sign={
        _id:this.id,
        email:this.email,
        username:this.username,
        //naeme of payload: commig from db
        fullName:this.fullName,
    
       } ,process.env.REFRESH_TOKEN_SECRET ,
       {
        expiresIn:process.env.REFRESH_TOKEN_EXPIRY
       }
}
export const User = mongoose.model("User" ,userSchema) 