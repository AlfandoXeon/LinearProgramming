/**
 * Transportation Problem Solver (Operations Research)
 * Supports: Vogel's Approximation Method (VAM), Least Cost Method (LCM), North-West Corner Rule (NWCR)
 * Developed by AlfandoXeon
 */

class TransportationModel {
    constructor(config = {}) {
        // Supply array, Demand array, and Cost 2D matrix
        this.supply = config.supply || [30, 40, 50];
        this.demand = config.demand || [35, 28, 32, 25];
        this.costMatrix = config.costMatrix || [
            [3, 1, 7, 4],
            [2, 6, 5, 9],
            [8, 3, 3, 2]
        ];
        this.method = config.method || 'vam'; // 'vam' | 'least-cost' | 'north-west'
        this.sourceLabels = config.sourceLabels || null;
        this.destLabels = config.destLabels || null;
    }

    /**
     * Solves the transportation problem and returns allocations, total cost, and steps
     */
    solve() {
        const initialSupply = [...this.supply];
        const initialDemand = [...this.demand];
        let m = initialSupply.length;
        let n = initialDemand.length;

        const totalSupply = initialSupply.reduce((a, b) => a + b, 0);
        const totalDemand = initialDemand.reduce((a, b) => a + b, 0);

        let isBalanced = totalSupply === totalDemand;
        let balancedSupply = [...initialSupply];
        let balancedDemand = [...initialDemand];
        let balancedCost = this.costMatrix.map(row => [...row]);

        let dummyAdded = null;

        // Auto-balance if unbalanced
        if (totalSupply > totalDemand) {
            const diff = totalSupply - totalDemand;
            balancedDemand.push(diff);
            n += 1;
            balancedCost.forEach(row => row.push(0));
            dummyAdded = { type: 'destination', amount: diff, index: n - 1 };
        } else if (totalDemand > totalSupply) {
            const diff = totalDemand - totalSupply;
            balancedSupply.push(diff);
            m += 1;
            balancedCost.push(new Array(n).fill(0));
            dummyAdded = { type: 'source', amount: diff, index: m - 1 };
        }

        // Initialize allocation matrix
        const allocation = Array.from({ length: m }, () => new Array(n).fill(0));
        const allocationSteps = [];

        if (this.method === 'north-west') {
            this.solveNorthWest(balancedSupply, balancedDemand, balancedCost, allocation, allocationSteps);
        } else if (this.method === 'least-cost') {
            this.solveLeastCost(balancedSupply, balancedDemand, balancedCost, allocation, allocationSteps);
        } else {
            this.solveVogel(balancedSupply, balancedDemand, balancedCost, allocation, allocationSteps);
        }

        // Calculate Total Transportation Cost
        let totalCost = 0;
        const costComponents = [];

        for (let i = 0; i < m; i++) {
            for (let j = 0; j < n; j++) {
                if (allocation[i][j] > 0) {
                    const cellCost = allocation[i][j] * balancedCost[i][j];
                    totalCost += cellCost;
                    costComponents.push({
                        i, j,
                        qty: allocation[i][j],
                        unitCost: balancedCost[i][j],
                        subtotal: cellCost
                    });
                }
            }
        }

        // Generate calculation breakdown
        const steps = this.generateBreakdown(
            totalSupply, totalDemand, isBalanced, dummyAdded,
            balancedSupply, balancedDemand, balancedCost,
            allocation, allocationSteps, costComponents, totalCost
        );

        return {
            success: true,
            method: this.method,
            isBalanced: isBalanced,
            dummyAdded: dummyAdded,
            supply: balancedSupply,
            demand: balancedDemand,
            costMatrix: balancedCost,
            allocation: allocation,
            totalCost: totalCost,
            costComponents: costComponents,
            breakdown: steps
        };
    }

