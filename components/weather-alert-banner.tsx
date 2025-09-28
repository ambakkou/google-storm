"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { X, ExternalLink, AlertTriangle } from "lucide-react"
import { WeatherService, WeatherAlert } from "@/lib/weather-service"

interface WeatherAlertBannerProps {
  lat: number
  lng: number
  onDismiss?: (alertId: string) => void
}

export function WeatherAlertBanner({ lat, lng, onDismiss }: WeatherAlertBannerProps) {
  const [alerts, setAlerts] = useState<WeatherAlert[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const weatherService = WeatherService.getInstance()

  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        setIsLoading(true)
        const weatherAlerts = await weatherService.getWeatherAlerts(lat, lng)
        setAlerts(weatherAlerts)
      } catch (error) {
        console.error('Failed to fetch weather alerts:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchAlerts()
    
    // Refresh alerts every 5 minutes
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000)
    return () => clearInterval(interval)
  }, [lat, lng, weatherService])

  const handleDismiss = (alertId: string) => {
    setDismissedAlerts(prev => new Set([...prev, alertId]))
    onDismiss?.(alertId)
  }

  const activeAlerts = alerts.filter(alert => 
    alert.isActive && !dismissedAlerts.has(alert.id)
  )

  const urgentAlerts = activeAlerts.filter(alert => 
    weatherService.isUrgentAlert(alert)
  )

  const hurricaneAlerts = activeAlerts.filter(alert => 
    weatherService.isHurricaneRelated(alert)
  )

  if (isLoading) {
    return null
  }

  if (activeAlerts.length === 0) {
    return null
  }

  return (
    <div className="space-y-3 p-4 bg-background border-b border-border">
      {urgentAlerts.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-red-600">
            <AlertTriangle className="w-4 h-4" />
            URGENT WEATHER ALERTS
          </div>
          {urgentAlerts.map((alert) => (
            <Alert key={alert.id} className={`border-l-4 border-l-red-500 ${weatherService.getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    <span className="text-lg">{weatherService.getTypeIcon(alert.type)}</span>
                    {alert.title}
                    <Badge variant="destructive" className="text-xs">
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="text-sm">{alert.description}</p>
                    <div className="mt-2 text-xs opacity-75">
                      <p><strong>Source:</strong> {alert.source}</p>
                      <p><strong>Areas:</strong> {alert.areas.join(', ')}</p>
                      <p><strong>Valid until:</strong> {weatherService.formatAlertTime(alert.endTime)}</p>
                    </div>
                    {alert.type === 'hurricane' && (
                      <div className="mt-3 p-2 bg-red-100 rounded text-xs">
                        <strong>🚨 Hurricane Safety:</strong> Evacuate if ordered. Secure outdoor items. Have emergency supplies ready.
                      </div>
                    )}
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(alert.id)}
                  className="ml-2 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {hurricaneAlerts.length > 0 && urgentAlerts.length === 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-orange-600">
            <span className="text-lg">🌀</span>
            HURRICANE WATCH
          </div>
          {hurricaneAlerts.map((alert) => (
            <Alert key={alert.id} className={`border-l-4 border-l-orange-500 ${weatherService.getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    <span className="text-lg">{weatherService.getTypeIcon(alert.type)}</span>
                    {alert.title}
                    <Badge variant="outline" className="text-xs">
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="text-sm">{alert.description}</p>
                    <div className="mt-2 text-xs opacity-75">
                      <p><strong>Source:</strong> {alert.source}</p>
                      <p><strong>Areas:</strong> {alert.areas.join(', ')}</p>
                      <p><strong>Valid until:</strong> {weatherService.formatAlertTime(alert.endTime)}</p>
                    </div>
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(alert.id)}
                  className="ml-2 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      {activeAlerts.filter(alert => 
        !weatherService.isUrgentAlert(alert) && !weatherService.isHurricaneRelated(alert)
      ).length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-blue-600">
            <span className="text-lg">🌦️</span>
            WEATHER ALERTS
          </div>
          {activeAlerts.filter(alert => 
            !weatherService.isUrgentAlert(alert) && !weatherService.isHurricaneRelated(alert)
          ).map((alert) => (
            <Alert key={alert.id} className={`${weatherService.getSeverityColor(alert.severity)}`}>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <AlertTitle className="flex items-center gap-2">
                    <span className="text-lg">{weatherService.getTypeIcon(alert.type)}</span>
                    {alert.title}
                    <Badge variant="outline" className="text-xs">
                      {alert.severity.toUpperCase()}
                    </Badge>
                  </AlertTitle>
                  <AlertDescription className="mt-2">
                    <p className="text-sm">{alert.description}</p>
                    <div className="mt-2 text-xs opacity-75">
                      <p><strong>Source:</strong> {alert.source}</p>
                      <p><strong>Areas:</strong> {alert.areas.join(', ')}</p>
                      <p><strong>Valid until:</strong> {weatherService.formatAlertTime(alert.endTime)}</p>
                    </div>
                  </AlertDescription>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDismiss(alert.id)}
                  className="ml-2 h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </Alert>
          ))}
        </div>
      )}

      <div className="text-center">
        <Button variant="outline" size="sm" asChild>
          <a 
            href="https://www.weather.gov/mfl/" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-xs"
          >
            <ExternalLink className="w-3 h-3 mr-1" />
            View Full Weather Forecast
          </a>
        </Button>
      </div>
    </div>
  )
}
