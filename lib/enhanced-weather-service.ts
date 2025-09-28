import { WeatherService, WeatherAlert } from './weather-service'
import { AccuWeatherService } from './accuweather-service'
import { GoogleWeatherService } from './google-weather-service'
import { HurricaneAPIService } from './hurricane-apis'

export interface EnhancedWeatherCondition {
  type: 'rain' | 'storm' | 'severe_storm' | 'hurricane' | 'flood' | 'clear'
  severity: 'minor' | 'moderate' | 'severe' | 'extreme'
  probability: number
  timeToStart: string
  duration: string
  intensity: string
  windSpeed: number
  humidity: number
  precipitation: number
  temperature: number
  safetyAdvice: string[]
  governmentAlerts: WeatherAlert[]
  hurricaneData?: any
  forecastData?: any
}

export interface WeatherRecommendation {
  action: 'evacuate' | 'shelter_in_place' | 'prepare' | 'monitor' | 'normal'
  urgency: 'immediate' | 'soon' | 'planning' | 'none'
  description: string
  steps: string[]
}

export class EnhancedWeatherService {
  private static instance: EnhancedWeatherService
  private weatherService: WeatherService
  private accuWeatherService: AccuWeatherService
  private googleWeatherService: GoogleWeatherService
  private hurricaneService: HurricaneAPIService
  private cache: Map<string, { data: any; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2 minutes

  private constructor() {
    this.weatherService = WeatherService.getInstance()
    this.accuWeatherService = AccuWeatherService.getInstance()
    this.googleWeatherService = GoogleWeatherService.getInstance()
    this.hurricaneService = HurricaneAPIService.getInstance()
  }

  static getInstance(): EnhancedWeatherService {
    if (!EnhancedWeatherService.instance) {
      EnhancedWeatherService.instance = new EnhancedWeatherService()
    }
    return EnhancedWeatherService.instance
  }

  /**
   * Get comprehensive weather analysis for a location
   */
  async getWeatherAnalysis(lat: number, lng: number): Promise<EnhancedWeatherCondition | null> {
    const cacheKey = `${lat},${lng}`
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // Fetch data from multiple sources in parallel
      const [
        weatherData,
        accuWeatherData,
        googleWeatherData,
        alerts,
        hurricaneData,
        forecastData
      ] = await Promise.allSettled([
        this.weatherService.getCurrentWeather(lat, lng),
        this.accuWeatherService.getCurrentWeather(lat, lng),
        this.googleWeatherService.getCurrentWeather(lat, lng),
        this.weatherService.getWeatherAlerts(lat, lng),
        this.hurricaneService.getGlobalHurricanes(),
        this.weatherService.getForecast(lat, lng)
      ])

      // Process the data
      const currentConditions = [
        weatherData.status === 'fulfilled' ? weatherData.value?.current : null,
        accuWeatherData.status === 'fulfilled' ? accuWeatherData.value?.current : null,
        googleWeatherData.status === 'fulfilled' ? googleWeatherData.value?.current : null
      ].filter(Boolean)

      const activeAlerts = alerts.status === 'fulfilled' ? 
        alerts.value.filter((alert: WeatherAlert) => alert.isActive) : []

      const hurricanes = hurricaneData.status === 'fulfilled' ? 
        hurricaneData.value.hurricanes : []

      const forecast = forecastData.status === 'fulfilled' ? 
        forecastData.value.forecast : []

      // Analyze weather conditions
      const condition = this.analyzeWeatherConditions(
        currentConditions,
        activeAlerts,
        hurricanes,
        forecast,
        lat,
        lng
      )

      if (condition) {
        this.cache.set(cacheKey, {
          data: condition,
          timestamp: Date.now()
        })
      }

      return condition
    } catch (error) {
      console.error('Error analyzing weather conditions:', error)
      return null
    }
  }

