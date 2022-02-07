let ns;

let gang = {};
let members = [];
let tasks = [];

/** @param {NS} pns **/
export async function main(pns) {
	ns = pns;
	ns.disableLog('getServerMoneyAvailable');
	ns.disableLog('gang.purchaseEquipment');
	ns.clearLog();
	ns.tail();
	if (!ns.gang.inGang()) {
		//ns.createGang('Slum Snakes')... todo
		return;
	}
	const moneyTask = ns.formulas.gang.moneyGain;
	const respectTask = ns.formulas.gang.respectGain;
	const wantedTask = (g, m, t) => -1 * ns.formulas.gang.wantedLevelGain(g, m, t);
	while (true) {
		gang = ns.gang.getGangInformation();
		if (ns.gang.canRecruitMember() && ns.gang.recruitMember('g' + (ns.gang.getMemberNames().length + 1))) {
			ns.toast('Recruited');
		}
		getMembersStats();
		getTasksStats();
		if (ns.formulas.gang.wantedPenalty(gang) >= 0.99) {
			setTasks(wantedTask);
		} else {
			setTasks(moneyTask);
		}
		ascend();
		equip();
		await ns.sleep(60 * 1000);
	}
}

function equip() {
	const equipmentNames = ns.gang.getEquipmentNames();
	for (const member of members) {
		for (const equipName of equipmentNames) {
			const stats = ns.gang.getEquipmentStats(equipName);
			if (ns.gang.getEquipmentCost(equipName) < ns.getServerMoneyAvailable("home") * .7) {
				if ((gang.isHacking && stats.hack) || (!gang.isHacking && (stats.agi || stats.def || stats.dex || stats.str)) || stats.cha) {
					if (ns.gang.purchaseEquipment(member.name, equipName)) {
						ns.print(`Purchased ${equipName} for ${member.name}`);
					}
				}
			}
		}
	}
}

function ascend() {
	for (const member of members) {
		let multis = member.agi_asc_mult;
		multis += member.cha_asc_mult;
		multis += member.def_asc_mult;
		multis += member.dex_asc_mult;
		multis += member.hack_asc_mult;
		multis += member.str_asc_mult;
		const res = ns.gang.getAscensionResult(member.name);
		if (!res) continue;
		let res_multi = res.agi + res.cha + res.def + res.dex + res.hack + res.str;
		if (multis * 2 < res_multi) {
			ns.gang.ascendMember(member.name);
			ns.toast(`Ascended ${member.name}`);
		}
	}
}
function getMembersStats() {
	members = [];
	const names = ns.gang.getMemberNames();
	for (const name of names) {
		members.push(ns.gang.getMemberInformation(name));
	}
}
function getTasksStats() {
	tasks = [];
	const names = ns.gang.getTaskNames();
	for (const name of names) {
		tasks.push(ns.gang.getTaskStats(name));
	}
}

function setTasks(taskFunc) {
	for (const member of members) {
		let bestTask = '';
		let mg = 0;
		for (const task of tasks) {
			let nmg = taskFunc(gang, member, task);
			if (nmg > mg) {
				bestTask = task.name;
				mg = nmg;
			}
		}
		if (bestTask === '') {
			bestTask = tasks[1].name;
		}
		ns.gang.setMemberTask(member.name, bestTask);
	}
}