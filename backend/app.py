"""
Food Detection API using Roboflow SDK
Nepali Food Detection Backend Server
"""

import os
import io
import base64
import logging
import tempfile
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import roboflow
import numpy as np
from PIL import Image

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load nutrition databases
nutrition_database = {}
physical_properties = {}
glycemic_index = {}
food_alternatives = {}

try:
    with open("./data/nutrition_database.json", "r") as f:
        data = json.load(f)
        nutrition_database = data.get("foods", {})  # Extract the foods object
    with open("./data/physical_properties.json", "r") as f:
        physical_properties = json.load(f)
    with open("./data/glycemic_index.json", "r") as f:
        data = json.load(f)
        glycemic_index = data.get(
            "glycemic_data", {}
        )  # Extract the glycemic_data object
    with open("./data/food_alternatives.json", "r") as f:
        food_alternatives = json.load(f)
    logger.info("✅ Nutrition databases loaded successfully")
    logger.info(f"📊 Loaded {len(nutrition_database)} foods in nutrition database")
    logger.info(f"📊 Loaded {len(glycemic_index)} foods in glycemic index database")
except Exception as e:
    logger.error(f"❌ Failed to load nutrition databases: {e}")
    # Initialize empty databases if files don't exist
    nutrition_database = {}
    physical_properties = {}
    glycemic_index = {}
    food_alternatives = {}


# Custom JSON encoder to handle NumPy types
class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, np.integer):
            return int(obj)
        elif isinstance(obj, np.floating):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        return super(NumpyEncoder, self).default(obj)


# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
CORS(app)


