# Weather Notification Testing Guide

## 🧪 **How to Test Weather Notifications**

### **Method 1: Visual Testing (Recommended)**

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Visit the test page:**
   ```
   http://localhost:3000/test-notifications
   ```

3. **Test different conditions:**
   - Click the weather condition buttons
   - Observe notification appearance and behavior
   - Test dismiss functionality
   - Test expandable safety advice

### **Method 2: Browser Console Testing**

1. **Open your browser's Developer Tools** (F12)

2. **Go to the Console tab**

3. **Run these commands:**
   ```javascript
   // Test all locations
   testWeatherNotifications()
   
   // Test specific coordinates
   testWeatherAPI(25.774, -80.193) // Miami
   testWeatherAPI(29.7604, -95.3698) // Houston
   
   // Simulate weather conditions
   simulateWeatherCondition('hurricane', 'extreme')
   simulateWeatherCondition('storm', 'severe')
   simulateWeatherCondition('rain', 'moderate')
   ```

### **Method 3: API Testing**

1. **Test the enhanced analysis API:**
   ```bash
   curl "http://localhost:3000/api/weather/enhanced-analysis?lat=25.774&lng=-80.193"
   ```

2. **Test different locations:**
   ```bash
   # Miami
   curl "http://localhost:3000/api/weather/enhanced-analysis?lat=25.774&lng=-80.193"
   
   # Houston
   curl "http://localhost:3000/api/weather/enhanced-analysis?lat=29.7604&lng=-95.3698"
   
   # New Orleans
   curl "http://localhost:3000/api/weather/enhanced-analysis?lat=29.9511&lng=-90.0715"
   ```

### **Method 4: Real Location Testing**

1. **Enable location services** in your browser
2. **Visit the main page:** `http://localhost:3000`
3. **Allow location access** when prompted
4. **Observe weather notifications** based on your actual location

## 🔍 **What to Look For**

### **Notification Appearance**
- ✅ Notification appears at top center of screen
- ✅ Proper color coding (red for extreme, orange for severe, yellow for moderate, blue for minor)
- ✅ Weather icons display correctly
- ✅ Severity badges show appropriate colors

### **Notification Behavior**
- ✅ Dismissible with X button
- ✅ Expandable safety advice section
- ✅ Real-time updates every 2 minutes
- ✅ Proper positioning (doesn't overlap with other elements)

### **Safety Advice**
- ✅ Context-appropriate recommendations
- ✅ Clear, actionable steps
- ✅ Proper urgency indicators
- ✅ Government alert integration

### **API Responses**
- ✅ Correct weather condition detection
- ✅ Accurate severity classification
- ✅ Proper safety recommendations
- ✅ Government alert data included

## 🎯 **Test Scenarios**

### **Scenario 1: Clear Weather**
- **Expected:** No notification should appear
- **Test:** Use locations with clear weather conditions

### **Scenario 2: Light Rain**
- **Expected:** Minor blue notification with umbrella advice
- **Test:** Locations with light precipitation

### **Scenario 3: Thunderstorm**
- **Expected:** Moderate yellow notification with storm safety advice
- **Test:** Locations with thunderstorm conditions

### **Scenario 4: Severe Storm**
- **Expected:** Severe orange notification with shelter-in-place advice
- **Test:** Locations with high winds and severe weather

### **Scenario 5: Hurricane**
- **Expected:** Extreme red notification with evacuation advice
- **Test:** Hurricane-prone areas during hurricane season

### **Scenario 6: Flood Warning**
- **Expected:** Severe notification with flood safety advice
- **Test:** Areas with active flood warnings

## 🐛 **Troubleshooting**

### **No Notifications Appearing**
1. Check browser console for errors
2. Verify API keys are configured
3. Test with the demo component
4. Check network connectivity

### **API Errors**
1. Verify environment variables are set
2. Check API rate limits
3. Test with mock data fallback
4. Check CORS settings

### **Styling Issues**
1. Check CSS classes are applied correctly
2. Verify Tailwind CSS is loaded
3. Test responsive design
4. Check z-index conflicts

### **Performance Issues**
1. Check API response times
2. Monitor memory usage
3. Test with multiple notifications
4. Check caching behavior

## 📊 **Performance Testing**

### **Load Testing**
```javascript
// Test multiple simultaneous requests
for (let i = 0; i < 10; i++) {
  testWeatherAPI(25.774 + i * 0.1, -80.193 + i * 0.1)
}
```

### **Memory Testing**
- Monitor browser memory usage
- Test with multiple notifications
- Check for memory leaks
- Test dismiss functionality

### **Network Testing**
- Test with slow connections
- Test with offline scenarios
- Test API timeout handling
- Test fallback mechanisms

## 🔧 **Development Testing**

### **Hot Reload Testing**
1. Make changes to notification component
2. Verify changes appear without refresh
3. Test component state persistence
4. Check for hydration issues

### **Build Testing**
```bash
npm run build
npm run start
```

### **Production Testing**
1. Deploy to staging environment
2. Test with production API keys
3. Verify all features work
4. Test with real user scenarios

## 📱 **Mobile Testing**

### **Responsive Design**
- Test on different screen sizes
- Verify touch interactions
- Check notification positioning
- Test dismiss gestures

### **Performance**
- Test on slower devices
- Check battery usage
- Monitor network usage
- Test offline scenarios

## 🎉 **Success Criteria**

### **Functional Requirements**
- ✅ Notifications appear for relevant weather conditions
- ✅ Safety advice is contextually appropriate
- ✅ Government alerts are properly integrated
- ✅ Notifications are dismissible
- ✅ Real-time updates work correctly

### **Non-Functional Requirements**
- ✅ Notifications don't interfere with user workflow
- ✅ Performance is acceptable (< 2s load time)
- ✅ Memory usage is reasonable
- ✅ Works across different browsers
- ✅ Responsive design works on mobile

### **User Experience**
- ✅ Notifications are helpful, not annoying
- ✅ Safety advice is clear and actionable
- ✅ Visual design is professional
- ✅ Accessibility standards are met
- ✅ Error handling is graceful

## 📝 **Test Checklist**

- [ ] Visual testing with demo component
- [ ] API testing with different locations
- [ ] Browser console testing
- [ ] Real location testing
- [ ] Mobile responsive testing
- [ ] Performance testing
- [ ] Error handling testing
- [ ] Accessibility testing
- [ ] Cross-browser testing
- [ ] Production deployment testing

## 🚀 **Quick Start Testing**

1. **Run the app:** `npm run dev`
2. **Visit:** `http://localhost:3000/test-notifications`
3. **Click weather condition buttons**
4. **Open browser console and run:** `testWeatherNotifications()`
5. **Check main page for real notifications**

Happy testing! 🎯
