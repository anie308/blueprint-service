# Blueprint-XYZ Backend API

A comprehensive Node.js/TypeScript backend API for the Blueprint-XYZ creative platform, built with Express.js and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based authentication with refresh tokens
- **User Management**: User registration, profiles, and subscription tiers
- **Studios**: Creative studios/companies management
- **Projects**: Creative project showcase
- **Posts & Reels**: Social media content
- **Jobs**: Job posting and management
- **Messaging**: Direct messaging between users
- **Notifications**: Real-time notification system
- **Save/Like System**: Content interaction features
- **Feed**: Personalized content feed

## 🛠️ Tech Stack

- **Runtime**: Node.js 18+
- **Language**: TypeScript
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Validation**: Joi
- **Security**: Helmet, CORS, Rate Limiting, Input Sanitization
- **Development**: Nodemon, ESLint

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd blueprint-service
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Server Configuration
   PORT=3000
   NODE_ENV=development

   # Database
   MONGODB_URI=mongodb://localhost:27017/blueprint-xyz

   # JWT
   JWT_SECRET=your-super-secret-jwt-key
   JWT_REFRESH_SECRET=your-refresh-secret-key

   # CORS
   FRONTEND_URL=http://localhost:3001
   ```

4. **Start MongoDB**
   ```bash
   # Using local MongoDB
   mongod

   # Or using Docker
   docker run --name mongodb -d -p 27017:27017 mongo:latest
   ```

5. **Start the development server**
   ```bash
   npm run dev
   ```

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints

#### Register User
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "johndoe",
  "email": "john@example.com",
  "password": "password123",
  "confirmPassword": "password123"
}
```

#### Login User
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User
```http
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update Profile
```http
PUT /api/auth/me
Authorization: Bearer <token>
Content-Type: application/json

{
  "bio": "Creative designer and developer",
  "location": "San Francisco, CA",
  "website": "https://johndoe.com",
  "socialLinks": ["https://twitter.com/johndoe"]
}
```

#### Get Public Profile
```http
GET /api/auth/users/{username}
```

### Response Format

#### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": {
    // Response data
  }
}
```

#### Error Response
```json
{
  "success": false,
  "message": "Error message",
  "details": {
    // Additional error details
  }
}
```

#### Paginated Response
```json
{
  "success": true,
  "message": "Data retrieved successfully",
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

## 🗄️ Database Models

### User Model
- `id`: UUID (Primary Key)
- `username`: String (Unique)
- `email`: String (Unique)
- `passwordHash`: String
- `profilePictureUrl`: String (Optional)
- `bio`: String (Optional)
- `location`: String (Optional)
- `website`: String (Optional)
- `socialLinks`: Array of Strings
- `subscriptionTier`: Enum ('free', 'pro', 'premium')
- `createdAt`: DateTime
- `updatedAt`: DateTime

### Studio Model
- `id`: UUID (Primary Key)
- `name`: String (Unique)
- `slug`: String (Unique)
- `logoUrl`: String (Optional)
- `description`: String
- `location`: String
- `website`: String (Optional)
- `ownerId`: ObjectId (Foreign Key to User)
- `members`: Array of ObjectIds (Foreign Keys to User)

### Project Model
- `id`: UUID (Primary Key)
- `title`: String
- `slug`: String (Unique)
- `description`: String
- `coverImageUrl`: String
- `mediaUrls`: Array of Strings
- `authorId`: ObjectId (Polymorphic: User or Studio)
- `authorType`: Enum ('User', 'Studio')
- `tags`: Array of Strings
- `likesCount`: Number
- `commentsCount`: Number
- `viewsCount`: Number

[Continue with other models...]

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev          # Start development server with hot reload

# Building
npm run build        # Compile TypeScript to JavaScript
npm start           # Start production server

# Code Quality
npm run lint        # Run ESLint
npm run lint:fix    # Fix ESLint errors automatically

# Testing
npm test           # Run tests
```

### Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # Route controllers
├── middleware/      # Express middleware
├── models/          # Mongoose models
├── routes/          # Express routes
├── utils/           # Utility functions
├── validation/      # Validation schemas
└── server.ts        # Main server file
```

## 🔒 Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Rate Limiting**: Prevents brute force attacks
- **Input Validation**: Joi schemas for request validation
- **Data Sanitization**: Prevents NoSQL injection attacks
- **CORS**: Proper cross-origin resource sharing setup
- **Security Headers**: Helmet.js for security headers

## 🚀 Deployment

### Environment Variables for Production

```env
NODE_ENV=production
PORT=3000
MONGODB_URI=mongodb://your-production-db
JWT_SECRET=your-production-jwt-secret
JWT_REFRESH_SECRET=your-production-refresh-secret
FRONTEND_URL=https://your-frontend-domain.com
```

### Build for Production

```bash
npm run build
npm start
```

## 📝 API Endpoints Summary

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/api/auth/register` | Register new user | No |
| POST | `/api/auth/login` | Login user | No |
| POST | `/api/auth/logout` | Logout user | No |
| GET | `/api/auth/me` | Get current user | Yes |
| PUT | `/api/auth/me` | Update profile | Yes |
| GET | `/api/auth/users/:username` | Get public profile | No |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, email support@blueprint-xyz.com or join our Discord community.