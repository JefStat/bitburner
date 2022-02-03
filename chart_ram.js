import * as asciichart from 'asciichart.js';
import { ramUsage } from 'utils.js'
//store here to be a bit more persisten to script restarts
const series = { 'ramUsage': new Array(49).fill(0) };
/** @param {NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ['port', 1],
        ['refreshrate', 5000],
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
    const padding = '       ';
    const config = {
        offset: 2,    // axis offset from the left (min 2)
        padding, // padding string for label formatting (can be overridden)
        height: 10,   // any height you want
        // the label format function applies default padding
        format: function (x, i) { return (padding + ns.nFormat(x, '0.00%')).slice(-padding.length) }
    };
    ns.print(JSON.stringify(Object.values(series), null, 2));
    while (true) {
        ns.clearLog();
        ns.print(`Interval ${ns.tFormat(flags.refreshrate)}`);
        const target = 'ramUsage';
        series[target].push(ramUsage(ns));
        series[target].shift();
        ns.print(target);
        ns.print(`${asciichart.plot(series[target], config)}`);
        await ns.sleep(flags.refreshrate);
    }
}