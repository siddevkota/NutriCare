import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { pythonBackendService } from '../services/pythonBackendService';

export const BackendTestScreen: React.FC = () => {
  const [testResults, setTestResults] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  const testHealthCheck = async () => {
    setIsLoading(true);
    try {
      const isHealthy = await pythonBackendService.healthCheck();
      const result = `Health Check: ${
        isHealthy ? '✅ Healthy' : '❌ Unhealthy'
      }\n\n`;
      setTestResults((prev) => prev + result);
    } catch (error) {
      const result = `Health Check Error: ${error}\n\n`;
      setTestResults((prev) => prev + result);
    }
    setIsLoading(false);
  };

  const testBackendAPI = async () => {
    setIsLoading(true);
    try {
      const response = await pythonBackendService.testBackend();
      const result = `Backend Test: ✅ Success\nResponse: ${JSON.stringify(
        response,
        null,
        2
      )}\n\n`;
      setTestResults((prev) => prev + result);
    } catch (error) {
      const result = `Backend Test Error: ${error}\n\n`;
      setTestResults((prev) => prev + result);
    }
    setIsLoading(false);
  };

  const clearResults = () => {
    setTestResults('');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Python Backend Test</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.button}
          onPress={testHealthCheck}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Health Check</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.button}
          onPress={testBackendAPI}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Backend API</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.clearButton]}
          onPress={clearResults}
        >
          <Text style={styles.buttonText}>Clear Results</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        <Text style={styles.resultsTitle}>Test Results:</Text>
        <Text style={styles.resultsText}>
          {testResults || 'No tests run yet...'}
        </Text>
      </ScrollView>

      {isLoading && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Testing...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#F9FAFB',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 30,
    color: '#374151',
  },
  buttonContainer: {
    gap: 16,
    marginBottom: 30,
  },
  button: {
    backgroundColor: '#10B981',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  clearButton: {
    backgroundColor: '#6B7280',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#374151',
  },
  resultsText: {
    fontSize: 14,
    color: '#6B7280',
    fontFamily: 'monospace',
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
