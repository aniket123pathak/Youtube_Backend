import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary , deleteOldImage } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = await User.findById(userId);
        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshToken()

        //refresToken also should be in the database
        user.refreshToken = refreshToken
        await user.save( {validateBeforeSave : false} )

        return {accessToken,refreshToken}
        
    } catch (error) {
        throw new ApiError(500,"Something went wrong during generating the acccess token and the refresh tokens...!!!")
    }
}


const registerUser = asyncHandler( async (req, res) => {
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res


    const {fullName, email, username, password } = req.body
    
    if (
        [fullName, email, username, password].some((field) => field?.trim() === "")
    ) {
        throw new ApiError(400, "All fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    })

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists")
    }
    
    console.log(req.files)

    const avatarLocalPath = req.files.avatar[0].path;
    //const coverimageLocalPath = req.files?.coverimage[0]?.path;

    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverimage) && req.files.coverimage.length > 0){
        coverImageLocalPath=req.files.coverimage[0].path
    }


    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if (!avatar) {
        throw new ApiError(400, "Avatar file is required")
    }
   

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverimage: coverImage?.url || "",
        email, 
        password,
        username: username.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    )

} )


const loginUser = asyncHandler( async (req,res) => {
    //get credentials from the user
    //get username and the password from the user
    //if username exist in the db then check for the password
    //if if username does not exist in the db then give error and tell user to register 

    const { username , email , password } = req.body

    if(!username && !email ){
        throw new ApiError(401,"Username or Email is required");
    }

    const user = await User.findOne({
        $or:[{username},{email}]
    })//now user has every thing that is in the user model

    if(!user){
        throw new ApiError(404,"Invalid Email or Username")
    }

    const isPasswordValid = await user.isPasswordCorrect(password)

    if(!isPasswordValid){
        throw new ApiError(401,"Invalid credentials")
    }

    const {accessToken , refreshToken} = await generateAccessTokenAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select("-password -refreshToken")

    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(201)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "User logged in succesfully"
        )
    )

})


const logoutUser = asyncHandler( async (req,res) => {
    User.findByIdAndUpdate(
        req.user._id,
        {
            $set : {
                refreshToken:undefined
            }
        },
        {
            new : true
        }
    )

    
    const options = {
        httpOnly : true,
        secure : true
    }

    return res
    .status(202)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(
        new ApiResponse(200,{},"User Logged Out")
    )
})


const refreshAccessToken = asyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookie.accessToken || req.body.accessToken

    if(!incomingRefreshToken){
        throw new ApiError(401,"Unauthorised request")
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )

        const user = await User.findById(decodedToken?._id)
    
        if(!user){
            throw new ApiError(401,"Invalid Access Token")
        }

        if(user?.refreshToken !== incomingRefreshToken){
            throw new ApiError(401,"Invalid Access Token")
        }
        
        const options = {
            httpOnly : true,
            secure : true
        }

        const { accessToken , newRefreshToken } = await generateAccessTokenAndRefreshToken(user._id)

        return res
        .status(201)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,option)
        .json(
            200,
            {
                accessToken,
                newRefreshToken
            },
            "Access Token Refreshed"
        )

    } catch (error) {
        throw new ApiError(401,error?.message,"Invalid Refresh Token")
    }
})


const changeCurrentPassword = asyncHandler(async(req,res)=>{
    const { oldPassword , newPassword } = req.body

    const user = await User.findById(req.user?._id)

    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)

    if (!isPasswordCorrect) {
        throw new ApiError(400,"Invalid Old Password!!")
    }

    user.password = newPassword
    user.save({validateBeforeSave:false})

    return res
    .status(201)
    .json(new ApiResponse(200,{},"Password changed succesfully!!"))

})


const getCurrentUser = asyncHandler(async(req,res)=>{

    return res
    .status(200)
    .jsonn(new ApiResponse(201,req.user,"User fetched successfully"))
})


