export interface SegmentationResult {
  id: string;
  confidence: number;
  class: string;
  mask: number[][]; // 2D array representing the segmentation mask
  boundingBox: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  x: number; // Center x coordinate
  y: number; // Center y coordinate
  area: number; // Area in pixels
}

export interface FoodItem {
  id: string;
  name: string;
  segmentation: SegmentationResult;
  estimatedWeight: number; // in grams
  estimatedVolume: number; // in cm³
  density: number; // g/cm³
  nutritionalInfo?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface WeightEstimationResult {
  foodItems: FoodItem[];
  totalWeight: number;
  imageMetadata: {
    width: number;
    height: number;
    timestamp: string;
    coinDetected?: boolean;
    scalingMethod?: 'coin-reference' | 'default-assumptions';
  };
}

export interface DensityData {
  [foodClass: string]: {
    density: number; // g/cm³
    name: string;
    category: string;
  };
}
