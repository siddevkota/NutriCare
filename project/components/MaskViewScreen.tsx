import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as FileSystem from 'expo-file-system';
import { ArrowLeft, Eye, EyeOff, Download, Share2 } from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

interface MaskViewScreenProps {
  visible: boolean;
  onClose: () => void;
  originalImage: string;
  segmentationMask: string;
  classMap: { [key: string]: string };
  detectedClasses: string[];
  preGeneratedOverlay?: string | null;
}

export const MaskViewScreen: React.FC<MaskViewScreenProps> = ({
  visible,
  onClose,
  originalImage,
  segmentationMask,
  classMap,
  detectedClasses,
  preGeneratedOverlay,
}) => {
  const [maskOverlayImage, setMaskOverlayImage] = useState<string | null>(
    preGeneratedOverlay || null
  );
  const [isLoading, setIsLoading] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (preGeneratedOverlay) {
      setMaskOverlayImage(preGeneratedOverlay);
      setIsLoading(false);
      setError(null);
    } else if (visible && segmentationMask && originalImage) {
      generateMaskOverlay();
    }
  }, [visible, segmentationMask, originalImage, preGeneratedOverlay]);

  const generateMaskOverlay = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Convert image URI to base64
      let originalImageBase64: string;
      try {
        originalImageBase64 = await FileSystem.readAsStringAsync(
          originalImage,
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        );
      } catch (fileError) {
        throw new Error(`Failed to read image file: ${fileError}`);
      }

      const response = await fetch('http://192.168.0.107:5000/generate-mask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          segmentation_mask: segmentationMask,
          class_map: classMap,
          original_image: originalImageBase64,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `HTTP ${response.status}: ${errorText || response.statusText}`
        );
      }

      const data = await response.json();

      if (data.status === 'success') {
        setMaskOverlayImage(data.mask_overlay);
      } else {
        throw new Error(data.message || 'Failed to generate mask overlay');
      }
    } catch (error) {
      console.error('Error generating mask overlay:', error);
      setError(error instanceof Error ? error.message : 'Unknown error');
      Alert.alert(
        'Mask Generation Failed',
        'Could not generate the segmentation mask overlay. Using original image instead.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = () => {
    // TODO: Implement download functionality
    Alert.alert(
      'Download Feature',
      'Download functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    Alert.alert(
      'Share Feature',
      'Share functionality will be implemented in a future update.',
      [{ text: 'OK' }]
    );
  };

  if (!visible) return null;

  return (
    <Modal visible={visible} animationType="slide" statusBarTranslucent>
      <View style={styles.container}>
        <LinearGradient colors={['#10B981', '#059669']} style={styles.header}>
          <View style={styles.headerContent}>
            <TouchableOpacity style={styles.backButton} onPress={onClose}>
              <ArrowLeft size={24} color="#FFFFFF" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Segmentation View</Text>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={styles.headerButton}
                onPress={() => setShowOverlay(!showOverlay)}
              >
                {showOverlay ? (
                  <EyeOff size={20} color="#FFFFFF" />
                ) : (
                  <Eye size={20} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </LinearGradient>

        <View style={styles.content}>
          {isLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#10B981" />
              <Text style={styles.loadingText}>Generating mask overlay...</Text>
            </View>
          ) : (
            <View style={styles.imageContainer}>
              {showOverlay && maskOverlayImage && !error ? (
                // Show only the overlayed mask image (rotated -270 degrees, larger size)
                <Image
                  source={{ uri: maskOverlayImage }}
                  style={[
                    styles.maskImageLarge,
                    { transform: [{ rotate: '-270deg' }] },
                  ]}
                  resizeMode="contain"
                />
              ) : (
                // Show original image as fallback (no rotation, original orientation)
                <Image
                  source={{ uri: originalImage }}
                  style={styles.backgroundImage}
                  resizeMode="contain"
                />
              )}
            </View>
          )}

          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>⚠️ {error}</Text>
              <TouchableOpacity
                style={styles.retryButton}
                onPress={generateMaskOverlay}
              >
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.controls}>
            <TouchableOpacity
              style={[
                styles.controlButton,
                !showOverlay && styles.controlButtonActive,
              ]}
              onPress={() => setShowOverlay(!showOverlay)}
            >
              {showOverlay ? (
                <>
                  <EyeOff size={20} color="#10B981" />
                  <Text style={styles.controlButtonText}>Show Original</Text>
                </>
              ) : (
                <>
                  <Eye size={20} color="#10B981" />
                  <Text style={styles.controlButtonText}>Show Mask</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownload}
            >
              <Download size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
              <Share2 size={20} color="#6B7280" />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.legendContainer}>
            <Text style={styles.legendTitle}>Detected Items</Text>
            <View style={styles.legendGrid}>
              {detectedClasses.map((foodClass, index) => {
                const colors = [
                  '#34C759',
                  '#FF9500',
                  '#FF3B30',
                  '#8E2DE2',
                  '#06D6A0',
                  '#F72585',
                  '#4CC9F0',
                  '#7209B7',
                ];
                const color = colors[index % colors.length];
                const isCoin = foodClass.toLowerCase().includes('coin');

                return (
                  <View key={foodClass} style={styles.legendItem}>
                    <View
                      style={[styles.legendColor, { backgroundColor: color }]}
                    />
                    <Text style={styles.legendText}>
                      {isCoin ? '🪙 ' : ''}
                      {foodClass}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
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
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  imageContainer: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#000000',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundImage: {
    width: '100%',
    height: '100%',
  },
  maskImageLarge: {
    width: '120%',
    height: '120%',
    alignSelf: 'center',
  },
  overlayImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  overlayImageFullSize: {
    width: '100%',
    height: '100%',
    flex: 1,
  },
  errorContainer: {
    padding: 20,
    backgroundColor: '#FEF2F2',
    borderRadius: 8,
    marginVertical: 16,
    alignItems: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#DC2626',
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  controls: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
    marginBottom: 20,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#10B981',
  },
  controlButtonActive: {
    backgroundColor: '#F0FDF4',
  },
  controlButtonText: {
    color: '#10B981',
    fontSize: 14,
    fontWeight: '600',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  actionButtonText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '500',
  },
  legendContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  legendTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 12,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
    minWidth: '45%',
  },
  legendColor: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  legendText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
    textTransform: 'capitalize',
  },
});
