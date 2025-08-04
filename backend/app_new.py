"""
Food Detection API using Roboflow SDK
Nepali Food Detection Backend Server
"""

import os
import io
import base64
import logging
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import roboflow
import numpy as np
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)

# Roboflow configuration
API_KEY = "3WRiAnFfpoD83Bevoupm"
PROJECT_ID = "new-merged-0ma7p"
VERSION = 3

# Initialize Roboflow
try:
    rf = roboflow.Roboflow(api_key=API_KEY)
    project = rf.workspace().project(PROJECT_ID)
    model = project.version(VERSION).model
    logger.info(
        f"✅ Roboflow initialized successfully - Project: {PROJECT_ID}, Version: {VERSION}"
    )
except Exception as e:
    logger.error(f"❌ Failed to initialize Roboflow: {str(e)}")
    model = None


@app.route("/", methods=["GET"])
def health_check():
    """Health check endpoint"""
    return jsonify(
        {
            "status": "healthy",
            "message": "Food Detection API is running",
            "model_ready": model is not None,
            "endpoints": {
                "health": "/",
                "predict": "/predict",
                "test": "/test",
                "classes": "/classes",
            },
        }
    )


@app.route("/health", methods=["GET"])
def health():
    """Alternative health check endpoint"""
    return health_check()


@app.route("/test", methods=["GET"])
def test_api():
    """Test the Roboflow model with a sample prediction"""
    try:
        if model is None:
            return (
                jsonify(
                    {"status": "error", "message": "Roboflow model not initialized"}
                ),
                500,
            )

        # Use a test image URL
        test_image_url = (
            "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400"
        )

        logger.info("Testing model with sample image")

        # Make prediction
        prediction = model.predict(test_image_url)

        # Process the prediction
        result = process_prediction_result(prediction)

        logger.info("✅ Test prediction successful")

        return jsonify(
            {
                "status": "success",
                "message": "Model test completed successfully",
                "test_result": result,
            }
        )

    except Exception as e:
        logger.error(f"❌ Test failed: {str(e)}")
        return jsonify({"status": "error", "message": f"Test failed: {str(e)}"}), 500


@app.route("/predict", methods=["POST"])
def predict():
    """Predict food items from uploaded image"""
    try:
        if model is None:
            return (
                jsonify(
                    {"status": "error", "message": "Roboflow model not initialized"}
                ),
                500,
            )

        # Check if request has JSON data
        if not request.json or "image" not in request.json:
            return (
                jsonify({"status": "error", "message": "No image data provided"}),
                400,
            )

        # Get base64 image data
        image_data = request.json["image"]

        # Handle base64 prefix if present
        if "," in image_data:
            image_data = image_data.split(",")[1]

        logger.info("Processing image for food detection")

        # Decode base64 image and save temporarily
        try:
            image_bytes = base64.b64decode(image_data)

            # Create temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp_file:
                temp_file.write(image_bytes)
                temp_path = temp_file.name

            # Make prediction using the Roboflow SDK
            prediction = model.predict(temp_path)

            # Clean up temporary file
            os.unlink(temp_path)

            # Process the prediction result
            result = process_prediction_result(prediction)

            logger.info(
                f"✅ Prediction successful. Detected classes: {result.get('detected_classes', [])}"
            )

            return jsonify(
                {
                    "status": "success",
                    "message": "Food detection completed successfully",
                    **result,
                }
            )

        except Exception as decode_error:
            logger.error(f"❌ Image processing error: {str(decode_error)}")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Image processing failed: {str(decode_error)}",
                    }
                ),
                400,
            )

    except Exception as e:
        logger.error(f"❌ Prediction failed: {str(e)}")
        return (
            jsonify({"status": "error", "message": f"Prediction failed: {str(e)}"}),
            500,
        )


