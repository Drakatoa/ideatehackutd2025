/**
 * Pitch Generation API Endpoint
 * Creates a compelling product pitch from analysis
 *
 * POST /api/generate/pitch
 * Body:
 * - analysis: AnalysisResult from /api/analyze
 *
 * Returns:
 * - Structured pitch with problem, solution, target audience, differentiators, value prop
 */

import { NextRequest, NextResponse } from 'next/server'
import { createNemotronClient, getTextModelId } from '@/lib/nemotron/client'
import type { AnalysisResult, PitchResult } from '@/lib/nemotron/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysis, previousPitch, description } = body as {
      analysis: AnalysisResult
      previousPitch?: PitchResult
      description?: string
    }

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis data is required' },
        { status: 400 }
      )
    }

    const client = createNemotronClient()

    // Craft an exceptional pitch prompt
    const previousContext = previousPitch
      ? `\n\nPREVIOUS PITCH (build upon this, refine it, make it better):\n${JSON.stringify(previousPitch, null, 2)}\n\n`
      : ''
    const userDescription = description ? `\n\nUSER'S ADDITIONAL CONTEXT:\n${description}\n\n` : ''

    const pitchPrompt = `You are a Y Combinator partner and master storyteller. Create a compelling investor pitch that makes people WANT this product.

PRODUCT ANALYSIS:
${analysis.rawAnalysis || JSON.stringify(analysis, null, 2)}

Components: ${analysis.components?.join(', ') || 'N/A'}
Features: ${analysis.features?.join(', ') || 'N/A'}
Product Type: ${analysis.productType || 'Application'}
Target Audience: ${analysis.targetAudience || 'Users'}
${previousContext}${userDescription}

YOUR MISSION:
Think like a founder who GETS IT. This isn't just another app - it's solving a REAL problem that people feel every day.

Create a pitch that is:
🔥 COMPELLING - Make investors lean forward
💡 INSIGHTFUL - Show you understand the problem deeply
🎯 SPECIFIC - No generic startup BS
✨ VISIONARY - Paint the future this creates

Structure your response as JSON with these fields:
{
  "problem": "The painful problem this solves (2-3 sentences, make it visceral)",
  "solution": "How this product uniquely solves it (2-3 sentences, specific not generic)",
  "targetAudience": "Who desperately needs this and why (1-2 sentences)",
  "differentiators": ["Key advantage 1", "Key advantage 2", "Key advantage 3"],
  "valueProposition": "The ultimate one-liner (10-15 words max)",
  "traction": "Potential early wins or validation opportunities (1-2 sentences)"
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations, no extra text.
Make every word count. Be bold. Be specific. Make them believe.

GENERATE EXCEPTIONAL PITCH JSON NOW:`

    console.log('Generating pitch...')

    const pitchResult = await client.generate(pitchPrompt, {
      maxTokens: 2000,
      temperature: 0.7, // Higher temperature for creative pitch writing
    })

    console.log('Pitch generated:', pitchResult.substring(0, 150) + '...')

    // Parse JSON with fallback
    let pitch
    try {
      // Try direct parse first
      pitch = JSON.parse(pitchResult)
    } catch {
      // Try to extract JSON from response
      const jsonMatch = pitchResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          pitch = JSON.parse(jsonMatch[0])
        } catch {
          // Fallback structure
          pitch = {
            problem: 'Problem extraction pending',
            solution: 'Solution extraction pending',
            targetAudience: analysis.targetAudience || 'Target users',
            differentiators: analysis.features || ['Feature 1', 'Feature 2', 'Feature 3'],
            valueProposition: analysis.summary || 'Innovative solution',
            traction: 'Early validation opportunities available',
            raw: pitchResult,
          }
        }
      } else {
        pitch = {
          problem: 'Problem extraction pending',
          solution: 'Solution extraction pending',
          targetAudience: analysis.targetAudience || 'Target users',
          differentiators: analysis.features || ['Feature 1', 'Feature 2', 'Feature 3'],
          valueProposition: analysis.summary || 'Innovative solution',
          traction: 'Early validation opportunities available',
          raw: pitchResult,
        }
      }
    }

    return NextResponse.json({
      success: true,
      pitch,
      metadata: {
        model: getTextModelId(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Pitch generation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate pitch',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
