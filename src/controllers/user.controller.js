import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

//creating a method to register user
const registerUser = asyncHandler(async (req, res) => {
	//   res.status(200).json({
	//     message:"ok"
	//   })
	//1. get user data from frontend
	const { fullName, email, username, password } = req.body;

	//2. check validation
	// if(fullName==="")
	// {
	//     throw new ApiError(400 ,"full Name is Required")
	// }
	if ([fullName, username, password].some((field) => field?.trim() === "")) {
		throw new ApiError(400, "All fields are required");
	}
	//also complete validation for  email , username etc by own

	//3. checking whether existing user
	const existedUser = await User.findOne({
		//it is operator like and , or make array check each index
		$or: [{ username }, { email }],
	});
	if (existedUser) {
		throw new ApiError(409, "user with  email or username already exists...");
	}

	//4check for images ,avatar image ,cover image
	//since we have used middleware for uploading file it adds some additional functionality to our req
	//[0] indicates property at inedex 0 which is path. ? means check whether it exists or not
	const avatarLocalPath = req.files?.avatar[0]?.path;
	//  const coverImageLocalPath=req.files?.coverImage[0]?.path
	let coverImageLocalPath;
	if (
		req.files &&
		Array.isArray(req.files.coverImage) &&
		req.files.coverImage.length > 0
	) {
		coverImageLocalPath = req.files.coverImage[0].path;
	}
	if (!avatarLocalPath) {
		throw new ApiError(400, "Avatar file is required");
	}

	// 5.  Step them to cloudinary  since it will take time to upload thats why await
	const avatar = await uploadOnCloudinary(avatarLocalPath);
	let coverImage;
	if (coverImageLocalPath) {
		coverImage = await uploadOnCloudinary(coverImageLocalPath);
	}

	// 6. check whether it is uploaded or not
	if (!avatar) {
		throw new ApiError(400, "Avatar file not uploaded");
	}
	//7 . creaate object and upload it on db
	const user = await User.create({
		fullName,
		avatar: avatar.url,
		coverImage: coverImage?.url || " ",
		email,
		password,
		username,
	});

	// 8 . check whether user is created or not and return user detail except password ,refreshtoken
	const createdUser = await User.findOne(user._id).select(
		"-password -refreshToken"
	);
	if (!createdUser) {
		throw new ApiError(500, "Something went wrong while registring a user.");
	}

	// 9. response the user which is created using ApiResponse utils
	// return res.status(201).json(createdUser)
	return res
		.status(201)
		.json(new ApiResponse(200, createdUser, "User registered succesfully"));
});

//method to generate tokens when user login
const generateAccessAndRefreshToken = async (userId) => {
	try {
		const user = await User.findById(userId);
		//generate access token

		const accessToken = await user.generateAccessToken();
		const refreshToken = await user.generateRefreshToken();

		//save refreshtoken in db
		user.refreshToken = refreshToken;
		await user.save({ validateBeforeSave: false });
		return { accessToken, refreshToken };
	} catch (error) {
		throw new ApiError(500, "Something went wrong while generating tokens..");
	}
};
// method to login
const loginUser = asyncHandler(async (req, res) => {
	// 1. get req.body->data
	const { username, email, password } = req.body;

	//2. now check  whether user has entered email or username anyone of both

	if (!(username || email)) {
		throw new ApiError(400, "Username or Email required...");
	}

	// 3 . check whether user  exist with same  username or email in db or not
	const user = await User.findOne({
		$or: [{ email }, { username }],
	});
	if (!user) {
		throw new ApiError(404, "User not exists.Please signIn to Continue.");
	}
	//4 . if user exists then check password
	//take user not User (this is for db coming directly from db)
	//user is variable which holds information which is send bt User.findOne
	const isPasswordValid = await user.isPasswordCorrect(password);
	if (!isPasswordValid) {
		throw new ApiError(401, " Incorrect Credentials please login again.");
	}

	//5. generating accessToken & RefreshToken since we will use it multiple times so creating method
	const { accessToken, refreshToken } = await generateAccessAndRefreshToken(
		user._id
	);
	console.log("accessToken", accessToken);
	console.log("refreshToken", refreshToken);

	//getting user who is loggged in
	const loggedInUser = await User.findById(user._id).select(
		"-password -refreshToken"
	);
	console.log("loggedInUser Data", loggedInUser);

	//6 . send cookies create options  httponly means cookies cant be modified from frontrnd

	const options = {
		httpOnly: true,
		secure: true,
	};
	return res
		.status(200)
		.cookie("accessToken", accessToken, options)
		.cookie("refreshToken", refreshToken, options)
		.json(
			new ApiResponse(
				200,
				{
					user: loggedInUser,
					accessToken,
					refreshToken,
				},
				"User logged In Successfully"
			)
		);
});

