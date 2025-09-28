"use client"

import type React from "react"

import { useState, useEffect, useRef, forwardRef } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader } from "@googlemaps/js-api-loader"

// Google Maps types are now provided by @types/google.maps

interface AddResourceModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (resource: ResourceFormData) => void
}

interface ResourceFormData {
  name: string
  type: "shelter" | "food_bank" | "clinic"
  address: string
  notes: string
  lat?: number
  lng?: number
}

interface AddressInputProps {
  value: string
  onChange: (address: string, coords?: { lat: number; lng: number }) => void
  placeholder?: string
  className?: string
  id?: string
  isOpen?: boolean // Add this to trigger reinitialization when modal opens
}

function AddressInput({ value, onChange, placeholder, className, id, isOpen }: AddressInputProps) {
  const [isInitialized, setIsInitialized] = useState(false)
  const autocompleteInstance = useRef<google.maps.places.Autocomplete | null>(null)

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen && isInitialized) {
      setIsInitialized(false)
      if (autocompleteInstance.current) {
        console.log('Resetting autocomplete for modal close')
        google.maps.event.clearInstanceListeners(autocompleteInstance.current)
        autocompleteInstance.current = null
      }
    }
  }, [isOpen, isInitialized])

  // Simple approach: initialize when the component mounts and modal is open
  useEffect(() => {
    if (!isOpen || isInitialized || autocompleteInstance.current) return

    const initializeAutocomplete = async () => {
      // Wait for the DOM to be ready
      await new Promise(resolve => setTimeout(resolve, 300))
      
      const inputElement = document.getElementById(id || 'address') as HTMLInputElement
      if (!inputElement) {
        console.log('Address input element not found')
        return
      }

      // Check if autocomplete is already attached to this input
      if ((inputElement as any).__autocomplete) {
        console.log('Autocomplete already attached to input, skipping')
        return
      }

      console.log('Found address input element:', inputElement)
      
      const apiKey = process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY
      if (!apiKey) {
        console.warn('Google Maps API key not found')
        return
      }

      try {
        // Check if Google Maps is already loaded
        if (window.google?.maps?.places) {
          console.log('Using existing Google Maps instance')
          
          // Destroy existing autocomplete if it exists
          if (autocompleteInstance.current) {
            console.log('Destroying existing autocomplete instance')
            google.maps.event.clearInstanceListeners(autocompleteInstance.current)
          }
          
          const ac = new window.google.maps.places.Autocomplete(inputElement, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry', 'name', 'place_id']
          })
          
          autocompleteInstance.current = ac
          // Mark input as having autocomplete
          (inputElement as any).__autocomplete = ac

          // Handle place selection
          ac.addListener('place_changed', () => {
            const place = ac.getPlace()
            console.log('Place changed event triggered, place:', place)
            
            if (place?.formatted_address && place.geometry?.location) {
              const address = place.formatted_address
              const coords = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              }
              console.log('Address selected:', { address, coords })
              onChange(address, coords)
            } else {
              console.log('Place selected but missing data:', place)
            }
          })

          console.log('Address autocomplete initialized successfully!')
          setIsInitialized(true)
        } else {
          console.log('Loading Google Maps API...')
          
          // Destroy existing autocomplete if it exists
          if (autocompleteInstance.current) {
            console.log('Destroying existing autocomplete instance')
            google.maps.event.clearInstanceListeners(autocompleteInstance.current)
          }
          
          const loader = new Loader({
            apiKey: apiKey,
            version: 'weekly',
            libraries: ['places']
          })

          const googleMaps = await loader.load()
          const ac = new googleMaps.maps.places.Autocomplete(inputElement, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry', 'name', 'place_id']
          })
          
          autocompleteInstance.current = ac
          // Mark input as having autocomplete
          (inputElement as any).__autocomplete = ac

          // Handle place selection
          ac.addListener('place_changed', () => {
            const place = ac.getPlace()
            console.log('Place changed event triggered, place:', place)
            
            if (place?.formatted_address && place.geometry?.location) {
              const address = place.formatted_address
              const coords = {
                lat: place.geometry.location.lat(),
                lng: place.geometry.location.lng()
              }
              console.log('Address selected:', { address, coords })
              onChange(address, coords)
            } else {
              console.log('Place selected but missing data:', place)
            }
          })

          console.log('Address autocomplete initialized successfully!')
          setIsInitialized(true)
        }
      } catch (error) {
        console.error('Failed to initialize autocomplete:', error)
      }
    }

    initializeAutocomplete()
  }, [isOpen, id, onChange, isInitialized])

  // Cleanup effect
  useEffect(() => {
    return () => {
      if (autocompleteInstance.current) {
        console.log('Cleaning up autocomplete instance')
        google.maps.event.clearInstanceListeners(autocompleteInstance.current)
        autocompleteInstance.current = null
      }
    }
  }, [])

  return (
    <Input
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={className}
      required
    />
  )
}

