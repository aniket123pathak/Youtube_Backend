import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const generateAccessTokenAndRefreshToken = async (userId) => {
    try {
        const user = User.findById(userId);

        const accessToken = await user.generateAccessToken()
        const refreshToken = await user.generateRefreshoken()
        //refresToken also should be in the database

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave : false})

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

    const avatarLocalPath = req.files?.avatar[0]?.path;
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

    if(!(username || email )){
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

export { 
    registerUser,
    loginUser
 }