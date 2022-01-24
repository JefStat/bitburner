/** @param {NS} ns **/
export async function ensureRootAccess(ns, host) {
	ns.disableLog('disableLog');
	ns.disableLog('hasRootAccess');
	ns.disableLog('getServerNumPortsRequired');
	ns.disableLog('fileExists');

	if (host === "home" || await ns.hasRootAccess(host)) return true;
	let portsReq = await ns.getServerNumPortsRequired(host);
	let maxPorts = await countPorts(ns);
	// ns.tprint("need to root " + host + " with " + portsReq + " ports required " + maxPorts + " can be opened");
	if (portsReq <= maxPorts) {
		if (await ns.fileExists("BruteSSH.exe", "home")) {
			await ns.brutessh(host);
		}
		if (await ns.fileExists("HTTPWorm.exe", "home")) {
			await ns.httpworm(host);
		}
		if (await ns.fileExists("FTPCrack.exe", "home")) {
			await ns.ftpcrack(host);
		}
		if (await ns.fileExists("relaySMTP.exe", "home")) {
			await ns.relaysmtp(host);
		}
		if (await ns.fileExists("sqlInject.exe", "home")) {
			await ns.sqlinject(host);
		}
		await ns.nuke(host);
		ns.tprint("nuked " + host);
		return true;
	} else {
		return false;
	}
}

async function countPorts(ns) {
	let ports = 0
	if (await ns.fileExists("BruteSSH.exe", "home")) {
		ports++;
	}
	if (await ns.fileExists("HTTPWorm.exe", "home")) {
		ports++;
	}
	if (await ns.fileExists("FTPCrack.exe", "home")) {
		ports++;
	}
	if (await ns.fileExists("relaySMTP.exe", "home")) {
		ports++;
	}
	if (await ns.fileExists("sqlInject.exe", "home")) {
		ports++;
	}
	return ports
}

export const getCores = (host) => ns.getServer(host).cpuCores;

export async function runHackScript(script, host, threads, target) {
	if (!ns.fileExists(script, host)) {
		await ns.scp(script, host);
	}
	return await ns.exec(script, host, threads, target, Math.random());
}
