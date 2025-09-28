"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RealWeatherNotification } from "@/components/real-weather-notification"
import { ClientWeatherService } from "@/lib/client-weather-service"

const testLocations = [
  {
    name: "Miami, FL",
    lat: 25.774,
    lng: -80.193,
    description: "Hurricane-prone area"
  },
  {
    name: "Houston, TX", 
    lat: 29.7604,
    lng: -95.3698,
    description: "Hurricane-prone area"
  },
  {
    name: "New Orleans, LA",
    lat: 29.9511,
    lng: -90.0715,
    description: "Hurricane-prone area"
  },
  {
    name: "Denver, CO",
    lat: 39.7392,
    lng: -104.9903,
    description: "Mountain weather"
  }
]

export default function TestRealPage() {
  const [selectedLocation, setSelectedLocation] = useState(testLocations[0])
  const [testResults, setTestResults] = useState<string[]>([])

  const testWeatherData = async (location: typeof testLocations[0]) => {
    const weatherService = ClientWeatherService.getInstance()
    
    try {
      setTestResults(prev => [...prev, `🧪 Testing ${location.name}...`])
      
      const [weather, alerts, hurricanes] = await Promise.all([
        weatherService.getCurrentWeather(location.lat, location.lng),
        weatherService.getWeatherAlerts(location.lat, location.lng),
        weatherService.getHurricanes()
      ])

      let result = `📍 ${location.name} Results:\n`
      
      if (weather) {
        result += `   ✅ Weather: ${weather.current.condition} (${weather.current.temperature}°F)\n`
        result += `   Wind: ${weather.current.windSpeed} mph\n`
        result += `   Humidity: ${weather.current.humidity}%\n`
      } else {
        result += `   ❌ Weather data unavailable\n`
      }

      if (alerts && alerts.length > 0) {
        result += `   🚨 Active Alerts: ${alerts.length}\n`
        alerts.forEach(alert => {
          result += `      - ${alert.title} (${alert.severity})\n`
        })
      } else {
        result += `   ℹ️ No active alerts\n`
      }

      if (hurricanes && hurricanes.length > 0) {
        result += `   🌀 Active Hurricanes: ${hurricanes.length}\n`
        const nearbyHurricanes = weatherService.findNearbyHurricanes(hurricanes, location.lat, location.lng, 500)
        if (nearbyHurricanes.length > 0) {
          result += `   🚨 Nearby Hurricanes: ${nearbyHurricanes.length}\n`
          nearbyHurricanes.forEach(hurricane => {
            const distance = weatherService.calculateDistance(location.lat, location.lng, hurricane.lat, hurricane.lng)
            result += `      - ${hurricane.name} (Category ${hurricane.category}) - ${Math.round(distance)} miles away\n`
          })
        } else {
          result += `   ✅ No nearby hurricanes\n`
        }
      } else {
        result += `   ℹ️ No hurricane data available\n`
      }

      const isHurricaneRisk = weatherService.isHurricaneRiskZone(location.lat, location.lng)
      result += `   Hurricane Risk Zone: ${isHurricaneRisk ? 'YES' : 'NO'}\n`

      setTestResults(prev => [...prev, result])
    } catch (error) {
      setTestResults(prev => [...prev, `❌ Error testing ${location.name}: ${error.message}`])
    }
  }

  const clearResults = () => setTestResults([])

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Real Weather Notification Testing</h1>
          <p className="text-gray-600">
            Test the real weather notification system with actual API data
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location Selection */}
          <Card>
            <CardHeader>
              <CardTitle>Test Locations</CardTitle>
              <p className="text-sm text-muted-foreground">
                Select a location to test weather notifications
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {testLocations.map((location, index) => (
                <Button
                  key={index}
                  variant={selectedLocation.name === location.name ? "default" : "outline"}
                  onClick={() => setSelectedLocation(location)}
                  className="w-full h-auto p-4 flex flex-col items-start gap-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{location.name}</span>
                    <Badge variant="secondary" className="text-xs">
                      {location.description}
                    </Badge>
                  </div>
                  <span className="text-xs opacity-75">
                    {location.lat}, {location.lng}
                  </span>
                </Button>
              ))}
              
              <div className="pt-4 border-t">
                <Button
                  onClick={() => testWeatherData(selectedLocation)}
                  className="w-full"
                >
                  Test Weather Data
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Test Results */}
          <Card>
            <CardHeader>
              <CardTitle>Test Results</CardTitle>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearResults}
                >
                  Clear Results
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
                <pre className="text-xs whitespace-pre-wrap">
                  {testResults.length > 0 ? testResults.join('\n\n') : 'No test results yet. Click "Test Weather Data" to start.'}
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Instructions */}
        <Card>
          <CardHeader>
            <CardTitle>Testing Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p><strong>1. Real Data Mode:</strong> The notification system connects to real weather APIs and government data sources</p>
            <p><strong>2. Test Mode Toggle:</strong> Use the settings button in the notification to switch between real data and test mode</p>
            <p><strong>3. Hurricane Detection:</strong> The system automatically detects hurricanes within 500 miles of your location</p>
            <p><strong>4. Government Alerts:</strong> Real-time alerts from National Weather Service and NOAA</p>
            <p><strong>5. Safety Recommendations:</strong> Context-aware safety advice based on weather conditions</p>
          </CardContent>
        </Card>

        {/* Weather Notification */}
        <RealWeatherNotification
          lat={selectedLocation.lat}
          lng={selectedLocation.lng}
          onDismiss={(alertId) => {
            console.log('Weather alert dismissed:', alertId)
          }}
        />
      </div>
    </div>
  )
}
