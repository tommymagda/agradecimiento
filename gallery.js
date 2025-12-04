// CONFIGURACIÓN DE CLOUDINARY - DEBE COINCIDIR CON selfiecam.js
const CLOUDINARY_CLOUD_NAME = 'dukqtp9ww';
const CLOUDINARY_FOLDER = 'graduacion';

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

photoModal.addEventListener('click', (e) => {
    if (e.target === photoModal) {
        closeModal();
    }
});

// Función para cargar galería usando RSS feed
async function loadGallery() {
    loadingOverlay.classList.add('active');
    
    try {
        // Método alternativo: usar RSS feed que siempre está disponible
        const rssUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/list/${CLOUDINARY_FOLDER}.rss`;
        
        console.log('Cargando desde RSS:', rssUrl);
        
        const response = await fetch(rssUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const rssText = await response.text();
        console.log('RSS recibido:', rssText.substring(0, 200));
        
        // Parsear el RSS XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(rssText, "text/xml");
        
        // Verificar si hay error en el XML
        const parseError = xmlDoc.querySelector('parsererror');
        if (parseError) {
            throw new Error('Error al parsear RSS');
        }
        
        // Extraer items del RSS
        const items = xmlDoc.querySelectorAll('item');
        
        if (items.length > 0) {
            allPhotos = Array.from(items).map(item => {
                const link = item.querySelector('link').textContent;
                const pubDate = item.querySelector('pubDate').textContent;
                const description = item.querySelector('description').textContent;
                
                // Extraer public_id y format del link
                // Link ejemplo: https://res.cloudinary.com/dukqtp9ww/image/upload/v1234567890/graduacion/abc123.png
                const urlParts = link.split('/');
                const fileName = urlParts[urlParts.length - 1]; // abc123.png
                const fileNameParts = fileName.split('.');
                const format = fileNameParts[fileNameParts.length - 1]; // png
                const publicIdWithoutExt = fileNameParts.slice(0, -1).join('.'); // abc123
                const publicId = `${CLOUDINARY_FOLDER}/${publicIdWithoutExt}`; // graduacion/abc123
                
                return {
                    public_id: publicId,
                    format: format,
                    created_at: new Date(pubDate).toISOString(),
                    url: link,
                    thumbnail: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_500,c_fill/${publicId}.${format}`
                };
            });
            
            console.log('Fotos procesadas:', allPhotos.length);
            displayGallery(allPhotos);
            emptyState.classList.remove('show');
        } else {
            console.log('No se encontraron items en el RSS');
            showEmptyState();
        }
        
    } catch (error) {
        console.error('Error al cargar galería:', error);
        
        // Intentar cargar desde localStorage como último recurso
        const savedPhotos = localStorage.getItem('tito_photos');
        if (savedPhotos) {
            try {
                allPhotos = JSON.parse(savedPhotos);
                if (allPhotos.length > 0) {
                    console.log('Cargando desde localStorage:', allPhotos.length);
                    displayGallery(allPhotos);
                    emptyState.classList.remove('show');
                    
                    // Mostrar mensaje informativo
                    alert('⚠️ Mostrando fotos guardadas localmente en este dispositivo.\n\n' +
                          'Para ver TODAS las fotos de todos los dispositivos, necesitamos configurar Cloudinary correctamente.\n\n' +
                          'Contactá al desarrollador para ayuda.');
                } else {
                    showEmptyState();
                }
            } catch (e) {
                console.error('Error al cargar localStorage:', e);
                showEmptyState();
            }
        } else {
            showEmptyState();
            alert('⚠️ No se pudieron cargar las fotos desde Cloudinary.\n\n' +
                  'Error: ' + error.message + '\n\n' +
                  'Revisá la consola del navegador (F12) para más detalles.');
        }
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