// Method to Logout user
const logOutUser = asyncHandler(async (req, res) => {
	//since we have used middleware(auth) where we have got new user method
	// 1. we will fing user in db with help of user._id that we have got byd ecryptiong jwt in authh middleware
	//2 . then update refreshtoken to undefined
	console.log("req.user._id = ", req.user._id);
	await User.findByIdAndUpdate(
		req.user._id,
		{
			$set: { refreshToken: undefined },
		},
		{
			new: true,
		}
	);
	//3. now delete the cookie

	const options = {
		httpOnly: true,
		secure: true,
	};
	return res
		.status(200)
		.clearCookie("accessToken", options)
		.clearCookie("refreshToken", options)
		.json(new ApiResponse(200, {}, "User loged out succesfully"));
});

// method to refreshAccesstoken  when it expires use it when we are using refresh token in our project
const refreshAccessToken = asyncHandler(async (req, res) => {
	const incomingRefreshToken =
		req.cookies.refreshToken || req.body.refreshToken;
	if (!incomingRefreshToken) {
		throw new ApiError(401, "Unauthorized request");
	}
	// now check whether its correct
	try {
		const decodedToken = jwt.verify(
			incomingRefreshToken,
			process.env.ACCESS_TOKEN_SECRET
		);

		//now find user in db using _id that we got from decoded token
		const user = await User.findById(decodedToken?._id);
		if (!user) {
			throw new ApiError(401, "Invalid Refresh Token");
		}
		//match refresh token  from db
		if (incomingRefreshToken != user?.refreshToken) {
			throw new ApiError(401, "Invalid refresh token not matched stored token");
		}
		const options = {
			httpOnly: true,
			secure: true,
		};
		const { accessToken, newRefreshToken } =
			await generateAccessAndRefreshToken(user._id);
		return res
			.status(200)
			.cookie("accessToken", accessToken, options)
			.cookie("refreshToken", newRefreshToken, options)
			.json(
				new ApiResponse(
					200,
					{ accessToken, refreshToken: newRefreshToken },
					"Access token refreshed"
				)
			);
	} catch (error) {
		throw new ApiError(
			401,
			error?.message || "something went wrong while refreshing token..."
		);
	}
});

// Method to change user password this method will be called when user hit particular end point
const changeCurrentPassword = asyncHandler(async (req, res) => {
	// 1. take values from req that we are getting
	//since we are asking for password it means user is already logged in and it have passed through
	// middleware auth . so we have got user and its id
	const { oldPassword, newPassword } = req.body;

	//3 . find the user who is logged in
	const user = await User.findById(req.user?._id);

	// 3. check whether user has entered correct password or not
	const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);
	if (!isPasswordCorrect) {
		throw new ApiError(400, "Invalid  password ");
	}

	//4 . update the password
	user.password = newPassword;
	//5. save it to db  we dont need to bcrypt it here because in our user.model
	//we have created userSchema.pre("save" , async function (next) which will be executed before
	//saving password to db
	await user.save({ validateBeforeSave: false });
	return res
		.status(200)
		.json(new ApiResponse(200, {}, "Password changed successfully"));
});

// for getting the current user who is logged in   we are getting req.user because of middleware(auth)
const getCurrentUser = asyncHandler(async (req, res) => {
	return res
		.status(200)
		.json(new ApiResponse(200, req.user, "Current user fetched successdfully"));
});

// Method to update user data
const updateAccountDetails = asyncHandler(async (req, res) => {
	const { fullName, email } = req.body;
	if (!fullName || !email) {
		throw new ApiError(400, "All fields are required");
	}
	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: {
				fullName,
				email,
			},
		},
		{
			new: true,
		}
	).select("-password");
	return res
		.status(200)
		.json(new ApiResponse(200, user, "Account details updated successfully"));
});

//Method to update the  avatar
const updateUserAvatar = asyncHandler(async (req, res) => {
	// 1. we need a local path from multer middleware where it is stored
	const avatarLocalPath = req.file?.path;
	if (!avatarLocalPath) {
		throw new ApiError(401, "Avatar file is Missing");
	}
	//2. now update cloudinary path
	const avatar = await uploadOnCloudinary(avatarLocalPath);
	if (!avatar.url) {
		throw new ApiError(401, "Avatar file upload to cloudinary got failed.");
	}
	//3 .find the user whose path we have to update and update it
	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: { avatar: avatar.url },
		},
		{
			new: true,
		}
	).select("-password");
	return res
		.status(200)
		.json(new ApiResponse(200, user, "Avatar updated successfully"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
	const coverImageLocalPath = req.file?.path;
	if (!coverImageLocalPath) {
		throw new ApiError(401, "Cover image local path not found");
	}
	const coverImage = await uploadOnCloudinary(coverImageLocalPath);
	if (!coverImage.url) {
		throw new ApiError(
			401,
			"cover image  file upload to cloudinary got failed."
		);
	}
	const user = await User.findByIdAndUpdate(
		req.user?._id,
		{
			$set: { coverImage: coverImage.url },
		},
		{
			new: true,
		}
	).select("-password");
	return res
		.status(200)
		.json(new ApiResponse(200, user, "cover Image  updated successfully"));
});

