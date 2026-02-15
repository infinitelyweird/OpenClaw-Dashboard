(function() {
  const phrases = [
    "Reticulating splines...", "Asking the server nicely...", "Pretending to work hard...",
    "Loading... unlike your productivity today.", "Hold on, the hamsters are tired.",
    "Fetching data from the void...", "Almost there. Probably. Maybe.",
    "Computing things you'll ignore anyway...", "Your patience is... noted.",
    "Bribing the database...", "Converting caffeine to code...",
    "Spinning up the nonsense engine...", "Consulting the ancient scrolls...",
    "Waiting for Mercury to exit retrograde...", "Downloading more RAM...",
    "Teaching the server to read...", "Warming up the cloud (it's cold up there)...",
    "Loading at the speed of bureaucracy...", "Negotiating with the firewall...",
    "Compiling your disappointment...", "Deploying sarcasm modules...",
    "Recalibrating the flux capacitor...", "Running on hopes and prayers...",
    "Your data is in another castle...", "Performing dark rituals...",
    "Looking busy...", "Generating excuses...", "This is fine. Everything is fine.",
    "Polishing the pixels...", "Untangling the spaghetti code...",
    "Summoning the data demons...", "Please hold. Your call is important to us.",
    "Asking ChatGPT for help...", "Rolling a D20 for server response...",
    "Dusting off the database...", "Sacrificing a semicolon to the code gods...",
    "Aggressively doing nothing...", "The server is thinking. Don't rush it.",
    "Processing... your life choices.", "Finding Nemo... I mean, your data.",
    "Doing the impossible. Give us a sec.", "Loading... infinitely weird things take time.",
    "The internet is a series of tubes. Some are clogged.",
    "Convincing electrons to cooperate...", "Waiting for the intern to press Enter...",
    "Shoveling bits into the pipeline...", "Establishing a vibe check with the database...",
    "Warming up the quantum hamster wheel...", "Applying percussive maintenance...",
    "Counting to infinity. Twice.", "Adjusting the satellite dish...",
  ];

  let overlay = null, phraseInterval = null, activeLoaders = 0;

  function createOverlay() {
    if (overlay) return overlay;
    overlay = document.createElement('div');
    overlay.className = 'loader-overlay';
    overlay.innerHTML = `<div class="loader-content">
      <div class="loader-spinner"><div class="spinner-ring"></div><div class="spinner-ring"></div><div class="spinner-ring"></div></div>
      <p class="loader-phrase"></p>
      <div class="loader-dots"><span>.</span><span>.</span><span>.</span></div>
    </div>`;
    document.body.appendChild(overlay);
    return overlay;
  }

  function randomPhrase() { return phrases[Math.floor(Math.random() * phrases.length)]; }

  function show(customPhrase) {
    activeLoaders++;
    if (activeLoaders > 1) return;
    const el = createOverlay();
    const p = el.querySelector('.loader-phrase');
    p.textContent = customPhrase || randomPhrase();
    requestAnimationFrame(() => el.classList.add('active'));
    phraseInterval = setInterval(() => {
      p.style.opacity = '0';
      setTimeout(() => { p.textContent = randomPhrase(); p.style.opacity = '1'; }, 300);
    }, 3000);
  }

  function hide() {
    activeLoaders = Math.max(0, activeLoaders - 1);
    if (activeLoaders > 0) return;
    if (phraseInterval) { clearInterval(phraseInterval); phraseInterval = null; }
    if (overlay) overlay.classList.remove('active');
  }

  window.AppLoader = { show, hide };
})();
