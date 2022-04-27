import { list_servers } from "opened_servers.js";
import { boxTailSingleton } from 'utils.js';
import { MinHeap} from "util/heap.js";

/** @param {NS} ns **/
export function main(ns) {
    boxTailSingleton(ns, 'autosolver', '🔎', '200px');
    const contracts = list_servers(ns).map((server) => {
        const onServer = ns.ls(server, ".cct").map((contract) => {
            const type = ns.codingcontract.getContractType(contract, server);
            const data = ns.codingcontract.getData(contract, server);
            const didSolve = solve(type, data, server, contract, ns);
            return `${server} - ${contract} - ${type} - ${didSolve || "FAILED!"}`;
        });
        return onServer;
    }).filter(o => o.length);
    ns.print(`Found ${contracts.length} contracts`);
    contracts.forEach((contract) => ns.print(contract));
}

function solve(type, data, server, contract, ns) {
    let solution;
    switch (type) {
        case "Algorithmic Stock Trader I":
            solution = maxProfit([1, data]);
            break;
        case "Algorithmic Stock Trader II":
            solution = maxProfit([Math.ceil(data.length / 2), data]);
            break;
        case "Algorithmic Stock Trader III":
            solution = maxProfit([2, data]);
            break;
        case "Algorithmic Stock Trader IV":
            solution = maxProfit(data);
            break;
        case "Minimum Path Sum in a Triangle":
            solution = solveTriangleSum(data, ns);
            break;
        case "Unique Paths in a Grid I":
            solution = uniquePathsI(data);
            break;
        case "Unique Paths in a Grid II":
            solution = uniquePathsII(data);
            break;
        case "Generate IP Addresses":
            solution = generateIps(data);
            break;
        case "Find Largest Prime Factor":
            solution = factor(data);
            break;
        case "Spiralize Matrix":
            solution = spiral(data);
            break;
        case "Merge Overlapping Intervals":
            solution = mergeOverlap(data);
            break;
        case "Subarray with Maximum Sum":
            solution = subArrayMaxSum(data);
            break;
        case "Array Jumping Game":
            solution = arrayJump(data);
            break;
        case "Find All Valid Math Expressions":
            solution = allExpressions(data);
            break;
        case "Sanitize Parentheses in Expression":
            solution = sanitizeParentheses(data);
            break;
        case "Total Ways to Sum":
            solution = totalWayToSum(data);
            break;
        case "Total Ways to Sum II":
            solution = solveWaysToSumII(data);
            break;
        case "HammingCodes: Encoded Binary to Integer":
            solution = hammingDecode(data);
            break;
        case "HammingCodes: Integer to encoded Binary":
            solution = hammingEncode(data);
            break;
        case "Array Jumping Game II":
            solution = arrayJumpingGameII(data);
            break;
        case "Shortest Path in a Grid":
            solution = shortestPathInAGrid(data);
            break;
        default:
            solution = null;
            ns.print(type + ' No solution implemented');
            break;
    }
    return (solution !== null) ? ns.codingcontract.attempt(solution, contract, server, { returnReward: true }) : null;
}

//ALGORITHMIC STOCK TRADER

function maxProfit(arrayData) {
    let i, j, k;

    let maxTrades = arrayData[0];
    let stockPrices = arrayData[1];

    // WHY?
    let tempStr = "[0";
    for (i = 0; i < stockPrices.length; i++) {
        tempStr += ",0";
    }
    tempStr += "]";
    let tempArr = "[" + tempStr;
    for (i = 0; i < maxTrades - 1; i++) {
        tempArr += "," + tempStr;
    }
    tempArr += "]";

    let highestProfit = JSON.parse(tempArr);

    for (i = 0; i < maxTrades; i++) {
        for (j = 0; j < stockPrices.length; j++) { // Buy / Start
            for (k = j; k < stockPrices.length; k++) { // Sell / End
                if (i > 0 && j > 0 && k > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
                } else if (i > 0 && j > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i - 1][j - 1] + stockPrices[k] - stockPrices[j]);
                } else if (i > 0 && k > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i - 1][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
                } else if (j > 0 && k > 0) {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], highestProfit[i][k - 1], stockPrices[k] - stockPrices[j]);
                } else {
                    highestProfit[i][k] = Math.max(highestProfit[i][k], stockPrices[k] - stockPrices[j]);
                }
            }
        }
    }
    return highestProfit[maxTrades - 1][stockPrices.length - 1];
}

