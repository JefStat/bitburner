import { initAugments } from "./augments";

let ns;
/** @param {NS} pns **/
export async function main(pns) {
	ns = pns;
	ns.disableLog('sleep');
	ns.disableLog('scan');
	ns.clearLog();
	ns.tail();//todo us box
	const tmpFiles = ns.ls('home', 'tmp');
	for (const tmpFp of tmpFiles) {
		ns.rm(tmpFp, 'home');
	}

	if (ns.heart.break() < -54000) {
		ns.print('heart plenty broken tyvm');
		ns.gang.createGang('Slum Snakes');
	}
	if (ns.gang.inGang()) {
		await ns.write('/tmp/ingang.txt', ns.gang.getGangInformation().faction, 'w');
	}
	await ns.write('/tmp/player.txt', JSON.stringify(ns.getPlayer(), null, 2), "w");
	const multis = JSON.stringify(ns.getBitNodeMultipliers(), null, 2);
	const fp = `/tmp/getBitNodeMultipliers.txt`;
	await ns.write(fp, multis, 'w');

	ns.print('init augs details');
	await initAugments(ns);

	await writeServers('', 'home');
	ns.exec('ensureRoot.js', 'home');

	// ns.print(multis);
	ns.exec('purchase-servers.js', 'home');
	// ns.exec('player.js', 'home');
	ns.exec('workForFaction.js', 'home');
	if (ns.gang.inGang()) ns.exec('gangum.js', 'home');
	ns.exec('mcp_hgw.js', 'home');
	ns.exec('custom-stats.js', 'home');
	// ns.exec('charts.js', 'home');
	// ns.exec('chart_ram.js', 'home');
}
import { list_servers } from 'opened_servers.js';
async function writeServers() {
	const hosts = list_servers(ns);
	for (let host of hosts) {
		const serverDetails = ns.getServer(host);
		serverDetails.hasAdminRights = false;
		serverDetails.backdoorInstalled = false;
		const fp = `/tmp/${host.replaceAll(/[\.\s]*/g, '_')}.txt`;
		await ns.write(fp, JSON.stringify(serverDetails, null, 2), 'w');
		await ns.sleep(100);
	}
}