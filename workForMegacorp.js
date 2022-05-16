const companySpecificConfigs = [
    { name: "NWO", statModifier: 25 },
    { name: "MegaCorp", statModifier: 25 },
    { name: "Blade Industries", statModifier: 25 },
    { name: "Fulcrum Secret Technologies", companyName: "Fulcrum Technologies", repRequiredForFaction: 250000 }, // Special snowflake
    { name: "Silhouette", companyName: "TBD", repRequiredForFaction: 999e9 /* Hack to force work until max promotion. */ }
]
const jobs = [ // Job stat requirements for a company with a base stat modifier of +224 (modifier of all megacorps except the ones above which are 25 higher)
    { name: "it", reqRep: [0, 7E3, 35E3, 175E3], reqHack: [225, 250, 275, 375], reqCha: [0, 0, 275, 300], repMult: [0.9, 1.1, 1.3, 1.4] },
    { name: "software", reqRep: [0, 8E3, 40E3, 200E3, 400E3, 800E3, 1.6e6, 3.2e6], reqHack: [225, 275, 475, 625, 725, 725, 825, 975], reqCha: [0, 0, 275, 375, 475, 475, 625, 725], repMult: [0.9, 1.1, 1.3, 1.5, 1.6, 1.6, 1.75, 2] },
    { name: "security", reqRep: [0, 8E3, 36E3, 144E3], reqCombat: [275, 375, 475, 725], reqHack: [0, 250, 250, 275], reqCha: [0, 275, 325, 375], repMult: [0.9, 1.1, 1.3, 1.5] },
]

