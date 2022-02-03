import { list_servers } from "opened_servers.js";

/** @param {NS} ns **/
export function main(ns) {
    const contracts = list_servers(ns).map((server) => {
        const onServer = ns.ls(server, ".cct").map((contract) => {
            const type = ns.codingcontract.getContractType(contract, server);
            const data = ns.codingcontract.getData(contract, server);
            const didSolve = solve(type, data, server, contract, ns);
            return `${server} - ${contract} - ${type} - ${didSolve || "FAILED!"}`;
        });
        return onServer;
    }).filter(o => o.length);
    ns.tprint(`Found ${contracts.length} contracts`);
    contracts.forEach((contract) => ns.tprint(contract));
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
        default:
            solution = "";
            ns.tprint(type + ' No solution implemented');
            break;
    }
    return (solution != "") ? ns.codingcontract.attempt(solution, contract, server, { returnReward: true }) : "";
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
        for (var i = start; i < end; i++) {
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