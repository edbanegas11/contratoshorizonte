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

window.cambiarTab = (tabId) => {
    // 1. Ocultar todas las secciones
    const tabs = ['dashboard', 'reportes', 'ajustes'];
    tabs.forEach(t => {
        const el = document.getElementById(`tab-${t}`);
        if(el) el.classList.add('hidden');
    });

    // 2. Mostrar la sección seleccionada
    const target = document.getElementById(`tab-${tabId}`);
    if(target) target.classList.remove('hidden');

    // 3. ACTUALIZAR COLORES DE LA NAVEGACIÓN
    // Primero, ponemos todos los botones en gris
    document.querySelectorAll('nav button').forEach(btn => {
        btn.classList.remove('text-blue-600');
        btn.classList.add('text-gray-400');
    });

    // Segundo, buscamos el botón específico que se presionó y lo ponemos azul
    // Para esto, buscaremos el botón que llama a esta función con ese tabId
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

// ... (Mantén el inicio del código igual hasta la parte de onSnapshot de transacciones)

onSnapshot(transaccionesRef, (snapshot) => {
    let ingresos = 0, gastos = 0, sumaCat = {};
    
    snapshot.forEach(doc => {
        const d = doc.data();
        if(d.tipo === 'ingreso') {
            ingresos += d.monto;
        } else {
            gastos += d.monto;
            sumaCat[d.categoria] = (sumaCat[d.categoria] || 0) + d.monto;
        }
    });

    // Formato de Lempiras: L 1,250.00
    const formatoLempira = (valor) => "L " + valor.toLocaleString('es-HN', { minimumFractionDigits: 2 });

    setUI('total-balance', formatoLempira(ingresos - gastos));
    setUI('dash-ingresos', "+" + formatoLempira(ingresos));
    setUI('dash-gastos', "-" + formatoLempira(gastos));
    
    const categoriasOrdenadas = Object.entries(sumaCat).sort((a, b) => b[1] - a[1]);

    const container = document.getElementById('lista-categorias-gastos');
    if(container) {
        container.innerHTML = "";
        
        categoriasOrdenadas.forEach(([cat, total]) => {
            const porcentaje = gastos > 0 ? (total / gastos) * 100 : 0;

            container.innerHTML += `
                <div class="mb-6 bg-white p-4 rounded-2xl shadow-sm border border-gray-50">
                    <div class="flex justify-between items-end mb-2">
                        <div>
                            <p class="text-[10px] font-black text-gray-400 uppercase tracking-widest">Categoría</p>
                            <span class="text-sm font-bold text-gray-700 uppercase">${cat}</span>
                        </div>
                        <div class="text-right">
                            <span class="text-lg font-black text-red-500">${formatoLempira(total)}</span>
                        </div>
                    </div>
                    <div class="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                        <div class="bg-red-500 h-full rounded-full transition-all duration-1000" 
                             style="width: ${porcentaje}%"></div>
                    </div>
                    <p class="text-[9px] text-gray-400 mt-1 font-bold">${porcentaje.toFixed(1)}% del total de gastos</p>
                </div>`;
        });
    }
});