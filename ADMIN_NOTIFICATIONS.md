# Admin Login/Logout Notification System

## 🎯 **Overview**

The Admin Notification System tracks and displays real-time notifications for admin login and logout events. It provides comprehensive logging, security monitoring, and user activity tracking for administrative users.

## 🔐 **Features**

### **Real-time Notifications**
- ✅ **Login notifications** when admin signs in
- ✅ **Logout notifications** when admin signs out
- ✅ **Session tracking** with timestamps
- ✅ **User identification** with email and name
- ✅ **IP address logging** for security
- ✅ **User agent tracking** for device identification

### **Security Features**
- ✅ **Admin-only access** to notification system
- ✅ **Event logging** with unique IDs
- ✅ **IP address tracking** for security audit
- ✅ **Session management** with automatic cleanup
- ✅ **Unauthorized access** detection and logging

### **User Experience**
- ✅ **Dismissible notifications** with X button
- ✅ **Expandable details** for session information
- ✅ **Auto-hide functionality** with configurable duration
- ✅ **Settings panel** for customization
- ✅ **Visual indicators** with icons and colors

## 🏗️ **Architecture**

### **Components**

#### **AdminNotification Component**
- **Location:** `components/admin-notification.tsx`
- **Purpose:** Main notification display component
- **Features:** Real-time notifications, settings, event tracking

#### **Admin Events API**
- **Location:** `pages/api/admin/events.ts`
- **Purpose:** Server-side event logging and retrieval
- **Methods:** GET, POST, DELETE for event management

#### **Authentication Integration**
- **Location:** `pages/api/auth/[...nextauth].ts`
- **Purpose:** Admin authentication and session management
- **Features:** Google OAuth, admin email validation

### **Data Flow**

```
Admin Login → NextAuth → AdminNotification → API Event Logging → Notification Display
     ↓              ↓              ↓              ↓              ↓
Session Check → User Validation → Event Creation → Database Storage → Real-time UI
```

## 🚀 **Usage**

### **Basic Integration**

```tsx
import { AdminNotification } from "@/components/admin-notification"

// In your admin page
<AdminNotification />
```

### **API Usage**

```javascript
// Log admin event
const response = await fetch('/api/admin/events', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    type: 'login',
    userEmail: 'admin@example.com',
    userName: 'Admin User',
    ipAddress: '192.168.1.1',
    userAgent: navigator.userAgent,
    location: 'New York, NY'
  })
})

// Get admin events
const events = await fetch('/api/admin/events')
const data = await events.json()
```

## 🧪 **Testing**

### **Test Page**
Visit: `http://localhost:3000/test-admin`

**Features:**
- Admin status verification
- Event simulation (login/logout)
- API testing
- Event history viewing
- Settings configuration

### **Manual Testing**

1. **Sign in as admin:** `http://localhost:3000/admin/signin`
2. **Observe login notification** in top-right corner
3. **Sign out** and observe logout notification
4. **Test settings** by clicking the settings button
5. **Verify event logging** via API calls

### **API Testing**

```bash
# Get admin events
curl http://localhost:3000/api/admin/events

# Log login event
curl -X POST http://localhost:3000/api/admin/events \
  -H "Content-Type: application/json" \
  -d '{"type":"login","userEmail":"test@admin.com","userName":"Test Admin"}'

# Clear all events
curl -X DELETE http://localhost:3000/api/admin/events
```

## ⚙️ **Configuration**

### **Admin Email Configuration**

Update the admin emails in `pages/api/auth/[...nextauth].ts`:

```javascript
const adminEmails = [
  'your-admin@email.com',
  'another-admin@email.com',
  // Add more admin emails
]
```

### **Notification Settings**

Users can configure:
- **Show/Hide notifications**
- **Detailed information display**
- **Auto-hide duration**
- **Notification positioning**

### **Environment Variables**

```env
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret
```

## 📊 **Event Types**

### **Login Events**
- **Type:** `login`
- **Trigger:** Successful admin authentication
- **Data:** User email, name, IP, timestamp
- **Notification:** Green notification with login icon

### **Logout Events**
- **Type:** `logout`
- **Trigger:** Admin sign out or session expiry
- **Data:** User email, name, IP, timestamp
- **Notification:** Blue notification with logout icon

### **Session Expired**
- **Type:** `session_expired`
- **Trigger:** Automatic session timeout
- **Data:** User email, name, IP, timestamp
- **Notification:** Yellow notification with clock icon

