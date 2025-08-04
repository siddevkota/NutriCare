import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
} from 'react-native';
import { nutritionAnalysisService } from '../services/nutritionAnalysisService';

export default function NetworkTestScreen() {
  const [testResults, setTestResults] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addResult = (message: string) => {
    setTestResults((prev) => [
      ...prev,
      `${new Date().toLocaleTimeString()}: ${message}`,
    ]);
  };

  const testBackendConnection = async () => {
    setIsLoading(true);
    setTestResults([]);

    try {
      addResult('🔍 Starting backend connection test...');

      // Test 1: Simple food details request
      addResult('📡 Testing food details endpoint...');
      const foodDetails = await nutritionAnalysisService.getFoodDetails('bhat');
      addResult(`✅ Food details successful: ${foodDetails.food_name}`);

      // Test 2: Diabetes analysis
      addResult('📡 Testing diabetes analysis endpoint...');
      const testFoods = [
        { name: 'bhat', weight: 100 },
        { name: 'daal', weight: 50 },
      ];
      const analysis = await nutritionAnalysisService.analyzeDiabetesRisk(
        testFoods
      );
      addResult(
        `✅ Diabetes analysis successful: Risk level ${analysis.risk_level}`
      );

      addResult('🎉 All tests passed! Backend connection is working.');
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      addResult(`❌ Test failed: ${errorMessage}`);

      if (errorMessage.includes('Network request failed')) {
        addResult('🔧 Network issue detected. Possible causes:');
        addResult('   • Backend server not running');
        addResult('   • Firewall blocking connection');
        addResult('   • Wrong IP address');
        addResult('   • Android network security settings');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const testDirectFetch = async () => {
    setIsLoading(true);
    setTestResults([]);

    const testUrls = [
      'http://192.168.0.107:5000/food-details/bhat',
      'http://localhost:5000/food-details/bhat',
      'http://127.0.0.1:5000/food-details/bhat',
    ];

    for (const url of testUrls) {
      try {
        addResult(`📡 Testing direct fetch to: ${url}`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url, {
          method: 'GET',
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          addResult(`✅ Success: ${url}`);
          addResult(`   Status: ${response.status}`);
          addResult(`   Food: ${data.food_name || 'Unknown'}`);
          break;
        } else {
          addResult(`❌ HTTP Error: ${response.status} for ${url}`);
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        addResult(`❌ Failed: ${url} - ${errorMessage}`);
      }
    }

    setIsLoading(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Network Connection Test</Text>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={testBackendConnection}
          disabled={isLoading}
        >
          <Text style={styles.buttonText}>Test Nutrition Service</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.button,
            styles.secondaryButton,
            isLoading && styles.buttonDisabled,
          ]}
          onPress={testDirectFetch}
          disabled={isLoading}
        >
          <Text style={[styles.buttonText, styles.secondaryButtonText]}>
            Test Direct Fetch
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.resultsContainer}>
        {testResults.map((result, index) => (
          <Text key={index} style={styles.resultText}>
            {result}
          </Text>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 10,
  },
  button: {
    flex: 1,
    backgroundColor: '#007AFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButton: {
    backgroundColor: '#6B7280',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: '#FFFFFF',
  },
  resultsContainer: {
    flex: 1,
    backgroundColor: '#000',
    borderRadius: 8,
    padding: 12,
  },
  resultText: {
    color: '#00FF00',
    fontSize: 12,
    fontFamily: 'monospace',
    marginBottom: 4,
  },
});
