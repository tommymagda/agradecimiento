// CONFIGURACIÓN DE CLOUDINARY - DEBE COINCIDIR CON selfiecam.js
const CLOUDINARY_CLOUD_NAME = 'dukqtp9ww'; // Tu Cloud Name
const CLOUDINARY_FOLDER = 'graduacion'; // Carpeta donde se guardan las fotos

// Elementos del DOM
const loadingOverlay = document.getElementById('loadingOverlay');
const galleryGrid = document.getElementById('galleryGrid');
const emptyState = document.getElementById('emptyState');
const photoCount = document.getElementById('photoCount');
const backBtn = document.getElementById('backBtn');
const refreshBtn = document.getElementById('refreshBtn');
const photoModal = document.getElementById('photoModal');
const modalClose = document.getElementById('modalClose');
const modalImage = document.getElementById('modalImage');
const modalDate = document.getElementById('modalDate');
const modalDownload = document.getElementById('modalDownload');
const modalShare = document.getElementById('modalShare');

let currentModalPhoto = null;
let allPhotos = [];

// Cargar galería al iniciar
document.addEventListener('DOMContentLoaded', loadGallery);

// Event listeners
backBtn.addEventListener('click', () => {
    window.location.href = 'selfiecam.html';
});

refreshBtn.addEventListener('click', loadGallery);

modalClose.addEventListener('click', closeModal);

modalDownload.addEventListener('click', () => {
    if (currentModalPhoto) {
        downloadImage(currentModalPhoto.url, currentModalPhoto.public_id);
    }
});

modalShare.addEventListener('click', () => {
    if (currentModalPhoto) {
        shareImage(currentModalPhoto.url);
    }
});

// Cerrar modal al hacer clic fuera de la imagen
photoModal.addEventListener('click', (e) => {
    if (e.target === photoModal) {
        closeModal();
    }
});

// Función principal para cargar la galería desde Cloudinary
async function loadGallery() {
    loadingOverlay.classList.add('active');
    
    try {
        // Método 1: Intentar cargar usando la API de listado de recursos
        const listUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/list/${CLOUDINARY_FOLDER}.json`;
        
        console.log('Intentando cargar desde:', listUrl);
        
        const response = await fetch(listUrl);
        
        if (response.ok) {
            const data = await response.json();
            console.log('Datos recibidos de Cloudinary:', data);
            
            if (data.resources && data.resources.length > 0) {
                // Convertir las fotos al formato que usamos
                allPhotos = data.resources.map(resource => {
                    // El public_id viene con la carpeta, ejemplo: "graduacion/abc123"
                    const publicId = resource.public_id;
                    const format = resource.format || 'png';
                    
                    return {
                        public_id: publicId,
                        format: format,
                        created_at: resource.created_at || new Date().toISOString(),
                        url: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${publicId}.${format}`,
                        thumbnail: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_500,c_fill/${publicId}.${format}`
                    };
                });
                
                console.log('Fotos procesadas:', allPhotos.length);
                displayGallery(allPhotos);
                emptyState.classList.remove('show');
            } else {
                console.log('No hay recursos en la respuesta');
                showEmptyState();
            }
        } else {
            console.error('Error en la respuesta:', response.status);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
    } catch (error) {
        console.error('Error al cargar galería desde Cloudinary:', error);
        
        // Si falla, mostrar mensaje informativo
        alert('No se pudieron cargar las fotos desde Cloudinary. Posibles razones:\n\n' +
              '1. La opción "Resource list" no está habilitada en Settings → Security\n' +
              '2. No hay fotos subidas todavía\n' +
              '3. El nombre de la carpeta no coincide\n\n' +
              'Revisá la consola del navegador (F12) para más detalles.');
        
        showEmptyState();
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Mostrar galería con las fotos
function displayGallery(photos) {
    galleryGrid.innerHTML = '';
    
    // Ordenar fotos por fecha (más recientes primero)
    photos.sort((a, b) => {
        const dateA = new Date(a.created_at);
        const dateB = new Date(b.created_at);
        return dateB - dateA;
    });
    
    // Actualizar contador
    photoCount.textContent = photos.length;
    
    // Crear elementos para cada foto
    photos.forEach(photo => {
        const galleryItem = createGalleryItem(photo);
        galleryGrid.appendChild(galleryItem);
    });
}

// Crear elemento de galería para una foto
function createGalleryItem(photo) {
    const div = document.createElement('div');
    div.className = 'gallery-item';
    
    // Usar el thumbnail optimizado si existe, sino usar la URL normal
    const imageUrl = photo.thumbnail || photo.url;
    
    const date = new Date(photo.created_at);
    const formattedDate = date.toLocaleDateString('es-AR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    div.innerHTML = `
        <img src="${imageUrl}" alt="Foto de graduación" loading="lazy" onerror="this.src='${photo.url}'">
        <div class="gallery-item-info">
            <div class="gallery-item-date">📅 ${formattedDate}</div>
            <div class="gallery-item-actions">
                <button class="btn-view">👁️ Ver</button>
            </div>
        </div>
    `;
    
    // Agregar evento click para abrir modal
    div.querySelector('.btn-view').addEventListener('click', (e) => {
        e.stopPropagation();
        openModal(photo);
    });
    
    div.addEventListener('click', () => {
        openModal(photo);
    });
    
    return div;
}

// Abrir modal con foto ampliada
function openModal(photo) {
    currentModalPhoto = photo;
    
    modalImage.src = photo.url;
    
    const date = new Date(photo.created_at);
    const formattedDate = date.toLocaleDateString('es-AR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    modalDate.textContent = `📅 ${formattedDate}`;
    
    photoModal.classList.add('active');
    document.body.style.overflow = 'hidden';
}

// Cerrar modal
function closeModal() {
    photoModal.classList.remove('active');
    document.body.style.overflow = 'auto';
    currentModalPhoto = null;
}

// Descargar imagen
async function downloadImage(url, filename) {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = `${filename}.png`;
        link.click();
        
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.error('Error al descargar:', error);
        // Fallback: abrir en nueva pestaña
        window.open(url, '_blank');
    }
}

// Compartir imagen
async function shareImage(url) {
    if (navigator.share) {
        try {
            await navigator.share({
                title: '¡Mi graduación!',
                text: '¡Mirá mi foto de graduación! #AlFinMeRecibi 🎓',
                url: url
            });
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.error('Error al compartir:', error);
                copyToClipboard(url);
            }
        }
    } else {
        copyToClipboard(url);
    }
}

// Copiar URL al portapapeles
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        alert('¡Enlace copiado al portapapeles! 📋');
    }).catch(error => {
        console.error('Error al copiar:', error);
        prompt('Copiá este enlace:', text);
    });
}

// Mostrar estado vacío
function showEmptyState() {
    galleryGrid.innerHTML = '';
    emptyState.classList.add('show');
    photoCount.textContent = '0';
}

// Manejo de teclas
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && photoModal.classList.contains('active')) {
        closeModal();
    }
});