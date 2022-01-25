/** @param {NS} ns **/
export async function main(ns) {
	ns.tail();
	ns.exec('mcp.js', 'home');
	ns.exec('purchase-servers.js', 'home');
	ns.exec('custom-stats.js', 'home');
}