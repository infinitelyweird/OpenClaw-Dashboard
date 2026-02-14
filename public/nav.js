// nav.js — shared navigation bar component
// Include via <script src="nav.js"></script> on every authenticated page

(function () {
  const token = localStorage.getItem('token');
  if (!token) { window.location.href = '/login.html'; return; }

  // Decode JWT for user info
  function parseJwt(t) {
    try { return JSON.parse(atob(t.split('.')[1])); } catch { return {}; }
  }
  const user = parseJwt(token);
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function isActive(page) { return currentPage === page ? 'active' : ''; }

  // Build nav items
  const navItems = [
    { href: 'index.html', icon: '📊', label: 'Dashboard' },
    { href: 'tasks.html', icon: '✅', label: 'Tasks' },
  ];
  if (user.isAdmin) {
    navItems.push({ href: 'admin.html', icon: '⚙️', label: 'Admin' });
  }

  const nav = document.createElement('nav');
  nav.className = 'nav-bar';
  nav.innerHTML = `
    <a href="index.html" class="nav-brand"><span>Infinitely Weird</span> DevOps</a>
    <button class="nav-hamburger" id="nav-hamburger">☰</button>
    <ul class="nav-links" id="nav-links">
      ${navItems.map(item => `<li><a href="${item.href}" class="${isActive(item.href)}">${item.icon} ${item.label}</a></li>`).join('')}
    </ul>
    <div class="nav-right">
      <div style="position:relative;" id="nav-user-wrapper">
        <div id="nav-avatar-trigger"></div>
        <div class="nav-user-menu" id="nav-user-menu" style="display:none;">
          <div class="user-info-header">
            <strong id="nav-display-name">${user.username}</strong>
            <small>${user.username}</small>
          </div>
          <a href="profile.html">👤 My Profile</a>
          <a href="profile.html#password">🔒 Change Password</a>
          <div class="menu-divider"></div>
          <a href="#" id="nav-logout">🚪 Sign Out</a>
        </div>
      </div>
    </div>
  `;

  document.body.insertBefore(nav, document.body.firstChild);

  // Load avatar
  fetch('/api/profile', { headers: { 'Authorization': `Bearer ${token}` } })
    .then(r => r.json())
    .then(profile => {
      const trigger = document.getElementById('nav-avatar-trigger');
      const displayName = document.getElementById('nav-display-name');
      if (profile.DisplayName) displayName.textContent = profile.DisplayName;
      if (profile.AvatarPath) {
        trigger.innerHTML = `<img src="${profile.AvatarPath}" class="nav-avatar" alt="Avatar" />`;
      } else {
        const initials = (profile.DisplayName || profile.Username || '?').substring(0, 2).toUpperCase();
        trigger.innerHTML = `<div class="nav-avatar-placeholder">${initials}</div>`;
      }
    })
    .catch(() => {
      const trigger = document.getElementById('nav-avatar-trigger');
      const initials = (user.username || '?').substring(0, 2).toUpperCase();
      trigger.innerHTML = `<div class="nav-avatar-placeholder">${initials}</div>`;
    });

  // Toggle user menu
  document.getElementById('nav-avatar-trigger').addEventListener('click', (e) => {
    e.stopPropagation();
    const menu = document.getElementById('nav-user-menu');
    menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
  });
  document.addEventListener('click', () => {
    document.getElementById('nav-user-menu').style.display = 'none';
  });

  // Hamburger toggle
  document.getElementById('nav-hamburger').addEventListener('click', () => {
    document.getElementById('nav-links').classList.toggle('open');
  });

  // Logout
  document.getElementById('nav-logout').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('token');
    window.location.href = '/login.html';
  });
})();
