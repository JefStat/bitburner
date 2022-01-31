import { runHackScript } from 'utils.js';
import { list_servers } from 'opened_servers.js';

let ns;
let threadsReseved = [];
const targetHistories = {};

/** @param {NS} pns **/
async function main(pns) {
  ns = pns;
  threadsReseved = [];
  targetHistories = {};
  target = 'n00dles'
  let lastUpdate = Date.now();
  while (true) {
    let now = Date.now();
    let diff = now - lastupdate;
    lastUpdate = now;
    validate(target, now, diff);
    const state = getStateForTargetAtTime(target, now);
    await runState(target, state, now);
    await ns.sleep(0);
  }
}


// Weaken is always the slowest operation
// Hack is always the fastest operation
// Grow number of threads will vary widly based on server growth and effect size
// Hack will progressively take fewer threads but start out very large
function getStateForTargetAtTime(target, time) {
	const hist = targetHistories[target];
	const server = ns.getServer(target);
	const states = hist.states.filter(h =>  0 < (h.time - time) && (h.time - time) < 1000 );
	if (states.length > 1) {
		ns.tprint(`To many states. Is the interval to large or refresh too small, ${JSON.stringify(states)}`);
	}
	const state = states[0] || {
		hackDifficulty: server.hackDifficulty,
		money: server.money,
		op: 'prep',

	};
	if (state.op === 'prep') {
		if (state.hackDifficulty !== server.minDifficulty) {
			addWeakenState(server, state.hackDifficulty - server.minDifficulty);
		} else if ( state.money !== server.maxMoney) {
		 	addWeakenGrowState();
		} else {
			addWeakenHackState();
		}
	} else {
		if (state.money !== server.maxMoney) {
		 	addWeakenGrowState();
		} else {
			addWeakenHackState();
		}
	}
}

// start a weaken for a hack operation
// precompute threads to reserve enough capacity for the subsequent hack
function addWeakenGrowState(server, prevState) {
	const percentMoney = (prevState.money || 1) / prevState.maxMoney;
	const growthFactor = 1 / percentMoney;
	let growThreads = Math.max(Math.ceil(ns.growthAnalyze(server.hostname, growthFactor, 1)), 1);
	let security = ns.growthAnalyzeSecurity(growThreads);
	let securityThreads = Math.max(Math.ceil(security / ns.weakenAnalyze(1, 1)), 1);
	const threadsAvail = getThreadAvailable(grow_scriptRam);
	while(threadsAvail < (growThreads + securityThreads)){
		ns.print(`Reducing grow growThreads ${growThreads} securityThreads ${securityThreads}`);
		growThreads = Math.floor(growThreads / 2);
		security = ns.growthAnalyzeSecurity(growThreads);
		securityThreads = Math.max(Math.ceil(security / ns.weakenAnalyze(1, 1)), 1);
	}
	const time = ns.formulas.hacking.weakenTime(server, player);
	const hosts = findHostsForThreads(securityThreads);
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
	// finally supposing something broke and weakened less than intended recompute growThreads one more time
	const securityReduction = ns.weakenAnalyze(weakThreads, 1);
	while (ns.growthAnalyzeSecurity(growThreads) > securityReduction)
	{
		growThreads--;
		if (growThreads <= 0) {
			ns.print(`GROW THREADS ARE NEGATIVE WE DONE F'D UP`);
			break;
		}
	}
	
	const newState = {
		minDifficulty: prevState.minDifficulty,
		maxMoney: prevState.maxMoney,
		money: prevState.money
	};
	newState.hackDifficulty = Math.max(prevState.hackDifficulty  - securityReduction, state.minDifficulty);
	newState.time = time + Date.now();
	newState.op = 'weaken';
	const growTime = ns.formulas.hacking.growTime(server, player);
	reserveThreads(growThreads, newState.time - (growTime + 500), true);
	return newState;
}

