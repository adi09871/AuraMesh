# AuraMesh

## Decentralized Emergency Communication System v1.0

**Status:** Phase 0 - Foundation Complete ✅

AuraMesh is an offline-first Progressive Web App (PWA) that enables decentralized emergency communication when infrastructure fails. No cellular networks, no internet required.

---

## 🚨 What is AuraMesh?

During disasters like earthquakes, floods, and hurricanes, cellular networks are often among the first systems to fail. AuraMesh solves a critical problem: **when infrastructure collapses, how do people get alerts or send distress signals?**

AuraMesh provides:
- **Offline Emergency Alerts** - No internet required to receive or broadcast SOS signals
- **Peer-to-Peer Mesh** - Messages hop between nearby devices via Bluetooth and WebRTC
- **Acoustic Detection** - Listens for emergency keywords like "help", "fire", "earthquake"
- **Accessibility First** - Multi-modal alerts (haptic, visual, audio) for deaf/hard-of-hearing users
- **Complete Privacy** - All processing occurs locally; no data transmitted without consent

---

## 🏗️ Project Structure

```
auramesh/
├── public/
│   ├── index.html              # PWA entry point
│   └── manifest.json           # PWA manifest with offline config
├── src/
│   ├── components/
│   │   ├── Dashboard.tsx        # Main SOS interface
│   │   ├── Dashboard.css
│   │   ├── EventLog.tsx         # Historical event viewer
│   │   ├── EventLog.css
│   │   ├── MapView.tsx          # Offline map (Phase 4)
│   │   ├── MapView.css
│   │   ├── PeersPanel.tsx       # Connected peers display
│   │   ├── PeersPanel.css
│   │   ├── SettingsPanel.tsx    # User settings & config
│   │   └── SettingsPanel.css
│   ├── services/
│   │   └── db.ts               # IndexedDB service with Dexie
│   ├── store/
│   │   └── appStore.ts         # Zustand state management
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces
│   ├── App.tsx                 # Main app container
│   ├── App.css                 # Brutalist emergency aesthetic
│   ├── index.tsx               # React entry point
│   └── index.css
├── package.json
├── tsconfig.json
└── README.md
```

---

## ✅ Phase 0: Foundation - Complete

### Deliverables

#### 1. **Project Scaffold** ✅
- React 18 + TypeScript configured
- Zustand state management
- Dexie.js for IndexedDB
- Service worker ready (Workbox)

#### 2. **PWA Setup** ✅
- `manifest.json` with offline configuration
- Service worker caching strategy
- Install prompts for iOS/Android
- Offline-first architecture

#### 3. **IndexedDB Integration** ✅
- Dexie database with full schema
- Collections: sos_messages, keyword_detections, events, user_settings, peers
- Automatic data expiry (72h default)
- Import/export (JSON & CSV)

#### 4. **Type Safety** ✅
- Complete TypeScript interfaces
- App state types
- Domain model types
- Event flow types

#### 5. **UI Foundation** ✅
- Brutalist industrial aesthetic
- Emergency color palette (red/amber/green)
- High-contrast accessibility
- Responsive grid layout
- Monospace typography for utilitarian feel

#### 6. **State Management** ✅
- Zustand store with actions
- Async operations for database
- Real-time event feed
- Peer tracking
- Settings persistence

---

## 🎨 Design Aesthetic

**Brutalist Emergency Communication**

- **Dark Theme**: #0a0a0a primary background for low light visibility
- **Emergency Red**: #ef2b2d for critical alerts (bold, unmissable)
- **Warning Amber**: #f59e0b for warnings and pending actions
- **Safe Green**: #10b981 for confirmation and active status
- **Typography**: IBM Plex Mono + JetBrains Mono for serious, utilitarian feel
- **Animations**: Purposeful pulse effects, attention-grabbing flashes
- **Layout**: Grid-based, high-density information design
- **Accessibility**: WCAG 2.1 AA compliant color contrasts

---

## 📦 Key Dependencies

```json
{
  "react": "^18.3.1",              // UI framework
  "zustand": "^4.4.7",             // State management
  "dexie": "^3.2.4",               // IndexedDB wrapper
  "leaflet": "^1.9.4",             // Offline mapping
  "lucide-react": "^0.368.0",      // Icons
  "typescript": "^5.3.3",          // Type safety
  "workbox-window": "^7.0.0"       // Service worker
}
```

---

## 🚀 Running the Application

### Development

```bash
cd auramesh
npm install
npm start
```

Server runs on `http://localhost:3000`

### Build for Production

```bash
npm run build
```

Outputs optimized PWA to `build/` directory

### Install as PWA

