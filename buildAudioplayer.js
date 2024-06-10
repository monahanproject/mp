import { curatedTracklist, initializeApp } from "./play.js";
import { getState, setState, getLangState, setLangState, updateAriaStatusMessage } from "./state.js";
import { Transcript } from "./transcriptMaker.js";


const THEME_INVERTED_KEY = "themeInverted";
const DEFAULT_LANG = "EN";
const DEFAULT_VOLUME = 75;
const VOLUME_MAX = 100;
const VOLUME_MIN = 0;
const SKIP_FORWARD_SECONDS = 20;
const SKIP_BACKWARD_SECONDS = 15;
const SKIP_BACKWARD_THRESHOLD = 16;
const PROGRESS_UPDATE_INTERVAL = 1000;
const CHECK_SKIP_BACKWARD_INTERVAL = 15; // in seconds

// Initialize theme inversion state from localStorage
let isInverted = getState();

// If the themeInverted key doesn't exist in localStorage, initialize it to false
if (localStorage.getItem(THEME_INVERTED_KEY) === null) {
  localStorage.setItem(THEME_INVERTED_KEY, "false");
}

export class SimpleAudioPlayer {
  constructor(tracklist) {
    this.tracklist = tracklist;
    this.currentIndex = 0;
    this.globalAudioElement = new Audio();
    this.isPlaying = false;
    this.firstPlayDone = false;
    this.totalPlaylistDuration = 0;
    this.isUpdatingTime = false;
    this.timerDuration = 0;
    this.remainingTime = 0;
    this.allowProgressUpdate = true;
    this.transcript = new Transcript(this);
    this.lang = localStorage.getItem("lang") || DEFAULT_LANG;

    this.initializeElements();
    this.initializeSVGIcons();
    this.setupInitialUserInteraction();
    this.createVolumeSlider();
    this.calcTotalPlaylistDuration();
    this.calcTotalPlaylistRemainingTime();

    this.globalAudioElement.onplay = this.handlePlay.bind(this);
    this.globalAudioElement.onpause = this.handlePause.bind(this);
    this.globalAudioElement.onended = this.handleEnded.bind(this);

    this.createTimerLoopAndUpdateProgressTimer();
  }

  initializeElements() {
    this.skipBackwardButton = document.getElementById("skipBackwardButton");
    this.skipForwardButton = document.getElementById("skipForwardButton");
    this.lowerVolumeBtn = document.getElementById("lower-vol");
    this.raiseVolumeBtn = document.getElementById("raise-vol");
    this.playButton = document.getElementById("play-button");
    this.skipBackwardsImpossible = true;
    this.playlistEnded = false;
  }

  // findme
  initializeSVGIcons() {
    this.beginAgain = `<img id="begin-again" class="svg-icon" src="images/svg/beginAgain.svg" alt="Begin again">`;
    this.beginAgainInvert = `<img id="begin-again" class="svg-icon" src="images/svg/beginAgainInvert.svg" alt="Begin again">`;
    this.playingSVG = `<img id="play-icon" class="svg-icon" src="images/svg/playButton.svg" alt="Play Icon">`;
    this.playingInvertedSVG = `<img id="play-icon" class="svg-icon" src="images/svg/playButtonInvert.svg" alt="Play Icon">`;
    this.pausedSVG = `<img id="play-icon" class="svg-icon" src="images/svg/pauseButton.svg" alt="Pause Icon">`;
    this.pausedInvertedSVG = `<img id="play-icon" class="svg-icon" src="images/svg/pauseButtonInvert.svg" alt="Pause Icon">`;
  }

  toggleAriaPressed(element) {
    const isPressed = element.getAttribute("aria-pressed") === "true";
    element.setAttribute("aria-pressed", !isPressed);
  }

  calcTotalPlaylistDuration() {
    this.totalPlaylistDuration = this.tracklist.reduce((acc, track) => acc + Number(track.duration), 0);
    return this.totalPlaylistDuration;
  }

  calcTotalPlaylistRemainingTime() {
    this.remainingTime = this.totalPlaylistDuration;
    return this.remainingTime;
  }

