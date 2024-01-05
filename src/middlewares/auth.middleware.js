import jwt  from "jsonwebtoken"
import { User } from "../models/user.model.js"
import { ApiError } from "../utils/ApiError.js"
import { asyncHandler } from "../utils/asyncHandler.js"



 // _ meand res in(req ,res, next) since res is not used we can write this also
export const verifyJWT =asyncHandler(async(req ,_ ,next)=>
{
try {
    //get the token  is user has lofgged through mobile devicethin cokkies are not their so for that
    //we are checking header(Authorization)  and removing (Bearer  ) before token so that we get it in correct formate
     
    const token = req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")
        
        console.log(token);
    //checking whether we have got token or not
    if(!token)
    {
        throw new ApiError(401 ,"Unauthorized request")
    }
    //if we have got token then vertify it with the user who have logged in
    //it will  be decoded with help of ACCESS_TOKEN_SECRET
    const decodedToken =jwt.verify(token , process.env.ACCESS_TOKEN_SECRET)
    console.log("DecodedToken=",decodedToken)
    
    //this decodedToken will have all info which we have passed while creating it 
    //we wiill take use of_id
         const  user =await User.findById(decodedToken?._id).select("-password -refreshToken")
         if(!user)  
         
         {
            throw new ApiError(401 ,"Invalid Access Token")
         }
         //if we have got user 
         //.user can be anyname for ex harsh etc
         req.user=user;
         next()
} catch (error) {
    throw new ApiError(401 ,"something went wrong while logout ")
    
}
})