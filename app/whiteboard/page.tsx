"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import {
  Sparkles,
  Upload,
  Wand2,
  Save,
  Home,
  Pencil,
  Square,
  Circle,
  Type,
  StickyNote,
  MousePointer,
  Eraser,
  Trash2,
  Download,
  Undo2,
  Redo2,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Loader2,
  Edit2,
  RefreshCw,
  X,
  FolderOpen,
} from "lucide-react"
import { getStroke } from "perfect-freehand"
import mermaid from "mermaid"
import type { AnalysisResult, DiagramGenerationResult, PitchResult, CompetitiveAnalysisResult } from "@/lib/nemotron/types"
import { AuthButton } from "@/components/auth-button"
import { CanvasLibrary } from "@/components/canvas-library"
import { toast } from "sonner"

type Tool = "select" | "pencil" | "rectangle" | "circle" | "text" | "sticky" | "eraser"

interface DrawnElement {
  id: string
  type: "path" | "rectangle" | "circle" | "text" | "sticky" | "image"
  points?: { x: number; y: number }[]
  x?: number
  y?: number
  width?: number
  height?: number
  text?: string
  color: string
  imageSrc?: string
  originalWidth?: number
  originalHeight?: number
  fontSize?: number
}

interface TextInput {
  id: string
  type: "sticky" | "text"
  x: number
  y: number
  width: number
  height: number
  text: string
  color: string
}