  updateProgressUI(elapsedSeconds, previousDuration) {
    if (this.playlistEnded) {
      const timeRemainingElement = document.getElementById("time-remaining");
      timeRemainingElement.innerText = "00:00";
      return;
    }

    const totalElapsedSeconds = elapsedSeconds + previousDuration;
    const remainingDurationSeconds = Math.max(0, this.totalPlaylistDuration - totalElapsedSeconds);
    const playedPercentage = (totalElapsedSeconds / this.totalPlaylistDuration) * 100;

    const playedTime = this.calculateMinutesAndSeconds(totalElapsedSeconds);
    const remainingTime = this.calculateMinutesAndSeconds(remainingDurationSeconds);

    requestAnimationFrame(() => {
      try {
        const progressBar = document.getElementById("progress-bar");
        const timePlayedElement = document.getElementById("time-played");
        const timeRemainingElement = document.getElementById("time-remaining");

        progressBar.style.width = `${playedPercentage}%`;
        progressBar.setAttribute("aria-valuenow", playedPercentage.toFixed(0));

        timePlayedElement.innerText = `${playedTime.minutes}:${playedTime.seconds}`;
        timeRemainingElement.innerText = `-${remainingTime.minutes}:${remainingTime.seconds}`;

        timePlayedElement.setAttribute("aria-hidden", "true");
        timeRemainingElement.setAttribute("aria-hidden", "true");
      } catch (error) {
        console.error("An error occurred in updateProgressUI:", error);
      }
    });
  }

  calculateMinutesAndSeconds(seconds) {
    seconds = Math.max(0, seconds); // Clamp seconds to a minimum of 0 to prevent negative values
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return {
      minutes: `${minutes < 10 ? "0" : ""}${minutes}`,
      seconds: `${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`,
    };
  }

  createTimerLoopAndUpdateProgressTimer() {
    clearInterval(this.updateIntervalId);
    const start = Date.now(); // Record the start time of the loop
    let checkCounter = 0; // Counter to track when to perform the skip backward check

    this.updateIntervalId = setInterval(() => {
      const delta = Date.now() - start;
      const deltaSeconds = Math.floor(delta / 1000);
      this.updateProgressUI(Math.floor(this.globalAudioElement.currentTime), this.timerDuration);

      checkCounter++;
      if (checkCounter >= CHECK_SKIP_BACKWARD_INTERVAL) {
        // Perform the check every 15 seconds
        this.checkAndEnableSkipBackward();
        checkCounter = 0; // Reset counter after the check
      }
    }, PROGRESS_UPDATE_INTERVAL);
  }

  setupInitialUserInteraction() {
    if (this.playButton) {
      this.playButton.addEventListener("click", () => this.startPlayback());
    }
    if (this.skipBackwardButton) {
      this.skipBackwardButton.addEventListener("click", () => {
        this.handleSkipBackward();
        // setTimeout(() => this.skipBackwardButton.focus(), 0); // Add a small delay before focusing
      });
    }
    if (this.skipForwardButton) {
      this.skipForwardButton.addEventListener("click", () => {
        this.handleSkipForward();
        // setTimeout(() => this.skipForwardButton.focus(), 0); // Add a small delay before focusing
      });
    }
    this.setupVolumeControlButtons();
  }

  createVolumeSlider() {
    const volumeSlider = document.getElementById("volume-slider");
    if (volumeSlider && volumeSlider instanceof HTMLInputElement) {
      volumeSlider.type = "range";
      volumeSlider.max = VOLUME_MAX.toString();
      volumeSlider.min = VOLUME_MIN.toString();
      volumeSlider.value = DEFAULT_VOLUME.toString(); // default volume

      volumeSlider.addEventListener("input", (event) => this.handleVolumeChange(event));

      this.globalAudioElement.volume = parseFloat(volumeSlider.value) / VOLUME_MAX;
      this.updateVolumeIndicator(parseFloat(volumeSlider.value));
    }
  }

  handleVolumeChange(event) {
    const volumeSlider = event.target;
    if (volumeSlider instanceof HTMLInputElement) {
      const volumeLevel = parseFloat(volumeSlider.value) / VOLUME_MAX;
      this.globalAudioElement.volume = volumeLevel;
      volumeSlider.setAttribute("aria-valuenow", volumeSlider.value);
      this.updateVolumeIndicator(volumeLevel);
    }
  }

