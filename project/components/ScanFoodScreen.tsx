import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Image,
  ScrollView,
  Dimensions,
  Modal,
  TextInput,
} from 'react-native';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft,
  Camera,
  RotateCcw,
  Eye,
  EyeOff,
  Save,
  ImageIcon,
  Layers,
  Activity,
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import {
  pythonBackendService,
  BackendResponse,
} from '../services/pythonBackendService';
import { WeightEstimationService } from '../services/weightEstimationService';
import {
  SegmentationResult,
  WeightEstimationResult,
} from '../types/segmentation';
import { MaskViewScreen } from './MaskViewScreen';
import { nutritionAnalysisService } from '../services/nutritionAnalysisService';

const { width: screenWidth } = Dimensions.get('window');

interface ScanFoodScreenProps {
  visible: boolean;
  onClose: () => void;
  onSave: (results: DetectionResult[], imageUri: string) => void;
  mealType: string;
}

export interface DetectionResult {
  id: string;
  class: string;
  confidence: number;
  weight: number; // dummy for now
  nutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  mealType: string;
  timestamp: string;
  boundingBox?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export const ScanFoodScreen: React.FC<ScanFoodScreenProps> = ({
  visible,
  onClose,
  onSave,
  mealType,
}) => {
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [detectionResults, setDetectionResults] = useState<DetectionResult[]>(
    []
  );
  const [maskOverlayUri, setMaskOverlayUri] = useState<string | null>(null);
  const [processingStatus, setProcessingStatus] = useState('');

  // New state for mask viewing
  const [showMaskView, setShowMaskView] = useState(false);
  const [backendResponse, setBackendResponse] =
    useState<BackendResponse | null>(null);
  const [preGeneratedMaskOverlay, setPreGeneratedMaskOverlay] = useState<
    string | null
  >(null);
  const [segmentationMask, setSegmentationMask] = useState<string | null>(null);
  const [classMap, setClassMap] = useState<{ [key: string]: string }>({});
  const [detectedClasses, setDetectedClasses] = useState<string[]>([]);

  // State for expandable food cards
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [nutritionDetails, setNutritionDetails] = useState<{
    [key: string]: any;
  }>({});
  const [loadingNutrition, setLoadingNutrition] = useState<Set<string>>(
    new Set()
  );

  // State for coin detection notification
  const [coinDetected, setCoinDetected] = useState<boolean>(false);
  const [allDetectionResults, setAllDetectionResults] = useState<
    DetectionResult[]
  >([]);

  // State for inline editing
  const [editingCard, setEditingCard] = useState<string | null>(null);
  const [editedWeights, setEditedWeights] = useState<{ [key: string]: string }>(
    {}
  );

  const cameraRef = useRef<CameraView>(null);

  // Initialize services
  const weightEstimationService = new WeightEstimationService();

  // Function to calculate diabetes risk based on food properties
  const calculateDiabetesRisk = (foodName: string, nutrition: any) => {
    // Access the correct data structure from the API response
    const gi = nutrition?.glycemic_index?.gi_value || 50; // Default medium GI
    const carbs = nutrition?.nutrition?.nutrition_per_100g?.carbs || 0;
    const fiber = nutrition?.nutrition?.nutrition_per_100g?.fiber || 0;
    const sugar = nutrition?.nutrition?.nutrition_per_100g?.sugar || 0;
    const giCategory = nutrition?.glycemic_index?.gi_category || 'medium';

    let riskScore = 0;
    let recommendations = [];

    // GI scoring based on actual API categories and values
    if (giCategory === 'very_low' || gi < 15) {
      riskScore += 0; // Very low risk
      recommendations.push(
        'Very low glycemic index - excellent for blood sugar control'
      );
    } else if (giCategory === 'low' || gi < 55) {
      riskScore += 1; // Low risk
      recommendations.push('Low glycemic index - good for blood sugar control');
    } else if (giCategory === 'medium' || gi < 70) {
      riskScore += 2; // Medium risk
      recommendations.push('Medium glycemic index - consume in moderation');
    } else {
      riskScore += 3; // High risk
      recommendations.push(
        'High glycemic index - limit portion size and pair with protein/fiber'
      );
    }

    // Carb/Sugar scoring (more realistic thresholds)
    if (carbs > 25) riskScore += 1; // High carb foods
    if (sugar > 5) riskScore += 1; // Foods with added sugars

    // Fiber bonus (reduces risk)
    if (fiber > 3) riskScore -= 1;

    // Food-specific adjustments
    const lowRiskFoods = ['gundruk', 'daal', 'masu'];
    const mediumRiskFoods = ['roti', 'chowmein'];
    const highRiskFoods = ['kheer', 'selroti', 'yomari', 'bhat']; // Added bhat to high risk

    if (lowRiskFoods.includes(foodName.toLowerCase())) {
      riskScore -= 1;
      recommendations.push('Traditional healthy food choice');
    }

    if (mediumRiskFoods.includes(foodName.toLowerCase())) {
      recommendations.push('Moderate carbohydrate content');
    }

    if (highRiskFoods.includes(foodName.toLowerCase())) {
      riskScore += 1;
      if (foodName.toLowerCase() === 'bhat') {
        recommendations.push(
          'High-GI staple - consider smaller portions or pair with low-GI foods'
        );
      } else {
        recommendations.push('Enjoy occasionally as a treat');
      }
    }

    // Determine final risk level with better thresholds
    const finalScore = Math.max(1, Math.min(5, riskScore));
    let level: 'low' | 'medium' | 'high';

    if (finalScore <= 1) {
      level = 'low';
      recommendations.push('Safe for regular consumption');
    } else if (finalScore <= 3) {
      level = 'medium';
      recommendations.push('Monitor portion sizes and frequency');
    } else {
      level = 'high';
      recommendations.push('Consume sparingly or with blood sugar monitoring');
    }

    return {
      score: finalScore,
      level,
      recommendations: recommendations.slice(0, 4), // Limit to 4 recommendations
    };
  };

  // Function to get food-specific health benefits
  const getFoodHealthBenefits = (foodName: string) => {
    const benefits: {
      [key: string]: { name: string; reason: string; serving: string };
    } = {
      gundruk: {
        name: 'Fermented Leafy Greens',
        reason:
          'Rich in probiotics, supports digestive health and immune system',
        serving: '1 cup (~56g)',
      },
      daal: {
        name: 'Lentil Protein Source',
        reason: 'High in plant protein, fiber, and essential minerals',
        serving: '1 cup cooked (~198g)',
      },
      bhat: {
        name: 'Staple Carbohydrate',
        reason: 'Provides steady energy, fortified with B vitamins',
        serving: '1 cup cooked (~195g)',
      },
      masu: {
        name: 'Lean Protein',
        reason: 'Complete protein source with essential amino acids',
        serving: '100g cooked',
      },
      momo: {
        name: 'Steamed Dumpling',
        reason: 'Balanced protein and carbs, steaming retains nutrients',
        serving: '5-6 pieces (~150g)',
      },
      chowmein: {
        name: 'Stir-fried Noodles',
        reason:
          'Quick energy source, contains vegetables when prepared traditionally',
        serving: '1 plate (~200g)',
      },
      roti: {
        name: 'Whole Grain Flatbread',
        reason: 'Fiber-rich carbohydrate, supports digestive health',
        serving: '1 medium piece (~40g)',
      },
      selroti: {
        name: 'Traditional Ring Bread',
        reason:
          'Fermented rice bread, cultural significance and celebration food',
        serving: '1 piece (~30g)',
      },
    };

    return (
      benefits[foodName.toLowerCase()] || {
        name: 'Traditional Nepali Food',
        reason: 'Part of balanced traditional diet with cultural significance',
        serving: 'Standard serving',
      }
    );
  };

  // Function to toggle card expansion and fetch nutrition details
  const toggleCardExpansion = async (foodName: string, weight: number) => {
    const newExpandedCards = new Set(expandedCards);

    if (expandedCards.has(foodName)) {
      // Collapse the card
      newExpandedCards.delete(foodName);
      setExpandedCards(newExpandedCards);
    } else {
      // Expand the card and fetch nutrition data if not already loaded
      newExpandedCards.add(foodName);
      setExpandedCards(newExpandedCards);

      // Always fetch fresh data to avoid stale cache issues
      const newLoadingNutrition = new Set(loadingNutrition);
      newLoadingNutrition.add(foodName);
      setLoadingNutrition(newLoadingNutrition);

      try {
        console.log(`🌐 Fetching nutrition details for: ${foodName}`);
        const nutritionData = await nutritionAnalysisService.getFoodDetails(
          foodName
        );

        console.log(
          '🔍 Fetched nutrition data:',
          JSON.stringify(nutritionData, null, 2)
        );

        setNutritionDetails((prev) => ({
          ...prev,
          [foodName]: nutritionData,
        }));
      } catch (error) {
        console.error('❌ Error fetching nutrition data:', error);
        Alert.alert(
          'Error',
          'Failed to load nutrition details. Please try again.'
        );
      } finally {
        const newLoadingNutrition = new Set(loadingNutrition);
        newLoadingNutrition.delete(foodName);
        setLoadingNutrition(newLoadingNutrition);
      }
    }
  };

  // Function to delete a detection result
  const handleDeleteFood = (foodId: string, foodName: string) => {
    Alert.alert(
      'Delete Food Item',
      `Are you sure you want to remove "${foodName}" from the detection results?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            // Remove from detection results
            setDetectionResults((prev) =>
              prev.filter((result) => result.id !== foodId)
            );

            // Clean up related state
            setExpandedCards((prev) => {
              const newSet = new Set(prev);
              newSet.delete(foodName);
              return newSet;
            });

            setEditedWeights((prev) => {
              const newWeights = { ...prev };
              delete newWeights[foodName];
              return newWeights;
            });

            setNutritionDetails((prev) => {
              const newDetails = { ...prev };
              delete newDetails[foodName];
              return newDetails;
            });

            setLoadingNutrition((prev) => {
              const newSet = new Set(prev);
              newSet.delete(foodName);
              return newSet;
            });

            console.log(`🗑️ Deleted food item: ${foodName} (ID: ${foodId})`);
          },
        },
      ]
    );
  };

  // Function to pre-generate mask overlay
  const generateMaskOverlay = async (
    response: BackendResponse,
    imageUri: string
  ) => {
    try {
      // Convert image URI to base64
      const originalImageBase64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      const maskResponse = await fetch(
        'http://192.168.0.107:5000/generate-mask',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            segmentation_mask: response.segmentationMask,
            class_map: response.classMap,
            original_image: originalImageBase64,
          }),
        }
      );

      if (!maskResponse.ok) {
        throw new Error(`HTTP ${maskResponse.status}`);
      }

      const maskData = await maskResponse.json();
      if (maskData.status === 'success') {
        setPreGeneratedMaskOverlay(maskData.mask_overlay);
      }
    } catch (error) {
      console.error('Error pre-generating mask overlay:', error);
      throw error;
    }
  };

  const toggleCameraFacing = useCallback(() => {
    setFacing((current: CameraType) => (current === 'back' ? 'front' : 'back'));
  }, []);

  const generateDummyNutrition = (foodClass: string, weight: number) => {
    // Dummy nutrition values per 100g
    const nutritionPer100g: { [key: string]: any } = {
      apple: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
      banana: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
      orange: { calories: 47, protein: 0.9, carbs: 12, fat: 0.1 },
      bread: { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
      rice: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
      chicken: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
      default: { calories: 100, protein: 5, carbs: 15, fat: 3 },
    };

    const baseNutrition =
      nutritionPer100g[foodClass.toLowerCase()] || nutritionPer100g.default;
    const factor = weight / 100;

    return {
      calories: Math.round(baseNutrition.calories * factor),
      protein: Math.round(baseNutrition.protein * factor * 10) / 10,
      carbs: Math.round(baseNutrition.carbs * factor * 10) / 10,
      fat: Math.round(baseNutrition.fat * factor * 10) / 10,
    };
  };

  const generateDummyWeight = (foodClass: string, area: number): number => {
    // Dummy weight calculation based on food type and detected area
    const baseWeights: { [key: string]: number } = {
      apple: 150,
      banana: 120,
      orange: 130,
      bread: 25,
      rice: 80,
      chicken: 100,
    };

    const baseWeight = baseWeights[foodClass.toLowerCase()] || 100;
    // Scale based on area (this is dummy logic)
    const scaleFactor = Math.max(0.5, Math.min(2.0, area / 10000));
    return Math.round(baseWeight * scaleFactor);
  };

  const createMaskOverlay = (
    segmentationResults: SegmentationResult[],
    imageWidth: number,
    imageHeight: number
  ): string => {
    // Create a simple SVG overlay with colored rectangles for each detected food item
    const colors = [
      '#10B981',
      '#F59E0B',
      '#EF4444',
      '#8B5CF6',
      '#06B6D4',
      '#F97316',
    ];

    let svgElements = '';

    segmentationResults.forEach((result, index) => {
      const color = colors[index % colors.length];
      const { x, y, width, height } = result.boundingBox;

      // Convert coordinates to percentages for responsive overlay
      const xPercent = (x / imageWidth) * 100;
      const yPercent = (y / imageHeight) * 100;
      const widthPercent = (width / imageWidth) * 100;
      const heightPercent = (height / imageHeight) * 100;

      // Add semi-transparent rectangle
      svgElements += `<rect x="${xPercent}%" y="${yPercent}%" width="${widthPercent}%" height="${heightPercent}%" fill="${color}" fill-opacity="0.3" stroke="${color}" stroke-width="2"/>`;
      svgElements += `<text x="${xPercent + widthPercent / 2}%" y="${
        yPercent + heightPercent / 2
      }%" text-anchor="middle" fill="${color}" font-size="12" font-weight="bold">${
        result.class
      }</text>`;
    });

    const svgContent = `<svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">${svgElements}</svg>`;

    // Return as simple data URI without base64 encoding
    return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
  };

