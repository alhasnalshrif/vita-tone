require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');
const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

// Routes
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const settingsRoutes = require('./routes/settings.routes');
const mealsRoutes = require('./routes/meals.routes');
const workoutsRoutes = require('./routes/workouts.routes');
const plansRoutes = require('./routes/plans.routes');
const progressRoutes = require('./routes/progress.routes');

// Middleware
const { authenticateToken } = require('./middleware/auth.middleware');

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

// Swagger definition
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VitaTone API',
      version: '1.0.0',
      description: 'API documentation for the VitaTone application',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        }
      }
    },
    security: [{
      bearerAuth: []
    }]
  },
  apis: ['./src/routes/*.js'],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Middleware
app.use(cors());
app.use(express.json());

// Make Prisma available to all routes
app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

// API documentation route
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/meals', authenticateToken, mealsRoutes);
app.use('/api/workouts', authenticateToken, workoutsRoutes);
app.use('/api/plans', authenticateToken, plansRoutes);
app.use('/api/progress', authenticateToken, progressRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// Handle graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
