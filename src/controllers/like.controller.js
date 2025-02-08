import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    const existingLike = await Like.findOne({ user: userId, video: videoId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, null, "Video unliked"));
    }

    await Like.create({ user: userId, video: videoId });

    res.status(201).json(new ApiResponse(201, null, "Video liked successfully"));
});


const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    const existingLike = await Like.findOne({ user: userId, comment: commentId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, null, "Comment unliked"));
    }

    await Like.create({ user: userId, comment: commentId });

    res.status(201).json(new ApiResponse(201, null, "Comment liked successfully"));
});


const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user.id;

    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    const existingLike = await Like.findOne({ user: userId, tweet: tweetId });

    if (existingLike) {
        await existingLike.deleteOne();
        return res.status(200).json(new ApiResponse(200, null, "Tweet unliked"));
    }

    await Like.create({ user: userId, tweet: tweetId });

    res.status(201).json(new ApiResponse(201, null, "Tweet liked successfully"));
});

const getLikedVideos = asyncHandler(async (req, res) => {
    const userId = req.user.id;

    const likedVideos = await Like.find({ user: userId, video: { $exists: true } })
        .populate({
            path: "video",
            select: "title description thumbnailUrl createdAt",
        });

    res.status(200).json(new ApiResponse(200, likedVideos, "Liked videos retrieved successfully"));
});


export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}