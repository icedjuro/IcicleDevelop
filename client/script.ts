import { remote } from 'electron'
import feather from 'feather-icons'

import fs from 'fs'
import path from 'path'

// CodeMirror Configuration
import CodeMirror from 'codemirror'

require('./ui')
const win = remote.getCurrentWindow()
const dialog = remote.dialog
feather.replace()

// Must use custom file object
// Built-in File object doesn't work well for this use case
interface _File {
  path: string
  name: string
}

class _File {
  constructor (filePath: string) {
    this.path = filePath
    this.name = path.basename(filePath)
  }
}

let currentFileOpened: _File | undefined
const settingsPath = path.join(remote.app.getPath('userData'), 'settings.json')

interface SettingsData {
  keyMap: string
  fontSize: string // Input HTML elements must accept it as a string
}

let settingsData: SettingsData
if (!fs.existsSync(settingsPath)) {
  fs.readFile(path.join(__dirname, 'defaultSettings.json'), (err, data) => {
    if (err) throw err
    fs.writeFile(settingsPath, data, err => { if (err) throw (err) })
  })
}

const closeButtons = document.getElementsByClassName('close-button')!
const maximizeButton = document.getElementById('maximize-button')!
const minimizeButton = document.getElementById('minimize-button')!
const titleBarMenu = document.getElementById('titlebar-menu')!
const fileExplorer = document.getElementById('fileexplorer')!
const main = document.querySelector('main')!
const newFile = document.getElementById('newFile')!
const openFile = <HTMLInputElement>document.getElementById('openFile')!
const saveFile = document.getElementById('saveFile')!
const codeArea = document.getElementById('codearea')!
const welcomePage = document.getElementById('welcome-page')!
const welcomeClose = document.getElementById('welcome-close-button')!
const infoButton = document.getElementById('info-button')!
const settingsModal = document.getElementById('settingsModal')!
const settingsButton = document.getElementById('settings-button')!
const settingsClose = document.getElementById('settingsCloseButton')!
const settingsForm = <HTMLFormElement>document.getElementById('settingsForm')!

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
  (<HTMLImageElement>maximizeButton.children[0]).src = `file://${__dirname}/../assets/restore_button.png`
})

win.on('unmaximize', () => {
  (<HTMLImageElement>maximizeButton.children[0]).src = `file://${__dirname}/../assets/maximize_button.png`
})

win.maximize()
minimizeButton.addEventListener('click', () => win.minimize())
welcomeClose.addEventListener('click', hideWelcome)

infoButton.addEventListener('click', showWelcome)
titleBarMenu.querySelector('#titlebar-button')!.addEventListener('click', () => {
  titleBarMenu.querySelector('ul')!.style.display = 'block'
})

main.addEventListener('click', () => {
  titleBarMenu.querySelector('ul')!.style.display = 'none'
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
    settingsData.keyMap = settingsForm.querySelector<HTMLSelectElement>('[name="keyMap"]')!.value
    settingsData.fontSize = settingsForm.querySelector<HTMLInputElement>('[name="fontSize"]')!.value
    loadSettingsData()
    updateSettingsFile()
  }
})

settingsForm.addEventListener('submit', e => {
  e.preventDefault()
})

fs.watchFile(settingsPath, () => readTextFile(settingsPath))
function readTextFile (filePath: string) {
  const data = fs.readFileSync(filePath)
  settingsData = JSON.parse(data.toString())
  loadSettingsData()
  updateSettingsMenu()
}

function loadSettingsData () {
  codeMirror.setOption('keyMap', settingsData.keyMap)
  document.querySelector<HTMLElement>('.CodeMirror')!.style.fontSize = `${settingsData.fontSize}px`
}

function updateSettingsMenu () {
  settingsForm.querySelector<HTMLSelectElement>('[name="keyMap"]')!.value = settingsData.keyMap
  settingsForm.querySelector<HTMLInputElement>('[name="fontSize"]')!.value = settingsData.fontSize || '16'
}

function updateSettingsFile () {
  fs.writeFile(settingsPath, JSON.stringify(settingsData), err => { if (err) throw (err) })
}

// File Functions
function onNewFile () {
  currentFileOpened = undefined
  setupFile('', 'Untitled')
  titleBarMenu.querySelector('ul')!.style.display = 'none'
}

function onFileOpened () {
  // File object doesn't have property "path" but can still be used from file input elements
  // Therefore, it must be asserted to type any
  currentFileOpened = new _File((<any>openFile.files![0]).path)

  const data = fs.readFileSync(currentFileOpened.path)
  setupFile(data.toString(), currentFileOpened.name)
  titleBarMenu.querySelector('ul')!.style.display = 'none'
  openFile.value = ''
};

function setupFile (data: string, name: string) {
  codeMirror.getWrapperElement().style.display = 'block'
  codeMirror.setValue(data)
  codeMirror.clearHistory()

  const fileSVG = document.createElement('i')
  const fileName = document.querySelector('#fileexplorer ul li p')!
  fileName.textContent = name
  fileSVG.dataset.feather = 'file'
  fileExplorer.querySelector('ul li')!.textContent = ''
  fileExplorer.querySelector('ul li')!.appendChild(fileSVG)
  fileExplorer.querySelector('ul li')!.appendChild(fileName)
  feather.replace()
  changeMode(name)
  hideWelcome()
}

function onFileSaved () {
  titleBarMenu.querySelector('ul')!.style.display = 'none'
  if (!currentFileOpened) {
    const filePath = dialog.showSaveDialogSync({})
    currentFileOpened = new _File(filePath!)
  }

  fs.writeFile(currentFileOpened.path, codeMirror.getValue(), err => { if (err) throw (err) })
  fileExplorer.querySelector('ul li p ')!.textContent = currentFileOpened.name // Removes unsaved marker
}

function fileUnsaved () {
  if (currentFileOpened) {
    document.querySelector('#fileexplorer ul li p ')!.textContent = currentFileOpened.name + '(*)'
  } else {
    document.querySelector('#fileexplorer ul li p ')!.textContent = 'Untitled' + '(*)'
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

// Note: Codemirror's types aren't maintained currently, so the "any" type will probably be abused here
const codeMirror = CodeMirror(document.getElementById('codearea')!, <any>{
  lineNumbers: true,
  theme: 'night',
  matchBrackets: true,
  autoCloseBrackets: true,
  extraKeys: { 'Ctrl-Q': function (cm: any) { cm.foldCode(cm.getCursor()) } },
  gutters: ['CodeMirror-linenumbers', 'CodeMirror-foldgutter'],
  foldGutter: true
})
codeMirror.on('change', fileUnsaved)

codeMirror.setSize('100%', '100%')
const changeMode = (val: string) => {
  if ((<any>CodeMirror).findModeByFileName(val)) { codeMirror.setOption('mode', (<any>CodeMirror).findModeByFileName(val).mime) }
}

codeMirror.getWrapperElement().style.display = 'none'
readTextFile(settingsPath)
