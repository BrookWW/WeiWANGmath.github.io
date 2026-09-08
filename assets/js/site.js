const SECTIONS = [
    { id: 'home-page', slug: 'home', label: 'Home' },
    { id: 'cv-page', slug: 'cv', label: 'Curriculum Vitae' },
    { id: 'research-page', slug: 'research', label: 'Research' },
    { id: 'teaching-page', slug: 'teaching', label: 'Teaching' },
    { id: 'talks-page', slug: 'talks', label: 'Talks' },
    { id: 'notes-page', slug: 'notes', label: 'Notes' }
];

const SECTION_BY_ID = Object.fromEntries(SECTIONS.map(section => [section.id, section]));
const SECTION_BY_SLUG = Object.fromEntries(SECTIONS.map(section => [section.slug, section]));
const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
const finePointerQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
const compactMotionQuery = window.matchMedia('(max-width: 720px)');
let reducedMotion = motionQuery.matches;
const lowPowerDevice = navigator.connection?.saveData
    || (navigator.deviceMemory && navigator.deviceMemory <= 4)
    || (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4);

const elements = {
    html: document.documentElement,
    body: document.body,
    mobileMenu: document.getElementById('mobile-menu'),
    menuToggle: document.getElementById('menu-toggle'),
    searchArea: document.querySelector('.search-area'),
    searchShell: document.getElementById('search-shell'),
    searchToggle: document.getElementById('search-toggle'),
    searchInput: document.getElementById('global-search'),
    searchResults: document.getElementById('search-results'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon'),
    skipLink: document.querySelector('.skip-link'),
    announcer: document.getElementById('page-announcer'),
    warp: document.getElementById('warp-transition'),
    galaxyStage: document.getElementById('galaxy-stage'),
    starfield: document.getElementById('starfield')
};

const pages = Array.from(document.querySelectorAll('.page'));
const pageLinks = Array.from(document.querySelectorAll('[data-page]'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

let searchMatches = [];
let searchResultButtons = [];
let activeSearchIndex = -1;
let warpSwitchTimer = 0;
let warpCleanupTimer = 0;
let navigationSequence = 0;

function isDarkTheme() {
    return elements.html.dataset.theme !== 'light';
}

function setTheme(dark, persist = true) {
    elements.html.dataset.theme = dark ? 'dark' : 'light';
    elements.themeIcon.className = dark ? 'fa fa-sun-o' : 'fa fa-moon-o';
    elements.themeToggle.setAttribute('aria-label', dark ? 'Switch to brighter sky' : 'Switch to dimmer sky');

    const themeColor = document.querySelector('meta[name="theme-color"]');
    if (themeColor) themeColor.content = dark ? '#02070d' : '#071521';

    if (!persist) return;
    try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch (error) {
        // Theme switching remains available when storage is blocked.
    }
}

function getHashSlug() {
    return window.location.hash.replace(/^#/, '').trim();
}

function getPageIdFromHash() {
    return SECTION_BY_SLUG[getHashSlug()]?.id || 'home-page';
}

function getSlugFromPageId(pageId) {
    return SECTION_BY_ID[pageId]?.slug || 'home';
}

function setActiveNavigation(pageId) {
    navLinks.forEach(link => {
        const active = link.dataset.page === pageId;
        link.classList.toggle('active', active);
        if (active) {
            link.setAttribute('aria-current', 'page');
        } else {
            link.removeAttribute('aria-current');
        }
    });
}

function closeMenu() {
    elements.mobileMenu.classList.remove('is-open');
    elements.menuToggle.setAttribute('aria-expanded', 'false');
    elements.menuToggle.setAttribute('aria-label', 'Open navigation');
}

function closeSearch({ clear = false, restoreFocus = false } = {}) {
    elements.searchShell.classList.remove('is-open');
    elements.searchResults.classList.remove('is-visible');
    elements.searchToggle.setAttribute('aria-expanded', 'false');
    elements.searchToggle.setAttribute('aria-label', 'Open search');
    elements.searchInput.setAttribute('aria-expanded', 'false');
    resetSearchSelection();

    if (clear) {
        elements.searchInput.value = '';
        elements.searchResults.replaceChildren();
    }

    if (restoreFocus && elements.searchToggle.offsetParent !== null) {
        elements.searchToggle.focus();
    } else if (restoreFocus) {
        elements.searchInput.blur();
    }
}

function resetSearchSelection() {
    searchMatches = [];
    searchResultButtons = [];
    activeSearchIndex = -1;
    elements.searchInput.removeAttribute('aria-activedescendant');
}

function focusPageHeading(page) {
    const heading = page.querySelector('h1, h2');
    if (!heading) return;
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
}

function scrollBehavior() {
    return reducedMotion ? 'auto' : 'smooth';
}

function switchPage(pageId, targetElementId = null, options = {}) {
    const {
        updateHash = true,
        scrollToTop = true,
        focusPage = false
    } = options;
    const nextPage = document.getElementById(pageId) || document.getElementById('home-page');
    const resolvedPageId = nextPage.id;
    const section = SECTION_BY_ID[resolvedPageId] || SECTION_BY_ID['home-page'];

    pages.forEach(page => {
        const active = page === nextPage;
        page.classList.toggle('active', active);
        page.hidden = !active;
        page.setAttribute('aria-hidden', String(!active));
        page.inert = !active;
    });

    setActiveNavigation(resolvedPageId);
    elements.body.dataset.activePage = section.slug;
    closeMenu();
    closeSearch();
    document.title = resolvedPageId === 'home-page' ? 'Wei Wang | Mathematics' : `${section.label} | Wei Wang`;

    if (updateHash) {
        const nextHash = `#${getSlugFromPageId(resolvedPageId)}`;
        if (window.location.hash !== nextHash) history.pushState(null, '', nextHash);
    }

    elements.announcer.textContent = `${section.label} section opened`;

    if (targetElementId) {
        window.setTimeout(() => {
            const target = document.querySelector(`[data-search-id="${targetElementId}"]`);
            if (!target) return;
            target.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
            target.classList.add('search-highlight-active');
            target.setAttribute('tabindex', '-1');
            target.focus({ preventScroll: true });
            window.setTimeout(() => target.classList.remove('search-highlight-active'), reducedMotion ? 50 : 2200);
        }, reducedMotion ? 0 : 90);
        return;
    }

    if (scrollToTop) window.scrollTo({ top: 0, behavior: scrollBehavior() });
    if (focusPage) window.setTimeout(() => focusPageHeading(nextPage), reducedMotion ? 0 : 320);
}

function setWarpOrigin(trigger) {
    const rect = trigger?.getBoundingClientRect?.();
    const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
    const y = rect ? rect.top + rect.height / 2 : window.innerHeight / 2;
    elements.warp.style.setProperty('--warp-x', `${x}px`);
    elements.warp.style.setProperty('--warp-y', `${y}px`);
}

function cancelNavigationTransition() {
    navigationSequence += 1;
    window.clearTimeout(warpSwitchTimer);
    window.clearTimeout(warpCleanupTimer);
    elements.body.classList.remove('is-warping');
}

function navigateToPage(pageId, targetElementId = null, trigger = null) {
    cancelNavigationTransition();
    const currentPage = document.querySelector('.page.active');
    if (currentPage?.id === pageId && !targetElementId) {
        switchPage(pageId, null, { focusPage: true });
        return;
    }

    const sequence = navigationSequence;

    if (reducedMotion || lowPowerDevice || compactMotionQuery.matches) {
        switchPage(pageId, targetElementId, { focusPage: !targetElementId });
        return;
    }

    setWarpOrigin(trigger);
    elements.body.classList.remove('is-warping');
    requestAnimationFrame(() => {
        if (sequence !== navigationSequence) return;
        elements.body.classList.add('is-warping');
    });

    warpSwitchTimer = window.setTimeout(() => {
        if (sequence !== navigationSequence) return;
        switchPage(pageId, targetElementId, { focusPage: !targetElementId });
    }, 250);

    warpCleanupTimer = window.setTimeout(() => {
        if (sequence !== navigationSequence) return;
        elements.body.classList.remove('is-warping');
    }, 720);
}

function initializeSearchIndex() {
    let index = 0;
    document.querySelectorAll('.searchable h1, .searchable h2, .searchable h3, .searchable h4, .searchable p, .searchable li, .searchable tr')
        .forEach(element => {
            element.dataset.searchId = `idx-${index++}`;
        });
}

function setActiveSearchResult(nextIndex) {
    if (!searchResultButtons.length) return;
    activeSearchIndex = (nextIndex + searchResultButtons.length) % searchResultButtons.length;
    searchResultButtons.forEach((button, index) => {
        const active = index === activeSearchIndex;
        button.setAttribute('aria-selected', String(active));
        button.classList.toggle('is-active', active);
    });
    const activeButton = searchResultButtons[activeSearchIndex];
    elements.searchInput.setAttribute('aria-activedescendant', activeButton.id);
    activeButton.scrollIntoView({ block: 'nearest' });
}

function showSearchResults() {
    elements.searchResults.classList.add('is-visible');
    elements.searchInput.setAttribute('aria-expanded', 'true');
}

function renderSearchResults(matches) {
    resetSearchSelection();
    searchMatches = matches.slice(0, 10);
    elements.searchResults.replaceChildren();

    if (!searchMatches.length) {
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.textContent = 'No matches';
        elements.searchResults.appendChild(empty);
        showSearchResults();
        return;
    }

    searchMatches.forEach((match, index) => {
        const item = document.createElement('button');
        item.type = 'button';
        item.id = `search-option-${index}`;
        item.className = 'search-result';
        item.setAttribute('role', 'option');
        item.setAttribute('aria-selected', 'false');
        item.addEventListener('click', () => navigateToPage(match.pageId, match.id, item));

        const label = document.createElement('div');
        label.className = 'search-result-label';
        label.textContent = match.label;

        const text = document.createElement('div');
        text.className = 'search-result-text';
        text.textContent = match.text;

        item.append(label, text);
        elements.searchResults.appendChild(item);
        searchResultButtons.push(item);
    });

    showSearchResults();
}

function handleSearchInput(event) {
    const query = event.target.value.trim().toLowerCase();
    if (!query) {
        elements.searchResults.classList.remove('is-visible');
        elements.searchInput.setAttribute('aria-expanded', 'false');
        elements.searchResults.replaceChildren();
        resetSearchSelection();
        return;
    }

    const matches = Array.from(document.querySelectorAll('[data-search-id]'))
        .filter(element => element.textContent.toLowerCase().includes(query))
        .map(element => {
            const pageId = element.closest('.page').id;
            const compactText = element.textContent.replace(/\s+/g, ' ').trim();
            return {
                id: element.dataset.searchId,
                pageId,
                label: SECTION_BY_ID[pageId]?.label || 'Page',
                text: compactText.length > 120 ? `${compactText.slice(0, 120)}…` : compactText
            };
        });

    renderSearchResults(matches);
}

function handleSearchKeydown(event) {
    if (event.key === 'Escape') {
        event.preventDefault();
        closeSearch({ clear: true, restoreFocus: true });
        return;
    }

    const resultsVisible = elements.searchResults.classList.contains('is-visible')
        && Boolean(elements.searchInput.value.trim());

    if (event.key === 'ArrowDown' && resultsVisible) {
        event.preventDefault();
        setActiveSearchResult(activeSearchIndex + 1);
        return;
    }

    if (event.key === 'ArrowUp' && resultsVisible) {
        event.preventDefault();
        setActiveSearchResult(activeSearchIndex - 1);
        return;
    }

    if (event.key === 'Enter' && resultsVisible && activeSearchIndex >= 0) {
        event.preventDefault();
        searchResultButtons[activeSearchIndex].click();
    }
}

function bindEvents() {
    elements.skipLink.addEventListener('click', event => {
        event.preventDefault();
        const activePage = document.querySelector('.page.active');
        if (!activePage) return;
        activePage.setAttribute('tabindex', '-1');
        activePage.focus({ preventScroll: true });
        window.scrollTo({ top: 0, behavior: scrollBehavior() });
    });

    pageLinks.forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            navigateToPage(link.dataset.page, null, link);
        });
    });

    elements.themeToggle.addEventListener('click', () => setTheme(!isDarkTheme()));

    elements.menuToggle.addEventListener('click', () => {
        const open = elements.mobileMenu.classList.toggle('is-open');
        elements.menuToggle.setAttribute('aria-expanded', String(open));
        elements.menuToggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
        if (open) closeSearch();
    });

    elements.searchToggle.addEventListener('click', () => {
        const open = elements.searchShell.classList.toggle('is-open');
        elements.searchToggle.setAttribute('aria-expanded', String(open));
        elements.searchToggle.setAttribute('aria-label', open ? 'Close search' : 'Open search');
        if (open) {
            closeMenu();
            window.setTimeout(() => elements.searchInput.focus(), 0);
            if (elements.searchInput.value.trim()) handleSearchInput({ target: elements.searchInput });
        } else {
            closeSearch();
        }
    });

    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('keydown', handleSearchKeydown);

    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape') return;
        if (elements.mobileMenu.classList.contains('is-open')) {
            closeMenu();
            elements.menuToggle.focus();
        }
    });

    document.addEventListener('click', event => {
        if (!elements.searchArea.contains(event.target)) {
            elements.searchResults.classList.remove('is-visible');
            elements.searchInput.setAttribute('aria-expanded', 'false');
            if (window.matchMedia('(max-width: 820px)').matches) closeSearch();
        }
        if (!elements.mobileMenu.contains(event.target) && !elements.menuToggle.contains(event.target)) {
            closeMenu();
        }
    });

    window.addEventListener('resize', () => {
        if (window.innerWidth > 1179) closeMenu();
        if (window.innerWidth > 820) closeSearch();
    });

    window.addEventListener('hashchange', () => {
        cancelNavigationTransition();
        const slug = getHashSlug();
        if (!SECTION_BY_SLUG[slug]) {
            history.replaceState(null, '', '#home');
            switchPage('home-page', null, { updateHash: false, focusPage: true });
            return;
        }
        switchPage(getPageIdFromHash(), null, { updateHash: false, focusPage: true });
    });
}

