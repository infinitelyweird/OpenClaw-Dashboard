(function() {
  const MODULE_VERSION = '1.0.0';
  const STORAGE_KEY = 'devops-theme';
  let toggleBtn = null;
  let mediaQuery = null;
  let mediaHandler = null;

  function getPreferred() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return saved;
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) return 'light';
    return 'dark';
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
    if (toggleBtn) toggleBtn.textContent = theme === 'dark' ? '☀️' : '🌙';
  }

  function toggle() {
    var current = document.documentElement.getAttribute('data-theme') || 'dark';
    apply(current === 'dark' ? 'light' : 'dark');
  }

  if (window.ModuleLoader) {
    ModuleLoader.register('theme', {
      version: MODULE_VERSION,
      init: function(container, options) {
        apply(getPreferred());

        if (!options.noToggle) {
          toggleBtn = document.createElement('button');
          toggleBtn.className = 'theme-toggle';
          toggleBtn.title = 'Toggle theme';
          toggleBtn.addEventListener('click', toggle);
          if (!document.getElementById('theme-styles')) {
            var s = document.createElement('style');
            s.id = 'theme-styles';
            s.textContent = '.theme-toggle{position:fixed;top:12px;right:12px;z-index:9999;background:rgba(255,255,255,.15);border:none;border-radius:50%;width:40px;height:40px;font-size:1.2rem;cursor:pointer;backdrop-filter:blur(4px);transition:transform .2s}.theme-toggle:hover{transform:scale(1.1)}';
            document.head.appendChild(s);
          }
          (container || document.body).appendChild(toggleBtn);
          apply(getPreferred());
        }

        mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        mediaHandler = function() { if (!localStorage.getItem(STORAGE_KEY)) apply(getPreferred()); };
        mediaQuery.addEventListener('change', mediaHandler);

        return { apply: apply, toggle: toggle, current: function() { return document.documentElement.getAttribute('data-theme'); } };
      },
      destroy: function() {
        if (toggleBtn) { toggleBtn.remove(); toggleBtn = null; }
        if (mediaQuery && mediaHandler) { mediaQuery.removeEventListener('change', mediaHandler); }
      }
    });
  }
})();
