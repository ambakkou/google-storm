// Weather notification testing utilities
// These functions are available globally when the app is running

declare global {
  interface Window {
    testWeatherNotifications: () => Promise<void>
    testWeatherAPI: (lat: number, lng: number) => Promise<any>
    simulateWeatherCondition: (type: string, severity: string) => void
  }
}

export const weatherTestUtils = {
  /**
   * Test weather notifications with different locations
   */
  async testWeatherNotifications() {
    console.log("🧪 Testing Weather Notifications...")
    
    const locations = [
      { name: "Miami, FL", lat: 25.774, lng: -80.193 },
      { name: "Houston, TX", lat: 29.7604, lng: -95.3698 },
      { name: "New Orleans, LA", lat: 29.9511, lng: -90.0715 },
      { name: "Jacksonville, FL", lat: 30.3322, lng: -81.6557 }
    ]
    
    for (const location of locations) {
      console.log(`\n📍 Testing ${location.name}...`)
      try {
        const response = await fetch(
          `/api/weather/enhanced-analysis?lat=${location.lat}&lng=${location.lng}`
        )
        
        if (response.ok) {
          const data = await response.json()
          console.log(`   Hurricane Risk Zone: ${data.isHurricaneRiskZone}`)
          console.log(`   Has Weather Condition: ${data.hasWeatherCondition}`)
          
          if (data.condition) {
            console.log(`   Type: ${data.condition.type}`)
            console.log(`   Severity: ${data.condition.severity}`)
            console.log(`   Probability: ${data.condition.probability}%`)
            console.log(`   Safety Advice: ${data.condition.safetyAdvice.length} recommendations`)
          }
          
          if (data.recommendation) {
            console.log(`   Action: ${data.recommendation.action}`)
            console.log(`   Urgency: ${data.recommendation.urgency}`)
          }
        } else {
          console.log(`   ❌ API Error: ${response.status}`)
        }
      } catch (error) {
        console.log(`   ❌ Error: ${error.message}`)
      }
    }
    
    console.log("\n✅ Weather notification tests completed!")
    console.log("\n💡 Tips:")
    console.log("- Visit /test-notifications for visual testing")
    console.log("- Check the notification component on the main page")
    console.log("- Look for weather alerts in the top center of the screen")
  },

  /**
   * Test weather API for specific coordinates
   */
  async testWeatherAPI(lat: number, lng: number) {
    console.log(`🧪 Testing Weather API for ${lat}, ${lng}...`)
    
    try {
      const response = await fetch(`/api/weather/enhanced-analysis?lat=${lat}&lng=${lng}`)
      
      if (response.ok) {
        const data = await response.json()
        console.log("📊 API Response:", data)
        return data
      } else {
        console.log(`❌ API Error: ${response.status}`)
        return null
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`)
      return null
    }
  },

  /**
   * Simulate a weather condition (for testing purposes)
   */
  simulateWeatherCondition(type: string, severity: string) {
    console.log(`🌦️ Simulating ${severity} ${type} condition...`)
    
    // This would trigger a notification in a real implementation
    const event = new CustomEvent('weatherConditionChange', {
      detail: {
        type,
        severity,
        probability: severity === 'extreme' ? 100 : severity === 'severe' ? 85 : 70,
        timeToStart: 'Now',
        duration: '2-4 hours',
        intensity: severity === 'extreme' ? 'Extreme' : severity === 'severe' ? 'High' : 'Medium',
        safetyAdvice: this.getSafetyAdvice(type, severity)
      }
    })
    
    window.dispatchEvent(event)
    console.log("✅ Weather condition simulation dispatched")
  },

  /**
   * Get safety advice for different weather conditions
   */
  getSafetyAdvice(type: string, severity: string): string[] {
    const advice: string[] = []
    
    switch (type) {
      case 'hurricane':
        advice.push(
          "🚨 EVACUATE if ordered by local authorities",
          "📦 Prepare emergency kit with food, water, medications",
          "🏠 Secure outdoor furniture and objects",
          "📱 Keep phones charged and have backup power"
        )
        break
      case 'storm':
        advice.push(
          "🏠 Stay indoors and avoid windows",
          "⚡ Avoid electrical equipment and plumbing",
          "🚗 Do not drive through flooded areas",
          "📱 Keep emergency contacts handy"
        )
        break
      case 'rain':
        advice.push(
          "🌂 Carry umbrella or rain gear",
          "🚗 Drive carefully on wet roads",
          "👟 Wear appropriate footwear",
          "📱 Check weather updates regularly"
        )
        break
    }

    if (severity === 'severe' || severity === 'extreme') {
      advice.unshift("🚨 TAKE IMMEDIATE ACTION - Severe weather conditions detected")
    }

    return advice
  }
}

// Make functions available globally
if (typeof window !== 'undefined') {
  window.testWeatherNotifications = weatherTestUtils.testWeatherNotifications
  window.testWeatherAPI = weatherTestUtils.testWeatherAPI
  window.simulateWeatherCondition = weatherTestUtils.simulateWeatherCondition
}
