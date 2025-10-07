# Live Chat Application - Backend

Real-time chat application backend built with NestJS and Socket.io.

## Features

- User authentication with JWT
- Real-time messaging using WebSocket
- Channel-based group chat
- Direct messaging between users
- Typing indicators
- Read receipts
- Message reactions
- File and image sharing
- Online/offline status

## Tech Stack

- NestJS
- Socket.io
- MongoDB
- Mongoose
- JWT
- Cloudinary

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with these variables:
```
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=7d
PORT=3001
CLOUDINARY_CLOUD_NAME=your_cloudinary_name
CLOUDINARY_API_KEY=your_cloudinary_key
CLOUDINARY_API_SECRET=your_cloudinary_secret
```

3. Run the application:
```bash
npm run start:dev
```

The server will run on http://localhost:3001
