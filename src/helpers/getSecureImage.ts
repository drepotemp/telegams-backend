const cloudinary = require("cloudinary").v2;
import "dotenv/config"

// 🔹 Configure Cloudinary (Replace with your credentials)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Uploads a Base64 image to Cloudinary and returns the URL.
 * @param {string} base64String - The Base64 image string.
 * @returns {Promise<string>} - The image URL.
 */
export const getSecureImage = async (base64String:string)=>{
    try {
        if (!base64String) throw new Error("No image provided");

        // 🔥 Upload to Cloudinary
        const uploadResult = await cloudinary.uploader.upload(base64String, {
            folder: "telegam_images", // Optional: Set folder in Cloudinary
        });

        return uploadResult.secure_url; // 🔗 Return image URL
    } catch (error) {
        console.error("Upload failed:", error);
        throw new Error("Image upload failed");
    }
}
