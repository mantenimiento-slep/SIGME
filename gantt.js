// Módulo de Carta Gantt para SIGME 2.0

let zoomLevel = 1;
let ganttData = [];
let itoFiltro = null;

const feriados2026 = [
    '2026-01-01', '2026-04-03', '2026-04-04',
    '2026-05-01', '2026-05-21', '2026-06-29',
    '2026-07-16', '2026-08-15', '2026-09-18',
    '2026-09-19', '2026-10-12', '2026-10-31',
    '2026-11-01', '2026-12-08', '2026-12-25',
];

const rangoNaranjoInicio = new Date(2026, 5, 22);
const rangoNaranjoFin = new Date(2026, 6, 5);

const itosPermitidos = ['Marcelo', 'Malcolm', 'Mario', 'Patricio', 'Jorge'];

function esFeriado(fecha) {
    const fechaStr = fecha.getFullYear() + '-' + 
        String(fecha.getMonth() + 1).padStart(2, '0') + '-' + 
        String(fecha.getDate()).padStart(2, '0');
    return feriados2026.includes(fechaStr);
}

function esRangoNaranjo(fecha) {
    return fecha >= rangoNaranjoInicio && fecha <= rangoNaranjoFin;
}

function parsearFecha(fechaStr) {
    if (!fechaStr) return null;
    fechaStr = fechaStr.trim();
    
    const partesPunto = fechaStr.split('.');
    if (partesPunto.length === 3) {
        const dia = parseInt(partesPunto[0], 10);
        const mes = parseInt(partesPunto[1], 10) - 1;
        let año = parseInt(partesPunto[2], 10);
        if (año < 100) año += 2000;
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) return new Date(año, mes, dia);
    }
    
    const partesGuion = fechaStr.split('-');
    if (partesGuion.length === 3) {
        const dia = parseInt(partesGuion[0], 10);
        const mes = parseInt(partesGuion[1], 10) - 1;
        let año = parseInt(partesGuion[2], 10);
        if (año < 100) año += 2000;
        if (!isNaN(dia) && !isNaN(mes) && !isNaN(año)) return new Date(año, mes, dia);
    }
    
    return null;
}

function codigoDia(fecha) {
    const codigos = ['D', 'L', 'M', 'W', 'J', 'V', 'S'];
    return codigos[fecha.getDay()];
}

function diasHabiles(fechaInicio, fechaFin) {
    let inicio = new Date(fechaInicio);
    let fin = new Date(fechaFin);
    let dias = 0;
    while (inicio <= fin) {
        if (inicio.getDay() !== 0 && inicio.getDay() !== 6) dias++;
        inicio.setDate(inicio.getDate() + 1);
    }
    return dias;
}

function getLineaColorClass(linea) {
    const mapa = {
        'Linea 1': 'linea-color-1',
        'Linea 2': 'linea-color-2',
        'Linea 3': 'linea-color-3',
        'Linea 4': 'linea-color-4',
        'Linea 5': 'linea-color-5',
        'Linea 6': 'linea-color-6',
        'Linea 7': 'linea-color-7',
        'Linea 8': 'linea-color-8',
        'Linea Extra': 'linea-color-extra',
    };
    return mapa[linea] || 'linea-color-sin';
}

