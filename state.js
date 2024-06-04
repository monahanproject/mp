export function updateAriaStatusMessage(message) {
  const ariaStatus = document.getElementById("aria-status");
  
  if (ariaStatus) {
    // Check if the message is redundant and should be hidden
    if (message.includes("redundant message part")) {
      ariaStatus.setAttribute("aria-hidden", "true");
    } else {
      ariaStatus.removeAttribute("aria-hidden");
    }

    ariaStatus.textContent = message;
  }
}


// Create a variable to hold the initial state of 'isInverted' amd default to false.
let initialState = false; 

// Define the 'state' object with a property 'isInverted' initialized to the value of 'initialState'.
let state = {
  isInverted: initialState
};

// Define a function 'getState' that returns the current state of 'isInverted'.
export const getState = () => state.isInverted;

// Define a function 'setState' to update the state of 'isInverted'.
export const setState = (isInverted) => {
  state.isInverted = isInverted; // Update the state object with the new value.
};


// Initialize the language state based on localStorage or default to "EN"
export let lang = localStorage.getItem("lang") || "EN";

// Get the current language
export function getLangState() {
  return lang;
}

// Set the current language and update localStorage
export function setLangState(newLang) {
  lang = newLang;
  localStorage.setItem("lang", newLang);
}

// Export the language state directly
export default lang;
