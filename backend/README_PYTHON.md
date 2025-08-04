# Food Detection Backend API - Python Flask

A Python Flask backend for food detection using Roboflow API.

## Features

- 🍽️ Food detection using Roboflow's trained model
- 🎯 Segmentation mask analysis to extract detected classes
- 🧪 API testing endpoint
- 📊 Health check endpoint
- 🔧 CORS enabled for frontend integration

## API Endpoints

### Health Check

```
GET /
```

Returns server status and available endpoints.

### Test API Connection

```
GET /test
```

Tests the Roboflow API connection with a sample image.

### Predict Food Items

```
POST /predict
Content-Type: application/json

{
  "image": "base64_encoded_image_data"
}
```

Analyzes an uploaded image and returns detected food items.

### Get Available Classes

```
GET /classes
```

Returns list of all available food classes the model can detect.

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements.txt
```

### 2. Run the Server

```bash
python app.py
```

The server will start at `http://localhost:5000`

### 3. Test the API

Visit `http://localhost:5000/test` to test the Roboflow API connection.

## Available Food Classes

The model can detect the following Nepali food items:

- Selroti
- bhat (rice)
- burger
- chana masala
- chiya (tea)
- chowmein
- daal (lentils)
- dhido
- gundruk
- kheer
- masu (meat)
- momo
- pakoda
- roti
- samosa
- yomari

## Configuration

- **API Key**: `3WRiAnFfpoD83Bevoupm`
- **Model ID**: `new-merged-0ma7p/3`
- **Server Port**: `5000`

## Error Handling

The API includes comprehensive error handling:

- Invalid image data
- Roboflow API failures
- File processing errors
- Missing parameters

## Logging

The application logs all activities including:

- API requests and responses
- Errors and exceptions
- Model predictions
- Server status

## Production Deployment

For production use:

```bash
gunicorn --bind 0.0.0.0:5000 app:app
```
