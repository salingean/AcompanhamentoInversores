import ApexCharts from 'apexcharts';
const API_URL = `http://${window.location.hostname}:3000/api/inversores`;

const chartsContainer = document.getElementById('chartsContainer');
const loadingIndicator = document.getElementById('loading');
const searchInput = document.getElementById('searchInput');

const expandModal = document.getElementById('expandModal');
const closeBtn = document.querySelector('.close-btn');
const modalTitle = document.getElementById('modalTitle');
const deselectAllBtn = document.getElementById('deselectAllBtn');

let chartInstances = {};
let expandedChartInstance = null;
let allDeselected = false;

// Estado individual para cada gráfico
let cardStates = {};

const savedTheme = localStorage.getItem('solarTheme') || 'light';
if (savedTheme === 'light') {
    document.documentElement.classList.add('light-mode');
}

const commonOptions = {
    chart: {
        type: 'line',
        height: 350,
        background: 'transparent',
        toolbar: { 
            show: true,
            autoSelected: 'zoom',
            tools: { download: true, selection: false, zoom: true, zoomin: true, zoomout: true, pan: false, reset: true }
        },
        animations: { 
            enabled: true,
            initialAnimation: { enabled: false },
            dynamicAnimation: { enabled: false }
        }
    },
    theme: { mode: savedTheme },
    colors: ['#3b82f6', '#10b981', '#9333ea', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#6366f1', '#f43f5e', '#84cc16', '#a855f7'],
    stroke: {
        curve: 'smooth',
        width: 1
    },
    grid: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        strokeDashArray: 4,
        padding: { top: 0, right: 0, bottom: 0, left: 0 }
    },
    legend: {
        position: 'bottom',
        horizontalAlign: 'left',
        onItemClick: { toggleDataSeries: true },
        labels: { colors: '#e2e8f0' },
        fontSize: '7px',
        markers: { width: 4, height: 4, radius: 2 },
        offsetY: 10,
        height: 40,
        itemMargin: { horizontal: 10, vertical: 0 }
    },
    tooltip: {
        theme: 'dark',
        shared: true,
        intersect: false,
        custom: function({ series, seriesIndex, dataPointIndex, w }) {
            const timestamp = w.globals.seriesX[0][dataPointIndex];
            const date = new Date(timestamp);
            const dd = String(date.getDate()).padStart(2, '0');
            const mm = String(date.getMonth() + 1).padStart(2, '0');
            const yyyy = date.getFullYear();
            const hh = String(date.getHours()).padStart(2, '0');
            const min = String(date.getMinutes()).padStart(2, '0');
            const ss = String(date.getSeconds()).padStart(2, '0');
            const dateStr = `${dd}/${mm}/${yyyy}`;
            const timeStr = `${hh}:${min}:${ss}`;

            let tooltipHtml = `
                <div style="background: rgba(30, 30, 46, 0.6); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; padding: 0; min-width: 200px; box-shadow: 0 8px 24px rgba(0,0,0,0.4);">
                    <div style="padding: 12px 10px 4px 10px; display: flex; justify-content: center;">
                        <div style="background: rgba(255, 255, 255, 0.04); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 4px 12px; display: inline-flex; align-items: center; gap: 6px; box-shadow: inset 0 1px 0 rgba(255,255,255,0.05);">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <polyline points="12 6 12 12 16 14"></polyline>
                            </svg>
                            <span style="color: #f8fafc; font-weight: 600; font-size: 11px; letter-spacing: 0.5px;">${dateStr} <span style="color: #64748b; margin: 0 4px;">•</span> ${timeStr}</span>
                        </div>
                    </div>
                    <div style="padding: 2px 0 6px 0;">`;

            let items = [];
            w.config.series.forEach((s, i) => {
                const val = series[i][dataPointIndex];
                if (val !== undefined && val !== null) {
                    items.push({ name: s.name, val: val, color: w.globals.colors[i] });
                }
            });

            // Ordena os itens em ordem decrescente pelo valor
            items.sort((a, b) => b.val - a.val);

            // Divide em duas colunas (esquerda primeiro, depois direita)
            const half = Math.ceil(items.length / 2);
            const leftCol = items.slice(0, half);
            const rightCol = items.slice(half);

            tooltipHtml += `<div style="display: flex; padding: 0 4px;">`;
            
            const renderItem = (item) => `
                <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 8px; gap: 12px;">
                    <div style="display: flex; align-items: center; gap: 6px;">
                        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${item.color}; display: inline-block; flex-shrink: 0;"></span>
                        <span style="color: #e2e8f0; font-size: 11px; white-space: nowrap;">${item.name}</span>
                    </div>
                    <span style="color: #fff; font-weight: 700; font-size: 12px;">${item.val.toFixed(2)}</span>
                </div>
            `;

            tooltipHtml += `<div style="flex: 1; display: flex; flex-direction: column;">`;
            leftCol.forEach(item => { tooltipHtml += renderItem(item); });
            tooltipHtml += `</div>`;

            tooltipHtml += `<div style="flex: 1; display: flex; flex-direction: column; border-left: 1px solid rgba(255,255,255,0.05); margin-left: 4px; padding-left: 4px;">`;
            rightCol.forEach(item => { tooltipHtml += renderItem(item); });
            tooltipHtml += `</div></div></div></div>`;
            return tooltipHtml;
        }
    },
    xaxis: {
        type: 'datetime',
        labels: { datetimeUTC: false, format: 'HH:mm', style: { fontSize: '9px' } },
        tooltip: { enabled: false }
    },
    markers: {
        size: 0,
        hover: { size: 0 }
    }
};

