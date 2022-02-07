import { runHackScript, findHostsForThreads } from 'utils.js';

let ns;
let threadsReseved = [];
let target = 'n00dles';

/** @param {NS} pns **/
async function main(pns) {
	let wt;
	do {
	wt = await prepWeak(target)
	await ns.sleep(wt);
} while(wt > 0);
	ns.print(`${target} security prepped`);
	let gt;
	do {
	gt = await ns.sleep(await prepGrow(target));
	await ns.sleep(gt);
	} while(wt > 0);
	ns.print(`${target} grow prepped`);
}

function prepWeak(target) {
	const server = ns.getServer(target);
	if (server.hackDifficulty === server.minDifficulty)return 0;
	const player = ns.getPlayer();
	const time = ns.formulas.hacking.weakenTime(server, player);
	let threads = Math.max(Math.ceil(server.hackDifficulty / ns.weakenAnalyze(1, 1)), 1);
	const hosts = findHostsForThreads(threads);
	let weakThreads = 0;
	for (const host of hosts) {
		const pid = await runHackScript(ns, weak_script, host.host, host.threads, server.hostname);
		if (pid <= 0) {
			const reqRam = weak_scriptRam * host.threads;
			const freeRam = ns.getServerMaxRam(host) - getServerUsedRam(host);
			ns.tprint(`FAILED TO START ${weak_script} ${host.host}[${host.threads}] -> ${server.hostname} free ram ${freeRam} needed ram ${reqRam}`);
		} else {
			weakThreads += host.threads;
		}
	}
	return weakThreads > 0 ?  time: 0;
}

function prepGrow(target) {
	const server = ns.getServer(target);
	const player = ns.getPlayer();
	const time = ns.formulas.hacking.growTime(server, player);
	const growthFactor = 1 / (percentMoney || 0.0000001);
	const threads = Math.ceil(ns.growthAnalyze(target, growthFactor, 1));
	const hosts = findHostsForThreads(threads);
	let growThreads = 0;
	for (const host of hosts) {
		const pid = await runHackScript(ns, grow_script, host.host, host.threads, server.hostname);
		if (pid <= 0) {
			const reqRam = grow_scriptRam * host.threads;
			const freeRam = ns.getServerMaxRam(host.host) - getServerUsedRam(host.host);
			ns.tprint(`FAILED TO START ${grow_script} ${host.host}[${host.threads}] -> ${server.hostname} free ram ${freeRam} needed ram ${reqRam}`);
		} else {
			growThreads += host.threads;
		}
	}
	return growThreads > 0?  time: 0;
}

/*
Will try to run up to threads for script  
*/
function withScript(script,scriptRam, threads) {
	const hosts = findHostsForThreads(threads, scriptRam);
	let threadSum = 0;
	for (const host of hosts) {
		const pid = await runHackScript(ns, script, host.host, host.threads, server.hostname);
		if (pid <= 0) {
			const reqRam = scriptRam * host.threads;
			const freeRam = ns.getServerMaxRam(host.host) - getServerUsedRam(host.host);
			ns.tprint(`FAILED TO START ${script} ${host.host}[${host.threads}] -> ${server.hostname} free ram ${freeRam} needed ram ${reqRam}`);
		} else {
			threadSum += host.threads;
		}
	}
	return threadSum > 0?  time: 0;
}

