import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler( async (req,res)=>{
    // get user details from the frontend
    // validation - empty
    // check if user already exists : username ,email
    // check for images : check for avatar
    // upload them on cloudinary : avatar
    // creta an object - creat entry in DB
    // remove password and refreshtoken from response
    // check fro user creation
    // return res
    const {fullName , email , username , password} = req.body
    if (
        [fullName,email,username,password].some((field)=>
        field?.trim() === "")
    ) {
        throw new ApiError(400,"All fields are required")
    }
    if (email.indexOf("@") === -1) {
        throw new ApiError(400,"InValid Email")
    }
    const existedUser = User.findOne({
        $or: [{username},{email}]
    })
    if(existedUser){
        throw new ApiError(409,"User already exist")
    }
    const avatarLocalPath = req.files?.avatar[0]?.path;
    const coverimageLocalPath = req.files?.coverimage[0]?.path;
    if(!avatarLocalPath){
        throw new ApiError(400,"Avatar file is required")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverimageLocalPath);
    if(!avatar){
        throw new ApiError(400,"Avatar file is required")
    }
    const user = User.create({
        fullName,
        avatar : avatar.url,
        coverImage:coverImage?.url || "",
        email,
        username : username.toLowerCase(),
        password
    })
    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser){
        throw new ApiError(500,"Something went wrong while user creation")
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"User Registered succesfully")
    )

})

export {
    registerUser
}


// asynchandler ( async (req,res)=>{res.status(200).json({message : "ok"}  )