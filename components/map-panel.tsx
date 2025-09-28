"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MapPin, Clock, Loader2, X } from "lucide-react"
import type { MapMarker } from "@/app/page"
import { Loader } from "@googlemaps/js-api-loader"
import type { HurricaneTrack } from "@/lib/hurricane-service"

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google
  }
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

interface MapPanelProps {
  markers: MapMarker[]
  center: { lat: number; lng: number }
  userLocation?: { lat: number; lng: number }
  hurricaneMode?: boolean
  emergencyMode?: boolean
  densityZones?: DensityZone[]
  showResultsPanel?: boolean
  onCloseResultsPanel?: () => void
}

export function MapPanel({
  markers,
  center,
  userLocation,
  hurricaneMode = false,
  emergencyMode = false,
  densityZones = [],
  showResultsPanel = true,
  onCloseResultsPanel,
}: MapPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const hurricaneMarkersRef = useRef<google.maps.Marker[]>([])
  const hurricanePathsRef = useRef<google.maps.Polyline[]>([])
  const densityCirclesRef = useRef<google.maps.Circle[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [hurricaneData, setHurricaneData] = useState<HurricaneTrack[]>([])
  const [hurricaneLoading, setHurricaneLoading] = useState(false)

  // Fetch hurricane data
  const fetchHurricaneData = async () => {
    try {
      setHurricaneLoading(true)
      const response = await fetch("/api/hurricanes")
      const data = await response.json()
      setHurricaneData(data.hurricanes || [])
    } catch (error) {
      console.error("Failed to fetch hurricane data:", error)
    } finally {
      setHurricaneLoading(false)
    }
  }

  // Create realistic cyclone icon with swirling storm bands
  const createAnimatedHurricaneIcon = (hurricane: HurricaneTrack) => {
    const category = hurricane.currentPosition.category || 0
    const windSpeed = hurricane.currentPosition.windSpeed
    const color = getHurricaneColor(category)
    const lat = hurricane.currentPosition.lat

    // Determine size based on category and wind speed
    const baseSize = 80
    const categoryMultiplier = Math.max(1, category)
    const windMultiplier = Math.min(1.5, windSpeed / 100)
    const size = Math.max(60, Math.min(140, baseSize + categoryMultiplier * 15 + windMultiplier * 20))

    // Determine rotation direction based on hemisphere
    const isNorthernHemisphere = lat > 0
    const rotationDirection = isNorthernHemisphere ? 1 : -1

    const svg = `
      <svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <!-- Hurricane gradient -->
          <radialGradient id="hurricaneGradient${hurricane.id}" cx="50%" cy="50%" r="60%">
            <stop offset="0%" style="stop-color:white;stop-opacity:0.9" />
            <stop offset="30%" style="stop-color:${color};stop-opacity:0.8" />
            <stop offset="70%" style="stop-color:${color};stop-opacity:0.6" />
            <stop offset="100%" style="stop-color:${color};stop-opacity:0.4" />
          </radialGradient>
          
          <!-- Enhanced glow effect -->
          <filter id="hurricaneGlow${hurricane.id}" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
            <feMerge> 
              <feMergeNode in="coloredBlur"/>
              <feMergeNode in="SourceGraphic"/>
            </feMerge>
          </filter>
          
          <!-- Drop shadow -->
          <filter id="dropShadow${hurricane.id}" x="-50%" y="-50%" width="200%" height="200%">
            <feDropShadow dx="1" dy="1" stdDeviation="2" floodColor="rgba(0,0,0,0.3)"/>
          </filter>
          
          <!-- Pulsing animation -->
          <animate id="pulse${hurricane.id}" attributeName="r" values="${size/2 - 8};${size/2 - 3};${size/2 - 8}" dur="3s" repeatCount="indefinite"/>
        </defs>
        
        <!-- Outer atmospheric ring with pulsing -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 2}" 
                fill="none" stroke="${color}" stroke-width="1" opacity="0.3">
          <animate attributeName="opacity" values="0.3;0.7;0.3" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Wind particles -->
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 ${size / 2} ${size / 2}"
            to="${360 * rotationDirection} ${size / 2} ${size / 2}"
            dur="4s"
            repeatCount="indefinite"/>
          <circle cx="${size / 2 + 30}" cy="${size / 2}" r="1" fill="white" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="${size / 2 - 25}" cy="${size / 2 + 20}" r="0.8" fill="white" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="${size / 2 + 20}" cy="${size / 2 - 25}" r="0.6" fill="white" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.2;0.7" dur="1.2s" repeatCount="indefinite"/>
          </circle>
        </g>
        
        <!-- Outer spiral band -->
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 ${size / 2} ${size / 2}"
            to="${360 * rotationDirection} ${size / 2} ${size / 2}"
            dur="8s"
            repeatCount="indefinite"/>
          <path d="M ${size / 2} ${size / 2 - 35} 
                   A 30 30 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 + 35} ${size / 2}
                   A 25 25 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 + 30}
                   A 20 20 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 - 30} ${size / 2}
                   A 25 25 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 - 35}" 
                fill="none" stroke="${color}" stroke-width="3" opacity="0.7">
            <animate attributeName="stroke-width" values="3;4;3" dur="2.5s" repeatCount="indefinite"/>
          </path>
        </g>
        
        <!-- Middle spiral band -->
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 ${size / 2} ${size / 2}"
            to="${360 * rotationDirection} ${size / 2} ${size / 2}"
            dur="6s"
            repeatCount="indefinite"/>
          <path d="M ${size / 2} ${size / 2 - 25} 
                   A 20 20 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 + 25} ${size / 2}
                   A 18 18 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 + 22}
                   A 15 15 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 - 22} ${size / 2}
                   A 18 18 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 - 25}" 
                fill="none" stroke="${color}" stroke-width="2.5" opacity="0.8">
            <animate attributeName="stroke-width" values="2.5;3.5;2.5" dur="2s" repeatCount="indefinite"/>
          </path>
        </g>
        
        <!-- Inner spiral band -->
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 ${size / 2} ${size / 2}"
            to="${360 * rotationDirection} ${size / 2} ${size / 2}"
            dur="4s"
            repeatCount="indefinite"/>
          <path d="M ${size / 2} ${size / 2 - 15} 
                   A 12 12 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 + 15} ${size / 2}
                   A 10 10 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 + 12}
                   A 8 8 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 - 12} ${size / 2}
                   A 10 10 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 - 15}" 
                fill="none" stroke="${color}" stroke-width="2" opacity="0.9">
            <animate attributeName="stroke-width" values="2;3;2" dur="1.5s" repeatCount="indefinite"/>
          </path>
        </g>
        
        <!-- Main hurricane body with pulsing -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 8}" 
                fill="url(#hurricaneGradient${hurricane.id})" opacity="0.7" filter="url(#hurricaneGlow${hurricane.id})">
          <animate attributeName="r" values="${size/2 - 8};${size/2 - 3};${size/2 - 8}" dur="3s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Eye wall with breathing effect -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 18}" 
                fill="none" stroke="white" stroke-width="2" opacity="0.9" filter="url(#dropShadow${hurricane.id})">
          <animate attributeName="r" values="${size/2 - 18};${size/2 - 15};${size/2 - 18}" dur="2.5s" repeatCount="indefinite"/>
          <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Eye of the hurricane with pulsing -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 22}" 
                fill="white" opacity="0.95">
          <animate attributeName="r" values="${size/2 - 22};${size/2 - 20};${size/2 - 22}" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 25}" 
                fill="${color}" opacity="0.3">
          <animate attributeName="r" values="${size/2 - 25};${size/2 - 23};${size/2 - 25}" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Rain drops around the hurricane -->
        <g>
          <animateTransform
            attributeName="transform"
            attributeType="XML"
            type="rotate"
            from="0 ${size / 2} ${size / 2}"
            to="${360 * rotationDirection} ${size / 2} ${size / 2}"
            dur="5s"
            repeatCount="indefinite"/>
          <line x1="${size / 2 + 28}" y1="${size / 2 - 5}" x2="${size / 2 + 28}" y2="${size / 2 + 2}" 
                stroke="lightblue" stroke-width="1" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite"/>
          </line>
          <line x1="${size / 2 - 30}" y1="${size / 2 + 8}" x2="${size / 2 - 30}" y2="${size / 2 + 15}" 
                stroke="lightblue" stroke-width="1" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite"/>
          </line>
          <line x1="${size / 2 + 15}" y1="${size / 2 - 30}" x2="${size / 2 + 15}" y2="${size / 2 - 23}" 
                stroke="lightblue" stroke-width="1" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.8s" repeatCount="indefinite"/>
          </line>
        </g>
      </svg>
    `

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new google.maps.Size(size, size),
      anchor: new google.maps.Point(size / 2, size / 2),
    }
  }

  // Fetch hurricane data when hurricane mode is enabled
  useEffect(() => {
    if (hurricaneMode) {
      fetchHurricaneData()
      // Refresh hurricane data every 2 minutes to match API cache
      const interval = setInterval(fetchHurricaneData, 2 * 60 * 1000)
      return () => clearInterval(interval)
    } else {
      // Clear hurricane data when mode is disabled
      setHurricaneData([])

      // Return to user location when hurricane mode is disabled
      if (mapInstanceRef.current && userLocation) {
        mapInstanceRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng })
        mapInstanceRef.current.setZoom(13) // Reset to default zoom
      }
    }
  }, [hurricaneMode, userLocation])

  useEffect(() => {
    const initializeMap = async () => {
      if (!mapRef.current) return

      try {
        setIsLoading(true)
        setMapError(null)

        const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
        if (!apiKey) {
          throw new Error(
            "Google Maps API key is not configured. Please add NEXT_PUBLIC_MAPS_API_KEY or NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to your environment variables.",
          )
        }

        const loader = new Loader({
          apiKey: apiKey,
          version: "weekly",
          libraries: ["places"],
        })

        const google = await loader.load()

        const map = new google.maps.Map(mapRef.current, {
          center: { lat: center.lat, lng: center.lng },
          zoom: 13,
          mapTypeId: google.maps.MapTypeId.ROADMAP,
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        })

        mapInstanceRef.current = map
        setIsLoading(false)
      } catch (error) {
        console.error("Failed to initialize map:", error)
        setMapError("Failed to load map. Please check your API key.")
        setIsLoading(false)
      }
    }

    initializeMap()
  }, [])

  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.setMap(null))
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
              <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" strokeWidth="3"/>
              <circle cx="12" cy="12" r="4" fill="white"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(24, 24),
        },
        zIndex: 1000, // Ensure user location is on top
      })

      const userInfoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-2">
            <h3 class="font-semibold text-sm">Your Location</h3>
            <p class="text-xs text-gray-600">Current position</p>
          </div>
        `,
      })

      userMarker.addListener("click", () => {
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
        },
      })

      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 min-w-48">
            <h3 class="font-semibold text-sm mb-1">${markerData.name}</h3>
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getTypeColorClass(markerData.type)}">${getTypeLabel(markerData.type)}</span>
            </div>
            ${markerData.address ? `<p class="text-xs text-gray-600 mb-2">${markerData.address}</p>` : ""}
            ${
              markerData.openNow !== undefined
                ? `
              <div class="flex items-center gap-1">
                <div class="w-2 h-2 rounded-full ${markerData.openNow ? "bg-green-500" : "bg-red-500"}"></div>
                <span class="text-xs ${markerData.openNow ? "text-green-600" : "text-red-600"}">
                  ${markerData.openNow ? "Open now" : "Closed"}
                </span>
              </div>
            `
                : ""
            }
          </div>
        `,
      })

      marker.addListener("click", () => {
        // Close all other info windows first
        markersRef.current.forEach((m) => {
          if (m !== marker) {
            const infoWindow = m.get("infoWindow")
            if (infoWindow) infoWindow.close()
          }
        })
        infoWindow.open(mapInstanceRef.current, marker)
      })

      // Store info window reference on marker
      marker.set("infoWindow", infoWindow)
      markersRef.current.push(marker)
    })

    // Fit map to show all markers including user location
    const bounds = new google.maps.LatLngBounds()

    if (userLocation) {
      bounds.extend({ lat: userLocation.lat, lng: userLocation.lng })
    }

    if (markers.length > 0) {
      markers.forEach((marker) => {
        bounds.extend({ lat: marker.lat, lng: marker.lng })
      })
    }

    if (!bounds.isEmpty()) {
      mapInstanceRef.current.fitBounds(bounds)
      // Add some padding
      const listener = google.maps.event.addListener(mapInstanceRef.current, "idle", () => {
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

  // Handle center changes (for density zone selection)
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Only update center if it's different from current map center
    const currentCenter = mapInstanceRef.current.getCenter()
    if (currentCenter &&
        (Math.abs(currentCenter.lat() - center.lat) > 0.001 ||
         Math.abs(currentCenter.lng() - center.lng) > 0.001)) {
      mapInstanceRef.current.panTo({ lat: center.lat, lng: center.lng })
      mapInstanceRef.current.setZoom(13) // Set higher zoom for better density zone visibility
    }
  }, [center])

  // Handle density zones
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Clear existing density circles
    densityCirclesRef.current.forEach((circle) => circle.setMap(null))
    densityCirclesRef.current = []

    // Add new density circles
    densityZones.forEach((zone) => {
      const circle = new google.maps.Circle({
        strokeColor: zone.color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: zone.color,
        fillOpacity: zone.opacity,
        map: mapInstanceRef.current,
        center: { lat: zone.lat, lng: zone.lng },
        radius: zone.radius,
        clickable: true,
      })

      // Add info window for density zone
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 min-w-48">
            <h3 class="font-semibold text-sm mb-2">${zone.name}</h3>
            <div class="space-y-1 text-xs">
              <div class="flex justify-between">
                <span>Population:</span>
                <span class="font-medium">${zone.population.toLocaleString()}</span>
              </div>
              <div class="flex justify-between">
                <span>Density:</span>
                <span class="font-medium">${zone.density.replace("_", " ")}</span>
              </div>
              <div class="flex justify-between">
                <span>Risk Level:</span>
                <span class="font-medium text-${zone.riskLevel === "high" ? "red" : zone.riskLevel === "medium" ? "yellow" : "green"}-600">
                  ${zone.riskLevel.replace("_", " ")}
                </span>
              </div>
              <div class="flex justify-between">
                <span>Crowd Score:</span>
                <span class="font-medium">${zone.crowdingScore}/100</span>
              </div>
              <div class="mt-2 text-gray-600">
                ${zone.description}
              </div>
            </div>
          </div>
        `,
      })

      circle.addListener("click", () => {
        infoWindow.setPosition({ lat: zone.lat, lng: zone.lng })
        infoWindow.open(mapInstanceRef.current)
      })

      densityCirclesRef.current.push(circle)
    })
  }, [densityZones])

  // Handle hurricane markers and paths
  useEffect(() => {
    if (!mapInstanceRef.current) return

    // Always clear existing hurricane markers first
    hurricaneMarkersRef.current.forEach((marker) => marker.setMap(null))
    hurricaneMarkersRef.current = []
    hurricanePathsRef.current.forEach((path) => path.setMap(null))
    hurricanePathsRef.current = []

    // Only add hurricane markers if hurricane mode is enabled AND we have data
    if (!hurricaneMode || hurricaneData.length === 0) {
      return
    }

    // Add hurricane markers and paths
    hurricaneData.forEach((hurricane) => {
      // Create animated hurricane icon
      const hurricaneIcon = createAnimatedHurricaneIcon(hurricane)

      // Add current position marker
      const marker = new google.maps.Marker({
        position: {
          lat: hurricane.currentPosition.lat,
          lng: hurricane.currentPosition.lng,
        },
        map: mapInstanceRef.current,
        title: `${hurricane.name} - ${hurricane.currentPosition.windSpeed} mph`,
        icon: hurricaneIcon,
        zIndex: 2000, // Higher than resource markers
      })

      // Add info window for hurricane
      const infoWindow = new google.maps.InfoWindow({
        content: `
          <div class="p-3 min-w-48">
            <h3 class="font-semibold text-sm mb-1">${hurricane.name}</h3>
            <div class="flex items-center gap-2 mb-2">
              <span class="inline-flex items-center px-2 py-1 rounded text-xs font-medium ${getHurricaneCategoryClass(hurricane.currentPosition.category || 0)}">
                ${getHurricaneCategoryLabel(hurricane.currentPosition.category || 0)}
              </span>
            </div>
            <p class="text-xs text-gray-600 mb-1">Wind Speed: ${hurricane.currentPosition.windSpeed} mph</p>
            ${hurricane.currentPosition.pressure ? `<p class="text-xs text-gray-600 mb-1">Pressure: ${hurricane.currentPosition.pressure} mb</p>` : ""}
            <p class="text-xs text-gray-600">Status: ${hurricane.status}</p>
          </div>
        `,
      })

      marker.addListener("click", () => {
        // Close all other info windows first
        hurricaneMarkersRef.current.forEach((m) => {
          if (m !== marker) {
            const infoWindow = m.get("infoWindow")
            if (infoWindow) infoWindow.close()
          }
        })
        infoWindow.open(mapInstanceRef.current, marker)
      })

      marker.set("infoWindow", infoWindow)
      hurricaneMarkersRef.current.push(marker)

      // Add wind radius circle
      const windRadius = hurricane.currentPosition.windSpeed * 1000
      const category = hurricane.currentPosition.category || 0
      const color = getHurricaneColor(category)

      if (windRadius > 0) {
        const windCircle = new google.maps.Circle({
          center: { lat: hurricane.currentPosition.lat, lng: hurricane.currentPosition.lng },
          radius: windRadius,
          strokeColor: color,
          strokeOpacity: 0.5,
          strokeWeight: 2,
          fillColor: color,
          fillOpacity: 0.1,
          map: mapInstanceRef.current,
        })

        densityCirclesRef.current.push(windCircle)
      }

      // Add animated forecast path with moving dashes
      if (hurricane.forecastPositions.length > 0) {
        const pathCoordinates = [
          { lat: hurricane.currentPosition.lat, lng: hurricane.currentPosition.lng },
          ...hurricane.forecastPositions.map((pos) => ({ lat: pos.lat, lng: pos.lng })),
        ]

        // Calculate movement direction for animation
        const currentPos = hurricane.currentPosition
        const nextPos = hurricane.forecastPositions[0]
        const movementDirection = nextPos
          ? (Math.atan2(nextPos.lng - currentPos.lng, nextPos.lat - currentPos.lat) * 180) / Math.PI
          : 0

        const path = new google.maps.Polyline({
          path: pathCoordinates,
          geodesic: true,
          strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
          strokeOpacity: 0.7,
          strokeWeight: 3,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
                strokeOpacity: 1,
                strokeWeight: 2,
              },
              offset: "0%",
              repeat: "20px",
            },
            // Moving arrow at the end
            {
              icon: {
                path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
                strokeOpacity: 1,
                strokeWeight: 2,
                fillColor: getHurricaneColor(hurricane.currentPosition.category || 0),
                fillOpacity: 0.8,
                scale: 3,
              },
              offset: "100%",
            },
          ],
          map: mapInstanceRef.current,
        })

        hurricanePathsRef.current.push(path)
      }

      // Add historical path (solid line)
      if (hurricane.historicalPositions.length > 0) {
        const historicalPath = [
          ...hurricane.historicalPositions.map((pos) => ({ lat: pos.lat, lng: pos.lng })),
          { lat: hurricane.currentPosition.lat, lng: hurricane.currentPosition.lng },
        ]

        const historicalLine = new google.maps.Polyline({
          path: historicalPath,
          geodesic: true,
          strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
          strokeOpacity: 0.4,
          strokeWeight: 2,
          icons: [
            {
              icon: {
                path: "M 0,-1 0,1",
                strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
                strokeOpacity: 0.4,
                strokeWeight: 1,
              },
              offset: "0%",
              repeat: "15px",
            },
          ],
          map: mapInstanceRef.current,
        })

        hurricanePathsRef.current.push(historicalLine)
      }
    })

    // Adjust map bounds to include hurricanes if in hurricane mode
    if (hurricaneData.length > 0) {
      const bounds = new google.maps.LatLngBounds()

      // Add user location if available
      if (userLocation) {
        bounds.extend({ lat: userLocation.lat, lng: userLocation.lng })
      }

      // Add hurricane positions
      hurricaneData.forEach((hurricane) => {
        bounds.extend({ lat: hurricane.currentPosition.lat, lng: hurricane.currentPosition.lng })
        hurricane.forecastPositions.forEach((pos) => {
          bounds.extend({ lat: pos.lat, lng: pos.lng })
        })
      })

      if (!bounds.isEmpty()) {
        mapInstanceRef.current.fitBounds(bounds)
      }
    }
  }, [hurricaneData, hurricaneMode, userLocation])

  const getMarkerIcon = (type: MapMarker["type"]) => {
    const colors = {
      shelter: '#dc2626', // red
      food_bank: '#2563eb', // blue
      clinic: '#16a34a', // green
      police: '#111827', // dark gray / black
      fire: '#f97316', // orange
    }

    const icons = {
      shelter: '🏠',
      food_bank: '🍽️',
      clinic: '🏥',
      police: '🚓',
      fire: '🚒'
    }

    // Create canvas for better emoji centering
    const canvas = document.createElement('canvas')
    const size = 40
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')!

    // Draw circle background
    ctx.fillStyle = colors[type]
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, 16, 0, 2 * Math.PI)
    ctx.fill()

    // Draw white border
    ctx.strokeStyle = 'white'
    ctx.lineWidth = 3
    ctx.stroke()

    // Draw emoji - centered
    ctx.font = '16px system-ui, -apple-system, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'white'
    ctx.fillText(icons[type], size / 2, size / 2)

    return canvas.toDataURL()
  }

  const getTypeColor = (type: MapMarker["type"]) => {
    switch (type) {
      case "shelter":
        return "bg-destructive text-destructive-foreground"
      case "food_bank":
        return "bg-primary text-primary-foreground"
      case "clinic":
        return "bg-accent text-accent-foreground"
      case "police":
        return "bg-black text-white"
      case "fire":
        return "bg-orange-500 text-white"
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
      case "police":
        return "Police Station"
      case "fire":
        return "Fire Station"
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
      case "police":
        return "bg-gray-800 text-white"
      case "fire":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const getHurricaneColor = (category: number): string => {
    switch (category) {
      case 5:
        return "#8B0000" // Dark red
      case 4:
        return "#FF0000" // Red
      case 3:
        return "#FF8C00" // Orange
      case 2:
        return "#FFD700" // Gold
      case 1:
        return "#FFFF00" // Yellow
      default:
        return "#00FF00" // Green (tropical storm)
    }
  }

  const getHurricaneCategoryLabel = (category: number): string => {
    switch (category) {
      case 5:
        return "Category 5"
      case 4:
        return "Category 4"
      case 3:
        return "Category 3"
      case 2:
        return "Category 2"
      case 1:
        return "Category 1"
      default:
        return "Tropical Storm"
    }
  }

  const getHurricaneCategoryClass = (category: number): string => {
    switch (category) {
      case 5:
        return "bg-red-900 text-white"
      case 4:
        return "bg-red-800 text-white"
      case 3:
        return "bg-orange-600 text-white"
      case 2:
        return "bg-yellow-500 text-black"
      case 1:
        return "bg-yellow-300 text-black"
      default:
        return "bg-green-500 text-white"
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
    <div className={`h-full relative bg-muted transition-all duration-300 ${emergencyMode ? 'border-4 border-red-500 shadow-lg shadow-red-500/20' : ''}`}>
      {/* Google Maps Container */}
      <div ref={mapRef} className="w-full h-full" />

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {/* Emergency Mode Banner */}
      {emergencyMode && (
        <div className="absolute top-16 right-4 max-w-sm z-20">
          <Card className="p-4 bg-red-50/95 backdrop-blur-sm border-red-200 shadow-lg">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse"></div>
              <h3 className="font-semibold text-red-900 flex items-center gap-2">
                🚨 Emergency Mode Active
              </h3>
            </div>
            <p className="text-xs text-red-700 mt-1">
              Showing emergency shelters and services
            </p>
          </Card>
        </div>
      )}

      {/* Hurricane Info Panel */}
      {hurricaneMode && hurricaneData.length > 0 && (
        <div className="absolute top-16 left-4 max-w-sm z-20">
          <Card className="p-4 bg-orange-50/95 backdrop-blur-sm border-orange-200 shadow-lg">
            <div className="mb-3">
              <h3 className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
                🌀 Active Hurricanes ({hurricaneData.length})
              </h3>
              <p className="text-xs text-orange-700">Click to center map on hurricane</p>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {hurricaneData.map((hurricane) => (
                <div
                  key={hurricane.id}
                  className="group flex items-center gap-2 p-2 rounded bg-orange-100/50 hover:bg-orange-100/70 hover:shadow-md hover:scale-[1.02] transition-all duration-200 cursor-pointer"
                  onClick={() => {
                    if (mapInstanceRef.current) {
                      const position = {
                        lat: hurricane.currentPosition.lat,
                        lng: hurricane.currentPosition.lng
                      }
                      mapInstanceRef.current.panTo(position)
                      mapInstanceRef.current.setZoom(8) // Moderate zoom to show hurricane location
                    }
                  }}
                >
                  <div
                    className={`w-3 h-3 rounded-full transition-all duration-200 group-hover:scale-125 group-hover:shadow-sm`}
                    style={{ backgroundColor: getHurricaneColor(hurricane.currentPosition.category || 0) }}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-orange-900 truncate group-hover:text-orange-800 transition-colors">{hurricane.name}</p>
                    <p className="text-xs text-orange-700 group-hover:text-orange-600 transition-colors">
                      {getHurricaneCategoryLabel(hurricane.currentPosition.category || 0)} -{" "}
                      {hurricane.currentPosition.windSpeed} mph
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Resource Summary Panel */}
      {!hurricaneMode && markers.length > 0 && showResultsPanel && (
        <div className="absolute top-16 left-4 max-w-sm">
          <Card className="p-4 bg-card/95 backdrop-blur-sm border shadow-lg">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-card-foreground mb-1">
                  Found {markers.length} Resource{markers.length !== 1 ? "s" : ""}
                </h3>
                <p className="text-xs text-muted-foreground">Click markers for details</p>
              </div>
              {onCloseResultsPanel && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={onCloseResultsPanel}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {markers.slice(0, 3).map((marker) => (
                <div
                  key={marker.id}
                  className="flex items-center gap-2 p-2 rounded bg-muted/50 hover:bg-muted/70 transition-colors cursor-pointer"
                  onClick={() => {
                    // Find and click the corresponding marker
                    const markerElement = markersRef.current.find((m) => m.getTitle() === marker.name)
                    if (markerElement) {
                      google.maps.event.trigger(markerElement, "click")
                    }
                  }}
                >
                  <div
                    className={`w-3 h-3 rounded-full ${marker.type === "shelter" ? "bg-red-500" : marker.type === "food_bank" ? "bg-blue-500" : "bg-green-500"}`}
                  ></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-card-foreground truncate">{marker.name}</p>
                    <p className="text-xs text-muted-foreground">{getTypeLabel(marker.type)}</p>
                  </div>
                  {marker.openNow !== undefined && (
                    <div
                      className={`w-2 h-2 rounded-full ${marker.openNow ? "bg-green-500" : "bg-red-500"}`}
                      title={marker.openNow ? "Open now" : "Closed"}
                    ></div>
                  )}
                </div>
              ))}

              {markers.length > 3 && (
                <p className="text-xs text-muted-foreground text-center pt-2">
                  +{markers.length - 3} more resource{markers.length - 3 !== 1 ? "s" : ""}
                </p>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
