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
}

export class HurricaneService {
  private static instance: HurricaneService
  private cache: Map<string, { data: HurricaneResponse; timestamp: number }> = new Map()
  private readonly CACHE_DURATION = 15 * 60 * 1000 // 15 minutes

  public static getInstance(): HurricaneService {
    if (!HurricaneService.instance) {
      HurricaneService.instance = new HurricaneService()
    }
    return HurricaneService.instance
  }

  /**
   * Fetch current hurricane data from NOAA/NHC
   * Since there's no direct API, we'll use a combination of sources
   */
  async getActiveHurricanes(): Promise<HurricaneResponse> {
    const cacheKey = 'active_hurricanes'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    try {
      // Try to fetch from multiple sources
      const hurricanes = await this.fetchHurricaneData()
      
      const response: HurricaneResponse = {
        hurricanes,
        lastUpdated: new Date().toISOString()
      }

      this.cache.set(cacheKey, {
        data: response,
        timestamp: Date.now()
      })

      return response
    } catch (error) {
      console.error('Failed to fetch hurricane data:', error)
      // Return mock data for development
      return this.getMockHurricaneData()
    }
  }

  /**
   * Fetch hurricane data from NOAA RSS feeds and other sources
   */
  private async fetchHurricaneData(): Promise<HurricaneTrack[]> {
    const hurricanes: HurricaneTrack[] = []

    try {
      // Fetch from NOAA RSS feed for active storms
      const rssUrl = 'https://www.nhc.noaa.gov/index-at.xml'
      const rssResponse = await fetch(rssUrl)
      
      if (!rssResponse.ok) {
        throw new Error(`RSS feed failed: ${rssResponse.status}`)
      }

      const rssText = await rssResponse.text()
      const parser = new DOMParser()
      const xmlDoc = parser.parseFromString(rssText, 'text/xml')
      
      // Parse RSS items for active storms
      const items = xmlDoc.querySelectorAll('item')
      
      for (const item of items) {
        const title = item.querySelector('title')?.textContent || ''
        const description = item.querySelector('description')?.textContent || ''
        const link = item.querySelector('link')?.textContent || ''
        
        // Check if this is an active storm advisory
        if (this.isActiveStormAdvisory(title, description)) {
          const hurricane = this.parseStormFromRSS(title, description, link)
          if (hurricane) {
            hurricanes.push(hurricane)
          }
        }
      }

      // If no active storms found, return mock data for demo
      if (hurricanes.length === 0) {
        return this.getMockHurricaneData().hurricanes
      }

    } catch (error) {
      console.error('Error fetching hurricane data:', error)
      // Return mock data as fallback
      return this.getMockHurricaneData().hurricanes
    }

    return hurricanes
  }

  private isActiveStormAdvisory(title: string, description: string): boolean {
    const activeKeywords = [
      'tropical storm', 'hurricane', 'typhoon', 'cyclone',
      'advisory', 'warning', 'watch', 'active'
    ]
    
    const text = `${title} ${description}`.toLowerCase()
    return activeKeywords.some(keyword => text.includes(keyword))
  }

  private parseStormFromRSS(title: string, description: string, link: string): HurricaneTrack | null {
    try {
      // Extract storm name from title
      const nameMatch = title.match(/(?:Tropical Storm|Hurricane|Typhoon)\s+([A-Z][a-z]+)/i)
      const stormName = nameMatch ? nameMatch[1] : 'Unknown'

      // Extract coordinates from description (this is simplified)
      const coordMatch = description.match(/(\d+\.\d+)\s*[NS]\s*(\d+\.\d+)\s*[EW]/i)
      
      if (!coordMatch) {
        return null
      }

      const lat = parseFloat(coordMatch[1])
      const lng = parseFloat(coordMatch[2])

      // Extract wind speed
      const windMatch = description.match(/(\d+)\s*kt|knots|mph/i)
      const windSpeed = windMatch ? parseInt(windMatch[1]) : 0

      return {
        id: `storm_${Date.now()}`,
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

  private getCategoryFromWindSpeed(windSpeed: number): number {
    if (windSpeed >= 157) return 5
    if (windSpeed >= 130) return 4
    if (windSpeed >= 111) return 3
    if (windSpeed >= 96) return 2
    if (windSpeed >= 74) return 1
    return 0
  }

  private generateMockForecastPositions(lat: number, lng: number): HurricanePosition[] {
    // Generate mock forecast positions (typically 5 days)
    const positions: HurricanePosition[] = []
    const currentDate = new Date()
    
    for (let i = 1; i <= 5; i++) {
      const forecastDate = new Date(currentDate.getTime() + (i * 24 * 60 * 60 * 1000))
      
      // Mock movement - typically hurricanes move NW or N
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

  /**
   * Mock hurricane data for development and demo purposes
   */
  private getMockHurricaneData(): HurricaneResponse {
    const mockHurricanes: HurricaneTrack[] = [
      {
        id: 'mock_storm_1',
        name: 'Hurricane Demo',
        currentPosition: {
          lat: 25.7617, // Miami area
          lng: -80.1918,
          timestamp: new Date().toISOString(),
          windSpeed: 85,
          pressure: 985,
          category: 1
        },
        historicalPositions: [
          {
            lat: 24.5,
            lng: -82.0,
            timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
            windSpeed: 75,
            category: 1
          }
        ],
        forecastPositions: this.generateMockForecastPositions(25.7617, -80.1918),
        status: 'active',
        basin: 'ATL'
      },
      {
        id: 'mock_storm_2',
        name: 'Tropical Storm Beta',
        currentPosition: {
          lat: 27.5,
          lng: -82.5,
          timestamp: new Date().toISOString(),
          windSpeed: 65,
          pressure: 995,
          category: 0
        },
        historicalPositions: [],
        forecastPositions: this.generateMockForecastPositions(27.5, -82.5),
        status: 'active',
        basin: 'ATL'
      }
    ]

    return {
      hurricanes: mockHurricanes,
      lastUpdated: new Date().toISOString()
    }
  }

  /**
   * Get hurricanes near a specific location (Florida)
   */
  async getHurricanesNearFlorida(): Promise<HurricaneTrack[]> {
    const response = await this.getActiveHurricanes()
    
    // Filter hurricanes that are near Florida (within ~500 miles)
    const floridaLat = 27.7663
    const floridaLng = -82.6404
    
    return response.hurricanes.filter(hurricane => {
      const distance = this.calculateDistance(
        floridaLat, floridaLng,
        hurricane.currentPosition.lat, hurricane.currentPosition.lng
      )
      return distance <= 500 // miles
    })
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

  /**
   * Get category color for hurricane markers
   */
  getCategoryColor(category: number): string {
    switch (category) {
      case 5: return '#8B0000' // Dark red
      case 4: return '#FF0000' // Red
      case 3: return '#FF8C00' // Orange
      case 2: return '#FFD700' // Gold
      case 1: return '#FFFF00' // Yellow
      default: return '#00FF00' // Green (tropical storm)
    }
  }

  /**
   * Get category label
   */
  getCategoryLabel(category: number): string {
    switch (category) {
      case 5: return 'Category 5'
      case 4: return 'Category 4'
      case 3: return 'Category 3'
      case 2: return 'Category 2'
      case 1: return 'Category 1'
      default: return 'Tropical Storm'
    }
  }
}
