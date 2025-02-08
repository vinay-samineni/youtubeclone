import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"


const toggleSubscription = asyncHandler(async (req, res) => {
    const { channelId } = req.params;
    const subscriberId = req.user._id; // Extract subscriber ID from JWT payload

    // Validate channelId
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    // Ensure channel (user) exists
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // Prevent users from subscribing to themselves
    if (channelId.toString() === subscriberId.toString()) {
        throw new ApiError(400, "You cannot subscribe to your own channel");
    }

    // Check if subscription already exists
    const existingSubscription = await Subscription.findOne({
        channel: channelId,
        subscriber: subscriberId,
    });

    if (existingSubscription) {
        // Unsubscribe if already subscribed
        await existingSubscription.deleteOne();
        return res.status(200).json(new ApiResponse(200, null, "Unsubscribed successfully"));
    } else {
        // Subscribe if not already subscribed
        await Subscription.create({ channel: channelId, subscriber: subscriberId });
        return res.status(201).json(new ApiResponse(201, null, "Subscribed successfully"));
    }
});


const getUserChannelSubscribers = asyncHandler(async (req, res) => {
    const { channelId } = req.params;

    // Validate channelId
    if (!isValidObjectId(channelId)) {
        throw new ApiError(400, "Invalid channel ID");
    }

    // Ensure channel (user) exists
    const channel = await User.findById(channelId);
    if (!channel) {
        throw new ApiError(404, "Channel not found");
    }

    // Fetch all subscribers
    const subscribers = await Subscription.find({ channel: channelId })
        .populate("subscriber", "userName email avatar") // Fetch user details
        .select("subscriber -_id"); // Return only the subscriber field

    return res.status(200).json(new ApiResponse(200, subscribers, "Subscribers fetched successfully"));
});


const getSubscribedChannels = asyncHandler(async (req, res) => {
    const { subscriberId } = req.params;

    // Validate subscriberId
    if (!isValidObjectId(subscriberId)) {
        throw new ApiError(400, "Invalid subscriber ID");
    }

    // Ensure subscriber (user) exists
    const subscriber = await User.findById(subscriberId);
    if (!subscriber) {
        throw new ApiError(404, "Subscriber not found");
    }

    // Fetch all subscribed channels
    const subscribedChannels = await Subscription.find({ subscriber: subscriberId })
        .populate("channel", "userName email avatar") // Fetch channel details
        .select("channel -_id"); // Return only the channel field

    return res.status(200).json(new ApiResponse(200, subscribedChannels, "Subscribed channels fetched successfully"));
});


export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}