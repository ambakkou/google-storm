import { WeatherService, WeatherAlert } from './weather-service'

interface NotificationSettings {
  enablePushNotifications: boolean
  enableHurricaneAlerts: boolean
  enableSevereWeatherAlerts: boolean
  enableModerateWeatherAlerts: boolean
  alertFrequency: 'immediate' | 'hourly' | 'daily'
  testMode?: boolean
}

interface NotificationState {
  lastNotified: Map<string, number>
  dismissedAlerts: Set<string>
  settings: NotificationSettings
}

export class WeatherNotificationService {
  private static instance: WeatherNotificationService
  private weatherService: WeatherService
  private state: NotificationState
  private notificationCheckInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.weatherService = WeatherService.getInstance()
    this.state = {
      lastNotified: new Map(),
      dismissedAlerts: new Set(),
      settings: {
        enablePushNotifications: true,
        enableHurricaneAlerts: true,
        enableSevereWeatherAlerts: true,
        enableModerateWeatherAlerts: true,
        alertFrequency: 'immediate',
      },
    }
  }

  static getInstance(): WeatherNotificationService {
    if (!WeatherNotificationService.instance) {
      WeatherNotificationService.instance = new WeatherNotificationService()
    }
    return WeatherNotificationService.instance
  }

  updateSettings(newSettings: Partial<NotificationSettings>) {
    this.state.settings = { ...this.state.settings, ...newSettings }
    this.saveSettings()
  }

  getSettings(): NotificationSettings {
    return { ...this.state.settings }
  }

  async checkForAlerts(lat: number, lng: number): Promise<WeatherAlert[]> {
    try {
      const alerts = await this.weatherService.getWeatherAlerts(lat, lng)
      const newAlerts = alerts.filter(alert => 
        this.shouldNotifyUser(alert) && 
        !this.state.dismissedAlerts.has(alert.id)
      )

      // Update last notified times
      newAlerts.forEach(alert => {
        this.state.lastNotified.set(alert.id, Date.now())
      })

      return newAlerts
    } catch (error) {
      console.error('Error checking for weather alerts:', error)
      return []
    }
  }

  private shouldNotifyUser(alert: WeatherAlert): boolean {
    if (!alert.isActive) return false
    if (!this.state.settings.enablePushNotifications) return false

    // Check alert type settings
    if (this.weatherService.isHurricaneRelated(alert) && !this.state.settings.enableHurricaneAlerts) {
      return false
    }

    if (this.weatherService.isUrgentAlert(alert) && !this.state.settings.enableSevereWeatherAlerts) {
      return false
    }

    if (!this.weatherService.isUrgentAlert(alert) && !this.state.settings.enableModerateWeatherAlerts) {
      return false
    }

    // Check frequency settings
    if (this.state.lastNotified.has(alert.id)) {
      const lastNotifiedTime = this.state.lastNotified.get(alert.id)!
      const now = Date.now()

      switch (this.state.settings.alertFrequency) {
        case 'daily':
          const oneDay = 24 * 60 * 60 * 1000
          if (now - lastNotifiedTime < oneDay) return false
          break
        case 'hourly':
          const oneHour = 60 * 60 * 1000
          if (now - lastNotifiedTime < oneHour) return false
          break
        case 'immediate':
        default:
          // Always notify for immediate alerts
          break
      }
    }

    return true
  }

  async showNotification(alert: WeatherAlert): Promise<void> {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications')
      return
    }

    if (Notification.permission === 'denied') {
      console.warn('Notification permission denied')
      return
    }

    if (Notification.permission === 'default') {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('Notification permission not granted')
        return
      }
    }

    const icon = this.getNotificationIcon(alert)
    const recommendation = this.weatherService.getAlertRecommendation(alert)

    const notification = new Notification(alert.title, {
      body: `${alert.description}\n\nRecommendation: ${recommendation}`,
      icon: icon,
      badge: icon,
      tag: alert.id,
      requireInteraction: this.weatherService.isUrgentAlert(alert),
      actions: [
        {
          action: 'view',
          title: 'View Details'
        },
        {
          action: 'dismiss',
          title: 'Dismiss'
        }
      ]
    })

    notification.onclick = () => {
      window.focus()
      notification.close()
    }

    // Auto-close non-urgent notifications after 10 seconds
    if (!this.weatherService.isUrgentAlert(alert)) {
      setTimeout(() => {
        notification.close()
      }, 10000)
    }
  }

  private getNotificationIcon(alert: WeatherAlert): string {
    // Return a data URL for a simple icon based on alert type
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!

    // Set background color based on severity
    let bgColor = '#3B82F6' // blue
    if (alert.severity === 'severe') bgColor = '#F97316' // orange
    if (alert.severity === 'extreme') bgColor = '#EF4444' // red

    ctx.fillStyle = bgColor
    ctx.fillRect(0, 0, 64, 64)

    // Add emoji icon
    ctx.font = '32px Arial'
    ctx.fillStyle = 'white'
    ctx.textAlign = 'center'
    ctx.fillText(this.weatherService.getTypeIcon(alert.type), 32, 40)

    return canvas.toDataURL()
  }

  dismissAlert(alertId: string) {
    this.state.dismissedAlerts.add(alertId)
    this.saveDismissedAlerts()
  }

  startMonitoring(lat: number, lng: number, onAlert?: (alerts: WeatherAlert[]) => void) {
    this.stopMonitoring() // Stop any existing monitoring

    // Check immediately
    this.checkAndNotify(lat, lng, onAlert)

    // Then check every 5 minutes
    this.notificationCheckInterval = setInterval(() => {
      this.checkAndNotify(lat, lng, onAlert)
    }, 5 * 60 * 1000)
  }

  stopMonitoring() {
    if (this.notificationCheckInterval) {
      clearInterval(this.notificationCheckInterval)
      this.notificationCheckInterval = null
    }
  }

  private async checkAndNotify(lat: number, lng: number, onAlert?: (alerts: WeatherAlert[]) => void) {
    try {
      const alerts = await this.checkForAlerts(lat, lng)
      
      if (alerts.length > 0) {
        onAlert?.(alerts)
        
        // Show browser notifications for urgent alerts
        const urgentAlerts = alerts.filter(alert => this.weatherService.isUrgentAlert(alert))
        for (const alert of urgentAlerts) {
          await this.showNotification(alert)
        }
      }
    } catch (error) {
      console.error('Error in notification check:', error)
    }
  }

  private saveSettings() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('weatherNotificationSettings', JSON.stringify(this.state.settings))
    }
  }

  private saveDismissedAlerts() {
    if (typeof window !== 'undefined') {
      localStorage.setItem('dismissedWeatherAlerts', JSON.stringify(Array.from(this.state.dismissedAlerts)))
    }
  }

  loadPersistedData() {
    if (typeof window === 'undefined') return

    try {
      const savedSettings = localStorage.getItem('weatherNotificationSettings')
      if (savedSettings) {
        this.state.settings = { ...this.state.settings, ...JSON.parse(savedSettings) }
      }

      const savedDismissed = localStorage.getItem('dismissedWeatherAlerts')
      if (savedDismissed) {
        this.state.dismissedAlerts = new Set(JSON.parse(savedDismissed))
      }
    } catch (error) {
      console.error('Error loading persisted notification data:', error)
    }
  }

  getAlertStats() {
    return {
      totalDismissed: this.state.dismissedAlerts.size,
      lastChecked: this.state.lastNotified.size > 0 ? Math.max(...this.state.lastNotified.values()) : 0,
    }
  }
}