  /**
   * Analyze weather conditions from multiple data sources
   */
  private analyzeWeatherConditions(
    currentConditions: any[],
    alerts: WeatherAlert[],
    hurricanes: any[],
    forecast: any[],
    lat: number,
    lng: number
  ): EnhancedWeatherCondition | null {
    if (currentConditions.length === 0) return null

    // Check for active government alerts first
    if (alerts.length > 0) {
      const urgentAlert = alerts.find(alert => 
        alert.severity === 'severe' || alert.severity === 'extreme'
      )
      
      if (urgentAlert) {
        return this.createConditionFromAlert(urgentAlert, currentConditions, alerts)
      }
    }

    // Check for nearby hurricanes
    const nearbyHurricane = this.findNearbyHurricane(hurricanes, lat, lng)
    if (nearbyHurricane) {
      return this.createHurricaneCondition(nearbyHurricane, currentConditions, alerts)
    }

    // Analyze current conditions
    const avgWindSpeed = this.getAverageValue(currentConditions, 'windSpeed')
    const avgHumidity = this.getAverageValue(currentConditions, 'humidity')
    const avgTemperature = this.getAverageValue(currentConditions, 'temperature')
    const avgPrecipitation = this.getAveragePrecipitation(forecast)

    // Check for storm conditions
    const stormConditions = currentConditions.some(condition => 
      condition.condition?.toLowerCase().includes('storm') ||
      condition.condition?.toLowerCase().includes('thunder')
    )

    // Check for rain conditions
    const rainConditions = currentConditions.some(condition => 
      condition.condition?.toLowerCase().includes('rain') ||
      condition.condition?.toLowerCase().includes('shower') ||
      condition.condition?.toLowerCase().includes('drizzle')
    )

    // Determine condition type and severity
    let type: EnhancedWeatherCondition['type'] = 'clear'
    let severity: EnhancedWeatherCondition['severity'] = 'minor'
    let probability = 0

    if (stormConditions || avgWindSpeed > 25) {
      type = avgWindSpeed > 40 ? 'severe_storm' : 'storm'
      severity = avgWindSpeed > 40 ? 'severe' : 'moderate'
      probability = 85
    } else if (rainConditions) {
      type = 'rain'
      severity = avgHumidity > 80 ? 'moderate' : 'minor'
      probability = 70
    } else if (avgHumidity > 85 && avgWindSpeed > 15) {
      // Potential storm development
      type = 'storm'
      severity = 'moderate'
      probability = 60
    } else if (avgPrecipitation > 0.5) {
      // Light rain expected
      type = 'rain'
      severity = 'minor'
      probability = 50
    } else {
      return null // No significant weather conditions
    }

    return {
      type,
      severity,
      probability,
      timeToStart: 'Now',
      duration: this.estimateDuration(type, severity),
      intensity: this.getIntensityLevel(severity),
      windSpeed: avgWindSpeed,
      humidity: avgHumidity,
      precipitation: avgPrecipitation,
      temperature: avgTemperature,
      safetyAdvice: this.getSafetyAdvice(type, severity),
      governmentAlerts: alerts,
      hurricaneData: nearbyHurricane,
      forecastData: forecast
    }
  }

  /**
   * Create condition from government alert
   */
  private createConditionFromAlert(
    alert: WeatherAlert,
    currentConditions: any[],
    allAlerts: WeatherAlert[]
  ): EnhancedWeatherCondition {
    const avgWindSpeed = this.getAverageValue(currentConditions, 'windSpeed')
    const avgHumidity = this.getAverageValue(currentConditions, 'humidity')
    const avgTemperature = this.getAverageValue(currentConditions, 'temperature')

    let type: EnhancedWeatherCondition['type'] = 'storm'
    switch (alert.type) {
      case 'hurricane': type = 'hurricane'; break
      case 'tropical_storm': type = 'storm'; break
      case 'thunderstorm': type = 'severe_storm'; break
      case 'flood': type = 'flood'; break
      default: type = 'storm'
    }

    return {
      type,
      severity: alert.severity,
      probability: 100,
      timeToStart: 'Now',
      duration: this.estimateDuration(type, alert.severity),
      intensity: this.getIntensityLevel(alert.severity),
      windSpeed: avgWindSpeed,
      humidity: avgHumidity,
      precipitation: 0,
      temperature: avgTemperature,
      safetyAdvice: this.getSafetyAdvice(type, alert.severity),
      governmentAlerts: allAlerts
    }
  }

