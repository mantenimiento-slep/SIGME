// Módulo de Carta Gantt para SIGME 2.0

let zoomLevel = 1; // Días por columna (1 = 1 día, 2 = 2 días, etc.)
let ganttData = [];

// Inicializar Gantt
function inicializarGantt() {
    ganttData = todasLasOTs.filter(ot => ot.fechaInicio && ot.fechaFin);
    renderizarGantt();
}

// Renderizar carta Gantt
function renderizarGantt() {
    const ganttChart = document.getElementById('ganttChart');
    
    if (!ganttChart) return;
    
    if (ganttData.length === 0) {
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><p>No hay OTs con fechas definidas para mostrar en la carta Gantt</p></div>';
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
    
    // Ordenar por línea de trabajo y recinto
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
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i><p>Las fechas de las OTs no tienen un formato válido</p></div>';
        return;
    }
    
    const minFecha = new Date(Math.min(...fechas));
    const maxFecha = new Date(Math.max(...fechas));
    
    // Extender rango para mostrar meses completos
    minFecha.setDate(1);
    maxFecha.setMonth(maxFecha.getMonth() + 1, 0);
    
    // Generar columnas de días
    const columnas = [];
    let fechaActual = new Date(minFecha);
    while (fechaActual <= maxFecha) {
        columnas.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + zoomLevel);
    }
    
    // Agrupar por línea de trabajo
    const grupos = {};
    otsFiltradas.forEach(ot => {
        const linea = ot.lineaTrabajo || 'Sin línea';
        if (!grupos[linea]) {
            grupos[linea] = [];
        }
        grupos[linea].push(ot);
    });
    
    // Construir tabla HTML
    let html = '<div style="overflow-x: auto;">';
    html += '<table class="gantt-table"><thead><tr><th class="col-recinto">Establecimiento / Línea</th>';
    
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
    
    html += '</tr><tr><th class="col-recinto">Día</th>';
    
    columnas.forEach(fecha => {
        const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
        const clase = esFinde ? 'weekend' : '';
        html += `<th class="${clase}">${fecha.getDate()}</th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // Filas de datos
    Object.entries(grupos).forEach(([linea, ots]) => {
        // Fila de línea de trabajo
        html += `<tr><td class="col-linea" colspan="${columnas.length + 1}">
            <i class="fas fa-layer-group"></i> ${linea} (${ots.length} OT)
        </td></tr>`;
        
        // Agrupar OTs por recinto
        const recintos = {};
        ots.forEach(ot => {
            const recinto = ot.nombreRecinto || 'Sin recinto';
            if (!recintos[recinto]) {
                recintos[recinto] = [];
            }
            recintos[recinto].push(ot);
        });
        
        // Filas por recinto
        Object.entries(recintos).forEach(([recinto, otsRecinto]) => {
            html += `<tr><td class="col-recinto">
                <i class="fas fa-school"></i> ${recinto}
                <small style="color: var(--text-secondary);">(${otsRecinto.length} OT)</small>
            </td>`;
            
            // Una celda grande que contiene todas las barras
            html += `<td colspan="${columnas.length}" style="position: relative; padding: 4px 0; min-height: 40px;">`;
            
            // Contenedor para las barras
            otsRecinto.forEach(ot => {
                const inicio = new Date(ot.fechaInicio);
                const fin = new Date(ot.fechaFin);
                
                if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return;
                
                const totalDias = (maxFecha - minFecha) / (1000 * 60 * 60 * 24);
                const inicioOffset = (inicio - minFecha) / (1000 * 60 * 60 * 24);
                const duracion = (fin - inicio) / (1000 * 60 * 60 * 24) + 1;
                
                const leftPercent = (inicioOffset / totalDias) * 100;
                const widthPercent = (duracion / totalDias) * 100;
                
                const estadoClass = (ot.estado || 'sin-estado').toLowerCase()
                    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                    .replace(/\s+/g, '-');
                
                const tooltipText = `OT #${ot.numeroOT} - ${ot.tipoIntervencion}\n` +
                    `Inicio: ${ot.fechaInicio}\n` +
                    `Fin: ${ot.fechaFin}\n` +
                    `Estado: ${ot.estado}\n` +
                    `Presupuesto: ${ot.presupuesto}`;
                
                html += `<div class="gantt-bar ${estadoClass}" 
                    style="left: ${leftPercent}%; width: ${Math.max(widthPercent, 0.5)}%;"
                    title="${tooltipText.replace(/"/g, '&quot;')}"
                    data-ot='${JSON.stringify(ot).replace(/'/g, "&#39;")}'>
                    ${ot.numeroOT}
                </div>`;
            });
            
            html += '</td></tr>';
        });
    });
    
    html += '</tbody></table></div>';
    
    // Agregar marcador de hoy
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    if (hoy >= minFecha && hoy <= maxFecha) {
        const hoyOffset = (hoy - minFecha) / (1000 * 60 * 60 * 24);
        const totalDias = (maxFecha - minFecha) / (1000 * 60 * 60 * 24);
        const hoyPercent = (hoyOffset / totalDias) * 100;
        html += `<div class="today-marker" style="left: ${hoyPercent}%"></div>`;
    }
    
    ganttChart.innerHTML = html;
    
    // Agregar event listeners a las barras
    document.querySelectorAll('.gantt-bar').forEach(bar => {
        bar.addEventListener('click', function() {
            const otData = JSON.parse(this.getAttribute('data-ot'));
            mostrarDetalleOT(otData);
        });
    });
}

// Zoom del Gantt
function zoomGantt(direction) {
    zoomLevel = Math.max(1, Math.min(30, zoomLevel + direction));
    renderizarGantt();
}

// Scroll del Gantt
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

// Mostrar detalle de OT
function mostrarDetalleOT(ot) {
    if (!ot) return;
    
    const mensaje = `OT #${ot.numeroOT}\n\n` +
        `Recinto: ${ot.nombreRecinto}\n` +
        `Tipo: ${ot.tipoIntervencion}\n` +
        `Estado: ${ot.estado}\n` +
        `Inicio: ${ot.fechaInicio}\n` +
        `Fin: ${ot.fechaFin}\n` +
        `Presupuesto: ${ot.presupuesto}\n` +
        `ITO: ${ot.ito}\n` +
        `Línea: ${ot.lineaTrabajo}`;
    
    alert(mensaje);
}
