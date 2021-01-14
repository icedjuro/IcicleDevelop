import { remote } from 'electron'
const version = remote.app.getVersion()
const versionNote = document.querySelector('#welcome-page h3')!
versionNote.textContent = version
  ? 'You are running version ' + version
  : 'The version of this build could not be identified'
