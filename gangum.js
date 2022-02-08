let ns;

let gang = {};
let members = [];
let tasks = [];
const percentAtWar = .4;

/** @param {NS} pns **/
export async function main(pns) {
	ns = pns;
	ns.disableLog('getServerMoneyAvailable');
	ns.disableLog('gang.purchaseEquipment');
	ns.disableLog('gang.setMemberTask');
	ns.disableLog('sleep');
	ns.disableLog('gang.setTerritoryWarfare');
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
			ns.toast('Recruited', 'info', 10000);
			ns.print('Recruited');
		}
		getMembersStats();
		getTasksStats();
		ascend();
		setTasks(moneyTask);
		equip();
		war();

		await ns.sleep((ns.gang.getBonusTime() ? 6 : 60) * 1000);
	}
}

function war() {
	const og = ns.gang.getOtherGangInformation();
	const strongerGangs = Object.values(og).filter(s => s.power > gang.power).length === 0;
	if (gang.territoryWarfareEngaged !== strongerGangs) {
		ns.print(`Changing warefare to ${strongerGangs}`);
		ns.toast(`Changing warefare to ${strongerGangs}`, strongerGangs ? 'info' : 'warning', 10000);
	}
	ns.gang.setTerritoryWarfare(strongerGangs);
}

function equip() {
	const equipmentNames = ns.gang.getEquipmentNames();
	for (const member of members) {
		for (const equipName of equipmentNames) {
			const stats = ns.gang.getEquipmentStats(equipName);
			if (ns.gang.getEquipmentCost(equipName) < ns.getServerMoneyAvailable("home") * .7) {
				if ((gang.isHacking && (stats.hack || stats.cha)) || (!gang.isHacking && (stats.agi || stats.def || stats.dex || stats.str))) {
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
		multis += member.def_asc_mult;
		multis += member.dex_asc_mult;
		multis += member.hack_asc_mult;
		multis += member.str_asc_mult;
		const res = ns.gang.getAscensionResult(member.name);
		if (!res) continue;
		// let res_multi = res.agi + res.def + res.dex + res.hack + res.str - 5.1;
		//if (multis * 2 < res_multi) {
		// ascend values are kinda odd to get a feel for.
		// result multiplier are a percentage increase of the current value.
		// multiply these together if the multipliers go up by 5 times then good enough to ascend
		let res_multi = res.agi * res.def * res.dex * res.hack * res.str;
		if (res_multi > 5) {
			ns.gang.ascendMember(member.name);
			ns.print(`Ascended ${member.name} multis ${multis.toPrecision(4)}, res_multi ${res_multi.toPrecision(4)}`);
			ns.toast(`Ascended ${member.name} multis ${multis.toPrecision(4)}, res_multi ${res_multi.toPrecision(4)}`, 'info', 10000)
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
let vigilantesNeeded = 0;
function setTasks(taskFunc) {
	let viglante = 0;
	if (ns.formulas.gang.wantedPenalty(gang) < 0.99 && gang.wantedLevel > 2) {
		vigilantesNeeded = (vigilantesNeeded * 1.5) || .15;
		viglante = Math.floor(members.length * vigilantesNeeded);
		// little float overflow reversal 
		vigilantesNeeded = viglante >= members.length ? vigilantesNeeded / 2 : vigilantesNeeded;
	} else {
		vigilantesNeeded = 0;
	}
	// if not skilled enough to do better that nothing or the first task help out with the war effort
	// Otherwise newest recruits go to war effort
	const warriors = Math.round(members.length * percentAtWar);
	ns.print(`viglante ${viglante} warriors ${warriors}`)
	let i = 0;
	for (const member of members) {
		i++;
		let prevTask = member.task;
		let bestTask = '';
		let mg = 0;
		for (const task of tasks) {
			let nmg = taskFunc(gang, member, task);
			if (nmg > mg) {
				bestTask = task.name;
				mg = nmg;
			}
		}
		if (bestTask === '' || bestTask === tasks[1].name || members.length - i < warriors) {
			bestTask = 'Territory Warfare';
		}
		if (vigilantesNeeded != 0 && warriors <= members.length - i && members.length - i < viglante + warriors) {
			bestTask = 'Vigilante Justice';
		}
		if (ns.gang.setMemberTask(member.name, bestTask) && prevTask !== bestTask) {
			ns.print(`assigned Gang Member '${member.name}' to '${bestTask}' task`);
		}
	}
}