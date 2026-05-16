var URL = window.URL || window.webkitURL || window.mozURL || window.msURL;

navigator.saveBlob = navigator.saveBlob || navigator.msSaveBlob || navigator.mozSaveBlob || navigator.webkitSaveBlob;

window.saveAs = window.saveAs || window.webkitSaveAs || window.mozSaveAs || window.msSaveAs;

var languageOverrides = {
  js: "javascript",
  html: "xml"
};

var livestyles;

var md = markdownit({
  html: true,
  highlight: function(code, lang) {
    if (languageOverrides[lang]) lang = languageOverrides[lang];
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(lang, code).value;
      } catch (e) {}
    }
    return "";
  }
}).use(markdownitFootnote);

var hashto;

var extensionDraftStorageKey = "copyAsMarkdownDraft";

var themeStorageKey = "editorTheme";

var i18nApi = typeof browser !== "undefined" && browser.i18n ? browser.i18n : typeof chrome !== "undefined" && chrome.i18n ? chrome.i18n : null;

var i18nStrings = {};

function t(key, fallback) {
  if (!i18nApi || typeof i18nApi.getMessage !== "function") {
    return fallback || key;
  }
  var message = i18nApi.getMessage(key);
  return message || fallback || key;
}

function loadI18nStrings() {
  i18nStrings = {
    editorTitle: t("editorPageTitle", "Markdown Benez"),
    initialDocument: t("editorInitialDocument", "# New Document"),
    fileApiUnsupported: t("alertFileApiUnsupported", "The File APIs are not fully supported in this browser."),
    beforeUnloadMessage: t("beforeUnloadMessage", "It looks like you have been editing something. If you leave before saving, your changes will be lost."),
    placeholderBoldText: t("placeholderBoldText", "bold text"),
    placeholderItalicText: t("placeholderItalicText", "italic text"),
    placeholderStrikethrough: t("placeholderStrikethrough", "strikethrough"),
    placeholderCode: t("placeholderCode", "code"),
    placeholderLinkText: t("placeholderLinkText", "text"),
    placeholderAltText: t("placeholderAltText", "alt text"),
    placeholderCodeBlock: t("placeholderCodeBlock", "code"),
    tableColumn1: t("tableColumn1", "Column 1"),
    tableColumn2: t("tableColumn2", "Column 2"),
    tableValueA: t("tableValueA", "Value A"),
    tableValueB: t("tableValueB", "Value B")
  };
}

function setElementText(id, messageKey, fallback) {
  var element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.textContent = t(messageKey, fallback);
}

function setElementTitle(id, messageKey, fallback) {
  var element = document.getElementById(id);
  if (!element) {
    return;
  }
  element.setAttribute("title", t(messageKey, fallback));
}

function applyEditorI18n() {
  loadI18nStrings();
  document.title = i18nStrings.editorTitle;
  setElementText("saveMenuTitle", "editorSaveAs", "Save As");
  setElementText("saveAsMarkdownLabel", "editorSaveAsMarkdown", "Markdown");
  setElementText("saveAsHtmlLabel", "editorSaveAsHtml", "HTML");
  setElementText("headingOption0", "headingParagraph", "Paragraph");
  setElementText("headingOption1", "heading1", "Heading 1");
  setElementText("headingOption2", "heading2", "Heading 2");
  setElementText("headingOption3", "heading3", "Heading 3");
  setElementText("headingOption4", "heading4", "Heading 4");
  setElementText("headingOption5", "heading5", "Heading 5");
  setElementText("headingOption6", "heading6", "Heading 6");
  setElementTitle("openbutton", "toolbarOpenFromDisk", "Open from disk");
  setElementTitle("savebutton", "toolbarDownload", "Download");
  setElementTitle("browsersavebutton", "toolbarBrowserSave", "Save in browser");
  setElementTitle("nightbutton", "toolbarNightMode", "Night mode");
  setElementTitle("newbutton", "toolbarClearDocument", "Clear document");
  setElementTitle("undoButton", "toolbarUndo", "Undo");
  setElementTitle("redoButton", "toolbarRedo", "Redo");
  setElementTitle("headingSelect", "toolbarHeadingLevel", "Heading level");
  setElementTitle("boldButton", "toolbarBold", "Bold");
  setElementTitle("italicButton", "toolbarItalic", "Italic");
  setElementTitle("strikeButton", "toolbarStrikethrough", "Strikethrough");
  setElementTitle("codeButton", "toolbarInlineCode", "Inline code");
  setElementTitle("quoteButton", "toolbarBlockquote", "Blockquote");
  setElementTitle("bulletListButton", "toolbarBulletList", "Bullet list");
  setElementTitle("numberListButton", "toolbarNumberedList", "Numbered list");
  setElementTitle("taskListButton", "toolbarTaskList", "Task list");
  setElementTitle("linkButton", "toolbarInsertLink", "Insert link");
  setElementTitle("imageButton", "toolbarInsertImage", "Insert image");
  setElementTitle("codeBlockButton", "toolbarCodeBlock", "Code block");
  setElementTitle("tableButton", "toolbarTable", "Table");
  setElementTitle("hrButton", "toolbarHorizontalRule", "Horizontal rule");
}

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

