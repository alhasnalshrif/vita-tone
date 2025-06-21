const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const HealthPlan = require('../models/HealthPlan');
const UserActivity = require('../models/UserActivity');

const router = express.Router();

// Middleware to verify JWT token
async function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret-key');
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
}

// Validation middleware
const validateProfile = [
    body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be male, female, or other'),
    body('full_name').optional().trim().isLength({ min: 2, max: 100 }).withMessage('Full name must be between 2 and 100 characters'),
    body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date'),
    body('current_weight').optional().isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20 and 500 kg'),
    body('current_height').optional().isFloat({ min: 50, max: 300 }).withMessage('Height must be between 50 and 300 cm'),
    body('fav_nutrition_type').optional().isString().withMessage('Nutrition type must be a string'),
    body('food_allergies').optional().custom((value) => {
        // Allow both string and array
        if (typeof value === 'string' || Array.isArray(value)) {
            return true;
        }
        throw new Error('Food allergies must be a string or array');
    }),
    body('activity_level').optional().isIn(['sedentary', 'light', 'moderate', 'active', 'very_active']).withMessage('Invalid activity level'),
    body('fitness_goal').optional().isIn(['lose_weight', 'gain_weight', 'maintain_weight', 'build_muscle', 'improve_fitness']).withMessage('Invalid fitness goal')
];

const validateDailyEntry = [
    body('date').isISO8601().withMessage('Date must be valid'),
    body('weight').optional().isFloat({ min: 20, max: 500 }).withMessage('Weight must be between 20 and 500 kg'),
    body('calories_consumed').optional().isInt({ min: 0, max: 10000 }).withMessage('Calories consumed must be between 0 and 10000'),
    body('calories_burned').optional().isInt({ min: 0, max: 5000 }).withMessage('Calories burned must be between 0 and 5000'),
    body('water_intake').optional().isFloat({ min: 0, max: 20 }).withMessage('Water intake must be between 0 and 20 liters'),
    body('sleep_hours').optional().isFloat({ min: 0, max: 24 }).withMessage('Sleep hours must be between 0 and 24'),
    body('mood').optional().isIn(['excellent', 'good', 'neutral', 'bad', 'terrible']).withMessage('Invalid mood value'),
    body('exercise_minutes').optional().isInt({ min: 0, max: 1440 }).withMessage('Exercise minutes must be between 0 and 1440'),
    body('notes').optional().isString().isLength({ max: 500 }).withMessage('Notes must be less than 500 characters')
];

// Routes

// Get user profile
router.get('/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            profile: user.getProfileData()
        });

    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Save/Update user profile
router.post('/profile', authenticateToken, validateProfile, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }        // Update user with provided data
        const updateData = req.body;
        
        // Function to extract number from various string formats
        function extractNumber(value, fieldName) {
            if (typeof value === 'number') {
                return value;
            }
            
            if (typeof value !== 'string') {
                return null;
            }
            
            // Try to extract number from string (e.g., "4 days", "2 meals (intermittent fasting)")
            const numberMatch = value.match(/(\d+)/);
            if (numberMatch) {
                return parseInt(numberMatch[1]);
            }
            
            // Handle word numbers (e.g., "four_meals", "two_meals")
            const wordNumbers = {
                'one': 1, 'two': 2, 'three': 3, 'four': 4, 'five': 5,
                'six': 6, 'seven': 7, 'eight': 8, 'nine': 9, 'ten': 10
            };
            
            const lowerValue = value.toLowerCase();
            for (const [word, num] of Object.entries(wordNumbers)) {
                if (lowerValue.includes(word)) {
                    return num;
                }
            }
            
            // Try direct parsing as fallback
            const parsed = parseInt(value);
            return isNaN(parsed) ? null : parsed;
        }
        
        Object.keys(updateData).forEach(key => {
            if (updateData[key] !== undefined && updateData[key] !== null) {
                let processedValue = updateData[key];
                
                // Special handling for different field types
                if (key === 'food_allergies') {
                    // Convert string to array for food allergies
                    if (typeof updateData[key] === 'string') {
                        processedValue = updateData[key].split(',').map(allergy => allergy.trim()).filter(allergy => allergy !== '');
                    } else if (Array.isArray(updateData[key])) {
                        processedValue = updateData[key];
                    }
                } else if (['nutrition_days', 'meals_num', 'meals_per_day', 'workout_days'].includes(key)) {
                    // Extract number from strings for numeric fields
                    const extractedNumber = extractNumber(updateData[key], key);
                    if (extractedNumber !== null) {
                        processedValue = extractedNumber;
                    } else {
                        console.warn(`Could not parse numeric value for ${key}: "${updateData[key]}". Skipping field.`);
                        return; // Skip this field if we can't parse it
                    }
                }
                
                // Assign the processed value
                user[key] = processedValue;
            }
        });

        await user.save();

        res.json({
            success: true,
            message: 'Profile updated successfully',
            profile: user.getProfileData()
        });

    } catch (error) {
        console.error('Save profile error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
});

