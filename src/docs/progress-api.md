# Progress Tracking API Documentation

## GET /progress
Response:
```json
[
  {
    "id": "prog_123abc",
    "userId": "user_456def",
    "weight": 75.5,
    "bodyFat": 18.2,
    "waistCircumference": 82.3,
    "date": "2023-12-15T08:30:00.000Z",
    "notes": "Morning measurement after workout"
  },
  {
    "id": "prog_789xyz",
    "userId": "user_456def",
    "weight": 75.1,
    "bodyFat": 17.9,
    "waistCircumference": 81.8,
    "date": "2023-12-22T08:45:00.000Z",
    "notes": null
  }
]
```

## POST /progress
Response:
```json
{
  "id": "prog_987pqr",
  "userId": "user_456def",
  "weight": 74.8,
  "bodyFat": 17.5,
  "waistCircumference": 81.5,
  "date": "2023-12-29T09:00:00.000Z",
  "notes": "Feel great today!"
}
```

## PUT /progress/:id
Response:
```json
{
  "id": "prog_987pqr",
  "userId": "user_456def",
  "weight": 74.8,
  "bodyFat": 17.6,
  "waistCircumference": 81.5,
  "date": "2023-12-29T09:00:00.000Z",
  "notes": "Corrected body fat measurement"
}
```

## DELETE /progress/:id
Response:
```json
{
  "success": true
}
```

## GET /progress/summary
Response:
```json
{
  "latestEntry": {
    "id": "prog_987pqr",
    "userId": "user_456def",
    "weight": 74.8,
    "bodyFat": 17.5,
    "waistCircumference": 81.5,
    "date": "2023-12-29T09:00:00.000Z",
    "notes": "Feel great today!"
  },
  "changes": {
    "weight": -0.7,
    "bodyFat": -0.7,
    "waistCircumference": -0.8
  },
  "stats": {
    "workoutsLast30Days": 12,
    "avgCaloriesLast7Days": 2150
  }
}
```