//SMALLEST TRIANGLE SUM

function solveTriangleSum(arrayData, ns) {
    let triangle = arrayData;
    let nextArray;
    let previousArray = triangle[0];

    for (let i = 1; i < triangle.length; i++) {
        nextArray = [];
        for (let j = 0; j < triangle[i].length; j++) {
            if (j == 0) {
                nextArray.push(previousArray[j] + triangle[i][j]);
            } else if (j == triangle[i].length - 1) {
                nextArray.push(previousArray[j - 1] + triangle[i][j]);
            } else {
                nextArray.push(Math.min(previousArray[j], previousArray[j - 1]) + triangle[i][j]);
            }

        }

        previousArray = nextArray;
    }

    return Math.min.apply(null, nextArray);
}

//UNIQUE PATHS IN A GRID

function uniquePathsI(grid) {
    const rightMoves = grid[0] - 1;
    const downMoves = grid[1] - 1;

    return Math.round(factorialDivision(rightMoves + downMoves, rightMoves) / (factorial(downMoves)));
}

function factorial(n) {
    return factorialDivision(n, 1);
}

function factorialDivision(n, d) {
    if (n == 0 || n == 1 || n == d)
        return 1;
    return factorialDivision(n - 1, d) * n;
}

function uniquePathsII(grid, ignoreFirst = false, ignoreLast = false) {
    const rightMoves = grid[0].length - 1;
    const downMoves = grid.length - 1;

    let totalPossiblePaths = Math.round(factorialDivision(rightMoves + downMoves, rightMoves) / (factorial(downMoves)));

    for (let i = 0; i < grid.length; i++) {
        for (let j = 0; j < grid[i].length; j++) {

            if (grid[i][j] == 1 && (!ignoreFirst || (i != 0 || j != 0)) && (!ignoreLast || (i != grid.length - 1 || j != grid[i].length - 1))) {
                const newArray = [];
                for (let k = i; k < grid.length; k++) {
                    newArray.push(grid[k].slice(j, grid[i].length));
                }

                let removedPaths = uniquePathsII(newArray, true, ignoreLast);
                removedPaths *= uniquePathsI([i + 1, j + 1]);

                totalPossiblePaths -= removedPaths;
            }
        }

    }

    return totalPossiblePaths;
}

//GENERATE IP ADDRESSES

function generateIps(num) {
    num = num.toString();

    const length = num.length;

    const ips = [];

    for (let i = 1; i < length - 2; i++) {
        for (let j = i + 1; j < length - 1; j++) {
            for (let k = j + 1; k < length; k++) {
                const ip = [
                    num.slice(0, i),
                    num.slice(i, j),
                    num.slice(j, k),
                    num.slice(k, num.length)
                ];
                let isValid = true;

                ip.forEach(seg => {
                    isValid = isValid && isValidIpSegment(seg);
                });

                if (isValid) ips.push(ip.join("."));

            }

        }
    }

    return ips;

}

function isValidIpSegment(segment) {
    if (segment[0] == "0" && segment != "0") return false;
    segment = Number(segment);
    if (segment < 0 || segment > 255) return false;
    return true;
}

//GREATEST FACTOR

function factor(num) {
    for (let div = 2; div <= Math.sqrt(num); div++) {
        if (num % div != 0) {
            continue;
        }
        num = num / div;
        div = 1;
    }
    return num;
}

//SPIRALIZE Matrix

function spiral(arr, accum = []) {
    if (arr.length === 0 || arr[0].length === 0) {
        return accum;
    }
    accum = accum.concat(arr.shift());
    if (arr.length === 0 || arr[0].length === 0) {
        return accum;
    }
    accum = accum.concat(column(arr, arr[0].length - 1));
    if (arr.length === 0 || arr[0].length === 0) {
        return accum;
    }
    accum = accum.concat(arr.pop().reverse());
    if (arr.length === 0 || arr[0].length === 0) {
        return accum;
    }
    accum = accum.concat(column(arr, 0).reverse());
    if (arr.length === 0 || arr[0].length === 0) {
        return accum;
    }
    return spiral(arr, accum);
}

