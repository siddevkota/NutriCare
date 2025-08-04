// Weight estimation service - same logic as frontend but for backend
const densityDatabase = require("../models/densityDatabase");
const fs = require("fs");
const path = require("path");

// Load the new JSON databases
const nutritionDatabase = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../data/nutrition_database.json"),
    "utf8"
  )
);
const physicalProperties = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../data/physical_properties.json"),
    "utf8"
  )
);
const glycemicIndex = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../data/glycemic_index.json"),
    "utf8"
  )
);
const foodAlternatives = JSON.parse(
  fs.readFileSync(
    path.join(__dirname, "../../data/food_alternatives.json"),
    "utf8"
  )
);

class WeightEstimationService {
  constructor() {
    this.STANDARD_PLATE_DIAMETER = 27; // cm
  }

  estimateWeight(segmentationResults, elevationData, imageWidth, imageHeight) {
    const foodItems = [];
    let totalWeight = 0;

    // Calculate pixels per cm based on elevation and image dimensions
    const pixelsPerCm = this.calculatePixelsPerCm(
      elevationData,
      imageWidth,
      imageHeight
    );

    for (const segment of segmentationResults) {
      const foodItem = this.processFoodSegment(
        segment,
        pixelsPerCm,
        elevationData
      );
      foodItems.push(foodItem);
      totalWeight += foodItem.estimatedWeight;
    }

    return {
      foodItems,
      totalWeight: Math.round(totalWeight * 10) / 10,
      elevationData,
      imageMetadata: {
        width: imageWidth,
        height: imageHeight,
        timestamp: new Date().toISOString(),
      },
    };
  }

  calculatePixelsPerCm(elevationData, imageWidth, imageHeight) {
    // Estimate the scale based on elevation and camera distance
    const estimatedWidthCm = 40 + elevationData.height / 10;
    const estimatedHeightCm = 30 + elevationData.height / 10;

    const pixelsPerCmWidth = imageWidth / estimatedWidthCm;
    const pixelsPerCmHeight = imageHeight / estimatedHeightCm;

    return (pixelsPerCmWidth + pixelsPerCmHeight) / 2;
  }

  processFoodSegment(segment, pixelsPerCm, elevationData) {
    // Calculate area in cm²
    const areaCm2 = segment.area / (pixelsPerCm * pixelsPerCm);

    // Get physical properties from database
    const physicalProps =
      physicalProperties[segment.class] || physicalProperties["default"];

    // Estimate thickness/height based on food type and elevation
    const estimatedThickness = this.estimateFoodThickness(
      segment.class,
      elevationData.height,
      physicalProps
    );

    // Calculate volume using shape-specific formula
    const volume = this.calculateVolume(
      areaCm2,
      estimatedThickness,
      physicalProps.shape
    );

    // Get density for the food type
    const density = physicalProps.density;

    // Calculate weight
    const weight = volume * density;

    // Get comprehensive nutrition info
    const nutritionalInfo = this.getComprehensiveNutrition(
      segment.class,
      weight
    );

    return {
      id: segment.id,
      name: segment.class,
      segmentation: segment,
      estimatedWeight: Math.round(weight * 10) / 10,
      estimatedVolume: Math.round(volume * 10) / 10,
      density,
      nutritionalInfo,
      glycemicInfo: this.getGlycemicInfo(segment.class, weight),
      diabetesRisk: this.calculateDiabetesRisk(segment.class, weight),
      healthAlternatives: this.getHealthAlternatives(segment.class),
    };
  }

  estimateFoodThickness(foodClass, objectHeight, physicalProps) {
    // Use database thickness values
    let thickness = physicalProps.thickness_cm || 2.0;

    // Adjust thickness based on elevation (height detection)
    if (objectHeight > 10) {
      thickness *= 1.5;
    } else if (objectHeight > 5) {
      thickness *= 1.2;
    }

    return thickness;
  }

  calculateVolume(areaCm2, thickness, shape) {
    switch (shape) {
      case "cylinder":
        // For cylindrical foods like roti, selroti
        const radius = Math.sqrt(areaCm2 / Math.PI);
        return Math.PI * radius * radius * thickness;

      case "sphere":
        // For spherical foods like oranges, apples
        const radius_sphere = Math.sqrt(areaCm2 / (4 * Math.PI));
        return (4 / 3) * Math.PI * Math.pow(radius_sphere, 3);

      case "rectangular":
        // For rectangular foods like bread, samosa
        return areaCm2 * thickness;

      case "irregular":
        // For irregular foods, use simple area × thickness
        return areaCm2 * thickness * 0.8; // Reduction factor for irregularity

      default:
        return areaCm2 * thickness;
    }
  }

