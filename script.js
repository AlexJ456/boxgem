// --- Globals --- (Same as before)
const DEFAULT_PHASE_DURATION = 4;
const PHASES = ['inhale', 'hold', 'exhale', 'wait'];
let activePhaseDuration = DEFAULT_PHASE_DURATION;
let currentPhaseIndex = 0;
let phaseTimeRemaining = DEFAULT_PHASE_DURATION;
let totalTimeElapsed = 0;
let timeLimit = null;
let intervalId = null;
let isEndingSequence = false;

// --- Service Worker Registration --- (Same as before)
if ('serviceWorker' in navigator) { /* ... */ }

// --- Main App Initialization --- (Same as before)
document.addEventListener('DOMContentLoaded', () => { /* ... */ });

// --- Homepage Logic --- (Same as before - simplified listeners)
function setupHomepage() { /* ... */ }


// *** MODIFIED Navigation function ***
function navigateToExercise(durationSeconds, phaseDuration) {
    // Start the URL with '?' to make it relative to the current path
    let url = `?view=exercise&phase=${phaseDuration}`;
    if (durationSeconds !== null) {
        url += `&limit=${durationSeconds}`; // Add limit if specified
    }
    console.log("Navigating to relative URL:", url); // DEBUG LOG
    window.location.href = url; // This will now navigate correctly within the repo path
}


// --- Exercise Page Logic --- (Same as before)
function setupExercisePage(limitParam, phaseParam) { /* ... */ }

// --- startBreathingCycle, updatePhase, updateDisplay, stopBreathingCycle, resetExerciseState --- (Same as before)
// --- (Keep these functions exactly the same as the previous version) ---
function startBreathingCycle() { /* ... */ }
function updatePhase() { /* ... */ }
function updateDisplay() { /* ... */ }
function stopBreathingCycle() { /* ... */ }
function resetExerciseState() { /* ... */ }
window.addEventListener('pagehide', stopBreathingCycle);
window.addEventListener('beforeunload', stopBreathingCycle);


// ========== FULL script.js ==========
// Copy the ENTIRE script.js content from the PREVIOUS debugging step,
// but replace ONLY the navigateToExercise function with the modified one above.
// For clarity, here it is again in full context:

// --- Globals ---
const DEFAULT_PHASE_DURATION = 4;
const PHASES = ['inhale', 'hold', 'exhale', 'wait'];
let activePhaseDuration = DEFAULT_PHASE_DURATION;
let currentPhaseIndex = 0;
let phaseTimeRemaining = DEFAULT_PHASE_DURATION;
let totalTimeElapsed = 0;
let timeLimit = null;
let intervalId = null;
let isEndingSequence = false;

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.error('ServiceWorker registration failed: ', error);
            });
    });
}

// --- Main App Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. URL:", window.location.href);
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const limitParam = urlParams.get('limit');
    const phaseParam = urlParams.get('phase');
    console.log("URL Params:", { viewParam, limitParam, phaseParam });

    if (viewParam === 'exercise' || limitParam !== null || phaseParam !== null) {
        console.log("Switching to Exercise View");
        document.body.classList.remove('view-home');
        document.body.classList.add('view-exercise');
        setupExercisePage(limitParam, phaseParam);
    } else {
        console.log("Switching to Home View");
        document.body.classList.remove('view-exercise');
        document.body.classList.add('view-home');
        setupHomepage();
    }
});

