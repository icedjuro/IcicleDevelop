const { remote } = require("electron");
const fs = require("fs");
const win = remote.getCurrentWindow();

const closeButtons = document.getElementsByClassName("close-button");
const maximizeButton = document.getElementById("maximize-button");
const minimizeButton = document.getElementById("minimize-button");
const titleBarMenu = document.getElementById("titlebar-menu");
const fileExplorer = document.getElementById("fileexplorer");
const main = document.querySelector("main");
const openFile = document.getElementById("openFile");
const saveFile = document.getElementById("saveFile");
const codeArea = document.getElementById("codearea");
const welcomePage = document.getElementById("welcome-page");
const welcomeClose = document.getElementById("welcome-close-button");
const infoButton = document.getElementById("info-button");

for (e of closeButtons) {
    e.addEventListener("click", close);
};
maximizeButton.addEventListener("click", maximize);
win.on("maximize", onMaximized);
win.on("unmaximize", onUnmaximized);
win.maximize();
minimizeButton.addEventListener("click", minimize);
welcomeClose.addEventListener("click", hideWelcome);
infoButton.addEventListener("click", showWelcome);

titleBarMenu.querySelector("#titlebar-button").addEventListener("click", showMenu);
main.addEventListener("click", hideMenu);

openFile.addEventListener("change", onFileOpened);
saveFile.addEventListener("click", onFileSaved);

// Window Functions

function close() {
    win.close();
}

function minimize() {
    win.minimize();
}

function maximize() {
    win.isMaximized() ? win.unmaximize() : win.maximize();
}

function onUnmaximized() {
    maximizeButton.children[0].src = `file://${__dirname}/../assets/maximize_button.png`;
}

function onMaximized() {
    maximizeButton.children[0].src = `file://${__dirname}/../assets/restore_button.png`;
}

function showMenu() {
    titleBarMenu.querySelector("ul").style.display = "block";
}

function hideMenu() {
    titleBarMenu.querySelector("ul").style.display = "none";
}

function hideWelcome() {
    codeArea.style.display = "block";
    cm.refresh();
    welcomePage.style.display = "none";
}

function showWelcome() {
    codeArea.style.display = "none";
    welcomePage.style.display = "block";
}

// File Functions

function onFileOpened() {
    hideWelcome();
    const currentFile = openFile.files[0];
    currentFileOpened = currentFile;
    const reader = new FileReader();
    reader.onload = () => {
        cm.setValue(reader.result);
        const fileSVG = document.createElement("i");
        const fileName = document.querySelector("#fileexplorer ul li p");
        fileName.textContent = currentFile.name;
        fileSVG.dataset.feather = "file";
        fileExplorer.querySelector("ul li").textContent = "";
        fileExplorer.querySelector("ul li").appendChild(fileSVG);
        fileExplorer.querySelector("ul li").appendChild(fileName);
        feather.replace();
        changeMode(currentFile.name);
    };
    reader.readAsText(currentFile);
    hideMenu();
    openFile.value = "";
};

function onFileSaved() {
    hideMenu();
    fs.writeFile(currentFileOpened.path, cm.getValue(), err => { if (err) throw (err) });
    fileExplorer.querySelector("ul li p ").textContent = currentFileOpened.name; //Removes unsaved marker
}

window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key == "s")
        onFileSaved();
});

window.addEventListener('keydown', function (e) {
    if (e.ctrlKey && e.key == "o")
        openFile.click();
});
