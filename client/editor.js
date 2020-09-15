requirejs.config({
    baseUrl: "../node_modules/codemirror",
});

requirejs([
    "lib/codemirror",
    "mode/javascript/javascript",
    "mode/clike/clike",
    "mode/htmlmixed/htmlmixed",
    "mode/css/css",
    "mode/php/php",
    "mode/python/python",
    "mode/ruby/ruby",
    "mode/sql/sql",
    "mode/swift/swift",
    "mode/xml/xml",
    "addon/edit/matchbrackets",
    "addon/edit/closebrackets",
    "addon/search/search",
    "addon/dialog/dialog",
    "addon/fold/foldcode",
    "addon/fold/foldgutter",
    "addon/fold/brace-fold",
    "addon/fold/xml-fold",
    "addon/fold/indent-fold",
    "addon/fold/markdown-fold",
    "addon/fold/comment-fold",
    "addon/mode/loadmode",
    "mode/meta",
], function (CodeMirror) {
    cm = CodeMirror(document.getElementById("codearea"), {
        lineNumbers: true,
        theme: "night",
        matchBrackets: true,
        autoCloseBrackets: true,
        extraKeys: { "Ctrl-Q": function (cm) { cm.foldCode(cm.getCursor()); } },
        gutters: ["CodeMirror-linenumbers", "CodeMirror-foldgutter"],
        foldGutter: true,
    });
    cm.on("change", fileUnsaved);

    cm.setSize("100%", "100%");
    changeMode = val => cm.setOption("mode", CodeMirror.findModeByFileName(val).mime);
});

function fileUnsaved() {
    document.querySelector("#fileexplorer ul li p ").textContent = currentFileOpened.name + "(*)";
}
