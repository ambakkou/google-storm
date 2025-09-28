import { HurricaneService, HurricaneTrack, HurricanePosition } from './hurricane-service'

export interface LiveHurricanePosition extends HurricanePosition {
  interpolated?: boolean
  direction?: number // degrees from north
  speed?: number // mph
}

export interface LiveHurricaneTrack extends Omit<HurricaneTrack, 'currentPosition'> {
  currentPosition: LiveHurricanePosition
  previousPosition?: LiveHurricanePosition
  targetPosition?: LiveHurricanePosition
  isMoving: boolean
  lastUpdate: string
}

export interface HurricaneMovementData {
  hurricanes: LiveHurricaneTrack[]
  lastUpdated: string
  nextUpdate: string
}

export class LiveHurricaneService {
  private static instance: LiveHurricaneService
  private hurricaneService: HurricaneService
  private liveData: Map<string, LiveHurricaneTrack> = new Map()
  private updateInterval: NodeJS.Timeout | null = null
  private animationFrame: number | null = null
  private subscribers: Set<(data: HurricaneMovementData) => void> = new Set()
  private lastApiUpdate: number = 0
  
  // Animation settings
  private readonly API_UPDATE_INTERVAL = 5 * 60 * 1000 // 5 minutes
  private readonly ANIMATION_UPDATE_INTERVAL = 10 * 1000 // 10 seconds for smooth movement
  private readonly INTERPOLATION_STEPS = 30 // Steps between API updates

  public static getInstance(): LiveHurricaneService {
    if (!LiveHurricaneService.instance) {
      LiveHurricaneService.instance = new LiveHurricaneService()
    }
    return LiveHurricaneService.instance
  }

  constructor() {
    this.hurricaneService = HurricaneService.getInstance()
  }

  /**
   * Start live hurricane tracking with smooth animations
   */
  async startLiveTracking(): Promise<void> {
    // Initial data fetch
    await this.fetchAndUpdateData()
    
    // Set up regular API updates
    this.updateInterval = setInterval(async () => {
      await this.fetchAndUpdateData()
    }, this.API_UPDATE_INTERVAL)

    // Start animation loop for smooth movement
    this.startAnimationLoop()

    console.log('🌀 Live hurricane tracking started')
  }

