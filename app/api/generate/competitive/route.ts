/**
 * Competitive Analysis API Endpoint
 * Identifies competitors and market opportunities
 *
 * POST /api/generate/competitive
 * Body:
 * - analysis: AnalysisResult from /api/analyze
 *
 * Returns:
 * - Competitors, differentiators, and market opportunity
 */

import { NextRequest, NextResponse } from 'next/server'
import { createNemotronClient, getTextModelId } from '@/lib/nemotron/client'
import type { AnalysisResult, CompetitiveAnalysisResult } from '@/lib/nemotron/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysis, previousCompetitive } = body as {
      analysis: AnalysisResult
      previousCompetitive?: CompetitiveAnalysisResult
    }

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis data is required' },
        { status: 400 }
      )
    }

    const client = createNemotronClient()

    // Craft competitive analysis prompt
    const previousContext = previousCompetitive
      ? `\n\nPREVIOUS ANALYSIS (build upon this, refine it, make it better):\n${JSON.stringify(previousCompetitive, null, 2)}\n\n`
      : ''

    const competitivePrompt = `You are a market research analyst and competitive intelligence expert. Analyze this product and identify the competitive landscape.

PRODUCT ANALYSIS:
${analysis.rawAnalysis || JSON.stringify(analysis, null, 2)}

Product Type: ${analysis.productType || 'Application'}
Key Features: ${analysis.features?.join(', ') || 'N/A'}
Target Audience: ${analysis.targetAudience || 'Users'}
${previousContext}

YOUR MISSION:
Think strategically. Who are the REAL competitors (direct and indirect)? What gaps exist in the market? Where's the whitespace?

Be SPECIFIC and REALISTIC. Name actual companies/products that compete in this space.

Structure your response as JSON:
{
  "competitors": [
    {
      "name": "Actual Company/Product Name",
      "description": "What they do (1 sentence)",
      "strengths": ["Strength 1", "Strength 2"],
      "weaknesses": ["Weakness 1", "Weakness 2"]
    },
    // 3-4 competitors total
  ],
  "differentiators": [
    "How this product is UNIQUELY different (not just better)",
    "Advantage 2",
    "Advantage 3"
  ],
  "marketOpportunity": "The whitespace this fills (2-3 sentences, be specific about the gap)",
  "positioning": "How to position against competitors (1-2 sentences)"
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations.
Be honest about competitors - don't downplay them. Show you understand the market.

GENERATE COMPETITIVE ANALYSIS JSON NOW:`

    console.log('Generating competitive analysis...')

    const competitiveResult = await client.generate(competitivePrompt, {
      maxTokens: 2000,
      temperature: 0.6, // Balanced for factual but insightful analysis
    })

    console.log('Competitive analysis generated:', competitiveResult.substring(0, 150) + '...')

    // Parse JSON with fallback
    let competitive
    try {
      competitive = JSON.parse(competitiveResult)
    } catch {
      const jsonMatch = competitiveResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          competitive = JSON.parse(jsonMatch[0])
        } catch {
          // Fallback structure
          competitive = {
            competitors: [
              {
                name: 'Competitor Analysis Pending',
                description: 'Analyzing market landscape...',
                strengths: ['Market presence'],
                weaknesses: ['Analysis in progress'],
              },
            ],
            differentiators: ['Unique approach', 'Innovative features', 'Better user experience'],
            marketOpportunity: 'Detailed market analysis in progress',
            positioning: 'Strategic positioning under development',
            raw: competitiveResult,
          }
        }
      } else {
        competitive = {
          competitors: [],
          differentiators: ['Unique approach', 'Innovative features'],
          marketOpportunity: 'Market opportunity analysis in progress',
          positioning: 'Positioning strategy under development',
          raw: competitiveResult,
        }
      }
    }

    return NextResponse.json({
      success: true,
      competitive,
      metadata: {
        model: getTextModelId(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Competitive analysis error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate competitive analysis',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
