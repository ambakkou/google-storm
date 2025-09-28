"use client"

import { useEffect, useRef, useState } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MapPin, Loader2, RotateCcw, Zap, X } from "lucide-react"
import type { MapMarker } from "@/app/page"
import { Loader } from "@googlemaps/js-api-loader"
import { LiveHurricaneService, type LiveHurricaneTrack, type HurricaneMovementData } from "@/lib/live-hurricane-service"

// Declare global google maps types
declare global {
  interface Window {
    google: typeof google
  }
}

interface LiveMapPanelProps {
  markers: MapMarker[]
  center: { lat: number; lng: number }
  userLocation?: { lat: number; lng: number }
  hurricaneMode?: boolean
  showResultsPanel?: boolean
  onCloseResultsPanel?: () => void
}

interface AnimatedMarker {
  marker: google.maps.Marker
  hurricane: LiveHurricaneTrack
  trail: google.maps.Polyline
  windCircle: google.maps.Circle
}

export function LiveMapPanel({
  markers,
  center,
  userLocation,
  hurricaneMode = false,
  showResultsPanel = true,
  onCloseResultsPanel,
}: LiveMapPanelProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstanceRef = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.Marker[]>([])
  const hurricaneMarkersRef = useRef<Map<string, AnimatedMarker>>(new Map())
  const liveServiceRef = useRef<LiveHurricaneService | null>(null)

  const [isLoading, setIsLoading] = useState(true)
  const [mapError, setMapError] = useState<string | null>(null)
  const [hurricaneData, setHurricaneData] = useState<LiveHurricaneTrack[]>([])
  const [hurricaneLoading, setHurricaneLoading] = useState(false)
  const [isLiveTracking, setIsLiveTracking] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<string>("")
  const [nextUpdate, setNextUpdate] = useState<string>("")

  // Initialize live hurricane service
  useEffect(() => {
    if (hurricaneMode && !liveServiceRef.current) {
      liveServiceRef.current = LiveHurricaneService.getInstance()
    }
  }, [hurricaneMode])

  // Handle live hurricane tracking
  useEffect(() => {
    if (!hurricaneMode || !liveServiceRef.current) {
      // Stop tracking and clear data
      if (liveServiceRef.current && isLiveTracking) {
        liveServiceRef.current.stopLiveTracking()
        setIsLiveTracking(false)
      }
      setHurricaneData([])
      
      // Return to user location when hurricane mode is disabled
      if (!hurricaneMode && mapInstanceRef.current && userLocation) {
        mapInstanceRef.current.panTo({ lat: userLocation.lat, lng: userLocation.lng })
        mapInstanceRef.current.setZoom(13) // Reset to default zoom
      }
      return
    }

    const service = liveServiceRef.current

    // Subscribe to live updates
    const unsubscribe = service.subscribe((data: HurricaneMovementData) => {
      setHurricaneData(data.hurricanes)
      setLastUpdate(data.lastUpdated)
      setNextUpdate(data.nextUpdate)
      setHurricaneLoading(false)
    })

    // Start live tracking
    const startTracking = async () => {
      try {
        setHurricaneLoading(true)
        await service.startLiveTracking()
        setIsLiveTracking(true)
      } catch (error) {
        console.error("Failed to start live hurricane tracking:", error)
        setHurricaneLoading(false)
      }
    }

    startTracking()

    return () => {
      unsubscribe()
      if (service && isLiveTracking) {
        service.stopLiveTracking()
        setIsLiveTracking(false)
      }
    }
  }, [hurricaneMode, userLocation])

  // Initialize Google Maps
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

  // Update regular markers (shelters, etc.)
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
              <circle cx="12" cy="12" r="10" fill="#4285F4" stroke="white" stroke-width="3"/>
              <circle cx="12" cy="12" r="4" fill="white"/>
            </svg>
          `)}`,
          scaledSize: new google.maps.Size(24, 24),
        },
        zIndex: 1000,
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
        infoWindow.open(mapInstanceRef.current, marker)
      })

      markersRef.current.push(marker)
    })
  }, [markers, userLocation])

  // Update hurricane markers with smooth animations
  useEffect(() => {
    if (!mapInstanceRef.current || !hurricaneMode) {
      // Clear hurricane markers when mode is disabled
      hurricaneMarkersRef.current.forEach(({ marker, trail, windCircle }) => {
        marker.setMap(null)
        trail.setMap(null)
        windCircle.setMap(null)
      })
      hurricaneMarkersRef.current.clear()
      return
    }

    // Update existing hurricanes or create new ones
    hurricaneData.forEach((hurricane) => {
      const existingMarkerData = hurricaneMarkersRef.current.get(hurricane.id)

      if (existingMarkerData) {
        // Update existing marker with smooth animation
        updateHurricaneMarker(existingMarkerData, hurricane)
      } else {
        // Create new hurricane marker
        createHurricaneMarker(hurricane)
      }
    })

    // Remove hurricanes that are no longer active
    const activeIds = new Set(hurricaneData.map((h) => h.id))
    for (const [id, markerData] of hurricaneMarkersRef.current) {
      if (!activeIds.has(id)) {
        markerData.marker.setMap(null)
        markerData.trail.setMap(null)
        markerData.windCircle.setMap(null)
        hurricaneMarkersRef.current.delete(id)
      }
    }

    // Adjust map bounds if needed
    if (hurricaneData.length > 0) {
      adjustMapBounds()
    }
  }, [hurricaneData, hurricaneMode])

  const createHurricaneMarker = (hurricane: LiveHurricaneTrack) => {
    if (!mapInstanceRef.current) return

    const position = {
      lat: hurricane.currentPosition.lat,
      lng: hurricane.currentPosition.lng,
    }

    // Create animated hurricane icon
    const marker = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      title: `${hurricane.name} - ${hurricane.currentPosition.windSpeed} mph`,
      icon: {
        url: createAnimatedHurricaneIcon(hurricane),
        scaledSize: new google.maps.Size(50, 50),
        anchor: new google.maps.Point(25, 25),
      },
      zIndex: 2000,
    })

    // Create wind radius circle
    const windCircle = new google.maps.Circle({
      center: position,
      radius: hurricane.currentPosition.windSpeed * 1000, // Convert to meters (approximate)
      strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
      strokeOpacity: 0.3,
      strokeWeight: 2,
      fillColor: getHurricaneColor(hurricane.currentPosition.category || 0),
      fillOpacity: 0.1,
      map: mapInstanceRef.current,
    })

    // Create trail path
    const trailPath = [
      ...hurricane.historicalPositions.slice(-10).map((pos) => ({ lat: pos.lat, lng: pos.lng })),
      position,
    ]

    const trail = new google.maps.Polyline({
      path: trailPath,
      geodesic: true,
      strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
      strokeOpacity: 0.6,
      strokeWeight: 3,
      icons: [
        {
          icon: {
            path: "M 0,-1 0,1",
            strokeColor: getHurricaneColor(hurricane.currentPosition.category || 0),
            strokeOpacity: 0.6,
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

    // Add info window
    const infoWindow = new google.maps.InfoWindow({
      content: createHurricaneInfoContent(hurricane),
    })

    marker.addListener("click", () => {
      // Close other hurricane info windows
      hurricaneMarkersRef.current.forEach(({ marker: m }) => {
        const iw = m.get("infoWindow")
        if (iw && m !== marker) iw.close()
      })
      infoWindow.open(mapInstanceRef.current, marker)
    })

    marker.set("infoWindow", infoWindow)

    // Store marker data
    hurricaneMarkersRef.current.set(hurricane.id, {
      marker,
      hurricane,
      trail,
      windCircle,
    })

    console.log(`🌀 Created marker for ${hurricane.name}`)
  }

  const updateHurricaneMarker = (markerData: AnimatedMarker, hurricane: LiveHurricaneTrack) => {
    const { marker, trail, windCircle } = markerData

    // Update position with smooth animation if the hurricane is moving
    const newPosition = {
      lat: hurricane.currentPosition.lat,
      lng: hurricane.currentPosition.lng,
    }

    // Update marker position
    marker.setPosition(newPosition)

    // Update wind circle
    windCircle.setCenter(newPosition)
    windCircle.setRadius(hurricane.currentPosition.windSpeed * 1000)

    // Update trail
    const trailPath = [
      ...hurricane.historicalPositions.slice(-10).map((pos) => ({ lat: pos.lat, lng: pos.lng })),
      newPosition,
    ]
    trail.setPath(trailPath)

    // Update icon with movement indicators
    marker.setIcon({
      url: createAnimatedHurricaneIcon(hurricane),
      scaledSize: new google.maps.Size(50, 50),
      anchor: new google.maps.Point(25, 25),
    })

    // Update info window content
    const infoWindow = marker.get("infoWindow")
    if (infoWindow) {
      infoWindow.setContent(createHurricaneInfoContent(hurricane))
    }

    // Update stored hurricane data
    markerData.hurricane = hurricane
  }

  const createAnimatedHurricaneIcon = (hurricane: LiveHurricaneTrack): string => {
    const category = hurricane.currentPosition.category || 0
    const windSpeed = hurricane.currentPosition.windSpeed
    const color = getHurricaneColor(category)
    const lat = hurricane.currentPosition.lat
    const isMoving = hurricane.isMoving
    const direction = hurricane.currentPosition.direction || 0
    const speed = hurricane.currentPosition.speed || 0

    // Determine size based on category and wind speed
    const baseSize = 70
    const categoryMultiplier = Math.max(1, category)
    const windMultiplier = Math.min(1.5, windSpeed / 100)
    const size = Math.max(50, Math.min(120, baseSize + categoryMultiplier * 12 + windMultiplier * 15))

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
          <circle cx="${size / 2 + 25}" cy="${size / 2}" r="1" fill="white" opacity="0.8">
            <animate attributeName="opacity" values="0.8;0.2;0.8" dur="1.5s" repeatCount="indefinite"/>
          </circle>
          <circle cx="${size / 2 - 20}" cy="${size / 2 + 18}" r="0.8" fill="white" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.1;0.6" dur="1.8s" repeatCount="indefinite"/>
          </circle>
          <circle cx="${size / 2 + 18}" cy="${size / 2 - 20}" r="0.6" fill="white" opacity="0.7">
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
          <path d="M ${size / 2} ${size / 2 - 30} 
                   A 25 25 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 + 30} ${size / 2}
                   A 20 20 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 + 25}
                   A 15 15 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 - 25} ${size / 2}
                   A 20 20 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 - 30}" 
                fill="none" stroke="${color}" stroke-width="2.5" opacity="0.7">
            <animate attributeName="stroke-width" values="2.5;3.5;2.5" dur="2.5s" repeatCount="indefinite"/>
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
          <path d="M ${size / 2} ${size / 2 - 20} 
                   A 18 18 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 + 20} ${size / 2}
                   A 15 15 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 + 18}
                   A 12 12 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 - 18} ${size / 2}
                   A 15 15 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 - 20}" 
                fill="none" stroke="${color}" stroke-width="2" opacity="0.8">
            <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite"/>
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
          <path d="M ${size / 2} ${size / 2 - 12} 
                   A 10 10 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 + 12} ${size / 2}
                   A 8 8 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 + 10}
                   A 6 6 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2 - 10} ${size / 2}
                   A 8 8 0 0 ${rotationDirection > 0 ? 1 : 0} ${size / 2} ${size / 2 - 12}" 
                fill="none" stroke="${color}" stroke-width="1.5" opacity="0.9">
            <animate attributeName="stroke-width" values="1.5;2.5;1.5" dur="1.5s" repeatCount="indefinite"/>
          </path>
        </g>
        
        <!-- Main hurricane body with pulsing -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 6}" 
                fill="url(#hurricaneGradient${hurricane.id})" opacity="0.7" filter="url(#hurricaneGlow${hurricane.id})">
          <animate attributeName="r" values="${size/2 - 6};${size/2 - 2};${size/2 - 6}" dur="3s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Eye wall with breathing effect -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 15}" 
                fill="none" stroke="white" stroke-width="2" opacity="0.9" filter="url(#dropShadow${hurricane.id})">
          <animate attributeName="r" values="${size/2 - 15};${size/2 - 12};${size/2 - 15}" dur="2.5s" repeatCount="indefinite"/>
          <animate attributeName="stroke-width" values="2;3;2" dur="2s" repeatCount="indefinite"/>
        </circle>
        
        <!-- Eye of the hurricane with pulsing -->
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 18}" 
                fill="white" opacity="0.95">
          <animate attributeName="r" values="${size/2 - 18};${size/2 - 16};${size/2 - 18}" dur="2s" repeatCount="indefinite"/>
        </circle>
        <circle cx="${size / 2}" cy="${size / 2}" r="${size / 2 - 20}" 
                fill="${color}" opacity="0.3">
          <animate attributeName="r" values="${size/2 - 20};${size/2 - 18};${size/2 - 20}" dur="2s" repeatCount="indefinite"/>
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
          <line x1="${size / 2 + 25}" y1="${size / 2 - 4}" x2="${size / 2 + 25}" y2="${size / 2 + 2}" 
                stroke="lightblue" stroke-width="1" opacity="0.6">
            <animate attributeName="opacity" values="0.6;0.2;0.6" dur="1s" repeatCount="indefinite"/>
          </line>
          <line x1="${size / 2 - 25}" y1="${size / 2 + 6}" x2="${size / 2 - 25}" y2="${size / 2 + 12}" 
                stroke="lightblue" stroke-width="1" opacity="0.5">
            <animate attributeName="opacity" values="0.5;0.1;0.5" dur="1.2s" repeatCount="indefinite"/>
          </line>
          <line x1="${size / 2 + 12}" y1="${size / 2 - 25}" x2="${size / 2 + 12}" y2="${size / 2 - 19}" 
                stroke="lightblue" stroke-width="1" opacity="0.7">
            <animate attributeName="opacity" values="0.7;0.3;0.7" dur="0.8s" repeatCount="indefinite"/>
          </line>
        </g>
        
        <!-- Movement arrow (if moving) with pulsing -->
        ${
          isMoving
            ? `
        <g transform="rotate(${direction} ${size / 2} ${size / 2})">
          <path d="M ${size / 2} ${size / 2 - 15} L ${size / 2 + 3} ${size / 2 - 10} L ${size / 2} ${size / 2 - 12} L ${size / 2 - 3} ${size / 2 - 10} Z" 
                fill="red" opacity="0.9" stroke="white" stroke-width="0.5">
            <animate attributeName="opacity" values="0.9;0.5;0.9" dur="1.5s" repeatCount="indefinite"/>
          </path>
        </g>
        `
            : ""
        }
      </svg>
    `

    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`
  }

  const createHurricaneInfoContent = (hurricane: LiveHurricaneTrack): string => {
    const pos = hurricane.currentPosition
    const isMoving = hurricane.isMoving
    const interpolated = pos.interpolated

    return `
      <div class="p-3 min-w-64">
        <div class="flex items-center gap-2 mb-2">
          <h3 class="font-semibold text-lg">${hurricane.name}</h3>
          ${isMoving ? '<span class="text-red-500">🔴 MOVING</span>' : '<span class="text-gray-500">⚪ STATIONARY</span>'}
        </div>
        
        <div class="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p class="text-xs text-gray-600">Category</p>
            <span class="inline-flex items-center px-2 py-1 rounded text-sm font-medium ${getHurricaneCategoryClass(pos.category || 0)}">
              ${getHurricaneCategoryLabel(pos.category || 0)}
            </span>
          </div>
          <div>
            <p class="text-xs text-gray-600">Status</p>
            <p class="text-sm font-medium">${hurricane.status.toUpperCase()}</p>
          </div>
        </div>
        
        <div class="space-y-2 mb-3">
          <div class="flex justify-between">
            <span class="text-xs text-gray-600">Wind Speed:</span>
            <span class="text-sm font-medium">${pos.windSpeed} mph</span>
          </div>
          ${
            pos.pressure
              ? `
          <div class="flex justify-between">
            <span class="text-xs text-gray-600">Pressure:</span>
            <span class="text-sm font-medium">${pos.pressure} mb</span>
          </div>
          `
              : ""
          }
          ${
            pos.direction !== undefined
              ? `
          <div class="flex justify-between">
            <span class="text-xs text-gray-600">Direction:</span>
            <span class="text-sm font-medium">${Math.round(pos.direction)}° (${getDirectionName(pos.direction)})</span>
          </div>
          `
              : ""
          }
          ${
            pos.speed !== undefined
              ? `
          <div class="flex justify-between">
            <span class="text-xs text-gray-600">Movement Speed:</span>
            <span class="text-sm font-medium">${Math.round(pos.speed)} mph</span>
          </div>
          `
              : ""
          }
        </div>
        
        <div class="text-xs text-gray-500 border-t pt-2">
          <p>Position: ${pos.lat.toFixed(3)}°N, ${Math.abs(pos.lng).toFixed(3)}°W</p>
          <p>Last Update: ${new Date(hurricane.lastUpdate).toLocaleTimeString()}</p>
          ${interpolated ? '<p class="text-orange-600">⚡ Live interpolated position</p>' : '<p class="text-green-600">✓ Official NHC position</p>'}
        </div>
      </div>
    `
  }

  const adjustMapBounds = () => {
    if (!mapInstanceRef.current || hurricaneData.length === 0) return

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

  const handleForceRefresh = async () => {
    if (liveServiceRef.current) {
      setHurricaneLoading(true)
      await liveServiceRef.current.forceRefresh()
    }
  }

  // Helper functions
  const getMarkerIcon = (type: MapMarker["type"]) => {
    const colors = {
      shelter: "#dc2626",
      food_bank: "#2563eb",
      clinic: "#16a34a",
    }

    const icons = {
      shelter: "🏠",
      food_bank: "🍽️",
      clinic: "🏥",
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

  const getHurricaneColor = (category: number): string => {
    switch (category) {
      case 5:
        return "#8B0000"
      case 4:
        return "#FF0000"
      case 3:
        return "#FF8C00"
      case 2:
        return "#FFD700"
      case 1:
        return "#FFFF00"
      default:
        return "#00FF00"
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

  const getDirectionName = (degrees: number): string => {
    const directions = [
      "N",
      "NNE",
      "NE",
      "ENE",
      "E",
      "ESE",
      "SE",
      "SSE",
      "S",
      "SSW",
      "SW",
      "WSW",
      "W",
      "WNW",
      "NW",
      "NNW",
    ]
    const index = Math.round(degrees / 22.5) % 16
    return directions[index]
  }

  if (mapError) {
    return (
      <div className="h-full relative bg-muted">
        <div className="h-full flex items-center justify-center">
          <div className="text-center text-muted-foreground max-w-md mx-auto p-6">
            <MapPin className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium text-destructive mb-2">Map Unavailable</p>
            <p className="text-sm">{mapError}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full relative bg-muted">
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

      {/* Live Hurricane Control Panel */}
      {hurricaneMode && (
        <div className="absolute top-4 right-4 z-20">
          <Card className="p-3 bg-orange-50/95 backdrop-blur-sm border-orange-200 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-orange-600" />
              <span className="text-sm font-semibold text-orange-900">Live Hurricane Tracking</span>
            </div>

            <div className="flex items-center gap-2 mb-2">
              <div className={`w-2 h-2 rounded-full ${isLiveTracking ? "bg-green-500" : "bg-red-500"}`}></div>
              <span className="text-xs text-orange-700">{isLiveTracking ? "Active" : "Inactive"}</span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleForceRefresh}
                disabled={hurricaneLoading || !isLiveTracking}
                className="ml-auto bg-transparent"
              >
                <RotateCcw className="w-3 h-3" />
              </Button>
            </div>

            {lastUpdate && (
              <div className="text-xs text-orange-600">
                <p>Last: {new Date(lastUpdate).toLocaleTimeString()}</p>
                <p>Next: {new Date(nextUpdate).toLocaleTimeString()}</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Hurricane Info Panel */}
      {hurricaneMode && hurricaneData.length > 0 && (
        <div className="absolute top-4 left-4 max-w-sm z-20">
          <Card className="p-4 bg-orange-50/95 backdrop-blur-sm border-orange-200 shadow-lg">
            <div className="mb-3">
              <h3 className="font-semibold text-orange-900 mb-1 flex items-center gap-2">
                🌀 Live Hurricanes ({hurricaneData.length})
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
                  <div className="relative">
                    <div
                      className="w-4 h-4 rounded-full border-2 border-white shadow-sm transition-all duration-200 group-hover:scale-125 group-hover:shadow-md"
                      style={{ backgroundColor: getHurricaneColor(hurricane.currentPosition.category || 0) }}
                    ></div>
                    {hurricane.isMoving && (
                      <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse group-hover:scale-110 transition-transform duration-200"></div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-orange-900 truncate group-hover:text-orange-800 transition-colors">{hurricane.name}</p>
                      {hurricane.currentPosition.interpolated && <Zap className="w-3 h-3 text-orange-600 group-hover:scale-110 transition-transform duration-200" />}
                    </div>
                    <p className="text-xs text-orange-700 group-hover:text-orange-600 transition-colors">
                      {getHurricaneCategoryLabel(hurricane.currentPosition.category || 0)} -{" "}
                      {hurricane.currentPosition.windSpeed} mph
                      {hurricane.isMoving && hurricane.currentPosition.speed && (
                        <span className="ml-1 text-red-600 group-hover:text-red-500 transition-colors">→ {Math.round(hurricane.currentPosition.speed)} mph</span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* Regular resource markers info panel */}
      {!hurricaneMode && markers.length > 0 && showResultsPanel && (
        <div className="absolute top-4 left-4 max-w-sm">
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
