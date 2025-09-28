import { WeatherService, WeatherAlert } from './weather-service'
import { ClientWeatherService } from './client-weather-service'
import { AccuWeatherService } from './accuweather-service'
import { GoogleWeatherService } from './google-weather-service'

interface SmartNotificationSettings {
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
  source: string
  confidence: number
  lastUpdated: Date
}

interface AlertCache {
  [key: string]: {
    condition: WeatherCondition
    timestamp: number
    dismissed: boolean
  }
}

export class SmartWeatherNotificationService {
  private static instance: SmartWeatherNotificationService
  private weatherService: WeatherService
  private clientWeatherService: ClientWeatherService
  private accuWeatherService: AccuWeatherService
  private googleWeatherService: GoogleWeatherService
  private settings: SmartNotificationSettings
  private lastChecked: number = 0
  private checkInterval: NodeJS.Timeout | null = null
  private alertCache: AlertCache = {}
  private lastNotificationTime: number = 0

  private constructor() {
    this.weatherService = WeatherService.getInstance()
    this.clientWeatherService = new ClientWeatherService()
    this.accuWeatherService = new AccuWeatherService()
    this.googleWeatherService = new GoogleWeatherService()
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

  static getInstance(): SmartWeatherNotificationService {
    if (!SmartWeatherNotificationService.instance) {
      SmartWeatherNotificationService.instance = new SmartWeatherNotificationService()
    }
    return SmartWeatherNotificationService.instance
  }

  private loadSettings() {
    if (typeof window === 'undefined') return

    try {
      const savedSettings = localStorage.getItem('weatherNotificationSettings')
      if (savedSettings) {
        const parsed = JSON.parse(savedSettings)
        this.settings = { ...this.settings, ...parsed }
      }

      const testMode = localStorage.getItem('weatherTestMode') === 'true'
      this.settings.testMode = testMode
    } catch (error) {
      console.error('Error loading weather notification settings:', error)
    }
  }

  updateSettings(newSettings: Partial<SmartNotificationSettings>) {
    this.settings = { ...this.settings, ...newSettings }
    this.saveSettings()
  }

  getSettings(): SmartNotificationSettings {
    return { ...this.settings }
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
        return this.getTestWeatherCondition()
      }

      // Smart frequency checking - avoid redundant checks
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
          // For immediate alerts, check every 2 minutes minimum to avoid spam
          if (timeSinceLastCheck < 2 * 60 * 1000) return null
          break
      }

      this.lastChecked = now

      // Multi-source weather analysis with priority system
      const conditions = await Promise.allSettled([
        this.checkGovernmentAlerts(lat, lng),
        this.checkHurricaneProximity(lat, lng),
        this.checkAccuWeatherAlerts(lat, lng),
        this.checkGoogleWeatherConditions(lat, lng),
        this.checkNWSAlerts(lat, lng)
      ])

      // Process results and find the highest priority condition
      const validConditions: WeatherCondition[] = []
      
