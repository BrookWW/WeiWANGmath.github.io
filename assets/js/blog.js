(() => {
    'use strict';

    const root = document.documentElement;
    const body = document.body;
    const themeButton = document.getElementById('blog-theme-toggle');
    const menuButton = document.getElementById('blog-menu-toggle');
    const navigation = document.getElementById('blog-nav');
    const mobileQuery = window.matchMedia('(max-width: 900px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    body.classList.add('blog-js');

    function setTheme(theme, persist = true) {
        const dark = theme === 'dark';
        root.dataset.theme = dark ? 'dark' : 'light';
        if (themeButton) {
            const label = dark ? 'Switch to day mode' : 'Switch to night mode';
            themeButton.setAttribute('aria-label', label);
            themeButton.title = label;
            const icon = themeButton.querySelector('[data-theme-icon]');
            if (icon) icon.textContent = dark ? '☀' : '☾';
        }
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) themeColor.content = dark ? '#06121e' : '#f5f9fc';
        if (persist) {
            try { localStorage.setItem('theme', dark ? 'dark' : 'light'); } catch (_) {}
        }
    }

    let savedTheme;
    try { savedTheme = localStorage.getItem('theme'); } catch (_) {}
    setTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : root.dataset.theme, false);
    themeButton?.addEventListener('click', () => setTheme(root.dataset.theme === 'dark' ? 'light' : 'dark'));
    window.addEventListener('storage', event => {
        if (event.key === 'theme' && (event.newValue === 'light' || event.newValue === 'dark')) setTheme(event.newValue, false);
    });

    function closeMenu(restoreFocus = false) {
        navigation?.classList.remove('is-open');
        menuButton?.setAttribute('aria-expanded', 'false');
        menuButton?.setAttribute('aria-label', 'Open navigation');
        if (restoreFocus) menuButton?.focus();
    }

    menuButton?.addEventListener('click', () => {
        const open = menuButton.getAttribute('aria-expanded') !== 'true';
        navigation?.classList.toggle('is-open', open);
        menuButton.setAttribute('aria-expanded', String(open));
        menuButton.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
    });
    navigation?.addEventListener('click', event => {
        if (event.target.closest('a')) closeMenu();
    });
    document.addEventListener('click', event => {
        if (navigation?.classList.contains('is-open') && !event.target.closest('.blog-header')) closeMenu();
    });
    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && navigation?.classList.contains('is-open')) closeMenu(true);
    });
    mobileQuery.addEventListener('change', event => {
        if (!event.matches) closeMenu();
    });

    const search = document.getElementById('blog-search');
    const tagButtons = Array.from(document.querySelectorAll('[data-blog-tag]'));
    const cards = Array.from(document.querySelectorAll('.post-card'));
    const resultCount = document.getElementById('blog-result-count');
    const empty = document.getElementById('blog-empty');
    let activeTag = '';
    const normalized = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();
    const indexedCards = cards.map(card => {
        let tags = [];
        try {
            const parsed = JSON.parse(card.dataset.tags || '[]');
            if (Array.isArray(parsed)) tags = parsed.map(normalized);
        } catch (_) {}
        return { card, text: normalized(card.dataset.search || card.textContent), tags };
    });

    if (cards.length) {
        const parameters = new URLSearchParams(window.location.search);
        if (search) search.value = parameters.get('q') || '';
        const requestedTag = normalized(parameters.get('tag'));
        if (tagButtons.some(button => normalized(button.dataset.blogTag) === requestedTag)) activeTag = requestedTag;
    }

    function filterPosts(syncUrl = false) {
        const terms = normalized(search?.value).split(/\s+/).filter(Boolean);
        let count = 0;
        indexedCards.forEach(({ card, text, tags }) => {
            const visible = terms.every(term => text.includes(term)) && (!activeTag || tags.includes(activeTag));
            card.hidden = !visible;
            if (visible) count += 1;
        });
        if (resultCount) {
            resultCount.textContent = `${count} ${count === 1 ? 'article' : 'articles'}${count !== cards.length ? ` of ${cards.length}` : ''}`;
            resultCount.setAttribute('aria-live', 'polite');
            resultCount.setAttribute('aria-atomic', 'true');
        }
        if (empty) empty.hidden = count !== 0;
        if (syncUrl) {
            const address = new URL(window.location.href);
            const query = search?.value.trim() || '';
            const selectedTag = tagButtons.find(button => normalized(button.dataset.blogTag) === activeTag)?.dataset.blogTag || '';
            if (query) address.searchParams.set('q', query);
            else address.searchParams.delete('q');
            if (selectedTag) address.searchParams.set('tag', selectedTag);
            else address.searchParams.delete('tag');
            history.replaceState(null, '', address);
        }
    }

    search?.addEventListener('input', () => filterPosts(true));
    search?.closest('form')?.addEventListener('submit', event => event.preventDefault());
    tagButtons.forEach(button => {
        button.setAttribute('aria-pressed', String(normalized(button.dataset.blogTag) === activeTag));
        button.addEventListener('click', () => {
            activeTag = normalized(button.dataset.blogTag);
            tagButtons.forEach(tag => tag.setAttribute('aria-pressed', String(normalized(tag.dataset.blogTag) === activeTag)));
            filterPosts(true);
        });
    });
    if (cards.length) filterPosts();

    document.querySelectorAll('.article-body pre').forEach(pre => {
        const code = pre.querySelector('code');
        if (!code || !navigator.clipboard?.writeText) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'copy-code';
        button.textContent = 'Copy code';
        button.setAttribute('aria-label', 'Copy this code block');
        button.addEventListener('click', async () => {
            try {
                await navigator.clipboard.writeText(code.textContent);
                button.textContent = 'Copied';
                button.setAttribute('aria-label', 'Code copied');
            } catch (_) {
                button.textContent = 'Copy unavailable';
                button.setAttribute('aria-label', 'Clipboard access unavailable');
            }
            window.setTimeout(() => {
                button.textContent = 'Copy code';
                button.setAttribute('aria-label', 'Copy this code block');
            }, 1800);
        });
        pre.classList.add('has-copy');
        pre.append(button);
    });

    const toc = document.querySelector('.article-toc');
    const tocDetails = toc?.querySelector('details');
    if (tocDetails) {
        tocDetails.open = !mobileQuery.matches;
        mobileQuery.addEventListener('change', event => { tocDetails.open = !event.matches; });
    }
    const tocLinks = Array.from(toc?.querySelectorAll('a[href^="#"]') || []);
    const headingLinks = tocLinks.map(link => {
        let id;
        try { id = decodeURIComponent(link.hash.slice(1)); } catch (_) { return null; }
        const heading = document.getElementById(id);
        return heading ? { heading, link } : null;
    }).filter(Boolean);
    let activeHeading = null;
    const updateActiveHeading = heading => {
        if (activeHeading === heading) return;
        activeHeading = heading;
        headingLinks.forEach(({ heading: item, link }) => {
            const active = item === heading;
            link.classList.toggle('is-active', active);
            if (active) link.setAttribute('aria-current', 'location');
            else link.removeAttribute('aria-current');
        });
    };
    const article = document.querySelector('.article-body');
    const progress = document.getElementById('reading-progress');
    let pendingFrame = false;
    const updateReadingPosition = () => {
        pendingFrame = false;
        if (!article) return;
        if (headingLinks.length) {
            let current = headingLinks[0].heading;
            for (const { heading } of headingLinks) {
                if (heading.getBoundingClientRect().top <= 155) current = heading;
                else break;
            }
            updateActiveHeading(current);
        }
        if (progress) {
            const rect = article.getBoundingClientRect();
            const range = Math.max(1, rect.height - window.innerHeight + 100);
            const amount = Math.min(1, Math.max(0, (100 - rect.top) / range));
            progress.style.transform = `scaleX(${amount})`;
        }
    };
    const requestReadingUpdate = () => {
        if (pendingFrame) return;
        pendingFrame = true;
        window.requestAnimationFrame(updateReadingPosition);
    };
    if (article) {
        window.addEventListener('scroll', requestReadingUpdate, { passive: true });
        window.addEventListener('resize', requestReadingUpdate, { passive: true });
        window.addEventListener('load', requestReadingUpdate, { once: true });
        document.fonts?.ready.then(requestReadingUpdate);
        requestReadingUpdate();
    }
    toc?.addEventListener('click', event => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        let target;
        try { target = document.getElementById(decodeURIComponent(link.hash.slice(1))); } catch (_) { return; }
        if (!target) return;
        if (tocDetails && mobileQuery.matches) tocDetails.open = false;
        if (reducedMotion.matches) target.scrollIntoView({ behavior: 'instant', block: 'start' });
    });

    const figureLinks = Array.from(document.querySelectorAll('.article-figure a.figure-link'));
    if (figureLinks.length && 'HTMLDialogElement' in window) {
        const dialog = document.createElement('dialog');
        if (typeof dialog.showModal === 'function') {
            dialog.className = 'diagram-dialog';
            dialog.setAttribute('aria-labelledby', 'diagram-dialog-title');
            dialog.setAttribute('aria-describedby', 'diagram-dialog-help');
            const toolbar = document.createElement('div');
            toolbar.className = 'diagram-toolbar';
            const titleGroup = document.createElement('div');
            const title = document.createElement('h2');
            title.id = 'diagram-dialog-title';
            title.textContent = 'Diagram detail';
            const instructions = document.createElement('p');
            instructions.id = 'diagram-dialog-help';
            instructions.textContent = 'Scroll to explore the full-size diagram, or fit it to the window.';
            titleGroup.append(title, instructions);
            const actions = document.createElement('div');
            actions.className = 'diagram-actions';
            const fitButton = document.createElement('button');
            fitButton.type = 'button';
            fitButton.textContent = 'Fit to window';
            fitButton.setAttribute('aria-pressed', 'false');
            const originalLink = document.createElement('a');
            originalLink.textContent = 'Open original ↗';
            originalLink.target = '_blank';
            originalLink.rel = 'noopener';
            const closeButton = document.createElement('button');
            closeButton.type = 'button';
            closeButton.className = 'diagram-close';
            closeButton.textContent = 'Close ×';
            closeButton.setAttribute('aria-label', 'Close diagram');
            closeButton.autofocus = true;
            actions.append(fitButton, originalLink, closeButton);
            toolbar.append(titleGroup, actions);
            const scroller = document.createElement('div');
            scroller.className = 'diagram-scroll';
            scroller.tabIndex = 0;
            scroller.setAttribute('role', 'region');
            scroller.setAttribute('aria-label', 'Scrollable full-size diagram');
            const image = document.createElement('img');
            image.className = 'diagram-image';
            image.draggable = false;
            scroller.append(image);
            dialog.append(toolbar, scroller);
            body.append(dialog);
            let opener = null;

            const resetScale = () => {
                dialog.classList.remove('diagram-fit');
                fitButton.textContent = 'Fit to window';
                fitButton.setAttribute('aria-pressed', 'false');
            };
            fitButton.addEventListener('click', () => {
                const fitted = dialog.classList.toggle('diagram-fit');
                fitButton.textContent = fitted ? 'Actual size' : 'Fit to window';
                fitButton.setAttribute('aria-pressed', String(fitted));
                scroller.scrollTo({ top: 0, left: 0, behavior: 'instant' });
            });
            closeButton.addEventListener('click', () => dialog.close());
            dialog.addEventListener('click', event => {
                if (event.target === dialog) dialog.close();
            });
            dialog.addEventListener('close', () => {
                body.classList.remove('diagram-open');
                opener?.focus({ preventScroll: true });
                image.removeAttribute('src');
            });
            figureLinks.forEach(link => {
                const thumbnail = link.querySelector('img');
                if (!thumbnail) return;
                link.setAttribute('aria-haspopup', 'dialog');
                link.setAttribute('aria-label', `Enlarge diagram: ${thumbnail.alt || 'proof diagram'}`);
                const caption = link.closest('figure')?.querySelector('figcaption');
                if (caption && !caption.querySelector('.figure-enlarge-hint')) {
                    const hint = document.createElement('span');
                    hint.className = 'figure-enlarge-hint';
                    hint.textContent = 'Select the diagram to explore it at full size.';
                    caption.append(hint);
                }
                link.addEventListener('click', event => {
                    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
                    event.preventDefault();
                    opener = link;
                    resetScale();
                    image.alt = thumbnail.alt;
                    image.src = link.href;
                    const fullWidth = Math.max(1040, thumbnail.naturalWidth || 0);
                    dialog.style.setProperty('--diagram-width', `${fullWidth}px`);
                    originalLink.href = link.href;
                    dialog.showModal();
                    body.classList.add('diagram-open');
                    scroller.scrollTo({ top: 0, left: 0, behavior: 'instant' });
                });
            });
        }
    }
})();