  /**
   * Create condition from hurricane data
   */
  private createHurricaneCondition(
    hurricane: any,
    currentConditions: any[],
    alerts: WeatherAlert[]
  ): EnhancedWeatherCondition {
    const avgWindSpeed = this.getAverageValue(currentConditions, 'windSpeed')
    const avgHumidity = this.getAverageValue(currentConditions, 'humidity')
    const avgTemperature = this.getAverageValue(currentConditions, 'temperature')

    return {
      type: 'hurricane',
      severity: hurricane.category >= 3 ? 'extreme' : 'severe',
      probability: 100,
      timeToStart: 'Now',
      duration: '24-48 hours',
      intensity: 'High',
      windSpeed: hurricane.windSpeed || avgWindSpeed,
      humidity: avgHumidity,
      precipitation: hurricane.precipitation || 0,
      temperature: avgTemperature,
      safetyAdvice: this.getSafetyAdvice('hurricane', hurricane.category >= 3 ? 'extreme' : 'severe'),
      governmentAlerts: alerts,
      hurricaneData: hurricane
    }
  }

  /**
   * Find nearby hurricanes
   */
  private findNearbyHurricane(hurricanes: any[], lat: number, lng: number): any | null {
    const maxDistance = 500 // miles
    return hurricanes.find(hurricane => {
      const distance = this.calculateDistance(lat, lng, hurricane.lat, hurricane.lng)
      return distance <= maxDistance
    })
  }

