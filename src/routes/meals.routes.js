const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, mealType } = req.query;

    const whereClause = { userId };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);

      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);

      whereClause.date = {
        gte: startDate,
        lte: endDate
      };
    }

    if (mealType) {
      whereClause.mealType = mealType;
    }

    const meals = await req.prisma.meal.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });

    res.json(meals);

  } catch (error) {
    console.error('Error fetching meals:', error);
    res.status(500).json({ error: 'Failed to fetch meals' });
  }
});


router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const meal = await req.prisma.meal.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!meal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    res.json(meal);

  } catch (error) {
    console.error('Error fetching meal:', error);
    res.status(500).json({ error: 'Failed to fetch meal' });
  }
});


router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, description, calories, protein,
      carbs, fat, mealType, timeConsumed, date
    } = req.body;

    const meal = await req.prisma.meal.create({
      data: {
        userId,
        name,
        description,
        calories: calories ? parseInt(calories) : null,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        mealType,
        timeConsumed: timeConsumed ? new Date(timeConsumed) : null,
        date: date ? new Date(date) : new Date()
      }
    });

    res.status(201).json(meal);

  } catch (error) {
    console.error('Error creating meal:', error);
    res.status(500).json({ error: 'Failed to create meal' });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name, description, calories, protein,
      carbs, fat, mealType, timeConsumed, date
    } = req.body;

    const existingMeal = await req.prisma.meal.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingMeal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    const updatedMeal = await req.prisma.meal.update({
      where: { id },
      data: {
        name,
        description,
        calories: calories ? parseInt(calories) : null,
        protein: protein ? parseFloat(protein) : null,
        carbs: carbs ? parseFloat(carbs) : null,
        fat: fat ? parseFloat(fat) : null,
        mealType,
        timeConsumed: timeConsumed ? new Date(timeConsumed) : null,
        date: date ? new Date(date) : undefined
      }
    });

    res.json(updatedMeal);

  } catch (error) {
    console.error('Error updating meal:', error);
    res.status(500).json({ error: 'Failed to update meal' });
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const existingMeal = await req.prisma.meal.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingMeal) {
      return res.status(404).json({ error: 'Meal not found' });
    }

    await req.prisma.meal.delete({
      where: { id }
    });

    res.json({ success: true });

  } catch (error) {
    console.error('Error deleting meal:', error);
    res.status(500).json({ error: 'Failed to delete meal' });
  }
});

module.exports = router;
