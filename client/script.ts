import { remote } from 'electron'
import feather from 'feather-icons'
import FileTree from './fileTree'

import fs from 'fs'
import path from 'path'

import CodeMirror from 'codemirror'
import { listenerCount } from 'cluster'

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

// Undefined means a new file is open, null means no file is open
let currentFileOpened: _File | undefined | null = null
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

let selectedFileInFolder: HTMLLIElement
let isFolderOpen: boolean

const closeButtons = document.getElementsByClassName('close-button')!
const maximizeButton = document.getElementById('maximize-button')!
const minimizeButton = document.getElementById('minimize-button')!
const titleBarMenu = document.getElementById('titlebar-menu')!
const fileExplorer = document.getElementById('fileexplorer')!
const main = document.querySelector('main')!
const newFileButton = document.getElementById('newFile')!
const openFileButton = document.getElementById('openFile')!
const openFolderButton = document.getElementById('openFolder')!
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
}

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

newFileButton.addEventListener('click', onNewFile)
openFileButton.addEventListener('click', onFileOpened)
openFolderButton.addEventListener('click', onFolderOpened)
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
  isFolderOpen = false
  setupFile('', 'Untitled')
  titleBarMenu.querySelector('ul')!.style.display = 'none'
}

function onFileOpened () {
  dialog.showOpenDialog(win, {properties: ['openFile']}).then((result: Electron.OpenDialogReturnValue) => {
    if (!result.canceled)
    {
      isFolderOpen = false
      openFile(result.filePaths[0])
    }
  })
}

function openFile(fPath: string) {
  currentFileOpened = new _File(fPath)
  const data = fs.readFileSync(currentFileOpened!.path)
  setupFile(data.toString(), currentFileOpened!.name)
  titleBarMenu.querySelector('ul')!.style.display = 'none'
}

function onFolderOpened () {
  titleBarMenu.querySelector('ul')!.style.display = 'none'
  dialog.showOpenDialog(win, {properties: ['openDirectory']}).then((result: Electron.OpenDialogReturnValue) => {
      if (!result.canceled && result.filePaths && result.filePaths[0]) {
        isFolderOpen = true
        codeMirror.getWrapperElement().style.display = 'none'
        currentFileOpened = null
        let fileTree = new FileTree(result.filePaths[0], path.basename(result.filePaths[0]), true)
        fileTree.generate()
        renderFileTree(fileTree, fileExplorer.querySelector('ul')!, true)
      }
  })
}

function setupFile (data: string, name: string) {
  codeMirror.getWrapperElement().style.display = 'block'
  codeMirror.setValue(data)
  codeMirror.clearHistory()

  if (!isFolderOpen) {
    fileExplorer.querySelector('ul')!.textContent = ''
    const li = document.createElement('li')
    const fileSVG = document.createElement('i')
    const fileName = document.createElement('p')
    fileName.textContent = name
    fileSVG.dataset.feather = 'file'
    li.appendChild(fileSVG)
    li.appendChild(fileName)
    fileExplorer.querySelector('ul')!.appendChild(li)
    feather.replace()
  }

  changeMode(name)
  hideWelcome()
}

function renderFileTree(fileTree: FileTree, uList: HTMLUListElement, isRoot = false) {
  const itemSVG = document.createElement('i')
  if (fileTree.isDir && fileTree.isDirOpened)
    itemSVG.dataset.feather = 'folder-minus'
  else if (fileTree.isDir)
    itemSVG.dataset.feather = 'folder-plus'
  else
    itemSVG.dataset.feather = 'file'

  if (isRoot)
    uList.textContent = '' // Clear file explorer

  const li = document.createElement('li')
  li.style.justifyContent = 'flex-start'
  const itemName = document.createElement('p')
  itemName.textContent = fileTree.name
  li.appendChild(itemName)
  uList.appendChild(li)


  li.appendChild(itemSVG)
  li.appendChild(itemName)

  li.addEventListener('click', () => {
    if (selectedFileInFolder)
      selectedFileInFolder.classList.remove('selectedFile')
    selectedFileInFolder = li
    li.classList.add('selectedFile')
    if (!fileTree.isDir) {
      openFile(fileTree.itemPath)
      selectedFileInFolder.querySelector('p')!.textContent = currentFileOpened!.name // Removes unsaved marker
    }
    if (fileTree.isDirOpened) {
      fileTree.isDirOpened = false
      li.removeChild(li.childNodes[0])
      const newSVG = document.createElement('i')
      newSVG.dataset.feather = 'folder-plus'
      li.prepend(newSVG)
      const indexAhead = [...li.parentNode!.children].indexOf(li) + 1;
      (uList.children[indexAhead] as HTMLUListElement)!.style.display = 'none'
      feather.replace()
    } else if (fileTree.isDir) {
      fileTree.isDirOpened = true
      li.removeChild(li.childNodes[0])
      const newSVG = document.createElement('i')
      newSVG.dataset.feather = 'folder-minus'
      li.prepend(newSVG)
      const indexAhead = [...li.parentNode!.children].indexOf(li) + 1;
      (uList.children[indexAhead] as HTMLUListElement)!.style.display = 'block'
      feather.replace()
    }
  })

  if (fileTree.isDir)
  {
    const ul = document.createElement('ul')
    ul.classList.add('treeBorder')
    if (!fileTree.isDirOpened) ul.style.display = 'none'

    fileTree.children.forEach(child => {
      renderFileTree(child, ul)
    })
    uList.appendChild(ul)
  }

  if (isRoot) {
    feather.replace()
  }
}

function onFileSaved () {
  titleBarMenu.querySelector('ul')!.style.display = 'none'
  if (currentFileOpened===undefined) {
    const filePath = dialog.showSaveDialogSync({})
    currentFileOpened = new _File(filePath!)
  }
  if (currentFileOpened === null) return
  fs.writeFile(currentFileOpened.path, codeMirror.getValue(), err => { if (err) throw (err) })
  if (selectedFileInFolder)
    selectedFileInFolder.querySelector('p')!.textContent = currentFileOpened.name // Removes unsaved marker
  else
  fileExplorer.querySelector('ul li p')!.textContent = currentFileOpened.name // Removes unsaved marker
}

function fileUnsaved () {
  if (!isFolderOpen) {
    if (currentFileOpened) {
      document.querySelector('#fileexplorer ul li p')!.textContent = currentFileOpened.name + '(*)'
    } else {
      document.querySelector('#fileexplorer ul li p')!.textContent = 'Untitled' + '(*)'
    }
  } else if (currentFileOpened && selectedFileInFolder) {
      selectedFileInFolder.querySelector('p')!.textContent = currentFileOpened.name + '(*)'
  }
}

// Shortcut Keys
window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 's') { onFileSaved() }
})

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'o') { openFileButton.click() }
})

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.shiftKey && e.key === 'a') { openFolderButton.click() }
})

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'n') { newFileButton.click() }
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
