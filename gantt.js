// Módulo de Carta Gantt para SIGME 2.0 - Filas por LÍNEA DE TRABAJO

let zoomLevel = 1;
let ganttData = [];

function inicializarGantt() {
    ganttData = todasLasOTs.filter(ot => ot.fechaInicio && ot.fechaFin);
    renderizarGantt();
}

function renderizarGantt() {
    const ganttChart = document.getElementById('ganttChart');
    
    if (!ganttChart) return;
    
    if (ganttData.length === 0) {
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><p>No hay OTs con fechas definidas</p></div>';
        return;
    }
    
    // Aplicar filtros
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const lineaFiltro = document.getElementById('filterLinea').value;
    const estadoFiltro = document.getElementById('filterEstado').value;
    const tipoFiltro = document.getElementById('filterTipo').value;
    
    let otsFiltradas = ganttData.filter(ot => {
        const matchSearch = !searchTerm || 
            ot.nombreRecinto.toLowerCase().includes(searchTerm) ||
            ot.ito.toLowerCase().includes(searchTerm) ||
            ot.numeroOT.toLowerCase().includes(searchTerm);
        const matchLinea = !lineaFiltro || ot.lineaTrabajo === lineaFiltro;
        const matchEstado = !estadoFiltro || ot.estado === estadoFiltro;
        const matchTipo = !tipoFiltro || ot.tipoIntervencion === tipoFiltro;
        
        return matchSearch && matchLinea && matchEstado && matchTipo;
    });
    
    if (otsFiltradas.length === 0) {
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-search"></i><p>No se encontraron OTs con los filtros actuales</p></div>';
        return;
    }
    
    // Ordenar por línea de trabajo y luego por recinto
    otsFiltradas.sort((a, b) => {
        if (a.lineaTrabajo !== b.lineaTrabajo) return a.lineaTrabajo.localeCompare(b.lineaTrabajo);
        return a.nombreRecinto.localeCompare(b.nombreRecinto);
    });
    
    // Calcular rango de fechas
    const fechas = otsFiltradas.flatMap(ot => {
        const inicio = new Date(ot.fechaInicio);
        const fin = new Date(ot.fechaFin);
        return isNaN(inicio.getTime()) || isNaN(fin.getTime()) ? [] : [inicio, fin];
    });
    
    if (fechas.length === 0) {
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><p>Fechas no válidas</p></div>';
        return;
    }
    
    const minFecha = new Date(Math.min(...fechas));
    const maxFecha = new Date(Math.max(...fechas));
    
    minFecha.setDate(1);
    maxFecha.setMonth(maxFecha.getMonth() + 1, 0);
    
    // Columnas de días
    const columnas = [];
    let fechaActual = new Date(minFecha);
    while (fechaActual <= maxFecha) {
        columnas.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + zoomLevel);
    }
    
    const totalDias = (maxFecha - minFecha) / (1000 * 60 * 60 * 24);
    
    // Agrupar por LÍNEA DE TRABAJO
    const grupos = {};
    otsFiltradas.forEach(ot => {
        const linea = ot.lineaTrabajo || 'Sin línea asignada';
        if (!grupos[linea]) {
            grupos[linea] = [];
        }
        grupos[linea].push(ot);
    });
    
    // Construir HTML
    let html = '<div style="overflow-x: auto;">';
    html += '<table class="gantt-table"><thead><tr><th class="col-recinto">Línea de Trabajo</th>';
    
    // Headers de meses
    const meses = {};
    columnas.forEach(fecha => {
        const key = `${fecha.getFullYear()}-${fecha.getMonth()}`;
        if (!meses[key]) {
            meses[key] = { fecha: new Date(fecha), dias: 0 };
        }
        meses[key].dias++;
    });
    
    Object.values(meses).forEach(mes => {
        const nombreMes = mes.fecha.toLocaleDateString('es-CL', { month: 'long', year: 'numeric' });
        html += `<th colspan="${mes.dias}">${nombreMes}</th>`;
    });
    
    html += '</tr><tr><th class="col-recinto">Establecimientos</th>';
    
    columnas.forEach(fecha => {
        const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
        const clase = esFinde ? 'weekend' : '';
        html += `<th class="${clase}">${fecha.getDate()}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // FILAS = LÍNEAS DE TRABAJO
    Object.entries(grupos).forEach(([linea, ots]) => {
        const totalRecintos = new Set(ots.map(ot => ot.nombreRecinto)).size;
        
        html += `<tr class="linea-row">
            <td class="col-recinto" style="background: #f0f4ff; font-weight: 600; color: #1557b0; border-bottom: 2px solid #1a73e8;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span><i class="fas fa-layer-group"></i> ${linea}</span>
                    <span style="font-size: 0.75rem; color: #5f6368;">${ots.length} OT | ${totalRecintos} EE</span>
                </div>
            </td>
            <td colspan="${columnas.length}" style="position: relative; padding: 8px 4px; background: #fafbff; min-height: ${Math.max(ots.length * 35, 60)}px;">
                <div style="position: relative; width: 100%; min-height: ${Math.max(ots.length * 35, 50)}px;">`;
        
        // Barras de cada OT
        ots.forEach((ot, index) => {
            const inicio = new Date(ot.fechaInicio);
            const fin = new Date(ot.fechaFin);
            
            if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return;
            
            const inicioOffset = (inicio - minFecha) / (1000 * 60 * 60 * 24);
            const duracion = Math.max((fin - inicio) / (1000 * 60 * 60 * 24) + 1, 1);
            
            const leftPercent = (inicioOffset / totalDias) * 100;
            const widthPercent = (duracion / totalDias) * 100;
            
            const estadoClass = (ot.estado || 'sin-estado').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');
            
            const topPosition = (index * 32) + 4;
            
            const tooltip = `OT #${ot.numeroOT}\nEstablecimiento: ${ot.nombreRecinto}\nTipo: ${ot.tipoIntervencion}\nInicio: ${ot.fechaInicio}\nFin: ${ot.fechaFin}\nEstado: ${ot.estado}\nITO: ${ot.ito}`;
            
            html += `<div class="gantt-bar ${estadoClass}" 
                style="left: ${leftPercent}%; width: ${Math.max(widthPercent, 0.3)}%; top: ${topPosition}px; position: absolute;"
                title="${tooltip.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}">
                <span class="bar-label">${ot.numeroOT}</span>
                <span class="bar-recinto">${ot.nombreRecinto}</span>
            </div>`;
        });
        
        html += `</div></td></tr>`;
        
        // Separador entre líneas
        html += `<tr><td colspan="${columnas.length + 1}" style="padding: 0; height: 4px; background: #e8eaed;"></td></tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // Marcador de HOY
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (hoy >= minFecha && hoy <= maxFecha) {
        const hoyOffset = (hoy - minFecha) / (1000 * 60 * 60 * 24);
        const hoyPercent = (hoyOffset / totalDias) * 100;
        html += `<div class="today-marker" style="left: ${hoyPercent}%"></div>`;
    }
    
    ganttChart.innerHTML = html;
}

function zoomGantt(direction) {
    zoomLevel = Math.max(1, Math.min(30, zoomLevel + direction));
    renderizarGantt();
}

function scrollGantt(direction) {
    const ganttChart = document.getElementById('ganttChart');
    const scrollAmount = 400;
    
    if (direction === 'left') {
        ganttChart.scrollLeft -= scrollAmount;
    } else if (direction === 'right') {
        ganttChart.scrollLeft += scrollAmount;
    } else if (direction === 'today') {
        ganttChart.scrollLeft = ganttChart.scrollWidth / 3;
    }
}
