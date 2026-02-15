(function() {
  const MODULE_VERSION = '1.0.0';
  let sidebarEl = null;

  function createSidebar(container, options) {
    const nav = options.nav || [
      { label: 'Dashboard', href: '/dashboard.html', icon: '📊' },
      { label: 'Tasks', href: '/tasks.html', icon: '✅' },
      { label: 'Network', href: '/network-security.html', icon: '🔒' },
      { label: 'Speed Test', href: '/speedtest.html', icon: '⚡' },
      { label: 'Profile', href: '/profile.html', icon: '👤' },
      { label: 'Admin', href: '/admin.html', icon: '⚙️' }
    ];

    sidebarEl = document.createElement('nav');
    sidebarEl.className = 'module-sidebar';
    sidebarEl.innerHTML = '<div class="sidebar-header"><h2>' + (options.title || 'DevOps Dashboard') + '</h2></div>' +
      '<ul class="sidebar-nav">' + nav.map(function(item) {
        var active = window.location.pathname === item.href ? ' active' : '';
        return '<li><a href="' + item.href + '" class="sidebar-link' + active + '">' +
          '<span class="sidebar-icon">' + (item.icon || '') + '</span>' +
          '<span class="sidebar-label">' + item.label + '</span></a></li>';
      }).join('') + '</ul>';

    if (!document.getElementById('sidebar-styles')) {
      var style = document.createElement('style');
      style.id = 'sidebar-styles';
      style.textContent = '.module-sidebar{width:240px;min-height:100vh;background:var(--sidebar-bg,#1a1a2e);color:var(--sidebar-text,#e0e0e0);padding:0;display:flex;flex-direction:column}.sidebar-header{padding:20px;border-bottom:1px solid rgba(255,255,255,.1)}.sidebar-header h2{margin:0;font-size:1.1rem}.sidebar-nav{list-style:none;padding:10px 0;margin:0}.sidebar-link{display:flex;align-items:center;padding:12px 20px;color:inherit;text-decoration:none;transition:background .2s}.sidebar-link:hover,.sidebar-link.active{background:rgba(255,255,255,.1)}.sidebar-icon{margin-right:12px;font-size:1.2rem}.sidebar-label{font-size:.9rem}';
      document.head.appendChild(style);
    }

    container.prepend(sidebarEl);
    return sidebarEl;
  }

  if (window.ModuleLoader) {
    ModuleLoader.register('sidebar', {
      version: MODULE_VERSION,
      init: function(container, options) { return createSidebar(container, options); },
      destroy: function() { if (sidebarEl) { sidebarEl.remove(); sidebarEl = null; } }
    });
  }
})();
