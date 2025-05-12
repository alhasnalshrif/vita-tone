require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { PrismaClient } = require('@prisma/client');

const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const settingsRoutes = require('./routes/settings.routes');
const mealsRoutes = require('./routes/meals.routes');
const workoutsRoutes = require('./routes/workouts.routes');
const plansRoutes = require('./routes/plans.routes');
const progressRoutes = require('./routes/progress.routes');

const { authenticateToken } = require('./middleware/auth.middleware');

const app = express();
let prisma;

try {
  prisma = new PrismaClient();
  console.log('Prisma Client initialized successfully');
} catch (error) {
  console.error('Failed to initialize Prisma Client:', error);
  process.exit(1);
}

const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  req.prisma = prisma;
  next();
});

app.use('/api/auth', authRoutes);
app.use('/api/users', authenticateToken, userRoutes);
app.use('/api/settings', authenticateToken, settingsRoutes);
app.use('/api/meals', authenticateToken, mealsRoutes);
app.use('/api/workouts', authenticateToken, workoutsRoutes);
app.use('/api/plans', authenticateToken, plansRoutes);
app.use('/api/progress', authenticateToken, progressRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'Server is running' });
});


app.get('/', (req, res) => {
  res.status(200).json({ message: 'Welcome to the VitaTone API' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

process.on('SIGINT', async () => {
  await prisma.$disconnect();
  process.exit(0);
});
