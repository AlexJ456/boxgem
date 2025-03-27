// --- Globals ---
const DEFAULT_PHASE_DURATION = 4; // Default phase duration in seconds
const PHASES = ['inhale', 'hold', 'exhale', 'wait'];
let activePhaseDuration = DEFAULT_PHASE_DURATION; // Updated from slider/URL
let currentPhaseIndex = 0;
let phaseTimeRemaining = DEFAULT_PHASE_DURATION; // Initialized with default, updated in setup
let totalTimeElapsed = 0;
let timeLimit = null; // in seconds, null if no limit
let intervalId = null;
let isEndingSequence = false;

// --- Service Worker Registration ---
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js') // Absolute path from root
            .then(registration => {
                console.log('ServiceWorker registration successful with scope: ', registration.scope);
            })
            .catch(error => {
                console.error('ServiceWorker registration failed: ', error);
            });
    });
}

// --- Main App Initialization --- (Handles view and getting URL params)
document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM Content Loaded. URL:", window.location.href); // DEBUG LOG
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const limitParam = urlParams.get('limit');
    const phaseParam = urlParams.get('phase');
    console.log("URL Params:", { viewParam, limitParam, phaseParam }); // DEBUG LOG

    // Decide which view to show based on URL parameters
    if (viewParam === 'exercise' || limitParam !== null || phaseParam !== null) {
        console.log("Switching to Exercise View"); // DEBUG LOG
        document.body.classList.remove('view-home');
        document.body.classList.add('view-exercise');
        setupExercisePage(limitParam, phaseParam);
    } else {
        console.log("Switching to Home View"); // DEBUG LOG
        document.body.classList.remove('view-exercise');
        document.body.classList.add('view-home');
        setupHomepage();
    }
});


// --- Homepage Logic --- (Handles slider input and navigation)
function setupHomepage() {
    console.log("Running setupHomepage"); // DEBUG LOG
    // Get elements needed for homepage
    const timeButtons = document.querySelectorAll('#homepage-content .time-button');
    const startCustomButton = document.getElementById('start-custom');
    const customTimeInput = document.getElementById('custom-time');
    const startInfiniteButton = document.getElementById('start-infinite');
    const phaseSlider = document.getElementById('phase-duration-slider');
    const phaseValueDisplay = document.getElementById('phase-duration-value');

    // --- Slider Setup ---
    if (phaseSlider && phaseValueDisplay) {
        const updateSliderDisplay = () => {
            phaseValueDisplay.textContent = `${phaseSlider.value} second${phaseSlider.value > 1 ? 's' : ''}`;
        };
        phaseSlider.addEventListener('input', updateSliderDisplay);
        updateSliderDisplay(); // Initial display
    } else {
         console.error("Phase duration slider elements not found!");
    }

    // --- Button Listeners (Simplified - No cloneNode) ---
    // Generic function to handle button clicks and navigation
    const handleStartClick = (durationGetter, isInfinite = false) => {
        console.log("handleStartClick called"); // DEBUG LOG
        const duration = isInfinite ? null : durationGetter();
        const phaseDuration = phaseSlider ? parseInt(phaseSlider.value, 10) : DEFAULT_PHASE_DURATION;
        console.log("Attempting to navigate with:", { duration, phaseDuration }); // DEBUG LOG

        if (duration !== undefined) { // Allow null (infinite), but block if getter failed
            navigateToExercise(duration, phaseDuration);
        } else {
             console.warn("Duration getter failed, not navigating."); // DEBUG LOG
        }
    };

    // Attach listeners
    if (timeButtons.length > 0) {
        timeButtons.forEach(button => {
            // Check if listener already exists (simple check, might not be robust for all cases but helps)
            if (!button.hasAttribute('data-listener-attached')) {
                button.addEventListener('click', () => {
                    console.log("Time button clicked:", button.dataset.duration); // DEBUG LOG
                    handleStartClick(() => parseInt(button.dataset.duration, 10));
                });
                 button.setAttribute('data-listener-attached', 'true');
            }
        });
    } else {
         console.warn("No time buttons found");
    }

     if (startCustomButton && !startCustomButton.hasAttribute('data-listener-attached')) {
        startCustomButton.addEventListener('click', () => {
             console.log("Start custom clicked"); // DEBUG LOG
             handleStartClick(() => {
                 const minutes = parseInt(customTimeInput.value, 10);
                 if (minutes && minutes > 0) {
                     return minutes * 60;
                 } else {
                     console.warn("Invalid custom time");
                     customTimeInput.value = '';
                     return undefined; // Indicate failure
                 }
             });
         });
          startCustomButton.setAttribute('data-listener-attached', 'true');
     }

     if (startInfiniteButton && !startInfiniteButton.hasAttribute('data-listener-attached')) {
        startInfiniteButton.addEventListener('click', () => {
             console.log("Start infinite clicked"); // DEBUG LOG
             handleStartClick(() => null, true); // Getter returns null, isInfinite = true
         });
          startInfiniteButton.setAttribute('data-listener-attached', 'true');
     }

     // Clear any lingering exercise state if navigating back to home
     resetExerciseState();
     console.log("setupHomepage finished"); // DEBUG LOG
}

