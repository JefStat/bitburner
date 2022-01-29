/** @param {NS} ns **/
export async function main(ns) {
	const growth = await ns.grow(ns.args[0]);
	ns.writePort(3, `${ns.args[0]}:${growth}`);
}

export function autocomplete(data, args) {
	return data.servers;
}