def convert_numpy_types(obj):
    """Convert numpy types to native Python types for JSON serialization"""
    if isinstance(obj, dict):
        return {key: convert_numpy_types(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_numpy_types(item) for item in obj]
    elif isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    else:
        return obj


# Roboflow configuration
API_KEY = "jfQMbxkaKpflYF11bXu2"
PROJECT_ID = "new-coin-merged"
VERSION = 1

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
                "direct_predict": "/direct-predict",
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

            # Add weight estimation if we have area data
            if result.get("class_areas") and result.get("mask_info"):
                weight_data = estimate_weight_from_area(
                    result["class_areas"], result["mask_info"]
                )
                result.update(weight_data)

            logger.info(
                f"✅ Prediction successful. Detected classes: {result.get('detected_classes', [])}"
            )

            # Convert numpy types before JSON serialization
            clean_result = convert_numpy_types(result)

            response_data = {
                "status": "success",
                "message": "Food detection completed successfully",
            }
            response_data.update(clean_result)

            return jsonify(response_data)

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
    """Process Roboflow prediction result to extract detected classes and calculate areas"""
    try:
        detected_classes = []
        class_areas = {}
        total_food_area = 0
        mask_dimensions = {}

        # The Roboflow SDK returns a PredictionGroup object
        # We need to call .json() to get the actual data
        if hasattr(prediction, "json"):
            result_data = prediction.json()  # Call the method with parentheses
        else:
            result_data = prediction

        logger.info(f"Raw prediction data type: {type(result_data)}")

        # Extract from the predictions array
        predictions = result_data.get("predictions", [])
        if predictions:
            # Get the first prediction (there should be one for segmentation)
            pred = predictions[0]
            segmentation_mask = pred.get("segmentation_mask")
            class_map = pred.get("class_map", {})
            image_info = pred.get("image", {})
        else:
            # Fallback to root level
            segmentation_mask = result_data.get("segmentation_mask")
            class_map = result_data.get("class_map", {})
            image_info = result_data.get("image", {})

        logger.info(f"Class map: {class_map}")

        if segmentation_mask and class_map:
            try:
                # Decode base64 segmentation mask
                mask_data = base64.b64decode(segmentation_mask)

                # Convert to PIL image
                mask_image = Image.open(io.BytesIO(mask_data))

                # Get mask dimensions
                mask_dimensions = {
                    "width": mask_image.width,
                    "height": mask_image.height,
                    "total_pixels": mask_image.width * mask_image.height,
                }

                # Convert to numpy array
                mask_array = np.array(mask_image)

                # Get unique pixel values (class IDs)
                unique_values = np.unique(mask_array)

                logger.info(f"Unique mask values: {unique_values}")
                logger.info(f"Mask dimensions: {mask_dimensions}")

                # Map class IDs to class names and calculate areas
                for class_id in unique_values:
                    class_key = str(class_id)
                    if class_key in class_map:
                        class_name = class_map[class_key].strip()
                        if class_name and class_name.lower() not in [
                            "background",
                            "none",
                        ]:
                            # Calculate area for this class (number of pixels)
                            class_pixels = np.sum(mask_array == class_id)
                            area_percentage = (
                                class_pixels / mask_dimensions["total_pixels"]
                            ) * 100

                            class_areas[class_name] = {
                                "pixels": int(class_pixels),
                                "percentage": round(area_percentage, 2),
                                "class_id": int(
                                    class_id
                                ),  # Convert numpy type to Python int
                            }

                            total_food_area += class_pixels

                            if class_name not in detected_classes:
                                detected_classes.append(class_name)

                            logger.info(
                                f"Class '{class_name}': {class_pixels} pixels ({area_percentage:.2f}%)"
                            )

                # Calculate total food coverage
                total_food_percentage = (
                    (total_food_area / mask_dimensions["total_pixels"]) * 100
                    if mask_dimensions["total_pixels"] > 0
                    else 0
                )

                logger.info(
                    f"Total food area: {total_food_area} pixels ({total_food_percentage:.2f}%)"
                )

            except Exception as mask_error:
                logger.error(f"Error processing segmentation mask: {str(mask_error)}")

        # If no classes detected from mask analysis, get all available classes for demo
        if not detected_classes and class_map:
            # Get all non-background classes
            detected_classes = [
                cls.strip()
                for cls in class_map.values()
                if cls.strip().lower() not in ["background", "none", ""]
            ]
            logger.info(
                "No specific classes detected from mask, returning all available classes"
            )

        logger.info(f"Final detected classes: {detected_classes}")

        return {
            "detected_classes": detected_classes,
            "total_classes": len(detected_classes),
            "class_areas": class_areas,
            "total_food_area": {
                "pixels": int(total_food_area),
                "percentage": round(
                    float(total_food_percentage), 2
                ),  # Ensure it's a Python float
            },
            "mask_info": mask_dimensions,
            "segmentation_mask": segmentation_mask,
            "class_map": class_map,
            "image_info": image_info,
            # Don't include raw_result to avoid numpy serialization issues
            # "raw_result": result_data
        }

    except Exception as e:
        logger.error(f"Error processing prediction result: {str(e)}")
        return {
            "detected_classes": [],
            "total_classes": 0,
            "error": str(e),
            "raw_result": str(prediction) if prediction else None,
        }


def estimate_weight_from_area(class_areas, mask_info, reference_data=None):
    """
    Estimate weight of food items based on segmentation mask area

    Args:
        class_areas: Dictionary with class names and their pixel areas
        mask_info: Dictionary with mask dimensions (width, height, total_pixels)
        reference_data: Optional reference data for calibration (plate size, known object, etc.)

    Returns:
        Dictionary with weight estimates for each detected food class
    """
    try:
        weight_estimates = {}

        # Default food density estimates (grams per cm²) - these are rough estimates
        # In a real application, you'd want more accurate density data
        food_densities = {
            "bhat": 0.8,  # Rice - relatively light
            "daal": 1.2,  # Lentils - denser
            "masu": 1.5,  # Meat - dense
            "momo": 1.3,  # Dumplings - medium density
            "roti": 0.6,  # Flatbread - light
            "chowmein": 0.9,  # Noodles - medium
            "samosa": 1.1,  # Fried pastry - medium-dense
            "pakoda": 1.0,  # Fritters - medium
            "gundruk": 0.5,  # Dried vegetables - very light
            "dhido": 1.4,  # Thick porridge - dense
            "kheer": 1.1,  # Sweet pudding - medium-dense
            "selroti": 0.7,  # Ring-shaped bread - light
            "yomari": 1.2,  # Steamed dumpling - dense
            "chana masala": 1.1,  # Chickpea curry - medium-dense
            "chiya": 1.0,  # Tea - liquid density
            "burger": 1.2,  # Burger - medium-dense
        }

        # Estimate pixel-to-cm conversion
        # This is a rough estimate - in practice you'd need calibration
        # Assuming average plate/image size for mobile photos
        if mask_info and mask_info.get("total_pixels"):
            # Estimate that the image represents roughly a 20cm x 20cm area (400 cm²)
            # This would need calibration in a real app (e.g., using a reference object like a coin)
            estimated_image_area_cm2 = 400  # cm²
            pixels_per_cm2 = mask_info["total_pixels"] / estimated_image_area_cm2

            logger.info(f"Estimated pixels per cm²: {pixels_per_cm2:.2f}")

            for class_name, area_data in class_areas.items():
                if class_name in food_densities:
                    # Convert pixels to cm²
                    area_cm2 = area_data["pixels"] / pixels_per_cm2

                    # Estimate weight using density
                    # Weight = Area × Density × Height_factor
                    # Assuming average food thickness of 2cm
                    estimated_height_cm = 2.0
                    estimated_weight_grams = (
                        area_cm2 * food_densities[class_name] * estimated_height_cm
                    )

                    weight_estimates[class_name] = {
                        "estimated_weight_grams": round(estimated_weight_grams, 1),
                        "estimated_weight_oz": round(
                            estimated_weight_grams * 0.035274, 2
                        ),
                        "area_cm2": round(area_cm2, 2),
                        "density_used": food_densities[class_name],
                        "confidence": "estimated",  # In practice, this would vary based on food type
                        "method": "area_density_estimation",
                    }

                    logger.info(
                        f"Weight estimate for {class_name}: {estimated_weight_grams:.1f}g ({area_cm2:.1f} cm²)"
                    )
                else:
                    # Unknown food type - use average density
                    area_cm2 = area_data["pixels"] / pixels_per_cm2
                    average_density = 1.0
                    estimated_height_cm = 2.0
                    estimated_weight_grams = (
                        area_cm2 * average_density * estimated_height_cm
                    )

                    weight_estimates[class_name] = {
                        "estimated_weight_grams": round(estimated_weight_grams, 1),
                        "estimated_weight_oz": round(
                            estimated_weight_grams * 0.035274, 2
                        ),
                        "area_cm2": round(area_cm2, 2),
                        "density_used": average_density,
                        "confidence": "low",
                        "method": "area_density_estimation",
                        "note": "Unknown food type - using average density",
                    }

        return {
            "weight_estimates": weight_estimates,
            "calibration_info": {
                "estimated_image_area_cm2": estimated_image_area_cm2,
                "pixels_per_cm2": (
                    round(pixels_per_cm2, 2) if "pixels_per_cm2" in locals() else None
                ),
                "assumed_thickness_cm": 2.0,
                "note": "Estimates require calibration with reference objects for accuracy",
            },
        }

    except Exception as e:
        logger.error(f"Error estimating weight: {str(e)}")
        return {"weight_estimates": {}, "error": str(e)}


@app.route("/direct-predict", methods=["POST"])
def direct_predict():
    """Proxy endpoint for direct Roboflow API calls to avoid CORS issues"""
    try:
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

        logger.info("Making direct Roboflow API call via proxy")

        # Import requests for direct API call
        import requests

        # Make direct API call to Roboflow using the official endpoint format
        # POST https://segment.roboflow.com/:datasetSlug/:versionNumber
        roboflow_url = f"https://segment.roboflow.com/{PROJECT_ID}/{VERSION}"

        # According to docs: POST base64 image directly in request body
        response = requests.post(
            roboflow_url,
            params={"api_key": API_KEY},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
            data=image_data,  # Send base64 data directly as body
        )

        logger.info(f"Direct API response status: {response.status_code}")

        if response.status_code == 200:
            result = response.json()
            logger.info(f"Direct API response: {result}")

            # Process the result to extract detected classes and calculate areas
            detected_classes = []
            class_areas = {}
            total_food_area = 0
            mask_dimensions = {}
            segmentation_mask = result.get("segmentation_mask")
            class_map = result.get("class_map", {})

            if segmentation_mask and class_map:
                try:
                    # Decode base64 segmentation mask
                    mask_data = base64.b64decode(segmentation_mask)

                    # Convert to PIL image
                    mask_image = Image.open(io.BytesIO(mask_data))

                    # Get mask dimensions
                    mask_dimensions = {
                        "width": mask_image.width,
                        "height": mask_image.height,
                        "total_pixels": mask_image.width * mask_image.height,
                    }

                    # Convert to numpy array
                    mask_array = np.array(mask_image)

                    # Get unique pixel values (class IDs)
                    unique_values = np.unique(mask_array)

                    logger.info(f"Unique mask values: {unique_values}")
                    logger.info(f"Class map: {class_map}")
                    logger.info(f"Mask dimensions: {mask_dimensions}")

                    # Map class IDs to class names and calculate areas
                    for class_id in unique_values:
                        class_key = str(class_id)
                        if class_key in class_map:
                            class_name = class_map[class_key].strip()
                            if class_name and class_name.lower() not in [
                                "background",
                                "none",
                            ]:
                                # Calculate area for this class (number of pixels)
                                class_pixels = np.sum(mask_array == class_id)
                                area_percentage = (
                                    class_pixels / mask_dimensions["total_pixels"]
                                ) * 100

                                class_areas[class_name] = {
                                    "pixels": int(class_pixels),
                                    "percentage": round(area_percentage, 2),
                                    "class_id": int(
                                        class_id
                                    ),  # Convert numpy type to Python int
                                }

                                total_food_area += class_pixels

                                if class_name not in detected_classes:
                                    detected_classes.append(class_name)

                                logger.info(
                                    f"Class '{class_name}': {class_pixels} pixels ({area_percentage:.2f}%)"
                                )

                    # Calculate total food coverage
                    total_food_percentage = (
                        (total_food_area / mask_dimensions["total_pixels"]) * 100
                        if mask_dimensions["total_pixels"] > 0
                        else 0
                    )

                    logger.info(
                        f"Total food area: {total_food_area} pixels ({total_food_percentage:.2f}%)"
                    )

                except Exception as mask_error:
                    logger.error(
                        f"Error processing segmentation mask: {str(mask_error)}"
                    )

            # If no classes detected from mask analysis, get all available classes
            if not detected_classes and class_map:
                # Get all non-background classes from the class map
                for class_id, class_name in class_map.items():
                    clean_name = class_name.strip()
                    if clean_name and clean_name.lower() not in ["background", "none"]:
                        if clean_name not in detected_classes:
                            detected_classes.append(clean_name)

            logger.info(
                f"✅ Direct API prediction successful. Detected classes: {detected_classes}"
            )

            # Add weight estimation if we have area data
            weight_data = {}
            if class_areas and mask_dimensions:
                weight_data = estimate_weight_from_area(class_areas, mask_dimensions)

            response_data = {
                "status": "success",
                "message": "Direct API food detection completed successfully",
                "detected_classes": detected_classes,
                "total_classes": len(detected_classes),
                "class_areas": class_areas,
                "total_food_area": {
                    "pixels": int(total_food_area),
                    "percentage": round(
                        float(total_food_percentage), 2
                    ),  # Ensure it's a Python float
                },
                "mask_info": mask_dimensions,
                "segmentation_mask": segmentation_mask,
                "class_map": class_map,
                "image_info": result.get("image", {}),
                # Don't include raw_result to avoid numpy serialization issues
                # "raw_result": result
            }

            # Add weight estimates if available
            if weight_data:
                response_data.update(weight_data)

            # Convert numpy types before JSON serialization
            clean_response = convert_numpy_types(response_data)

            return jsonify(clean_response)
        else:
            error_text = response.text
            logger.error(
                f"Direct API call failed: {response.status_code} - {error_text}"
            )
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Direct API call failed: {response.status_code} - {error_text}",
                        "details": error_text,
                    }
                ),
                500,
            )

    except Exception as e:
        logger.error(f"❌ Direct API prediction failed: {str(e)}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Direct API prediction failed: {str(e)}",
                }
            ),
            500,
        )


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


