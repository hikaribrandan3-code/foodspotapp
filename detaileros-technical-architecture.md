# DetailerOS — Technical Architecture Research

## Executive Summary

DetailerOS is a **PWA-first, offline-critical** mobile application for automotive detailers working in challenging network environments (parking garages, underground facilities). Unlike FoodSpot-OS which operates primarily in connected restaurant environments, DetailerOS must function completely offline for hours at a time.

---

## Recommended Tech Stack

### Core Framework
| Layer | Technology | Rationale |
|-------|------------|-----------|
| **Frontend Framework** | **React + Vite** or **Vue 3 + Vite** | Both excellent PWA support. Vite's fast HMR is crucial for field debugging. |
| **Mobile Runtime** | **Capacitor 6** | Bridges PWA to native when needed for background GPS. Better PWA-first approach than Cordova. |
| **State Management** | **Pinia** (Vue) or **Zustand** (React) | Lightweight, works offline, persists to localStorage/IndexedDB |
| **Offline Database** | **PowerSync + SQLite** | Purpose-built for Supabase offline-first. Superior to manual PouchDB setup. |
| **Sync/Backend** | **Supabase** | Auth, real-time sync, storage. PowerSync integrates natively. |

### Why NOT React Native / Flutter for MVP?
- PWA-first allows instant deployment (no app store delays)
- Detailers can use company tablets OR personal phones
- Lower barrier to adoption (just a link)
- Can wrap with Capacitor later for native store presence

---

## Critical Architecture Decisions

### 1. Offline-First Data Layer (PowerSync + Supabase)

```
┌─────────────────────────────────────────────────────────────────┐
│                      DETAILER DEVICE                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   React     │◄──►│ PowerSync   │◄──►│ Embedded SQLite     │ │
│  │   Client    │    │  SDK        │    │ (Local Data Store)  │ │
│  └─────────────┘    └──────┬──────┘    └─────────────────────┘ │
│                            │                                    │
│                     ┌──────▼──────┐                            │
│                     │ Upload Queue│  ◄── Changes queued offline │
│                     └──────┬──────┘                            │
└────────────────────────────┬────────────────────────────────────┘
                             │  (Sync when online)
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                     POWERSYNC CLOUD                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │ Sync Streams│◄──►│  Sync Rules │◄──►│  WebSocket Conn     │ │
│  │  (Per User) │    │ (Data Auth) │    │  (Real-time)        │ │
│  └──────┬──────┘    └─────────────┘    └─────────────────────┘ │
└─────────┼───────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                     SUPABASE BACKEND                            │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────────┐ │
│  │   Auth      │    │   Postgres  │    │   Storage (Images)  │ │
│  │  (JWT)      │    │  (Master DB)│    │   (CDN/Direct)      │ │
│  └─────────────┘    └─────────────┘    └─────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

**Key Points:**
- PowerSync uses **WAL replication** from Supabase Postgres
- Each detailer gets a **personal sync stream** based on their assigned jobs
- Changes are queued locally in SQLite, synced when connectivity returns
- No manual conflict resolution needed (handled by PowerSync)

**Sync Rules Example:**
```yaml
config:
  edition: 3
streams:
  detailer_jobs:
    auto_subscribe: true
    queries:
      - SELECT * FROM jobs WHERE assigned_to = auth.user_id()
      - SELECT * FROM job_photos WHERE job_id IN (SELECT id FROM jobs WHERE assigned_to = auth.user_id())
      - SELECT * FROM customers WHERE id IN (SELECT customer_id FROM jobs WHERE assigned_to = auth.user_id())
```

---

### 2. Photo/Image Handling Strategy

**The Problem:**
- 50+ photos per job = 150-500MB per detailer per day
- Uploading from parking garage = impossible
- Can't block on uploads before job completion

**Solution: Tiered Storage Architecture**

```
┌─────────────────────────────────────────────────────────────┐
│  DEVICE-SIDE IMAGE LAYER                                    │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ Camera Capture  │→ │ Compression     │→ │ IndexedDB   │ │
│  │ (Capacitor      │  │ (browser-image  │  │ Cache       │ │
│  │  Camera API)    │  │  compression)   │  │ (Temporary) │ │
│  └─────────────────┘  └─────────────────┘  └──────┬──────┘ │
│                                                    │        │
│  ┌───────────────────────────────────────────────────────┐ │
│  │           OFFLINE UPLOAD QUEUE (Background Sync)      │ │
│  │  • Store compressed images in queue                   │ │
│  │  • Add metadata: job_id, timestamp, location          │ │
│  │  • Use Workbox BackgroundSync API                     │ │
│  └───────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ (When online)
┌─────────────────────────────────────────────────────────────┐
│  SUPABASE STORAGE                                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────┐ │
│  │  Bucket     │  │  Resized    │  │  Database Record    │ │
│  │  (Original) │  │  Variants   │  │  (photo metadata)   │ │
│  └─────────────┘  └─────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Image Compression Pipeline:**
```javascript
import imageCompression from 'browser-image-compression';

const compressPhoto = async (file) => {
  const options = {
    maxSizeMB: 1,              // Target 1MB max
    maxWidthOrHeight: 1920,    // 1080p equivalent
    useWebWorker: true,        // Non-blocking
    preserveExif: true,        // Keep GPS data!
    fileType: 'image/jpeg',
    initialQuality: 0.85       // Balance size vs quality
  };
  
  return await imageCompression(file, options);
};

// 8MB iPhone photo → ~800KB compressed
```

