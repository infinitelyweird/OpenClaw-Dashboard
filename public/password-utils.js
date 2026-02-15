(function() {
  'use strict';

  // Password requirements config
  function getRequirements(minLength) {
    return [
      { id: 'length', label: `At least ${minLength} characters`, test: v => v.length >= minLength },
      { id: 'upper', label: 'Contains uppercase letter', test: v => /[A-Z]/.test(v) },
      { id: 'lower', label: 'Contains lowercase letter', test: v => /[a-z]/.test(v) },
      { id: 'number', label: 'Contains a number', test: v => /[0-9]/.test(v) },
      { id: 'special', label: 'Contains special character', test: v => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v) },
    ];
  }

  // Calculate password strength 0-100
  function calcStrength(password) {
    let score = 0;
    if (!password) return 0;
    
    // Length scoring
    score += Math.min(password.length * 3, 30);
    
    // Character variety
    if (/[a-z]/.test(password)) score += 10;
    if (/[A-Z]/.test(password)) score += 10;
    if (/[0-9]/.test(password)) score += 10;
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score += 15;
    
    // Bonus for mixing
    const types = [/[a-z]/, /[A-Z]/, /[0-9]/, /[^a-zA-Z0-9]/].filter(r => r.test(password)).length;
    score += (types - 1) * 5;
    
    // Penalty for repetition
    if (/(.)\1{2,}/.test(password)) score -= 10;
    
    // Bonus for length beyond minimum
    if (password.length > 16) score += 10;
    if (password.length > 24) score += 5;
    
    return Math.max(0, Math.min(100, score));
  }

  function getStrengthLabel(score) {
    if (score < 25) return { label: 'Weak', color: 'var(--color-danger, #f87171)' };
    if (score < 50) return { label: 'Fair', color: 'var(--color-warning, #fbbf24)' };
    if (score < 75) return { label: 'Good', color: 'var(--color-info, #60a5fa)' };
    return { label: 'Strong', color: 'var(--color-success, #34d399)' };
  }

  // Generate random password meeting requirements
  function generatePassword(minLength) {
    const len = Math.max(minLength, 16); // at least 16 for generated passwords
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const specials = '!@#$%^&*_+-=?';
    const all = upper + lower + numbers + specials;
    
    // Ensure at least one of each
    let password = [
      upper[Math.floor(Math.random() * upper.length)],
      lower[Math.floor(Math.random() * lower.length)],
      numbers[Math.floor(Math.random() * numbers.length)],
      specials[Math.floor(Math.random() * specials.length)],
    ];
    
    // Fill the rest
    for (let i = password.length; i < len; i++) {
      password.push(all[Math.floor(Math.random() * all.length)]);
    }
    
    // Shuffle
    for (let i = password.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [password[i], password[j]] = [password[j], password[i]];
    }
    
    return password.join('');
  }

  /**
   * Attach password UI to a password input field.
   * Options:
   *   inputEl: the password input element
   *   minLength: minimum password length (8 or 13)
   *   confirmEl: optional confirm password input element
   *   confirmErrorEl: optional element to show match error
   */
  function attachPasswordUI(options) {
    const { inputEl, minLength = 8, confirmEl, confirmErrorEl } = options;
    if (!inputEl) return;

    const reqs = getRequirements(minLength);
    
    // Create the UI container
    const container = document.createElement('div');
    container.className = 'pw-ui';
    container.innerHTML = `
      <div class="pw-meter">
        <div class="pw-meter-track">
          <div class="pw-meter-fill"></div>
        </div>
        <span class="pw-meter-label"></span>
      </div>
      <div class="pw-reqs">
        ${reqs.map(r => `<div class="pw-req" data-req="${r.id}">\u2717 ${r.label}</div>`).join('')}
      </div>
      <button type="button" class="pw-generate-btn" title="Generate a strong random password">\uD83C\uDFB2 Generate</button>
    `;
    
    // Insert after the input
    inputEl.parentNode.insertBefore(container, inputEl.nextSibling);
    
    const meterFill = container.querySelector('.pw-meter-fill');
    const meterLabel = container.querySelector('.pw-meter-label');
    const reqEls = container.querySelectorAll('.pw-req');
    const generateBtn = container.querySelector('.pw-generate-btn');
    
    // Show/hide on focus
    const reqsDiv = container.querySelector('.pw-reqs');
    const meterDiv = container.querySelector('.pw-meter');
    reqsDiv.style.display = 'none';
    meterDiv.style.display = 'none';
    
    inputEl.addEventListener('focus', () => {
      reqsDiv.style.display = 'block';
      meterDiv.style.display = 'flex';
    });

    function checkAll() {
      const v = inputEl.value;
      let allMet = true;
      
      reqs.forEach((r, i) => {
        const met = r.test(v);
        reqEls[i].classList.toggle('met', met);
        reqEls[i].textContent = (met ? '\u2713 ' : '\u2717 ') + r.label;
        if (!met) allMet = false;
      });
      
      // Update meter
      const score = calcStrength(v);
      const { label, color } = getStrengthLabel(score);
      meterFill.style.width = score + '%';
      meterFill.style.background = color;
      meterLabel.textContent = v ? label : '';
      meterLabel.style.color = color;
      
      // Show meter/reqs if there's input
      if (v) {
        reqsDiv.style.display = 'block';
        meterDiv.style.display = 'flex';
      }
      
      return allMet;
    }
    
    inputEl.addEventListener('input', () => {
      checkAll();
      if (confirmEl && confirmEl.value) checkMatch();
    });
    
    // Generate button
    generateBtn.addEventListener('click', () => {
      const pw = generatePassword(minLength);
      inputEl.value = pw;
      inputEl.type = 'text'; // show it briefly
      setTimeout(() => { inputEl.type = 'password'; }, 3000);
      checkAll();
      if (confirmEl) {
        confirmEl.value = pw;
        confirmEl.type = 'text';
        setTimeout(() => { confirmEl.type = 'password'; }, 3000);
        if (confirmErrorEl) confirmErrorEl.style.display = 'none';
      }
      // Copy to clipboard
      navigator.clipboard.writeText(pw).catch(() => {});
      // Flash the generate button
      generateBtn.textContent = '\u2705 Copied!';
      setTimeout(() => { generateBtn.textContent = '\uD83C\uDFB2 Generate'; }, 2000);
    });
    
    // Confirm match
    function checkMatch() {
      if (!confirmEl || !confirmErrorEl) return;
      const match = confirmEl.value === inputEl.value;
      confirmErrorEl.style.display = (!match && confirmEl.value.length > 0) ? 'block' : 'none';
    }
    
    if (confirmEl) {
      confirmEl.addEventListener('input', checkMatch);
      inputEl.addEventListener('input', () => { if (confirmEl.value) checkMatch(); });
    }
    
    return { checkAll, generatePassword: () => generatePassword(minLength) };
  }

  window.PasswordUtils = { attachPasswordUI, calcStrength, getStrengthLabel, generatePassword, getRequirements };
})();
