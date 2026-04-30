const tf = require('@tensorflow/tfjs');
const mobilenet = require('@tensorflow-models/mobilenet');
const sharp = require('sharp');

let model = null;

/**
 * Loads the MobileNet model into memory.
 */
async function loadModel() {
  if (!model) {
    console.log('[AI Search] Loading MobileNet model...');
    model = await mobilenet.load({ version: 2, alpha: 1.0 });
    console.log('[AI Search] MobileNet model loaded successfully.');
  }
  return model;
}

/**
 * Robust Decoder using Sharp to handle multiple formats (JPG, PNG, WebP)
 * and resize to 224x224 before tensor conversion.
 */
async function decodeAndResize(buffer) {
  try {
    const { data, info } = await sharp(buffer)
      .resize(224, 224, { fit: 'fill' })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    return tf.tensor3d(new Uint8Array(data), [224, 224, 3], 'int32');
  } catch (err) {
    console.error('[AI Search] Sharp decoding/resizing error:', err);
    throw new Error('Unsupported image format or corrupt file.');
  }
}

/**
 * Normalizes a vector to a unit vector (L2 normalization).
 * This ensures cosine similarity is computed correctly regardless
 * of vector magnitude, and eliminates the need for division at query time.
 */
function normalize(vector) {
  let sumOfSquares = 0;
  for (let i = 0; i < vector.length; i++) {
    sumOfSquares += vector[i] * vector[i];
  }
  const magnitude = Math.sqrt(sumOfSquares);
  if (magnitude === 0) return vector; // avoid division by zero on zero vectors
  return vector.map(v => v / magnitude);
}

/**
 * Converts an image file buffer into a normalized feature vector.
 * Normalization ensures cosine similarity works correctly in all cases.
 */
async function getFeatureVector(imageBuffer) {
  const modelInstance = await loadModel();
  
  let tensor = null;
  try {
    // 1. Decode and Resize to AI-friendly dimensions (224x224)
    tensor = await decodeAndResize(imageBuffer);
    
    // 2. Perform Inference with tf.tidy to ensure intermediate tensors are cleared
    const rawVector = tf.tidy(() => {
      const embedding = modelInstance.infer(tensor, true);
      return Array.from(embedding.dataSync());
    });
    
    // 3. Normalize the vector before returning so cosine similarity is accurate
    const normalizedVector = normalize(rawVector);
    console.log(`[AI Search] Feature vector extracted and normalized. Dimensions: ${normalizedVector.length}`);
    
    return normalizedVector;
  } catch (err) {
    console.error('[AI Search] Error processing image:', err);
    throw new Error('Failed to extract image features.');
  } finally {
    // Manually dispose of the input tensor created outside tf.tidy
    if (tensor) tensor.dispose();
  }
}

/**
 * Computes Cosine Similarity between two vectors.
 * Still handles un-normalized vectors gracefully via full norm calculation.
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

module.exports = {
  loadModel,
  getFeatureVector,
  cosineSimilarity,
  normalize
};
