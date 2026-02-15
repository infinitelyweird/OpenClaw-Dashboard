// nav.js — Shared navigation logic for Infinitely Weird DevOps Dashboard
(function () {
  'use strict';

  // ── JWT helpers ──
  function getToken() { return localStorage.getItem('token'); }

  function parseJwt(token) {
    try {
      const b = token.split('.')[1];
      return JSON.parse(atob(b.replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return null; }
  }

  function getUser() {
    const t = getToken();
    if (!t) return null;
    const payload = parseJwt(t);
    if (!payload) return null;
    return {
      username: payload.username || payload.sub || 'User',
      roles: payload.roles || [],
      userId: payload.userId || payload.id,
      isAdmin: payload.isAdmin || false
    };
  }

  function requireAuth() {
    if (!getToken()) { window.location.href = 'login.html'; return false; }
    return true;
  }

  // ── Theme ──
  function getTheme() { return localStorage.getItem('theme') || 'dark'; }
  function setTheme(t) {
    localStorage.setItem('theme', t);
    document.documentElement.setAttribute('data-theme', t);
    if (t !== 'light') localStorage.setItem('preferred-dark-theme', t);
  }
  function toggleTheme() {
    const cur = getTheme();
    let next;
    if (cur === 'light') {
      next = localStorage.getItem('preferred-dark-theme') || 'dark-purple';
    } else {
      next = 'light';
    }
    setTheme(next);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = next === 'light' ? '☀️' : '🌙';
  }

  // ── Active page ──
  function currentPage() {
    const p = window.location.pathname.split('/').pop() || 'index.html';
    return p;
  }

  // ── Nav items ──
  const navItems = [
    { icon: '🏠', label: 'Dashboard', href: 'index.html' },
    { icon: '📊', label: 'Dashboards', href: 'dashboards.html' },
    { icon: '📋', label: 'Tasks', href: 'tasks.html' },
    { icon: '📁', label: 'Projects', href: 'projects.html' },
    { icon: '🚀', label: 'Deployments', href: 'deployments.html' },
    { icon: '🖥️', label: 'Systems', href: 'systems.html' },
    { icon: '🌐', label: 'Network', href: 'network.html' },
    { icon: '🛡️', label: 'Security', href: 'security.html' },
    { icon: '👥', label: 'Admin', href: 'admin.html', adminOnly: true },
    { icon: '👤', label: 'Profile', href: 'profile.html' },
  ];

  // ── Inject shell ──
  function injectShell() {
    const user = getUser();
    const page = currentPage();
    const isAdmin = user && (user.isAdmin || (user.roles && user.roles.includes('admin')) || (user.roles && user.roles.includes('Administrator')));
    const initials = user ? user.username.slice(0, 2).toUpperCase() : '??';
    const theme = getTheme();

    const navLinks = navItems
      .filter(n => !n.adminOnly || isAdmin)
      .map(n => `<a href="${n.href}" class="${page === n.href ? 'active' : ''}"><span class="nav-icon">${n.icon}</span>${n.label}</a>`)
      .join('');

    // Create sidebar
    const sidebar = document.createElement('aside');
    sidebar.className = 'sidebar';
    sidebar.id = 'sidebar';
    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <span class="brand-icon">∞</span>
        <span>Infinitely Weird</span>
      </div>
      <nav class="sidebar-nav">${navLinks}</nav>
      <div class="sidebar-version">
        <span class="version-number">v0.5.0</span>
        <span class="version-tag">Alpha5</span>
      </div>
    `;

    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebar-overlay';
    overlay.onclick = () => closeSidebar();

    // Create header
    const header = document.createElement('header');
    header.className = 'header-bar';
    header.innerHTML = `
      <div class="header-left">
        <button class="mobile-toggle" id="mobile-toggle" onclick="window.__toggleSidebar()">☰</button>
        <div class="header-search">
          <span class="search-icon">🔍</span>
          <input type="text" placeholder="Search anything..." />
        </div>
      </div>
      <div class="header-right">
        <button class="header-btn" id="theme-toggle" onclick="window.__toggleTheme()" title="Toggle theme">${theme === 'light' ? '☀️' : '🌙'}</button>
        <button class="header-btn" title="Notifications">🔔<span class="badge"></span></button>
        <div class="user-menu" id="user-menu">
          <div class="user-info" onclick="window.__toggleUserMenu(event)">
            <div class="user-avatar">${initials}</div>
            <span class="user-name">${user ? user.username : 'Guest'}</span>
          </div>
          <div class="user-dropdown" id="user-dropdown">
            <div class="dropdown-user-info">
              <div class="dropdown-username">${user ? user.username : 'Guest'}</div>
              <div class="dropdown-email">${user ? (user.username + '@infinitelyweird.dev') : ''}</div>
            </div>
            <div class="dropdown-divider"></div>
            <a class="dropdown-item" href="profile.html">👤 Profile</a>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item" onclick="window.__switchUser()">🔄 Switch User</button>
            <button class="dropdown-item dropdown-item--danger" onclick="window.__logout()">🚪 Log Off</button>
          </div>
        </div>
      </div>
    `;

    // Wrap existing content
    const body = document.body;
    const existingContent = document.getElementById('page-content');

    // Build layout
    const layout = document.createElement('div');
    layout.className = 'app-layout';

    const main = document.createElement('main');
    main.className = 'main-content';
    main.appendChild(header);

    if (existingContent) {
      existingContent.classList.add('page-content');
      main.appendChild(existingContent);
    }

    layout.appendChild(sidebar);
    layout.appendChild(overlay);
    layout.appendChild(main);

    body.prepend(layout);

    // Inject global tooltip system
    if (!document.querySelector('link[href="tooltips.css"]')) {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = 'tooltips.css';
      document.head.appendChild(link);
    }
    if (!document.querySelector('script[src="tooltips.js"]')) {
      const script = document.createElement('script');
      script.src = 'tooltips.js';
      document.body.appendChild(script);
    }

    // Apply theme
    setTheme(theme);
  }

  // ── Sidebar toggle ──
  function openSidebar() {
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('sidebar-overlay')?.classList.add('active');
  }
  function closeSidebar() {
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('active');
  }

  // ── User menu ──
  function toggleUserMenu(e) {
    e.stopPropagation();
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.toggle('open');
  }

  function closeUserMenu() {
    const dd = document.getElementById('user-dropdown');
    if (dd) dd.classList.remove('open');
  }

  function logout() {
    localStorage.clear();
    window.location.href = 'login.html';
  }

  function switchUser() {
    localStorage.removeItem('token');
    // Brief toast before redirect
    const toast = document.createElement('div');
    toast.textContent = 'Switching user...';
    toast.style.cssText = 'position:fixed;bottom:2rem;left:50%;transform:translateX(-50%);background:var(--accent,#a78bfa);color:#fff;padding:0.5rem 1.5rem;border-radius:8px;z-index:9999;font-weight:600;';
    document.body.appendChild(toast);
    setTimeout(() => { window.location.href = 'login.html'; }, 600);
  }

  // Close dropdown on outside click
  document.addEventListener('click', closeUserMenu);

  // ── Expose globals ──
  window.__toggleUserMenu = toggleUserMenu;
  window.__logout = logout;
  window.__switchUser = switchUser;
  window.__toggleTheme = toggleTheme;
  window.__toggleSidebar = function () {
    const s = document.getElementById('sidebar');
    s?.classList.contains('open') ? closeSidebar() : openSidebar();
  };

  // ── API helper ──
  window.apiFetch = async function (url, opts = {}) {
    const token = getToken();
    const headers = { 'Content-Type': 'application/json', ...(opts.headers || {}) };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(url, { ...opts, headers });
    if (res.status === 401) { localStorage.removeItem('token'); window.location.href = 'login.html'; return null; }
    return res;
  };

  // ── Init ──
  function init() {
    // Only inject shell on authenticated pages (not login/register)
    const page = currentPage();
    if (page === 'login.html' || page === 'register.html') return;
    if (!requireAuth()) return;
    injectShell();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
