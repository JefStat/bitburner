import { boxTailSingleton } from "utils.js"
let ns;

let gang = {};
let members = [];
let tasks = [];
let maxOtherGangPower;
let chanceVsOtherGang;
let warTracker;
let isEarlyGang = true;
let needMoreMembers = true;
const memberNames = [
  'Teal', 'Fawn', 'TFT',
  'Turduck\'n', 'Fender', 'Just Moe',
  'Mixer', 'Hip', 'Brownstone',
  'Sal', 'Right Hand', 'Left Shark'
];
const combatAugmentPriorityOrder = ['Bionic Arms', 'Nanofiber Weave', 'Bionic Spine', 'Synfibril Muscle', 'BrachiBlades', 'Synthetic Heart', 'Graphene Bone Lacings'];
const gangumStatus = {};
/** @param {NS} pns **/
export async function main(pns) {
  ns = pns;
  ns.disableLog('getServerMoneyAvailable');
  ns.disableLog('gang.purchaseEquipment');
  ns.disableLog('gang.setMemberTask');
  ns.disableLog('sleep');
  ns.disableLog('gang.setTerritoryWarfare');
  ns.disableLog('gang.canRecruitMember');
  if (!ns.fileExists('/tmp/ingang.txt')) {
    ns.print('not in gang');
    return;
  }
  boxTailSingleton(ns, 'gangum', '\u270A', '220px');
  ns.clearLog();

  warTracker = {
    prevPower: -1,
    lastPowerChange: Date.now(),
    nextTick: -1
  };
  const moneyTask = (g, m, t) => isEarlyGang && m.str < 10000 ? ns.formulas.gang.moneyGain(g, m, t) : (t.name === 'Traffick Illegal Arms' ? 1 : 0);
  const respectTask = ns.formulas.gang.respectGain;
  const wantedTask = (g, m, t) => -1 * ns.formulas.gang.wantedLevelGain(g, m, t);
  const warTask = (g, m, t) => t.name === 'Territory Warfare' ? 100 : 0;
  isEarlyGang = true;
  while (true) {
    gang = ns.gang.getGangInformation();
    const og = ns.gang.getOtherGangInformation();
    // seem like there are rounding errors on territory percent so always consider max of all gangs power
    // maxOtherGangPower = Math.max(...Object.entries(og).map(([k, s]) => (k === gang.faction ? 0 : (s.territory <= 0 ? 0 : s.power))));
    maxOtherGangPower = Math.max(...Object.entries(og).map(([k, s]) => (k === gang.faction ? 0 : s.power)));
    const chanceVsOtherGangs = Object.entries(ns.gang.getOtherGangInformation())
        .filter(([k, s]) => k !== gang.faction && s.territory > 0)
        .map(([k, s]) => ns.gang.getChanceToWinClash(k));
    chanceVsOtherGang = chanceVsOtherGangs.reduce((a, b) => a + b, 0) / chanceVsOtherGangs.length
    isEarlyGang = gang.respect < 3.2e6
    needMoreMembers = gang.respect < 3125; // 15625;//1.6e6;
    const curMembers = ns.gang.getMemberNames();
    const newMemberNames = memberNames.filter(o => !curMembers.includes(o));
    if (ns.gang.canRecruitMember() && ns.gang.recruitMember(newMemberNames[0])) {
      ns.toast('Recruited', 'info', 10000);
    }

    getMembersStats();
    getTasksStats();
    equip();
    ascend();
    war();
    let [makeWar, makeWarMsg] = isWartime();
    gangumStatus['isWartime'.padEnd(10)] = `${makeWar} ${(gang.territory * 100).toFixed(3)}%`
    gangumStatus.makeWarMsg = makeWarMsg || gangumStatus.makeWarMsg;
    if (makeWar) {
      setTasks(warTask);
    } else if (needMoreMembers) {
      setTasks(respectTask);
    } else {
      setTasks(moneyTask);
    }

    ns.clearLog();
    for (let [k, v] of Object.entries(gangumStatus)) {
      ns.print(`${k}: ${v}`);
    }
    await ns.sleep(100);
  }
}

