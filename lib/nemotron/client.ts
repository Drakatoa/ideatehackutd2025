/**
 * NVIDIA Nemotron API Client
 * 
 * Handles all interactions with the NVIDIA Nemotron API
 */

import axios, { AxiosError, AxiosInstance } from 'axios'
import type {
  NemotronConfig,
  NemotronRequest,
  NemotronResponse,
  NemotronError,
  NemotronMessage,
} from './types'

export class NemotronClient {
  private config: NemotronConfig
  private axiosInstance: AxiosInstance

  constructor(config: NemotronConfig) {
    this.config = {
      maxRetries: 3,
      timeout: 30000,
      ...config,
    }

    if (!this.config.apiKey || this.config.apiKey === 'your_nvidia_api_key_here') {
      throw new Error(
        'NEMOTRON_API_KEY is not set. Please add it to your .env.local file.'
      )
    }

    if (!this.config.apiUrl) {
      throw new Error(
        'NEMOTRON_API_URL is not set. Please add it to your .env.local file.'
      )
    }

    // Create axios instance with default config
    // Ensure baseURL doesn't have trailing slash
    const baseURL = this.config.apiUrl.replace(/\/$/, '') // Remove only trailing slash, keep /v1 if present

    this.axiosInstance = axios.create({
      baseURL: baseURL,
      timeout: this.config.timeout,
      headers: {
        'Authorization': `Bearer ${this.config.apiKey}`,
        'Content-Type': 'application/json',
      },
    })
  }

  /**
   * Generate text completion using Nemotron
   */
  async generate(
    prompt: string,
    options?: {
      maxTokens?: number
      temperature?: number
      topP?: number
      systemPrompt?: string
    }
  ): Promise<string> {
    const messages: NemotronMessage[] = []

    if (options?.systemPrompt) {
      messages.push({
        role: 'system',
        content: options.systemPrompt,
      })
    }

    messages.push({
      role: 'user',
      content: prompt,
    })

    return this.chat(messages, options)
  }

  /**
   * Chat completion with message history
   * 
   * @param modelId - Optional model ID override (useful for multi-model setups)
   */
  async chat(
    messages: NemotronMessage[],
    options?: {
      maxTokens?: number
      temperature?: number
      topP?: number
      modelId?: string
    }
  ): Promise<string> {
    // Use provided modelId or fall back to config modelId
    const modelId = options?.modelId || this.config.modelId

    const request: NemotronRequest = {
      model: modelId,
      messages,
      max_tokens: options?.maxTokens || 2000,
      temperature: options?.temperature ?? 0.7,
      top_p: options?.topP,
    }

    try {
      // NVIDIA API might use model-specific endpoints
      // Try different endpoint formats:
      // 1. /chat/completions (if baseURL already has /v1)
      // 2. /v1/chat/completions (standard OpenAI format)

      let endpoint = '/chat/completions'
      let modelSpecificEndpoint = `/models/${encodeURIComponent(modelId)}/chat/completions`

      // If baseURL doesn't include /v1, add it to endpoints
      if (!this.axiosInstance.defaults.baseURL?.includes('/v1')) {
        endpoint = '/v1/chat/completions'
        modelSpecificEndpoint = `/v1/models/${encodeURIComponent(modelId)}/chat/completions`
      }
      
      const fullUrl = `${this.axiosInstance.defaults.baseURL}${endpoint}`
      const modelSpecificUrl = `${this.axiosInstance.defaults.baseURL}${modelSpecificEndpoint}`
      
      console.log('Nemotron API Request:', {
        baseURL: this.axiosInstance.defaults.baseURL,
        endpoint,
        fullUrl,
        modelSpecificEndpoint,
        modelSpecificUrl,
        model: modelId,
        baseURLIncludesV1: this.axiosInstance.defaults.baseURL?.includes('/v1'),
        requestBody: {
          model: modelId,
          messages: messages.length,
          max_tokens: request.max_tokens,
        },
      })

      console.log('Will try endpoint:', endpoint)
      console.log('Full URL will be:', fullUrl)

      // Try standard endpoint first
      let response: any
      let lastError: any
      
      try {
        response = await this.axiosInstance.post<NemotronResponse>(
          endpoint,
          request
        )
      } catch (firstError: any) {
        lastError = firstError
        // If 404, try model-specific endpoint
        if (firstError.response?.status === 404) {
          console.log('Standard endpoint failed (404), trying model-specific endpoint...')
          try {
            response = await this.axiosInstance.post<NemotronResponse>(
              modelSpecificEndpoint,
              request
            )
          } catch (secondError: any) {
            lastError = secondError
            // If still 404, try without /v1 prefix
            if (secondError.response?.status === 404) {
              console.log('Model-specific endpoint also failed (404), trying /chat/completions...')
              try {
                response = await this.axiosInstance.post<NemotronResponse>(
                  '/chat/completions',
                  request
                )
              } catch (thirdError: any) {
                lastError = thirdError
                throw thirdError
              }
            } else {
              throw secondError
            }
          }
        } else {
          throw firstError
        }
      }

      if (!response.data.choices || response.data.choices.length === 0) {
        throw new Error('No response from Nemotron API')
      }

      // Nemotron Nano 9B v2 returns reasoning_content instead of content
      // Handle both formats
      const message = response.data.choices[0].message
      return message.content || message.reasoning_content || ''
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const axiosError = error as AxiosError<NemotronError>
        const attemptedUrl = `${this.axiosInstance.defaults.baseURL}/v1/chat/completions`
        
        console.error('Nemotron API Error:', {
          status: axiosError.response?.status,
          statusText: axiosError.response?.statusText,
          url: attemptedUrl,
          error: axiosError.response?.data,
          message: axiosError.message,
        })
        
        if (axiosError.response?.data?.error) {
          throw new Error(
            `Nemotron API Error: ${axiosError.response.data.error.message}`
          )
        }
        
        // Provide more detailed error message
        const status = axiosError.response?.status
        const statusText = axiosError.response?.statusText
        throw new Error(
          `Nemotron API Request Failed: ${status} ${statusText} - ${axiosError.message} (URL: ${attemptedUrl})`
        )
      }
      throw error
    }
  }

  /**
   * Analyze image with vision capabilities
   * Note: Verify if your Nemotron model supports vision
   * 
   * @param modelId - Optional model ID for vision tasks (defaults to vision model from env)
   */
  async analyzeImage(
    imageBase64: string,
    prompt: string,
    options?: {
      maxTokens?: number
      temperature?: number
      modelId?: string
    }
  ): Promise<string> {
    // Remove data URL prefix if present
    const base64Data = imageBase64.replace(/^data:image\/\w+;base64,/, '')

    const messages: NemotronMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: `data:image/png;base64,${base64Data}`,
            },
          },
        ],
      },
    ]

    // Use provided modelId, or get vision model from env, or fall back to default
    const visionModelId = 
      options?.modelId || 
      process.env.NEMOTRON_VISION_MODEL_ID ||
      this.config.modelId

    return this.chat(messages, { ...options, modelId: visionModelId })
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.generate('Hello, Nemotron!', { maxTokens: 10 })
      return true
    } catch (error) {
      console.error('Nemotron connection test failed:', error)
      return false
    }
  }
}

