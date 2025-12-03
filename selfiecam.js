// CONFIGURACIÓN DE CLOUDINARY - REEMPLAZÁ CON TUS DATOS
const CLOUDINARY_CLOUD_NAME = 'dukqtp9ww'; // Reemplazar
const CLOUDINARY_UPLOAD_PRESET = 'graduacion'; // Reemplazar
const CLOUDINARY_FOLDER = 'graduacion'; // Carpeta donde se guardarán las fotos

// Elementos del DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const preview = document.getElementById('preview');
const startBtn = document.getElementById('startBtn');
const switchBtn = document.getElementById('switchBtn');
const stickersBtn = document.getElementById('stickersBtn');
const captureBtn = document.getElementById('captureBtn');
const downloadBtn = document.getElementById('downloadBtn');
const newPhotoBtn = document.getElementById('newPhotoBtn');
const galleryBtn = document.getElementById('galleryBtn');
const initialState = document.getElementById('initialState');
const previewContainer = document.getElementById('previewContainer');
const stickersPanel = document.getElementById('stickersPanel');
const closeStickers = document.getElementById('closeStickers');
const clearStickers = document.getElementById('clearStickers');
const stickersGrid = document.getElementById('stickersGrid');
const cameraContainer = document.querySelector('.camera-container');
const loadingOverlay = document.getElementById('loadingOverlay');
const successMessage = document.getElementById('successMessage');

// Variables de estado
let stream = null;
let currentFacingMode = 'user';
let placedStickers = [];
let stickerIdCounter = 0;

// Stickers disponibles
const availableStickers = [
    '🎓', '🤖', '✨', '🎉', '🎊', '🥳', '💜', '❤️', '🌟', '⭐',
    '🏆', '📚', '💻', '🖥️', '📱', '🎯', '💪', '👍', '🙌', '✌️',
    '👏', '🤘', '🔥', '💯', '🎈', '🎁', '�', '🥂', '🎭', '🎨',
    '😎', '🤓', '😄', '😊', '🥰', '😍', '🤩', '💃', '🕺', '🎶'
];

// Inicializar grid de stickers
availableStickers.forEach(emoji => {
    const div = document.createElement('div');
    div.className = 'sticker-item';
    div.textContent = emoji;
    div.onclick = () => addSticker(emoji);
    stickersGrid.appendChild(div);
});

// Función para iniciar la cámara
async function startCamera(facingMode = 'user') {
    try {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }

        const constraints = {
            video: {
                facingMode: facingMode,
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            },
            audio: false
        };

        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        initialState.style.display = 'none';
        captureBtn.disabled = false;
        startBtn.textContent = '⏸️ Detener Cámara';
        switchBtn.style.display = 'inline-flex';
        stickersBtn.style.display = 'inline-flex';
        
    } catch (error) {
        console.error('Error al acceder a la cámara:', error);
        alert('No se pudo acceder a la cámara. Asegurate de dar permisos.');
    }
}

// Función para detener la cámara
function stopCamera() {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        video.srcObject = null;
        stream = null;
        initialState.style.display = 'block';
        captureBtn.disabled = true;
        startBtn.textContent = '🔹 Activar Cámara';
        switchBtn.style.display = 'none';
        stickersBtn.style.display = 'none';
    }
}

// Función para agregar sticker
function addSticker(emoji) {
    const stickerId = `sticker-${stickerIdCounter++}`;
    const stickerDiv = document.createElement('div');
    stickerDiv.className = 'placed-sticker';
    stickerDiv.id = stickerId;
    stickerDiv.innerHTML = `
        <div class="sticker-emoji">${emoji}</div>
        <div class="sticker-controls">
            <button class="sticker-btn" onclick="rotateSticker('${stickerId}')">🔄</button>
            <button class="sticker-btn" onclick="resizeSticker('${stickerId}', 1.2)">➕</button>
            <button class="sticker-btn" onclick="resizeSticker('${stickerId}', 0.8)">➖</button>
            <button class="sticker-btn" onclick="removeSticker('${stickerId}')">🗑️</button>
        </div>
    `;
    
    const rect = cameraContainer.getBoundingClientRect();
    stickerDiv.style.left = (rect.width / 2 - 30) + 'px';
    stickerDiv.style.top = (rect.height / 2 - 30) + 'px';
    
    cameraContainer.appendChild(stickerDiv);
    
    placedStickers.push({
        id: stickerId,
        emoji: emoji,
        rotation: 0,
        scale: 1
    });

    makeDraggable(stickerDiv);
    stickersPanel.classList.remove('open');
}