@app.route("/generate-mask", methods=["POST"])
def generate_mask():
    """Generate a colorized mask overlay from prediction results"""
    try:
        if not request.json:
            return jsonify({"status": "error", "message": "No JSON data provided"}), 400

        required_fields = ["segmentation_mask", "class_map", "original_image"]
        for field in required_fields:
            if field not in request.json:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": f"Missing required field: {field}",
                        }
                    ),
                    400,
                )

        segmentation_mask_b64 = request.json["segmentation_mask"]
        class_map = request.json["class_map"]
        original_image_b64 = request.json["original_image"]

        # Decode the segmentation mask
        try:
            mask_data = base64.b64decode(segmentation_mask_b64)
            mask_image = Image.open(io.BytesIO(mask_data))

            # Convert to appropriate mode if needed
            if mask_image.mode not in ["L", "P"]:
                mask_image = mask_image.convert("L")

            mask_array = np.array(mask_image)

        except Exception as mask_error:
            logger.error(f"Error decoding segmentation mask: {str(mask_error)}")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Could not decode segmentation mask: {str(mask_error)}",
                    }
                ),
                400,
            )

        # Decode the original image
        try:
            # Handle different image input formats
            if original_image_b64.startswith("file://"):
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": "File URI not supported. Please send base64 image data.",
                        }
                    ),
                    400,
                )
            elif original_image_b64.startswith("data:"):
                # Handle data URL format (data:image/jpeg;base64,...)
                original_image_b64 = original_image_b64.split(",")[1]

            # Try to decode base64 data
            try:
                original_data = base64.b64decode(original_image_b64)
            except Exception as b64_error:
                return (
                    jsonify(
                        {
                            "status": "error",
                            "message": f"Invalid base64 data: {str(b64_error)}",
                        }
                    ),
                    400,
                )

            # Try to open as image
            original_image = Image.open(io.BytesIO(original_data))

            # Convert to RGB if needed
            if original_image.mode != "RGB":
                original_image = original_image.convert("RGB")

        except Exception as img_error:
            logger.error(f"Error decoding original image: {str(img_error)}")
            return (
                jsonify(
                    {
                        "status": "error",
                        "message": f"Could not decode original image: {str(img_error)}",
                    }
                ),
                400,
            )

        # Resize mask to match original image if needed
        if mask_array.shape[:2] != (original_image.height, original_image.width):
            mask_image = mask_image.resize(
                (original_image.width, original_image.height), Image.Resampling.NEAREST
            )
            mask_array = np.array(mask_image)

        # Create colorized mask overlay
        colorized_mask = create_colorized_mask(mask_array, class_map, original_image)

        # Convert to base64
        buffer = io.BytesIO()
        colorized_mask.save(buffer, format="PNG")
        mask_overlay_b64 = base64.b64encode(buffer.getvalue()).decode("utf-8")

        return jsonify(
            {
                "status": "success",
                "mask_overlay": f"data:image/png;base64,{mask_overlay_b64}",
                "message": "Mask overlay generated successfully",
            }
        )

    except Exception as e:
        logger.error(f"Error generating mask overlay: {str(e)}")
        return (
            jsonify(
                {
                    "status": "error",
                    "message": f"Error generating mask overlay: {str(e)}",
                }
            ),
            500,
        )


