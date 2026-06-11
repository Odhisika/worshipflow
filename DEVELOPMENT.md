# WorshipFlow Pro - Developer Guide

## 📚 Table of Contents
1. [Getting Started](#getting-started)
2. [Architecture Overview](#architecture-overview)
3. [Backend Development](#backend-development)
4. [Frontend Development](#frontend-development)
5. [Database Operations](#database-operations)
6. [Adding New Features](#adding-new-features)
7. [Best Practices](#best-practices)
8. [Debugging](#debugging)

## Getting Started

### Development Environment Setup

1. **Install Rust**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   ```

2. **Install Node.js**
   - Download from [nodejs.org](https://nodejs.org/)
   - Recommended: v18 or later

3. **Install System Dependencies**
   
   **Ubuntu/Debian:**
   ```bash
   sudo apt update
   sudo apt install libwebkit2gtk-4.0-dev \
       build-essential \
       curl \
       wget \
       libssl-dev \
       libgtk-3-dev \
       libayatana-appindicator3-dev \
       librsvg2-dev
   ```

   **macOS:**
   ```bash
   xcode-select --install
   ```

   **Windows:**
   - Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
   - Install [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

## Architecture Overview

### Frontend → Backend Communication

```
React Component
    ↓
API Wrapper (src/api/index.ts)
    ↓
Tauri Invoke
    ↓
Rust Command (src-tauri/src/commands.rs)
    ↓
Repository (src-tauri/src/repositories/)
    ↓
Database (SQLite)
```

### State Management

- **Frontend:** React hooks (useState, useEffect)
- **Backend:** Tauri managed state
- **Database:** SQLite with connection pooling

## Backend Development

### Adding a New Data Model

1. **Define the model** in `src-tauri/src/models.rs`:
   ```rust
   #[derive(Debug, Clone, Serialize, Deserialize)]
   pub struct MyModel {
       pub id: String,
       pub name: String,
       pub created_at: DateTime<Utc>,
   }
   ```

2. **Create database table** in `src-tauri/src/database.rs`:
   ```rust
   conn.execute(
       "CREATE TABLE IF NOT EXISTS my_models (
           id TEXT PRIMARY KEY,
           name TEXT NOT NULL,
           created_at TEXT NOT NULL
       )",
       [],
   )?;
   ```

3. **Create repository** in `src-tauri/src/repositories/my_models.rs`:
   ```rust
   pub struct MyModelRepository;

   impl MyModelRepository {
       pub fn create(conn: &Connection, name: String) -> AppResult<MyModel> {
           // Implementation
       }

       pub fn get_all(conn: &Connection) -> AppResult<Vec<MyModel>> {
           // Implementation
       }
   }
   ```

4. **Add Tauri commands** in `src-tauri/src/commands.rs`:
   ```rust
   #[tauri::command]
   pub async fn create_my_model(
       state: State<'_, AppState>,
       name: String,
   ) -> AppResult<MyModel> {
       let conn = state.db.lock().unwrap();
       MyModelRepository::create(&conn, name)
   }
   ```

5. **Register command** in `src-tauri/src/main.rs`:
   ```rust
   .invoke_handler(tauri::generate_handler![
       create_my_model,
       // ... other commands
   ])
   ```

### Error Handling

Always use the `AppResult<T>` type:

```rust
use crate::error::{AppError, AppResult};

pub fn my_function() -> AppResult<MyData> {
    let data = some_operation()
        .map_err(|e| AppError::Database(e))?;
    
    Ok(data)
}
```

## Frontend Development

### Creating a New Component

1. **Create component file** in `src/components/MyComponent.tsx`:
   ```tsx
   import React, { useState, useEffect } from 'react';
   import './MyComponent.css';

   const MyComponent: React.FC = () => {
       const [data, setData] = useState([]);

       useEffect(() => {
           loadData();
       }, []);

       const loadData = async () => {
           // Load data
       };

       return (
           <div className="my-component">
               {/* Component JSX */}
           </div>
       );
   };

   export default MyComponent;
   ```

2. **Create CSS file** in `src/components/MyComponent.css`:
   ```css
   .my-component {
       /* Styles */
   }
   ```

3. **Add to routing** in `src/App.tsx`:
   ```tsx
   <Route path="/my-route" element={<MyComponent />} />
   ```

### Using the API

Always use the API wrappers:

```tsx
import { songApi } from '../api';

// In your component
const songs = await songApi.getAll();
const song = await songApi.create({
    title: "Amazing Grace",
    lyrics: "...",
});
```

### Adding New API Methods

1. **Define types** in `src/api/index.ts`:
   ```typescript
   export interface MyModel {
       id: string;
       name: string;
   }
   ```

2. **Create API object**:
   ```typescript
   export const myModelApi = {
       create: (name: string): Promise<MyModel> =>
           invoke('create_my_model', { name }),
       
       getAll: (): Promise<MyModel[]> =>
           invoke('get_all_my_models'),
   };
   ```

## Database Operations

### Querying Data

```rust
// Single row
let item = conn.query_row(
    "SELECT id, name FROM items WHERE id = ?1",
    [id],
    |row| {
        Ok(Item {
            id: row.get(0)?,
            name: row.get(1)?,
        })
    }
)?;

// Multiple rows
let mut stmt = conn.prepare(
    "SELECT id, name FROM items ORDER BY name"
)?;

let items = stmt.query_map([], |row| {
    Ok(Item {
        id: row.get(0)?,
        name: row.get(1)?,
    })
})?
.collect::<Result<Vec<_>, _>>()?;
```

### Transactions

```rust
let tx = conn.transaction()?;

tx.execute("INSERT INTO ...", params![])?;
tx.execute("UPDATE ...", params![])?;

tx.commit()?;
```

## Adding New Features

### Workflow for New Features

1. **Update the model** (if needed)
2. **Update the database schema**
3. **Create/update repository methods**
4. **Add Tauri commands**
5. **Update API wrapper**
6. **Create/update UI components**
7. **Test thoroughly**

### Example: Adding "Favorite Songs"

1. **Update database:**
   ```rust
   conn.execute(
       "ALTER TABLE songs ADD COLUMN is_favorite INTEGER DEFAULT 0",
       [],
   )?;
   ```

2. **Update model:**
   ```rust
   pub struct Song {
       // ... existing fields
       pub is_favorite: bool,
   }
   ```

3. **Add repository method:**
   ```rust
   pub fn toggle_favorite(conn: &Connection, id: &str) -> AppResult<Song> {
       conn.execute(
           "UPDATE songs SET is_favorite = NOT is_favorite WHERE id = ?1",
           [id],
       )?;
       Self::get_by_id(conn, id)
   }
   ```

4. **Add command:**
   ```rust
   #[tauri::command]
   pub async fn toggle_song_favorite(
       state: State<'_, AppState>,
       id: String,
   ) -> AppResult<Song> {
       let conn = state.db.lock().unwrap();
       SongRepository::toggle_favorite(&conn, &id)
   }
   ```

5. **Update API:**
   ```typescript
   toggleFavorite: (id: string): Promise<Song> =>
       invoke('toggle_song_favorite', { id }),
   ```

6. **Update UI:**
   ```tsx
   <button onClick={() => songApi.toggleFavorite(song.id)}>
       {song.is_favorite ? '⭐' : '☆'}
   </button>
   ```

## Best Practices

### Rust
- Use `Result<T, E>` for error handling
- Prefer `&str` over `String` for function parameters
- Use `Clone` sparingly (prefer references)
- Always use `unwrap_or_default()` instead of `unwrap()`
- Write unit tests for repository methods

### TypeScript
- Always define interfaces for data structures
- Use async/await for Tauri commands
- Handle errors with try/catch
- Use functional components with hooks
- Keep components focused and single-purpose

### Database
- Always use parameterized queries
- Create indexes for frequently queried columns
- Use transactions for multiple related operations
- Handle NULL values properly
- Backup database before schema changes

### UI/UX
- Follow the existing design system
- Use consistent spacing and colors
- Provide loading states
- Show error messages clearly
- Add keyboard shortcuts for common actions

## Debugging

### Backend Debugging

1. **Enable logging:**
   ```bash
   RUST_LOG=debug npm run tauri dev
   ```

2. **Add debug prints:**
   ```rust
   log::debug!("Processing song: {:?}", song);
   log::error!("Database error: {}", err);
   ```

### Frontend Debugging

1. **Open DevTools:** `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Option+I` (Mac)

2. **Console logging:**
   ```typescript
   console.log('Data:', data);
   console.error('Error:', error);
   ```

3. **Network inspection:**
   - Check Tauri command calls
   - Verify request/response payloads

### Database Debugging

1. **View database:**
   ```bash
   sqlite3 ~/Library/Application\ Support/com.worshipflow.pro/worshipflow.db
   # or
   sqlite3 ~/.local/share/com.worshipflow.pro/worshipflow.db
   ```

2. **Common queries:**
   ```sql
   -- List all tables
   .tables
   
   -- Show table structure
   .schema songs
   
   -- View data
   SELECT * FROM songs LIMIT 10;
   ```

## Performance Tips

1. **Lazy load data:** Don't load everything at startup
2. **Use indexes:** Create indexes for search columns
3. **Batch operations:** Group multiple operations
4. **Debounce search:** Wait for user to stop typing
5. **Virtual scrolling:** For large lists
6. **Memoization:** Cache expensive computations

## Testing Checklist

Before committing:
- [ ] Code compiles without warnings
- [ ] All tests pass
- [ ] UI is responsive
- [ ] Database operations work
- [ ] Error handling is proper
- [ ] Code is formatted
- [ ] Documentation is updated

---

Happy coding! 🚀