  /**
   * Stop live hurricane tracking
   */
  stopLiveTracking(): void {
    if (this.updateInterval) {
      clearInterval(this.updateInterval)
      this.updateInterval = null
    }

    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame)
      this.animationFrame = null
    }

    this.liveData.clear()
    this.subscribers.clear()
    
    console.log('🌀 Live hurricane tracking stopped')
  }

  /**
   * Subscribe to live hurricane updates
   */
  subscribe(callback: (data: HurricaneMovementData) => void): () => void {
    this.subscribers.add(callback)
    
    // Immediately send current data if available
    if (this.liveData.size > 0) {
      callback(this.getCurrentData())
    }

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(callback)
    }
  }

  /**
   * Get current live hurricane data
   */
  getCurrentData(): HurricaneMovementData {
    const hurricanes = Array.from(this.liveData.values())
    const now = new Date()
    const nextUpdate = new Date(now.getTime() + this.API_UPDATE_INTERVAL)

    return {
      hurricanes,
      lastUpdated: now.toISOString(),
      nextUpdate: nextUpdate.toISOString()
    }
  }

  /**
   * Fetch new data from the API and update live tracking
   */
  private async fetchAndUpdateData(): Promise<void> {
    try {
      const response = await this.hurricaneService.getActiveHurricanes()
      this.lastApiUpdate = Date.now()

      for (const hurricane of response.hurricanes) {
        const existingHurricane = this.liveData.get(hurricane.id)
        
        if (existingHurricane) {
          // Update existing hurricane with new target position
          this.updateHurricaneTarget(existingHurricane, hurricane)
        } else {
          // Add new hurricane
          this.addNewHurricane(hurricane)
        }
      }

      // Remove hurricanes that are no longer active
      const activeIds = new Set(response.hurricanes.map(h => h.id))
      for (const [id, hurricane] of this.liveData) {
        if (!activeIds.has(id)) {
          this.liveData.delete(id)
          console.log(`🌀 Hurricane ${hurricane.name} is no longer active`)
        }
      }

      this.notifySubscribers()
    } catch (error) {
      console.error('Failed to fetch hurricane data for live tracking:', error)
    }
  }

  /**
   * Update existing hurricane with new target position
   */
  private updateHurricaneTarget(existingHurricane: LiveHurricaneTrack, newData: HurricaneTrack): void {
    const newPosition = newData.currentPosition

    // Check if position has actually changed
    const hasPositionChanged = 
      Math.abs(existingHurricane.currentPosition.lat - newPosition.lat) > 0.01 ||
      Math.abs(existingHurricane.currentPosition.lng - newPosition.lng) > 0.01

    if (hasPositionChanged) {
      // Store previous position
      existingHurricane.previousPosition = { ...existingHurricane.currentPosition }
      
      // Set new target position
      existingHurricane.targetPosition = {
        ...newPosition,
        direction: this.calculateDirection(existingHurricane.currentPosition, newPosition),
        speed: this.calculateSpeed(existingHurricane.currentPosition, newPosition),
        interpolated: false
      }
      
      existingHurricane.isMoving = true
      existingHurricane.lastUpdate = new Date().toISOString()

      console.log(`🌀 ${existingHurricane.name} moving from [${existingHurricane.currentPosition.lat.toFixed(2)}, ${existingHurricane.currentPosition.lng.toFixed(2)}] to [${newPosition.lat.toFixed(2)}, ${newPosition.lng.toFixed(2)}]`)
    }

    // Update other properties
    existingHurricane.historicalPositions = newData.historicalPositions
    existingHurricane.forecastPositions = newData.forecastPositions
    existingHurricane.status = newData.status
  }

  /**
   * Add new hurricane to live tracking
   */
  private addNewHurricane(hurricane: HurricaneTrack): void {
    const liveHurricane: LiveHurricaneTrack = {
      ...hurricane,
      currentPosition: {
        ...hurricane.currentPosition,
        interpolated: false
      },
      isMoving: false,
      lastUpdate: new Date().toISOString()
    }

    this.liveData.set(hurricane.id, liveHurricane)
    console.log(`🌀 New hurricane added to live tracking: ${hurricane.name}`)
  }

  /**
   * Start the animation loop for smooth hurricane movement
   */
  private startAnimationLoop(): void {
    const animate = () => {
      this.updateHurricanePositions()
      this.animationFrame = requestAnimationFrame(animate)
    }
    
    animate()
  }

  /**
   * Update hurricane positions with smooth interpolation
   */
  private updateHurricanePositions(): void {
    let hasUpdates = false
    const now = Date.now()

    for (const [id, hurricane] of this.liveData) {
      if (hurricane.isMoving && hurricane.targetPosition) {
        const timeSinceUpdate = now - new Date(hurricane.lastUpdate).getTime()
        const progress = Math.min(timeSinceUpdate / this.API_UPDATE_INTERVAL, 1)

        if (progress < 1) {
          // Interpolate position
          const currentPos = hurricane.currentPosition
          const targetPos = hurricane.targetPosition
          
          const newLat = this.lerp(currentPos.lat, targetPos.lat, progress)
          const newLng = this.lerp(currentPos.lng, targetPos.lng, progress)

          hurricane.currentPosition = {
            ...hurricane.currentPosition,
            lat: newLat,
            lng: newLng,
            interpolated: true,
            direction: targetPos.direction,
            speed: targetPos.speed
          }

          hasUpdates = true
        } else {
          // Reached target position
          hurricane.currentPosition = {
            ...hurricane.targetPosition,
            interpolated: false
          }
          hurricane.targetPosition = undefined
          hurricane.isMoving = false
          hasUpdates = true
          
          console.log(`🌀 ${hurricane.name} reached target position`)
        }
      }
    }

    if (hasUpdates) {
      this.notifySubscribers()
    }
  }

  /**
   * Linear interpolation between two values
   */
  private lerp(start: number, end: number, progress: number): number {
    return start + (end - start) * this.easeInOutCubic(progress)
  }

  /**
   * Smooth easing function for more natural movement
   */
  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
  }

  /**
   * Calculate direction between two points in degrees from north
   */
  private calculateDirection(from: HurricanePosition, to: HurricanePosition): number {
    const deltaLng = to.lng - from.lng
    const deltaLat = to.lat - from.lat
    
    const bearing = Math.atan2(deltaLng, deltaLat) * (180 / Math.PI)
    return (bearing + 360) % 360
  }

  /**
   * Calculate speed between two points
   */
  private calculateSpeed(from: HurricanePosition, to: HurricanePosition): number {
    const distance = this.calculateDistance(from.lat, from.lng, to.lat, to.lng)
    const timeHours = this.API_UPDATE_INTERVAL / (1000 * 60 * 60) // Convert to hours
    return distance / timeHours // mph
  }

  /**
   * Calculate distance between two coordinates in miles
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 3959 // Earth's radius in miles
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLng = (lng2 - lng1) * Math.PI / 180
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
    return R * c
  }

  /**
   * Notify all subscribers of data changes
   */
  private notifySubscribers(): void {
    const data = this.getCurrentData()
    this.subscribers.forEach(callback => {
      try {
        callback(data)
      } catch (error) {
        console.error('Error notifying hurricane subscriber:', error)
      }
    })
  }

  /**
   * Get hurricane by ID
   */
  getHurricaneById(id: string): LiveHurricaneTrack | undefined {
    return this.liveData.get(id)
  }

  /**
   * Get all active hurricanes
   */
  getAllHurricanes(): LiveHurricaneTrack[] {
    return Array.from(this.liveData.values())
  }

  /**
   * Force refresh from API
   */
  async forceRefresh(): Promise<void> {
    await this.fetchAndUpdateData()
  }
}