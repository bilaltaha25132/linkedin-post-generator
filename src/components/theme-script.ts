export const THEME_STORAGE_KEY = "theme";

/**
 * Runs in <head> before paint. With no saved choice it leaves data-theme off,
 * so the CSS follows the system setting.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`;
