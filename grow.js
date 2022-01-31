/** @param {NS} ns **/
export async function main(ns) {
	const growth = await ns.grow(ns.args[0]);
	await ns.writePort(3, `${ns.args[0]}:${growth}`);
}