  updateVolumeIndicator(volumeLevel) {
    const volumeFiller = document.getElementById("volume-bar-filler");
    const volumeThinner = document.getElementById("volume-bar-thinner");

    if (volumeFiller) {
      volumeFiller.style.width = `${volumeLevel}%`;
      const volumeSlider = document.getElementById("volume-slider");
      if (volumeSlider) {
        volumeSlider.setAttribute("aria-valuenow", volumeLevel);
      }
    }

    if (volumeThinner) {
      volumeThinner.style.width = `${100 - volumeLevel * 100}%`;
      volumeThinner.style.left = `${volumeLevel * 100}%`;
    }
  }

  setupVolumeControlButtons() {
    if (this.lowerVolumeBtn) {
      this.lowerVolumeBtn.addEventListener("click", () => {
        this.globalAudioElement.volume = VOLUME_MIN / 100;
        const volumeSlider = document.getElementById("volume-slider");
        if (volumeSlider && volumeSlider instanceof HTMLInputElement) {
          volumeSlider.value = VOLUME_MIN.toString(); // Update the slider position
        }
        this.updateVolumeIndicator(VOLUME_MIN); // Update the UI to reflect the volume change
        this.toggleAriaPressed(this.lowerVolumeBtn); // Update aria-pressed
        // setTimeout(() => this.lowerVolumeBtn.focus(), 0); // Add a small delay before focusing
      });
    }

    if (this.raiseVolumeBtn) {
      this.raiseVolumeBtn.addEventListener("click", () => {
        this.globalAudioElement.volume = VOLUME_MAX / 100;
        const volumeSlider = document.getElementById("volume-slider");
        if (volumeSlider && volumeSlider instanceof HTMLInputElement) {
          volumeSlider.value = VOLUME_MAX.toString(); // Update the slider position
        }
        this.updateVolumeIndicator(VOLUME_MAX); // Update the UI to reflect the volume change
        this.toggleAriaPressed(this.raiseVolumeBtn); // Update aria-pressed
        // setTimeout(() => this.raiseVolumeBtn.focus(), 0); // Add a small delay before focusing
      });
    }
  }

  handlePlay() {
    console.log("playing");
    const toggleLanguageBtn = document.getElementById("toggleLanguage");
    if (toggleLanguageBtn) {
      // toggleLanguageBtn.classList.add("hidden");
    }

    updateAriaStatusMessage("Starting playback");
    this.isPlaying = true;
    this.toggleButtonVisuals(true);
    this.toggleAriaPressed(document.getElementById("play-button"));
    // setTimeout(() => this.playButton.focus(), 0); // Add a small delay before focusing
  }

  handlePause() {
    updateAriaStatusMessage("Pausing playback");
    this.isPlaying = false;
    this.toggleButtonVisuals(false);
    this.toggleAriaPressed(document.getElementById("play-button"));
    // setTimeout(() => this.playButton.focus(), 0); // Add a small delay before focusing
  }

  handleEnded() {
    console.log("Playlist ended. Preparing to regenerate playlist.");

    this.playlistEnded = true;
    this.isPlaying = false;

    this.updatePlayButtonText("");

    const existingOverlay = document.getElementById("play-button");
    existingOverlay.style.position = "relative";

    let overlaySvgElement = existingOverlay.querySelector(".overlay-svg");
    if (!overlaySvgElement) {
      overlaySvgElement = document.createElement("div");
      overlaySvgElement.className = "overlay-svg";
      overlaySvgElement.style.position = "absolute";
      overlaySvgElement.style.top = "25%";
      overlaySvgElement.style.left = "10%";
      overlaySvgElement.style.width = "50%";
      overlaySvgElement.style.height = "50%";
      overlaySvgElement.style.zIndex = "10";
      existingOverlay.appendChild(overlaySvgElement);

      const isThemeInverted = getState();
      overlaySvgElement.innerHTML = isThemeInverted ? this.beginAgainInvert : this.beginAgain;
    }

    if (this.playButton) {
      this.playButton.onclick = () => {
        localStorage.setItem("returnToSpot", "play-button");
        window.location.reload();
      };
    }
  }