def create_colorized_mask(mask_array, class_map, original_image):
    """Create a colorized mask overlay on the original image"""
    try:
        # Convert original image to RGBA if not already
        if original_image.mode != "RGBA":
            original_image = original_image.convert("RGBA")

        # Create overlay with same dimensions
        overlay = Image.new("RGBA", original_image.size, (0, 0, 0, 0))
        overlay_array = np.array(overlay)

        # Define colors for different food classes (RGB + Alpha)
        colors = {
            "bhat": (52, 168, 83, 120),  # Green - rice
            "daal": (251, 188, 4, 120),  # Yellow - lentils
            "masu": (234, 67, 53, 120),  # Red - meat
            "momo": (142, 36, 170, 120),  # Purple - dumplings
            "roti": (255, 109, 1, 120),  # Orange - bread
            "chowmein": (6, 174, 212, 120),  # Cyan - noodles
            "gundruk": (34, 197, 94, 120),  # Light green
            "chana masala": (249, 115, 22, 120),  # Orange-red
            "pakoda": (168, 85, 247, 120),  # Violet
            "samosa": (236, 72, 153, 120),  # Pink
            "yomari": (14, 165, 233, 120),  # Blue
            "kheer": (253, 224, 71, 120),  # Light yellow
            "chiya": (120, 113, 108, 120),  # Brown
            "Selroti": (252, 165, 165, 120),  # Light red
            "dhido": (134, 239, 172, 120),  # Light green
            "burger": (255, 202, 40, 120),  # Golden
        }

        # Default color for unknown classes
        default_color = (156, 163, 175, 120)  # Gray

        # Get unique class IDs from mask
        unique_ids = np.unique(mask_array)

        for class_id in unique_ids:
            if class_id == 0:  # Skip background
                continue

            class_name = class_map.get(str(class_id), "").strip()
            if not class_name or class_name.lower() == "background":
                continue

            # Get color for this class
            color = colors.get(class_name.lower(), default_color)

            # Create mask for this class
            class_mask = mask_array == class_id

            # Apply color to overlay
            overlay_array[class_mask] = color

        # Convert back to PIL image
        colored_overlay = Image.fromarray(overlay_array, "RGBA")

        # Composite the overlay on the original image
        result = Image.alpha_composite(original_image, colored_overlay)

        return result

    except Exception as e:
        logger.error(f"Error creating colorized mask: {str(e)}")
        # Return original image if overlay creation fails
        return original_image


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
                    "/diabetes-analysis",
                    "/food-details",
                    "/weight-estimation",
                ],
            }
        ),
        404,
    )