function asignarNiveles(ots, fechaInicioPeriodo, fechaFinPeriodo, totalDias) {
    const barras = ots.map((ot) => {
        const inicio = parsearFecha(ot.fechaInicio);
        const fin = parsearFecha(ot.fechaFin);
        if (!inicio || !fin) return null;
        
        const inicioVisible = inicio < fechaInicioPeriodo ? fechaInicioPeriodo : inicio;
        const finVisible = fin > fechaFinPeriodo ? fechaFinPeriodo : fin;
        
        const inicioOffset = (inicioVisible - fechaInicioPeriodo) / (1000 * 60 * 60 * 24);
        const duracion = Math.max((finVisible - inicioVisible) / (1000 * 60 * 60 * 24) + 1, 1);
        const leftPercent = (inicioOffset / totalDias) * 100;
        const widthPercent = (duracion / totalDias) * 100;
        
        return {
            ot, inicio, fin, inicioVisible, finVisible,
            leftPercent: Math.max(0, leftPercent),
            widthPercent: Math.max(0.3, widthPercent),
            nivel: 0
        };
    }).filter(b => b !== null);
    
    barras.sort((a, b) => a.inicioVisible - b.inicioVisible);
    
    barras.forEach((barra, i) => {
        let nivelAsignado = 0;
        let encontrado = false;
        while (!encontrado) {
            encontrado = true;
            for (let j = 0; j < i; j++) {
                if (barras[j].nivel === nivelAsignado && barra.inicioVisible <= barras[j].finVisible) {
                    encontrado = false;
                    nivelAsignado++;
                    break;
                }
            }
        }
        barra.nivel = nivelAsignado;
    });
    
    const maxNivel = Math.max(...barras.map(b => b.nivel), 0);
    return barras.map(b => ({
        ...b,
        topPosition: b.nivel * 30 + 4,
        alturaFila: (maxNivel + 1) * 30 + 8
    }));
}

function inicializarGantt() {
    ganttData = todasLasOTs.filter(ot => ot.fechaInicio && ot.fechaFin);
    llenarFiltroITO();
    renderizarGantt();
}

function llenarFiltroITO() {
    const filterITO = document.getElementById('filterITO');
    if (!filterITO) return;
    
    filterITO.innerHTML = '<option value="">Todos los ITO</option>';
    const itosUnicos = [...new Set(ganttData.map(ot => ot.ito).filter(Boolean))].sort();
    itosUnicos.forEach(ito => {
        const nombreBase = ito.split(' ')[0];
        if (itosPermitidos.some(p => nombreBase === p || ito.includes(p))) {
            const option = document.createElement('option');
            option.value = ito;
            option.textContent = ito;
            filterITO.appendChild(option);
        }
    });
}

