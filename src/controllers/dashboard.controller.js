import mongoose from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getChannelStats = asyncHandler(async (req, res) => {
    const userId = req.user.id; // Authenticated user's ID

    // Check if userId is valid
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Fetch total videos uploaded by the user
    const totalVideos = await Video.countDocuments({ owner: userId });

    // Fetch total subscribers
    const totalSubscribers = await Subscription.countDocuments({ channel: userId });

    // Fetch total likes on all videos of the user
    const totalLikes = await Like.countDocuments({ entityType: "video", entityOwner: userId });

    // Fetch total video views
    const totalViews = await Video.aggregate([
        { $match: { owner: new mongoose.Types.ObjectId(userId) } },
        { $group: { _id: null, totalViews: { $sum: "$views" } } }
    ]);

    res.status(200).json(
        new ApiResponse(200, {
            totalVideos,
            totalSubscribers,
            totalLikes,
            totalViews: totalViews[0]?.totalViews || 0,
        }, "Channel stats fetched successfully")
    );
});


const getChannelVideos = asyncHandler(async (req, res) => {
    const userId = req.user.id; // Authenticated user's ID
    const { page = 1, limit = 10 } = req.query; // Default values

    // Check if userId is valid
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Fetch videos uploaded by the user with pagination
    const videos = await Video.find({ owner: userId })
        .sort({ createdAt: -1 }) // Newest first
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .lean();

    res.status(200).json(
        new ApiResponse(200, { videos }, "Channel videos fetched successfully")
    );
});

export {
    getChannelStats, 
    getChannelVideos
    }