function isWartime() {
  // no need for war any more
  if (gang.territory === 1) {
    warTracker.nextTick = Date.now();
    return [false, 'Territory maxed No more war'];
  }
  // too powerful don't get more power
  if (maxOtherGangPower * 1.5 < gang.power) {
    warTracker.nextTick = Date.now();
    return [false, 'Power higher enough no more warfare'];
  }
  if (warTracker.prevPower === -1) {
    warTracker.prevPower = gang.power;
  }
  let warningMsg = '';
  const isBonusTime = ns.gang.getBonusTime() >= 10;
  if (warTracker.prevPower !== gang.power) {
    warTracker.prevPower = gang.power;
    warTracker.lastPowerChange = Date.now();
    warTracker.nextTick = warTracker.lastPowerChange + (isBonusTime ? 1.6 : 20) * 1000;
    const hour = `${new Date().getHours()}`
    const min = `${new Date().getMinutes()}`;
    const sec = `${new Date().getSeconds()}`;
    warningMsg += `PowerTick ${hour}:${min.padStart(2, '0')}:${sec.padStart(2, '0')} clash ${(chanceVsOtherGang * 100).toPrecision(2)}%`;
  }
  if (warTracker.nextTick === -1) {
    return [false, `waiting for tick`];
  }
  if (warTracker.prevPower === gang.power) {
    if (warTracker.nextTick > Date.now()) {
      // waiting for next tick
    } else {
      // tick was early
      warningMsg += `war tick was early by ${Date.now() - warTracker.nextTick}`;
      warTracker.nextTick = -1;
    }
  }
  let timeTillTick = warTracker.nextTick - Date.now();
  // if before war tick and until just past the tick. Power tick will update nextTick to stop war time
  if (-2000 < timeTillTick && timeTillTick < 300) {
    //WarTime!
    warningMsg += `Wartime remaining ${timeTillTick}`;
    return [true, warningMsg];
  } else {
    return [false, warningMsg];
  }
}

function war() {
  // if gang power is at max try to continue war for more territory
  const enableWar = (chanceVsOtherGang > .6) || (maxOtherGangPower * 1.5 <= gang.power);
  if (gang.territoryWarfareEngaged !== enableWar) {
    // ns.print(`Changing warfare to ${enableWar}`);
    ns.toast(`Changing warfare to ${enableWar}`, enableWar ? 'warning' : 'info', 30000);
  }
  // ns.print(`maxOtherGangPower ${maxOtherGangPower} strongerGangs ${strongerGangs} gang.power ${gang.power} gang.territoryWarfareEngaged ${gang.territoryWarfareEngaged}`)
  ns.gang.setTerritoryWarfare(enableWar);
}

function equip() {
  const nameStatsMap = {};
  let equipmentNames = ns.gang.getEquipmentNames();
  for (const equipName of equipmentNames) {
    nameStatsMap[equipName] = ns.gang.getEquipmentStats(equipName);
  }
  const combatGear = Object.entries(nameStatsMap).filter(([e, stats]) => stats.str || stats.def || stats.cha);
  for (const [equipName] of combatGear) {
    for (const member of members) {
      const augsAndUpgrades = [];
      augsAndUpgrades.push(...member.augmentations);
      augsAndUpgrades.push(...member.upgrades);
      if (augsAndUpgrades.includes(equipName)) {
        continue;
      }
      if (ns.gang.purchaseEquipment(member.name, equipName)) {
        // ns.print(`Purchased ${equipName} for ${member.name}`);
        gangumStatus[member.name.padEnd(10)] += ' ' + equipName;
        if (combatAugmentPriorityOrder.includes(equipName)) {
          ns.toast(`Purchased ${equipName} for ${member.name}`, 'success', 10000);
        }
        // restrict soft reset loop to do so only for the augs
      } else if (combatAugmentPriorityOrder.includes(equipName)) {
        if (ns.getServerMoneyAvailable('home') < ns.gang.getEquipmentCost(equipName) && ns.gang.getEquipmentCost(equipName) < 10e9) {
          ns.print(`Resetting to buy ${equipName} for ${member.name}`);
          ns.softReset('bootstrap32GB.js');
        }

      }
    }
  }
}

function ascend() {
  for (const member of members) {
    const res = ns.gang.getAscensionResult(member.name);
    if (!res) continue;
    let str_mult = 1.6;
    if (!isEarlyGang) {
      str_mult = 1.1;
    }
    if (res.str > str_mult) {
      ns.gang.ascendMember(member.name);
      const msg = `Ascended ${member.name} asc_multi ${member.str_asc_mult.toPrecision(4)}, res_multi ${res.str.toPrecision(4)}`
      ns.toast(msg, 'info', 30000);
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
  let vigilante = 0;
  if (ns.formulas.gang.wantedPenalty(gang) < 0.99 && gang.wantedLevel > 2) {
    vigilantesNeeded = (vigilantesNeeded * 1.5) || .15;
    vigilante = Math.floor(members.length * vigilantesNeeded);
    vigilantesNeeded = vigilante >= members.length ? members.length : vigilantesNeeded;
  } else {
    vigilantesNeeded = 0;
  }
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
    // if nothing or unassigned train
    if (bestTask === '' || bestTask === 'Unassigned') {
      bestTask = gang.isHacking ? 'Train Hacking' : 'Train Combat';
    }
    if (bestTask !== 'Territory Warfare' && vigilantesNeeded !== 0 && members.length - i < vigilante) {
      bestTask = 'Vigilante Justice';
    }
    // if waiting for a power tick
    if (warTracker.nextTick === -1) {
      bestTask = 'Territory Warfare';
    }
    if (ns.gang.setMemberTask(member.name, bestTask) && prevTask !== bestTask) {
      gangumStatus[member.name.padEnd(10)] = bestTask;
    }
  }
}