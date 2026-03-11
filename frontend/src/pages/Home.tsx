import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/context/AuthContext'
import { Wallet } from 'lucide-react'

export default function Home() {
  const { isAuthenticated } = useAuth()
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isHovering, setIsHovering] = useState(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY })
    if (!isHovering) setIsHovering(true)
  }

  return (
    <div 
      className="relative flex flex-col items-center justify-center min-h-[90vh] px-4 text-center overflow-hidden"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setIsHovering(false)}
    >
      {/* Interactive Cursor Glow - Finance Theme (Emerald) */}
      <div 
        className="pointer-events-none fixed inset-0 z-0 transition-opacity duration-700 ease-in-out"
        style={{ opacity: isHovering ? 1 : 0 }}
      >
        <div
          className="absolute w-[450px] h-[450px] bg-emerald-500/20 dark:bg-emerald-400/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            transition: 'left 0.15s ease-out, top 0.15s ease-out'
          }}
        />
      </div>

      <div className="z-10 relative flex flex-col items-center">
        <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 rounded-full mb-6">
          <Wallet className="w-12 h-12 text-emerald-600 dark:text-emerald-400" />
        </div>
        <h1 className="text-4xl md:text-6xl font-extrabold mb-4 tracking-tight">
          Take Control of Your <span className="text-emerald-600 dark:text-emerald-400">Finances</span>
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl max-w-[600px] mb-8 leading-relaxed">
          A minimal, fast, and secure way to track your income and expenses. Built with modern tools to give you the best experience.
        </p>
        <div className="flex gap-4">
          {isAuthenticated ? (
            <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8">
              <Link to="/dashboard">Go to Dashboard</Link>
            </Button>
          ) : (
            <>
              <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full px-8">
                <Link to="/login">Login</Link>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-full px-8 border-emerald-200 hover:bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:hover:bg-emerald-950 dark:text-emerald-400">
                <Link to="/register">Create Account</Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