// Updated Navigation function (takes phase duration)
function navigateToExercise(durationSeconds, phaseDuration) {
    let url = `/?view=exercise&phase=${phaseDuration}`; // Add phase duration param
    if (durationSeconds !== null) {
        url += `&limit=${durationSeconds}`; // Add limit if specified
    }
    console.log("Navigating to URL:", url); // DEBUG LOG
    window.location.href = url;
}


// --- Exercise Page Logic ---
// Modified to accept limit and phase parameters
function setupExercisePage(limitParam, phaseParam) {
     console.log("Running setupExercisePage with:", { limitParam, phaseParam }); // DEBUG LOG
    const totalTimerEl = document.getElementById('total-timer');
    const phaseNameEl = document.getElementById('phase-name');
    const phaseTimerEl = document.getElementById('phase-timer');
    const breathingDotEl = document.getElementById('breathing-dot');
    const backButton = document.querySelector('#exercise-content .back-button');

    // **Crucial Check**: Ensure elements are found
    if (!totalTimerEl || !phaseNameEl || !phaseTimerEl || !breathingDotEl || !backButton) {
        console.error("Required exercise elements not found in setupExercisePage!");
        // Optional: Show an error to the user on the page itself
        document.body.innerHTML = '<div style="color: red; padding: 20px;">Error: Could not load exercise elements. Please try going back home.</div>';
        return; // Stop execution if elements are missing
    }
     console.log("Exercise page elements found."); // DEBUG LOG

    // Set Active Phase Duration
    activePhaseDuration = phaseParam ? parseInt(phaseParam, 10) : DEFAULT_PHASE_DURATION;
    activePhaseDuration = Math.max(3, Math.min(6, activePhaseDuration)); // Clamp value
    console.log(`Active phase duration: ${activePhaseDuration}s`);

    // Set Time Limit
    timeLimit = limitParam ? parseInt(limitParam, 10) : null;
    console.log(`Time limit: ${timeLimit === null ? 'Infinite' : timeLimit + 's'}`);

    // Set Animation Duration
    breathingDotEl.style.transitionDuration = `${activePhaseDuration}s`;
    console.log(`Set animation duration to: ${breathingDotEl.style.transitionDuration}`);

    backButton.href = '/'; // Ensure back button links correctly

    resetExerciseState(); // Ensure clean state *before* setting initial display

    // Update initial display values
    phaseNameEl.textContent = "Get Ready...";
    phaseTimerEl.textContent = activePhaseDuration;
     console.log("Initial display set."); // DEBUG LOG

    // Short delay before starting the actual cycle
     console.log("Setting timeout to start breathing cycle..."); // DEBUG LOG
    setTimeout(() => {
         console.log("Timeout finished, calling startBreathingCycle."); // DEBUG LOG
        startBreathingCycle();
    }, 1500); // 1.5 second delay
     console.log("setupExercisePage finished."); // DEBUG LOG
}

