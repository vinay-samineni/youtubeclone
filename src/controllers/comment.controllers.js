import mongoose from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import {asyncHandler} from "../utils/asyncHandler.js"

const getVideoComments = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate videoId
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }

    // Fetch comments for the video with pagination
    const comments = await Comment.find({ video: videoId })
        .sort({ createdAt: -1 }) // Newest first
        .skip((page - 1) * limit)
        .limit(parseInt(limit))
        .populate("user", "userName avatar") // Populate user details
        .lean();

    res.status(200).json(
        new ApiResponse(200, { comments }, "Comments fetched successfully")
    );
});


const addComment = asyncHandler(async (req, res) => {
    const { videoId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Extract userId from JWT payload

    // Validate inputs
    if (!mongoose.isValidObjectId(videoId)) {
        throw new ApiError(400, "Invalid video ID");
    }
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    // Check if the video exists
    const videoExists = await mongoose.model("Video").exists({ _id: videoId });
    if (!videoExists) {
        throw new ApiError(404, "Video not found");
    }

    // Create and save the comment
    const newComment = await Comment.create({
        video: videoId,
        user: userId,
        content,
    });

    // Populate user details
    const populatedComment = await newComment.populate("user", "userName avatar");

    res.status(201).json(
        new ApiResponse(201, { comment: populatedComment }, "Comment added successfully")
    );
});


const updateComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const { content } = req.body;
    const userId = req.user.id; // Extract userId from JWT payload

    // Validate inputs
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }
    if (!content || content.trim().length === 0) {
        throw new ApiError(400, "Comment content cannot be empty");
    }

    // Check if the comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Ensure the user owns the comment
    if (comment.user.toString() !== userId) {
        throw new ApiError(403, "You are not authorized to update this comment");
    }

    // Update the comment
    comment.content = content;
    await comment.save();

    res.status(200).json(
        new ApiResponse(200, { comment }, "Comment updated successfully")
    );
});


const deleteComment = asyncHandler(async (req, res) => {
    const { commentId } = req.params;
    const userId = req.user.id; // Extract userId from JWT payload

    // Validate commentId
    if (!mongoose.isValidObjectId(commentId)) {
        throw new ApiError(400, "Invalid comment ID");
    }

    // Check if the comment exists
    const comment = await Comment.findById(commentId);
    if (!comment) {
        throw new ApiError(404, "Comment not found");
    }

    // Ensure the user owns the comment
    if (comment.user.toString() !== userId) {
        throw new ApiError(403, "You are not authorized to delete this comment");
    }

    // Delete the comment
    await Comment.findByIdAndDelete(commentId);

    res.status(200).json(
        new ApiResponse(200, null, "Comment deleted successfully")
    );
});

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }