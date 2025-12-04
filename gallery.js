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

// Función para cargar galería usando la API de Cloudinary
async function loadGallery() {
    loadingOverlay.classList.add('active');
    
    try {
        // Método 1: Intentar con JSON endpoint (requiere que las imágenes sean públicas)
        const jsonUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/list/${CLOUDINARY_FOLDER}.json`;
        
        console.log('🔍 Intentando cargar desde JSON:', jsonUrl);
        
        try {
            const jsonResponse = await fetch(jsonUrl);
            console.log('📡 Respuesta JSON status:', jsonResponse.status, jsonResponse.statusText);
            
            if (jsonResponse.ok) {
                const data = await jsonResponse.json();
                console.log('✅ Datos JSON recibidos:', data);
                
                if (data.resources && data.resources.length > 0) {
                    allPhotos = data.resources.map(resource => ({
                        public_id: resource.public_id,
                        format: resource.format || 'png',
                        created_at: resource.created_at,
                        url: resource.secure_url || resource.url,
                        thumbnail: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_500,c_fill/${resource.public_id}.${resource.format || 'png'}`
                    }));
                    
                    console.log('📸 Fotos procesadas desde JSON:', allPhotos.length);
                    displayGallery(allPhotos);
                    emptyState.classList.remove('show');
                    return;
                }
            } else {
                console.warn('⚠️ JSON endpoint no disponible:', jsonResponse.status);
            }
        } catch (jsonError) {
            console.warn('⚠️ Error con JSON endpoint:', jsonError.message);
        }
        
        // Método 2: Intentar con RSS
        console.log('🔄 Intentando con RSS...');
        await loadFromRSS();
        
    } catch (error) {
        console.error('❌ Error general al cargar galería:', error);
        
        // Último recurso: cargar desde localStorage
        await loadFromLocalStorage();
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Función auxiliar para cargar desde RSS
async function loadFromRSS() {
    const rssUrl = `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/list/${CLOUDINARY_FOLDER}.rss`;
    
    console.log('📡 Cargando desde RSS:', rssUrl);
    
    const response = await fetch(rssUrl);
    console.log('📡 Respuesta RSS status:', response.status, response.statusText);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`);
    }
    
    const rssText = await response.text();
    console.log('📄 RSS recibido, primeros 500 caracteres:', rssText.substring(0, 500));
    
    // Verificar si es un error XML
    if (rssText.includes('<Error>') || rssText.includes('Unauthorized')) {
        console.error('❌ Error en RSS:', rssText);
        throw new Error('RSS no disponible: Imágenes no son públicas o carpeta no existe');
    }
    
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(rssText, "text/xml");
    
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
        console.error('❌ Error parseando RSS:', parseError.textContent);
        throw new Error('Error al parsear RSS: ' + parseError.textContent);
    }
    
    const items = xmlDoc.querySelectorAll('item');
    console.log('📸 Items encontrados en RSS:', items.length);
    
    if (items.length > 0) {
        allPhotos = Array.from(items).map(item => {
            const link = item.querySelector('link').textContent;
            const pubDate = item.querySelector('pubDate').textContent;
            
            const urlParts = link.split('/');
            const fileName = urlParts[urlParts.length - 1];
            const fileNameParts = fileName.split('.');
            const format = fileNameParts[fileNameParts.length - 1];
            const publicIdWithoutExt = fileNameParts.slice(0, -1).join('.');
            const publicId = `${CLOUDINARY_FOLDER}/${publicIdWithoutExt}`;
            
            return {
                public_id: publicId,
                format: format,
                created_at: new Date(pubDate).toISOString(),
                url: link,
                thumbnail: `https://res.cloudinary.com/${CLOUDINARY_CLOUD_NAME}/image/upload/w_400,h_500,c_fill/${publicId}.${format}`
            };
        });
        
        console.log('✅ Fotos procesadas desde RSS:', allPhotos.length);
        displayGallery(allPhotos);
        emptyState.classList.remove('show');
    } else {
        console.warn('⚠️ No se encontraron items en el RSS');
        throw new Error('No se encontraron fotos en el RSS');
    }
}