async function loadExtensionDraftFromStorage() {
  if (getQueryParam("source") !== "extension-draft") {
    return false;
  }
  var extensionApi = typeof browser !== "undefined" ? browser : typeof chrome !== "undefined" ? chrome : null;
  if (!extensionApi || !extensionApi.storage || !extensionApi.storage.local) {
    return false;
  }
  try {
    var result;
    if (typeof browser !== "undefined") {
      result = await extensionApi.storage.local.get(extensionDraftStorageKey);
    } else {
      result = await new Promise(function(resolve) {
        extensionApi.storage.local.get(extensionDraftStorageKey, resolve);
      });
    }
    var draft = result && result[extensionDraftStorageKey];
    if (typeof draft !== "string" || draft.length === 0) {
      return false;
    }
    editor.setValue(draft);
    if (typeof browser !== "undefined") {
      await extensionApi.storage.local.remove(extensionDraftStorageKey);
    } else {
      await new Promise(function(resolve) {
        extensionApi.storage.local.remove(extensionDraftStorageKey, resolve);
      });
    }
    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}

function update(e) {
  setOutput(e.getValue());
  var headerElements = document.querySelectorAll("h1");
  if (headerElements.length > 0 && headerElements[0].textContent.length > 0) {
    title = headerElements[0].textContent;
  } else {
    title = i18nStrings.editorTitle;
  }
  oldTitle = document.title;
  if (oldTitle != title) {
    oldTitle = title;
    document.title = title;
  }
}

var render_tasklist = function(str) {
  if (str.match(/<li>\[x\]\s+\w+/gi)) {
    str = str.replace(/(<li)(>\[x\]\s+)(\w+)/gi, `$1 style="list-style-type: none;"><input type="checkbox" \n          checked style="list-style-type: none; \n          margin: 0 0.2em 0 -1.3em;" disabled> $3`);
  }
  if (str.match(/<li>\[ \]\s+\w+/gi)) {
    str = str.replace(/(<li)(>\[ \]\s+)(\w+)/gi, `$1 style="list-style-type: none;"><input type="checkbox" \n            style="list-style-type: none; \n            margin: 0 0.2em 0 -1.3em;" disabled> $3`);
  }
  return str;
};

function setOutput(val) {
  val = val.replace(/<equation>((.*?\n)*?.*?)<\/equation>/gi, function(a, b) {
    return '<img src="http://latex.codecogs.com/png.latex?' + encodeURIComponent(b) + '" />';
  });
  var out = document.getElementById("out");
  var old = out.cloneNode(true);
  out.innerHTML = md.render(val);
  out.innerHTML = render_tasklist(out.innerHTML);
  var allold = old.getElementsByTagName("*");
  if (allold === undefined) return;
  var allnew = out.getElementsByTagName("*");
  if (allnew === undefined) return;
  for (var i = 0, max = Math.min(allold.length, allnew.length); i < max; i++) {
    if (!allold[i].isEqualNode(allnew[i])) {
      out.scrollTop = allnew[i].offsetTop;
      return;
    }
  }
}

var editor = CodeMirror.fromTextArea(document.getElementById("code"), {
  mode: "gfm",
  lineNumbers: false,
  matchBrackets: true,
  lineWrapping: true,
  theme: "base16-light",
  extraKeys: {
    Enter: "newlineAndIndentContinueMarkdownList"
  }
});

editor.on("change", update);

function selectionChanger(selection, operator, endoperator) {
  if (!endoperator) {
    endoperator = operator;
  }
  if (selection === "") {
    return operator + endoperator;
  }
  var hasOpening = selection.slice(0, operator.length) === operator;
  var hasClosing = selection.slice(-endoperator.length) === endoperator;
  if (hasOpening && hasClosing) {
    return selection.slice(operator.length, selection.length - endoperator.length);
  }
  return operator + selection + endoperator;
}

function wrapSelection(prefix, suffix, placeholder) {
  if (!suffix) {
    suffix = prefix;
  }
  var selection = editor.getSelection();
  if (!selection) {
    selection = placeholder || "";
  }
  editor.replaceSelection(prefix + selection + suffix, "around");
  editor.focus();
}

function replaceSelectedLines(transformLine) {
  var selection = editor.getSelection();
  if (!selection) {
    var cursor = editor.getCursor();
    var currentLine = editor.getLine(cursor.line);
    var transformedLine = transformLine(currentLine, 0);
    editor.replaceRange(transformedLine, {
      line: cursor.line,
      ch: 0
    }, {
      line: cursor.line,
      ch: currentLine.length
    });
    editor.focus();
    return;
  }
  var lines = selection.split("\n");
  var transformed = lines.map(transformLine).join("\n");
  editor.replaceSelection(transformed, "around");
  editor.focus();
}

function togglePrefix(line, prefix) {
  if (line.indexOf(prefix) === 0) {
    return line.slice(prefix.length);
  }
  return prefix + line;
}

function applyHeading(level) {
  replaceSelectedLines(function(line) {
    var stripped = line.replace(/^\s*#{1,6}\s+/, "");
    if (level === 0) {
      return stripped;
    }
    return "#".repeat(level) + " " + stripped;
  });
}

function insertBulletList() {
  replaceSelectedLines(function(line) {
    return togglePrefix(line, "- ");
  });
}

function insertNumberList() {
  replaceSelectedLines(function(line, index) {
    var stripped = line.replace(/^\d+\.\s+/, "");
    return index + 1 + ". " + stripped;
  });
}

function insertTaskList() {
  replaceSelectedLines(function(line) {
    if (line.indexOf("- [ ] ") === 0) {
      return line.slice(6);
    }
    return "- [ ] " + line.replace(/^- /, "");
  });
}

function insertQuote() {
  replaceSelectedLines(function(line) {
    return togglePrefix(line, "> ");
  });
}

function insertLink() {
  var selection = editor.getSelection() || i18nStrings.placeholderLinkText;
  editor.replaceSelection("[" + selection + "](https://example.com)", "around");
  editor.focus();
}

function insertImage() {
  var selection = editor.getSelection() || i18nStrings.placeholderAltText;
  editor.replaceSelection("![" + selection + "](https://example.com/image.png)", "around");
  editor.focus();
}

function insertCodeBlock() {
  var selection = editor.getSelection();
  var snippet = selection ? selection : i18nStrings.placeholderCodeBlock;
  editor.replaceSelection("```text\n" + snippet + "\n```", "around");
  editor.focus();
}

function insertHorizontalRule() {
  editor.replaceSelection("\n\n---\n\n");
  editor.focus();
}

function insertTable() {
  var table = [ "| " + i18nStrings.tableColumn1 + " | " + i18nStrings.tableColumn2 + " |", "| --- | --- |", "| " + i18nStrings.tableValueA + " | " + i18nStrings.tableValueB + " |" ].join("\n");
  editor.replaceSelection(table, "around");
  editor.focus();
}

editor.addKeyMap({
  "Ctrl-B": function(cm) {
    cm.replaceSelection(selectionChanger(cm.getSelection(), "**"));
  },
  "Ctrl-I": function(cm) {
    cm.replaceSelection(selectionChanger(cm.getSelection(), "_"));
  },
  "Ctrl-K": function(cm) {
    cm.replaceSelection(selectionChanger(cm.getSelection(), "`"));
  },
  "Ctrl-L": function(cm) {
    cm.replaceSelection(selectionChanger(cm.getSelection(), "<kbd>", "</kbd>"));
  }
});

document.addEventListener("drop", function(e) {
  e.preventDefault();
  e.stopPropagation();
  var reader = new FileReader;
  reader.onload = function(e) {
    editor.setValue(e.target.result);
  };
  reader.readAsText(e.dataTransfer.files[0]);
}, false);

function saveAsMarkdown() {
  save(editor.getValue(), document.title.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/gi, "") + ".md");
}

function saveAsHtml() {
  save(document.getElementById("out").innerHTML, document.title.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/\s]/gi, "") + ".html");
}

