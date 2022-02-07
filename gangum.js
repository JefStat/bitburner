let ns;

let gang = {};
let members = [];
let tasks = [];

/** @param {NS} pns **/
async function main(pns) {
	ns = pns;
	if (!ns.inGang()) {
		//ns.createGang('Slum Snakes')... todo
		return;
	}
	while(true) {
		gang = ns.getGangInformation();
		if (ns.canRecruitMember() && ns.recuitMember('g'+ ns.getMemberNames().length)) {
			ns.toast('Recruited');
		}
		getMembersStats();
		getTasksStats();
		if (ns.getWantedPenaly() >= 0.99) {
			setTasks(wantedTask);
		} else {
			setTasks(moneyTask);
		}
		ascend();
		equip();
		await ns.sleep(60 * 1000);
	}
}

const equipmentNames = ns.getEquipmentNames();
function equip() {
	for (const member of members) {
		for (const equipName of equipmentNames) {
			const stats = ns.getEquipmentStats(equipName);
			if (ns.getEquipmentCost(equipName) < ns.getServerMoneyAvailable("home") * .7) {
				if ((gang.isHacking && stats.hack) || (!gang.isHacking && (stats.agi || stats.def || stats.dex || stats.str)) || stats.cha) {
					ns.purchaseEquipment(member.name, equipName);
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
		const res = ns.getAscensionResult(member.name);
		let res_multi = res.agi+ res.cha+res.def+res.dex+res.hack+res.str;
		if (multis*2 < res_multi) {
			ns.ascendMember(member.name);
			ns.toast(`Ascended ${member.name}`);
		}
	}
}
function getMembersStats () {
	members = [];
	const names = ns.getMemberNames();
	for (const name of names) {
		members.push(ns.getMemberInformation(name));
	}
}
function getTasksStats() {
	tasks = [];
	const names = ns.getTasksNames();
	for (const name of names) {
		tasks.push(ns.getTaskStats(name));
	}
}

const moneyTask = ns.formulas.gang.moneyGain;
const respectTask = ns.formulas.gang.respectGain;
const wantedTask = (g,m,t) => -1 * ns.formulas.gang.wantedLevelGain(g,m,t);
function setTasks(taskFunc) {
	for (const member of members) {
		let bestTask = '';
		let mg = 0;
		for (const task of tasks) {
			nmg = taskFunc(gang, member, task);
			if (nmg > mg) {
				bestTask = task.name;
				mg = nmg;
			}
		}
		ns.setMemberTask(member.name, bestTask);
	}
}