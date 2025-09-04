import { Router } from "express";
import { 
    changeCurrentPassword, 
    getCurrentUser, 
    getUserChannelProfile, 
    getWatchHistory, 
    loginUser, 
    logoutUser, 
    refreshAccessToken, 
    registerUser, 
    updateAccountInformation, 
    updateAvatar, 
    updateCoverImage 
} from "../controllers/user.controller.js";
import { upload } from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();


router.route("/register").post(
    upload.fields([
       {
            name: "avatar",
            maxCount : 1
        },
        {
            name : "coverimage",
            maxCount : 1
        }
    ]), 
    registerUser
)

router
.route("/login")
.post(loginUser)

router
.route("/logout")
.post(verifyJWT,logoutUser)

router
.route("/refresh-token")
.post(refreshAccessToken)

router
.route("/change-password")
.post(verifyJWT,changeCurrentPassword)

router
.route("current-user")
.get(verifyJWT,getCurrentUser)

router
.route("/edit-details")
.patch(verifyJWT,updateAccountInformation)

router
.route("/update-avatar")
.patch(verifyJWT,upload.single("avatar"),updateAvatar)

router
.route("/update-coverimage")
.patch(verifyJWT,upload.single("coverimage"),updateCoverImage)

router
.route("/channel/:username")
.get(verifyJWT,getUserChannelProfile)

router
.route("/watchHistory")
.get(verifyJWT,getWatchHistory)

export default router // default export so we can import it by any name