const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    // Basic Information
    full_name: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true
    },    dob: {
        type: Date
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        default: 'other'
    },

    // Physical Attributes
    current_weight: {
        type: Number,
        default: 70
    },
    current_height: {
        type: Number,
        default: 170
    },
    bmi: {
        type: Number
    },

    // Goals and Preferences
    goal: {
        type: String,
        default: 'general_health'
    },
    exercise_frequency: {
        type: String,
        default: 'moderate'
    },
    diet_preference: {
        type: String,
        default: 'balanced'
    },
    meals_per_day: {
        type: Number,
        default: 3
    },
    plan_duration: {
        type: String,
        default: '1 month'
    },

    // Nutrition Preferences
    fav_nutrition_type: {
        type: String
    },
    food_allergies: {
        type: [String],
        default: []
    },
    nutrition_days: {
        type: Number,
        default: 7
    },
    meals_num: {
        type: Number,
        default: 3
    },

    // Exercise Preferences
    fav_workout: {
        type: String
    },
    workout_goal: {
        type: String
    },
    workout_days: {
        type: Number,
        default: 5
    },

    // Health Information
    health_conditions: {
        type: [String],
        default: []
    },
    chronic_conditions: {
        type: [String],
        default: []
    },

    // Activity Tracking
    last_login: {
        type: Date,
        default: Date.now
    },
    active_plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HealthPlan'
    },

    // Display Settings
    theme: {
        type: String,
        enum: ['light', 'dark'],
        default: 'light'
    },
    language: {
        type: String,
        default: 'en'
    },
    unit_system: {
        type: String,
        enum: ['metric', 'imperial'],
        default: 'metric'
    }
}, {
    timestamps: true
});

// Calculate BMI before saving
userSchema.pre('save', function (next) {
    if (this.current_weight && this.current_height) {
        const heightInMeters = this.current_height / 100;
        this.bmi = parseFloat((this.current_weight / (heightInMeters * heightInMeters)).toFixed(1));
    }
    next();
});

// Method to get user profile data
userSchema.methods.getProfileData = function () {
    return {
        id: this._id,
        full_name: this.full_name,
        email: this.email,
        dob: this.dob,
        gender: this.gender,
        current_weight: this.current_weight,
        current_height: this.current_height,
        bmi: this.bmi,
        goal: this.goal,
        exercise_frequency: this.exercise_frequency,
        diet_preference: this.diet_preference,
        meals_per_day: this.meals_per_day,
        plan_duration: this.plan_duration,
        fav_nutrition_type: this.fav_nutrition_type,
        food_allergies: this.food_allergies,
        nutrition_days: this.nutrition_days,
        meals_num: this.meals_num,
        fav_workout: this.fav_workout,
        workout_goal: this.workout_goal,
        workout_days: this.workout_days,
        health_conditions: this.health_conditions,
        chronic_conditions: this.chronic_conditions,
        last_login: this.last_login,
        active_plan_id: this.active_plan_id,
        theme: this.theme,
        language: this.language,
        unit_system: this.unit_system
    };
};

module.exports = mongoose.model('User', userSchema);
