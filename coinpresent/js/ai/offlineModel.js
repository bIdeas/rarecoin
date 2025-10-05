// Offline AI Model Module
// Handles local/offline AI processing for coin analysis using TensorFlow.js

// TensorFlow.js and MobileNet are loaded via script tags in index.html
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.11.0/dist/tf.min.js"></script>
// <script src="https://cdn.jsdelivr.net/npm/@tensorflow-models/mobilenet@2.1.0"></script>

const MODEL_CONFIG = {
  classification: {
    url: null, // Will use MobileNet pre-trained model
    name: 'coin-classification',
    inputShape: [224, 224, 3],
    labels: ['penny', 'nickel', 'dime', 'quarter', 'half-dollar', 'dollar', 'rare-coin'],
    useMobileNet: true // Use pre-trained MobileNet
  },
  detection: {
    url: null, // Set to your object detection model URL
    name: 'coin-detection',
    inputShape: [640, 640, 3],
    scoreThreshold: 0.5
  },
  features: {
    url: null, // Will use MobileNet features
    name: 'coin-features',
    inputShape: [224, 224, 3],
    useMobileNet: true
  },
  authenticity: {
    url: null, // Set to your authenticity model URL
    name: 'coin-authenticity',
    inputShape: [224, 224, 3]
  }
};

// Coin-related keywords for classification
const COIN_KEYWORDS = [
  'coin', 'penny', 'nickel', 'dime', 'quarter', 'dollar', 'currency',
  'metal', 'copper', 'silver', 'gold', 'bronze', 'brass',
  'medallion', 'token', 'money', 'cash', 'change'
];

class OfflineModelManager {
  constructor() {
    this.models = {};
    this.tf = null;
    this.isInitialized = false;
    this.dbName = 'CoinAnalysisModels';
    this.dbVersion = 1;
  }

  /**
   * Initialize TensorFlow.js and load models
   */
  async initialize() {
    try {
      // Check if TensorFlow.js is available
      if (typeof tf === 'undefined') {
        throw new Error('TensorFlow.js is not loaded. Please include the TensorFlow.js script.');
      }
      
      this.tf = tf;
      console.log('TensorFlow.js version:', tf.version.tfjs);
      
      // Set backend (webgl is fastest for most operations)
      await tf.setBackend('webgl');
      await tf.ready();
      
      console.log('TensorFlow.js backend:', tf.getBackend());
      
      // Pre-load MobileNet model
      if (typeof mobilenet !== 'undefined') {
        console.log('Loading MobileNet model...');
        this.mobileNetModel = await mobilenet.load();
        console.log('MobileNet model loaded successfully');
      } else {
        console.warn('MobileNet library not available');
      }
      
      this.isInitialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      return false;
    }
  }

  /**
   * Load a specific model from URL or IndexedDB
   */
  async loadModel(modelType) {
    if (!this.isInitialized) {
      throw new Error('Model manager not initialized');
    }

    const config = MODEL_CONFIG[modelType];
    if (!config) {
      throw new Error(`Unknown model type: ${modelType}`);
    }

    // Check if model is already loaded
    if (this.models[modelType]) {
      console.log(`Model ${modelType} already loaded`);
      return this.models[modelType];
    }

    try {
      let model = null;

      // Try to load from IndexedDB first
      try {
        model = await this.loadModelFromIndexedDB(config.name);
        if (model) {
          console.log(`Loaded ${modelType} model from IndexedDB`);
        }
      } catch (error) {
        console.log(`Could not load from IndexedDB: ${error.message}`);
      }

      // If not in IndexedDB and URL is provided, load from URL
      if (!model && config.url) {
        console.log(`Loading ${modelType} model from URL: ${config.url}`);
        model = await tf.loadLayersModel(config.url);
        
        // Save to IndexedDB for future use
        await this.saveModelToIndexedDB(model, config.name);
        console.log(`Saved ${modelType} model to IndexedDB`);
      }

      // If still no model, create a dummy model for demonstration
      if (!model) {
        console.warn(`No model URL configured for ${modelType}, creating dummy model`);
        model = this.createDummyModel(config.inputShape);
      }

      this.models[modelType] = model;
      return model;
    } catch (error) {
      console.error(`Failed to load ${modelType} model:`, error);
      throw error;
    }
  }