// start a weaken for a grow operation
// precompute threads to reserve enough capacity for the subsequent grow
function addWeakenGrowState(server, prevState) {
	// small guard incase the server has been zero'd by mistake
	const percentMoney = (prevState.money || 1) / prevState.maxMoney;
	const growthFactor = 1 / percentMoney;
	let growThreads = Math.max(Math.ceil(ns.growthAnalyze(server.hostname, growthFactor, 1)), 1);
	let security = ns.growthAnalyzeSecurity(growThreads);
	let securityThreads = Math.max(Math.ceil(security / ns.weakenAnalyze(1, 1)), 1);
	const threadsAvail = getThreadAvailable(grow_scriptRam);
	while(threadsAvail < (growThreads + securityThreads)){
		ns.print(`Reducing grow growThreads ${growThreads} securityThreads ${securityThreads}`);
		growThreads = Math.floor(growThreads / 2);
		security = ns.growthAnalyzeSecurity(growThreads);
		securityThreads = Math.max(Math.ceil(security / ns.weakenAnalyze(1, 1)), 1);
	}
	const time = ns.formulas.hacking.weakenTime(server, player);
	const hosts = findHostsForThreads(securityThreads);
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
	// finally supposing something broke and weakened less than intended recompute growThreads one more time
	const securityReduction = ns.weakenAnalyze(weakThreads, 1);
	while (ns.growthAnalyzeSecurity(growThreads) > securityReduction)
	{
		growThreads--;
		if (growThreads <= 0) {
			ns.print(`GROW THREADS ARE NEGATIVE WE DONE F'D UP`);
			break;
		}
	}
	
	const newState = {
		minDifficulty: prevState.minDifficulty,
		maxMoney: prevState.maxMoney,
		money: prevState.money
	};
	newState.hackDifficulty = Math.max(prevState.hackDifficulty  - securityReduction, state.minDifficulty);
	newState.time = time + Date.now();
	newState.op = 'weaken';
	const growTime = ns.formulas.hacking.growTime(server, player);
	reserveThreads(growThreads, newState.time - (growTime + 500), true);
	return newState;
}


// Add a weaken state highest as there are threads to do. 
// leave in prep status if the weaken will not reduce server to min
function addWeakenState(server, security, prevState) {
	const threads = Math.max(Math.ceil(security / ns.weakenAnalyze(1, 1)), 1);
	const time = ns.formulas.hacking.weakenTime(server, player);
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
	const newState = {
		minDifficulty: prevState.minDifficulty,
		maxMoney: prevState.maxMoney,
		money: prevState.money
	};
	newState.money = prevState.money;
	newState.hackDifficulty = Math.max(prevState.hackDifficulty  - ns.weakenAnalyze(weakThreads, 1), state.minDifficulty);
	newState.time = time + Date.now();
	newState.op =  newState.hackDifficulty === newState.minDifficulty ? 'weaken' : 'prep';
	return newState;
}

// total of number of thread that can be run on all hosts
function getThreadAvailable(scriptRam) {
	
}

// reseve threads for future grow or hacks
function reserveThreads(threads, until, prioritzeHome, script, target) {
	setTimeout(until - Date.now(), () => {
		const scriptRam = ns.getScriptRam(script);
		const hosts = findHostsForThreads(threads, scriptRam);
		let threadTotal = 0;
		for (const host of hosts) {
			const pid = await runHackScript(ns, script, host.host, host.threads, target);
			if (pid <= 0) {
				const reqRam = scriptRam * host.threads;
				const freeRam = ns.getServerMaxRam(host) - getServerUsedRam(host);
				ns.tprint(`FAILED TO START ${script} ${host.host}[${host.threads}] -> ${target} free ram ${freeRam} needed ram ${reqRam}`);
			} else {
				threadTotal += host.threads;
			}
		}
		addTheState(threadTotal);
	});
	threadsReseved.push({threads, until});
}

// Returns a list of hosts with threads that can be used up to the max of threads.
// may return fewer threads.
// prioritize home for weaken and grow
// respect the reserved thread amount
function findHostsForThreads(scriptRam, threads, isForWeakenOrGrow){}
function findHostsForThreads(threads, returnPartial) {
	let threadAcc = threads;
	const hosts = [];
	for (const host of hostServers) {
		if (threadAcc <= 0) break;
		const useThreads = Math.min(threadAcc, host.threadsAvailable);
		if (useThreads > 0) {
			hosts.push({ host: host.server.hostname, threads: useThreads });
			host.threadsAvailable -= useThreads;
		}
		threadAcc -= useThreads;
	}
	// ns.print(`threads${threads} threadAcc ${threadAcc}`);
	if (threadAcc > 0 && !returnPartial) return [];
	return hosts;
}


function validate(target, time, diff) {
	ns.print(`time elaspsed: ${ns.tformat(diff)}`);
	const hist = targetHistories[target];
	const server = ns.getServer(target);
	const states = hist.states.filter(h => h.time < Date.now());
	if (states.length > 1) {
		ns.tprint(`To many states validator too slow ${JSON.stringify(states)}`);
	}
	const state = states[0];
	if (server.hackDifficulty !== state.hackDifficulty) {
		ns.tprint(`server.hackDifficulty ${server.hackDifficulty} !== state.hackDifficulty ${state.hackDifficulty}`);
	}
	if (server.money !== state.money) {
		ns.tprint(`server.money ${server.money} !== state.money ${state.money}`);
	}

	// remove states in the past
 	hist.states = hist.states.filter(h => h.time > Date.now());
}