// --- Homepage Logic ---
function setupHomepage() {
    console.log("Running setupHomepage");
    const timeButtons = document.querySelectorAll('#homepage-content .time-button');
    const startCustomButton = document.getElementById('start-custom');
    const customTimeInput = document.getElementById('custom-time');
    const startInfiniteButton = document.getElementById('start-infinite');
    const phaseSlider = document.getElementById('phase-duration-slider');
    const phaseValueDisplay = document.getElementById('phase-duration-value');

    // Slider Setup
    if (phaseSlider && phaseValueDisplay) {
        const updateSliderDisplay = () => {
            phaseValueDisplay.textContent = `${phaseSlider.value} second${phaseSlider.value > 1 ? 's' : ''}`;
        };
        phaseSlider.addEventListener('input', updateSliderDisplay);
        updateSliderDisplay();
    } else { console.error("Phase duration slider elements not found!"); }

    // Button Listeners Setup
    const handleStartClick = (durationGetter, isInfinite = false) => {
        console.log("handleStartClick called");
        const duration = isInfinite ? null : durationGetter();
        const phaseDuration = phaseSlider ? parseInt(phaseSlider.value, 10) : DEFAULT_PHASE_DURATION;
        console.log("Attempting to navigate with:", { duration, phaseDuration });
        if (duration !== undefined) { navigateToExercise(duration, phaseDuration); }
        else { console.warn("Duration getter failed, not navigating."); }
    };

    // Attach listeners if not already attached
    const attachListenerOnce = (element, event, handler) => {
         if (element && !element.hasAttribute('data-listener-attached')) {
            element.addEventListener(event, handler);
            element.setAttribute('data-listener-attached', 'true');
         }
    };

    if (timeButtons.length > 0) {
        timeButtons.forEach(button => {
            attachListenerOnce(button, 'click', () => {
                console.log("Time button clicked:", button.dataset.duration);
                handleStartClick(() => parseInt(button.dataset.duration, 10));
            });
        });
    } else { console.warn("No time buttons found"); }

     attachListenerOnce(startCustomButton, 'click', () => {
         console.log("Start custom clicked");
         handleStartClick(() => {
             const minutes = parseInt(customTimeInput.value, 10);
             if (minutes && minutes > 0) { return minutes * 60; }
             else { console.warn("Invalid custom time"); customTimeInput.value = ''; return undefined; }
         });
     });

     attachListenerOnce(startInfiniteButton, 'click', () => {
         console.log("Start infinite clicked");
         handleStartClick(() => null, true);
     });

     resetExerciseState();
     console.log("setupHomepage finished");
}

// *** MODIFIED Navigation function ***
function navigateToExercise(durationSeconds, phaseDuration) {
    // Start the URL with '?' to make it relative to the current path
    let url = `?view=exercise&phase=${phaseDuration}`;
    if (durationSeconds !== null) {
        url += `&limit=${durationSeconds}`; // Add limit if specified
    }
    console.log("Navigating to relative URL:", url); // DEBUG LOG
    window.location.href = url; // This will now navigate correctly within the repo path
}

// --- Exercise Page Logic ---
function setupExercisePage(limitParam, phaseParam) {
     console.log("Running setupExercisePage with:", { limitParam, phaseParam });
    const totalTimerEl = document.getElementById('total-timer');
    const phaseNameEl = document.getElementById('phase-name');
    const phaseTimerEl = document.getElementById('phase-timer');
    const breathingDotEl = document.getElementById('breathing-dot');
    const backButton = document.querySelector('#exercise-content .back-button');

    if (!totalTimerEl || !phaseNameEl || !phaseTimerEl || !breathingDotEl || !backButton) {
        console.error("Required exercise elements not found in setupExercisePage!");
        document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Could not load exercise elements. Please try going back home.</div>';
        return;
    }
    console.log("Exercise page elements found.");

    activePhaseDuration = phaseParam ? parseInt(phaseParam, 10) : DEFAULT_PHASE_DURATION;
    activePhaseDuration = Math.max(3, Math.min(6, activePhaseDuration));
    console.log(`Active phase duration: ${activePhaseDuration}s`);

    timeLimit = limitParam ? parseInt(limitParam, 10) : null;
    console.log(`Time limit: ${timeLimit === null ? 'Infinite' : timeLimit + 's'}`);

    breathingDotEl.style.transitionDuration = `${activePhaseDuration}s`;
    console.log(`Set animation duration to: ${breathingDotEl.style.transitionDuration}`);

    backButton.href = '/'; // Set relative path for back button (JS might override or redirect to home view anyway)

    resetExerciseState();

    phaseNameEl.textContent = "Get Ready...";
    phaseTimerEl.textContent = activePhaseDuration;
    console.log("Initial display set.");

     console.log("Setting timeout to start breathing cycle...");
    setTimeout(() => {
         console.log("Timeout finished, calling startBreathingCycle.");
        startBreathingCycle();
    }, 1500);
     console.log("setupExercisePage finished.");
}

