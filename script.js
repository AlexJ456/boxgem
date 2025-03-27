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
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    const limitParam = urlParams.get('limit');
    const phaseParam = urlParams.get('phase'); // Get phase duration from URL

    // Decide which view to show
    if (viewParam === 'exercise' || limitParam !== null || phaseParam !== null) { // Show exercise if any exercise params exist
        document.body.classList.remove('view-home');
        document.body.classList.add('view-exercise');
        console.log("Setting up exercise view.");
        // Pass limit AND phase duration
        setupExercisePage(limitParam, phaseParam);
    } else {
        document.body.classList.remove('view-exercise');
        document.body.classList.add('view-home');
        console.log("Setting up homepage view.");
        setupHomepage();
    }
});


// --- Homepage Logic --- (Handles slider input and navigation)
function setupHomepage() {
    // Get elements needed for homepage
    const timeButtons = document.querySelectorAll('#homepage-content .time-button');
    const startCustomButton = document.getElementById('start-custom');
    const customTimeInput = document.getElementById('custom-time');
    const startInfiniteButton = document.getElementById('start-infinite');
    const phaseSlider = document.getElementById('phase-duration-slider');
    const phaseValueDisplay = document.getElementById('phase-duration-value');

    // --- Slider Setup ---
    if (phaseSlider && phaseValueDisplay) {
        // Function to update display text
        const updateSliderDisplay = () => {
            phaseValueDisplay.textContent = `${phaseSlider.value} second${phaseSlider.value > 1 ? 's' : ''}`;
        };

        // Listener for slider changes
        phaseSlider.addEventListener('input', updateSliderDisplay);

        // Restore slider position from previous visit? (Optional - use localStorage)
        // const savedPhase = localStorage.getItem('boxBreathPhaseDuration');
        // if (savedPhase) {
        //     phaseSlider.value = savedPhase;
        // }

        // Initial display update on load
        updateSliderDisplay();
    } else {
         console.error("Phase duration slider elements not found!");
    }


    // --- Button Listeners (with cloning to prevent duplicates) ---
     const setupButtonListener = (button, durationGetter, isInfinite = false) => {
         if (!button) return;
         // Clone node to remove previous listeners added in case setupHomepage runs again without full reload
         const clonedButton = button.cloneNode(true);
         button.parentNode.replaceChild(clonedButton, button);

         clonedButton.addEventListener('click', () => {
             const duration = isInfinite ? null : durationGetter();
             const phaseDuration = phaseSlider ? parseInt(phaseSlider.value, 10) : DEFAULT_PHASE_DURATION; // Get slider value OR default

             // Optional: Save selected phase duration for next visit
             // localStorage.setItem('boxBreathPhaseDuration', phaseDuration);

             if (duration !== undefined) { // Allow null for infinite, but block if custom getter failed
                navigateToExercise(duration, phaseDuration);
             }
         });
     };

    if (timeButtons.length > 0) {
        timeButtons.forEach(button => {
            setupButtonListener(button, () => parseInt(button.dataset.duration, 10));
        });
    }

     setupButtonListener(startCustomButton, () => {
        const minutes = parseInt(customTimeInput.value, 10);
        if (minutes && minutes > 0) {
             return minutes * 60;
         } else {
             console.warn("Invalid custom time");
             customTimeInput.value = '';
             return undefined; // Indicate failure
         }
     });

     setupButtonListener(startInfiniteButton, () => null, true); // Pass getter returning null, isInfinite = true

     // Clear any lingering exercise state if navigating back to home
     resetExerciseState();
}

// Updated Navigation function (takes phase duration)
function navigateToExercise(durationSeconds, phaseDuration) {
    let url = `/?view=exercise&phase=${phaseDuration}`; // Add phase duration param
    if (durationSeconds !== null) {
        url += `&limit=${durationSeconds}`; // Add limit if specified
    }
    window.location.href = url;
}


// --- Exercise Page Logic ---
// Modified to accept limit and phase parameters
function setupExercisePage(limitParam, phaseParam) {
    const totalTimerEl = document.getElementById('total-timer');
    const phaseNameEl = document.getElementById('phase-name');
    const phaseTimerEl = document.getElementById('phase-timer');
    const breathingDotEl = document.getElementById('breathing-dot');
    const backButton = document.querySelector('#exercise-content .back-button');

    if (!totalTimerEl || !phaseNameEl || !phaseTimerEl || !breathingDotEl || !backButton) {
        console.error("Required exercise elements not found!");
        window.location.href = '/'; // Redirect home
        return;
    }

    // Set Active Phase Duration based on URL parameter or default
    activePhaseDuration = phaseParam ? parseInt(phaseParam, 10) : DEFAULT_PHASE_DURATION;
    // Ensure phase duration is within valid range (3-6 seconds)
    activePhaseDuration = Math.max(3, Math.min(6, activePhaseDuration));
    console.log(`Using phase duration: ${activePhaseDuration}s`);

    // Set Time Limit
    timeLimit = limitParam ? parseInt(limitParam, 10) : null;
    console.log(`Starting exercise. Time limit: ${timeLimit === null ? 'Infinite' : timeLimit + 's'}`);

    // Set Animation Duration based on active phase duration
    if(breathingDotEl) {
        breathingDotEl.style.transitionDuration = `${activePhaseDuration}s`;
        console.log(`Set animation duration to: ${breathingDotEl.style.transitionDuration}`);
    }

    // Ensure the back button goes to the home view
    backButton.href = '/';

    resetExerciseState(); // Ensure clean start

    // Update initial display AFTER reset and setting activePhaseDuration
    if(phaseNameEl) phaseNameEl.textContent = "Get Ready...";
    if(phaseTimerEl) phaseTimerEl.textContent = activePhaseDuration; // Use the active duration

    // Short delay before starting the actual cycle
    setTimeout(() => {
        startBreathingCycle();
    }, 1500);
}


