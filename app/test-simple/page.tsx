"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SimpleWeatherNotification } from "@/components/simple-weather-notification"

const testConditions = [
  {
    type: 'rain' as const,
    severity: 'minor' as const,
    description: 'Light rain expected',
    probability: 60
  },
  {
    type: 'storm' as const,
    severity: 'moderate' as const,
    description: 'Thunderstorm approaching',
    probability: 75
  },
  {
    type: 'severe_storm' as const,
    severity: 'severe' as const,
    description: 'Severe thunderstorm with high winds',
    probability: 85
  },
  {
    type: 'hurricane' as const,
    severity: 'extreme' as const,
    description: 'Hurricane approaching - evacuation may be required',
    probability: 95
  },
  {
    type: 'flood' as const,
    severity: 'severe' as const,
    description: 'Flood warning in effect',
    probability: 80
  }
]

export default function TestSimplePage() {
  const [activeNotification, setActiveNotification] = useState<typeof testConditions[0] | null>(null)

  const showNotification = (condition: typeof testConditions[0]) => {
    setActiveNotification(condition)
  }

  const dismissNotification = () => {
    setActiveNotification(null)
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Simple Weather Notification Test</h1>
          <p className="text-gray-600">
            Click the buttons below to test different weather notification scenarios
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Test Weather Conditions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Click any button to see the corresponding weather notification
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {testConditions.map((condition, index) => (
                <Button
                  key={index}
                  variant="outline"
                  onClick={() => showNotification(condition)}
                  className="h-auto p-4 flex flex-col items-start gap-2 text-left"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {condition.type === 'hurricane' ? '🌀' :
                       condition.type === 'severe_storm' ? '⛈️' :
                       condition.type === 'storm' ? '🌩️' :
                       condition.type === 'rain' ? '🌧️' :
                       condition.type === 'flood' ? '🌊' : '🌦️'}
                    </span>
                    <Badge variant={
                      condition.severity === 'extreme' ? 'destructive' :
                      condition.severity === 'severe' ? 'destructive' :
                      condition.severity === 'moderate' ? 'default' : 'secondary'
                    }>
                      {condition.severity.toUpperCase()}
                    </Badge>
                  </div>
                  <span className="text-sm">{condition.description}</span>
                  <span className="text-xs text-muted-foreground">
                    {condition.probability}% probability
                  </span>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Instructions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>• Click any weather condition button above to test the notification</p>
            <p>• The notification will appear at the top center of the screen</p>
            <p>• Click the "Safety Advice" button to expand/collapse recommendations</p>
            <p>• Click the X button to dismiss the notification</p>
            <p>• Each notification shows appropriate colors based on severity</p>
          </CardContent>
        </Card>

        {/* Weather Notification */}
        {activeNotification && (
          <SimpleWeatherNotification
            lat={25.774}
            lng={-80.193}
            onDismiss={dismissNotification}
            testMode={true}
            testCondition={activeNotification}
          />
        )}
      </div>
    </div>
  )
}
