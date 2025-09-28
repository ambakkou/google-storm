// Test script for weather notifications
// Run with: node scripts/test-weather-notifications.js

const testConditions = [
  {
    name: "Clear Skies",
    lat: 25.774,
    lng: -80.193,
    expected: "No notification should appear"
  },
  {
    name: "Light Rain",
    lat: 25.774,
    lng: -80.193,
    expected: "Minor rain alert with umbrella advice"
  },
  {
    name: "Severe Thunderstorm",
    lat: 25.774,
    lng: -80.193,
    expected: "Severe storm alert with shelter-in-place advice"
  },
  {
    name: "Hurricane Conditions",
    lat: 25.774,
    lng: -80.193,
    expected: "Extreme hurricane alert with evacuation advice"
  },
  {
    name: "Flood Warning",
    lat: 25.774,
    lng: -80.193,
    expected: "Severe flood alert with safety recommendations"
  }
]

async function testWeatherAPI() {
  console.log("🧪 Testing Weather Notification API...\n")
  
  for (const condition of testConditions) {
    console.log(`📍 Testing: ${condition.name}`)
    console.log(`   Location: ${condition.lat}, ${condition.lng}`)
    console.log(`   Expected: ${condition.expected}`)
    
    try {
      const response = await fetch(
        `http://localhost:3000/api/weather/enhanced-analysis?lat=${condition.lat}&lng=${condition.lng}`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   ✅ API Response:`)
        console.log(`      Has Condition: ${data.hasWeatherCondition}`)
        if (data.condition) {
          console.log(`      Type: ${data.condition.type}`)
          console.log(`      Severity: ${data.condition.severity}`)
          console.log(`      Probability: ${data.condition.probability}%`)
        }
        if (data.recommendation) {
          console.log(`      Action: ${data.recommendation.action}`)
          console.log(`      Urgency: ${data.recommendation.urgency}`)
        }
      } else {
        console.log(`   ❌ API Error: ${response.status}`)
      }
    } catch (error) {
      console.log(`   ❌ Network Error: ${error.message}`)
    }
    
    console.log("")
  }
}

// Test different locations
async function testDifferentLocations() {
  console.log("🌍 Testing Different Locations...\n")
  
  const locations = [
    { name: "Miami, FL", lat: 25.774, lng: -80.193 },
    { name: "Houston, TX", lat: 29.7604, lng: -95.3698 },
    { name: "New Orleans, LA", lat: 29.9511, lng: -90.0715 },
    { name: "Jacksonville, FL", lat: 30.3322, lng: -81.6557 }
  ]
  
  for (const location of locations) {
    console.log(`📍 ${location.name}`)
    
    try {
      const response = await fetch(
        `http://localhost:3000/api/weather/enhanced-analysis?lat=${location.lat}&lng=${location.lng}`
      )
      
      if (response.ok) {
        const data = await response.json()
        console.log(`   Hurricane Risk Zone: ${data.isHurricaneRiskZone}`)
        console.log(`   Has Weather Condition: ${data.hasWeatherCondition}`)
        if (data.condition) {
          console.log(`   Current Condition: ${data.condition.type} (${data.condition.severity})`)
        }
      }
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`)
    }
    
    console.log("")
  }
}

// Run tests
async function runTests() {
  console.log("🚀 Starting Weather Notification Tests\n")
  console.log("=" * 50)
  
  await testWeatherAPI()
  await testDifferentLocations()
  
  console.log("✅ Tests completed!")
  console.log("\n📝 Manual Testing Steps:")
  console.log("1. Start your Next.js app: npm run dev")
  console.log("2. Visit: http://localhost:3000/test-notifications")
  console.log("3. Click different weather condition buttons")
  console.log("4. Observe notification behavior")
  console.log("5. Test dismiss functionality")
  console.log("6. Test expandable safety advice")
}

runTests().catch(console.error)
