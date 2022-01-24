/** @param {NS} ns **/
export async function main(ns) {
	ns.write(`state_hack_${ns.args[0]}`,"open","a");
	const stolen = await ns.hack(ns.args[0]);
	ns.write(`state_hack_${ns.args[0]}`,`close ${stolen}`,"w");
}