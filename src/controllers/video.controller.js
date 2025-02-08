import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"


const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy = "createdAt", sortType = "desc", userId } = req.query;

    // Convert page and limit to numbers
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);

    // Validate input
    if (pageNumber < 1 || limitNumber < 1) {
        throw new ApiError(400, "Page and limit must be positive numbers");
    }

    // Build filter query
    const filter = {};
    if (query) {
        filter.$or = [
            { title: { $regex: query, $options: "i" } }, 
            { description: { $regex: query, $options: "i" } }
        ];
    }
    if (userId && isValidObjectId(userId)) {
        filter.owner = userId;
    }

    // Build sorting object
    const sortOrder = sortType === "asc" ? 1 : -1;
    const sortOptions = { [sortBy]: sortOrder };

    // Fetch videos from DB
    const videos = await Video.find(filter)
        .populate("owner", "userName avatar") // Populate owner details
        .sort(sortOptions)
        .skip((pageNumber - 1) * limitNumber)
        .limit(limitNumber);

    // Get total count for pagination
    const totalVideos = await Video.countDocuments(filter);

    res.status(200).json(
        new ApiResponse(200, {
            videos,
            totalPages: Math.ceil(totalVideos / limitNumber),
            currentPage: pageNumber,
        }, "Videos fetched successfully")
    );
});


const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        throw new ApiError(400, "Title and description are required");
    }

    if (!req.files || !req.files.videoFile || !req.files.thumbnail) {
        throw new ApiError(400, "Both video file and thumbnail are required");
    }

    const videoFile = req.files.videoFile[0];
    const thumbnailFile = req.files.thumbnail[0];

    // Upload video file to Cloudinary
    const videoUploadResult = await uploadOnCloudinary(videoFile.path, "video");
    if (!videoUploadResult || !videoUploadResult.secure_url) {
        throw new ApiError(500, "Failed to upload video");
    }

    // Upload thumbnail to Cloudinary
    const thumbnailUploadResult = await uploadOnCloudinary(thumbnailFile.path, "image");
    if (!thumbnailUploadResult || !thumbnailUploadResult.secure_url) {
        throw new ApiError(500, "Failed to upload thumbnail");
    }

    // Create video document in database
    const newVideo = await Video.create({
        title,
        description,
        videoUrl: videoUploadResult.secure_url,
        thumbnailUrl: thumbnailUploadResult.secure_url,
        owner: req.user._id, // Authenticated user
    });

    res.status(201).json(new ApiResponse(201, newVideo, "Video published successfully"));
});


const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Fetch video from database
    const video = await Video.findById(videoId).populate("owner", "userName email");

    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    res.status(200).json(new ApiResponse(200, video, "Video retrieved successfully"));
});


const updateVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { title, description } = req.body;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Fetch the existing video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    let thumbnailUrl = video.thumbnail; // Keep the existing thumbnail by default

    // Handle thumbnail update if a new file is uploaded
    if (req.file) {
        const uploadResult = await uploadOnCloudinary(req.file.path);
        if (!uploadResult) {
            throw new ApiError(500, "Thumbnail upload failed");
        }
        thumbnailUrl = uploadResult.secure_url;
    }

    // Update video details
    video.title = title || video.title;
    video.description = description || video.description;
    video.thumbnail = thumbnailUrl;

    await video.save();

    res.status(200).json(new ApiResponse(200, video, "Video updated successfully"));
});


const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Fetch the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Delete the video from database
    await Video.findByIdAndDelete(videoId);

    res.status(200).json(new ApiResponse(200, null, "Video deleted successfully"));
});


const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Fetch the video
    const video = await Video.findById(videoId);
    if (!video) {
        throw new ApiError(404, "Video not found");
    }

    // Toggle publish status
    video.isPublished = !video.isPublished;
    await video.save();

    res.status(200).json(new ApiResponse(200, video, "Video publish status updated"));
});


export {
    getAllVideos,
    publishAVideo,
    getVideoById,
    updateVideo,
    deleteVideo,
    togglePublishStatus
}