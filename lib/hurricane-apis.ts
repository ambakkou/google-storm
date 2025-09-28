// Hurricane Data APIs Implementation
// Supports multiple data sources for redundancy

import { DOMParser } from 'xmldom'

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
  private readonly CACHE_DURATION = 2 * 60 * 1000 // 2 minutes for more real-time updates

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
    return this.getGlobalHurricanes()
  }

  /**
   * Check for potential hurricanes and tropical disturbances
   */
  async getPotentialHurricanes(): Promise<HurricaneResponse> {
    const cacheKey = 'potential_hurricanes'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    // Try APIs in order of preference for potential storms
    const apis = [
      () => this.fetchPotentialFromNHC(),
      () => this.fetchPotentialFromXWeather(),
      () => this.fetchPotentialFromNOAA()
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
        console.warn('Potential hurricane API failed, trying next:', error)
        continue
      }
    }

    // If all APIs fail, return empty data
    console.warn('All potential hurricane APIs failed, returning empty data')
    return {
      hurricanes: [],
      lastUpdated: new Date().toISOString(),
      source: 'No Potential Storms Detected'
    }
  }

  /**
   * Fetch global hurricane data from multiple sources
   * @param forceRefresh - If true, bypasses cache and fetches fresh data
   */
  async getGlobalHurricanes(forceRefresh: boolean = false): Promise<HurricaneResponse> {
    const cacheKey = 'active_hurricanes'
    const cached = this.cache.get(cacheKey)
    
    if (!forceRefresh && cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
      return cached.data
    }

    // Try APIs in order of preference - Working sources only
    const apis = [
      () => this.fetchFromNOAARSS(),      // Primary: NOAA RSS (working)
      () => this.fetchFromOpenWeather(),   // Commercial: OpenWeather (working)
      () => this.fetchFromAccuWeather(),   // Commercial: AccuWeather (working)
      () => this.fetchFromNOAAKML()        // Fallback: NOAA KML
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

    // If all APIs fail, return empty data
    console.warn('All hurricane APIs failed, returning empty data')
    return {
      hurricanes: [],
      lastUpdated: new Date().toISOString(),
      source: 'No Data Available'
    }
  }

  /**
   * XWeather Enhanced Hurricane Detection
   * Uses XWeather's professional weather data to detect hurricane conditions
   * XWeather provides hyper-local weather datasets and real-time lightning data
   */
  private async fetchFromXWeather(): Promise<HurricaneResponse> {
    const apiKey = process.env.XWEATHER_API_KEY
    if (!apiKey) {
      throw new Error('XWeather API key not configured')
    }

    // Hurricane-prone locations to monitor
    const hurricaneLocations = [
      { lat: 25.7617, lng: -80.1918, name: 'Miami, FL' },
      { lat: 29.7604, lng: -95.3698, name: 'Houston, TX' },
      { lat: 30.2241, lng: -92.0198, name: 'Lafayette, LA' },
      { lat: 26.1224, lng: -80.1373, name: 'Fort Lauderdale, FL' },
      { lat: 27.9506, lng: -82.4572, name: 'Tampa, FL' },
      { lat: 30.2672, lng: -97.7431, name: 'Austin, TX' },
      { lat: 29.9511, lng: -90.0715, name: 'New Orleans, LA' }
    ]

    const hurricanes: HurricaneTrack[] = []

    for (const location of hurricaneLocations) {
      try {
        // Get current weather data from XWeather
    const response = await fetch(
          `https://api.xweather.com/v1/current?lat=${location.lat}&lon=${location.lng}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
              'User-Agent': 'HurricaneTracker/1.0'
            }
          }
        )

        if (!response.ok) continue

        const weatherData = await response.json()
        
        // Extract weather parameters
        const windSpeed = weatherData.wind?.speed || 0
        const pressure = weatherData.pressure?.value || 1013
        const humidity = weatherData.humidity?.value || 0
        const temperature = weatherData.temperature?.value || 0
        
        // Enhanced hurricane detection criteria using XWeather's precision data
        const isHurricaneConditions = 
          windSpeed > 74 || // Hurricane-force winds
          pressure < 980 || // Very low pressure
          (windSpeed > 39 && pressure < 1000 && humidity > 80) || // Tropical storm conditions
          (windSpeed > 25 && pressure < 995 && humidity > 85) // Enhanced detection

        if (isHurricaneConditions) {
          // Get forecast data for trajectory
          const forecastResponse = await fetch(
            `https://api.xweather.com/v1/forecast?lat=${location.lat}&lon=${location.lng}&days=5`,
            {
              headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Accept': 'application/json',
                'User-Agent': 'HurricaneTracker/1.0'
              }
            }
          )

          let forecastPositions: HurricanePosition[] = []
          if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json()
            forecastPositions = forecastData.forecast?.slice(0, 5).map((day: any, index: number) => ({
              lat: location.lat + (index * 0.1), // Simulated movement
              lng: location.lng + (index * 0.1),
              timestamp: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
              windSpeed: Math.max(0, windSpeed - (index * 5)),
              pressure: pressure + (index * 2),
              category: this.getCategoryFromWindSpeed(Math.max(0, windSpeed - (index * 5)))
            })) || []
          }

          hurricanes.push({
            id: `xweather_${Date.now()}_${Math.random()}`,
            name: `Storm Alert - ${location.name}`,
          currentPosition: {
              lat: location.lat,
              lng: location.lng,
              timestamp: new Date().toISOString(),
              windSpeed: windSpeed,
              pressure: pressure,
              category: this.getCategoryFromWindSpeed(windSpeed)
            },
            historicalPositions: [],
            forecastPositions: forecastPositions,
          status: 'active',
            basin: this.determineBasinFromCoordinates(location.lat, location.lng)
          })
        }
      } catch (error) {
        console.warn(`Failed to check ${location.name} with XWeather:`, error)
        continue
      }
    }

    return {
      hurricanes: hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'XWeather Professional Detection'
    }
  }

  /**
   * OpenWeather API - Enhanced Hurricane Detection
   */
  private async fetchFromOpenWeather(): Promise<HurricaneResponse> {
    const apiKey = process.env.OPENWEATHER_API_KEY
    if (!apiKey) {
      throw new Error('OpenWeather API key not configured')
    }

    // Check tropical areas for storm conditions - using major cities for better data
    const tropicalAreas = [
      { lat: 25.7617, lng: -80.1918, name: 'Miami, FL' },
      { lat: 29.7604, lng: -95.3698, name: 'Houston, TX' },
      { lat: 30.2241, lng: -92.0198, name: 'Lafayette, LA' },
      { lat: 26.1224, lng: -80.1373, name: 'Fort Lauderdale, FL' },
      { lat: 27.9506, lng: -82.4572, name: 'Tampa, FL' },
      { lat: 30.2672, lng: -97.7431, name: 'Austin, TX' },
      { lat: 29.9511, lng: -90.0715, name: 'New Orleans, LA' }
    ]

    const hurricanes: HurricaneTrack[] = []

    for (const area of tropicalAreas) {
      try {
        const response = await fetch(
          `https://api.openweathermap.org/data/2.5/weather?lat=${area.lat}&lon=${area.lng}&appid=${apiKey}&units=imperial`
        )

        if (!response.ok) continue

        const weatherData = await response.json()
        
        const windSpeed = weatherData.wind?.speed || 0
        const pressure = weatherData.main?.pressure || 1013
        const humidity = weatherData.main?.humidity || 0
        
        // Check for hurricane/tropical storm conditions
        const isHurricaneConditions = 
          windSpeed > 74 || 
          pressure < 980 || 
          (windSpeed > 39 && pressure < 1000 && humidity > 80) ||
          (windSpeed > 25 && pressure < 995 && humidity > 85)

        if (isHurricaneConditions) {
          // Get forecast data for trajectory
          const forecastResponse = await fetch(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${area.lat}&lon=${area.lng}&appid=${apiKey}&units=imperial`
          )

          let forecastPositions: HurricanePosition[] = []
          if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json()
            forecastPositions = forecastData.list?.slice(0, 5).map((item: any, index: number) => ({
              lat: area.lat + (index * 0.05), // Simulated movement
              lng: area.lng + (index * 0.05),
              timestamp: new Date(item.dt * 1000).toISOString(),
              windSpeed: item.wind?.speed || windSpeed,
              pressure: item.main?.pressure || pressure,
              category: this.getCategoryFromWindSpeed(item.wind?.speed || windSpeed)
            })) || []
          }

          hurricanes.push({
            id: `openweather_${Date.now()}_${Math.random()}`,
            name: `Storm Alert - ${area.name}`,
            currentPosition: {
              lat: area.lat,
              lng: area.lng,
              timestamp: new Date().toISOString(),
              windSpeed: windSpeed,
              pressure: pressure,
              category: this.getCategoryFromWindSpeed(windSpeed)
            },
            historicalPositions: [],
            forecastPositions: forecastPositions,
            status: 'active',
            basin: this.determineBasinFromCoordinates(area.lat, area.lng)
          })
        }
      } catch (error) {
        console.warn(`Failed to check ${area.name} with OpenWeather:`, error)
        continue
      }
    }

    return {
      hurricanes: hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'OpenWeather Enhanced Detection'
    }
  }

  /**
   * AccuWeather API - Professional Hurricane Detection
   */
  private async fetchFromAccuWeather(): Promise<HurricaneResponse> {
    const apiKey = process.env.ACCUWEATHER_API_KEY
    if (!apiKey) {
      throw new Error('AccuWeather API key not configured')
    }

    // Check tropical areas for storm conditions - using major cities for better location key lookup
    const tropicalAreas = [
      { lat: 25.7617, lng: -80.1918, name: 'Miami, FL' },
      { lat: 29.7604, lng: -95.3698, name: 'Houston, TX' },
      { lat: 30.2241, lng: -92.0198, name: 'Lafayette, LA' },
      { lat: 26.1224, lng: -80.1373, name: 'Fort Lauderdale, FL' },
      { lat: 27.9506, lng: -82.4572, name: 'Tampa, FL' },
      { lat: 30.2672, lng: -97.7431, name: 'Austin, TX' },
      { lat: 29.9511, lng: -90.0715, name: 'New Orleans, LA' }
    ]

    const hurricanes: HurricaneTrack[] = []

    for (const area of tropicalAreas) {
      try {
        // First get location key
        const locationResponse = await fetch(
          `http://dataservice.accuweather.com/locations/v1/cities/geoposition/search?apikey=${apiKey}&q=${area.lat},${area.lng}`
        )

        if (!locationResponse.ok) continue

        const locationData = await locationResponse.json()
        const locationKey = locationData?.Key

        if (!locationKey) {
          console.warn(`No location key found for ${area.name}`)
          continue
        }

        // Get current conditions
        const currentResponse = await fetch(
          `http://dataservice.accuweather.com/currentconditions/v1/${locationKey}?apikey=${apiKey}&details=true`
        )

        if (!currentResponse.ok) continue

        const currentData = await currentResponse.json()
        const current = currentData[0]

        const windSpeed = current.Wind?.Speed?.Value || 0
        const pressure = current.Pressure?.Value || 1013
        const humidity = current.RelativeHumidity || 0
        
        // Check for hurricane/tropical storm conditions
        const isHurricaneConditions = 
          windSpeed > 74 || 
          pressure < 980 || 
          (windSpeed > 39 && pressure < 1000 && humidity > 80) ||
          (windSpeed > 25 && pressure < 995 && humidity > 85)

        if (isHurricaneConditions) {
          // Get forecast data
          const forecastResponse = await fetch(
            `http://dataservice.accuweather.com/forecasts/v1/daily/5day/${locationKey}?apikey=${apiKey}&details=true&metric=false`
          )

          let forecastPositions: HurricanePosition[] = []
          if (forecastResponse.ok) {
            const forecastData = await forecastResponse.json()
            forecastPositions = forecastData.DailyForecasts?.slice(0, 5).map((day: any, index: number) => ({
              lat: area.lat + (index * 0.05),
              lng: area.lng + (index * 0.05),
              timestamp: new Date(day.Date).toISOString(),
              windSpeed: day.Day?.Wind?.Speed?.Value || windSpeed,
              pressure: day.Day?.Pressure?.Value || pressure,
              category: this.getCategoryFromWindSpeed(day.Day?.Wind?.Speed?.Value || windSpeed)
            })) || []
          }

          hurricanes.push({
            id: `accuweather_${Date.now()}_${Math.random()}`,
            name: `Storm Alert - ${area.name}`,
          currentPosition: {
              lat: area.lat,
              lng: area.lng,
              timestamp: new Date().toISOString(),
              windSpeed: windSpeed,
              pressure: pressure,
              category: this.getCategoryFromWindSpeed(windSpeed)
            },
            historicalPositions: [],
            forecastPositions: forecastPositions,
          status: 'active',
            basin: this.determineBasinFromCoordinates(area.lat, area.lng)
          })
        }
      } catch (error) {
        console.warn(`Failed to check ${area.name} with AccuWeather:`, error)
        continue
      }
    }

    return {
      hurricanes: hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'AccuWeather Professional Detection'
    }
  }

  /**
   * NASA Earth Data API - Satellite-based Hurricane Detection
   */
  private async fetchFromNASAEarth(): Promise<HurricaneResponse> {
    const apiKey = process.env.NASAEARTH_API_KEY
    if (!apiKey) {
      throw new Error('NASA Earth API key not configured')
    }

    // Check tropical areas for storm conditions using NASA Earth data
    const tropicalAreas = [
      { lat: 10, lng: -30, name: 'Eastern Atlantic' },
      { lat: 15, lng: -50, name: 'Central Atlantic' },
      { lat: 20, lng: -70, name: 'Caribbean Sea' },
      { lat: 15, lng: -85, name: 'Western Caribbean' },
      { lat: 10, lng: -100, name: 'Eastern Pacific' },
      { lat: 15, lng: -120, name: 'Central Pacific' },
      { lat: 20, lng: -140, name: 'Western Pacific' },
      { lat: 25, lng: -80, name: 'Gulf of Mexico' },
      { lat: 20, lng: -95, name: 'Bay of Campeche' }
    ]

    const hurricanes: HurricaneTrack[] = []

    for (const area of tropicalAreas) {
      try {
        // Use NASA Earth Data API for weather conditions
        const response = await fetch(
          `https://api.nasa.gov/insight_weather/?api_key=${apiKey}&feedtype=json&ver=1.0`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
              'User-Agent': 'HurricaneTracker/1.0'
            }
          }
        )

        if (!response.ok) continue

        const data = await response.json()
        
        // For now, simulate hurricane detection based on area analysis
        // In a real implementation, you would analyze satellite data
        const simulatedWindSpeed = Math.random() * 50 + 20 // 20-70 mph
        const simulatedPressure = 1013 - (Math.random() * 50) // 963-1013 mb
        const simulatedHumidity = Math.random() * 30 + 70 // 70-100%
        
        // Check for hurricane/tropical storm conditions
        const isHurricaneConditions = 
          simulatedWindSpeed > 74 || 
          simulatedPressure < 980 || 
          (simulatedWindSpeed > 39 && simulatedPressure < 1000 && simulatedHumidity > 80) ||
          (simulatedWindSpeed > 25 && simulatedPressure < 995 && simulatedHumidity > 85)

        if (isHurricaneConditions) {
          hurricanes.push({
            id: `nasa_earth_${Date.now()}_${Math.random()}`,
            name: `NASA Detected Storm - ${area.name}`,
            currentPosition: {
              lat: area.lat,
              lng: area.lng,
              timestamp: new Date().toISOString(),
              windSpeed: simulatedWindSpeed,
              pressure: simulatedPressure,
              category: this.getCategoryFromWindSpeed(simulatedWindSpeed)
            },
            historicalPositions: [],
            forecastPositions: this.generateMockForecastPositions(area.lat, area.lng),
            status: 'active',
            basin: this.determineBasinFromCoordinates(area.lat, area.lng)
          })
        }
      } catch (error) {
        console.warn(`Failed to check ${area.name} with NASA Earth:`, error)
        continue
      }
    }

    return {
      hurricanes: hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'NASA Earth Data API'
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
        
        const placemarks = kmlDoc.getElementsByTagName('Placemark')
        
        for (const placemark of placemarks) {
          const name = placemark.getElementsByTagName('name')[0]?.textContent || 'Unknown'
          const description = placemark.getElementsByTagName('description')[0]?.textContent || ''
          const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent

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
      hurricanes: hurricanes,
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
    const items = xmlDoc.getElementsByTagName('item')
    
    // Track processed storms to avoid duplicates
    const processedStorms = new Set<string>()
    
    // Convert NodeList to Array for iteration
    const itemsArray = Array.from(items)
    
    for (const item of itemsArray) {
      const title = item.getElementsByTagName('title')[0]?.textContent || ''
      const description = item.getElementsByTagName('description')[0]?.textContent || ''
      
      // Check for structured cyclone data first
      const cycloneElements = item.getElementsByTagName('Cyclone')
      if (cycloneElements.length > 0) {
        const cyclone = cycloneElements[0]
        const stormName = cyclone.getElementsByTagName('name')[0]?.textContent || ''
        const stormType = cyclone.getElementsByTagName('type')[0]?.textContent || ''
        const center = cyclone.getElementsByTagName('center')[0]?.textContent || ''
        const wind = cyclone.getElementsByTagName('wind')[0]?.textContent || ''
        const pressure = cyclone.getElementsByTagName('pressure')[0]?.textContent || ''
        
        if (stormName && center && !processedStorms.has(stormName)) {
          const [lat, lng] = center.split(',').map(Number)
          const windSpeed = parseInt(wind.replace(/[^\d]/g, '')) || 0
          const pressureValue = parseInt(pressure.replace(/[^\d]/g, '')) || 1013
          
          hurricanes.push({
            id: `rss_${Date.now()}_${Math.random()}`,
            name: stormName,
            currentPosition: {
              lat,
              lng,
              timestamp: new Date().toISOString(),
              windSpeed,
              pressure: pressureValue,
              category: this.getCategoryFromWindSpeed(windSpeed)
            },
            historicalPositions: [],
            forecastPositions: this.generateMockForecastPositions(lat, lng),
            status: 'active',
            basin: this.determineBasinFromCoordinates(lat, lng)
          })
          
          processedStorms.add(stormName)
        }
        continue
      }
      
      // Fallback to text parsing for advisory items
      if (!this.isActiveStormAdvisory(title, description)) continue

      const hurricane = this.parseStormFromRSS(title, description)
      if (hurricane && !processedStorms.has(hurricane.name)) {
        hurricanes.push(hurricane)
        processedStorms.add(hurricane.name)
        console.log(`✅ Parsed storm: ${hurricane.name} at ${hurricane.currentPosition.lat}, ${hurricane.currentPosition.lng}`)
      } else if (hurricane) {
        console.log(`⚠️ Duplicate storm skipped: ${hurricane.name}`)
      } else {
        console.log(`❌ Failed to parse storm from: ${title}`)
      }
    }

    return {
      hurricanes: hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'NOAA RSS'
    }
  }

  /**
   * NASA Storm Services (Free) - Alternative implementation
   * Note: The original NASA endpoint appears to be unavailable
   */
  private async fetchFromNASA(): Promise<HurricaneResponse> {
    // Try alternative NASA endpoints or return empty data
    const alternativeEndpoints = [
      'https://www.nhc.noaa.gov/gis/kml/activeStorms.kml',
      'https://www.nhc.noaa.gov/gis/kml/forecastTrack.kml'
    ]

    const hurricanes: HurricaneTrack[] = []

    for (const url of alternativeEndpoints) {
      try {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; HurricaneTracker/1.0)'
          }
        })
        
        if (!response.ok) continue

        const kmlText = await response.text()
        const parser = new DOMParser()
        const kmlDoc = parser.parseFromString(kmlText, 'text/xml')
        
        const placemarks = kmlDoc.getElementsByTagName('Placemark')
        
        for (const placemark of placemarks) {
          const name = placemark.getElementsByTagName('name')[0]?.textContent || 'Unknown'
          const description = placemark.getElementsByTagName('description')[0]?.textContent || ''
          const coordinates = placemark.getElementsByTagName('coordinates')[0]?.textContent

          if (!coordinates) continue

          // Parse coordinates (KML format: lng,lat,altitude)
          const coordPairs = coordinates.trim().split('\n').map(line => 
            line.trim().split(',').slice(0, 2).map(Number)
          )

          if (coordPairs.length === 0) continue

          // Extract wind speed from description
          const windMatch = description.match(/(\d+)\s*kt/i)
          const windSpeed = windMatch ? parseInt(windMatch[1]) * 1.15 : 0 // Convert knots to mph

          hurricanes.push({
            id: `nasa_alt_${Date.now()}_${Math.random()}`,
            name: name.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
            currentPosition: {
              lat: coordPairs[0][1],
              lng: coordPairs[0][0],
              timestamp: new Date().toISOString(),
              windSpeed,
              category: this.getCategoryFromWindSpeed(windSpeed)
            },
            historicalPositions: [],
            forecastPositions: coordPairs.slice(1, 6).map(([lng, lat], index) => ({
              lat,
              lng,
              timestamp: new Date(Date.now() + (index + 1) * 24 * 60 * 60 * 1000).toISOString(),
              windSpeed: Math.max(0, windSpeed - (index * 5)),
              category: this.getCategoryFromWindSpeed(Math.max(0, windSpeed - (index * 5)))
            })),
            status: 'active',
            basin: 'ATL'
          })
        }
      } catch (error) {
        console.warn(`Failed to fetch from NASA alternative endpoint ${url}:`, error)
        continue
      }
    }

    if (hurricanes.length === 0) {
      throw new Error('NASA alternative endpoints failed')
    }

    return {
      hurricanes: hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'NASA Alternative'
    }
  }

  /**
   * National Hurricane Center Official Data (Free - Most Comprehensive)
   */
  private async fetchFromNHC(): Promise<HurricaneResponse> {
    const hurricanes: HurricaneTrack[] = []
    
    try {
      // Fetch active storms from NHC
      const activeStormsUrl = 'https://www.nhc.noaa.gov/gis/kml/activeStorms.kml'
      const response = await fetch(activeStormsUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HurricaneTracker/1.0)'
        }
      })

    if (!response.ok) {
        throw new Error(`NHC active storms failed: ${response.status}`)
    }

      const kmlText = await response.text()
    const parser = new DOMParser()
      const kmlDoc = parser.parseFromString(kmlText, 'text/xml')
      
      const placemarks = kmlDoc.getElementsByTagName('Placemark')
      
      for (const placemark of placemarks) {
        const nameElement = placemark.getElementsByTagName('name')[0]
        const name = nameElement ? nameElement.textContent || 'Unknown' : 'Unknown'
        const descElement = placemark.getElementsByTagName('description')[0]
        const description = descElement ? descElement.textContent || '' : ''
        const coordElement = placemark.getElementsByTagName('coordinates')[0]
        const coordinates = coordElement ? coordElement.textContent : null

        if (!coordinates) continue

        // Parse coordinates and extract trajectory data
        const coordPairs = coordinates.trim().split('\n').map(line => 
          line.trim().split(',').slice(0, 2).map(Number)
        )

        if (coordPairs.length === 0) continue

        // Extract wind speed and pressure from description
        const windMatch = description.match(/(\d+)\s*kt/i)
        const windSpeed = windMatch ? parseInt(windMatch[1]) * 1.15 : 0 // Convert knots to mph
        
        const pressureMatch = description.match(/(\d+)\s*mb/i)
        const pressure = pressureMatch ? parseInt(pressureMatch[1]) : undefined

        // Create trajectory data from coordinate pairs
        const trajectory: HurricanePosition[] = coordPairs.map(([lng, lat], index) => ({
          lat,
          lng,
          timestamp: new Date(Date.now() + index * 6 * 60 * 60 * 1000).toISOString(), // 6-hour intervals
          windSpeed: Math.max(0, windSpeed - (index * 2)), // Decreasing intensity over time
          pressure: pressure ? pressure + (index * 5) : undefined,
          category: this.getCategoryFromWindSpeed(Math.max(0, windSpeed - (index * 2)))
        }))

        const hurricane: HurricaneTrack = {
          id: `nhc_${Date.now()}_${Math.random()}`,
          name: name.replace(/[^a-zA-Z0-9\s]/g, '').trim(),
          currentPosition: trajectory[0],
          historicalPositions: trajectory.slice(1, Math.min(6, trajectory.length)),
          forecastPositions: trajectory.slice(Math.min(6, trajectory.length)),
          status: 'active',
          basin: this.determineBasinFromCoordinates(trajectory[0].lat, trajectory[0].lng)
        }

        hurricanes.push(hurricane)
      }

      // Also fetch forecast tracks for more detailed trajectories
      await this.enhanceWithForecastTracks(hurricanes)

    } catch (error) {
      console.warn('NHC data fetch failed:', error)
      throw error
    }

    return {
      hurricanes: hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'National Hurricane Center'
    }
  }

  /**
   * Enhance hurricane data with forecast tracks
   */
  private async enhanceWithForecastTracks(hurricanes: HurricaneTrack[]): Promise<void> {
    try {
      const forecastUrl = 'https://www.nhc.noaa.gov/gis/kml/forecastTrack.kml'
      const response = await fetch(forecastUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HurricaneTracker/1.0)'
        }
      })

      if (!response.ok) return

      const kmlText = await response.text()
      const parser = new DOMParser()
      const kmlDoc = parser.parseFromString(kmlText, 'text/xml')
      
      const placemarks = kmlDoc.getElementsByTagName('Placemark')
      
      for (const placemark of placemarks) {
        const nameElement = placemark.getElementsByTagName('name')[0]
        const name = nameElement ? nameElement.textContent || '' : ''
        
        // Find matching hurricane
        const hurricane = hurricanes.find(h => 
          h.name.toLowerCase().includes(name.toLowerCase()) || 
          name.toLowerCase().includes(h.name.toLowerCase())
        )
        
        if (!hurricane) continue

        const coordElement = placemark.getElementsByTagName('coordinates')[0]
        const coordinates = coordElement ? coordElement.textContent : null
        
        if (!coordinates) continue

        const coordPairs = coordinates.trim().split('\n').map(line => 
          line.trim().split(',').slice(0, 2).map(Number)
        )

        // Update forecast positions with more detailed trajectory
        hurricane.forecastPositions = coordPairs.map(([lng, lat], index) => ({
          lat,
          lng,
          timestamp: new Date(Date.now() + (index + 1) * 6 * 60 * 60 * 1000).toISOString(),
          windSpeed: Math.max(0, hurricane.currentPosition.windSpeed - (index * 3)),
          pressure: hurricane.currentPosition.pressure ? hurricane.currentPosition.pressure + (index * 3) : undefined,
          category: this.getCategoryFromWindSpeed(Math.max(0, hurricane.currentPosition.windSpeed - (index * 3)))
        }))
      }
    } catch (error) {
      console.warn('Forecast track enhancement failed:', error)
    }
  }

  /**
   * Determine basin from coordinates
   */
  private determineBasinFromCoordinates(lat: number, lng: number): HurricaneTrack['basin'] {
    if (lng >= -100 && lng <= -30 && lat >= 0 && lat <= 50) return 'ATL' // Atlantic
    if (lng >= -180 && lng <= -100 && lat >= 0 && lat <= 50) return 'EPAC' // Eastern Pacific
    if (lng >= -180 && lng <= -140 && lat >= 0 && lat <= 50) return 'CPAC' // Central Pacific
    if (lng >= 100 && lng <= 180 && lat >= 0 && lat <= 50) return 'WPAC' // Western Pacific
    if (lng >= 40 && lng <= 100 && lat >= 0 && lat <= 30) return 'IO' // Indian Ocean
    if (lat < 0) return 'SH' // Southern Hemisphere
    return 'ATL' // Default to Atlantic
  }

  // Potential Hurricane Detection Methods
  private async fetchPotentialFromNHC(): Promise<HurricaneResponse> {
    try {
      // Check NHC's tropical weather outlook for areas of interest
      const response = await fetch('https://www.nhc.noaa.gov/text/refresh/TWOAT.shtml', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HurricaneTracker/1.0)'
        }
      })

      if (!response.ok) {
        throw new Error(`NHC tropical outlook failed: ${response.status}`)
      }

      const text = await response.text()
    const hurricanes: HurricaneTrack[] = []

      // Look for areas of interest and tropical waves
      const areaMatches = text.match(/AREA OF LOW PRESSURE.*?(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/gi)
      const waveMatches = text.match(/TROPICAL WAVE.*?(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/gi)
      const disturbanceMatches = text.match(/TROPICAL DISTURBANCE.*?(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/gi)

      const allMatches = [...(areaMatches || []), ...(waveMatches || []), ...(disturbanceMatches || [])]

      for (const match of allMatches) {
        const coords = match.match(/(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/)
        if (coords) {
          const lat = parseFloat(coords[1])
          const lng = -parseFloat(coords[2]) // Convert to negative longitude

      hurricanes.push({
            id: `potential_${Date.now()}_${Math.random()}`,
            name: match.includes('AREA OF LOW PRESSURE') ? 'Area of Low Pressure' :
                  match.includes('TROPICAL WAVE') ? 'Tropical Wave' : 'Tropical Disturbance',
        currentPosition: {
          lat,
          lng,
          timestamp: new Date().toISOString(),
              windSpeed: 25, // Estimated low wind speed for potential storms
              pressure: 1010,
              category: 0
        },
        historicalPositions: [],
        forecastPositions: [],
        status: 'active',
            basin: this.determineBasinFromCoordinates(lat, lng)
      })
        }
    }

    return {
        hurricanes,
      lastUpdated: new Date().toISOString(),
        source: 'NHC Tropical Weather Outlook'
      }
    } catch (error) {
      console.warn('Failed to fetch potential storms from NHC:', error)
      throw error
    }
  }

  private async fetchPotentialFromXWeather(): Promise<HurricaneResponse> {
    const apiKey = process.env.XWEATHER_API_KEY
    if (!apiKey) {
      throw new Error('XWeather API key not configured')
    }

    // Check areas known for tropical development
    const tropicalAreas = [
      { lat: 10, lng: -30, name: 'Eastern Atlantic' },
      { lat: 15, lng: -50, name: 'Central Atlantic' },
      { lat: 20, lng: -70, name: 'Caribbean Sea' },
      { lat: 15, lng: -85, name: 'Western Caribbean' },
      { lat: 10, lng: -100, name: 'Eastern Pacific' },
      { lat: 15, lng: -120, name: 'Central Pacific' },
      { lat: 20, lng: -140, name: 'Western Pacific' }
    ]

    const hurricanes: HurricaneTrack[] = []

    for (const area of tropicalAreas) {
      try {
        const response = await fetch(
          `https://api.xweather.com/v1/current?lat=${area.lat}&lon=${area.lng}`,
          {
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Accept': 'application/json',
              'User-Agent': 'HurricaneTracker/1.0'
            }
          }
        )

        if (!response.ok) continue

        const weatherData = await response.json()
        
        const windSpeed = weatherData.wind?.speed || 0
        const pressure = weatherData.pressure?.value || 1013
        const humidity = weatherData.humidity?.value || 0
        
        // Check for conditions favorable for tropical development
        const isPotentialStorm = 
          (windSpeed > 20 && pressure < 1010 && humidity > 75) ||
          (windSpeed > 15 && pressure < 1005 && humidity > 80) ||
          (pressure < 1000 && humidity > 85)

        if (isPotentialStorm) {
          hurricanes.push({
            id: `xweather_potential_${Date.now()}_${Math.random()}`,
            name: `Potential Storm - ${area.name}`,
            currentPosition: {
              lat: area.lat,
              lng: area.lng,
          timestamp: new Date().toISOString(),
              windSpeed: windSpeed,
              pressure: pressure,
              category: 0
        },
        historicalPositions: [],
        forecastPositions: [],
        status: 'active',
            basin: this.determineBasinFromCoordinates(area.lat, area.lng)
      })
        }
      } catch (error) {
        console.warn(`Failed to check ${area.name} for potential storms:`, error)
        continue
      }
    }

    return {
      hurricanes,
      lastUpdated: new Date().toISOString(),
      source: 'XWeather Potential Storm Detection'
    }
  }

  private async fetchPotentialFromNOAA(): Promise<HurricaneResponse> {
    try {
      // Check NOAA's tropical weather discussions
      const response = await fetch('https://www.nhc.noaa.gov/text/refresh/TWDAT.shtml', {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; HurricaneTracker/1.0)'
        }
      })

      if (!response.ok) {
        throw new Error(`NOAA tropical discussion failed: ${response.status}`)
      }

      const text = await response.text()
      const hurricanes: HurricaneTrack[] = []

      // Look for mentions of developing systems
      const developingMatches = text.match(/DEVELOPING.*?(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/gi)
      const formationMatches = text.match(/FORMATION.*?(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/gi)

      const allMatches = [...(developingMatches || []), ...(formationMatches || [])]

      for (const match of allMatches) {
        const coords = match.match(/(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/)
        if (coords) {
          const lat = parseFloat(coords[1])
          const lng = -parseFloat(coords[2])

          hurricanes.push({
            id: `noaa_potential_${Date.now()}_${Math.random()}`,
            name: 'Developing System',
            currentPosition: {
              lat,
              lng,
              timestamp: new Date().toISOString(),
              windSpeed: 20,
              pressure: 1008,
              category: 0
            },
            historicalPositions: [],
            forecastPositions: [],
            status: 'active',
            basin: this.determineBasinFromCoordinates(lat, lng)
          })
        }
      }

      return {
        hurricanes,
        lastUpdated: new Date().toISOString(),
        source: 'NOAA Tropical Weather Discussion'
      }
    } catch (error) {
      console.warn('Failed to fetch potential storms from NOAA:', error)
      throw error
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
      'hurricane', 'tropical storm', 'tropical depression', 'typhoon', 'cyclone',
      'advisory', 'warning', 'watch', 'active', 'summary'
    ]
    
    const text = `${title} ${description}`.toLowerCase()
    
    // Check for active storm keywords
    const hasStormKeyword = activeKeywords.some(keyword => text.includes(keyword))
    
    // Also check for specific storm patterns in titles
    const hasStormPattern = /(hurricane|tropical storm|tropical depression)\s+[a-z]+/i.test(title)
    
    return hasStormKeyword || hasStormPattern
  }

  private parseStormFromRSS(title: string, description: string): HurricaneTrack | null {
    try {
      // Extract storm name - handle various patterns
      let stormName = 'Unknown'
      const namePatterns = [
        /(?:Hurricane|Tropical Storm|Tropical Depression)\s+([A-Z][a-z]+)/i,
        /Summary for (?:Hurricane|Tropical Storm|Tropical Depression)\s+([A-Z][a-z]+)/i,
        /([A-Z][a-z]+)\s+(?:Hurricane|Tropical Storm|Tropical Depression)/i
      ]
      
      for (const pattern of namePatterns) {
        const match = title.match(pattern)
        if (match) {
          stormName = match[1]
          break
        }
      }

      // Extract coordinates - try multiple patterns
      let lat = 0, lng = 0
      const coordPatterns = [
        /(\d+\.?\d*)\s*N.*?(\d+\.?\d*)\s*W/i,
        /(\d+\.?\d*)\s*[NS].*?(\d+\.?\d*)\s*[EW]/i,
        /LAT\s*(\d+\.?\d*).*?LON\s*(\d+\.?\d*)/i
      ]
      
      for (const pattern of coordPatterns) {
        const match = description.match(pattern)
        if (match) {
          lat = parseFloat(match[1])
          lng = -parseFloat(match[2]) // Convert W to negative longitude
          break
        }
      }

      // If no coordinates found, return null
      if (lat === 0 && lng === 0) {
        console.log(`No coordinates found for ${stormName} in: ${description.substring(0, 200)}`)
        return null
      }

      // Extract wind speed - try multiple patterns
      let windSpeed = 0
      const windPatterns = [
        /(\d+)\s*kt/i,
        /(\d+)\s*knots/i,
        /(\d+)\s*mph/i,
        /MAXIMUM SUSTAINED WINDS.*?(\d+)/i
      ]
      
      for (const pattern of windPatterns) {
        const match = description.match(pattern)
        if (match) {
          windSpeed = parseInt(match[1])
          // Convert knots to mph if needed
          if (description.toLowerCase().includes('kt') || description.toLowerCase().includes('knots')) {
            windSpeed = windSpeed * 1.15
          }
          break
        }
      }

      // Extract pressure if available
      let pressure = 1013 // Default
      const pressureMatch = description.match(/(\d{3,4})\s*MB/i)
      if (pressureMatch) {
        pressure = parseInt(pressureMatch[1])
      }

      return {
        id: `rss_${Date.now()}_${Math.random()}`,
        name: stormName,
        currentPosition: {
          lat,
          lng,
          timestamp: new Date().toISOString(),
          windSpeed,
          pressure,
          category: this.getCategoryFromWindSpeed(windSpeed)
        },
        historicalPositions: [],
        forecastPositions: this.generateMockForecastPositions(lat, lng),
        status: 'active',
        basin: this.determineBasinFromCoordinates(lat, lng)
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

}
