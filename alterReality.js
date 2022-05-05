const doc = globalThis['document'];
const innerFlag = '__INNER__';
const doneFlag = '__DONE__';

import { get } from '../xhr';

export async function main(ns: NS) {
    await ns.asleep(5000);
    if (doc[innerFlag]) {
        // @ts-expect-error Undocumented
        ns.alterReality();
        ns.atExit(() => {
            setTimeout(() => {
                saveGame();
                globalThis.onbeforeunload = null;
                doc[doneFlag] = true;
            }, 1000);
        });
    } else {
        saveGame();
        const mainURL = globalThis.location.href;
        const html = await get(mainURL);
        const codeURL = new URL('dist/main.bundle.js', mainURL);
        const code = await get(codeURL.href);
        const patchedCode = code.replace(`n(2),console.warn("I am sure that this variable is false.")`, `n(3),console.warn("I am sure that this variable is false.")`);
        const codeBlob = new Blob([patchedCode], { type: "text/javascript" });
        const codeBlobURL = URL.createObjectURL(codeBlob);
        const patchedHtml = html.replace(`src="dist/main.bundle.js"`, `src="${codeBlobURL}"`);
        const iframe = document.createElement('iframe');
        iframe.src = 'about:blank';
        iframe.width = '1600';
        iframe.height = '900';
        globalThis.document.getElementById('terminal-input').parentElement.parentElement.parentElement.previousElementSibling.lastElementChild.previousElementSibling.lastElementChild.insertAdjacentElement('afterend', iframe);
        iframe.contentDocument[innerFlag] = true;
        iframe.contentDocument.write(patchedHtml);
        while (iframe.contentDocument[doneFlag] !== true) {
            await ns.asleep(1000);
        }
        globalThis.onbeforeunload = null;
        globalThis.location = globalThis.location;
    }
}

function saveGame() {
    [...doc.getElementsByTagName('button')].find((e) => { return e['ariaLabel'] === 'save game'; }).click();
}