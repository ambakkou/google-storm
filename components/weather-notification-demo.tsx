"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { SimpleWeatherNotification } from "./simple-weather-notification"

interface DemoCondition {
  type: 'rain' | 'storm' | 'severe_storm' | 'hurricane' | 'flood' | 'clear'
  severity: 'minor' | 'moderate' | 'severe' | 'extreme'
  description: string
  lat: number
  lng: number
}

const demoConditions: DemoCondition[] = [
  {
    type: 'clear',
    severity: 'minor',
    description: 'Clear skies - no notifications',
    lat: 25.774,
    lng: -80.193
  },
  {
    type: 'rain',
    severity: 'minor',
    description: 'Light rain expected',
    lat: 25.774,
    lng: -80.193
  },
  {
    type: 'storm',
    severity: 'moderate',
    description: 'Thunderstorm approaching',
    lat: 25.774,
    lng: -80.193
  },
  {
    type: 'severe_storm',
    severity: 'severe',
    description: 'Severe thunderstorm with high winds',
    lat: 25.774,
    lng: -80.193
  },
  {
    type: 'hurricane',
    severity: 'extreme',
    description: 'Hurricane approaching - evacuation may be required',
    lat: 25.774,
    lng: -80.193
  },
  {
    type: 'flood',
    severity: 'severe',
    description: 'Flood warning in effect',
    lat: 25.774,
    lng: -80.193
  }
]

export function WeatherNotificationDemo() {
  const [selectedCondition, setSelectedCondition] = useState<DemoCondition | null>(null)
  const [showNotification, setShowNotification] = useState(false)

  const handleConditionSelect = (condition: DemoCondition) => {
    setSelectedCondition(condition)
    setShowNotification(true)
  }

  const handleDismiss = () => {
    setShowNotification(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Weather Notification System Demo</CardTitle>
          <p className="text-sm text-muted-foreground">
            Test the enhanced weather notification system with different weather conditions
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            {demoConditions.map((condition, index) => (
              <Button
                key={index}
                variant="outline"
                onClick={() => handleConditionSelect(condition)}
                className="h-auto p-4 flex flex-col items-start gap-2"
              >
                <div className="flex items-center gap-2">
                  <span className="text-lg">
                    {condition.type === 'hurricane' ? '🌀' :
                     condition.type === 'severe_storm' ? '⛈️' :
                     condition.type === 'storm' ? '🌩️' :
                     condition.type === 'rain' ? '🌧️' :
                     condition.type === 'flood' ? '🌊' : '☀️'}
                  </span>
                  <Badge variant={
                    condition.severity === 'extreme' ? 'destructive' :
                    condition.severity === 'severe' ? 'destructive' :
                    condition.severity === 'moderate' ? 'default' : 'secondary'
                  }>
                    {condition.severity.toUpperCase()}
                  </Badge>
                </div>
                <span className="text-sm text-left">{condition.description}</span>
              </Button>
            ))}
          </div>
          
          {selectedCondition && (
            <div className="mt-4 p-3 bg-muted rounded-lg">
              <h4 className="font-medium mb-2">Selected Condition:</h4>
              <p className="text-sm">
                <strong>Type:</strong> {selectedCondition.type.replace('_', ' ').toUpperCase()}<br/>
                <strong>Severity:</strong> {selectedCondition.severity.toUpperCase()}<br/>
                <strong>Description:</strong> {selectedCondition.description}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Demo Notification */}
      {showNotification && selectedCondition && (
        <div className="relative">
          <SimpleWeatherNotification
            lat={selectedCondition.lat}
            lng={selectedCondition.lng}
            onDismiss={handleDismiss}
            className="relative top-0 left-0 transform-none"
            testMode={true}
            testCondition={{
              type: selectedCondition.type,
              severity: selectedCondition.severity,
              probability: selectedCondition.severity === 'extreme' ? 95 : 
                          selectedCondition.severity === 'severe' ? 85 : 
                          selectedCondition.severity === 'moderate' ? 70 : 60
            }}
          />
        </div>
      )}
    </div>
  )
}
