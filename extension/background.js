// The toolbar button opens the side panel, where the agent runs. Nothing else
// lives here: the run belongs to the panel and stops when the panel closes.
const openOnClick = () => chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
chrome.runtime.onInstalled.addListener(openOnClick);
chrome.runtime.onStartup.addListener(openOnClick);
