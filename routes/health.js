const express = require('express');
const User = require('../models/User');
const HealthPlan = require('../models/HealthPlan');
const UserActivity = require('../models/UserActivity');
const router = express.Router();

// BMI Calculator endpoint
router.post('/calculate-bmi', (req, res) => {
  try {
    const { weight, height } = req.body;

    if (!weight || !height) {
      return res.status(400).json({
        error: 'Weight and height are required',
        message: 'Please provide both weight (kg) and height (cm)'
      });
    }

    const heightInMeters = height / 100;
    const bmi = (weight / (heightInMeters * heightInMeters)).toFixed(1);

    let category = '';
    let healthRisk = '';
    let recommendations = '';

    if (bmi < 18.5) {
      category = 'Underweight';
      healthRisk = 'Low';
      recommendations = 'Consider increasing caloric intake with nutrient-dense foods and consult a healthcare provider.';
    } else if (bmi < 25) {
      category = 'Normal weight';
      healthRisk = 'Low';
      recommendations = 'Maintain your current healthy lifestyle with balanced diet and regular exercise.';
    } else if (bmi < 30) {
      category = 'Overweight';
      healthRisk = 'Moderate';
      recommendations = 'Consider reducing caloric intake and increasing physical activity. Consult a healthcare provider for guidance.';
    } else {
      category = 'Obese';
      healthRisk = 'High';
      recommendations = 'Strongly recommend consulting a healthcare provider for a comprehensive weight management plan.';
    }

    res.json({
      success: true,
      data: {
        bmi: parseFloat(bmi),
        category,
        healthRisk,
        recommendations,
        input: { weight, height }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating BMI:', error);
    res.status(500).json({
      error: 'Failed to calculate BMI',
      message: error.message
    });
  }
});

// Calorie calculator endpoint
router.post('/calculate-calories', (req, res) => {
  try {
    const { age, gender, weight, height, activityLevel } = req.body;

    if (!age || !gender || !weight || !height || !activityLevel) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: 'Please provide age, gender, weight, height, and activity level'
      });
    }

    const heightInCm = height;
    
    // Calculate BMR using Mifflin-St Jeor Equation
    let bmr;
    if (gender.toLowerCase() === 'male') {
      bmr = (10 * weight) + (6.25 * heightInCm) - (5 * age) + 5;
    } else {
      bmr = (10 * weight) + (6.25 * heightInCm) - (5 * age) - 161;
    }

    // Activity multipliers
    const activityMultipliers = {
      'sedentary': 1.2,
      'lightly_active': 1.375,
      'moderately_active': 1.55,
      'very_active': 1.725,
      'extra_active': 1.9
    };

    const multiplier = activityMultipliers[activityLevel] || 1.2;
    const dailyCalories = Math.round(bmr * multiplier);

    // Weight goals
    const weightLoss = Math.round(dailyCalories - 500); // 1 lb per week loss
    const weightGain = Math.round(dailyCalories + 500); // 1 lb per week gain

    res.json({
      success: true,
      data: {
        bmr: Math.round(bmr),
        maintenance: dailyCalories,
        weightLoss,
        weightGain,
        activityLevel,
        recommendations: {
          carbs: Math.round(dailyCalories * 0.45 / 4), // 45% carbs
          protein: Math.round(dailyCalories * 0.25 / 4), // 25% protein
          fat: Math.round(dailyCalories * 0.30 / 9) // 30% fat
        }
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error calculating calories:', error);
    res.status(500).json({
      error: 'Failed to calculate calories',
      message: error.message
    });
  }
});

// Save user profile (health data)
router.post('/save-profile', async (req, res) => {
  try {
    const {
      // Extract all possible fields from the request
      full_name, email, dob, gender, current_weight, current_height, bmi,
      goal, exercise_frequency, diet_preference, meals_per_day, plan_duration,
      fav_nutrition_type, food_allergies, food_allergies2, other_food_allergies,
      nutrition_days, meals_num, fav_workout, workout_goal, workout_days,
      health_conditions, other_health_conditions, chronic_conditions, other_chronic_conditions
    } = req.body;

    // Validate required fields
    if (!full_name || !email) {
      return res.status(400).json({
        success: false,
        message: 'Full name and email are required'
      });
    }

    // Helper function to parse numeric values from strings
    const parseNumericValue = (value, fallback = null) => {
      if (typeof value === 'number') return value;
      if (typeof value === 'string') {
        // Try to extract number from string like "5 days" or "4 meals (main + snacks)"
        const numberMatch = value.match(/(\d+)/);
        if (numberMatch) {
          return parseInt(numberMatch[1]);
        }
        
        // Handle word numbers like "four_meals"
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
        
        // Try direct parsing
        const parsed = parseInt(value);
        return isNaN(parsed) ? fallback : parsed;
      }
      return fallback;
    };

    // Process food allergies array
    const allergiesArray = [food_allergies, food_allergies2, other_food_allergies]
      .filter(allergy => allergy && allergy.trim() !== '')
      .map(allergy => allergy.trim());

    // Process health conditions array
    const healthConditionsArray = [health_conditions, other_health_conditions]
      .filter(condition => condition && condition.trim() !== '')
      .map(condition => condition.trim());

    const chronicConditionsArray = [chronic_conditions, other_chronic_conditions]
      .filter(condition => condition && condition.trim() !== '')
      .map(condition => condition.trim());    // Find or create user
    let user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      // Create new user with default password (should be updated through proper signup)
      user = new User({
        full_name,
        email: email.toLowerCase(),
        password: 'temp_password_' + Date.now(), // Temporary password
        dob: dob ? new Date(dob) : null,
        gender: gender || 'other',
        current_weight: current_weight || 70,
        current_height: current_height || 170,
        bmi,
        goal: goal || 'general_health',
        exercise_frequency: exercise_frequency || 'moderate',
        diet_preference: diet_preference || 'balanced',
        meals_per_day: parseNumericValue(meals_per_day, 3),
        plan_duration: plan_duration || '1 month',
        fav_nutrition_type,
        food_allergies: allergiesArray,
        nutrition_days: parseNumericValue(nutrition_days, 7),
        meals_num: parseNumericValue(meals_num, 3),
        fav_workout,
        workout_goal,
        workout_days: parseNumericValue(workout_days, 5),
        health_conditions: healthConditionsArray,
        chronic_conditions: chronicConditionsArray
      });
    } else {
      // Update existing user
      Object.assign(user, {
        full_name,
        dob: dob ? new Date(dob) : user.dob,
        gender: gender || user.gender,
        current_weight: current_weight || user.current_weight,
        current_height: current_height || user.current_height,
        bmi: bmi || user.bmi,
        goal: goal || user.goal,
        exercise_frequency: exercise_frequency || user.exercise_frequency,
        diet_preference: diet_preference || user.diet_preference,
        meals_per_day: parseNumericValue(meals_per_day, user.meals_per_day),
        plan_duration: plan_duration || user.plan_duration,
        fav_nutrition_type,
        food_allergies: allergiesArray,
        nutrition_days: parseNumericValue(nutrition_days, user.nutrition_days),
        meals_num: parseNumericValue(meals_num, user.meals_num),
        fav_workout,
        workout_goal,
        workout_days: parseNumericValue(workout_days, user.workout_days),
        health_conditions: healthConditionsArray,
        chronic_conditions: chronicConditionsArray,
        last_login: new Date()
      });
    }

    await user.save();

    res.json({
      success: true,
      message: 'Profile saved successfully',
      user: {
        id: user._id,
        full_name: user.full_name,
        email: user.email,
        bmi: user.bmi,
        goal: user.goal
      }
    });

  } catch (error) {
    console.error('Error saving profile:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save profile',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Get health tips
router.get('/tips/:category', (req, res) => {
  try {
    const { category } = req.params;

    const tips = {
      nutrition: [
        "Drink water before meals to help control appetite",
        "Include protein in every meal to maintain satiety",
        "Eat colorful vegetables to ensure diverse nutrients",
        "Practice portion control using smaller plates",
        "Limit processed foods and choose whole foods instead"
      ],
      exercise: [
        "Start with 10-minute workouts if you're a beginner",
        "Include both cardio and strength training",
        "Take the stairs instead of elevators when possible",
        "Do bodyweight exercises during TV commercial breaks",
        "Schedule workouts like important appointments"
      ],
      sleep: [
        "Maintain a consistent sleep schedule",
        "Create a relaxing bedtime routine",
        "Keep your bedroom cool and dark",
        "Avoid screens 1 hour before bedtime",
        "Limit caffeine intake after 2 PM"
      ],
      general: [
        "Take regular breaks from sitting every hour",
        "Practice deep breathing exercises daily",
        "Spend time outdoors for vitamin D and fresh air",
        "Keep a gratitude journal for mental health",
        "Stay socially connected with friends and family"
      ]
    };

    const categoryTips = tips[category] || tips.general;
    const randomTip = categoryTips[Math.floor(Math.random() * categoryTips.length)];

    res.json({
      success: true,
      data: {
        category,
        tip: randomTip,
        allTips: categoryTips
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error getting tips:', error);
    res.status(500).json({
      error: 'Failed to get tips',
      message: error.message
    });
  }
});

// Get health statistics from database
router.get('/stats', async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ last_login: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } });
    const totalPlans = await HealthPlan.countDocuments();
    const activePlans = await HealthPlan.countDocuments({ status: 'active' });
    const completedPlans = await HealthPlan.countDocuments({ status: 'completed' });
    
    // Get average BMI
    const bmiStats = await User.aggregate([
      { $match: { bmi: { $exists: true, $ne: null } } },
      { $group: { _id: null, avgBMI: { $avg: '$bmi' }, count: { $sum: 1 } } }
    ]);
    
    // Get popular goals
    const goalStats = await User.aggregate([
      { $match: { goal: { $exists: true, $ne: null } } },
      { $group: { _id: '$goal', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);
    
    // Get recent activity
    const recentActivity = await UserActivity.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) }
    });
    
    res.json({
      success: true,
      stats: {
        users: {
          total: totalUsers,
          active: activeUsers,
          activity_rate: totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 0
        },
        plans: {
          total: totalPlans,
          active: activePlans,
          completed: completedPlans,
          completion_rate: totalPlans > 0 ? Math.round((completedPlans / totalPlans) * 100) : 0
        },
        health: {
          average_bmi: bmiStats.length > 0 ? Math.round(bmiStats[0].avgBMI * 10) / 10 : null,
          bmi_sample_size: bmiStats.length > 0 ? bmiStats[0].count : 0
        },
        popular_goals: goalStats.map(goal => ({
          goal: goal._id,
          count: goal.count
        })),
        recent_activity: recentActivity
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching health stats:', error);
    res.status(500).json({
      error: 'Failed to fetch health statistics',
      message: error.message
    });
  }
});

// Get user profile
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({
        error: 'User not found',
        message: 'User profile not found'
      });
    }
    
    const activePlan = await HealthPlan.findOne({ user_id: userId, status: 'active' });
    const totalPlans = await HealthPlan.countDocuments({ user_id: userId });
    const completedPlans = await HealthPlan.countDocuments({ user_id: userId, status: 'completed' });
    
    res.json({
      success: true,
      profile: user.getProfileData(),
      stats: {
        total_plans: totalPlans,
        completed_plans: completedPlans,
        has_active_plan: !!activePlan,
        active_plan_id: activePlan?._id || null
      }
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({
      error: 'Failed to fetch user profile',
      message: error.message
    });
  }
});

module.exports = router;