document.getElementById("saveas-markdown").addEventListener("click", function() {
  saveAsMarkdown();
  hideMenu();
});

document.getElementById("saveas-html").addEventListener("click", function() {
  saveAsHtml();
  hideMenu();
});

function save(code, name) {
  var blob = new Blob([ code ], {
    type: "text/plain"
  });
  if (window.saveAs) {
    window.saveAs(blob, name);
  } else if (navigator.saveBlob) {
    navigator.saveBlob(blob, name);
  } else {
    url = URL.createObjectURL(blob);
    var link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", name);
    var event = document.createEvent("MouseEvents");
    event.initMouseEvent("click", true, true, window, 1, 0, 0, 0, 0, false, false, false, false, 0, null);
    link.dispatchEvent(event);
  }
}

var menuVisible = false;

var menu = document.getElementById("menu");

var modalOverlay = document.getElementById("modal-overlay");

function showMenu() {
  menuVisible = true;
  menu.style.display = "block";
  modalOverlay.classList.remove("hidden");
}

function hideMenu() {
  menuVisible = false;
  menu.style.display = "none";
  modalOverlay.classList.add("hidden");
}

function bindToolbarActions() {
  document.getElementById("undoButton").addEventListener("click", function() {
    editor.undo();
    editor.focus();
  });
  document.getElementById("redoButton").addEventListener("click", function() {
    editor.redo();
    editor.focus();
  });
  document.getElementById("headingSelect").addEventListener("change", function() {
    applyHeading(Number(this.value));
    this.value = "0";
  });
  document.getElementById("boldButton").addEventListener("click", function() {
    wrapSelection("**", "**", i18nStrings.placeholderBoldText);
  });
  document.getElementById("italicButton").addEventListener("click", function() {
    wrapSelection("_", "_", i18nStrings.placeholderItalicText);
  });
  document.getElementById("strikeButton").addEventListener("click", function() {
    wrapSelection("~~", "~~", i18nStrings.placeholderStrikethrough);
  });
  document.getElementById("codeButton").addEventListener("click", function() {
    wrapSelection("`", "`", i18nStrings.placeholderCode);
  });
  document.getElementById("quoteButton").addEventListener("click", function() {
    insertQuote();
  });
  document.getElementById("bulletListButton").addEventListener("click", function() {
    insertBulletList();
  });
  document.getElementById("numberListButton").addEventListener("click", function() {
    insertNumberList();
  });
  document.getElementById("taskListButton").addEventListener("click", function() {
    insertTaskList();
  });
  document.getElementById("linkButton").addEventListener("click", function() {
    insertLink();
  });
  document.getElementById("imageButton").addEventListener("click", function() {
    insertImage();
  });
  document.getElementById("codeBlockButton").addEventListener("click", function() {
    insertCodeBlock();
  });
  document.getElementById("tableButton").addEventListener("click", function() {
    insertTable();
  });
  document.getElementById("hrButton").addEventListener("click", function() {
    insertHorizontalRule();
  });
  document.getElementById("openbutton").addEventListener("click", function() {
    document.getElementById("fileInput").click();
  });
  document.getElementById("savebutton").addEventListener("click", function() {
    showMenu();
  });
  document.getElementById("browsersavebutton").addEventListener("click", function() {
    saveInBrowser();
  });
  document.getElementById("nightbutton").addEventListener("click", function() {
    toggleNightMode(this);
  });
  document.getElementById("newbutton").addEventListener("click", function() {
    clearEditor();
  });
}

