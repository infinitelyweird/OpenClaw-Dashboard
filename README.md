# OpenClaw Dashboard

OpenClaw Dashboard is a security-first and intuitive DevOps dashboard built to streamline system monitoring, manage tasks, and enhance visibility across deployments, projects, and system health. It includes customizable widgets, glassy UI design, and drag-and-drop editing features.

---

## 🚀 Features

- **Customizable Widgets:**
  - Drag, drop, and resize widgets to personalize your dashboard layout.
  - Includes Task, Project, System Monitoring, Activity Feed, and more widgets.

- **Intuitive Edit Mode:**
  - Toggle `Edit` mode to quickly configure widgets.
  - Drag-and-drop functionality for visual simplicity.

- **MacOS-style Frosted Glass Design:**
  - Stylish and modern UI using CSS variables and `backdrop-filter` effects.

- **Role-based Access Control (RBAC):**
  - Assign roles and manage user permissions securely.

- **Real-time Monitoring:**
  - Dashboards present KPIs for ongoing deployments, task counts, and more.

- **Fast, Lightweight Design:**
  - No external frameworks for UI—entirely custom-built.

---

## 🔧 Installation

### Requirements:
- **Node.js** (v16+ recommended)
- **Git** installed on your system
- **SQL Server** (for TaskDashboard database)
- **Environment Variables:** Set up a `.env` file as shown below:

```env
NODE_ENV=production
DB_HOST=192.168.0.100
DB_PORT=1446
DB_NAME=TaskDashboard
DB_USERNAME=openclaw
DB_PASSWORD=your-secure-password
PORT=3000
JWT_SECRET=your-jwt-secret
```

---

### Steps to Run Locally:

1. **Clone this Repository:**

   ```bash
   git clone https://github.com/infinitelyweird/OpenClaw-Dashboard.git
   cd OpenClaw-Dashboard
   ```

2. **Install Dependencies:**

   ```bash
   npm install
   ```

3. **Setup the Database:**

   - Make sure the `TaskDashboard` database exists on the provided **host** and **port**.
   - Run migrations using `migrate.js`. Example:

     ```bash
     node migrate.js
     ```

4. **Run the App:**

   ```bash
   npm start
   ```

5. Open the app in your browser at `http://localhost:3000`.

---

## 📁 Project Structure

```plaintext
OpenClaw-Dashboard/
│
├── public/            # Frontend files (HTML, JS, CSS)
│   ├── documentation.*
│   ├── dashboard.*    # Main dashboard frontend
│   ├── widgets-grid/  # Widget styles
│   └── nav.css        # Shared navigation styles
│
├── routes/            # Express API routes
│   ├── taskRoute.js   # Task-related actions
│   ├── domainRoute.js # Domain/security-focused API
│   ├── ...
│
├── migrations/        # Database SQL migrations
│
├── app.js             # Core Express server setup
├── db.js              # MSSQL Database utilities
└── migrate.js         # Applies DB schema changes
```

---

## 🌟 Contributing

We welcome contributions! Follow the steps below:

1. **Fork the Repository:** [OpenClaw-Dashboard](https://github.com/infinitelyweird/OpenClaw-Dashboard/fork)
2. **Create a New Branch:**

   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Commit and Push Your Changes:**

   ```bash
   git add .
   git commit -m "Your descriptive commit message"
   git push origin feature/your-feature-name
   ```

4. Create a Pull Request 👾 on GitHub.

---

## 🛡️ License

This project is licensed under the MIT License—anyone can use or modify the code for personal or commercial purposes.