@app.route("/diabetes-analysis", methods=["POST"])
def diabetes_analysis():
    """Analyze detected foods for diabetes risk and provide recommendations"""
    try:
        if not request.json or "detected_foods" not in request.json:
            return (
                jsonify({"status": "error", "message": "No detected foods provided"}),
                400,
            )

        detected_foods = request.json["detected_foods"]

        # Calculate overall meal risk score
        total_gi_score = 0
        total_gl_score = 0
        high_risk_foods = []
        recommendations = []
        food_count = len(detected_foods)

        for food_data in detected_foods:
            food_name = food_data.get("name", "").lower()
            weight = food_data.get("weight", 100)  # Default 100g if not provided

            if food_name in glycemic_index:
                gi_data = glycemic_index[food_name]
                gi_value = gi_data["gi_value"]  # Changed from "gi" to "gi_value"

                # Calculate glycemic load
                carbs = get_carbohydrates_for_weight(food_name, weight)
                gl = (gi_value * carbs) / 100

                total_gi_score += gi_value
                total_gl_score += gl

                if (
                    gi_data["gi_category"] == "high" or gl > 20
                ):  # Changed from "category" to "gi_category"
                    high_risk_foods.append(
                        {
                            "name": food_name,
                            "gi": gi_value,
                            "gl": round(gl, 1),
                            "reason": f"High GI ({gi_value}) or High GL ({gl:.1f})",
                        }
                    )

        # Calculate average scores
        avg_gi = round(total_gi_score / food_count, 1) if food_count > 0 else 0
        avg_gl = round(total_gl_score, 1)

        # Determine risk level
        if avg_gi >= 70 or avg_gl >= 20:
            risk_level = "high"
            recommendations.extend(
                [
                    "Consider smaller portions",
                    "Add high-fiber foods or protein",
                    "Monitor blood glucose after meal",
                ]
            )
        elif avg_gi >= 56 or avg_gl >= 11:
            risk_level = "medium"
            recommendations.extend(
                ["Good portion control recommended", "Pair with vegetables or salad"]
            )
        else:
            risk_level = "low"
            recommendations.append("Good choice for blood sugar control")

        # Get food alternatives for high-risk items
        alternatives = {}
        for high_risk_food in high_risk_foods:
            food_name = high_risk_food["name"]
            if food_name in food_alternatives.get("alternatives", {}):
                alternatives[food_name] = food_alternatives["alternatives"][food_name]

        return jsonify(
            {
                "status": "success",
                "analysis": {
                    "risk_level": risk_level,
                    "average_gi": avg_gi,
                    "total_glycemic_load": avg_gl,
                    "high_risk_foods": high_risk_foods,
                    "recommendations": recommendations,
                    "alternatives": alternatives,
                },
            }
        )

    except Exception as e:
        logger.error(f"Error in diabetes analysis: {str(e)}")
        return (
            jsonify({"status": "error", "message": f"Analysis failed: {str(e)}"}),
            500,
        )


