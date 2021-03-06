import { ramUsage } from 'utils.js';

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
	ns.disableLog('getServerMaxRam')
	ns.disableLog('getServerUsedRam');

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

			headers.push("Scripts");
			values.push(ns.nFormat(ns.getScriptIncome()[0], "($0.00a)") + '/s');

			monies.push(player.money - moneyLastTick);
			if (monies.length > 600) monies.shift();
			moneyLastTick = player.money;
			headers.push("Money");
			values.push(ns.nFormat(monies.reduce((a, b) => a + b, 0) / monies.length, "($0.00a)") + '/s');

			headers.push("Ram Use");
			values.push((ramUsage(ns) * 100).toFixed(1) + '%');

			if (ns.heart.break() > -54000) {
				headers.push("Karma");
				values.push(ns.heart.break().toFixed(0));
			}

			// if (ns.fileExists('/tmp/ingang.txt')) {
			// 	const gangInfo = ns.getGangInformation();
			// 	headers.push("Respect");
			// 	values.push(ns.nFormat(gangInfo.respect, '0.00a'));
			// 	headers.push("Penalty");
			// 	values.push(ns.nFormat(gangInfo.wantedPenalty, '0.00%'));
			// 	headers.push("Territory");
			// 	values.push(ns.nFormat(gangInfo.territory, '0.00%'));
			// }

			if (ns.getSharePower() > 1) {
				headers.push("Share");
				values.push(((ns.getSharePower() - 1) * 100).toFixed(2) + '%');
			}

			// Now drop it into the placeholder elements
			hook0.innerText = headers.join("\n");
			hook1.innerText = values.join("\n");
		} catch (err) { // This might come in handy later
			ns.print("ERROR: Update Skipped: " + String(err));
		}
		await ns.sleep(1000);
	}
}