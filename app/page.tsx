"use client"

import { useState, useEffect } from "react"
import { ChatPanel } from "@/components/chat-panel"
import { MapPanel } from "@/components/map-panel"
import { AddResourceModal } from "@/components/add-resource-modal"
import { CrowdDensityPanel } from "@/components/crowd-density-panel"
import { WeatherAlertBanner } from "@/components/weather-alert-banner"
import { RealWeatherNotification } from "@/components/real-weather-notification"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { Plus, MapPin, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { SmartWeatherNotificationService } from "@/lib/smart-weather-notification-service"
import { WeatherAlert } from "@/lib/weather-service"
import Link from "next/link"

export interface MapMarker {
  id: string
  name: string
  type: "shelter" | "food_bank" | "clinic" | "police" | "fire"
  lat: number
  lng: number
  distance?: string
  openNow?: boolean
  source?: string
  address?: string
}

interface DensityZone {
  id: string
  name: string
  lat: number
  lng: number
  density: string
  population: number
  riskLevel: string
  description: string
  distance: number
  radius: number
  color: string
  opacity: number
  crowdingScore: number
}

export default function HomePage() {
  const [markers, setMarkers] = useState<MapMarker[]>([])
  const [mapCenter, setMapCenter] = useState({ lat: 40.7128, lng: -74.006 })
  const [isAddResourceOpen, setIsAddResourceOpen] = useState(false)
  const [emergencyMode, setEmergencyMode] = useState(false)
  const [hurricaneMode, setHurricaneMode] = useState(false)
  const [densityZones, setDensityZones] = useState<DensityZone[]>([])
  const [lastQuery, setLastQuery] = useState("")
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [lastSearchResults, setLastSearchResults] = useState(0)
  const [isUsingAI, setIsUsingAI] = useState(false)
  const [showResultsPanel, setShowResultsPanel] = useState(true)
  const [showCrowdDensity, setShowCrowdDensity] = useState(false)
  const { toast } = useToast()

  const [weatherNotificationService] = useState(() => SmartWeatherNotificationService.getInstance())
  const [activeFilters, setActiveFilters] = useState<Record<MapMarker['type'], boolean>>({
    shelter: false,
    food_bank: false,
    clinic: false,
    police: false,
    fire: false,
  })

  // Get user location on component mount
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords
          setUserLocation({ lat: latitude, lng: longitude })
          setMapCenter({ lat: latitude, lng: longitude })
        },
        (error) => {
          console.warn('Geolocation error:', error)
          // Keep default Miami coordinates
        }
      )
    }
  }, [])

  // Initialize weather notifications
  useEffect(() => {
    if (userLocation) {
      weatherNotificationService.startMonitoring(
        userLocation.lat,
        userLocation.lng,
        (condition) => {
          if (condition && (condition.severity === 'severe' || condition.severity === 'extreme')) {
            toast({
              title: "🚨 Urgent Weather Alert",
              description: `${condition.title} - ${condition.description}`,
              variant: "destructive",
              duration: 10000,
            })
          }
        }
      )
    }

    return () => {
      weatherNotificationService.stopMonitoring()
    }
  }, [userLocation, weatherNotificationService, toast])

  const handleChatSubmit = async (text: string) => {
    setLastQuery(text)
    setIsLoading(true)

    try {
      // POST /api/intent
      const intentResponse = await fetch("/api/intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: text,
          emergencyMode,
        }),
      })

      if (!intentResponse.ok) {
        throw new Error("Failed to process intent")
      }

      const { intent } = await intentResponse.json()
      console.log("Intent received:", intent)
      
      // Check if this is AI-generated intent
      const isAIResponse = intent._isAI === true
      setIsUsingAI(isAIResponse)

      let allMarkers: MapMarker[] = []
      // Use user location if available, otherwise default to Miami
      let centerLat = userLocation?.lat || 25.774
      let centerLng = userLocation?.lng || -80.193

      // Handle shelter category - use Places with unified radius
      if (intent.categories?.includes("shelter")) {
        try {
          // Use Places for chat/emergency shelter searches (do NOT surface seed JSON here)
          const placesResponse = await fetch(
            `/api/places?type=shelter&lat=${centerLat}&lng=${centerLng}&radius=5000&q=${encodeURIComponent(text)}`
          )
          if (placesResponse.ok) {
            const { results } = await placesResponse.json()
            const shelterMarkers = (results || []).map((place: any) => ({
              id: place.id,
              name: place.name,
              type: (place.type || 'shelter') as MapMarker["type"],
              lat: place.lat,
              lng: place.lng,
              openNow: place.openNow,
              source: place.source,
              address: place.address,
            }))
            allMarkers.push(...shelterMarkers)
            if (shelterMarkers.length > 0) {
              centerLat = shelterMarkers[0].lat
              centerLng = shelterMarkers[0].lng
            }
          }
        } catch (error) {
          console.error("Failed to search shelters via Places:", error)
        }
      }

      // Handle food_bank and clinic categories - call /api/places
      const placeTypes = intent.categories?.filter((cat: string) => 
        cat === "food_bank" || cat === "clinic"
      ) || []

      for (const type of placeTypes) {
        try {
          // Use the same unified radius for all chat place lookups
          const placesResponse = await fetch(
            `/api/places?type=${type}&lat=${centerLat}&lng=${centerLng}&radius=5000&openNow=${intent.openNowPreferred || false}&q=${encodeURIComponent(text)}`
          )
          
          if (placesResponse.ok) {
            const { results } = await placesResponse.json()
            const placeMarkers = results.map((place: any) => ({
              id: place.id,
              name: place.name,
              type: place.type as MapMarker["type"],
              lat: place.lat,
              lng: place.lng,
              openNow: place.openNow,
              source: place.source,
              address: place.address,
            }))
            allMarkers.push(...placeMarkers)
          }
        } catch (error) {
          console.error(`Failed to load ${type} data:`, error)
        }
      }

      // Handle emergency categories: police or fire (use same /api/places flow as other chat place lookups)
      const emergencyCats = intent.categories?.filter((cat: string) => cat === 'police' || cat === 'fire') || []
      if (emergencyCats.length > 0) {
        for (const type of emergencyCats) {
          try {
            const lat = userLocation?.lat || centerLat
            const lng = userLocation?.lng || centerLng
            const placesResponse = await fetch(
              `/api/places?type=${type}&lat=${lat}&lng=${lng}&radius=5000&q=${encodeURIComponent(text)}`
            )

            if (placesResponse.ok) {
              const { results } = await placesResponse.json()
              const emergencyMarkers = (results || []).map((place: any) => ({
                id: place.id,
                name: place.name,
                type: place.type as MapMarker['type'],
                lat: place.lat,
                lng: place.lng,
                openNow: place.openNow,
                source: place.source,
                address: place.address,
              }))
              allMarkers.push(...emergencyMarkers)
              if (emergencyMarkers.length > 0) {
                centerLat = emergencyMarkers[0].lat
                centerLng = emergencyMarkers[0].lng
              }
            }
          } catch (err) {
            console.error('Failed to load emergency places for chat:', err)
          }
        }
      }

      // Load approved community resources for all types
      try {
        const resourcesResponse = await fetch("/api/resources")
        if (resourcesResponse.ok) {
          const { resources } = await resourcesResponse.json()
          const communityResources = resources
            .filter((resource: any) =>
              intent.categories?.includes(resource.type)
            )
            .map((resource: any) => ({
              id: `community-${resource.id}`,
              name: resource.name,
              type: resource.type as MapMarker["type"],
              lat: resource.lat,
              lng: resource.lng,
              openNow: null,
              source: "community",
              address: resource.address,
            }))
          allMarkers.push(...communityResources)
        }
      } catch (error) {
        console.error("Failed to load community resources:", error)
      }

      setMarkers(allMarkers)
      setMapCenter({ lat: centerLat, lng: centerLng })
      setLastSearchResults(allMarkers.length)
      if (allMarkers.length > 0) {
        setShowResultsPanel(true)
      }

      if (allMarkers.length > 0) {
        toast({
          title: "Resources Found",
          description: `Found ${allMarkers.length} ${allMarkers.length === 1 ? 'resource' : 'resources'} near you.`,
        })
      } else {
        toast({
          title: "No Results",
          description: "No resources found for your query. Try different keywords.",
          variant: "destructive",
        })
      }
    } catch (error) {
      console.error("Failed to submit chat:", error)
      toast({
        title: "Error",
        description: "Failed to search for resources. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleEmergencyToggle = async (enabled: boolean) => {
    setEmergencyMode(enabled)

    if (enabled) {
      // When emergency mode is enabled, load both shelters and emergency services
      setIsLoading(true)
      try {
        const lat = userLocation?.lat || 25.774
        const lng = userLocation?.lng || -80.193
        
        // Load emergency shelters and emergency services in parallel
        const [sheltersResponse, emergencyResponse] = await Promise.all([
          fetch(`/api/places?type=shelter&lat=${lat}&lng=${lng}&radius=5000&openNow=true`),
          fetch(`/api/emergency-list?lat=${lat}&lng=${lng}&radius=20000`)
        ])

        let allMarkers: MapMarker[] = []

        // Process shelter results
        if (sheltersResponse.ok) {
          const { results: shelterResults } = await sheltersResponse.json()
          const shelterMarkers = (shelterResults || []).map((place: any) => ({
            id: place.id,
            name: place.name,
            type: (place.type || 'shelter') as MapMarker["type"],
            lat: place.lat,
            lng: place.lng,
            openNow: place.openNow,
            source: place.source,
            address: place.address,
          }))
          allMarkers.push(...shelterMarkers)
        }

        // Process emergency services results
        if (emergencyResponse.ok) {
          const { results: emergencyResults } = await emergencyResponse.json()
          const emergencyMarkers = (emergencyResults || []).map((place: any) => ({
            id: place.id,
            name: place.name,
            type: place.type as MapMarker['type'],
            lat: place.lat,
            lng: place.lng,
            openNow: place.openNow ?? null,
            source: place.source ?? 'places',
            address: place.address,
          }))
          allMarkers.push(...emergencyMarkers)
        }

        // Update markers and filters
        setMarkers(allMarkers)
        setActiveFilters(prev => ({ 
          ...prev, 
          shelter: sheltersResponse.ok, 
          police: emergencyResponse.ok, 
          fire: emergencyResponse.ok 
        }))
        
        if (allMarkers.length > 0) {
          setMapCenter({ lat: allMarkers[0].lat, lng: allMarkers[0].lng })
          setShowResultsPanel(true)
        }

        // Re-run last query with emergency categories if there was a previous query
        if (lastQuery) {
          try {
            const intentResponse = await fetch("/api/intent", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                text: lastQuery,
                emergencyMode: true,
              }),
            })

            if (intentResponse.ok) {
              const { intent } = await intentResponse.json()
              console.log("Emergency intent received:", intent)
            }
          } catch (error) {
            console.error("Failed to process emergency intent:", error)
          }
        }

      } catch (error) {
        console.error("Failed to load emergency data:", error)
      } finally {
        setIsLoading(false)
      }
    } else {
      // When emergency mode is disabled, remove emergency-related markers
      setMarkers(prev => prev.filter(m => !(m.type === 'shelter' || m.type === 'police' || m.type === 'fire')))
      setActiveFilters(prev => ({ ...prev, shelter: false, police: false, fire: false }))
    }
  }

  const handleAddResource = async (resource: any) => {
    try {
      const response = await fetch("/api/pending", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: resource.name,
          type: resource.type,
          address: resource.address,
          lat: resource.lat,
          lng: resource.lng,
          notes: resource.notes,
          submittedBy: "user", // In a real app, this would come from auth
        }),
      })

      if (response.ok) {
        const { id } = await response.json()
        console.log("Resource submitted for review:", id)
        toast({
          title: "Resource Submitted",
          description: "Thank you! Your resource has been submitted for review.",
        })
        setIsAddResourceOpen(false)
      } else {
        throw new Error("Failed to submit resource")
      }
    } catch (error) {
      console.error("Failed to add resource:", error)
      toast({
        title: "Submission Failed",
        description: "Failed to submit resource. Please try again.",
        variant: "destructive",
      })
    }
  }

  // Toggle Places-based lists (Food Banks, Shelters, Clinics) on/off
  const toggleStaticList = async (type: MapMarker['type']) => {
    const currentlyActive = activeFilters[type]
    
    // Turn off: remove place markers for this type
    if (currentlyActive) {
      setActiveFilters(prev => ({ ...prev, [type]: false }))
      setMarkers(prev => prev.filter(m => !(m.source === 'places' && m.type === type)))
      return
    }

    // If emergency mode is active and we're toggling shelter, don't duplicate
    if (emergencyMode && type === 'shelter') {
      return
    }

    // Turn on: call the /api/places endpoint to get live results (same pattern as Emergency Services)
    setIsLoading(true)
    try {
  const lat = userLocation?.lat || 25.774
  const lng = userLocation?.lng || -80.193
  // Call per-type endpoints (shelters, food-banks, clinics)
  const endpoint = type === 'shelter' ? '/api/shelters' : type === 'food_bank' ? '/api/food-banks' : '/api/clinics'
  const resp = await fetch(`${endpoint}?lat=${lat}&lng=${lng}&radius=20000`)
      if (!resp.ok) throw new Error('Failed to load places')
      const { results } = await resp.json()

      const newMarkers: MapMarker[] = (results || []).map((p: any) => ({
        id: p.id,
        name: p.name,
        type: p.type,
        lat: p.lat,
        lng: p.lng,
        openNow: p.openNow ?? null,
        source: p.source ?? 'places',
        address: p.address,
      }))

      // Remove any existing place markers of this type then append fresh ones
      setMarkers(prev => {
        const filtered = prev.filter(m => !(m.source === 'places' && m.type === type))
        return [...filtered, ...newMarkers]
      })
      setActiveFilters(prev => ({ ...prev, [type]: true }))
      if (newMarkers.length > 0) setMapCenter({ lat: newMarkers[0].lat, lng: newMarkers[0].lng })
      setLastSearchResults(prev => {
        try { return markers.length + newMarkers.length } catch (e) { return newMarkers.length }
      })
    } catch (e) {
      console.error(`Failed to load ${type} via Places`, e)
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggleCrowdDensity = async (show: boolean) => {
    setShowCrowdDensity(show)

    if (show && userLocation) {
      try {
        const response = await fetch(
          `/api/population-density?lat=${userLocation.lat}&lng=${userLocation.lng}&radius=25000`
        )

        if (response.ok) {
          const data = await response.json()
          setDensityZones(data.zones)
        } else {
          console.error('Failed to fetch density data')
        }
      } catch (error) {
        console.error('Error fetching density data:', error)
      }
    } else {
      setDensityZones([])
    }
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Navigation Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-lg font-semibold">Google Storm</h1>
          <div className="flex items-center gap-2">
            <Button size="sm" variant={activeFilters.food_bank ? 'secondary' : 'ghost'} onClick={() => toggleStaticList('food_bank')}>Food Banks</Button>

            <Button size="sm" variant={(activeFilters.shelter || emergencyMode) ? 'secondary' : 'ghost'} onClick={() => toggleStaticList('shelter')}>Shelters</Button>

            <Button size="sm" variant={activeFilters.clinic ? 'secondary' : 'ghost'} onClick={() => toggleStaticList('clinic')}>Clinics</Button>

            <Link href="/admin">
              <Button variant="ghost" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Admin
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-96 flex-shrink-0 border-r border-border pt-12 flex flex-col h-screen">
        <div className="flex-1 min-h-0">
          <ChatPanel
            onSubmitChat={handleChatSubmit}
            onEmergencyToggle={handleEmergencyToggle}
            onHurricaneToggle={setHurricaneMode}
            emergencyMode={emergencyMode}
            hurricaneMode={hurricaneMode}
            isLoading={isLoading}
            lastSearchResults={lastSearchResults}
            isUsingAI={isUsingAI}
            userLocation={userLocation}
            showCrowdDensity={showCrowdDensity}
            onToggleCrowdDensity={handleToggleCrowdDensity}
          />
        </div>
      </div>

      {/* Crowd Density Panel */}
      {showCrowdDensity && densityZones.length > 0 && (
        <CrowdDensityPanel
          zones={densityZones}
          showPanel={showCrowdDensity}
          onClose={() => setShowCrowdDensity(false)}
          onZoneClick={(zone) => {
            // Center map on the selected density zone
            setMapCenter({ lat: zone.lat, lng: zone.lng })
          }}
        />
      )}

      {/* Map Panel */}
      <div className="flex-1 relative">
        {/* Weather Alert Banner */}
        {userLocation && (
          <div className="absolute top-0 left-0 right-0 z-40 pt-12">
            <WeatherAlertBanner lat={userLocation.lat} lng={userLocation.lng} />
          </div>
        )}

        {/* Real Weather Notification */}
        {userLocation && (
          <RealWeatherNotification 
            lat={userLocation.lat} 
            lng={userLocation.lng}
            onDismiss={(alertId) => {
              console.log('Weather alert dismissed:', alertId)
            }}
          />
        )}

         <MapPanel 
           markers={markers} 
           center={mapCenter} 
           userLocation={userLocation || undefined} 
           hurricaneMode={hurricaneMode}
           emergencyMode={emergencyMode}
           densityZones={densityZones}
           showResultsPanel={showResultsPanel}
           onCloseResultsPanel={() => setShowResultsPanel(false)}
         />

        {/* Floating Add Resource Button */}
        <Button
          onClick={() => setIsAddResourceOpen(true)}
          className="fixed bottom-6 right-6 h-14 px-6 text-lg font-semibold shadow-lg z-10"
          size="lg"
        >
          <Plus className="w-5 h-5 mr-2" />
          Add Resource
        </Button>
      </div>

      {/* Add Resource Modal */}
      <AddResourceModal
        isOpen={isAddResourceOpen}
        onClose={() => setIsAddResourceOpen(false)}
        onSubmit={handleAddResource}
      />

      {/* Toast Notifications */}
      <Toaster />
    </div>
  )
}
