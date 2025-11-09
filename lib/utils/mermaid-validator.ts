/**
 * Mermaid Diagram Syntax Validator
 * Validates Mermaid diagram syntax before rendering
 */

export interface ValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Validates basic Mermaid diagram syntax
 * Returns validation result with errors and warnings
 */
export function validateMermaidSyntax(mermaidCode: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []

  // Basic validation
  if (!mermaidCode || mermaidCode.trim() === '') {
    errors.push('Mermaid code is empty')
    return { isValid: false, errors, warnings }
  }

  const lines = mermaidCode.split('\n').map(l => l.trim()).filter(l => l !== '')

  // Check for valid diagram type
  const validDiagramTypes = [
    'flowchart', 'graph', 'sequenceDiagram', 'classDiagram',
    'stateDiagram', 'erDiagram', 'gantt', 'pie', 'gitGraph'
  ]

  const firstLine = lines[0].toLowerCase()
  const hasValidType = validDiagramTypes.some(type => firstLine.startsWith(type.toLowerCase()))

  if (!hasValidType) {
    errors.push(`Invalid diagram type. First line must start with one of: ${validDiagramTypes.join(', ')}`)
  }

  // Check for common syntax errors
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    // Skip the diagram type line
    if (i === 0) continue

    // Check for invalid characters at start of line that indicate reasoning text
    if (/^[A-Z][a-z]+ [a-z]+/.test(line) &&
        !line.includes('[') &&
        !line.includes('(') &&
        !line.includes('{') &&
        !line.includes('-->') &&
        !line.includes('->') &&
        !line.includes('==')) {
      warnings.push(`Line ${i + 1} looks like reasoning text, not diagram syntax: "${line.substring(0, 50)}..."`)
    }

    // Check for flowchart-specific syntax errors
    if (firstLine.startsWith('flowchart') || firstLine.startsWith('graph')) {
      // Invalid node syntax: [text] should be NodeID[text]
      if (/^\s*\[[^\]]+\]/.test(line) && !line.includes('-->')) {
        errors.push(`Line ${i + 1}: Invalid node syntax. Nodes must have an ID: "NodeID[Label]" not "[Label]"`)
      }

      // Check for nodes with spaces in IDs (should use quotes or underscores)
      const nodeMatch = line.match(/^([A-Za-z0-9_ ]+)(\[|\(|\{)/)
      if (nodeMatch) {
        const nodeId = nodeMatch[1].trim()
        if (nodeId.includes(' ') && !nodeId.includes('"')) {
          warnings.push(`Line ${i + 1}: Node ID contains spaces. Consider using underscores or quotes: "${nodeId}"`)
        }
      }
    }
  }

  // Check for minimum content (at least diagram type + 1 line)
  if (lines.length < 2) {
    warnings.push('Diagram only has diagram type, no content')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Attempts to fix common Mermaid syntax errors
 * Returns fixed diagram code
 */
export function attemptAutoFix(mermaidCode: string): string {
  let fixed = mermaidCode

  // Fix common issues
  const lines = fixed.split('\n')
  const fixedLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]

    // Skip empty lines
    if (line.trim() === '') {
      fixedLines.push(line)
      continue
    }

    // Fix invalid node syntax like [Label] --> [Label2]
    // Should be: NodeID[Label] --> NodeID2[Label2]
    if (line.includes('[') && line.includes(']') && line.includes('-->')) {
      // Detect pattern: [Something] --> [SomethingElse]
      const invalidPattern = /\[([^\]]+)\]\s*-->\s*\[([^\]]+)\]/g
      let counter = 1
      line = line.replace(invalidPattern, (match, label1, label2) => {
        const nodeId1 = `Node${counter++}`
        const nodeId2 = `Node${counter++}`
        return `${nodeId1}[${label1}] --> ${nodeId2}[${label2}]`
      })
    }

    fixedLines.push(line)
  }

  return fixedLines.join('\n')
}
