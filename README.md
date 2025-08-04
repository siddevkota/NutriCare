# NutriCare - Smart Food Weight Estimation App

A React Native/Expo app that uses AI image segmentation and device motion tracking to estimate food weights from photos.

## Features

- 🤖 **Real Roboflow API Integration**: Uses actual computer vision models for food detection and segmentation
- 📏 **Enhanced Motion Tracking**: Advanced elevation tracking with accelerometer and gyroscope data
- 📱 **Dual Image Sources**: Take photos with camera or select from gallery
- ⚖️ **Intelligent Weight Estimation**: Physics-based calculations using volume, density, and elevation data
- 🎯 **Real-time Calibration**: Device calibration for improved accuracy
- 📊 **Comprehensive Results**: Detailed analysis with confidence scores and nutritional information
- 🎨 **Enhanced UI**: Status indicators, motion displays, and processing feedback

## Setup Instructions

### 1. Install Dependencies

```bash
cd project
npm install
npx expo install expo-camera expo-sensors expo-image-picker expo-file-system
```

### 2. Configure Roboflow API

1. Sign up at [Roboflow](https://roboflow.com)
2. Create a food segmentation project
3. Train a model or use a pre-trained one
4. Get your API credentials from the project's API tab
5. Update `config/roboflow.ts` with your credentials:

```typescript
export const ROBOFLOW_CONFIG = {
  apiKey: 'your_actual_api_key',
  modelId: 'your_model_id',
  version: 1,
  // ... other settings
};
```

### 3. Run the App

```bash
npx expo start
```

## Usage

### Camera Mode

1. Open the app and grant camera permissions
2. **Calibrate** the device using the settings button (⚙️)
3. **Position food** at table level in good lighting
4. **Take photo** using the analyze button
5. View detailed weight estimates and nutritional information

### Gallery Mode

1. Tap the gallery button (🖼️) in the camera controls
2. Select a food image from your photo library
3. Get instant analysis results

### Elevation Tracking

- Toggle elevation tracker to see real-time height measurements
- Calibrate for best accuracy before first use
- Monitor device stability through motion indicators

## Technical Details

### Architecture

- **Frontend**: React Native with Expo
- **Computer Vision**: Roboflow API for food segmentation
- **Motion Tracking**: Expo Sensors (DeviceMotion)
- **Weight Calculation**: Physics-based volume estimation
- **Data Flow**: Image → Segmentation → Volume → Weight

### Key Components

- `app/(tabs)/camera.tsx` - Main camera interface with enhanced motion tracking
- `services/segmentationService.ts` - Real Roboflow API integration
- `hooks/useElevationTracking.ts` - Device motion and calibration
- `services/weightEstimationService.ts` - Weight calculation algorithms
- `types/segmentation.ts` - TypeScript interfaces

### Enhanced Features

- **Real-time Status Updates**: Processing status display during analysis
- **Motion Visualization**: Live accelerometer and gyroscope data
- **Calibration System**: Device orientation and height calibration
- **Dual Input Sources**: Camera capture and gallery selection
- **Error Handling**: Comprehensive error messages and fallbacks

## API Configuration

The app uses the Roboflow computer vision API. Key configuration options:

- `confidenceThreshold`: Minimum confidence for detections (default: 0.5)
- `maxDetections`: Maximum objects per image (default: 10)
- `baseUrl`: API endpoint (default: Roboflow's hosted service)

## Weight Estimation Algorithm

1. **Image Segmentation**: AI identifies food objects and creates pixel masks
2. **Volume Calculation**: Uses camera elevation and food dimensions
3. **Density Lookup**: Applies food-specific density values
4. **Weight Computation**: Volume × Density = Estimated Weight
5. **Validation**: Confidence scoring and error bounds

## Troubleshooting

### Camera Issues

- Ensure camera permissions are granted
- Check device camera functionality
- Restart app if camera view is black

### API Issues

- Verify Roboflow API key and model ID
- Check network connectivity
- Monitor API usage limits

### Motion Tracking

- Calibrate device before first use
- Hold device steady during calibration
- Avoid using on moving surfaces

## Future Enhancements

- 🧠 **Custom ML Models**: Train specialized food detection models
- 🍎 **Food Database**: Expanded nutritional information
- 📈 **Usage Analytics**: Track estimation accuracy over time
- 🔄 **Batch Processing**: Analyze multiple images at once
- 🌐 **Cloud Sync**: Save results across devices

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details