function renderizarGantt() {
    const ganttChart = document.getElementById('ganttChart');
    if (!ganttChart) return;
    if (ganttData.length === 0) {
        ganttChart.innerHTML = '<div class="error"><p>No hay OTs con fechas definidas</p></div>';
        return;
    }
    
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(fechaInicio.getDate() - 42);
    
    const fechaFin = new Date(hoy);
    fechaFin.setDate(fechaFin.getDate() + 56);
    
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const lineaFiltro = document.getElementById('filterLinea').value;
    const estadoFiltro = document.getElementById('filterEstado').value;
    const recintoSearch = document.getElementById('filterRecinto') ? document.getElementById('filterRecinto').value.toLowerCase() : '';
    itoFiltro = document.getElementById('filterITO') ? document.getElementById('filterITO').value : null;
    
    let otsFiltradas = ganttData.filter(ot => {
        const inicio = parsearFecha(ot.fechaInicio);
        const fin = parsearFecha(ot.fechaFin);
        if (!inicio || !fin) return false;
        if (fin < fechaInicio || inicio > fechaFin) return false;
        
        const matchSearch = !searchTerm || 
            ot.nombreRecinto.toLowerCase().includes(searchTerm) ||
            ot.ito.toLowerCase().includes(searchTerm) ||
            ot.numeroOT.toLowerCase().includes(searchTerm);
        const matchLineaFiltro = !lineaFiltro || ot.lineaTrabajo === lineaFiltro;
        const matchEstado = !estadoFiltro || ot.estado === estadoFiltro;
        const matchRecinto = !recintoSearch || ot.nombreRecinto.toLowerCase().includes(recintoSearch);
        const matchITO = !itoFiltro || ot.ito === itoFiltro;
        
        return matchSearch && matchLineaFiltro && matchEstado && matchRecinto && matchITO;
    });
    
    if (otsFiltradas.length === 0) {
        ganttChart.innerHTML = '<div class="error"><p>No se encontraron OTs</p></div>';
        return;
    }
    
    otsFiltradas.sort((a, b) => {
        const orden = ['Linea 1','Linea 2','Linea 3','Linea 4','Linea 5','Linea 6','Linea 7','Linea 8'];
        const idxA = orden.indexOf(a.lineaTrabajo);
        const idxB = orden.indexOf(b.lineaTrabajo);
        if (idxA !== -1 && idxB !== -1) return idxA - idxB;
        if (idxA !== -1) return -1;
        if (idxB !== -1) return 1;
        return (a.lineaTrabajo || '').localeCompare(b.lineaTrabajo || '');
    });
    
    const columnas = [];
    let fechaActual = new Date(fechaInicio);
    while (fechaActual <= fechaFin) {
        columnas.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + zoomLevel);
    }
    
    const totalDias = (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24);
    
    const grupos = {};
    otsFiltradas.forEach(ot => {
        const linea = ot.lineaTrabajo || 'Sin linea asignada';
        if (!grupos[linea]) grupos[linea] = [];
        grupos[linea].push(ot);
    });
    
    let html = '<div style="height:100%;display:flex;flex-direction:column;">';
    html += '<div style="padding:5px 10px;background:#e8f5e9;font-size:0.75rem;flex-shrink:0;border-radius:4px;margin:3px;">';
    html += formatearFecha(fechaInicio) + ' → ' + formatearFecha(fechaFin) + ' | ' + otsFiltradas.length + ' OT';
    html += '</div>';
    html += '<div style="flex:1;overflow:auto;position:relative;">';
    html += '<table class="gantt-table"><thead><tr><th class="col-recinto" style="width:170px;">Linea de Trabajo</th>';
    
    const meses = {};
    columnas.forEach(fecha => {
        const key = fecha.getFullYear() + '-' + fecha.getMonth();
        if (!meses[key]) meses[key] = { fecha: new Date(fecha), dias: 0 };
        meses[key].dias++;
    });
    
    Object.values(meses).forEach(mes => {
        html += '<th colspan="' + mes.dias + '" style="background:#e3f2fd;text-align:center;padding:3px;font-size:0.7rem;">' + 
            mes.fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }) + '</th>';
    });
    
    html += '</tr><tr><th class="col-recinto" style="width:170px;font-size:0.7rem;">Establecimientos</th>';
    
    columnas.forEach(fecha => {
        const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
        const esHoy = fecha.toDateString() === hoy.toDateString();
        const esFeriadoFlag = esFeriado(fecha);
        const esNaranjo = esRangoNaranjo(fecha);
        
        let estilo = '';
        if (esNaranjo) estilo = 'background:#FFE0B2;font-weight:bold;color:#E65100;';
        else if (esFeriadoFlag) estilo = 'background:#FFCDD2;font-weight:bold;color:#B71C1C;';
        else if (esHoy) estilo = 'background:#FFF9C4;font-weight:bold;color:#F57F17;';
        else if (esFinde) estilo = 'background:#F5F5F5;color:#9E9E9E;';
        
        html += '<th style="' + estilo + 'padding:2px;text-align:center;font-size:0.68rem;">' + 
            fecha.getDate() + '<br><small>' + ['Do','Lu','Ma','Mi','Ju','Vi','Sa'][fecha.getDay()] + '</small></th>';
    });
    
    html += '</tr></thead><tbody>';
    
    Object.entries(grupos).forEach(([linea, ots]) => {
        const totalRecintos = new Set(ots.map(ot => ot.nombreRecinto)).size;
        const barrasConNiveles = asignarNiveles(ots, fechaInicio, fechaFin, totalDias);
        const alturaFila = Math.max(barrasConNiveles[0] ? barrasConNiveles[0].alturaFila : 50, 50);
        const colorClass = getLineaColorClass(linea);
        
        html += '<tr class="linea-row"><td class="col-recinto ' + colorClass + 
            '" style="font-weight:600;color:#1A237E;border-bottom:2px solid #B0BEC5;padding:6px 8px;vertical-align:top;font-size:0.72rem;">' +
            '<div style="margin-bottom:1px;"><i class="fas fa-layer-group"></i> ' + linea + '</div>' +
            '<div style="font-size:0.62rem;color:#5C6BC0;">' + ots.length + ' OT | ' + totalRecintos + ' EE</div></td>' +
            '<td colspan="' + columnas.length + '" style="position:relative;padding:4px 2px;vertical-align:top;">' +
            '<div style="position:relative;width:100%;min-height:' + alturaFila + 'px;">';
        
        barrasConNiveles.forEach((barra) => {
            const ot = barra.ot;
            const estadoClass = (ot.estado || 'sin-estado').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '-');
            
            const colores = {
                'programada': '#5C9CE6',
                'en-proceso': '#F5A623',
                'completada': '#5CB85C',
                'cancelada': '#E05555',
                'recepcion-conforme': '#5CB85C',
                'sin-estado': '#A0A0A0'
            };
            
            const color = colores[estadoClass] || '#78909C';
            let opacidad = (itoFiltro && ot.ito !== itoFiltro) ? 0.2 : 1;
            
            const duracionHabiles = diasHabiles(barra.inicio, barra.fin);
            const presupuestoNum = parseFloat(String(ot.presupuesto).replace(/[^0-9.-]+/g, '')) || 0;
            const presupuestoFormateado = new Intl.NumberFormat('es-CL', {
                style: 'currency', currency: 'CLP', minimumFractionDigits: 0, maximumFractionDigits: 0
            }).format(presupuestoNum);
            
            const codigoInicio = codigoDia(barra.inicio);
            const codigoFin = codigoDia(barra.fin);
            
            const tooltipHTML = '<div style="font-family:sans-serif;padding:10px;min-width:280px;">' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:8px;">' +
                '<strong style="font-size:1rem;color:#1A237E;">' + ot.nombreRecinto + '</strong>' +
                '<strong style="font-size:1rem;color:#1565C0;">' + ot.numeroOT + '</strong></div>' +
                '<div style="display:flex;justify-content:space-between;margin-bottom:8px;padding-bottom:8px;border-bottom:1px solid #E0E0E0;">' +
                '<span>' + ot.ito + '</span>' +
                '<span style="font-weight:bold;color:#ED56A1;font-size:1.1rem;">' + duracionHabiles + 'd</span></div>' +
                '<div style="margin-bottom:4px;font-size:0.9rem;"><strong>' + codigoInicio + '</strong> ' + ot.fechaInicio + '</div>' +
                '<div style="margin-bottom:8px;font-size:0.9rem;"><strong>' + codigoFin + '</strong> ' + ot.fechaFin + '</div>' +
                '<div style="margin-bottom:8px;padding:6px;background:#F5F5F5;border-radius:4px;">' +
                '<strong style="font-size:0.8rem;">TIPO INTERVENCION</strong><br>' +
                '<span style="font-size:0.85rem;">' + ot.tipoIntervencion + '</span></div>' +
                '<div style="text-align:right;font-weight:bold;font-size:1rem;color:#2E7D32;">Total: ' + presupuestoFormateado + '</div></div>';
            
            const tooltipEscaped = tooltipHTML.replace(/"/g, '&quot;').replace(/'/g, "&#39;");
            const textoBarra = ot.numeroOT + ' - ' + ot.nombreRecinto;
            
            html += '<div class="gantt-bar-chevron gantt-tooltip-trigger" ' +
                'style="left:' + barra.leftPercent + '%;width:' + Math.max(barra.widthPercent, 0.3) + '%;' +
                'top:' + barra.topPosition + 'px;position:absolute;background:' + color + ';opacity:' + opacidad + ';" ' +
                'data-tooltip="' + tooltipEscaped + '">' +
                '<span style="line-height:1.1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">' + textoBarra + '</span></div>';
        });
        
        html += '</div></td></tr>';
        html += '<tr><td colspan="' + (columnas.length + 1) + '" style="padding:0;height:2px;background:#E0E0E0;"></td></tr>';
    });
    
    html += '</tbody></table>';
    
    if (hoy >= fechaInicio && hoy <= fechaFin) {
        const hoyOffset = (hoy - fechaInicio) / (1000 * 60 * 60 * 24);
        const hoyPercent = Math.max(0, Math.min(100, (hoyOffset / totalDias) * 100));
        html += '<div class="today-line" style="left:' + hoyPercent + '%;"></div>';
    }
    
    html += '</div></div>';
    
    ganttChart.innerHTML = html;
    
    setTimeout(() => {
        const container = ganttChart.querySelector('div[style*="overflow:auto"]');
        if (container) {
            const tabla = container.querySelector('table');
            if (tabla && hoy >= fechaInicio && hoy <= fechaFin) {
                const hoyOffset = (hoy - fechaInicio) / (1000 * 60 * 60 * 24);
                const hoyPercent = (hoyOffset / totalDias) * 100;
                const hoyPosition = (hoyPercent / 100) * tabla.offsetWidth;
                container.scrollLeft = hoyPosition - (container.clientWidth / 3);
            }
        }
    }, 100);
    
    inicializarTooltips();
}

