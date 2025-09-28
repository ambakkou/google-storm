"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Users, CheckCircle, EyeOff } from "lucide-react"

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

interface CrowdDensityPanelProps {
  zones: DensityZone[]
  showPanel: boolean
  onClose: () => void
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

export function CrowdDensityPanel({ zones, showPanel, onClose }: CrowdDensityPanelProps) {
  if (!showPanel || zones.length === 0) {
    return null
  }

  const sortedZones = zones.sort((a, b) => b.crowdingScore - a.crowdingScore)

  return (
    <div className="w-full md:w-96 flex-shrink-0 border-r border-border pt-12 flex flex-col bg-card">
      {/* Header */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold text-foreground">Population Density</h1>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-6 w-6 text-muted-foreground hover:text-foreground"
          >
            <EyeOff className="h-4 w-4" />
          </Button>
        </div>
        
        <div className="text-sm text-muted-foreground">
          Areas to avoid (red) or seek (green) based on crowd density
        </div>
      </div>

      {/* Density Zones List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {sortedZones.map((zone) => (
          <Card key={zone.id} className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {getRiskIcon(zone.riskLevel)}
                <div className="flex-1">
                  <div className="font-medium text-sm mb-1">{zone.name}</div>
                  <div className="text-xs text-muted-foreground mb-2">
                    {zone.distance.toFixed(1)}km away • {zone.population.toLocaleString()} people
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {zone.description}
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
          </Card>
        ))}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="text-xs text-muted-foreground text-center">
          Updated: {new Date().toLocaleTimeString()}
        </div>
      </div>
    </div>
  )
}