  getComprehensiveNutrition(foodClass, weightGrams) {
    const foodData = nutritionDatabase[foodClass];
    if (!foodData) {
      return this.estimateNutrition(foodClass, weightGrams);
    }

    const factor = weightGrams / 100; // Database is per 100g
    const nutrition = foodData.per_100g;

    return {
      calories: Math.round(nutrition.calories * factor),
      protein: Math.round(nutrition.protein * factor * 10) / 10,
      carbs: Math.round(nutrition.carbohydrates * factor * 10) / 10,
      fat: Math.round(nutrition.fat * factor * 10) / 10,
      fiber: Math.round(nutrition.fiber * factor * 10) / 10,
      sugar: Math.round(nutrition.sugar * factor * 10) / 10,
      sodium: Math.round(nutrition.sodium * factor * 10) / 10,
      cholesterol: Math.round(nutrition.cholesterol * factor * 10) / 10,
      vitamins: {
        vitamin_c: Math.round(nutrition.vitamin_c * factor * 10) / 10,
        vitamin_a: Math.round(nutrition.vitamin_a * factor * 10) / 10,
        vitamin_b12: Math.round(nutrition.vitamin_b12 * factor * 10) / 10,
        folate: Math.round(nutrition.folate * factor * 10) / 10,
      },
      minerals: {
        calcium: Math.round(nutrition.calcium * factor * 10) / 10,
        iron: Math.round(nutrition.iron * factor * 10) / 10,
        magnesium: Math.round(nutrition.magnesium * factor * 10) / 10,
        potassium: Math.round(nutrition.potassium * factor * 10) / 10,
        zinc: Math.round(nutrition.zinc * factor * 10) / 10,
      },
    };
  }

  getGlycemicInfo(foodClass, weightGrams) {
    const giData = glycemicIndex[foodClass];
    if (!giData) {
      return { gi: "unknown", category: "unknown", glycemic_load: 0 };
    }

    const carbsPerServing = this.getCarbohydratesForWeight(
      foodClass,
      weightGrams
    );
    const glycemicLoad =
      Math.round(((giData.gi * carbsPerServing) / 100) * 10) / 10;

    return {
      gi: giData.gi,
      category: giData.category,
      glycemic_load: glycemicLoad,
      gl_category: this.categorizeGlycemicLoad(glycemicLoad),
      recommendation: giData.recommendation,
    };
  }

  categorizeGlycemicLoad(gl) {
    if (gl <= 10) return "low";
    if (gl <= 19) return "medium";
    return "high";
  }

  getCarbohydratesForWeight(foodClass, weightGrams) {
    const foodData = nutritionDatabase[foodClass];
    if (!foodData) return 0;

    const factor = weightGrams / 100;
    return foodData.per_100g.carbohydrates * factor;
  }

  calculateDiabetesRisk(foodClass, weightGrams) {
    const giInfo = this.getGlycemicInfo(foodClass, weightGrams);

    let riskScore = 0;
    let riskLevel = "low";
    let recommendations = [];

    // Calculate risk based on GI and GL
    if (giInfo.category === "high") riskScore += 3;
    else if (giInfo.category === "medium") riskScore += 2;
    else riskScore += 1;

    if (giInfo.gl_category === "high") riskScore += 3;
    else if (giInfo.gl_category === "medium") riskScore += 2;
    else riskScore += 1;

    // Determine risk level
    if (riskScore >= 5) {
      riskLevel = "high";
      recommendations.push("Consider smaller portion or healthier alternative");
      recommendations.push("Pair with high-fiber foods or protein");
    } else if (riskScore >= 3) {
      riskLevel = "medium";
      recommendations.push("Monitor portion size");
      recommendations.push("Consider pairing with vegetables");
    } else {
      riskLevel = "low";
      recommendations.push("Good choice for blood sugar control");
    }

    return {
      score: riskScore,
      level: riskLevel,
      recommendations,
    };
  }

  getHealthAlternatives(foodClass) {
    return foodAlternatives.alternatives[foodClass] || null;
  }

  estimateNutrition(foodClass, weightGrams) {
    // Nutritional data per 100g
    const nutritionPer100g = {
      apple: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
      banana: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
      orange: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
      bread: { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
      rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      beef: { calories: 250, protein: 26, carbs: 0, fat: 15 },
      potato: { calories: 77, protein: 2, carbs: 17, fat: 0.1 },
      carrot: { calories: 41, protein: 0.9, carbs: 10, fat: 0.2 },
      broccoli: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
    };

    const normalizedClass = foodClass.toLowerCase();
    const baseNutrition = nutritionPer100g[normalizedClass] || {
      calories: 100,
      protein: 5,
      carbs: 15,
      fat: 2,
    };

    const factor = weightGrams / 100;

    return {
      calories: Math.round(baseNutrition.calories * factor),
      protein: Math.round(baseNutrition.protein * factor * 10) / 10,
      carbs: Math.round(baseNutrition.carbs * factor * 10) / 10,
      fat: Math.round(baseNutrition.fat * factor * 10) / 10,
    };
  }

  validateEstimation(result) {
    const warnings = [];
    let isValid = true;

    // Check for unrealistic weights
    for (const item of result.foodItems) {
      if (item.estimatedWeight < 1) {
        warnings.push(
          `${item.name} weight seems too low (${item.estimatedWeight}g)`
        );
      }
      if (item.estimatedWeight > 1000) {
        warnings.push(
          `${item.name} weight seems too high (${item.estimatedWeight}g)`
        );
        isValid = false;
      }
    }

    // Check total weight
    if (result.totalWeight > 2000) {
      warnings.push(`Total weight seems unrealistic (${result.totalWeight}g)`);
      isValid = false;
    }

    // Check elevation data
    if (Math.abs(result.elevationData.height) > 100) {
      warnings.push(
        `Elevation measurement seems extreme (${result.elevationData.height}cm)`
      );
    }

    return { isValid, warnings };
  }
}

module.exports = new WeightEstimationService();
