let ns;

let gang = {};
let members = [];
let tasks = [];
let maxOtherGangPower;
let warTracker;
let isEarlyGang = true;

/** @param {NS} pns **/
export async function main(pns) {
  ns = pns;
  ns.disableLog('getServerMoneyAvailable');
  ns.disableLog('gang.purchaseEquipment');
  ns.disableLog('gang.setMemberTask');
  ns.disableLog('sleep');
  ns.disableLog('gang.setTerritoryWarfare');
  ns.disableLog('gang.canRecruitMember');
  ns.clearLog();
  ns.tail();
  if (!ns.gang.inGang()) {
    //ns.createGang('Slum Snakes')... todo
    return;
  }
  warTracker = {
    prevPower: -1,
    lastPowerChange: Date.now(),
    nextTick: -1
  };
  const moneyTask = ns.formulas.gang.moneyGain;
  const respectTask = ns.formulas.gang.respectGain;
  const wantedTask = (g, m, t) => -1 * ns.formulas.gang.wantedLevelGain(g, m, t);
  const warTask = (g, m, t) => t.name === 'Territory Warfare' ? 100 : 0;
  isEarlyGang = true;
  while (true) {
    gang = ns.gang.getGangInformation();
    const og = ns.gang.getOtherGangInformation();
    maxOtherGangPower = Math.max(...Object.entries(og).map(([k, s]) => (k === gang.faction ? 0 : (s.territory <= 0 ? 0 : s.power))));
    isEarlyGang = gang.respect < 3.2e6
    if (ns.gang.canRecruitMember() && ns.gang.recruitMember('g' + (ns.gang.getMemberNames().length + 1))) {
      ns.toast('Recruited', 'info', 10000);
    }
    getMembersStats();
    getTasksStats();
    ascend();
    war();
    if (isWartime()) {
      setTasks(warTask);
    } else {
      setTasks(moneyTask);
    }
    equip();
    await ns.sleep(100);
  }
}

function isWartime() {
  if (maxOtherGangPower * 1.5 < gang.power) {
    warTracker.nextTick = Date.now();
    return false;
  }
  if (warTracker.prevPower === -1) {
    warTracker.prevPower = gang.power;
  }
  const isBonusTime = ns.gang.getBonusTime() >= 10;
  if (warTracker.prevPower !== gang.power) {
    warTracker.prevPower = gang.power;
    warTracker.lastPowerChange = Date.now();
    warTracker.nextTick = warTracker.lastPowerChange + (isBonusTime ? 2 : 20) * 1000;
    ns.print(`PowerTick ${new Date().toLocaleTimeString()} next tick at ${new Date(warTracker.nextTick).toLocaleTimeString()}`);
  }
  if (warTracker.nextTick === -1) {
    ns.print(`waiting for tick`);
    return false;
  }
  if (warTracker.prevPower === gang.power) {
    if (warTracker.nextTick > Date.now()) {
      // waiting for next tick
    } else {
      // tick was early
      ns.print(`war tick was early by ${Date.now() - warTracker.nextTick}`);
      warTracker.nextTick = -1;
    }
  }
  let timeTillTick = warTracker.nextTick - Date.now();
  // if before war tick and until just past the tick. Power tick will update nextTick to stop war time
  if (-2000 < timeTillTick && timeTillTick < 500) {
    //WarTime!
    ns.print(`Wartime remaining ${timeTillTick}`);
    return true;
  } else {
    return false;
  }
}

function war() {
  const strongerGangs = maxOtherGangPower < gang.power;
  if (gang.territoryWarfareEngaged !== strongerGangs) {
    ns.print(`Changing warfare to ${strongerGangs}`);
    ns.toast(`Changing warfare to ${strongerGangs}`, strongerGangs ? 'info' : 'warning', 30000);
  }
  // ns.print(`maxOtherGangPower ${maxOtherGangPower} strongerGangs ${strongerGangs} gang.power ${gang.power} gang.territoryWarfareEngaged ${gang.territoryWarfareEngaged}`)
  ns.gang.setTerritoryWarfare(strongerGangs);
}

function equip() {
  const equipmentNames = ns.gang.getEquipmentNames();
  for (const member of members) {
    for (const equipName of equipmentNames) {
      const stats = ns.gang.getEquipmentStats(equipName);
      if (ns.gang.getEquipmentCost(equipName) < ns.getServerMoneyAvailable('home') * .5) {
        if (!isEarlyGang || (gang.isHacking && (stats.hack || stats.cha)) || (!gang.isHacking && (stats.str))) {
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
    const res = ns.gang.getAscensionResult(member.name);
    if (!res) continue;
    let str_mult = 1.6;
    if (!isEarlyGang) {
      str_mult = 1.1;
    }
    if (res.str > str_mult) {
      ns.gang.ascendMember(member.name);
      const msg = `Ascended ${member.name} asc_multi ${member.str_asc_mult.toPrecision(4)}, res_multi ${res.str.toPrecision(4)}`
      ns.print(msg);
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
    if (bestTask === '' || bestTask === tasks[1].name) {
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
      ns.print(`assigned '${member.name}' to '${bestTask}'`);
    }
  }
}