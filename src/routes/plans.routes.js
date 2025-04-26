const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    // Get meal plans
    const meals = await req.prisma.meal.findMany({
      where: { userId }
    });

    // Get workout plans
    const workouts = await req.prisma.workout.findMany({
      where: { userId },
      include: {
        exercises: {
          include: {
            exercise: true
          }
        }
      }
    });

    // Group meals by date
    const mealPlansByDate = meals.reduce((acc, meal) => {
      const dateKey = meal.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(meal);
      return acc;
    }, {});

    // Group workouts by date
    const workoutPlansByDate = workouts.reduce((acc, workout) => {
      const dateKey = workout.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(workout);
      return acc;
    }, {});

    res.json({
      mealPlans: mealPlansByDate,
      workoutPlans: workoutPlansByDate
    });
  } catch (error) {
    console.error('Error fetching plans:', error);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});


router.get('/meal-plans', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, startDate, endDate } = req.query;

    let whereClause = { userId };

    if (date) {
      const queryDate = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      whereClause.date = {
        gte: queryDate,
        lt: nextDay
      };
    } else if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const meals = await req.prisma.meal.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });

    // Group meals by date
    const mealPlansByDate = meals.reduce((acc, meal) => {
      const dateKey = meal.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          meals: [],
          totalCalories: 0,
          totalProtein: 0,
          totalCarbs: 0,
          totalFat: 0
        };
      }
      acc[dateKey].meals.push(meal);
      acc[dateKey].totalCalories += meal.calories || 0;
      acc[dateKey].totalProtein += meal.protein || 0;
      acc[dateKey].totalCarbs += meal.carbs || 0;
      acc[dateKey].totalFat += meal.fat || 0;
      return acc;
    }, {});

    res.json(Object.values(mealPlansByDate));
  } catch (error) {
    console.error('Error fetching meal plans:', error);
    res.status(500).json({ error: 'Failed to fetch meal plans' });
  }
});


router.get('/workout-plans', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, startDate, endDate } = req.query;

    let whereClause = { userId };

    if (date) {
      const queryDate = new Date(date);
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);

      whereClause.date = {
        gte: queryDate,
        lt: nextDay
      };
    } else if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const workouts = await req.prisma.workout.findMany({
      where: whereClause,
      include: {
        exercises: {
          include: {
            exercise: true
          }
        }
      },
      orderBy: { date: 'asc' }
    });

    // Group workouts by date
    const workoutPlansByDate = workouts.reduce((acc, workout) => {
      const dateKey = workout.date.toISOString().split('T')[0];
      if (!acc[dateKey]) {
        acc[dateKey] = {
          date: dateKey,
          workouts: [],
          totalDuration: 0,
          totalCaloriesBurned: 0
        };
      }
      acc[dateKey].workouts.push(workout);
      acc[dateKey].totalDuration += workout.duration || 0;
      acc[dateKey].totalCaloriesBurned += workout.caloriesBurned || 0;
      return acc;
    }, {});

    res.json(Object.values(workoutPlansByDate));
  } catch (error) {
    console.error('Error fetching workout plans:', error);
    res.status(500).json({ error: 'Failed to fetch workout plans' });
  }
});