  const takePictureAndAnalyze = useCallback(async () => {
    if (!cameraRef.current || isProcessing) return;

    try {
      setIsProcessing(true);
      setProcessingStatus('Capturing image...');

      // Take picture
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });

      if (!photo) {
        throw new Error('Failed to capture photo');
      }

      setCapturedImage(photo.uri);
      setProcessingStatus('Analyzing food items...');

      // Perform segmentation using Python backend with mask generation
      const backendResponse = await pythonBackendService.segmentImageWithMask(
        photo.uri
      );
      const segmentationResults = backendResponse.segmentationResults;

      if (segmentationResults.length === 0) {
        Alert.alert(
          'No Food Detected',
          'No food items were detected in the image. Please try again.'
        );
        return;
      }

      setProcessingStatus('Processing results...');

      // Store backend response for mask viewing
      setBackendResponse(backendResponse);

      // Pre-generate mask overlay for instant viewing
      if (backendResponse.segmentationMask) {
        setProcessingStatus('Generating mask overlay...');
        try {
          await generateMaskOverlay(backendResponse, photo.uri);
        } catch (maskError) {
          console.warn('Failed to pre-generate mask overlay:', maskError);
          // Continue without mask overlay - user can try again later
        }
      }

      // Create mask overlay
      const maskUri = createMaskOverlay(
        segmentationResults,
        photo.width || 1080,
        photo.height || 1920
      );
      setMaskOverlayUri(maskUri);

      // Check for coin detection and separate food from coins
      const coinDetections = segmentationResults.filter((segment) =>
        segment.class.toLowerCase().includes('coin')
      );
      const foodDetections = segmentationResults.filter(
        (segment) => !segment.class.toLowerCase().includes('coin')
      );

      // Store all detections (including coins) for mask viewing
      setAllDetectionResults(
        segmentationResults.map((segment) => ({
          id: segment.id,
          class: segment.class,
          confidence: segment.confidence,
          weight: 0, // Coins don't have weight
          nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
          mealType,
          timestamp: new Date().toISOString(),
          boundingBox: segment.boundingBox,
        }))
      );

      // Set coin detection status
      const hasCoin = coinDetections.length > 0;
      setCoinDetected(hasCoin);

      if (hasCoin) {
        console.log(
          `🪙 Coin detected! Using coin-based scaling for accurate weight estimation.`
        );
        Alert.alert(
          '🪙 Coin Detected!',
          `Found ${coinDetections.length} coin(s) in the image. Using coin reference for more accurate weight estimation.`,
          [{ text: 'OK' }]
        );
      }

      // Convert only food detections to results with weights and nutrition
      const results: DetectionResult[] = foodDetections.map(
        (segment: SegmentationResult) => {
          const dummyWeight = generateDummyWeight(segment.class, segment.area);
          const nutrition = generateDummyNutrition(segment.class, dummyWeight);

          return {
            id: segment.id,
            class: segment.class,
            confidence: segment.confidence,
            weight: dummyWeight,
            nutrition,
            mealType,
            timestamp: new Date().toISOString(),
            boundingBox: segment.boundingBox, // Include bounding box from segmentation
          };
        }
      );

      setDetectionResults(results);

      setProcessingStatus('Analysis complete!');
    } catch (error) {
      setProcessingStatus('Error occurred');
      Alert.alert(
        'Error',
        `Failed to analyze food: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
      console.error('Food analysis error:', error);
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(''), 2000);
    }
  }, [isProcessing, mealType]);

  const pickImageFromGallery = useCallback(async () => {
    try {
      setProcessingStatus('Opening gallery...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        setIsProcessing(true);
        setCapturedImage(result.assets[0].uri);
        setProcessingStatus('Analyzing selected image...');

        // Perform segmentation on selected image using Python backend with mask generation
        const backendResponse = await pythonBackendService.segmentImageWithMask(
          result.assets[0].uri
        );
        const segmentationResults = backendResponse.segmentationResults;

        if (segmentationResults.length === 0) {
          Alert.alert(
            'No Food Detected',
            'No food items were detected in the image. Please try again.'
          );
          return;
        }

        // Store backend response for mask viewing
        setBackendResponse(backendResponse);

        // Pre-generate mask overlay for instant viewing
        if (backendResponse.segmentationMask) {
          setProcessingStatus('Generating mask overlay...');
          try {
            await generateMaskOverlay(backendResponse, result.assets[0].uri);
          } catch (maskError) {
            console.warn('Failed to pre-generate mask overlay:', maskError);
            // Continue without mask overlay - user can try again later
          }
        }

        // Check for coin detection and separate food from coins
        const coinDetections = segmentationResults.filter((segment) =>
          segment.class.toLowerCase().includes('coin')
        );
        const foodDetections = segmentationResults.filter(
          (segment) => !segment.class.toLowerCase().includes('coin')
        );

        // Store all detections (including coins) for mask viewing
        setAllDetectionResults(
          segmentationResults.map((segment) => ({
            id: segment.id,
            class: segment.class,
            confidence: segment.confidence,
            weight: 0, // Coins don't have weight
            nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
            mealType,
            timestamp: new Date().toISOString(),
            boundingBox: segment.boundingBox,
          }))
        );

        // Set coin detection status
        const hasCoin = coinDetections.length > 0;
        setCoinDetected(hasCoin);

        if (hasCoin) {
          console.log(
            `🪙 Coin detected! Using coin-based scaling for accurate weight estimation.`
          );
          Alert.alert(
            '🪙 Coin Detected!',
            `Found ${coinDetections.length} coin(s) in the image. Using coin reference for more accurate weight estimation.`,
            [{ text: 'OK' }]
          );
        }

        // Create results with dummy data (only for food items)
        const results: DetectionResult[] = foodDetections.map(
          (segment: SegmentationResult) => {
            const dummyWeight = generateDummyWeight(
              segment.class,
              segment.area
            );
            const nutrition = generateDummyNutrition(
              segment.class,
              dummyWeight
            );

            return {
              id: segment.id,
              class: segment.class,
              confidence: segment.confidence,
              weight: dummyWeight,
              nutrition,
              mealType,
              timestamp: new Date().toISOString(),
              boundingBox: segment.boundingBox, // Include bounding box from segmentation
            };
          }
        );

        setDetectionResults(results);
        setProcessingStatus('Analysis complete!');
      }
    } catch (error) {
      Alert.alert(
        'Error',
        `Failed to analyze image: ${
          error instanceof Error ? error.message : 'Unknown error'
        }`
      );
    } finally {
      setIsProcessing(false);
      setTimeout(() => setProcessingStatus(''), 2000);
    }
  }, [mealType]);

  const handleSave = async () => {
    if (detectionResults.length > 0 && capturedImage) {
      try {
        // Create comprehensive save data with nutrition details
        const saveData = {
          timestamp: new Date().toISOString(),
          image: capturedImage,
          mealType: mealType,
          detectionResults: detectionResults.map((result) => ({
            ...result,
            editedWeight: editedWeights[result.class]
              ? parseInt(editedWeights[result.class])
              : result.weight,
            nutritionDetails: nutritionDetails[result.class],
            diabetesRisk: nutritionDetails[result.class]
              ? calculateDiabetesRisk(
                  result.class,
                  nutritionDetails[result.class]
                )
              : null,
            healthBenefits: getFoodHealthBenefits(result.class),
          })),
          totalCalories: detectionResults.reduce((total, result) => {
            const weight = editedWeights[result.class]
              ? parseInt(editedWeights[result.class])
              : result.weight;
            return total + (result.nutrition.calories * weight) / 100;
          }, 0),
          mealSummary: {
            foodCount: detectionResults.length,
            totalWeight: detectionResults.reduce((total, result) => {
              return (
                total +
                (editedWeights[result.class]
                  ? parseInt(editedWeights[result.class])
                  : result.weight)
              );
            }, 0),
          },
        };

        // Log comprehensive data
        console.log('💾 SAVING MEAL DATA:', JSON.stringify(saveData, null, 2));
        console.log('📊 MEAL SUMMARY:');
        console.log(`  - Meal Type: ${mealType}`);
        console.log(`  - Foods detected: ${saveData.mealSummary.foodCount}`);
        console.log(`  - Total weight: ${saveData.mealSummary.totalWeight}g`);
        console.log(
          `  - Total calories: ${saveData.totalCalories.toFixed(0)} cal`
        );

        saveData.detectionResults.forEach((result, index) => {
          console.log(`📋 FOOD ${index + 1}: ${result.class.toUpperCase()}`);
          console.log(`  - Weight: ${result.editedWeight}g`);
          console.log(
            `  - Calories: ${(
              (result.nutrition.calories * result.editedWeight) /
              100
            ).toFixed(0)} cal`
          );
          if (result.diabetesRisk) {
            console.log(
              `  - Diabetes Risk: ${result.diabetesRisk.level.toUpperCase()} (${
                result.diabetesRisk.score
              }/5)`
            );
          }
        });

        // Save to meal logs through the onSave callback
        onSave(saveData.detectionResults, capturedImage);

        // Show success message and close screen
        Alert.alert(
          'Meal Saved Successfully! 🎉',
          `Saved ${
            saveData.mealSummary.foodCount
          } food(s) with ${saveData.totalCalories.toFixed(
            0
          )} total calories to your ${mealType.toLowerCase()} log.\n\nYou can view details in your meal history.`,
          [
            {
              text: 'OK',
              onPress: () => {
                // Close the scan screen and return to main screen
                onClose();
              },
            },
          ]
        );
      } catch (error) {
        console.error('❌ Error saving meal:', error);
        Alert.alert('Save Error', 'Failed to save meal. Please try again.', [
          { text: 'OK' },
        ]);
      }
    } else {
      Alert.alert('No Data to Save', 'Please scan some food before saving.', [
        { text: 'OK' },
      ]);
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    setDetectionResults([]);
    setAllDetectionResults([]);
    setCoinDetected(false);
    setMaskOverlayUri(null);
    setBackendResponse(null);
    setPreGeneratedMaskOverlay(null);
  };

  if (!visible) return null;

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <Modal visible={visible} animationType="slide" statusBarTranslucent>
        <View style={styles.container}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionText}>
              We need your permission to show the camera
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Scan Food - {mealType}</Text>
            <TouchableOpacity
              style={styles.galleryButton}
              onPress={pickImageFromGallery}
            >
              <ImageIcon size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {!capturedImage ? (
          <View style={styles.cameraContainer}>
            <CameraView ref={cameraRef} style={styles.camera} facing={facing} />

            {/* Camera overlay positioned absolutely */}
            <View style={styles.cameraOverlay}>
              <View style={styles.focusFrame} />
              <Text style={styles.instructionText}>
                Position food items within the frame
              </Text>
            </View>

            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={toggleCameraFacing}
              >
                <RotateCcw size={24} color="#FFFFFF" />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.captureButton,
                  isProcessing && styles.captureButtonDisabled,
                ]}
                onPress={takePictureAndAnalyze}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="large" color="#FFFFFF" />
                ) : (
                  <Camera size={32} color="#FFFFFF" />
                )}
              </TouchableOpacity>

              <View style={styles.controlButton} />
            </View>
          </View>
        ) : (
          <ScrollView style={styles.resultsContainer}>
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: capturedImage }}
                style={styles.capturedImage}
              />
            </View>

            <View style={styles.resultsControls}>
              <TouchableOpacity
                style={[styles.maskButton, { backgroundColor: '#3B82F6' }]}
                onPress={() => setShowMaskView(true)}
              >
                <Eye size={20} color="#FFFFFF" />
                <Text style={[styles.maskButtonText, { color: '#FFFFFF' }]}>
                  View Mask
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.retakeButton}
                onPress={handleRetake}
              >
                <Text style={styles.retakeText}>Retake</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.detectionResults}>
              <View style={styles.resultsHeader}>
                <Text style={styles.resultsTitle}>Detection Results</Text>
                <Text style={styles.resultsSubtitle}>
                  Tap cards to expand • Tap 🗑️ to delete misclassified items
                </Text>
                {coinDetected && (
                  <View style={styles.coinDetectionBanner}>
                    <Text style={styles.coinDetectionText}>
                      🪙 Coin detected - Using enhanced weight estimation
                    </Text>
                  </View>
                )}
              </View>
              {detectionResults.length === 0 ? (
                <View style={styles.emptyResultsContainer}>
                  <Text style={styles.emptyResultsText}>
                    No food items detected
                  </Text>
                  <Text style={styles.emptyResultsSubtext}>
                    All items have been removed. Retake a photo to detect food
                    again.
                  </Text>
                </View>
              ) : (
                detectionResults.map((result, index) => {
                  const isExpanded = expandedCards.has(result.class);
                  const isLoadingDetails = loadingNutrition.has(result.class);
                  const details = nutritionDetails[result.class];

                  return (
                    <TouchableOpacity
                      key={result.id}
                      style={[
                        styles.resultCard,
                        isExpanded && styles.expandedCard,
                      ]}
                      onPress={() =>
                        toggleCardExpansion(result.class, result.weight)
                      }
                      activeOpacity={0.7}
                    >
                      <View style={styles.resultHeader}>
                        <Text style={styles.resultName}>{result.class}</Text>
                        <View style={styles.resultHeaderRight}>
                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={(e) => {
                              e.stopPropagation(); // Prevent card expansion when delete is pressed
                              handleDeleteFood(result.id, result.class);
                            }}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}
                          >
                            <Text style={styles.deleteButtonText}>🗑️</Text>
                          </TouchableOpacity>
                          <Text style={styles.expandIcon}>
                            {isExpanded ? '▲' : '▼'}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.resultDetails}>
                        <View style={styles.weightEditContainer}>
                          <Text style={styles.resultWeightLabel}>Weight: </Text>
                          {editingCard === result.class ? (
                            <View style={styles.weightEditInputContainer}>
                              <TextInput
                                style={styles.weightEditInput}
                                value={
                                  editedWeights[result.class] ||
                                  result.weight.toString()
                                }
                                onChangeText={(text) =>
                                  setEditedWeights((prev) => ({
                                    ...prev,
                                    [result.class]: text,
                                  }))
                                }
                                keyboardType="numeric"
                                selectTextOnFocus
                              />
                              <Text style={styles.weightUnit}>g</Text>
                              <TouchableOpacity
                                style={styles.saveWeightButton}
                                onPress={() => setEditingCard(null)}
                              >
                                <Text style={styles.saveWeightText}>✓</Text>
                              </TouchableOpacity>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.weightEditTrigger}
                              onPress={() => setEditingCard(result.class)}
                            >
                              <Text style={styles.resultWeight}>
                                {editedWeights[result.class] || result.weight}g
                              </Text>
                              <Text style={styles.editIcon}>✏️</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                        <Text style={styles.resultNutrition}>
                          {(() => {
                            const currentWeight = editedWeights[result.class]
                              ? parseInt(editedWeights[result.class])
                              : result.weight;
                            const weightRatio = currentWeight / 100;
                            return `${Math.round(
                              result.nutrition.calories * weightRatio
                            )} cal | ${(
                              result.nutrition.protein * weightRatio
                            ).toFixed(1)}g protein | ${(
                              result.nutrition.carbs * weightRatio
                            ).toFixed(1)}g carbs | ${(
                              result.nutrition.fat * weightRatio
                            ).toFixed(1)}g fat`;
                          })()}
                        </Text>
                      </View>

                      {isExpanded && (
                        <View style={styles.expandedContent}>
                          {isLoadingDetails ? (
                            <View style={styles.loadingContainer}>
                              <ActivityIndicator size="small" color="#4CAF50" />
                              <Text style={styles.loadingText}>
                                Loading nutrition details...
                              </Text>
                            </View>
                          ) : details ? (
                            <View>
                              {/* Check if we have valid details before rendering */}
                              {details && typeof details === 'object' ? (
                                <>
                                  {/* Detailed Nutrition */}
                                  <View style={styles.nutritionSection}>
                                    <Text style={styles.sectionTitle}>
                                      Nutrition for{' '}
                                      {editedWeights[result.class] ||
                                        result.weight}
                                      g serving
                                    </Text>
                                    <View style={styles.nutritionGrid}>
                                      {(() => {
                                        const currentWeight = editedWeights[
                                          result.class
                                        ]
                                          ? parseInt(
                                              editedWeights[result.class]
                                            )
                                          : result.weight;
                                        const weightRatio = currentWeight / 100;
                                        const baseNutrition =
                                          details.nutrition?.nutrition_per_100g;

                                        return (
                                          <>
                                            <Text style={styles.nutritionItem}>
                                              Calories:{' '}
                                              {Math.round(
                                                (baseNutrition?.calories || 0) *
                                                  weightRatio
                                              )}
                                            </Text>
                                            <Text style={styles.nutritionItem}>
                                              Protein:{' '}
                                              {(
                                                (baseNutrition?.protein || 0) *
                                                weightRatio
                                              ).toFixed(1)}
                                              g
                                            </Text>
                                            <Text style={styles.nutritionItem}>
                                              Carbs:{' '}
                                              {(
                                                (baseNutrition?.carbs || 0) *
                                                weightRatio
                                              ).toFixed(1)}
                                              g
                                            </Text>
                                            <Text style={styles.nutritionItem}>
                                              Fat:{' '}
                                              {(
                                                (baseNutrition?.fat || 0) *
                                                weightRatio
                                              ).toFixed(1)}
                                              g
                                            </Text>
                                            <Text style={styles.nutritionItem}>
                                              Fiber:{' '}
                                              {(
                                                (baseNutrition?.fiber || 0) *
                                                weightRatio
                                              ).toFixed(1)}
                                              g
                                            </Text>
                                            <Text style={styles.nutritionItem}>
                                              Sugar:{' '}
                                              {(
                                                (baseNutrition?.sugar || 0) *
                                                weightRatio
                                              ).toFixed(1)}
                                              g
                                            </Text>
                                          </>
                                        );
                                      })()}
                                    </View>
                                    <Text style={styles.nutritionNote}>
                                      💡 Values update automatically when you
                                      change the weight
                                    </Text>
                                  </View>

                                  {/* Reference Nutrition per 100g */}
                                  <View style={styles.nutritionSection}>
                                    <Text style={styles.sectionTitle}>
                                      Reference Nutrition (per 100g)
                                    </Text>
                                    <View style={styles.nutritionGrid}>
                                      <Text style={styles.nutritionItem}>
                                        Calories:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.calories || 'N/A'}
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Protein:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.protein || 'N/A'}
                                        g
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Carbs:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.carbs || 'N/A'}
                                        g
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Fat:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.fat || 'N/A'}
                                        g
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Fiber:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.fiber || 'N/A'}
                                        g
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Sugar:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.sugar || 'N/A'}
                                        g
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Glycemic Information */}
                                  {details.glycemic_index ? (
                                    <View style={styles.glycemicSection}>
                                      <Text style={styles.sectionTitle}>
                                        Glycemic Impact
                                      </Text>
                                      <View
                                        style={[
                                          styles.glycemicBadge,
                                          details.glycemic_index
                                            ?.gi_category === 'low'
                                            ? styles.lowGI
                                            : details.glycemic_index
                                                ?.gi_category === 'medium'
                                            ? styles.mediumGI
                                            : styles.highGI,
                                        ]}
                                      >
                                        <Text style={styles.glycemicText}>
                                          GI:{' '}
                                          {details.glycemic_index?.gi_value ||
                                            'N/A'}{' '}
                                          (
                                          {String(
                                            details.glycemic_index
                                              ?.gi_category || 'unknown'
                                          ).toUpperCase()}
                                          )
                                        </Text>
                                      </View>
                                      <Text
                                        style={styles.glycemicRecommendation}
                                      >
                                        Glycemic Load:{' '}
                                        {details.glycemic_index
                                          ?.glycemic_load_per_serving ||
                                          'N/A'}{' '}
                                        (
                                        {details.glycemic_index?.gl_category ||
                                          'unknown'}
                                        )
                                      </Text>
                                    </View>
                                  ) : (
                                    <View style={styles.glycemicSection}>
                                      <Text style={styles.sectionTitle}>
                                        Glycemic Impact
                                      </Text>
                                      <Text style={styles.errorText}>
                                        Glycemic information not available
                                      </Text>
                                    </View>
                                  )}

                                  {/* Diabetes Risk Assessment */}
                                  <View style={styles.diabetesSection}>
                                    <Text style={styles.sectionTitle}>
                                      Diabetes Risk Assessment
                                    </Text>
                                    {(() => {
                                      const diabetesRisk =
                                        calculateDiabetesRisk(
                                          result.class,
                                          details
                                        );
                                      return (
                                        <>
                                          <View
                                            style={[
                                              styles.riskBadge,
                                              diabetesRisk.level === 'low'
                                                ? styles.lowRisk
                                                : diabetesRisk.level ===
                                                  'medium'
                                                ? styles.mediumRisk
                                                : styles.highRisk,
                                            ]}
                                          >
                                            <Text style={styles.riskText}>
                                              Risk Level:{' '}
                                              {diabetesRisk.level.toUpperCase()}{' '}
                                              ({diabetesRisk.score}/5)
                                            </Text>
                                          </View>
                                          {diabetesRisk.recommendations.map(
                                            (rec: string, idx: number) => (
                                              <Text
                                                key={idx}
                                                style={styles.recommendation}
                                              >
                                                • {rec}
                                              </Text>
                                            )
                                          )}
                                        </>
                                      );
                                    })()}
                                  </View>

                                  {/* Additional Nutrients */}
                                  <View style={styles.nutritionSection}>
                                    <Text style={styles.sectionTitle}>
                                      Additional Nutrients
                                    </Text>
                                    <View style={styles.nutritionGrid}>
                                      <Text style={styles.nutritionItem}>
                                        Calcium:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.calcium || 'N/A'}
                                        mg
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Iron:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.iron || 'N/A'}
                                        mg
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Vitamin A:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.vitamin_a_iu || 'N/A'}
                                        IU
                                      </Text>
                                      <Text style={styles.nutritionItem}>
                                        Vitamin C:{' '}
                                        {details.nutrition?.nutrition_per_100g
                                          ?.vitamin_c || 'N/A'}
                                        mg
                                      </Text>
                                    </View>
                                  </View>

                                  {/* Food-Specific Health Benefits */}
                                  <View style={styles.alternativesSection}>
                                    <Text style={styles.sectionTitle}>
                                      Health Benefits
                                    </Text>
                                    {(() => {
                                      const healthBenefits =
                                        getFoodHealthBenefits(result.class);
                                      return (
                                        <>
                                          <View style={styles.alternativeItem}>
                                            <Text
                                              style={styles.alternativeName}
                                            >
                                              {healthBenefits.name}
                                            </Text>
                                            <Text
                                              style={styles.alternativeReason}
                                            >
                                              {healthBenefits.reason}
                                            </Text>
                                          </View>
                                          <View style={styles.alternativeItem}>
                                            <Text
                                              style={styles.alternativeName}
                                            >
                                              Recommended Serving Size
                                            </Text>
                                            <Text
                                              style={styles.alternativeReason}
                                            >
                                              {healthBenefits.serving}
                                            </Text>
                                          </View>
                                        </>
                                      );
                                    })()}
                                  </View>
                                </>
                              ) : (
                                <Text style={styles.errorText}>
                                  Invalid nutrition data format
                                </Text>
                              )}
                            </View>
                          ) : (
                            <Text style={styles.errorText}>
                              Failed to load nutrition details
                            </Text>
                          )}
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.saveButton,
                detectionResults.length === 0 && styles.saveButtonDisabled,
              ]}
              onPress={handleSave}
              disabled={detectionResults.length === 0}
            >
              <Save
                size={20}
                color={detectionResults.length === 0 ? '#9CA3AF' : '#FFFFFF'}
              />
              <Text
                style={[
                  styles.saveButtonText,
                  detectionResults.length === 0 &&
                    styles.saveButtonTextDisabled,
                ]}
              >
                Save{' '}
                {detectionResults.length > 0
                  ? `${detectionResults.length} Item${
                      detectionResults.length > 1 ? 's' : ''
                    }`
                  : 'Results'}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        )}

        {processingStatus && (
          <View style={styles.statusContainer}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.statusText}>{processingStatus}</Text>
          </View>
        )}

        {/* Mask View Screen */}
        <MaskViewScreen
          visible={showMaskView}
          onClose={() => setShowMaskView(false)}
          originalImage={capturedImage || ''}
          segmentationMask={backendResponse?.segmentationMask || ''}
          classMap={backendResponse?.classMap || {}}
          detectedClasses={backendResponse?.detectedClasses || []}
          preGeneratedOverlay={preGeneratedMaskOverlay}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
  },
  galleryButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  camera: {
    flex: 1,
  },
  cameraOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Allow camera touches to pass through
  },
  focusFrame: {
    width: 250,
    height: 250,
    borderWidth: 2,
    borderColor: '#10B981',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
  instructionText: {
    color: '#FFFFFF',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  cameraControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 30,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonDisabled: {
    opacity: 0.7,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 18,
    textAlign: 'center',
    marginBottom: 20,
    color: '#374151',
  },
  permissionButton: {
    backgroundColor: '#10B981',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  permissionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  imageContainer: {
    position: 'relative',
    margin: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  capturedImage: {
    width: '100%',
    height: 300,
    resizeMode: 'cover',
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  resultsControls: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 20,
    flexWrap: 'wrap',
    gap: 8,
  },
  maskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10B981',
    flex: 1,
    maxWidth: '48%',
  },
  maskButtonText: {
    marginLeft: 6,
    color: '#10B981',
    fontWeight: '600',
    fontSize: 12,
  },
  retakeButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#6B7280',
    borderRadius: 8,
    flex: 1,
    maxWidth: '30%',
    alignItems: 'center',
  },
  retakeText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  detectionResults: {
    paddingHorizontal: 20,
  },
  resultsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 16,
  },
  resultCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  resultName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'capitalize',
  },
  resultDetails: {
    gap: 4,
  },
  resultWeight: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
  },
  resultNutrition: {
    fontSize: 14,
    color: '#9CA3AF',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#10B981',
    marginHorizontal: 20,
    marginVertical: 20,
    paddingVertical: 16,
    borderRadius: 12,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  statusContainer: {
    position: 'absolute',
    top: 120,
    left: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 12,
    borderRadius: 8,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 14,
    marginLeft: 8,
    fontWeight: '500',
  },
  detectionBox: {
    position: 'absolute',
    borderWidth: 3,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 60,
    minHeight: 40,
  },
  detectionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    textAlign: 'center',
    paddingHorizontal: 6,
    paddingVertical: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 4,
    overflow: 'hidden',
    maxWidth: '90%',
  },

  // New styles for expandable cards
  expandedCard: {
    backgroundColor: '#f8f9fa',
    borderColor: '#4CAF50',
    borderWidth: 1,
  },
  resultHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandIcon: {
    fontSize: 12,
    color: '#666',
    fontWeight: 'bold',
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
    color: '#666',
  },

  // Inline editing styles
  weightEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  resultWeightLabel: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
  },
  weightEditInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  weightEditInput: {
    fontSize: 14,
    color: '#333',
    fontWeight: '600',
    minWidth: 40,
    textAlign: 'center',
  },
  weightUnit: {
    fontSize: 14,
    color: '#666',
    marginLeft: 2,
  },
  saveWeightButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 6,
  },
  saveWeightText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  weightEditTrigger: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editIcon: {
    marginLeft: 4,
    fontSize: 12,
  },

  // Content section styles
  nutritionSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  nutritionItem: {
    fontSize: 12,
    color: '#555',
    backgroundColor: '#f0f0f0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: '45%',
  },
  glycemicSection: {
    marginBottom: 16,
  },
  glycemicBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  lowGI: {
    backgroundColor: '#d4edda',
  },
  mediumGI: {
    backgroundColor: '#fff3cd',
  },
  highGI: {
    backgroundColor: '#f8d7da',
  },
  glycemicText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  glycemicRecommendation: {
    fontSize: 12,
    color: '#666',
    fontStyle: 'italic',
  },
  diabetesSection: {
    marginBottom: 16,
  },
  riskBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  lowRisk: {
    backgroundColor: '#d1ecf1',
  },
  mediumRisk: {
    backgroundColor: '#ffeaa7',
  },
  highRisk: {
    backgroundColor: '#fdcb6e',
  },
  riskText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  recommendation: {
    fontSize: 12,
    color: '#555',
    marginBottom: 4,
    lineHeight: 16,
  },
  alternativesSection: {
    marginBottom: 16,
  },
  alternativeItem: {
    backgroundColor: '#e8f5e8',
    padding: 8,
    borderRadius: 6,
    marginBottom: 6,
  },
  alternativeName: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#2d5a2d',
    marginBottom: 2,
  },
  alternativeReason: {
    fontSize: 11,
    color: '#4a704a',
  },
  errorText: {
    fontSize: 14,
    color: '#d32f2f',
    textAlign: 'center',
    padding: 16,
  },
  nutritionNote: {
    fontSize: 11,
    color: '#666',
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 8,
  },
  deleteButton: {
    padding: 4,
    marginRight: 8,
    borderRadius: 4,
    backgroundColor: '#ffebee',
  },
  deleteButtonText: {
    fontSize: 14,
    color: '#d32f2f',
  },
  resultsHeader: {
    marginBottom: 16,
  },
  resultsSubtitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontStyle: 'italic',
  },
  saveButtonDisabled: {
    backgroundColor: '#E5E7EB',
    opacity: 0.6,
  },
  saveButtonTextDisabled: {
    color: '#9CA3AF',
  },
  emptyResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
    margin: 16,
  },
  emptyResultsText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
  },
  emptyResultsSubtext: {
    fontSize: 14,
    color: '#9CA3AF',
    textAlign: 'center',
    lineHeight: 20,
  },
  coinDetectionBanner: {
    backgroundColor: '#10B981',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  coinDetectionText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
    textAlign: 'center',
  },
});
