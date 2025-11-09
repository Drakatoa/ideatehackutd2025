/**
 * Diagram Generation API Endpoint
 * Converts analysis results into Mermaid diagram syntax with validation and retry logic
 *
 * POST /api/generate/diagram
 * Body:
 * - analysis: AnalysisResult object from /api/analyze
 * - type: optional diagram type preference ('flowchart' | 'sequence' | 'class')
 * - previousDiagram: optional previous diagram for expansion
 *
 * Returns:
 * - Mermaid diagram syntax
 * - Diagram type
 */

import { NextRequest, NextResponse } from 'next/server'
import { createNemotronClient, getTextModelId } from '@/lib/nemotron/client'
import type { AnalysisResult, DiagramGenerationResult } from '@/lib/nemotron/types'
import { validateMermaidSyntax, attemptAutoFix } from '@/lib/utils/mermaid-validator'

const MAX_RETRIES = 3

/**
 * Extracts Mermaid code from AI response
 * Handles delimiter-based extraction and fallback methods
 */
function extractMermaidCode(rawResponse: string): string {
  const MERMAID_DELIMITER = '===MERMAID_CODE==='
  let cleanedDiagram = ''

  // Look for the delimiter
  const delimiterIndex = rawResponse.indexOf(MERMAID_DELIMITER)

  if (delimiterIndex !== -1) {
    // Extract everything after the delimiter
    let rawAfterDelimiter = rawResponse.substring(delimiterIndex + MERMAID_DELIMITER.length).trim()

    // Remove any leading reasoning text before the actual diagram code
    const diagramKeywords = ['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'graph']
    let codeStartIndex = -1

    for (const keyword of diagramKeywords) {
      const index = rawAfterDelimiter.toLowerCase().indexOf(keyword.toLowerCase())
      if (index !== -1) {
        codeStartIndex = index
        break
      }
    }

    if (codeStartIndex > 0) {
      cleanedDiagram = rawAfterDelimiter.substring(codeStartIndex)
    } else if (codeStartIndex === 0) {
      cleanedDiagram = rawAfterDelimiter
    } else {
      throw new Error('No diagram keyword found after delimiter')
    }
  } else {
    // Fallback: try to find diagram code without delimiter
    cleanedDiagram = rawResponse.trim()

    // Remove markdown code blocks
    cleanedDiagram = cleanedDiagram.replace(/```(?:mermaid|md|text)?\n?/gi, '')
    cleanedDiagram = cleanedDiagram.replace(/```\n?$/g, '')
    cleanedDiagram = cleanedDiagram.replace(/^```/g, '')

    // Remove common introductory phrases
    cleanedDiagram = cleanedDiagram.replace(/^(okay|ok|here|here's|here is|let me|i'll|i will|sure|alright|alright,|yes,|yes|of course|certainly)[\s:,]+/gi, '')

    // Extract only the Mermaid code (look for diagram type keywords)
    const diagramKeywords = ['flowchart', 'sequenceDiagram', 'classDiagram', 'stateDiagram', 'erDiagram', 'graph']
    let keywordIndex = -1

    for (const keyword of diagramKeywords) {
      const index = cleanedDiagram.toLowerCase().indexOf(keyword.toLowerCase())
      if (index !== -1) {
        keywordIndex = index
        break
      }
    }

    if (keywordIndex > 0) {
      cleanedDiagram = cleanedDiagram.substring(keywordIndex)
    } else if (keywordIndex === -1) {
      throw new Error('No diagram keyword found in response')
    }
  }

  // Clean up the extracted code
  cleanedDiagram = cleanedDiagram.trim()
  cleanedDiagram = cleanedDiagram.replace(/^\s*\n+/, '').trim()

  // CRITICAL: Remove any natural language before "flowchart"
  // The AI sometimes puts text like "flowchart for their e-commerce..." 
  // We need to find the actual "flowchart TD" or "flowchart LR" line
  const flowchartPattern = /^(flowchart\s+(TD|LR|TB|BT|RL|LR))/i
  const lines = cleanedDiagram.split('\n')
  
  // Find the first line that starts with valid flowchart syntax
  let startIndex = -1
  for (let i = 0; i < lines.length; i++) {
    if (flowchartPattern.test(lines[i].trim())) {
      startIndex = i
      break
    }
  }
  
  if (startIndex > 0) {
    // Remove everything before the valid flowchart line
    cleanedDiagram = lines.slice(startIndex).join('\n').trim()
  } else if (startIndex === -1) {
    // No valid flowchart found, try to fix common issues
    // Look for lines containing "flowchart" and try to extract
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()
      if (line.toLowerCase().includes('flowchart')) {
        // Try to extract just the flowchart part
        const match = line.match(/(flowchart\s+(TD|LR|TB|BT|RL))/i)
        if (match) {
          // Replace the line with just the valid part
          lines[i] = match[0]
          cleanedDiagram = lines.slice(i).join('\n').trim()
          break
        }
      }
    }
  }

  // Remove trailing reasoning text and filter out invalid lines
  const reasoningIndicators = [
    /^[A-Z][a-z]+ [a-z]+ [a-z]+/, // Natural language like "Looking at the..."
    /^Features are/i,
    /^The user/i,
    /^This diagram/i,
    /^These should/i,
    /^But maybe/i,
    /^Then /i,
    /^Looking at/i,
    /^First,/i,
    /^The main/i,
    /^The key/i,
    /^I'll/i,
    /^I will/i,
    /^Note:/i,
    /^Important:/i,
  ]

  const finalLines = cleanedDiagram.split('\n')
  const validLines: string[] = []

  for (let i = 0; i < finalLines.length; i++) {
    const line = finalLines[i].trim()

    // Skip empty lines (but preserve for formatting)
    if (!line) {
      validLines.push('')
      continue
    }

    // Keep the flowchart declaration line
    if (i === 0 && flowchartPattern.test(line)) {
      validLines.push(line)
      continue
    }

    // Check if this line is valid Mermaid syntax
    const isValidMermaidLine =
      line.includes('-->') || // Connection
      line.includes('---') || // Connection variant
      line.match(/^[A-Za-z0-9_]+\[/) || // Node definition
      line.match(/^[A-Za-z0-9_]+\s*-->/) || // Node with connection
      line.match(/^(subgraph|end)\s/i) || // Subgraph
      line.match(/^style\s/i) || // Styling
      line.match(/^class\s/i) || // Class definition
      line.match(/^click\s/i) // Click event

    // Check if this line is reasoning text
    const isReasoningText = reasoningIndicators.some(pattern => pattern.test(line))

    // Only add valid Mermaid lines, skip reasoning
    if (isValidMermaidLine && !isReasoningText) {
      validLines.push(line)
    } else if (isReasoningText) {
      console.log(`Filtered out reasoning text: "${line.substring(0, 50)}..."`)
    }
  }

  cleanedDiagram = validLines.join('\n').trim()

  // Final check: ensure it starts with valid flowchart syntax
  if (!flowchartPattern.test(cleanedDiagram.split('\n')[0] || '')) {
    throw new Error('Extracted code does not start with valid flowchart syntax')
  }

  return cleanedDiagram
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { analysis, type, previousDiagram } = body as {
      analysis: AnalysisResult
      type?: 'flowchart' | 'sequence' | 'class'
      previousDiagram?: DiagramGenerationResult
    }

    if (!analysis) {
      return NextResponse.json(
        { success: false, error: 'Analysis data is required' },
        { status: 400 }
      )
    }

    const client = createNemotronClient()

    // Craft base prompt
    const previousContext = previousDiagram
      ? `\n\nPrevious diagram to expand:\n${previousDiagram.mermaid}\n`
      : ''

    // Condense analysis to key points
    const analysisSummary = analysis.rawAnalysis 
      ? analysis.rawAnalysis.substring(0, 1000) + (analysis.rawAnalysis.length > 1000 ? '...' : '')
      : `Product: ${analysis.productType || 'N/A'}\nFeatures: ${analysis.features?.join(', ') || 'N/A'}\nComponents: ${analysis.components?.join(', ') || 'N/A'}`

    const basePrompt = `You are a Mermaid flowchart code generator. Generate ONLY valid Mermaid flowchart syntax.

PRODUCT INFO:
${analysisSummary}
${previousContext}

STRICT OUTPUT FORMAT:
1. First, write "===MERMAID_CODE===" on its own line
2. On the VERY NEXT LINE, write exactly "flowchart TD" or "flowchart LR"
3. Then write the flowchart nodes and connections
4. Use ONLY valid Mermaid syntax - NO explanatory text, NO comments, NO reasoning

SYNTAX RULES:
- Every node needs an ID: nodeId[Label Text]
- Connect nodes with: nodeId1 --> nodeId2
- Node IDs must be camelCase with no spaces
- Labels go inside brackets: [Label Here]

CORRECT EXAMPLE:
===MERMAID_CODE===
flowchart TD
    start[User Opens App]
    browse[Browse Products]
    select[Select Item]
    checkout[Checkout Process]
    start --> browse
    browse --> select
    select --> checkout

WRONG - DO NOT DO THIS:
===MERMAID_CODE===
flowchart TD
Looking at the features, we need...
First, the user starts by...

Generate the flowchart now. Output MUST start with ===MERMAID_CODE=== followed by flowchart TD on the next line:`

    // Retry loop with validation
    let cleanedDiagram = ''
    let validationErrors: string[] = []

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      console.log(`Diagram generation attempt ${attempt + 1}/${MAX_RETRIES}`)

      // Add error feedback on retry
      let currentPrompt = basePrompt
      if (attempt > 0 && validationErrors.length > 0) {
        currentPrompt = `${basePrompt}\n\nPREVIOUS ERRORS TO FIX:\n${validationErrors.join('\n')}\n\nFix these and try again.`
      }

      // Generate diagram with low temperature for consistency
      const rawResponse = await client.generate(currentPrompt, {
        maxTokens: 1500,
        temperature: attempt === 0 ? 0.1 : 0.2 + (attempt * 0.05), // Start very low, increase minimally on retry
      })

      console.log(`Attempt ${attempt + 1} raw response:`, rawResponse.substring(0, 200) + '...')

      try {
        // Extract Mermaid code
        cleanedDiagram = extractMermaidCode(rawResponse)
        console.log(`Extracted diagram (${cleanedDiagram.length} chars):`, cleanedDiagram.substring(0, 150) + '...')

        // Validate syntax
        const validation = validateMermaidSyntax(cleanedDiagram)

        if (validation.isValid) {
          console.log('✓ Diagram validation passed')
          if (validation.warnings.length > 0) {
            console.warn('Warnings:', validation.warnings)
          }
          break // Success!
        } else {
          console.error('✗ Diagram validation failed:', validation.errors)
          validationErrors = validation.errors

          // Try auto-fix
          if (attempt === MAX_RETRIES - 1) {
            console.log('Last attempt - trying auto-fix...')
            const fixed = attemptAutoFix(cleanedDiagram)
            const fixedValidation = validateMermaidSyntax(fixed)
            if (fixedValidation.isValid) {
              console.log('✓ Auto-fix succeeded')
              cleanedDiagram = fixed
              break
            }
          }
        }
      } catch (extractError: any) {
        console.error(`Extraction error on attempt ${attempt + 1}:`, extractError.message)
        validationErrors = [extractError.message]

        if (attempt === MAX_RETRIES - 1) {
          throw new Error(`Failed to extract valid Mermaid code after ${MAX_RETRIES} attempts: ${extractError.message}`)
        }
      }
    }

    // Final validation check
    const finalValidation = validateMermaidSyntax(cleanedDiagram)
    if (!finalValidation.isValid) {
      console.error('Final diagram still invalid:', finalValidation.errors)
      return NextResponse.json(
        {
          success: false,
          error: 'Generated diagram failed validation',
          validationErrors: finalValidation.errors,
          rawDiagram: cleanedDiagram.substring(0, 500),
        },
        { status: 500 }
      )
    }

    // Detect diagram type
    let detectedType: 'flowchart' | 'sequence' | 'class' | 'state' | 'er' = 'flowchart'
    if (cleanedDiagram.startsWith('sequenceDiagram')) {
      detectedType = 'sequence'
    } else if (cleanedDiagram.startsWith('classDiagram')) {
      detectedType = 'class'
    } else if (cleanedDiagram.startsWith('stateDiagram')) {
      detectedType = 'state'
    } else if (cleanedDiagram.startsWith('erDiagram')) {
      detectedType = 'er'
    }

    return NextResponse.json({
      success: true,
      diagram: {
        mermaid: cleanedDiagram,
        type: detectedType,
      },
      metadata: {
        model: getTextModelId(),
        timestamp: new Date().toISOString(),
      },
    })
  } catch (error: any) {
    console.error('Diagram generation error:', error)

    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to generate diagram',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    )
  }
}
