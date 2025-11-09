/**
 * Type definitions for NVIDIA Nemotron API
 */

export interface NemotronConfig {
  apiKey: string
  apiUrl: string
  modelId?: string
  maxRetries?: number
  timeout?: number
}

export interface NemotronMessage {
  role: 'user' | 'assistant' | 'system'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: {
      url: string
    }
  }>
}

export interface NemotronRequest {
  model?: string
  messages: NemotronMessage[]
  max_tokens?: number
  temperature?: number
  top_p?: number
  stream?: boolean
}

export interface NemotronResponse {
  id: string
  object: string
  created: number
  model: string
  choices: Array<{
    index: number
    message: {
      role: string
      content?: string
      reasoning_content?: string  // Nemotron Nano 9B v2 uses this field
    }
    finish_reason: string
  }>
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

export interface NemotronError {
  error: {
    message: string
    type: string
    code?: string
  }
}

export interface AnalysisResult {
  components: string[]
  userFlow: string
  features: string[]
  productType: string
  targetAudience: string
  technicalNotes: string[]
  summary: string
  rawAnalysis?: string  // Full AI response if JSON parsing fails
}

export interface DiagramGenerationResult {
  mermaid: string
  type: 'flowchart' | 'sequence' | 'class' | 'state' | 'er'
}

export interface PitchResult {
  problem: string
  solution: string
  targetAudience: string
  differentiators: string[]
  valueProposition: string
  raw: string
}

export interface CompetitiveAnalysisResult {
  competitors: Array<{
    name: string
    description: string
    strengths: string[]
    weaknesses: string[]
  }>
  differentiators: string[]
  marketOpportunity: string
}

