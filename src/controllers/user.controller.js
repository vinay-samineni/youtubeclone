
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";


const generateAccessAndRefreshToken = async(userId)=>{
    try {
        const user = await User.findById(userId)
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave:false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new ApiError(500,"something went wrong while generating tokens")
    }
}

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

const loginUser = asyncHandler(async(req,res)=>{
    //get username or email
    //get password
    //check if user exists
    //check if password is correct
    //generate access token and refresh token
    //send cookies
    const {userName,email,password} = req.body
    console.log(req.body)
    if(!req.body.userName && !req.body.email)
    {
        throw new ApiError(400,"userName or email is required")
    }
    const user = await User.findOne({
        $or:[{userName},{email}]
    })
    if(!user)
    {
        throw new ApiError(404,"user not found")
    }
    const isPasswordValid = await user.isPasswordCorrect(password)
    if(!isPasswordValid)
    {
        throw new ApiError(401,"Invalid user credentials")
    }
    const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken")
    const options = {
        httpOnly : true,
        secure : true,
    }
    return res
    .status(200)
    .cookie("refreshToken",refreshToken,options)
    .cookie("accessToken",accessToken,options)
    .json(
        new ApiResponse(
            200,
            {
                user : loggedInUser,accessToken,refreshToken
            },
            "user logged in successfully"
        )
    )
})

const logoutUser = asyncHandler(async(req,res)=>{
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set :{
                refreshToken : undefined
            }},
            {
                new : true
            }
    )

    const options = {
        httpOnly : true,
        secure : true,
    }
    return res 
    .status(200)
    .clearCookie("refreshToken",options)
    .clearCookie("accessToken",options)
    .json(new ApiResponse(200,{},"user logged out successfully"))
})

const refreshAccessToken = assyncHandler(async(req,res)=>{
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken
    if(!incomingRefreshToken)
    {
        throw new ApiError(401,"unauthorized request") 
    }

    try {
        const decodedToken = jwt.verify(
            incomingRefreshToken,
            process.env.REFRESH_TOKEN_SECRET
        )
    
        const user = await user.findById(decodedToken?._id)
        if(!user)
            {
                throw new ApiError(401,"Invalid RefreshToken") 
            }
        if(incomingRefreshToken !== user?.refreshToken)
        {
            throw new ApiError(401,"Refresh token invalid or used") 
        }
    
        const options = {
            httpOnly : true,
            secure : true,
        }
        const {accessToken, newRefreshToken} = await generateAccessAndRefreshToken(user._id)
        return res
        .status(200)
        .cookie("accessToken",accessToken,options)
        .cookie("refreshToken",newRefreshToken,options)
        .json(new ApiResponse(200,{accessToken,newRefreshToken},"access token refreshed successfully"))
    } catch (error) {
        throw new ApiError(401,error?.message || "Invalid RefreshToken") 
    }

})

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
}