function column(arr, index) {
    const res = [];
    for (let i = 0; i < arr.length; i++) {
        const elm = arr[i].splice(index, 1)[0];
        if (elm) {
            res.push(elm);
        }
    }
    return res;
}

// Merge Overlapping Intervals

function mergeOverlap(intervals) {
    intervals.sort(([minA], [minB]) => minA - minB);
    for (let i = 0; i < intervals.length; i++) {
        for (let j = i + 1; j < intervals.length; j++) {
            const [min, max] = intervals[i];
            const [laterMin, laterMax] = intervals[j];
            if (laterMin <= max) {
                const newMax = laterMax > max ? laterMax : max;
                const newInterval = [min, newMax];
                intervals[i] = newInterval;
                intervals.splice(j, 1);
                j = i;
            }
        }
    }
    return intervals;
}

// Subarray with Maximum Sum

function subArrays(arr, start, end, acc) {
    // Stop if we have reached the end of the array    
    if (end === arr.length)
        return acc;
    // Increment the end point and start from 0
    else if (start > end)
        subArrays(arr, 0, end + 1, acc);
    // create the subarray
    else {
        let subArr = [];
        for (let i = start; i < end; i++) {
            subArr.push(arr[i]);
        }
        subArr.push(arr[end]);
        acc.push(subArr);

        subArrays(arr, start + 1, end, acc);
    }
    return acc;
}

function subArrayMaxSum(arr) {
    arr = arr || [-6, 4, 1, 8, 10, -6];
    const arrays = subArrays(arr, 0, 0, []);
    const sums = arrays.map(o => o.reduce((a, b) => a + b, 0));
    return Math.max(...sums);
}

function arrayJump(arr) {
    let n = arr.length;
    let jumps = Array.from({ length: n }, (_, i) => 0);
    let min;
    jumps[n - 1] = 0;
    for (let i = n - 2; i >= 0; i--) {
        if (arr[i] == 0)
            jumps[i] = Number.MAX_VALUE;
        else if (arr[i] >= n - i - 1)
            jumps[i] = 1;
        else {
            min = Number.MAX_VALUE;
            for (let j = i + 1; j < n && j <= arr[i] + i; j++) {
                if (min > jumps[j])
                    min = jumps[j];
            }
            if (min != Number.MAX_VALUE)
                jumps[i] = min + 1;
            else
                jumps[i] = min;
        }
    }
    return jumps[0] < Number.MAX_VALUE ? 1 : 0;
}

// works for simple answers locks up a browser for large ones
function allExpressions(data) {
    const digits = data[0].split('')
    const operators = ['+', '-', '*', '']
    let expressions = [digits[0], '-' + digits[0]]
        .flatMap(d => operators.map(op => d + op))
    for (let i = 1; i < digits.length - 1; i++) {
        expressions = expressions
            .flatMap(e => operators.map(op => e + digits[i] + op))
    }
    return expressions.map(e => e + digits[digits.length - 1])
        .filter(e => {
            try { return eval(e) === data[1] }
            catch (e) { return false }
        })
}

// Sanitize Parentheses in Expression

function sanitizeParentheses(data) {
    const solution = Sanitize(data);
    if (solution == null) { return ('[""]') }
    else { return ("[" + solution.join(",") + "]") }
}

function Sanitize_removeOneParth(item) {
    const possibleAnswers = [];
    for (let i = 0; i < item.length; i++) {
        if (item[i].toLowerCase().indexOf("(") === -1 && item[i].toLowerCase().indexOf(")") === -1) {
            continue
        }
        let possible = item.substring(0, i) + item.substring(i + 1);
        possibleAnswers.push(possible)
    }
    return possibleAnswers
}

function Sanitize_isValid(item) {
    let unclosed = 0;
    for (let i = 0; i < item.length; i++) {
        if (item[i] == "(") { unclosed++ }
        else if (item[i] == ")") { unclosed-- }
        if (unclosed < 0) { return false }
    }
    return unclosed == 0
}

