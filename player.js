const crimes = ["shoplift", "rob store", "mug", "larceny", "deal drugs", "bond forgery", "traffick arms", "homicide", "grand theft auto", "kidnap", "assassinate", "heist"]

/** @param {NS} ns **/
export async function main(ns) {
    ns.tail();
    ns.disableLog('sleep');
    const doc = eval('document');
    if (doc.crimeTime) {
        ns.print('crime time already in progress');
        return;
    }
    // ns.checkFactionInvitations(): string[];
    let getKarma = true;
    while (true) {
        await ns.sleep(100);
        if (ns.isBusy()) {
            continue;
        }

        if (ns.heart.break() < -54000) {
            ns.print('heart plenty broken tyvm');
            // ns.gang.createGang('Slum Snakes');
            //			ns.run('gangum.js');
            getKarma = false;
        }
        let doThisCrime = crimes[0];
        let doThisCrimeRate = -1;
        for (const crime of crimes) {
            const crimeStats = ns.getCrimeStats(crime);
            const chance = ns.getCrimeChance(crime);
            const nextRate = chance * (getKarma ? crimeStats.karma : crimeStats.money) / crimeStats.time;
            // ns.print(nextRate.toPrecision(2));
            if (chance > .5 && nextRate > doThisCrimeRate) {
                doThisCrimeRate = nextRate;
                doThisCrime = crime;
                ns.print(`next crime ${doThisCrime} @ ${(getKarma ? doThisCrimeRate.toPrecision(2) : ns.nFormat(doThisCrimeRate, '0.0'))} ${(getKarma ? 'karma' : '$')}/s`);
            }
        }

        ns.commitCrime(doThisCrime);
    }
}