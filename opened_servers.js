function scan(ns, parent, server, list) {
    const children = ns.scan(server);
    for (let child of children) {
        if (parent == child) {
            continue;
        }
        list.push(child);
        scan(ns, server, child, list);
    }
}
let ensureLock = false;
export function list_servers(ns) {
    const list = [];
    scan(ns, '', 'home', list);
    if (ensureLock) return list;
    ensureLock = true;
    for (const host of list) {
        const fp = `/tmp/${host.replaceAll(/\./g, '')}.txt`;
        const server = JSON.parse(ns.read(fp) || '{}');
        if (!(server.backdoorInstalled && server.hasAdminRights) && !server.purchasedByPlayer) {
            // ns.tprint(`${fp} ${ns.read(fp)}`);
            ns.run('ensureRoot.js', 1, host);
        }
    }
    ensureLock = false;
    return list;
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.tprint(list_servers(ns));
}

export function autocomplete(data, args) {
    return data.servers;
}