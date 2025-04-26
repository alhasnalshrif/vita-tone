# Settings API Demo Data

## GET /settings
Response:
```json
{
  "dietarySettings": {
    "dietType": "VEGAN",
    "mealsPerDay": 3,
    "calorieGoal": 2000,
    "preferredDiet": "LOW_CARB"
  },
  "exerciseSettings": {
    "preferredExercises": ["YOGA", "RUNNING", "WEIGHTS"],
    "workoutDaysPerWeek": 4,
    "fitnessLevel": "INTERMEDIATE",
    "exerciseGoals": ["WEIGHT_LOSS", "MUSCLE_GAIN"],
    "trackPerformance": true
  },
  "notificationSettings": {
    "mealReminders": true,
    "exerciseReminders": true,
    "waterReminders": true,
    "customReminderTime": "2024-01-20T08:00:00Z"
  },
  "preferences": {
    "darkMode": true,
    "language": "ARABIC",
    "measurementUnit": "METRIC"
  }
}
```

## PUT /settings/dietary
Request:
```json
{
  "dietType": "VEGAN",
  "mealsPerDay": 3,
  "calorieGoal": 2000,
  "preferredDiet": "LOW_CARB"
}
```

## PUT /settings/exercise
Request:
```json
{
  "preferredExercises": ["YOGA", "RUNNING", "WEIGHTS"],
  "workoutDaysPerWeek": 4,
  "fitnessLevel": "INTERMEDIATE",
  "exerciseGoals": ["WEIGHT_LOSS", "MUSCLE_GAIN"],
  "trackPerformance": true
}
```

## PUT /settings/notifications
Request:
```json
{
  "mealReminders": true,
  "exerciseReminders": true,
  "waterReminders": true,
  "customReminderTime": "2024-01-20T08:00:00Z"
}
```

## PUT /settings/preferences
Request:
```json
{
  "darkMode": true,
  "language": "ARABIC",
  "measurementUnit": "METRIC"
}
```
