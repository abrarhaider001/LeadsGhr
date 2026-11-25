import { checkExtensionLicense } from '@leadsghr/license/extension'

// LeadsGhr Scraper does its work on its settings page (settings.html), not here. The background worker only checks the
// license at every browser start (the popup and the settings page check again when they open).
chrome.runtime.onStartup.addListener(() => {
  void checkExtensionLicense('scraper', { force: true }).catch(() => undefined)
})
