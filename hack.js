/** @param {NS} ns **/
export async function main(ns) {
	const dollars = await ns.hack(ns.args[0]);
	await ns.writePort(1, `${ns.args[0]}:${dollars}`);
}