export async function workForMegacorpFactionInvite(ns, factionName, waitForInvite) {
    const companyConfig = companySpecificConfigs.find(c => c.name === factionName); // For anything company-specific
    const companyName = companyConfig?.companyName || factionName; // Name of the company that gives the faction (same for all but Fulcrum)
    const statModifier = companyConfig?.statModifier || 0; // How much e.g. Hack / Cha is needed for a promotion above the base requirement for the job
    const repRequiredForFaction = companyConfig?.repRequiredForFaction || 200000; // Required to unlock the faction

    let player = ns.getPlayer();
    if (player.factions.includes(factionName)) return false; // Only return true if we did work to earn a new faction invite
    if ((ns.checkFactionInvitations()).includes(factionName))
        return waitForInvite ? await waitForFactionInvite(ns, factionName) : false;
    const itJob = jobs.find(j => j.name === "it");
    const softwareJob = jobs.find(j => j.name === "software");
    const securityJob = jobs.find(j => j.name === "security");
    const playerCombatStats = [player.strength, player.defense, player.dexterity, player.agility];
    let workITJob = true;
    let workSecurityJob = true;
    if (itJob.reqHack[0] + statModifier > player.hacking) // We don't qualify to work for this company yet if we can't meet IT qualifications (lowest there are)
        workITJob = false;
    if (playerCombatStats.filter(stat => stat < securityJob.reqCombat[0]) > 0)
        workSecurityJob = false;
    if (workITJob || workSecurityJob) {
        ns.print(`Cannot yet work for "${companyName}": Need Hack ${itJob.reqHack[0] + statModifier} or combat stats ${securityJob.reqCombat[0]} to get hired (current stats: ${ player.hacking}, ${[player.strength, player.defense, player.dexterity, player.agility].join(',')});`);
        return;
    }
    ns.print(`Going to work for Company "${companyName}" next...`)
    let currentReputation, currentRole = "", currentJobTier = -1; // TODO: Derive our current position and promotion index based on player.jobs[companyName]
    let lastStatus = "", lastStatusUpdateTime = 0, repGainRatePerMs = 0;
    let lastRepMeasurement = await getCompanyReputation(ns, companyName);
    let studying = false, working = false, backdoored = false;
    while (((currentReputation = (await getCompanyReputation(ns, companyName))) < repRequiredForFaction) && !player.factions.includes(factionName)) {
        if (breakToMainLoop()) return ns.print('INFO: Interrupting corporation work to check on high-level priorities.');
        player = (await getPlayerInfo(ns));
        // Determine the next promotion we're striving for (the sooner we get promoted, the faster we can earn company rep)
        const getTier = job => Math.min(job.reqRep.filter(r => r <= currentReputation).length, job.reqHack.filter(h => h <= player.hacking).length, job.reqCha.filter(c => c <= player.charisma).length) - 1;
        // It's generally best to hop back-and-forth between it and software engineer career paths (rep gain is about the same, but better money from software)
        const qualifyingItTier = getTier(itJob), qualifyingSoftwareTier = getTier(softwareJob);
        const bestJobTier = Math.max(qualifyingItTier, qualifyingSoftwareTier); // Go with whatever job promotes us higher
        const bestRoleName = qualifyingItTier > qualifyingSoftwareTier ? "it" : "software"; // If tied for qualifying tier, go for software
        if (currentJobTier < bestJobTier || currentRole !== bestRoleName) { // We are ready for a promotion, ask for one!
            if (await tryApplyToCompany(ns, companyName, bestRoleName))
                announce(ns, `Successfully applied to "${companyName}" for a '${bestRoleName}' Job or Promotion`, 'success');
            else if (currentJobTier !== -1) // Unless we just restarted "work-for-factions" and lost track of our current job, this is an error
                announce(ns, `Application to "${companyName}" for a '${bestRoleName}' Job or Promotion failed.`, 'error');
            currentJobTier = bestJobTier; // API to apply for a job immediately gives us the highest tier we qualify for
            currentRole = bestRoleName;
            player = (await getPlayerInfo(ns));
        }
        const currentJob = player.jobs[companyName];
        const nextJobTier = currentRole === "it" ? currentJobTier : currentJobTier + 1;
        const nextJobName = currentRole === "it" || nextJobTier >= itJob.reqRep.length ? "software" : "it";
        const nextJob = nextJobName === "it" ? itJob : softwareJob;
        const requiredHack = nextJob.reqHack[nextJobTier] === 0 ? 0 : nextJob.reqHack[nextJobTier] + statModifier; // Stat modifier only applies to non-zero reqs
        const requiredCha = nextJob.reqCha[nextJobTier] === 0 ? 0 : nextJob.reqCha[nextJobTier] + statModifier; // Stat modifier only applies to non-zero reqs
        const requiredRep = nextJob.reqRep[nextJobTier]; // No modifier on rep requirements
        let status = `Next promotion ('${nextJobName}' #${nextJobTier}) at Hack:${requiredHack} Cha:${requiredCha} Rep:${requiredRep?.toLocaleString()}` +
            (repRequiredForFaction > nextJob.reqRep[nextJobTier] ? '' : `, but we won't need it, because we'll sooner hit ${repRequiredForFaction.toLocaleString()} reputation to unlock company faction "${factionName}"!`);
        // We should only study at university if every other requirement is met but Charisma
        if (currentReputation >= requiredRep && player.hacking >= requiredHack && player.charisma < requiredCha && !options['no-studying']) {
            status = `Studying at ZB university until Cha reaches ${requiredCha}...\n` + status;
            if (studying && player.className !== 'taking a Leadership course' && player.className !== 'Leadership' /* In case className is made more intuitive in the future */) {
                announce(ns, `Leadership studies were interrupted. player.className="${player.className}" Restarting in 5 seconds...`, 'warning');
                studying = false; // If something external has interrupted our studies, take note
                ns.tail(); // Force a tail window open to help the user kill this script if they accidentally closed the tail window and don't want to keep studying
            }
            if (!studying) { // Study at ZB university if CHA is the limiter.
                if (await studyForCharisma(ns, shouldFocusAtWork))
                    working = !(studying = true);
            }
            if (requiredCha - player.charisma > 10) { // Try to spend hacknet-node hashes on university upgrades while we've got a ways to study to make it go faster
                let spentHashes = await trySpendHashes(ns, "Improve Studying");
                if (spentHashes > 0) {
                    announce(ns, 'Bought a "Improve Studying" upgrade.', 'success');
                    await studyForCharisma(ns, shouldFocusAtWork); // We must restart studying for the upgrade to take effect.
                }
            }
        } else if (studying) { // If we no longer need to study and we currently are, turn off study mode and get back to work!
            studying = false;
            continue; // Restart the loop so we refresh our promotion index and apply for a promotion before working more
        }
        await tryBuyReputation(ns);

        // Regardless of the earlier promotion logic, always try for a promotion to make sure we don't miss a promotion due to buggy logic
        if (await tryApplyToCompany(ns, companyName, currentRole))
            announce(ns, `Unexpected '${currentRole}' promotion from ${currentJob} to "${(await getPlayerInfo(ns)).jobs[companyName]}. Promotion logic must be off..."`, 'warning');
        // TODO: If we ever get rid of the below periodic restart-work, we will need to monitor for interruptions with player.workType == e.g. "Work for Company"
        if (!studying && (!working || (Date.now() - lastActionRestart >= restartWorkInteval) /* We must periodically restart work to collect Rep Gains */)) {
            // Work for the company (assume daemon is grinding hack XP as fast as it can, so no point in studying for that)
            if (await getNsDataThroughFile(ns, `ns.workForCompany(ns.args[0], ns.args[1])`, '/Temp/workForCompany.txt', [companyName, shouldFocusAtWork])) {
                working = true;
                if (shouldFocusAtWork) ns.tail(); // Force a tail window open to help the user kill this script if they accidentally closed the tail window and don't want to keep stealing focus
                currentReputation = await getCompanyReputation(ns, companyName); // Update to capture the reputation earned when restarting work
                lastActionRestart = Date.now(); repGainRatePerMs = (await getPlayerInfo(ns)).workRepGainRate; // Note: In order to get an accurate rep gain rate, we must wait for the first game tick (200ms) after starting work
                while (repGainRatePerMs === (await getPlayerInfo(ns)).workRepGainRate && (Date.now() - lastActionRestart < 400)) await ns.sleep(1); // TODO: Remove this if/when the game bug is fixed
                repGainRatePerMs = (await getPlayerInfo(ns)).workRepGainRate / 200 * (hasFocusPenaly && !shouldFocusAtWork ? 0.8 : 1 /* penalty if we aren't focused but don't have the aug to compensate */);
            } else {
                announce(ns, `Something went wrong, failed to start working for company "${companyName}".`, 'error');
                break;
            }
        }
        if (lastStatus !== status || (Date.now() - lastStatusUpdateTime) > statusUpdateInterval) {
            if (!backdoored) // Check if an external script has backdoored this company's server yet. If so, it affects our ETA. (Don't need to check again once we discover it is)
                backdoored = await getNsDataThroughFile(ns, `ns.getServer(ns.args[0]).backdoorInstalled`, '/Temp/getServer-backdoorInstalled.txt', [serverByCompany[companyName]]);
            const cancellationMult = backdoored ? 0.75 : 0.5; // We will lose some of our gained reputation when we stop working early
            repGainRatePerMs *= cancellationMult;
            // Actually measure how much reputation we've earned since our last update, to give a more accurate ETA including external sources of rep
            let measuredRepGainRatePerMs = ((await getCompanyReputation(ns, companyName)) - lastRepMeasurement) / (Date.now() - lastStatusUpdateTime);
            if (currentReputation > lastRepMeasurement + statusUpdateInterval * repGainRatePerMs * 2) // Detect a sudden increase in rep, but don't use it to update the expected rate
                ns.print('SUCCESS: Reputation spike! (Perhaps a coding contract was just solved?) ETA reduced.');
            else if (lastStatusUpdateTime !== 0 && Math.abs(measuredRepGainRatePerMs - repGainRatePerMs) / repGainRatePerMs > 0.05) // Stick to the game-provided rate if we measured something within 5% of that number
                repGainRatePerMs = measuredRepGainRatePerMs; // If we measure a significantly different rep gain rate, this could be due to external sources of rep (e.g. sleeves) - account for it in the ETA
            lastStatusUpdateTime = Date.now(); lastRepMeasurement = currentReputation;
            const eta_milliseconds = ((requiredRep || repRequiredForFaction) - currentReputation) / repGainRatePerMs;
            player = (await getPlayerInfo(ns));
            ns.print(`Currently a "${player.jobs[companyName]}" ('${currentRole}' #${currentJobTier}) for "${companyName}" earning ${formatNumberShort(repGainRatePerMs * 1000)} rep/sec. ` +
                `(after ${(100 * (1 - cancellationMult))?.toFixed(0)}% early-quit penalty` + (hasFocusPenaly && !shouldFocusAtWork ? ' and 20% non-focus Penalty' : '') + `)\n` +
                `${status}\nCurrent player stats are Hack:${player.hacking} ${player.hacking >= (requiredHack || 0) ? '✓' : '✗'} ` +
                `Cha:${player.charisma} ${player.charisma >= (requiredCha || 0) ? '✓' : '✗'} ` +
                `Rep:${Math.round(currentReputation).toLocaleString()} ${currentReputation >= (requiredRep || repRequiredForFaction) ? '✓' : `✗ (ETA: ${formatDuration(eta_milliseconds)})`}`);
            lastStatus = status;
        }
        await ns.sleep(loopSleepInterval); // Sleep now and wake up periodically and stop working to check our stats / reputation progress
    }
    // Return true if we succeeded, false otherwise.
    if (currentReputation >= repRequiredForFaction) {
        ns.print(`Attained ${repRequiredForFaction.toLocaleString()} rep with "${companyName}".`);
        if (!player.factions.includes(factionName) && waitForInvite)
            return await waitForFactionInvite(ns, factionName);
        return true;
    }
    ns.print(`Stopped working for "${companyName}" repRequiredForFaction: ${repRequiredForFaction.toLocaleString()} ` +
        `currentReputation: ${Math.round(currentReputation).toLocaleString()} inFaction: ${player.factions.includes(factionName)}`);
    return false;
}