/** @param {NS} ns **/
export async function main(ns) {
	ns.tail();
	ns.exec('mcp.js', 'home');
	ns.exec('purchase-servers.js', 'home');
	ns.exec('custom-stats.js', 'home');
	ns.exec('charts.js', 'home');
	ns.exec('chart_ram.js', 'home');
}