      conditions.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          validConditions.push(result.value)
        }
      })

      // Smart deduplication and priority selection
      const bestCondition = this.selectBestCondition(validConditions)
      
      if (bestCondition) {
        // Check if we should show this alert (avoid spam)
        if (this.shouldShowAlert(bestCondition)) {
          this.updateAlertCache(bestCondition)
          return bestCondition
        }
      }

      return null
    } catch (error) {
      console.error('Error checking weather conditions:', error)
      return null
    }
  }

  private async checkGovernmentAlerts(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      const response = await fetch(`/api/weather/alerts?lat=${lat}&lng=${lng}`)
      if (!response.ok) return null

      const data = await response.json()
      const alerts = data.alerts || []

      // Find the most severe active alert
      const severeAlerts = alerts.filter((alert: any) => 
        alert.isActive && (alert.severity === 'severe' || alert.severity === 'extreme')
      )

      if (severeAlerts.length > 0) {
        const alert = severeAlerts[0]
        return {
          id: `gov_${alert.id}`,
          type: 'severe',
          severity: alert.severity,
          title: `🚨 ${alert.title}`,
          description: alert.description,
          recommendation: this.getGovernmentAlertRecommendation(alert),
          icon: this.getSeverityIcon(alert.severity),
          color: this.getSeverityColor(alert.severity),
          isActive: true,
          source: 'National Weather Service',
          confidence: 95,
          lastUpdated: new Date()
        }
      }

      return null
    } catch (error) {
      console.error('Error checking government alerts:', error)
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
        
        if (distance < 500) { // Within 500km - IMMEDIATE DANGER
          return {
            id: `hurricane_${hurricane.id}`,
            type: 'hurricane',
            severity: 'extreme',
            title: `🚨 HURRICANE ALERT: ${hurricane.name}`,
            description: `Category ${hurricane.category} Hurricane ${hurricane.name} is ${distance.toFixed(0)}km away with ${hurricane.windSpeed} mph winds.`,
            recommendation: this.getHurricaneRecommendation(hurricane, 'extreme'),
            distance: Math.round(distance),
            eta: hurricane.eta,
            icon: '🌀',
            color: 'bg-red-600',
            isActive: true,
            source: 'National Hurricane Center',
            confidence: 100,
            lastUpdated: new Date()
          }
        } else if (distance < 1000) { // Within 1000km - WATCH
          return {
            id: `hurricane_watch_${hurricane.id}`,
            type: 'hurricane',
            severity: 'severe',
            title: `⚠️ HURRICANE WATCH: ${hurricane.name}`,
            description: `Category ${hurricane.category} Hurricane ${hurricane.name} is ${distance.toFixed(0)}km away.`,
            recommendation: this.getHurricaneRecommendation(hurricane, 'severe'),
            distance: Math.round(distance),
            eta: hurricane.eta,
            icon: '🌀',
            color: 'bg-orange-600',
            isActive: true,
            source: 'National Hurricane Center',
            confidence: 90,
            lastUpdated: new Date()
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error checking hurricane proximity:', error)
      return null
    }
  }

  private async checkAccuWeatherAlerts(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      // Use AccuWeather for detailed weather analysis
      const weatherData = await this.accuWeatherService.getCurrentWeather(lat, lng)
      
      if (weatherData) {
        const condition = weatherData.condition?.toLowerCase() || ''
        
        // Check for severe conditions
        if (condition.includes('severe') || condition.includes('thunderstorm')) {
          return {
            id: `accu_${Date.now()}`,
            type: 'storm',
            severity: 'severe',
            title: `⛈️ SEVERE WEATHER ALERT`,
            description: `Severe weather conditions detected: ${weatherData.condition}`,
            recommendation: this.getStormRecommendation(),
            icon: '⛈️',
            color: 'bg-orange-600',
            isActive: true,
            source: 'AccuWeather',
            confidence: 85,
            lastUpdated: new Date()
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error checking AccuWeather alerts:', error)
      return null
    }
  }

  private async checkGoogleWeatherConditions(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      // Use Google Weather for additional verification
      const weatherData = await this.googleWeatherService.getCurrentWeather(lat, lng)
      
      if (weatherData) {
        const condition = weatherData.condition?.toLowerCase() || ''
        
        // Check for rain/storm conditions
        if (condition.includes('rain') && !condition.includes('light')) {
          return {
            id: `google_${Date.now()}`,
            type: 'rain',
            severity: 'moderate',
            title: `🌧️ RAIN ADVISORY`,
            description: `Heavy rainfall detected: ${weatherData.condition}`,
            recommendation: this.getRainRecommendation(),
            icon: '🌧️',
            color: 'bg-blue-600',
            isActive: true,
            source: 'Google Weather',
            confidence: 80,
            lastUpdated: new Date()
          }
        }
      }

      return null
    } catch (error) {
      console.error('Error checking Google Weather conditions:', error)
      return null
    }
  }

  private async checkNWSAlerts(lat: number, lng: number): Promise<WeatherCondition | null> {
    try {
      // Check National Weather Service for official alerts
      const response = await fetch(`/api/weather/alerts?lat=${lat}&lng=${lng}`)
      if (!response.ok) return null

      const data = await response.json()
      const alerts = data.alerts || []

      // Look for moderate alerts that other sources might miss
      const moderateAlerts = alerts.filter((alert: any) => 
        alert.isActive && alert.severity === 'moderate'
      )

      if (moderateAlerts.length > 0) {
        const alert = moderateAlerts[0]
        return {
          id: `nws_${alert.id}`,
          type: 'moderate',
          severity: 'moderate',
          title: `🌦️ ${alert.title}`,
          description: alert.description,
          recommendation: this.getModerateAlertRecommendation(alert),
          icon: '🌦️',
          color: 'bg-blue-600',
          isActive: true,
          source: 'National Weather Service',
          confidence: 90,
          lastUpdated: new Date()
        }
      }

      return null
    } catch (error) {
      console.error('Error checking NWS alerts:', error)
      return null
    }
  }

  private selectBestCondition(conditions: WeatherCondition[]): WeatherCondition | null {
    if (conditions.length === 0) return null

    // Priority system: Hurricane > Severe > Moderate
    const priorityOrder = ['extreme', 'severe', 'moderate', 'low']
    
    for (const priority of priorityOrder) {
      const condition = conditions.find(c => c.severity === priority)
      if (condition) {
        // If multiple conditions of same severity, pick highest confidence
        const sameSeverity = conditions.filter(c => c.severity === priority)
        if (sameSeverity.length > 1) {
          return sameSeverity.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          )
        }
        return condition
      }
    }

    return conditions[0]
  }

  private shouldShowAlert(condition: WeatherCondition): boolean {
    const now = Date.now()
    const cacheKey = condition.id
    
    // Check if we've shown this alert recently (avoid spam)
    if (this.alertCache[cacheKey]) {
      const cached = this.alertCache[cacheKey]
      const timeSinceLastShown = now - cached.timestamp
      
      // Don't show same alert within 5 minutes unless severity increased
      if (timeSinceLastShown < 5 * 60 * 1000 && !cached.dismissed) {
        return false
      }
    }

    // Don't spam notifications - minimum 1 minute between any notifications
    if (now - this.lastNotificationTime < 60 * 1000) {
      return false
    }

    return true
  }

  private updateAlertCache(condition: WeatherCondition) {
    this.alertCache[condition.id] = {
      condition,
      timestamp: Date.now(),
      dismissed: false
    }
    this.lastNotificationTime = Date.now()
  }

  // Recommendation generators
  private getGovernmentAlertRecommendation(alert: any): string {
    return `🚨 OFFICIAL ALERT:\n\n• Follow official instructions immediately\n• Stay informed through official channels\n• Avoid unnecessary travel\n• Have emergency supplies ready\n• Monitor updates continuously\n• ${alert.description}`
  }

  private getHurricaneRecommendation(hurricane: any, severity: string): string {
    if (severity === 'extreme') {
      return `🚨 IMMEDIATE ACTION REQUIRED:\n\n• EVACUATE IMMEDIATELY if in evacuation zone\n• Secure all windows and doors\n• Gather emergency supplies (water, food, medications)\n• Fill vehicle gas tank\n• Follow local emergency instructions\n• Do not attempt to ride out the storm\n• Stay informed through official channels`
    } else {
      return `⚠️ PREPARE NOW:\n\n• Prepare emergency kit with 3+ days supplies\n• Review evacuation routes\n• Secure outdoor objects\n• Fill vehicle gas tank\n• Stay informed through official channels\n• Monitor weather updates continuously`
    }
  }

  private getStormRecommendation(): string {
    return `⛈️ STORM SAFETY:\n\n• Stay indoors and avoid windows\n• Avoid driving if possible\n• Secure outdoor objects\n• Have emergency supplies ready\n• Avoid using electrical equipment\n• Stay away from tall objects\n• Monitor weather updates`
  }

  private getRainRecommendation(): string {
    return `🌧️ RAIN SAFETY:\n\n• Carry an umbrella and rain gear\n• Drive carefully - roads will be slippery\n• Allow extra travel time\n• Avoid flooded areas\n• Check local weather updates\n• Be cautious of reduced visibility`
  }

  private getModerateAlertRecommendation(alert: any): string {
    return `🌦️ WEATHER ADVISORY:\n\n• Stay informed about changing conditions\n• Be prepared for weather changes\n• Monitor local updates\n• ${alert.description}`
  }

  private getTestWeatherCondition(): WeatherCondition {
    const testConditions = [
      {
        id: 'test_hurricane',
        type: 'hurricane' as const,
        severity: 'extreme' as const,
        title: '🚨 TEST: Hurricane Alert',
        description: 'Category 3 Hurricane TestStorm approaching with 120 mph winds.',
        recommendation: '🚨 TEST ALERT: In a real hurricane situation, follow evacuation orders immediately.',
        icon: '🌀',
        color: 'bg-red-600',
        isActive: true,
        source: 'Test Mode',
        confidence: 100,
        lastUpdated: new Date()
      },
      {
        id: 'test_storm',
        type: 'storm' as const,
        severity: 'severe' as const,
        title: '⚠️ TEST: Severe Storm Alert',
        description: 'Severe thunderstorms with heavy rain and strong winds expected.',
        recommendation: '⚠️ TEST ALERT: Stay indoors and avoid unnecessary travel.',
        icon: '⛈️',
        color: 'bg-orange-600',
        isActive: true,
        source: 'Test Mode',
        confidence: 100,
        lastUpdated: new Date()
      }
    ]

    const randomIndex = Math.floor(Math.random() * testConditions.length)
    return testConditions[randomIndex]
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

    // Check immediately
    this.checkAndNotify(lat, lng, onConditionChange)

    // Smart interval based on settings
    const intervalMs = this.settings.testMode ? 10000 : // 10 seconds for test mode
                      this.settings.alertFrequency === 'daily' ? 24 * 60 * 60 * 1000 :
                      this.settings.alertFrequency === 'hourly' ? 60 * 60 * 1000 :
                      2 * 60 * 1000 // 2 minutes for immediate (smart throttling)

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
      const condition = await this.checkWeatherConditions(lat, lng)
      onConditionChange?.(condition)
    } catch (error) {
      console.error('Error in weather condition check:', error)
    }
  }

  reloadSettings() {
    this.loadSettings()
  }

  async forceRefresh(lat: number, lng: number): Promise<WeatherCondition | null> {
    return await this.checkWeatherConditions(lat, lng)
  }
}
