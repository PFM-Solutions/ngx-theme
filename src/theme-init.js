/*
 * @pfm-solutions/ngx-theme — init script.
 *
 * Load it as a blocking <script> in <head> so the theme is applied before the first paint:
 *   <script src="theme-init.js" data-storage-key="theme"></script>
 *
 * It applies the same rules as ThemeService: the stored theme (`light`, `dark` or `system`; anything
 * else means `system`) is resolved against `prefers-color-scheme`, then `<html>` gets the `dark`
 * class when the result is dark and `style.colorScheme` set to the result.
 */
(function () {
  var script = document.currentScript;
  var storageKey = (script && script.getAttribute('data-storage-key')) || 'theme';
  var theme = null;
  try {
    theme = localStorage.getItem(storageKey);
  } catch {
    // Storage is unavailable (e.g. blocked cookies): fall back to the system theme.
  }
  if (theme !== 'light' && theme !== 'dark') {
    theme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  var root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
})();
