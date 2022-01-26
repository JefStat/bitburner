/** @param {NS} ns **/
export async function main(ns) {
	const args = ns.flags([["help", false]]);
	if (args.help) {
		ns.tprint("This script will enhance your HUD (Heads up Display) with custom statistics.");
		ns.tprint(`Usage: run ${ns.getScriptName()}`);
		ns.tprint("Example:");
		ns.tprint(`> run ${ns.getScriptName()}`);
		return;
	}
	ns.disableLog('sleep');
	ns.disableLog('disableLog');

	const doc = eval('document');
	const hook0 = doc.getElementById('overview-extra-hook-0');
	const hook1 = doc.getElementById('overview-extra-hook-1');
	const monies = [];
	let moneyLastTick = ns.getPlayer().money;
	while (true) {
		try {
			const headers = []
			const values = [];
			const player = ns.getPlayer();

			headers.push("Int");
			values.push(((Math.pow(player.intelligence, 0.8) / 600) * 100).toFixed(2) + '%');

			headers.push("Scripts");
			values.push(ns.nFormat(ns.getScriptIncome()[0], "($0.00a)") + '/s');

			monies.push(player.money - moneyLastTick);
			if (monies.length > 300) monies.shift();
			moneyLastTick = player.money;
			headers.push("Money");
			values.push(ns.nFormat(monies.reduce((a, b) => a + b, 0) / monies.length, "($0.00a)") + '/s');

			headers.push("Karma");
			values.push(ns.heart.break().toFixed(0));

			headers.push("Kills");
			values.push(player.numPeopleKilled.toFixed(0));

			headers.push("Share");
			values.push(((ns.getSharePower() - 1) * 100).toFixed(2) + '%');

			// Now drop it into the placeholder elements
			hook0.innerText = headers.join("\n");
			hook1.innerText = values.join("\n");
		} catch (err) { // This might come in handy later
			ns.print("ERROR: Update Skipped: " + String(err));
		}
		await ns.sleep(1000);
	}
}