function getBaseOptions() {
    const base = JSON.parse(JSON.stringify(commonOptions));
    if (commonOptions.tooltip && commonOptions.tooltip.custom) {
        base.tooltip.custom = commonOptions.tooltip.custom;
    }
    return base;
}

function getAxisBounds(startDateStr, endDateStr, startStr, endStr) {
    const sdStr = startDateStr || new Date().toISOString().split('T')[0];
    const edStr = endDateStr || sdStr;
    const sStr = startStr || '05:00';
    const eStr = endStr || '20:00';
    
    const sparts = sdStr.split('-');
    const eparts = edStr.split('-');
    const tsparts = sStr.split(':');
    const teparts = eStr.split(':');

    const min = new Date(sparts[0], sparts[1] - 1, sparts[2], tsparts[0], tsparts[1]).getTime();
    const max = new Date(eparts[0], eparts[1] - 1, eparts[2], teparts[0], teparts[1], 59, 999).getTime();
    return { min, max };
}

function generateYAxis(series) {
    let inverterAxisShown = false;
    let irradAxisShown = false;
    
    return series.map((s, i) => {
        const name = s.name.toLowerCase();
        const isIrrad = name.includes('irradia') || (name.includes('piran') && name.includes('2'));
        let showAxis = false;
        
        if (isIrrad && !irradAxisShown) {
            showAxis = true;
            irradAxisShown = true;
        } else if (!isIrrad && !inverterAxisShown) {
            showAxis = true;
            inverterAxisShown = true;
        }
        
        return {
            show: showAxis,
            showAlways: showAxis,
            seriesName: s.name,
            opposite: isIrrad,
            min: 0,
            max: isIrrad ? 1000 : 350,
            tickAmount: 5,
            labels: {
                formatter: (value) => value ? value.toFixed(1) : "0.0",
                style: { fontSize: '9px' }
            }
        };
    });
}

function generateColors(series) {
    const customColors = JSON.parse(localStorage.getItem('customChartColors') || '{}');
    let colorIndex = 0;
    return series.map((s) => {
        const name = s.name.toLowerCase();
        if ((name.includes('irradia') || (name.includes('piran') && name.includes('2'))) && !customColors[s.name]) {
            return '#f97316'; // Laranja padrão exclusivo
        }
        if (customColors[s.name]) {
            return customColors[s.name];
        }
        const assignedColor = commonOptions.colors[colorIndex % commonOptions.colors.length];
        colorIndex++;
        return assignedColor;
    });
}