@app.route("/food-details/<food_name>", methods=["GET"])
def get_food_details(food_name):
    """Get comprehensive details about a specific food item"""
    try:
        food_name = food_name.lower()

        # Get nutrition info
        nutrition_info = nutrition_database.get(food_name, {})

        # Get physical properties
        density_info = physical_properties.get(
            food_name, physical_properties.get("default", {})
        )

        # Get glycemic info
        gi_info = glycemic_index.get(food_name, {})

        # Get alternatives
        alternatives = food_alternatives.get("alternatives", {}).get(food_name, {})

        if not any([nutrition_info, density_info, gi_info]):
            return (
                jsonify(
                    {"status": "error", "message": f"No data found for {food_name}"}
                ),
                404,
            )

        return jsonify(
            {
                "status": "success",
                "food_name": food_name,
                "nutrition": nutrition_info,
                "physical_properties": density_info,
                "glycemic_index": gi_info,
                "health_alternatives": alternatives,
            }
        )

    except Exception as e:
        logger.error(f"Error getting food details: {str(e)}")
        return (
            jsonify(
                {"status": "error", "message": f"Failed to get food details: {str(e)}"}
            ),
            500,
        )


@app.route("/weight-estimation", methods=["POST"])
def enhanced_weight_estimation():
    """Enhanced weight estimation using the new databases"""
    try:
        if not request.json or "foods" not in request.json:
            return jsonify({"status": "error", "message": "No food data provided"}), 400

        foods = request.json["foods"]
        results = []

        for food_data in foods:
            food_name = food_data.get("name", "").lower()
            area_cm2 = food_data.get("area_cm2", 0)

            if food_name in physical_properties:
                props = physical_properties[food_name]

                # Calculate volume based on shape
                thickness = props.get("thickness_cm", 2.0)
                shape = props.get("shape", "rectangular")

                if shape == "cylinder":
                    radius = (area_cm2 / 3.14159) ** 0.5
                    volume = 3.14159 * radius * radius * thickness
                elif shape == "sphere":
                    radius = (area_cm2 / (4 * 3.14159)) ** 0.5
                    volume = (4 / 3) * 3.14159 * (radius**3)
                else:  # rectangular or irregular
                    volume = area_cm2 * thickness
                    if shape == "irregular":
                        volume *= 0.8  # Reduction factor

                # Calculate weight
                density = props.get("density", 1.0)
                estimated_weight = volume * density

                # Get nutrition info for this weight
                nutrition_info = get_nutrition_for_weight(food_name, estimated_weight)

                # Get glycemic info
                gi_info = get_glycemic_info_for_weight(food_name, estimated_weight)

                results.append(
                    {
                        "food_name": food_name,
                        "estimated_weight_grams": round(estimated_weight, 1),
                        "calculation_details": {
                            "area_cm2": area_cm2,
                            "thickness_cm": thickness,
                            "volume_cm3": round(volume, 2),
                            "density": density,
                            "shape": shape,
                        },
                        "nutrition": nutrition_info,
                        "glycemic_info": gi_info,
                    }
                )
            else:
                # Use fallback estimation
                estimated_weight = area_cm2 * 2.0 * 1.0  # area × thickness × density
                results.append(
                    {
                        "food_name": food_name,
                        "estimated_weight_grams": round(estimated_weight, 1),
                        "calculation_details": {
                            "area_cm2": area_cm2,
                            "method": "fallback_estimation",
                            "note": "No specific data available for this food",
                        },
                        "nutrition": {},
                        "glycemic_info": {},
                    }
                )

        return jsonify({"status": "success", "weight_estimations": results})

    except Exception as e:
        logger.error(f"Error in weight estimation: {str(e)}")
        return (
            jsonify(
                {"status": "error", "message": f"Weight estimation failed: {str(e)}"}
            ),
            500,
        )


