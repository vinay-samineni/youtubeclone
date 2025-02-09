
import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.models.js";
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import fs from "fs"
dotenv.config({
    path: './.env'
})


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

const registerUser = asyncHandler(async (req, res) => {
    const { fullName, email, userName, password } = req.body;

    if ([fullName, email, userName, password].some((field) => !field?.trim())) {
        throw new ApiError(400, "All fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    });
    if (existedUser) {
        throw new ApiError(409, "User already exists");
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path; // Fix: Safe access
    let coverImageLocalPath = req.files?.coverImage?.[0]?.path; // Fix: Safe access

    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar is required");
    }
    console.log("Avatar Path:", avatarLocalPath);
    console.log("Cover Image Path:", coverImageLocalPath);


    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await uploadOnCloudinary(coverImageLocalPath) : null;

    if (!avatar) {
        throw new ApiError(400, "Avatar upload failed");
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    });

    const createdUser = await User.findById(user._id).select("-password -refreshToken");
    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while creating user.");
    }

    return res.status(201).json(new ApiResponse(201, createdUser, "User registered successfully."));
});

const loginUser = asyncHandler(async(req,res)=>{
    //get username or email
    //get password
    //check if user exists
    //check if password is correct
    //generate access token and refresh token
    //send cookies
    const {userName,email,password} = req.body
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

const refreshAccessToken = asyncHandler(async(req,res)=>{
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
    
        const user = await User.findById(decodedToken?._id)
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

const changeCurrentUserPassword = asyncHandler(async(req,res)=>{
    const {oldPassword,newPassword} = req.body;
    const user = await User.findById(req.user?._id)
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect)
    {
        throw new ApiError(401,"Invalid user credentials")
    }
    user.password = newPassword
    await user.save({validateBeforeSave : false})

    return res.status(200)
    .json(new ApiResponse(200,{},"password changed successfully"))

})

const getCurrentUser = asyncHandler(async(req,res)=>{
    return res.status(200)
    .json(new ApiResponse(200,req.user,"user details fetched successfully"))
})

const updateAccountDetails = asyncHandler(async(req,res)=>{
    const {fullName,email} = req.body
    if(!fullName && !email)
    {
        throw new ApiError(400,"atleast one field is required")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set :{
                fullName,
                email: email.toLowerCase()
            }
        },
        {new : true}
    ).select("-password")
    return res.status(200)
    .json(new ApiResponse(200,user,"user details updated successfully"))
})


const updateUserAvatar = asyncHandler(async (req, res, next) => {
    if (!req.file || !req.file.path) {
        return next(new ApiError(400, "Avatar is required"));
    }

    const avatarLocalPath = req.file.path;
    console.log("Avatar local path:", avatarLocalPath);

    let avatar;
    try {
        avatar = await uploadOnCloudinary(avatarLocalPath);
        console.log("Cloudinary Response:", avatar);
        if (!avatar?.url) {
            return next(new ApiError(400, "Error while uploading avatar"));
        }
    } catch (error) {
        return next(new ApiError(500, "Cloudinary upload failed"));
    }

    try {
        // Update user's avatar in the database
        console.log("Updating user with ID:", req.user?._id);
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            { $set: { avatar: avatar.url } },
            { new: true }
        ).select("-password");

        console.log("Updated User:", user);

        // Remove local file after successful upload
        fs.unlinkSync(avatarLocalPath);

        return res.status(200).json(new ApiResponse(200, user, "Avatar updated successfully"));
    } catch (error) {
        console.log("Error while updating avatar:", error);
        return next(new ApiError(500, "Failed to update avatar in database"));
    }
});

const updateUserCoverImage = asyncHandler(async(req,res)=>{
    const coverImageLocalPath = req.file?.path
    if(!coverImageLocalPath)
    {
        throw new ApiError(400,"coverImage is required")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url)
    {
        throw new ApiError(400,"Error while uploading coverImage")
    }
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set:{
                coverImage : coverImage.url
            }
        },
        {new : true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200,user,"coverImage updated successfully"))
})

const getUserChannelProfile = asyncHandler(async(req,res)=>{
    const {userName} = req.params
    if(!userName?.trim())
    {
        throw new ApiError(400,"userName is required")
    }

    const channel = await User.aggregate([{
        $match:{
            userName : userName.toLowerCase()
        }
    },
    {
        $lookup:{
            from : "subscriptions",
            localField: "_id",
            foreignField: "channel",
            as : "Subscribers"
        }
    },
    {
        $lookup:{
            from : "subscriptions",
            localField: "_id",
            foreignField: "subscriber",
            as : "SubscribedTo"
        }
    },
    {
        $addFields:{
            subscribersCount : {
                $size : "$Subscribers"
            },
            channelsSubscribedToCount : {
                $size : "$SubscribedTo"
            },
            isSubscribed : {
                $cond:{
                    if:{$in: [req.user?._id,"$Subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            }
        }
    },
    {
        $project:{
            fullName : 1,
            userName : 1,
            subscribersCount : 1,
            channelsSubscribedToCount : 1,
            avatar : 1,
            coverImage : 1,
            email : 1,
        }
    }
    ])
    console.log(Channel)
    if(!channel?.length)
    {
        throw new ApiError(404,"Channel not found")
    }

    return res.status(200)
    .json(new ApiResponse(200,channel[0],"channel profile fetched successfully"))
})

const getWatchHistory = asyncHandler(async(req,res)=>{
    const user = await User.aggregate([
        {
            $match:{
                _id : new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup:{
                from : "videos",
                localField:"watchHistory",
                foreignField:"_id",
                as : "watchHistory",
                pipeline : [
                    {
                        $lookup:{
                            from : "users",
                            localField : "owner",
                            foreignField : "_id",
                            as :"owner",
                            pipeline : [
                                {
                                    $project:{
                                        fullName : 1,
                                        userName : 1,
                                        avatar : 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields:{
                            owner :{
                                $first : "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])
    return res.status(200)
    .json(
        new ApiResponse
        (200,
            user[0]?.watchHistory,
            "watch history fetched successfully"))
})



export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory

}