router.post('/generate-meal-plan', async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal, dietType, mealsPerDay, date } = req.body;

    // Get user profile data
    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      include: {
        dietarySettings: true,
        foodAllergies: {
          include: {
            foodAllergy: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }


    const mealTypes = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK'];
    const meals = [];

    const targetMeals = mealsPerDay || user.dietarySettings?.mealsPerDay || 3;
    const planDate = date ? new Date(date) : new Date();

    for (let i = 0; i < targetMeals; i++) {
      const mealType = i < mealTypes.length ? mealTypes[i] : 'SNACK';

      let mealName, mealDescription, mealCalories, mealProtein, mealCarbs, mealFat;

      if (goal === 'WEIGHT_LOSS') {
        mealName = `Low-calorie ${mealType.toLowerCase()}`;
        mealCalories = 300 + Math.floor(Math.random() * 200);
        mealProtein = 20 + Math.floor(Math.random() * 10);
        mealCarbs = 20 + Math.floor(Math.random() * 15);
        mealFat = 8 + Math.floor(Math.random() * 7);
      } else if (goal === 'MUSCLE_BUILDING') {
        mealName = `High-protein ${mealType.toLowerCase()}`;
        mealCalories = 450 + Math.floor(Math.random() * 250);
        mealProtein = 30 + Math.floor(Math.random() * 15);
        mealCarbs = 40 + Math.floor(Math.random() * 20);
        mealFat = 12 + Math.floor(Math.random() * 8);
      } else {
        mealName = `Balanced ${mealType.toLowerCase()}`;
        mealCalories = 400 + Math.floor(Math.random() * 200);
        mealProtein = 25 + Math.floor(Math.random() * 10);
        mealCarbs = 30 + Math.floor(Math.random() * 15);
        mealFat = 10 + Math.floor(Math.random() * 8);
      }

      if (dietType === 'VEGETARIAN' || dietType === 'VEGAN') {
        mealName = `${dietType.toLowerCase()} ${mealName}`;
      } else if (dietType === 'KETO') {
        mealName = `Keto ${mealName}`;
        mealCarbs = 5 + Math.floor(Math.random() * 10);
        mealFat = 25 + Math.floor(Math.random() * 15);
      }

      const meal = await req.prisma.meal.create({
        data: {
          userId,
          name: mealName,
          description: `Generated ${mealName} for ${goal.toLowerCase().replace('_', ' ')} plan`,
          calories: mealCalories,
          protein: mealProtein,
          carbs: mealCarbs,
          fat: mealFat,
          mealType,
          date: planDate
        }
      });

      meals.push(meal);
    }

    res.status(201).json({
      date: planDate,
      mealsCount: meals.length,
      totalCalories: meals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
      meals
    });

  } catch (error) {
    console.error('Error generating meal plan:', error);
    res.status(500).json({ error: 'Failed to generate meal plan' });
  }
});


