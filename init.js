/** @param {NS} ns **/
export async function main(ns) {
	ns.tail();//todo us box
	const tmpFiles = ns.ls('home', 'tmp');
	for (const tmpFp of tmpFiles) {
		ns.rm(tmpFp, 'home');
	}

	const multis = JSON.stringify(ns.getBitNodeMultipliers(), null, 2);
	const fp = `/tmp/getBitNodeMultipliers.txt`;
	await ns.write(fp,multis, 'w');

	ns.print(multis);
	ns.exec('purchase-servers.js', 'home');
	ns.exec('player.js', 'home');
	ns.exec('gangum.js', 'home');
	ns.exec('mcp.js', 'home');
	ns.exec('custom-stats.js', 'home');
	// ns.exec('charts.js', 'home');
	// ns.exec('chart_ram.js', 'home');
}