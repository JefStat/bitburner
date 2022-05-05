import {getOwnedAugmentationsStatic} from "augments.js";

let ns;

const augPriorityOrderedList = [

]

function findNextAug(nextAug) {
    return undefined;
}

/** @param {NS} pns **/
export async function main(pns) {
    ns = pns;
    ns.disableLog('asleep');
    ns.clearLog();
    while (true) {
        const currentAugs = getOwnedAugmentationsStatic(ns);
        const neededAugs = augPriorityOrderedList.filter(a => !currentAugs.includes(a));
        const nextAug = neededAugs[0];
        if (!nextAug) {
            ns.print('No more augs to get');
            return;
        }
        const nextAugLocation = findNextAug(nextAug);
        buyAug(nextAugLocation);
        installAugs();
        await ns.asleep(20);
    }
}