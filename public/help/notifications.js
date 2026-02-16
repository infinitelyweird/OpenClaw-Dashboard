// notifications.js — Notification center frontend
(function() {
  'use strict';

  const POLL_INTERVAL = 30000; // 30 seconds
  let panel = null;
  let isOpen = false;
  let pollTimer = null;

  const TYPE_ICONS = {
    info:    'ℹ️',
    success: '✅',
    warning: '⚠️',
    error:   '❌',
    task:    '📋',
    admin:   '👑',
    system:  '🖥️'
  };

  function timeAgo(dateStr) {
    const now = Date.now();
    const then = new Date(dateStr).getTime();
    const diff = Math.floor((now - then) / 1000);
    if (diff < 60)   return 'just now';
    if (diff < 3600)  return Math.floor(diff / 60) + 'm ago';
    if (diff < 86400) return Math.floor(diff / 3600) + 'h ago';
    if (diff < 604800) return Math.floor(diff / 86400) + 'd ago';
    return new Date(dateStr).toLocaleDateString();
  }

  function getHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      'Authorization': token ? 'Bearer ' + token : ''
    };
  }

  // ── Fetch notifications from API ──
  async function fetchNotifications() {
    try {
      const res = await fetch('/api/notifications?limit=30', { headers: getHeaders() });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  // ── Update badge count ──
  function updateBadge(count) {
    const badge = document.querySelector('.notif-badge');
    if (!badge) return;
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
      badge.classList.add('pop');
      setTimeout(() => badge.classList.remove('pop'), 300);
    } else {
      badge.classList.add('hidden');
    }
  }

  // ── Render notification list ──
  function renderList(data) {
    const list = panel.querySelector('.notif-list');
    if (!data || !data.notifications || data.notifications.length === 0) {
      list.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🔔</div><div class="notif-empty-text">No notifications yet.<br>You\'re all caught up!</div></div>';
      return;
    }

    list.innerHTML = data.notifications.map(n => {
      const icon = TYPE_ICONS[n.Type] || TYPE_ICONS.info;
      const unreadClass = n.IsRead ? '' : ' unread';
      return '<div class="notif-item' + unreadClass + '" data-id="' + n.Id + '"' + (n.Link ? ' data-link="' + n.Link + '"' : '') + '>' +
        '<div class="notif-icon ' + (n.Type || 'info') + '">' + icon + '</div>' +
        '<div class="notif-content">' +
          '<div class="notif-title">' + escapeHtml(n.Title) + '</div>' +
          (n.Message ? '<div class="notif-message">' + escapeHtml(n.Message) + '</div>' : '') +
          '<div class="notif-time">' + timeAgo(n.CreatedAt) + '</div>' +
        '</div>' +
        '<div class="notif-actions">' +
          (!n.IsRead ? '<button class="notif-action-btn" data-action="read" title="Mark as read">✓</button>' : '') +
          '<button class="notif-action-btn" data-action="delete" title="Dismiss">✕</button>' +
        '</div>' +
      '</div>';
    }).join('');

    // Click handlers
    list.querySelectorAll('.notif-item').forEach(item => {
      item.addEventListener('click', async (e) => {
        // Check if an action button was clicked
        const actionBtn = e.target.closest('.notif-action-btn');
        if (actionBtn) {
          e.stopPropagation();
          const id = item.dataset.id;
          const action = actionBtn.dataset.action;
          if (action === 'read') {
            await markRead(id);
            item.classList.remove('unread');
            item.querySelector('.notif-item::before')
            actionBtn.remove();
          } else if (action === 'delete') {
            await deleteNotification(id);
            item.remove();
            // Check if empty
            if (!list.querySelector('.notif-item')) {
              list.innerHTML = '<div class="notif-empty"><div class="notif-empty-icon">🔔</div><div class="notif-empty-text">No notifications yet.<br>You\'re all caught up!</div></div>';
            }
          }
          refreshCount();
          return;
        }

        // Click on notification body — mark read and navigate if link
        const id = item.dataset.id;
        if (item.classList.contains('unread')) {
          await markRead(id);
          item.classList.remove('unread');
          refreshCount();
        }
        if (item.dataset.link) {
          window.location.href = item.dataset.link;
        }
      });
    });
  }

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // ── API actions ──
  async function markRead(id) {
    try {
      await fetch('/api/notifications/read/' + id, { method: 'POST', headers: getHeaders() });
    } catch {}
  }

  async function markAllRead() {
    try {
      await fetch('/api/notifications/read-all', { method: 'POST', headers: getHeaders() });
      // Update UI
      panel.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
      panel.querySelectorAll('.notif-action-btn[data-action="read"]').forEach(el => el.remove());
      updateBadge(0);
    } catch {}
  }

  async function deleteNotification(id) {
    try {
      await fetch('/api/notifications/' + id, { method: 'DELETE', headers: getHeaders() });
    } catch {}
  }

  async function refreshCount() {
    const data = await fetchNotifications();
    if (data) updateBadge(data.unreadCount);
  }

  // ── Build panel DOM ──
  function createPanel() {
    panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.innerHTML =
      '<div class="notif-header">' +
        '<span class="notif-header-title">Notifications</span>' +
        '<button class="notif-mark-all">Mark all read</button>' +
      '</div>' +
      '<div class="notif-list"></div>';

    panel.querySelector('.notif-mark-all').addEventListener('click', (e) => {
      e.stopPropagation();
      markAllRead();
    });

    // Prevent clicks inside panel from closing it
    panel.addEventListener('click', (e) => e.stopPropagation());

    return panel;
  }

  // ── Toggle panel ──
  async function toggle() {
    if (!panel) {
      panel = createPanel();
      document.querySelector('.notif-wrapper').appendChild(panel);
    }

    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add('open');
      const data = await fetchNotifications();
      if (data) {
        renderList(data);
        updateBadge(data.unreadCount);
      }
    } else {
      panel.classList.remove('open');
    }
  }

  function close() {
    if (isOpen && panel) {
      isOpen = false;
      panel.classList.remove('open');
    }
  }

  // ── Initialize ──
  function init() {
    // Replace the static bell button in the header
    const headerRight = document.querySelector('.header-right');
    if (!headerRight) return;

    // Find and replace existing bell button
    const existingBell = headerRight.querySelector('[title="Notifications"]');
    if (existingBell) {
      const wrapper = document.createElement('div');
      wrapper.className = 'notif-wrapper';
      wrapper.innerHTML = '<button class="notif-btn" title="Notifications">🔔<span class="notif-badge hidden">0</span></button>';
      wrapper.querySelector('.notif-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        toggle();
      });
      existingBell.replaceWith(wrapper);
    }

    // Close on outside click
    document.addEventListener('click', close);

    // Initial count fetch
    refreshCount();

    // Poll for new notifications
    pollTimer = setInterval(refreshCount, POLL_INTERVAL);
  }

  // ── Load CSS ──
  if (!document.querySelector('link[href="notifications.css"]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'notifications.css';
    document.head.appendChild(link);
  }

  // Wait for nav.js to inject the shell, then init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => setTimeout(init, 50));
  } else {
    setTimeout(init, 50);
  }

  // Expose for other modules to trigger refreshes
  window.NotificationCenter = { refresh: refreshCount, close: close };
})();