// Get daily data for a specific date range
router.get('/daily', authenticateToken, async (req, res) => {
    try {
        const { startDate, endDate, date } = req.query;

        // Build query for user's activities
        let query = { user_id: req.user.userId };

        // Filter by date if specified
        if (date) {
            const specificDate = new Date(date);
            const nextDay = new Date(specificDate);
            nextDay.setDate(nextDay.getDate() + 1);
            query.date = { $gte: specificDate, $lt: nextDay };
        } else if (startDate && endDate) {
            query.date = {
                $gte: new Date(startDate),
                $lte: new Date(endDate)
            };
        }

        const userDailyData = await UserActivity.find(query)
            .sort({ date: -1 })
            .limit(100); // Limit to prevent too much data

        res.json({
            success: true,
            data: userDailyData.map(activity => activity.getDailySummary())
        });

    } catch (error) {
        console.error('Get daily data error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Save daily entry
router.post('/daily', authenticateToken, validateDailyEntry, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { date, weight, calories_consumed, calories_burned, water_intake, sleep_hours, mood, exercise_minutes, notes } = req.body;

        // Check if entry for this date already exists
        const existingEntry = await UserActivity.findOne({
            user_id: req.user.userId,
            date: new Date(date)
        });

        if (existingEntry) {
            // Update existing entry
            if (weight) existingEntry.weight = weight;
            if (water_intake) existingEntry.water_intake = water_intake;
            if (sleep_hours) existingEntry.sleep_hours = sleep_hours;
            if (mood) existingEntry.mood = mood;
            if (notes) existingEntry.daily_notes = notes;

            await existingEntry.save();

            res.json({
                success: true,
                message: 'Daily entry updated successfully',
                data: existingEntry.getDailySummary()
            });
        } else {
            // Create new entry
            const newEntry = new UserActivity({
                user_id: req.user.userId,
                plan_id: null, // Will be set if user has an active plan
                date: new Date(date),
                weight,
                water_intake: water_intake || 0,
                sleep_hours: sleep_hours || 0,
                mood,
                daily_notes: notes,
                exercises_completed: exercise_minutes ? [{
                    exercise_name: 'General Exercise',
                    duration: exercise_minutes,
                    completed: true
                }] : []
            });

            await newEntry.save();

            res.json({
                success: true,
                message: 'Daily entry saved successfully',
                data: newEntry.getDailySummary()
            });
        }

    } catch (error) {
        console.error('Save daily entry error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user statistics
router.get('/stats', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        const userActivities = await UserActivity.find({ user_id: req.user.userId })
            .sort({ date: -1 })
            .limit(30); // Last 30 days

        // Calculate statistics
        const stats = {
            totalEntries: userActivities.length,
            averageWeight: 0,
            weightProgress: 0,
            averageCalories: 0,
            averageExercise: 0,
            averageWater: 0,
            averageSleep: 0,
            currentStreak: 0,
            averageCompletion: 0
        };

        if (userActivities.length > 0) {
            // Calculate weight statistics
            const activitiesWithWeight = userActivities.filter(activity => activity.weight);
            if (activitiesWithWeight.length > 0) {
                const weights = activitiesWithWeight.map(activity => activity.weight);
                stats.averageWeight = weights.reduce((sum, weight) => sum + weight, 0) / weights.length;

                // Calculate weight progress if user has a goal
                if (user && weights.length > 1) {
                    const startWeight = weights[weights.length - 1]; // Oldest entry
                    const currentWeight = weights[0]; // Most recent entry
                    stats.weightProgress = ((startWeight - currentWeight) / startWeight) * 100;
                }
            }

            // Calculate other averages
            const activitiesWithWater = userActivities.filter(activity => activity.water_intake > 0);
            if (activitiesWithWater.length > 0) {
                stats.averageWater = activitiesWithWater.reduce((sum, activity) => sum + activity.water_intake, 0) / activitiesWithWater.length;
            }

            const activitiesWithSleep = userActivities.filter(activity => activity.sleep_hours > 0);
            if (activitiesWithSleep.length > 0) {
                stats.averageSleep = activitiesWithSleep.reduce((sum, activity) => sum + activity.sleep_hours, 0) / activitiesWithSleep.length;
            }

            // Calculate average completion percentage
            stats.averageCompletion = userActivities.reduce((sum, activity) => sum + activity.completion_percentage, 0) / userActivities.length;

            // Calculate current streak (consecutive days with >50% completion)
            let streak = 0;
            for (const activity of userActivities) {
                if (activity.completion_percentage >= 50) {
                    streak++;
                } else {
                    break;
                }
            }
            stats.currentStreak = streak;
        }

        res.json({
            success: true,
            stats: stats,
            profile: user ? user.getProfileData() : null
        });

    } catch (error) {
        console.error('Get stats error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user settings
router.get('/settings', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Return user settings data
        const settings = {
            personal: {
                full_name: user.full_name,
                gender: user.gender,
                dob: user.dob,
                current_weight: user.current_weight,
                goal: user.goal
            },
            nutrition: {
                fav_nutrition_type: user.fav_nutrition_type,
                food_allergies: user.food_allergies,
                meals_per_day: user.meals_per_day,
                diet_preference: user.diet_preference
            },
            exercise: {
                fav_workout: user.fav_workout,
                workout_goal: user.workout_goal, 
                exercise_frequency: user.exercise_frequency
            },            display: {
                language: user.language || 'en',
                unit_system: user.unit_system || 'metric'
            },
            privacy: {
                email: user.email
            }
        };

        res.json({
            success: true,
            settings: settings
        });

    } catch (error) {
        console.error('Get user settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Update user settings
router.put('/settings', authenticateToken, [
    body('personal.full_name').optional().trim().isLength({ min: 2, max: 100 }),
    body('personal.gender').optional().isIn(['male', 'female', 'other']),
    body('personal.dob').optional().isISO8601(),
    body('personal.current_weight').optional().isFloat({ min: 20, max: 500 }),
    body('personal.goal').optional().isString(),
    body('nutrition.fav_nutrition_type').optional().isString(),
    body('nutrition.food_allergies').optional().isArray(),
    body('nutrition.meals_per_day').optional().isInt({ min: 1, max: 8 }),
    body('nutrition.diet_preference').optional().isString(),
    body('exercise.fav_workout').optional().isString(),
    body('exercise.workout_goal').optional().isString(),
    body('exercise.exercise_frequency').optional().isString(),    body('display.language').optional().isString(),
    body('display.unit_system').optional().isIn(['metric', 'imperial']),
    body('privacy.password').optional().isLength({ min: 6 })
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const user = await User.findById(req.user.userId);
        
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const { personal, nutrition, exercise, display, privacy } = req.body;

        // Update personal settings
        if (personal) {
            if (personal.full_name) user.full_name = personal.full_name;
            if (personal.gender) user.gender = personal.gender;
            if (personal.dob) user.dob = personal.dob;
            if (personal.current_weight) user.current_weight = personal.current_weight;
            if (personal.goal) user.goal = personal.goal;
        }

        // Update nutrition settings
        if (nutrition) {
            if (nutrition.fav_nutrition_type) user.fav_nutrition_type = nutrition.fav_nutrition_type;
            if (nutrition.food_allergies) user.food_allergies = nutrition.food_allergies;
            if (nutrition.meals_per_day) user.meals_per_day = nutrition.meals_per_day;
            if (nutrition.diet_preference) user.diet_preference = nutrition.diet_preference;
        }

        // Update exercise settings
        if (exercise) {
            if (exercise.fav_workout) user.fav_workout = exercise.fav_workout;
            if (exercise.workout_goal) user.workout_goal = exercise.workout_goal;
            if (exercise.exercise_frequency) user.exercise_frequency = exercise.exercise_frequency;
        }        // Update display settings (add to user schema if not exists)
        if (display) {
            if (display.language) user.language = display.language;
            if (display.unit_system) user.unit_system = display.unit_system;
        }

        // Handle password change
        if (privacy && privacy.password) {
            const bcrypt = require('bcrypt');
            const saltRounds = 10;
            user.password = await bcrypt.hash(privacy.password, saltRounds);
        }

        await user.save();

        res.json({
            success: true,
            message: 'Settings updated successfully',
            settings: {
                personal: {
                    full_name: user.full_name,
                    gender: user.gender,
                    dob: user.dob,
                    current_weight: user.current_weight,
                    goal: user.goal
                },
                nutrition: {
                    fav_nutrition_type: user.fav_nutrition_type,
                    food_allergies: user.food_allergies,
                    meals_per_day: user.meals_per_day,
                    diet_preference: user.diet_preference
                },
                exercise: {
                    fav_workout: user.fav_workout,
                    workout_goal: user.workout_goal,
                    exercise_frequency: user.exercise_frequency
                },                display: {
                    language: user.language || 'en',
                    unit_system: user.unit_system || 'metric'
                }
            }
        });

    } catch (error) {
        console.error('Update user settings error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Submit feedback
router.post('/feedback', authenticateToken, [
    body('feedback').optional().trim().isLength({ max: 1000 }).withMessage('Feedback must be less than 1000 characters'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('category').optional().isIn(['bug', 'feature', 'general', 'support']).withMessage('Invalid feedback category')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: errors.array()
            });
        }

        const { feedback, rating, category } = req.body;
        const userId = req.user.userId;

        // In a real app, you would save this to a feedback collection
        // For now, we'll just log it and return success
        console.log('User Feedback:', {
            userId,
            feedback,
            rating,
            category,
            timestamp: new Date()
        });

        res.json({
            success: true,
            message: 'Thank you for your feedback!'
        });

    } catch (error) {
        console.error('Submit feedback error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

module.exports = router;
