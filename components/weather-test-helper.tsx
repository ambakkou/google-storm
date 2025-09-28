"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EnhancedWeatherService } from "@/lib/enhanced-weather-service"

export function WeatherTestHelper() {
  const [testResults, setTestResults] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const runTest = async (testName: string, lat: number, lng: number) => {
    setIsLoading(true)
    try {
      const service = EnhancedWeatherService.getInstance()
      const analysis = await service.getWeatherAnalysis(lat, lng)
      
      let result = `🧪 ${testName}:\n`
      if (analysis) {
        result += `   ✅ Weather Condition Detected\n`
        result += `   Type: ${analysis.type}\n`
        result += `   Severity: ${analysis.severity}\n`
        result += `   Probability: ${analysis.probability}%\n`
        result += `   Wind Speed: ${analysis.windSpeed} mph\n`
        result += `   Humidity: ${analysis.humidity}%\n`
        result += `   Safety Advice: ${analysis.safetyAdvice.length} recommendations\n`
        result += `   Government Alerts: ${analysis.governmentAlerts.length} active\n`
        
        const recommendation = service.getWeatherRecommendation(analysis)
        result += `   Recommended Action: ${recommendation.action}\n`
        result += `   Urgency: ${recommendation.urgency}\n`
      } else {
        result += `   ℹ️ No significant weather conditions detected\n`
      }
      
      setTestResults(prev => [...prev, result])
    } catch (error) {
      setTestResults(prev => [...prev, `❌ ${testName}: Error - ${error.message}`])
    } finally {
      setIsLoading(false)
    }
  }

  const clearResults = () => setTestResults([])

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Weather Notification Test Helper</CardTitle>
        <p className="text-sm text-muted-foreground">
          Test the weather notification system with different locations and conditions
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          <Button 
            onClick={() => runTest("Miami Test", 25.774, -80.193)}
            disabled={isLoading}
            variant="outline"
          >
            Test Miami
          </Button>
          <Button 
            onClick={() => runTest("Houston Test", 29.7604, -95.3698)}
            disabled={isLoading}
            variant="outline"
          >
            Test Houston
          </Button>
          <Button 
            onClick={() => runTest("New Orleans Test", 29.9511, -90.0715)}
            disabled={isLoading}
            variant="outline"
          >
            Test New Orleans
          </Button>
          <Button 
            onClick={() => runTest("Jacksonville Test", 30.3322, -81.6557)}
            disabled={isLoading}
            variant="outline"
          >
            Test Jacksonville
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button 
            onClick={() => runTest("Random Location", 40.7128, -74.006)}
            disabled={isLoading}
            variant="secondary"
          >
            Test Random Location
          </Button>
          <Button 
            onClick={clearResults}
            variant="outline"
            size="sm"
          >
            Clear Results
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-muted-foreground mt-2">Testing weather conditions...</p>
          </div>
        )}

        {testResults.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium">Test Results:</h4>
            <div className="bg-muted p-4 rounded-lg max-h-96 overflow-y-auto">
              <pre className="text-xs whitespace-pre-wrap">
                {testResults.join('\n\n')}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
