import { hackFactor, growthFactor } from 'config.js';
/** @param {NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ['refreshrate', 200],
        ['help', false],
    ])
    if (flags.help) {
        ns.tprint("This script helps visualize the money and security of a server.");
        ns.tprint(`USAGE: run ${ns.getScriptName()} SERVER_NAME`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} n00dles`)
        return;
    }
    ns.tail();
    ns.disableLog('ALL');
    const servers = flags._[0] ? [flags._[0]] : [];
    while (true) {
        ns.clearLog();
        for (var i = 0; i < servers.length; i++) {
            const server = servers[i];
            const s = ns.getServer(server);
            const player = ns.getPlayer();
            let maxMoney = ns.getServerMaxMoney(server);
            const minSec = ns.getServerMinSecurityLevel(server);
            let money = ns.getServerMoneyAvailable(server);
            const percentOfMaxMoney = money / (maxMoney || 1);
            const sec = ns.getServerSecurityLevel(server);
            const currentSecurity = s.hackDifficulty - s.minDifficulty;
            const owk = ns.weakenAnalyze(1, 1);
            const hackT = ns.formulas.hacking.hackTime(s, player);
            const growT = ns.formulas.hacking.growTime(s, player);
            const weakT = ns.formulas.hacking.weakenTime(s, player);
            const hackChance = ns.formulas.hacking.hackChance(s, player);
            s.hackDifficulty = s.minDifficulty;
            const growPercent = ns.formulas.hacking.growPercent(s, 1, player, 1);
            const hackPercent = ns.formulas.hacking.hackPercent(s, player);
            const hackThreads = Math.floor(.5 / hackPercent);
            ns.print(`
${server}:
    $          : ${ns.nFormat(money, "$0.000a")} / ${ns.nFormat(maxMoney, "$0.000a")} (${(percentOfMaxMoney * 100).toFixed(2)}%)
    security   : ${minSec.toFixed(2)} / ${sec.toFixed(2)} +${(currentSecurity).toFixed(2)}
    growth     : ${ns.getServerGrowth(server)} (${(growPercent * 100).toFixed(2)}%)
    hack time  : ${ns.tFormat(hackT)} (t=${hackThreads}) (${(hackPercent * 100).toFixed(2)}%)
    grow time  : ${ns.tFormat(growT)} (t=${maxMoney === 0 ? 'NaN' : Math.ceil(ns.growthAnalyze(server, growthFactor))})(${(growthFactor * 100).toFixed(0)}%) 
    weaken time: ${ns.tFormat(weakT)} (t=${Math.max(Math.ceil(currentSecurity / owk), 1)})
    hackChance : ${(hackChance * 100).toFixed(2)}%
`);
        }
        await ns.sleep(flags.refreshrate);
    }
}

export function autocomplete(data, args) {
    return data.servers;
}