**Mobile:**
- Android: Tap menu → "Install app"
- iOS: Tap Share → "Add to Home Screen"

**Desktop:**
- Chrome: Click install icon in address bar
- Edge: Click install icon in address bar

---

## 📋 Phase Roadmap

### Phase 1: Acoustic Keyword Detection (Week 3–5)
- [ ] TensorFlow.js Speech Commands integration
- [ ] Web Audio API microphone capture
- [ ] Keyword confidence scoring
- [ ] False-positive testing framework
- [ ] Automatic SOS confirmation flow

### Phase 2: Multi-Modal Alert System (Week 6–7)
- [ ] Haptic vibration patterns
- [ ] CSS flash animations
- [ ] Web Speech API text-to-speech
- [ ] User alert preference configuration
- [ ] WCAG accessibility audit

### Phase 3: P2P Mesh Communication (Week 8–11)
- [ ] WebRTC Data Channel setup
- [ ] Web Bluetooth peer discovery
- [ ] Message relay (hop count)
- [ ] Duplicate detection (UUID)
- [ ] Mesh topology visualization

### Phase 4: Dashboard & Mapping (Week 12–14)
- [ ] Leaflet offline maps
- [ ] SOS event markers
- [ ] Peer location visualization
- [ ] Real-time zone highlights
- [ ] Filter and search interface

### Phase 5: QA & Optimization (Week 15–16)
- [ ] Performance profiling
- [ ] Battery drain testing
- [ ] Accessibility audit (automated + manual)
- [ ] Cross-browser testing
- [ ] Load testing (50 peers)

### Phase 6: Release & Documentation (Week 17–18)
- [ ] PWA deployment
- [ ] User guide documentation
- [ ] API documentation
- [ ] Research paper/whitepaper
- [ ] Open-source release

---

## 🛠️ Developer Guide

### Adding a New Feature

1. **Define types** in `src/types/index.ts`
2. **Create store actions** in `src/store/appStore.ts`
3. **Add database methods** in `src/services/db.ts` if persisting data
4. **Create component** in `src/components/`
5. **Add styling** with CSS variables for consistency
6. **Test offline** - disable network in DevTools

### Styling Guidelines

All colors use CSS variables:
```css
background: var(--color-critical);    /* Emergency red */
color: var(--color-text-primary);     /* High contrast */
border: 1px solid var(--color-border);
```

Animations are minimal and purposeful:
```css
animation: pulse-dot 2s ease-in-out infinite;
animation: alert-flash 0.4s ease-out;
```

---

## 🔒 Privacy & Security

- **No Audio Upload**: All keyword detection occurs locally via TensorFlow.js
- **No Tracking**: No analytics, no metrics collection
- **Local Storage Only**: All data in IndexedDB on device
- **Optional Sync**: Users can opt-in to sync with cloud (Phase 2.0)
- **Encrypted P2P**: WebRTC Data Channels use DTLS by default

---

## 📱 Browser Support

| Browser | Version | Support |
|---------|---------|---------|
| Chrome  | 100+    | ✅ Full |
| Firefox | 100+    | ✅ Full |
| Safari  | 15.4+   | ⚠️ Limited (no Bluetooth API) |
| Edge    | 100+    | ✅ Full |

**Note:** Web Bluetooth API is not available in iOS Safari. Fallback to WebRTC only.

---

## 🚨 Known Limitations (v1.0)

1. **No official emergency integration** - Works standalone only
2. **Limited range** - Bluetooth ~30m, WebRTC requires same network
3. **English keywords only** - Multi-language in v2.0
4. **iOS Bluetooth** - Not available in Safari, must use native fallback
5. **Map is placeholder** - Full Leaflet integration in Phase 4

---

## 📊 Performance Targets (NFR)

| Metric | Target |
|--------|--------|
| App Launch | < 3 seconds (offline) |
| Keyword Detection | < 1 second latency |
| SOS Broadcast | < 5 seconds to all peers |
| Continuous Monitoring Battery | ≥ 8 hours |
| Keyword Accuracy | ≥ 90% |
| False Positive Rate | < 5% |

---

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidelines.

---

## 📄 License

MIT License - See LICENSE file

---

## 🙏 Acknowledgments

- **TensorFlow.js team** - Speech Commands model
- **WebRTC working group** - P2P communication
- **Web Bluetooth SIG** - Proximity connectivity
- **Deaf & HoH Community** - Accessibility requirements

---

## 📧 Contact & Support

- **Issues**: GitHub Issues (coming soon)
- **Discussions**: GitHub Discussions
- **Security**: security@auramesh.dev

---

**AuraMesh v1.0 - Offline Emergency Communication  
Built for resilience. Designed for accessibility. Privacy first.**