/**
 * Create a Nemotron client instance from environment variables
 * Supports single model or dual model setup
 */
export function createNemotronClient(): NemotronClient {
  const apiKey = process.env.NEMOTRON_API_KEY
  // NVIDIA API base URL - try different formats
  // Option 1: https://integrate.api.nvidia.com (API Catalog - might need model-specific endpoint)
  // Option 2: https://api.nvcf.nvidia.com (NVIDIA Cloud Functions)
  // The API Catalog might require getting the model endpoint URL first
  const apiUrl = process.env.NEMOTRON_API_URL || 'https://integrate.api.nvidia.com'
  
  // Support dual model setup: vision model for images, text model for generation
  // Falls back to single model if only NEMOTRON_MODEL_ID is set
  const modelId =
    process.env.NEMOTRON_TEXT_MODEL_ID ||
    process.env.NEMOTRON_MODEL_ID ||
    'nvidia/nvidia-nemotron-nano-9b-v2'  // Updated default to working model
  
  const maxRetries = process.env.NEMOTRON_MAX_RETRIES
    ? parseInt(process.env.NEMOTRON_MAX_RETRIES)
    : 3
  const timeout = process.env.NEMOTRON_TIMEOUT
    ? parseInt(process.env.NEMOTRON_TIMEOUT)
    : 30000

  if (!apiKey) {
    throw new Error(
      'NEMOTRON_API_KEY environment variable is not set. Please add it to your .env.local file.'
    )
  }

  return new NemotronClient({
    apiKey,
    apiUrl,
    modelId,
    maxRetries,
    timeout,
  })
}

/**
 * Get vision model ID from environment variables
 * Falls back to default model if not specified
 */
export function getVisionModelId(): string {
  return (
    process.env.NEMOTRON_VISION_MODEL_ID ||
    process.env.NEMOTRON_MODEL_ID ||
    'meta/llama-3.2-11b-vision-instruct'  // Vision-capable model with multimodal support
  )
}

/**
 * Get text model ID from environment variables
 * Falls back to default model if not specified
 */
export function getTextModelId(): string {
  return (
    process.env.NEMOTRON_TEXT_MODEL_ID ||
    process.env.NEMOTRON_MODEL_ID ||
    'nvidia/nvidia-nemotron-nano-9b-v2'  // Updated default to working model
  )
}