function Sanitize(data) {
    let currentPossible = [data];
    for (let i = 0; i < currentPossible.length; i++) {
        let newPossible = new Set();
        for (var j = 0; j < currentPossible.length; j++) {
            let newRemovedPossible = Sanitize_removeOneParth(currentPossible[j])

            for (let item of newRemovedPossible) {
                newPossible.add(item)
            }
        }

        const validBoolList = [];

        for (let item of newPossible) {
            validBoolList.push(Sanitize_isValid(item))
        }
        if (validBoolList.includes(true)) {
            let finalList = [];
            newPossible = [...newPossible]

            for (var j = 0; j < validBoolList.length; j++) {
                if (validBoolList[j]) {
                    finalList.push(newPossible[j])
                }
            }

            finalList = new Set(finalList)

            return [...finalList]
        }
        currentPossible = [...newPossible]
    }

    return null
}

function totalWayToSum(data) {
    let cache = {};
    let n = data;
    return twts(n, n, cache) - 1;
}

function twts(limit, n, cache) {
    if (n < 1) { return 1; }
    if (limit == 1) { return 1; }
    if (n < limit) { return twts(n, n, cache); }

    if (n in cache) {
        let c = cache[n];
        if (limit in c) { return c[limit]; }
    }

    let s = 0;
    for (let i = 1; i <= limit; i++) {
        s += twts(i, n - i, cache);
    }

    if (!(n in cache)) { cache[n] = {}; }
    cache[n][limit] = s; return s;
}

/**
 *
 * @param {number[][]} input [targetNumber,[available numbers]]
 * @returns
 */
async function solveWaysToSumII(input) {
    /**
     *
     * @param {number} target
     * @param {number[]} nums
     * @returns
     */
    let n = input[0];
    let nums = input[1];
    let table = new Array(n + 1);
    for (let i = 0; i < n + 1; i++) {
        table[i] = 0;
    }
    table[0] = 1;

    for (let i of nums) {
        if (i >= n) {
            continue;
        }
        for (let j = i; j <= n; j++) {
            table[j] += table[j - i];
        }
        // console.log(table);
    }
    return table[n];
}

function hammingEncode(data) {
    let N = Math.floor(Math.log2(data));
    let vec = Array.from({ length: N + 1 }, (_, i) => Math.floor(data / 2 ** (N - i)) % 2);

    let masks = [
        /*012345678901234567890123456789012345678901234567890123456*/
        "111111111111111111111111111111111111111111111111111111111",
        "110110101011010101010101011010101010101010101010101010101",
        "101101100110110011001100110110011001100110011001100110011",
        "011100011110001111000011110001111000011110000111100001111",
        "000011111110000000111111110000000111111110000000011111111",
        "000000000001111111111111110000000000000001111111111111111",
        "000000000000000000000000001111111111111111111111111111111"
    ].map(x => x.split("").map(y => Number(y)));

    function hadamard(x, y) {
        return Array.from({ length: Math.min(x.length, y.length) }, (_, i) => x[i] * y[i]);
    }
    let parities = masks.map(mask => hadamard(mask, vec).reduce((a, n) => a + n) % 2);

    for (let i = 1; i < parities.length; ++i) { parities[0] += parities[i]; }
    parities[0] %= 2;

    /*01234567890123456789012345678901234567890123456789012345678901234*/
    let p_bit = "11101000100000001000000000000000100000000000000000000000000000001";

    let output = [];
    for (let i = 0, p = 0, d = 0; d < vec.length; ++i) {
        if (p_bit[i] === "1") {
            output.push(parities[p++]);
        } else {
            output.push(vec[d++]);
        }
    }

    return output.join("");
}


function arrayJumpingGameII(arrayData) {
    let n = arrayData.length;
    let reach = 0;
    let jumps = 0;
    let lastJump = -1;
    while (reach < n - 1) {
        let jumpedFrom = -1;
        for (let i = reach; i > lastJump; i--) {
            if (i + arrayData[i] > reach) {
                reach = i + arrayData[i];
                jumpedFrom = i;
            }
        }
        if (jumpedFrom === -1) {
            jumps = 0;
            break;
        }
        lastJump = jumpedFrom;
        jumps++;
    }
    return jumps
}


