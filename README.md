# Google Storm 🌪️

Google Storm is a bilingual mobile/web platform that combines **Gemini AI** and the **Google Maps Platform** to guide communities through disasters and everyday challenges.  

Think of it as **Google Maps specialized for community resources**: shelters, food banks, free clinics, and volunteer opportunities — all accessible through a conversational AI chatbot.

---

## 🌟 Inspiration
Living in **Miami**, one of the most hurricane-prone areas in the U.S., highlighted the urgent need for a tool that connects people to **life-saving resources quickly**.  
While weather apps provide storm forecasts, they don’t tell you **where to find shelter, food, or medical help**. Google Storm was built to fill that gap.

---

## 🛠️ What it does
- 🧠 **Gemini AI Chatbot** → Conversational help in English or Spanish.  
- 🗺️ **Google Maps Integration** → Real-time map of shelters, clinics, food banks.  
- 🏚️ **Emergency Mode** → Quick toggle to show only **open shelters** with safe routes.  
- 🤝 **Community Contributions** → NGOs and users can submit/update resources (moderated by AI).  
- 🌤️ **Weather & Hurricane Alerts** → Integrated feeds from NOAA, AccuWeather, and NWS.  

---

## ⚙️ How we built it
- **Frontend**: Next.js + React + Tailwind (with Vercel/Firebase Hosting).  
- **Backend**: Firebase Functions & API routes in Next.js.  
- **Database**: Firebase Firestore for resources, pending approvals, and user data.  
- **Authentication**: NextAuth.js + Google OAuth.  
- **AI**: Gemini 1.5 Flash for intent detection, bilingual responses, and moderation.  
- **Maps**: Google Maps JavaScript API & Google Places API for locations.  
- **Weather & Storm Data**: OpenWeatherMap, AccuWeather, NOAA, and National Weather Service APIs.  

**Custom APIs implemented:**  
- `/api/places` → Search resources (food banks, clinics, shelters).  
- `/api/intent` → AI-powered intent detection.  
- `/api/resources` → Manage community-contributed resources.  
- `/api/hurricanes` → Aggregate hurricane tracking data.  
- `/api/weather` → Fetch real-time weather alerts.  

---

## 🚧 Challenges we ran into
- 🌐 **API Overlap** → Handling multiple data sources (Google Places, NOAA, AccuWeather) without duplication.  
- 🕒 **Time Crunch** → Building a reliable MVP in under 48 hours.  
- 🔐 **Security** → Safely exposing Maps API keys while proxying server requests.  
- 🤖 **AI Moderation** → Getting Gemini to validate user submissions accurately.  
- 📍 **Data Availability** → Some shelters and food banks aren’t in Google Places, so we had to seed them manually.  

---

## 🏆 Accomplishments that we're proud of
- Built a **fully working bilingual AI chatbot + live map** in <48 hours.  
- Created a **community contribution flow** with AI moderation.  
- Integrated **multiple government and weather APIs** into one seamless experience.  
- Designed an interface that is **simple enough to use during a crisis**.  

---

## 📚 What we learned
- How to combine **AI + Maps + real-time data feeds** into a meaningful, life-saving product.  
- Best practices for **Firebase security rules** and API key management.  
- Prompt engineering for **multilingual AI intent detection and moderation**.  
- The importance of **clear UX under stressful conditions** (big buttons, easy toggles, mobile-first).  

---

## 🚀 What’s next for Google Storm
- ✅ Partner with **NGOs & local governments** to auto-update resources.  
- 📲 Add **push notifications** for real-time storm alerts.  
- 📡 Offline mode for when internet access is down.  
- 📍 Expand beyond Miami to other **disaster-prone regions worldwide**.  
- 🔄 Add **volunteer matching** and crowd-sourced **population density tracking**.  

---

## 🔑 APIs & Tools Used
- **Google APIs**: Maps JavaScript, Places, Geocoding  
- **Weather APIs**: OpenWeatherMap, AccuWeather, NWS, XWeather  
- **Hurricane Tracking APIs**: NOAA NHC, HURDAT, AccuWeather Tropical  
- **Government Sources**: NOAA advisories, NWS alerts  
- **Authentication**: NextAuth.js, Google OAuth  
- **Database**: Firebase Firestore + Firebase Admin SDK  
- **Internal APIs**: `/api/places`, `/api/intent`, `/api/resources`, `/api/weather`, `/api/hurricanes`  

---

✨ *Built with care at ShellHacks.*