**Libraries:**
- `browser-image-compression` - Client-side compression
- `@capacitor/camera` - Native camera access (PWA + native)
- `@capacitor/filesystem` - Local file storage (native builds)
- `idb-keyval` - IndexedDB wrapper for PWA storage

---

### 3. GPS & Route Optimization

**Clock In/Out Location Tracking:**

```
┌─────────────────────────────────────────────────────────────┐
│  GPS TRACKING MODULE                                        │
│                                                             │
│  ┌─────────────┐   ┌─────────────┐   ┌─────────────────┐   │
│  │ Geolocation │   │  Background │   │   Work Hours    │   │
│  │   API       │   │   Geofence  │   │   Detection     │   │
│  │ (PWA)       │   │ (Capacitor) │   │ (Scheduled)     │   │
│  └──────┬──────┘   └──────┬──────┘   └─────────────────┘   │
│         │                 │                                  │
│         └────────┬────────┘                                  │
│                  ▼                                          │
│         ┌─────────────────┐                                 │
│         │ Location Store  │  (IndexedDB/SQLite)             │
│         │ - timestamp     │                                 │
│         │ - lat/lng       │                                 │
│         │ - accuracy      │                                 │
│         │ - job_id (if    │                                 │
│         │   active)       │                                 │
│         └────────┬────────┘                                 │
│                  │                                          │
│         (sync when online)                                  │
│                  ▼                                          │
│         ┌─────────────────┐                                 │
│         │  Supabase Table │                                 │
│         │  gps_checkins   │                                 │
│         └─────────────────┘                                 │
└─────────────────────────────────────────────────────────────┘
```

**Route Optimization Options:**

| Service | Cost | Pros | Cons |
|---------|------|------|------|
| **Mapbox Optimization API** | $0.50/1000 requests | Great mobile SDK, offline maps | Requires internet for optimization |
| **Google Routes API** | $5/1000 requests | Best accuracy, traffic data | Expensive, requires billing |
| **OSRM (self-hosted)** | Free | Full control, offline possible | Need server, maintenance overhead |
| **OpenRouteService** | Free tier | Open source, good limits | Slower than paid options |

**Recommendation for DetailerOS:**
- **Primary:** Mapbox Optimization API (offline map tiles available)
- **Fallback:** OpenRouteService for cost-sensitive markets
- **Advanced:** Self-host OSRM if you have DevOps capacity

**Libraries:**
- `mapbox-gl` or `react-map-gl` - Map rendering
- `@mapbox/mapbox-sdk` - Route optimization
- `@capacitor/geolocation` - Native GPS access
- `geolib` - Client-side distance calculations

---

### 4. Service Worker Strategy (Workbox)

```javascript
// workbox-config.js
module.exports = {
  globDirectory: 'dist/',
  globPatterns: ['**/*.{js,css,html,png,svg,jpg}'],
  
  // Runtime caching for API calls
  runtimeCaching: [
    {
      urlPattern: /\/api\/jobs/,
      handler: 'NetworkFirst',
      options: {
        cacheName: 'jobs-cache',
        expiration: { maxEntries: 100, maxAgeSeconds: 7 * 24 * 60 * 60 }
      }
    },
    {
      // Background sync for photo uploads
      urlPattern: /\/storage\/v1\/object/,
      handler: 'NetworkOnly',
      options: {
        backgroundSync: {
          name: 'photo-upload-queue',
          options: {
            maxRetentionTime: 24 * 60 // Retry for 24 hours
          }
        }
      }
    }
  ]
};
```

---

## FoodSpot-OS Comparison

### What Can Be Reused (Similar Patterns)

