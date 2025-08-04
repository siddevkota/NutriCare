# NutriApp Backend

Backend API for the NutriApp food analysis system that integrates computer vision with elevation tracking to estimate food weight.

## Features

- 🤖 **Roboflow Integration**: Real food segmentation using Roboflow API
- 📏 **Elevation-based Weight Estimation**: Combines image analysis with device motion data
- 🍎 **Food Recognition**: Identifies various food types with confidence scores
- ⚖️ **Weight Calculation**: Estimates food weight using density and volume calculations
- 🥗 **Nutrition Analysis**: Provides basic nutritional information
- 📱 **Mobile Ready**: RESTful API designed for mobile app integration

## Setup

### Prerequisites

- Node.js 16+
- npm or yarn
- Roboflow account (optional, falls back to dummy data)

### Installation

1. **Clone and navigate to backend**

   ```bash
   cd backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Environment Configuration**

   ```bash
   cp .env.example .env
   ```

4. **Configure your `.env` file**

   ```env
   PORT=3001
   ROBOFLOW_API_KEY=your_roboflow_api_key_here
   ROBOFLOW_MODEL_ID=food-segmentation-v1
   ROBOFLOW_VERSION=1
   ```

5. **Start the server**

   ```bash
   # Development
   npm run dev

   # Production
   npm start
   ```

## API Endpoints

### Health Check

```http
GET /health
```

Returns server status and configuration info.

### Food Analysis

```http
POST /api/food-analysis/analyze
Content-Type: multipart/form-data

- image: [image file]
- angle: [number] - tilt angle in degrees
- distance: [number] - horizontal distance in cm
- elevation: [number] - calculated elevation
- height: [number] - estimated object height
- imageWidth: [number] - image width in pixels
- imageHeight: [number] - image height in pixels
```

**Response:**

```json
{
  "success": true,
  "data": {
    "foodItems": [
      {
        "id": "item_0",
        "name": "apple",
        "estimatedWeight": 185.2,
        "estimatedVolume": 218.0,
        "density": 0.85,
        "nutritionalInfo": {
          "calories": 96,
          "protein": 0.6,
          "carbs": 26,
          "fat": 0.4
        },
        "segmentation": {
          "confidence": 0.89,
          "boundingBox": {...},
          "area": 15420
        }
      }
    ],
    "totalWeight": 185.2,
    "elevationData": {...},
    "imageMetadata": {...}
  },
  "validation": {
    "isValid": true,
    "warnings": []
  }
}
```

### Demo Analysis (Dummy Data)

```http
POST /api/food-analysis/demo
```

Same as analyze endpoint but uses dummy segmentation data for testing.

### Service Status

```http
GET /api/food-analysis/status
```

Returns service configuration and capabilities.

## Architecture

```
src/
├── index.js              # Express server setup
├── routes/
│   └── foodAnalysis.js   # Food analysis endpoints
├── services/
│   ├── roboflowService.js      # Roboflow API integration
│   └── weightEstimationService.js  # Weight calculation logic
└── models/
    └── densityDatabase.js      # Food density data
```

## Roboflow Integration

The system supports real Roboflow integration for food segmentation:

1. **Sign up** at [Roboflow](https://roboflow.com/)
2. **Create or use** a food segmentation model
3. **Get your API key** from your Roboflow dashboard
4. **Configure** the `.env` file with your credentials

### Model Requirements

Your Roboflow model should:

- Detect food items in images
- Provide bounding boxes or polygon segmentation
- Return confidence scores
- Support common food types

## Weight Estimation Algorithm

1. **Image Segmentation**: Identify food regions using computer vision
2. **Scale Calculation**: Convert pixels to real-world measurements using elevation data
3. **Area Calculation**: Measure food area from segmentation masks
4. **Volume Estimation**: Estimate thickness based on food type and elevation
5. **Weight Calculation**: `Weight = Volume × Density`
6. **Validation**: Check results for realistic values

## Food Density Database

The system includes density values (g/cm³) for common foods:

- **Fruits**: Apple (0.85), Banana (0.94), Orange (0.87)
- **Proteins**: Chicken (1.05), Beef (1.04), Fish (1.04)
- **Vegetables**: Potato (1.08), Carrot (1.03), Broccoli (0.92)
- **Grains**: Rice (1.45), Bread (0.28), Pasta (1.1)

## Error Handling

The API includes comprehensive error handling:

- File upload validation
- Image format checking
- Roboflow API fallbacks
- Weight estimation validation
- Detailed error messages in development

## Development

### Adding New Food Types

1. Update `src/models/densityDatabase.js`
2. Add nutritional data to `weightEstimationService.js`
3. Update thickness estimation logic

### Testing

```bash
# Run tests
npm test

# Test with curl
curl -X POST http://localhost:3001/api/food-analysis/demo \
  -F "image=@test-image.jpg" \
  -F "angle=5" \
  -F "distance=50" \
  -F "height=3.2"
```

## Deployment

### Production Setup

1. Set `NODE_ENV=production`
2. Configure proper CORS origins
3. Set up file upload limits
4. Use process manager (PM2)
5. Set up reverse proxy (nginx)

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY src ./src
EXPOSE 3001
CMD ["npm", "start"]
```

## License

MIT License - see LICENSE file for details.
