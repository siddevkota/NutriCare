import {
  SegmentationResult,
  FoodItem,
  WeightEstimationResult,
} from '../types/segmentation';
import { getFoodDensity } from '../utils/densityDatabase';

export class WeightEstimationService {
  // Standard plate diameter in cm (typical dinner plate)
  private readonly STANDARD_PLATE_DIAMETER = 27; // cm

  // Coin reference dimensions for real-world scaling
  private readonly COIN_DIAMETER_MM = 25; // 25mm diameter
  private readonly COIN_THICKNESS_MM = 1.6; // 1.6mm thickness (negligible for area calculations)

  constructor() {}

  estimateWeight(
    segmentationResults: SegmentationResult[],
    imageWidth: number,
    imageHeight: number
  ): WeightEstimationResult {
    const foodItems: FoodItem[] = [];
    let totalWeight = 0;

    // Check if coin is detected for real-world reference
    const coinSegment = segmentationResults.find((segment) =>
      segment.class.toLowerCase().includes('coin')
    );

    // Calculate pixels per cm using coin reference or fallback to standard assumptions
    const pixelsPerCm = this.calculatePixelsPerCm(
      imageWidth,
      imageHeight,
      coinSegment
    );

    // Filter out coin from food items (we don't want to show coin nutrition)
    const foodSegments = segmentationResults.filter(
      (segment) => !segment.class.toLowerCase().includes('coin')
    );

    console.log(`🪙 Coin detection: ${coinSegment ? 'Found' : 'Not found'}`);
    console.log(`📏 Pixels per cm: ${pixelsPerCm.toFixed(2)}`);

    for (const segment of foodSegments) {
      const foodItem = this.processFoodSegment(segment, pixelsPerCm);
      foodItems.push(foodItem);
      totalWeight += foodItem.estimatedWeight;
    }

    return {
      foodItems,
      totalWeight,
      imageMetadata: {
        width: imageWidth,
        height: imageHeight,
        timestamp: new Date().toISOString(),
        coinDetected: !!coinSegment,
        scalingMethod: coinSegment ? 'coin-reference' : 'default-assumptions',
      },
    };
  }

  private calculatePixelsPerCm(
    imageWidth: number,
    imageHeight: number,
    coinSegment?: SegmentationResult
  ): number {
    if (coinSegment) {
      // Use coin as real-world reference
      // Calculate coin's bounding box dimensions in pixels
      const coinBoundingBox = this.getBoundingBoxFromSegmentation(coinSegment);
      const coinDiameterPixels = Math.max(
        coinBoundingBox.width,
        coinBoundingBox.height
      );

      // Convert coin diameter from mm to cm
      const coinDiameterCm = this.COIN_DIAMETER_MM / 10;

      // Calculate pixels per cm based on coin reference
      const pixelsPerCm = coinDiameterPixels / coinDiameterCm;

      console.log(
        `🪙 Coin diameter in pixels: ${coinDiameterPixels.toFixed(1)}`
      );
      console.log(`🪙 Real coin diameter: ${coinDiameterCm}cm`);
      console.log(`📏 Calculated pixels per cm: ${pixelsPerCm.toFixed(2)}`);

      return pixelsPerCm;
    } else {
      // Fallback to standard assumptions when no coin detected
      const estimatedWidthCm = 40;
      const estimatedHeightCm = 30;

      const pixelsPerCmWidth = imageWidth / estimatedWidthCm;
      const pixelsPerCmHeight = imageHeight / estimatedHeightCm;

      // Use average for consistency
      return (pixelsPerCmWidth + pixelsPerCmHeight) / 2;
    }
  }

  private getBoundingBoxFromSegmentation(segment: SegmentationResult): {
    width: number;
    height: number;
    x: number;
    y: number;
  } {
    // For simplicity, estimate bounding box from area
    // In a real implementation, you would use the actual segmentation mask
    const estimatedDiameter = Math.sqrt(segment.area / Math.PI) * 2;

    return {
      width: estimatedDiameter,
      height: estimatedDiameter,
      x: segment.x - estimatedDiameter / 2,
      y: segment.y - estimatedDiameter / 2,
    };
  }

  private processFoodSegment(
    segment: SegmentationResult,
    pixelsPerCm: number
  ): FoodItem {
    // Calculate area in cm²
    const areaCm2 = segment.area / (pixelsPerCm * pixelsPerCm);

    // Estimate thickness based on food type
    const estimatedThickness = this.estimateFoodThickness(segment.class);

    // Calculate volume
    const volume = areaCm2 * estimatedThickness;

    // Get density for the food type
    const density = getFoodDensity(segment.class);

    // Calculate weight
    const weight = volume * density;

    return {
      id: segment.id,
      name: segment.class,
      segmentation: segment,
      estimatedWeight: Math.round(weight * 10) / 10, // Round to 1 decimal
      estimatedVolume: Math.round(volume * 10) / 10,
      density,
      nutritionalInfo: this.estimateNutrition(segment.class, weight),
    };
  }

  private estimateFoodThickness(foodClass: string): number {
    // Simple thickness estimates based on food type
    const baseThickness: { [key: string]: number } = {
      apple: 2.5,
      banana: 3.0,
      orange: 2.8,
      bread: 1.5,
      rice: 0.8,
      chicken: 2.0,
      beef: 2.5,
      potato: 3.0,
      carrot: 2.0,
      broccoli: 4.0,
      pasta: 1.0,
      cheese: 1.5,
      egg: 2.5,
      fish: 2.0,
      tomato: 2.0,
    };

    const normalizedClass = foodClass.toLowerCase();
    return baseThickness[normalizedClass] || 2.0; // Default 2cm
  }

  private estimateNutrition(foodClass: string, weightGrams: number) {
    // Simplified nutritional data per 100g
    const nutritionPer100g: { [key: string]: any } = {
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
      pasta: { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
      cheese: { calories: 402, protein: 25, carbs: 1.3, fat: 33 },
      egg: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
      fish: { calories: 206, protein: 22, carbs: 0, fat: 12 },
      tomato: { calories: 18, protein: 0.9, carbs: 3.9, fat: 0.2 },
    };

    const normalizedClass = foodClass.toLowerCase();
    const baseNutrition = nutritionPer100g[normalizedClass] || {
      calories: 100,
      protein: 5,
      carbs: 15,
      fat: 3,
    };

    const factor = weightGrams / 100;

    return {
      calories: Math.round(baseNutrition.calories * factor),
      protein: Math.round(baseNutrition.protein * factor * 10) / 10,
      carbs: Math.round(baseNutrition.carbs * factor * 10) / 10,
      fat: Math.round(baseNutrition.fat * factor * 10) / 10,
    };
  }

  // Basic validation method
  validateEstimation(result: WeightEstimationResult): {
    isValid: boolean;
    warnings: string[];
  } {
    const warnings: string[] = [];
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

    return { isValid, warnings };
  }
}