const updateAccountInformation = asyncHandler(async(req,res)=>{
    const {fullName , email}=req.body
    if(!(fullName||email)){
        throw new ApiError(401,"All fields are required")
    }

    const user = await User.findByIdAndDelete(
        req.user?._id,
        {
            $set : {
                fullName : fullName,
                email : email
            }
        },
        {
            next : true
        },
    ).select("-password")

    return res
    .status(200)
    .json(
        new ApiResponse(200,user,"User information updated succesfully")
    )
})


const updateAvatar = asyncHandler(async(req,res)=>{
    const avatarLocalPath = req.file?.path

    if (!avatarLocalPath) {
        throw new ApiError(401,"Avatar file is required")
    }

    const temp = await User.findById(req.user?._id)
    const oldPublicId = temp?.avatar?.public_id

    if(!oldPublicId){
        throw new ApiError(404,"No old Avatar Public Id Found")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    
    if (!avatar.url) {
        throw new ApiError(401,"Error While Uploadind on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                avatar : avatar.url
            }
        },
        {
           new:true 
        }
    ).select("-password")

    await deleteOldImage(oldPublicId)

    return res
    .status(200)
    .json(new ApiResponse(200,user,"User Avatar updated Succesfully"))

})


const updateCoverImage = asyncHandler(async(req,res)=>{
    const coverimageLocalPath = req.file?.path


    if (!coverimageLocalPath) {
        throw new ApiError(401,"coverimage file is required")
    }

    const temp = await User.findById(req.user?._id)
    const oldPublicId = temp?.avatar?.public_id

    const coverimage = await uploadOnCloudinary(coverimageLocalPath);
    
    if (!coverimage.url) {
        throw new ApiError(401,"Error While Uploadind on cloudinary")
    }

    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set : {
                coverimage : coverimage.url
            }
        },
        {
           new:true 
        }
    ).select("-password")

    await deleteOldImage(oldPublicId);

    return res
    .status(200)
    .json(new ApiResponse(200,user,"User coverimage updated Succesfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const { username } = req.params
    
    if(!username.trim()){
        throw new ApiError(404,"Username Not found")
    }

    const channel = await User.aggregate([
        {
            $match :{
                username : username?.toLowerCase()
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField : "_id",
                foreignField : "channel",
                as : "subscribers"
            }
        },
        {
            $lookup : {
                from : "subscriptions",
                localField:"_id",
                foreignField:"subscriber",
                as : "subscribedTo"
            }
        },
        {
            $addFields : {
                subscribersCount : {
                    $size : "$subscribers"
                },
                channelSubscribedToCount : {
                    $size : "subscribedTo"
                },
                isSubscribed : {
                    $cond : {
                        if : {$in:[req.user?._id,"$subscribers.subscriber"]},
                        then : true,
                        else : false
                    }
                }
            }
        },
        {
            $project :{
                username : 1,
                email : 1,
                fullName : 1,
                avatar : 1,
                coverimage : 1,
                subscribersCount : 1,
                channelSubscribedToCount : 1,
                isSubscribed : 1,
            }
        }
    ])

    if (!channel?.length) {
        throw new ApiError(404,"Channel Does not Exist")
    }

    return res
    .status(200)
    .json(
        new ApiResponse(200,channel,"Channel / User Fetched Successfully")
    )
})

const getWatchHistory = asyncHandler (async(req,res)=>{
    const user = await User.aggregate([
        {
            $match : {
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            // connnecting the watchHistory(in User) to the Video schema
            $lookup : {
                from : "videos",
                localField : "watchHistory",
                foreignField : "_id",
                as : "watchHistory",
                pipeline : [
                    {
                        //conncting the Owner(in Video)to the User schema
                        $lookup : {
                            from:"users",
                            localField : "owner",
                            foreignField : "_id",
                            as : "owner",
                            pipeline :[
                                {
                                    $project : {
                                        fullName : 1,
                                        username : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields : {
                            owner : {
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res
    .status(200)
    .json(
        new ApiResponse(
            200,
            user[0].watchHistory,
            "Watched History Fetched Successfully"
        )
    )
})

export { 
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountInformation,
    updateAvatar,
    updateCoverImage,
    getUserChannelProfile,
    getWatchHistory
 }