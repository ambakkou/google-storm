# Hurricane Data APIs Setup Guide

This guide shows you how to implement live hurricane movement data using multiple reliable APIs.

## 🚀 **Recommended APIs (In Order of Preference)**

### 1. **AccuWeather Tropical API** (Best Free Option)
- **Cost**: Free tier available (50 calls/day)
- **Update Frequency**: Multiple times daily
- **Coverage**: Worldwide tropical cyclones
- **Data Quality**: High - includes forecasts, historical tracks, pressure data

#### Setup Steps:
1. Go to [AccuWeather Developer Portal](https://developer.accuweather.com/)
2. Create a free account
3. Create a new app to get your API key
4. Add to your `.env.local`:
   ```env
   ACCUWEATHER_API_KEY=your_api_key_here
   ```

#### API Endpoints:
- **Active Storms**: `http://dataservice.accuweather.com/tropical/v1/current?apikey={API_KEY}`
- **Storm Details**: `http://dataservice.accuweather.com/tropical/v1/current/{STORM_ID}?apikey={API_KEY}`

### 2. **NOAA/NHC Direct Feeds** (Free - Official Government Data)
- **Cost**: Completely free
- **Update Frequency**: Every 6 hours during active storms
- **Coverage**: Atlantic and Eastern Pacific
- **Data Quality**: Official government data, very reliable

#### Available Feeds:
- **KML Active Storms**: `https://www.nhc.noaa.gov/gis/kml/activeStorms.kml`
- **KML Forecast Tracks**: `https://www.nhc.noaa.gov/gis/kml/forecastTrack.kml`
- **RSS Feed**: `https://www.nhc.noaa.gov/index-at.xml`

### 3. **NASA Storm Services** (Free)
- **Cost**: Free
- **Update Frequency**: Regular updates
- **Coverage**: Atlantic, Eastern, Central Pacific
- **Data Quality**: Good for research applications

#### API Endpoint:
- **Storm Data**: `https://storm.ghrc.nsstc.nasa.gov/stormservices/storm?format=xml&stormtype=tropical`

### 4. **Commercial APIs** (Paid - Higher Quality)

#### Xweather Hurricane API
- **Cost**: Paid service
- **Features**: Real-time data, error cones, coastal alerts
- **Website**: https://www.xweather.com/

#### PredictHQ Hurricane API
- **Cost**: Paid service
- **Features**: Impact assessment, operational planning
- **Website**: https://www.predicthq.com/

## 🔧 **Implementation Features**

The implemented system includes:

### **Multi-Source Fallback**
- Tries APIs in order of reliability
- Falls back to next source if one fails
- Always returns data (mock data as last resort)

### **Smart Caching**
- 10-minute cache to reduce API calls
- Respects API rate limits
- Improves performance

### **Florida-Focused Filtering**
- Automatically filters hurricanes within 500 miles of Florida
- Reduces noise from distant storms
- Focuses on relevant threats

### **Data Normalization**
- Converts all data sources to consistent format
- Handles different coordinate systems
- Standardizes wind speed units (mph)

## 📊 **Data Structure**

```typescript
interface HurricaneTrack {
  id: string
  name: string
  currentPosition: {
    lat: number
    lng: number
    timestamp: string
    windSpeed: number
    pressure?: number
    category: number
  }
  historicalPositions: HurricanePosition[]
  forecastPositions: HurricanePosition[]
  status: 'active' | 'dissipated' | 'post-tropical'
  basin: 'ATL' | 'EPAC' | 'CPAC' | 'WPAC' | 'IO' | 'SH'
}
```

## 🗺️ **Map Integration**

The hurricane data automatically integrates with your Google Map:

### **Hurricane Markers**
- Color-coded by category (1-5)
- Hurricane emoji (🌀) for easy identification
- Click for detailed information

### **Forecast Paths**
- Dotted lines showing 5-day forecasts
- Color-coded by intensity
- Updates automatically

### **Historical Tracks**
- Solid lines showing past movement
- Helps visualize storm progression

## 🚨 **Real-Time Updates**

- **AccuWeather**: Multiple times daily
- **NOAA**: Every 6 hours during active storms
- **NASA**: Regular updates
- **Your App**: Refreshes every 5 minutes when hurricane mode is active

## 💡 **Usage Tips**

1. **Start with AccuWeather** - Best free option with comprehensive data
2. **Add NOAA as backup** - Free official government data
3. **Monitor API limits** - AccuWeather free tier has daily limits
4. **Cache aggressively** - Hurricane data doesn't change minute-by-minute
5. **Filter by location** - Focus on storms affecting your area

## 🔍 **Testing Your Implementation**

1. Enable hurricane mode in your app
2. Check browser network tab for API calls
3. Verify hurricane markers appear on map
4. Test with mock data (disable all API keys temporarily)

## 📈 **Scaling Considerations**

- **Production**: Consider upgrading to paid APIs for higher limits
- **Caching**: Implement Redis for distributed caching
- **Monitoring**: Add API health checks and alerting
- **Backup**: Always have multiple data sources configured

## 🛠️ **Troubleshooting**

### Common Issues:
1. **No hurricanes showing**: Check if hurricane season is active
2. **API errors**: Verify API keys and rate limits
3. **Outdated data**: Check cache duration settings
4. **Wrong location**: Verify Florida filtering logic

### Debug Mode:
Add this to your `.env.local` for debugging:
```env
HURRICANE_DEBUG=true
```

This will log all API calls and responses to help diagnose issues.
