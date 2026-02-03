import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB0YYI7RqQbAxwuuKWAH-zZo19VBAmt21Y",
  authDomain: "contratosmensualeshorizonte.firebaseapp.com",
  projectId: "contratosmensualeshorizonte",
  storageBucket: "contratosmensualeshorizonte.firebasestorage.app",
  messagingSenderId: "395646013611",
  appId: "1:395646013611:web:afbc01af635ba0de25a7ee",
  measurementId: "G-HCF57HSFG5"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const transaccionesRef = collection(db, "transacciones");
const categoriasRef = collection(db, "categorias");

let tipoActual = 'ingreso';

const setUI = (id, valor) => {
    const el = document.getElementById(id);
    if (el) el.innerText = valor;
};

// --- FUNCIONES GLOBALES ---

window.cambiarTab = (tabId) => {
    const tabs = ['dashboard', 'reportes', 'ajustes'];
    tabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if(el) el.classList.add('hidden');
    });
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden');

    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-gray-400');
    });

    const botonActivo = document.querySelector(`nav button[onclick*="'${tabId}'"]`);
    if (botonActivo) {
        botonActivo.classList.remove('text-gray-400');
        botonActivo.classList.add('text-blue-600');
    }
};

window.abrirModal = (tipo) => {
    tipoActual = tipo;
    const titulo = document.getElementById('modal-titulo');
    const select = document.getElementById('form-categoria');
    if(titulo) titulo.innerText = tipo === 'ingreso' ? 'Nuevo Ingreso' : 'Nuevo Gasto';
    
    if(tipo === 'ingreso') {
        select.innerHTML = '<option value="CONTRATO MENSUAL">CONTRATO MENSUAL</option>';
    } else {
        actualizarSelectGastos();
    }
    const modal = document.getElementById('modal-registro');
    if(modal) modal.classList.remove('hidden');
};

const actualizarSelectGastos = () => {
    onSnapshot(categoriasRef, (snapshot) => {
        const select = document.getElementById('form-categoria');
        if(select && tipoActual === 'gasto') {
            select.innerHTML = "";
            snapshot.forEach(d => {
                const cat = d.data();
                if(cat.tipo === 'gasto') select.add(new Option(cat.nombre, cat.nombre));
            });
        }
    });
};

window.cerrarModal = () => {
    const modal = document.getElementById('modal-registro');
    if(modal) modal.classList.add('hidden');
};

window.guardarEnFirebase = async () => {
    const montoInput = document.getElementById('form-monto');
    const catInput = document.getElementById('form-categoria');
    const monto = parseFloat(montoInput.value);
    if (!monto) return alert("Ingresa un monto válido");

    await addDoc(transaccionesRef, {
        tipo: tipoActual,
        monto: monto,
        categoria: catInput.value,
        fecha: new Date()
    });
    window.cerrarModal();
    montoInput.value = "";
};

window.crearCategoria = async () => {
    const nombreInp = document.getElementById('nueva-cat-nombre');
    const tipoInp = document.getElementById('nueva-cat-tipo');
    const nombre = nombreInp.value.toUpperCase().trim();
    if (nombre) {
        await addDoc(categoriasRef, { nombre, tipo: tipoInp.value });
        nombreInp.value = "";
    }
};

// --- FUNCIÓN PARA BORRAR ---
window.eliminarDato = async (coleccion, id) => {
    if (confirm("¿Estás seguro de que deseas eliminar este registro?")) {
        try {
            await deleteDoc(doc(db, coleccion, id));
        } catch (error) {
            console.error("Error al eliminar:", error);
            alert("No se pudo eliminar el registro.");
        }
    }
};

// --- ESCUCHA DE TRANSACCIONES ---
// Función para cambiar entre Historial y Análisis
window.cambiarSubTab = (subId) => {
    const hist = document.getElementById('sub-tab-historial');
    const anal = document.getElementById('sub-tab-analisis');
    const btnHist = document.getElementById('btn-sub-historial');
    const btnAnal = document.getElementById('btn-sub-analisis');

    if(subId === 'historial') {
        hist.classList.remove('hidden');
        anal.classList.add('hidden');
        btnHist.classList.add('bg-white', 'shadow-sm', 'text-blue-900');
        btnAnal.classList.remove('bg-white', 'shadow-sm', 'text-blue-900');
        btnAnal.classList.add('text-gray-500');
    } else {
        hist.classList.add('hidden');
        anal.classList.remove('hidden');
        btnAnal.classList.add('bg-white', 'shadow-sm', 'text-blue-900');
        btnHist.classList.remove('bg-white', 'shadow-sm', 'text-blue-900');
        btnHist.classList.add('text-gray-400');
    }
};