  resetProgressUI() {
    console.log("Resetting Progress UI for new playlist");
    const progressBar = document.getElementById("progress-bar");
    const progressDot = document.getElementById("progress-dot");
    const timePlayedElement = document.getElementById("time-played");
    const timeRemainingElement = document.getElementById("time-remaining");

    timePlayedElement.setAttribute("aria-hidden", "true");
    timeRemainingElement.setAttribute("aria-hidden", "true");

    if (progressBar && progressDot && timePlayedElement && timeRemainingElement) {
      progressBar.style.width = "0%";
      progressDot.style.left = "0%";
      timePlayedElement.innerText = "00:00";
      timeRemainingElement.innerText = "00:00";
    }
  }

  applySvgGlowEffect(buttonElement) {
    buttonElement.classList.add("svg-glow");
    if (buttonElement) {
      setTimeout(() => {
        buttonElement.classList.remove("svg-glow");
      }, 500);
    }
  }

  handleSkipForward() {
    console.log("Attempting to skip forward. Remaining time:", this.remainingTime);
    if (!this.isSkipForwardAllowed()) {
      this.skipForwardButton.style.opacity = ".4";
      return;
    }
    this.updateUIForSkip("forward");
    this.calculateAndAdjustTime(SKIP_FORWARD_SECONDS, "forward");
    this.toggleAriaPressed(this.skipForwardButton);
    // this.skipForwardButton.focus();
  }

  handleSkipBackward() {
    console.log("Attempting to skip backward. Current time:", this.globalAudioElement.currentTime);
    if (!this.isSkipBackwardAllowed()) {
      this.skipBackwardButton.style.opacity = ".4";
      return;
    }
    this.updateUIForSkip("backward");
    this.calculateAndAdjustTime(-SKIP_BACKWARD_SECONDS, "backward");
    this.toggleAriaPressed(this.skipBackwardButton);
    // this.skipBackwardButton.focus();
  }

  isSkipForwardAllowed() {
    if (this.remainingTime <= SKIP_FORWARD_SECONDS * 4) {
      console.log("Skip forward blocked: Not enough remaining time.");
      updateAriaStatusMessage("Can't skip forwards, we're near the end of the playlist");
      return false;
    }
    return true;
  }

  isSkipBackwardAllowed() {
    if (this.globalAudioElement.currentTime < SKIP_BACKWARD_THRESHOLD) {
      updateAriaStatusMessage("Can't skip backwards, have reached the beginning of this track");
      return false;
    }
    return true;
  }

  calculateAndAdjustTime(timeChange, direction) {
    if (this.isUpdatingTime) {
      console.log(`Skip ${direction} is currently updating, request ignored.`);
      return;
    }
    this.isUpdatingTime = true;
    const disableDuration = 10;

    const targetButton = direction === "forward" ? this.skipForwardButton : this.skipBackwardButton;
    targetButton.classList.add("disabled-button");

    const initialTime = this.globalAudioElement.currentTime;
    const newPlayerTime = Math.max(0, Math.min(initialTime + timeChange, this.totalPlaylistDuration));
    console.log(`Initial time: ${initialTime}, Calculated new player time: ${newPlayerTime}`);

    this.globalAudioElement.currentTime = newPlayerTime;
    setTimeout(() => {
      this.checkIfTimeUpdated(initialTime);
      targetButton.classList.remove("disabled-button");
      this.isUpdatingTime = false;
    }, disableDuration);
  }

  updateUIForSkip(direction) {
    console.log(direction);
    const targetButton = direction === "forward" ? this.skipForwardButton : this.skipBackwardButton;
    console.log(targetButton);
    this.applySvgGlowEffect(targetButton);
  }

  checkIfTimeUpdated(initialTime) {
    console.log("Timeout check: Current time after attempt:", this.globalAudioElement.currentTime);
    if (this.globalAudioElement.currentTime === initialTime) {
      updateAriaStatusMessage("Unable to skip, possibly at the end or beginning of the track");
    }
    this.isUpdatingTime = false;
  }

  checkAndEnableSkipBackward() {
    if (this.globalAudioElement.currentTime > SKIP_BACKWARD_THRESHOLD) {
      this.skipBackwardButton.style.opacity = "1.0";
      this.skipBackwardsImpossible = false;
    }
  }

