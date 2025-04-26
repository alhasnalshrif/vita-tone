const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Workouts
 *   description: Workout management
 */

/**
 * @swagger
 * /workouts:
 *   get:
 *     summary: Get all workouts for the logged-in user
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: A list of workouts
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Workout' # Assuming Workout schema is defined
 *       500:
 *         description: Failed to retrieve workouts
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, completed, workoutType } = req.query;
    
    const whereClause = { userId };
    
    // Add date filter if provided
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
    
    // Add completed filter if provided
    if (completed !== undefined) {
      whereClause.completed = completed === 'true';
    }
    
    // Add workout type filter if provided
    if (workoutType) {
      whereClause.workoutType = workoutType;
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
      orderBy: { date: 'desc' }
    });
    
    res.json(workouts);
    
  } catch (error) {
    console.error('Error fetching workouts:', error);
    res.status(500).json({ error: 'Failed to fetch workouts' });
  }
});

/**
 * @swagger
 * /workouts/{id}:
 *   get:
 *     summary: Get a specific workout by ID
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The workout ID
 *     responses:
 *       200:
 *         description: The workout details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workout'
 *       404:
 *         description: Workout not found
 *       500:
 *         description: Failed to retrieve workout
 */
router.get('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    const workout = await req.prisma.workout.findFirst({
      where: {
        id,
        userId
      },
      include: {
        exercises: {
          include: {
            exercise: true
          }
        }
      }
    });
    
    if (!workout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    res.json(workout);
    
  } catch (error) {
    console.error('Error fetching workout:', error);
    res.status(500).json({ error: 'Failed to fetch workout' });
  }
});

/**
 * @swagger
 * /workouts:
 *   post:
 *     summary: Create a new workout for the logged-in user
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkoutInput' # Assuming WorkoutInput schema is defined
 *     responses:
 *       201:
 *         description: Workout created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workout'
 *       500:
 *         description: Failed to create workout
 */
router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { 
      name, description, duration, caloriesBurned, 
      workoutType, date, completed, exercises 
    } = req.body;
    
    // Create workout
    const workout = await req.prisma.workout.create({
      data: {
        userId,
        name,
        description,
        duration: parseInt(duration) || 0,
        caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : null,
        workoutType,
        date: date ? new Date(date) : new Date(),
        completed: completed || false
      }
    });
    
    // Add exercises if provided
    if (exercises && exercises.length > 0) {
      for (const exerciseData of exercises) {
        let exercise = await req.prisma.exercise.findUnique({
          where: { name: exerciseData.name }
        });
        
        // Create exercise if it doesn't exist
        if (!exercise) {
          exercise = await req.prisma.exercise.create({
            data: {
              name: exerciseData.name,
              description: exerciseData.description,
              muscleGroup: exerciseData.muscleGroup,
              exerciseType: exerciseData.exerciseType || workoutType
            }
          });
        }
        
        // Link exercise to workout
        await req.prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            weight: exerciseData.weight,
            duration: exerciseData.duration,
            distance: exerciseData.distance
          }
        });
      }
    }
    
    // Fetch the complete workout with exercises
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
    
    res.status(201).json(completeWorkout);
    
  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});

/**
 * @swagger
 * /workouts/{id}:
 *   put:
 *     summary: Update a workout by ID
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The workout ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WorkoutInput'
 *     responses:
 *       200:
 *         description: Workout updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Workout'
 *       404:
 *         description: Workout not found
 *       500:
 *         description: Failed to update workout
 */
router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { 
      name, description, duration, caloriesBurned, 
      workoutType, date, completed, exercises 
    } = req.body;
    
    // Check if workout exists and belongs to user
    const existingWorkout = await req.prisma.workout.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    // Update workout
    const updatedWorkout = await req.prisma.workout.update({
      where: { id },
      data: {
        name,
        description,
        duration: duration ? parseInt(duration) : undefined,
        caloriesBurned: caloriesBurned ? parseInt(caloriesBurned) : null,
        workoutType,
        date: date ? new Date(date) : undefined,
        completed
      }
    });
    
    // Update exercises if provided
    if (exercises && exercises.length > 0) {
      // Remove existing exercises
      await req.prisma.workoutExercise.deleteMany({
        where: { workoutId: id }
      });
      
      // Add new exercises
      for (const exerciseData of exercises) {
        let exercise = await req.prisma.exercise.findUnique({
          where: { name: exerciseData.name }
        });
        
        // Create exercise if it doesn't exist
        if (!exercise) {
          exercise = await req.prisma.exercise.create({
            data: {
              name: exerciseData.name,
              description: exerciseData.description,
              muscleGroup: exerciseData.muscleGroup,
              exerciseType: exerciseData.exerciseType || workoutType
            }
          });
        }
        
        // Link exercise to workout
        await req.prisma.workoutExercise.create({
          data: {
            workoutId: id,
            exerciseId: exercise.id,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            weight: exerciseData.weight,
            duration: exerciseData.duration,
            distance: exerciseData.distance
          }
        });
      }
    }
    
    // Fetch the complete workout with exercises
    const completeWorkout = await req.prisma.workout.findUnique({
      where: { id },
      include: {
        exercises: {
          include: {
            exercise: true
          }
        }
      }
    });
    
    res.json(completeWorkout);
    
  } catch (error) {
    console.error('Error updating workout:', error);
    res.status(500).json({ error: 'Failed to update workout' });
  }
});

/**
 * @swagger
 * /workouts/{id}:
 *   delete:
 *     summary: Delete a workout by ID
 *     tags: [Workouts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The workout ID
 *     responses:
 *       200:
 *         description: Workout deleted successfully
 *       404:
 *         description: Workout not found
 *       500:
 *         description: Failed to delete workout
 */
router.delete('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    
    // Check if workout exists and belongs to user
    const existingWorkout = await req.prisma.workout.findFirst({
      where: {
        id,
        userId
      }
    });
    
    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }
    
    // Delete workout exercises
    await req.prisma.workoutExercise.deleteMany({
      where: { workoutId: id }
    });
    
    // Delete workout
    await req.prisma.workout.delete({
      where: { id }
    });
    
    res.json({ success: true });
    
  } catch (error) {
    console.error('Error deleting workout:', error);
    res.status(500).json({ error: 'Failed to delete workout' });
  }
});

module.exports = router;
