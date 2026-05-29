import TurndownService from 'turndown';
import {gfm} from 'turndown-plugin-gfm';
import {MathMLToLaTeX} from 'mathml-to-latex';

if (typeof browser === 'undefined') {
	globalThis.browser = chrome;
}

const turndownService = new TurndownService({
	hr: '---',
	headingStyle: 'atx',
	bulletListMarker: '-',
	codeBlockStyle: 'fenced'
});
turndownService.keep(['kbd', 'sup', 'sub']);
turndownService.remove(['script']);
turndownService.use(gfm);

turndownService.addRule('listItem', {
	filter: 'li',
	replacement: (content, node, options) => {
		content = content
			.replace(/^\n+/, '')
			.replace(/\n+$/, '\n')
			.replace(/\n/gm, '\n    ');

		let prefix = options.bulletListMarker + ' ';
		const parent = node.parentNode;
		if (parent.nodeName === 'OL') {
			const start = parent.getAttribute('start');
			const index = Array.prototype.indexOf.call(parent.children, node);
			prefix = (start ? Number(start) + index : index + 1) + '. ';
		}

		return (prefix + content + (node.nextSibling && !/\n$/.test(content) ? '\n' : ''));
	}
});

turndownService.addRule('mathml', {
	filter: 'math',
	replacement: (content, node, _) => {
		const latex = MathMLToLaTeX.convert(node.outerHTML);
		if (!latex) {
			return '';
		}

		const delim = node.getAttribute('display') === 'block' ? '$$' : '$';
		return delim + latex + delim;
	}
});

function absolutizeUrls(wrapper) {
	wrapper.querySelectorAll('a').forEach(link => link.setAttribute('href', link.href));
	wrapper.querySelectorAll('img, source, video, audio, iframe').forEach(node => {
		const source = node.getAttribute('src');
		if (source) {
			node.setAttribute('src', new URL(source, document.baseURI).href);
		}
	});
}

function removeTableFloaters(wrapper) {
	const tables = wrapper.querySelectorAll('table');
	for (const table of tables) {
		const floaters = Array.from(table.children).filter(node => !['THEAD', 'TBODY', 'TR', 'TFOOT'].includes(node.tagName));
		for (const floater of floaters) {
			floater.remove();
		}
	}
}

function getSelectionAsHTML() {
	const selection = document.getSelection();
	let containerTagName = '';

	if (selection.rangeCount === 0) {
		return '';
	}

	const selectionRange = selection.getRangeAt(0);
	const container = selectionRange.commonAncestorContainer;

	if (selectionRange.toString().trim() === container.textContent.trim()) {
		if (container instanceof Element) {
			containerTagName = container.tagName.toLowerCase();
		} else {
			containerTagName = 'p';
		}
	}

	const fragment = selectionRange.cloneContents();
	const wrapper = document.createElement('div');
	wrapper.append(fragment);

	absolutizeUrls(wrapper);
	removeTableFloaters(wrapper);

	if (containerTagName === '') {
		return wrapper.innerHTML;
	}

	if (containerTagName === 'pre') {
		const classes = (container.parentNode || container).classList.toString();

		return `
			<div class="${classes}">
				<pre><code>${wrapper.innerHTML}</code></pre>
			</div>
		`;
	}

	return '<' + containerTagName + '>' + wrapper.innerHTML + '</' + containerTagName + '>';
}

function getIframeContent(iframe) {
	try {
		const iframeDocument = iframe.contentDocument || iframe.contentWindow?.document;
		if (!iframeDocument || !iframeDocument.body) {
			return '';
		}

		const iframeClone = iframeDocument.body.cloneNode(true);
		iframeClone.querySelectorAll('script, style, nav, footer, aside, .ads, .comments').forEach(element => element.remove());
		absolutizeUrls(iframeClone);
		removeTableFloaters(iframeClone);

		return `<div class="iframe-content">${iframeClone.innerHTML}</div>`;
	} catch (_) {
		return '';
	}
}

function getPageAsHTML() {
	if (!document || !document.body) {
		return '';
	}

	const bodyClone = document.body.cloneNode(true);
	const iframeContents = Array.from(document.querySelectorAll('iframe'))
		.map(iframe => getIframeContent(iframe))
		.filter(Boolean);

	bodyClone.querySelectorAll([
		'script',
		'style',
		'noscript',
		'nav',
		'footer',
		'aside',
		'.ads',
		'.comments',
		'[role="complementary"]',
		'.cookie-banner',
		'.popup',
		'.overlay',
		'.modal'
	].join(', ')).forEach(element => element.remove());

	absolutizeUrls(bodyClone);
	removeTableFloaters(bodyClone);

	const mainSelectors = ['main', 'article', '.content', '.post', '.entry', '[role="main"]', '#content', '.main'];
	let mainContent = null;
	for (const selector of mainSelectors) {
		const found = bodyClone.querySelector(selector);
		if (found && found.innerHTML.trim().length > 100) {
			mainContent = found;
			break;
		}
	}

	let content = mainContent ? mainContent.innerHTML : bodyClone.innerHTML;
	if (iframeContents.length > 0) {
		content += '<h2>Embedded Content</h2>' + iframeContents.join('<hr>');
	}

	const title = document.title || 'Untitled Page';
	return `
		<div class="markdown-content">
			<h1>${title}</h1>
			${content}
		</div>
	`;
}

browser.runtime.onMessage.addListener(async message => {
	if (message.actionType === '') {
		return;
	}

	let htmlContent = message.htmlContent;
	if (message.actionType === 'selection') {
		htmlContent = getSelectionAsHTML();
	} else if (message.actionType === 'page') {
		htmlContent = getPageAsHTML();
	}

	try {
		const markdownContent = turndownService.turndown(htmlContent).replace(/\n{3,}/g, '\n\n').trim();
		if (message.mode !== 'edit') {
			await navigator.clipboard.writeText(markdownContent);
			return;
		}

		await navigator.clipboard.writeText(markdownContent);
		await browser.runtime.sendMessage({
			type: 'clipboard:open-editor',
			markdownContent
		});
	} catch (error) {
		console.error(error);
	}
});
