const express = require('express');
const axios = require('axios');
const User = require('../models/User');
const HealthPlan = require('../models/HealthPlan');
const UserActivity = require('../models/UserActivity');
const router = express.Router();

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent';

// Middleware to check API key
const checkApiKey = (req, res, next) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'your_gemini_api_key_here') {
    return res.status(500).json({
      error: 'API key not configured',
      message: 'Please set your GEMINI_API_KEY in the .env file'
    });
  }
  next();
};

// Generate health plan based on user data
router.post('/generate-plan', checkApiKey, async (req, res) => {
  try {
    const userData = req.body;    // Extract key information from the comprehensive form data
    const {
      full_name, email, dob, gender, current_weight, current_height, bmi,
      goal, exercise_frequency, diet_preference, meals_per_day, plan_duration,
      fav_nutrition_type, food_allergies, food_allergies2, other_food_allergies,
      nutrition_days, meals_num, fav_workout, workout_goal, workout_days,
      health_conditions, other_health_conditions, chronic_conditions, other_chronic_conditions
    } = userData;

    // Helper function to parse numeric values from strings (same as in user.js and health.js)
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
    let allergiesArray = [];
    
    // Handle both array and string formats for food_allergies
    if (food_allergies) {
      if (Array.isArray(food_allergies)) {
        allergiesArray = food_allergies.filter(allergy => allergy && typeof allergy === 'string' && allergy.trim() !== '');
      } else if (typeof food_allergies === 'string' && food_allergies.trim() !== '') {
        allergiesArray.push(food_allergies.trim());
      }
    }
    
    // Add other allergy fields if they exist
    [food_allergies2, other_food_allergies]
      .filter(allergy => allergy && typeof allergy === 'string' && allergy.trim() !== '')
      .forEach(allergy => allergiesArray.push(allergy.trim()));

    // Process health conditions array
    const healthConditionsArray = [health_conditions, other_health_conditions]
      .filter(condition => condition && typeof condition === 'string' && condition.trim() !== '')
      .map(condition => condition.trim());

    const chronicConditionsArray = [chronic_conditions, other_chronic_conditions]
      .filter(condition => condition && typeof condition === 'string' && condition.trim() !== '')
      .map(condition => condition.trim());

    // Find or create user
    let user;
    if (email) {
      user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        user = new User({
          full_name,
          email: email.toLowerCase(),
          password: 'temp_password', // This should be properly hashed in a real app
          dob: dob ? new Date(dob) : null,
          gender,
          current_weight,
          current_height,
          bmi,
          goal,
          exercise_frequency,
          diet_preference,
          meals_per_day: parseNumericValue(meals_per_day, 3),
          plan_duration,
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
        await user.save();
        console.log(`✅ Created new user: ${full_name}`);
      } else {
        // Update existing user data
        Object.assign(user, {
          full_name,
          dob: dob ? new Date(dob) : user.dob,
          gender,
          current_weight,
          current_height,
          bmi,
          goal,
          exercise_frequency,
          diet_preference,
          meals_per_day: parseNumericValue(meals_per_day, user.meals_per_day),
          plan_duration,
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
        await user.save();
        console.log(`✅ Updated existing user: ${full_name}`);
      }
    }

    // Build comprehensive prompt based on all user data
    const prompt = `Create a comprehensive personalized health and fitness plan for ${full_name || 'the user'}.

User Profile:
- Gender: ${gender}
- Weight: ${current_weight}kg
- Height: ${current_height}cm
- BMI: ${bmi}
- Age: ${dob ? new Date().getFullYear() - new Date(dob).getFullYear() : 'Not provided'}

Primary Goal: ${goal}
Exercise Frequency: ${exercise_frequency}
Diet Preference: ${diet_preference}
Preferred Meals Per Day: ${meals_per_day}
Plan Duration: ${plan_duration}

Nutrition Preferences:
- Favorite Nutrition Type: ${fav_nutrition_type}
- Food Allergies: ${allergiesArray.join(', ') || 'None'}
- Nutrition Days per Week: ${nutrition_days}
- Number of Meals: ${meals_num}

Exercise Preferences:
- Favorite Workout Type: ${fav_workout}
- Workout Goal: ${workout_goal}
- Workout Days per Week: ${workout_days}

Health Considerations:
- Health Conditions: ${healthConditionsArray.join(', ') || 'None'}
- Chronic Conditions: ${chronicConditionsArray.join(', ') || 'None'}

Please create a detailed 7-day health plan that includes:

1. **7-Day Exercise Plan**: Day-by-day workout schedule considering their fitness level, available time, and health conditions
2. **7-Day Nutrition Plan**: Meal plans for ${meals_per_day} with specific recipes and portion sizes, considering allergies and preferences
3. **Daily Schedule**: Hour-by-hour recommendations for optimal health routine
4. **Progress Tracking**: Specific metrics to track and milestones to achieve
5. **Health & Safety Guidelines**: Important considerations based on reported health conditions
6. **Motivation & Tips**: Practical advice for staying consistent

IMPORTANT: Create exactly 7 days of content. Return the response as a JSON array with 7 objects. Each object should have this structure:
{
  "food": {
    "breakfast": ["meal item 1", "meal item 2"],
    "lunch": ["meal item 1", "meal item 2"],
    "dinner": ["meal item 1", "meal item 2"]
  },
  "exercise": ["exercise 1", "exercise 2", "exercise 3"]
}

Return ONLY the JSON array, no other text or formatting.`; const response = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const generatedPlan = response.data.candidates[0].content.parts[0].text;

    // Try to extract structured data from the response
    let structuredPlan = [];
    try {
      // First try to parse as direct JSON
      const cleanText = generatedPlan.trim();
      if (cleanText.startsWith('[') && cleanText.endsWith(']')) {
        structuredPlan = JSON.parse(cleanText);
        console.log('Parsed direct JSON array:', structuredPlan.length, 'days');
      } else {
        // Try to extract JSON from markdown code blocks
        const jsonMatch = generatedPlan.match(/```json\n([\s\S]*?)\n```/);
        if (jsonMatch) {
          structuredPlan = JSON.parse(jsonMatch[1]);
          console.log('Parsed JSON from markdown:', structuredPlan.length, 'days');
        }
      }
    } catch (parseError) {
      console.log('Could not parse structured JSON from AI response:', parseError.message);
      console.log('AI response:', generatedPlan.substring(0, 500) + '...');
    }

    // Validate and ensure exactly 7 days in response
    if (structuredPlan && Array.isArray(structuredPlan)) {
      // Trim to exactly 7 days if longer, pad if shorter
      if (structuredPlan.length > 7) {
        console.log(`Trimming plan from ${structuredPlan.length} days to 7 days`);
        structuredPlan = structuredPlan.slice(0, 7);
      } else if (structuredPlan.length < 7) {
        console.log(`Extending plan from ${structuredPlan.length} days to 7 days`);
        // Repeat the pattern to fill 7 days
        while (structuredPlan.length < 7) {
          const dayToCopy = structuredPlan[structuredPlan.length % structuredPlan.length];
          structuredPlan.push(JSON.parse(JSON.stringify(dayToCopy))); // Deep copy
        }
      }
      console.log(`Final plan has ${structuredPlan.length} days`);
    }

    // Save health plan to MongoDB if user exists and structured plan is valid
    let savedPlan = null;
    if (user && structuredPlan && Array.isArray(structuredPlan) && structuredPlan.length === 7) {
      try {
        // Convert structured plan to daily plans format
        const dailyPlans = structuredPlan.map((dayPlan, index) => ({
          day: index + 1,
          date: new Date(Date.now() + (index * 24 * 60 * 60 * 1000)), // Set dates for next 7 days
          food: {
            breakfast: dayPlan.food?.breakfast || [],
            lunch: dayPlan.food?.lunch || [],
            dinner: dayPlan.food?.dinner || [],
            snacks: dayPlan.food?.snacks || []
          },
          exercise: dayPlan.exercise || [],
          daily_tips: [],
          water_intake_goal: 8,
          sleep_goal: 8
        }));

        // Deactivate any existing active plans for this user
        await HealthPlan.updateMany(
          { user_id: user._id, status: 'active' },
          { status: 'paused' }
        );

        // Create new health plan
        const healthPlan = new HealthPlan({
          user_id: user._id,
          plan_name: `${full_name || 'Personal'}'s Health Plan`,
          daily_plans: dailyPlans,
          generated_prompt: prompt,
          raw_ai_response: generatedPlan,
          overall_goal: goal,
          target_weight: current_weight, // This could be modified based on goal
          estimated_duration: plan_duration,
          progress_metrics: [
            {
              metric_name: 'Weight',
              target_value: current_weight.toString(),
              unit: 'kg'
            },
            {
              metric_name: 'BMI',
              target_value: bmi.toString(),
              unit: 'kg/m²'
            },
            {
              metric_name: 'Weekly Exercise Sessions',
              target_value: workout_days.toString(),
              unit: 'sessions'
            }
          ],
          health_guidelines: [
            'Follow your meal plan consistently',
            'Stay hydrated with at least 8 glasses of water daily',
            'Get adequate sleep (7-9 hours per night)',
            'Listen to your body and rest when needed'
          ],
          safety_notes: healthConditionsArray.length > 0 ? [
            'Consult with healthcare provider before starting new exercise routines',
            'Monitor any existing health conditions closely',
            'Stop exercising if you experience unusual symptoms'
          ] : []
        });

        savedPlan = await healthPlan.save();

        // Update user's active plan
        user.active_plan_id = savedPlan._id;
        await user.save();

        console.log(`✅ Saved health plan to database: ${savedPlan._id}`);
      } catch (dbError) {
        console.error('❌ Error saving health plan to database:', dbError);
        // Continue without throwing error - still return the generated plan
      }
    }

    res.json({
      success: true,
      plan: generatedPlan,
      structuredPlan: structuredPlan.length > 0 ? structuredPlan : null,
      savedPlan: savedPlan ? {
        id: savedPlan._id,
        plan_name: savedPlan.plan_name,
        status: savedPlan.status,
        start_date: savedPlan.start_date,
        daily_plans_count: savedPlan.daily_plans.length
      } : null,
      userInput: userData,
      timestamp: new Date().toISOString(),
      planDuration: plan_duration,
      userProfile: user ? {
        id: user._id,
        name: user.full_name,
        email: user.email,
        goal: user.goal,
        bmi: user.bmi,
        exerciseFrequency: user.exercise_frequency
      } : {
        name: full_name,
        goal: goal,
        bmi: bmi,
        exerciseFrequency: exercise_frequency
      }
    });

  } catch (error) {
    console.error('Error generating plan:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate plan',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// Generate nutrition advice
router.post('/nutrition-advice', checkApiKey, async (req, res) => {
  try {
    const { question, userGoal, dietaryRestrictions } = req.body;

    const prompt = `As a nutrition expert, answer this question: "${question}"
    
    Consider:
    - User's goal: ${userGoal || 'general health'}
    - Dietary restrictions: ${dietaryRestrictions || 'none'}
    
    Provide practical, science-based advice that is easy to follow.`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const advice = response.data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      advice: advice,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating nutrition advice:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate nutrition advice',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// Generate workout routine
router.post('/workout-routine', checkApiKey, async (req, res) => {
  try {
    const { fitnessLevel, availableTime, equipment, goals } = req.body;

    const prompt = `Create a workout routine based on:
    - Fitness Level: ${fitnessLevel}
    - Available Time: ${availableTime}
    - Equipment: ${equipment || 'none'}
    - Goals: ${goals}
    
    Provide a detailed workout plan with:
    1. Warm-up exercises
    2. Main workout routine
    3. Cool-down exercises
    4. Sets, reps, and duration
    5. Safety tips
    
    Make it practical and achievable.`;

    const response = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [
        {
          parts: [
            {
              text: prompt
            }
          ]
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const workout = response.data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      workout: workout,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error generating workout:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to generate workout routine',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

// Get user's current active plan
router.get('/user-plan/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const activePlan = await HealthPlan.getActivePlan(userId);

    if (!activePlan) {
      return res.status(404).json({
        error: 'No active plan found',
        message: 'User does not have an active health plan'
      });
    }

    res.json({
      success: true,
      plan: {
        id: activePlan._id,
        plan_name: activePlan.plan_name,
        overall_goal: activePlan.overall_goal,
        status: activePlan.status,
        start_date: activePlan.start_date,
        estimated_duration: activePlan.estimated_duration,
        daily_plans: activePlan.daily_plans,
        progress_metrics: activePlan.progress_metrics,
        health_guidelines: activePlan.health_guidelines,
        safety_notes: activePlan.safety_notes,
        created_at: activePlan.createdAt
      },
      user: {
        id: activePlan.user_id._id,
        name: activePlan.user_id.full_name,
        email: activePlan.user_id.email,
        goal: activePlan.user_id.goal
      }
    });
  } catch (error) {
    console.error('Error fetching user plan:', error);
    res.status(500).json({
      error: 'Failed to fetch user plan',
      message: error.message
    });
  }
});

// Get today's plan for a user
router.get('/todays-plan/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const activePlan = await HealthPlan.getActivePlan(userId);

    if (!activePlan) {
      return res.status(404).json({
        error: 'No active plan found',
        message: 'User does not have an active health plan'
      });
    }

    const todaysPlan = activePlan.getTodaysPlan();

    res.json({
      success: true,
      today: todaysPlan,
      plan_info: {
        id: activePlan._id,
        plan_name: activePlan.plan_name,
        overall_goal: activePlan.overall_goal,
        start_date: activePlan.start_date
      }
    });
  } catch (error) {
    console.error('Error fetching today\'s plan:', error);
    res.status(500).json({
      error: 'Failed to fetch today\'s plan',
      message: error.message
    });
  }
});

// Get user's plan history
router.get('/plan-history/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;

    const plans = await HealthPlan.find({ user_id: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .select('plan_name overall_goal status start_date end_date estimated_duration rating createdAt');

    const totalPlans = await HealthPlan.countDocuments({ user_id: userId });

    res.json({
      success: true,
      plans: plans.map(plan => plan.getSummary()),
      pagination: {
        current_page: parseInt(page),
        total_pages: Math.ceil(totalPlans / limit),
        total_plans: totalPlans,
        per_page: parseInt(limit)
      }
    });
  } catch (error) {
    console.error('Error fetching plan history:', error);
    res.status(500).json({
      error: 'Failed to fetch plan history',
      message: error.message
    });
  }
});

// Update plan status
router.patch('/plan-status/:planId', async (req, res) => {
  try {
    const { planId } = req.params;
    const { status, rating, notes } = req.body;

    const validStatuses = ['active', 'completed', 'paused', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({
        error: 'Invalid status',
        message: 'Status must be one of: active, completed, paused, cancelled'
      });
    }

    const updateData = {};
    if (status) updateData.status = status;
    if (rating) updateData.rating = rating;
    if (status === 'completed') updateData.end_date = new Date();

    const plan = await HealthPlan.findByIdAndUpdate(
      planId,
      updateData,
      { new: true, runValidators: true }
    );

    if (!plan) {
      return res.status(404).json({
        error: 'Plan not found',
        message: 'Health plan not found'
      });
    }

    // Add user notes if provided
    if (notes) {
      plan.user_notes.push({
        note: notes,
        date: new Date()
      });
      await plan.save();
    }

    res.json({
      success: true,
      plan: plan.getSummary(),
      message: `Plan status updated to ${status}`
    });
  } catch (error) {
    console.error('Error updating plan status:', error);
    res.status(500).json({
      error: 'Failed to update plan status',
      message: error.message
    });
  }
});

// Track daily activity
router.post('/track-activity', async (req, res) => {
  try {
    const {
      user_id,
      plan_id,
      date,
      meals_completed,
      exercises_completed,
      water_intake,
      sleep_hours,
      weight,
      energy_level,
      mood,
      daily_notes,
      challenges,
      achievements
    } = req.body;

    // Check if activity already exists for this date
    const existingActivity = await UserActivity.findOne({
      user_id,
      date: new Date(date)
    });

    if (existingActivity) {
      // Update existing activity
      Object.assign(existingActivity, {
        meals_completed: meals_completed || existingActivity.meals_completed,
        exercises_completed: exercises_completed || existingActivity.exercises_completed,
        water_intake: water_intake || existingActivity.water_intake,
        sleep_hours: sleep_hours || existingActivity.sleep_hours,
        weight: weight || existingActivity.weight,
        energy_level: energy_level || existingActivity.energy_level,
        mood: mood || existingActivity.mood,
        daily_notes: daily_notes || existingActivity.daily_notes,
        challenges: challenges || existingActivity.challenges,
        achievements: achievements || existingActivity.achievements
      });

      await existingActivity.save();

      res.json({
        success: true,
        activity: existingActivity.getDailySummary(),
        message: 'Activity updated successfully'
      });
    } else {
      // Create new activity
      const activity = new UserActivity({
        user_id,
        plan_id,
        date: new Date(date),
        meals_completed,
        exercises_completed,
        water_intake,
        sleep_hours,
        weight,
        energy_level,
        mood,
        daily_notes,
        challenges,
        achievements
      });

      await activity.save();

      res.json({
        success: true,
        activity: activity.getDailySummary(),
        message: 'Activity tracked successfully'
      });
    }
  } catch (error) {
    console.error('Error tracking activity:', error);
    res.status(500).json({
      error: 'Failed to track activity',
      message: error.message
    });
  }
});

// Get user's weekly progress
router.get('/weekly-progress/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate } = req.query;

    const start = startDate ? new Date(startDate) : new Date();
    if (!startDate) {
      // Default to start of current week (Monday)
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      start.setHours(0, 0, 0, 0);
    }

    const activities = await UserActivity.getWeeklyProgress(userId, start);

    // Calculate weekly summary
    const summary = {
      total_days: activities.length,
      completed_days: activities.filter(a => a.day_completed).length,
      average_completion: activities.length > 0
        ? Math.round(activities.reduce((sum, a) => sum + a.completion_percentage, 0) / activities.length)
        : 0,
      total_water_intake: activities.reduce((sum, a) => sum + (a.water_intake || 0), 0),
      average_sleep: activities.length > 0
        ? Math.round(activities.reduce((sum, a) => sum + (a.sleep_hours || 0), 0) / activities.length * 10) / 10
        : 0,
      mood_distribution: {},
      energy_levels: activities.map(a => ({
        date: a.date,
        level: a.energy_level
      })).filter(e => e.level)
    };

    // Calculate mood distribution
    activities.forEach(activity => {
      if (activity.mood) {
        summary.mood_distribution[activity.mood] = (summary.mood_distribution[activity.mood] || 0) + 1;
      }
    });

    res.json({
      success: true,
      week_start: start,
      activities: activities.map(a => a.getDailySummary()),
      summary
    });
  } catch (error) {
    console.error('Error fetching weekly progress:', error);
    res.status(500).json({
      error: 'Failed to fetch weekly progress',
      message: error.message
    });
  }
});

// General AI chat endpoint
router.post('/chat', checkApiKey, async (req, res) => {
  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({
        error: 'Message is required'
      });
    }

    const response = await axios.post(`${GEMINI_API_URL}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [
        {
          parts: [
            {
              text: message
            }
          ]
        }
      ]
    }, {
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const aiResponse = response.data.candidates[0].content.parts[0].text;

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error in chat:', error.response?.data || error.message);
    res.status(500).json({
      error: 'Failed to process chat message',
      message: error.response?.data?.error?.message || error.message
    });
  }
});

module.exports = router;
