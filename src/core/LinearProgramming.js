/**
 * Linear Programming Solver (2-Variable Graphical Method)
 * Developed by AlfandoXeon
 */

class LinearProgrammingModel {
    constructor(config = {}) {
        this.objectiveType = config.objectiveType || 'max'; // 'max' | 'min'
        this.c1 = config.c1 !== undefined ? config.c1 : 3;
        this.c2 = config.c2 !== undefined ? config.c2 : 5;
        this.constraints = config.constraints || [
            { a1: 2, a2: 1, type: '<=', b: 18, label: 'Constraint 1' },
            { a1: 2, a2: 3, type: '<=', b: 42, label: 'Constraint 2' },
            { a1: 3, a2: 1, type: '<=', b: 24, label: 'Constraint 3' }
        ];
        this.nonNegative = true; // X1 >= 0, X2 >= 0
    }

    /**
     * Solves the 2-variable LP problem
     */
    solve() {
        const EPSILON = 1e-6;
        const lines = [];

        // 1. Prepare all boundary lines
        this.constraints.forEach((c, idx) => {
            lines.push({
                a1: c.a1,
                a2: c.a2,
                b: c.b,
                type: c.type,
                label: c.label || `Constraint ${idx + 1}`
            });
        });

        // Add non-negativity boundary lines: X1 = 0 (a1=1, a2=0, b=0) and X2 = 0 (a1=0, a2=1, b=0)
        if (this.nonNegative) {
            lines.push({ a1: 1, a2: 0, b: 0, type: '>=', label: 'X1 >= 0' });
            lines.push({ a1: 0, a2: 1, b: 0, type: '>=', label: 'X2 >= 0' });
        }

        // 2. Find all pairwise intersections between boundary lines
        const candidatePoints = [];

        for (let i = 0; i < lines.length; i++) {
            for (let j = i + 1; j < lines.length; j++) {
                const pt = this.intersectLines(lines[i], lines[j]);
                if (pt) {
                    candidatePoints.push({
                        x: pt.x,
                        y: pt.y,
                        fromLines: [lines[i].label, lines[j].label]
                    });
                }
            }
        }

        // 3. Filter points that satisfy all constraints (Feasible Corner Points)
        const feasibleVertices = [];
        candidatePoints.forEach(pt => {
            if (this.isFeasible(pt.x, pt.y, lines, EPSILON)) {
                // Check if not already added (deduplicate)
                const exists = feasibleVertices.some(v => 
                    Math.abs(v.x - pt.x) < 1e-4 && Math.abs(v.y - pt.y) < 1e-4
                );
                if (!exists) {
                    const z = this.c1 * pt.x + this.c2 * pt.y;
                    feasibleVertices.push({
                        x: Number(pt.x.toFixed(4)),
                        y: Number(pt.y.toFixed(4)),
                        z: Number(z.toFixed(4)),
                        fromLines: pt.fromLines
                    });
                }
            }
        });

        // 4. Sort feasible vertices counter-clockwise to form a closed polygon
        const orderedPolygon = this.orderVerticesCounterClockwise(feasibleVertices);

        // 5. Evaluate Objective Function Z at each feasible vertex
        let optimalPoint = null;
        let optimalZ = this.objectiveType === 'max' ? -Infinity : Infinity;

        feasibleVertices.forEach(v => {
            if (this.objectiveType === 'max') {
                if (v.z > optimalZ) {
                    optimalZ = v.z;
                    optimalPoint = v;
                }
            } else {
                if (v.z < optimalZ) {
                    optimalZ = v.z;
                    optimalPoint = v;
                }
            }
        });

        // 6. Generate step-by-step breakdown
        const steps = this.generateBreakdown(lines, candidatePoints, feasibleVertices, optimalPoint, optimalZ);

        return {
            success: feasibleVertices.length > 0,
            objectiveType: this.objectiveType,
            c1: this.c1,
            c2: this.c2,
            constraints: this.constraints,
            lines: lines,
            feasibleVertices: feasibleVertices,
            feasiblePolygon: orderedPolygon,
            optimalPoint: optimalPoint,
            optimalZ: optimalZ,
            breakdown: steps
        };
    }

