require('./ui')

const { remote } = require('electron')
const win = remote.getCurrentWindow()
const dialog = remote.dialog
const feather = require('feather-icons')
feather.replace()

// Must use custom file object
// Built-in File object doesn't work well for this use case
function _File (filePath) {
  this.path = filePath
  this.name = path.basename(filePath)
}
let currentFileOpened

const fs = require('fs')
const path = require('path')
const settingsPath = path.join(remote.app.getPath('userData'), 'settings.json')
let settingsData
if (!fs.existsSync(settingsPath)) {
  fs.readFile(path.join(__dirname, 'defaultSettings.json'), (err, data) => {
    if (err) throw err
    fs.writeFile(settingsPath, data, defaultErrorCallback)
  })
}

const closeButtons = document.getElementsByClassName('close-button')
const maximizeButton = document.getElementById('maximize-button')
const minimizeButton = document.getElementById('minimize-button')
const titleBarMenu = document.getElementById('titlebar-menu')
const fileExplorer = document.getElementById('fileexplorer')
const main = document.querySelector('main')
const newFile = document.getElementById('newFile')
const openFile = document.getElementById('openFile')
const saveFile = document.getElementById('saveFile')
const codeArea = document.getElementById('codearea')
const welcomePage = document.getElementById('welcome-page')
const welcomeClose = document.getElementById('welcome-close-button')
const infoButton = document.getElementById('info-button')
const settingsModal = document.getElementById('settingsModal')
const settingsButton = document.getElementById('settings-button')
const settingsClose = document.getElementById('settingsCloseButton')
const settingsForm = document.getElementById('settingsForm')

window.addEventListener('click', e => {
  if (e.target === settingsModal) {
    settingsModal.style.display = 'none'
    main.style.filter = 'blur(0)'
  }
})

for (const e of closeButtons) {
  e.addEventListener('click', () => win.close())
};

maximizeButton.addEventListener('click', () => win.isMaximized() ? win.unmaximize() : win.maximize())
win.on('maximize', () => {
  maximizeButton.children[0].src = `file://${__dirname}/../assets/restore_button.png`
})

win.on('unmaximize', () => {
  maximizeButton.children[0].src = `file://${__dirname}/../assets/maximize_button.png`
})

win.maximize()
minimizeButton.addEventListener('click', () => win.minimize())
welcomeClose.addEventListener('click', hideWelcome)

infoButton.addEventListener('click', showWelcome)
titleBarMenu.querySelector('#titlebar-button').addEventListener('click', () => {
  titleBarMenu.querySelector('ul').style.display = 'block'
})

main.addEventListener('click', () => {
  titleBarMenu.querySelector('ul').style.display = 'none'
})

newFile.addEventListener('click', onNewFile)
openFile.addEventListener('change', onFileOpened)
saveFile.addEventListener('click', onFileSaved)

function hideWelcome () {
  codeArea.style.display = 'block'
  codeMirror.refresh()
  welcomePage.style.display = 'none'
}

function showWelcome () {
  codeArea.style.display = 'none'
  welcomePage.style.display = 'block'
}

function onSettingsButtonClick () {
  settingsModal.style.display = 'block'
  main.style.filter = 'blur(10px)'
}

// Settings Functions
settingsButton.addEventListener('click', onSettingsButtonClick)
settingsClose.addEventListener('click', () => {
  settingsModal.style.display = 'none'
  main.style.filter = 'blur(0)'
})

settingsForm.addEventListener('focusout', updateSettingsMenu)
settingsForm.addEventListener('change', () => {
  if (settingsForm.checkValidity()) {
    settingsData.keyMap = settingsForm.querySelector('[name="keyMap"]').value
    settingsData.fontSize = settingsForm.querySelector('[name="fontSize"]').value
    loadSettingsData()
    updateSettingsFile()
  }
})

settingsForm.addEventListener('submit', e => {
  e.preventDefault()
})

fs.watchFile(settingsPath, () => readTextFile(settingsPath))
function readTextFile (filePath) {
  const data = fs.readFileSync(filePath)
  settingsData = JSON.parse(data.toString())
  loadSettingsData()
  updateSettingsMenu()
}

function loadSettingsData () {
  codeMirror.setOption('keyMap', settingsData.keyMap)
  document.querySelector('.CodeMirror').style.fontSize = `${settingsData.fontSize}px`
}

function updateSettingsMenu () {
  settingsForm.querySelector('[name="keyMap"]').value = settingsData.keyMap
  settingsForm.querySelector('[name="fontSize"]').value = settingsData.fontSize || 16
}