// Función auxiliar para cargar desde localStorage
async function loadFromLocalStorage() {
    const savedPhotos = localStorage.getItem('tito_photos');
    
    if (savedPhotos) {
        try {
            allPhotos = JSON.parse(savedPhotos);
            
            if (allPhotos.length > 0) {
                console.log('Cargando desde localStorage:', allPhotos.length, 'fotos');
                displayGallery(allPhotos);
                emptyState.classList.remove('show');
                
                // Mostrar mensaje informativo
                showInfoMessage();
            } else {
                showEmptyState();
            }
        } catch (e) {
            console.error('Error al cargar localStorage:', e);
            showEmptyState();
        }
    } else {
        showEmptyState();
        showConfigErrorMessage();
    }
}

// Mostrar mensaje informativo
function showInfoMessage() {
    const message = document.createElement('div');
    message.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        color: white;
        padding: 15px 25px;
        border-radius: 15px;
        box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        z-index: 2000;
        max-width: 90%;
        text-align: center;
        animation: slideDown 0.5s ease;
    `;
    message.innerHTML = `
        <strong>⚠️ Mostrando fotos locales</strong><br>
        <span style="font-size: 0.9em;">Solo ves las fotos de este dispositivo. Para configurar Cloudinary correctamente, revisa las instrucciones.</span>
    `;
    
    document.body.appendChild(message);
    
    setTimeout(() => {
        message.style.animation = 'slideUp 0.5s ease';
        setTimeout(() => message.remove(), 500);
    }, 5000);
}

// Mostrar mensaje de error de configuración
function showConfigErrorMessage() {
    const errorDiv = document.createElement('div');
    errorDiv.style.cssText = `
        background: rgba(231, 76, 60, 0.95);
        color: white;
        padding: 20px;
        border-radius: 15px;
        margin: 20px auto;
        max-width: 600px;
        text-align: left;
    `;
    errorDiv.innerHTML = `
        <h3 style="margin-bottom: 15px; text-align: center;">🔧 Las fotos se suben pero no son públicas</h3>
        
        <div style="background: rgba(0,0,0,0.2); padding: 15px; border-radius: 10px; margin-bottom: 15px;">
            <strong>El problema:</strong> Las fotos se guardan en Cloudinary pero como <strong>privadas</strong>, 
            por eso no se pueden listar en la galería.
        </div>
        
        <p style="margin-bottom: 10px;"><strong>✅ Solución en 3 pasos:</strong></p>
        <ol style="line-height: 2; padding-left: 25px; margin-bottom: 15px;">
            <li>Ve a <strong>Cloudinary → Settings → Upload → Upload presets</strong></li>
            <li>Busca el preset <strong>"graduacion"</strong> y editalo</li>
            <li>Cambia <strong>"Access mode"</strong> de "Private" a <strong>"Public"</strong> ⭐</li>
            <li>En <strong>"Signing Mode"</strong> debe estar en <strong>"Unsigned"</strong></li>
            <li>Guarda los cambios</li>
        </ol>
        
        <div style="background: rgba(255,255,255,0.1); padding: 12px; border-radius: 8px; margin-bottom: 15px;">
            <strong>💡 Importante:</strong> Las fotos <strong>anteriores</strong> seguirán siendo privadas. 
            Después de hacer este cambio, <strong>tomá una nueva foto</strong> y esa sí será pública y visible en la galería.
        </div>
        
        <div style="text-align: center;">
            <button onclick="location.reload()" style="
                margin-top: 10px;
                padding: 12px 25px;
                background: white;
                color: #e74c3c;
                border: none;
                border-radius: 10px;
                font-weight: bold;
                cursor: pointer;
                font-size: 1em;
            ">🔄 Recargar Página</button>
        </div>
    `;
    
    emptyState.insertAdjacentElement('beforebegin', errorDiv);
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

// Estilos de animación para mensajes
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
        to {
            transform: translate(-50%, 0);
            opacity: 1;
        }
    }
    
    @keyframes slideUp {
        from {
            transform: translate(-50%, 0);
            opacity: 1;
        }
        to {
            transform: translate(-50%, -100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);