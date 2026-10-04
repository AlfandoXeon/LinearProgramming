/**
 * Operations Research Suite Controller & Futuristic Motion Engine
 * Developed by AlfandoXeon
 */

// Application Global State
const appState = {
    currentSuite: 'linear-programming', // 'linear-programming' | 'transportation' | 'midpoint'
    midpointMode: 'two-numbers',
    lpGraph: null,
    lpSolution: null,
    tpSolution: null,
    midpointResult: null,
    history: []
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
    initContentProtection();
    initCustomCursor();
    initMagneticButtons();
    initDynamicCursorBackground();
    initEntranceAnimation();

    // 1. Initialize Linear Programming
    initLinearProgramming();

    // 2. Initialize Transportation
    initTransportation();

    // 3. Initialize Midpoint Tool
    initMidpointTool();

    // Setup Keyboard shortcut
    attachKeyboardEvents();
});

/* ==========================================================
   0. CONTENT PROTECTION (PREVENT TEXT SELECTION & COPYING)
   ========================================================== */
function initContentProtection() {
    document.addEventListener('contextmenu', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    document.addEventListener('selectstart', (e) => {
        if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA') {
            e.preventDefault();
        }
    });

    document.addEventListener('dragstart', (e) => {
        e.preventDefault();
    });

    document.addEventListener('copy', (e) => {
        const active = document.activeElement;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) {
            return;
        }
        e.preventDefault();
        showToast('Text copying is disabled on this page', 'error');
    });

    document.addEventListener('keydown', (e) => {
        const isModifier = e.ctrlKey || e.metaKey;
        const key = e.key ? e.key.toLowerCase() : '';
        const active = document.activeElement;
        const isInput = active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA');

        if (isModifier && (key === 'c' || key === 'a' || key === 'x')) {
            if (!isInput) {
                e.preventDefault();
                if (key === 'c') {
                    showToast('Text copying is disabled on this page', 'error');
                }
            }
        }
    });
}

/* ==========================================================
   1. CUSTOM FUTURISTIC MAGNETIC RETICLE CURSOR
   ========================================================== */
function initCustomCursor() {
    const dot = document.getElementById('cursorDot');
    const ring = document.getElementById('cursorRing');
    if (!dot || !ring || typeof gsap === 'undefined') return;

    if (window.matchMedia('(pointer: coarse)').matches) return;

    const quickDotX = gsap.quickTo(dot, 'x', { duration: 0.08, ease: 'none' });
    const quickDotY = gsap.quickTo(dot, 'y', { duration: 0.08, ease: 'none' });

    const quickRingX = gsap.quickTo(ring, 'x', { duration: 0.28, ease: 'power2.out' });
    const quickRingY = gsap.quickTo(ring, 'y', { duration: 0.28, ease: 'power2.out' });

    window.addEventListener('mousemove', (e) => {
        quickDotX(e.clientX);
        quickDotY(e.clientY);
        quickRingX(e.clientX);
        quickRingY(e.clientY);
    }, { passive: true });

    window.addEventListener('mousedown', () => {
        document.body.classList.add('cursor-active');
    });

    window.addEventListener('mouseup', () => {
        document.body.classList.remove('cursor-active');
    });

    const hoverSelectors = 'button, input, select, .quick-pill, .swap-action, .copy-action, .subtle-btn, .history-item, .suite-tab-btn, .tab-item';
    document.addEventListener('mouseover', (e) => {
        if (e.target.closest(hoverSelectors)) {
            document.body.classList.add('cursor-hover');
        } else if (e.target.closest('#lpCanvas')) {
            document.body.classList.add('cursor-canvas');
        }
    });

    document.addEventListener('mouseout', (e) => {
        if (e.target.closest(hoverSelectors)) {
            document.body.classList.remove('cursor-hover');
        } else if (e.target.closest('#lpCanvas')) {
            document.body.classList.remove('cursor-canvas');
        }
    });
}

/* ==========================================================
   2. MAGNETIC BUTTON PHYSICS
   ========================================================== */
function initMagneticButtons() {
    if (typeof gsap === 'undefined' || window.matchMedia('(pointer: coarse)').matches) return;

    const attachMagnetic = (el) => {
        if (el.dataset.hasMagnetic) return;
        el.dataset.hasMagnetic = 'true';

        el.addEventListener('mousemove', (e) => {
            const rect = el.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            const dx = (e.clientX - centerX) * 0.32;
            const dy = (e.clientY - centerY) * 0.32;

            gsap.to(el, {
                x: dx,
                y: dy,
                duration: 0.3,
                ease: 'power2.out'
            });
        });

        el.addEventListener('mouseleave', () => {
            gsap.to(el, {
                x: 0,
                y: 0,
                duration: 0.65,
                ease: 'elastic.out(1.1, 0.4)'
            });
        });
    };

    const elements = document.querySelectorAll(
        '.primary-button, .suite-tab-btn, .subtle-btn, .quick-pill, .swap-action, .copy-action'
    );
    elements.forEach(attachMagnetic);
}

/* ==========================================================
   3. SUITE NAVIGATION (LP, TRANSPORTATION, MIDPOINT)
   ========================================================== */
