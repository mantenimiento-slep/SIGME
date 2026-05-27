const SHEET_ID = '1_9ewqYv-o3O37ylPS6vxcGceBOQ1l4jB2VlM2T_4iSg';
const SHEET_NAME = 'BBDD_OT';
const CSV_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&sheet=${SHEET_NAME}`;

let todasLasOTs = [];
let lineasUnicas = [];

function resetFiltros() {
    document.getElementById('filterLinea').value = '';
    document.getElementById('filterEstado').value = '';
    document.getElementById('filterITO').value = '';
    document.getElementById('filterRecinto').value = '';
    document.getElementById('searchInput').value = '';
    if (typeof renderizarGantt === 'function') renderizarGantt();
}

async function cargarDatos() {
    const loadingSpinner = document.getElementById('loadingSpinner');
    const errorMessage = document.getElementById('errorMessage');
    const ganttView = document.getElementById('ganttView');
    
    try {
        loadingSpinner.style.display = 'block';
        errorMessage.style.display = 'none';
        if (ganttView) ganttView.style.display = 'none';
        
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error('Error al cargar datos');
        
        const csvText = await response.text();
        const datos = parseCSV(csvText);
        
        if (datos.length === 0) throw new Error('No se encontraron datos');
        
        todasLasOTs = procesarDatos(datos);
        lineasUnicas = [...new Set(todasLasOTs.map(ot => ot.lineaTrabajo))].filter(Boolean);
        
        actualizarEstadisticas();
        llenarFiltros();
        
        loadingSpinner.style.display = 'none';
        
        if (ganttView) ganttView.style.display = 'block';
        
        if (typeof inicializarGantt === 'function') {
            inicializarGantt();
        }
        
    } catch (error) {
        loadingSpinner.style.display = 'none';
        errorMessage.style.display = 'block';
        document.getElementById('errorText').textContent = error.message;
        console.error('Error:', error);
    }
}

function parseCSV(csvText) {
    const lineas = csvText.split('\n');
    const headers = lineas[0].split(',').map(h => h.trim().replace(/"/g, ''));
    const datos = [];
    for (let i = 1; i < lineas.length; i++) {
        if (!lineas[i].trim()) continue;
        const valores = parsearLineaCSV(lineas[i]);
        const fila = {};
        headers.forEach((header, index) => {
            fila[header] = valores[index] ? valores[index].trim().replace(/"/g, '') : '';
        });
        datos.push(fila);
    }
    return datos;
}

function parsearLineaCSV(linea) {
    const resultado = [];
    let actual = '';
    let entreComillas = false;
    for (let char of linea) {
        if (char === '"') { entreComillas = !entreComillas; }
        else if (char === ',' && !entreComillas) { resultado.push(actual); actual = ''; }
        else { actual += char; }
    }
    resultado.push(actual);
    return resultado;
}

function procesarDatos(datos) {
    return datos.map(fila => ({
        numeroOT: fila['N° OT'] || '',
        ito: fila['ITO'] || '',
        nombreRecinto: fila['NOMBRE RECINTO'] || '',
        tipoRecinto: fila['TIPO RECINTO'] || '',
        tipoIntervencion: fila['TIPO INTERVENCIÓN'] || '',
        fechaVisita: fila['FECHA VISITA'] || '',
        estado: fila['ESTADO'] || '',
        presupuesto: fila['PRESUPUESTO'] || '0',
        plazoProyectado: fila['PLAZO PROYECTADO'] || '',
        lineaTrabajo: fila['LÍNEA DE TRABAJO'] || '',
        fechaInicio: fila['FECHA INICIO'] || '',
        fechaFin: fila['FECHA FIN'] || '',
        numeroEP: fila['N° EP'] || ''
    }));
}

function actualizarEstadisticas() {
    document.getElementById('totalOT').innerHTML = `<i class="fas fa-clipboard-list"></i> ${todasLasOTs.length} OT`;
    const recintosUnicos = new Set(todasLasOTs.map(ot => ot.nombreRecinto).filter(Boolean));
    document.getElementById('totalRecintos').innerHTML = `<i class="fas fa-school"></i> ${recintosUnicos.size} EE`;
}

function llenarFiltros() {
    const filterLinea = document.getElementById('filterLinea');
    const filterEstado = document.getElementById('filterEstado');
    
    if (filterLinea) {
        lineasUnicas.sort().forEach(linea => {
            const option = document.createElement('option');
            option.value = linea;
            option.textContent = linea;
            filterLinea.appendChild(option);
        });
    }
    
    if (filterEstado) {
        const estadosUnicos = [...new Set(todasLasOTs.map(ot => ot.estado).filter(Boolean))].sort();
        estadosUnicos.forEach(estado => {
            const option = document.createElement('option');
            option.value = estado;
            option.textContent = estado;
            filterEstado.appendChild(option);
        });
    }
}

function cambiarVista(vista) {
    const ganttView = document.getElementById('ganttView');
    const tarjetasView = document.getElementById('tarjetasView');
    const botones = document.querySelectorAll('.view-btn');
    
    botones.forEach(btn => btn.classList.remove('active'));
    
    if (vista === 'gantt') {
        ganttView.style.display = 'block';
        tarjetasView.style.display = 'none';
        if (botones[0]) botones[0].classList.add('active');
        if (todasLasOTs.length > 0 && typeof inicializarGantt === 'function') {
            inicializarGantt();
        }
    } else {
        ganttView.style.display = 'none';
        tarjetasView.style.display = 'block';
        if (botones[1]) botones[1].classList.add('active');
    }
}

function resetFiltros() {
    document.getElementById('filterLinea').value = '';
    document.getElementById('filterEstado').value = '';
    document.getElementById('filterITO').value = '';
    document.getElementById('filterRecinto').value = '';
    document.getElementById('searchInput').value = '';
    if (typeof renderizarGantt === 'function') renderizarGantt();
}

// Event listeners
document.getElementById('searchInput').addEventListener('input', function() {
    if (typeof renderizarGantt === 'function') renderizarGantt();
});

document.getElementById('filterLinea').addEventListener('change', function() {
    if (typeof renderizarGantt === 'function') renderizarGantt();
});

document.getElementById('filterEstado').addEventListener('change', function() {
    if (typeof renderizarGantt === 'function') renderizarGantt();
});

document.getElementById('filterITO').addEventListener('change', function() {
    if (typeof renderizarGantt === 'function') renderizarGantt();
});

document.getElementById('filterRecinto').addEventListener('input', function() {
    if (typeof renderizarGantt === 'function') renderizarGantt();
});

window.addEventListener('load', function() {
    cargarDatos();
});
