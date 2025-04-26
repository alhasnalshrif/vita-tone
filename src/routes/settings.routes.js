const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const settings = await req.prisma.user.findUnique({
      where: { id: userId },
      select: {
        dietarySettings: true,
        exerciseSettings: true,
        notificationSettings: true,
        preferences: true
      }
    });

    res.json(settings);

  } catch (error) {
    console.error('Error fetching settings:', error);
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});


router.put('/dietary', async (req, res) => {
  try {
    const userId = req.user.id;
    const { dietType, mealsPerDay, calorieGoal, preferredDiet } = req.body;

    const updatedSettings = await req.prisma.dietarySetting.upsert({
      where: { userId },
      update: { dietType, mealsPerDay, calorieGoal, preferredDiet },
      create: {
        userId,
        dietType,
        mealsPerDay: mealsPerDay || 3,
        calorieGoal,
        preferredDiet
      }
    });

    res.json(updatedSettings);

  } catch (error) {
    console.error('Error updating dietary settings:', error);
    res.status(500).json({ error: 'Failed to update dietary settings' });
  }
});


router.put('/exercise', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      preferredExercises,
      workoutDaysPerWeek,
      fitnessLevel,
      exerciseGoals,
      trackPerformance
    } = req.body;

    const updatedSettings = await req.prisma.exerciseSetting.upsert({
      where: { userId },
      update: {
        preferredExercises,
        workoutDaysPerWeek,
        fitnessLevel,
        exerciseGoals,
        trackPerformance
      },
      create: {
        userId,
        preferredExercises: preferredExercises || [],
        workoutDaysPerWeek: workoutDaysPerWeek || 3,
        fitnessLevel,
        exerciseGoals: exerciseGoals || [],
        trackPerformance: trackPerformance !== undefined ? trackPerformance : true
      }
    });

    res.json(updatedSettings);

  } catch (error) {
    console.error('Error updating exercise settings:', error);
    res.status(500).json({ error: 'Failed to update exercise settings' });
  }
});


router.put('/notifications', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      mealReminders,
      exerciseReminders,
      waterReminders,
      customReminderTime
    } = req.body;

    const updatedSettings = await req.prisma.notificationSetting.upsert({
      where: { userId },
      update: {
        mealReminders,
        exerciseReminders,
        waterReminders,
        customReminderTime: customReminderTime ? new Date(customReminderTime) : null
      },
      create: {
        userId,
        mealReminders: mealReminders !== undefined ? mealReminders : true,
        exerciseReminders: exerciseReminders !== undefined ? exerciseReminders : true,
        waterReminders: waterReminders !== undefined ? waterReminders : true,
        customReminderTime: customReminderTime ? new Date(customReminderTime) : null
      }
    });

    res.json(updatedSettings);

  } catch (error) {
    console.error('Error updating notification settings:', error);
    res.status(500).json({ error: 'Failed to update notification settings' });
  }
});


router.put('/preferences', async (req, res) => {
  try {
    const userId = req.user.id;
    const { darkMode, language, measurementUnit } = req.body;

    const updatedPreferences = await req.prisma.userPreference.upsert({
      where: { userId },
      update: { darkMode, language, measurementUnit },
      create: {
        userId,
        darkMode: darkMode !== undefined ? darkMode : false,
        language: language || 'ARABIC',
        measurementUnit: measurementUnit || 'METRIC'
      }
    });

    res.json(updatedPreferences);

  } catch (error) {
    console.error('Error updating preferences:', error);
    res.status(500).json({ error: 'Failed to update preferences' });
  }
});

module.exports = router;
