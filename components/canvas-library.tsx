'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Loader2, Save, FolderOpen, Trash2 } from 'lucide-react'
import { toast } from 'sonner'

interface Canvas {
  id: string
  name: string
  thumbnail: string | null
  created_at: string
  updated_at: string
}

interface CanvasLibraryProps {
  elements: any[]
  onLoad: (data: {
    elements: any[]
    analysis?: any
    diagram?: any
    diagramIterations?: any[]
    pitch?: any
    competitive?: any
    roadmap?: any
    description?: string
  }) => void
  // AI content to save
  description?: string
  analysis?: any
  diagram?: any
  diagramIterations?: any[]
  pitch?: any
  competitive?: any
  roadmap?: any
  // Current canvas ID if editing existing
  currentCanvasId?: string | null
  currentCanvasName?: string | null
}

export function CanvasLibrary({ 
  elements, 
  onLoad,
  description = '',
  analysis = null,
  diagram = null,
  diagramIterations = [],
  pitch = null,
  competitive = null,
  roadmap = null,
  currentCanvasId = null,
  currentCanvasName = null,
}: CanvasLibraryProps) {
  const [user, setUser] = useState<any>(null)
  const [canvases, setCanvases] = useState<Canvas[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [loadDialogOpen, setLoadDialogOpen] = useState(false)
  const [canvasName, setCanvasName] = useState(currentCanvasName || '')
  const supabase = createClient()

  // Update canvas name when currentCanvasName changes (when loading a canvas)
  useEffect(() => {
    if (currentCanvasName) {
      setCanvasName(currentCanvasName)
    }
  }, [currentCanvasName])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user) {
        loadCanvases()
      }
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) {
        loadCanvases()
      } else {
        setCanvases([])
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  const loadCanvases = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/canvas/list')
      if (response.ok) {
        const data = await response.json()
        setCanvases(data.canvases || [])
      } else {
        toast.error('Failed to load canvases')
      }
    } catch (error) {
      console.error('Error loading canvases:', error)
      toast.error('Failed to load canvases')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!canvasName.trim()) {
      toast.error('Please enter a name for your canvas')
      return
    }

    setSaving(true)
    try {
      // Generate thumbnail from canvas
      const canvas = document.querySelector('canvas') as HTMLCanvasElement
      const thumbnail = canvas ? canvas.toDataURL('image/png') : null

      const response = await fetch('/api/canvas/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: currentCanvasId, // Include ID if updating existing canvas
          name: canvasName,
          elements: elements,
          thumbnail: thumbnail,
          description: description,
          analysis: analysis,
          diagram: diagram,
          diagramIterations: diagramIterations,
          pitch: pitch,
          competitive: competitive,
          roadmap: roadmap,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        toast.success(currentCanvasId ? 'Canvas updated successfully!' : 'Canvas saved successfully!')
        setSaveDialogOpen(false)
        // Store canvas ID and name for future resaves
        if (data.canvas && typeof window !== 'undefined') {
          sessionStorage.setItem('currentCanvasId', data.canvas.id)
          sessionStorage.setItem('currentCanvasName', data.canvas.name)
        }
        // Don't clear name if we're updating - keep it for next save
        if (!currentCanvasId) {
          setCanvasName('')
        }
        loadCanvases()
      } else {
        const error = await response.json()
        toast.error(error.error || 'Failed to save canvas')
      }
    } catch (error) {
      console.error('Error saving canvas:', error)
      toast.error('Failed to save canvas')
    } finally {
      setSaving(false)
    }
  }

  const handleLoad = async (canvasId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`/api/canvas/load?id=${canvasId}`)
      if (response.ok) {
        const data = await response.json()
        onLoad({
          elements: data.canvas.elements,
          analysis: data.canvas.analysis,
          diagram: data.canvas.diagram,
          diagramIterations: data.canvas.diagram_iterations || [],
          pitch: data.canvas.pitch,
          competitive: data.canvas.competitive,
          roadmap: data.canvas.roadmap,
          description: data.canvas.description || '',
        })
        // Store canvas ID and name for resaving
        if (typeof window !== 'undefined') {
          sessionStorage.setItem('currentCanvasId', data.canvas.id)
          sessionStorage.setItem('currentCanvasName', data.canvas.name)
        }
        setLoadDialogOpen(false)
        toast.success('Canvas loaded successfully!')
      } else {
        toast.error('Failed to load canvas')
      }
    } catch (error) {
      console.error('Error loading canvas:', error)
      toast.error('Failed to load canvas')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (canvasId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this canvas?')) {
      return
    }

    try {
      const response = await fetch(`/api/canvas/delete?id=${canvasId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success('Canvas deleted successfully!')
        loadCanvases()
      } else {
        toast.error('Failed to delete canvas')
      }
    } catch (error) {
      console.error('Error deleting canvas:', error)
      toast.error('Failed to delete canvas')
    }
  }

  if (!user) {
    return null
  }

  return (
    <>
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Save to Grimoire">
            <Save className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {currentCanvasId ? 'Update Canvas in Grimoire' : 'Save to Grimoire'}
            </DialogTitle>
            <DialogDescription>
              {currentCanvasId 
                ? `Update "${currentCanvasName}" with your current changes`
                : 'Save your current canvas to your Grimoire'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Enter canvas name"
              value={canvasName}
              onChange={(e) => setCanvasName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSave()
                }
              }}
            />
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {currentCanvasId ? 'Updating...' : 'Saving to Grimoire...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {currentCanvasId ? 'Update Canvas' : 'Save to Grimoire'}
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="icon" title="Load Canvas">
            <FolderOpen className="w-5 h-5" />
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>My Grimoire</DialogTitle>
            <DialogDescription>
              Load a saved canvas from your Grimoire
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 max-h-[400px] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : canvases.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No saved canvases yet. Create one to get started!
              </div>
            ) : (
              canvases.map((canvas) => (
                <div
                  key={canvas.id}
                  onClick={() => handleLoad(canvas.id)}
                  className="flex items-center gap-4 p-4 border rounded-lg cursor-pointer hover:bg-accent transition-colors"
                >
                  {canvas.thumbnail ? (
                    <img
                      src={canvas.thumbnail}
                      alt={canvas.name}
                      className="w-16 h-16 object-cover rounded"
                    />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                      <FolderOpen className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                  <div className="flex-1">
                    <h3 className="font-medium">{canvas.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {new Date(canvas.updated_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => handleDelete(canvas.id, e)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

