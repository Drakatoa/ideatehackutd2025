/**
 * Roadmap Generation API Endpoint
 * Creates a 90-day product launch roadmap
 *
 * POST /api/generate/roadmap
 * Body:
 * - analysis: AnalysisResult from /api/analyze
 *
 * Returns:
 * - Phased roadmap with MVP, Beta, and Launch milestones
 */

import { NextRequest, NextResponse } from 'next/server'
import { createNemotronClient, getTextModelId } from '@/lib/nemotron/client'
import type { AnalysisResult } from '@/lib/nemotron/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysis, previousRoadmap } = body as {
      analysis: AnalysisResult
      previousRoadmap?: any
    }

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis data is required' },
        { status: 400 }
      )
    }

    const client = createNemotronClient()

    // Craft roadmap prompt
    const previousContext = previousRoadmap
      ? `\n\nPREVIOUS ROADMAP (build upon this, refine it, make it better):\n${JSON.stringify(previousRoadmap, null, 2)}\n\n`
      : ''

    const roadmapPrompt = `You are a seasoned product manager who's launched dozens of successful products. Create an actionable 90-day roadmap.

PRODUCT ANALYSIS:
${analysis.rawAnalysis || JSON.stringify(analysis, null, 2)}

Components: ${analysis.components?.join(', ') || 'N/A'}
Features: ${analysis.features?.join(', ') || 'N/A'}
Product Type: ${analysis.productType || 'Application'}
${previousContext}

YOUR MISSION:
Think EXECUTION. This needs to be realistic, actionable, and focused on getting to market FAST.

Break it into 3 phases over 90 days:
- MVP (Days 1-30): Core features only, scrappy but functional
- Beta (Days 31-60): Polish, early users, feedback loop
- Launch (Days 61-90): Go-to-market, scale preparation

Be SPECIFIC. "Build auth" is bad. "Implement email/password auth with Firebase" is good.

Structure as JSON:
{
  "phases": [
    {
      "name": "MVP",
      "duration": "Days 1-30",
      "goal": "Get core value prop working (1 sentence)",
      "milestones": [
        "Specific milestone 1",
        "Specific milestone 2",
        "Specific milestone 3"
      ],
      "deliverables": "What ships at end of this phase (1 sentence)"
    },
    {
      "name": "Beta",
      "duration": "Days 31-60",
      "goal": "Validate with real users (1 sentence)",
      "milestones": [
        "Specific milestone 1",
        "Specific milestone 2",
        "Specific milestone 3"
      ],
      "deliverables": "What ships at end of this phase (1 sentence)"
    },
    {
      "name": "Launch",
      "duration": "Days 61-90",
      "goal": "Go to market (1 sentence)",
      "milestones": [
        "Specific milestone 1",
        "Specific milestone 2",
        "Specific milestone 3"
      ],
      "deliverables": "What ships at end of this phase (1 sentence)"
    }
  ],
  "criticalPath": ["Must-have 1", "Must-have 2", "Must-have 3"],
  "risks": ["Risk 1 and mitigation", "Risk 2 and mitigation"],
  "success Metrics": ["Metric 1", "Metric 2", "Metric 3"]
}

CRITICAL: Respond ONLY with valid JSON. No markdown, no explanations.
Be realistic. Startups move fast but not magic fast. Show you understand what's achievable.

GENERATE ACTIONABLE ROADMAP JSON NOW:`

    console.log('Generating roadmap...')

    const roadmapResult = await client.generate(roadmapPrompt, {
      maxTokens: 2500,
      temperature: 0.5, // Lower temp for structured planning
    })

    console.log('Roadmap generated:', roadmapResult.substring(0, 150) + '...')

    // Parse JSON with fallback
    let roadmap
    try {
      roadmap = JSON.parse(roadmapResult)
    } catch {
      const jsonMatch = roadmapResult.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        try {
          roadmap = JSON.parse(jsonMatch[0])
        } catch {
          // Fallback structure
          roadmap = {
            phases: [
              {
                name: 'MVP',
                duration: 'Days 1-30',
                goal: 'Build core functionality',
                milestones: ['Core features', 'Basic UI', 'Initial testing'],
                deliverables: 'Working MVP',
              },
              {
                name: 'Beta',
                duration: 'Days 31-60',
                goal: 'User validation',
                milestones: ['Beta testing', 'Feedback collection', 'Iterations'],
                deliverables: 'Polished beta version',
              },
              {
                name: 'Launch',
                duration: 'Days 61-90',
                goal: 'Market release',
                milestones: ['Final polish', 'Marketing push', 'Launch'],
                deliverables: 'Public release',
              },
            ],
            criticalPath: ['Core features', 'User testing', 'Launch prep'],
            risks: ['Technical complexity', 'User adoption'],
            successMetrics: ['User signups', 'Engagement rate', 'Retention'],
            raw: roadmapResult,
          }
        }
      } else {
        roadmap = {
          phases: [],
          criticalPath: [],
          risks: [],
          successMetrics: [],
          raw: roadmapResult,
        }
      }
    }

    return NextResponse.json({
      success: true,
      roadmap,
      metadata: {
        model: getTextModelId(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Roadmap generation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate roadmap',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
