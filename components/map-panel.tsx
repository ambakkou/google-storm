"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { MapPin, Clock, Loader2 } from "lucide-react"
import type { MapMarker } from "@/app/page"
import { Loader } from "@googlemaps/js-api-loader"

interface MapPanelProps {
  markers: MapMarker[]
  center: { lat: number; lng: number }
  userLocation?: { lat: number; lng: number }
}

export function MapPanel({ markers, center, userLocation }: MapPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) return

      try {
        setIsLoading(true)
        setMapError(null)

        const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          throw new Error('Google Maps API key is not configured. Please add NEXT_PUBLIC_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.')
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: 'weekly',
          libraries: ['places']
        })

        const google = await loader.load()
        
        const map = new google.maps.Map(mapRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 13,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        })

        mapInstanceRef.current = map
        setIsLoading(false)
      } catch (error) {
        console.error('Failed to initialize map:', error)
        setMapError('Failed to load map. Please check your API key.')
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing markers
    markersRef.current.forEach(marker => marker.setMap(null))
    markersRef.current = []

    // Add user location marker first
    if (userLocation) {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.lat, lng: userLocation.lng },
        map: mapInstanceRef.current,
        title: "Your Location",
        icon: {
          url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="3"/>
              <circle cx="12" cy="12" r="4" fill="white"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(24, 24),
        },
        zIndex: 1000 // Ensure user location is on top
      })

      const userInfoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-sm">Your Location</h3>
            <p class="text-xs text-gray-600">Current position</p>
          </div>
        `
      })

      userMarker.addListener('click', () => {
        userInfoWindow.open(mapInstanceRef.current, userMarker)
      })

      markersRef.current.push(userMarker)
    }

    // Add resource markers
    markers.forEach((markerData) => {
      const marker = new google.maps.Marker({
        position: { lat: markerData.lat, lng: markerData.lng },
        map: mapInstanceRef.current,
        title: markerData.name,
        icon: {
          url: getMarkerIcon(markerData.type),
          scaledSize: new google.maps.Size(40, 40),
        }
      })

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 min-w-48">
            <h3 class="font-semibold text-sm mb-1">${markerData.name}</h3>
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getTypeColorClass(markerData.type)}">${getTypeLabel(markerData.type)}</span>
            </div>
            ${markerData.address ? `<p class="text-xs text-gray-600 mb-2">${markerData.address}</p>` : ''}
            ${markerData.openNow !== undefined ? `
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full ${markerData.openNow ? 'bg-green-500' : 'bg-red-500'}"></div>
                <span class="text-xs ${markerData.openNow ? 'text-green-600' : 'text-red-600'}">
                  ${markerData.openNow ? 'Open now' : 'Closed'}
                </span>
              </div>
            ` : ''}
          </div>
        `
      })

      marker.addListener('click', () => {
        // Close all other info windows first
        markersRef.current.forEach(m => {
          if (m !== marker) {
            const infoWindow = m.get('infoWindow')
            if (infoWindow) infoWindow.close()
          }
        })
        infoWindow.open(mapInstanceRef.current, marker)
      })

      // Store info window reference on marker
      marker.set('infoWindow', infoWindow)
      markersRef.current.push(marker)
    })

    // Fit map to show all markers including user location
    const bounds = new google.maps.LatLngBounds()
    
    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng })
    }
    
    if (markers.length > 0) {
      markers.forEach(marker => {
        bounds.extend({ lat: marker.lat, lng: marker.lng })
      })
    }
    
    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds)
      // Add some padding
      const listener = google.maps.event.addListener(mapInstanceRef.current, 'idle', () => {
        google.maps.event.removeListener(listener)
        const currentZoom = mapInstanceRef.current?.getZoom() || 13
        if (currentZoom > 15) {
          mapInstanceRef.current?.setZoom(15)
        }
      })
    } else if (center.lat !== 0 && center.lng !== 0) {
      mapInstanceRef.current.setCenter({ lat: center.lat, lng: center.lng })
    }
  }, [markers, center, userLocation])

  const getMarkerIcon = (type: MapMarker["type"]) => {
    const colors = {
      shelter: '#dc2626', // red
      food_bank: '#2563eb', // blue
      clinic: '#16a34a', // green
    }
    
    const icons = {
      shelter: '🏠',
      food_bank: '🍽️',
      clinic: '🏥'
    }
    
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
      <svg width="40" height="40" viewBox="0 0 40 40" xmlns="http://www.w3.org/2000/svg">
        <circle cx="20" cy="20" r="16" fill="${colors[type]}" stroke="white" stroke-width="3"/>
        <text x="20" y="26" text-anchor="middle" fill="white" font-size="16" font-weight="bold">
          ${icons[type]}
        </text>
      </svg>
    `)}`
  }

  const getTypeColor = (type: MapMarker["type"]) => {
    switch (type) {
      case "shelter":
        return "bg-destructive text-destructive-foreground"
      case "food_bank":
        return "bg-primary text-primary-foreground"
      case "clinic":
        return "bg-accent text-accent-foreground"
      default:
        return "bg-secondary text-secondary-foreground"
    }
  }

  const getTypeLabel = (type: MapMarker["type"]) => {
    switch (type) {
      case "shelter":
        return "Shelter"
      case "food_bank":
        return "Food Bank"
      case "clinic":
        return "Clinic"
      default:
        return "Resource"
    }
  }

  const getTypeColorClass = (type: MapMarker["type"]) => {
    switch (type) {
      case "shelter":
        return "bg-red-100 text-red-800"
      case "food_bank":
        return "bg-blue-100 text-blue-800"
      case "clinic":
        return "bg-green-100 text-green-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (mapError) {
    return (
      <div className="h-full relative bg-muted">
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground max-w-md mx-auto p-6">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-destructive mb-2">Map Unavailable</p>
            <p className="text-sm mb-4">{mapError}</p>
            <div className="text-xs bg-muted p-3 rounded border">
              <p className="font-medium mb-2">To fix this:</p>
              <ol className="text-left space-y-1">
                <li>1. Get a Google Maps API key from Google Cloud Console</li>
                <li>2. Add it to your .env.local file as NEXT_PUBLIC_GOOGLE_MAPS_API_KEY</li>
                <li>3. Restart your development server</li>
              </ol>
            </div>
          </div>
        </div>
        
        {/* Show resource cards even when map fails */}
        {markers.length > 0 && (
          <div className="absolute top-4 left-4 right-4 space-y-2 max-h-64 overflow-y-auto">
            {markers.map((marker) => (
              <Card key={marker.id} className="p-4 bg-card/95 backdrop-blur-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <h3 className="font-semibold text-card-foreground mb-1">{marker.name}</h3>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge className={getTypeColor(marker.type)}>{getTypeLabel(marker.type)}</Badge>
                    </div>
                    {marker.address && (
                      <div className="flex items-center gap-1 mb-1">
                        <MapPin className="w-4 h-4" />
                        <span className="text-sm text-muted-foreground">{marker.address}</span>
                      </div>
                    )}
                    {marker.openNow !== undefined && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span className={`text-sm ${marker.openNow ? "text-primary" : "text-muted-foreground"}`}>
                          {marker.openNow ? "Open now" : "Closed"}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="h-full relative bg-muted">
      {/* Google Maps Container */}
      <div
        ref={mapRef}
        className="w-full h-full"
      />
      
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Resource Summary Panel */}
      {markers.length > 0 && (
        <div className="absolute top-16 left-4 max-w-sm">
          <Card className="p-4 bg-card/95 backdrop-blur-sm border shadow-lg">
            <div className="mb-3">
              <h3 className="font-semibold text-card-foreground mb-1">Found {markers.length} Resource{markers.length !== 1 ? 's' : ''}</h3>
              <p className="text-xs text-muted-foreground">Click markers for details</p>
            </div>
            
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {markers.slice(0, 3).map((marker) => (
                <div key={marker.id} className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer" onClick={() => {
                  // Find and click the corresponding marker
                  const markerElement = markersRef.current.find(m => m.getTitle() === marker.name)
                  if (markerElement) {
                    google.maps.event.trigger(markerElement, 'click')
                  }
                }}>
                  <div className={`w-3 h-3 rounded-full ${marker.type === 'shelter' ? 'bg-red-500' : marker.type === 'food_bank' ? 'bg-blue-500' : 'bg-green-500'}`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{marker.name}</p>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(marker.type)}</p>
                  </div>
                  {marker.openNow !== undefined && (
                    <div className={`w-2 h-2 rounded-full ${marker.openNow ? 'bg-green-500' : 'bg-red-500'}`} title={marker.openNow ? 'Open now' : 'Closed'}></div>
                  )}
                </div>
              ))}
              
              {markers.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{markers.length - 3} more resource{markers.length - 3 !== 1 ? 's' : ''}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
