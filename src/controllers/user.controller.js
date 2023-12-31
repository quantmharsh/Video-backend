import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"


//creating a method to register user
const registerUser=  asyncHandler(async (req,res)=>{
//   res.status(200).json({
//     message:"ok"
//   })
//1. get user data from frontend
const {fullName , email ,username ,password}=req.body

//2. check validation
// if(fullName==="")
// {
//     throw new ApiError(400 ,"full Name is Required")
// }
if([ fullName ,username ,password].some((field)=> field?.trim()===""))
{
    throw new ApiError(400 ,"All fields are required");
}
//also complete validation for  email , username etc by own 

//3. checking whether existing user
 const existedUser=User.findOne({
    //it is operator like and , or make array check each index
    $or:[{username} , {email}]
 })
 if(existedUser)
 {
    throw new ApiError(409,"user with  email or username already exists...")
 }

 //4check for images ,avatar image ,cover image
 //since we have used middleware for uploading file it adds some additional functionality to our req
 //[0] indicates property at inedex 0 which is path. ? means check whether it exists or not
 const avatarLocalPath=req.files?.avatar[0]?.path
 const coverImageLocalPath=req.files?.coverImage[0]?.path
 if(!avatarLocalPath)
 {
    throw new ApiError(400 ,"Avatar file is required")
 }

 // 5.  Step them to cloudinary  since it will take time to upload thats why await
  const avatar=await uploadOnCloudinary(avatarLocalPath)
  const coverImage= await uploadOnCloudinary(coverImageLocalPath);

  // 6. check whether it is uploaded or not
  if(!avatar)
  {
    throw new ApiError(400 ,"Avatar file not uploaded")
  }
  //7 . creaate object and upload it on db
   const user=await User.create({
     fullName ,
     avatar : avatar.url ,
     coverImage:coverImage?.url||" ",
     email,
     password,
     username : username.toLowerCase()

   })

   // 8 . check whether user is created or not and return user detail except password ,refreshtoken
   const createdUser= await  User.findOne(user._id).select(
    "-password -refereshToken"
   )
    if(!createdUser)
    {
        throw new ApiError(500 , "Something went wrong while registring a user.")
    }

    // 9. response the user which is created using ApiResponse utils
    // return res.status(201).json(createdUser)
    return res.status(201).json(
        new ApiResponse(200 ,createdUser ,"User registered succesfully")
    )
    

})

export {registerUser,}