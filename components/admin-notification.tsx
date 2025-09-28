"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  X
} from "lucide-react"
import { useSession, signOut } from "next-auth/react"

interface AdminNotificationProps {
  className?: string
}

interface AdminEvent {
  id: string
  type: 'login' | 'logout'
}

export function AdminNotification({ className = "" }: AdminNotificationProps) {
  const { data: session, status } = useSession()
  const [currentNotification, setCurrentNotification] = useState<AdminEvent | null>(null)

  // Track admin login
  useEffect(() => {
    if (session?.user?.isAdmin && status === 'authenticated') {
      const loginEvent: AdminEvent = {
        id: `login_${Date.now()}`,
        type: 'login'
      }

      setCurrentNotification(loginEvent)

      // Auto-hide after 3 seconds
      setTimeout(() => {
        setCurrentNotification(null)
      }, 3000)
    }
  }, [session?.user?.isAdmin, status])

  // Handle sign out
  const handleSignOut = async () => {
    const logoutEvent: AdminEvent = {
      id: `logout_${Date.now()}`,
      type: 'logout'
    }

    setCurrentNotification(logoutEvent)

    // Auto-hide after 3 seconds
    setTimeout(() => {
      setCurrentNotification(null)
    }, 3000)

    await signOut({ callbackUrl: '/' })
  }

  const dismissNotification = () => {
    setCurrentNotification(null)
  }

  const getEventMessage = (type: AdminEvent['type']) => {
    return type === 'login' ? 'Logged in successfully' : 'Logged out successfully'
  }

  const getEventColor = (type: AdminEvent['type']) => {
    return type === 'login'
      ? 'bg-green-600 border-green-500 text-white'
      : 'bg-blue-600 border-blue-500 text-white'
  }

  // Don't show anything if user is not admin
  if (!session?.user?.isAdmin) {
    return null
  }

  return (
    <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-30 space-y-2 ${className}`}>
      {/* Current Notification */}
      {currentNotification && (
        <div className={`${getEventColor(currentNotification.type)} rounded-lg border shadow-lg px-4 py-3 max-w-sm`}>
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm">
              {getEventMessage(currentNotification.type)}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={dismissNotification}
              className="h-6 w-6 p-0 text-white hover:bg-white/20"
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      )}


    </div>
  )
}
