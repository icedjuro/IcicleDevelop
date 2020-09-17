require('./ui')

const { remote } = require('electron')
const fs = require('fs')
const win = remote.getCurrentWindow()
const feather = require('feather-icons')
feather.replace()
let currentFileOpened

const closeButtons = document.getElementsByClassName('close-button')
const maximizeButton = document.getElementById('maximize-button')
const minimizeButton = document.getElementById('minimize-button')
const titleBarMenu = document.getElementById('titlebar-menu')
const fileExplorer = document.getElementById('fileexplorer')
const main = document.querySelector('main')
const openFile = document.getElementById('openFile')
const saveFile = document.getElementById('saveFile')
const codeArea = document.getElementById('codearea')
const welcomePage = document.getElementById('welcome-page')
const welcomeClose = document.getElementById('welcome-close-button')
const infoButton = document.getElementById('info-button')

for (const e of closeButtons) {
  e.addEventListener('click', close)
};

maximizeButton.addEventListener('click', maximize)
win.on('maximize', onMaximized)
win.on('unmaximize', onUnmaximized)
win.maximize()
minimizeButton.addEventListener('click', minimize)
welcomeClose.addEventListener('click', hideWelcome)
infoButton.addEventListener('click', showWelcome)

titleBarMenu.querySelector('#titlebar-button').addEventListener('click', showMenu)
main.addEventListener('click', hideMenu)

openFile.addEventListener('change', onFileOpened)
saveFile.addEventListener('click', onFileSaved)

// Window Functions

function close () {
  win.close()
}

function minimize () {
  win.minimize()
}

function maximize () {
  win.isMaximized() ? win.unmaximize() : win.maximize()
}

function onUnmaximized () {
  maximizeButton.children[0].src = `file://${__dirname}/../assets/maximize_button.png`
}

function onMaximized () {
  maximizeButton.children[0].src = `file://${__dirname}/../assets/restore_button.png`
}

function showMenu () {
  titleBarMenu.querySelector('ul').style.display = 'block'
}

function hideMenu () {
  titleBarMenu.querySelector('ul').style.display = 'none'
}

function hideWelcome () {
  codeArea.style.display = 'block'
  codeMirror.refresh()
  welcomePage.style.display = 'none'
}

function showWelcome () {
  codeArea.style.display = 'none'
  welcomePage.style.display = 'block'
}

// File Functions

function onFileOpened () {
  hideWelcome()
  const currentFile = openFile.files[0]
  currentFileOpened = currentFile
  const reader = new window.FileReader()
  reader.onload = () => {
    codeMirror.setValue(reader.result)
    const fileSVG = document.createElement('i')
    const fileName = document.querySelector('#fileexplorer ul li p')
    fileName.textContent = currentFile.name
    fileSVG.dataset.feather = 'file'
    fileExplorer.querySelector('ul li').textContent = ''
    fileExplorer.querySelector('ul li').appendChild(fileSVG)
    fileExplorer.querySelector('ul li').appendChild(fileName)
    feather.replace()
    changeMode(currentFile.name)
  }
  reader.readAsText(currentFile)
  hideMenu()
  openFile.value = ''
};

function onFileSaved () {
  hideMenu()
  fs.writeFile(currentFileOpened.path, codeMirror.getValue(), err => { if (err) throw (err) })
  fileExplorer.querySelector('ul li p ').textContent = currentFileOpened.name // Removes unsaved marker
}

function fileUnsaved () {
  document.querySelector('#fileexplorer ul li p ').textContent = currentFileOpened.name + '(*)'
}

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 's') { onFileSaved() }
})

window.addEventListener('keydown', function (e) {
  if (e.ctrlKey && e.key === 'o') { openFile.click() }
})

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
const changeMode = val => codeMirror.setOption('mode', CodeMirror.findModeByFileName(val).mime)
