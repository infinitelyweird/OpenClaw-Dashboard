# Versioning & Module Architecture

## Snapshots

### Create a Snapshot
```powershell
.\scripts\snapshot.ps1 "description of changes"
.\scripts\snapshot.ps1                          # uses "Auto-snapshot"
```
Creates a git commit tagged `snapshot/YYYY-MM-DD-HHmmss`.

### View History
```powershell
.\scripts\history.ps1            # all snapshots
.\scripts\history.ps1 -last 5   # last 5
```

### Rollback
```powershell
.\scripts\rollback.ps1 -list                           # list available
.\scripts\rollback.ps1 -latest                          # rollback to latest
.\scripts\rollback.ps1 -tag "snapshot/2026-02-14-191500" # specific tag
```
A safety snapshot is always created before rollback.

## Module Architecture

All frontend modules live in `public/modules/`. Each is a self-contained IIFE that registers with `ModuleLoader`.

### Available Modules
| Module | Purpose |
|--------|---------|
| `module-loader` | Registry & lifecycle manager |
| `sidebar` | Navigation sidebar |
| `theme` | Light/dark theme toggle |
| `auth` | JWT token management & auth guards |
| `api` | Centralized fetch wrapper with retry |
| `toast` | Stackable notifications |
| `charts` | Canvas charts (line, bar, donut) |
| `modal` | Dialog & confirm modals |

### Using Modules in a Page
```html
<script src="/modules/module-loader.js"></script>
<script src="/modules/theme.js"></script>
<script src="/modules/toast.js"></script>
<script>
  const theme = ModuleLoader.init('theme', document.body);
  const toast = ModuleLoader.init('toast');
  toast.success('Page loaded!');
</script>
```

### Adding a New Module
1. Create `public/modules/your-module.js` following the IIFE pattern
2. Register with `ModuleLoader.register('your-module', { version, init, destroy })`
3. Add version to `version.json`
4. Load via `<script>` and call `ModuleLoader.init('your-module', container, options)`

### Module Pattern
```javascript
(function() {
  const MODULE_VERSION = '1.0.0';
  // ... module code ...
  if (window.ModuleLoader) {
    ModuleLoader.register('moduleName', {
      version: MODULE_VERSION,
      init: function(container, options) { /* return public API */ },
      destroy: function() { /* cleanup */ }
    });
  }
})();
```

### Naming Conventions
- Module files: lowercase, hyphenated (`my-module.js`)
- Registration names: same as filename without `.js`
- Tags: `snapshot/YYYY-MM-DD-HHmmss`
- Commits: `[snapshot] YYYY-MM-DD HH:mm:ss — description`

## API Endpoints
- `GET /api/version` — Returns version manifest
- `GET /api/health` — Returns `{ status, uptime, version, timestamp }`
