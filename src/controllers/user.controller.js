import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/apiResponse.js";

const registerUser = asyncHandler(async (req, res) => {
    // This controller expects multer to have already populated req.body and req.files

    // Check if multer failed to parse the body
    if (!req.body || Object.keys(req.body).length === 0) {
        throw new ApiError(400, "Request body is empty. Ensure you are sending form-data correctly from your client.");
    }
    
    const { fullName, email, username, password } = req.body;

    if ([fullName, email, username, password].some((field) => !field || field.trim() === "")) {
        throw new ApiError(400, "All text fields (fullName, email, username, password) are required");
    }

    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }
    console.log(req.files)
    // Securely handle file paths from req.files (populated by multer)
    const avatarLocalPath = req.files.avatar[0].path
    const coverimageLocalPath = req.files.coverimage[0].path 
    

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required.");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath);
    if (!avatar) {
        throw new ApiError(500, "Server error: Failed to upload avatar.");
    }

    // Handle optional cover image
    let coverImage = null;
    if (coverimageLocalPath) {
        coverImage = await uploadOnCloudinary(coverimageLocalPath);
        if (!coverImage) {
            // If the cover image fails to upload, we log the error but don't stop the registration
            console.error("A cover image was provided but failed to upload. Continuing registration without it.");
        }
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase(),
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating the user entry in the database.");
    }

    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );
});

export { registerUser };