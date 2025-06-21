const mongoose = require('mongoose');

const userActivitySchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'HealthPlan',
        required: true
    },
    date: {
        type: Date,
        required: true,
        default: Date.now
    },

    // Daily tracking
    meals_completed: {
        breakfast: { type: Boolean, default: false },
        lunch: { type: Boolean, default: false },
        dinner: { type: Boolean, default: false },
        snacks: { type: Boolean, default: false }
    },

    exercises_completed: [{
        exercise_name: {
            type: String,
            required: true
        },
        duration: {
            type: Number // in minutes
        },
        completed: {
            type: Boolean,
            default: false
        },
        notes: {
            type: String
        }
    }],

    // Health metrics
    water_intake: {
        type: Number,
        default: 0 // glasses consumed
    },
    sleep_hours: {
        type: Number,
        default: 0
    },
    weight: {
        type: Number
    },
    energy_level: {
        type: Number,
        min: 1,
        max: 10
    },
    mood: {
        type: String,
        enum: ['excellent', 'good', 'average', 'poor', 'very_poor']
    },

    // Progress notes
    daily_notes: {
        type: String
    },
    challenges: [{
        type: String
    }],
    achievements: [{
        type: String
    }],

    // Completion status
    day_completed: {
        type: Boolean,
        default: false
    },
    completion_percentage: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    }
}, {
    timestamps: true
});

// Compound index for efficient queries
userActivitySchema.index({ user_id: 1, date: -1 });
userActivitySchema.index({ user_id: 1, plan_id: 1, date: -1 });

// Calculate completion percentage before saving
userActivitySchema.pre('save', function (next) {
    let totalTasks = 0;
    let completedTasks = 0;

    // Count meal completions
    Object.values(this.meals_completed).forEach(completed => {
        totalTasks++;
        if (completed) completedTasks++;
    });

    // Count exercise completions
    this.exercises_completed.forEach(exercise => {
        totalTasks++;
        if (exercise.completed) completedTasks++;
    });

    // Calculate percentage
    this.completion_percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    this.day_completed = this.completion_percentage >= 80; // 80% completion threshold

    next();
});

// Static method to get user's weekly progress
userActivitySchema.statics.getWeeklyProgress = function (userId, startDate) {
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    return this.find({
        user_id: userId,
        date: {
            $gte: startDate,
            $lt: endDate
        }
    }).sort({ date: 1 });
};

// Method to get daily summary
userActivitySchema.methods.getDailySummary = function () {
    return {
        date: this.date,
        completion_percentage: this.completion_percentage,
        day_completed: this.day_completed,
        meals_completed: this.meals_completed,
        exercises_completed: this.exercises_completed.length,
        exercises_done: this.exercises_completed.filter(ex => ex.completed).length,
        water_intake: this.water_intake,
        sleep_hours: this.sleep_hours,
        energy_level: this.energy_level,
        mood: this.mood,
        achievements: this.achievements,
        challenges: this.challenges
    };
};

module.exports = mongoose.model('UserActivity', userActivitySchema);