export default function WhiteboardPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tool, setTool] = useState<Tool>("select")
  const [isDrawing, setIsDrawing] = useState(false)
  const [elements, setElements] = useState<DrawnElement[]>([])
  const [currentPath, setCurrentPath] = useState<{ x: number; y: number }[]>([])
  const [selectedColor, setSelectedColor] = useState("#8b5cf6")
  const [showUploadModal, setShowUploadModal] = useState(false)

  const [history, setHistory] = useState<DrawnElement[][]>([[]])
  const [historyStep, setHistoryStep] = useState(0)

  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [previewShape, setPreviewShape] = useState<{
    type: "rectangle" | "circle"
    x: number
    y: number
    width: number
    height: number
  } | null>(null)

  const [activeTextInput, setActiveTextInput] = useState<TextInput | null>(null)
  const [editingElement, setEditingElement] = useState<DrawnElement | null>(null) // Store original element when editing
  const [lastClick, setLastClick] = useState<{ time: number; elementId: string | null } | null>(null) // Track clicks for double-click detection

  const [selectedElement, setSelectedElement] = useState<string | null>(null)
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number } | null>(null)

  const [hasInteracted, setHasInteracted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [resizeHandle, setResizeHandle] = useState<"nw" | "ne" | "sw" | "se" | null>(null)
  const [resizeStart, setResizeStart] = useState<{ x: number; y: number; width: number; height: number; fontSize?: number; mouseX?: number; mouseY?: number } | null>(null)

  // AI Generation State
  const [description, setDescription] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState("")
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null)
  const [diagram, setDiagram] = useState<DiagramGenerationResult | null>(null)
  const [diagramIterations, setDiagramIterations] = useState<DiagramGenerationResult[]>([])
  const [isExpandingDiagram, setIsExpandingDiagram] = useState(false)
  const [currentDiagramIndex, setCurrentDiagramIndex] = useState(0)
  const [showDiagramModal, setShowDiagramModal] = useState(false)
  const [pitch, setPitch] = useState<PitchResult | null>(null)
  const [competitive, setCompetitive] = useState<CompetitiveAnalysisResult | null>(null)
  const [roadmap, setRoadmap] = useState<any>(null)
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    diagram: true,
    pitch: true,
    competitive: false,
    roadmap: false,
  })
  const mermaidRef = useRef<HTMLDivElement>(null)
  const mermaidModalRef = useRef<HTMLDivElement>(null)
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map())
  const iterationRefs = useRef<Map<number, HTMLDivElement>>(new Map())

  const colors = [
    { name: "Purple", value: "#8b5cf6" },
    { name: "Lavender", value: "#a78bfa" },
    { name: "Blue", value: "#3b82f6" },
    { name: "Sky", value: "#0ea5e9" },
    { name: "Pink", value: "#ec4899" },
    { name: "Rose", value: "#f43f5e" },
    { name: "Gold", value: "#f59e0b" },
    { name: "Yellow", value: "#eab308" },
    { name: "Green", value: "#10b981" },
    { name: "Emerald", value: "#059669" },
    { name: "Midnight", value: "#1e293b" },
    { name: "Silver", value: "#94a3b8" },
  ]

  useEffect(() => {
    // Helper function to load canvas from database
    const loadCanvasFromDatabase = (canvasId: string, showToast = true) => {
      return fetch(`/api/canvas/load?id=${canvasId}`)
        .then((res) => {
          if (!res.ok) {
            return res.json().then(err => {
              throw new Error(err.error || 'Failed to load canvas')
            })
          }
          return res.json()
        })
        .then((data) => {
          if (data.canvas && data.canvas.elements) {
            setElements(data.canvas.elements)
            // Restore AI content
            if (data.canvas.description) setDescription(data.canvas.description)
            if (data.canvas.analysis) setAnalysis(data.canvas.analysis)
            if (data.canvas.diagram) setDiagram(data.canvas.diagram)
            if (data.canvas.diagram_iterations) setDiagramIterations(data.canvas.diagram_iterations)
            if (data.canvas.pitch) setPitch(data.canvas.pitch)
            if (data.canvas.competitive) setCompetitive(data.canvas.competitive)
            if (data.canvas.roadmap) setRoadmap(data.canvas.roadmap)
            // Store canvas ID and name for resaving
            sessionStorage.setItem('currentCanvasId', data.canvas.id)
            sessionStorage.setItem('currentCanvasName', data.canvas.name)
            if (showToast) {
              toast.success(`Canvas "${data.canvas.name}" loaded!`)
            }
          } else {
            throw new Error('Canvas data is missing')
          }
        })
        .catch((error) => {
          console.error('Error loading canvas:', error)
          toast.error('Failed to load canvas', { description: error.message })
          // Clear invalid canvas ID from sessionStorage
          sessionStorage.removeItem('currentCanvasId')
          sessionStorage.removeItem('currentCanvasName')
        })
    }

    // Check if we need to load a canvas from gallery
    const loadCanvasId = sessionStorage.getItem('loadCanvasId')
    if (loadCanvasId) {
      sessionStorage.removeItem('loadCanvasId')
      loadCanvasFromDatabase(loadCanvasId, true)
      return // Don't load from localStorage if loading from database
    }

    // Check if we have a current canvas ID (user navigated back to whiteboard)
    const currentCanvasId = sessionStorage.getItem('currentCanvasId')
    if (currentCanvasId) {
      // Reload the last canvas from database instead of localStorage
      loadCanvasFromDatabase(currentCanvasId, false)
      return // Don't load from localStorage if loading from database
    }

    // Clear current canvas info if starting fresh (not loading from database)
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('currentCanvasId')
      sessionStorage.removeItem('currentCanvasName')
    }

    // Otherwise, load from localStorage
    const savedElements = localStorage.getItem("aid8-whiteboard-elements")
    const savedHistory = localStorage.getItem("aid8-whiteboard-history")
    const savedHistoryStep = localStorage.getItem("aid8-whiteboard-history-step")
    const savedHasInteracted = localStorage.getItem("aid8-whiteboard-has-interacted")

    if (savedElements) {
      try {
        const parsedElements = JSON.parse(savedElements)
        setElements(parsedElements)
      } catch (e) {
        console.error("Failed to load saved elements:", e)
      }
    }

    if (savedHistory) {
      try {
        const parsedHistory = JSON.parse(savedHistory)
        setHistory(parsedHistory)
      } catch (e) {
        console.error("Failed to load saved history:", e)
      }
    }

    if (savedHistoryStep) {
      try {
        const parsedStep = JSON.parse(savedHistoryStep)
        setHistoryStep(parsedStep)
      } catch (e) {
        console.error("Failed to load saved history step:", e)
      }
    }

    if (savedHasInteracted) {
      setHasInteracted(savedHasInteracted === "true")
    }
  }, [])

  useEffect(() => {
    if (elements.length > 0 || hasInteracted) {
      localStorage.setItem("aid8-whiteboard-elements", JSON.stringify(elements))
    }
  }, [elements, hasInteracted])

  // NOTE: Disabled localStorage for history due to quota limits with images
  // History (undo/redo) is kept in memory only during the session
  // useEffect(() => {
  //   if (history.length > 1) {
  //     localStorage.setItem("aid8-whiteboard-history", JSON.stringify(history))
  //     localStorage.setItem("aid8-whiteboard-history-step", JSON.stringify(historyStep))
  //   }
  // }, [history, historyStep])

  useEffect(() => {
    localStorage.setItem("aid8-whiteboard-has-interacted", hasInteracted.toString())
  }, [hasInteracted])

  const getSvgPathFromStroke = (stroke: number[][]) => {
    if (!stroke.length) return ""

    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length]
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2)
        return acc
      },
      ["M", ...stroke[0], "Q"],
    )

    d.push("Z")
    return d.join(" ")
  }

  const isPointInElement = (x: number, y: number, element: DrawnElement, ctx?: CanvasRenderingContext2D): boolean => {
    if (element.type === "path" && element.points) {
      return element.points.some((point) => Math.hypot(point.x - x, point.y - y) < 10)
    } else if (element.type === "rectangle" && element.x && element.y && element.width && element.height) {
      return x >= element.x && x <= element.x + element.width && y >= element.y && y <= element.y + element.height
    } else if (element.type === "circle" && element.x && element.y && element.width) {
      return Math.hypot(element.x - x, element.y - y) < element.width / 2
    } else if (element.type === "sticky" && element.x && element.y) {
      return x >= element.x && x <= element.x + 180 && y >= element.y && y <= element.y + 180
    } else if (element.type === "text" && element.x && element.y && element.text && ctx) {
      const fontSize = element.fontSize || 18
      ctx.font = `bold ${fontSize}px Inter`
      const metrics = ctx.measureText(element.text)
      return x >= element.x && x <= element.x + metrics.width && y >= element.y - fontSize && y <= element.y
    } else if (element.type === "image" && element.x !== undefined && element.y !== undefined && element.width && element.height) {
      return x >= element.x && x <= element.x + element.width && y >= element.y && y <= element.y + element.height
    }
    return false
  }

  // Helper function to draw resize handles
  const drawResizeHandles = (ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) => {
    const handleSize = 20 // Larger visual handles for better visibility and easier grabbing
    const handles = [
      { x: x, y: y }, // NW
      { x: x + width, y: y }, // NE
      { x: x, y: y + height }, // SW
      { x: x + width, y: y + height }, // SE
    ]

    // Draw handles with better visibility
    handles.forEach((handle) => {
      // Outer white ring for contrast
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, handleSize / 2 + 2, 0, Math.PI * 2)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
      
      // Blue fill
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, handleSize / 2, 0, Math.PI * 2)
      ctx.fillStyle = "#3b82f6"
      ctx.fill()
      
      // Inner white dot for better visibility
      ctx.beginPath()
      ctx.arc(handle.x, handle.y, handleSize / 4, 0, Math.PI * 2)
      ctx.fillStyle = "#ffffff"
      ctx.fill()
    })
  }

  // Get element bounding box in a consistent format
  const getElementBounds = (element: DrawnElement, ctx?: CanvasRenderingContext2D): { x: number; y: number; width: number; height: number } | null => {
    if (element.type === "path") {
      return null
    }

    let elementX = element.x
    let elementY = element.y
    let elementWidth = element.width
    let elementHeight = element.height

    // Special handling for circles (x, y is center, width is diameter)
    if (element.type === "circle" && elementX !== undefined && elementY !== undefined && elementWidth) {
      const radius = elementWidth / 2
      return {
        x: elementX - radius,
        y: elementY - radius,
        width: elementWidth,
        height: elementWidth,
      }
    }
    // Special handling for sticky notes (default size 180x180)
    else if (element.type === "sticky") {
      return {
        x: elementX || 0,
        y: elementY || 0,
        width: elementWidth || 180,
        height: elementHeight || 180,
      }
    }
    // Special handling for text boxes (calculate width/height if not stored)
    else if (element.type === "text" && elementX !== undefined && elementY !== undefined && element.text && ctx) {
      const fontSize = element.fontSize || 18
      ctx.font = `bold ${fontSize}px Inter`
      const metrics = ctx.measureText(element.text)
      const textWidth = element.width || metrics.width
      const textHeight = element.height || 24
      // Text boxes are drawn at baseline, but selection box is above
      return {
        x: elementX,
        y: elementY - fontSize,
        width: textWidth,
        height: textHeight,
      }
    }
    // Default handling for rectangles and images
    else if (elementX !== undefined && elementY !== undefined && elementWidth && elementHeight) {
      return {
        x: elementX,
        y: elementY,
        width: elementWidth,
        height: elementHeight,
      }
    }

    return null
  }

  const getResizeHandle = (x: number, y: number, element: DrawnElement, ctx?: CanvasRenderingContext2D): "nw" | "ne" | "sw" | "se" | null => {
    // Support resizing for images, rectangles, circles, sticky notes, and text boxes
    if (element.type === "path") {
      return null // Paths cannot be resized
    }

    const bounds = getElementBounds(element, ctx)
    if (!bounds) {
      return null
    }

    // Use rectangular hit detection instead of circular - much more reliable
    const handleSize = 32 // Large hit area for easy grabbing
    const halfHandle = handleSize / 2

    // Define handle regions as rectangles
    const handles: Array<{ pos: "nw" | "ne" | "sw" | "se"; minX: number; maxX: number; minY: number; maxY: number }> = [
      {
        pos: "nw",
        minX: bounds.x - halfHandle,
        maxX: bounds.x + halfHandle,
        minY: bounds.y - halfHandle,
        maxY: bounds.y + halfHandle,
      },
      {
        pos: "ne",
        minX: bounds.x + bounds.width - halfHandle,
        maxX: bounds.x + bounds.width + halfHandle,
        minY: bounds.y - halfHandle,
        maxY: bounds.y + halfHandle,
      },
      {
        pos: "sw",
        minX: bounds.x - halfHandle,
        maxX: bounds.x + halfHandle,
        minY: bounds.y + bounds.height - halfHandle,
        maxY: bounds.y + bounds.height + halfHandle,
      },
      {
        pos: "se",
        minX: bounds.x + bounds.width - halfHandle,
        maxX: bounds.x + bounds.width + halfHandle,
        minY: bounds.y + bounds.height - halfHandle,
        maxY: bounds.y + bounds.height + halfHandle,
      },
    ]

    // Check if point is within any handle's rectangular bounds
    for (const handle of handles) {
      if (x >= handle.minX && x <= handle.maxX && y >= handle.minY && y <= handle.maxY) {
        return handle.pos
      }
    }

    return null
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    canvas.width = canvas.offsetWidth
    canvas.height = canvas.offsetHeight

    ctx.clearRect(0, 0, canvas.width, canvas.height)

    elements.forEach((element) => {
      const isSelected = selectedElement === element.id

      ctx.strokeStyle = element.color
      ctx.fillStyle = element.color
      ctx.lineWidth = isSelected ? 4 : 3
      ctx.lineCap = "round"
      ctx.lineJoin = "round"

      if (element.type === "path" && element.points) {
        const stroke = getStroke(element.points, {
          size: 4,
          thinning: 0.5,
          smoothing: 0.5,
          streamline: 0.5,
        })

        const pathData = getSvgPathFromStroke(stroke)
        const path = new Path2D(pathData)
        ctx.fillStyle = element.color
        ctx.fill(path)

        if (isSelected && element.points.length > 0) {
          const xs = element.points.map((p) => p.x)
          const ys = element.points.map((p) => p.y)
          const minX = Math.min(...xs)
          const maxX = Math.max(...xs)
          const minY = Math.min(...ys)
          const maxY = Math.max(...ys)
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(minX - 5, minY - 5, maxX - minX + 10, maxY - minY + 10)
          ctx.setLineDash([])
        }
      } else if (element.type === "rectangle" && element.x && element.y && element.width && element.height) {
        ctx.fillStyle = element.color + "40"
        ctx.fillRect(element.x, element.y, element.width, element.height)
        ctx.strokeRect(element.x, element.y, element.width, element.height)

        if (isSelected) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(element.x - 3, element.y - 3, element.width + 6, element.height + 6)
          ctx.setLineDash([])

          // Draw resize handles
          drawResizeHandles(ctx, element.x, element.y, element.width, element.height)
        }
      } else if (element.type === "circle" && element.x && element.y && element.width) {
        ctx.beginPath()
        ctx.arc(element.x, element.y, element.width / 2, 0, Math.PI * 2)
        ctx.fillStyle = element.color + "40"
        ctx.fill()
        ctx.stroke()

        if (isSelected) {
          ctx.beginPath()
          ctx.arc(element.x, element.y, element.width / 2 + 5, 0, Math.PI * 2)
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.stroke()
          ctx.setLineDash([])

          // Draw resize handles (using bounding box for circles)
          const radius = element.width / 2
          const height = element.width // For circles, height equals width
          drawResizeHandles(ctx, element.x - radius, element.y - radius, element.width, height)
        }
      } else if (element.type === "sticky" && element.x && element.y && element.text) {
        const width = element.width || 180
        const height = element.height || 180
        ctx.fillStyle = element.color + "dd"
        ctx.fillRect(element.x, element.y, width, height)
        ctx.strokeStyle = element.color
        ctx.lineWidth = 2
        ctx.strokeRect(element.x, element.y, width, height)

        ctx.fillStyle = "#1a1a1a"
        ctx.font = "14px Inter"
        const lines = wrapText(ctx, element.text, width - 30)
        lines.forEach((line, i) => {
          ctx.fillText(line, element.x + 15, element.y + 30 + i * 20, width - 30)
        })

        if (isSelected) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(element.x - 3, element.y - 3, width + 6, height + 6)
          ctx.setLineDash([])

          // Draw resize handles
          drawResizeHandles(ctx, element.x, element.y, width, height)
        }
      } else if (element.type === "text" && element.x && element.y && element.text) {
        ctx.fillStyle = element.color
        const fontSize = element.fontSize || 18
        ctx.font = `bold ${fontSize}px Inter`
        ctx.fillText(element.text, element.x, element.y)

        if (isSelected) {
          const metrics = ctx.measureText(element.text)
          const textWidth = element.width || metrics.width
          const textHeight = element.height || 24
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(element.x - 3, element.y - fontSize, textWidth + 6, textHeight)
          ctx.setLineDash([])

          // Draw resize handles
          drawResizeHandles(ctx, element.x, element.y - fontSize, textWidth, textHeight)
        }
      } else if (element.type === "image" && element.x !== undefined && element.y !== undefined && element.width && element.height && element.imageSrc) {
        // Draw image element
        let img = imageCacheRef.current.get(element.id)
        if (!img) {
          img = new Image()
          img.onload = () => {
            // Force re-render by updating elements array reference
            setElements((prev) => [...prev])
          }
          img.src = element.imageSrc
          imageCacheRef.current.set(element.id, img)
        }

        if (img.complete && img.naturalWidth > 0) {
          ctx.drawImage(img, element.x, element.y, element.width, element.height)
        } else if (!img.complete) {
          // Show placeholder while loading
          ctx.fillStyle = "#f3f4f6"
          ctx.fillRect(element.x, element.y, element.width, element.height)
          ctx.strokeStyle = "#d1d5db"
          ctx.lineWidth = 1
          ctx.strokeRect(element.x, element.y, element.width, element.height)
          ctx.fillStyle = "#9ca3af"
          ctx.font = "12px Inter"
          ctx.textAlign = "center"
          ctx.fillText("Loading...", element.x + element.width / 2, element.y + element.height / 2)
        }

        // Draw selection border and resize handles
        if (isSelected) {
          ctx.strokeStyle = "#3b82f6"
          ctx.lineWidth = 2
          ctx.setLineDash([5, 5])
          ctx.strokeRect(element.x - 3, element.y - 3, element.width + 6, element.height + 6)
          ctx.setLineDash([])

          // Draw resize handles (use same size as other elements)
          drawResizeHandles(ctx, element.x, element.y, element.width, element.height)
        }
      }
    })

    if (isDrawing && currentPath.length > 0 && tool === "pencil") {
      const stroke = getStroke(currentPath, {
        size: 4,
        thinning: 0.5,
        smoothing: 0.5,
        streamline: 0.5,
      })

      const pathData = getSvgPathFromStroke(stroke)
      const path = new Path2D(pathData)
      ctx.fillStyle = selectedColor
      ctx.fill(path)
    }

    if (previewShape) {
      ctx.strokeStyle = selectedColor
      ctx.fillStyle = selectedColor + "40"
      ctx.lineWidth = 3

      if (previewShape.type === "rectangle") {
        ctx.fillRect(previewShape.x, previewShape.y, previewShape.width, previewShape.height)
        ctx.strokeRect(previewShape.x, previewShape.y, previewShape.width, previewShape.height)
      } else if (previewShape.type === "circle") {
        ctx.beginPath()
        ctx.arc(previewShape.x, previewShape.y, previewShape.width / 2, 0, Math.PI * 2)
        ctx.fill()
        ctx.stroke()
      }
    }
  }, [elements, currentPath, isDrawing, tool, selectedColor, previewShape, selectedElement])

  const wrapText = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] => {
    const words = text.split(" ")
    const lines: string[] = []
    let currentLine = ""

    words.forEach((word) => {
      const testLine = currentLine + (currentLine ? " " : "") + word
      const metrics = ctx.measureText(testLine)

      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine)
        currentLine = word
      } else {
        currentLine = testLine
      }
    })

    if (currentLine) {
      lines.push(currentLine)
    }

    return lines
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "z") {
        e.preventDefault()
        handleUndo()
      } else if ((e.ctrlKey || e.metaKey) && e.key === "y") {
        e.preventDefault()
        handleRedo()
      } else if (e.key === "Delete" || e.key === "Backspace") {
        // Delete selected element with Delete or Backspace key
        if (selectedElement && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
          e.preventDefault()
          // Delete selected element inline to avoid dependency issues
          const elementToDelete = elements.find((el) => el.id === selectedElement)
          if (elementToDelete) {
            if (elementToDelete.type === "image") {
              imageCacheRef.current.delete(selectedElement)
            }
            const newElements = elements.filter((el) => el.id !== selectedElement)
            saveToHistory(newElements)
            setSelectedElement(null)
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [historyStep, history, selectedElement, elements])

  const saveToHistory = (newElements: DrawnElement[]) => {
    const newHistory = history.slice(0, historyStep + 1)
    newHistory.push(newElements)
    setHistory(newHistory)
    setHistoryStep(newHistory.length - 1)
    setElements(newElements)
  }

  const handleUndo = () => {
    if (historyStep > 0) {
      const newStep = historyStep - 1
      setHistoryStep(newStep)
      setElements(history[newStep])
    }
  }

  const handleRedo = () => {
    if (historyStep < history.length - 1) {
      const newStep = historyStep + 1
      setHistoryStep(newStep)
      setElements(history[newStep])
    }
  }

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!hasInteracted) {
      setHasInteracted(true)
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const ctx = canvas.getContext("2d")

    if (tool === "select") {
      const clickedElement = elements.find((el) => isPointInElement(x, y, el, ctx || undefined))

      // Check if clicking on resize handle (supports all element types except paths)
      if (clickedElement && clickedElement.type !== "path") {
        const handle = getResizeHandle(x, y, clickedElement, ctx || undefined)
        if (handle) {
          setResizeHandle(handle)
          // Use the new getElementBounds function for consistent bounds calculation
          const bounds = getElementBounds(clickedElement, ctx || undefined)
          if (bounds) {
            setResizeStart({
              x: bounds.x,
              y: bounds.y,
              width: bounds.width,
              height: bounds.height,
              fontSize: clickedElement.type === "text" ? (clickedElement.fontSize || 18) : undefined,
              mouseX: x, // Store initial mouse position for accurate delta calculation
              mouseY: y,
            })
            setSelectedElement(clickedElement.id)
            setIsDrawing(true)
            return
          }
        }
      }

      if (clickedElement) {
        // Check for double-click on text or sticky note
        const now = Date.now()
        const isDoubleClick = lastClick && 
          lastClick.elementId === clickedElement.id && 
          (now - lastClick.time) < 300 // 300ms double-click window
        
        if (isDoubleClick && (clickedElement.type === "text" || clickedElement.type === "sticky") && clickedElement.text !== undefined) {
          // Double-click detected - enter edit mode
          const canvas = canvasRef.current
          const ctx = canvas?.getContext("2d")
          
          if (clickedElement.type === "text") {
            // For text boxes, adjust Y position (text is drawn at baseline)
            const fontSize = clickedElement.fontSize || 18
            setActiveTextInput({
              id: clickedElement.id,
              type: "text",
              x: clickedElement.x || 0,
              y: clickedElement.y || 0,
              width: clickedElement.width || 300,
              height: clickedElement.height || 24,
              text: clickedElement.text,
              color: clickedElement.color,
            })
          } else if (clickedElement.type === "sticky") {
            setActiveTextInput({
              id: clickedElement.id,
              type: "sticky",
              x: clickedElement.x || 0,
              y: clickedElement.y || 0,
              width: clickedElement.width || 180,
              height: clickedElement.height || 180,
              text: clickedElement.text,
              color: clickedElement.color,
            })
          }
          
          // Store the original element for restoration if editing is canceled
          setEditingElement(clickedElement)
          // Remove the element from the elements array temporarily while editing
          const newElements = elements.filter((el) => el.id !== clickedElement.id)
          setElements(newElements)
          setSelectedElement(null)
          setLastClick(null) // Reset double-click tracking
          return
        }
        
        // Single click - track for potential double-click and proceed with normal selection/dragging
        setLastClick({ time: now, elementId: clickedElement.id })
        setSelectedElement(clickedElement.id)
        setIsDrawing(true)
        // Calculate offset from element's origin
        if (clickedElement.type === "path" && clickedElement.points && clickedElement.points.length > 0) {
          const xs = clickedElement.points.map((p) => p.x)
          const ys = clickedElement.points.map((p) => p.y)
          const minX = Math.min(...xs)
          const minY = Math.min(...ys)
          setDragOffset({ x: x - minX, y: y - minY })
        } else if (clickedElement.x !== undefined && clickedElement.y !== undefined) {
          setDragOffset({ x: x - clickedElement.x, y: y - clickedElement.y })
        }
      } else {
        setSelectedElement(null)
        setLastClick(null) // Reset double-click tracking when clicking empty space
      }
      return
    }

    if (tool === "eraser") {
      setIsDrawing(true)
      setCurrentPath([{ x, y }])
      return
    }

    if (tool === "pencil" || tool === "rectangle" || tool === "circle") {
      setIsDrawing(true)
    }

    if (tool === "pencil") {
      setCurrentPath([{ x, y }])
    } else if (tool === "rectangle" || tool === "circle") {
      setStartPoint({ x, y })
    } else if (tool === "sticky") {
      setActiveTextInput({
        id: Date.now().toString(),
        type: "sticky",
        x,
        y,
        width: 180,
        height: 180,
        text: "",
        color: selectedColor,
      })
    } else if (tool === "text") {
      setActiveTextInput({
        id: Date.now().toString(),
        type: "text",
        x,
        y,
        width: 300,
        height: 40,
        text: "",
        color: selectedColor,
      })
    }
  }

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return

    const canvas = canvasRef.current
    if (!canvas) return

    const rect = canvas.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const ctx = canvas.getContext("2d")

    if (tool === "select" && selectedElement) {
      // Handle resize with improved logic
      if (resizeHandle && resizeStart) {
        const element = elements.find((el) => el.id === selectedElement)
        if (element && element.type !== "path") {
          // Calculate delta from initial mouse position (more accurate than calculating from handle position)
          const initialMouseX = resizeStart.mouseX ?? (resizeStart.x + (resizeHandle === "ne" || resizeHandle === "se" ? resizeStart.width : 0))
          const initialMouseY = resizeStart.mouseY ?? (resizeStart.y + (resizeHandle === "sw" || resizeHandle === "se" ? resizeStart.height : 0))
          const deltaX = x - initialMouseX
          const deltaY = y - initialMouseY

          // Determine if we should preserve aspect ratio (images and circles)
          const preserveAspectRatio = element.type === "image" || element.type === "circle"
          const aspectRatio = element.type === "circle" 
            ? 1 
            : (preserveAspectRatio && element.originalWidth && element.originalHeight
              ? element.originalWidth / element.originalHeight
              : 1)

          // Calculate new dimensions based on handle position
          let newWidth = resizeStart.width
          let newHeight = resizeStart.height
          let newX = resizeStart.x
          let newY = resizeStart.y

          // Calculate width and height changes based on which handle is being dragged
          switch (resizeHandle) {
            case "se": // Southeast - bottom-right
              newWidth = resizeStart.width + deltaX
              newHeight = preserveAspectRatio ? newWidth / aspectRatio : resizeStart.height + deltaY
              break
            case "sw": // Southwest - bottom-left
              newWidth = resizeStart.width - deltaX
              newHeight = preserveAspectRatio ? newWidth / aspectRatio : resizeStart.height + deltaY
              newX = resizeStart.x + deltaX
              if (preserveAspectRatio) {
                newY = resizeStart.y + resizeStart.height - newHeight
              }
              break
            case "ne": // Northeast - top-right
              newWidth = resizeStart.width + deltaX
              newHeight = preserveAspectRatio ? newWidth / aspectRatio : resizeStart.height - deltaY
              if (preserveAspectRatio) {
                newY = resizeStart.y + resizeStart.height - newHeight
              } else {
                newY = resizeStart.y + deltaY
              }
              break
            case "nw": // Northwest - top-left
              newWidth = resizeStart.width - deltaX
              newHeight = preserveAspectRatio ? newWidth / aspectRatio : resizeStart.height - deltaY
              newX = resizeStart.x + deltaX
              if (preserveAspectRatio) {
                newY = resizeStart.y + resizeStart.height - newHeight
              } else {
                newY = resizeStart.y + deltaY
              }
              break
          }

          // Ensure minimum size
          const minSize = 50
          if (newWidth < minSize) {
            const widthDiff = minSize - newWidth
            newWidth = minSize
            if (preserveAspectRatio) {
              newHeight = minSize / aspectRatio
            }
            // Adjust position to compensate for minimum size
            if (resizeHandle === "nw" || resizeHandle === "sw") {
              newX -= widthDiff
            }
          }
          if (newHeight < minSize) {
            const heightDiff = minSize - newHeight
            newHeight = minSize
            if (preserveAspectRatio) {
              newWidth = minSize * aspectRatio
            }
            // Adjust position to compensate for minimum size
            if (resizeHandle === "nw" || resizeHandle === "ne") {
              newY -= heightDiff
            }
          }

          // Update element with new dimensions
          const newElements = elements.map((el) => {
            if (el.id === selectedElement) {
              // For circles, update both center position and radius
              if (el.type === "circle") {
                const radius = newWidth / 2
                return { ...el, x: newX + radius, y: newY + radius, width: newWidth }
              }
              // For text boxes, adjust Y position back and scale font size
              else if (el.type === "text") {
                // Calculate new font size based on width ratio
                const widthRatio = resizeStart.width > 0 ? newWidth / resizeStart.width : 1
                const originalFontSize = resizeStart.fontSize || el.fontSize || 18
                const newFontSize = Math.max(8, Math.min(72, originalFontSize * widthRatio)) // Clamp between 8px and 72px
                return { ...el, x: newX, y: newY + newFontSize, width: newWidth, height: newHeight, fontSize: newFontSize }
              }
              return { ...el, x: newX, y: newY, width: newWidth, height: newHeight }
            }
            return el
          })
          setElements(newElements)
        }
        return
      }

      // Handle drag
      if (dragOffset) {
        // Reset double-click tracking when dragging starts
        setLastClick(null)
        const newElements = elements.map((el) => {
          if (el.id !== selectedElement) return el

        if (el.type === "path" && el.points) {
          const xs = el.points.map((p) => p.x)
          const ys = el.points.map((p) => p.y)
          const minX = Math.min(...xs)
          const minY = Math.min(...ys)
          const deltaX = x - dragOffset.x - minX
          const deltaY = y - dragOffset.y - minY
          return {
            ...el,
            points: el.points.map((p) => ({ x: p.x + deltaX, y: p.y + deltaY })),
          }
        } else if (el.x !== undefined && el.y !== undefined) {
          return {
            ...el,
            x: x - dragOffset.x,
            y: y - dragOffset.y,
          }
        }
        return el
      })
      setElements(newElements)
      return
      }
    }

    if (tool === "eraser") {
      setCurrentPath((prev) => [...prev, { x, y }])
      // Check all points in current eraser path for intersections
      const elementsToDelete = new Set<string>()
      currentPath.forEach((point) => {
        elements.forEach((el) => {
          if (isPointInElement(point.x, point.y, el, ctx || undefined)) {
            elementsToDelete.add(el.id)
          }
        })
      })
      if (elementsToDelete.size > 0) {
        const newElements = elements.filter((el) => !elementsToDelete.has(el.id))
        setElements(newElements)
      }
      return
    }

    if (tool === "pencil") {
      setCurrentPath((prev) => [...prev, { x, y }])
    } else if ((tool === "rectangle" || tool === "circle") && startPoint) {
      const width = x - startPoint.x
      const height = y - startPoint.y

      if (tool === "rectangle") {
        setPreviewShape({
          type: "rectangle",
          x: width > 0 ? startPoint.x : x,
          y: height > 0 ? startPoint.y : y,
          width: Math.abs(width),
          height: Math.abs(height),
        })
      } else if (tool === "circle") {
        const radius = Math.hypot(width, height)
        setPreviewShape({
          type: "circle",
          x: startPoint.x,
          y: startPoint.y,
          width: radius * 2,
          height: radius * 2,
        })
      }
    }
  }

  const stopDrawing = () => {
    if (!isDrawing) return

    if (tool === "select" && selectedElement) {
      saveToHistory(elements)
      setDragOffset(null)
      setResizeHandle(null)
      setResizeStart(null)
      setIsDrawing(false)
      return
    }

    if (tool === "eraser") {
      saveToHistory(elements)
      setCurrentPath([])
      setIsDrawing(false)
      return
    }

    if (tool === "pencil" && currentPath.length > 0) {
      saveToHistory([
        ...elements,
        {
          id: Date.now().toString(),
          type: "path",
          points: currentPath,
          color: selectedColor,
        },
      ])
      setCurrentPath([])
      // Keep pencil tool active for continuous drawing
    } else if ((tool === "rectangle" || tool === "circle") && previewShape) {
      if (tool === "rectangle") {
        saveToHistory([
          ...elements,
          {
            id: Date.now().toString(),
            type: "rectangle",
            x: previewShape.x,
            y: previewShape.y,
            width: previewShape.width,
            height: previewShape.height,
            color: selectedColor,
          },
        ])
        setTool("select") // Switch back to select tool after adding element
      } else if (tool === "circle") {
        saveToHistory([
          ...elements,
          {
            id: Date.now().toString(),
            type: "circle",
            x: previewShape.x,
            y: previewShape.y,
            width: previewShape.width,
            color: selectedColor,
          },
        ])
        setTool("select") // Switch back to select tool after adding element
      }
      setPreviewShape(null)
      setStartPoint(null)
    }

    setIsDrawing(false)
  }

  const handleTextInputComplete = () => {
    if (activeTextInput) {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      
      // Check if we're editing an existing element or creating a new one
      const isEditing = !!editingElement
      
      const newElement: DrawnElement = {
        id: activeTextInput.id,
        type: activeTextInput.type,
        x: activeTextInput.x,
        y: activeTextInput.y,
        text: activeTextInput.text,
        color: activeTextInput.color,
      }

      if (activeTextInput.type === "sticky") {
        newElement.width = activeTextInput.width
        newElement.height = activeTextInput.height
      } else if (activeTextInput.type === "text") {
        // For text elements, preserve existing fontSize if editing, otherwise use default
        const fontSize = isEditing && editingElement?.fontSize ? editingElement.fontSize : 18
        newElement.fontSize = fontSize
        
        if (ctx) {
          ctx.font = `bold ${fontSize}px Inter`
          const metrics = ctx.measureText(activeTextInput.text)
          newElement.width = metrics.width
          newElement.height = activeTextInput.height || 24
        } else {
          // Fallback if context not available
          newElement.width = activeTextInput.width || 300
          newElement.height = activeTextInput.height || 24
        }
      }

      if (isEditing) {
        // Update existing element (add it back with updated content)
        saveToHistory([...elements, newElement])
      } else {
        // Create new element
        saveToHistory([...elements, newElement])
      }
      
      setActiveTextInput(null)
      setEditingElement(null) // Clear editing state
      setTool("select") // Switch back to select tool after adding/editing element
    }
  }

  const handleTextInputCancel = () => {
    // If we were editing, restore the original element
    if (editingElement) {
      saveToHistory([...elements, editingElement])
    }
    setActiveTextInput(null)
    setEditingElement(null)
  }

  // Convert canvas to base64 image
  const canvasToBase64 = (): string | null => {
    const canvas = canvasRef.current
    if (!canvas) return null

    try {
      return canvas.toDataURL("image/png")
    } catch (error) {
      console.error("Failed to convert canvas to base64:", error)
      return null
    }
  }

  // Initialize Mermaid
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      securityLevel: "loose",
    })
  }, [])

  // Helper function to render Mermaid diagram
  const renderMermaidDiagram = async (container: HTMLDivElement, mermaidCode: string, diagramId: string) => {
    try {
      // Clear container
      container.innerHTML = ""

      // Create pre element with mermaid class
      const pre = document.createElement("pre")
      pre.className = "mermaid"
      pre.id = diagramId
      pre.textContent = mermaidCode

      // Append to DOM BEFORE calling mermaid.run()
      // This is critical - the element must be in the DOM tree
      container.appendChild(pre)

      // Force a reflow to ensure DOM is ready
      void container.offsetHeight

      // Run mermaid with error suppression and await the promise
      await mermaid.run({
        nodes: [pre],
        suppressErrors: false, // We want to catch errors ourselves
      })

      console.log("Mermaid diagram rendered successfully:", diagramId)
    } catch (error: any) {
      console.error("Mermaid rendering error:", error)
      console.error("Failed diagram code:", mermaidCode)
      console.error("Error stack:", error.stack)

      // Display error message to user
      container.innerHTML = `<div class="text-sm text-muted-foreground p-4">
        <p class="font-semibold mb-2">Diagram rendering error:</p>
        <p class="text-xs mb-2">${error.message || 'Unknown error'}</p>
        <p class="text-xs font-semibold mt-3">Raw Mermaid code:</p>
        <pre class="mt-2 text-xs overflow-auto whitespace-pre-wrap bg-background/50 p-2 rounded">${mermaidCode}</pre>
      </div>`
    }
  }

  // Render Mermaid diagram when diagram or current index changes
  useEffect(() => {
    const diagramToRender = diagramIterations.length > 0 && currentDiagramIndex >= 0 && currentDiagramIndex < diagramIterations.length
      ? diagramIterations[currentDiagramIndex]
      : diagram

    if (diagramToRender?.mermaid && mermaidRef.current) {
      console.log("Rendering Mermaid diagram:", diagramToRender.mermaid.substring(0, 200))
      // Small delay to ensure DOM is ready and avoid race conditions
      setTimeout(() => {
        if (mermaidRef.current) {
          renderMermaidDiagram(mermaidRef.current, diagramToRender.mermaid, `mermaid-${Date.now()}`)
        }
      }, 50)
    }
  }, [diagram, diagramIterations, currentDiagramIndex])

  // Render diagram in modal when modal opens
  useEffect(() => {
    if (showDiagramModal && mermaidModalRef.current) {
      const diagramToRender = diagramIterations.length > 0 && currentDiagramIndex >= 0 && currentDiagramIndex < diagramIterations.length
        ? diagramIterations[currentDiagramIndex]
        : diagram

      if (diagramToRender?.mermaid) {
        // Small delay to ensure modal is rendered
        setTimeout(() => {
          if (mermaidModalRef.current) {
            renderMermaidDiagram(mermaidModalRef.current, diagramToRender.mermaid, `mermaid-modal-${Date.now()}`)
          }
        }, 100)
      }
    }
  }, [showDiagramModal, diagram, diagramIterations, currentDiagramIndex])

  // Render iteration diagrams
  useEffect(() => {
    const renderIterations = async () => {
      for (const [idx, iter] of diagramIterations.entries()) {
        const container = iterationRefs.current.get(idx)
        if (container && iter.mermaid) {
          try {
            const id = `mermaid-iter-${idx}-${Date.now()}`
            container.innerHTML = ""
            const pre = document.createElement("pre")
            pre.className = "mermaid"
            pre.id = id
            pre.textContent = iter.mermaid

            // Append to DOM first
            container.appendChild(pre)

            // Force reflow
            void container.offsetHeight

            // Render with mermaid
            await mermaid.run({
              nodes: [pre],
              suppressErrors: false,
            })
          } catch (error) {
            console.error("Mermaid iteration rendering error:", error)
            if (container) {
              container.innerHTML = `<div class="text-xs text-muted-foreground p-2">Diagram rendering error</div>`
            }
          }
        }
      }
    }

    renderIterations()
  }, [diagramIterations])

  const handleExportCanvas = () => {
    // Get canvas as image
    const canvasImage = canvasToBase64()

    // Get current diagram (latest iteration)
    const currentDiagram = diagramIterations[currentDiagramIndex] || diagram

    // Create HTML document
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>AID8 Product Export - ${new Date().toLocaleDateString()}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      line-height: 1.6;
      color: #1e293b;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      padding: 2rem;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 3rem 2rem;
      text-align: center;
    }

    .header h1 {
      font-size: 2.5rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      font-family: Georgia, serif;
    }

    .header p {
      font-size: 1.1rem;
      opacity: 0.95;
    }

    .content {
      padding: 3rem 2rem;
    }

    .section {
      margin-bottom: 3rem;
      page-break-inside: avoid;
    }

    .section-title {
      font-size: 1.75rem;
      font-weight: 700;
      margin-bottom: 1rem;
      color: #667eea;
      border-left: 4px solid #667eea;
      padding-left: 1rem;
      font-family: Georgia, serif;
    }

    .canvas-preview {
      width: 100%;
      max-width: 800px;
      margin: 1.5rem auto;
      border-radius: 12px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
      display: block;
      border: 1px solid #e2e8f0;
    }

    .diagram-container {
      background: #f8fafc;
      padding: 2rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
      margin: 1.5rem 0;
    }

    .pitch-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 2rem;
      margin: 1.5rem 0;
    }

    .pitch-card {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .pitch-card h3 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 0.75rem;
    }

    .pitch-card p, .pitch-card ul {
      color: #475569;
      font-size: 0.95rem;
    }

    .pitch-card ul {
      list-style: none;
      padding-left: 0;
    }

    .pitch-card li {
      padding: 0.5rem 0;
      border-bottom: 1px solid #e2e8f0;
    }

    .pitch-card li:last-child {
      border-bottom: none;
    }

    .pitch-card li::before {
      content: "✓";
      color: #667eea;
      font-weight: bold;
      margin-right: 0.5rem;
    }

    .value-prop {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 2rem;
      border-radius: 12px;
      text-align: center;
      font-size: 1.5rem;
      font-weight: 600;
      margin: 2rem 0;
      box-shadow: 0 8px 24px rgba(102, 126, 234, 0.3);
      font-family: Georgia, serif;
    }

    .competitors {
      display: grid;
      gap: 1.5rem;
      margin: 1.5rem 0;
    }

    .competitor-card {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border: 1px solid #e2e8f0;
    }

    .competitor-card h4 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #1e293b;
      margin-bottom: 0.5rem;
    }

    .competitor-card p {
      color: #64748b;
      margin-bottom: 1rem;
    }

    .competitor-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1rem;
    }

    .competitor-list {
      list-style: none;
      padding: 0;
    }

    .competitor-list li {
      padding: 0.5rem;
      font-size: 0.9rem;
    }

    .strengths li {
      color: #059669;
    }

    .weaknesses li {
      color: #dc2626;
    }

    .competitor-list li::before {
      margin-right: 0.5rem;
      font-weight: bold;
    }

    .strengths li::before {
      content: "+";
      color: #059669;
    }

    .weaknesses li::before {
      content: "−";
      color: #dc2626;
    }

    .roadmap-phases {
      display: grid;
      gap: 2rem;
      margin: 1.5rem 0;
    }

    .phase {
      background: #f8fafc;
      padding: 1.5rem;
      border-radius: 12px;
      border-left: 4px solid #667eea;
    }

    .phase h4 {
      font-size: 1.25rem;
      font-weight: 600;
      color: #667eea;
      margin-bottom: 1rem;
    }

    .milestones {
      list-style: none;
      padding: 0;
    }

    .milestones li {
      padding: 0.75rem 0;
      border-bottom: 1px solid #e2e8f0;
      color: #475569;
    }

    .milestones li:last-child {
      border-bottom: none;
    }

    .milestones li::before {
      content: "◆";
      color: #667eea;
      margin-right: 0.75rem;
    }

    .footer {
      background: #f8fafc;
      padding: 2rem;
      text-align: center;
      color: #64748b;
      font-size: 0.9rem;
      border-top: 1px solid #e2e8f0;
    }

    .timestamp {
      color: #94a3b8;
      font-size: 0.85rem;
      margin-top: 0.5rem;
    }

    @media print {
      body {
        background: white;
        padding: 0;
      }

      .container {
        box-shadow: none;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎨 Product Ideation Report</h1>
      <p>AI-Powered Product Analysis & Strategy</p>
    </div>

    <div class="content">
      ${canvasImage ? `
      <div class="section">
        <h2 class="section-title">Canvas Sketch</h2>
        <img src="${canvasImage}" alt="Canvas Sketch" class="canvas-preview" />
      </div>
      ` : ''}

      ${currentDiagram ? `
      <div class="section">
        <h2 class="section-title">Product Diagram</h2>
        <div class="diagram-container">
          <div id="diagram-output"></div>
        </div>
      </div>
      ` : ''}

      ${pitch ? `
      <div class="section">
        <h2 class="section-title">Investor Pitch</h2>

        ${pitch.valueProposition ? `
        <div class="value-prop">
          "${pitch.valueProposition}"
        </div>
        ` : ''}

        <div class="pitch-grid">
          ${pitch.problem ? `
          <div class="pitch-card">
            <h3>🔥 Problem</h3>
            <p>${pitch.problem}</p>
          </div>
          ` : ''}

          ${pitch.solution ? `
          <div class="pitch-card">
            <h3>💡 Solution</h3>
            <p>${pitch.solution}</p>
          </div>
          ` : ''}

          ${pitch.targetAudience ? `
          <div class="pitch-card">
            <h3>🎯 Target Audience</h3>
            <p>${pitch.targetAudience}</p>
          </div>
          ` : ''}

          ${pitch.traction ? `
          <div class="pitch-card">
            <h3>📈 Traction</h3>
            <p>${pitch.traction}</p>
          </div>
          ` : ''}
        </div>

        ${pitch.differentiators && pitch.differentiators.length > 0 ? `
        <div class="pitch-card" style="margin-top: 2rem;">
          <h3>✨ Key Differentiators</h3>
          <ul>
            ${pitch.differentiators.map((diff: string) => `<li>${diff}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${competitive ? `
      <div class="section">
        <h2 class="section-title">Competitive Analysis</h2>

        ${competitive.marketOpportunity ? `
        <div class="pitch-card" style="margin-bottom: 2rem;">
          <h3>🎯 Market Opportunity</h3>
          <p>${competitive.marketOpportunity}</p>
        </div>
        ` : ''}

        ${competitive.positioning ? `
        <div class="pitch-card" style="margin-bottom: 2rem;">
          <h3>🎪 Positioning</h3>
          <p>${competitive.positioning}</p>
        </div>
        ` : ''}

        ${competitive.competitors && competitive.competitors.length > 0 ? `
        <h3 style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem; color: #475569;">Competitors</h3>
        <div class="competitors">
          ${competitive.competitors.map((comp: any) => `
            <div class="competitor-card">
              <h4>${comp.name}</h4>
              <p>${comp.description || ''}</p>
              <div class="competitor-grid">
                ${comp.strengths && comp.strengths.length > 0 ? `
                <div>
                  <strong style="color: #059669;">Strengths</strong>
                  <ul class="competitor-list strengths">
                    ${comp.strengths.map((s: string) => `<li>${s}</li>`).join('')}
                  </ul>
                </div>
                ` : ''}
                ${comp.weaknesses && comp.weaknesses.length > 0 ? `
                <div>
                  <strong style="color: #dc2626;">Weaknesses</strong>
                  <ul class="competitor-list weaknesses">
                    ${comp.weaknesses.map((w: string) => `<li>${w}</li>`).join('')}
                  </ul>
                </div>
                ` : ''}
              </div>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${competitive.differentiators && competitive.differentiators.length > 0 ? `
        <div class="pitch-card" style="margin-top: 2rem;">
          <h3>🚀 Our Differentiators</h3>
          <ul>
            ${competitive.differentiators.map((diff: string) => `<li>${diff}</li>`).join('')}
          </ul>
        </div>
        ` : ''}
      </div>
      ` : ''}

      ${roadmap && roadmap.phases ? `
      <div class="section">
        <h2 class="section-title">90-Day Roadmap</h2>

        ${roadmap.vision ? `
        <div class="pitch-card" style="margin-bottom: 2rem;">
          <h3>🎯 Vision</h3>
          <p>${roadmap.vision}</p>
        </div>
        ` : ''}

        <div class="roadmap-phases">
          ${roadmap.phases.map((phase: any) => `
            <div class="phase">
              <h4>${phase.name || phase.phase || 'Phase'} (${phase.duration || phase.timeline || '30 days'})</h4>
              ${phase.focus ? `<p style="color: #64748b; margin-bottom: 1rem;">${phase.focus}</p>` : ''}
              ${phase.milestones && phase.milestones.length > 0 ? `
              <ul class="milestones">
                ${phase.milestones.map((milestone: string) => `<li>${milestone}</li>`).join('')}
              </ul>
              ` : ''}
            </div>
          `).join('')}
        </div>
      </div>
      ` : ''}

      ${analysis ? `
      <div class="section">
        <h2 class="section-title">Product Analysis Summary</h2>
        <div class="pitch-card">
          ${analysis.summary ? `<p style="margin-bottom: 1rem;"><strong>Summary:</strong> ${analysis.summary}</p>` : ''}
          ${analysis.productType ? `<p style="margin-bottom: 0.5rem;"><strong>Product Type:</strong> ${analysis.productType}</p>` : ''}
          ${analysis.targetAudience ? `<p style="margin-bottom: 0.5rem;"><strong>Target Audience:</strong> ${analysis.targetAudience}</p>` : ''}
          ${analysis.components && analysis.components.length > 0 ? `
          <p style="margin-top: 1rem;"><strong>Components:</strong></p>
          <ul>
            ${analysis.components.map((comp: string) => `<li>${comp}</li>`).join('')}
          </ul>
          ` : ''}
          ${analysis.features && analysis.features.length > 0 ? `
          <p style="margin-top: 1rem;"><strong>Features:</strong></p>
          <ul>
            ${analysis.features.map((feat: string) => `<li>${feat}</li>`).join('')}
          </ul>
          ` : ''}
        </div>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p><strong>Generated by AID8</strong> - AI-Powered Product Ideation Platform</p>
      <p class="timestamp">${new Date().toLocaleString()}</p>
    </div>
  </div>

  ${currentDiagram ? `
  <script type="module">
    import mermaid from 'https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.esm.min.mjs';
    mermaid.initialize({
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    });

    const diagramCode = ${JSON.stringify(currentDiagram.mermaid)};
    const container = document.getElementById('diagram-output');

    if (container) {
      const pre = document.createElement('pre');
      pre.className = 'mermaid';
      pre.textContent = diagramCode;
      container.appendChild(pre);

      mermaid.run({ nodes: [pre] }).catch(err => {
        console.error('Mermaid error:', err);
        container.innerHTML = '<p style="color: #dc2626;">Diagram rendering error</p>';
      });
    }
  </script>
  ` : ''}
</body>
</html>`

    // Create blob and download
    const blob = new Blob([html], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `AID8-Product-Export-${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleGenerateAI = async () => {
    if (isGenerating) return

    const imageData = canvasToBase64()
    if (!imageData) {
      alert("Unable to capture canvas. Please try again.")
      return
    }

    setIsGenerating(true)
    setGenerationStep("Analyzing your sketch...")

    try {
      // Step 1: Analyze the sketch
      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: imageData,
          description: description || undefined,
        }),
      })

      if (!analyzeResponse.ok) {
        throw new Error("Analysis failed")
      }

      const analyzeData = await analyzeResponse.json()
      if (!analyzeData.success) {
        throw new Error(analyzeData.error || "Analysis failed")
      }

      const newAnalysis = analyzeData.analysis
      console.log("Analysis received:", newAnalysis)
      setAnalysis(newAnalysis)
      setGenerationStep("Generating diagram...")

      // Step 2: Generate diagram
      const diagramResponse = await fetch("/api/generate/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: newAnalysis,
          previousDiagram: diagram || undefined,
        }),
      })

      if (!diagramResponse.ok) {
        const errorData = await diagramResponse.json().catch(() => ({}))
        console.error("Diagram generation failed:", errorData)
        throw new Error(errorData.error || "Diagram generation failed")
      }

      const diagramData = await diagramResponse.json()
      console.log("Diagram data received:", diagramData)
      if (diagramData.success) {
        setDiagram(diagramData.diagram)
        setDiagramIterations([diagramData.diagram]) // Initialize with first diagram
        setCurrentDiagramIndex(0) // Reset to first diagram
      } else {
        console.error("Diagram generation returned success: false", diagramData)
        alert(`Diagram generation failed: ${diagramData.error || "Unknown error"}`)
      }

      setGenerationStep("Creating pitch...")

      // Step 3: Generate pitch (with previous pitch context for iteration)
      const pitchResponse = await fetch("/api/generate/pitch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: newAnalysis,
          previousPitch: pitch || undefined,
          description: description || undefined,
        }),
      })

      if (pitchResponse.ok) {
        const pitchData = await pitchResponse.json()
        if (pitchData.success) {
          setPitch(pitchData.pitch)
        }
      }

      setGenerationStep("Analyzing competition...")

      // Step 4: Generate competitive analysis
      const competitiveResponse = await fetch("/api/generate/competitive", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: newAnalysis,
          previousCompetitive: competitive || undefined,
        }),
      })

      if (competitiveResponse.ok) {
        const competitiveData = await competitiveResponse.json()
        if (competitiveData.success) {
          setCompetitive(competitiveData.competitive)
        }
      }

      setGenerationStep("Building roadmap...")

      // Step 5: Generate roadmap
      const roadmapResponse = await fetch("/api/generate/roadmap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: newAnalysis,
          previousRoadmap: roadmap || undefined,
        }),
      })

      if (roadmapResponse.ok) {
        const roadmapData = await roadmapResponse.json()
        if (roadmapData.success) {
          setRoadmap(roadmapData.roadmap)
        }
      }

      setGenerationStep("Complete!")
      setTimeout(() => setGenerationStep(""), 1000)
    } catch (error: any) {
      console.error("Generation error:", error)
      alert(`Generation failed: ${error.message || "Unknown error"}`)
      setGenerationStep("")
    } finally {
      setIsGenerating(false)
    }
  }

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const expandDiagram = async () => {
    if (!diagram || !analysis || isExpandingDiagram || !description.trim()) return

    setIsExpandingDiagram(true)
    try {
      // Use the current iteration diagram for expansion
      const currentDiagram = diagramIterations.length > 0 && currentDiagramIndex >= 0 && currentDiagramIndex < diagramIterations.length
        ? diagramIterations[currentDiagramIndex]
        : diagram

      // Update analysis with the new description context
      const expandedAnalysis = {
        ...analysis,
        rawAnalysis: `${analysis.rawAnalysis}\n\nADDITIONAL CONTEXT FOR EXPANSION:\n${description.trim()}`
      }

      const diagramResponse = await fetch("/api/generate/diagram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          analysis: expandedAnalysis,
          previousDiagram: currentDiagram,
        }),
      })

      if (diagramResponse.ok) {
        const diagramData = await diagramResponse.json()
        if (diagramData.success) {
          const newDiagram = diagramData.diagram
          setDiagramIterations((prev) => {
            const updated = [...prev, newDiagram]
            setDiagram(updated[updated.length - 1]) // Set to latest
            setCurrentDiagramIndex(updated.length - 1) // Navigate to latest
            return updated
          })
        }
      }
    } catch (error) {
      console.error("Diagram expansion error:", error)
      alert("Failed to expand diagram. Please try again.")
    } finally {
      setIsExpandingDiagram(false)
    }
  }

  // Compress and resize image to reduce localStorage size
  const compressImage = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const img = new Image()
        img.onload = () => {
          // Max dimensions to reduce size
          const MAX_WIDTH = 1920
          const MAX_HEIGHT = 1920
          const QUALITY = 0.75

          let width = img.width
          let height = img.height

          // Calculate new dimensions maintaining aspect ratio
          if (width > MAX_WIDTH || height > MAX_HEIGHT) {
            if (width > height) {
              height = (height * MAX_WIDTH) / width
              width = MAX_WIDTH
            } else {
              width = (width * MAX_HEIGHT) / height
              height = MAX_HEIGHT
            }
          }

          // Create canvas to compress
          const canvas = document.createElement("canvas")
          canvas.width = width
          canvas.height = height
          const ctx = canvas.getContext("2d")

          if (!ctx) {
            reject(new Error("Failed to get canvas context"))
            return
          }

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height)
          const compressedBase64 = canvas.toDataURL("image/jpeg", QUALITY)
          resolve(compressedBase64)
        }
        img.onerror = () => reject(new Error("Failed to load image"))
        img.src = event.target?.result as string
      }
      reader.onerror = () => reject(new Error("Failed to read file"))
      reader.readAsDataURL(file)
    })
  }

  // Handle image file upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      alert("Please upload an image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB")
      return
    }

    try {
      // Compress image first
      const compressedImageSrc = await compressImage(file)
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Calculate dimensions to fit canvas while maintaining aspect ratio
        const maxWidth = canvas.width * 0.6
        const maxHeight = canvas.height * 0.6
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // Center the image on canvas
        const x = (canvas.width - width) / 2
        const y = (canvas.height - height) / 2

        // Add image as a new element (using compressed version)
        const newElement: DrawnElement = {
          id: Date.now().toString(),
          type: "image",
          x,
          y,
          width,
          height,
          color: "#8b5cf6",
          imageSrc: compressedImageSrc,
          originalWidth: img.width,
          originalHeight: img.height,
        }

        saveToHistory([...elements, newElement])
        setShowUploadModal(false)
        setHasInteracted(true)
        setTool("select") // Switch back to select tool after adding element
      }
      img.onerror = () => alert("Failed to load image")
      img.src = compressedImageSrc
    } catch (error) {
      console.error("Image compression error:", error)
      alert("Failed to process image. Please try again.")
    }
  }

  // Handle drag and drop
  const handleImageDrop = async (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()

    const file = e.dataTransfer.files?.[0]
    if (!file || !file.type.startsWith("image/")) {
      alert("Please drop an image file")
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      alert("File size must be less than 10MB")
      return
    }

    try {
      // Compress image first
      const compressedImageSrc = await compressImage(file)
      const img = new Image()
      img.onload = () => {
        const canvas = canvasRef.current
        if (!canvas) return

        // Calculate dimensions to fit canvas while maintaining aspect ratio
        const maxWidth = canvas.width * 0.6
        const maxHeight = canvas.height * 0.6
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }
        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // Center the image on canvas
        const x = (canvas.width - width) / 2
        const y = (canvas.height - height) / 2

        // Add image as a new element (using compressed version)
        const newElement: DrawnElement = {
          id: Date.now().toString(),
          type: "image",
          x,
          y,
          width,
          height,
          color: "#8b5cf6",
          imageSrc: compressedImageSrc,
          originalWidth: img.width,
          originalHeight: img.height,
        }

        saveToHistory([...elements, newElement])
        setShowUploadModal(false)
        setHasInteracted(true)
        setTool("select") // Switch back to select tool after adding element
      }
      img.onerror = () => alert("Failed to load image")
      img.src = compressedImageSrc
    } catch (error) {
      console.error("Image compression error:", error)
      alert("Failed to process image. Please try again.")
    }
  }

  const deleteSelectedElement = () => {
    if (!selectedElement) return

    const elementToDelete = elements.find((el) => el.id === selectedElement)
    if (!elementToDelete) return

    // Remove from image cache if it's an image
    if (elementToDelete.type === "image") {
      imageCacheRef.current.delete(selectedElement)
    }

    const newElements = elements.filter((el) => el.id !== selectedElement)
    saveToHistory(newElements)
    setSelectedElement(null)
  }

  const clearCanvas = () => {
    if (confirm("Clear the entire canvas and reset all data?")) {
      saveToHistory([])
      imageCacheRef.current.clear()
      setSelectedElement(null)

      // Clear all AID8 localStorage items
      localStorage.removeItem("aid8-whiteboard-elements")
      localStorage.removeItem("aid8-whiteboard-history")
      localStorage.removeItem("aid8-whiteboard-history-step")
      localStorage.removeItem("aid8-whiteboard-has-interacted")

      // Reload page to reset state
      window.location.reload()
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-background">
      {/* Subtle background effects */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-20 right-20 w-64 h-64 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-40 left-20 w-48 h-48 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-sm bg-card/50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/ideate-logo.png" alt="Ideate" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-3">
              <Link href="/">
                <Button variant="ghost" size="sm">
                  <Home className="w-4 h-4 mr-2" />
                  Home
                </Button>
              </Link>
              <Link href="/gallery">
                <Button variant="ghost" size="sm">
                  <FolderOpen className="w-4 h-4 mr-2" />
                  My Grimoire
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <CanvasLibrary 
                  elements={elements} 
                  onLoad={(data) => {
                    setElements(data.elements)
                    if (data.description) setDescription(data.description)
                    if (data.analysis) setAnalysis(data.analysis)
                    if (data.diagram) setDiagram(data.diagram)
                    if (data.diagramIterations) setDiagramIterations(data.diagramIterations)
                    if (data.pitch) setPitch(data.pitch)
                    if (data.competitive) setCompetitive(data.competitive)
                    if (data.roadmap) setRoadmap(data.roadmap)
                  }}
                  description={description}
                  analysis={analysis}
                  diagram={diagram}
                  diagramIterations={diagramIterations}
                  pitch={pitch}
                  competitive={competitive}
                  roadmap={roadmap}
                  currentCanvasId={typeof window !== 'undefined' ? sessionStorage.getItem('currentCanvasId') : null}
                  currentCanvasName={typeof window !== 'undefined' ? sessionStorage.getItem('currentCanvasName') : null}
                />
                <AuthButton />
              </div>
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 flex h-[calc(100vh-80px)]">
        {/* Left Toolbar */}
        <aside className="w-20 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col items-center py-6 gap-2 overflow-y-auto">
          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={handleUndo}
            disabled={historyStep === 0}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={handleRedo}
            disabled={historyStep === history.length - 1}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 className="w-5 h-5" />
          </Button>

          <div className="h-px w-8 bg-border/50 my-2 flex-shrink-0" />

          <Button
            variant={tool === "select" ? "default" : "ghost"}
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={() => setTool("select")}
            title="Select"
          >
            <MousePointer className="w-5 h-5" />
          </Button>

          <Button
            variant={tool === "pencil" ? "default" : "ghost"}
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={() => setTool("pencil")}
            title="Draw"
          >
            <Pencil className="w-5 h-5" />
          </Button>

          <Button
            variant={tool === "rectangle" ? "default" : "ghost"}
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={() => setTool("rectangle")}
            title="Rectangle"
          >
            <Square className="w-5 h-5" />
          </Button>

          <Button
            variant={tool === "circle" ? "default" : "ghost"}
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={() => setTool("circle")}
            title="Circle"
          >
            <Circle className="w-5 h-5" />
          </Button>

          <Button
            variant={tool === "sticky" ? "default" : "ghost"}
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={() => setTool("sticky")}
            title="Sticky Note"
          >
            <StickyNote className="w-5 h-5" />
          </Button>

          <Button
            variant={tool === "text" ? "default" : "ghost"}
            size="icon"
            className="w-12 h-12 flex-shrink-0"
            onClick={() => setTool("text")}
            title="Text"
          >
            <Type className="w-5 h-5" />
          </Button>

          <Button
            variant={tool === "eraser" ? "default" : "ghost"}
            size="icon"
            className="w-12 h-12 flex-shrink-0 text-destructive hover:text-destructive"
            onClick={() => setTool("eraser")}
            title="Eraser"
          >
            <Eraser className="w-5 h-5" />
          </Button>

          <div className="h-px w-8 bg-border/50 my-2 flex-shrink-0" />

          {/* Color Palette */}
          <div className="flex flex-col gap-2">
            {colors.map((color) => (
              <button
                key={color.value}
                className={`w-8 h-8 rounded-full border-2 transition-all hover:scale-110 flex-shrink-0 ${
                  selectedColor === color.value ? "border-foreground scale-110" : "border-border/50"
                }`}
                style={{ backgroundColor: color.value }}
                onClick={() => setSelectedColor(color.value)}
                title={color.name}
              />
            ))}
          </div>

          <div className="h-px w-8 bg-border/50 my-2 flex-shrink-0" />

          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 flex-shrink-0 text-destructive hover:text-destructive disabled:opacity-30"
            onClick={deleteSelectedElement}
            disabled={!selectedElement}
            title={selectedElement ? "Delete Selected Element (Delete/Backspace)" : "Select an element to delete"}
          >
            <X className="w-5 h-5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="w-12 h-12 flex-shrink-0 text-destructive hover:text-destructive"
            onClick={clearCanvas}
            title="Clear Entire Canvas"
          >
            <Trash2 className="w-5 h-5" />
          </Button>
        </aside>

        {/* Main Canvas Area */}
        <main className="flex-1 relative">
          <canvas
            ref={canvasRef}
            className="absolute inset-0 w-full h-full cursor-crosshair bg-background/50"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
          />

          {/* Floating action buttons */}
          <div className="absolute top-6 right-6 flex gap-3 z-10">
            <Button
              variant="outline"
              size="sm"
              className="bg-card/80 backdrop-blur-sm border-primary/30 hover:border-primary"
              onClick={() => setShowUploadModal(true)}
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload Image
            </Button>

            <Button
              size="sm"
              className="animate-glow-pulse"
              onClick={handleGenerateAI}
              disabled={isGenerating}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {generationStep || "Generating..."}
                </>
              ) : (
                <>
              <Wand2 className="w-4 h-4 mr-2" />
              Generate with AI
                </>
              )}
            </Button>
          </div>

          {activeTextInput && (
            <div
              className="absolute z-20"
              style={{
                left: activeTextInput.x,
                top: activeTextInput.y,
                width: activeTextInput.width,
                height: activeTextInput.height,
              }}
            >
              {activeTextInput.type === "sticky" ? (
                <div
                  className="w-full h-full rounded-lg shadow-xl border-2 p-4 relative"
                  style={{
                    backgroundColor: activeTextInput.color + "dd",
                    borderColor: activeTextInput.color,
                  }}
                >
                  <textarea
                    autoFocus
                    className="w-full h-full bg-transparent border-none outline-none resize-none text-sm text-gray-900 placeholder-gray-600"
                    placeholder="Type your note..."
                    value={activeTextInput.text}
                    onChange={(e) =>
                      setActiveTextInput({
                        ...activeTextInput,
                        text: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Escape") {
                        e.preventDefault()
                        handleTextInputCancel()
                      }
                      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                        e.preventDefault()
                        handleTextInputComplete()
                      }
                    }}
                  />
                  <div className="absolute bottom-2 right-2 flex gap-2">
                    <button
                      className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700"
                      onClick={handleTextInputComplete}
                    >
                      Done
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                      onClick={handleTextInputCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <input
                    autoFocus
                    type="text"
                    className="w-full h-full bg-transparent border-b-2 outline-none text-lg font-bold px-2"
                    style={{
                      color: activeTextInput.color,
                      borderColor: activeTextInput.color,
                    }}
                    placeholder="Type text..."
                    value={activeTextInput.text}
                    onChange={(e) =>
                      setActiveTextInput({
                        ...activeTextInput,
                        text: e.target.value,
                      })
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleTextInputComplete()
                      } else if (e.key === "Escape") {
                        e.preventDefault()
                        handleTextInputCancel()
                      }
                    }}
                  />
                  <div className="absolute top-full mt-2 left-0 flex gap-2">
                    <button
                      className="px-2 py-1 text-xs bg-gray-800 text-white rounded hover:bg-gray-700"
                      onClick={handleTextInputComplete}
                    >
                      Done
                    </button>
                    <button
                      className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                      onClick={handleTextInputCancel}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Help text */}
          {elements.length === 0 && !hasInteracted && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center space-y-3 animate-fade-in">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <h3 className="text-2xl font-serif font-bold text-foreground">Your Magical Canvas</h3>
                <p className="text-muted-foreground max-w-md">
                  Start sketching your ideas with the drawing tools on the left. Add sticky notes, shapes, and text to
                  bring your vision to life.
                </p>
              </div>
            </div>
          )}
        </main>

        {/* Right Panel - AI Insights */}
        <aside className="w-96 border-l border-border/50 bg-card/50 backdrop-blur-sm overflow-y-auto">
          <div className="p-6 space-y-6">
            {/* Description Input */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-serif font-bold text-lg">AI Insights</h3>
                <Wand2 className="w-5 h-5 text-primary animate-sparkle" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-foreground">Additional Context</label>
                <textarea
                  className="w-full min-h-[80px] p-3 text-sm bg-background/50 border border-border/50 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary/50"
                  placeholder="Add any additional context about your idea... (e.g., target users, key features, market insights)"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {diagram ? "Add context here to expand the diagram with more detail." : "Edit this to refine your idea, then regenerate to see updated results."}
                </p>
              </div>
            </div>

            {/* Diagram Section */}
            {diagram && (
              <div className="bg-background/50 rounded-xl border border-primary/20 overflow-hidden">
                <button
                  onClick={() => toggleSection("diagram")}
                  className="w-full flex items-center justify-between p-4 hover:bg-background/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-foreground">Product Diagram</h4>
                  </div>
                  {expandedSections.diagram ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.diagram && (
                  <div className="p-4 pt-0 space-y-4">
                    {/* Diagram Navigation */}
                    {diagramIterations.length > 1 && (
                      <div className="flex items-center justify-between gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentDiagramIndex((prev) => Math.max(0, prev - 1))}
                          disabled={currentDiagramIndex === 0}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </Button>
                        <span className="text-xs text-muted-foreground flex-1 text-center">
                          Version {currentDiagramIndex + 1} of {diagramIterations.length}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCurrentDiagramIndex((prev) => Math.min(diagramIterations.length - 1, prev + 1))}
                          disabled={currentDiagramIndex === diagramIterations.length - 1}
                          className="h-8 w-8 p-0"
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}

                    <div 
                      ref={mermaidRef} 
                      className="overflow-x-auto bg-white rounded-lg p-4 min-h-[200px] cursor-pointer hover:ring-2 hover:ring-primary/30 transition-all"
                      onClick={() => setShowDiagramModal(true)}
                      title="Click to view larger"
                    />
                    
                    {/* Expand Diagram Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={expandDiagram}
                      disabled={isExpandingDiagram || !diagram || !description.trim()}
                      title={!description.trim() ? "Add context above to expand diagram" : "Expand diagram with more detail"}
                    >
                      {isExpandingDiagram ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Expanding...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-4 h-4 mr-2" />
                          Expand Diagram
                        </>
                      )}
                    </Button>

                    {/* Diagram Iterations History */}
                    {diagramIterations.length > 1 && (
                      <div className="space-y-3">
                        <h5 className="text-xs font-semibold text-muted-foreground">Iteration History</h5>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto">
                          {diagramIterations.map((iter, idx) => (
                            <div
                              key={idx}
                              className="bg-background/30 rounded-lg p-3 border border-border/30"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs font-medium text-foreground">
                                  Version {idx + 1}
                                </span>
                                {idx === diagramIterations.length - 1 && (
                                  <span className="text-xs text-primary">Current</span>
                                )}
                              </div>
                              <div
                                className="overflow-x-auto bg-white rounded p-2 text-xs min-h-[100px]"
                                ref={(el) => {
                                  if (el) {
                                    iterationRefs.current.set(idx, el)
                                  }
                                }}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Pitch Section */}
            {pitch && (
              <div className="bg-background/50 rounded-xl border border-primary/20 overflow-hidden">
                <button
                  onClick={() => toggleSection("pitch")}
                  className="w-full flex items-center justify-between p-4 hover:bg-background/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-foreground">Investor Pitch</h4>
                  </div>
                  {expandedSections.pitch ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.pitch && (
                  <div className="p-4 pt-0 space-y-4">
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">Problem</h5>
                      <p className="text-sm text-foreground leading-relaxed">{pitch.problem}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">Solution</h5>
                      <p className="text-sm text-foreground leading-relaxed">{pitch.solution}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">Target Audience</h5>
                      <p className="text-sm text-foreground leading-relaxed">{pitch.targetAudience}</p>
                    </div>
                    <div>
                      <h5 className="text-xs font-semibold text-muted-foreground mb-1">Value Proposition</h5>
                      <p className="text-sm font-medium text-foreground">{pitch.valueProposition}</p>
                    </div>
                    {pitch.differentiators && pitch.differentiators.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2">Key Differentiators</h5>
                        <ul className="space-y-1">
                          {pitch.differentiators.map((diff: string, idx: number) => (
                            <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{diff}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {pitch.traction && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1">Traction Opportunities</h5>
                        <p className="text-sm text-foreground leading-relaxed">{pitch.traction}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Competitive Analysis Section */}
            {competitive && (
              <div className="bg-background/50 rounded-xl border border-primary/20 overflow-hidden">
                <button
                  onClick={() => toggleSection("competitive")}
                  className="w-full flex items-center justify-between p-4 hover:bg-background/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-foreground">Competitive Analysis</h4>
                  </div>
                  {expandedSections.competitive ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.competitive && (
                  <div className="p-4 pt-0 space-y-4">
                    {competitive.competitors && competitive.competitors.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2">Competitors</h5>
                        <div className="space-y-3">
                          {competitive.competitors.map((comp: any, idx: number) => (
                            <div key={idx} className="bg-background/30 rounded-lg p-3 border border-border/30">
                              <h6 className="text-sm font-medium text-foreground mb-1">{comp.name}</h6>
                              <p className="text-xs text-muted-foreground mb-2">{comp.description}</p>
                              {comp.strengths && comp.strengths.length > 0 && (
                                <div className="mb-2">
                                  <span className="text-xs font-medium text-green-600">Strengths: </span>
                                  <span className="text-xs text-muted-foreground">{comp.strengths.join(", ")}</span>
                                </div>
                              )}
                              {comp.weaknesses && comp.weaknesses.length > 0 && (
                                <div>
                                  <span className="text-xs font-medium text-red-600">Weaknesses: </span>
                                  <span className="text-xs text-muted-foreground">{comp.weaknesses.join(", ")}</span>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {competitive.differentiators && competitive.differentiators.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2">Our Differentiators</h5>
                        <ul className="space-y-1">
                          {competitive.differentiators.map((diff: string, idx: number) => (
                            <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">•</span>
                              <span>{diff}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {competitive.marketOpportunity && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1">Market Opportunity</h5>
                        <p className="text-sm text-foreground leading-relaxed">{competitive.marketOpportunity}</p>
                      </div>
                    )}
                    {competitive.positioning && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-1">Positioning Strategy</h5>
                        <p className="text-sm text-foreground leading-relaxed">{competitive.positioning}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Roadmap Section */}
            {roadmap && (
              <div className="bg-background/50 rounded-xl border border-primary/20 overflow-hidden">
                <button
                  onClick={() => toggleSection("roadmap")}
                  className="w-full flex items-center justify-between p-4 hover:bg-background/30 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <h4 className="font-semibold text-sm text-foreground">90-Day Roadmap</h4>
                  </div>
                  {expandedSections.roadmap ? (
                    <ChevronUp className="w-4 h-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-muted-foreground" />
                  )}
                </button>
                {expandedSections.roadmap && (
                  <div className="p-4 pt-0 space-y-4">
                    {roadmap.phases && roadmap.phases.length > 0 && (
                      <div className="space-y-4">
                        {roadmap.phases.map((phase: any, idx: number) => (
                          <div key={idx} className="bg-background/30 rounded-lg p-3 border border-border/30">
                            <div className="flex items-center justify-between mb-2">
                              <h6 className="text-sm font-semibold text-foreground">{phase.name}</h6>
                              <span className="text-xs text-muted-foreground">{phase.duration}</span>
                            </div>
                            {phase.goal && (
                              <p className="text-xs text-muted-foreground mb-2">{phase.goal}</p>
                            )}
                            {phase.milestones && phase.milestones.length > 0 && (
                              <div className="mb-2">
                                <span className="text-xs font-medium text-foreground">Milestones:</span>
                                <ul className="mt-1 space-y-1">
                                  {phase.milestones.map((milestone: string, mIdx: number) => (
                                    <li key={mIdx} className="text-xs text-muted-foreground flex items-start gap-2">
                                      <span className="text-primary mt-1">→</span>
                                      <span>{milestone}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {phase.deliverables && (
                              <div className="pt-2 border-t border-border/30">
                                <span className="text-xs font-medium text-foreground">Delivers: </span>
                                <span className="text-xs text-muted-foreground">{phase.deliverables}</span>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                    {roadmap.criticalPath && roadmap.criticalPath.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2">Critical Path</h5>
                        <ul className="space-y-1">
                          {roadmap.criticalPath.map((item: string, idx: number) => (
                            <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-primary mt-1">⚡</span>
                              <span>{item}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {roadmap.risks && roadmap.risks.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2">Risks & Mitigation</h5>
                        <ul className="space-y-1">
                          {roadmap.risks.map((risk: string, idx: number) => (
                            <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-red-500 mt-1">⚠</span>
                              <span>{risk}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {roadmap.successMetrics && roadmap.successMetrics.length > 0 && (
                      <div>
                        <h5 className="text-xs font-semibold text-muted-foreground mb-2">Success Metrics</h5>
                        <ul className="space-y-1">
                          {roadmap.successMetrics.map((metric: string, idx: number) => (
                            <li key={idx} className="text-sm text-foreground flex items-start gap-2">
                              <span className="text-green-500 mt-1">✓</span>
                              <span>{metric}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Empty State */}
            {!diagram && !pitch && !competitive && !roadmap && (
              <div className="space-y-4">
            <div className="bg-background/50 rounded-xl border border-primary/20 p-4">
              <h4 className="font-semibold text-sm mb-3 text-foreground">Quick Tips</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-secondary mt-0.5 flex-shrink-0" />
                  <span>Use sticky notes to organize ideas into categories</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-secondary mt-0.5 flex-shrink-0" />
                  <span>Draw rough wireframes of your product interface</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-secondary mt-0.5 flex-shrink-0" />
                  <span>Add text labels to clarify your concepts</span>
                </li>
                <li className="flex items-start gap-2">
                  <Sparkles className="w-3 h-3 text-secondary mt-0.5 flex-shrink-0" />
                      <span>Edit the description above to refine your idea</span>
                </li>
              </ul>
            </div>

            <div className="bg-background/50 rounded-xl border border-accent/20 p-4">
              <h4 className="font-semibold text-sm mb-3 text-foreground">AI Will Generate</h4>
              <ul className="space-y-2 text-xs text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>Product diagram (Mermaid flowchart)</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>Investor pitch with problem/solution</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>Competitive analysis & market positioning</span>
                </li>
                <li className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-accent" />
                      <span>90-day roadmap with phases & milestones</span>
                </li>
              </ul>
            </div>
              </div>
            )}

            <Button
              variant="outline"
              className="w-full border-secondary/30 bg-transparent"
              onClick={handleExportCanvas}
              disabled={!analysis && !diagram && !pitch && !competitive && !roadmap}
            >
              <Download className="w-4 h-4 mr-2" />
              Export Canvas
            </Button>
          </div>
        </aside>
      </div>

      {/* Diagram Modal */}
      {showDiagramModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowDiagramModal(false)
            }
          }}
        >
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-serif font-bold">Product Diagram</h3>
              {diagramIterations.length > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDiagramIndex((prev) => Math.max(0, prev - 1))}
                    disabled={currentDiagramIndex === 0}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Version {currentDiagramIndex + 1} of {diagramIterations.length}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCurrentDiagramIndex((prev) => Math.min(diagramIterations.length - 1, prev + 1))}
                    disabled={currentDiagramIndex === diagramIterations.length - 1}
                    className="h-8 w-8 p-0"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowDiagramModal(false)}
                className="h-8 w-8"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex-1 overflow-auto bg-white rounded-lg p-6 min-h-[400px]">
              <div ref={mermaidModalRef} className="w-full" />
            </div>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowUploadModal(false)
            }
          }}
        >
          <div className="bg-card rounded-2xl border border-border shadow-2xl p-6 max-w-md w-full mx-4 animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-serif font-bold mb-4">Upload Reference Image</h3>
            <p className="text-sm text-muted-foreground mb-6">
              Upload a sketch or reference image to add to your canvas
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
            <div
              className="border-2 border-dashed border-primary/30 rounded-xl p-8 text-center mb-6 hover:border-primary/50 transition-colors cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                e.stopPropagation()
              }}
              onDrop={handleImageDrop}
            >
              <Upload className="w-8 h-8 text-primary mx-auto mb-3" />
              <p className="text-sm text-foreground font-medium mb-1">Click to upload or drag and drop</p>
              <p className="text-xs text-muted-foreground">PNG, JPG, GIF, or WebP up to 10MB</p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1 bg-transparent" onClick={() => setShowUploadModal(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
