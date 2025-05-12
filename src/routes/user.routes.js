const express = require('express');
const router = express.Router();

router.get('/profile', async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await req.prisma.user.findUnique({
      where: { id: userId },
      include: {
        dietarySettings: true,
        exerciseSettings: true,
        notificationSettings: true,
        preferences: true,
        foodAllergies: {
          include: {
            foodAllergy: true
          }
        },
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

    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);

  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/profile', async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      fullName, gender, birthDate, height, weight,
      activityLevel, goal
    } = req.body;

    const updatedUser = await req.prisma.user.update({
      where: { id: userId },
      data: {
        fullName,
        gender,
        birthDate: birthDate ? new Date(birthDate) : undefined,
        height: height ? parseFloat(height) : undefined,
        weight: weight ? parseFloat(weight) : undefined,
        activityLevel,
        goal
      }
    });

    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);

  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

router.post('/medical-conditions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { conditions } = req.body;

    await req.prisma.userMedicalCondition.deleteMany({
      where: { userId }
    });

    const userConditions = await Promise.all(
      conditions.map(async (condition) => {
        let medCondition = await req.prisma.medicalCondition.findUnique({
          where: { name: condition.name }
        });

        if (!medCondition) {
          medCondition = await req.prisma.medicalCondition.create({
            data: { name: condition.name, description: condition.description || null }
          });
        }

        return req.prisma.userMedicalCondition.create({
          data: {
            userId,
            medicalConditionId: medCondition.id,
            notes: condition.notes
          }
        });
      })
    );

    res.json({ success: true, count: userConditions.length });

  } catch (error) {
    console.error('Error updating medical conditions:', error);
    res.status(500).json({ error: 'Failed to update medical conditions' });
  }
});


router.post('/food-allergies', async (req, res) => {
  try {
    const userId = req.user.id;
    const { allergies } = req.body;

    await req.prisma.userFoodAllergy.deleteMany({
      where: { userId }
    });

    const userAllergies = await Promise.all(
      allergies.map(async (allergy) => {

        let foodAllergy = await req.prisma.foodAllergy.findUnique({
          where: { name: allergy.name }
        });

        if (!foodAllergy) {
          foodAllergy = await req.prisma.foodAllergy.create({
            data: { name: allergy.name, description: allergy.description || null }
          });
        }

        return req.prisma.userFoodAllergy.create({
          data: {
            userId,
            foodAllergyId: foodAllergy.id,
            severity: allergy.severity || 'MODERATE'
          }
        });
      })
    );

    res.json({ success: true, count: userAllergies.length });

  } catch (error) {
    console.error('Error updating food allergies:', error);
    res.status(500).json({ error: 'Failed to update food allergies' });
  }
});

module.exports = router;