// Hacer sticker arrastrable
function makeDraggable(element) {
    let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
    
    element.onmousedown = dragMouseDown;
    element.ontouchstart = dragTouchStart;

    function dragMouseDown(e) {
        e.preventDefault();
        pos3 = e.clientX;
        pos4 = e.clientY;
        document.onmouseup = closeDragElement;
        document.onmousemove = elementDrag;
    }

    function dragTouchStart(e) {
        const touch = e.touches[0];
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        document.ontouchend = closeDragElement;
        document.ontouchmove = elementTouchDrag;
    }

    function elementDrag(e) {
        e.preventDefault();
        pos1 = pos3 - e.clientX;
        pos2 = pos4 - e.clientY;
        pos3 = e.clientX;
        pos4 = e.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function elementTouchDrag(e) {
        const touch = e.touches[0];
        pos1 = pos3 - touch.clientX;
        pos2 = pos4 - touch.clientY;
        pos3 = touch.clientX;
        pos4 = touch.clientY;
        element.style.top = (element.offsetTop - pos2) + "px";
        element.style.left = (element.offsetLeft - pos1) + "px";
    }

    function closeDragElement() {
        document.onmouseup = null;
        document.onmousemove = null;
        document.ontouchend = null;
        document.ontouchmove = null;
    }
}

// Rotar sticker
function rotateSticker(stickerId) {
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (sticker) {
        sticker.rotation = (sticker.rotation + 45) % 360;
        const element = document.getElementById(stickerId).querySelector('.sticker-emoji');
        element.style.transform = `rotate(${sticker.rotation}deg) scale(${sticker.scale})`;
    }
}

// Redimensionar sticker
function resizeSticker(stickerId, factor) {
    const sticker = placedStickers.find(s => s.id === stickerId);
    if (sticker) {
        sticker.scale *= factor;
        sticker.scale = Math.max(0.5, Math.min(3, sticker.scale));
        const element = document.getElementById(stickerId).querySelector('.sticker-emoji');
        element.style.transform = `rotate(${sticker.rotation}deg) scale(${sticker.scale})`;
    }
}

// Eliminar sticker
function removeSticker(stickerId) {
    const element = document.getElementById(stickerId);
    if (element) {
        element.remove();
        placedStickers = placedStickers.filter(s => s.id !== stickerId);
    }
}

// Limpiar todos los stickers
function clearAllStickers() {
    placedStickers.forEach(sticker => {
        const element = document.getElementById(sticker.id);
        if (element) element.remove();
    });
    placedStickers = [];
}

// Capturar foto
async function capturePhoto() {
    const container = document.querySelector('.camera-container');
    const rect = container.getBoundingClientRect();
    
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    const ctx = canvas.getContext('2d');

    // Dibujar video
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Dibujar stickers
    placedStickers.forEach(sticker => {
        const element = document.getElementById(sticker.id);
        if (element) {
            const stickerRect = element.getBoundingClientRect();
            const x = (stickerRect.left - rect.left) * 2;
            const y = (stickerRect.top - rect.top) * 2;
            
            ctx.save();
            ctx.translate(x + 60, y + 60);
            ctx.rotate(sticker.rotation * Math.PI / 180);
            ctx.scale(sticker.scale, sticker.scale);
            ctx.font = '120px Arial';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(sticker.emoji, 0, 0);
            ctx.restore();
        }
    });

    // Dibujar marco
    drawFrame(ctx, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL('image/png');
    preview.src = imageDataUrl;
    preview.style.display = 'block';
    previewContainer.style.display = 'block';
    
    // Subir a Cloudinary
    await uploadToCloudinary(imageDataUrl);
    
    setTimeout(() => {
        previewContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
}

// Subir imagen a Cloudinary
async function uploadToCloudinary(imageDataUrl) {
    loadingOverlay.classList.add('active');
    
    try {
        const blob = await fetch(imageDataUrl).then(r => r.blob());
        
        const formData = new FormData();
        formData.append('file', blob);
        formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
        formData.append('folder', CLOUDINARY_FOLDER);
        formData.append('timestamp', Date.now());

        const response = await fetch(
            `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
            {
                method: 'POST',
                body: formData
            }
        );

        if (!response.ok) {
            throw new Error('Error al subir la imagen');
        }

        const data = await response.json();
        console.log('Imagen subida exitosamente:', data.secure_url);
        
        // Guardar en localStorage como backup
        savePhotoLocally({
            public_id: data.public_id,
            format: data.format,
            created_at: data.created_at,
            url: data.secure_url
        });
        
        // Mostrar mensaje de éxito
        successMessage.classList.add('show');
        setTimeout(() => {
            successMessage.classList.remove('show');
        }, 5000);
        
    } catch (error) {
        console.error('Error al subir imagen:', error);
        alert('Hubo un error al guardar la foto. Por favor, intentá de nuevo.');
    } finally {
        loadingOverlay.classList.remove('active');
    }
}

// Dibujar marco decorativo
function drawFrame(ctx, width, height) {
    const padding = width * 0.06;

    ctx.fillStyle = 'rgba(102, 126, 234, 0.3)';
    ctx.fillRect(0, 0, width, height);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = width * 0.008;
    ctx.strokeRect(padding, padding, width - padding * 2, height - padding * 2);

    ctx.textAlign = 'center';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetX = 3;
    ctx.shadowOffsetY = 3;

    ctx.fillStyle = 'white';
    ctx.font = `900 ${width * 0.12}px Arial`;
    ctx.fillText('¡ME RECIBÍ!', width / 2, height * 0.08);

    ctx.font = `bold ${width * 0.06}px Arial`;
    ctx.fillStyle = '#FFD700';
    ctx.fillText('2025', width / 2, height * 0.13);

    ctx.font = `${width * 0.08}px Arial`;
    ctx.fillText('🎓', width * 0.15, height * 0.12);
    ctx.fillText('🤖', width * 0.85, height * 0.14);
    ctx.fillText('✨', width * 0.12, height * 0.88);
    ctx.fillText('🎉', width * 0.88, height * 0.86);

    ctx.fillStyle = 'white';
    ctx.font = `600 ${width * 0.035}px Arial`;
    ctx.fillText('🎯 Ciencias de Datos e IA', width / 2, height * 0.92);
    ctx.fillText('💻 Desarrollo Web y Aplicaciones Digitales', width / 2, height * 0.95);

    ctx.fillStyle = '#FFD700';
    ctx.font = `bold ${width * 0.04}px Arial`;
    ctx.fillText('#AlFinMeRecibi', width / 2, height * 0.98);
}

// Descargar foto
function downloadPhoto() {
    const link = document.createElement('a');
    link.download = `Graduacion-Selfie-${Date.now()}.png`;
    link.href = preview.src;
    link.click();
}

// Cambiar cámara
function switchCamera() {
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    startCamera(currentFacingMode);
}

// Event Listeners
startBtn.addEventListener('click', () => {
    if (stream) {
        stopCamera();
    } else {
        startCamera(currentFacingMode);
    }
});

switchBtn.addEventListener('click', switchCamera);
stickersBtn.addEventListener('click', () => {
    stickersPanel.classList.add('open');
});
closeStickers.addEventListener('click', () => {
    stickersPanel.classList.remove('open');
});
clearStickers.addEventListener('click', clearAllStickers);
captureBtn.addEventListener('click', capturePhoto);
downloadBtn.addEventListener('click', downloadPhoto);
newPhotoBtn.addEventListener('click', () => {
    previewContainer.style.display = 'none';
    preview.style.display = 'none';
});
galleryBtn.addEventListener('click', () => {
    window.location.href = 'gallery.html';
});

// Guardar foto localmente como backup
function savePhotoLocally(photoData) {
    try {
        const savedPhotos = localStorage.getItem('tito_photos');
        let photos = savedPhotos ? JSON.parse(savedPhotos) : [];
        
        photos.unshift(photoData); // Agregar al principio (más reciente)
        
        // Limitar a 100 fotos para no saturar localStorage
        if (photos.length > 100) {
            photos = photos.slice(0, 100);
        }
        
        localStorage.setItem('tito_photos', JSON.stringify(photos));
    } catch (error) {
        console.error('Error al guardar en localStorage:', error);
    }
}

// Hacer funciones globales para botones inline
window.rotateSticker = rotateSticker;
window.resizeSticker = resizeSticker;
window.removeSticker = removeSticker;