function startBreathingCycle() {
    const phaseNameEl = document.getElementById('phase-name');
    const breathingDotEl = document.getElementById('breathing-dot');
     if (!phaseNameEl || !breathingDotEl || intervalId) {
         if (intervalId) console.warn("Cycle already running?");
         else console.error("Cannot start cycle, elements missing.");
        return;
     }

    console.log("Starting cycle");
    currentPhaseIndex = 0;
    // Use activePhaseDuration for timing calculations
    phaseTimeRemaining = activePhaseDuration;
    isEndingSequence = false;
    totalTimeElapsed = 0;

    updatePhase();

    let lastTickTime = Date.now();

    intervalId = setInterval(() => {
        if (!document.getElementById('phase-name')) { stopBreathingCycle(); return; } // Check element still exists

        const now = Date.now();
        const delta = (now - lastTickTime) / 1000;
        lastTickTime = now;

        phaseTimeRemaining -= delta;
        totalTimeElapsed += delta;

        // Handle Time Limit Reached
        if (timeLimit !== null && totalTimeElapsed >= timeLimit && !isEndingSequence) {
             // If limit reached during wait OR exactly at the end of exhale, stop
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
            // If in ending sequence and just finished exhale/wait, stop
            if (isEndingSequence && (PHASES[currentPhaseIndex] === 'exhale' || PHASES[currentPhaseIndex] === 'wait')) {
                console.log(`Ending sequence complete after ${PHASES[currentPhaseIndex]}. Stopping.`);
                stopBreathingCycle();
                return;
            }

            currentPhaseIndex = (currentPhaseIndex + 1) % PHASES.length;
            // Reset using activePhaseDuration, add overshoot time
            phaseTimeRemaining = activePhaseDuration + phaseTimeRemaining;
            if (intervalId) { // Check if stopBreathingCycle was called just above
                updatePhase();
            }
        }

        if (intervalId) { // Check again before updating display
           updateDisplay();
        }
    }, 100); // Update interval (10 times per second)
}


function updatePhase() {
    const phaseNameEl = document.getElementById('phase-name');
    const breathingDotEl = document.getElementById('breathing-dot');
    if (!phaseNameEl || !breathingDotEl) { return; } // Check if elements exist

    const currentPhase = PHASES[currentPhaseIndex];
    phaseNameEl.textContent = currentPhase;

    breathingDotEl.classList.remove(...PHASES);
    void breathingDotEl.offsetWidth; // Force reflow for transition restart
    breathingDotEl.classList.add(currentPhase);
}


function updateDisplay() {
    const totalTimerEl = document.getElementById('total-timer');
    const phaseTimerEl = document.getElementById('phase-timer');
    // Ensure we are in exercise view and elements exist
    if (!document.body.classList.contains('view-exercise') || !totalTimerEl || !phaseTimerEl) {
        return;
    }

    // Total time formatting
    const totalSeconds = Math.floor(totalTimeElapsed);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    totalTimerEl.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

    // Display phase countdown (using ceiling)
    const phaseSecondsToShow = Math.max(0, Math.ceil(phaseTimeRemaining));
    phaseTimerEl.textContent = phaseSecondsToShow;
}


function stopBreathingCycle() {
    if (intervalId) {
        console.log("Stopping cycle.");
        clearInterval(intervalId);
        intervalId = null; // Clear interval ID immediately

        // Update display only if still in exercise view and elements exist
        const phaseNameEl = document.getElementById('phase-name');
        const phaseTimerEl = document.getElementById('phase-timer');
        if(document.body.classList.contains('view-exercise')) {
           if (phaseNameEl) phaseNameEl.textContent = "Finished";
           if (phaseTimerEl) phaseTimerEl.textContent = ""; // Clear phase timer
        }
    }
}

function resetExerciseState() {
     if (intervalId) { // Clear any existing interval first
         clearInterval(intervalId);
         intervalId = null;
     }
     // Reset state variables
     currentPhaseIndex = 0;
     // Use the current activePhaseDuration for resetting timer
     phaseTimeRemaining = activePhaseDuration;
     totalTimeElapsed = 0;
     isEndingSequence = false;

     // Reset relevant DOM elements if they exist
     const phaseNameEl = document.getElementById('phase-name');
     const phaseTimerEl = document.getElementById('phase-timer');
     const totalTimerEl = document.getElementById('total-timer');
     const breathingDotEl = document.getElementById('breathing-dot');

     if (phaseNameEl) phaseNameEl.textContent = ""; // Clear texts initially
     if (phaseTimerEl) phaseTimerEl.textContent = "";
     if (totalTimerEl) totalTimerEl.textContent = "00:00";
     if (breathingDotEl) {
        breathingDotEl.classList.remove(...PHASES); // Remove phase classes
        // Explicitly reset transform might not be necessary if CSS default is sufficient
        // breathingDotEl.style.transform = 'translate(0, 0)';
     }

     console.log("Exercise state reset");
 }

// Event listeners for cleanup when navigating away or closing
window.addEventListener('pagehide', () => { // Often more reliable on mobile
    stopBreathingCycle();
});

window.addEventListener('beforeunload', () => { // Fallback
     stopBreathingCycle();
});
