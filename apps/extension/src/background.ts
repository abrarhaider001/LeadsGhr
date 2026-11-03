/** MV3 service-worker stub. No host requests run until guard rules and permissions are wired. */
chrome.runtime.onInstalled.addListener(() => { void chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }) })
