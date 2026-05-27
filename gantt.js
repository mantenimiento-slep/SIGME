// Módulo de Carta Gantt para SIGME 2.0 - VERSIÓN PRUEBA ACOTADA

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
    
    // Calcular período: 3 semanas atrás + 8 semanas adelante
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    const fechaInicio = new Date(hoy);
    fechaInicio.setDate(fechaInicio.getDate() - 21); // 3 semanas atrás
    
    const fechaFin = new Date(hoy);
    fechaFin.setDate(fechaFin.getDate() + 56); // 8 semanas adelante
    
    // Aplicar filtros
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const lineaFiltro = document.getElementById('filterLinea').value;
    const estadoFiltro = document.getElementById('filterEstado').value;
    const tipoFiltro = document.getElementById('filterTipo').value;
    
    let otsFiltradas = ganttData.filter(ot => {
        const inicio = new Date(ot.fechaInicio);
        const fin = new Date(ot.fechaFin);
        
        if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return false;
        
        // PRUEBA: Solo líneas 1 y 2
        const linea = ot.lineaTrabajo || '';
        if (!linea.includes('Línea 1') && !linea.includes('Línea 2') && 
            !linea.includes('LINEA 1') && !linea.includes('LINEA 2') &&
            !linea.includes('Línea1') && !linea.includes('Línea2')) {
            return false;
        }
        
        // Solo OTs dentro del período
        if (fin < fechaInicio || inicio > fechaFin) return false;
        
        const matchSearch = !searchTerm || 
            ot.nombreRecinto.toLowerCase().includes(searchTerm) ||
            ot.ito.toLowerCase().includes(searchTerm) ||
            ot.numeroOT.toLowerCase().includes(searchTerm);
        const matchLineaFiltro = !lineaFiltro || ot.lineaTrabajo === lineaFiltro;
        const matchEstado = !estadoFiltro || ot.estado === estadoFiltro;
        const matchTipo = !tipoFiltro || ot.tipoIntervencion === tipoFiltro;
        
        return matchSearch && matchLineaFiltro && matchEstado && matchTipo;
    });
    
    if (otsFiltradas.length === 0) {
        ganttChart.innerHTML = '<div class="error"><i class="fas fa-search"></i><p>No se encontraron OTs en el período (Líneas 1 y 2)</p></div>';
        return;
    }
    
    // Ordenar por línea y recinto
    otsFiltradas.sort((a, b) => {
        if (a.lineaTrabajo !== b.lineaTrabajo) return a.lineaTrabajo.localeCompare(b.lineaTrabajo);
        return a.nombreRecinto.localeCompare(b.nombreRecinto);
    });
    
    // Generar columnas de días
    const columnas = [];
    let fechaActual = new Date(fechaInicio);
    while (fechaActual <= fechaFin) {
        columnas.push(new Date(fechaActual));
        fechaActual.setDate(fechaActual.getDate() + zoomLevel);
    }
    
    const totalDias = (fechaFin - fechaInicio) / (1000 * 60 * 60 * 24);
    
    // Agrupar por línea de trabajo
    const grupos = {};
    otsFiltradas.forEach(ot => {
        const linea = ot.lineaTrabajo || 'Sin línea';
        if (!grupos[linea]) {
            grupos[linea] = [];
        }
        grupos[linea].push(ot);
    });
    
    // Construir HTML
    let html = '<div style="overflow-x: auto;">';
    html += `<div style="padding: 8px; background: #e8f5e9; font-size: 0.85rem; margin-bottom: 8px; border-radius: 4px;">
        📅 Mostrando: <strong>${formatearFecha(fechaInicio)}</strong> al <strong>${formatearFecha(fechaFin)}</strong> | 
        Líneas 1 y 2 | ${otsFiltradas.length} OT encontradas
    </div>`;
    
    html += '<table class="gantt-table"><thead><tr><th class="col-recinto" style="width: 250px;">Línea de Trabajo</th>';
    
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
        html += `<th colspan="${mes.dias}" style="background: #e3f2fd; text-align: center; padding: 6px;">${nombreMes}</th>`;
    });
    
    html += '</tr><tr><th class="col-recinto" style="width: 250px;">Establecimientos / OT</th>';
    
    columnas.forEach(fecha => {
        const esFinde = fecha.getDay() === 0 || fecha.getDay() === 6;
        const esHoy = fecha.toDateString() === hoy.toDateString();
        let clase = '';
        let estilo = '';
        
        if (esHoy) {
            clase = 'today-column';
            estilo = 'background: #ffeb3b; font-weight: bold;';
        } else if (esFinde) {
            clase = 'weekend';
            estilo = 'background: #f5f5f5;';
        }
        
        html += `<th class="${clase}" style="${estilo} padding: 4px; text-align: center; font-size: 0.75rem;">${fecha.getDate()}<br><small>${['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'][fecha.getDay()]}</small></th>`;
    });
    
    html += '</tr></thead><tbody>';
    
    // Filas por línea de trabajo
    Object.entries(grupos).forEach(([linea, ots]) => {
        const totalRecintos = new Set(ots.map(ot => ot.nombreRecinto)).size;
        
        html += `<tr class="linea-row">
            <td class="col-recinto" style="background: #e8eaf6; font-weight: 600; color: #1a237e; border-bottom: 2px solid #3f51b5; padding: 10px; vertical-align: top;">
                <div style="font-size: 1rem; margin-bottom: 4px;"><i class="fas fa-layer-group"></i> ${linea}</div>
                <div style="font-size: 0.75rem; color: #5c6bc0;">${ots.length} OT | ${totalRecintos} EE</div>
            </td>
            <td colspan="${columnas.length}" style="position: relative; padding: 8px 4px; background: #fafbff; vertical-align: top;">
                <div style="position: relative; width: 100%; min-height: ${Math.max(ots.length * 38, 60)}px;">`;
        
        // Barras por OT
        ots.forEach((ot, index) => {
            const inicio = new Date(ot.fechaInicio);
            const fin = new Date(ot.fechaFin);
            
            if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) return;
            
            // Ajustar al rango visible
            const inicioVisible = inicio < fechaInicio ? fechaInicio : inicio;
            const finVisible = fin > fechaFin ? fechaFin : fin;
            
            const inicioOffset = (inicioVisible - fechaInicio) / (1000 * 60 * 60 * 24);
            const duracion = Math.max((finVisible - inicioVisible) / (1000 * 60 * 60 * 24) + 1, 1);
            
            const leftPercent = (inicioOffset / totalDias) * 100;
            const widthPercent = (duracion / totalDias) * 100;
            
            const estadoClass = (ot.estado || 'sin-estado').toLowerCase()
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/\s+/g, '-');
            
            const topPosition = (index * 36) + 4;
            
            // Color más suave para los estados
            const colores = {
                'programada': '#42a5f5',
                'en-proceso': '#ffa726',
                'completada': '#66bb6a',
                'cancelada': '#ef5350',
                'sin-estado': '#bdbdbd'
            };
            
            const color = colores[estadoClass] || '#78909c';
            
            const tooltip = `OT #${ot.numeroOT}\n🏫 ${ot.nombreRecinto}\n🔧 ${ot.tipoIntervencion}\n📅 ${ot.fechaInicio} → ${ot.fechaFin}\n📊 ${ot.estado}\n👷 ${ot.ito}\n💰 ${ot.presupuesto}`;
            
            html += `<div class="gantt-bar-v2" 
                style="left: ${leftPercent}%; width: ${Math.max(widthPercent, 0.2)}%; top: ${topPosition}px; position: absolute; background: ${color};"
                title="${tooltip.replace(/"/g, '&quot;').replace(/\n/g, '&#10;')}"
                onclick="alert('${tooltip.replace(/'/g, "\\'").replace(/\n/g, '\\n')}')">
                <span style="font-weight: bold; font-size: 0.7rem;">${ot.numeroOT}</span>
                <span style="margin-left: 6px; font-size: 0.65rem; opacity: 0.9;">${ot.nombreRecinto}</span>
            </div>`;
        });
        
        html += `</div></td></tr>`;
        html += `<tr><td colspan="${columnas.length + 1}" style="padding: 0; height: 6px; background: #e0e0e0;"></td></tr>`;
    });
    
    html += '</tbody></table></div>';
    
    // Marcador de HOY
    if (hoy >= fechaInicio && hoy <= fechaFin) {
        const hoyOffset = (hoy - fechaInicio) / (1000 * 60 * 60 * 24);
        const hoyPercent = (hoyOffset / totalDias) * 100;
        html += `<div class="today-marker" style="left: ${hoyPercent}%; top: 100px; bottom: 0;"></div>`;
    }
    
    ganttChart.innerHTML = html;
}

function zoomGantt(direction) {
    zoomLevel = Math.max(1, Math.min(14, zoomLevel + direction));
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

function formatearFecha(fecha) {
    return fecha.toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
