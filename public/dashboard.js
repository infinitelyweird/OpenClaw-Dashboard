// dashboard.js — Drag & Drop Widget Framework for Infinitely Weird DevOps Dashboard
(function () {
  'use strict';

  const pageName = location.pathname.split('/').pop().replace(/\.html?$/, '') || 'index';
  const ORDER_KEY = `widget-order-${pageName}`;
  const SIZE_KEY = `widget-sizes-${pageName}`;
  const HIDDEN_KEY = `widget-hidden-${pageName}`;

  let editMode = false;
  let draggedWidget = null;
  let touchClone = null;
  let touchStartX = 0, touchStartY = 0;

  // ── Helpers ──
  function getWidgets() {
    return Array.from(document.querySelectorAll('.dashboard-widget'));
  }

  function getGrid(widget) {
    return widget.closest('.kpi-grid, .widgets-grid, .dashboard-grid') || widget.parentElement;
  }

  function toast(msg) {
    let el = document.querySelector('.dashboard-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'dashboard-toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    requestAnimationFrame(() => {
      el.classList.add('show');
      setTimeout(() => el.classList.remove('show'), 2000);
    });
  }

  // ── Persistence ──
  function saveOrder() {
    const grids = document.querySelectorAll('.kpi-grid, .widgets-grid, .dashboard-grid');
    const order = {};
    grids.forEach(grid => {
      const gridId = grid.id || grid.className;
      order[gridId] = Array.from(grid.querySelectorAll(':scope > .dashboard-widget'))
        .map(w => w.dataset.widgetId)
        .filter(Boolean);
    });
    localStorage.setItem(ORDER_KEY, JSON.stringify(order));
  }

  function restoreOrder() {
    try {
      const order = JSON.parse(localStorage.getItem(ORDER_KEY));
      if (!order) return;
      Object.entries(order).forEach(([gridKey, ids]) => {
        const grid = document.getElementById(gridKey) ||
          document.querySelector(`.${gridKey.split(' ')[0]}`);
        if (!grid || !ids.length) return;
        ids.forEach(id => {
          const widget = grid.querySelector(`[data-widget-id="${id}"]`);
          if (widget) grid.appendChild(widget);
        });
      });
    } catch {}
  }

  function saveSizes() {
    const sizes = {};
    getWidgets().forEach(w => {
      if (w.dataset.widgetSize) sizes[w.dataset.widgetId] = w.dataset.widgetSize;
    });
    localStorage.setItem(SIZE_KEY, JSON.stringify(sizes));
  }

  function restoreSizes() {
    try {
      const sizes = JSON.parse(localStorage.getItem(SIZE_KEY));
      if (!sizes) return;
      Object.entries(sizes).forEach(([id, size]) => {
        const w = document.querySelector(`[data-widget-id="${id}"]`);
        if (w) w.dataset.widgetSize = size;
      });
    } catch {}
  }

  function saveHidden() {
    const hidden = getWidgets().filter(w => w.classList.contains('widget-hidden'))
      .map(w => w.dataset.widgetId);
    localStorage.setItem(HIDDEN_KEY, JSON.stringify(hidden));
  }

  function restoreHidden() {
    try {
      const hidden = JSON.parse(localStorage.getItem(HIDDEN_KEY));
      if (!hidden) return;
      hidden.forEach(id => {
        const w = document.querySelector(`[data-widget-id="${id}"]`);
        if (w) w.classList.add('widget-hidden');
      });
    } catch {}
  }

  // ── Controls injection ──
  function injectControls(widget) {
    if (widget.querySelector('.widget-drag-handle')) return;

    const handle = document.createElement('div');
    handle.className = 'widget-drag-handle';
    handle.textContent = '⠿';
    handle.title = 'Drag to reorder';

    const resizeBtn = document.createElement('div');
    resizeBtn.className = 'widget-resize-btn';
    resizeBtn.textContent = '⇲';
    resizeBtn.title = 'Resize widget';

    const resizeMenu = document.createElement('div');
    resizeMenu.className = 'widget-resize-menu';
    ['small', 'medium', 'large'].forEach(size => {
      const btn = document.createElement('button');
      btn.textContent = size.charAt(0).toUpperCase() + size.slice(1);
      btn.dataset.size = size;
      if (widget.dataset.widgetSize === size) btn.classList.add('active');
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        widget.dataset.widgetSize = size;
        resizeMenu.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        resizeMenu.classList.remove('open');
        saveSizes();
        toast('Layout saved ✓');
      });
      resizeMenu.appendChild(btn);
    });

    resizeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      document.querySelectorAll('.widget-resize-menu.open').forEach(m => {
        if (m !== resizeMenu) m.classList.remove('open');
      });
      resizeMenu.classList.toggle('open');
    });

    const hideBtn = document.createElement('div');
    hideBtn.className = 'widget-hide-btn';
    hideBtn.textContent = '👁';
    hideBtn.title = 'Hide/show widget';
    hideBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      widget.classList.toggle('widget-hidden');
      saveHidden();
      toast('Layout saved ✓');
    });

    widget.appendChild(handle);
    widget.appendChild(hideBtn);
    widget.appendChild(resizeBtn);
    widget.appendChild(resizeMenu);
  }

  // ── Drag & Drop ──
  function onDragStart(e) {
    if (!editMode) { e.preventDefault(); return; }
    draggedWidget = e.currentTarget;
    draggedWidget.classList.add('widget-dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', draggedWidget.dataset.widgetId);
  }

  function onDragOver(e) {
    if (!editMode || !draggedWidget) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.currentTarget;
    if (target === draggedWidget) return;
    target.classList.add('widget-drop-target');
  }

  function onDragLeave(e) {
    e.currentTarget.classList.remove('widget-drop-target');
  }

  function onDrop(e) {
    e.preventDefault();
    const target = e.currentTarget;
    target.classList.remove('widget-drop-target');
    if (!draggedWidget || target === draggedWidget) return;

    const grid = getGrid(target);
    if (!grid) return;

    const siblings = Array.from(grid.querySelectorAll(':scope > .dashboard-widget'));
    const dragIdx = siblings.indexOf(draggedWidget);
    const dropIdx = siblings.indexOf(target);

    if (dragIdx < dropIdx) {
      grid.insertBefore(draggedWidget, target.nextSibling);
    } else {
      grid.insertBefore(draggedWidget, target);
    }

    saveOrder();
    toast('Layout saved ✓');
  }

  function onDragEnd() {
    if (draggedWidget) draggedWidget.classList.remove('widget-dragging');
    document.querySelectorAll('.widget-drop-target').forEach(el =>
      el.classList.remove('widget-drop-target'));
    draggedWidget = null;
  }

  // ── Touch support ──
  function onTouchStart(e) {
    if (!editMode) return;
    const handle = e.target.closest('.widget-drag-handle');
    if (!handle) return;
    draggedWidget = e.currentTarget;
    const touch = e.touches[0];
    touchStartX = touch.clientX;
    touchStartY = touch.clientY;
    draggedWidget.classList.add('widget-dragging');
  }

  function onTouchMove(e) {
    if (!draggedWidget) return;
    e.preventDefault();
    const touch = e.touches[0];
    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    if (!el) return;
    const target = el.closest('.dashboard-widget');
    document.querySelectorAll('.widget-drop-target').forEach(w =>
      w.classList.remove('widget-drop-target'));
    if (target && target !== draggedWidget) {
      target.classList.add('widget-drop-target');
    }
  }

  function onTouchEnd(e) {
    if (!draggedWidget) return;
    const dropTarget = document.querySelector('.widget-drop-target');
    if (dropTarget) {
      const grid = getGrid(dropTarget);
      if (grid) {
        const siblings = Array.from(grid.querySelectorAll(':scope > .dashboard-widget'));
        const dragIdx = siblings.indexOf(draggedWidget);
        const dropIdx = siblings.indexOf(dropTarget);
        if (dragIdx < dropIdx) {
          grid.insertBefore(draggedWidget, dropTarget.nextSibling);
        } else {
          grid.insertBefore(draggedWidget, dropTarget);
        }
        saveOrder();
        toast('Layout saved ✓');
      }
    }
    draggedWidget.classList.remove('widget-dragging');
    document.querySelectorAll('.widget-drop-target').forEach(w =>
      w.classList.remove('widget-drop-target'));
    draggedWidget = null;
  }

  function bindWidget(widget) {
    injectControls(widget);
    widget.addEventListener('dragstart', onDragStart);
    widget.addEventListener('dragover', onDragOver);
    widget.addEventListener('dragleave', onDragLeave);
    widget.addEventListener('drop', onDrop);
    widget.addEventListener('dragend', onDragEnd);
    widget.addEventListener('touchstart', onTouchStart, { passive: true });
    widget.addEventListener('touchmove', onTouchMove, { passive: false });
    widget.addEventListener('touchend', onTouchEnd);
  }

  // ── Edit Mode Toggle ──
  function setEditMode(on) {
    editMode = on;
    const grids = document.querySelectorAll('.kpi-grid, .widgets-grid, .dashboard-grid');
    grids.forEach(g => g.classList.toggle('edit-mode', on));
    getWidgets().forEach(w => {
      w.setAttribute('draggable', on ? 'true' : 'false');
    });
    const btn = document.querySelector('.dashboard-edit-btn');
    if (btn) {
      btn.classList.toggle('active', on);
      btn.textContent = on ? '✅ Done' : '✏️ Edit';
    }
    document.body.classList.toggle('dashboard-editing', on);
    // Close any open resize menus
    document.querySelectorAll('.widget-resize-menu.open').forEach(m => m.classList.remove('open'));
  }

  // ── Close resize menus on outside click ──
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.widget-resize-btn') && !e.target.closest('.widget-resize-menu')) {
      document.querySelectorAll('.widget-resize-menu.open').forEach(m => m.classList.remove('open'));
    }
  });

  // ── Init ──
  function init() {
    // Bind edit button if present
    const editBtn = document.querySelector('.dashboard-edit-btn');
    if (editBtn) {
      editBtn.addEventListener('click', () => setEditMode(!editMode));
    }

    // Bind all widgets
    getWidgets().forEach(bindWidget);

    // Restore saved state
    restoreOrder();
    restoreSizes();
    restoreHidden();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Expose for external use
  window.DashboardWidgets = { setEditMode, toast };
})();
