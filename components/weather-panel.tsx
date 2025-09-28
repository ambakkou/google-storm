"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { 
  Thermometer, 
  Droplets, 
  Wind, 
  Eye, 
  Gauge, 
  Sun,
  CloudRain,
  AlertTriangle,
  RefreshCw,
  ChevronDown,
  ChevronUp
} from "lucide-react"
import { WeatherService, WeatherResponse, ForecastResponse, WeatherAlert } from "@/lib/weather-service"

interface WeatherPanelProps {
  lat: number
  lng: number
  onAlertClick?: (alert: WeatherAlert) => void
}

export function WeatherPanel({ lat, lng, onAlertClick }: WeatherPanelProps) {
  const [weatherData, setWeatherData] = useState<WeatherResponse | null>(null)
  const [forecastData, setForecastData] = useState<ForecastResponse | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const weatherService = WeatherService.getInstance()

  const fetchWeatherData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setIsRefreshing(true)
      } else {
        setIsLoading(true)
      }
      setError(null)
      
      const [currentWeather, forecast] = await Promise.all([
        weatherService.getCurrentWeather(lat, lng),
        weatherService.getForecast(lat, lng)
      ])
      
      setWeatherData(currentWeather)
      setForecastData(forecast)
    } catch (err) {
      console.error('Failed to fetch weather data:', err)
      setError('Failed to load weather data')
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchWeatherData(false)
    
    // Refresh every 10 minutes
    const interval = setInterval(() => fetchWeatherData(false), 10 * 60 * 1000)
    return () => clearInterval(interval)
  }, [lat, lng])

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5" />
            Weather Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <RefreshCw className="w-6 h-6 animate-spin" />
            <span className="ml-2">Loading weather data...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error || !weatherData) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CloudRain className="w-5 h-5" />
            Weather Conditions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-4">{error || 'Unable to load weather data'}</p>
            <Button onClick={() => fetchWeatherData(false)} size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeAlerts = weatherData.alerts.filter(alert => alert.isActive)
  const urgentAlerts = activeAlerts.filter(alert => weatherService.isUrgentAlert(alert))
  const hurricaneAlerts = activeAlerts.filter(alert => weatherService.isHurricaneRelated(alert))

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className="w-full">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2">
                  <CloudRain className="w-5 h-5" />
                  Weather Conditions
                </CardTitle>
                {!isExpanded && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="font-medium">{weatherData.current.temperature}°F</span>
                    <span className="text-muted-foreground">{weatherData.current.condition}</span>
                    {activeAlerts.length > 0 && (
                      <Badge variant="destructive" className="text-xs">
                        {activeAlerts.length} alert{activeAlerts.length > 1 ? 's' : ''}
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
                {isExpanded && (
                  <Button 
                    onClick={(e) => {
                      e.stopPropagation()
                      fetchWeatherData(true)
                    }} 
                    size="sm" 
                    variant="outline"
                    disabled={isRefreshing}
                  >
                    <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                  </Button>
                )}
                {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </div>
            </div>
            {isExpanded && (
              <p className="text-sm text-muted-foreground">
                {weatherData.location.name}
              </p>
            )}
          </CardHeader>
        </CollapsibleTrigger>
      
      <CollapsibleContent>
        <CardContent>
          <Tabs defaultValue="current" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="current">Current</TabsTrigger>
              <TabsTrigger value="forecast">5-Day Forecast</TabsTrigger>
            </TabsList>
          
          <TabsContent value="current" className="space-y-4">
            {/* Current Weather */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold">{weatherData.current.temperature}°F</div>
                <div className="text-sm text-muted-foreground">{weatherData.current.condition}</div>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <Droplets className="w-4 h-4" />
                  <span>Humidity: {weatherData.current.humidity}%</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Wind className="w-4 h-4" />
                  <span>Wind: {weatherData.current.windSpeed} mph</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Eye className="w-4 h-4" />
                  <span>Visibility: {weatherData.current.visibility} mi</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Gauge className="w-4 h-4" />
                  <span>Pressure: {weatherData.current.pressure} inHg</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Sun className="w-4 h-4" />
                  <span>UV Index: {weatherData.current.uvIndex}</span>
                </div>
              </div>
            </div>

            {/* Active Alerts */}
            {activeAlerts.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Active Weather Alerts ({activeAlerts.length})
                </h4>
                <div className="space-y-2">
                  {activeAlerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded-lg border ${weatherService.getSeverityColor(alert.severity)} cursor-pointer hover:opacity-80 transition-opacity`}
                      onClick={() => onAlertClick?.(alert)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-lg">{weatherService.getTypeIcon(alert.type)}</span>
                        <span className="text-sm font-medium">{alert.title}</span>
                        <Badge variant={alert.severity === 'extreme' || alert.severity === 'severe' ? 'destructive' : 'outline'} className="text-xs">
                          {alert.severity.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-xs opacity-75">{alert.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs opacity-60">
                        <span>Source: {alert.source}</span>
                        <span>Until: {weatherService.formatAlertTime(alert.endTime)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Hurricane Risk Indicator */}
            {hurricaneAlerts.length > 0 && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center gap-2 text-red-700 font-medium">
                  <span className="text-xl">🌀</span>
                  Hurricane Alert Active
                </div>
                <p className="text-sm text-red-600 mt-1">
                  Monitor weather conditions closely. Prepare emergency supplies and follow evacuation orders if issued.
                </p>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="forecast" className="space-y-2">
            {forecastData && (
              <div className="space-y-2">
                {forecastData.forecast.map((day, index) => (
                  <div key={day.date} className="flex items-center justify-between p-2.5 border rounded-lg text-sm">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      <div className="text-xs font-medium w-12 flex-shrink-0">
                        {index === 0 ? 'Today' : new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-sm flex-shrink-0">{weatherService.getTypeIcon('other')}</div>
                      <div className="text-xs text-muted-foreground flex-1 truncate">{day.condition}</div>
                    </div>
                    
                    <div className="flex items-center gap-2.5 flex-shrink-0">
                      <div className="text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Wind className="w-3 h-3" />
                          <span>{day.windSpeed}</span>
                        </div>
                      </div>
                      
                      <div className="text-xs min-w-[3rem] text-right">
                        <span className="font-medium">{day.high}°</span>
                        <span className="text-muted-foreground">/{day.low}°</span>
                      </div>
                      
                      {day.isHurricaneRisk && (
                        <Badge variant="destructive" className="text-xs px-1.5 py-0.5 ml-1">
                          <span className="mr-1">🌀</span>
                          Risk
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        </CardContent>
      </CollapsibleContent>
    </Card>
    </Collapsible>
  )
}
