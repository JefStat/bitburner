import { ensureRootAccess } from 'utils.js';
async function scan(ns, parent, server, list) {
    const children = await ns.scan(server);
    for (let child of children) {
        if (parent == child) {
            continue;
        }
        await ensureRootAccess(ns, child);
        list.push(child);

        await scan(ns, server, child, list);
        await ns.sleep(10);
    }
}

export async function list_servers(ns) {
    const list = [];
    await scan(ns, '', 'home', list);

    return list;
}

/** @param {NS} ns **/
export async function main(ns) {
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("This script lists all servers on which you can run scripts.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }

    const servers = (await list_servers(ns)).filter(s => ns.hasRootAccess(s)).concat(['home']);
    for (const server of servers) {
        const used = await ns.getServerUsedRam(server);
        const max = await ns.getServerMaxRam(server) || 1;
        ns.tprint(`${server} is opened. ${used} GB / ${max} GB (${(100 * used / max).toFixed(2)}%)`)
    }
}