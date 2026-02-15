(function() {
  const MODULE_VERSION = '1.0.0';
  let overlayEl = null;
  let activeModal = null;

  function ensureStyles() {
    if (document.getElementById('modal-styles')) return;
    var s = document.createElement('style');
    s.id = 'modal-styles';
    s.textContent = '.modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:99998;display:flex;align-items:center;justify-content:center;animation:modalFadeIn .2s ease}.modal-box{background:var(--modal-bg,#1e1e2e);color:var(--modal-text,#e0e0e0);border-radius:12px;padding:24px;min-width:320px;max-width:90vw;max-height:85vh;overflow-y:auto;box-shadow:0 8px 32px rgba(0,0,0,.5);animation:modalSlideIn .2s ease}.modal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:16px}.modal-header h3{margin:0;font-size:1.2rem}.modal-close{background:none;border:none;color:inherit;font-size:1.4rem;cursor:pointer;padding:4px 8px;border-radius:4px}.modal-close:hover{background:rgba(255,255,255,.1)}.modal-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.modal-btn{padding:8px 20px;border:none;border-radius:6px;cursor:pointer;font-size:.9rem}.modal-btn-primary{background:#4caf50;color:#fff}.modal-btn-cancel{background:rgba(255,255,255,.1);color:inherit}.modal-btn:hover{opacity:.85}@keyframes modalFadeIn{from{opacity:0}to{opacity:1}}@keyframes modalSlideIn{from{transform:translateY(-20px);opacity:0}to{transform:translateY(0);opacity:1}}';
    document.head.appendChild(s);
  }

  function close() {
    if (overlayEl) { overlayEl.remove(); overlayEl = null; activeModal = null; }
  }

  function open(options) {
    close();
    ensureStyles();
    options = options || {};
    overlayEl = document.createElement('div');
    overlayEl.className = 'modal-overlay';
    if (options.closeOnOverlay !== false) {
      overlayEl.addEventListener('click', function(e) { if (e.target === overlayEl) close(); });
    }

    var box = document.createElement('div');
    box.className = 'modal-box';

    // Header
    var header = document.createElement('div');
    header.className = 'modal-header';
    header.innerHTML = '<h3>' + (options.title || '') + '</h3>';
    var closeBtn = document.createElement('button');
    closeBtn.className = 'modal-close';
    closeBtn.textContent = '×';
    closeBtn.addEventListener('click', close);
    header.appendChild(closeBtn);
    box.appendChild(header);

    // Body
    var body = document.createElement('div');
    body.className = 'modal-body';
    if (typeof options.content === 'string') {
      body.innerHTML = options.content;
    } else if (options.content instanceof HTMLElement) {
      body.appendChild(options.content);
    }
    box.appendChild(body);

    // Footer
    if (options.buttons !== false) {
      var footer = document.createElement('div');
      footer.className = 'modal-footer';
      if (options.showCancel !== false) {
        var cancelBtn = document.createElement('button');
        cancelBtn.className = 'modal-btn modal-btn-cancel';
        cancelBtn.textContent = options.cancelText || 'Cancel';
        cancelBtn.addEventListener('click', function() { if (options.onCancel) options.onCancel(); close(); });
        footer.appendChild(cancelBtn);
      }
      var okBtn = document.createElement('button');
      okBtn.className = 'modal-btn modal-btn-primary';
      okBtn.textContent = options.okText || 'OK';
      okBtn.addEventListener('click', function() { if (options.onOk) options.onOk(body); close(); });
      footer.appendChild(okBtn);
      box.appendChild(footer);
    }

    overlayEl.appendChild(box);
    document.body.appendChild(overlayEl);
    activeModal = box;

    // Escape key
    var escHandler = function(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', escHandler); } };
    document.addEventListener('keydown', escHandler);

    return { close: close, body: body, box: box };
  }

  function confirm(message, onConfirm, onCancel) {
    return open({
      title: 'Confirm',
      content: '<p>' + message + '</p>',
      okText: 'Confirm',
      onOk: onConfirm,
      onCancel: onCancel
    });
  }

  if (window.ModuleLoader) {
    ModuleLoader.register('modal', {
      version: MODULE_VERSION,
      init: function() {
        ensureStyles();
        return { open: open, close: close, confirm: confirm };
      },
      destroy: function() { close(); }
    });
  }
})();