  async startPlayback() {
    document.getElementById("ffrw-button-container").style.opacity = "1";
    if (this.currentIndex < this.tracklist.length) {
      if (!this.isPlaying) {
        console.log("Playing or resuming track at index:", this.currentIndex);
        if (!this.firstPlayDone) {
          console.log("First play of the new playlist.");
          await this.playTrack(this.currentIndex);
          this.firstPlayDone = true; // Prevents re-initialization in future plays.
          document.getElementById("hidePlayerControls").classList.remove("hidden");
        } else {
          console.log("Resuming playback.");
          this.globalAudioElement.play();
        }
        this.toggleButtonVisuals(true); // Update UI to show playing state.
      } else {
        console.log("pause.");
        this.globalAudioElement.pause();
      }
    } else {
      console.log("Fallback: Reached end of playlist, preparing new playlist...");
    }
  }

  playTrack(index) {
    return new Promise((resolve, reject) => {
      const track = this.tracklist[index];
      console.log(track);
      this.globalAudioElement.src = track.url;

      this.globalAudioElement
        .play()
        .then(() => {
          this.isPlaying = true;

          if (index + 1 < this.tracklist.length) {
            const nextTrack = this.tracklist[index + 1];
            const audioPreload = new Audio(nextTrack.url);
            audioPreload.preload = "auto";
            audioPreload.addEventListener("canplaythrough", () => {});
            audioPreload.load();
          }

          resolve();
        })
        .catch((error) => {
          reject(error);
        });

      this.globalAudioElement.onended = () => {
        console.log(
          `Track ${this.currentIndex} ended. Name: ${this.tracklist[this.currentIndex].name}. Duration: ${this.globalAudioElement.duration}`
        );

        this.timerDuration += this.globalAudioElement.duration;
        this.remainingTime -= this.globalAudioElement.duration;

        this.currentIndex++;

        if (this.currentIndex < this.tracklist.length) {
          this.playTrack(this.currentIndex).then(resolve).catch(reject);
        } else {
          console.log("End of playlist reached.");
          this.handleEnded();
          resolve();
        }
      };
    });
  }

  updatePlayButtonText(text) {
    const playButtonTextContainer = document.getElementById("play-button-text-container");
    if (playButtonTextContainer) playButtonTextContainer.textContent = text;
  }

  toggleButtonVisuals(isPlaying) {
    const isThemeInverted = getState(); // This will initialize isInverted based on localStorage
    const svgContainer = document.getElementById("play-button-svg-container");
    const playButtonTextContainer = document.getElementById("play-button-text-container");
    const svgToUse = isPlaying
      ? isThemeInverted
        ? this.pausedInvertedSVG
        : this.pausedSVG
      : isThemeInverted
      ? this.playingInvertedSVG
      : this.playingSVG;

    const currLang = localStorage.getItem("lang") || DEFAULT_LANG;

    // Define the ARIA labels
    const ariaLabelPlay = currLang === "EN" ? "Play audio" : "Commencer l'audio";
    const ariaLabelStop = currLang === "EN" ? "Stop audio" : "Arrêter l'audio";

    if (isPlaying) {
      if (!this.playButton.classList.contains("playing")) {
        playButtonTextContainer.style.left = "50%";
        svgContainer.innerHTML = svgToUse;
        playButtonTextContainer.textContent = currLang === "EN" ? "STOP" : "ARRÊTER";
        this.playButton.setAttribute("aria-label", ariaLabelStop); // Update the aria-label
      }
    } else {
      if (!this.playButton.classList.contains("paused")) {
        if (!this.firstPlayDone) {
          // we're in a begin state
        } else {
          playButtonTextContainer.style.left = "40%";
          svgContainer.innerHTML = svgToUse;
          playButtonTextContainer.textContent = currLang === "EN" ? "PLAY" : "COMMENCER";
          this.playButton.setAttribute("aria-label", ariaLabelPlay); // Update the aria-label
        }
      }
    }
    this.playButton.classList.toggle("playing", isPlaying);
    this.playButton.classList.toggle("paused", !isPlaying);
  }
}

// Scroll to a specific element on page load if indicated in localStorage
document.addEventListener("DOMContentLoaded", (event) => {
  const returnToSpot = localStorage.getItem("returnToSpot");
  if (returnToSpot === "play-button") {
    const element = document.getElementById("play-button");
    if (element) element.scrollIntoView();
    localStorage.removeItem("returnToSpot");
  }
});