AddressInput.displayName = 'AddressInput';

export function AddResourceModal({ isOpen, onClose, onSubmit }: AddResourceModalProps) {
  const [formData, setFormData] = useState<ResourceFormData>({
    name: "",
    type: "shelter",
    address: "",
    notes: "",
  })

  const geocodeAddress = async (address: string) => {
    try {
      const response = await fetch(`/api/geocode?address=${encodeURIComponent(address)}`)
      if (response.ok) {
        const { lat, lng } = await response.json()
        return { lat, lng }
      }
    } catch (error) {
      console.error('Geocoding failed:', error)
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    console.log('=== FORM SUBMISSION ===')
    console.log('Form data before geocoding:', formData)
    
    // If we don't have coordinates from autocomplete, try to geocode the address
    let coords = { lat: formData.lat || 0, lng: formData.lng || 0 }
    console.log('Initial coords:', coords)
    
    if (!coords.lat || !coords.lng || (coords.lat === 0 && coords.lng === 0)) {
      console.log('No valid coordinates, attempting geocoding for:', formData.address)
      const geocodedCoords = await geocodeAddress(formData.address)
      console.log('Geocoded result:', geocodedCoords)
      coords = { lat: geocodedCoords?.lat || 0, lng: geocodedCoords?.lng || 0 }
    }
    
    const resourceData = {
      ...formData,
      lat: coords.lat,
      lng: coords.lng
    }
    
    console.log('Final resource data:', resourceData)
    console.log('=== SUBMITTING TO PARENT ===')
    
    onSubmit(resourceData)
    setFormData({ name: "", type: "shelter", address: "", notes: "" })
  }

  const handleInputChange = (field: keyof ResourceFormData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  const handleAddressChange = (address: string, coords?: { lat: number; lng: number }) => {
    console.log('=== HANDLE ADDRESS CHANGE ===')
    console.log('Address received:', address)
    console.log('Coords received:', coords)
    console.log('Current formData.address:', formData.address)
    
    setFormData((prev) => {
      const newData = {
        ...prev,
        address,
        lat: coords?.lat,
        lng: coords?.lng
      }
      console.log('New formData:', newData)
      return newData
    })
    
    console.log('=== ADDRESS CHANGE COMPLETE ===')
  }

  const handleClose = () => {
    setFormData({ name: "", type: "shelter", address: "", notes: "" })
    onClose()
  }

  return (
    <Dialog 
      open={isOpen} 
      onOpenChange={(open) => {
        // Only run close/reset logic when the dialog is actually closing
        if (!open) handleClose()
      }}
    >
      <DialogContent 
        className="sm:max-w-md"
        onInteractOutside={(e) => {
          const el = e.target as HTMLElement
          if (el.closest('.pac-container')) e.preventDefault()
        }}
        onPointerDownOutside={(e) => {
          const el = e.target as HTMLElement
          if (el.closest('.pac-container')) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Emergency Resource</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-sm font-medium">
              Resource Name
            </Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              placeholder="e.g., Downtown Emergency Shelter"
              className="h-12"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type" className="text-sm font-medium">
              Resource Type
            </Label>
            <Select value={formData.type} onValueChange={(value: any) => handleInputChange("type", value)}>
              <SelectTrigger className="h-12">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="shelter">Shelter</SelectItem>
                <SelectItem value="food_bank">Food Bank</SelectItem>
                <SelectItem value="clinic">Clinic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address" className="text-sm font-medium">
              Address
            </Label>
            <AddressInput
              id="address"
              value={formData.address}
              onChange={handleAddressChange}
              placeholder="123 Main St, City, State 12345"
              className="h-12"
              isOpen={isOpen}
            />
            <p className="text-xs text-muted-foreground">
              {process.env.NEXT_PUBLIC_MAPS_API_KEY || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY 
                ? "Start typing to see address suggestions" 
                : "Address autocomplete requires Google Maps API key"}
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">
              Additional Notes
            </Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange("notes", e.target.value)}
              placeholder="Hours, special requirements, contact info..."
              className="min-h-20"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={handleClose} className="flex-1 h-12 bg-transparent">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 h-12">
              Submit Resource
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
