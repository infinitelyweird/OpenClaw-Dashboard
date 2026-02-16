// This script handles the UI and logic for the Domain Tests widget
(function () {
  'use strict';

  const API_URL = '/api/domains';
  const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' };
  const widgetRoot = document.getElementById('domainTests');
  const domainList = widgetRoot.querySelector('.domain-list');
  const freqInput = widgetRoot.querySelector('#checkFrequency');

  async function fetchDomains() {
    try {
      const response = await fetch(API_URL, { headers });
      const domains = await response.json();
      renderDomains(domains);
    } catch (error) {
      console.error('Error fetching domains:', error);
    }
  }

  function renderDomains(domains) {
    domainList.innerHTML = domains.map(domain => `
      <li class="domain-item" data-id="${domain.DomainID}">
        <input type="text" value="${domain.DomainName}" class="domain-name"/>
        <label title="Enabled">
          <input type="checkbox" class="enabled-toggle" ${domain.Enabled ? 'checked' : ''} />
          <span>Enabled</span>
        </label>
        <button class="delete-domain">Delete</button>
      </li>
    `).join('');

    setupEventListeners(domains);
  }

  function setupEventListeners() {
    // Delete domain event
    domainList.querySelectorAll('.delete-domain').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        const parent = e.target.closest('.domain-item');
        const domainId = parent.dataset.id;
        if (confirm('Delete this domain?')) {
          try {
            await fetch(`${API_URL}/${domainId}`, { method: 'DELETE', headers });
            parent.remove();
          } catch (error) {
            alert('Error deleting domain!');
          }
        }
      });
    });

    // Update domain toggles
    domainList.querySelectorAll('.enabled-toggle').forEach(toggle => {
      toggle.addEventListener('change', async (e) => {
        const parent = e.target.closest('.domain-item');
        const domainId = parent.dataset.id;
        const newEnabled = e.target.checked;

        try {
          await fetch(`${API_URL}/${domainId}`, {
            method: 'PUT',
            headers,
            body: JSON.stringify({ enabled: newEnabled })
          });
        } catch (error) {
          alert('Error updating domain!');
        }
      });
    });
  }

  async function addDomain(domainName) {
    try {
      const response = await fetch(API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({ domainName })
      });
      const newDomain = await response.json();
      fetchDomains();
    } catch (error) {
      alert('Error adding domain!');
    }
  }

  // Event listener for Add Domain action
  widgetRoot.querySelector('#addDomain').addEventListener('click', () => {
    const newDomain = widgetRoot.querySelector('#newDomain').value;
    if (newDomain) {
      addDomain(newDomain);
    }
  });

  // Event listener for Apply Check Frequency
  widgetRoot.querySelector('#applyFreq').addEventListener('click', async () => {
    const checkFrequency = parseInt(freqInput.value, 10);
    if (isNaN(checkFrequency) || checkFrequency <= 0) {
      alert('Frequency should be a positive whole number!');
      return;
    }

    try {
      await fetch(`${API_URL}/frequency`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ checkFrequency })
      });
      alert('Frequency updated successfully.');
    } catch (error) {
      alert('Error updating frequency!');
    }
  });

  // Fetch domains on load
  fetchDomains();
})();