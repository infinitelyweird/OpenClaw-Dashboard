// documentation.js — Dynamic, searchable documentation
(function() {
  'use strict';

  const DOCS = [
    {
      category: 'Getting Started',
      items: [
        { title: 'What is Infinitely Weird DevOps Dashboard?', content: 'A modern, security-focused dashboard for task management, system monitoring, and development tasks.' },
        { title: 'How do I log in?', content: 'Use your username and password provided by your system administrator. If you don\'t have one, request an account.' },
      ]
    },
    {
      category: 'Features',
      items: [
        { title: 'Task Management', content: 'Create, assign, and track tasks. Supports tags, priorities, and collaborative discussions.' },
        { title: 'Admin Tools', content: 'Manage user roles, groups, permissions, and more to customize the platform for your organization.' },
      ]
    },
    {
      category: 'APIs',
      items: [
        { title: 'GET /api/notifications', content: 'Fetch a list of notifications. Supports optional `limit` query parameter.`' },
        { title: 'POST /api/notifications', content: 'Create a new notification. Requires `userId`, `title`, and optional `type`, `message`, `link`.' },
        { title: 'POST /api/notifications/read/:id', content: 'Mark a notification as read by ID.' },
        { title: 'POST /api/notifications/read-all', content: 'Mark all notifications as read for the current user.' },
        { title: 'DELETE /api/notifications/:id', content: 'Delete a notification by ID.' },
      ]
    }
  ];

  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function renderCategories() {
    const container = document.getElementById('categories-list');
    if (!container) return;

    container.innerHTML = DOCS.map((cat, idx) => `
      <div class="category-card" data-idx="${idx}">
        <span>${cat.category}</span>
      </div>
    `).join('');

    // Add click handlers
    container.querySelectorAll('.category-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx);
        renderContent(idx);
      });
    });
  }

  function renderContent(idx) {
    const content = document.getElementById('doc-content');
    if (!content || !DOCS[idx]) return;

    const itemsHTML = DOCS[idx].items.map(item => `
      <div class="doc-item">
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.content)}</p>
      </div>
    `).join('');

    content.innerHTML = `<h2>${DOCS[idx].category}</h2>${itemsHTML}`;
  }

  function filterDocs(query) {
    const content = document.getElementById('doc-content');
    if (!content) return;

    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      // Reset
      document.querySelector('#doc-placeholder').style.display = 'block';
      return;
    }

    const results = DOCS.flatMap(cat => cat.items
      .filter(item => item.title.toLowerCase().includes(normalizedQuery) ||
                      item.content.toLowerCase().includes(normalizedQuery))
      .map(item => ({ ...item, category: cat.category })));

    if (results.length === 0) {
      content.innerHTML = '<p>No results found for "' + escapeHtml(query) + '"</p>';
      document.querySelector('#doc-placeholder').style.display = 'none';
      return;
    }

    // Render results
    document.querySelector('#doc-placeholder').style.display = 'none';
    content.innerHTML = results.map(r => `
      <div class="doc-item">
        <h3>${escapeHtml(r.title)}</h3>
        <p>${escapeHtml(r.content)}</p>
        <small>Category: <em>${escapeHtml(r.category)}</em></small>
      </div>
    `).join('');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderCategories);
  } else {
    renderCategories();
  }
})();