# WorshipFlow Pro - Quick Reference Card

## 🚀 Quick Start
```bash
# Development
npm run tauri dev

# Production Build
npm run tauri build
```

## 📂 Project Structure
```
worshipflow-pro/
├── src/              # React frontend
├── src-tauri/        # Rust backend
├── package.json      # Node deps
└── Cargo.toml        # Rust deps
```

## 🔧 Common Commands

### Development
```bash
npm install              # Install dependencies
npm run tauri dev       # Run dev server
cargo test              # Run tests
cargo fmt               # Format Rust code
```

### Building
```bash
npm run tauri build     # Build production
cargo build --release   # Build Rust only
npm run build           # Build frontend only
```

## 🗄️ Database Location
```
Windows: %APPDATA%/com.worshipflow.pro/worshipflow.db
macOS:   ~/Library/Application Support/com.worshipflow.pro/worshipflow.db
Linux:   ~/.local/share/com.worshipflow.pro/worshipflow.db
```

## 📡 API Pattern

### Backend (Rust)
```rust
#[tauri::command]
pub async fn my_command(
    state: State<'_, AppState>,
    param: String,
) -> AppResult<MyData> {
    let conn = state.db.lock().unwrap();
    MyRepository::operation(&conn, param)
}
```

### Frontend (TypeScript)
```typescript
import { invoke } from '@tauri-apps/api/tauri';

const result = await invoke('my_command', { param: 'value' });
```

## 🎨 CSS Variables
```css
--bg-primary: #0f0f1e       /* Main background */
--bg-secondary: #1a1a2e     /* Panels */
--bg-tertiary: #252538      /* Cards */
--text-primary: #ffffff     /* Main text */
--text-secondary: #a0a0b0   /* Secondary text */
--accent-blue: #3b82f6      /* Primary accent */
--accent-purple: #8b5cf6    /* Secondary accent */
--accent-green: #10b981     /* Success */
--border-color: #2d2d3f     /* Borders */
--danger: #ef4444           /* Errors */
```

## 🔑 Key Files

### Backend
- `main.rs` - Entry point
- `database.rs` - DB init
- `models.rs` - Data structures
- `commands.rs` - Tauri commands
- `repositories/` - Data access

### Frontend
- `App.tsx` - Main component
- `api/index.ts` - API wrappers
- `components/` - UI components

## 🐛 Debugging

### Enable Logs
```bash
RUST_LOG=debug npm run tauri dev
```

### View Database
```bash
sqlite3 path/to/worshipflow.db
.tables
SELECT * FROM songs;
```

### DevTools
- Windows/Linux: `Ctrl+Shift+I`
- macOS: `Cmd+Option+I`

## 📦 Current Features

### Songs
```typescript
songApi.create(request)
songApi.getAll()
songApi.search(query)
songApi.update(id, request)
songApi.delete(id)
```

### Services
```typescript
serviceApi.create(request)
serviceApi.getAll()
serviceApi.update(id, request)
serviceApi.delete(id)
```

### Activities
```typescript
activityApi.create(request)
activityApi.getByService(serviceId)
activityApi.update(id, request)
activityApi.reorder(serviceId, ids)
activityApi.delete(id)
```

## 🎯 Phase Progress

- ✅ Phase 0: Foundation
- 🔄 Phase 1: Presentation
- ⏳ Phase 2: Songs
- ⏳ Phase 3: Bible
- ⏳ Phase 4: Scheduler
- ⏳ Phase 5: Timer
- ⏳ Phase 6: Leader View

## 📚 Documentation
- `README.md` - Overview
- `DEVELOPMENT.md` - Developer guide
- `PHASE_0_COMPLETE.md` - Current status

## ⚠️ Common Issues

### "Failed to initialize database"
→ Check app data directory permissions

### "Command not found"
→ Verify command is registered in main.rs

### "Type error in API"
→ Ensure TypeScript types match Rust models

### "Window won't open"
→ Check tauri.conf.json window settings

## 🔐 State Management

### Backend State
```rust
pub struct AppState {
    pub db: Mutex<Connection>,
}
```

### Frontend State
```typescript
const [data, setData] = useState<T[]>([]);
```

## 🎨 Component Pattern
```typescript
const MyComponent: React.FC = () => {
    const [state, setState] = useState();

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        // Load from API
    };

    return <div>{/* JSX */}</div>;
};
```

## 📱 Window Management
```typescript
import { appWindow } from '@tauri-apps/api/window';

await appWindow.setFullscreen(true);
await appWindow.minimize();
```

## 🔄 Data Flow
```
User Action
    ↓
React Component
    ↓
API Wrapper
    ↓
Tauri Invoke
    ↓
Rust Command
    ↓
Repository
    ↓
Database
    ↓
Response
```

## 💾 Backup Command
```bash
cp worshipflow.db worshipflow_backup_$(date +%Y%m%d).db
```

## 🏗️ Build Outputs

### Windows
`src-tauri/target/release/bundle/msi/*.msi`

### macOS
`src-tauri/target/release/bundle/dmg/*.dmg`

### Linux
`src-tauri/target/release/bundle/appimage/*.AppImage`

---

**Pro Tip:** Keep this reference handy while developing! 📌
