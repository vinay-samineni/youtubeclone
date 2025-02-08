import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const createTweet = asyncHandler(async (req, res) => {
    const { content } = req.body;
    const userId = req.user._id;

    // Validate content
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Tweet content cannot be empty");
    }

    // Create new tweet
    const tweet = await Tweet.create({ user: userId, content });

    // Push the tweet ID to user's tweets array
    await User.findByIdAndUpdate(userId, { $push: { tweets: tweet._id } });

    res.status(201).json(new ApiResponse(201, tweet, "Tweet created successfully"));
});


const getUserTweets = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Validate userId
    if (!isValidObjectId(userId)) {
        throw new ApiError(400, "Invalid user ID");
    }

    // Check if user exists
    const userExists = await User.findById(userId);
    if (!userExists) {
        throw new ApiError(404, "User not found");
    }

    // Fetch tweets of the user
    const tweets = await Tweet.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json(new ApiResponse(200, tweets, "User tweets fetched successfully"));
});


const updateTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const { content } = req.body;
    const userId = req.user._id; // Extract user ID from JWT payload

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Find the tweet
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Ensure the user is the owner of the tweet
    if (tweet.user.toString() !== userId.toString()) {
        throw new ApiError(403, "Unauthorized to update this tweet");
    }

    // Update tweet content
    tweet.content = content || tweet.content;
    await tweet.save();

    res.status(200).json(new ApiResponse(200, tweet, "Tweet updated successfully"));
});


const deleteTweet = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;
    const userId = req.user._id; // Extract user ID from JWT payload

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        throw new ApiError(400, "Invalid tweet ID");
    }

    // Find the tweet
    const tweet = await Tweet.findById(tweetId);
    if (!tweet) {
        throw new ApiError(404, "Tweet not found");
    }

    // Ensure the user is the owner of the tweet
    if (tweet.user.toString() !== userId.toString()) {
        throw new ApiError(403, "Unauthorized to delete this tweet");
    }

    // Delete the tweet
    await tweet.deleteOne();

    res.status(200).json(new ApiResponse(200, null, "Tweet deleted successfully"));
});


export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}