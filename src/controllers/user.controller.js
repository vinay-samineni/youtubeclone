
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import router from "../routes/user.routes.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";

const registerUser = asyncHandler(async(req,res)=>
{
    //get user details from frontend
    //validation -notempty
    //check if user already exists
    //check images
    //check avatars
    //upload them to cloudinary
    //remove password and refresh token from response
    //check for user creation
    //return res
    const {fullName,email,userName,password} = req.body
    console.log(fullName)

    if([fullName,email,userName,password].some((field)=>field.trim() === ""))
    {
        throw new ApiError(400 , "all fields are required")
    }

    const existedUser = await User.findOne({
        $or: [{userName},{email}]
    })
    if(existedUser)
    {
        throw new ApiError(409,"user already exists");
    }

    const avatarLocalPath = req.files?.avatar[0]?.path;
    //const coverImageLocalPath = req.files?.coverImage[0]?.path;
    let coverImageLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length >0){
        coverImageLocalPath = req.files.coverImage[0].path;
    }


    if(!avatarLocalPath){
        throw new ApiError(400,"avatar is requried");
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!avatar){
        throw new ApiError(400,"avatar is requried");
    }

    const user = await User.create({
        fullName,
        avatar : avatar.url,
        coverImage : coverImage?.url || "",
        email,
        password,
        userName : userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )
    if(!createdUser)
    {
        throw new ApiError(500,"something went wrong while creating user.");
    }

    return res.status(201).json(
        new ApiResponse(200,createdUser,"user registered succesfully.")
    )

})


export {registerUser}
