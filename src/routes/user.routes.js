import { Router } from "express";
import {
	changeCurrentPassword,
	getCurrentUser,
	getUserChannelProfile,
	getWatchHistory,
	logOutUser,
	loginUser,
	refreshAccessToken,
	registerUser,
	updateAccountDetails,
	updateUserAvatar,
	updateUserCoverImage,
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

//3. now router will go to /register
// router.route("/register").post(registerUser)
//4. since we  have to also upload two files that we will do here by using middleware(upload)
router.route("/register").post(
	upload.fields([
		{
			name: "avatar", //name should be same as field name on frontend
			maxCount: 1,
		},
		{
			name: "coverImage",
			maxCount: 1,
		},
	]),
	registerUser
);

router.route("/login").post(loginUser);
//using Middleware created by me
router.route("/logout").post(verifyJWT, logOutUser);
//for refreshing access token
router.route("/refresh-token").post(refreshAccessToken);
router.route("/change-password").post(verifyJWT, changeCurrentPassword);
router.route("/current-user").get(verifyJWT, getCurrentUser);
//.patch is required because we are updating data if we keep post it will update all fields
router.route("/update-account").patch(verifyJWT, updateAccountDetails);
//update aavatar   user should be logged in since we have  to update only one file so upload.single
//and also we have to update avartar file in db so patch
router
	.route("/avatar")
	.patch(verifyJWT, upload.single("avatar"), updateUserAvatar);
router
	.route("/cover-image")
	.patch(verifyJWT, upload.single("coverImage"), updateUserCoverImage);

//getting user channel profile from params
router.route("/c/:username").get(verifyJWT, getUserChannelProfile);
//watch history
router.route("/history").get(verifyJWT, getWatchHistory);
export default router;
