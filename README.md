# Markdown Benez

Markdown Benez is a browser extension that copies selected web content, links, and images as Markdown. It also includes a built-in Markdown editor so copied content can be edited before being saved or reused.

## Features

- Copy selected page content as Markdown.
- Copy links and images as Markdown from the context menu.
- Open copied content directly in the built-in Markdown editor.
- Open the editor from the extension icon to create a new Markdown document.
- Edit Markdown with live preview.
- Save documents locally as Markdown or HTML.
- Save drafts in the browser.
- Use light and dark editor themes.
- Localized interface for English, Spanish, French, Italian, German, and Portuguese.

## Permissions

Markdown Benez requests the following browser permissions:

- `contextMenus`: adds copy and edit actions to the browser context menu.
- `activeTab`: reads the current tab selection when the user explicitly triggers the extension.
- `storage`: stores temporary editor drafts and user preferences, such as the selected theme.

The extension does not send copied content, documents, or browsing data to an external server.

## Development

Install dependencies:

```sh
npm install
```

Build the extension:

```sh
npm run build
```

Run lint checks:

```sh
npm run lint
```

Run the full test script:

```sh
npm test
```

The production extension files are generated in `distribution/`.

## Loading Locally In Chrome

1. Run `npm run build`.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click Load unpacked.
5. Select the `distribution/` directory.

## Privacy

See [PRIVACY.md](PRIVACY.md).

## License

Markdown Benez is licensed under the [MIT License](LICENSE).