    /**
     * Finds intersection point of two 2D lines: a1*x + a2*y = b
     */
    intersectLines(l1, l2) {
        const det = l1.a1 * l2.a2 - l1.a2 * l2.a1;
        if (Math.abs(det) < 1e-9) {
            return null; // Lines are parallel
        }
        const x = (l1.b * l2.a2 - l1.a2 * l2.b) / det;
        const y = (l1.a1 * l2.b - l1.b * l2.a1) / det;
        return { x, y };
    }

    /**
     * Checks if a point (x, y) satisfies all constraints
     */
    isFeasible(x, y, lines, eps = 1e-6) {
        if (x < -eps || y < -eps) return false;

        for (let i = 0; i < this.constraints.length; i++) {
            const c = this.constraints[i];
            const val = c.a1 * x + c.a2 * y;
            if (c.type === '<=' && val > c.b + eps) return false;
            if (c.type === '>=' && val < c.b - eps) return false;
            if (c.type === '=' && Math.abs(val - c.b) > eps) return false;
        }
        return true;
    }

    /**
     * Orders 2D points counter-clockwise around their centroid
     */
    orderVerticesCounterClockwise(points) {
        if (points.length <= 2) return [...points];

        const cx = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        const cy = points.reduce((sum, p) => sum + p.y, 0) / points.length;

        return [...points].sort((a, b) => {
            const angleA = Math.atan2(a.y - cy, a.x - cx);
            const angleB = Math.atan2(b.y - cy, b.x - cx);
            return angleA - angleB;
        });
    }

    /**
     * Generates comprehensive calculation steps
     */
    generateBreakdown(lines, candidatePoints, feasibleVertices, optimalPoint, optimalZ) {
        const steps = [];

        // Step 1: Model Formulation
        const objSymbol = this.objectiveType.toUpperCase();
        steps.push({
            title: '1. Problem Formulation',
            content: `Objective: ${objSymbol} Z = ${this.c1}X₁ + ${this.c2}X₂\n` +
                     `Subject to:\n` +
                     this.constraints.map((c, i) => `   (${i + 1}) ${c.a1}X₁ + ${c.a2}X₂ ${c.type} ${c.b}`).join('\n') +
                     `\n   Non-negativity: X₁ ≥ 0, X₂ ≥ 0`
        });

        // Step 2: Line Intercepts on Axes
        const interceptLines = this.constraints.map((c, i) => {
            const xIntercept = c.a1 !== 0 ? (c.b / c.a1).toFixed(2) : 'Undefined (Parallel to X₁)';
            const yIntercept = c.a2 !== 0 ? (c.b / c.a2).toFixed(2) : 'Undefined (Parallel to X₂)';
            return `• Line ${i + 1} [${c.a1}X₁ + ${c.a2}X₂ = ${c.b}]:\n` +
                   `   When X₂ = 0 → X₁ = ${xIntercept}\n` +
                   `   When X₁ = 0 → X₂ = ${yIntercept}`;
        });
        steps.push({
            title: '2. Boundary Line Intercepts',
            content: interceptLines.join('\n\n')
        });

        // Step 3: Feasible Corner Points Table
        if (feasibleVertices.length > 0) {
            const tableRows = feasibleVertices.map((v, i) => {
                const optIndicator = (optimalPoint && v.x === optimalPoint.x && v.y === optimalPoint.y) 
                    ? ' ★ (OPTIMAL)' 
                    : '';
                return `Vertex ${String.fromCharCode(65 + i)}: (${v.x}, ${v.y}) → Z = ${this.c1}(${v.x}) + ${this.c2}(${v.y}) = ${v.z}${optIndicator}`;
            });
            steps.push({
                title: '3. Feasible Corner Point Evaluation',
                content: tableRows.join('\n')
            });
        }

        // Step 4: Conclusion
        if (optimalPoint) {
            steps.push({
                title: '4. Optimal Solution',
                content: `The ${this.objectiveType === 'max' ? 'maximum' : 'minimum'} objective value is Z* = ${optimalZ}\n` +
                         `Achieved at decision point (X₁*, X₂*) = (${optimalPoint.x}, ${optimalPoint.y})`
            });
        } else {
            steps.push({
                title: '4. Conclusion',
                content: 'No feasible region exists under the specified constraints.'
            });
        }

        return steps;
    }
}

// Export for module or global window
if (typeof window !== 'undefined') {
    window.LinearProgrammingModel = LinearProgrammingModel;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LinearProgrammingModel;
}
