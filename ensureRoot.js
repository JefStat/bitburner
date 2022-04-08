import { list_servers } from 'opened_servers.js';
import { recursiveScan } from 'find_server.js';
import { boxTailSingleton } from 'utils.js';

function maxHackLevel(hacking_grow_mult) {
    switch (hacking_grow_mult) {
        case hacking_grow_mult < 2:
            return 250;
        default:
            return 25000;
    }
}

/** @param {NS} ns **/
export async function main(ns) {
    ns.disableLog('scan');
    ns.disableLog('getHackingLevel');
    ns.disableLog('installBackdoor');
    ns.disableLog('hasRootAccess');
    ns.disableLog('getServerNumPortsRequired');
    ns.disableLog('fileExists');
    ns.disableLog('sleep');
    ns.clearLog();
    // ns.tail();
    const player = JSON.parse(ns.read('/tmp/player.txt'));
    const maxHack = maxHackLevel(player.hacking_grow_mult);
    boxTailSingleton(ns, 'ensureroot', '🗝', '200px');
    let hosts = list_servers(ns).filter(o => o.indexOf('pserv') === -1 && o !== 'darkweb');
    do {
        let servers = [];
        for (const host of hosts) {
            const fp = `/tmp/${host.replaceAll(/[\.\s]*/g, '_')}.txt`;
            try {
                const server = JSON.parse(ns.read(fp));
                server.hasAdminRights = server.hasAdminRights || ensureRootAccess(ns, server);
                server.backdoorInstalled = server.backdoorInstalled || (await ensureBackdoor(ns, server));
                //ns.print(`${server.hostname} ${server.hasAdminRights} && ${server.backdoorInstalled}`);
                await ns.write(fp, JSON.stringify(server, null, 2), "w");
                servers.push(server);
            } catch (e) {
                ns.print(`${host} BAD JSON ${e.message}`);
            }
        }
        hosts = servers
            .filter((s) => !(s.hasAdminRights && s.backdoorInstalled) && s.requiredHackingSkill <= maxHack)
            .map(o => o.hostname);
        ns.print('Hosts to backdoor ' + hosts.length);
        await ns.sleep(5000);
    } while (hosts.length > 0);
}

async function ensureBackdoor(ns, server) {
    if (server.requiredHackingSkill <= ns.getHackingLevel()) {
        if (!server.backdoorInstalled) {
            ns.connect('home');
            let route = [];
            recursiveScan(ns, '', 'home', server.hostname, route);
            for (const r of route) {
                ns.connect(r);
            }
            await ns.installBackdoor();
            ns.tprint("backdoor installed " + server.hostname);
            ns.connect('home');
        }
        return true;
    }
    return false;
}

function ensureRootAccess(ns, server) {
    if (server.hostname === "home" || server.purchasedByPlayer || server.hasAdminRights) return true;
    let portsReq = server.numOpenPortsRequired;
    let maxPorts = countPorts(ns);
    if (portsReq <= maxPorts) {
        if (ns.fileExists("BruteSSH.exe", "home")) {
            ns.brutessh(server.hostname);
        }
        if (ns.fileExists("HTTPWorm.exe", "home")) {
            ns.httpworm(server.hostname);
        }
        if (ns.fileExists("FTPCrack.exe", "home")) {
            ns.ftpcrack(server.hostname);
        }
        if (ns.fileExists("relaySMTP.exe", "home")) {
            ns.relaysmtp(server.hostname);
        }
        if (ns.fileExists("sqlInject.exe", "home")) {
            ns.sqlinject(server.hostname);
        }
        ns.nuke(server.hostname);
        ns.tprint("nuked " + server.hostname);
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