"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Sparkles, Plus, Wand2, Home, Calendar, Trash2, Loader2 } from "lucide-react"
import { AuthButton } from "@/components/auth-button"
import { useUser } from "@/hooks/use-user"
import { toast } from "sonner"

interface Canvas {
  id: string
  name: string
  thumbnail: string | null
  created_at: string
  updated_at: string
}

export default function GalleryPage() {
  const { user } = useUser()
  const router = useRouter()
  const [canvases, setCanvases] = useState<Canvas[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingCanvasId, setLoadingCanvasId] = useState<string | null>(null)
  const [selectedCanvas, setSelectedCanvas] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      loadCanvases()
    } else {
      setLoading(false)
    }
  }, [user])

  const loadCanvases = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/canvas/list')
      if (response.ok) {
        const data = await response.json()
        setCanvases(data.canvases || [])
      } else {
        const error = await response.json()
        toast.error('Failed to load canvases', { description: error.error })
      }
    } catch (error) {
      console.error('Error loading canvases:', error)
      toast.error('Failed to load canvases')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (canvasId: string, canvasName: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm(`Are you sure you want to delete "${canvasName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const response = await fetch(`/api/canvas/delete?id=${canvasId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        toast.success(`Canvas "${canvasName}" deleted successfully!`)
        loadCanvases()
      } else {
        const error = await response.json()
        toast.error('Failed to delete canvas', { description: error.error })
      }
    } catch (error) {
      console.error('Error deleting canvas:', error)
      toast.error('Failed to delete canvas')
    }
  }

  const handleLoad = async (canvasId: string) => {
    setLoadingCanvasId(canvasId)
    try {
      const response = await fetch(`/api/canvas/load?id=${canvasId}`)
      if (response.ok) {
        const data = await response.json()
        // Store canvas data in sessionStorage to load in whiteboard
        sessionStorage.setItem('loadCanvasId', canvasId)
        router.push('/whiteboard')
      } else {
        const error = await response.json()
        toast.error('Failed to load canvas', { description: error.error })
        setLoadingCanvasId(null)
      }
    } catch (error) {
      console.error('Error loading canvas:', error)
      toast.error('Failed to load canvas')
      setLoadingCanvasId(null)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
    return `${Math.floor(diffDays / 365)} years ago`
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Background effects */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-40 right-40 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="absolute bottom-20 left-20 w-64 h-64 bg-secondary/10 rounded-full blur-3xl" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-sm">
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
              <Link href="/whiteboard">
                <Button className="animate-glow-pulse">
                  <Plus className="w-4 h-4 mr-2" />
                  New Creation
                </Button>
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="relative z-10 container mx-auto px-6 py-12">
          {/* Header */}
        <div className="max-w-6xl mx-auto mb-12">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Sparkles className="w-6 h-6 text-primary-foreground" />
            </div>
            <div>
              <h2 className="text-4xl font-serif font-bold text-balance">
                {user ? "Your Grimoire" : "Gallery"}
              </h2>
              <p className="text-muted-foreground mt-1">
                {user 
                  ? "A collection of your magical creations" 
                  : "Sign in to save and manage your canvases"}
              </p>
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div className="max-w-6xl mx-auto">
          {!user && (
            <div className="text-center py-24 mb-12 bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3">Sign in to Access Your Gallery</h3>
              <p className="text-muted-foreground mb-6">Sign in with Google to save and manage your canvases</p>
              <AuthButton />
            </div>
          )}
          {user && (
            <>
              {loading ? (
                <div className="flex items-center justify-center py-24">
                  <Loader2 className="w-8 h-8 animate-spin text-primary" />
                </div>
              ) : (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {canvases.map((canvas, index) => (
                    <div
                      key={canvas.id}
                      className="relative group cursor-pointer"
                      onClick={() => {
                        setSelectedCanvas(canvas.id)
                        // Open canvas when clicking the card
                        handleLoad(canvas.id)
                      }}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      {/* Animated confetti effect on hover */}
                      {selectedCanvas === canvas.id && (
                        <div className="absolute -top-4 -right-4 pointer-events-none">
                          {[...Array(8)].map((_, i) => (
                            <div
                              key={i}
                              className="absolute w-2 h-2 rounded-full animate-sparkle"
                              style={{
                                backgroundColor:
                                  i % 3 === 0
                                    ? "oklch(0.68 0.15 285)"
                                    : i % 3 === 1
                                      ? "oklch(0.75 0.12 55)"
                                      : "oklch(0.72 0.18 295)",
                                left: `${Math.cos(i * 45) * 20}px`,
                                top: `${Math.sin(i * 45) * 20}px`,
                                animationDelay: `${i * 0.1}s`,
                              }}
                            />
                          ))}
                        </div>
                      )}

                      {/* Card glow effect */}
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-accent/10 to-secondary/20 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all duration-500" />

                      {/* Card */}
                      <div className="relative bg-card/80 backdrop-blur-sm border-2 border-border/50 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300">
                        {/* Card image/preview */}
                        <div className="aspect-video bg-gradient-to-br from-primary/10 via-accent/5 to-secondary/10 border-b border-border/50 relative overflow-hidden">
                          {canvas.thumbnail ? (
                            <img
                              src={canvas.thumbnail}
                              alt={canvas.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center p-8">
                              <div className="w-full h-full bg-background/30 rounded-lg border border-primary/20 backdrop-blur-sm p-4 relative overflow-hidden">
                                {/* Gold outline glow */}
                                <div className="absolute inset-0 border-2 border-secondary/30 rounded-lg shadow-[0_0_20px_rgba(255,215,0,0.2)] group-hover:shadow-[0_0_30px_rgba(255,215,0,0.4)] transition-all" />
                                {/* Placeholder content */}
                                <div className="relative z-10">
                                  <div className="flex items-center gap-2 mb-3">
                                    <div className="w-8 h-8 rounded bg-primary/20" />
                                    <div className="h-4 flex-1 bg-accent/15 rounded" />
                                  </div>
                                  <div className="grid grid-cols-2 gap-2">
                                    <div className="aspect-square bg-secondary/10 rounded" />
                                    <div className="aspect-square bg-primary/10 rounded" />
                                  </div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Card content */}
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-3">
                            <h3 className="font-serif font-bold text-lg text-foreground leading-snug flex-1 text-balance">
                              {canvas.name}
                            </h3>
                            <Wand2 className="w-5 h-5 text-primary flex-shrink-0 ml-2" />
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-border/50">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Calendar className="w-3 h-3" />
                              <span>{formatDate(canvas.updated_at)}</span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 hover:bg-destructive/10 hover:text-destructive"
                                onClick={(e) => handleDelete(canvas.id, canvas.name, e)}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>

                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-8 px-3 text-xs"
                                disabled={loadingCanvasId === canvas.id}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleLoad(canvas.id)
                                }}
                              >
                                {loadingCanvasId === canvas.id ? (
                                  <>
                                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                    Loading...
                                  </>
                                ) : (
                                  'Open'
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* Completion indicator */}
                        <div className="absolute top-3 right-3">
                          <div className="w-8 h-8 rounded-full bg-secondary/20 border-2 border-secondary/50 flex items-center justify-center backdrop-blur-sm">
                            <Sparkles className="w-4 h-4 text-secondary animate-pulse" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* New Project Card */}
                  <Link href="/whiteboard">
                    <div className="relative group cursor-pointer h-full">
                      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-all" />

                      <div className="relative bg-card/50 backdrop-blur-sm border-2 border-dashed border-border/50 rounded-2xl h-full min-h-[400px] flex flex-col items-center justify-center p-8 hover:border-primary/50 transition-all">
                        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                          <Plus className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-serif font-bold text-xl mb-2">New Creation</h3>
                        <p className="text-sm text-muted-foreground text-center">{"Start a new magical project"}</p>
                      </div>
                    </div>
                  </Link>
                </div>
              )}
            </>
          )}

          {/* Empty state message */}
          {user && !loading && canvases.length === 0 && (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-full bg-muted/30 flex items-center justify-center mx-auto mb-6">
                <Sparkles className="w-10 h-10 text-muted-foreground" />
              </div>
              <h3 className="text-2xl font-serif font-bold mb-3">Your Grimoire is Empty</h3>
              <p className="text-muted-foreground mb-6">{"Start creating magical projects to see them appear here"}</p>
              <Link href="/whiteboard">
                <Button className="animate-glow-pulse">
                  <Wand2 className="w-4 h-4 mr-2" />
                  Create Your First Project
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