function openFile(evt) {
  if (window.File && window.FileReader && window.FileList && window.Blob) {
    var files = evt.target.files;
    console.log(files);
    var reader = new FileReader;
    reader.onload = function(file) {
      console.log(file.target.result);
      editor.setValue(file.target.result);
      return true;
    };
    reader.readAsText(files[0]);
  } else {
    alert(i18nStrings.fileApiUnsupported);
  }
}

document.getElementById("close-menu").addEventListener("click", function() {
  hideMenu();
});

modalOverlay.addEventListener("click", function() {
  hideMenu();
});

document.addEventListener("keydown", function(e) {
  if (e.keyCode == 83 && (e.ctrlKey || e.metaKey)) {
    if (localStorage.getItem("content") == editor.getValue()) {
      e.preventDefault();
      return false;
    }
    e.shiftKey ? showMenu() : saveInBrowser();
    e.preventDefault();
    return false;
  }
  if (e.keyCode === 27 && menuVisible) {
    hideMenu();
    e.preventDefault();
    return false;
  }
});

function clearEditor() {
  editor.setValue("");
}

function saveInBrowser() {
  localStorage.setItem("content", editor.getValue());
}

function toggleNightMode(button) {
  var isNightMode = document.getElementById("toplevel").classList.toggle("nightmode");
  button.classList.toggle("selected", isNightMode);
  localStorage.setItem(themeStorageKey, isNightMode ? "dark" : "light");
}