// --- startBreathingCycle, updatePhase, updateDisplay, stopBreathingCycle, resetExerciseState ---
// --- (Keep these functions exactly the same as the previous 'final' version) ---
function startBreathingCycle() {
    const phaseNameEl = document.getElementById('phase-name');
    const breathingDotEl = document.getElementById('breathing-dot');
     if (!phaseNameEl || !breathingDotEl || intervalId) {
         if (intervalId) console.warn("Cycle already running?");
         else console.error("Cannot start cycle, elements missing.");
        return;
     }

    console.log("Starting breathing cycle interval"); // DEBUG LOG
    currentPhaseIndex = 0;
    phaseTimeRemaining = activePhaseDuration; // Use correct duration
    isEndingSequence = false;
    totalTimeElapsed = 0;

    updatePhase(); // Initial visual setup

    let lastTickTime = Date.now();

    intervalId = setInterval(() => {
        // Add check for elements existence within interval as well
        if (!document.getElementById('phase-name') || !document.getElementById('phase-timer')) {
             console.warn("Elements missing inside interval, stopping.");
            stopBreathingCycle();
            return;
        }

        const now = Date.now();
        const delta = (now - lastTickTime) / 1000;
        lastTickTime = now;

        phaseTimeRemaining -= delta;
        totalTimeElapsed += delta;

        // Handle Time Limit Reached
        if (timeLimit !== null && totalTimeElapsed >= timeLimit && !isEndingSequence) {
             if ((PHASES[currentPhaseIndex] === 'exhale' && phaseTimeRemaining <= 0) || PHASES[currentPhaseIndex] === 'wait') {
                 console.log("Limit reached end of exhale/wait. Stopping.");
                 stopBreathingCycle();
                 return;
             } else {
                 console.log("Limit reached mid-cycle. Entering ending sequence.");
                 isEndingSequence = true;
             }
        }

        // Phase transition
        if (phaseTimeRemaining <= 0) {
            if (isEndingSequence && (PHASES[currentPhaseIndex] === 'exhale' || PHASES[currentPhaseIndex] === 'wait')) {
                console.log(`Ending sequence complete after ${PHASES[currentPhaseIndex]}. Stopping.`);
                stopBreathingCycle();
                return;
            }

            currentPhaseIndex = (currentPhaseIndex + 1) % PHASES.length;
            phaseTimeRemaining = activePhaseDuration + phaseTimeRemaining; // Add overshoot
            if (intervalId) {
                // console.log("Transitioning phase"); // DEBUG LOG - Can be noisy
                updatePhase();
            }
        }

        if (intervalId) {
           updateDisplay();
        }
    }, 100);
}

function updatePhase() {
    const phaseNameEl = document.getElementById('phase-name');
    const breathingDotEl = document.getElementById('breathing-dot');
    if (!phaseNameEl || !breathingDotEl) { return; }

    const currentPhase = PHASES[currentPhaseIndex];
    phaseNameEl.textContent = currentPhase;

    breathingDotEl.classList.remove(...PHASES);
    void breathingDotEl.offsetWidth;
    breathingDotEl.classList.add(currentPhase);
    // console.log("Phase class added:", currentPhase); // DEBUG LOG - Can be noisy
}

function updateDisplay() {
    const totalTimerEl = document.getElementById('total-timer');
    const phaseTimerEl = document.getElementById('phase-timer');
    if (!document.body.classList.contains('view-exercise') || !totalTimerEl || !phaseTimerEl) { return; }

    const totalSeconds = Math.floor(totalTimeElapsed);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    totalTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    const phaseSecondsToShow = Math.max(0, Math.ceil(phaseTimeRemaining));
    phaseTimerEl.textContent = phaseSecondsToShow;
}

function stopBreathingCycle() {
    if (intervalId) {
        console.log("Stopping cycle interval."); // DEBUG LOG
        clearInterval(intervalId);
        intervalId = null;

        const phaseNameEl = document.getElementById('phase-name');
        const phaseTimerEl = document.getElementById('phase-timer');
        if(document.body.classList.contains('view-exercise')) {
           if (phaseNameEl) phaseNameEl.textContent = "Finished";
           if (phaseTimerEl) phaseTimerEl.textContent = "";
        }
    }
}

function resetExerciseState() {
     if (intervalId) {
         clearInterval(intervalId);
         intervalId = null;
     }
     currentPhaseIndex = 0;
     phaseTimeRemaining = activePhaseDuration; // Reset with active duration
     totalTimeElapsed = 0;
     isEndingSequence = false;

     // Reset visuals (make sure elements exist if called from homepage setup)
     const phaseNameEl = document.getElementById('phase-name');
     const phaseTimerEl = document.getElementById('phase-timer');
     const totalTimerEl = document.getElementById('total-timer');
     const breathingDotEl = document.getElementById('breathing-dot');

     if (phaseNameEl) phaseNameEl.textContent = "";
     if (phaseTimerEl) phaseTimerEl.textContent = "";
     if (totalTimerEl) totalTimerEl.textContent = "00:00";
     if (breathingDotEl) { breathingDotEl.classList.remove(...PHASES); }

     console.log("Exercise state reset complete."); // DEBUG LOG
 }

// Event listeners for cleanup
window.addEventListener('pagehide', stopBreathingCycle);
window.addEventListener('beforeunload', stopBreathingCycle);
