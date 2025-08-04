import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import {
  ScanFoodScreen,
  DetectionResult,
} from '../../components/ScanFoodScreen';
import { Camera } from 'lucide-react-native';

export default function CameraTab() {
  const [scanVisible, setScanVisible] = useState(false);
  const [mealType, setMealType] = useState('lunch');

  const handleSave = (results: DetectionResult[], imageUri: string) => {
    console.log('Food detection results:', results);
    console.log('Image URI:', imageUri);
    setScanVisible(false);
    // Here you could navigate to results screen or save to storage
  };

  const handleClose = () => {
    setScanVisible(false);
  };

  const openCamera = () => {
    setScanVisible(true);
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Camera size={100} color="#007AFF" style={styles.icon} />
        <Text style={styles.title}>Food Scanner</Text>
        <Text style={styles.subtitle}>
          Scan your food to get nutritional information and weight estimates
        </Text>

        <TouchableOpacity style={styles.scanButton} onPress={openCamera}>
          <Text style={styles.scanButtonText}>Start Food Scan</Text>
        </TouchableOpacity>
      </View>

      <ScanFoodScreen
        visible={scanVisible}
        onClose={handleClose}
        onSave={handleSave}
        mealType={mealType}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  icon: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  scanButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  scanButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: '600',
  },
});
