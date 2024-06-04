import { getLangState, setLangState } from "./state.js";
import { productionPageEN, productionPageFR, contributorsPageEN, contributorsPageFR, strings, ariaStrings } from "./translationStrings.js";
import { toggleAriaPressed } from "./settingsmenu.js";

let lang = localStorage.getItem("lang") || "EN"; // Retrieve initial language setting

function toggleLanguageAndStorePref() {
  console.log("toggled lang");
  lang = getLangState() === "EN" ? "FR" : "EN"; // Toggle the language
  setLangState(lang); // Update language in localStorage
  updateTextsBasedOnStoredLang(); 
  toggleAriaPressed(document.getElementById("toggleLanguage"));
  changeAriaLabels(); // Update aria-label attributes based on new language
  // announceLangOrLangChange(); 
}

function updateTextsBasedOnStoredLang() {
  updateLanguageLabel();
  updateContributorsAndTeamTextForLang();
  adjustFontSizeBasedOnLang("play-button-text-container");
  updateAllButtonsAndStringsTxt(); 
  changeAriaLabels();
  updatePageLang(); // Update the lang attribute of the HTML tag

  if (lang === "FR") {
    const playButtonTextContainer = document.getElementById("play-button-text-container");
    playButtonTextContainer.style.left = "40%";
    adjustFontSizeBasedOnLang("play-button-text-container");
  }
}

document.addEventListener("DOMContentLoaded", () => {
  updateTextsBasedOnStoredLang(); 
  document.querySelector("#toggleLanguage").addEventListener("click", toggleLanguageAndStorePref);
  changeAriaLabels(); // Update aria-labels on initial load
  // announceLangOrLangChange(); 
});

function updateLanguageLabel() {
  const langToggleButton = document.getElementById("langToggle");
  if (langToggleButton) {
    const newSrc = lang === "EN" ? "images/svg/FR.svg" : "images/svg/EN.svg";
    langToggleButton.src = `${newSrc}?${new Date().getTime()}`; // Prevent caching
  } else {
    console.error("Language toggle image not found");
  }
}

function updateContributorsAndTeamTextForLang() {
  const contributorsPage = document.getElementById("contributorsTeamPageInner");
  const productionPage = document.getElementById("productionTeamPageInner");

  if (contributorsPage) {
    contributorsPage.innerHTML = lang === "EN" ? contributorsPageEN : contributorsPageFR;
  } else {
    console.error("Contributors page element not found");
  }

  if (productionPage) {
    productionPage.innerHTML = lang === "EN" ? productionPageEN : productionPageFR;
  } else {
    console.error("Production team page element not found");
  }
}

function updateAllButtonsAndStringsTxt() {
  strings.forEach(changeEachString);
  buttonStrings.forEach(changeEachBtnString);
}

function changeEachString(string) {
  const element = document.getElementById(string.id);
  if (element) {
    element.innerHTML = lang === "FR" ? string.fr : string.en;
    adjustFontSizeBasedOnLang(string.id); 
  } else {
    console.error(`Element with ID '${string.id}' not found.`);
  }
}

function changeEachBtnString(string) {
  const element = document.querySelector("#" + string.id);
  if (element) {
    element.innerHTML = lang === "FR" ? string.fr : string.en;
  } else {
  }
}

function changeAriaLabels() {
  ariaStrings.forEach(changeAriaLabel);
}

function changeAriaLabel(string) {
  const element = document.getElementById(string.id);
  if (element) {
    element.setAttribute("aria-label", lang === "FR" ? string.fr : string.en);
  } else {
    console.error(`Element with ID '${string.id}' not found for aria-label update.`);
  }
}

function updatePageLang() {
  document.documentElement.setAttribute("lang", lang === "EN" ? "en" : "fr");
}

const buttonStrings = [
  { id: "invertColorsTxt", en: "Invert Colours", fr: "Inverser les couleurs" },
  { id: "textSizeTxt", en: "Text Size", fr: "Taille du Texte" },
  { id: "resetBtn", en: "Reset", fr: "Réinitialiser" },
  { id: "transcriptButton", en: "TRANSCRIPT", fr: "TRANSCRIPTION" },
  { id: "play-button-text-container", en: "BEGIN", fr: "COMMENCER" },
];

const originalFontSizes = {};

function adjustFontSizeBasedOnLang(elementId) {
  const sizeReductions = {
    curiousEarsTxt: 0.6,
  };

  if (!window.matchMedia("(min-width: 900px)").matches) {
    console.log("Viewport is less than 900px wide");
    sizeReductions["play-button-text-container"] = 0.9;
  } else {
    sizeReductions["play-button-text-container"] = 0.6;
  }

  if (sizeReductions.hasOwnProperty(elementId)) {
    const element = document.getElementById(elementId);

    if (lang === "FR") {
      if (!originalFontSizes.hasOwnProperty(elementId)) {
        const computedStyle = window.getComputedStyle(element);
        originalFontSizes[elementId] = computedStyle.fontSize;
      }

      const newSize = parseFloat(originalFontSizes[elementId]) * sizeReductions[elementId];
      element.style.fontSize = `${newSize}px`;
    } else {
      if (originalFontSizes.hasOwnProperty(elementId)) {
        element.style.fontSize = originalFontSizes[elementId];
      }
    }
  }
}

// function announceCurrentLanguage() {
//   const ariaLiveRegion = document.getElementById("statusMessage");
//   if (ariaLiveRegion) {
//     ariaLiveRegion.textContent = lang === "EN" ? "Toggle Language - English is selected" : "Basculer la langue - Le Français est sélectionné";
//   }
// }

// function announceLangOrLangChange() {
//   const ariaLiveRegion = document.getElementById("statusMessage");
//   if (ariaLiveRegion) {
//     ariaLiveRegion.textContent = lang === "EN" ? "Toggle Language - English is selected" : "Basculer la langue - Le Français est sélectionné";
//   }
// }