function initStarfield() {
    const canvas = elements.starfield;
    const context = canvas?.getContext?.('2d', { alpha: true });
    elements.body.classList.toggle('effects-lite', reducedMotion || Boolean(lowPowerDevice));
    if (!canvas || !context) {
        elements.body.classList.add('effects-lite');
        return;
    }

    let width = 0;
    let height = 0;
    let dpr = 1;
    let stars = [];
    let animationFrame = 0;
    let lastFrame = 0;
    let pointerX = 0;
    let pointerY = 0;
    let targetX = 0;
    let targetY = 0;
    let resizeTimer = 0;

    const createStars = () => {
        const area = width * height;
        const baseCount = Math.round(area / 12000);
        const count = Math.min(lowPowerDevice ? 62 : 145, Math.max(42, baseCount));
        stars = Array.from({ length: count }, (_, index) => ({
            x: Math.random(),
            y: Math.random(),
            depth: 0.25 + Math.random() * 0.75,
            radius: index % 19 === 0 ? 1.35 : 0.35 + Math.random() * 0.75,
            alpha: 0.24 + Math.random() * 0.62,
            drift: 0.001 + Math.random() * 0.003,
            phase: Math.random() * Math.PI * 2
        }));
    };

    const resize = () => {
        width = window.innerWidth;
        height = window.innerHeight;
        dpr = Math.min(window.devicePixelRatio || 1, lowPowerDevice ? 1 : 1.5);
        canvas.width = Math.max(1, Math.floor(width * dpr));
        canvas.height = Math.max(1, Math.floor(height * dpr));
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        context.setTransform(dpr, 0, 0, dpr, 0, 0);
        createStars();
    };

    const updateParallax = () => {
        if (!elements.galaxyStage) return;
        elements.galaxyStage.style.setProperty('--parallax-x', `${pointerX * 7}px`);
        elements.galaxyStage.style.setProperty('--parallax-y', `${pointerY * 7}px`);
        elements.galaxyStage.style.setProperty('--parallax-far-x', `${pointerX * -3}px`);
        elements.galaxyStage.style.setProperty('--parallax-far-y', `${pointerY * -3}px`);
    };

    const draw = time => {
        if (!reducedMotion && time - lastFrame < 32) {
            animationFrame = requestAnimationFrame(draw);
            return;
        }
        lastFrame = time;
        pointerX += (targetX - pointerX) * 0.045;
        pointerY += (targetY - pointerY) * 0.045;
        updateParallax();
        context.clearRect(0, 0, width, height);

        stars.forEach(star => {
            const x = star.x * width + pointerX * star.depth * 9;
            const drift = reducedMotion ? 0 : (time * star.drift * star.depth) % (height + 8);
            const y = (star.y * height + drift) % (height + 8) - 4;
            const pulse = reducedMotion ? 1 : 0.76 + Math.sin(time * 0.00065 + star.phase) * 0.24;
            context.beginPath();
            context.fillStyle = `rgba(190, 220, 231, ${Math.max(0.08, star.alpha * pulse)})`;
            context.arc(x, y, star.radius * star.depth, 0, Math.PI * 2);
            context.fill();

            if (star.radius > 1.2) {
                context.strokeStyle = `rgba(150, 196, 210, ${star.alpha * 0.22})`;
                context.lineWidth = 0.5;
                context.beginPath();
                context.moveTo(x - 3, y);
                context.lineTo(x + 3, y);
                context.moveTo(x, y - 3);
                context.lineTo(x, y + 3);
                context.stroke();
            }
        });

        if (!reducedMotion && !lowPowerDevice && !document.hidden) animationFrame = requestAnimationFrame(draw);
    };

    const start = () => {
        cancelAnimationFrame(animationFrame);
        animationFrame = requestAnimationFrame(draw);
    };

    resize();
    start();

    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            resize();
            if (reducedMotion || lowPowerDevice) draw(0);
        }, 120);
    });

    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animationFrame);
        } else if (!reducedMotion && !lowPowerDevice) {
            start();
        }
    });

    motionQuery.addEventListener('change', event => {
        reducedMotion = event.matches;
        elements.body.classList.toggle('effects-lite', reducedMotion || Boolean(lowPowerDevice));
        elements.body.classList.remove('is-warping');
        if (reducedMotion || lowPowerDevice) {
            cancelAnimationFrame(animationFrame);
            draw(0);
        } else if (!document.hidden) {
            start();
        }
    });

    if (finePointerQuery.matches && !lowPowerDevice && elements.galaxyStage) {
        elements.galaxyStage.addEventListener('pointermove', event => {
            const rect = elements.galaxyStage.getBoundingClientRect();
            targetX = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
            targetY = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
        }, { passive: true });
        elements.galaxyStage.addEventListener('pointerleave', () => {
            targetX = 0;
            targetY = 0;
        }, { passive: true });
    }

    if (reducedMotion || lowPowerDevice) {
        cancelAnimationFrame(animationFrame);
        draw(0);
    }
}

setTheme(isDarkTheme(), false);
initializeSearchIndex();
bindEvents();
initStarfield();

const initialSlug = getHashSlug();
if (initialSlug && !SECTION_BY_SLUG[initialSlug]) history.replaceState(null, '', '#home');
switchPage(getPageIdFromHash(), null, { updateHash: false, scrollToTop: false });

requestAnimationFrame(() => {
    elements.body.classList.add('site-ready');
    window.setTimeout(() => elements.html.classList.remove('js'), reducedMotion ? 0 : 1200);
});
