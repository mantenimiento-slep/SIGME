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
    
    // Ordenar por línea de trabajo y recinto
    otsFiltradas.sort((a, b) => {
        if (a.lineaTrabajo !== b.lineaTrabajo) return a.lineaTrabajo.localeCompare(b.lineaTrabajo);
        return a.nombreRecinto.localeCompare(b.nombreRecinto);
    });
    
    // Calcular rango de fechas
    const fechas = otsFiltradas.flatMap(ot => [new Date(ot.fechaInicio), new Date(ot.fechaFin)]);
    const minFecha = new Date(Math.min(...fechas));
    const maxFecha = new Date(Math.max(...fechas));
    
    // Extender rango para mostrar meses completos
    minFecha.setDate(1); // Primer día del mes
    maxFecha.setMonth(maxFecha.getMonth() + 1, 0); // Último día del mes
    
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
        if (!grupos[ot.lineaTrabajo]) {
            grupos[ot.lineaTrabajo] = [];
        }
        grupos[ot.lineaTrabajo].push(ot);
    });
    
    // Construir tabla
    let html = '<table class="gantt-table"><thead><tr><th class="col-recinto">Establecimiento / Línea</th>';
    
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
            if (!recintos[ot.nombreRecinto]) {
                recintos[ot.nombreRecinto] = [];
            }
            recintos[ot.nombreRecinto].push(ot);
        });
        
        // Filas por recinto
        Object.entries(recintos).forEach(([recinto, otsRecinto]) => {
            html += `<tr><td class="col-recinto">
                <i class="fas fa-school"></i> ${recinto}
                <small style="color: var(--text-secondary);">(${otsRecinto.length} OT)</small>
            </td>`;
            
            // Celdas para cada columna de día
            columnas.forEach(fecha => {
                const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
                const clase = esFinde ? 'weekend' : '';
                html += `<td class="${clase}" style="position: relative; min-height: 30px;">`;
                
                // Buscar OTs que estén activas en esta fecha
                otsRecinto.forEach(ot => {
                    const inicio = new Date(ot.fechaInicio);
                    const fin = new Date(ot.fechaFin);
                    const fechaActualFin = new Date(fecha);
                    fechaActualFin.setDate(fechaActualFin.getDate() + zoomLevel - 1);
                    
                    if (inicio <= fechaActualFin && fin >= fecha) {
                        // Calcular posición y ancho de la barra
                        const duracionTotal = (maxFecha - minFecha) / (1000 * 60 * 60 * 24);
                        const inicioOffset = (inicio - minFecha) / (1000 * 60 * 60 * 24);
                        const duracionOT = (fin - inicio) / (1000 * 60 * 60 * 24) + 1;
                        
                        const leftPercent = (inicioOffset / columnas.length) * 100;
                        const widthPercent = (duracionOT / columnas.length) * 100;
                        
                        const estadoClass = (ot.estado || 'sin-estado').toLowerCase().replace(/\s+/g, '-');
                        const tooltip = `${ot.numeroOT} - ${ot.tipoIntervencion}<br>
                            Inicio: ${ot.fechaInicio}<br>
                            Fin: ${ot.fechaFin}<br>
                            Estado: ${ot.estado}<br>
                            Presupuesto: ${ot.presupuesto}`;
                        
                        html += `<div class="gantt-bar ${estadoClass}" 
                            style="left: ${leftPercent}%; width: ${widthPercent}%;"
                            onmouseover="mostrarTooltip(event, '${tooltip.replace(/'/g, "\\'")}')"
                            onmouseout="ocultarTooltip()"
                            onclick="mostrarDetalleOT('${ot.numeroOT}')">
                            ${ot.numeroOT}
                        </div>`;
                    }
                });
                
                html += '</td>';
            });
            
            html += '</tr>';
        });
    });
    
    html += '</tbody></table>';
    
    // Agregar marcador de hoy
    const hoy = new Date();
    if (hoy >= minFecha && hoy <= maxFecha) {
        const hoyOffset = ((hoy - minFecha) / (1000 * 60 * 60 * 24));
        const hoyPercent = (hoyOffset / columnas.length) * 100;
        html += `<div class="today-marker" style="left: ${hoyPercent}%"></div>`;
    }
    
    ganttChart.innerHTML = html;
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
        // Encontrar la columna de hoy y hacer scroll hasta ella
        const hoy = new Date();
        // Implementación simplificada: scroll al centro
        ganttChart.scrollLeft = ganttChart.scrollWidth / 3;
    }
}

// Tooltip
function mostrarTooltip(event, texto) {
    let tooltip = document.getElementById('ganttTooltip');
    if (!tooltip) {
        tooltip = document.createElement('div');
        tooltip.id = 'ganttTooltip';
        tooltip.className = 'gantt-tooltip';
        document.body.appendChild(tooltip);
    }
    
    tooltip.innerHTML = texto.replace(/\n/g, '<br>');
    tooltip.style.display = 'block';
    tooltip.style.left = (event.pageX + 10) + 'px';
    tooltip.style.top = (event.pageY - 10) + 'px';
}

function ocultarTooltip() {
    const tooltip = document.getElementById('ganttTooltip');
    if (tooltip) {
        tooltip.style.display = 'none';
    }
}

// Mostrar detalle de OT
function mostrarDetalleOT(numeroOT) {
    const ot = todasLasOTs.find(o => o.numeroOT === numeroOT);
    if (ot) {
        alert(`OT #${ot.numeroOT}\n\n` +
              `Recinto: ${ot.nombreRecinto}\n` +
              `Tipo: ${ot.tipoIntervencion}\n` +
              `Estado: ${ot.estado}\n` +
              `Inicio: ${ot.fechaInicio}\n` +
              `Fin: ${ot.fechaFin}\n` +
              `Presupuesto: ${ot.presupuesto}\n` +
              `ITO: ${ot.ito}`);
    }
}

// Cambiar vista
function cambiarVista(vista) {
    const ganttView = document.getElementById('ganttView');
    const tarjetasView = document.getElementById('tarjetasView');
    const botones = document.querySelectorAll('.view-btn');
    
    botones.forEach(btn => btn.classList.remove('active'));
    
    if (vista === 'gantt') {
        ganttView.style.display = 'block';
        tarjetasView.style.display = 'none';
        inicializarGantt();
        document.querySelector('.view-btn:nth-child(1)').classList.add('active');
    } else {
        ganttView.style.display = 'none';
        tarjetasView.style.display = 'block';
        document.querySelector('.view-btn:nth-child(2)').classList.add('active');
    }
}
