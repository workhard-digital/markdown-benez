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

	wrapper.querySelectorAll('a').forEach(link => link.setAttribute('href', link.href));

	const tables = wrapper.querySelectorAll('table');
	for (const table of tables) {
		const floaters = Array.from(table.children).filter(node => !['THEAD', 'TBODY', 'TR', 'TFOOT'].includes(node.tagName));
		for (const floater of floaters) {
			floater.remove();
		}
	}

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

browser.runtime.onMessage.addListener(async message => {
	if (message.actionType === '') {
		return;
	}

	let htmlContent = message.htmlContent;
	if (message.actionType === 'selection') {
		htmlContent = getSelectionAsHTML();
	}

	try {
		const markdownContent = turndownService.turndown(htmlContent);
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
