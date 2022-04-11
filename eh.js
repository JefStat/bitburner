import {spider} from "/script/library.js"
import {reporter} from "/script/library.js"
import {crack} from "/script/library.js"

/** @param {NS} ns **/
export async function main(ns) {

    const target = ns.args[0];
    const serverToHackFrom = target;
    const hackScript = "/DHack/hack.js";
    const growScript = "/DHack/grow.js";
    const weakenScript = "/DHack/weaken.js";
    ns.tail();

    ns.disableLog("ALL");
    const growScriptRAM = ns.getScriptRam(growScript);
    const serverMaxMoney = ns.getServerMaxMoney(target);
    let serversMaxRAM = 0;
    let serversUsedRAM = 0;
    let flag = true;
    const moneyThresh = serverMaxMoney * 0.9; // 0.90 to maintain near 100% server money.  You can use 0.75 when starting out/using low thread counts
    const securityThresh = ns.getServerMinSecurityLevel(target) + 5;
    let currentServerMoney;
    let currentServerSecurity;
    let useThreadsHack, useThreadsWeaken1, useThreadsWeaken2, useThreadsGrow;
    let possibleThreads;
    let workersAvailable = false;
    let maxHackFactor = 0.01;
    const growWeakenRatio = 0.9; // How many threads are used for growing vs. weaking (90:10).
    let sleepTimeHack, sleepTimeGrow, sleepTimeWeaken;
    const sleepDelay = 200; // Sleep delay should range between 20ms and 200ms as per the documentation. I'll keep the default at 200, adjust as needed.
    let maxThreadsOnServer = 0;
    let threadsRunning = 0;
    let batchServers = [];
    let moneyBeforeHack;
    let moneyAfterHack;
    // Prepare workers


    const loopservers = spider(ns);


    if (!workersAvailable) {
        if (ns.getPurchasedServers().length > 0) {
            workersAvailable = true;
            const privateServers = ns.getPurchasedServers();
            for (let server of privateServers) {
                await ns.scp(hackScript, server);
                await ns.scp(growScript, server);
                await ns.scp(weakenScript, server);
                batchServers.push(server);
            }

        }
    }


    for (let server of loopservers) {


        let openPorts = 0;

        if (ns.fileExists("BruteSSH.exe")) {
            ns.brutessh(server);
            openPorts++;
        }
        if (ns.fileExists("FTPCrack.exe")) {
            ns.ftpcrack(server);
            openPorts++;
        }
        if (ns.fileExists("RelaySMTP.exe")) {
            ns.relaysmtp(server);
            openPorts++;
        }
        if (ns.fileExists("HTTPWorm.exe")) {
            ns.httpworm(server);
            openPorts++;
        }
        if (ns.fileExists("SQLInject.exe")) {
            ns.sqlinject(server);
            openPorts++;
        }
        if (ns.getServerNumPortsRequired(server) <= openPorts) {
            ns.nuke(server);
            await ns.scp(hackScript, server);
            await ns.scp(growScript, server);
            await ns.scp(weakenScript, server);
            batchServers.push(server);

        }


    }

    batchServers.push("home");

    for (let server of batchServers) {
        serversMaxRAM += ns.getServerMaxRam(server);
    }

    while (true) {
        currentServerMoney = ns.getServerMoneyAvailable(target);
        currentServerSecurity = ns.getServerSecurityLevel(target);


        // The first two cases are for new servers with high SECURITY LEVELS and to quickly grow the server to above the threshold
        if (currentServerSecurity > securityThresh && currentServerMoney < moneyThresh) {
            sleepTimeWeaken = ns.getWeakenTime(target) + sleepDelay; // Added 100 milliseconds to the 'sleepTime' variables to prevent any issues with overlapping work scripts
            for (let server of batchServers) {
                possibleThreads = ((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / growScriptRAM)
                if (possibleThreads >= 2) {
                    ns.exec(growScript, server, Math.ceil(possibleThreads / 2), target);
                    ns.exec(weakenScript, server, Math.floor(possibleThreads / 2), target);
                }
            }
            await ns.sleep(sleepTimeWeaken); // wait for the weaken command to finish
        } else if (currentServerMoney < moneyThresh) {
            sleepTimeWeaken = ns.getWeakenTime(target) + sleepDelay;
            for (let server of batchServers) {
                possibleThreads = ((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / growScriptRAM)
                if (possibleThreads >= 2) {
                    ns.exec(growScript, server, Math.floor(possibleThreads * growWeakenRatio), target);
                    ns.exec(weakenScript, server, Math.ceil(possibleThreads * (1 - growWeakenRatio)), target);
                }
            }
            await ns.sleep(sleepTimeWeaken); // wait for the weaken command to finish
        } else {
            // Define max amount that can be restored with one grow and therefore will be used to define hack threads.
            // The max grow threads are considering the weaken threads needed to weaken hack security and the weaken threads needed to weaken grow security.
            // I didn't bother optimizing the 'growWeakenRatio' further, as 90% is good enough already. It will be just a few more hack threads, if any at all - even with large RAM sizes.
            for (let server of batchServers) {
                serversUsedRAM += ns.getServerUsedRam(server);
            }

            possibleThreads = Math.floor(((serversMaxRAM - serversUsedRAM) / growScriptRAM)) - 1;


            flag = true;
            while (flag) {
                if (maxHackFactor < 0.999) {

                    useThreadsHack = Math.floor(ns.hackAnalyzeThreads(target, currentServerMoney * maxHackFactor))

                    if (Math.floor(possibleThreads - useThreadsHack - Math.ceil(useThreadsHack / 25)) * growWeakenRatio > Math.ceil(ns.growthAnalyze(target, serverMaxMoney / (serverMaxMoney * (1 - maxHackFactor))))) {
                        maxHackFactor += 0.001; // increase by 0.1% with each iteration

                    } else {
                        flag = false;
                    }
                } else {
                    flag = false;
                }

            }

            maxHackFactor -= 0.001; // Since it's more than 'possibleThreads' can handle now, we need to dial it back once.
            useThreadsHack = Math.floor(ns.hackAnalyzeThreads(target, currentServerMoney * maxHackFactor)); // Forgot this in the first version.
            useThreadsWeaken1 = Math.ceil(useThreadsHack / 25); // You can weaken the security of 25 hack threads with 1 weaken thread
            useThreadsGrow = Math.floor((possibleThreads - useThreadsWeaken1 - useThreadsHack) * growWeakenRatio);
            useThreadsWeaken2 = possibleThreads - useThreadsHack - useThreadsGrow - useThreadsWeaken1;
            sleepTimeHack = ns.getHackTime(target);
            sleepTimeGrow = ns.getGrowTime(target);
            sleepTimeWeaken = ns.getWeakenTime(target);
            threadsRunning = 0;
            ns.print("possible threads: " + possibleThreads)
            ns.print("use thread hack: " + useThreadsHack)
            ns.print("use thread weaken1: " + useThreadsWeaken1)
            ns.print("use thread weaken2: " + useThreadsWeaken2)
            ns.print("use thread grow: " + useThreadsGrow)
            ns.print("Max Hack Factor: " + maxHackFactor)
            ns.print("Money available on server: " + currentServerMoney);
            ns.print("Money to be stolen: " + (currentServerMoney * maxHackFactor))

            for (let server of batchServers) {

                maxThreadsOnServer = Math.floor(((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / growScriptRAM));


                if (useThreadsWeaken1 >= (threadsRunning + maxThreadsOnServer)) {

                    if (maxThreadsOnServer > 0) {
                        ns.exec(weakenScript, server, maxThreadsOnServer, target, "1");
                        threadsRunning += maxThreadsOnServer;
                    }
                } else {

                    maxThreadsOnServer = useThreadsWeaken1 - threadsRunning;
                    if (maxThreadsOnServer > 0) {
                        ns.exec(weakenScript, server, maxThreadsOnServer, target, "1");
                        threadsRunning += maxThreadsOnServer;
                    }


                    break;
                }

            }
            ns.print("Ran " + threadsRunning + " weaken1 threads");
            threadsRunning = 0;
            ns.print("Sleeping after weaken 1 for: " + (2 * sleepDelay))
            await ns.sleep(2 * sleepDelay);

            for (let server of batchServers) {
                maxThreadsOnServer = Math.floor(((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / growScriptRAM));

                if (useThreadsWeaken2 >= (threadsRunning + maxThreadsOnServer)) {
                    if (maxThreadsOnServer > 0) {
                        ns.exec(weakenScript, server, maxThreadsOnServer, target, "2");
                        threadsRunning += maxThreadsOnServer;
                    }
                } else {
                    maxThreadsOnServer = useThreadsWeaken2 - threadsRunning;
                    if (maxThreadsOnServer > 0) {
                        ns.exec(weakenScript, server, maxThreadsOnServer, target, "2");
                        threadsRunning += maxThreadsOnServer;
                    }


                    break;
                }

            }
            ns.print("Ran " + threadsRunning + " weaken2 threads");
            threadsRunning = 0;
            ns.print("Sleeping after weaken 2 for: " + (sleepTimeWeaken - sleepTimeGrow - sleepDelay))
            await ns.sleep(sleepTimeWeaken - sleepTimeGrow - sleepDelay);

            for (let server of batchServers) {
                maxThreadsOnServer = Math.floor(((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / growScriptRAM));

                if (useThreadsGrow >= (threadsRunning + maxThreadsOnServer)) {
                    if (maxThreadsOnServer > 0) {
                        ns.exec(growScript, server, maxThreadsOnServer, target);
                        threadsRunning += maxThreadsOnServer;
                    }
                } else {
                    maxThreadsOnServer = useThreadsGrow - threadsRunning;
                    if (maxThreadsOnServer > 0) {
                        ns.exec(growScript, server, maxThreadsOnServer, target);
                        threadsRunning += maxThreadsOnServer;
                    }


                    break;
                }

            }
            ns.print("Ran " + threadsRunning + " grow threads");
            threadsRunning = 0;
            ns.print("Sleeping after grow for: " + (sleepTimeGrow - sleepTimeHack - 2 * sleepDelay))
            await ns.sleep(sleepTimeGrow - sleepTimeHack - 2 * sleepDelay);

            for (let server of batchServers) {
                maxThreadsOnServer = Math.floor(((ns.getServerMaxRam(server) - ns.getServerUsedRam(server)) / 1.7));

                if (useThreadsHack >= (threadsRunning + maxThreadsOnServer)) {
                    if (maxThreadsOnServer > 0) {
                        ns.exec(hackScript, server, maxThreadsOnServer, target);
                        threadsRunning += maxThreadsOnServer;

                    }
                } else {
                    maxThreadsOnServer = useThreadsHack - threadsRunning;
                    if (maxThreadsOnServer > 0) {
                        ns.exec(hackScript, server, maxThreadsOnServer, target);
                        threadsRunning += maxThreadsOnServer;

                    }


                    break;
                }

            }
            ns.print("Ran " + threadsRunning + " hack threads");
            threadsRunning = 0;
            moneyBeforeHack = ns.getServerMoneyAvailable("home");
            ns.print("Sleeping after hack for: " + (sleepTimeHack + 4 * sleepDelay))
            await ns.sleep(sleepTimeHack + 4 * sleepDelay); // wait after second weaken script
            moneyAfterHack = ns.getServerMoneyAvailable("home");
            maxHackFactor = 0.01;
            ns.print("\n");
            ns.print("Money stolen: " + (moneyAfterHack - moneyBeforeHack));
            ns.print("-----------------------------------------------------------------------------------------------------");
            ns.print("\n\n\n\n\n");


        }
    }
}