def process_prediction_result(prediction):
    """Process Roboflow prediction result to extract detected classes"""
    try:
        detected_classes = []

        # The prediction object should have the segmentation data
        if hasattr(prediction, "json") and prediction.json:
            result_data = prediction.json
        else:
            # If it's already a dict
            result_data = prediction if isinstance(prediction, dict) else {}

        logger.info(f"Raw prediction data: {result_data}")

        # Extract segmentation mask and class map
        segmentation_mask = result_data.get("segmentation_mask")
        class_map = result_data.get("class_map", {})

        if segmentation_mask and class_map:
            try:
                # Decode base64 segmentation mask
                mask_data = base64.b64decode(segmentation_mask)

                # Convert to PIL image
                mask_image = Image.open(io.BytesIO(mask_data))

                # Convert to numpy array
                mask_array = np.array(mask_image)

                # Get unique pixel values (class IDs)
                unique_values = np.unique(mask_array)

                logger.info(f"Unique mask values: {unique_values}")
                logger.info(f"Class map: {class_map}")

                # Map class IDs to class names
                for class_id in unique_values:
                    class_key = str(class_id)
                    if class_key in class_map:
                        class_name = class_map[class_key].strip()
                        if class_name and class_name.lower() not in [
                            "background",
                            "none",
                        ]:
                            if class_name not in detected_classes:
                                detected_classes.append(class_name)

            except Exception as mask_error:
                logger.error(f"Error processing segmentation mask: {str(mask_error)}")

        # If no classes detected from mask, try to extract from other parts of response
        if not detected_classes and class_map:
            # Get all non-background classes
            detected_classes = [
                cls.strip()
                for cls in class_map.values()
                if cls.strip().lower() not in ["background", "none", ""]
            ]

        return {
            "detected_classes": detected_classes,
            "total_classes": len(detected_classes),
            "segmentation_mask": segmentation_mask,
            "class_map": class_map,
            "image_info": result_data.get("image", {}),
            "raw_result": result_data,
        }

    except Exception as e:
        logger.error(f"Error processing prediction result: {str(e)}")
        return {
            "detected_classes": [],
            "total_classes": 0,
            "error": str(e),
            "raw_result": prediction,
        }


@app.route("/classes", methods=["GET"])
def get_available_classes():
    """Get list of available food classes that the model can detect"""
    try:
        # Known Nepali food classes from your model
        available_classes = [
            "Selroti",
            "bhat",
            "burger",
            "chana masala",
            "chiya",
            "chowmein",
            "daal",
            "dhido",
            "gundruk",
            "kheer",
            "masu",
            "momo",
            "pakoda",
            "roti",
            "samosa",
            "yomari",
        ]

        return jsonify(
            {
                "status": "success",
                "available_classes": available_classes,
                "total_classes": len(available_classes),
                "model_info": {
                    "project_id": PROJECT_ID,
                    "version": VERSION,
                    "model_ready": model is not None,
                },
            }
        )

    except Exception as e:
        logger.error(f"Error getting available classes: {str(e)}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Error getting available classes: {str(e)}",
                }
            ),
            500,
        )


@app.errorhandler(404)
def not_found(error):
    return (
        jsonify(
            {
                "status": "error",
                "message": "Endpoint not found",
                "available_endpoints": [
                    "/",
                    "/health",
                    "/predict",
                    "/test",
                    "/classes",
                ],
            }
        ),
        404,
    )


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"status": "error", "message": "Internal server error"}), 500


if __name__ == "__main__":
    print("🍽️ Starting Food Detection API Server with Roboflow SDK...")
    print("📡 Server will be available at: http://localhost:5000")
    print("🧪 Test endpoint: http://localhost:5000/test")
    print("🎯 Prediction endpoint: http://localhost:5000/predict")
    print("📋 Classes endpoint: http://localhost:5000/classes")

    if model is None:
        print(
            "⚠️  Warning: Roboflow model not initialized - check your API key and connection"
        )
    else:
        print("✅ Roboflow model ready for predictions")

    app.run(debug=True, host="0.0.0.0", port=5000)
