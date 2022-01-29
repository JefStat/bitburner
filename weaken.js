/** @param {NS} ns **/
export async function main(ns) {
	const sec = await ns.weaken(ns.args[0]);
	ns.writePort(2, `${ns.args[0]}:${sec}`);
}