const express = require('express');
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User profile management
 */

/**
 * @swagger
 * /users/profile:
 *   get:
 *     summary: Get the profile of the logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         description: User not found
 *       500:
 *         description: Failed to retrieve profile
 */
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
    
    // Remove password before sending response
    const { password, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
    
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

/**
 * @swagger
 * /users/profile:
 *   put:
 *     summary: Update the profile of the logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName:
 *                 type: string
 *               gender:
 *                 type: string
 *               birthDate:
 *                 type: string
 *                 format: date
 *               height:
 *                 type: number
 *               weight:
 *                 type: number
 *               activityLevel:
 *                 type: string
 *               goal:
 *                 type: string
 *             example:
 *               fullName: "Updated Name"
 *               gender: "Female"
 *               birthDate: "1990-01-01"
 *               height: 170
 *               weight: 65
 *               activityLevel: "Active"
 *               goal: "Weight Loss"
 *     responses:
 *       200:
 *         description: Profile updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       500:
 *         description: Failed to update profile
 */
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
    
    // Remove password before sending response
    const { password, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
    
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

/**
 * @swagger
 * /users/medical-conditions:
 *   post:
 *     summary: Update medical conditions for the logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               conditions:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     notes:
 *                       type: string
 *             example:
 *               conditions:
 *                 - name: "Diabetes"
 *                   description: "Type 2 diabetes"
 *                   notes: "Monitor blood sugar levels"
 *     responses:
 *       200:
 *         description: Medical conditions updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *       500:
 *         description: Failed to update medical conditions
 */
router.post('/medical-conditions', async (req, res) => {
  try {
    const userId = req.user.id;
    const { conditions } = req.body;
    
    // Delete existing conditions
    await req.prisma.userMedicalCondition.deleteMany({
      where: { userId }
    });
    
    // Add new conditions
    const userConditions = await Promise.all(
      conditions.map(async (condition) => {
        // Check if condition exists, create if not
        let medCondition = await req.prisma.medicalCondition.findUnique({
          where: { name: condition.name }
        });
        
        if (!medCondition) {
          medCondition = await req.prisma.medicalCondition.create({
            data: { name: condition.name, description: condition.description || null }
          });
        }
        
        // Link condition to user
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

/**
 * @swagger
 * /users/food-allergies:
 *   post:
 *     summary: Update food allergies for the logged-in user
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               allergies:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     severity:
 *                       type: string
 *                       enum: [MILD, MODERATE, SEVERE]
 *             example:
 *               allergies:
 *                 - name: "Peanuts"
 *                   description: "Severe peanut allergy"
 *                   severity: "SEVERE"
 *     responses:
 *       200:
 *         description: Food allergies updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: number
 *       500:
 *         description: Failed to update food allergies
 */
router.post('/food-allergies', async (req, res) => {
  try {
    const userId = req.user.id;
    const { allergies } = req.body;
    
    // Delete existing allergies
    await req.prisma.userFoodAllergy.deleteMany({
      where: { userId }
    });
    
    // Add new allergies
    const userAllergies = await Promise.all(
      allergies.map(async (allergy) => {
        // Check if allergy exists, create if not
        let foodAllergy = await req.prisma.foodAllergy.findUnique({
          where: { name: allergy.name }
        });
        
        if (!foodAllergy) {
          foodAllergy = await req.prisma.foodAllergy.create({
            data: { name: allergy.name, description: allergy.description || null }
          });
        }
        
        // Link allergy to user
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
