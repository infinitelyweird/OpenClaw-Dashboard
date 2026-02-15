(function() {
  const MODULE_VERSION = '1.0.0';
  let containerEl = null;

  var ICONS = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  var COLORS = { success: '#4caf50', error: '#f44336', warning: '#ff9800', info: '#2196f3' };

  function ensureContainer() {
    if (containerEl && document.body.contains(containerEl)) return;
    containerEl = document.createElement('div');
    containerEl.id = 'toast-container';
    if (!document.getElementById('toast-styles')) {
      var s = document.createElement('style');
      s.id = 'toast-styles';
      s.textContent = '#toast-container{position:fixed;top:20px;right:20px;z-index:99999;display:flex;flex-direction:column;gap:8px;pointer-events:none}.toast-item{pointer-events:auto;display:flex;align-items:center;gap:10px;padding:12px 18px;border-radius:8px;color:#fff;font-size:.9rem;box-shadow:0 4px 12px rgba(0,0,0,.3);animation:toastIn .3s ease;min-width:250px;max-width:400px}.toast-item.removing{animation:toastOut .3s ease forwards}.toast-icon{font-size:1.2rem;font-weight:bold}@keyframes toastIn{from{opacity:0;transform:translateX(100%)}to{opacity:1;transform:translateX(0)}}@keyframes toastOut{to{opacity:0;transform:translateX(100%)}}';
      document.head.appendChild(s);
    }
    document.body.appendChild(containerEl);
  }

  function show(type, message, duration) {
    ensureContainer();
    duration = duration || 4000;
    var el = document.createElement('div');
    el.className = 'toast-item';
    el.style.background = COLORS[type] || COLORS.info;
    el.innerHTML = '<span class="toast-icon">' + (ICONS[type] || ICONS.info) + '</span><span>' + message + '</span>';
    containerEl.appendChild(el);
    setTimeout(function() {
      el.classList.add('removing');
      setTimeout(function() { el.remove(); }, 300);
    }, duration);
    return el;
  }

  if (window.ModuleLoader) {
    ModuleLoader.register('toast', {
      version: MODULE_VERSION,
      init: function() {
        ensureContainer();
        return {
          success: function(msg, dur) { return show('success', msg, dur); },
          error: function(msg, dur) { return show('error', msg, dur); },
          warning: function(msg, dur) { return show('warning', msg, dur); },
          info: function(msg, dur) { return show('info', msg, dur); },
          show: show
        };
      },
      destroy: function() { if (containerEl) { containerEl.remove(); containerEl = null; } }
    });
  }
})();
