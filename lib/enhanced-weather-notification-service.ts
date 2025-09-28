import { WeatherService, WeatherAlert } from './weather-service'
import { ClientWeatherService } from './client-weather-service'

interface EnhancedNotificationSettings {
  enablePushNotifications: boolean
  enableHurricaneAlerts: boolean
  enableSevereWeatherAlerts: boolean
  enableModerateWeatherAlerts: boolean
  alertFrequency: 'immediate' | 'hourly' | 'daily'
  testMode: boolean
}

interface WeatherCondition {
  id: string
  type: 'rain' | 'storm' | 'hurricane' | 'severe' | 'moderate'
  severity: 'low' | 'moderate' | 'severe' | 'extreme'
  title: string
  description: string
  recommendation: string
  distance?: number
  eta?: string
  icon: string
  color: string
  isActive: boolean
}

export class EnhancedWeatherNotificationService {
  private static instance: EnhancedWeatherNotificationService
  private weatherService: WeatherService
  private clientWeatherService: ClientWeatherService
  private settings: EnhancedNotificationSettings
  private lastChecked: number = 0
  private checkInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.weatherService = WeatherService.getInstance()
    this.clientWeatherService = new ClientWeatherService()
    this.settings = {
      enablePushNotifications: true,
      enableHurricaneAlerts: true,
      enableSevereWeatherAlerts: true,
      enableModerateWeatherAlerts: true,
      alertFrequency: 'immediate',
      testMode: false,
    }
    this.loadSettings()
  }

  static getInstance(): EnhancedWeatherNotificationService {
    if (!EnhancedWeatherNotificationService.instance) {
      EnhancedWeatherNotificationService.instance = new EnhancedWeatherNotificationService()
    }
    return EnhancedWeatherNotificationService.instance
  }

  private loadSettings() {
    if (typeof window === 'undefined') return

    try {
      const savedSettings = localStorage.getItem('weatherNotificationSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        this.settings = { ...this.settings, ...parsed }
        console.log('Loaded notification settings:', parsed)
      }

      const testMode = localStorage.getItem('weatherTestMode') === 'true'
      this.settings.testMode = testMode
      console.log('Test mode setting:', testMode)
      console.log('Current settings:', this.settings)
    } catch (error) {
      console.error('Error loading weather notification settings:', error)
    }
  }

  updateSettings(newSettings: Partial<EnhancedNotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
    console.log('Settings updated:', this.settings)
  }

  getSettings(): EnhancedNotificationSettings {
    return { ...this.settings }
  }

  // Force refresh weather conditions (useful when settings change)
  async forceRefresh(lat: number, lng: number): Promise<WeatherCondition | null> {
    console.log('Force refresh called with settings:', this.settings)
    return await this.checkWeatherConditions(lat, lng)
  }

  // Reload settings from localStorage
  reloadSettings() {
    this.loadSettings()
  }

  private saveSettings() {
    if (typeof window === 'undefined') return

    try {
      const { testMode, ...notificationSettings } = this.settings
      localStorage.setItem('weatherNotificationSettings', JSON.stringify(notificationSettings))
      localStorage.setItem('weatherTestMode', testMode.toString())
    } catch (error) {
      console.error('Error saving weather notification settings:', error)
    }
  }

  async checkWeatherConditions(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      if (this.settings.testMode) {
        console.log('Test mode enabled - returning test weather condition')
        return this.getTestWeatherCondition()
      }

      // Check if we should check based on frequency
      const now = Date.now()
      const timeSinceLastCheck = now - this.lastChecked
      
      switch (this.settings.alertFrequency) {
        case 'daily':
          if (timeSinceLastCheck < 24 * 60 * 60 * 1000) return null
          break
        case 'hourly':
          if (timeSinceLastCheck < 60 * 60 * 1000) return null
          break
        case 'immediate':
        default:
          // Always check for immediate alerts
          break
      }

      this.lastChecked = now

      // Check for hurricanes first
      if (this.settings.enableHurricaneAlerts) {
        const hurricaneCondition = await this.checkHurricaneProximity(lat, lng)
        if (hurricaneCondition) return hurricaneCondition
      }

      // Check for severe weather
      if (this.settings.enableSevereWeatherAlerts) {
        const severeCondition = await this.checkSevereWeather(lat, lng)
        if (severeCondition) return severeCondition
      }

      // Check for moderate weather
      if (this.settings.enableModerateWeatherAlerts) {
        const moderateCondition = await this.checkModerateWeather(lat, lng)
        if (moderateCondition) return moderateCondition
      }

      return null
    } catch (error) {
      console.error('Error checking weather conditions:', error)
      return null
    }
  }

  private async checkHurricaneProximity(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      const response = await fetch(`/api/hurricanes?lat=${lat}&lng=${lng}`)
      if (!response.ok) return null

      const data = await response.json()
      const hurricanes = data.hurricanes || []

      for (const hurricane of hurricanes) {
        const distance = this.calculateDistance(lat, lng, hurricane.lat, hurricane.lng)
        
        if (distance < 500) { // Within 500km
          return {
            id: `hurricane_${hurricane.id}`,
            type: 'hurricane',
            severity: 'extreme',
            title: `🚨 HURRICANE ALERT: ${hurricane.name}`,
            description: `Category ${hurricane.category} Hurricane ${hurricane.name} is ${distance.toFixed(0)}km away with ${hurricane.windSpeed} mph winds. This is a DANGEROUS storm approaching your area.`,
            recommendation: `🚨 IMMEDIATE ACTION REQUIRED:\n\n• EVACUATE IMMEDIATELY if in evacuation zone\n• Secure all windows and doors with storm shutters\n• Gather emergency supplies (water, food, medications, batteries)\n• Fill your vehicle's gas tank\n• Move important documents to waterproof containers\n• Follow local emergency instructions\n• Do not attempt to ride out the storm\n• Stay informed through official channels\n• Have a communication plan with family`,
            distance: Math.round(distance),
            eta: hurricane.eta,
            icon: '🌀',
            color: 'bg-red-600',
            isActive: true
          }
        } else if (distance < 1000) { // Within 1000km
          return {
            id: `hurricane_watch_${hurricane.id}`,
            type: 'hurricane',
            severity: 'severe',
            title: `⚠️ HURRICANE WATCH: ${hurricane.name}`,
            description: `Category ${hurricane.category} Hurricane ${hurricane.name} is ${distance.toFixed(0)}km away. Conditions may deteriorate rapidly.`,
            recommendation: `⚠️ PREPARE NOW:\n\n• Prepare emergency kit with supplies for 3+ days\n• Review evacuation routes and have a plan\n• Secure outdoor objects and furniture\n• Fill vehicle gas tank\n• Stay informed through official channels\n• Monitor weather updates continuously\n• Have important documents ready\n• Charge all electronic devices`,
            distance: Math.round(distance),
            eta: hurricane.eta,
            icon: '🌀',
            color: 'bg-orange-600',
            isActive: true
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error checking hurricane proximity:', error)
      return null
    }
  }

  private async checkSevereWeather(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      const response = await fetch(`/api/weather/alerts?lat=${lat}&lng=${lng}`)
      if (!response.ok) return null

      const data = await response.json()
      const alerts = data.alerts || []

      for (const alert of alerts) {
        if (alert.severity === 'severe' || alert.severity === 'extreme') {
          return {
            id: `severe_${alert.id}`,
            type: 'severe',
            severity: alert.severity,
            title: `🚨 ${alert.title}`,
            description: alert.description,
            recommendation: alert.recommendation || `🚨 IMMEDIATE ACTION REQUIRED:\n\n• Stay indoors and avoid windows\n• Avoid driving if possible - roads may be dangerous\n• Secure outdoor objects immediately\n• Have emergency supplies ready\n• Avoid using electrical equipment\n• Stay away from tall objects and trees\n• Monitor weather updates continuously\n• Follow local emergency instructions`,
            icon: this.getSeverityIcon(alert.severity),
            color: this.getSeverityColor(alert.severity),
            isActive: true
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error checking severe weather:', error)
      return null
    }
  }

  private async checkModerateWeather(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      const response = await fetch(`/api/weather/current?lat=${lat}&lng=${lng}`)
      if (!response.ok) return null

      const data = await response.json()
      const weather = data.weather

      // Check for rain/storms
      const condition = weather.condition?.toLowerCase() || ''
      
      if (condition.includes('storm') || condition.includes('thunder')) {
        return {
          id: `storm_${Date.now()}`,
          type: 'storm',
          severity: 'severe',
          title: `⛈️ STORM WARNING`,
          description: `Thunderstorms detected in your area. Current conditions: ${weather.condition}. Temperature: ${weather.temperature}°F.`,
          recommendation: `⛈️ STORM SAFETY:\n\n• Stay indoors and avoid windows\n• Avoid driving if possible\n• Secure outdoor objects\n• Have emergency supplies ready\n• Avoid using electrical equipment\n• Stay away from tall objects\n• Monitor weather updates\n• Be prepared for power outages`,
          icon: '⛈️',
          color: 'bg-orange-600',
          isActive: true
        }
      } else if (condition.includes('rain')) {
        return {
          id: `rain_${Date.now()}`,
          type: 'rain',
          severity: 'moderate',
          title: `🌧️ RAIN ADVISORY`,
          description: `Rainfall detected in your area. Current conditions: ${weather.condition}. Temperature: ${weather.temperature}°F.`,
          recommendation: `🌧️ RAIN SAFETY:\n\n• Carry an umbrella and rain gear\n• Drive carefully - roads will be slippery\n• Allow extra travel time\n• Avoid flooded areas\n• Check local weather updates\n• Be cautious of reduced visibility\n• Watch for hydroplaning`,
          icon: '🌧️',
          color: 'bg-blue-600',
          isActive: true
        }
      }

      return null
    } catch (error) {
      console.error('Error checking moderate weather:', error)
      return null
    }
  }

  private getTestWeatherCondition(): WeatherCondition {
    const testConditions = [
      {
        id: 'test_hurricane',
        type: 'hurricane' as const,
        severity: 'extreme' as const,
        title: '🚨 HURRICANE ALERT - TestStorm',
        description: 'Category 3 Hurricane TestStorm is approaching with 120 mph winds. This is a TEST alert simulating a real hurricane emergency.',
        recommendation: '🚨 TEST ALERT: In a real hurricane situation, you should:\n\n• EVACUATE IMMEDIATELY if in evacuation zone\n• Secure all windows and doors with storm shutters\n• Gather emergency supplies (water, food, medications)\n• Fill your vehicle\'s gas tank\n• Follow local emergency instructions\n• Do not attempt to ride out the storm\n• Stay informed through official channels',
        icon: '🌀',
        color: 'bg-red-600',
        isActive: true
      },
      {
        id: 'test_storm',
        type: 'storm' as const,
        severity: 'severe' as const,
        title: '⚠️ SEVERE STORM WARNING',
        description: 'Severe thunderstorms with heavy rain, strong winds (50+ mph), and possible hail approaching your area. This is a TEST alert.',
        recommendation: '⚠️ TEST ALERT: In a real severe storm:\n\n• Stay indoors and avoid windows\n• Avoid driving if possible - roads may flood\n• Secure outdoor objects and furniture\n• Have emergency supplies ready\n• Avoid using electrical equipment\n• Stay away from tall objects and trees\n• Monitor weather updates continuously',
        icon: '⛈️',
        color: 'bg-orange-600',
        isActive: true
      },
      {
        id: 'test_rain',
        type: 'rain' as const,
        severity: 'moderate' as const,
        title: '🌧️ RAIN ADVISORY',
        description: 'Moderate to heavy rainfall expected in your area. This is a TEST alert for rain conditions.',
        recommendation: '🌧️ TEST ALERT: During rain conditions:\n\n• Carry an umbrella and rain gear\n• Drive carefully - roads will be slippery\n• Allow extra travel time\n• Avoid flooded areas\n• Check local weather updates\n• Be cautious of reduced visibility',
        icon: '🌧️',
        color: 'bg-blue-600',
        isActive: true
      },
      {
        id: 'test_flood',
        type: 'storm' as const,
        severity: 'severe' as const,
        title: '🌊 FLOOD WARNING',
        description: 'Flash flooding possible due to heavy rainfall. This is a TEST alert for flood conditions.',
        recommendation: '🌊 TEST ALERT: During flood conditions:\n\n• Move to higher ground immediately\n• Do not drive through flooded areas\n• Avoid walking through flood waters\n• Turn around, don\'t drown\n• Stay informed about evacuation routes\n• Have emergency supplies ready\n• Follow local emergency instructions',
        icon: '🌊',
        color: 'bg-orange-600',
        isActive: true
      }
    ]

    // Return a random test condition
    const randomIndex = Math.floor(Math.random() * testConditions.length)
    const condition = testConditions[randomIndex]
    console.log('Generated test condition:', condition)
    return condition
  }

  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371 // Earth's radius in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  private getSeverityIcon(severity: string): string {
    switch (severity) {
      case 'extreme': return '🚨'
      case 'severe': return '⚠️'
      case 'moderate': return '🌧️'
      default: return 'ℹ️'
    }
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'extreme': return 'bg-red-600'
      case 'severe': return 'bg-orange-600'
      case 'moderate': return 'bg-blue-600'
      default: return 'bg-gray-600'
    }
  }

  startMonitoring(lat: number, lng: number, onConditionChange?: (condition: WeatherCondition | null) => void) {
    this.stopMonitoring()

    console.log('Starting weather monitoring with settings:', this.settings)

    // Check immediately
    this.checkAndNotify(lat, lng, onConditionChange)

    // Then check based on frequency
    const intervalMs = this.settings.testMode ? 10000 : // 10 seconds for test mode (faster for testing)
                      this.settings.alertFrequency === 'daily' ? 24 * 60 * 60 * 1000 :
                      this.settings.alertFrequency === 'hourly' ? 60 * 60 * 1000 :
                      2 * 60 * 1000 // 2 minutes for immediate

    console.log('Setting monitoring interval:', intervalMs, 'ms (test mode:', this.settings.testMode, ')')

    this.checkInterval = setInterval(() => {
      this.checkAndNotify(lat, lng, onConditionChange)
    }, intervalMs)
  }

  stopMonitoring() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval)
      this.checkInterval = null
    }
  }

  private async checkAndNotify(lat: number, lng: number, onConditionChange?: (condition: WeatherCondition | null) => void) {
    try {
      console.log('checkAndNotify called with settings:', this.settings)
      const condition = await this.checkWeatherConditions(lat, lng)
      console.log('checkAndNotify result:', condition)
      onConditionChange?.(condition)
    } catch (error) {
      console.error('Error in weather condition check:', error)
    }
  }
}
