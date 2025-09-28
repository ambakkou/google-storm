"use client"

import { WeatherNotificationDemo } from "@/components/weather-notification-demo"
import { WeatherTestHelper } from "@/components/weather-test-helper"

export default function TestNotificationsPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold mb-2">Weather Notification Testing</h1>
          <p className="text-muted-foreground">
            Test the enhanced weather notification system with different conditions and locations
          </p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <WeatherNotificationDemo />
          <WeatherTestHelper />
        </div>
        
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="font-semibold text-blue-900 mb-3">🧪 Testing Instructions</h3>
          <div className="space-y-2 text-sm text-blue-800">
            <p><strong>1. Visual Testing:</strong> Use the demo buttons to simulate different weather conditions</p>
            <p><strong>2. API Testing:</strong> Use the test helper to check real weather data for different locations</p>
            <p><strong>3. Browser Console:</strong> Open DevTools and run: <code>window.testWeatherNotifications()</code></p>
            <p><strong>4. Manual Testing:</strong> Change your location in the main app to test with real coordinates</p>
          </div>
        </div>
      </div>
    </div>
  )
}
