// Validation middleware

const validateApiKey = (req, res, next) => {
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === 'AIzaSyCqz4xk0xKjnq-NzSqX21yJhvClN0JTTYE') {
    return res.status(500).json({
      error: 'API key not configured',
      message: 'Please set your GEMINI_API_KEY in the .env file'
    });
  }
  next();
};

const validateBMIInput = (req, res, next) => {
  const { weight, height } = req.body;

  if (!weight || !height) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: 'Weight and height are required'
    });
  }

  if (isNaN(weight) || isNaN(height)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Weight and height must be numbers'
    });
  }

  if (weight <= 0 || height <= 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Weight and height must be positive numbers'
    });
  }

  if (weight > 1000 || height > 300) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Weight or height values seem unrealistic'
    });
  }

  next();
};

const validateCalorieInput = (req, res, next) => {
  const { age, gender, weight, height, activityLevel } = req.body;

  const requiredFields = ['age', 'gender', 'weight', 'height', 'activityLevel'];
  const missingFields = requiredFields.filter(field => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: `The following fields are required: ${missingFields.join(', ')}`
    });
  }

  if (isNaN(age) || isNaN(weight) || isNaN(height)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Age, weight, and height must be numbers'
    });
  }

  if (age < 1 || age > 120) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Age must be between 1 and 120'
    });
  }

  if (!['male', 'female'].includes(gender.toLowerCase())) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Gender must be either "male" or "female"'
    });
  }

  const validActivityLevels = ['sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active'];
  if (!validActivityLevels.includes(activityLevel)) {
    return res.status(400).json({
      error: 'Invalid input',
      message: `Activity level must be one of: ${validActivityLevels.join(', ')}`
    });
  }

  next();
};

const validateChatInput = (req, res, next) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'Missing required field',
      message: 'Message is required'
    });
  }

  if (typeof message !== 'string') {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Message must be a string'
    });
  }

  if (message.trim().length === 0) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Message cannot be empty'
    });
  }

  if (message.length > 5000) {
    return res.status(400).json({
      error: 'Invalid input',
      message: 'Message is too long (maximum 5000 characters)'
    });
  }

  next();
};

const validateProfileInput = (req, res, next) => {
  const { goal, exercise_frequency, eating_habits } = req.body;

  const requiredFields = ['goal', 'exercise_frequency', 'eating_habits'];
  const missingFields = requiredFields.filter(field => !req.body[field]);

  if (missingFields.length > 0) {
    return res.status(400).json({
      error: 'Missing required fields',
      message: `The following fields are required: ${missingFields.join(', ')}`
    });
  }

  next();
};

const sanitizeInput = (req, res, next) => {
  // Basic input sanitization
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      return obj.trim().replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    }
    if (typeof obj === 'object' && obj !== null) {
      const sanitized = {};
      for (const key in obj) {
        sanitized[key] = sanitize(obj[key]);
      }
      return sanitized;
    }
    return obj;
  };

  req.body = sanitize(req.body);
  req.query = sanitize(req.query);
  req.params = sanitize(req.params);

  next();
};

module.exports = {
  validateApiKey,
  validateBMIInput,
  validateCalorieInput,
  validateChatInput,
  validateProfileInput,
  sanitizeInput
};
