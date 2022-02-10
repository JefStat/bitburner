let ns;

let gang = {};
let members = [];
let tasks = [];
let percentAtWar = 0;
let maxOtherGangPower;
let warTracker = {
  prevTickTime: Date.now(),
  prevPower: -1,
  lastPowerChange: Date.now(),
  nextTick: -1
};

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
  isWartime();
  const moneyTask = ns.formulas.gang.moneyGain;
  const respectTask = ns.formulas.gang.respectGain;
  const wantedTask = (g, m, t) => -1 * ns.formulas.gang.wantedLevelGain(g, m, t);
  const warTask = (g, m, t) => t === 'Territory Warfare' ? 100 : 0;
  while (true) {
    gang = ns.gang.getGangInformation();
    const og = ns.gang.getOtherGangInformation();
    maxOtherGangPower = Math.max(...Object.entries(og).map(([k, s]) => (k === gang.faction ? 0 : (s.territory <= 0 ? 0 : s.power))));
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
    return false;
  }
  const isBonusTime = ns.gang.getBonusTime() >= 10 * 1000;
  if (warTracker.prevPower === gang.power) {
    if (warTracker.nextTick > Date.now()) {
      // waiting for next tick
    } else {
      // tick was early
      ns.print(`war tick was early by ${ns.tFormat(Date.now() - warTracker.nextTick)}`);
    }
    if (warTracker.prevTickTime > Date.now()) {
      // prevTickTime should never be in the future
      ns.print(`war previous tick is in the future by ${ns.tFormat(warTracker.prevTickTime - Date.now())} next tick is ${ns.tFormat(Date.now() - warTracker.nextTick)}  from now`);
    } else {
      warTracker.prevTickTime = warTracker.lastPowerChange;
    }
  }
  if (warTracker.prevPower < gang.power) {
    ns.print('PowerTick ' + new Date().toISOString());
    warTracker.prevPower = gang.power;
    warTracker.lastPowerChange = Date.now();
    warTracker.prevTickTime = warTracker.lastPowerChange;
    warTracker.nextTick = warTracker.lastPowerChange + (isBonusTime ? 2 : 20) * 1000;
  }
  let timeTillAfterTick = Date.now() - warTracker.prevTickTime;
  let timeTillTick = nextTick - Date.now();
  // if before war tick or until just past the
  if ((0 < timeTillTick && timeTillTick < 500) || (0 < timeTillAfterTick && timeTillAfterTick < 500)) {
    //WarTime!
    ns.print(`Wartime remaining ${ns.tFormat(timeTillAfterTick)}`);
    return true;
  } else {
    ns.print(`Wartime in timeTillTick ${ns.tFormat(timeTillTick)} for ${ns.tFormat(timeTillAfterTick - timeTillTick)}`);
    return false;
  }
}

function war() {

  // if (maxOtherGangPower * 1.5 < gang.power) {
  //   percentAtWar -= 10;
  //   if (percentAtWar < 0) {
  //     percentAtWar = 0;
  //   } else {
  //     ns.print(`Percent at war ${percentAtWar}`);
  //   }
  // } else if (maxOtherGangPower > gang.power && percentAtWar < 50) {
  //   percentAtWar += 10;
  // }
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
      if (ns.gang.getEquipmentCost(equipName) < ns.getServerMoneyAvailable('home') * .7) {
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
    // ascend values are kinda odd to get a feel for.
    // result multiplier are a percentage increase of the current value.
    // multiply these together if the multipliers go up by 5 times then good enough to ascend
    let res_multi = res.agi * res.def * res.dex * res.hack * res.str;
    if (res_multi > 5) {
      ns.gang.ascendMember(member.name);
      ns.print(`Ascended ${member.name} multis ${multis.toPrecision(4)}, res_multi ${res_multi.toPrecision(4)}`);
      ns.toast(`Ascended ${member.name} multis ${multis.toPrecision(4)}, res_multi ${res_multi.toPrecision(4)}`, 'info', 30000);
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
  const warriors = Math.round(members.length * (percentAtWar / 100));
  //	ns.print(`viglante ${viglante} warriors ${warriors}`)
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
    if (vigilantesNeeded !== 0 && warriors <= members.length - i && members.length - i < viglante + warriors) {
      bestTask = 'Vigilante Justice';
    }
    if (ns.gang.setMemberTask(member.name, bestTask) && prevTask !== bestTask) {
      ns.print(`assigned '${member.name}' to '${bestTask}'`);
    }
  }
}
