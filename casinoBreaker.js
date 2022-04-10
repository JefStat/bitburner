let doc = eval("document");
/** @param {NS} ns **/
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

    ns.travelToCity("Aevum");
    ns.goToLocation("Iker Molina Casino");

    await playRoulette(ns);
}

async function playCoinFlip(ns) {
    const btnCoinFlip = find("//button[contains(text(), 'coin')]");
    if (!btnCoinFlip) return ns.tprint("ERROR: Attempt to automatically navigate to the Casino appears to have failed.");
    await click(btnCoinFlip);

    await ns.sleep(100);

    const minPlay = 0;
    const maxPlay = 10e3;
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
        await playToWinCoinFlip(ns, results, maxPlay);
    }
}
async function playToWinCoinFlip(ns, results, maxPlay) {
    let btnHead = find("//button[text() = 'Head!']");
    let btnTail = find("//button[text() = 'Tail!']");
    const inputWager = find("//input");
    let i = 0;
    let wins = 0;
    while (btnHead && btnTail) {
        inputWager.value = Math.min(maxPlay, ns.getServerMoneyAvailable('home'));
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
function arraysPercentEqual(a, b) {
    if (a === b) return 1;
    if (a == null || b == null) return 0;
    if (a.length !== b.length) return 0;

    // If you don't care about the order of the elements inside
    // the array, you should sort both arrays here.
    // Please note that calling sort on an array will modify that array.
    // you might want to clone your array first.
    let equalness = 0;
    for (let i = 0; i < a.length; ++i) {
        if (a[i] === b[i]) equalness++;
    }
    return equalness / a.length;
}

async function playRoulette(ns) {

    const btnRoulette = find("//button[contains(text(), 'roulette')]");
    if (!btnRoulette) return ns.tprint("ERROR: Attempt to automatically navigate to the Casino appears to have failed.");
    const startSeed = new Date().getTime();
    await click(btnRoulette);
    const after = new Date().getTime();
    const seedRange = after - startSeed;
    ns.print(`whrngSeedRange ${seedRange}`);
    await ns.sleep(1);
    const minPlay = 0;
    const maxPlay = 1e7;
    const inputWager = find("//input");
    // inputWager.value = minPlay;
    await setText2(inputWager, `${minPlay}`);
    const sampleSize = 10;
    const button1 = find("//button[text() = '1']");
    const results = [];
    for (let i = 0; i < sampleSize; i++) {
        await click(button1);
        const r = await getSpinResult(ns);

        if (r === -1) {
            ns.print('Results not found quiting leave casino try again');
            return;
        }
        results.push(r);
    }
    ns.print(`Results ${results.map(o => ns.nFormat(o, '00')).join(',')}`);
    let goodSeeds = [];
    for (let j = 0; j < seedRange; j++) {
        const seedTest = []
        let whrng = new WHRNG(startSeed + j);
        for (let i = 0; i < sampleSize; i++) {
            seedTest.push(whrng.randomRouletteNumber());
        }
        const percentEqual = arraysPercentEqual(results, seedTest);
        if (percentEqual >= .9) {
            goodSeeds.push(whrng);
            ns.print(`Seed is ${startSeed + j} with equality of ${percentEqual.toPrecision(2)} took ${j} attempts`);
        }
        ns.print(`Seed ${ns.nFormat(j, '00')} ${seedTest.map(o => ns.nFormat(o, '00')).join(',')} ${percentEqual.toPrecision(2)} ${whrng.v}`);
    }
    if (goodSeeds.length === 1) {
        await playToWinRoulette(ns, goodSeeds[0], inputWager, maxPlay);
    } else if (goodSeeds.length > 1) {
        ns.print('Too many match, increase sample size');
    } else {
        ns.print('No seeds match, increase sample size');
    }

}

async function playToWinRoulette(ns, whrng, inputWager, maxPlay) {
    // maxPlay = 0; //testing value
    let losses = 0;
    let plays = 0;
    while (true) {
        // inputWager.value = Math.floor(Math.min(maxPlay, ns.getPlayer().money));
        await setText2(inputWager, `${Math.floor(Math.min(maxPlay, ns.getServerMoneyAvailable('home')))}`);
        const luckynumber = whrng.randomRouletteNumber();
        const button = find(`//button[text() = '${luckynumber}']`);
        // ns.print(`Clicking ${button.innerHTML}`);
        await click(button);
        plays++;
        const result = await getSpinResult(ns);
        ns.print(`number lucky ${luckynumber} actual ${result}`);
        if (luckynumber !== result) {
            losses++;
        }
        if (losses / plays > .91) {
            ns.print('Somethings broken loses are greater than expected');
            return;
        }
    }
}

async function getSpinResult(ns) {
    while (true) {
        let result1 = find("//h4[contains(text(), 'lost')]") || find("//h4[contains(text(), 'Lost')]");
        let result2 = find("//h4[contains(text(), 'won')]") || find("//h4[contains(text(), 'Won')]");
        if (result1 == null && result2 == null) {
            await ns.sleep(100);
        }
        else {
            break;
        }
    }

    await ns.sleep(20);
    let resultAnswer = find("(//h4)[2]");
    if (resultAnswer != null) {
        let answer = resultAnswer.textContent;
        return parseInt(answer.replaceAll(/B|R/g, ''));
    }

    return -1;
}

const WHRNG = function (totalPlaytime) {
    // This one is seeded by the players total play time.
    const v = (totalPlaytime / 1000) % 30000;
    this.s1 = v;
    this.s2 = v;
    this.s3 = v;
    this.v = v;
    this.step = function () {
        this.s1 = (171 * this.s1) % 30269;
        this.s2 = (172 * this.s2) % 30307;
        this.s3 = (170 * this.s3) % 30323;
    }
    this.random = function () {
        this.step();
        return (this.s1 / 30269.0 + this.s2 / 30307.0 + this.s3 / 30323.0) % 1.0;
    }
    this.randomRouletteNumber = () => {
        return Math.floor(this.random() * 37);
    }
}

// Some DOM helpers (partial credit to ShamesBond)
async function click(elem) { await elem[Object.keys(elem)[1]].onClick({ isTrusted: true }); }
async function setText2(input, text) { await input[Object.keys(input)[1]].onChange({ isTrusted: true, currentTarget: { value: text } }); }
function find(xpath) { return doc.evaluate(xpath, doc, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue; }