function updateSettingsFile () {
  fs.writeFile(settingsPath, JSON.stringify(settingsData), defaultErrorCallback)
}

// File Functions
function defaultErrorCallback (err) {
  if (err) throw (err)
}

function onNewFile () {
  currentFileOpened = undefined
  setupFile('', 'Untitled')
  titleBarMenu.querySelector('ul').style.display = 'none'
}

function onFileOpened () {
  currentFileOpened = new _File(openFile.files[0].path)
  const data = fs.readFileSync(currentFileOpened.path)
  setupFile(data.toString(), currentFileOpened.name)
  titleBarMenu.querySelector('ul').style.display = 'none'
  openFile.value = ''
};

function setupFile (data, name) {
  codeMirror.getWrapperElement().style.display = 'block'
  codeMirror.setValue(data)
  codeMirror.clearHistory()

  const fileSVG = document.createElement('i')
  const fileName = document.querySelector('#fileexplorer ul li p')
  fileName.textContent = name
  fileSVG.dataset.feather = 'file'
  fileExplorer.querySelector('ul li').textContent = ''
  fileExplorer.querySelector('ul li').appendChild(fileSVG)
  fileExplorer.querySelector('ul li').appendChild(fileName)
  feather.replace()
  changeMode(name)
  hideWelcome()
}

function onFileSaved () {
  titleBarMenu.querySelector('ul').style.display = 'none'
  if (!currentFileOpened) {
    const filePath = dialog.showSaveDialogSync()
    currentFileOpened = new _File(filePath)
  }

  fs.writeFile(currentFileOpened.path, codeMirror.getValue(), defaultErrorCallback)
  fileExplorer.querySelector('ul li p ').textContent = currentFileOpened.name // Removes unsaved marker
}

function fileUnsaved () {
  if (currentFileOpened) {
    document.querySelector('#fileexplorer ul li p ').textContent = currentFileOpened.name + '(*)'
  } else {
    document.querySelector('#fileexplorer ul li p ').textContent = 'Untitled' + '(*)'
  }
}

// Shortcut Keys
window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 's') { onFileSaved() }
})

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'o') { openFile.click() }
})

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'n') { newFile.click() }
})

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === ',') { onSettingsButtonClick() }
})

// CodeMirror Configuration
const CodeMirror = require('../node_modules/codemirror/lib/codemirror')
require('../node_modules/codemirror/mode/javascript/javascript')
require('../node_modules/codemirror/mode/clike/clike')
require('../node_modules/codemirror/mode/htmlmixed/htmlmixed')
require('../node_modules/codemirror/mode/css/css')
require('../node_modules/codemirror/mode/php/php')
require('../node_modules/codemirror/mode/python/python')
require('../node_modules/codemirror/mode/ruby/ruby')
require('../node_modules/codemirror/mode/sql/sql')
require('../node_modules/codemirror/mode/swift/swift')
require('../node_modules/codemirror/mode/xml/xml')
require('../node_modules/codemirror/addon/edit/matchbrackets')
require('../node_modules/codemirror/addon/edit/closebrackets')
require('../node_modules/codemirror/addon/search/search')
require('../node_modules/codemirror/addon/dialog/dialog')
require('../node_modules/codemirror/addon/fold/foldcode')
require('../node_modules/codemirror/addon/fold/foldgutter')
require('../node_modules/codemirror/addon/fold/brace-fold')
require('../node_modules/codemirror/addon/fold/xml-fold')
require('../node_modules/codemirror/addon/fold/indent-fold')
require('../node_modules/codemirror/addon/fold/markdown-fold')
require('../node_modules/codemirror/addon/fold/comment-fold')
require('../node_modules/codemirror/addon/mode/loadmode')
require('../node_modules/codemirror/mode/meta')
require('../node_modules/codemirror/keymap/vim')
require('../node_modules/codemirror/keymap/emacs')
require('../node_modules/codemirror/keymap/sublime')

const codeMirror = CodeMirror(document.getElementById('codearea'), {
  lineNumbers: true,
  theme: 'night',
  matchBrackets: true,
  autoCloseBrackets: true,
  extraKeys: { 'Ctrl-Q': function (cm) { cm.foldCode(cm.getCursor()) } },
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  foldGutter: true
})
codeMirror.on('change', fileUnsaved)

codeMirror.setSize('100%', '100%')
const changeMode = val => {
  if (CodeMirror.findModeByFileName(val)) { codeMirror.setOption('mode', CodeMirror.findModeByFileName(val).mime) }
}

codeMirror.getWrapperElement().style.display = 'none'
readTextFile(settingsPath)