  /**
   * Calculate distance between two coordinates
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    return R * c
  }

  /**
   * Get average value from conditions array
   */
  private getAverageValue(conditions: any[], field: string): number {
    const values = conditions.map(condition => condition[field] || 0)
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  /**
   * Get average precipitation from forecast
   */
  private getAveragePrecipitation(forecast: any[]): number {
    if (!forecast || forecast.length === 0) return 0
    const precipitations = forecast.map(day => day.precipitation || 0)
    return precipitations.reduce((sum, precip) => sum + precip, 0) / precipitations.length
  }

  /**
   * Estimate duration based on condition type and severity
   */
  private estimateDuration(type: string, severity: string): string {
    switch (type) {
      case 'hurricane': return '24-48 hours'
      case 'severe_storm': return '2-6 hours'
      case 'storm': return '1-4 hours'
      case 'rain': return '1-3 hours'
      case 'flood': return '6-24 hours'
      default: return '1-2 hours'
    }
  }

  /**
   * Get intensity level
   */
  private getIntensityLevel(severity: string): string {
    switch (severity) {
      case 'extreme': return 'Extreme'
      case 'severe': return 'High'
      case 'moderate': return 'Medium'
      case 'minor': return 'Low'
      default: return 'Low'
    }
  }

  /**
   * Get safety advice based on condition type and severity
   */
  private getSafetyAdvice(type: string, severity: string): string[] {
    const advice: string[] = []
    
    switch (type) {
      case 'hurricane':
        advice.push(
          "🚨 EVACUATE if ordered by local authorities",
          "📦 Prepare emergency kit with food, water, medications",
          "🏠 Secure outdoor furniture and objects",
          "📱 Keep phones charged and have backup power",
          "🚗 Fill gas tanks and park vehicles in safe locations",
          "💧 Store drinking water (1 gallon per person per day)",
          "🔋 Charge all electronic devices",
          "📻 Have battery-powered radio for updates"
        )
        break
      case 'severe_storm':
        advice.push(
          "🏠 Stay indoors and avoid windows",
          "⚡ Avoid electrical equipment and plumbing",
          "🚗 Do not drive through flooded areas",
          "📱 Keep emergency contacts handy",
          "🔋 Charge devices in case of power outages",
          "🌩️ Avoid tall objects and open areas",
          "📻 Monitor weather radio for updates"
        )
        break
      case 'storm':
        advice.push(
          "🏠 Stay indoors and avoid windows",
          "⚡ Avoid electrical equipment and plumbing",
          "🚗 Drive carefully on wet roads",
          "📱 Keep emergency contacts handy",
          "🔋 Charge devices in case of power outages"
        )
        break
      case 'rain':
        advice.push(
          "🌂 Carry umbrella or rain gear",
          "🚗 Drive carefully on wet roads",
          "👟 Wear appropriate footwear",
          "📱 Check weather updates regularly",
          "🏠 Ensure gutters are clear"
        )
        break
      case 'flood':
        advice.push(
          "🚗 Never drive through flooded roads",
          "🏠 Move to higher ground if necessary",
          "📱 Stay informed about evacuation routes",
          "💧 Avoid contact with flood water",
          "🔌 Turn off electricity if water enters home",
          "📦 Move valuables to higher floors"
        )
        break
    }

    if (severity === 'severe' || severity === 'extreme') {
      advice.unshift("🚨 TAKE IMMEDIATE ACTION - Severe weather conditions detected")
    }

    return advice
  }

  /**
   * Get weather recommendation based on analysis
   */
  getWeatherRecommendation(condition: EnhancedWeatherCondition): WeatherRecommendation {
    if (condition.type === 'hurricane' && condition.severity === 'extreme') {
      return {
        action: 'evacuate',
        urgency: 'immediate',
        description: 'Extreme hurricane conditions detected. Evacuation may be required.',
        steps: [
          'Follow evacuation orders immediately',
          'Take emergency kit and important documents',
          'Inform family/friends of your location',
          'Follow designated evacuation routes'
        ]
      }
    }

    if (condition.type === 'hurricane' || condition.severity === 'severe') {
      return {
        action: 'shelter_in_place',
        urgency: 'immediate',
        description: 'Severe weather conditions require immediate shelter.',
        steps: [
          'Move to interior room away from windows',
          'Stay indoors until conditions improve',
          'Monitor weather updates',
          'Have emergency supplies ready'
        ]
      }
    }

    if (condition.severity === 'moderate') {
      return {
        action: 'prepare',
        urgency: 'soon',
        description: 'Moderate weather conditions require preparation.',
        steps: [
          'Secure outdoor items',
          'Charge electronic devices',
          'Prepare emergency supplies',
          'Monitor weather conditions'
        ]
      }
    }

    if (condition.type === 'rain' || condition.probability > 50) {
      return {
        action: 'monitor',
        urgency: 'planning',
        description: 'Rain conditions expected. Stay informed.',
        steps: [
          'Check weather updates regularly',
          'Carry rain gear if going out',
          'Drive carefully on wet roads',
          'Avoid flooded areas'
        ]
      }
    }

    return {
      action: 'normal',
      urgency: 'none',
      description: 'Normal weather conditions.',
      steps: [
        'Continue normal activities',
        'Stay weather aware',
        'Check updates periodically'
      ]
    }
  }

  /**
   * Check if location is in hurricane risk zone
   */
  isHurricaneRiskZone(lat: number, lng: number): boolean {
    // Hurricane-prone areas (simplified)
    const hurricaneZones = [
      { lat: 25.7617, lng: -80.1918, radius: 200 }, // Miami
      { lat: 26.1224, lng: -80.1373, radius: 200 }, // Fort Lauderdale
      { lat: 26.7153, lng: -80.0534, radius: 200 }, // West Palm Beach
      { lat: 30.3322, lng: -81.6557, radius: 200 }, // Jacksonville
      { lat: 29.7604, lng: -95.3698, radius: 200 }, // Houston
      { lat: 29.9511, lng: -90.0715, radius: 200 }, // New Orleans
    ]

    return hurricaneZones.some(zone => {
      const distance = this.calculateDistance(lat, lng, zone.lat, zone.lng)
      return distance <= zone.radius
    })
  }
}