| Component | FoodSpot-OS | DetailerOS | Reuse? |
|-----------|-------------|------------|--------|
| **Auth** | Supabase Auth | Supabase Auth | ✅ Exact same |
| **DB Schema** | Postgres | Postgres | ✅ Same patterns |
| **Image Storage** | Supabase Storage | Supabase Storage | ✅ Same |
| **Row Level Security** | RLS policies | RLS policies | ✅ Same patterns |
| **Realtime subscriptions** | Supabase Realtime | PowerSync sync | ⚠️ Different approach |

### What Must Be Different (Offline-Critical Requirements)

| Aspect | FoodSpot-OS | DetailerOS | Why Different |
|--------|-------------|------------|---------------|
| **Offline Strategy** | Optimistic UI + retry | True offline-first (PowerSync) | Detailers have ZERO connectivity in garages |
| **Data Sync** | Realtime subscriptions | Background sync queue | Can't rely on constant connection |
| **Photo Handling** | Direct upload | Offline queue + compression | 50+ photos/job, upload later |
| **GPS Tracking** | Optional | Required for payroll | Clock in/out verification |
| **App Type** | PWA sufficient | PWA + optional native wrap | Background GPS needs Capacitor |
| **Conflict Resolution** | Last-write-wins | CRDT / timestamp-based | Multiple field edits possible |
| **Data Retention** | Cloud-primary | Local-primary | Must work without cloud |

---

## Recommended Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DETAILEROS ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        PWA CLIENT (React/Vue)                       │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │   │
│  │  │   Jobs UI   │  │  Camera     │  │   Map/      │  │  Time/      │ │   │
│  │  │  (Offline)  │  │  Capture    │  │   Route     │  │  Clock      │ │   │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │   │
│  │         │                │                │                │        │   │
│  │         └────────────────┴────────────────┴────────────────┘        │   │
│  │                              │                                       │   │
│  │                    ┌─────────▼──────────┐                            │   │
│  │                    │   PowerSync SDK    │                            │   │
│  │                    │   (Data Layer)     │                            │   │
│  │                    └─────────┬──────────┘                            │   │
│  │                              │                                       │   │
│  │         ┌────────────────────┼────────────────────┐                  │   │
│  │         ▼                    ▼                    ▼                  │   │
│  │  ┌─────────────┐     ┌─────────────┐     ┌─────────────────┐        │   │
│  │  │   SQLite    │     │ Photo Queue │     │   Location      │        │   │
│  │  │  (WAL mode) │     │ (IndexedDB) │     │   Cache         │        │   │
│  │  │             │     │             │     │   (Local)       │        │   │
│  │  │ • Jobs      │     │ • Pending   │     │                 │        │   │
│  │  │ • Customers │     │   uploads   │     │ • Clock in/out  │        │   │
│  │  │ • Checklists│     │ • Metadata  │     │ • Route waypts  │        │   │
│  │  │ • Photos    │     │ • Retry     │     │                 │        │   │
│  │  │   metadata  │     │   logic     │     │                 │        │   │
│  │  └─────────────┘     └─────────────┘     └─────────────────┘        │   │
│  │                                                                     │   │
│  │  ┌─────────────────────────────────────────────────────────────┐   │   │
│  │  │              SERVICE WORKER (Workbox)                       │   │   │
│  │  │  • App shell caching (offline access)                       │   │   │
│  │  │  • Background sync for photos                               │   │   │
│  │  │  • Push notifications (job assignments)                     │   │   │
│  │  └─────────────────────────────────────────────────────────────┘   │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                      (When connected)│                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                         POWER SYNC CLOUD                            │   │
│  │                    (Sync Rules + WebSocket)                         │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                      │                                      │
│                                      ▼                                      │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        SUPABASE BACKEND                             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────────┐    │   │
│  │  │   Auth   │  │ Postgres │  │ Storage  │  │ Realtime (admin) │    │   │
│  │  │  (JWT)   │  │  (WAL)   │  │ (Images) │  │  (notifications) │    │   │
│  │  └──────────┘  └────┬─────┘  └──────────┘  └──────────────────┘    │   │
│  └─────────────────────┼──────────────────────────────────────────────┘   │
│                        │                                                   │
│                        ▼                                                   │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │                        ADMIN DASHBOARD                              │   │
│  │              (Job assignment, route optimization, payroll)          │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Libraries & Dependencies

### Core
```json
{
  "@powersync/web": "^1.0.0",
  "@supabase/supabase-js": "^2.39.0",
  "@capacitor/core": "^6.0.0",
  "workbox-precaching": "^7.0.0",
  "workbox-background-sync": "^7.0.0"
}
```

