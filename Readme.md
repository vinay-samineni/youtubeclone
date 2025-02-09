# 🚀 Video Streaming API

A backend API for a video streaming platform, built with **Node.js, Express, MongoDB, and Cloudinary**. The API includes **user authentication, profile management, subscription handling, and video streaming capabilities**.

---

## 📌 Features
- 🔐 **User Authentication** (JWT-based login, registration, and authentication)
- 👤 **User Profile Management** (Update profile, avatar, and user details)
- 📺 **Video Management** (Upload, delete, and retrieve videos)
- ⭐ **Subscription System** (Users can subscribe and unlock premium content)
- 📜 **Watch History & Recommendations** (Track user watch history)
- ☁️ **Cloudinary Integration** (For avatar and video storage)
- ⚡ **Optimized API Performance** (Efficient database queries and caching)

---

## 🛠 Tech Stack
- **Backend:** Node.js, Express.js
- **Database:** MongoDB & Mongoose
- **Authentication:** JWT (JSON Web Token)
- **Storage:** Cloudinary (For avatars and video hosting)
- **Middleware:** Multer (For file uploads)
- **Security:** bcrypt.js, Helmet, CORS

datamodel  link[https://app.eraser.io/workspace/0XaMpLcmZvJS3RWoLx5h}

🔌 API Endpoints
🟢 Authentication
Method	    Endpoint	            Description	                Auth Required
POST	    /api/auth/register	    Register a new user	            ❌
POST	    /api/auth/login	        Login and get token	            ❌


👤 User Routes
Method	        Endpoint	        Description	                Auth Required
GET	            /api/user/profile	Get user profile	            ✅
PATCH	        /api/user/update	Update profile details	        ✅
PATCH	        /api/user/avatar	Update profile avatar	        ✅

📺 Video Routes
Method	        Endpoint	        Description	                Auth Required
POST	        /api/video/upload	Upload a new video	            ✅
GET	            /api/video/:id	    Get a video by ID	            ✅
DELETE	        /api/video/:id	    Delete a video	                ✅

⭐ Subscription Routes
Method	        Endpoint	                Description	                Auth Required
POST	        /api/subscription	        Subscribe to premium	        ✅
GET	            /api/subscription/status	Check subscription status	    ✅


🏗 Future Improvements
🎥 Live Streaming Support
📡 WebSockets for Real-Time Chat
📊 Analytics Dashboard
🎭 AI-based Video Recommendations

📧 Contact & Contributions
Want to contribute? Feel free to fork the repository and submit a pull request!

📧 Email: saminenivinay999@gmail.com