// --- startBreathingCycle, updatePhase, updateDisplay, stopBreathingCycle, resetExerciseState --- (Functions are unchanged)
function startBreathingCycle() {
    const phaseNameEl = document.getElementById('phase-name');
    const breathingDotEl = document.getElementById('breathing-dot');
     if (!phaseNameEl || !breathingDotEl || intervalId) {
         if (intervalId) console.warn("Cycle already running?");
         else console.error("Cannot start cycle, elements missing.");
        return;
     }
    console.log("Starting breathing cycle interval");
    currentPhaseIndex = 0;
    phaseTimeRemaining = activePhaseDuration;
    isEndingSequence = false;
    totalTimeElapsed = 0;
    updatePhase();
    let lastTickTime = Date.now();
    intervalId = setInterval(() => {
        if (!document.getElementById('phase-name') || !document.getElementById('phase-timer')) {
             console.warn("Elements missing inside interval, stopping.");
            stopBreathingCycle(); return;
        }
        const now = Date.now(); const delta = (now - lastTickTime) / 1000; lastTickTime = now;
        phaseTimeRemaining -= delta; totalTimeElapsed += delta;
        if (timeLimit !== null && totalTimeElapsed >= timeLimit && !isEndingSequence) {
             if ((PHASES[currentPhaseIndex] === 'exhale' && phaseTimeRemaining <= 0) || PHASES[currentPhaseIndex] === 'wait') {
                 console.log("Limit reached end of exhale/wait. Stopping."); stopBreathingCycle(); return;
             } else { console.log("Limit reached mid-cycle. Entering ending sequence."); isEndingSequence = true; }
        }
        if (phaseTimeRemaining <= 0) {
            if (isEndingSequence && (PHASES[currentPhaseIndex] === 'exhale' || PHASES[currentPhaseIndex] === 'wait')) {
                console.log(`Ending sequence complete after ${PHASES[currentPhaseIndex]}. Stopping.`); stopBreathingCycle(); return;
            }
            currentPhaseIndex = (currentPhaseIndex + 1) % PHASES.length;
            phaseTimeRemaining = activePhaseDuration + phaseTimeRemaining;
            if (intervalId) { updatePhase(); }
        }
        if (intervalId) { updateDisplay(); }
    }, 100);
}
function updatePhase() {
    const phaseNameEl = document.getElementById('phase-name'); const breathingDotEl = document.getElementById('breathing-dot');
    if (!phaseNameEl || !breathingDotEl) { return; }
    const currentPhase = PHASES[currentPhaseIndex]; phaseNameEl.textContent = currentPhase;
    breathingDotEl.classList.remove(...PHASES); void breathingDotEl.offsetWidth; breathingDotEl.classList.add(currentPhase);
}
function updateDisplay() {
    const totalTimerEl = document.getElementById('total-timer'); const phaseTimerEl = document.getElementById('phase-timer');
    if (!document.body.classList.contains('view-exercise') || !totalTimerEl || !phaseTimerEl) { return; }
    const totalSeconds = Math.floor(totalTimeElapsed); const minutes = Math.floor(totalSeconds / 60); const seconds = totalSeconds % 60;
    totalTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
    const phaseSecondsToShow = Math.max(0, Math.ceil(phaseTimeRemaining)); phaseTimerEl.textContent = phaseSecondsToShow;
}
function stopBreathingCycle() {
    if (intervalId) {
        console.log("Stopping cycle interval."); clearInterval(intervalId); intervalId = null;
        const phaseNameEl = document.getElementById('phase-name'); const phaseTimerEl = document.getElementById('phase-timer');
        if(document.body.classList.contains('view-exercise')) {
           if (phaseNameEl) phaseNameEl.textContent = "Finished"; if (phaseTimerEl) phaseTimerEl.textContent = "";
        }
    }
}
function resetExerciseState() {
     if (intervalId) { clearInterval(intervalId); intervalId = null; }
     currentPhaseIndex = 0; phaseTimeRemaining = activePhaseDuration; totalTimeElapsed = 0; isEndingSequence = false;
     const phaseNameEl = document.getElementById('phase-name'); const phaseTimerEl = document.getElementById('phase-timer');
     const totalTimerEl = document.getElementById('total-timer'); const breathingDotEl = document.getElementById('breathing-dot');
     if (phaseNameEl) phaseNameEl.textContent = ""; if (phaseTimerEl) phaseTimerEl.textContent = "";
     if (totalTimerEl) totalTimerEl.textContent = "00:00"; if (breathingDotEl) { breathingDotEl.classList.remove(...PHASES); }
     console.log("Exercise state reset complete.");
 }
window.addEventListener('pagehide', stopBreathingCycle);
window.addEventListener('beforeunload', stopBreathingCycle);