function applyTheme(theme) {
  var toplevel = document.getElementById("toplevel");
  var nightButton = document.getElementById("nightbutton");
  var isNightMode = theme === "dark";
  toplevel.classList.toggle("nightmode", isNightMode);
  nightButton.classList.toggle("selected", isNightMode);
}

function processQueryParams() {
  var params = window.location.search.split("?")[1];
  var hasDarkParam = false;
  if (params) {
    var obj = {};
    params.split("&").forEach(function(elem) {
      obj[elem.split("=")[0]] = elem.split("=")[1];
    });
    if (Object.prototype.hasOwnProperty.call(obj, "dark")) {
      hasDarkParam = true;
      applyTheme(obj.dark === "true" ? "dark" : "light");
    }
    if (obj.dark === "true") {}
  }
  if (!hasDarkParam) {
    applyTheme(localStorage.getItem(themeStorageKey) || "light");
  }
}

async function start() {
  applyEditorI18n();
  bindToolbarActions();
  processQueryParams();
  if (window.location.hash) {
    var h = window.location.hash.replace(/^#/, "");
    if (h.slice(0, 5) == "view:") {
      setOutput(decodeURIComponent(escape(RawDeflate.inflate(atob(h.slice(5))))));
      document.body.className = "view";
    } else {
      editor.setValue(decodeURIComponent(escape(RawDeflate.inflate(atob(h)))));
    }
  } else if (await loadExtensionDraftFromStorage()) {} else if (localStorage.getItem("content")) {
    editor.setValue(localStorage.getItem("content"));
  }
  if (editor.getValue() === "# New Document") {
    editor.setValue(i18nStrings.initialDocument);
  }
  update(editor);
  editor.focus();
  document.getElementById("fileInput").addEventListener("change", openFile, false);
}

window.addEventListener("beforeunload", function(e) {
  if (!editor.getValue() || editor.getValue() == localStorage.getItem("content")) {
    return;
  }
  var confirmationMessage = i18nStrings.beforeUnloadMessage;
  (e || window.event).returnValue = confirmationMessage;
  return confirmationMessage;
});

start();