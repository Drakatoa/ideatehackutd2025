'use client'

import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Wand2, BookOpen, Lightbulb, AlertCircle, FolderOpen } from "lucide-react"
import { AuthButton } from "@/components/auth-button"
import { useUser } from "@/hooks/use-user"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default function LandingPage() {
  const { user } = useUser()
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Check for error in URL
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const errorParam = params.get('error')
      if (errorParam) {
        setError(errorParam)
        // Clean up URL
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [])

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Floating background elements */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-20 left-10 w-32 h-32 bg-primary/10 rounded-full blur-3xl animate-float" />
        <div
          className="absolute top-40 right-20 w-40 h-40 bg-secondary/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "1s" }}
        />
        <div
          className="absolute bottom-20 left-1/4 w-36 h-36 bg-accent/10 rounded-full blur-3xl animate-float"
          style={{ animationDelay: "2s" }}
        />

        {/* Sparkle elements */}
        {[...Array(15)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-secondary rounded-full animate-sparkle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav className="relative z-10 border-b border-border/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2">
              <img src="/ideate-logo.png" alt="Ideate" className="h-12 w-auto" />
            </Link>
            <div className="flex items-center gap-6">
              <Link
                href="/whiteboard"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                Whiteboard
              </Link>
              <Link href="/gallery" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Gallery
              </Link>
              <AuthButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Error Alert */}
      {error && (
        <div className="relative z-10 container mx-auto px-6 pt-6">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Authentication Error</AlertTitle>
            <AlertDescription>
              {error === 'auth_failed' && 'Failed to authenticate. Please check the server logs and try again.'}
              {error === 'no_code' && 'No authorization code received. Please try again.'}
              {error === 'no_session' && 'Session could not be created. Please try again.'}
              {error?.startsWith('oauth_') && `OAuth error: ${error.replace('oauth_', '')}`}
              {!['auth_failed', 'no_code', 'no_session'].includes(error) && !error.startsWith('oauth_') && `Error: ${error}`}
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 pt-24 pb-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8">
            <Wand2 className="w-4 h-4 text-primary" />
            <span className="text-sm text-primary">Enchanted by AI</span>
          </div>

          {user ? (
            <>
              <h2 className="text-6xl md:text-7xl font-serif font-bold text-balance mb-6 leading-tight">
                Welcome back,{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-glow-pulse inline-block">
                  {user.user_metadata?.name || user.email?.split('@')[0]}
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12 text-balance leading-relaxed max-w-2xl mx-auto">
                Ready to continue creating? Jump back into your whiteboard or explore your saved canvases.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/whiteboard">
                  <Button size="lg" className="text-lg px-8 py-6 animate-button-glow-pulse">
                    <Wand2 className="w-5 h-5 mr-2" />
                    Go to Whiteboard
                  </Button>
                </Link>
                <Link href="/gallery">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-6 border-primary/30 hover:border-primary/50 bg-transparent"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    My Gallery
                  </Button>
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-6xl md:text-7xl font-serif font-bold text-balance mb-6 leading-tight">
                Turn your sketches into{" "}
                <span className="bg-gradient-to-r from-primary via-accent to-secondary bg-clip-text text-transparent animate-glow-pulse inline-block">
                  stories
                </span>
                , your ideas into{" "}
                <span className="bg-gradient-to-r from-secondary via-primary to-accent bg-clip-text text-transparent animate-glow-pulse inline-block">
                  worlds
                </span>
              </h2>
              <p className="text-xl text-muted-foreground mb-12 text-balance leading-relaxed max-w-2xl mx-auto">
                {
                  "Ideate is your AI-powered whiteboard that transforms rough sketches and text ideas into polished product concepts. Like a magical book that brings your imagination to life."
                }
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/whiteboard">
                  <Button size="lg" className="text-lg px-8 py-6 animate-button-glow-pulse">
                    Try the Magic
                  </Button>
                </Link>
                <Link href="/whiteboard">
                  <Button
                    size="lg"
                    variant="outline"
                    className="text-lg px-8 py-6 border-primary/30 hover:border-primary/50 bg-transparent"
                  >
                    <BookOpen className="w-5 h-5 mr-2" />
                    Enter the Whiteboard
                  </Button>
                </Link>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Features Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="text-center mb-16">
          <h3 className="text-4xl font-serif font-bold mb-4">See the Magic in Action</h3>
          <p className="text-lg text-muted-foreground">{"Watch ideas transform into reality"}</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {/* Feature 1 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-accent/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-primary/50 transition-all">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Wand2 className="w-6 h-6 text-primary" />
              </div>
              <h4 className="text-xl font-serif font-bold mb-3">Sketch to Diagram</h4>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Transform your ideas into polished flowcharts and diagrams with AI-powered code generation
              </p>
              <div className="aspect-video bg-muted/30 rounded-lg border border-border/30 flex items-center justify-center p-4">
                <svg viewBox="0 0 400 200" className="w-full h-full max-w-full">
                  {/* Flowchart nodes */}
                  <defs>
                    <linearGradient id="nodeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.8" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.6" />
                    </linearGradient>
                    <linearGradient id="arrowGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#6366f1" stopOpacity="0.4" />
                    </linearGradient>
                    <marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="3" orient="auto">
                      <polygon points="0 0, 10 3, 0 6" fill="#8b5cf6" opacity="0.6" />
                    </marker>
                  </defs>
                  
                  {/* Start node */}
                  <rect x="160" y="10" width="80" height="40" rx="8" fill="url(#nodeGradient)" stroke="#8b5cf6" strokeWidth="2" />
                  <text x="200" y="35" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">Start</text>
                  
                  {/* Arrow down */}
                  <path d="M 200 50 L 200 70" stroke="url(#arrowGradient)" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  
                  {/* Decision node */}
                  <polygon points="200,80 240,100 200,120 160,100" fill="url(#nodeGradient)" stroke="#8b5cf6" strokeWidth="2" />
                  <text x="200" y="103" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Decision</text>
                  
                  {/* Arrow right */}
                  <path d="M 240 100 L 280 100" stroke="url(#arrowGradient)" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="260" y="95" textAnchor="middle" fill="#a78bfa" fontSize="10">Yes</text>
                  
                  {/* Process node right */}
                  <rect x="280" y="80" width="80" height="40" rx="8" fill="url(#nodeGradient)" stroke="#8b5cf6" strokeWidth="2" />
                  <text x="320" y="103" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Process</text>
                  
                  {/* Arrow left */}
                  <path d="M 160 100 L 120 100" stroke="url(#arrowGradient)" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  <text x="140" y="95" textAnchor="middle" fill="#a78bfa" fontSize="10">No</text>
                  
                  {/* Process node left */}
                  <rect x="40" y="80" width="80" height="40" rx="8" fill="url(#nodeGradient)" stroke="#8b5cf6" strokeWidth="2" />
                  <text x="80" y="103" textAnchor="middle" fill="white" fontSize="11" fontWeight="600">Action</text>
                  
                  {/* Arrow down from right process */}
                  <path d="M 320 120 L 320 150" stroke="url(#arrowGradient)" strokeWidth="2" markerEnd="url(#arrowhead)" />
                  
                  {/* End node */}
                  <rect x="280" y="150" width="80" height="40" rx="8" fill="url(#nodeGradient)" stroke="#8b5cf6" strokeWidth="2" />
                  <text x="320" y="175" textAnchor="middle" fill="white" fontSize="12" fontWeight="600">End</text>
                </svg>
              </div>
            </div>
          </div>

          {/* Feature 2 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 to-primary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-secondary/50 transition-all">
              <div className="w-12 h-12 rounded-full bg-secondary/10 flex items-center justify-center mb-4">
                <Lightbulb className="w-6 h-6 text-secondary" />
              </div>
              <h4 className="text-xl font-serif font-bold mb-3">AI-Powered Pitch</h4>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Generate compelling pitch summaries and roadmaps that captivate your audience
              </p>
              <div className="aspect-video bg-gradient-to-br from-secondary/10 to-primary/10 rounded-lg border border-border/30 p-4 flex flex-col justify-center">
                <div className="space-y-3">
                  {/* Pitch card mockup */}
                  <div className="bg-card/60 backdrop-blur-sm rounded-lg p-3 border border-secondary/20">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
                      <div className="h-2 bg-secondary/30 rounded w-24" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-2.5 bg-secondary/25 rounded w-full" />
                      <div className="h-2.5 bg-secondary/20 rounded w-5/6" />
                      <div className="h-2.5 bg-secondary/15 rounded w-4/5" />
                    </div>
                  </div>
                  {/* Roadmap timeline */}
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col gap-1">
                      <div className="w-3 h-3 rounded-full bg-primary border-2 border-primary/50" />
                      <div className="w-0.5 h-4 bg-primary/30 mx-auto" />
                      <div className="w-3 h-3 rounded-full bg-primary/60 border-2 border-primary/30" />
                      <div className="w-0.5 h-4 bg-primary/20 mx-auto" />
                      <div className="w-3 h-3 rounded-full bg-primary/40 border-2 border-primary/20" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="h-2 bg-primary/20 rounded w-full" />
                      <div className="h-2 bg-primary/15 rounded w-3/4" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Feature 3 */}
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/20 to-secondary/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all" />
            <div className="relative bg-card/80 backdrop-blur-sm border border-border/50 rounded-2xl p-6 hover:border-accent/50 transition-all">
              <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <FolderOpen className="w-6 h-6 text-accent" />
              </div>
              <h4 className="text-xl font-serif font-bold mb-3">Canvas Library</h4>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Save, organize, and revisit your creations with a personal gallery of all your AI-enhanced canvases
              </p>
              <div className="aspect-video bg-gradient-to-br from-accent/10 to-secondary/10 rounded-lg border border-border/30 p-4 flex flex-col justify-center">
                <div className="space-y-2">
                  {/* Gallery grid mockup */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Canvas thumbnail 1 */}
                    <div className="bg-card/60 backdrop-blur-sm rounded border border-accent/20 p-1.5 aspect-square">
                      <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 rounded flex items-center justify-center">
                        <div className="w-6 h-6 border-2 border-accent/40 rounded" />
                      </div>
                    </div>
                    {/* Canvas thumbnail 2 */}
                    <div className="bg-card/60 backdrop-blur-sm rounded border border-accent/20 p-1.5 aspect-square">
                      <div className="w-full h-full bg-gradient-to-br from-secondary/20 to-primary/20 rounded flex items-center justify-center">
                        <svg viewBox="0 0 40 40" className="w-5 h-5 text-accent/60">
                          <rect x="8" y="8" width="24" height="24" rx="2" fill="none" stroke="currentColor" strokeWidth="1.5" />
                          <circle cx="16" cy="16" r="2" fill="currentColor" />
                          <circle cx="24" cy="16" r="2" fill="currentColor" />
                          <path d="M 12 24 Q 20 20 28 24" stroke="currentColor" strokeWidth="1.5" fill="none" />
                        </svg>
                      </div>
                    </div>
                    {/* Canvas thumbnail 3 */}
                    <div className="bg-card/60 backdrop-blur-sm rounded border border-accent/20 p-1.5 aspect-square">
                      <div className="w-full h-full bg-gradient-to-br from-accent/20 to-secondary/20 rounded flex items-center justify-center">
                        <div className="space-y-1">
                          <div className="h-1 bg-accent/40 rounded w-6" />
                          <div className="h-1 bg-accent/30 rounded w-4" />
                          <div className="h-1 bg-accent/20 rounded w-5" />
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Save indicator */}
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-accent animate-pulse" />
                    <div className="h-1 bg-accent/20 rounded w-16" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-24">
        <div className="max-w-3xl mx-auto">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 via-accent/20 to-secondary/20 rounded-3xl blur-2xl" />
            <div className="relative bg-card/80 backdrop-blur-sm border border-primary/30 rounded-3xl p-12 text-center">
              <img src="/ideate-icon.png" alt="Ideate" className="w-16 h-16 mx-auto mb-6" />
              <h3 className="text-4xl font-serif font-bold mb-4">Ready to bring your ideas to life?</h3>
              <p className="text-lg text-muted-foreground mb-8">
                {"Join the enchanted workspace where creativity meets productivity"}
              </p>
              <Link href="/whiteboard">
                <Button size="lg" className="text-lg px-10 py-6">
                  <Wand2 className="w-5 h-5 mr-2" />
                  Start Creating Magic
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 mt-24">
        <div className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center">
            <div className="flex items-center gap-2">
              <img src="/ideate-icon.png" alt="Ideate" className="w-5 h-5" />
              <span className="text-sm text-muted-foreground">{"Made with ✨ for dreamers and builders"}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
