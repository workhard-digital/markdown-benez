(() => {
  if (typeof browser === "undefined") {
    globalThis.browser = chrome;
  }
  const contexts = [ "image", "link", "selection" ];
  const actions = [ "copy", "edit" ];
  const editorDraftStorageKey = "copyAsMarkdownDraft";
  function getMessage(key, substitutions, fallback = "") {
    const message = browser.i18n.getMessage(key, substitutions);
    return message || fallback;
  }
  function createEditorUrl(loadDraft = false) {
    const editorUrl = new URL(browser.runtime.getURL("editor/index.html"));
    if (loadDraft) {
      editorUrl.searchParams.set("source", "extension-draft");
    }
    return editorUrl.toString();
  }
  async function openEditorTab(loadDraft = false) {
    await browser.tabs.create({
      url: createEditorUrl(loadDraft)
    });
  }
  async function createContextMenus() {
    await browser.contextMenus.removeAll();
    for (const context of contexts) {
      for (const action of actions) {
        const messageKey = `menu${action[0].toUpperCase() + action.slice(1)}${context[0].toUpperCase() + context.slice(1)}`;
        browser.contextMenus.create({
          id: `cpy-as-md:${action}:${context}`,
          title: getMessage(messageKey, undefined, `${action} ${context} as Markdown`),
          contexts: [ context ]
        });
      }
    }
  }
  browser.runtime.onInstalled.addListener(() => {
    createContextMenus().catch(console.error);
  });
  browser.runtime.onStartup.addListener(() => {
    createContextMenus().catch(console.error);
  });
  createContextMenus().catch(console.error);
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    const text = info.linkText;
    const assetUrl = encodeURI(info.srcUrl);
    const linkUrl = encodeURI(info.linkUrl);
    const menuId = String(info.menuItemId);
    const [prefix, mode, context] = menuId.split(":");
    if (prefix !== "cpy-as-md" || !mode || !context || !tab || !tab.id) {
      return;
    }
    let actionType = context;
    let htmlContent = "";
    if (context === "image") {
      htmlContent = `<img alt="${text || assetUrl}" src="${assetUrl}" />`;
    } else if (context === "link") {
      htmlContent = `<a href="${linkUrl}">${text || linkUrl}</a>`;
    }
    try {
      await browser.tabs.sendMessage(tab.id, {
        actionType,
        htmlContent,
        mode
      });
    } catch (error) {
      console.error(error);
    }
  });
  browser.action.onClicked.addListener(async () => {
    try {
      await openEditorTab();
    } catch (error) {
      console.error(error);
    }
  });
  browser.commands.onCommand.addListener(async command => {
    if (command === "copy-selection-as-md") {
      try {
        const tabs = await browser.tabs.query({
          active: true
        });
        if (tabs.length === 0) {
          return;
        }
        await browser.tabs.sendMessage(tabs[0].id, {
          actionType: "selection",
          htmlContent: "",
          mode: "copy"
        });
      } catch (error) {
        console.error(error);
      }
    }
  });
  browser.runtime.onMessage.addListener(async message => {
    if (message.type !== "clipboard:open-editor") {
      return;
    }
    const markdownContent = typeof message.markdownContent === "string" ? message.markdownContent : "";
    try {
      await browser.storage.local.set({
        [editorDraftStorageKey]: markdownContent
      });
      await openEditorTab(true);
    } catch (error) {
      console.error(error);
    }
  });
})();
//# sourceMappingURL=background.js.map