async function fetchInitialData() {
    try {
        loadingIndicator.style.display = 'flex';
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${d}`;

        const response = await fetch(`${API_URL}?startDate=${todayStr}&endDate=${todayStr}`);
        const data = await response.json();

        data.forEach(inv => {
            if (!cardStates[inv.id]) {
                cardStates[inv.id] = { startDate: todayStr, endDate: todayStr, start: '05:00', end: '20:00' };
            }
        });

        renderDashboard(data);
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
    } finally {
        loadingIndicator.style.display = 'none';
    }
}

async function updateSingleCard(id, forceZoom = false) {
    const state = cardStates[id];
    try {
        const response = await fetch(`${API_URL}?id=${id}&startDate=${state.startDate}&endDate=${state.endDate}&startTime=${state.start}&endTime=${state.end}`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const inversor = data[0];
            const { min, max } = getAxisBounds(state.startDate, state.endDate, state.start, state.end);
            
            // Update main chart
            if (chartInstances[id]) {
                const base = getBaseOptions();
                if (forceZoom) {
                    chartInstances[id].updateOptions({ xaxis: { ...base.xaxis } }, false, false, false);
                }
                
                const ctx = chartInstances[id].w;
                const currentMin = ctx ? ctx.globals.minX : min;
                const currentMax = ctx ? ctx.globals.maxX : max;
                
                chartInstances[id].updateSeries(inversor.series);
                
                if (forceZoom) {
                    chartInstances[id].zoomX(min, max);
                } else if (currentMin !== undefined && currentMax !== undefined) {
                    chartInstances[id].zoomX(currentMin, currentMax);
                }
            }
            
            const card = document.getElementById(`card-${id}`);
            if (card) {
                const vals = card.querySelectorAll('.stat-value');
                if (vals.length >= 2) {
                    vals[0].textContent = inversor.stats.power;
                    vals[1].textContent = inversor.stats.accumulated;
                }
                const dDisplay = document.getElementById(`card-date-display-${id}`);
                const dStart = document.getElementById(`card-start-date-${id}`);
                const dEnd = document.getElementById(`card-end-date-${id}`);
                if (dDisplay && dStart && dEnd) {
                    dStart.value = state.startDate;
                    dEnd.value = state.endDate;
                    const f = (d) => d.split('-').reverse().join('/');
                    dDisplay.textContent = (state.startDate === state.endDate) ? f(state.startDate) : `${f(state.startDate)} a ${f(state.endDate)}`;
                }
                const tInputs = card.querySelectorAll('input[type="time"]');
                if (tInputs.length >= 2) {
                    tInputs[0].value = state.start;
                    tInputs[1].value = state.end;
                }
            }
            
            // Update modal if open
            if (expandedChartInstance && expandModal.dataset.currentId === id) {
                const base = getBaseOptions();
                if (forceZoom) {
                    expandedChartInstance.updateOptions({ 
                        xaxis: { 
                            ...base.xaxis,
                            labels: { ...base.xaxis.labels, style: { fontSize: '14px' } }
                        } 
                    }, false, false, false);
                }
                
                const ctx = expandedChartInstance.w;
                const currentMin = ctx ? ctx.globals.minX : min;
                const currentMax = ctx ? ctx.globals.maxX : max;
                
                expandedChartInstance.updateSeries(inversor.series);
                
                if (forceZoom) {
                    expandedChartInstance.zoomX(min, max);
                } else if (currentMin !== undefined && currentMax !== undefined) {
                    expandedChartInstance.zoomX(currentMin, currentMax);
                }
                
                // Update modal inputs
                const mdDisplay = document.getElementById('modal-date-display');
                if (mdDisplay) {
                    const f = (d) => d.split('-').reverse().join('/');
                    mdDisplay.textContent = (state.startDate === state.endDate) ? f(state.startDate) : `${f(state.startDate)} a ${f(state.endDate)}`;
                }
                const mdStart = document.getElementById('modalStartDate');
                if (mdStart) mdStart.value = state.startDate;
                const mdEnd = document.getElementById('modalEndDate');
                if (mdEnd) mdEnd.value = state.endDate;
                const mStartTime = document.getElementById('modalStartTime');
                if (mStartTime) mStartTime.value = state.start;
                const mEndTime = document.getElementById('modalEndTime');
                if (mEndTime) mEndTime.value = state.end;
            }
        }
    } catch (err) {
        console.error(err);
    }
}

function renderDashboard(dataToRender) {
    const filterText = searchInput.value.toLowerCase();

    dataToRender.forEach(inversor => { try {
        const matchesFilter = inversor.name.toLowerCase().includes(filterText);
        let card = document.getElementById(`card-${inversor.id}`);

        if (!matchesFilter) {
            if (card) card.style.display = 'none';
            return;
        }

        if (card) {
            card.style.display = 'block';
        } else {
            card = document.createElement('div');
            card.className = 'chart-card';
            card.id = `card-${inversor.id}`;
            card.dataset.name = inversor.name.toLowerCase();

            const header = document.createElement('div');
            header.className = 'card-header';

            const titleDiv = document.createElement('div');
            titleDiv.className = 'card-title-group';
            titleDiv.innerHTML = `
                <span class="status-indicator"></span>
                <h3>${inversor.name}</h3>
            `;

            const statsDiv = document.createElement('div');
            statsDiv.className = 'card-stats-inline';
            statsDiv.innerHTML = `
                <div class="stat-inline">
                    <span class="stat-value">${inversor.stats.power}</span>
                    <span class="stat-label">Potência</span>
                </div>
                <div class="stat-inline">
                    <span class="stat-value">${inversor.stats.accumulated}</span>
                    <span class="stat-label">Acumulada</span>
                </div>
            `;

            const filtersDiv = document.createElement('div');
            filtersDiv.className = 'card-filters';
            filtersDiv.style.flexWrap = 'nowrap';

            const dateSelectorContainer = document.createElement('div');
            dateSelectorContainer.style.position = 'relative';
            
            const dateDisplayBtn = document.createElement('button');
            dateDisplayBtn.className = 'action-btn';
            dateDisplayBtn.id = `card-date-display-${inversor.id}`;
            const formatDisplayDate = (d1, d2) => {
                const f = (d) => d.split('-').reverse().join('/');
                return d1 === d2 ? f(d1) : `${f(d1)} a ${f(d2)}`;
            };
            dateDisplayBtn.textContent = formatDisplayDate(cardStates[inversor.id].startDate, cardStates[inversor.id].endDate);
            
            const datePopover = document.createElement('div');
            datePopover.className = 'date-popover';
            datePopover.style.display = 'none';
            datePopover.style.position = 'absolute';
            datePopover.style.top = '110%';
            datePopover.style.left = '0';
            datePopover.style.background = 'var(--bg-secondary)';
            datePopover.style.border = '1px solid var(--border-color)';
            datePopover.style.padding = '10px';
            datePopover.style.borderRadius = '8px';
            datePopover.style.boxShadow = 'var(--glass-shadow)';
            datePopover.style.zIndex = '1000';
            datePopover.style.flexDirection = 'column';
            datePopover.style.gap = '8px';
            
            const popoverStartLabel = document.createElement('label');
            popoverStartLabel.textContent = 'Data Inicial:';
            popoverStartLabel.style.fontSize = '12px';
            const dStartInput = document.createElement('input');
            dStartInput.type = 'date';
            dStartInput.id = `card-start-date-${inversor.id}`;
            dStartInput.value = cardStates[inversor.id].startDate;
            
            const popoverEndLabel = document.createElement('label');
            popoverEndLabel.textContent = 'Data Final:';
            popoverEndLabel.style.fontSize = '12px';
            const dEndInput = document.createElement('input');
            dEndInput.type = 'date';
            dEndInput.id = `card-end-date-${inversor.id}`;
            dEndInput.value = cardStates[inversor.id].endDate;
            
            const applyBtn = document.createElement('button');
            applyBtn.className = 'action-btn';
            applyBtn.textContent = 'Aplicar';
            applyBtn.style.background = 'var(--accent)';
            applyBtn.style.color = '#fff';
            applyBtn.style.border = 'none';
            applyBtn.style.marginTop = '4px';
            
            const singleDayBtn = document.createElement('button');
            singleDayBtn.className = 'action-btn';
            singleDayBtn.textContent = 'Apenas 1 Dia';
            singleDayBtn.style.marginTop = '2px';
            singleDayBtn.addEventListener('click', () => {
                dEndInput.value = dStartInput.value;
                applyBtn.click();
            });
            
            datePopover.append(popoverStartLabel, dStartInput, popoverEndLabel, dEndInput, applyBtn, singleDayBtn);
            dateSelectorContainer.append(dateDisplayBtn, datePopover);
            
            let popoverVisible = false;
            dateDisplayBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                popoverVisible = !popoverVisible;
                datePopover.style.display = popoverVisible ? 'flex' : 'none';
            });
            
            datePopover.addEventListener('click', (e) => e.stopPropagation());
            
            window.addEventListener('click', () => {
                if (popoverVisible) {
                    popoverVisible = false;
                    datePopover.style.display = 'none';
                }
            });
            
            applyBtn.addEventListener('click', () => {
                cardStates[inversor.id].startDate = dStartInput.value;
                cardStates[inversor.id].endDate = dEndInput.value;
                dateDisplayBtn.textContent = formatDisplayDate(dStartInput.value, dEndInput.value);
                popoverVisible = false;
                datePopover.style.display = 'none';
                updateSingleCard(inversor.id, true);
            });

            const sInput = document.createElement('input');
            sInput.type = 'time';
            sInput.title = 'Hora Inicial';
            sInput.value = cardStates[inversor.id].start;
            sInput.addEventListener('change', (e) => { cardStates[inversor.id].start = e.target.value; updateSingleCard(inversor.id, true); });

            const eInput = document.createElement('input');
            eInput.type = 'time';
            eInput.title = 'Hora Final';
            eInput.value = cardStates[inversor.id].end;
            eInput.addEventListener('change', (e) => { cardStates[inversor.id].end = e.target.value; updateSingleCard(inversor.id, true); });

            const spanA = document.createElement('span');
            spanA.textContent = 'a';
            spanA.style.fontSize = '12px';
            
            const timeWrapper = document.createElement('div');
            timeWrapper.style.display = 'flex';
            timeWrapper.style.alignItems = 'center';
            timeWrapper.style.gap = '5px';
            timeWrapper.append(sInput, spanA, eInput);

            filtersDiv.append(dateSelectorContainer, timeWrapper);

            const expandBtn = document.createElement('button');
            expandBtn.className = 'expand-btn-inline';
            expandBtn.title = "Ampliar Gráfico";
            expandBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 3 21 3 21 9"></polyline>
                    <polyline points="9 21 3 21 3 15"></polyline>
                    <line x1="21" y1="3" x2="14" y2="10"></line>
                    <line x1="3" y1="21" x2="10" y2="14"></line>
                </svg>
            `;
            expandBtn.addEventListener('click', () => openExpandedModal(inversor.id, inversor.name));

            header.append(titleDiv, statsDiv, filtersDiv, expandBtn);

            const chartWrapper = document.createElement('div');
            chartWrapper.className = 'chart-wrapper';

            const chartDiv = document.createElement('div');
            chartDiv.id = `chart-${inversor.id}`;
            
            const scrollContainer = document.createElement('div');
            scrollContainer.className = 'chart-scrollbar-container';
            const scrollContent = document.createElement('div');
            scrollContent.className = 'chart-scrollbar-content';
            scrollContainer.appendChild(scrollContent);

            let isSyncingScroll = false;
            scrollContainer.addEventListener('scroll', () => {
                if (isSyncingScroll) return;
                const scrollPct = scrollContainer.scrollLeft / (scrollContainer.scrollWidth - scrollContainer.clientWidth);
                
                const startDStr = cardStates[inversor.id].startDate;
                const endDStr = cardStates[inversor.id].endDate;
                const startTStr = cardStates[inversor.id].start;
                const endTStr = cardStates[inversor.id].end;
                const dayStartMs = new Date(`${startDStr}T${startTStr}:00`).getTime();
                const dayEndMs = new Date(`${endDStr}T${endTStr}:59`).getTime();
                const totalDayMs = dayEndMs - dayStartMs;
                
                if (chartInstances[inversor.id]) {
                    const ctx = chartInstances[inversor.id].w;
                    if (!ctx || !ctx.globals) return;
                    const currentMin = ctx.globals.minX;
                    const currentMax = ctx.globals.maxX;
                    const windowMs = currentMax - currentMin;
                    
                    const maxScrollMs = totalDayMs - windowMs;
                    const newMin = dayStartMs + (scrollPct * maxScrollMs);
                    const newMax = newMin + windowMs;
                    
                    chartInstances[inversor.id].zoomX(newMin, newMax);
                }
            });

            chartWrapper.appendChild(chartDiv);
            chartWrapper.appendChild(scrollContainer);

            card.append(header, chartWrapper);
            chartsContainer.appendChild(card);

            const { min, max } = getAxisBounds(cardStates[inversor.id].startDate, cardStates[inversor.id].endDate, cardStates[inversor.id].start, cardStates[inversor.id].end);
            
            const base = getBaseOptions();
            base.chart.events = {
                zoomed: function(chartContext, { xaxis }) {
                    const zmin = xaxis.min;
                    const zmax = xaxis.max;
                    
                    const startDStr = cardStates[inversor.id].startDate;
                    const endDStr = cardStates[inversor.id].endDate;
                    const startTStr = cardStates[inversor.id].start;
                    const endTStr = cardStates[inversor.id].end;
                    const dayStartMs = new Date(`${startDStr}T${startTStr}:00`).getTime();
                    const dayEndMs = new Date(`${endDStr}T${endTStr}:59`).getTime();
                    const totalDayMs = dayEndMs - dayStartMs;
                    
                    const windowMs = zmax - zmin;
                    
                    if (windowMs >= totalDayMs - 60000) {
                        scrollContainer.style.display = 'none';
                    } else {
                        scrollContainer.style.display = 'block';
                        const ratio = totalDayMs / windowMs;
                        scrollContent.style.width = `${ratio * 100}%`;
                        
                        const scrollPct = (zmin - dayStartMs) / (totalDayMs - windowMs);
                        isSyncingScroll = true;
                        scrollContainer.scrollLeft = scrollPct * (scrollContainer.scrollWidth - scrollContainer.clientWidth);
                        setTimeout(() => { isSyncingScroll = false; }, 50);
                    }
                }
            };

            const options = {
                ...base,
                chart: { ...base.chart, id: `chart-${inversor.id}` },
                series: inversor.series,
                colors: generateColors(inversor.series),
                xaxis: { ...base.xaxis },
                yaxis: generateYAxis(inversor.series)
            };

            let chart;
            try {
                chart = new ApexCharts(chartDiv, options);
                chart.render().catch(e => {
                    chartDiv.innerHTML = `<div style="color:red; padding: 20px;">Async Error: ${e.message}</div>`;
                }).then(() => {
                    chart.zoomX(min, max);
                });
                chartInstances[inversor.id] = chart;
            } catch(e) {
                chartDiv.innerHTML = `<div style="color:red; padding: 20px;">Sync Error: ${e.message}</div>`;
                console.error("ApexCharts Sync Error:", e);
            }
        }
    } catch(e) { console.error('Error rendering card ', inversor.id, e); } });
}

