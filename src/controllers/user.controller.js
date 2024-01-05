import {asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";



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
 const existedUser= await User.findOne({
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
//  const coverImageLocalPath=req.files?.coverImage[0]?.path
 let coverImageLocalPath;
 if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length>0)
 {
  coverImageLocalPath=req.files.coverImage[0].path
 }
 if(!avatarLocalPath)
 {
    throw new ApiError(400 ,"Avatar file is required")
 }

 // 5.  Step them to cloudinary  since it will take time to upload thats why await
  const avatar=await uploadOnCloudinary(avatarLocalPath)
let coverImage;
  if(coverImageLocalPath)
  {
   coverImage= await uploadOnCloudinary(coverImageLocalPath);
  }
  

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
     username,

   })

   // 8 . check whether user is created or not and return user detail except password ,refreshtoken
   const createdUser= await  User.findOne(user._id).select(
    "-password -refreshToken"
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

//method to generate tokens when user login
const generateAccessAndRefreshToken =async(userId)=>
{
  try{
   const user= await User.findById(userId);
   //generate access token
   
    const accessToken=await  user.generateAccessToken();
    const refreshToken =await  user.generateRefreshToken();
    
    
    //save refreshtoken in db
    user.refreshToken=refreshToken;
      await user.save({validateBeforeSave:false})
       return {accessToken, refreshToken}


  }
  catch(error)
  {
    throw new ApiError(500 ,"Something went wrong while generating tokens..")
  }


}
 // method to login
const loginUser=asyncHandler(async (req ,res)=>{

  // 1. get req.body->data 
  const {username ,email ,password}=req.body
  

  //2. now check  whether user has entered email or username anyone of both

  if(!(username ||email))
  {
    throw new ApiError(400 ,"Username or Email required...")
  }

  // 3 . check whether user  exist with same  username or email in db or not
   const user=  await User.findOne({
     $or:[{email} ,{username}]
    })
     if(!user)
     {
      throw new ApiError(404 ,"User not exists.Please signIn to Continue.") 
     }
     //4 . if user exists then check password
     //take user not User (this is for db coming directly from db)
     //user is variable which holds information which is send bt User.findOne
      const isPasswordValid = await  user.isPasswordCorrect(password)
      if(!isPasswordValid)
      {
        throw new ApiError(401," Incorrect Credentials please login again.")
      }

      //5. generating accessToken & RefreshToken since we will use it multiple times so creating method
      const {accessToken ,refreshToken }= await  generateAccessAndRefreshToken(user._id);
      console.log("accessToken",accessToken);
      console.log("refreshToken" ,refreshToken);

      //getting user who is loggged in
      const loggedInUser=await User.findById(user._id).select("-password -refreshToken");
      console.log("loggedInUser Data" ,loggedInUser);

      //6 . send cookies create options  httponly means cookies cant be modified from frontrnd
       
      const options={
          httpOnly: true,
          secure: true
      }
      return res
      .status(200)
      .cookie("accessToken", accessToken, options)
      .cookie("refreshToken", refreshToken, options)
      .json(
          new ApiResponse(
              200, 
              {
                  user: loggedInUser, accessToken, refreshToken
              },
              "User logged In Successfully"
          )
      )
})


// Method to Logout user
const logOutUser= asyncHandler(async(req ,res)=>{
   //since we have used middleware(auth) where we have got new user method
   // 1. we will fing user in db with help of user._id that we have got byd ecryptiong jwt in authh middleware
    //2 . then update refreshtoken to undefined
    console.log("req.user._id = ",req.user._id);
        await User.findByIdAndUpdate(
          
        req.user._id,
        {
          $set:{ refreshToken :undefined}
        },
          {  
            new:true
          }
        
       )
       //3. now delete the cookie

       const options={
        httpOnly:true,
        secure:true
    }  
    return res.status(200)
    .clearCookie("accessToken" ,options)
    .clearCookie("refreshToken" ,options)
    .json(new ApiResponse ( 200 ,{} ,"User loged out succesfully"))
})


// method to refreshAccesstoken  when it expires use it when we are using refresh token in our project
const refreshAccessToken=asyncHandler(async(req ,res)=>
{
    const incomingRefreshToken =req.cookies.refreshToken ||req.body.refreshToken;
    if(!incomingRefreshToken)
    {
      throw new ApiError(401 ,"Unauthorized request");
    }
    // now check whether its correct
   try {
      const decodedToken=jwt.verify(incomingRefreshToken , process.env.ACCESS_TOKEN_SECRET);
 
      //now find user in db using _id that we got from decoded token
      const user=await User.findById(decodedToken?._id);
      if(!user)
      {
       throw new ApiError(401 ,"Invalid Refresh Token")
      }
       //match refresh token  from db
       if(incomingRefreshToken!= user?.refreshToken)
       {
         throw new ApiError(401 ,"Invalid refresh token not matched stored token")
       }
       const options={
         httpOnly:true,
         secure:true
       }
       const {accessToken ,newRefreshToken }= await  generateAccessAndRefreshToken(user._id);
       return res.status(200).cookie("accessToken" ,accessToken ,options)
       .cookie("refreshToken" ,newRefreshToken ,options)
       .json(new ApiResponse(200 ,
         { accessToken ,refreshToken:newRefreshToken},
         "Access token refreshed"
         ))
   } catch (error) {
    throw new ApiError(401 ,error?.message || "something went wrong while refreshing token...")
    
   }
})

export {registerUser, loginUser ,logOutUser ,refreshAccessToken}