// Working with AGGREGATION PIPELINES......
//Method(or controller) to gert user channel profile 
const getUserChannelProfile = asyncHandler(async (req, res) => {
	//if we search any channel name on yt we  get that channel name on url so doing same here
	const { username } = req.params;

	if (!username?.trim()) {
		throw new ApiError(400, "Unable to fetch username from req.params");
	}

	//creating  aggrigation pipelines
	//finding user
	const channel = await User.aggregate([
		// {},{} we write channel like this{} it shows diffrent stages
		//fist stage
		{
			$match: {
				username: username?.toLowerCase(),
			},
		},
		//second stage doing lookup to find total no. of subscriber of this user
		//Subscription will be converted to subscriptions in mongodb(by deault all dbs are stored like that)
		// _id field from the current collection will be compared to the channel field in the "subscriptions" collection.
		//Finding subscribers
		{
			lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: "channel",
				as: "subscribers",
			},
		},
		//third stage
		//Finding channels that i have subscribed
		{
			lookup: {
				from: "subscriptions",
				localField: "_id",
				foreignField: " subscriber",
				as: "subscribedTo",
			},
		},
		//fourth stage
		//Adding additional field so that i can store my all data in single schema
		{
			$addFields: {
				//field   name.  since we have to find the total no. of subscriber  this we can do by
				//using $size which will return us the size of document.

				subscriberCount: {
					// dont forget to add $ in subscribers because it is the document
					$size: "$subscribers",
				},
				// Another field to get the channels that i have subscribed
				channelsSubscribedToCount: {
					$size: "$subscribedTo",
				},
        // in  yt we have subscriber button and when user subscribe that channel then it changes  to subscribed
          //so how to know whether particular user has subscribed our channel or not.creating another field
      
               //we will use cond which consist of three part if , then ,else. if is right then Then is executed
              //otherwise Else is executed
           isSubscribedTo:{
            $cond:{
              //check whether particular user.id is their or not in document subscribers
              if:{ $in:[req.user?._id , "$subscribers.subscriber"]},
              then:true,
              else:false
            }
           }
        
			},
		},
    //Fifth pipeline
    //using project it is use to project the information that we want to pass on or display
    {
      $project:{
           username:1,
           fullName:1,
           avatar:1,
           coverImage:1,
           email:1,
           //fields that we have created using addField
           subscriberCount:1,
           channelsSubscribedToCount:1,
           isSubscribedTo:1

      }
    }
	]);
  if(!channel?.length)
  {
    throw new ApiError(404 ,"Channel does not exist")
  }
  return res.status(200)
  .json( new ApiResponse(200 , channel[0] ," User channel fetched Successfully..."))
});


// Creating another pipeline for getting the watch history
// Here using   SUB PIPELINES 
const getWatchHistory= asyncHandler(async(req,res)=>
{
	const user= User.aggregate([
		{
			$match:{
				// _id:req.user.id we cant do this here because it will  not return id in proper formate
				//because code written in aggregation is directly accessed by mongodb not mongoose(_id:req.user.id)it
				//is syntax of mongoose
				_id: new mongoose.Types.ObjectId(req.user._id)

			}


		},
		{
			$lookup:{
				from:"Video",
				localField:" watchHistory",
				foreignField:"_id",
				as:" watchHistory",
				//till this we have got the watch history  all the videos
				//but we havnt got the owner of that videos 
				//pipeline is used to write another pipeline inside it
				pipeline:[
					{  //at this point we are in Video schema 
						$lookup:{
							from:"User",
							localField:"owner",
							foreignField:"_id",
							as:"owner",
							//till here we have got all information of owner it includes everything id, password,etc
							//since we have  that only few info should be stored in owner field.we will add one more 
							//pipeline here
							pipeline:[
								{
									$project:{
										fullName:1,
										username:1,
										avatar:1
									}
								}
							]

						}
					},
					//Adding another pipeline so that we can easily get data out of our Owner field
					{
					  $addFields:{
						//for keeping field name same thats why owner we have writtern owner:{}
						owner:{
						$first:"$owner"
						}
					  }
					}
					

				]
				

			}
		}
	])
	return res.status(200)
	.json( new ApiResponse( 200 , user[0].watchHistory ,"Watch History fetched Successfully"))
})

export {
	registerUser,
	loginUser,
	logOutUser,
	refreshAccessToken,
	changeCurrentPassword,
	getCurrentUser,
	updateAccountDetails,
	updateUserAvatar,
	updateUserCoverImage,
	getUserChannelProfile,
	getWatchHistory
};