function openExpandedModal(id, name) {
    modalTitle.textContent = name;
    allDeselected = false;
    deselectAllBtn.textContent = "Desmarcar Todos";
    expandModal.dataset.currentId = id;
    
    // Configura filtros no modal
    let actions = document.querySelector('.modal-filters');
    if (!actions) {
        actions = document.createElement('div');
        actions.className = 'card-filters modal-filters';
        actions.style.marginRight = '10px';
        
        const dateSelectorContainerModal = document.createElement('div');
        dateSelectorContainerModal.style.position = 'relative';
        
        const dateDisplayBtnModal = document.createElement('button');
        dateDisplayBtnModal.className = 'action-btn';
        dateDisplayBtnModal.id = 'modal-date-display';
        const formatDisplayDateModal = (d1, d2) => {
            const f = (d) => d.split('-').reverse().join('/');
            return d1 === d2 ? f(d1) : `${f(d1)} a ${f(d2)}`;
        };
        
        const datePopoverModal = document.createElement('div');
        datePopoverModal.className = 'date-popover';
        datePopoverModal.style.display = 'none';
        datePopoverModal.style.position = 'absolute';
        datePopoverModal.style.top = '110%';
        datePopoverModal.style.left = '0';
        datePopoverModal.style.background = 'var(--bg-secondary)';
        datePopoverModal.style.border = '1px solid var(--border-color)';
        datePopoverModal.style.padding = '10px';
        datePopoverModal.style.borderRadius = '8px';
        datePopoverModal.style.boxShadow = 'var(--glass-shadow)';
        datePopoverModal.style.zIndex = '1000';
        datePopoverModal.style.flexDirection = 'column';
        datePopoverModal.style.gap = '8px';
        
        const popoverStartLabelModal = document.createElement('label');
        popoverStartLabelModal.textContent = 'Data Inicial:';
        popoverStartLabelModal.style.fontSize = '12px';
        const mdStartInput = document.createElement('input');
        mdStartInput.type = 'date';
        mdStartInput.id = 'modalStartDate';
        
        const popoverEndLabelModal = document.createElement('label');
        popoverEndLabelModal.textContent = 'Data Final:';
        popoverEndLabelModal.style.fontSize = '12px';
        const mdEndInput = document.createElement('input');
        mdEndInput.type = 'date';
        mdEndInput.id = 'modalEndDate';
        
        const applyBtnModal = document.createElement('button');
        applyBtnModal.className = 'action-btn';
        applyBtnModal.textContent = 'Aplicar';
        applyBtnModal.style.background = 'var(--accent)';
        applyBtnModal.style.color = '#fff';
        applyBtnModal.style.border = 'none';
        applyBtnModal.style.marginTop = '4px';
        
        const singleDayBtnModal = document.createElement('button');
        singleDayBtnModal.className = 'action-btn';
        singleDayBtnModal.textContent = 'Apenas 1 Dia';
        singleDayBtnModal.style.marginTop = '2px';
        singleDayBtnModal.addEventListener('click', () => {
            mdEndInput.value = mdStartInput.value;
            applyBtnModal.click();
        });
        
        datePopoverModal.append(popoverStartLabelModal, mdStartInput, popoverEndLabelModal, mdEndInput, applyBtnModal, singleDayBtnModal);
        dateSelectorContainerModal.append(dateDisplayBtnModal, datePopoverModal);
        
        let popoverVisibleModal = false;
        dateDisplayBtnModal.addEventListener('click', (e) => {
            e.stopPropagation();
            popoverVisibleModal = !popoverVisibleModal;
            datePopoverModal.style.display = popoverVisibleModal ? 'flex' : 'none';
        });
        
        datePopoverModal.addEventListener('click', (e) => e.stopPropagation());
        
        window.addEventListener('click', () => {
            if (popoverVisibleModal) {
                popoverVisibleModal = false;
                datePopoverModal.style.display = 'none';
            }
        });
        
        applyBtnModal.addEventListener('click', () => {
            const currentId = expandModal.dataset.currentId;
            cardStates[currentId].startDate = mdStartInput.value;
            cardStates[currentId].endDate = mdEndInput.value;
            dateDisplayBtnModal.textContent = formatDisplayDateModal(mdStartInput.value, mdEndInput.value);
            popoverVisibleModal = false;
            datePopoverModal.style.display = 'none';
            updateSingleCard(currentId, true);
        });

        const spanAModal = document.createElement('span');
        spanAModal.textContent = 'a';
        spanAModal.style.fontSize = '12px';

        const msInput = document.createElement('input');
        msInput.type = 'time';
        msInput.id = 'modalStartTime';
        msInput.title = 'Hora Inicial';
        msInput.addEventListener('change', (e) => { cardStates[expandModal.dataset.currentId].start = e.target.value; updateSingleCard(expandModal.dataset.currentId, true); });

        const meInput = document.createElement('input');
        meInput.type = 'time';
        meInput.id = 'modalEndTime';
        meInput.title = 'Hora Final';
        meInput.addEventListener('change', (e) => { cardStates[expandModal.dataset.currentId].end = e.target.value; updateSingleCard(expandModal.dataset.currentId, true); });

        actions.append(dateSelectorContainerModal, msInput, spanAModal, meInput);
        document.querySelector('.modal-actions').prepend(actions);
    }

    document.getElementById('modalStartDate').value = cardStates[id].startDate;
    document.getElementById('modalEndDate').value = cardStates[id].endDate;
    
    const mdDisplay = document.getElementById('modal-date-display');
    if (mdDisplay) {
        const f = (d) => d.split('-').reverse().join('/');
        mdDisplay.textContent = (cardStates[id].startDate === cardStates[id].endDate) ? f(cardStates[id].startDate) : `${f(cardStates[id].startDate)} a ${f(cardStates[id].endDate)}`;
    }
    document.getElementById('modalStartTime').value = cardStates[id].start;
    document.getElementById('modalEndTime').value = cardStates[id].end;

    const { min, max } = getAxisBounds(cardStates[id].startDate, cardStates[id].endDate, cardStates[id].start, cardStates[id].end);

    const base = getBaseOptions();
    
    const scrollContainer = document.getElementById('modalScrollContainer');
    const scrollContent = document.getElementById('modalScrollContent');
    let isSyncingScrollModal = false;
    
    // Remove previous listeners if any (cloning to remove)
    const newScrollContainer = scrollContainer.cloneNode(true);
    scrollContainer.parentNode.replaceChild(newScrollContainer, scrollContainer);
    
    newScrollContainer.addEventListener('scroll', () => {
        if (isSyncingScrollModal) return;
        const scrollPct = newScrollContainer.scrollLeft / (newScrollContainer.scrollWidth - newScrollContainer.clientWidth);
        
        const startDStr = cardStates[id].startDate;
        const endDStr = cardStates[id].endDate;
        const startTStr = cardStates[id].start;
        const endTStr = cardStates[id].end;
        const dayStartMs = new Date(`${startDStr}T${startTStr}:00`).getTime();
        const dayEndMs = new Date(`${endDStr}T${endTStr}:59`).getTime();
        const totalDayMs = dayEndMs - dayStartMs;
        
        if (expandedChartInstance) {
            const ctx = expandedChartInstance.w;
            if (!ctx || !ctx.globals) return;
            const currentMin = ctx.globals.minX;
            const currentMax = ctx.globals.maxX;
            const windowMs = currentMax - currentMin;
            
            const maxScrollMs = totalDayMs - windowMs;
            const newMin = dayStartMs + (scrollPct * maxScrollMs);
            const newMax = newMin + windowMs;
            
            expandedChartInstance.zoomX(newMin, newMax);
        }
    });

    base.chart.events = {
        zoomed: function(chartContext, { xaxis }) {
            const zmin = xaxis.min;
            const zmax = xaxis.max;
            
            const startDStr = cardStates[id].startDate;
            const endDStr = cardStates[id].endDate;
            const startTStr = cardStates[id].start;
            const endTStr = cardStates[id].end;
            const dayStartMs = new Date(`${startDStr}T${startTStr}:00`).getTime();
            const dayEndMs = new Date(`${endDStr}T${endTStr}:59`).getTime();
            const totalDayMs = dayEndMs - dayStartMs;
            
            const windowMs = zmax - zmin;
            
            if (windowMs >= totalDayMs - 60000) {
                newScrollContainer.style.display = 'none';
            } else {
                newScrollContainer.style.display = 'block';
                const ratio = totalDayMs / windowMs;
                document.getElementById('modalScrollContent').style.width = `${ratio * 100}%`;
                
                const scrollPct = (zmin - dayStartMs) / (totalDayMs - windowMs);
                isSyncingScrollModal = true;
                newScrollContainer.scrollLeft = scrollPct * (newScrollContainer.scrollWidth - newScrollContainer.clientWidth);
                setTimeout(() => { isSyncingScrollModal = false; }, 50);
            }
        }
    };

    const expandedOptions = {
        ...base,
        chart: {
            ...base.chart,
            height: '100%',
            id: `expanded-chart`,
            toolbar: { ...base.chart.toolbar, show: true }
        },
        xaxis: {
            ...base.xaxis,
            labels: {
                ...base.xaxis.labels,
                style: { fontSize: '14px' }
            }
        },
        legend: {
            ...base.legend,
            fontSize: '16px',
            markers: { width: 14, height: 14, radius: 2 },
            itemMargin: { horizontal: 20, vertical: 8 },
            height: 80
        },
        colors: generateColors(chartInstances[id].w.config.series),
        yaxis: generateYAxis(chartInstances[id].w.config.series).map(y => ({
            ...y,
            labels: {
                ...y.labels,
                style: { fontSize: '14px' }
            }
        })),
        series: chartInstances[id].w.config.series
    };

    if (expandedChartInstance) {
        expandedChartInstance.destroy();
    }

    expandedChartInstance = new ApexCharts(document.querySelector("#modalChart"), expandedOptions);
    expandedChartInstance.render().then(() => {
        expandedChartInstance.zoomX(min, max);
        // Força tamanho da fonte da legenda via DOM após renderização
        setTimeout(() => {
            const modalEl = document.getElementById('modalChart');
            if (modalEl) {
                modalEl.querySelectorAll('.apexcharts-legend-text').forEach(el => {
                    el.style.setProperty('font-size', '14px', 'important');
                });
                modalEl.querySelectorAll('.apexcharts-legend-marker').forEach(el => {
                    el.style.setProperty('width', '14px', 'important');
                    el.style.setProperty('height', '14px', 'important');
                });
            }
        }, 100);
    });

    expandModal.style.display = 'flex';
    setTimeout(() => {
        expandModal.classList.add('show');
    }, 10);
}

