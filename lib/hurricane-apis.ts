// Hurricane Data APIs Implementation
// Supports multiple data sources for redundancy

export interface HurricanePosition {
  lat: number
  lng: number
  timestamp: string
  windSpeed: number
  pressure?: number
  category?: number
}

export interface HurricaneTrack {
  id: string
  name: string
  currentPosition: HurricanePosition
  historicalPositions: HurricanePosition[]
  forecastPositions: HurricanePosition[]
  status: 'active' | 'dissipated' | 'post-tropical'
  basin: 'ATL' | 'EPAC' | 'CPAC' | 'WPAC' | 'IO' | 'SH'
}

export interface HurricaneResponse {
  hurricanes: HurricaneTrack[]
  lastUpdated: string
  source: string
}

export class HurricaneAPIService {
  private static instance: HurricaneAPIService
  private cache: Map<string, { data: HurricaneResponse; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 10 * 60 * 1000 // 10 minutes

  public static getInstance(): HurricaneAPIService {
    if (!HurricaneAPIService.instance) {
      HurricaneAPIService.instance = new HurricaneAPIService()
    }
    return HurricaneAPIService.instance
  }

  /**
   * Fetch hurricane data from multiple sources with fallback
   */
  async getActiveHurricanes(): Promise<HurricaneResponse> {
    const cacheKey = 'active_hurricanes'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    // Try APIs in order of preference
    const apis = [
      () => this.fetchFromAccuWeather(),
      () => this.fetchFromNOAAKML(),
      () => this.fetchFromNOAARSS(),
      () => this.fetchFromNASA()
    ]

    for (const api of apis) {
      try {
        const result = await api()
        if (result.hurricanes.length > 0) {
          this.cache.set(cacheKey, {
            data: result,
            timestamp: Date.now()
          })
          return result
        }
      } catch (error) {
        console.warn('API failed, trying next:', error)
        continue
      }
    }

    // If all APIs fail, return mock data
    console.warn('All hurricane APIs failed, returning mock data')
    return this.getMockHurricaneData()
  }

  /**
   * AccuWeather Tropical API (Recommended - Free tier)
   * Get your API key from: https://developer.accuweather.com/
   */
  private async fetchFromAccuWeather(): Promise<HurricaneResponse> {
    const apiKey = process.env.ACCUWEATHER_API_KEY
    if (!apiKey) {
      throw new Error('AccuWeather API key not configured')
    }

    // Get active tropical cyclones
    const response = await fetch(
      `http://dataservice.accuweather.com/tropical/v1/current?apikey=${apiKey}`
    )

    if (!response.ok) {
      throw new Error(`AccuWeather API error: ${response.status}`)
    }

    const data = await response.json()
    
    const hurricanes: HurricaneTrack[] = await Promise.all(
      data.map(async (storm: any) => {
        // Get detailed storm data
        const detailsResponse = await fetch(
          `http://dataservice.accuweather.com/tropical/v1/current/${storm.TropicalCycloneId}?apikey=${apiKey}`
        )
        const details = await detailsResponse.json()

        return {
          id: `accu_${storm.TropicalCycloneId}`,
          name: storm.Name,
          currentPosition: {
            lat: storm.CurrentPosition.Latitude,
            lng: storm.CurrentPosition.Longitude,
            timestamp: storm.CurrentPosition.DateTime,
            windSpeed: storm.CurrentWindSpeed,
            pressure: storm.CurrentPressure,
            category: this.getCategoryFromWindSpeed(storm.CurrentWindSpeed)
          },
          historicalPositions: details.HistoricalPositions?.map((pos: any) => ({
            lat: pos.Latitude,
            lng: pos.Longitude,
            timestamp: pos.DateTime,
            windSpeed: pos.WindSpeed,
            pressure: pos.Pressure,
            category: this.getCategoryFromWindSpeed(pos.WindSpeed)
          })) || [],
          forecastPositions: details.ForecastPositions?.map((pos: any) => ({
            lat: pos.Latitude,
            lng: pos.Longitude,
            timestamp: pos.DateTime,
            windSpeed: pos.WindSpeed,
            pressure: pos.Pressure,
            category: this.getCategoryFromWindSpeed(pos.WindSpeed)
          })) || [],
          status: 'active',
          basin: this.mapBasin(storm.Basin)
        }
      })
    )

    return {
      hurricanes: hurricanes.filter(h => this.isNearFlorida(h)),
      lastUpdated: new Date().toISOString(),
      source: 'AccuWeather'
    }
  }

  /**
   * NOAA KML Feed (Free - Official Government Data)
   */
  private async fetchFromNOAAKML(): Promise<HurricaneResponse> {
    const kmlUrls = [
      'https://www.nhc.noaa.gov/gis/kml/activeStorms.kml',
      'https://www.nhc.noaa.gov/gis/kml/forecastTrack.kml',
      'https://www.nhc.noaa.gov/gis/kml/pastTrack.kml'
    ]

    const hurricanes: HurricaneTrack[] = []

    for (const url of kmlUrls) {
      try {
        const response = await fetch(url)
        if (!response.ok) continue

        const kmlText = await response.text()
        const parser = new DOMParser()
        const kmlDoc = parser.parseFromString(kmlText, 'text/xml')
        
        const placemarks = kmlDoc.querySelectorAll('Placemark')
        
        for (const placemark of placemarks) {
          const name = placemark.querySelector('name')?.textContent || 'Unknown'
          const description = placemark.querySelector('description')?.textContent || ''
          const coordinates = placemark.querySelector('coordinates')?.textContent

          if (!coordinates) continue

          // Parse coordinates (KML format: lng,lat,altitude)
          const coordPairs = coordinates.trim().split('\n').map(line => 
            line.trim().split(',').slice(0, 2).map(Number)
          )

          if (coordPairs.length === 0) continue

          // Extract wind speed from description
          const windMatch = description.match(/(\d+)\s*kt/i)
          const windSpeed = windMatch ? parseInt(windMatch[1]) : 0

          const hurricane: HurricaneTrack = {
            id: `noaa_${Date.now()}_${Math.random()}`,
            name: name.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
            currentPosition: {
              lat: coordPairs[0][1],
              lng: coordPairs[0][0],
              timestamp: new Date().toISOString(),
              windSpeed: windSpeed * 1.15, // Convert knots to mph
              category: this.getCategoryFromWindSpeed(windSpeed * 1.15)
            },
            historicalPositions: [],
            forecastPositions: coordPairs.slice(1, 6).map(([lng, lat]) => ({
              lat,
              lng,
              timestamp: new Date(Date.now() + coordPairs.indexOf([lng, lat]) * 24 * 60 * 60 * 1000).toISOString(),
              windSpeed: windSpeed * 1.15,
              category: this.getCategoryFromWindSpeed(windSpeed * 1.15)
            })),
            status: 'active',
            basin: 'ATL'
          }

          hurricanes.push(hurricane)
        }
      } catch (error) {
        console.warn(`Failed to fetch KML from ${url}:`, error)
      }
    }

    return {
      hurricanes: hurricanes.filter(h => this.isNearFlorida(h)),
      lastUpdated: new Date().toISOString(),
      source: 'NOAA KML'
    }
  }

  /**
   * NOAA RSS Feed (Free - Official Government Data)
   */
  private async fetchFromNOAARSS(): Promise<HurricaneResponse> {
    const rssUrl = 'https://www.nhc.noaa.gov/index-at.xml'
    
    const response = await fetch(rssUrl)
    if (!response.ok) {
      throw new Error(`NOAA RSS failed: ${response.status}`)
    }

    const rssText = await response.text()
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(rssText, 'text/xml')
    
    const hurricanes: HurricaneTrack[] = []
    const items = xmlDoc.querySelectorAll('item')
    
    for (const item of items) {
      const title = item.querySelector('title')?.textContent || ''
      const description = item.querySelector('description')?.textContent || ''
      
      if (!this.isActiveStormAdvisory(title, description)) continue

      const hurricane = this.parseStormFromRSS(title, description)
      if (hurricane) {
        hurricanes.push(hurricane)
      }
    }

    return {
      hurricanes: hurricanes.filter(h => this.isNearFlorida(h)),
      lastUpdated: new Date().toISOString(),
      source: 'NOAA RSS'
    }
  }

  /**
   * NASA Storm Services (Free)
   */
  private async fetchFromNASA(): Promise<HurricaneResponse> {
    // NASA Storm Services endpoint
    const nasaUrl = 'https://storm.ghrc.nsstc.nasa.gov/stormservices'
    
    const response = await fetch(`${nasaUrl}/storm?format=xml&stormtype=tropical`)
    if (!response.ok) {
      throw new Error(`NASA API failed: ${response.status}`)
    }

    const xmlText = await response.text()
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
    
    const hurricanes: HurricaneTrack[] = []
    const storms = xmlDoc.querySelectorAll('storm')
    
    for (const storm of storms) {
      const name = storm.querySelector('name')?.textContent || 'Unknown'
      const lat = parseFloat(storm.querySelector('latitude')?.textContent || '0')
      const lng = parseFloat(storm.querySelector('longitude')?.textContent || '0')
      const windSpeed = parseFloat(storm.querySelector('windspeed')?.textContent || '0')

      if (lat === 0 && lng === 0) continue

      hurricanes.push({
        id: `nasa_${Date.now()}_${Math.random()}`,
        name,
        currentPosition: {
          lat,
          lng,
          timestamp: new Date().toISOString(),
          windSpeed,
          category: this.getCategoryFromWindSpeed(windSpeed)
        },
        historicalPositions: [],
        forecastPositions: [],
        status: 'active',
        basin: 'ATL'
      })
    }

    return {
      hurricanes: hurricanes.filter(h => this.isNearFlorida(h)),
      lastUpdated: new Date().toISOString(),
      source: 'NASA'
    }
  }

  // Helper methods
  private getCategoryFromWindSpeed(windSpeed: number): number {
    if (windSpeed >= 157) return 5
    if (windSpeed >= 130) return 4
    if (windSpeed >= 111) return 3
    if (windSpeed >= 96) return 2
    if (windSpeed >= 74) return 1
    return 0
  }

  private mapBasin(basin: string): HurricaneTrack['basin'] {
    switch (basin?.toUpperCase()) {
      case 'ATLANTIC': return 'ATL'
      case 'EASTERN_PACIFIC': return 'EPAC'
      case 'CENTRAL_PACIFIC': return 'CPAC'
      case 'WESTERN_PACIFIC': return 'WPAC'
      case 'INDIAN_OCEAN': return 'IO'
      case 'SOUTHERN_HEMISPHERE': return 'SH'
      default: return 'ATL'
    }
  }

  private isNearFlorida(hurricane: HurricaneTrack): boolean {
    const floridaLat = 27.7663
    const floridaLng = -82.6404
    const distance = this.calculateDistance(
      floridaLat, floridaLng,
      hurricane.currentPosition.lat, hurricane.currentPosition.lng
    )
    return distance <= 500 // miles
  }

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

  private isActiveStormAdvisory(title: string, description: string): boolean {
    const activeKeywords = [
      'tropical storm', 'hurricane', 'typhoon', 'cyclone',
      'advisory', 'warning', 'watch', 'active'
    ]
    
    const text = `${title} ${description}`.toLowerCase()
    return activeKeywords.some(keyword => text.includes(keyword))
  }

  private parseStormFromRSS(title: string, description: string): HurricaneTrack | null {
    try {
      const nameMatch = title.match(/(?:Tropical Storm|Hurricane|Typhoon)\s+([A-Z][a-z]+)/i)
      const stormName = nameMatch ? nameMatch[1] : 'Unknown'

      const coordMatch = description.match(/(\d+\.\d+)\s*[NS]\s*(\d+\.\d+)\s*[EW]/i)
      if (!coordMatch) return null

      const lat = parseFloat(coordMatch[1])
      const lng = parseFloat(coordMatch[2])

      const windMatch = description.match(/(\d+)\s*kt|knots|mph/i)
      const windSpeed = windMatch ? parseInt(windMatch[1]) : 0

      return {
        id: `rss_${Date.now()}_${Math.random()}`,
        name: stormName,
        currentPosition: {
          lat,
          lng,
          timestamp: new Date().toISOString(),
          windSpeed,
          category: this.getCategoryFromWindSpeed(windSpeed)
        },
        historicalPositions: [],
        forecastPositions: this.generateMockForecastPositions(lat, lng),
        status: 'active',
        basin: 'ATL'
      }
    } catch (error) {
      console.error('Error parsing storm data:', error)
      return null
    }
  }

  private generateMockForecastPositions(lat: number, lng: number): HurricanePosition[] {
    const positions: HurricanePosition[] = []
    const currentDate = new Date()
    
    for (let i = 1; i <= 5; i++) {
      const forecastDate = new Date(currentDate.getTime() + (i * 24 * 60 * 60 * 1000))
      const latOffset = (i * 0.5) * (Math.random() > 0.5 ? 1 : -1)
      const lngOffset = (i * 0.8) * (Math.random() > 0.5 ? 1 : -1)
      
      positions.push({
        lat: lat + latOffset,
        lng: lng + lngOffset,
        timestamp: forecastDate.toISOString(),
        windSpeed: Math.max(0, 100 - (i * 10) + Math.random() * 20),
        category: this.getCategoryFromWindSpeed(100 - (i * 10))
      })
    }
    
    return positions
  }

  private getMockHurricaneData(): HurricaneResponse {
    return {
      hurricanes: [
        {
          id: 'mock_storm_1',
          name: 'Hurricane Demo',
          currentPosition: {
            lat: 25.7617,
            lng: -80.1918,
            timestamp: new Date().toISOString(),
            windSpeed: 85,
            pressure: 985,
            category: 1
          },
          historicalPositions: [],
          forecastPositions: this.generateMockForecastPositions(25.7617, -80.1918),
          status: 'active',
          basin: 'ATL'
        }
      ],
      lastUpdated: new Date().toISOString(),
      source: 'Mock Data'
    }
  }
}
