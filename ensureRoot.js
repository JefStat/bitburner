const locks = {};

/** @param {NS} ns **/
export async function main(ns) {
    const args = ns.flags([["host", '']]);
    const host = args.host || args._[0];
    if (locks[host]) return;
    locks[host] = 1;
    const server = ns.getServer(host);
    server.hasAdminRights = ensureRootAccess(ns, host);
    server.backdoorInstalled = ensureBackdoor(ns, host);
    const fp = `/tmp/${host.replaceAll(/\./g, '')}.txt`;
    await ns.write(fp, JSON.stringify(server, null, 2), "w");
    delete locks[host];
}

export function ensureBackdoor(ns, host, server) {
    ns.disableLog('getServerRequiredHackingLevel');
    ns.disableLog('getServer');
    ns.disableLog('getHackingLevel');
    ns.disableLog('installBackdoor');
    if (ns.getServerRequiredHackingLevel(host) < ns.getHackingLevel()) {
        if (!server.backdoorInstalled) {
            ns.installBackdoor();
            ns.tprint("backdoor installed " + host);
        }
        return true;
    }
    return false;
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

export function autocomplete(data, args) {
    return data.servers;
}