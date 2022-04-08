let doc = eval("document");
/** @param {NS} ns
 *  Super recommend you kill all other scripts before starting this up. **/
const minPlay = 0;
const maxPlay = 10e3;
async function getFlipResult(ns) {
    await ns.sleep(1);
    let resultAnswer = find("//*[@id=\"root\"]/div/div[2]/div[2]/div[1]/p")
    if (resultAnswer != null) {
        let answer = resultAnswer.textContent;
        return answer;
    }

    return 'x';
}

export async function main(ns) {
    ns.disableLog('sleep');
    let player = ns.getPlayer();
    ns.tprint(player.city);
    if (player.city != "Aevum") {
        ns.travelToCity("Aevum");
    }

    player = ns.getPlayer();
    ns.tprint(player.location);
    ns.goToLocation("Iker Molina Casino")

    const btnCoinFlip = find("//button[contains(text(), 'coin')]");
    if (!btnCoinFlip) return ns.tprint("ERROR: Attempt to automatically navigate to the Casino appears to have failed.");
    await click(btnCoinFlip);

    await ns.sleep(100);

    const inputWager = find("//input");
    inputWager.value = minPlay;

    const results = [];
    for (let i = 0; i < 1024; i++) {
        // Click on the "head" button
        let btnHead = find("//button[text() = 'Head!']");
        await click(btnHead);
        let result = await getFlipResult(ns);
        ns.print(`${i} ${result}`);
        results.push(result);
    }
    if (results.length === 1024) {
        await playToWin(ns, results);
    }
}
async function playToWin(ns, results) {
    let btnHead = find("//button[text() = 'Head!']");
    let btnTail = find("//button[text() = 'Tail!']");
    const inputWager = find("//input");
    let i = 0;
    let wins = 0;
    while (btnHead && btnTail) {
        inputWager.value = Math.min(maxPlay, ns.getPlayer().money);
        if (results[i] === 'H') {
            await click(btnHead);
        } else {
            await click(btnTail);
        }
        const r = await getFlipResult(ns);
        if (r === results[i]) {
            wins++;
        } else {
            ns.print(`${r}$ !== ${results[i]} @ ${i}`)
            return;
        }
        ns.print(wins);
        i = (i + 1) % results.length;
    }
}

// Some DOM helpers (partial credit to ShamesBond)
async function click(elem) { await elem[Object.keys(elem)[1]].onClick({ isTrusted: true }); }
async function setText2(input, text) { await input[Object.keys(input)[1]].onChange({ isTrusted: true, currentTarget: { value: text } }); }
function find(xpath) { return doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; }