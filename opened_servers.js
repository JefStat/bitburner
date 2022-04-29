function scan(ns, parent, server, list) {
    const children = ns.scan(server);
    for (let child of children) {
        if (parent == child) {
            continue;
        }
        if (child.indexOf('hacknet-node') < 0)
            list.push(child);
        scan(ns, server, child, list);
    }
}
export function list_servers(ns) {
    const list = [];
    scan(ns, '', 'home', list);
    return list;
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.tprint(list_servers(ns));
}

export function autocomplete(data, args) {
    return data.servers;
}