function switchSuite(suiteKey) {
    if (appState.currentSuite === suiteKey) return;
    appState.currentSuite = suiteKey;

    const tabs = {
        'linear-programming': document.getElementById('tabLP'),
        'transportation': document.getElementById('tabTP'),
        'midpoint': document.getElementById('tabMidpoint')
    };

    const sections = {
        'linear-programming': document.getElementById('sectionLP'),
        'transportation': document.getElementById('sectionTP'),
        'midpoint': document.getElementById('sectionMidpoint')
    };

    Object.keys(tabs).forEach(k => {
        if (tabs[k]) {
            if (k === suiteKey) tabs[k].classList.add('active');
            else tabs[k].classList.remove('active');
        }
    });

    Object.keys(sections).forEach(k => {
        if (sections[k]) {
            if (k === suiteKey) {
                sections[k].classList.remove('hidden');
                if (typeof gsap !== 'undefined') {
                    gsap.fromTo(sections[k], { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out' });
                }
            } else {
                sections[k].classList.add('hidden');
            }
        }
    });

    // Update Telemetry active model indicator
    const modelLabels = {
        'linear-programming': 'Linear Programming',
        'transportation': 'Transportation Problem',
        'midpoint': 'Midpoint & Median'
    };
    const modelBadge = document.getElementById('telemetryModel');
    if (modelBadge && modelLabels[suiteKey]) {
        modelBadge.innerText = modelLabels[suiteKey];
    }

    // Reattach magnetic buttons on newly displayed elements
    initMagneticButtons();

    // Redraw canvas if switching to Linear Programming
    if (suiteKey === 'linear-programming' && appState.lpGraph && appState.lpSolution) {
        setTimeout(() => {
            appState.lpGraph.draw(appState.lpSolution, true);
            renderLPVerticesTable(appState.lpSolution);
        }, 50);
    }
}

function resetCurrentSuite() {
    if (appState.currentSuite === 'linear-programming') {
        loadLPPreset('production');
        showToast('Linear Programming reset to Production preset', 'info');
    } else if (appState.currentSuite === 'transportation') {
        loadTPPreset('logistics');
        showToast('Transportation model reset to Logistics preset', 'info');
    } else if (appState.currentSuite === 'midpoint') {
        resetInputs();
        showToast('Midpoint values reset', 'info');
    }
}

/* ==========================================================
   4. LINEAR PROGRAMMING CONTROLLER & GRAPHICAL SOLVER
   ========================================================== */
function initLinearProgramming() {
    appState.lpGraph = new LPGraph('lpCanvas');
    
    // Bidirectional vertex hover highlight synchronization
    window.onGraphVertexHover = (index) => {
        const rows = document.querySelectorAll('#lpVerticesTableBody tr');
        rows.forEach(r => {
            if (index !== null && parseInt(r.dataset.vertexIndex) === index) {
                r.classList.add('active-graph-hover');
            } else {
                r.classList.remove('active-graph-hover');
            }
        });
    };

    loadLPPreset('production');
}

function loadLPPreset(type) {
    const list = document.getElementById('lpConstraintsList');
    if (!list) return;

    list.innerHTML = '';
    const optType = document.getElementById('lpOptType');
    const c1 = document.getElementById('lpC1');
    const c2 = document.getElementById('lpC2');

    if (type === 'production') {
        optType.value = 'max';
        c1.value = 3;
        c2.value = 5;
        addConstraintRow(2, 1, '<=', 18);
        addConstraintRow(2, 3, '<=', 42);
        addConstraintRow(3, 1, '<=', 24);
    } else if (type === 'resource') {
        optType.value = 'max';
        c1.value = 40;
        c2.value = 30;
        addConstraintRow(1, 1, '<=', 12);
        addConstraintRow(2, 1, '<=', 16);
    } else if (type === 'diet') {
        optType.value = 'min';
        c1.value = 2;
        c2.value = 3;
        addConstraintRow(1, 1, '>=', 6);
        addConstraintRow(1, 2, '>=', 8);
    }

    solveLinearProgramming();
}

function addConstraintRow(a1 = 1, a2 = 1, type = '<=', b = 10) {
    const list = document.getElementById('lpConstraintsList');
    if (!list) return;

    const rowIdx = list.children.length + 1;
    const row = document.createElement('div');
    row.className = 'constraint-row';
    row.innerHTML = `
        <span class="constraint-badge">(${rowIdx})</span>
        <input type="number" class="short-input c-a1" value="${a1}" step="any" onchange="solveLinearProgramming()">
        <span class="var-tag">X₁ +</span>
        <input type="number" class="short-input c-a2" value="${a2}" step="any" onchange="solveLinearProgramming()">
        <span class="var-tag">X₂</span>
        <select class="select-input c-type" onchange="solveLinearProgramming()">
            <option value="<=" ${type === '<=' ? 'selected' : ''}>≤</option>
            <option value=">=" ${type === '>=' ? 'selected' : ''}>≥</option>
            <option value="=" ${type === '=' ? 'selected' : ''}>=</option>
        </select>
        <input type="number" class="short-input c-b" value="${b}" step="any" onchange="solveLinearProgramming()">
        <button type="button" class="del-constraint-btn" title="Delete constraint" onclick="removeConstraintRow(this)">
            <span class="material-symbols-outlined">delete_outline</span>
        </button>
    `;
    list.appendChild(row);

    if (typeof gsap !== 'undefined') {
        gsap.from(row, { opacity: 0, x: -10, duration: 0.25 });
    }
}

function removeConstraintRow(btn) {
    const row = btn.closest('.constraint-row');
    if (row) {
        row.remove();
        const list = document.getElementById('lpConstraintsList');
        Array.from(list.children).forEach((r, idx) => {
            const badge = r.querySelector('.constraint-badge');
            if (badge) badge.innerText = `(${idx + 1})`;
        });
        solveLinearProgramming();
    }
}

function solveLinearProgramming() {
    const t0 = performance.now();

    const optType = document.getElementById('lpOptType').value;
    const c1 = parseFloat(document.getElementById('lpC1').value) || 0;
    const c2 = parseFloat(document.getElementById('lpC2').value) || 0;

    const rows = document.querySelectorAll('#lpConstraintsList .constraint-row');
    const constraints = [];

    rows.forEach((r, idx) => {
        const a1 = parseFloat(r.querySelector('.c-a1').value) || 0;
        const a2 = parseFloat(r.querySelector('.c-a2').value) || 0;
        const type = r.querySelector('.c-type').value;
        const b = parseFloat(r.querySelector('.c-b').value) || 0;
        constraints.push({ a1, a2, type, b, label: `Constraint ${idx + 1}` });
    });

    const model = new LinearProgrammingModel({
        objectiveType: optType,
        c1: c1,
        c2: c2,
        constraints: constraints
    });

    const solution = model.solve();
    appState.lpSolution = solution;

    const latency = (performance.now() - t0).toFixed(2);
    const badge = document.getElementById('latencyBadge');
    if (badge) badge.innerText = `${latency} ms`;

    // Render with smooth progressive motion
    if (appState.lpGraph) {
        appState.lpGraph.draw(solution, true);
    }

    // Render interactive feasible corner points table
    renderLPVerticesTable(solution);

    const zEl = document.getElementById('lpResultZ');
    const coordsEl = document.getElementById('lpResultCoords');

    if (solution.success && solution.optimalPoint) {
        animateNumberElement(zEl, solution.optimalZ);
        coordsEl.innerText = `Optimal Decision Point: (X₁* = ${solution.optimalPoint.x}, X₂* = ${solution.optimalPoint.y})`;
    } else {
        zEl.innerText = 'No Solution';
        coordsEl.innerText = 'The feasible region is empty or unbounded under these constraints.';
    }

    renderLPBreakdown(solution.breakdown);
}

function renderLPVerticesTable(sol) {
    const tbody = document.getElementById('lpVerticesTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';

    if (!sol || !sol.feasibleVertices || sol.feasibleVertices.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-low); padding: 14px;">No feasible corner points found.</td></tr>';
        return;
    }

    const opt = sol.optimalPoint;

    sol.feasibleVertices.forEach((v, idx) => {
        const tr = document.createElement('tr');
        tr.dataset.vertexIndex = idx;
        const isOpt = opt && Math.abs(v.x - opt.x) < 1e-4 && Math.abs(v.y - opt.y) < 1e-4;
        if (isOpt) tr.classList.add('is-optimal-row');

        const label = String.fromCharCode(65 + idx);
        const statusHtml = isOpt 
            ? `<span class="vertex-status-opt"><span class="material-symbols-outlined" style="font-size:13px;">star</span> OPTIMAL Z*</span>` 
            : `<span class="vertex-status-sub">Feasible Corner</span>`;

        tr.innerHTML = `
            <td><span class="vertex-tag">${label}</span></td>
            <td><span class="vertex-coord">(${v.x}, ${v.y})</span></td>
            <td><span class="vertex-z">${v.z}</span></td>
            <td>${statusHtml}</td>
        `;

        tr.addEventListener('mouseenter', () => {
            if (appState.lpGraph) {
                appState.lpGraph.highlightVertex(idx);
            }
        });

        tr.addEventListener('mouseleave', () => {
            if (appState.lpGraph) {
                appState.lpGraph.highlightVertex(null);
            }
        });

        tbody.appendChild(tr);
    });
}

function renderLPBreakdown(steps) {
    const body = document.getElementById('lpFormulaBody');
    if (!body) return;
    body.innerHTML = '';

    steps.forEach((s, idx) => {
        const div = document.createElement('div');
        div.className = 'step-item';
        if (idx === steps.length - 1) div.classList.add('highlight');
        div.innerHTML = `<strong>${s.title}</strong>\n${s.content}\n`;
        body.appendChild(div);
    });
}

function toggleLPFormula() {
    const box = document.getElementById('lpFormulaBox');
    if (box) box.classList.toggle('open');
}

function copyLPResult() {
    if (!appState.lpSolution || !appState.lpSolution.optimalPoint) {
        showToast('No optimal solution available', 'error');
        return;
    }
    const sol = appState.lpSolution;
    const text = `Optimal Value Z* = ${sol.optimalZ}, Decision Point = (${sol.optimalPoint.x}, ${sol.optimalPoint.y})`;
    navigator.clipboard.writeText(text).then(() => {
        showToast('Optimal solution copied to clipboard', 'success');
    });
}

/* ==========================================================
   5. TRANSPORTATION PROBLEM CONTROLLER & SOLVER
   ========================================================== */
function initTransportation() {
    loadTPPreset('logistics');
}

function loadTPPreset(type) {
    let supply, demand, matrix;

    if (type === 'logistics') {
        supply = [30, 40, 50];
        demand = [35, 28, 32, 25];
        matrix = [
            [3, 1, 7, 4],
            [2, 6, 5, 9],
            [8, 3, 3, 2]
        ];
    } else {
        supply = [25, 35, 40];
        demand = [30, 30, 40];
        matrix = [
            [4, 8, 8],
            [16, 24, 16],
            [8, 16, 24]
        ];
    }

    renderTransportationInputMatrix(supply, demand, matrix);
    solveTransportation();
}

function renderTransportationInputMatrix(supply, demand, costMatrix) {
    const table = document.getElementById('tpMatrixTable');
    if (!table) return;

    const m = supply.length;
    const n = demand.length;

    let html = '<thead><tr><th>Origin \\ Dest</th>';
    for (let j = 0; j < n; j++) {
        html += `<th>D${j + 1}</th>`;
    }
    html += '<th class="th-supply">Supply</th></tr></thead><tbody>';

    for (let i = 0; i < m; i++) {
        html += `<tr><th>S${i + 1}</th>`;
        for (let j = 0; j < n; j++) {
            html += `<td><input type="number" class="tp-cost-cell" data-row="${i}" data-col="${j}" value="${costMatrix[i][j]}" step="any" onchange="solveTransportation()"></td>`;
        }
        html += `<td class="td-supply"><input type="number" class="tp-supply-cell" data-row="${i}" value="${supply[i]}" step="any" onchange="solveTransportation()"></td></tr>`;
    }

    html += '<tr class="tr-demand"><th>Demand</th>';
    for (let j = 0; j < n; j++) {
        html += `<td><input type="number" class="tp-demand-cell" data-col="${j}" value="${demand[j]}" step="any" onchange="solveTransportation()"></td>`;
    }
    html += '<td>—</td></tr></tbody>';

    table.innerHTML = html;
}

function solveTransportation() {
    const t0 = performance.now();

    const costInputs = document.querySelectorAll('.tp-cost-cell');
    const supplyInputs = document.querySelectorAll('.tp-supply-cell');
    const demandInputs = document.querySelectorAll('.tp-demand-cell');

    const m = supplyInputs.length;
    const n = demandInputs.length;

    const supply = Array.from(supplyInputs).map(inp => parseFloat(inp.value) || 0);
    const demand = Array.from(demandInputs).map(inp => parseFloat(inp.value) || 0);

    const costMatrix = Array.from({ length: m }, () => new Array(n).fill(0));
    costInputs.forEach(inp => {
        const r = parseInt(inp.dataset.row);
        const c = parseInt(inp.dataset.col);
        costMatrix[r][c] = parseFloat(inp.value) || 0;
    });

    const method = document.getElementById('tpMethod').value;

    const model = new TransportationModel({
        supply,
        demand,
        costMatrix,
        method
    });

    const solution = model.solve();
    appState.tpSolution = solution;

    const latency = (performance.now() - t0).toFixed(2);
    const badge = document.getElementById('latencyBadge');
    if (badge) badge.innerText = `${latency} ms`;

    const costEl = document.getElementById('tpResultCost');
    animateNumberElement(costEl, solution.totalCost, '$');

    document.getElementById('tpResultSummary').innerText = 
        `Method: ${method.toUpperCase()} • ${solution.isBalanced ? 'System is balanced.' : 'Balanced with dummy node.'}`;

    // Degeneracy Diagnostic Evaluation: allocations vs (m + n - 1)
    let positiveAllocations = 0;
    const rowsCount = solution.allocation.length;
    const colsCount = solution.allocation[0].length;
    for (let r = 0; r < rowsCount; r++) {
        for (let c = 0; c < colsCount; c++) {
            if (solution.allocation[r][c] > 0) positiveAllocations++;
        }
    }
    const requiredBasicVars = rowsCount + colsCount - 1;
    const degenContainer = document.getElementById('tpDegeneracyContainer');
    const degenIcon = document.getElementById('tpDegeneracyIcon');
    const degenBadge = document.getElementById('tpDegeneracyBadge');

    if (degenContainer && degenBadge && degenIcon) {
        degenContainer.className = 'degeneracy-bar';
        if (positiveAllocations === requiredBasicVars) {
            degenContainer.classList.add('non-degenerate');
            degenIcon.innerText = 'verified';
            degenBadge.innerText = `Non-Degenerate Basic Feasible Solution: ${positiveAllocations} allocations = (m + n - 1 = ${requiredBasicVars}).`;
        } else if (positiveAllocations < requiredBasicVars) {
            degenContainer.classList.add('degenerate');
            degenIcon.innerText = 'warning';
            degenBadge.innerText = `Degenerate Basic Solution: ${positiveAllocations} allocations < (m + n - 1 = ${requiredBasicVars}). Requires ε perturbation for MODI index optimality.`;
        } else {
            degenContainer.classList.add('non-degenerate');
            degenIcon.innerText = 'info';
            degenBadge.innerText = `Feasible Distribution: ${positiveAllocations} allocations (m + n - 1 = ${requiredBasicVars}).`;
        }
    }

    renderTPAllocationTable(solution);
    renderTPBreakdown(solution.breakdown);
}

function renderTPAllocationTable(sol) {
    const table = document.getElementById('tpAllocationTable');
    if (!table) return;

    const m = sol.allocation.length;
    const n = sol.allocation[0].length;

    let html = '<thead><tr><th>Source \\ Dest</th>';
    for (let j = 0; j < n; j++) {
        html += `<th>${sol.dummyAdded && sol.dummyAdded.type === 'destination' && j === n - 1 ? 'Dummy D' : 'D' + (j + 1)}</th>`;
    }
    html += '<th>Supply</th></tr></thead><tbody>';

    for (let i = 0; i < m; i++) {
        const rowLabel = sol.dummyAdded && sol.dummyAdded.type === 'source' && i === m - 1 ? 'Dummy S' : `S${i + 1}`;
        html += `<tr><th>${rowLabel}</th>`;
        for (let j = 0; j < n; j++) {
            const allocQty = sol.allocation[i][j];
            const unitCost = sol.costMatrix[i][j];

            if (allocQty > 0) {
                html += `<td>
                    <div class="alloc-cell-inner">
                        <span class="alloc-allocated">${allocQty}</span>
                        <span class="alloc-rate">@ $${unitCost}</span>
                    </div>
                </td>`;
            } else {
                html += `<td><span class="alloc-empty">[$${unitCost}]</span></td>`;
            }
        }
        html += `<th>${sol.supply[i]}</th></tr>`;
    }

    html += '<tr><th>Demand</th>';
    for (let j = 0; j < n; j++) {
        html += `<th>${sol.demand[j]}</th>`;
    }
    html += '<th>—</th></tr></tbody>';

    table.innerHTML = html;

    // Staggered allocation motion with GSAP
    if (typeof gsap !== 'undefined') {
        gsap.fromTo('.alloc-allocated', 
            { scale: 0, opacity: 0, rotation: -6 },
            { scale: 1, opacity: 1, rotation: 0, duration: 0.45, stagger: 0.08, ease: 'back.out(2)' }
        );
    }
}

function renderTPBreakdown(steps) {
    const body = document.getElementById('tpFormulaBody');
    if (!body) return;
    body.innerHTML = '';

    steps.forEach((s, idx) => {
        const div = document.createElement('div');
        div.className = 'step-item';
        if (idx === steps.length - 1) div.classList.add('highlight');
        div.innerHTML = `<strong>${s.title}</strong>\n${s.content}\n`;
        body.appendChild(div);
    });
}

function toggleTPFormula() {
    const box = document.getElementById('tpFormulaBox');
    if (box) box.classList.toggle('open');
}

function copyTPResult() {
    if (!appState.tpSolution) return;
    navigator.clipboard.writeText(`$${appState.tpSolution.totalCost}`).then(() => {
        showToast('Total transportation cost copied', 'success');
    });
}

/* ==========================================================
   6. DYNAMIC CURSOR BACKGROUND ENGINE (AESTHETIC & FUTURISTIC)
   ========================================================== */
function initDynamicCursorBackground() {
    const bgContainer = document.getElementById('cursorBg');
    const canvas = document.getElementById('ambientCanvas');

    if (!bgContainer || typeof gsap === 'undefined') return;

    let currentMouseX = window.innerWidth / 2;
    let currentMouseY = window.innerHeight / 2;
    let lastMouseX = currentMouseX;
    let lastMouseY = currentMouseY;
    let mouseSpeed = 0;

    const quickSpotlightX = gsap.quickTo('#cursorSpotlight', 'x', { duration: 0.45, ease: 'power2.out' });
    const quickSpotlightY = gsap.quickTo('#cursorSpotlight', 'y', { duration: 0.45, ease: 'power2.out' });

    const quickOrbPrimaryX = gsap.quickTo('#orbPrimary', 'x', { duration: 1.1, ease: 'power1.out' });
    const quickOrbPrimaryY = gsap.quickTo('#orbPrimary', 'y', { duration: 1.1, ease: 'power1.out' });

    const quickOrbCyanX = gsap.quickTo('#orbCyan', 'x', { duration: 1.4, ease: 'power1.out' });
    const quickOrbCyanY = gsap.quickTo('#orbCyan', 'y', { duration: 1.4, ease: 'power1.out' });

    const quickOrbIndigoX = gsap.quickTo('#orbIndigo', 'x', { duration: 1.3, ease: 'power1.out' });
    const quickOrbIndigoY = gsap.quickTo('#orbIndigo', 'y', { duration: 1.3, ease: 'power1.out' });

    quickSpotlightX(currentMouseX);
    quickSpotlightY(currentMouseY);
    document.documentElement.style.setProperty('--mouse-x', `${currentMouseX}px`);
    document.documentElement.style.setProperty('--mouse-y', `${currentMouseY}px`);

    let isMouseActive = false;

    window.addEventListener('mousemove', (e) => {
        isMouseActive = true;
        currentMouseX = e.clientX;
        currentMouseY = e.clientY;

        // Compute speed
        const dx = currentMouseX - lastMouseX;
        const dy = currentMouseY - lastMouseY;
        mouseSpeed = Math.hypot(dx, dy);
        lastMouseX = currentMouseX;
        lastMouseY = currentMouseY;

        quickSpotlightX(currentMouseX);
        quickSpotlightY(currentMouseY);

        document.documentElement.style.setProperty('--mouse-x', `${currentMouseX}px`);
        document.documentElement.style.setProperty('--mouse-y', `${currentMouseY}px`);

        const winCenterX = window.innerWidth / 2;
        const winCenterY = window.innerHeight / 2;
        const deltaX = currentMouseX - winCenterX;
        const deltaY = currentMouseY - winCenterY;

        quickOrbPrimaryX(deltaX * 0.05);
        quickOrbPrimaryY(deltaY * 0.05);

        quickOrbCyanX(-deltaX * 0.06);
        quickOrbCyanY(-deltaY * 0.06);

        quickOrbIndigoX(deltaX * 0.035);
        quickOrbIndigoY(-deltaY * 0.035);

        // Update active card spotlight border & 3D tilt
        const activeCard = document.querySelector('.card-container:not(.hidden)');
        if (activeCard) {
            const rect = activeCard.getBoundingClientRect();
            activeCard.style.setProperty('--card-mouse-x', `${currentMouseX - rect.left}px`);
            activeCard.style.setProperty('--card-mouse-y', `${currentMouseY - rect.top}px`);

            if (window.matchMedia('(hover: hover)').matches) {
                const cardCenterX = rect.left + rect.width / 2;
                const cardCenterY = rect.top + rect.height / 2;
                const tiltX = -((currentMouseY - cardCenterY) / (rect.height / 2)) * 3.5;
                const tiltY = ((currentMouseX - cardCenterX) / (rect.width / 2)) * 3.5;

                gsap.to(activeCard, {
                    rotateX: Math.max(-5, Math.min(5, tiltX)),
                    rotateY: Math.max(-5, Math.min(5, tiltY)),
                    transformPerspective: 1000,
                    duration: 0.35,
                    ease: 'power1.out'
                });
            }
        }
    }, { passive: true });

    gsap.to('#orbPrimary', { scale: 1.12, duration: 7, repeat: -1, yoyo: true, ease: 'sine.inOut' });
    gsap.to('#orbCyan', { scale: 1.15, duration: 8.5, repeat: -1, yoyo: true, ease: 'sine.inOut' });

    if (canvas) {
        initCosmicDustCanvas(canvas, () => ({ 
            x: currentMouseX, 
            y: currentMouseY, 
            speed: mouseSpeed,
            active: isMouseActive 
        }));
    }
}

function initCosmicDustCanvas(canvas, getMouse) {
    const ctx = canvas.getContext('2d');
    let width = canvas.width = window.innerWidth;
    let height = canvas.height = window.innerHeight;

    window.addEventListener('resize', () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = Math.min(width > 768 ? 45 : 22, 50);

    for (let i = 0; i < count; i++) {
        particles.push({
            x: Math.random() * width,
            y: Math.random() * height,
            baseRadius: Math.random() * 1.5 + 0.5,
            radius: Math.random() * 1.5 + 0.5,
            vx: (Math.random() - 0.5) * 0.3,
            vy: (Math.random() - 0.5) * 0.3,
            alpha: Math.random() * 0.4 + 0.15
        });
    }

    // Shockwave ripple pulses on click
    const ripples = [];
    window.addEventListener('click', (e) => {
        ripples.push({
            x: e.clientX,
            y: e.clientY,
            radius: 4,
            maxRadius: 220,
            alpha: 0.5
        });
    });

    function render() {
        ctx.clearRect(0, 0, width, height);
        const mouse = getMouse();

        // 1. Draw ripples
        for (let r = ripples.length - 1; r >= 0; r--) {
            const rip = ripples[r];
            rip.radius += 6;
            rip.alpha *= 0.94;

            ctx.beginPath();
            ctx.arc(rip.x, rip.y, rip.radius, 0, Math.PI * 2);
            ctx.strokeStyle = `rgba(56, 189, 248, ${rip.alpha * 0.35})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();

            if (rip.alpha < 0.02 || rip.radius > rip.maxRadius) {
                ripples.splice(r, 1);
            }
        }

        // 2. Draw and simulate particles
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];

            if (mouse.active) {
                const dx = p.x - mouse.x;
                const dy = p.y - mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < 150) {
                    const dynamicPush = Math.min(2.5, 0.8 + (mouse.speed || 0) * 0.05);
                    const force = (1 - dist / 150) * dynamicPush;
                    p.x += (dx / dist) * force;
                    p.y += (dy / dist) * force;
                    p.radius = p.baseRadius * 1.8;
                } else {
                    p.radius += (p.baseRadius - p.radius) * 0.1;
                }
            }

            p.x += p.vx;
            p.y += p.vy;

            if (p.x < 0) p.x = width;
            if (p.x > width) p.x = 0;
            if (p.y < 0) p.y = height;
            if (p.y > height) p.y = 0;

            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(147, 197, 253, ${p.alpha})`;
            ctx.fill();

            for (let j = i + 1; j < particles.length; j++) {
                const p2 = particles[j];
                const lineDx = p.x - p2.x;
                const lineDy = p.y - p2.y;
                const lineDist = Math.sqrt(lineDx * lineDx + lineDy * lineDy);

                if (lineDist < 100) {
                    ctx.beginPath();
                    ctx.moveTo(p.x, p.y);
                    ctx.lineTo(p2.x, p2.y);
                    ctx.strokeStyle = `rgba(59, 130, 246, ${0.1 * (1 - lineDist / 100)})`;
                    ctx.lineWidth = 0.7;
                    ctx.stroke();
                }
            }
        }

        requestAnimationFrame(render);
    }

    render();
}

/* ==========================================================
   7. GSAP ENTRANCE ANIMATION
   ========================================================== */
function initEntranceAnimation() {
    if (typeof gsap === 'undefined') return;

    gsap.timeline({ defaults: { ease: 'power2.out' } })
        .from('.header-badge', { y: -12, opacity: 0, duration: 0.5 })
        .from('.header-title', { y: 16, opacity: 0, duration: 0.6 }, '-=0.3')
        .from('.header-desc', { y: 12, opacity: 0, duration: 0.5 }, '-=0.4')
        .from('.author-tag', { opacity: 0, duration: 0.4 }, '-=0.3')
        .from('.suite-tabs', { y: 16, opacity: 0, duration: 0.5 }, '-=0.3')
        .from('#sectionLP', { y: 24, opacity: 0, duration: 0.7 }, '-=0.3')
        .from('.app-footer', { opacity: 0, duration: 0.6 }, '-=0.2');
}

/* ==========================================================
   8. MIDPOINT & MEDIAN MODULE
   ========================================================== */
function initMidpointTool() {
    loadCalculationHistory();
    const num1 = document.getElementById('num1');
    const num2 = document.getElementById('num2');
    if (num1 && num2 && !num1.value && !num2.value) {
        num1.value = 10;
        num2.value = 60;
    }
}

function switchMode(newMode) {
    if (appState.midpointMode === newMode) return;
    appState.midpointMode = newMode;

    const tabTwo = document.getElementById('tabTwoNumbers');
    const tabData = document.getElementById('tabDataset');
    const slider = document.getElementById('tabSlider');
    const panelTwo = document.getElementById('panelTwoNumbers');
    const panelData = document.getElementById('panelDataset');
    const btnText = document.getElementById('btnText');
    const visualizer = document.getElementById('visualizerContainer');
    const datasetVisualizer = document.getElementById('datasetVisualizerContainer');
    const resultTag = document.getElementById('resultTag');

    if (newMode === 'two-numbers') {
        tabTwo.classList.add('active');
        tabData.classList.remove('active');
        btnText.innerText = 'Calculate Midpoint';
        resultTag.innerText = 'MIDPOINT';

        if (typeof gsap !== 'undefined') {
            gsap.to(slider, { x: 0, duration: 0.28, ease: 'power2.out' });
            gsap.to(panelData, {
                opacity: 0,
                duration: 0.15,
                onComplete: () => {
                    panelData.classList.add('hidden');
                    panelTwo.classList.remove('hidden');
                    gsap.fromTo(panelTwo, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 });
                }
            });
        } else {
            panelData.classList.add('hidden');
            panelTwo.classList.remove('hidden');
        }

        visualizer.classList.remove('hidden');
        datasetVisualizer.classList.add('hidden');
    } else {
        tabData.classList.add('active');
        tabTwo.classList.remove('active');
        btnText.innerText = 'Calculate Median';
        resultTag.innerText = 'MEDIAN VALUE';

        if (typeof gsap !== 'undefined') {
            const shift = tabTwo.offsetWidth;
            gsap.to(slider, { x: shift, duration: 0.28, ease: 'power2.out' });
            gsap.to(panelTwo, {
                opacity: 0,
                duration: 0.15,
                onComplete: () => {
                    panelTwo.classList.add('hidden');
                    panelData.classList.remove('hidden');
                    gsap.fromTo(panelData, { opacity: 0, y: 6 }, { opacity: 1, y: 0, duration: 0.25 });
                }
            });
        } else {
            panelTwo.classList.add('hidden');
            panelData.classList.remove('hidden');
        }

        visualizer.classList.add('hidden');
        datasetVisualizer.classList.remove('hidden');
    }
}

function setQuickValues(a, b) {
    document.getElementById('num1').value = a;
    document.getElementById('num2').value = b;
    q();
}

function randomizeInputs() {
    const a = Math.floor(Math.random() * 80) - 20;
    const b = Math.floor(Math.random() * 120) + a + 15;
    document.getElementById('num1').value = a;
    document.getElementById('num2').value = b;
    q();
}

function swapInputs() {
    const num1 = document.getElementById('num1');
    const num2 = document.getElementById('num2');
    const temp = num1.value;
    num1.value = num2.value;
    num2.value = temp;

    const swapBtn = document.getElementById('swapBtn');
    if (typeof gsap !== 'undefined' && swapBtn) {
        gsap.fromTo(swapBtn, { rotation: 0 }, { rotation: 180, duration: 0.3, ease: 'power2.out' });
    }

    if (num1.value !== '' && num2.value !== '') {
        q();
    }
}

function resetInputs() {
    document.getElementById('num1').value = '';
    document.getElementById('num2').value = '';
    document.getElementById('resultNumber').innerText = '0';
    document.getElementById('output1').innerText = 'Enter values above and click Calculate.';
    document.getElementById('visValA').innerText = '0';
    document.getElementById('visValMid').innerText = '0';
    document.getElementById('visValB').innerText = '0';
    document.getElementById('deltaBadge').innerText = 'Equal distance: 0';
    showToast('Inputs have been reset', 'info');
}

function setDatasetPreset(type) {
    const input = document.getElementById('inputDataset');
    if (type === 'odd') {
        input.value = '7, 14, 21, 35, 42, 56, 70';
    } else {
        input.value = '12, 18, 24, 30, 48, 60';
    }
    cariAngkaTengah();
}

function randomizeDataset() {
    const count = Math.random() > 0.5 ? 7 : 6;
    const items = [];
    for (let i = 0; i < count; i++) {
        items.push(Math.floor(Math.random() * 90) + 10);
    }
    document.getElementById('inputDataset').value = items.join(', ');
    cariAngkaTengah();
}

function q() {
    if (appState.midpointMode === 'dataset') {
        cariAngkaTengah();
        return;
    }

    const t0 = performance.now();

    const valA = document.getElementById('num1').value.trim();
    const valB = document.getElementById('num2').value.trim();

    if (valA === '' || valB === '' || isNaN(valA) || isNaN(valB)) {
        showToast('Please enter valid numeric values for both fields.', 'error');
        document.getElementById('output1').innerText = 'Please enter both values to calculate.';
        return;
    }

    const a = parseFloat(valA);
    const b = parseFloat(valB);
    const mid = (a + b) / 2;
    const formatted = Number.isInteger(mid) ? mid : Number(mid.toFixed(4));

    appState.midpointResult = formatted;

    const latency = (performance.now() - t0).toFixed(2);
    const badge = document.getElementById('latencyBadge');
    if (badge) badge.innerText = `${latency} ms`;

    document.getElementById('output1').innerText = `The midpoint between ${a} and ${b} is ${formatted}.`;

    const el = document.getElementById('resultNumber');
    animateNumberElement(el, formatted);

    const minVal = Math.min(a, b);
    const distance = Math.abs(mid - minVal);
    const formattedDistance = Number.isInteger(distance) ? distance : Number(distance.toFixed(3));

    document.getElementById('visValA').innerText = a;
    document.getElementById('visValB').innerText = b;
    document.getElementById('visValMid').innerText = mid;
    document.getElementById('deltaBadge').innerText = `Equal distance: ${formattedDistance}`;

    if (typeof gsap !== 'undefined') {
        gsap.fromTo('#railPinMid', { scale: 0.7, opacity: 0.5 }, { scale: 1, opacity: 1, duration: 0.4, ease: 'power2.out' });
    }

    const sum = a + b;
    const formattedSum = Number.isInteger(sum) ? sum : Number(sum.toFixed(4));
    document.getElementById('formulaStep1').innerText = `1. Formula: M = (A + B) / 2`;
    document.getElementById('formulaStep2').innerText = `2. Calculation: (${a} + ${b}) / 2 = ${formattedSum} / 2`;
    document.getElementById('formulaStep3').innerText = `3. Final Result: M = ${mid}`;

    addHistoryRecord(`${a} & ${b}`, formatted, 'Midpoint');
}

function cariAngkaTengah() {
    const t0 = performance.now();

    const inputStr = document.getElementById('inputDataset').value.trim();
    if (!inputStr) {
        showToast('Please enter a sequence of numbers.', 'error');
        return;
    }

    const tokens = inputStr.split(/[,;\s]+/).filter(t => t.trim() !== '');
    const numbers = tokens.map(Number).filter(n => !isNaN(n));

    if (numbers.length === 0) {
        showToast('No valid numbers found in the input.', 'error');
        return;
    }

    numbers.sort((x, y) => x - y);
    const len = numbers.length;
    const midIdx = Math.floor(len / 2);
    const isEven = len % 2 === 0;

    const median = isEven ? (numbers[midIdx - 1] + numbers[midIdx]) / 2 : numbers[midIdx];
    const formattedMedian = Number.isInteger(median) ? median : Number(median.toFixed(4));
    appState.midpointResult = formattedMedian;

    const latency = (performance.now() - t0).toFixed(2);
    const badge = document.getElementById('latencyBadge');
    if (badge) badge.innerText = `${latency} ms`;

    const summary = isEven
        ? `The median of ${len} sorted values is ${formattedMedian} (average of ${numbers[midIdx - 1]} and ${numbers[midIdx]}).`
        : `The median of ${len} sorted values is ${formattedMedian} (value at position ${midIdx + 1}).`;

    document.getElementById('output1').innerText = summary;

    const container = document.getElementById('datasetChips');
    if (container) {
        container.innerHTML = '';
        const targetIndices = isEven ? [midIdx - 1, midIdx] : [midIdx];
        numbers.forEach((num, idx) => {
            const chip = document.createElement('span');
            chip.className = 'array-chip';
            if (targetIndices.includes(idx)) chip.classList.add('median-target');
            chip.innerText = num;
            container.appendChild(chip);
        });
    }

    const el = document.getElementById('resultNumber');
    animateNumberElement(el, formattedMedian);
    addHistoryRecord(`[${numbers.length} values]`, formattedMedian, 'Median');

    document.getElementById('formulaStep1').innerText = `1. Sorted Sequence: [ ${numbers.join(', ')} ]`;
    document.getElementById('formulaStep2').innerText = isEven
        ? `2. Even Count (${len}): Median = (${numbers[midIdx - 1]} + ${numbers[midIdx]}) / 2`
        : `2. Odd Count (${len}): Middle Element = Index ${midIdx + 1} (${numbers[midIdx]})`;
    document.getElementById('formulaStep3').innerText = `3. Median Value: ${formattedMedian}`;
}

function toggleFormula() {
    const box = document.getElementById('formulaBox');
    if (box) box.classList.toggle('open');
}

function copyResult() {
    if (appState.midpointResult === null) {
        showToast('Please calculate a value first', 'error');
        return;
    }
    navigator.clipboard.writeText(appState.midpointResult.toString()).then(() => {
        showToast(`Copied ${appState.midpointResult} to clipboard`, 'success');
    });
}

function loadCalculationHistory() {
    try {
        const saved = localStorage.getItem('midpoint_calc_history');
        if (saved) {
            appState.history = JSON.parse(saved);
            renderHistoryUI();
        }
    } catch (e) {
        appState.history = [];
    }
}

function addHistoryRecord(label, val, type) {
    const record = {
        label: label,
        result: val,
        type: type,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    if (appState.history.length > 0 &&
        appState.history[0].label === record.label &&
        appState.history[0].result === record.result) {
        return;
    }

    appState.history.unshift(record);
    if (appState.history.length > 5) appState.history.pop();

    try {
        localStorage.setItem('midpoint_calc_history', JSON.stringify(appState.history));
    } catch (e) {}

    renderHistoryUI();
}

function renderHistoryUI() {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (appState.history.length === 0) {
        container.innerHTML = '<div class="history-empty">No calculations recorded yet.</div>';
        return;
    }

    container.innerHTML = '';
    appState.history.forEach(item => {
        const row = document.createElement('div');
        row.className = 'history-item';
        row.innerHTML = `
            <span class="history-inputs">${item.label} (${item.type})</span>
            <span class="history-result">= ${item.result}</span>
        `;
        row.onclick = () => {
            if (item.type === 'Midpoint') {
                const parts = item.label.split('&').map(s => s.trim());
                if (parts.length === 2) {
                    switchSuite('midpoint');
                    switchMode('two-numbers');
                    document.getElementById('num1').value = parts[0];
                    document.getElementById('num2').value = parts[1];
                    q();
                }
            }
        };
        container.appendChild(row);
    });
}

function clearHistory() {
    appState.history = [];
    try {
        localStorage.removeItem('midpoint_calc_history');
    } catch (e) {}
    renderHistoryUI();
    showToast('Calculation history cleared', 'info');
}

/* ==========================================================
   9. UTILITIES & ANIMATION HELPERS
   ========================================================== */
function animateNumberElement(el, targetVal, prefix = '') {
    if (!el) return;

    if (typeof gsap !== 'undefined') {
        const tracker = { current: 0 };
        gsap.to(tracker, {
            current: targetVal,
            duration: 0.65,
            ease: 'power2.out',
            onUpdate: () => {
                const valStr = Number.isInteger(targetVal)
                    ? Math.round(tracker.current).toString()
                    : tracker.current.toFixed(2);
                el.innerText = prefix + valStr;
            },
            onComplete: () => {
                el.innerText = prefix + targetVal;
            }
        });
    } else {
        el.innerText = prefix + targetVal;
    }
}

let toastTimer = null;
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMsg = document.getElementById('toastMsg');
    const toastIcon = document.getElementById('toastIcon');

    if (!toast || !toastMsg) return;

    toastMsg.innerText = message;

    if (type === 'error') {
        toast.style.borderColor = 'var(--accent-rose)';
        if (toastIcon) {
            toastIcon.innerText = 'error';
            toastIcon.style.color = 'var(--accent-rose)';
        }
    } else {
        toast.style.borderColor = 'var(--border-subtle)';
        if (toastIcon) {
            toastIcon.innerText = 'check_circle';
            toastIcon.style.color = 'var(--accent-emerald)';
        }
    }

    if (typeof gsap !== 'undefined') {
        gsap.killTweensOf(toast);
        gsap.to(toast, {
            opacity: 1,
            y: 0,
            duration: 0.25,
            ease: 'power2.out'
        });

        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            gsap.to(toast, {
                opacity: 0,
                y: 12,
                duration: 0.2,
                ease: 'power2.in'
            });
        }, 2600);
    } else {
        toast.style.opacity = '1';
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => { toast.style.opacity = '0'; }, 2600);
    }
}

function attachKeyboardEvents() {
    const ids = ['num1', 'num2', 'inputDataset', 'lpC1', 'lpC2'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    if (appState.currentSuite === 'linear-programming') {
                        solveLinearProgramming();
                    } else if (appState.currentSuite === 'transportation') {
                        solveTransportation();
                    } else if (appState.currentSuite === 'midpoint') {
                        if (appState.midpointMode === 'two-numbers') q();
                        else cariAngkaTengah();
                    }
                }
            });
        }
    });
}