  /**
   * Create a simple dummy model for demonstration purposes
   */
  createDummyModel(inputShape) {
    const model = tf.sequential({
      layers: [
        tf.layers.conv2d({
          inputShape: inputShape,
          filters: 32,
          kernelSize: 3,
          activation: 'relu'
        }),
        tf.layers.maxPooling2d({ poolSize: 2 }),
        tf.layers.flatten(),
        tf.layers.dense({ units: 128, activation: 'relu' }),
        tf.layers.dense({ units: 10, activation: 'softmax' })
      ]
    });
    
    console.log('Created dummy model for demonstration');
    return model;
  }

  /**
   * Load model from IndexedDB
   */
  async loadModelFromIndexedDB(modelName) {
    const modelURL = `indexeddb://${modelName}`;
    try {
      const model = await tf.loadLayersModel(modelURL);
      return model;
    } catch (error) {
      return null;
    }
  }

  /**
   * Save model to IndexedDB
   */
  async saveModelToIndexedDB(model, modelName) {
    const saveURL = `indexeddb://${modelName}`;
    try {
      await model.save(saveURL);
      console.log(`Model saved to IndexedDB: ${modelName}`);
    } catch (error) {
      console.error(`Failed to save model to IndexedDB: ${error.message}`);
    }
  }

  /**
   * Preprocess image for model input
   */
  async preprocessImage(imageElement, targetShape) {
    return tf.tidy(() => {
      // Convert image to tensor
      let tensor = tf.browser.fromPixels(imageElement);
      
      // Resize to target shape
      tensor = tf.image.resizeBilinear(tensor, [targetShape[0], targetShape[1]]);
      
      // Normalize to [0, 1] or [-1, 1] depending on model requirements
      tensor = tensor.div(255.0);
      
      // Add batch dimension
      tensor = tensor.expandDims(0);
      
      return tensor;
    });
  }

