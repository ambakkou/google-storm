"use client"

import { useState, useEffect } from "react"
import { ChatPanel } from "@/components/chat-panel"
import { MapPanel } from "@/components/map-panel"
import { AddResourceModal } from "@/components/add-resource-modal"
import { CrowdDensityOverlay } from "@/components/crowd-density-overlay"
import { WeatherAlertBanner } from "@/components/weather-alert-banner"
import { Button } from "@/components/ui/button"
import { Toaster } from "@/components/ui/toaster"
import { Plus, MapPin, Settings } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { WeatherNotificationService } from "@/lib/weather-notifications"
import { WeatherAlert } from "@/lib/weather-service"
import Link from "next/link"

export interface MapMarker {
  id: string
  name: string
  type: "shelter" | "food_bank" | "clinic"
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
  const { toast } = useToast()
  const [weatherNotificationService] = useState(() => WeatherNotificationService.getInstance())

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
    weatherNotificationService.loadPersistedData()

    if (userLocation) {
      weatherNotificationService.startMonitoring(
        userLocation.lat,
        userLocation.lng,
        (alerts: WeatherAlert[]) => {
          if (alerts.length > 0) {
            const urgentAlerts = alerts.filter(alert =>
              alert.severity === 'severe' || alert.severity === 'extreme'
            )

            if (urgentAlerts.length > 0) {
              toast({
                title: "🚨 Urgent Weather Alert",
                description: `${urgentAlerts[0].title} - ${urgentAlerts[0].description}`,
                variant: "destructive",
                duration: 10000,
              })
            }
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

      // Handle shelter category - load from seeds
      if (intent.categories?.includes("shelter")) {
        try {
          // Load seed data
          const shelterResponse = await fetch("/api/shelters")
          if (shelterResponse.ok) {
            const shelterData = await shelterResponse.json()
            const shelterMarkers = shelterData.map((shelter: any) => ({
              id: shelter.id,
              name: shelter.name,
              type: shelter.type as MapMarker["type"],
              lat: shelter.lat,
              lng: shelter.lng,
              openNow: shelter.openNow,
              source: shelter.source,
            }))
            allMarkers.push(...shelterMarkers)
            
            // Set center to first shelter or average
            if (shelterMarkers.length > 0) {
              centerLat = shelterMarkers[0].lat
              centerLng = shelterMarkers[0].lng
            }
          } else {
            // Fallback shelter data if file not accessible
            console.warn("Shelter data file not accessible, using fallback data")
            const fallbackShelters = [
              {
                id: "fallback-shelter-1",
                name: "Miami Emergency Shelter",
                type: "shelter" as MapMarker["type"],
                lat: centerLat + 0.005,
                lng: centerLng - 0.005,
                openNow: true,
                source: "fallback",
              },
              {
                id: "fallback-shelter-2", 
                name: "Downtown Crisis Shelter",
                type: "shelter" as MapMarker["type"],
                lat: centerLat - 0.003,
                lng: centerLng + 0.003,
                openNow: false,
                source: "fallback",
              }
            ]
            allMarkers.push(...fallbackShelters)
          }

          // Load approved community resources for shelters
          try {
            const resourcesResponse = await fetch("/api/resources")
            if (resourcesResponse.ok) {
              const { resources } = await resourcesResponse.json()
              const shelterResources = resources
                .filter((resource: any) => resource.type === "shelter")
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
              allMarkers.push(...shelterResources)
            }
          } catch (error) {
            console.error("Failed to load community resources:", error)
          }
        } catch (error) {
          console.error("Failed to load shelter data:", error)
          // Fallback shelter data on error
          const fallbackShelters = [
            {
              id: "error-shelter-1",
              name: "Emergency Shelter (Fallback)",
              type: "shelter" as MapMarker["type"],
              lat: centerLat,
              lng: centerLng,
              openNow: true,
              source: "fallback",
            }
          ]
          allMarkers.push(...fallbackShelters)
        }
      }

      // Handle food_bank and clinic categories - call /api/places
      const placeTypes = intent.categories?.filter((cat: string) => 
        cat === "food_bank" || cat === "clinic"
      ) || []

      for (const type of placeTypes) {
        try {
          const placesResponse = await fetch(
            `/api/places?type=${type}&lat=${centerLat}&lng=${centerLng}&radius=2500&openNow=${intent.openNowPreferred || false}&q=${encodeURIComponent(text)}`
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

    // Re-run last query with emergency categories if there was a previous query
    if (lastQuery && enabled) {
      // Force emergency mode: categories=["shelter"], openNow=true
      try {
        const intentResponse = await fetch("/api/intent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: lastQuery,
            emergencyMode: true,
          }),
        })

        if (!intentResponse.ok) {
          throw new Error("Failed to process emergency intent")
        }

        const { intent } = await intentResponse.json()
        console.log("Emergency intent received:", intent)

        // Load shelter data only
        try {
          const shelterResponse = await fetch("/api/shelters")
          if (shelterResponse.ok) {
            const shelterData = await shelterResponse.json()
            const shelterMarkers = shelterData.map((shelter: any) => ({
              id: shelter.id,
              name: shelter.name,
              type: shelter.type as MapMarker["type"],
              lat: shelter.lat,
              lng: shelter.lng,
              openNow: shelter.openNow,
              source: shelter.source,
            }))
            
            setMarkers(shelterMarkers)
            if (shelterMarkers.length > 0) {
              setMapCenter({ lat: shelterMarkers[0].lat, lng: shelterMarkers[0].lng })
              setShowResultsPanel(true)
            }
          }
        } catch (error) {
          console.error("Failed to load emergency shelter data:", error)
        }
      } catch (error) {
        console.error("Failed to handle emergency toggle:", error)
      }
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

  return (
    <div className="flex h-screen bg-background">
      {/* Navigation Header */}
      <div className="absolute top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-border">
        <div className="flex items-center justify-between px-4 py-2">
          <h1 className="text-lg font-semibold">Google Storm</h1>
          <Link href="/admin">
            <Button variant="ghost" size="sm">
              <Settings className="w-4 h-4 mr-2" />
              Admin
            </Button>
          </Link>
        </div>
      </div>

      {/* Chat Panel */}
      <div className="w-full md:w-96 flex-shrink-0 border-r border-border pt-12 flex flex-col">
        <div className="flex-1">
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
          />
        </div>
        
        {/* Crowd Density Overlay */}
        <div className="border-t border-border p-4">
          <CrowdDensityOverlay
            center={mapCenter}
            onToggleOverlay={(show) => {
              if (!show) {
                setDensityZones([])
              }
            }}
            onZonesUpdate={setDensityZones}
          />
        </div>
      </div>

      {/* Map Panel */}
      <div className="flex-1 relative">
        {/* Weather Alert Banner */}
        {userLocation && (
          <div className="absolute top-0 left-0 right-0 z-40 pt-12">
            <WeatherAlertBanner lat={userLocation.lat} lng={userLocation.lng} />
          </div>
        )}

        <MapPanel 
          markers={markers} 
          center={mapCenter} 
          userLocation={userLocation || undefined} 
          hurricaneMode={hurricaneMode}
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