### UI (Choose based on preference)
```json
// Vue stack
{
  "vue": "^3.4.0",
  "pinia": "^2.1.0",
  "vue-router": "^4.2.0",
  "@vite-pwa/nuxt": "^0.6.0"
}

// React stack  
{
  "react": "^18.2.0",
  "zustand": "^4.4.0",
  "react-router-dom": "^6.20.0",
  "vite-plugin-pwa": "^0.17.0"
}
```

### Mobile/Native Plugins (Capacitor)
```json
{
  "@capacitor/camera": "^6.0.0",
  "@capacitor/geolocation": "^6.0.0",
  "@capacitor/filesystem": "^6.0.0",
  "@capacitor/local-notifications": "^6.0.0",
  "@capacitor/background-runner": "^6.0.0"
}
```

### Image Handling
```json
{
  "browser-image-compression": "^2.0.2",
  "pica": "^9.0.1",
  "idb-keyval": "^6.2.1"
}
```

### Maps & GPS
```json
{
  "mapbox-gl": "^3.0.0",
  "react-map-gl": "^7.1.0",
  "geolib": "^3.3.4"
}
```

### Offline Storage
```json
{
  "@powersync/web": "^1.0.0",
  "sql.js": "^1.9.0",
  "localforage": "^1.10.0"
}
```

---

## Data Flow: Typical Job Lifecycle

```
1. MORNING (At home, has WiFi)
   ┌─────────────────────────────────────────┐
   │ Admin assigns 3 jobs via dashboard      │
   │ Supabase: jobs.created                  │
   │ PowerSync: syncs to device              │
   └─────────────────────────────────────────┘
                      │
                      ▼
2. PREP (In van, driving)
   ┌─────────────────────────────────────────┐
   │ Open PWA → all 3 jobs visible (cached)  │
   │ Tap "Start Route" → Mapbox optimizes    │
   │ GPS tracking begins (background)        │
   └─────────────────────────────────────────┘
                      │
                      ▼
3. JOB 1 (Parking garage, NO SIGNAL)
   ┌─────────────────────────────────────────┐
   │ Arrive → "Clock In" (GPS + timestamp)   │
   │ Stored locally (SQLite)                 │
   │                                         │
   │ Work...                                 │
   │ Take 45 photos → compress → IndexedDB   │
   │                                         │
   │ Complete checklist (offline)            │
   │ "Clock Out" → stored locally            │
   │                                         │
   │ Mark job complete (pending sync)        │
   └─────────────────────────────────────────┘
                      │
                      ▼
4. LUNCH (Cafe, WiFi available)
   ┌─────────────────────────────────────────┐
   │ PowerSync detects connection            │
   │ → Syncs job completion to Supabase      │
   │                                         │
   │ Background Sync queue wakes up          │
   │ → Uploads 45 photos (one by one)        │
   │ → Updates job_photos table              │
   │                                         │
   │ GPS checkins upload                     │
   │                                         │
   │ Admin sees: Job complete + photos       │
   └─────────────────────────────────────────┘
```

---

## Migration Path from FoodSpot-OS

If FoodSpot-OS already exists with Supabase:

1. **Keep:** Auth, user management, RLS patterns
2. **Keep:** Supabase project (add PowerSync instance)
3. **Modify:** Client to use PowerSync instead of direct Supabase queries
4. **Add:** Photo upload queue, GPS tracking modules
5. **New:** Background sync infrastructure (Workbox)

---

## Cost Estimate (100 detailers)

| Service | Monthly Cost |
|---------|-------------|
| Supabase (Pro) | $25 |
| PowerSync (Business) | $99 |
| Mapbox (5000 route requests) | $25 |
| Storage (500GB images) | $25 |
| **Total** | **~$175/month** |

---

## Recommendations

1. **Start with PowerSync** — it's purpose-built for this exact use case and integrates seamlessly with Supabase
2. **Use browser-image-compression** — reduces photo size by 80%+ without quality loss
3. **Implement tiered GPS** — PWA geolocation for foreground, Capacitor background mode for native builds
4. **Test in Faraday cage conditions** — literally verify offline functionality works
5. **Build PWA-first, wrap later** — get to market faster, then add native wrapper for app store presence

---

## Next Steps

1. ✅ Set up Supabase + PowerSync integration
2. ✅ Create SQLite schema for jobs, photos, checklists
3. ✅ Implement photo capture + compression pipeline
4. ✅ Add GPS tracking with offline storage
5. ✅ Configure Workbox background sync
6. ✅ Test complete offline workflows
7. ⬜ Wrap with Capacitor for native features (optional)
