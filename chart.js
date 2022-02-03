import * as asciichart from 'asciichart.js';
//store here to be a bit more persisten to script restarts
const series = { 'n00dles': new Array(50).fill(0) };
/** @param {NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ['port', 1],
        ['refreshrate', 10000],
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
        height: 5,   // any height you want
        // the label format function applies default padding
        format: function (x, i) { return (padding + ns.nFormat(x, '0.00a')).slice(-padding.length) }
    };

    const port = flags.port;
    ns.print(JSON.stringify(Object.values(series), null, 2));
    while (true) {
        ns.clearLog();
        const dollars = {};
        let d = ns.peek(port);
        while (d !== 'NULL PORT DATA') {
            d = ns.readPort(port)
            if (d === 'NULL PORT DATA') continue;
            const [target, v] = d.split(':');
            const dollar = Math.floor(parseFloat(v));
            if (!dollars[target]) dollars[target] = 0;
            dollars[target] += dollar;
            // ns.toast(`Hacked ${target} ${ns.nFormat(dollar, "$0.000a")}`, 'info', 3000);
            series[target] = series[target] || new Array(50).fill(0);
        }
        ns.print(`Interval ${ns.tFormat(flags.refreshrate)}`)
        for (const [target, datum] of Object.entries(series)) {
            series[target].push(dollars[target] || 0);
            series[target].shift();
            ns.print(target);
            ns.print(`${asciichart.plot(datum, config)}`);
        }
        await ns.sleep(flags.refreshrate);
    }
}