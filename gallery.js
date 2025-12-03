// CONFIGURACIÓN DE CLOUDINARY - DEBE COINCIDIR CON selfiecam.js
const CLOUDINARY_CLOUD_NAME = 'dukqtp9ww'; // Reemplazar
const CLOUDINARY_API_KEY = 'XxQ8t2Z9A2R1zp_akuUZqoMzUGI'; // Reemplazar (nuevo)
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

// Función principal para cargar la galería usando Cloudinary Search
async function loadGallery() {
    loadingOverlay.classList.add('active');
    
    try {
        // Usar el widget de búsqueda de Cloudinary que funciona sin autenticación
        const searchUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/list/${CLOUDINARY_FOLDER}.json`;
        
        const response = await fetch(searchUrl);
        
        if (response.ok) {
            const data = await response.json();
            
            if (data.resources && data.resources.length > 0) {
                // Convertir el formato de respuesta a nuestro formato esperado
                allPhotos = data.resources.map(resource => ({
                    public_id: resource.public_id,
                    format: resource.format || 'png',
                    created_at: resource.created_at,
                    url: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${resource.public_id}.${resource.format || 'png'}`
                }));
                
                displayGallery(allPhotos);
                emptyState.classList.remove('show');
            } else {
                showEmptyState();
            }
        } else {
            // Si el método de listado no funciona, cargar desde localStorage como fallback
            loadFromLocalStorage();
        }
        
    } catch (error) {
        console.error('Error al cargar galería:', error);
        // Intentar cargar desde localStorage como backup
        loadFromLocalStorage();
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Cargar fotos desde localStorage (fallback)
function loadFromLocalStorage() {
    const savedPhotos = localStorage.getItem('tito_photos');
    
    if (savedPhotos) {
        try {
            allPhotos = JSON.parse(savedPhotos);
            if (allPhotos.length > 0) {
                displayGallery(allPhotos);
                emptyState.classList.remove('show');
            } else {
                showEmptyState();
            }
        } catch (error) {
            console.error('Error al parsear fotos guardadas:', error);
            showEmptyState();
        }
    } else {
        showEmptyState();
    }
}

// Guardar foto en localStorage (llamar desde selfiecam.js después de subir)
function savePhotoToLocalStorage(photoData) {
    const savedPhotos = localStorage.getItem('tito_photos');
    let photos = savedPhotos ? JSON.parse(savedPhotos) : [];
    
    photos.unshift(photoData); // Agregar al principio
    localStorage.setItem('tito_photos', JSON.stringify(photos));
}

// Hacer esta función disponible globalmente
window.savePhotoToLocalStorage = savePhotoToLocalStorage;

// Mostrar galería con las fotos
function displayGallery(photos) {
    galleryGrid.innerHTML = '';
    
    // Ordenar fotos por fecha (más recientes primero)
    photos.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    
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
    
    // Generar URL de thumbnail optimizado
    const imageUrl = photo.url || 
        `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_500,c_fill/${photo.public_id}.${photo.format}`;
    
    const date = new Date(photo.created_at);
    const formattedDate = date.toLocaleDateString('es-AR', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    div.innerHTML = `
        <img src="${imageUrl}" alt="Foto de graduación" loading="lazy">
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
    
    const fullImageUrl = photo.url || 
        `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/${photo.public_id}.${photo.format}`;
    
    modalImage.src = fullImageUrl;
    
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
                title: '¡Mi graduación con Tito!',
                text: '¡Mirá mi foto de graduación! #NuncaEsTarde 🎓🤖',
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