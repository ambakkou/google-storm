"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  X,
  AlertTriangle,
  CloudRain,
  Wind,
  Droplets,
  Zap,
  Clock,
  MapPin,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { SmartWeatherNotificationService, WeatherCondition } from "@/lib/smart-weather-notification-service"

interface RealWeatherNotificationProps {
  lat: number
  lng: number
  onDismiss?: (alertId: string) => void
  className?: string
}

export function RealWeatherNotification({ 
  lat, 
  lng, 
  onDismiss, 
  className = "" 
}: RealWeatherNotificationProps) {
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [notificationService] = useState(() => SmartWeatherNotificationService.getInstance())

  // Initialize weather monitoring
  useEffect(() => {
    const checkWeather = async () => {
      setIsLoading(true)
      try {
        console.log('Checking weather conditions...', { lat, lng })
        const condition = await notificationService.checkWeatherConditions(lat, lng)
        console.log('Weather condition result:', condition)
        if (condition && !dismissedAlerts.has(condition.id)) {
          console.log('Setting weather condition:', condition)
          setWeatherCondition(condition)
          setLastUpdate(new Date())
        } else {
          console.log('No weather condition to show')
          setWeatherCondition(null)
        }
      } catch (error) {
        console.error('Error checking weather conditions:', error)
        setWeatherCondition(null)
      } finally {
        setIsLoading(false)
      }
    }

    checkWeather()

    // Start monitoring
    notificationService.startMonitoring(lat, lng, (condition) => {
      console.log('Monitoring callback triggered:', condition)
      if (condition && !dismissedAlerts.has(condition.id)) {
        console.log('Setting weather condition from monitoring:', condition)
        setWeatherCondition(condition)
        setLastUpdate(new Date())
      } else {
        console.log('No condition from monitoring or already dismissed')
        setWeatherCondition(null)
      }
    })

    return () => {
      notificationService.stopMonitoring()
    }
  }, [lat, lng, notificationService, dismissedAlerts])

  // Listen for settings changes and refresh
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'weatherTestMode' || e.key === 'weatherNotificationSettings') {
        console.log('Settings changed, refreshing weather conditions')
        notificationService.reloadSettings()
        // Force a refresh
        notificationService.forceRefresh(lat, lng).then(condition => {
          if (condition && !dismissedAlerts.has(condition.id)) {
            setWeatherCondition(condition)
            setLastUpdate(new Date())
          } else {
            setWeatherCondition(null)
          }
        })
      }
    }

    const handleCustomEvent = () => {
      console.log('Custom weather settings change event received')
      notificationService.reloadSettings()
      
      // Restart monitoring with new settings
      notificationService.stopMonitoring()
      notificationService.startMonitoring(lat, lng, (condition) => {
        console.log('Monitoring callback triggered after settings change:', condition)
        if (condition && !dismissedAlerts.has(condition.id)) {
          console.log('Setting weather condition from monitoring after settings change:', condition)
          setWeatherCondition(condition)
          setLastUpdate(new Date())
        } else {
          console.log('No condition from monitoring after settings change or already dismissed')
          setWeatherCondition(null)
        }
      })
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('weatherSettingsChanged', handleCustomEvent)
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('weatherSettingsChanged', handleCustomEvent)
    }
  }, [lat, lng, notificationService, dismissedAlerts])

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
    setWeatherCondition(null)
    onDismiss?.(alertId)
  }

  const getConditionColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'bg-gradient-to-r from-red-900 to-red-800 border-red-600 text-white shadow-red-500/50'
      case 'severe': return 'bg-gradient-to-r from-orange-900 to-orange-800 border-orange-600 text-white shadow-orange-500/50'
      case 'moderate': return 'bg-gradient-to-r from-blue-900 to-blue-800 border-blue-600 text-white shadow-blue-500/50'
      case 'low': return 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-600 text-white shadow-gray-500/50'
      default: return 'bg-gradient-to-r from-gray-900 to-gray-800 border-gray-600 text-white shadow-gray-500/50'
    }
  }

  const getConditionIcon = (type: string) => {
    switch (type) {
      case 'hurricane': return '🌀'
      case 'storm': return '⛈️'
      case 'severe': return '⚠️'
      case 'rain': return '🌧️'
      case 'moderate': return '🌦️'
      case 'flood': return '🌊'
      default: return 'ℹ️'
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString()
  }

  if (!weatherCondition) {
    return null
  }

  return (
    <div className={`fixed top-16 left-1/2 transform -translate-x-1/2 z-50 max-w-sm w-full mx-4 ${className}`}>
      <div className={`${getConditionColor(weatherCondition.severity)} rounded-lg border shadow-xl backdrop-blur-sm`}>
        {/* Compact header */}
        <div className={`${weatherCondition.severity === 'extreme' ? 'animate-pulse' : ''} p-3`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              {/* Weather Icon */}
              <div className="text-2xl flex-shrink-0">
                {getConditionIcon(weatherCondition.type)}
              </div>
              
              <div className="flex-1 min-w-0">
                {/* Title and Badge in one line */}
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold text-sm leading-tight truncate">
                    {weatherCondition.title}
                  </h3>
                  <Badge 
                    variant="outline" 
                    className={`text-xs font-semibold px-1.5 py-0.5 flex-shrink-0 ${
                      weatherCondition.severity === 'extreme' 
                        ? 'bg-red-500/30 text-red-100 border-red-400' 
                        : weatherCondition.severity === 'severe'
                        ? 'bg-orange-500/30 text-orange-100 border-orange-400'
                        : 'bg-blue-500/30 text-blue-100 border-blue-400'
                    }`}
                  >
                    {weatherCondition.severity.toUpperCase()}
                  </Badge>
                </div>

                {/* Compact description */}
                <p className="text-xs opacity-90 leading-tight mb-2 line-clamp-2">
                  {weatherCondition.description}
                </p>

                {/* Compact info row */}
                <div className="flex items-center gap-3 text-xs opacity-75">
                  {weatherCondition.distance && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-2.5 h-2.5" />
                      <span>{weatherCondition.distance}km</span>
                    </div>
                  )}
                  {weatherCondition.eta && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" />
                      <span>{weatherCondition.eta}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    <span>{formatTime(lastUpdate)}</span>
                  </div>
                  {weatherCondition.source && (
                    <div className="text-xs opacity-60">
                      via {weatherCondition.source}
                    </div>
                  )}
                </div>

                {/* Compact safety recommendations */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-white/20">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Safety Tips
                      </h4>
                      <div className="bg-black/20 rounded p-2">
                        <p className="text-xs leading-relaxed line-clamp-4">
                          {weatherCondition.recommendation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Compact action buttons */}
            <div className="flex flex-col gap-1 ml-2 flex-shrink-0">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20 rounded-full"
              >
                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissAlert(weatherCondition.id)}
                className="h-6 w-6 p-0 text-white hover:bg-white/20 rounded-full"
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </div>
        </div>

        {/* Compact bottom accent bar */}
        <div className={`h-0.5 ${weatherCondition.severity === 'extreme' ? 'bg-red-400' : weatherCondition.severity === 'severe' ? 'bg-orange-400' : 'bg-blue-400'} rounded-b-lg`}></div>
      </div>
    </div>
  )
}