closeBtn.addEventListener('click', () => {
    expandModal.classList.remove('show');
    setTimeout(() => {
        expandModal.style.display = 'none';
        if (expandedChartInstance) {
            expandedChartInstance.destroy();
            expandedChartInstance = null;
        }
    }, 300);
});

window.addEventListener('click', (e) => {
    if (e.target === expandModal) {
        closeBtn.click();
    }
});

searchInput.addEventListener('input', () => {
    const filterText = searchInput.value.toLowerCase();
    const cards = document.querySelectorAll('.chart-card');
    cards.forEach(card => {
        if (card.dataset.name.includes(filterText)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

deselectAllBtn.addEventListener('click', () => {
    if (!expandedChartInstance) return;
    const series = expandedChartInstance.w.config.series;
    
    if (allDeselected) {
        series.forEach(s => {
            const n = s.name.toLowerCase();
            if (!n.includes('irradia') && !(n.includes('piran') && n.includes('2'))) {
                expandedChartInstance.showSeries(s.name);
            }
        });
        deselectAllBtn.textContent = "Desmarcar Todos";
        allDeselected = false;
    } else {
        series.forEach(s => expandedChartInstance.hideSeries(s.name));
        deselectAllBtn.textContent = "Marcar Todos";
        allDeselected = true;
    }
});

setInterval(() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const todayStr = `${y}-${m}-${d}`;
    
    Object.keys(cardStates).forEach(id => {
        if (cardStates[id].endDate === todayStr) {
            updateSingleCard(id);
        }
    });
}, 15000);

init();

async function init() {
    await fetchInitialData();
}

// ==========================================
// DRAG TO SCROLL GLOBAL PARA A LEGENDA
// ==========================================
let isDown = false;
let startX;
let scrollLeft;
let currentLegend = null;

document.addEventListener('mousedown', (e) => {
    const legend = e.target.closest('.apexcharts-legend');
    if (!legend) return;
    
    isDown = true;
    currentLegend = legend;
    startX = e.pageX - currentLegend.offsetLeft;
    scrollLeft = currentLegend.scrollLeft;
});

document.addEventListener('mouseup', () => {
    isDown = false;
    currentLegend = null;
});

document.addEventListener('mousemove', (e) => {
    if (!isDown || !currentLegend) return;
    e.preventDefault(); 
    const x = e.pageX - currentLegend.offsetLeft;
    const walk = (x - startX) * 1.5; // Velocidade do arrasto
    currentLegend.scrollLeft = scrollLeft - walk;
});

// ==========================================
// DESATIVA ZOOM/PAN COM A RODINHA DO MOUSE (SCROLL)
// ==========================================
// Impede que o ApexCharts intercepte a rodinha do mouse, 
// garantindo que o scroll do mouse sempre role a página inteira, e nunca o gráfico.
document.addEventListener('wheel', (e) => {
    if (e.target.closest('.apexcharts-canvas') || e.target.closest('.chart-wrapper')) {
        e.stopPropagation();
    }
}, true);

// ==========================================
// MODAL DE CONFIGURAÇÃO DE CORES
// ==========================================
const colorSettingsBtn = document.getElementById('colorSettingsBtn');
const colorSettingsModal = document.getElementById('colorSettingsModal');
const colorListContainer = document.getElementById('colorListContainer');

if (colorSettingsBtn && colorSettingsModal) {
    colorSettingsBtn.addEventListener('click', () => {
        const uniqueSeries = new Set();
        const currentId = expandModal.dataset.currentId;
        if (currentId && chartInstances[currentId] && chartInstances[currentId].w && chartInstances[currentId].w.config.series) {
            chartInstances[currentId].w.config.series.forEach(s => uniqueSeries.add(s.name));
        }

        const customColors = JSON.parse(localStorage.getItem('customChartColors') || '{}');
        colorListContainer.innerHTML = ''; 

        Array.from(uniqueSeries).sort().forEach(seriesName => {
            let defaultColor = '#ffffff';
            const nameLower = seriesName.toLowerCase();
            if (nameLower.includes('irradia') || (nameLower.includes('piran') && nameLower.includes('2'))) defaultColor = '#f97316';

            const currentColor = customColors[seriesName] || defaultColor;

            const row = document.createElement('div');
            row.style.display = 'flex';
            row.style.justifyContent = 'space-between';
            row.style.alignItems = 'center';
            row.style.padding = '8px 12px';
            row.style.background = 'var(--input-bg)';
            row.style.borderRadius = '4px';

            const label = document.createElement('span');
            label.textContent = seriesName;
            label.style.fontSize = '13px';

            const input = document.createElement('input');
            input.type = 'color';
            input.value = currentColor;
            input.style.cursor = 'pointer';
            input.style.border = 'none';
            input.style.background = 'transparent';
            input.style.width = '30px';
            input.style.height = '30px';
            input.style.padding = '0';

            input.addEventListener('change', (e) => {
                const colors = JSON.parse(localStorage.getItem('customChartColors') || '{}');
                colors[seriesName] = e.target.value;
                localStorage.setItem('customChartColors', JSON.stringify(colors));

                Object.values(chartInstances).forEach(chart => {
                    if (chart && chart.w && chart.w.config.series) {
                        chart.updateOptions({ colors: generateColors(chart.w.config.series) }, false, false, false);
                    }
                });
                if (expandedChartInstance && expandedChartInstance.w && expandedChartInstance.w.config.series) {
                    expandedChartInstance.updateOptions({ colors: generateColors(expandedChartInstance.w.config.series) }, false, false, false);
                }
            });

            row.append(label, input);
            colorListContainer.appendChild(row);
        });

        colorSettingsModal.style.display = 'flex';
        setTimeout(() => colorSettingsModal.classList.add('show'), 10);
    });

    const closeColorBtn = colorSettingsModal.querySelector('.close-color-btn');
    closeColorBtn.addEventListener('click', () => {
        colorSettingsModal.classList.remove('show');
        setTimeout(() => colorSettingsModal.style.display = 'none', 300);
    });

    window.addEventListener('click', (e) => {
        if (e.target === colorSettingsModal) {
            closeColorBtn.click();
        }
    });
}
// Theme Toggle Logic
const themeToggleBtn = document.getElementById('themeToggleBtn');
const themeIconSun = document.getElementById('themeIconSun');
const themeIconMoon = document.getElementById('themeIconMoon');

function updateThemeIcons(theme) {
    if (theme === 'light') {
        themeIconSun.style.display = 'none';
        themeIconMoon.style.display = 'block';
    } else {
        themeIconSun.style.display = 'block';
        themeIconMoon.style.display = 'none';
    }
}
if (themeToggleBtn) {
    updateThemeIcons(savedTheme);
    themeToggleBtn.addEventListener('click', () => {
        const isLight = document.documentElement.classList.toggle('light-mode');
        const newTheme = isLight ? 'light' : 'dark';
        localStorage.setItem('solarTheme', newTheme);
        updateThemeIcons(newTheme);
        
        commonOptions.theme.mode = newTheme;
        
        Object.values(chartInstances).forEach(chart => {
            chart.updateOptions({ theme: { mode: newTheme } }, false, false, false);
        });
        if (expandedChartInstance) {
            expandedChartInstance.updateOptions({ theme: { mode: newTheme } }, false, false, false);
        }
    });
}
