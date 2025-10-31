import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import yaml from 'yaml';
import { logger } from './logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface ModelConfig {
  id: string;
  provider: 'anthropic' | 'openai';
  pricing: {
    input_mtok: number;
    output_mtok: number;
  };
  notes: string;
}

interface ModelsYaml {
  models: Record<string, ModelConfig>;
  deprecated: string[];
}

let modelCache: ModelsYaml | null = null;

/**
 * Load model mapping from models.yaml
 */
async function loadModelMapping(): Promise<ModelsYaml> {
  if (modelCache) {
    return modelCache;
  }

  const configPath = path.join(__dirname, '..', 'config', 'models.yaml');
  const yamlContent = await fs.readFile(configPath, 'utf-8');
  modelCache = yaml.parse(yamlContent);

  logger.info(
    { modelCount: Object.keys(modelCache!.models).length },
    'Model mapping loaded'
  );

  return modelCache!;
}

/**
 * Map simple model name to actual API ID
 * @param simpleName - e.g., "haiku-3.5", "sonnet-4.5"
 * @returns Actual API ID - e.g., "claude-3-5-haiku-20241022"
 */
export async function getModelId(simpleName: string): Promise<string> {
  const mapping = await loadModelMapping();

  // If it's already a full ID (contains date pattern), return as-is
  if (/\d{8}/.test(simpleName)) {
    // Check if it's deprecated
    if (mapping.deprecated.includes(simpleName)) {
      logger.warn(
        { modelId: simpleName },
        'Using deprecated model ID - consider upgrading'
      );
    }
    return simpleName;
  }

  // Look up simple name
  const modelConfig = mapping.models[simpleName];
  if (!modelConfig) {
    logger.error(
      { simpleName, availableModels: Object.keys(mapping.models) },
      'Model not found in mapping'
    );
    throw new Error(
      `Unknown model: "${simpleName}". Available: ${Object.keys(mapping.models).join(', ')}`
    );
  }

  logger.debug(
    { simpleName, actualId: modelConfig.id, provider: modelConfig.provider },
    'Model mapped'
  );

  return modelConfig.id;
}

/**
 * Get model pricing info
 */
export async function getModelPricing(modelName: string): Promise<{
  input_mtok: number;
  output_mtok: number;
  provider: string;
}> {
  const mapping = await loadModelMapping();

  // Try to find by simple name first
  let modelConfig = mapping.models[modelName];

  // If not found, try to find by actual ID
  if (!modelConfig) {
    for (const [simpleName, config] of Object.entries(mapping.models)) {
      if (config.id === modelName) {
        modelConfig = config;
        break;
      }
    }
  }

  if (!modelConfig) {
    logger.warn(
      { modelName },
      'Model pricing not found, using default Haiku 3.5 pricing'
    );
    return {
      input_mtok: 0.8,
      output_mtok: 4.0,
      provider: 'anthropic'
    };
  }

  return {
    input_mtok: modelConfig.pricing.input_mtok,
    output_mtok: modelConfig.pricing.output_mtok,
    provider: modelConfig.provider
  };
}

/**
 * List all available simple model names
 */
export async function listAvailableModels(): Promise<string[]> {
  const mapping = await loadModelMapping();
  return Object.keys(mapping.models);
}

