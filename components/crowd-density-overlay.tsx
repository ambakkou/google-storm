"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Eye, EyeOff, AlertTriangle, CheckCircle } from "lucide-react"

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

interface CrowdDensityOverlayProps {
  center: { lat: number; lng: number }
  onToggleOverlay: (show: boolean) => void
  onZonesUpdate: (zones: DensityZone[]) => void
}

export function CrowdDensityOverlay({ center, onToggleOverlay, onZonesUpdate }: CrowdDensityOverlayProps) {
  const [zones, setZones] = useState<DensityZone[]>([])
  const [showOverlay, setShowOverlay] = useState(false)
  const [loading, setLoading] = useState(false)
  const [lastFetch, setLastFetch] = useState<Date | null>(null)

  const fetchDensityData = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/population-density?lat=${center.lat}&lng=${center.lng}&radius=25000`
      )
      
      if (response.ok) {
        const data = await response.json()
        setZones(data.zones)
        onZonesUpdate(data.zones)
        setLastFetch(new Date())
      } else {
        console.error('Failed to fetch density data')
      }
    } catch (error) {
      console.error('Error fetching density data:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (showOverlay) {
      fetchDensityData()
    }
  }, [center, showOverlay])

  const toggleOverlay = () => {
    const newState = !showOverlay
    setShowOverlay(newState)
    onToggleOverlay(newState)
    
    if (!newState) {
      onZonesUpdate([]) // Clear zones when hiding overlay
    }
  }

  const getRiskIcon = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
      case 'very_high':
        return <AlertTriangle className="w-4 h-4 text-red-500" />
      case 'medium':
        return <Users className="w-4 h-4 text-yellow-500" />
      case 'low':
      case 'very_low':
        return <CheckCircle className="w-4 h-4 text-green-500" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getRiskBadgeColor = (riskLevel: string) => {
    switch (riskLevel) {
      case 'high':
      case 'very_high':
        return "bg-red-500 text-white"
      case 'medium':
        return "bg-yellow-500 text-black"
      case 'low':
      case 'very_low':
        return "bg-green-500 text-white"
      default:
        return "bg-gray-500 text-white"
    }
  }

  const getDensityLabel = (density: string) => {
    switch (density) {
      case 'very_high': return 'Very High Density'
      case 'high': return 'High Density'
      case 'medium': return 'Medium Density'
      case 'low': return 'Low Density'
      default: return 'Unknown Density'
    }
  }

  const sortedZones = zones.sort((a, b) => b.crowdingScore - a.crowdingScore)

  return (
    <div className="space-y-4">
      {/* Toggle Button */}
      <Button 
        onClick={toggleOverlay}
        variant={showOverlay ? "default" : "outline"}
        className="w-full"
        disabled={loading}
      >
        {showOverlay ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
        {loading ? "Loading..." : showOverlay ? "Hide Crowd Density" : "Show Crowd Density"}
      </Button>

      {/* Density Zones List */}
      {showOverlay && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="w-5 h-5" />
              Population Density Zones
            </CardTitle>
            <CardDescription>
              Areas to avoid (red) or seek (green) based on crowd density
              {lastFetch && (
                <span className="block text-xs mt-1">
                  Updated: {lastFetch.toLocaleTimeString()}
                </span>
              )}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sortedZones.map((zone) => (
                <div 
                  key={zone.id} 
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-3">
                    {getRiskIcon(zone.riskLevel)}
                    <div>
                      <div className="font-medium text-sm">{zone.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {zone.description}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {Math.round(zone.distance / 1000)}km away • {zone.population.toLocaleString()} people
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right space-y-1">
                    <Badge className={getRiskBadgeColor(zone.riskLevel)}>
                      {zone.riskLevel.replace('_', ' ')}
                    </Badge>
                    <div className="text-xs text-muted-foreground">
                      {getDensityLabel(zone.density)}
                    </div>
                    <div className="text-xs font-medium">
                      Crowd Score: {zone.crowdingScore}/100
                    </div>
                  </div>
                </div>
              ))}
              
              {zones.length === 0 && !loading && (
                <div className="text-center text-muted-foreground py-4">
                  No density data available for this area
                </div>
              )}
            </div>
            
            {/* Legend */}
            <div className="mt-4 pt-4 border-t">
              <div className="text-sm font-medium mb-2">Legend:</div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-red-500 rounded"></div>
                  <span>Avoid - High Crowds</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded"></div>
                  <span>Caution - Moderate</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded"></div>
                  <span>Safe - Low Crowds</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={fetchDensityData}
                    className="h-6 px-2"
                  >
                    Refresh
                  </Button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
