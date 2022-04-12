/**
 * @author modar <gist.github.com/xmodar>
 * {@link https://www.reddit.com/r/Bitburner/comments/tgtkr1/here_you_go_i_fixed_growthanalyze_and_growpercent/}
 *
 * @typedef {Partial<{
 *   moneyAvailable: number;
 *   hackDifficulty: number;
 *   ServerGrowthRate: number // ns.getBitNodeMultipliers().ServerGrowthRate
 *   ; // https://github.com/danielyxie/bitburner/blob/dev/src/BitNode/BitNode.tsx
 * }>} GrowOptions
 */

export function calculateGrowGain(ns, host, threads = 1, cores = 1, opts = {}) {
    threads = Math.max(Math.floor(threads), 0);
    const moneyMax = ns.getServerMaxMoney(host);
    const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
    const rate = growPercent(ns, host, threads, cores, opts);
    return Math.min(moneyMax, rate * (moneyAvailable + threads)) - moneyAvailable;
}

/** @param {number} gain money to be added to the server after grow */
export function calculateGrowThreads(ns, host, gain, cores = 1, opts = {}) {
    const moneyMax = ns.getServerMaxMoney(host);
    const { moneyAvailable = ns.getServerMoneyAvailable(host) } = opts;
    const money = Math.min(Math.max(moneyAvailable + gain, 0), moneyMax);
    const rate = Math.log(growPercent(ns, host, 1, cores, opts));
    const logX = Math.log(money * rate) + moneyAvailable * rate;
    return Math.max(lambertWLog(logX) / rate - moneyAvailable, 0);
}

function growPercent(ns, host, threads = 1, cores = 1, opts = {}) {
    const { ServerGrowthRate = 1, hackDifficulty = ns.getServerSecurityLevel(host), } = opts;
    const growth = ns.getServerGrowth(host) / 100;
    const multiplier = ns.getPlayer().hacking_grow_mult;
    const base = Math.min(1 + 0.03 / hackDifficulty, 1.0035);
    const power = growth * ServerGrowthRate * multiplier * ((cores + 15) / 16);
    return base ** (power * threads);
}

/**
 * Lambert W-function for log(x) when k = 0
 * {@link https://gist.github.com/xmodar/baa392fc2bec447d10c2c20bbdcaf687}
 */
function lambertWLog(logX) {
    if (isNaN(logX)) return NaN;
    const logXE = logX + 1;
    const logY = 0.5 * log1Exp(logXE);
    const logZ = Math.log(log1Exp(logY));
    const logN = log1Exp(0.13938040121300527 + logY);
    const logD = log1Exp(-0.7875514895451805 + logZ);
    let w = -1 + 2.036 * (logN - logD);
    w *= (logXE - Math.log(w)) / (1 + w);
    w *= (logXE - Math.log(w)) / (1 + w);
    w *= (logXE - Math.log(w)) / (1 + w);
    return isNaN(w) ? (logXE < 0 ? 0 : Infinity) : w;
}
const log1Exp = (x) => x <= 0 ? Math.log(1 + Math.exp(x)) : x + log1Exp(-x);