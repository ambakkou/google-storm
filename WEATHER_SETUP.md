# Weather Tracking Setup Guide

This guide will help you set up weather tracking and hurricane monitoring for the Google Storm application.

## Features Implemented

### 🌦️ Weather APIs
- **Current Weather**: Real-time weather conditions using OpenWeatherMap API
- **Weather Alerts**: National Weather Service alerts for severe weather
- **5-Day Forecast**: Extended weather predictions with hurricane risk assessment
- **Hurricane Tracking**: Special monitoring during hurricane season (June-November)

### 🔔 Notification System
- **Browser Notifications**: Native browser notifications for urgent weather alerts
- **Toast Notifications**: In-app notifications for weather updates
- **Alert Banner**: Prominent weather alert display on the main interface
- **Configurable Settings**: User-customizable notification preferences

### 🎯 Miami-Specific Features
- **Hurricane Season Monitoring**: Enhanced tracking during peak hurricane season
- **Local Weather Data**: Miami-Dade County specific weather information
- **Emergency Integration**: Weather alerts integrated with emergency mode

## Setup Instructions

### 1. API Keys Configuration

#### OpenWeatherMap API (Recommended)
1. Sign up at [OpenWeatherMap](https://openweathermap.org/api)
2. Get your free API key
3. Add to your environment variables:

```bash
# .env.local
OPENWEATHER_API_KEY=your_api_key_here
```

#### Google Maps Weather API (Alternative)
1. Enable Google Maps Weather API in Google Cloud Console
2. Add your API key:

```bash
# .env.local
GOOGLE_MAPS_API_KEY=your_api_key_here
```

### 2. Environment Variables

Create a `.env.local` file in your project root:

```bash
# Weather APIs
OPENWEATHER_API_KEY=your_openweather_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# Firebase (existing)
FIREBASE_SERVICE_ACCOUNT_KEY=your_firebase_key
```

### 3. Browser Permissions

The application will request notification permissions when users first interact with weather features. Users can:

- **Allow notifications**: Receive browser notifications for urgent weather alerts
- **Deny notifications**: Still receive in-app notifications and alerts
- **Configure settings**: Customize which alerts to receive via the Weather Settings modal

## API Endpoints

### Weather Data Endpoints

- `GET /api/weather/current?lat={lat}&lng={lng}` - Current weather conditions
- `GET /api/weather/alerts?lat={lat}&lng={lng}` - Active weather alerts
- `GET /api/weather/forecast?lat={lat}&lng={lng}` - 5-day weather forecast

### Fallback Data

If API keys are not configured or APIs are unavailable, the system will:
- Use mock data for demonstration purposes
- Show hurricane season indicators during June-November
- Provide realistic weather scenarios for Miami

## Components

### Weather Components
- `WeatherAlertBanner` - Top banner for urgent weather alerts
- `WeatherPanel` - Sidebar weather information with current conditions and forecast
- `WeatherSettingsModal` - User configuration for notification preferences

### Services
- `WeatherService` - Core weather data management
- `WeatherNotificationService` - Notification system with browser integration

## Hurricane Monitoring

### Automatic Detection
- **Season Detection**: Automatically activates hurricane monitoring during June-November
- **Risk Assessment**: Analyzes wind speed and precipitation for hurricane risk indicators
- **Alert Prioritization**: Hurricane alerts are prioritized with severe/extreme severity

### Alert Types
- **Hurricane Watch**: Conditions favorable for hurricane development
- **Hurricane Warning**: Hurricane conditions expected within 24 hours
- **Tropical Storm Alerts**: Tropical storm conditions
- **Severe Weather**: Thunderstorms, floods, tornadoes

## User Experience

### Notification Flow
1. **Background Monitoring**: Continuous weather monitoring every 5 minutes
2. **Alert Detection**: Identifies new or updated weather alerts
3. **User Notification**: Shows browser notifications for urgent alerts
4. **In-App Display**: Displays alerts in banner and weather panel
5. **User Control**: Users can dismiss alerts and configure preferences

### Settings Options
- **Enable/Disable**: Turn notifications on/off
- **Alert Types**: Choose which types of alerts to receive
- **Frequency**: Set notification frequency (immediate, hourly, daily)
- **Test Notifications**: Verify notification setup

## Development Notes

### Mock Data
During development or when APIs are unavailable:
- Hurricane season simulation (June-November)
- Realistic Miami weather patterns
- Sample severe weather alerts
- Emergency scenario testing

### Performance
- **Caching**: Weather data cached for 5 minutes to reduce API calls
- **Background Updates**: Non-blocking weather monitoring
- **Error Handling**: Graceful fallback to mock data
- **Rate Limiting**: Respects API rate limits

## Testing

### Manual Testing
1. **Enable Notifications**: Test browser notification permissions
2. **Weather Panel**: Verify current weather and forecast display
3. **Alert Banner**: Check weather alert display and dismissal
4. **Settings Modal**: Test notification preferences
5. **Emergency Mode**: Verify integration with emergency features

### API Testing
```bash
# Test current weather endpoint
curl "http://localhost:3000/api/weather/current?lat=25.774&lng=-80.193"

# Test alerts endpoint
curl "http://localhost:3000/api/weather/alerts?lat=25.774&lng=-80.193"

# Test forecast endpoint
curl "http://localhost:3000/api/weather/forecast?lat=25.774&lng=-80.193"
```

## Troubleshooting

### Common Issues

1. **No Weather Data**: Check API keys and network connectivity
2. **Notifications Not Working**: Verify browser permissions and HTTPS
3. **Alerts Not Showing**: Check National Weather Service API availability
4. **Mock Data Always Showing**: Verify environment variables are set

### Debug Mode
Enable console logging to debug weather issues:
```javascript
// Check notification service state
console.log(WeatherNotificationService.getInstance().getSettings())

// Check alert stats
console.log(WeatherNotificationService.getInstance().getAlertStats())
```

## Security Considerations

- **API Keys**: Store securely in environment variables
- **User Location**: Only used for weather data, not stored permanently
- **Notifications**: Respect user privacy and browser permissions
- **Rate Limiting**: Implement proper API rate limiting

## Future Enhancements

- **Historical Data**: Track weather patterns over time
- **Evacuation Routes**: Integration with evacuation planning
- **Community Alerts**: User-submitted weather observations
- **Multi-Language**: Spanish language support for Miami community
- **Offline Mode**: Cached weather data for offline access
