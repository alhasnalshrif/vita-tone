# VitaTone - Fitness & Nutrition Tracking API

A comprehensive backend API for the VitaTone fitness and nutrition tracking application.

## Features

- User authentication and profiles
- Personalized settings for nutrition and exercise preferences
- Meal tracking and nutrition logging
- Workout planning and exercise tracking
- Progress monitoring and reports
- Plan generation based on user goals and preferences

## Setup Instructions

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file based on the example provided
4. Setup the database:
   ```
   npx prisma migrate dev --name init
   ```
5. Start the development server:
   ```
   npm run dev
   ```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new user
- `POST /api/auth/login` - Log in a user

### User Profile
- `GET /api/users/profile` - Get user profile
- `PUT /api/users/profile` - Update user profile
- `POST /api/users/medical-conditions` - Update medical conditions
- `POST /api/users/food-allergies` - Update food allergies

### Settings
- `GET /api/settings` - Get all user settings
- `PUT /api/settings/dietary` - Update dietary settings
- `PUT /api/settings/exercise` - Update exercise settings
- `PUT /api/settings/notifications` - Update notification settings
- `PUT /api/settings/preferences` - Update user preferences

### Meals
- `GET /api/meals` - Get all meals
- `GET /api/meals/:id` - Get a specific meal
- `POST /api/meals` - Create a new meal
- `PUT /api/meals/:id` - Update a meal
- `DELETE /api/meals/:id` - Delete a meal

### Workouts
- `GET /api/workouts` - Get all workouts
- `GET /api/workouts/:id` - Get a specific workout
- `POST /api/workouts` - Create a new workout
- `PUT /api/workouts/:id` - Update a workout
- `DELETE /api/workouts/:id` - Delete a workout

### Plans
- `POST /api/plans/generate-meal-plan` - Generate a meal plan
- `POST /api/plans/generate-workout-plan` - Generate a workout plan

### Progress
- `GET /api/progress` - Get progress tracking data
- `POST /api/progress` - Add new progress entry
- `PUT /api/progress/:id` - Update progress entry
- `DELETE /api/progress/:id` - Delete progress entry
- `GET /api/progress/summary` - Get summary of progress