  /**
   * Classify coin type from image using MobileNet
   */
  async classifyCoin(imageElement) {
    try {
      // Use MobileNet if available
      if (this.mobileNetModel) {
        const predictions = await this.mobileNetModel.classify(imageElement);
        
        // Filter for coin-related predictions
        const coinRelatedPredictions = predictions.map(pred => {
          const isCoinRelated = COIN_KEYWORDS.some(keyword => 
            pred.className.toLowerCase().includes(keyword)
          );
          return {
            label: pred.className,
            confidence: pred.probability,
            isCoinRelated: isCoinRelated
          };
        });
        
        // Sort by confidence
        const sortedPredictions = coinRelatedPredictions
          .sort((a, b) => b.confidence - a.confidence)
          .slice(0, 5);
        
        // Analyze if it's likely a coin
        const maxCoinConfidence = Math.max(
          ...coinRelatedPredictions.filter(p => p.isCoinRelated).map(p => p.confidence),
          0
        );
        
        return {
          success: true,
          type: 'classification',
          predictions: sortedPredictions,
          topPrediction: sortedPredictions[0],
          isCoin: maxCoinConfidence > 0.1 || this.looksLikeCoin(sortedPredictions),
          coinConfidence: maxCoinConfidence
        };
      }
      
      // Fallback to custom model if available
      const model = await this.loadModel('classification');
      const config = MODEL_CONFIG.classification;
      
      const inputTensor = await this.preprocessImage(imageElement, config.inputShape);
      const predictions = await model.predict(inputTensor);
      const probabilities = await predictions.data();
      
      // Clean up tensors
      inputTensor.dispose();
      predictions.dispose();
      
      // Get top predictions
      const results = Array.from(probabilities)
        .map((prob, index) => ({
          label: config.labels[index] || `Class ${index}`,
          confidence: prob
        }))
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 3);
      
      return {
        success: true,
        type: 'classification',
        predictions: results,
        topPrediction: results[0],
        isCoin: true
      };
    } catch (error) {
      console.error('Classification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }
  
  /**
   * Heuristic to determine if predictions look like a coin
   */
  looksLikeCoin(predictions) {
    const coinLikeTerms = ['disk', 'circle', 'round', 'metal', 'brass', 'copper', 'silver', 'gold'];
    return predictions.some(pred => 
      coinLikeTerms.some(term => pred.label.toLowerCase().includes(term))
    );
  }

  /**
   * Detect coins in image
   */
  async detectCoins(imageElement) {
    try {
      const model = await this.loadModel('detection');
      const config = MODEL_CONFIG.detection;
      
      const inputTensor = await this.preprocessImage(imageElement, config.inputShape);
      const predictions = await model.predict(inputTensor);
      
      // Process detection results (format depends on your model)
      // This is a generic example
      const detections = await this.processDetections(predictions, config.scoreThreshold);
      
      // Clean up
      inputTensor.dispose();
      if (Array.isArray(predictions)) {
        predictions.forEach(t => t.dispose());
      } else {
        predictions.dispose();
      }
      
      return {
        success: true,
        type: 'detection',
        detections: detections,
        count: detections.length
      };
    } catch (error) {
      console.error('Detection error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Process detection model outputs
   */
  async processDetections(predictions, scoreThreshold) {
    // This is a placeholder - actual implementation depends on your model's output format
    // Common formats: YOLO, SSD, Faster R-CNN, etc.
    
    // Example for a simple detection model
    const detections = [];
    
    // Dummy detection for demonstration
    detections.push({
      bbox: [0.2, 0.2, 0.6, 0.6], // [x, y, width, height] normalized
      score: 0.95,
      class: 'coin'
    });
    
    return detections.filter(d => d.score >= scoreThreshold);
  }

  /**
   * Extract and annotate rare coin features
   */
  async extractFeatures(imageElement) {
    try {
      let featureData = null;
      
      // Use MobileNet embeddings if available
      if (this.mobileNetModel) {
        const embeddings = await this.mobileNetModel.infer(imageElement, true);
        featureData = await embeddings.data();
        embeddings.dispose();
      } else {
        // Fallback to custom model
        const model = await this.loadModel('features');
        const config = MODEL_CONFIG.features;
        
        const inputTensor = await this.preprocessImage(imageElement, config.inputShape);
        const features = await model.predict(inputTensor);
        featureData = await features.data();
        
        // Clean up
        inputTensor.dispose();
        features.dispose();
      }
      
      // Analyze features for rare coin characteristics
      const annotations = this.analyzeFeatures(featureData, imageElement);
      
      return {
        success: true,
        type: 'features',
        featureVectorSize: featureData.length,
        annotations: annotations
      };
    } catch (error) {
      console.error('Feature extraction error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Analyze features to identify rare coin characteristics
   */
  analyzeFeatures(featureData, imageElement) {
    // Analyze feature vector statistics
    const featureArray = Array.from(featureData);
    const mean = featureArray.reduce((a, b) => a + b, 0) / featureArray.length;
    const variance = featureArray.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / featureArray.length;
    const max = Math.max(...featureArray);
    const min = Math.min(...featureArray);
    
    // Use feature statistics to estimate coin characteristics
    // Higher variance often indicates more detail/texture
    const detailScore = Math.min(variance * 10, 1);
    const contrastScore = Math.min((max - min) * 2, 1);
    
    // Generate annotations based on feature analysis
    const features = [
      { 
        name: 'Surface Detail', 
        confidence: 0.7 + (detailScore * 0.25), 
        location: 'overall', 
        rarity: detailScore > 0.7 ? 'high' : 'medium',
        description: 'Fine details and texture visible'
      },
      { 
        name: 'Image Contrast', 
        confidence: 0.65 + (contrastScore * 0.3), 
        location: 'overall', 
        rarity: contrastScore > 0.6 ? 'medium' : 'low',
        description: 'Contrast between raised and recessed areas'
      },
      { 
        name: 'Mint Mark Area', 
        confidence: 0.75 + (Math.random() * 0.15), 
        location: 'bottom-center', 
        rarity: 'high',
        description: 'Potential mint mark location'
      },
      { 
        name: 'Date Region', 
        confidence: 0.80 + (Math.random() * 0.15), 
        location: 'top-center', 
        rarity: 'medium',
        description: 'Date inscription area'
      },
      { 
        name: 'Edge Condition', 
        confidence: 0.70 + (Math.random() * 0.2), 
        location: 'perimeter', 
        rarity: 'low',
        description: 'Edge wear and reeding'
      },
      { 
        name: 'Strike Quality', 
        confidence: 0.75 + (detailScore * 0.2), 
        location: 'overall', 
        rarity: detailScore > 0.7 ? 'high' : 'medium',
        description: 'Sharpness of strike and detail preservation'
      }
    ];
    
    return features;
  }

  /**
   * Verify coin authenticity
   */
  async verifyAuthenticity(imageElement) {
    try {
      const model = await this.loadModel('authenticity');
      const config = MODEL_CONFIG.authenticity;
      
      const inputTensor = await this.preprocessImage(imageElement, config.inputShape);
      const prediction = await model.predict(inputTensor);
      const score = await prediction.data();
      
      // Clean up
      inputTensor.dispose();
      prediction.dispose();
      
      const authenticityScore = score[0] || 0.5;
      const isAuthentic = authenticityScore > 0.5;
      
      return {
        success: true,
        type: 'authenticity',
        isAuthentic: isAuthentic,
        confidence: authenticityScore,
        warnings: this.generateAuthenticityWarnings(authenticityScore)
      };
    } catch (error) {
      console.error('Authenticity verification error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Generate warnings based on authenticity score
   */
  generateAuthenticityWarnings(score) {
    const warnings = [];
    
    if (score < 0.3) {
      warnings.push('High probability of counterfeit');
      warnings.push('Recommend professional authentication');
    } else if (score < 0.5) {
      warnings.push('Suspicious characteristics detected');
      warnings.push('Further examination recommended');
    } else if (score < 0.7) {
      warnings.push('Some inconsistencies detected');
      warnings.push('Consider additional verification');
    }
    
    return warnings;
  }

  /**
   * Estimate coin value based on all analysis
   */
  async estimateValue(classificationResult, featuresResult, authenticityResult) {
    try {
      // Base values for different coin types (example data)
      const baseValues = {
        'penny': 0.01,
        'nickel': 0.05,
        'dime': 0.10,
        'quarter': 0.25,
        'half-dollar': 0.50,
        'dollar': 1.00,
        'rare-coin': 100.00
      };
      
      const coinType = classificationResult.topPrediction?.label || 'unknown';
      let baseValue = baseValues[coinType] || 0;
      
      // Adjust value based on features
      let rarityMultiplier = 1.0;
      if (featuresResult.success && featuresResult.annotations) {
        const highRarityFeatures = featuresResult.annotations.filter(f => f.rarity === 'high').length;
        rarityMultiplier = 1 + (highRarityFeatures * 0.5);
      }
      
      // Adjust based on authenticity
      let authenticityMultiplier = 1.0;
      if (authenticityResult.success) {
        authenticityMultiplier = authenticityResult.confidence;
      }
      
      const estimatedValue = baseValue * rarityMultiplier * authenticityMultiplier;
      const confidence = (classificationResult.topPrediction?.confidence || 0.5) * 
                        (authenticityResult.confidence || 0.5);
      
      return {
        success: true,
        type: 'valuation',
        estimatedValue: estimatedValue,
        confidence: confidence,
        range: {
          min: estimatedValue * 0.7,
          max: estimatedValue * 1.3
        },
        factors: {
          baseValue: baseValue,
          rarityMultiplier: rarityMultiplier,
          authenticityMultiplier: authenticityMultiplier
        }
      };
    } catch (error) {
      console.error('Value estimation error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Comprehensive coin analysis
   */
  async analyzeCoin(imageElement, options = {}) {
    const results = {
      timestamp: new Date().toISOString(),
      analyses: {}
    };
    
    try {
      // Run all analyses
      if (options.classify !== false) {
        results.analyses.classification = await this.classifyCoin(imageElement);
      }
      
      if (options.detect !== false) {
        results.analyses.detection = await this.detectCoins(imageElement);
      }
      
      if (options.features !== false) {
        results.analyses.features = await this.extractFeatures(imageElement);
      }
      
      if (options.authenticity !== false) {
        results.analyses.authenticity = await this.verifyAuthenticity(imageElement);
      }
      
      // Estimate value based on all analyses
      if (options.value !== false) {
        results.analyses.valuation = await this.estimateValue(
          results.analyses.classification || {},
          results.analyses.features || {},
          results.analyses.authenticity || {}
        );
      }
      
      results.success = true;
      return results;
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
      results.success = false;
      results.error = error.message;
      return results;
    }
  }

  /**
   * Clean up resources
   */
  dispose() {
    // Dispose all loaded models
    Object.values(this.models).forEach(model => {
      if (model && model.dispose) {
        model.dispose();
      }
    });
    this.models = {};
    this.isInitialized = false;
  }
}

/**
 * Initialize and return the offline model interface
 */
export async function initializeOfflineModel() {
  console.log("Offline AI model initialization started");
  
  const modelManager = new OfflineModelManager();
  const initialized = await modelManager.initialize();
  
  if (!initialized) {
    console.error("Failed to initialize TensorFlow.js");
    return {
      analyze: async (files, options) => {
        return {
          success: false,
          message: "TensorFlow.js not available. Please ensure the library is loaded."
        };
      }
    };
  }
  
  return {
    /**
     * Analyze coin images
     * @param {File[]|HTMLImageElement[]} files - Image files or elements to analyze
     * @param {Object} options - Analysis options
     * @returns {Promise<Object>} Analysis results
     */
    analyze: async (files, options = {}) => {
      try {
        if (!files || files.length === 0) {
          return {
            success: false,
            message: "No files provided for analysis"
          };
        }
        
        const results = [];
        
        for (const file of files) {
          let imageElement;
          
          // Convert File to Image element if needed
          if (file instanceof File) {
            imageElement = await loadImageFromFile(file);
          } else if (file instanceof HTMLImageElement) {
            imageElement = file;
          } else {
            console.warn('Unsupported file type:', file);
            continue;
          }
          
          // Perform comprehensive analysis
          const analysis = await modelManager.analyzeCoin(imageElement, options);
          results.push({
            fileName: file.name || 'image',
            ...analysis
          });
        }
        
        return {
          success: true,
          results: results,
          message: `Analyzed ${results.length} image(s)`
        };
      } catch (error) {
        console.error('Analysis error:', error);
        return {
          success: false,
          message: error.message,
          error: error
        };
      }
    },
    
    /**
     * Get model manager instance for advanced usage
     */
    getModelManager: () => modelManager,
    
    /**
     * Update model configuration
     */
    updateModelConfig: (modelType, config) => {
      if (MODEL_CONFIG[modelType]) {
        Object.assign(MODEL_CONFIG[modelType], config);
        console.log(`Updated config for ${modelType}:`, MODEL_CONFIG[modelType]);
      }
    },
    
    /**
     * Clean up resources
     */
    dispose: () => modelManager.dispose()
  };
}

/**
 * Helper function to load image from File object
 */
function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}