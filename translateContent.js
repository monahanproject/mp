import { getLangState, setLangState } from "./state.js";
import {
  productionPageEN,
  productionPageFR,
  contributorsPageEN,
  contributorsPageFR,
  strings,
  buttonStrings,
  ariaStrings,
  altStrings,
} from "./translationStrings.js";
import { toggleAriaPressed } from "./settingsmenu.js";
import { SimpleAudioPlayer } from "./buildAudioplayer.js"; // Ensure the correct import if needed

let lang = localStorage.getItem("lang") || "EN"; // Retrieve initial language setting


function toggleLanguageAndStorePref() {
  console.log("toggled lang");
  lang = getLangState() === "EN" ? "FR" : "EN";
  setLangState(lang);
  updateTextsBasedOnStoredLang();
  toggleAriaPressed(document.getElementById("toggleLanguage"));
}


function updateTextsBasedOnStoredLang() {
  updateLanguageLabel();
  updateContributorsAndTeamTextForLang();
  updateAllButtonsAndStringsTxt();
  changeAriaLabels();
  changeAltTexts();
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
});



function updateLanguageLabel() {
  const langToggleButton = document.getElementById("langToggle");
  const toggleLanguageButton = document.getElementById("toggleLanguage");
  
  if (langToggleButton && toggleLanguageButton) {
    const isFrench = lang === "FR";
    const newSrc = isFrench ? "images/svg/EN.svg" : "images/svg/FR.svg";
    
    langToggleButton.src = `${newSrc}?${new Date().getTime()}`; // Prevent caching
    
    toggleLanguageButton.setAttribute("lang", isFrench ? "fr-CA" : "en-CA");
    // toggleLanguageButton.setAttribute("aria-label", isFrench ? "Consulter le site en français" : "Switch to English");
  } else {
    if (!langToggleButton) {
      console.error("Language toggle image not found");
    }
    if (!toggleLanguageButton) {
      console.error("Toggle language button not found");
    }
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
  const element = document.getElementById(string.id);
  if (element) {
    element.innerHTML = lang === "FR" ? string.fr : string.en;
  }
}

function changeAriaLabels() {
  ariaStrings.forEach(changeAriaLabel);
}

function changeAltTexts() {
  altStrings.forEach(changeAltText);
}

function changeAriaLabel(string) {
  const element = document.getElementById(string.id);
  if (element) {
    element.setAttribute("aria-label", lang === "FR" ? string.fr : string.en);
  } else {
    console.error(`Element with ID '${string.id}' not found for aria-label update.`);
  }
}

function changeAltText(string) {
  const element = document.getElementById(string.id);
  if (element) {
    console.log(element);
    const isFrench = lang === "FR";
    element.setAttribute("alt", isFrench ? string.fr : string.en);
  } else {
    console.error(`Element with ID '${string.id}' not found for alt-text update.`);
  }
}

function updatePageLang() {
  document.documentElement.setAttribute("lang", lang === "EN" ? "en" : "fr");
}



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
