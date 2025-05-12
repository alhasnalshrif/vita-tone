const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate } = req.query;
    
    const whereClause = { userId };
    
    if (startDate || endDate) {
      whereClause.date = {};
      
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }
    
    const progressData = await req.prisma.progressTracking.findMany({
      where: whereClause,
      orderBy: { date: 'asc' }
    });
    
    res.json(progressData);
    
  } catch (error) {
    console.error('Error fetching progress data:', error);
    res.status(500).json({ error: 'Failed to fetch progress data' });
  }
});

router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { weight, bodyFat, waistCircumference, date, notes } = req.body;
    
    const progressEntry = await req.prisma.progressTracking.create({
      data: {
        userId,
        weight: weight ? parseFloat(weight) : null,
        bodyFat: bodyFat ? parseFloat(bodyFat) : null,
        waistCircumference: waistCircumference ? parseFloat(waistCircumference) : null,
        date: date ? new Date(date) : new Date(),
        notes
      }
    });
    
    res.status(201).json(progressEntry);
    
  } catch (error) {
    console.error('Error adding progress entry:', error);
    res.status(500).json({ error: 'Failed to add progress entry' });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { weight, bodyFat, waistCircumference, date, notes } = req.body;
    
    const existingEntry = await req.prisma.progressTracking.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingEntry) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }
    
    const updatedEntry = await req.prisma.progressTracking.update({
      where: { id },
      data: {
        weight: weight ? parseFloat(weight) : null,
        bodyFat: bodyFat ? parseFloat(bodyFat) : null,
        waistCircumference: waistCircumference ? parseFloat(waistCircumference) : null,
        date: date ? new Date(date) : undefined,
        notes
      }
    });
    
    res.json(updatedEntry);
    
  } catch (error) {
    console.error('Error updating progress entry:', error);
    res.status(500).json({ error: 'Failed to update progress entry' });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const existingEntry = await req.prisma.progressTracking.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingEntry) {
      return res.status(404).json({ error: 'Progress entry not found' });
    }
    
    await req.prisma.progressTracking.delete({
      where: { id }
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting progress entry:', error);
    res.status(500).json({ error: 'Failed to delete progress entry' });
  }
});

router.get('/summary', async (req, res) => {
  try {
    const userId = req.user.id;
    
    const latestEntry = await req.prisma.progressTracking.findFirst({
      where: { userId },
      orderBy: { date: 'desc' }
    });
    
    const firstEntry = await req.prisma.progressTracking.findFirst({
      where: { userId },
      orderBy: { date: 'asc' }
    });
    
    let weightChange = null;
    let bodyFatChange = null;
    let waistChange = null;
    
    if (latestEntry && firstEntry) {
      if (latestEntry.weight !== null && firstEntry.weight !== null) {
        weightChange = latestEntry.weight - firstEntry.weight;
      }
      
      if (latestEntry.bodyFat !== null && firstEntry.bodyFat !== null) {
        bodyFatChange = latestEntry.bodyFat - firstEntry.bodyFat;
      }
      
      if (latestEntry.waistCircumference !== null && firstEntry.waistCircumference !== null) {
        waistChange = latestEntry.waistCircumference - firstEntry.waistCircumference;
      }
    }
    
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const workoutsCount = await req.prisma.workout.count({
      where: {
        userId,
        date: {
          gte: thirtyDaysAgo
        },
        completed: true
      }
    });
    
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const meals = await req.prisma.meal.findMany({
      where: {
        userId,
        date: {
          gte: sevenDaysAgo
        }
      },
      select: {
        calories: true,
        date: true
      }
    });
    
    const caloriesByDay = {};
    let totalCalories = 0;
    let daysWithData = 0;
    
    meals.forEach(meal => {
      if (meal.calories) {
        const dayKey = meal.date.toISOString().split('T')[0];
        caloriesByDay[dayKey] = (caloriesByDay[dayKey] || 0) + meal.calories;
      }
    });
    
    for (const day in caloriesByDay) {
      totalCalories += caloriesByDay[day];
      daysWithData++;
    }
    
    const avgCaloriesPerDay = daysWithData > 0 ? Math.round(totalCalories / daysWithData) : 0;
    
    res.json({
      latestEntry,
      changes: {
        weight: weightChange,
        bodyFat: bodyFatChange,
        waistCircumference: waistChange
      },
      stats: {
        workoutsLast30Days: workoutsCount,
        avgCaloriesLast7Days: avgCaloriesPerDay
      }
    });
    
  } catch (error) {
    console.error('Error fetching progress summary:', error);
    res.status(500).json({ error: 'Failed to fetch progress summary' });
  }
});

module.exports = router;
