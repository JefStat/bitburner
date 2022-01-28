function scan(ns, parent, server, list) {
    const children = ns.scan(server);
    for (let child of children) {
        if (parent == child) {
            continue;
        }
        ensureRootAccess(ns, child);
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
    const args = ns.flags([["help", false]]);
    if (args.help) {
        ns.tprint("This script lists all servers on which you can run scripts.");
        ns.tprint(`Usage: run ${ns.getScriptName()}`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()}`);
        return;
    }

    const servers = list_servers(ns).filter(s => ns.hasRootAccess(s)).concat(['home']);
    for (const server of servers) {
        const used = ns.getServerUsedRam(server);
        const max = ns.getServerMaxRam(server) || 1;
        ns.tprint(`${server} is opened. ${used} GB / ${max} GB (${(100 * used / max).toFixed(2)}%)`)
    }
}

export function ensureRootAccess(ns, host) {
    ns.disableLog('disableLog');
    ns.disableLog('hasRootAccess');
    ns.disableLog('getServerNumPortsRequired');
    ns.disableLog('fileExists');

    if (host === "home" || ns.hasRootAccess(host)) return true;
    let portsReq = ns.getServerNumPortsRequired(host);
    let maxPorts = countPorts(ns);
    // ns.tprint("need to root " + host + " with " + portsReq + " ports required " + maxPorts + " can be opened");
    if (portsReq <= maxPorts) {
        if (ns.fileExists("BruteSSH.exe", "home")) {
            ns.brutessh(host);
        }
        if (ns.fileExists("HTTPWorm.exe", "home")) {
            ns.httpworm(host);
        }
        if (ns.fileExists("FTPCrack.exe", "home")) {
            ns.ftpcrack(host);
        }
        if (ns.fileExists("relaySMTP.exe", "home")) {
            ns.relaysmtp(host);
        }
        if (ns.fileExists("sqlInject.exe", "home")) {
            ns.sqlinject(host);
        }
        ns.nuke(host);
        ns.tprint("nuked " + host);
        return true;
    } else {
        return false;
    }
}

function countPorts(ns) {
    let ports = 0
    if (ns.fileExists("BruteSSH.exe", "home")) {
        ports++;
    }
    if (ns.fileExists("HTTPWorm.exe", "home")) {
        ports++;
    }
    if (ns.fileExists("FTPCrack.exe", "home")) {
        ports++;
    }
    if (ns.fileExists("relaySMTP.exe", "home")) {
        ports++;
    }
    if (ns.fileExists("sqlInject.exe", "home")) {
        ports++;
    }
    return ports
}
