from flask import Flask, request, jsonify
from flask_cors import CORS
import base64
import io
import os
from PIL import Image
import numpy as np
import requests
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Roboflow API configuration
API_KEY = "3WRiAnFfpoD83Bevoupm"
MODEL_ID = "new-merged-0ma7p/3"
ROBOFLOW_URL = f"https://serverless.roboflow.com/{MODEL_ID}"

@app.route('/', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "message": "Food Detection API is running",
        "endpoints": {
            "predict": "/predict",
            "test": "/test",
            "health": "/"
        }
    })

@app.route('/test', methods=['GET'])
def test_api():
    """Test the Roboflow API connection"""
    try:
        # Use a sample image URL for testing
        test_image_url = "https://i.imgur.com/PEEvqPN.png"
        
        logger.info(f"Testing API with model: {MODEL_ID}")
        
        # Make test request to Roboflow using requests
        response = requests.post(
            ROBOFLOW_URL,
            params={
                'api_key': API_KEY,
                'image': test_image_url
            }
        )
        
        if response.status_code == 200:
            result = response.json()
            logger.info("API test successful")
            
            return jsonify({
                "status": "success",
                "message": "API connection test successful",
                "model_id": MODEL_ID,
                "test_result": result
            })
        else:
            logger.error(f"API test failed: {response.status_code} - {response.text}")
            return jsonify({
                "status": "error",
                "message": f"API test failed: {response.status_code} - {response.text}"
            }), 500
        
    except Exception as e:
        logger.error(f"API test failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"API test failed: {str(e)}"
        }), 500

@app.route('/predict', methods=['POST'])
def predict():
    """Predict food items from uploaded image"""
    try:
        # Check if request has JSON data
        if not request.json or 'image' not in request.json:
            return jsonify({
                "status": "error",
                "message": "No image data provided"
            }), 400
        
        # Get base64 image data
        image_data = request.json['image']
        
        # Handle base64 prefix if present
        if ',' in image_data:
            image_data = image_data.split(',')[1]
        
        logger.info("Processing image for food detection")
        
        # Make prediction using Roboflow
        response = requests.post(
            ROBOFLOW_URL,
            params={'api_key': API_KEY},
            headers={'Content-Type': 'application/x-www-form-urlencoded'},
            data=image_data
        )
        
        if response.status_code == 200:
            result = response.json()
            
            # Process the result to extract detected classes
            detected_classes = extract_detected_classes(result)
            
            logger.info(f"Prediction successful. Detected classes: {detected_classes}")
            
            return jsonify({
                "status": "success",
                "message": "Food detection completed successfully",
                "detected_classes": detected_classes,
                "raw_result": result
            })
        else:
            logger.error(f"Prediction failed: {response.status_code} - {response.text}")
            return jsonify({
                "status": "error",
                "message": f"Prediction failed: {response.status_code} - {response.text}"
            }), 500
                
    except Exception as e:
        logger.error(f"Prediction failed: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Prediction failed: {str(e)}"
        }), 500

def extract_detected_classes(result):
    """Extract detected food classes from Roboflow result"""
    try:
        detected_classes = []
        
        # Check if result has predictions
        if 'predictions' in result:
            predictions = result['predictions']
            
            # Get class map and segmentation mask
            class_map = predictions.get('class_map', {})
            segmentation_mask = predictions.get('segmentation_mask')
            
            if segmentation_mask and class_map:
                # Decode base64 segmentation mask
                mask_data = base64.b64decode(segmentation_mask)
                
                # Convert to PIL image
                mask_image = Image.open(io.BytesIO(mask_data))
                
                # Convert to numpy array
                mask_array = np.array(mask_image)
                
                # Get unique pixel values (class IDs)
                unique_values = np.unique(mask_array)
                
                # Map class IDs to class names
                for class_id in unique_values:
                    if str(class_id) in class_map and class_map[str(class_id)] != 'background':
                        class_name = class_map[str(class_id)]
                        if class_name not in detected_classes:
                            detected_classes.append(class_name)
            
            # If no classes detected from mask, return available classes
            if not detected_classes and class_map:
                detected_classes = [cls for cls in class_map.values() if cls != 'background']
        
        return detected_classes
        
    except Exception as e:
        logger.error(f"Error extracting detected classes: {str(e)}")
        return []

@app.route('/classes', methods=['GET'])
def get_available_classes():
    """Get list of available food classes"""
    try:
        # This could be made dynamic by calling the API, but for now we'll use the known classes
        available_classes = [
            "Selroti", "bhat", "burger", "chana masala", "chiya", 
            "chowmein", "daal", "dhido", "gundruk", "kheer", 
            "masu", "momo", "pakoda", "roti", "samosa", "yomari"
        ]
        
        return jsonify({
            "status": "success",
            "available_classes": available_classes,
            "total_classes": len(available_classes)
        })
        
    except Exception as e:
        logger.error(f"Error getting available classes: {str(e)}")
        return jsonify({
            "status": "error",
            "message": f"Error getting available classes: {str(e)}"
        }), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({
        "status": "error",
        "message": "Endpoint not found"
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        "status": "error",
        "message": "Internal server error"
    }), 500

if __name__ == '__main__':
    print("🍽️ Starting Food Detection API Server...")
    print("📡 Server will be available at: http://localhost:5000")
    print("🧪 Test endpoint: http://localhost:5000/test")
    print("🎯 Prediction endpoint: http://localhost:5000/predict")
    
    app.run(debug=True, host='0.0.0.0', port=5000)
