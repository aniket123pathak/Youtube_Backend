
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

console.log("Cloudinary ENV Loaded:", {
  name: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY,
  secret: process.env.CLOUDINARY_API_SECRET ? "Exists" : "Missing"
});

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const uploadOnCloudinary = async (localFilePath) => {
  console.log("Attempting to upload file from path:", localFilePath); // Log the path

  try {
    if (!localFilePath) {
      console.log("No local file path provided.");
      return null;
    }
    // Check if the file exists before uploading
    if (!fs.existsSync(localFilePath)) {
        console.error("File does not exist at path:", localFilePath);
        return null;
    }

    console.log("File exists. Proceeding with Cloudinary upload...");

    // Upload file on Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto"
    });
    console.log("File has been uploaded successfully!!!", response.url);
    fs.unlinkSync(localFilePath); // Delete file after successful upload
    return response

  } catch (error) {
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("!!! CLOUDINARY UPLOAD FAILED !!!");
    console.error("!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!");
    console.error("Error details:", error); // THE MOST IMPORTANT LOG

    // Try to delete the file even if upload fails
    if (fs.existsSync(localFilePath)) {
        fs.unlinkSync(localFilePath); 
        console.log("Cleaned up temporary file:", localFilePath);
    }
    
    return null;
  }
}

export { uploadOnCloudinary };