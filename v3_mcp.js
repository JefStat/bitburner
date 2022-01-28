const targetHistories = {};
let ns;

async function main(pns) {
  ns = pns;
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
