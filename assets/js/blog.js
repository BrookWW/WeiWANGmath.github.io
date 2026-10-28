(() => {
    'use strict';

    const root = document.documentElement;
    const body = document.body;
    const themeButton = document.getElementById('blog-theme-toggle');
    const menuButton = document.getElementById('blog-menu-toggle');
    const navigation = document.getElementById('blog-nav');
    const mobileQuery = window.matchMedia('(max-width: 1179px)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    body.classList.add('blog-js');

    function setTheme(theme, persist = true) {
        const dark = theme === 'dark';
        root.dataset.theme = dark ? 'dark' : 'light';
        if (themeButton) {
            const label = dark ? 'Switch to day mode' : 'Switch to night mode';
            themeButton.setAttribute('aria-label', label);
            themeButton.title = label;
        }
        const themeColor = document.querySelector('meta[name="theme-color"]');
        if (themeColor) themeColor.content = dark ? '#020912' : '#eaf6fa';
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
        if (open) closeSiteSearch();
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

    const siteSearchArea = document.querySelector('.blog-search-area[data-search-source]');
    const siteSearchToggle = document.getElementById('blog-search-toggle');
    const siteSearchShell = document.getElementById('blog-search-shell');
    const siteSearchInput = document.getElementById('blog-site-search');
    const siteSearchResults = document.getElementById('blog-search-results');
    const siteSearchStatus = document.getElementById('blog-search-status');
    const compactSearchQuery = window.matchMedia('(max-width: 820px)');
    const sectionLabels = {
        'home-page': ['home', 'Home'],
        'cv-page': ['cv', 'Curriculum Vitae'],
        'research-page': ['research', 'Research'],
        'teaching-page': ['teaching', 'Teaching'],
        'talks-page': ['talks', 'Talks'],
        'notes-page': ['notes', 'Notes']
    };
    let siteSearchDocuments = null;
    let siteSearchLoading = null;
    let siteSearchSequence = 0;
    let siteSearchOptions = [];
    let activeSiteSearchOption = -1;
    let siteSearchFailed = false;
    const searchText = value => String(value || '').normalize('NFKC').toLocaleLowerCase().trim();

    function resetSiteSearchSelection() {
        activeSiteSearchOption = -1;
        siteSearchOptions = [];
        siteSearchInput?.removeAttribute('aria-activedescendant');
    }

    function hideSiteSearchResults() {
        siteSearchResults?.classList.remove('is-visible');
        siteSearchResults?.replaceChildren();
        siteSearchResults?.setAttribute('aria-busy', 'false');
        siteSearchInput?.setAttribute('aria-expanded', 'false');
        if (siteSearchStatus) siteSearchStatus.textContent = '';
        resetSiteSearchSelection();
    }

    function closeSiteSearch({ clear = false, restoreFocus = false } = {}) {
        siteSearchSequence += 1;
        siteSearchShell?.classList.remove('is-open');
        siteSearchToggle?.setAttribute('aria-expanded', 'false');
        siteSearchToggle?.setAttribute('aria-label', 'Open search');
        hideSiteSearchResults();
        if (clear && siteSearchInput) siteSearchInput.value = '';
        if (restoreFocus) {
            if (compactSearchQuery.matches) siteSearchToggle?.focus();
            else siteSearchInput?.focus({ preventScroll: true });
        }
    }

    function showSiteSearchMessage(message, busy = false) {
        if (!siteSearchResults || !siteSearchInput) return;
        resetSiteSearchSelection();
        const item = document.createElement('div');
        item.className = 'blog-search-empty';
        item.setAttribute('role', 'presentation');
        item.textContent = message;
        siteSearchResults.replaceChildren(item);
        siteSearchResults.setAttribute('aria-busy', String(busy));
        siteSearchResults.classList.add('is-visible');
        siteSearchInput.setAttribute('aria-expanded', 'true');
        if (siteSearchStatus) siteSearchStatus.textContent = message;
    }

    async function loadSiteSearchDocuments() {
        if (siteSearchDocuments) return siteSearchDocuments;
        if (siteSearchLoading) return siteSearchLoading;
        // Read the same section text and embedded blog index used by the homepage.
        siteSearchLoading = (async () => {
            const sourceURL = new URL(siteSearchArea.dataset.searchSource, window.location.href);
            if (sourceURL.origin !== window.location.origin) throw new Error('Invalid search source');
            const controller = new AbortController();
            const timeout = window.setTimeout(() => controller.abort(), 12000);
            try {
                const response = await fetch(sourceURL, { signal: controller.signal });
                if (!response.ok) throw new Error('Search source unavailable');
                const source = new DOMParser().parseFromString(await response.text(), 'text/html');
                const blogData = source.getElementById('blog-search-data');
                if (!source.querySelector('main.searchable') || !blogData) throw new Error('Invalid search source');
                const posts = JSON.parse(blogData.textContent);
                if (!Array.isArray(posts)) throw new Error('Invalid blog search data');
                const documents = [];
                source.querySelectorAll('.searchable h1, .searchable h2, .searchable h3, .searchable h4, .searchable p, .searchable li, .searchable tr').forEach(element => {
                    const section = sectionLabels[element.closest('main.searchable')?.id];
                    if (!section) return;
                    const fullText = element.textContent.replace(/\s+/g, ' ').trim();
                    if (!fullText) return;
                    documents.push({
                        label: section[1],
                        text: fullText.length > 120 ? fullText.slice(0, 120) + '…' : fullText,
                        search: searchText(fullText),
                        url: new URL('./#' + section[0], sourceURL).href
                    });
                });
                const basePath = new URL('.', sourceURL).pathname;
                posts.forEach(post => {
                    if (typeof post.title !== 'string' || typeof post.url !== 'string') return;
                    const url = new URL(post.url, sourceURL);
                    if (url.origin !== sourceURL.origin || !url.pathname.startsWith(basePath)) return;
                    const summary = typeof post.summary === 'string' ? post.summary : '';
                    const tags = Array.isArray(post.tags) ? post.tags.join(' ') : '';
                    documents.push({
                        label: 'Blog',
                        text: post.title + (summary ? ' — ' + summary : ''),
                        search: searchText([post.title, summary, tags, post.text].join(' ')),
                        url: url.href
                    });
                });
                siteSearchDocuments = documents;
                return documents;
            } finally {
                window.clearTimeout(timeout);
            }
        })();
        try {
            return await siteSearchLoading;
        } finally {
            // Failed requests can be retried; successful documents remain cached.
            siteSearchLoading = null;
        }
    }

    function renderSiteSearchResults(matches) {
        if (!matches.length) {
            showSiteSearchMessage('No matches');
            return;
        }
        hideSiteSearchResults();
        matches.slice(0, 10).forEach((match, index) => {
            const option = document.createElement('button');
            option.type = 'button';
            option.tabIndex = -1;
            option.id = 'blog-search-option-' + index;
            option.className = 'blog-search-result';
            option.setAttribute('role', 'option');
            option.setAttribute('aria-selected', 'false');
            option.addEventListener('click', () => window.location.assign(match.url));
            const label = document.createElement('span');
            label.className = 'blog-search-result-label';
            label.textContent = match.label;
            const content = document.createElement('span');
            content.className = 'blog-search-result-text';
            content.textContent = match.text;
            option.append(label, content);
            siteSearchResults.append(option);
            siteSearchOptions.push(option);
        });
        siteSearchResults.classList.add('is-visible');
        siteSearchInput.setAttribute('aria-expanded', 'true');
        if (siteSearchStatus) {
            siteSearchStatus.textContent = matches.length > 10
                ? 'Showing 10 of ' + matches.length + ' matches'
                : matches.length + (matches.length === 1 ? ' match' : ' matches');
        }
    }

    async function runSiteSearch() {
        const sequence = ++siteSearchSequence;
        const query = searchText(siteSearchInput?.value);
        siteSearchFailed = false;
        if (!query) {
            hideSiteSearchResults();
            return;
        }
        if (!siteSearchDocuments) showSiteSearchMessage('Loading search…', true);
        try {
            const documents = await loadSiteSearchDocuments();
            if (sequence !== siteSearchSequence) return;
            renderSiteSearchResults(documents.filter(entry => entry.search.includes(query)));
        } catch (_) {
            if (sequence !== siteSearchSequence) return;
            siteSearchFailed = true;
            showSiteSearchMessage('Search unavailable. Press Enter or type again to retry.');
        }
    }

    function selectSiteSearchOption(index) {
        if (!siteSearchOptions.length) return;
        activeSiteSearchOption = (index + siteSearchOptions.length) % siteSearchOptions.length;
        siteSearchOptions.forEach((option, current) => {
            const active = current === activeSiteSearchOption;
            option.classList.toggle('is-active', active);
            option.setAttribute('aria-selected', String(active));
        });
        const option = siteSearchOptions[activeSiteSearchOption];
        siteSearchInput.setAttribute('aria-activedescendant', option.id);
        option.scrollIntoView({ block: 'nearest' });
    }

    if (siteSearchArea && siteSearchInput && siteSearchResults) {
        siteSearchToggle?.addEventListener('click', () => {
            if (siteSearchShell.classList.contains('is-open')) {
                closeSiteSearch({ restoreFocus: true });
                return;
            }
            closeMenu();
            siteSearchShell.classList.add('is-open');
            siteSearchToggle.setAttribute('aria-expanded', 'true');
            siteSearchToggle.setAttribute('aria-label', 'Close search');
            if (document.activeElement === siteSearchInput) runSiteSearch();
            else siteSearchInput.focus();
        });
        siteSearchInput.addEventListener('focus', () => {
            closeMenu();
            runSiteSearch();
        });
        siteSearchInput.addEventListener('input', runSiteSearch);
        siteSearchInput.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                event.preventDefault();
                event.stopPropagation();
                closeSiteSearch({ clear: true, restoreFocus: true });
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
                if (!siteSearchOptions.length) return;
                event.preventDefault();
                const forward = event.key === 'ArrowDown';
                const next = activeSiteSearchOption < 0
                    ? (forward ? 0 : siteSearchOptions.length - 1)
                    : activeSiteSearchOption + (forward ? 1 : -1);
                selectSiteSearchOption(next);
            } else if (event.key === 'Enter') {
                event.preventDefault();
                if (siteSearchFailed) runSiteSearch();
                else siteSearchOptions[Math.max(0, activeSiteSearchOption)]?.click();
            }
        });
        siteSearchInput.closest('form')?.addEventListener('submit', event => event.preventDefault());
        siteSearchArea.addEventListener('focusout', event => {
            if (event.relatedTarget && !siteSearchArea.contains(event.relatedTarget)) closeSiteSearch();
        });
        document.addEventListener('click', event => {
            if (!siteSearchArea.contains(event.target)) closeSiteSearch();
        });
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape' && (siteSearchShell.classList.contains('is-open') || siteSearchResults.classList.contains('is-visible'))) {
                event.preventDefault();
                closeSiteSearch({ clear: true, restoreFocus: true });
            }
        });
        compactSearchQuery.addEventListener('change', event => {
            if (event.matches) closeSiteSearch({ restoreFocus: siteSearchArea.contains(document.activeElement) });
            else {
                siteSearchShell.classList.remove('is-open');
                siteSearchToggle?.setAttribute('aria-expanded', 'false');
                siteSearchToggle?.setAttribute('aria-label', 'Open search');
            }
        });
    }

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
            dialog.append(toolbar, scroller);
            body.append(dialog);
            let opener = null;
            let detailNumber = 0;

            const cloneDiagram = source => {
                const clone = source.cloneNode(true);
                const suffix = `-detail-${++detailNumber}`;
                const identifiers = new Map();
                const elements = [clone, ...clone.querySelectorAll('*')];
                elements.forEach(element => {
                    if (element.id) identifiers.set(element.id, element.id + suffix);
                });
                const replaceReferences = value => value.replace(/url\(\s*(['"]?)#([^)'"\s]+)\1\s*\)/g,
                    (match, quote, id) => identifiers.has(id) ? `url(#${identifiers.get(id)})` : match);
                elements.forEach(element => {
                    if (element.id) element.id = identifiers.get(element.id);
                    Array.from(element.attributes).forEach(attribute => {
                        if (attribute.name === 'id') return;
                        let value = replaceReferences(attribute.value);
                        if (attribute.name === 'aria-labelledby' || attribute.name === 'aria-describedby') {
                            value = value.split(/\s+/).map(id => identifiers.get(id) || id).join(' ');
                        } else if ((attribute.name === 'href' || attribute.name === 'xlink:href') && value.startsWith('#')) {
                            value = '#' + (identifiers.get(value.slice(1)) || value.slice(1));
                        }
                        if (value !== attribute.value) element.setAttribute(attribute.name, value);
                    });
                    if (element.localName === 'style') {
                        element.textContent = replaceReferences(element.textContent).replace(/([^{}]+)\{/g,
                            (match, selectors) => selectors.replace(/#([A-Za-z_][\w-]*)/g,
                                (selector, id) => identifiers.has(id) ? `#${identifiers.get(id)}` : selector) + '{');
                    }
                });
                clone.classList.add('diagram-image');
                if (clone.localName === 'img') clone.draggable = false;
                return clone;
            };

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
                scroller.replaceChildren();
            });
            figureLinks.forEach(link => {
                const thumbnail = link.querySelector('svg.diagram-canvas, img');
                if (!thumbnail) return;
                const description = thumbnail.getAttribute('aria-label')
                    || thumbnail.querySelector('title')?.textContent
                    || thumbnail.getAttribute('alt') || 'proof diagram';
                link.setAttribute('aria-haspopup', 'dialog');
                link.setAttribute('aria-label', `Enlarge diagram: ${description}`);
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
                    scroller.replaceChildren(cloneDiagram(thumbnail));
                    const sourceWidth = thumbnail.viewBox?.baseVal.width || thumbnail.naturalWidth || 0;
                    const fullWidth = Math.max(1040, sourceWidth);
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
