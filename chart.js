import * as asciichart from 'asciichart.js';
/** @param {NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ['port', 1]
        ['refreshrate', 200],
        ['help', false],
    ])
    if (flags.help) {
        ns.tprint("This script plots a chart using data from a pipe");
        ns.tprint(`USAGE: run ${ns.getScriptName()} PIPE_NUMBER`);
        ns.tprint("Example:");
        ns.tprint(`> run ${ns.getScriptName()} 1`)
        return;
    }
    ns.tail();
    ns.disableLog('ALL');
    const config = {
        offset: 2,    // axis offset from the left (min 2)
        padding: '',  // padding string for label formatting (can be overridden)
        height: 23,   // any height you want
        // the label format function applies default padding
        // format:  function (x, i) { return (padding + x.toFixed (2)).slice (-padding.length) }
    };
    const series = new Array(50);
    while (true) {
        ns.clearLog();
        await ns.writePort(1, ns.getScriptIncome()[0]);
        let d = ns.peek(flags.port);
        if (d === 'NULL PORT DATA') {
            await ns.sleep(flags.refreshrate);
            continue;
        }
        d = ns.readPort(flags.port)
        series.push(d);
        series.shift();
        ns.print(`${asciichart.plot(series, config)}`);
        await ns.sleep(flags.refreshrate);
    }
}

export function autocomplete(data, args) {
    return ["1", "2"];
}