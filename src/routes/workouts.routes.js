const express = require('express');
const router = express.Router();


router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { date, completed, workoutType } = req.query;

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

    if (completed !== undefined) {
      whereClause.completed = completed === 'true';
    }

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


router.post('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name, description, duration, caloriesBurned,
      workoutType, date, completed, exercises
    } = req.body;

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

    if (exercises && exercises.length > 0) {
      for (const exerciseData of exercises) {
        let exercise = await req.prisma.exercise.findUnique({
          where: { name: exerciseData.name }
        });

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

        await req.prisma.workoutExercise.create({
          data: {
            workoutId: workout.id,
            exerciseId: exercise.id,
            sets: exerciseData.sets,
            reps: exerciseData.reps,
            weight: exerciseData.weight,
            duration: parseInt(exerciseData.duration),
            distance: parseFloat(exerciseData.distance)
          }
        });
      }
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

    res.status(201).json(completeWorkout);

  } catch (error) {
    console.error('Error creating workout:', error);
    res.status(500).json({ error: 'Failed to create workout' });
  }
});


router.put('/:id', async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const {
      name, description, duration, caloriesBurned,
      workoutType, date, completed, exercises
    } = req.body;

    const existingWorkout = await req.prisma.workout.findFirst({
      where: {
        id,
        userId
      }
    });

    if (!existingWorkout) {
      return res.status(404).json({ error: 'Workout not found' });
    }

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

    if (exercises && exercises.length > 0) {

      await req.prisma.workoutExercise.deleteMany({
        where: { workoutId: id }
      });

      for (const exerciseData of exercises) {
        let exercise = await req.prisma.exercise.findUnique({
          where: { name: exerciseData.name }
        });

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
