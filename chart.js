import * as asciichart from 'asciichart.js';
/** @param {NS} ns **/
export async function main(ns) {
    const flags = ns.flags([
        ['port', 1],
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
    const padding = '       ';
    const config = {
        offset: 2,// axis offset from the left (min 2)
        padding, // padding string for label formatting (can be overridden)
        height: 23,   // any height you want
        // the label format function applies default padding
        format: function (x, i) { return (padding + ns.nFormat(x, '0.00a')).slice(-padding.length) }
    };
    const series = { 'n00dles': new Array(50).fill(0) };
    const port = flags.port;
    ns.print(JSON.stringify(Object.values(series), null, 2));
    while (true) {
        ns.clearLog();
        let d = ns.peek(port);
        if (d !== 'NULL PORT DATA') {
            d = ns.readPort(port)
            const [target, v] = d.split(':');
            series[target] = series[target] || new Array(50).fill(0);
            series[target].push(Math.floor(parseFloat(v)));
            series[target].shift();
        }
        ns.print(`${asciichart.plot(Object.values(series), config)}`);
        await ns.sleep(flags.refreshrate);
    }
}