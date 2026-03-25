// ============================================================
// APP.JS - Logica do site
// ============================================================

(function() {
    const grid = document.getElementById('productsGrid');
    const filterButtons = document.querySelectorAll('.filter-btn');
    const modal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const modalCounter = document.getElementById('modalCounter');
    let currentModalImages = [];
    let currentModalIndex = 0;

    // --- Render Products ---
    function renderProducts(filter) {
        const filtered = filter === 'all'
            ? products
            : products.filter(p => p.category === filter);

        grid.innerHTML = filtered.map(p => createCard(p)).join('');
        attachGalleryEvents();
    }

    function createCard(p) {
        const discount = Math.round((1 - p.price / p.originalPrice) * 100);
        const economy = p.originalPrice - p.price;
        const hasImages = p.images && p.images.length > 0;
        const whatsappMsg = encodeURIComponent(
            `Oi! Tenho interesse no item: *${p.title}* (R$ ${p.price.toLocaleString('pt-BR')}). Vi no site do Desapega Mudanca.`
        );
        const whatsappLink = `https://wa.me/${WHATSAPP_NUMBER}?text=${whatsappMsg}`;

        let galleryHTML;
        if (hasImages) {
            galleryHTML = `
                <div class="card-gallery" data-product-id="${p.id}">
                    <img src="${p.images[0]}" alt="${p.title}" loading="lazy"
                         onerror="this.parentElement.innerHTML='<div class=gallery-placeholder><span style=font-size:3rem>${p.placeholder}</span><span>Foto em breve</span></div>'">
                    ${p.images.length > 1 ? `
                        <button class="gallery-nav gallery-prev" data-dir="-1">&#8249;</button>
                        <button class="gallery-nav gallery-next" data-dir="1">&#8250;</button>
                        <div class="gallery-dots">
                            ${p.images.map((_, i) => `<button class="gallery-dot${i === 0 ? ' active' : ''}" data-index="${i}"></button>`).join('')}
                        </div>
                    ` : ''}
                    <span class="photo-count">📷 ${p.images.length}</span>
                    <span class="discount-badge">-${discount}%</span>
                    ${p.available ? `<span class="date-badge">Disponivel ${p.available}</span>` : ''}
                </div>`;
        } else {
            galleryHTML = `
                <div class="card-gallery" data-product-id="${p.id}">
                    <div class="gallery-placeholder">
                        <span style="font-size:3rem">${p.placeholder}</span>
                        <span>Foto em breve</span>
                    </div>
                    <span class="discount-badge">-${discount}%</span>
                    ${p.available ? `<span class="date-badge">Disponivel ${p.available}</span>` : ''}
                </div>`;
        }

        return `
        <article class="product-card${p.sold ? ' sold' : ''}" data-category="${p.category}">
            ${galleryHTML}
            <div class="card-body">
                <h2 class="card-title">${p.title}</h2>
                <p class="card-description">${p.description}</p>
                <div class="condition">
                    <span>${p.conditionText}</span>
                    <div class="condition-bar">
                        <div class="condition-fill ${p.condition}"></div>
                    </div>
                </div>
                <div class="card-pricing">
                    <span class="price-sale">R$ ${p.price.toLocaleString('pt-BR')}</span>
                    <span class="price-original">R$ ${p.originalPrice.toLocaleString('pt-BR')}</span>
                    <span class="price-economy">Economia R$ ${economy.toLocaleString('pt-BR')}</span>
                </div>
                <a href="${whatsappLink}" target="_blank" rel="noopener" class="btn-whatsapp">
                    <svg viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    Tenho Interesse
                </a>
            </div>
        </article>`;
    }

    // --- Gallery Navigation ---
    function attachGalleryEvents() {
        document.querySelectorAll('.card-gallery').forEach(gallery => {
            const productId = parseInt(gallery.dataset.productId);
            const product = products.find(p => p.id === productId);
            if (!product || !product.images || product.images.length === 0) return;

            let currentIndex = 0;
            const img = gallery.querySelector('img');
            const dots = gallery.querySelectorAll('.gallery-dot');
            const navBtns = gallery.querySelectorAll('.gallery-nav');

            function showSlide(index) {
                currentIndex = index;
                if (img) {
                    img.src = product.images[currentIndex];
                    img.alt = `${product.title} - Foto ${currentIndex + 1}`;
                }
                dots.forEach((d, i) => d.classList.toggle('active', i === currentIndex));
            }

            navBtns.forEach(btn => {
                btn.addEventListener('click', e => {
                    e.stopPropagation();
                    const dir = parseInt(btn.dataset.dir);
                    let next = currentIndex + dir;
                    if (next < 0) next = product.images.length - 1;
                    if (next >= product.images.length) next = 0;
                    showSlide(next);
                });
            });

            dots.forEach(dot => {
                dot.addEventListener('click', e => {
                    e.stopPropagation();
                    showSlide(parseInt(dot.dataset.index));
                });
            });

            // Click to open modal
            gallery.addEventListener('click', () => {
                if (product.images.length > 0) {
                    openModal(product.images, currentIndex);
                }
            });

            // Swipe support for mobile
            let touchStartX = 0;
            gallery.addEventListener('touchstart', e => {
                touchStartX = e.changedTouches[0].screenX;
            }, { passive: true });
            gallery.addEventListener('touchend', e => {
                const diff = touchStartX - e.changedTouches[0].screenX;
                if (Math.abs(diff) > 50) {
                    let next = currentIndex + (diff > 0 ? 1 : -1);
                    if (next < 0) next = product.images.length - 1;
                    if (next >= product.images.length) next = 0;
                    showSlide(next);
                }
            }, { passive: true });
        });
    }

    // --- Modal ---
    function openModal(images, index) {
        currentModalImages = images;
        currentModalIndex = index;
        updateModal();
        modal.classList.add('open');
        document.body.style.overflow = 'hidden';
    }

    function closeModal() {
        modal.classList.remove('open');
        document.body.style.overflow = '';
    }

    function updateModal() {
        modalImage.src = currentModalImages[currentModalIndex];
        modalCounter.textContent = `${currentModalIndex + 1} / ${currentModalImages.length}`;
    }

    document.getElementById('modalClose').addEventListener('click', closeModal);
    document.getElementById('modalOverlay').addEventListener('click', closeModal);

    document.getElementById('modalPrev').addEventListener('click', () => {
        currentModalIndex = currentModalIndex === 0 ? currentModalImages.length - 1 : currentModalIndex - 1;
        updateModal();
    });

    document.getElementById('modalNext').addEventListener('click', () => {
        currentModalIndex = currentModalIndex === currentModalImages.length - 1 ? 0 : currentModalIndex + 1;
        updateModal();
    });

    document.addEventListener('keydown', e => {
        if (!modal.classList.contains('open')) return;
        if (e.key === 'Escape') closeModal();
        if (e.key === 'ArrowLeft') document.getElementById('modalPrev').click();
        if (e.key === 'ArrowRight') document.getElementById('modalNext').click();
    });

    // --- Filters ---
    filterButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            filterButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            renderProducts(btn.dataset.filter);
        });
    });

    // --- Init ---
    renderProducts('all');
})();
