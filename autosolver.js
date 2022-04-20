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
        case "HammingCodes: Integer to encoded Binary":
            solution = hammingEncode(data);
            break;
        case "Array Jumping Game II":
            solution = arrayJumpingGame2(data);
            break;
        case "Shortest Path in a Grid":
            // solution = shortestGridPath(data);
            // break;
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

// hamming.js: Hamming code in javascript
/**
 * hammingEncode - encode binary string input with hamming algorithm
 * @param {String} input - binary string, '10101'
 * @returns {String} - encoded binary string
 */
function hammingEncode(input) {
    let output = input;
    const controlBitsIndexes = [];
    const l = input.length;
    let i = 1;
    let key, j, arr, temp, check;

    while (l / i >= 1) {
        controlBitsIndexes.push(i);
        i *= 2;
    }

    for (j = 0; j < controlBitsIndexes.length; j++) {
        key = controlBitsIndexes[j];
        arr = output.slice(key - 1).split('');
        temp = chunk(arr, key);
        check = (temp.reduce(function (prev, next, index) {
            if (!(index % 2)) {
                prev = prev.concat(next);
            }
            return prev;
        }, []).reduce(function (prev, next) { return +prev + +next }, 0) % 2) ? 1 : 0;
        output = output.slice(0, key - 1) + check + output.slice(key - 1);
        if (j + 1 === controlBitsIndexes.length && output.length / (key * 2) >= 1) {
            controlBitsIndexes.push(key * 2);
        }
    }

    return output;
}

/**
 * hammingPureDecode - just removes from input parity check bits
 * @param {String} input - binary string, '10101'
 * @returns {String} - decoded binary string
 */
function hammingPureDecode(input) {
    const controlBitsIndexes = [];
    const l = input.length;
    let originCode = input;
    let i = 1;
    while (l / i >= 1) {
        controlBitsIndexes.push(i);
        i *= 2;
    }

    controlBitsIndexes.forEach(function (key, index) {
        originCode = originCode.substring(0, key - 1 - index) + originCode.substring(key - index);
    });

    return originCode;
}

/**
 * hammingDecode - decodes encoded binary string, also try to correct errors
 * @param {String} input - binary string, '10101'
 * @returns {String} - decoded binary string
 */
function hammingDecode(input) {
    const controlBitsIndexes = [];
    let sum = 0;
    const l = input.length;
    let i = 1;
    let output = hammingPureDecode(input);
    const inputFixed = hammingEncode(output);


    while (l / i >= 1) {
        controlBitsIndexes.push(i);
        i *= 2;
    }

    controlBitsIndexes.forEach(function (i) {
        if (input[i] !== inputFixed[i]) {
            sum += i;
        }
    });

    if (sum) {
        output[sum - 1] === '1'
            ? output = replaceCharacterAt(output, sum - 1, '0')
            : output = replaceCharacterAt(output, sum - 1, '1');
    }
    return output;
}

function replaceCharacterAt(str, index, character) {
    return str.substr(0, index) + character + str.substr(index+character.length);
}

/**
 * chunk - split array into chunks
 * @param {Array} arr - array
 * @param {Number} size - chunk size
 * @returns {Array} - chunked array
 */
function chunk(arr, size) {
    const chunks = [];
    let i = 0;
    let n = arr.length;
    while (i < n) {
        chunks.push(arr.slice(i, i += size));
    }
    return chunks;
}

const arrayJumpingGame2 = (data) => {
    const intervals = data.slice();
    intervals.sort((a,b) => {
        return a[0] - b[0];
    });

    const result = [];
    let start = intervals[0][0];
    let end = intervals[0][1];
    for (const interval of intervals) {
        if (interval[0] <= end) {
            end = Math.max(end, interval[1]);
        } else {
            result.push([start, end]);
            start = interval[0];
            end = interval[1];
        }
    }
    result.push([start, end]);

   return convert2DArrayToString(result);
}
function convert2DArrayToString(arr) {
    const components = [];
    arr.forEach((e) => {
        let s = e.toString();
        s = ["[", s, "]"].join("");
        components.push(s);
    });

    return components.join(",").replace(/\s/g, "");
}

// TODO modify to write list of UDLR instructions
const shortestGridPath = (data) => {
    const width = data[0].length;
    const height = data.length;
    const dstY = height - 1;
    const dstX = width - 1;

    const distance = new Array(height);
    const queue = new MinHeap();

    for (let y = 0; y < height; y++) {
        distance[y] = new Array(width).fill(Infinity);
        //prev[y] = new Array(width).fill(undefined) as [undefined];
    }

    function validPosition(y, x) {
        return y >= 0 && y < height && x >= 0 && x < width && data[y][x] === 0;
    }

    // List in-bounds and passable neighbors
    function* neighbors(y, x) {
        if (validPosition(y - 1, x)) yield [y - 1, x]; // Up
        if (validPosition(y + 1, x)) yield [y + 1, x]; // Down
        if (validPosition(y, x - 1)) yield [y, x - 1]; // Left
        if (validPosition(y, x + 1)) yield [y, x + 1]; // Right
    }

    // Prepare starting point
    distance[0][0] = 0;
    queue.push([0, 0], 0);

    // Take next-nearest position and expand potential paths from there
    while (queue.size > 0) {
        const [y, x] = queue.pop();
        for (const [yN, xN] of neighbors(y, x)) {
            const d = distance[y][x] + 1;
            if (d < distance[yN][xN]) {
                if (distance[yN][xN] === Infinity)
                    // Not reached previously
                    queue.push([yN, xN], d);
                // Found a shorter path
                else queue.changeWeight(([yQ, xQ]) => yQ === yN && xQ === xN, d);
                //prev[yN][xN] = [y, x];
                distance[yN][xN] = d;
            }
        }
    }

    // No path at all?
    if (distance[dstY][dstX] === Infinity) return "";
    return distance;
}