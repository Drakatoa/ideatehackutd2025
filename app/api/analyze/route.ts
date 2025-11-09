/**
 * Analyze endpoint - Analyzes sketches/whiteboard images using Nemotron
 * POST /api/analyze
 *
 * Accepts:
 * - image: base64 encoded image data
 * - description: optional text description
 *
 * Returns:
 * - Structured analysis of the sketch/concept
 */

import { NextRequest, NextResponse } from 'next/server'
import { createNemotronClient, getVisionModelId } from '@/lib/nemotron/client'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { image, description } = body

    // Validate input
    if (!image) {
      return NextResponse.json(
        { success: false, error: 'Image data is required' },
        { status: 400 }
      )
    }

    // Create Nemotron client
    const client = createNemotronClient()

    // Craft a detailed prompt for sketch analysis
    const analysisPrompt = `You are an expert product analyst and UX designer. Analyze the CONCEPTUAL CONTENT of this image and extract structured information.

CRITICAL: IGNORE physical aspects of the image (whiteboard, marker, paper, handwriting style, colors, etc.). Focus ONLY on:
- The actual text, labels, and words written
- The diagram structure, flow, and connections
- The concepts, ideas, and product features described
- The logical relationships between elements

${description ? `User's description: ${description}\n\n` : ''}

Analyze the CONCEPTUAL CONTENT (text, diagram, ideas) and respond ONLY with valid JSON in this exact format (no markdown, no extra text):

{
  "components": ["component 1", "component 2"],
  "userFlow": "description of user flow",
  "features": ["feature 1", "feature 2"],
  "productType": "type of product",
  "targetAudience": "target audience description",
  "technicalNotes": ["technical note 1", "technical note 2"],
  "summary": "2-3 sentence overview"
}

Extract information from the ACTUAL CONTENT (text, labels, diagram structure) shown in the image. Do NOT mention how it was drawn, what it's drawn on, or physical characteristics. Focus on what the diagram/text represents conceptually.`

    console.log('Analyzing sketch with Nemotron...')

    // Call Nemotron with vision capabilities
    const analysisResult = await client.analyzeImage(
      image,
      analysisPrompt,
      {
        maxTokens: 2000,
        temperature: 0.7,
      }
    )

    console.log('Analysis complete:', analysisResult.substring(0, 200) + '...')

    // Try to parse as JSON, but also handle plain text responses
    let structuredAnalysis
    try {
      // Look for JSON in the response
      const jsonMatch = analysisResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        structuredAnalysis = JSON.parse(jsonMatch[0])
        // Always preserve the raw analysis for downstream use
        structuredAnalysis.rawAnalysis = analysisResult
      } else {
        // Fallback: create structure from plain text
        structuredAnalysis = {
          rawAnalysis: analysisResult,
          components: [],
          userFlow: 'See raw analysis',
          features: [],
          productType: 'Unknown',
          targetAudience: 'Unknown',
          technicalNotes: [],
          summary: analysisResult.substring(0, 300) + '...',
        }
      }
    } catch (parseError) {
      // If parsing fails, return the raw analysis
      structuredAnalysis = {
        rawAnalysis: analysisResult,
        components: [],
        userFlow: 'See raw analysis',
        features: [],
        productType: 'Unknown',
        targetAudience: 'Unknown',
        technicalNotes: [],
        summary: analysisResult.substring(0, 300) + '...',
      }
    }

    return NextResponse.json({
      success: true,
      analysis: structuredAnalysis,
      metadata: {
        model: getVisionModelId(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Analysis error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to analyze image',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