// Escucha de Transacciones Actualizada
onSnapshot(transaccionesRef, (snapshot) => {
    let ingresos = 0, gastos = 0, sumaCat = {};
    const formatoLempira = (valor) => "L " + valor.toLocaleString('es-HN', { minimumFractionDigits: 2 });
    
    const containerHistorial = document.getElementById('lista-movimientos-historial');
    const containerAnalisis = document.getElementById('lista-categorias-gastos');
    
    if(containerHistorial) containerHistorial.innerHTML = "";
    if(containerAnalisis) containerAnalisis.innerHTML = "";

    snapshot.forEach(docSnap => {
        const d = docSnap.data();
        const id = docSnap.id;

        if(d.tipo === 'ingreso') {
            ingresos += d.monto;
        } else {
            gastos += d.monto;
            // Sumamos por categoría para el análisis
            sumaCat[d.categoria] = (sumaCat[d.categoria] || 0) + d.monto;
        }

        // 1. Llenamos el HISTORIAL (Para borrar)
        if(containerHistorial) {
            const colorMonto = d.tipo === 'ingreso' ? 'text-green-600' : 'text-red-500';
            containerHistorial.innerHTML += `
                <div class="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex justify-between items-center">
                    <div>
                        <p class="text-[9px] font-black text-gray-400 uppercase tracking-widest">${d.categoria}</p>
                        <span class="text-[11px] font-bold text-gray-700 uppercase">${d.tipo}</span>
                    </div>
                    <div class="flex items-center gap-3">
                        <span class="text-sm font-black ${colorMonto}">${d.tipo === 'ingreso' ? '+' : '-'} ${formatoLempira(d.monto)}</span>
                        <button onclick="window.eliminarDato('transacciones', '${id}')" class="text-gray-300 p-2">
                            <i class="fa-solid fa-trash-can text-xs"></i>
                        </button>
                    </div>
                </div>`;
        }
    });

    // 2. Llenamos el ANÁLISIS (Barras de porcentaje)
    if(containerAnalisis) {
        const categoriasOrdenadas = Object.entries(sumaCat).sort((a, b) => b[1] - a[1]);
        categoriasOrdenadas.forEach(([cat, total]) => {
            const porcentaje = gastos > 0 ? (total / gastos) * 100 : 0;
            containerAnalisis.innerHTML += `
                <div class="bg-white p-5 rounded-[2rem] shadow-sm border border-gray-50">
                    <div class="flex justify-between items-end mb-2">
                        <span class="text-xs font-black text-gray-700 uppercase">${cat}</span>
                        <span class="text-md font-black text-red-500">${formatoLempira(total)}</span>
                    </div>
                    <div class="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div class="bg-red-500 h-full rounded-full transition-all duration-1000" style="width: ${porcentaje}%"></div>
                    </div>
                    <p class="text-[9px] text-gray-400 mt-2 font-bold italic">${porcentaje.toFixed(1)}% del gasto total</p>
                </div>`;
        });
    }

    setUI('total-balance', formatoLempira(ingresos - gastos));
    setUI('dash-ingresos', "+" + formatoLempira(ingresos));
    setUI('dash-gastos', "-" + formatoLempira(gastos));
});

// --- ESCUCHA DE CATEGORÍAS (Para ajustes) ---
onSnapshot(categoriasRef, (snapshot) => {
    const listaAjustes = document.getElementById('lista-ajustes-categorias');
    if(listaAjustes) {
        listaAjustes.innerHTML = "";
        snapshot.forEach(docSnap => {
            const cat = docSnap.data();
            const id = docSnap.id;
            listaAjustes.innerHTML += `
                <div class="flex justify-between items-center bg-gray-50 p-3 rounded-xl mb-2">
                    <span class="font-bold text-gray-700 text-[11px] uppercase">${cat.nombre} (${cat.tipo})</span>
                    <button onclick="window.eliminarDato('categorias', '${id}')" class="text-red-400 p-2">
                        <i class="fa-solid fa-xmark"></i>
                    </button>
                </div>`;
        });
    }
});
