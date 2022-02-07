import { runHackScript, findHostsForThreads } from 'utils.js';

let ns;
let threadsReseved = [];
let target = 'n00dles';

class TimedMap {
	constructor(){
		setInterval(
			() => Object.keys(sparseArray)
				.filter(o => o < Date.now())
				.foreach(o => delete sparseArray[o])
				, 10000);
	}
	sparseArray = {};

	append(key, value) {
		if (!sparseArray[key]) {
			sparseArray[key = [];
		}
		sparseArray[key].push(value);
	}
}
growFactor = 2;
hackFactor = 1/(growFactor * 1.10);

function precomputeGrow(server, player, growFactor){
	const threads = Math.ceil(ns.growthAnalyze(server.hostname, growthFactor, 1));
return {
	length: ns.formulas.hacking.growTime(server, player),
	threads,
	memoryPerThread: 1.75,
	securityInc: ns.growthAnalyzeSecurity(threads);
}
}

function precomputeHack(server, player, hackFactor){
	const threads = Math.ceil(hackFactor / ns.hackAnalyze(server.hostname));
return {
	length: ns.formulas.hacking.hackTime(server, player),
	threads,
	memoryPerThread: 1.7,
	securityInc: ns.hackAnalyzeSecurity(threads);
}
}
function precomputeWeak(server, player, securityInc) {
return {
	length: ns.formulas.hacking.weakenTime(server, player),
	threads: Math.ceil(securityInc / ns.weakenAnalyze(1, 1)),
	memoryPerThread: 1.75,
	securityDec: 0
}	
}
function precomputeCycle(server, player) {
	const grow = precomputeGrow(server, player);
	const hack = precomputeGrow(server, player);
 	const weakg = precomputeWeak(server,player, grow.securityInc);
 	const weakh = precomputeWeak(server,player, hack.securityInc);
 	const now = Date.now();
 	return {
 		weakhStart: now,
 		hackStart: now - weakh.length - 500,
 		weakgStart: now - weakh.length - 1000,
 		growStart: now - weakg.length - 1500,
 		threads: grow.threads + hack.threads + weakh.threads + weakg.threads,
 		endTime: now + weakh.length + 5500;
 	}
}

let timeslot = new TimedMap();

function roundTo10s(time) {
  p = 10 * 1000;
  return new Date(Math.floor(time / p ) * p).valueOf();
}
// because I'm feeling lazy lets keep this to being just 10s windows to make debugging super simple
// eventually once working shorten it to 1s
sparseArray[roundTo10s(Date.now())] = {

};



/** @param {NS} pns **/
async function main(pns) {
	ns = pns;
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

