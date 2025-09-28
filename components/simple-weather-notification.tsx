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
  MapPin,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react"

interface SimpleWeatherNotificationProps {
  lat: number
  lng: number
  onDismiss?: (alertId: string) => void
  className?: string
  testMode?: boolean
  testCondition?: {
    type: 'rain' | 'storm' | 'severe_storm' | 'hurricane' | 'flood' | 'clear'
    severity: 'minor' | 'moderate' | 'severe' | 'extreme'
    probability: number
  }
}

interface WeatherCondition {
  type: 'rain' | 'storm' | 'severe_storm' | 'hurricane' | 'flood' | 'clear'
  severity: 'minor' | 'moderate' | 'severe' | 'extreme'
  probability: number
  timeToStart: string
  duration: string
  intensity: string
  safetyAdvice: string[]
  governmentAlerts: any[]
}

export function SimpleWeatherNotification({ 
  lat, 
  lng, 
  onDismiss, 
  className = "",
  testMode = false,
  testCondition
}: SimpleWeatherNotificationProps) {
  const [weatherCondition, setWeatherCondition] = useState<WeatherCondition | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  useEffect(() => {
    const checkWeatherConditions = async () => {
      try {
        setIsLoading(true)
        
        if (testMode && testCondition) {
          // Use test condition
          const condition = createTestCondition(testCondition)
          setWeatherCondition(condition)
          setLastUpdate(new Date())
        } else {
          // Try to fetch real weather data
          try {
            const response = await fetch(`/api/weather/enhanced-analysis?lat=${lat}&lng=${lng}`)
            if (response.ok) {
              const data = await response.json()
              if (data.hasWeatherCondition && data.condition) {
                setWeatherCondition(data.condition)
                setLastUpdate(new Date())
              } else {
                // Generate a mock condition for testing
                const mockCondition = generateMockCondition()
                setWeatherCondition(mockCondition)
                setLastUpdate(new Date())
              }
            } else {
              // Fallback to mock data
              const mockCondition = generateMockCondition()
              setWeatherCondition(mockCondition)
              setLastUpdate(new Date())
            }
          } catch (error) {
            console.log('API failed, using mock data:', error)
            // Fallback to mock data
            const mockCondition = generateMockCondition()
            setWeatherCondition(mockCondition)
            setLastUpdate(new Date())
          }
        }
      } catch (error) {
        console.error('Failed to check weather conditions:', error)
      } finally {
        setIsLoading(false)
      }
    }

    checkWeatherConditions()
    
    // Refresh every 30 seconds for testing
    const interval = setInterval(checkWeatherConditions, 30 * 1000)
    return () => clearInterval(interval)
  }, [lat, lng, testMode, testCondition])

  const createTestCondition = (testCondition: any): WeatherCondition => {
    return {
      type: testCondition.type,
      severity: testCondition.severity,
      probability: testCondition.probability,
      timeToStart: 'Now',
      duration: '2-4 hours',
      intensity: testCondition.severity === 'extreme' ? 'Extreme' : 
                testCondition.severity === 'severe' ? 'High' : 
                testCondition.severity === 'moderate' ? 'Medium' : 'Low',
      safetyAdvice: getSafetyAdvice(testCondition.type, testCondition.severity),
      governmentAlerts: []
    }
  }

  const generateMockCondition = (): WeatherCondition => {
    const conditions = [
      { type: 'rain', severity: 'minor', probability: 60 },
      { type: 'storm', severity: 'moderate', probability: 75 },
      { type: 'severe_storm', severity: 'severe', probability: 85 },
      { type: 'hurricane', severity: 'extreme', probability: 95 }
    ]
    
    const randomCondition = conditions[Math.floor(Math.random() * conditions.length)]
    
    return {
      type: randomCondition.type,
      severity: randomCondition.severity,
      probability: randomCondition.probability,
      timeToStart: 'Now',
      duration: '2-4 hours',
      intensity: randomCondition.severity === 'extreme' ? 'Extreme' : 
                randomCondition.severity === 'severe' ? 'High' : 
                randomCondition.severity === 'moderate' ? 'Medium' : 'Low',
      safetyAdvice: getSafetyAdvice(randomCondition.type, randomCondition.severity),
      governmentAlerts: []
    }
  }

  const getSafetyAdvice = (type: string, severity: string): string[] => {
    const advice: string[] = []
    
    switch (type) {
      case 'hurricane':
        advice.push(
          "🚨 EVACUATE if ordered by local authorities",
          "📦 Prepare emergency kit with food, water, medications",
          "🏠 Secure outdoor furniture and objects",
          "📱 Keep phones charged and have backup power",
          "🚗 Fill gas tanks and park vehicles in safe locations"
        )
        break
      case 'severe_storm':
      case 'storm':
        advice.push(
          "🏠 Stay indoors and avoid windows",
          "⚡ Avoid electrical equipment and plumbing",
          "🚗 Do not drive through flooded areas",
          "📱 Keep emergency contacts handy",
          "🔋 Charge devices in case of power outages"
        )
        break
      case 'rain':
        advice.push(
          "🌂 Carry umbrella or rain gear",
          "🚗 Drive carefully on wet roads",
          "👟 Wear appropriate footwear",
          "📱 Check weather updates regularly"
        )
        break
      case 'flood':
        advice.push(
          "🚗 Never drive through flooded roads",
          "🏠 Move to higher ground if necessary",
          "📱 Stay informed about evacuation routes",
          "💧 Avoid contact with flood water"
        )
        break
    }

    if (severity === 'severe' || severity === 'extreme') {
      advice.unshift("🚨 TAKE IMMEDIATE ACTION - Severe weather conditions detected")
    }

    return advice
  }

  const getConditionIcon = (type: string, severity: string) => {
    if (severity === 'extreme') return '🔴'
    if (severity === 'severe') return '🚨'
    
    switch (type) {
      case 'hurricane': return '🌀'
      case 'severe_storm': return '⛈️'
      case 'storm': return '🌩️'
      case 'rain': return '🌧️'
      case 'flood': return '🌊'
      default: return '🌦️'
    }
  }

  const getConditionColor = (severity: string) => {
    switch (severity) {
      case 'extreme': return 'bg-red-50 border-red-200 text-red-800'
      case 'severe': return 'bg-orange-50 border-orange-200 text-orange-800'
      case 'moderate': return 'bg-yellow-50 border-yellow-200 text-yellow-800'
      case 'minor': return 'bg-blue-50 border-blue-200 text-blue-800'
      default: return 'bg-gray-50 border-gray-200 text-gray-800'
    }
  }

  const handleDismiss = (alertId?: string) => {
    if (alertId) {
      setDismissedAlerts(prev => new Set([...prev, alertId]))
      onDismiss?.(alertId)
    } else {
      // Dismiss the entire notification
      setWeatherCondition(null)
    }
  }

  if (isLoading) {
    return (
      <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 ${className}`}>
        <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-4 w-96">
          <div className="flex items-center gap-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="text-sm">Checking weather conditions...</span>
          </div>
        </div>
      </div>
    )
  }

  if (!weatherCondition || weatherCondition.type === 'clear') {
    return null
  }

  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-full mx-4 ${className}`}>
      <Alert className={`${getConditionColor(weatherCondition.severity)} border-2 shadow-lg`}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <div className="text-2xl">
              {getConditionIcon(weatherCondition.type, weatherCondition.severity)}
            </div>
            <div className="flex-1">
              <AlertTitle className="flex items-center gap-2 mb-1">
                <span className="font-bold">
                  {weatherCondition.severity === 'extreme' ? 'EXTREME WEATHER ALERT' :
                   weatherCondition.severity === 'severe' ? 'SEVERE WEATHER WARNING' :
                   weatherCondition.severity === 'moderate' ? 'WEATHER ADVISORY' :
                   'WEATHER NOTICE'}
                </span>
                <Badge variant={weatherCondition.severity === 'extreme' || weatherCondition.severity === 'severe' ? 'destructive' : 'outline'}>
                  {weatherCondition.severity.toUpperCase()}
                </Badge>
              </AlertTitle>
              
              <AlertDescription className="space-y-2">
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {weatherCondition.type.replace('_', ' ').toUpperCase()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {weatherCondition.timeToStart}
                  </span>
                  <span className="flex items-center gap-1">
                    <Droplets className="w-3 h-3" />
                    {weatherCondition.probability}% chance
                  </span>
                </div>

                {testMode && (
                  <div className="text-xs opacity-75 bg-blue-100 px-2 py-1 rounded">
                    <strong>TEST MODE:</strong> This is a simulated weather condition
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="h-6 px-2 text-xs"
                  >
                    {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    {isExpanded ? 'Less' : 'Safety Advice'}
                  </Button>
                  <span className="text-xs opacity-60">
                    Updated {lastUpdate.toLocaleTimeString()}
                  </span>
                </div>

                {isExpanded && (
                  <div className="mt-3 space-y-2">
                    <div className="text-sm font-medium">Safety Recommendations:</div>
                    <ul className="space-y-1 text-xs">
                      {weatherCondition.safetyAdvice.map((advice, index) => (
                        <li key={index} className="flex items-start gap-2">
                          <span className="text-xs mt-0.5">•</span>
                          <span>{advice}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </AlertDescription>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDismiss()}
            className="ml-2 h-8 w-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </Alert>
    </div>
  )
}
