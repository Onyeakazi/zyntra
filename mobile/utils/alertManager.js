let showAlertCallback = null;

/**
 * Registers the callback that will be triggered when a custom alert is requested.
 * Typically registered by the CustomAlertModal component.
 */
export const registerAlertCallback = (cb) => {
  showAlertCallback = cb;
};

/**
 * Displays a custom alert popup with title, message, and button configurations.
 * If the UI components haven't registered the callback, it falls back to native console logging.
 */
export const customAlert = (title, message, buttons, options) => {
  if (showAlertCallback) {
    showAlertCallback({ title, message, buttons, options });
  } else {
    console.warn("Global alert requested but no CustomAlertModal callback registered:", { title, message, buttons });
  }
};
