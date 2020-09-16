const { app, BrowserWindow, Menu } = require("electron");
const { autoUpdater } = require("electron-updater");

let dev = false;
const args = process.argv.slice(2);
args.forEach((val, index) => {

    switch (val) {
        case "--dev":
            dev = true;
            break;
        default:
            console.log("Invalid argument (" + index + "): " + val);
            process.exit();
    }
});

if (!dev) Menu.setApplicationMenu(null);

function boot() {
    autoUpdater.checkForUpdatesAndNotify();
    let window = new BrowserWindow({
        frame: false,
        resizable: true,
        icon: "assets/logo256.png",
        minHeight: 400,
        minWidth: 500,
        webPreferences: {
            nodeIntegration: true,
            enableRemoteModule: true
        }
    });
    window.loadURL(`file://${__dirname}/client/index.html`);

    window.on("closed", () => {
        window = null;
    });
}

app.on("ready", boot);