function shortestPathInAGrid(data) {
    let H = data.length, W = data[0].length;
    let dist = Array.from(Array(H), () => Array(W).fill(Number.POSITIVE_INFINITY));
    dist[0][0] = 0;

    let queue = [[0, 0]];
    while (queue.length > 0) {
        let [i, j] = queue.shift();
        let d = dist[i][j];

        if (i > 0     && d + 1 < dist[i - 1][j] && data[i - 1][j] !== 1)
        { dist[i - 1][j] = d + 1; queue.push([i - 1, j]); }
        if (i < H - 1 && d + 1 < dist[i + 1][j] && data[i + 1][j] !== 1)
        { dist[i + 1][j] = d + 1; queue.push([i + 1, j]); }
        if (j > 0     && d + 1 < dist[i][j - 1] && data[i][j - 1] !== 1)
        { dist[i][j - 1] = d + 1; queue.push([i, j - 1]); }
        if (j < W - 1 && d + 1 < dist[i][j + 1] && data[i][j + 1] !== 1)
        { dist[i][j + 1] = d + 1; queue.push([i, j + 1]); }
    }

    let path = "";
    if (Number.isFinite(dist[H - 1][W - 1])) {
        let i = H - 1, j = W - 1;
        while (i !== 0 || j !== 0) {
            let d = dist[i][j];

            let new_i = 0, new_j = 0, dir = "";
            if (i > 0     && dist[i - 1][j] < d)
            { d = dist[i - 1][j]; new_i = i - 1; new_j = j; dir = "D"; }
            if (i < H - 1 && dist[i + 1][j] < d)
            { d = dist[i + 1][j]; new_i = i + 1; new_j = j; dir = "U"; }
            if (j > 0     && dist[i][j - 1] < d)
            { d = dist[i][j - 1]; new_i = i; new_j = j - 1; dir = "R"; }
            if (j < W - 1 && dist[i][j + 1] < d)
            { d = dist[i][j + 1]; new_i = i; new_j = j + 1; dir = "L"; }

            i = new_i; j = new_j;
            path = dir + path;
        }
    }

    return path;
}

function hammingDecode(_data) {
    let _build = _data.split(""); // ye, an array again
    let _testArray = []; //for the "tests". if any is false, it is been altered data, will check and fix it later
    let _sum_parity = Math.ceil(Math.log2(_data.length)); // excluding first bit
    let count = (arr, val) => arr.reduce((a, v) => (v === val ? a + 1 : a), 0); // count.... again ;)
    let _overallParity = _build.splice(0, 1).join(""); // remove first index, for checking and to use the _build properly later
    _testArray.push((_overallParity === (count(_build, "1") % 2).toString())); // checking the "overall" parity
    for (var i = 0; i < _sum_parity; i++) {
        let _tempIndex = Math.pow(2, i) - 1 // get the parityBits Index
        let _tempStep = _tempIndex + 1 // set the stepsize
        let _tempData = [..._build] // "copy" the build-data
        let _tempArray = [] // init empty array for "testing"
        while (_tempData[_tempIndex] !== undefined) { // extract from the copied data until the "starting" index is undefined
            var _temp = [..._tempData.splice(_tempIndex, _tempStep * 2)] // extract 2*stepsize
            _tempArray.push(..._temp.splice(0, _tempStep)) // and cut again for keeping first half
        }
        let _tempParity = _tempArray.shift() // and cut the first index for checking with the rest of the data
        _testArray.push(((_tempParity === (count(_tempArray, "1") % 2).toString()))) // is the _tempParity the calculated data?
    }
    let _fixIndex = 0; // init the "fixing" index amd start with -1, bc we already removed the first bit
    for (let i = 1; i < _sum_parity + 1; i++) {
        _fixIndex += (_testArray[i]) ? 0 : (Math.pow(2, i) / 2)
    }
    _build.unshift(_overallParity)
    // fix the actual hammingcode if there is an error
    if (_fixIndex > 0 && _testArray[0] === false) { // if the overall is false and the sum of calculated values is greater equal 0, fix the corresponding hamming-bit
        _build[_fixIndex] = (_build[_fixIndex] === "0") ? "1" : "0"
    }
    else if (_testArray[0] === false) { // otherwise, if the the overall_parity is only wrong, fix that one
        _overallParity = (_overallParity === "0") ? "1" : "0"
    }
    else if (_testArray[0] === true && _testArray.some((truth) => truth === false)) {
        return 0 // uhm, there's some strange going on... 2 bits are altered? How?
    }
    // oof.. halfway through... we fixed the altered bit, now "extract" the parity from the build and parse the binary data
    for (let i = _sum_parity; i >= 0; i--) { // start from the last parity down the starting one
        _build.splice(Math.pow(2, i), 1)
    }
    _build.splice(0, 1)
    return parseInt(_build.join(""), 2)
}