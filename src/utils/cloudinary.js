import {v2 as cloudinary} from "cloudinary"
import dotenv from "dotenv";
dotenv.config({
    path : './.env'
});
import fs from "fs"

cloudinary.config({
    cloud_name: process.env.CLOUD_NAME,
    api_key: process.env.API_KEY,
    api_secret: process.env.API_SECRET,
  });

const uploadOnCloudinary = async(localFilePath)=>{
    try {
        if(!localFilePath)return null
        const response = await cloudinary.uploader.upload(localFilePath,{
            resource_type: "auto"
        })
        console.log("File is uploaded on cloudinary",response.url);
        return response

    } catch (error) {
        fs.unlinkSync(localFilePath)//remove the locally saved temporary file as the upload operation failed
        return null;
    }
}

export {uploadOnCloudinary}