router.post('/generate-workout-plan', async (req, res) => {
  try {
    const userId = req.user.id;
    const { goal, fitnessLevel, preferredExercises, daysPerWeek, startDate } = req.body;

    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      include: {
        exerciseSettings: true,
        medicalConditions: {
          include: {
            medicalCondition: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const workouts = [];
    const workoutTypes = preferredExercises || user.exerciseSettings?.preferredExercises || ['CARDIO', 'STRENGTH'];
    const targetDays = daysPerWeek || user.exerciseSettings?.workoutDaysPerWeek || 3;
    const planStartDate = startDate ? new Date(startDate) : new Date();

    for (let i = 0; i < targetDays; i++) {
      const workoutDate = new Date(planStartDate);
      workoutDate.setDate(workoutDate.getDate() + i);

      const workoutType = workoutTypes[i % workoutTypes.length];

      let workoutName, workoutDescription, workoutDuration, workoutCalories;

      if (goal === 'WEIGHT_LOSS') {
        workoutName = `Fat burning ${workoutType.toLowerCase()}`;
        workoutDuration = 45 + Math.floor(Math.random() * 15);
        workoutCalories = 350 + Math.floor(Math.random() * 150);
      } else if (goal === 'MUSCLE_BUILDING') {
        workoutName = `Muscle building ${workoutType.toLowerCase()}`;
        workoutDuration = 50 + Math.floor(Math.random() * 20);
        workoutCalories = 300 + Math.floor(Math.random() * 100);
      } else {
        workoutName = `General fitness ${workoutType.toLowerCase()}`;
        workoutDuration = 30 + Math.floor(Math.random() * 30);
        workoutCalories = 250 + Math.floor(Math.random() * 150);
      }

      if (fitnessLevel === 'BEGINNER') {
        workoutName = `Beginner ${workoutName}`;
        workoutDuration = Math.max(20, workoutDuration - 15);
        workoutCalories = Math.max(200, workoutCalories - 100);
      } else if (fitnessLevel === 'ADVANCED') {
        workoutName = `Advanced ${workoutName}`;
        workoutDuration = workoutDuration + 10;
        workoutCalories = workoutCalories + 100;
      }

      const workout = await req.prisma.workout.create({
        data: {
          userId,
          name: workoutName,
          description: `Generated ${workoutName} for ${goal.toLowerCase().replace('_', ' ')} plan`,
          duration: workoutDuration,
          caloriesBurned: workoutCalories,
          workoutType,
          date: workoutDate,
          completed: false
        }
      });

      const exercisesToAdd = [];

      if (workoutType === 'CARDIO') {
        exercisesToAdd.push(
          { name: 'Running', exerciseType: 'CARDIO', duration: 1200, distance: 3 },
          { name: 'Jumping Jacks', exerciseType: 'CARDIO', duration: 300 },
          { name: 'Cycling', exerciseType: 'CARDIO', duration: 900, distance: 5 }
        );
      } else if (workoutType === 'STRENGTH') {
        exercisesToAdd.push(
          { name: 'Push-ups', exerciseType: 'STRENGTH', sets: 3, reps: 10 },
          { name: 'Squats', exerciseType: 'STRENGTH', sets: 3, reps: 15 },
          { name: 'Planks', exerciseType: 'STRENGTH', sets: 3, duration: 60 }
        );
      } else if (workoutType === 'FLEXIBILITY') {
        exercisesToAdd.push(
          { name: 'Hamstring Stretch', exerciseType: 'FLEXIBILITY', duration: 120 },
          { name: 'Hip Flexor Stretch', exerciseType: 'FLEXIBILITY', duration: 120 },
          { name: 'Shoulder Stretch', exerciseType: 'FLEXIBILITY', duration: 120 }
        );
      }

      for (const exerciseData of exercisesToAdd) {
        let exercise = await req.prisma.exercise.findUnique({
          where: { name: exerciseData.name }
        });

        if (!exercise) {
          exercise = await req.prisma.exercise.create({
            data: {
              name: exerciseData.name,
              exerciseType: exerciseData.exerciseType
            }
          });
        }

        await req.prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            duration: exerciseData.duration,
            distance: exerciseData.distance
          }
        });
      }

      const completeWorkout = await req.prisma.workout.findUnique({
        where: { id: workout.id },
        include: {
          exercises: {
            include: {
              exercise: true
            }
          }
        }
      });

      workouts.push(completeWorkout);
    }

    res.status(201).json({
      startDate: planStartDate,
      daysCount: workouts.length,
      totalCaloriesBurned: workouts.reduce((sum, workout) => sum + (workout.caloriesBurned || 0), 0),
      workouts
    });

  } catch (error) {
    console.error('Error generating workout plan:', error);
    res.status(500).json({ error: 'Failed to generate workout plan' });
  }
});


router.get('/daily', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: 'Date parameter is required' });
    }

    const queryDate = new Date(date);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const meals = await req.prisma.meal.findMany({
      where: {
        userId,
        date: {
          gte: queryDate,
          lt: nextDay
        }
      }
    });

    const workouts = await req.prisma.workout.findMany({
      where: {
        userId,
        date: {
          gte: queryDate,
          lt: nextDay
        }
      },
      include: {
        exercises: {
          include: {
            exercise: true
          }
        }
      }
    });

    res.json({
      date: queryDate.toISOString().split('T')[0],
      meals: {
        items: meals,
        totalCalories: meals.reduce((sum, meal) => sum + (meal.calories || 0), 0),
        totalProtein: meals.reduce((sum, meal) => sum + (meal.protein || 0), 0),
        totalCarbs: meals.reduce((sum, meal) => sum + (meal.carbs || 0), 0),
        totalFat: meals.reduce((sum, meal) => sum + (meal.fat || 0), 0)
      },
      workouts: {
        items: workouts,
        totalDuration: workouts.reduce((sum, workout) => sum + (workout.duration || 0), 0),
        totalCaloriesBurned: workouts.reduce((sum, workout) => sum + (workout.caloriesBurned || 0), 0)
      }
    });
  } catch (error) {
    console.error('Error fetching daily plans:', error);
    res.status(500).json({ error: 'Failed to fetch daily plans' });
  }
});

module.exports = router;
