# MEMORY.md — Infinitely Weird DevOps Dashboard

## Project Overview
- **Stack**: Node.js + Express + MSSQL (SQL Server 2025)
- **DB**: `TaskDashboard` on `192.168.0.100\MSSQLSERVER01`, user `openclaw`
- **Port**: 1446 (via .env)
- **Auth**: bcrypt + JWT, admin approval required for new users
- **Email restriction**: `@infinitelyweird.com` only
- **Design**: macOS glass/frosted UI, CSS vars, backdrop-filter blur, Inter + Space Grotesk fonts
- **Git remote**: `https://github.com/openclaw/openclaw.git`

## Architecture Map

### Backend
| File | Purpose |
|------|---------|
| `app.js` | Express server, middleware chain, route mounts, static files |
| `db.js` | MSSQL connection pool (singleton via getPool) |
| `.env` | DB creds, JWT secret, port, NODE_ENV |
| `seed.js` | Seeds roles + admin user |
| `migrate.js` | Runs SQL migrations from `migrations/` |

### Middleware
| File | Purpose |
|------|---------|
| `middleware/auth.js` | `authenticateToken` (JWT verify), `requireAdmin` (role check) |
| `middleware/validate.js` | express-validator rules for login, register, profile, tasks |
| `middleware/audit.js` | Audit logging to console + AuditLog table |

### Routes
| File | Endpoints | Auth |
|------|-----------|------|
| `loginRoute.js` | POST /api/login | None (rate limited) |
| `registerRoute.js` | POST /api/register | None (rate limited) |
| `profileRoute.js` | GET/PUT /api/profile, POST avatar, POST change-password | authenticateToken |
| `adminRoute.js` | /api/admin/* (users, roles, groups, permissions, audit-logs) | authenticateToken + requireAdmin |
| `taskRoute.js` | /api/tasks/* CRUD, tags, user listing | authenticateToken |
| `widgetRoute.js` | /api/widgets/* | authenticateToken |
| `speedtestRoute.js` | /api/speedtest | — |
| `network-security.js` | Placeholder (returns string) | — |
| `versionRoute.js` | /api/version | — |

### Frontend Pages
| File | Purpose | Has Backend? |
|------|---------|-------------|
| `login.html` | Login form | ✓ |
| `register.html` | Registration form | ✓ |
| `index.html` | Main dashboard, KPI cards | ✓ (widgets) |
| `tasks.html` | Task CRUD, filtering, tags | ✓ |
| `profile.html` | User profile, avatar, password | ✓ |
| `admin.html` | User/role/group management | ✓ |
| `projects.html` | Project listing | ✗ MOCK DATA |
| `deployments.html` | Deployment pipelines | ✗ MOCK DATA |
| `systems.html` | System monitoring | Partial (systeminformation) |
| `network.html` | Network info | ✗ MOCK DATA |
| `security.html` | Security checks | ✗ SIMULATED |

### Shared Frontend
| File | Purpose |
|------|---------|
| `nav.js` | Sidebar + header + user dropdown (logout/switch/profile) |
| `nav.css` | Navigation styling |
| `styles.css` | Global glass design system |
| `dashboard.js` | Drag-and-drop widget framework |
| `dashboard.css` | Edit mode styling |
| `widgets.js/css` | Widget rendering |
| `icons.css` | Icon definitions |
| `main.js` | Dashboard frontend logic |

### Database Tables
Users, Roles, Groups, UserRoles, UserGroups, GroupRoles, Tasks, Tags, TaskTags, Permissions, RolePermissions, AuditLog

## Security Measures (2026-02-14)
- Helmet security headers
- Rate limiting: 10/15min on auth, 100/15min on API
- CORS restricted to known origins
- express-validator input validation on all forms
- Password policy: 8+ chars, uppercase, lowercase, number
- Audit logging on all auth + admin actions
- Parameterized SQL queries throughout (no raw string concat)
- JWT 24h expiry
- Admin approval required for new accounts
- File upload: 5MB limit, image types only

## Design Decisions
- **No external CSS/JS frameworks** — vanilla JS, custom CSS
- **Native HTML5 Drag & Drop** — no libraries, touch support built in
- **Per-page localStorage** — widget order/size/hidden keyed by page
- **Manual CORS** — no cors package, explicit header control
- **Migrations directory** — SQL files run in order by migrate.js
- **Non-blocking audit** — audit log writes don't fail requests

## User (Dustin)
- Timezone: America/New_York
- Prefers security-first, intuitive UX
- Wants maintainability — track changes so features can evolve without breaking things
- Uses parallel agent deployment for speed
