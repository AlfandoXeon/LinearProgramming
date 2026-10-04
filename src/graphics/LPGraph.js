/**
 * LPGraph — Interactive Real Canvas Graphic Engine for Linear Programming
 * Developed by AlfandoXeon
 */

class LPGraph {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        if (!canvasId || !this.canvas) {
            console.error('LPGraph: Canvas element not found.');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.data = null;
        this.padding = { top: 40, right: 40, bottom: 50, left: 60 };
        this.hoveredVertex = null;
        this.mousePos = null;
        this.pulsePhase = 0;
        this.animProgress = 1;
        this.zoomLevel = 1.0;

        this.initEvents();
        this.startPulseAnimation();
    }

    initEvents() {
        if (!this.canvas) return;

        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            this.mousePos = { x: mouseX, y: mouseY };

            if (this.data && this.bounds) {
                let nearest = null;
                let minDist = 24;

                this.data.feasibleVertices.forEach((v, idx) => {
                    const sx = this.worldToScreenX(v.x);
                    const sy = this.worldToScreenY(v.y);
                    const dist = Math.hypot(sx - mouseX, sy - mouseY);
                    if (dist < minDist) {
                        minDist = dist;
                        nearest = { ...v, sx, sy, index: idx };
                    }
                });

                this.hoveredVertex = nearest;
                this.render();

                // Trigger external listener for table row highlight if available
                if (typeof window.onGraphVertexHover === 'function') {
                    window.onGraphVertexHover(nearest ? nearest.index : null);
                }
            }
        });

        this.canvas.addEventListener('mouseleave', () => {
            this.mousePos = null;
            this.hoveredVertex = null;
            this.render();
            if (typeof window.onGraphVertexHover === 'function') {
                window.onGraphVertexHover(null);
            }
        });

        window.addEventListener('resize', () => {
            if (this.data) this.render();
        });
    }

    startPulseAnimation() {
        const loop = () => {
            this.pulsePhase += 0.055;
            if (this.pulsePhase > Math.PI * 2) this.pulsePhase = 0;
            if (this.data && this.data.optimalPoint && this.animProgress >= 0.99) {
                this.render();
            }
            requestAnimationFrame(loop);
        };
        requestAnimationFrame(loop);
    }

    zoom(delta) {
        this.zoomLevel = Math.max(0.6, Math.min(2.5, this.zoomLevel + delta));
        this.render();
    }

    resetView() {
        this.zoomLevel = 1.0;
        this.render();
    }

    highlightVertex(idx) {
        if (!this.data || !this.data.feasibleVertices) return;
        if (idx === null || idx === undefined || idx < 0 || idx >= this.data.feasibleVertices.length) {
            this.hoveredVertex = null;
        } else {
            const v = this.data.feasibleVertices[idx];
            this.hoveredVertex = {
                ...v,
                sx: this.worldToScreenX(v.x),
                sy: this.worldToScreenY(v.y),
                index: idx
            };
        }
        this.render();
    }

    exportPNG() {
        if (!this.canvas) return;
        const link = document.createElement('a');
        link.download = `linear-programming-solution-${Date.now()}.png`;
        link.href = this.canvas.toDataURL('image/png');
        link.click();
    }

    /**
     * Updates data and triggers smooth fluid GSAP animation
     */
    draw(solutionData, animate = true) {
        this.data = solutionData;
        if (!this.data) return;

        if (animate && typeof gsap !== 'undefined') {
            this.animProgress = 0;
            gsap.killTweensOf(this);
            gsap.to(this, {
                animProgress: 1,
                duration: 0.85,
                ease: 'power3.out',
                onUpdate: () => this.render(),
                onComplete: () => {
                    this.animProgress = 1;
                    this.render();
                }
            });
        } else {
            this.animProgress = 1;
            this.render();
        }
    }

    render() {
        if (!this.canvas || !this.ctx || !this.data) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = this.canvas.getBoundingClientRect();
        const displayWidth = rect.width || 680;
        const displayHeight = rect.height || 420;

        if (this.canvas.width !== displayWidth * dpr || this.canvas.height !== displayHeight * dpr) {
            this.canvas.width = displayWidth * dpr;
            this.canvas.height = displayHeight * dpr;
        }

        const ctx = this.ctx;
        ctx.save();
        ctx.scale(dpr, dpr);

        const w = displayWidth;
        const h = displayHeight;

        // Clear canvas
        ctx.fillStyle = '#090d16';
        ctx.fillRect(0, 0, w, h);

        // Compute domain bounds with zoom
        this.computeBounds();

        // Draw grid & axes
        this.drawGridAndAxes(w, h);

        // Draw Feasible Region polygon
        this.drawFeasibleRegion();

        // Draw Constraint Lines
        this.drawConstraintLines();

        // Draw Objective Function Contour
        if (this.animProgress > 0.5) {
            this.drawObjectiveFunctionLine();
        }

        // Draw Corner Vertices
        if (this.animProgress > 0.3) {
            this.drawVertices();
        }

        // Draw Interactive Crosshair & HUD
        this.drawInteractiveHUD(w, h);

        ctx.restore();
    }

    computeBounds() {
        let maxX = 10;
        let maxY = 10;

        this.data.constraints.forEach(c => {
            if (c.a1 > 0) maxX = Math.max(maxX, c.b / c.a1);
            if (c.a2 > 0) maxY = Math.max(maxY, c.b / c.a2);
        });

        this.data.feasibleVertices.forEach(v => {
            maxX = Math.max(maxX, v.x);
            maxY = Math.max(maxY, v.y);
        });

        // Apply zoom factor
        const zoomMargin = 1.25 / this.zoomLevel;
        maxX = Math.ceil(maxX * zoomMargin);
        maxY = Math.ceil(maxY * zoomMargin);

        this.bounds = {
            minX: 0,
            maxX: Math.max(4, maxX),
            minY: 0,
            maxY: Math.max(4, maxY)
        };
    }

    worldToScreenX(x) {
        const plotWidth = (this.canvas.width / (window.devicePixelRatio || 1)) - this.padding.left - this.padding.right;
        return this.padding.left + ((x - this.bounds.minX) / (this.bounds.maxX - this.bounds.minX)) * plotWidth;
    }

    worldToScreenY(y) {
        const plotHeight = (this.canvas.height / (window.devicePixelRatio || 1)) - this.padding.top - this.padding.bottom;
        return (this.canvas.height / (window.devicePixelRatio || 1)) - this.padding.bottom - ((y - this.bounds.minY) / (this.bounds.maxY - this.bounds.minY)) * plotHeight;
    }

    screenToWorldX(sx) {
        const plotWidth = (this.canvas.width / (window.devicePixelRatio || 1)) - this.padding.left - this.padding.right;
        return this.bounds.minX + ((sx - this.padding.left) / plotWidth) * (this.bounds.maxX - this.bounds.minX);
    }

    screenToWorldY(sy) {
        const plotHeight = (this.canvas.height / (window.devicePixelRatio || 1)) - this.padding.top - this.padding.bottom;
        const bottom = (this.canvas.height / (window.devicePixelRatio || 1)) - this.padding.bottom;
        return this.bounds.minY + ((bottom - sy) / plotHeight) * (this.bounds.maxY - this.bounds.minY);
    }

    drawGridAndAxes(w, h) {
        const ctx = this.ctx;
        const originX = this.worldToScreenX(0);
        const originY = this.worldToScreenY(0);

        const stepX = this.calculateTickStep(this.bounds.maxX);
        const stepY = this.calculateTickStep(this.bounds.maxY);

        ctx.lineWidth = 1;

        // Vertical grid lines
        for (let x = 0; x <= this.bounds.maxX; x += stepX) {
            const sx = this.worldToScreenX(x);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            ctx.moveTo(sx, this.padding.top);
            ctx.lineTo(sx, originY);
            ctx.stroke();

            // Label
            ctx.fillStyle = '#64748b';
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textAlign = 'center';
            ctx.fillText(x.toString(), sx, originY + 16);
        }

        // Horizontal grid lines
        for (let y = 0; y <= this.bounds.maxY; y += stepY) {
            const sy = this.worldToScreenY(y);
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
            ctx.beginPath();
            ctx.moveTo(originX, sy);
            ctx.lineTo(w - this.padding.right, sy);
            ctx.stroke();

            if (y !== 0) {
                ctx.fillStyle = '#64748b';
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textAlign = 'right';
                ctx.fillText(y.toString(), originX - 10, sy + 3);
            }
        }

        // Axes
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
        ctx.lineWidth = 1.5;

        // X-Axis
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(w - this.padding.right + 14, originY);
        ctx.stroke();

        // Y-Axis
        ctx.beginPath();
        ctx.moveTo(originX, originY);
        ctx.lineTo(originX, this.padding.top - 14);
        ctx.stroke();

        // Axis Titles
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 11px "Inter", sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('X₁ (Decision Var 1)', w - this.padding.right - 95, originY + 34);

        ctx.save();
        ctx.translate(originX - 35, this.padding.top + 50);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.fillText('X₂ (Decision Var 2)', 0, 0);
        ctx.restore();
    }

    calculateTickStep(maxVal) {
        if (maxVal <= 8) return 1;
        if (maxVal <= 16) return 2;
        if (maxVal <= 35) return 5;
        if (maxVal <= 75) return 10;
        if (maxVal <= 180) return 25;
        return 50;
    }

    drawFeasibleRegion() {
        const poly = this.data.feasiblePolygon;
        if (!poly || poly.length < 3) return;

        const ctx = this.ctx;
        ctx.save();

        const p = Math.max(0.01, this.animProgress);
        const originY = this.worldToScreenY(0);

        ctx.beginPath();
        poly.forEach((pt, i) => {
            const curX = pt.x * p;
            const curY = pt.y * p;
            const sx = this.worldToScreenX(curX);
            const sy = this.worldToScreenY(curY);
            if (i === 0) ctx.moveTo(sx, sy);
            else ctx.lineTo(sx, sy);
        });
        ctx.closePath();

        // Luminous Gradient Fill
        const grad = ctx.createLinearGradient(0, this.padding.top, 0, originY);
        grad.addColorStop(0, `rgba(59, 130, 246, ${0.36 * p})`);
        grad.addColorStop(1, `rgba(99, 102, 241, ${0.08 * p})`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = `rgba(96, 165, 250, ${0.9 * p})`;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Centroid Badge
        if (this.animProgress > 0.7) {
            const cx = poly.reduce((sum, pt) => sum + pt.x, 0) / poly.length;
            const cy = poly.reduce((sum, pt) => sum + pt.y, 0) / poly.length;
            const scx = this.worldToScreenX(cx);
            const scy = this.worldToScreenY(cy);

            ctx.fillStyle = `rgba(255, 255, 255, ${this.animProgress})`;
            ctx.font = '600 11px "Inter", sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('FEASIBLE REGION', scx, scy);
        }

        ctx.restore();
    }

    drawConstraintLines() {
        const ctx = this.ctx;
        const colors = ['#38bdf8', '#818cf8', '#34d399', '#fbbf24', '#f472b6'];
        const progress = this.animProgress;

        this.data.constraints.forEach((c, idx) => {
            const color = colors[idx % colors.length];
            ctx.save();
            ctx.strokeStyle = color;
            ctx.lineWidth = 1.8;

            let p1, p2;

            if (c.a2 === 0) {
                const xVal = c.b / c.a1;
                p1 = { x: xVal, y: 0 };
                p2 = { x: xVal, y: this.bounds.maxY };
            } else if (c.a1 === 0) {
                const yVal = c.b / c.a2;
                p1 = { x: 0, y: yVal };
                p2 = { x: this.bounds.maxX, y: yVal };
            } else {
                const yAt0 = c.b / c.a2;
                const xAt0 = c.b / c.a1;
                p1 = { x: 0, y: yAt0 };
                p2 = { x: xAt0, y: 0 };
            }

            const currentP2 = {
                x: p1.x + (p2.x - p1.x) * progress,
                y: p1.y + (p2.y - p1.y) * progress
            };

            ctx.beginPath();
            ctx.moveTo(this.worldToScreenX(p1.x), this.worldToScreenY(p1.y));
            ctx.lineTo(this.worldToScreenX(currentP2.x), this.worldToScreenY(currentP2.y));
            ctx.stroke();

            if (progress > 0.8) {
                const midX = (p1.x + p2.x) / 2;
                const midY = (p1.y + p2.y) / 2;
                if (midX <= this.bounds.maxX && midY <= this.bounds.maxY) {
                    const sx = this.worldToScreenX(midX);
                    const sy = this.worldToScreenY(midY);
                    ctx.fillStyle = color;
                    ctx.font = '10px "JetBrains Mono", monospace';
                    ctx.fillText(`(${idx + 1}) ${c.a1}X₁ + ${c.a2}X₂ = ${c.b}`, sx + 6, sy - 6);
                }
            }

            ctx.restore();
        });
    }

    drawObjectiveFunctionLine() {
        const opt = this.data.optimalPoint;
        if (!opt || this.data.c1 === 0 && this.data.c2 === 0) return;

        const ctx = this.ctx;
        ctx.save();
        ctx.strokeStyle = 'rgba(234, 179, 8, 0.75)';
        ctx.lineWidth = 1.6;
        ctx.setLineDash([5, 5]);

        const zStar = this.data.optimalZ;
        const c1 = this.data.c1;
        const c2 = this.data.c2;

        let p1, p2;
        if (c2 !== 0) {
            p1 = { x: 0, y: zStar / c2 };
            p2 = { x: this.bounds.maxX, y: (zStar - c1 * this.bounds.maxX) / c2 };
        } else {
            p1 = { x: zStar / c1, y: 0 };
            p2 = { x: zStar / c1, y: this.bounds.maxY };
        }

        ctx.beginPath();
        ctx.moveTo(this.worldToScreenX(p1.x), this.worldToScreenY(p1.y));
        ctx.lineTo(this.worldToScreenX(p2.x), this.worldToScreenY(p2.y));
        ctx.stroke();

        ctx.restore();
    }

    drawVertices() {
        const ctx = this.ctx;
        const opt = this.data.optimalPoint;

        this.data.feasibleVertices.forEach((v, idx) => {
            const sx = this.worldToScreenX(v.x);
            const sy = this.worldToScreenY(v.y);
            const isOpt = opt && Math.abs(v.x - opt.x) < 1e-4 && Math.abs(v.y - opt.y) < 1e-4;
            const isHovered = this.hoveredVertex && this.hoveredVertex.index === idx;

            if (isOpt) {
                // Pulsing Beacon
                const pulseSize = 10 + Math.sin(this.pulsePhase) * 6;
                ctx.beginPath();
                ctx.arc(sx, sy, pulseSize, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(234, 179, 8, 0.3)';
                ctx.fill();

                ctx.beginPath();
                ctx.arc(sx, sy, isHovered ? 9 : 7, 0, Math.PI * 2);
                ctx.fillStyle = '#eab308';
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = '#fde047';
                ctx.font = 'bold 11px "Inter", sans-serif';
                ctx.textAlign = 'left';
                ctx.fillText(`OPTIMAL (${v.x}, ${v.y})`, sx + 14, sy - 8);
            } else {
                ctx.beginPath();
                ctx.arc(sx, sy, isHovered ? 7 : 4.5, 0, Math.PI * 2);
                ctx.fillStyle = isHovered ? '#38bdf8' : '#ffffff';
                ctx.strokeStyle = '#2563eb';
                ctx.lineWidth = 2;
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = isHovered ? '#ffffff' : '#94a3b8';
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textAlign = 'left';
                ctx.fillText(`${String.fromCharCode(65 + idx)} (${v.x}, ${v.y})`, sx + 8, sy - 6);
            }
        });
    }

    drawInteractiveHUD(w, h) {
        if (!this.mousePos || !this.bounds) return;

        const ctx = this.ctx;
        const mx = this.mousePos.x;
        const my = this.mousePos.y;

        if (mx < this.padding.left || mx > w - this.padding.right || my < this.padding.top || my > h - this.padding.bottom) {
            return;
        }

        const worldX = Number(this.screenToWorldX(mx).toFixed(2));
        const worldY = Number(this.screenToWorldY(my).toFixed(2));

        // High-Tech Crosshair Lines
        ctx.save();
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.3)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);

        ctx.beginPath();
        ctx.moveTo(mx, this.padding.top);
        ctx.lineTo(mx, this.worldToScreenY(0));
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(this.worldToScreenX(0), my);
        ctx.lineTo(w - this.padding.right, my);
        ctx.stroke();

        ctx.restore();

        // Coordinate HUD Chip
        ctx.fillStyle = 'rgba(15, 23, 42, 0.92)';
        ctx.strokeStyle = 'rgba(56, 189, 248, 0.4)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(w - 155, 12, 140, 26, 6);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '600 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`X₁: ${worldX} | X₂: ${worldY}`, w - 85, 29);

        // Hovered Vertex Tooltip
        if (this.hoveredVertex) {
            const v = this.hoveredVertex;
            ctx.fillStyle = 'rgba(15, 23, 42, 0.95)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.roundRect(v.sx + 10, v.sy - 42, 126, 36, 6);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '600 11px "Inter", sans-serif';
            ctx.textAlign = 'left';
            ctx.fillText(`Vertex: (${v.x}, ${v.y})`, v.sx + 18, v.sy - 24);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '500 10px "JetBrains Mono", monospace';
            ctx.fillText(`Z Value = ${v.z}`, v.sx + 18, v.sy - 12);
        }
    }
}

if (typeof window !== 'undefined') {
    window.LPGraph = LPGraph;
}
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LPGraph;
}
