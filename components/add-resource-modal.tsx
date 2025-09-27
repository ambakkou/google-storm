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

// Declare global Google Maps types
declare global {
  interface Window {
    google: any;
  }
}

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
  const autocompleteInstance = useRef<any>(null)

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
          
          const autocomplete = new window.google.maps.places.Autocomplete(inputElement, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry', 'name', 'place_id']
          })
          
          autocompleteInstance.current = autocomplete
          // Mark input as having autocomplete
          (inputElement as any).__autocomplete = autocomplete

          // Handle place selection
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
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

          // Debug and fix pac-container
          const debugPacContainer = () => {
            const pacContainer = document.querySelector('.pac-container')
            console.log('Pac-container found:', !!pacContainer)
            
            if (pacContainer) {
              const container = pacContainer as HTMLElement
              console.log('Pac-container styles:', {
                zIndex: container.style.zIndex,
                position: container.style.position,
                display: container.style.display,
                visibility: container.style.visibility
              })
              
              container.style.zIndex = '9999'
              container.style.position = 'absolute'
              container.style.display = 'block'
              container.style.visibility = 'visible'
              
              // Debug pac-items
              const pacItems = container.querySelectorAll('.pac-item')
              console.log('Found pac-items:', pacItems.length)
              
              pacItems.forEach((item, index) => {
                const htmlItem = item as HTMLElement
                console.log(`Pac-item ${index}:`, {
                  text: htmlItem.textContent,
                  styles: {
                    pointerEvents: htmlItem.style.pointerEvents,
                    cursor: htmlItem.style.cursor,
                    zIndex: htmlItem.style.zIndex
                  }
                })
                
                // Ensure item is clickable
                htmlItem.style.pointerEvents = 'auto'
                htmlItem.style.cursor = 'pointer'
                htmlItem.style.zIndex = '10000'
                
                // Remove any existing listeners to avoid duplicates
                const newItem = htmlItem.cloneNode(true) as HTMLElement
                htmlItem.parentNode?.replaceChild(newItem, htmlItem)
                
                // Add click handler to new element
                newItem.addEventListener('click', (e) => {
                  console.log('=== PAC ITEM CLICKED ===')
                  console.log('Pac-item text:', newItem.textContent)
                  console.log('Pac-item attributes:', newItem.attributes)
                  console.log('Input element:', inputElement)
                  console.log('Input current value:', inputElement.value)
                  
                  e.preventDefault()
                  e.stopPropagation()
                  e.stopImmediatePropagation()
                  
                  // Hide the pac-container to prevent modal from closing
                  const pacContainer = document.querySelector('.pac-container')
                  if (pacContainer) {
                    (pacContainer as HTMLElement).style.display = 'none'
                  }
                  
                  // Simple approach: just set the text directly
                  const addressText = newItem.textContent?.trim() || ''
                  console.log('Setting address text:', addressText)
                  
                  // Method 1: Direct value setting
                  inputElement.value = addressText
                  console.log('Input value after setting:', inputElement.value)
                  
                  // Method 2: Trigger input event
                  const inputEvent = new Event('input', { bubbles: true })
                  inputElement.dispatchEvent(inputEvent)
                  
                  // Method 3: Trigger change event
                  const changeEvent = new Event('change', { bubbles: true })
                  inputElement.dispatchEvent(changeEvent)
                  
                  // Method 4: Call onChange directly
                  console.log('Calling onChange with:', addressText)
                  onChange(addressText)
                  
                  console.log('=== CLICK HANDLER COMPLETE ===')
                })
              })
            }
          }

          // Try to fix immediately and repeatedly
          const fixInterval = setInterval(() => {
            debugPacContainer()
          }, 100)

          // Clean up interval after 10 seconds
          setTimeout(() => clearInterval(fixInterval), 10000)

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

          const google = await loader.load()
          const autocomplete = new google.maps.places.Autocomplete(inputElement, {
            types: ['address'],
            componentRestrictions: { country: 'us' },
            fields: ['formatted_address', 'geometry', 'name', 'place_id']
          })
          
          autocompleteInstance.current = autocomplete
          // Mark input as having autocomplete
          (inputElement as any).__autocomplete = autocomplete

          // Handle place selection
          autocomplete.addListener('place_changed', () => {
            const place = autocomplete.getPlace()
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

          // Debug and fix pac-container
          const debugPacContainer = () => {
            const pacContainer = document.querySelector('.pac-container')
            console.log('Pac-container found:', !!pacContainer)
            
            if (pacContainer) {
              const container = pacContainer as HTMLElement
              console.log('Pac-container styles:', {
                zIndex: container.style.zIndex,
                position: container.style.position,
                display: container.style.display,
                visibility: container.style.visibility
              })
              
              container.style.zIndex = '9999'
              container.style.position = 'absolute'
              container.style.display = 'block'
              container.style.visibility = 'visible'
              
              // Debug pac-items
              const pacItems = container.querySelectorAll('.pac-item')
              console.log('Found pac-items:', pacItems.length)
              
              pacItems.forEach((item, index) => {
                const htmlItem = item as HTMLElement
                console.log(`Pac-item ${index}:`, {
                  text: htmlItem.textContent,
                  styles: {
                    pointerEvents: htmlItem.style.pointerEvents,
                    cursor: htmlItem.style.cursor,
                    zIndex: htmlItem.style.zIndex
                  }
                })
                
                // Ensure item is clickable
                htmlItem.style.pointerEvents = 'auto'
                htmlItem.style.cursor = 'pointer'
                htmlItem.style.zIndex = '10000'
                
                // Remove any existing listeners to avoid duplicates
                const newItem = htmlItem.cloneNode(true) as HTMLElement
                htmlItem.parentNode?.replaceChild(newItem, htmlItem)
                
                // Add click handler to new element
                newItem.addEventListener('click', (e) => {
                  console.log('=== PAC ITEM CLICKED ===')
                  console.log('Pac-item text:', newItem.textContent)
                  console.log('Pac-item attributes:', newItem.attributes)
                  console.log('Input element:', inputElement)
                  console.log('Input current value:', inputElement.value)
                  
                  e.preventDefault()
                  e.stopPropagation()
                  e.stopImmediatePropagation()
                  
                  // Hide the pac-container to prevent modal from closing
                  const pacContainer = document.querySelector('.pac-container')
                  if (pacContainer) {
                    (pacContainer as HTMLElement).style.display = 'none'
                  }
                  
                  // Simple approach: just set the text directly
                  const addressText = newItem.textContent?.trim() || ''
                  console.log('Setting address text:', addressText)
                  
                  // Method 1: Direct value setting
                  inputElement.value = addressText
                  console.log('Input value after setting:', inputElement.value)
                  
                  // Method 2: Trigger input event
                  const inputEvent = new Event('input', { bubbles: true })
                  inputElement.dispatchEvent(inputEvent)
                  
                  // Method 3: Trigger change event
                  const changeEvent = new Event('change', { bubbles: true })
                  inputElement.dispatchEvent(changeEvent)
                  
                  // Method 4: Call onChange directly
                  console.log('Calling onChange with:', addressText)
                  onChange(addressText)
                  
                  console.log('=== CLICK HANDLER COMPLETE ===')
                })
              })
            }
          }

          // Try to fix immediately and repeatedly
          const fixInterval = setInterval(() => {
            debugPacContainer()
          }, 100)

          // Clean up interval after 10 seconds
          setTimeout(() => clearInterval(fixInterval), 10000)

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
    
    // If we don't have coordinates from autocomplete, try to geocode the address
    let coords = { lat: formData.lat || 0, lng: formData.lng || 0 }
    if (!coords.lat && !coords.lng) {
      const geocodedCoords = await geocodeAddress(formData.address)
      coords = { lat: geocodedCoords?.lat || 0, lng: geocodedCoords?.lng || 0 }
    }
    
    const resourceData = {
      ...formData,
      lat: coords.lat,
      lng: coords.lng
    }
    
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
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
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