### **Unauthorized Access**
- **Type:** `unauthorized_access`
- **Trigger:** Failed admin authentication attempts
- **Data:** Attempted email, IP, timestamp
- **Notification:** Red notification with warning icon

## 🔒 **Security Considerations**

### **Access Control**
- Only admin users can access notification system
- API endpoints require admin authentication
- Event logging is restricted to admin users

### **Data Privacy**
- IP addresses are logged for security audit
- User agents are tracked for device identification
- All data is stored in memory (consider database for production)

### **Session Management**
- Automatic session cleanup
- Configurable session timeout
- Secure logout with event tracking

## 📱 **User Interface**

### **Notification Display**
- **Position:** Top-right corner of screen
- **Size:** Fixed width (320px)
- **Colors:** Green (login), Blue (logout), Yellow (expired), Red (unauthorized)
- **Icons:** 🔐 (login), 🚪 (logout), ⏰ (expired), 🚫 (unauthorized)

### **Settings Panel**
- **Toggle notifications** on/off
- **Show detailed information** (IP, location, user agent)
- **Auto-hide duration** configuration
- **Sign out button** with event tracking

### **Event Details**
- **Expandable sections** for additional information
- **Timestamp display** with date and time
- **User information** (name, email)
- **Technical details** (IP, user agent, location)

## 🚀 **Production Deployment**

### **Database Integration**
For production, replace in-memory storage with a database:

```javascript
// Example with MongoDB
import { MongoClient } from 'mongodb'

const client = new MongoClient(process.env.MONGODB_URI)
const db = client.db('admin_events')
const events = db.collection('events')

// Store event
await events.insertOne(event)

// Retrieve events
const recentEvents = await events
  .find({})
  .sort({ timestamp: -1 })
  .limit(50)
  .toArray()
```

### **Security Enhancements**
- **Rate limiting** for API endpoints
- **IP whitelisting** for admin access
- **Encrypted data storage** for sensitive information
- **Audit logging** for compliance

### **Performance Optimization**
- **Event pagination** for large datasets
- **Caching** for frequently accessed data
- **Background cleanup** for old events
- **Compression** for stored data

## 🐛 **Troubleshooting**

### **Common Issues**

#### **Notifications Not Appearing**
1. Check if user is admin (`session.user.isAdmin`)
2. Verify notification settings are enabled
3. Check browser console for errors
4. Ensure API endpoints are accessible

#### **API Errors**
1. Verify admin authentication
2. Check request format and headers
3. Ensure required fields are provided
4. Check server logs for errors

#### **Session Issues**
1. Verify NextAuth configuration
2. Check environment variables
3. Ensure admin emails are configured
4. Test authentication flow

### **Debug Commands**

```javascript
// Check admin status
console.log('Admin status:', session?.user?.isAdmin)

// Test API endpoint
fetch('/api/admin/events')
  .then(res => res.json())
  .then(data => console.log('Events:', data))

// Check notification settings
const settings = localStorage.getItem('adminNotificationSettings')
console.log('Settings:', JSON.parse(settings))
```

## 📈 **Analytics & Monitoring**

### **Event Metrics**
- **Login frequency** by admin user
- **Session duration** tracking
- **Geographic distribution** of logins
- **Device/browser** usage patterns

### **Security Monitoring**
- **Failed login attempts** tracking
- **Suspicious IP addresses** detection
- **Unusual access patterns** identification
- **Session hijacking** prevention

## 🎯 **Future Enhancements**

### **Planned Features**
- **Email notifications** for admin events
- **Slack/Discord integration** for team alerts
- **Advanced analytics** dashboard
- **Mobile app** notifications
- **Multi-factor authentication** support

### **Integration Opportunities**
- **SIEM systems** for enterprise security
- **Compliance reporting** for audit trails
- **User behavior analytics** for insights
- **Automated security responses** for threats

## ✅ **Success Criteria**

### **Functional Requirements**
- ✅ Admin login/logout events are tracked
- ✅ Real-time notifications are displayed
- ✅ Event history is maintained
- ✅ Settings are configurable
- ✅ Security is maintained

### **Non-Functional Requirements**
- ✅ Performance is acceptable (< 1s response time)
- ✅ Security is robust (admin-only access)
- ✅ Usability is intuitive (clear UI)
- ✅ Reliability is high (error handling)
- ✅ Scalability is considered (database ready)

The Admin Notification System provides comprehensive tracking and monitoring for administrative activities, ensuring security and providing valuable insights into admin user behavior.
