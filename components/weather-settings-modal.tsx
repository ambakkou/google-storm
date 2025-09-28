"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Settings, Bell, CloudRain, AlertTriangle } from "lucide-react"
import { WeatherNotificationService } from "@/lib/weather-notifications"

interface WeatherSettingsModalProps {
  children: React.ReactNode
}

export function WeatherSettingsModal({ children }: WeatherSettingsModalProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [settings, setSettings] = useState({
    enablePushNotifications: true,
    enableHurricaneAlerts: true,
    enableSevereWeatherAlerts: true,
    enableModerateWeatherAlerts: true,
    alertFrequency: 'immediate' as 'immediate' | 'hourly' | 'daily',
    testMode: false,
  })
  
  const [notificationService] = useState(() => WeatherNotificationService.getInstance())

  useEffect(() => {
    if (isOpen) {
      const currentSettings = notificationService.getSettings()
      // Load test mode from localStorage
      const testMode = localStorage.getItem('weatherTestMode') === 'true'
      setSettings({ ...currentSettings, testMode })
    }
  }, [isOpen, notificationService])

  const handleSave = () => {
    // Save notification settings
    const { testMode, ...notificationSettings } = settings
    notificationService.updateSettings(notificationSettings)
    
    // Save test mode separately
    localStorage.setItem('weatherTestMode', testMode.toString())
    
    console.log('Weather settings saved:', { notificationSettings, testMode })
    
    setIsOpen(false)
  }

  const handleTestNotification = async () => {
    if ('Notification' in window) {
      if (Notification.permission === 'default') {
        await Notification.requestPermission()
      }
      
      if (Notification.permission === 'granted') {
        const notification = new Notification('Test Weather Alert', {
          body: 'This is a test notification to verify your weather alert settings.',
          icon: '/placeholder-logo.png'
        })
        
        setTimeout(() => notification.close(), 5000)
      }
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Weather Alert Settings
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Notification Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Bell className="w-4 h-4" />
                Notifications
              </CardTitle>
              <CardDescription>
                Configure how you receive weather alerts
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="push-notifications" className="text-sm font-medium">
                  Enable Push Notifications
                </Label>
                <Switch
                  id="push-notifications"
                  checked={settings.enablePushNotifications}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enablePushNotifications: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="alert-frequency" className="text-sm font-medium">
                  Alert Frequency
                </Label>
                <Select
                  value={settings.alertFrequency}
                  onValueChange={(value: 'immediate' | 'hourly' | 'daily') =>
                    setSettings(prev => ({ ...prev, alertFrequency: value }))
                  }
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="immediate">Immediate</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="test-mode" className="text-sm font-medium">
                  Test Mode
                </Label>
                <Switch
                  id="test-mode"
                  checked={settings.testMode}
                  onCheckedChange={(checked) => {
                    setSettings(prev => ({ ...prev, testMode: checked }))
                    // Trigger immediate refresh when test mode changes
                    setTimeout(() => {
                      window.dispatchEvent(new CustomEvent('weatherSettingsChanged'))
                    }, 100)
                  }}
                />
              </div>
              
              <div className="text-xs text-muted-foreground">
                {settings.testMode ? 'Using simulated weather conditions for testing' : 'Using real weather data from government sources'}
              </div>
            </CardContent>
          </Card>

          {/* Alert Types */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <CloudRain className="w-4 h-4" />
                Alert Types
              </CardTitle>
              <CardDescription>
                Choose which weather alerts you want to receive
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌀</span>
                  <Label htmlFor="hurricane-alerts" className="text-sm font-medium">
                    Hurricane & Tropical Storm Alerts
                  </Label>
                </div>
                <Switch
                  id="hurricane-alerts"
                  checked={settings.enableHurricaneAlerts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableHurricaneAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <Label htmlFor="severe-alerts" className="text-sm font-medium">
                    Severe Weather Alerts
                  </Label>
                </div>
                <Switch
                  id="severe-alerts"
                  checked={settings.enableSevereWeatherAlerts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableSevereWeatherAlerts: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🌦️</span>
                  <Label htmlFor="moderate-alerts" className="text-sm font-medium">
                    Moderate Weather Alerts
                  </Label>
                </div>
                <Switch
                  id="moderate-alerts"
                  checked={settings.enableModerateWeatherAlerts}
                  onCheckedChange={(checked) => 
                    setSettings(prev => ({ ...prev, enableModerateWeatherAlerts: checked }))
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Hurricane Season Info */}
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <span className="text-2xl">🌀</span>
                <div>
                  <h4 className="font-medium text-orange-800">Hurricane Season</h4>
                  <p className="text-sm text-orange-700 mt-1">
                    Hurricane season runs from June 1st to November 30th. During this period, 
                    you'll receive enhanced monitoring for tropical weather systems that could 
                    affect Miami and surrounding areas.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              Save Settings
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