    /**
     * Vogel's Approximation Method (VAM)
     */
    solveVogel(supply, demand, cost, alloc, stepLog) {
        const sRem = [...supply];
        const dRem = [...demand];
        const rowActive = new Array(supply.length).fill(true);
        const colActive = new Array(demand.length).fill(true);

        let stepNum = 1;

        while (true) {
            const activeRows = rowActive.map((act, i) => act ? i : -1).filter(i => i !== -1);
            const activeCols = colActive.map((act, j) => act ? j : -1).filter(j => j !== -1);

            if (activeRows.length === 0 || activeCols.length === 0) break;

            // Single row or single col remaining: allocate directly
            if (activeRows.length === 1) {
                const r = activeRows[0];
                activeCols.forEach(c => {
                    const q = Math.min(sRem[r], dRem[c]);
                    if (q > 0) {
                        alloc[r][c] = q;
                        sRem[r] -= q;
                        dRem[c] -= q;
                        stepLog.push(`Allocate ${q} units to S${r+1}→D${c+1} (Rate: ${cost[r][c]})`);
                    }
                });
                break;
            }

            if (activeCols.length === 1) {
                const c = activeCols[0];
                activeRows.forEach(r => {
                    const q = Math.min(sRem[r], dRem[c]);
                    if (q > 0) {
                        alloc[r][c] = q;
                        sRem[r] -= q;
                        dRem[c] -= q;
                        stepLog.push(`Allocate ${q} units to S${r+1}→D${c+1} (Rate: ${cost[r][c]})`);
                    }
                });
                break;
            }

            // 1. Calculate Row Penalties
            const rowPenalties = {};
            activeRows.forEach(r => {
                const costs = activeCols.map(c => cost[r][c]).sort((a, b) => a - b);
                rowPenalties[r] = costs.length > 1 ? costs[1] - costs[0] : costs[0];
            });

            // 2. Calculate Col Penalties
            const colPenalties = {};
            activeCols.forEach(c => {
                const costs = activeRows.map(r => cost[r][c]).sort((a, b) => a - b);
                colPenalties[c] = costs.length > 1 ? costs[1] - costs[0] : costs[0];
            });

            // 3. Find Maximum Penalty
            let maxPenalty = -1;
            let targetType = 'row';
            let targetIdx = -1;

            activeRows.forEach(r => {
                if (rowPenalties[r] > maxPenalty) {
                    maxPenalty = rowPenalties[r];
                    targetType = 'row';
                    targetIdx = r;
                }
            });

            activeCols.forEach(c => {
                if (colPenalties[c] > maxPenalty) {
                    maxPenalty = colPenalties[c];
                    targetType = 'col';
                    targetIdx = c;
                }
            });

            // 4. In target row/col, find cell with minimum cost
            let chosenR = -1;
            let chosenC = -1;
            let minC = Infinity;

            if (targetType === 'row') {
                chosenR = targetIdx;
                activeCols.forEach(c => {
                    if (cost[chosenR][c] < minC) {
                        minC = cost[chosenR][c];
                        chosenC = c;
                    }
                });
            } else {
                chosenC = targetIdx;
                activeRows.forEach(r => {
                    if (cost[r][chosenC] < minC) {
                        minC = cost[r][chosenC];
                        chosenR = r;
                    }
                });
            }

            // 5. Allocate
            const qty = Math.min(sRem[chosenR], dRem[chosenC]);
            alloc[chosenR][chosenC] = qty;
            sRem[chosenR] -= qty;
            dRem[chosenC] -= qty;

            stepLog.push(
                `Step ${stepNum++}: Max penalty was ${maxPenalty} (${targetType} ${targetIdx + 1}). ` +
                `Allocated ${qty} units to S${chosenR + 1}→D${chosenC + 1} at rate ${cost[chosenR][chosenC]}.`
            );

            if (sRem[chosenR] === 0) rowActive[chosenR] = false;
            if (dRem[chosenC] === 0) colActive[chosenC] = false;
        }
    }

    /**
     * Least Cost Method (Matrix Minimum)
     */
    solveLeastCost(supply, demand, cost, alloc, stepLog) {
        const sRem = [...supply];
        const dRem = [...demand];
        let stepNum = 1;

        while (true) {
            let minCost = Infinity;
            let minR = -1;
            let minC = -1;

            for (let r = 0; r < supply.length; r++) {
                if (sRem[r] <= 0) continue;
                for (let c = 0; c < demand.length; c++) {
                    if (dRem[c] <= 0) continue;
                    if (cost[r][c] < minCost) {
                        minCost = cost[r][c];
                        minR = r;
                        minC = c;
                    }
                }
            }

            if (minR === -1 || minC === -1) break;

            const qty = Math.min(sRem[minR], dRem[minC]);
            alloc[minR][minC] = qty;
            sRem[minR] -= qty;
            dRem[minC] -= qty;

            stepLog.push(`Step ${stepNum++}: Lowest cost cell was S${minR + 1}→D${minC + 1} (Rate: ${cost[minR][minC]}). Allocated ${qty} units.`);
        }
    }

    /**
     * North-West Corner Rule
     */
    solveNorthWest(supply, demand, cost, alloc, stepLog) {
        const sRem = [...supply];
        const dRem = [...demand];
        let r = 0;
        let c = 0;
        let stepNum = 1;

        while (r < supply.length && c < demand.length) {
            const qty = Math.min(sRem[r], dRem[c]);
            alloc[r][c] = qty;
            sRem[r] -= qty;
            dRem[c] -= qty;

            stepLog.push(`Step ${stepNum++}: Allocated ${qty} units to S${r + 1}→D${c + 1} (Rate: ${cost[r][c]}).`);

            if (sRem[r] === 0 && dRem[c] === 0 && r + 1 < supply.length) {
                r++;
            } else if (sRem[r] === 0) {
                r++;
            } else {
                c++;
            }
        }
    }

    /**
     * Generates structured calculation breakdown
     */
    generateBreakdown(totS, totD, isBalanced, dummy, supply, demand, cost, alloc, stepLog, components, totalCost) {
        const steps = [];

        // 1. Balance Verification
        steps.push({
            title: '1. Balance Verification',
            content: `Total Supply = ${totS}, Total Demand = ${totD}.\n` +
                     (isBalanced 
                         ? 'The problem is balanced (Total Supply = Total Demand).'
                         : `The problem is unbalanced. A dummy ${dummy.type} with capacity ${dummy.amount} and zero shipping costs was added to balance the system.`)
        });

        // 2. Allocation Progression
        steps.push({
            title: `2. ${this.method.toUpperCase()} Allocation Steps`,
            content: stepLog.length > 0 ? stepLog.join('\n') : 'Allocated in direct order.'
        });

        // 3. Final Cost Calculation Formula
        const formulaParts = components.map(c => `(${c.qty} × ${c.unitCost})`);
        steps.push({
            title: '3. Total Transportation Cost Formula',
            content: `Total Cost Z = ∑ (Unit Cost × Allocated Qty)\n` +
                     `Z = ${formulaParts.join(' + ')}\n` +
                     `Z = ${components.map(c => c.subtotal).join(' + ')} = $${totalCost}`
        });

        return steps;
    }
}

// Export for module or global window
if (typeof window !== 'undefined') {
    window.TransportationModel = TransportationModel;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TransportationModel;
}