def get_carbohydrates_for_weight(food_name, weight_grams):
    """Get carbohydrates for a specific weight"""
    food_data = nutrition_database.get(food_name, {})
    if not food_data:
        return 0

    factor = weight_grams / 100
    return (
        food_data.get("nutrition_per_100g", {}).get("carbs", 0) * factor
    )  # Changed from "carbohydrates" to "carbs"


def get_nutrition_for_weight(food_name, weight_grams):
    """Get nutrition info for a specific weight"""
    food_data = nutrition_database.get(food_name, {})
    if not food_data:
        return {}

    factor = weight_grams / 100
    nutrition = food_data.get("nutrition_per_100g", {})

    return {
        "calories": round(nutrition.get("calories", 0) * factor, 1),
        "protein": round(nutrition.get("protein", 0) * factor, 1),
        "carbohydrates": round(
            nutrition.get("carbs", 0) * factor, 1
        ),  # Changed from "carbohydrates" to "carbs"
        "fat": round(nutrition.get("fat", 0) * factor, 1),
        "fiber": round(nutrition.get("fiber", 0) * factor, 1),
    }


def get_glycemic_info_for_weight(food_name, weight_grams):
    """Get glycemic info for a specific weight"""
    gi_data = glycemic_index.get(food_name, {})
    if not gi_data:
        return {}

    carbs = get_carbohydrates_for_weight(food_name, weight_grams)
    gl = (gi_data.get("gi_value", 0) * carbs) / 100  # Changed from "gi" to "gi_value"

    return {
        "gi": gi_data.get("gi_value", 0),  # Changed from "gi" to "gi_value"
        "category": gi_data.get(
            "gi_category", "unknown"
        ),  # Changed from "category" to "gi_category"
        "glycemic_load": round(gl, 1),
    }


@app.errorhandler(500)
def internal_error(error):
    return jsonify({"status": "error", "message": "Internal server error"}), 500


if __name__ == "__main__":
    print("🍽️ Starting Food Detection API Server with Roboflow SDK...")
    print("📡 Server will be available at: http://localhost:5000")
    print("🧪 Test endpoint: http://localhost:5000/test")
    print("🎯 Prediction endpoint: http://localhost:5000/predict")
    print("� Direct API proxy: http://localhost:5000/direct-predict")
    print("�📋 Classes endpoint: http://localhost:5000/classes")

    if model is None:
        print(
            "⚠️  Warning: Roboflow model not initialized - check your API key and connection"
        )
    else:
        print("✅ Roboflow model ready for predictions")

    app.run(debug=True, host="0.0.0.0", port=5000)
