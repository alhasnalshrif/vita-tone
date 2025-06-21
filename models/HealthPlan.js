const mongoose = require('mongoose');

const mealPlanSchema = new mongoose.Schema({
    breakfast: [{
        type: String,
        required: true
    }],
    lunch: [{
        type: String,
        required: true
    }],
    dinner: [{
        type: String,
        required: true
    }],
    snacks: [{
        type: String
    }]
});

const exercisePlanSchema = new mongoose.Schema({
    exercises: [{
        type: String,
        required: true
    }],
    duration: {
        type: String
    },
    intensity: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    equipment_needed: [{
        type: String
    }]
});

const dailyPlanSchema = new mongoose.Schema({
    day: {
        type: Number,
        required: true,
        min: 1,
        max: 7
    },
    date: {
        type: Date
    },
    food: {
        type: mealPlanSchema,
        required: true
    },
    exercise: [{
        type: String,
        required: true
    }],
    daily_tips: [{
        type: String
    }],
    water_intake_goal: {
        type: Number,
        default: 8 // glasses per day
    },
    sleep_goal: {
        type: Number,
        default: 8 // hours per night
    }
});

const healthPlanSchema = new mongoose.Schema({
    user_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    plan_name: {
        type: String,
        default: 'Personal Health Plan'
    },

    // 7-day plan structure
    daily_plans: [dailyPlanSchema],

    // Plan metadata
    generated_prompt: {
        type: String,
        required: true
    },
    raw_ai_response: {
        type: String,
        required: true
    },

    // Plan goals and tracking
    overall_goal: {
        type: String,
        required: true
    },
    target_weight: {
        type: Number
    },
    estimated_duration: {
        type: String,
        required: true
    },

    // Progress tracking
    progress_metrics: [{
        metric_name: {
            type: String,
            required: true
        },
        target_value: {
            type: String,
            required: true
        },
        current_value: {
            type: String,
            default: '0'
        },
        unit: {
            type: String,
            required: true
        }
    }],

    // Safety and guidelines
    health_guidelines: [{
        type: String
    }],
    safety_notes: [{
        type: String
    }],

    // Plan status
    status: {
        type: String,
        enum: ['active', 'completed', 'paused', 'cancelled'],
        default: 'active'
    },
    start_date: {
        type: Date,
        default: Date.now
    },
    end_date: {
        type: Date
    },

    // User feedback and notes
    user_notes: [{
        date: {
            type: Date,
            default: Date.now
        },
        note: {
            type: String,
            required: true
        }
    }],
    rating: {
        type: Number,
        min: 1,
        max: 5
    }
}, {
    timestamps: true
});

// Index for faster queries
healthPlanSchema.index({ user_id: 1, status: 1 });
healthPlanSchema.index({ user_id: 1, createdAt: -1 });

// Method to get active plan for user
healthPlanSchema.statics.getActivePlan = function (userId) {
    return this.findOne({ user_id: userId, status: 'active' })
        .populate('user_id', 'full_name email goal')
        .sort({ createdAt: -1 });
};

// Method to get plan summary
healthPlanSchema.methods.getSummary = function () {
    return {
        id: this._id,
        plan_name: this.plan_name,
        overall_goal: this.overall_goal,
        status: this.status,
        start_date: this.start_date,
        end_date: this.end_date,
        estimated_duration: this.estimated_duration,
        days_completed: this.daily_plans.length,
        created_at: this.createdAt,
        rating: this.rating
    };
};

// Method to get today's plan
healthPlanSchema.methods.getTodaysPlan = function () {
    const today = new Date();
    const startDate = new Date(this.start_date);
    const daysDiff = Math.floor((today - startDate) / (1000 * 60 * 60 * 24));
    const planDay = (daysDiff % 7) + 1; // Cycle through 7 days

    return this.daily_plans.find(plan => plan.day === planDay) || this.daily_plans[0];
};

module.exports = mongoose.model('HealthPlan', healthPlanSchema);