function inicializarTooltips() {
    const existingTooltip = document.getElementById('gantt-custom-tooltip');
    if (existingTooltip) existingTooltip.remove();
    
    const tooltip = document.createElement('div');
    tooltip.id = 'gantt-custom-tooltip';
    tooltip.style.cssText = 'position:fixed;background:white;border:2px solid #E0E0E0;border-radius:12px;box-shadow:0 8px 24px rgba(0,0,0,0.15);padding:0;z-index:10000;display:none;pointer-events:none;max-width:360px;';
    document.body.appendChild(tooltip);
    
    document.querySelectorAll('.gantt-tooltip-trigger').forEach(bar => {
        bar.addEventListener('mouseenter', function(e) {
            tooltip.innerHTML = this.getAttribute('data-tooltip');
            tooltip.style.display = 'block';
            const rect = this.getBoundingClientRect();
            let left = rect.left + rect.width / 2;
            let top = rect.bottom + 10;
            if (left + 180 > window.innerWidth) left = window.innerWidth - 370;
            if (top + 250 > window.innerHeight) top = rect.top - 260;
            if (left < 10) left = 10;
            tooltip.style.left = left + 'px';
            tooltip.style.top = top + 'px';
        });
        bar.addEventListener('mouseleave', function() {
            tooltip.style.display = 'none';
        });
    });
}

function zoomGantt(direction) {
    zoomLevel = Math.max(1, Math.min(14, zoomLevel + direction));
    renderizarGantt();
}

function scrollGantt(direction) {
    const container = document.querySelector('#ganttChart div[style*="overflow:auto"]');
    if (!container) return;
    
    if (direction === 'left') {
        container.scrollBy({ left: -300, behavior: 'smooth' });
    } else if (direction === 'right') {
        container.scrollBy({ left: 300, behavior: 'smooth' });
    } else if (direction === 'today') {
        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const fechaInicio = new Date(hoy);
        fechaInicio.setDate(fechaInicio.getDate() - 42);
        const fechaFin = new Date(hoy);
        fechaFin.setDate(fechaFin.getDate() + 56);
        const totalDias = (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24);
        const hoyOffset = (hoy - fechaInicio) / (1000 * 60 * 60 * 24);
        const hoyPercent = (hoyOffset / totalDias) * 100;
        const tabla = container.querySelector('table');
        if (tabla) {
            const hoyPosition = (hoyPercent / 100) * tabla.offsetWidth;
            container.scrollTo({ left: hoyPosition - (container.clientWidth / 3), behavior: 'smooth' });
        }
    }
}

function formatearFecha(fecha) {
    return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
