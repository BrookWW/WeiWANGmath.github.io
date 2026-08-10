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

const elements = {
    html: document.documentElement,
    mobileMenu: document.getElementById('mobile-menu'),
    menuToggle: document.getElementById('menu-toggle'),
    searchArea: document.querySelector('.search-area'),
    searchShell: document.getElementById('search-shell'),
    searchToggle: document.getElementById('search-toggle'),
    searchInput: document.getElementById('global-search'),
    searchResults: document.getElementById('search-results'),
    themeToggle: document.getElementById('theme-toggle'),
    themeIcon: document.getElementById('theme-icon')
};

const pages = Array.from(document.querySelectorAll('.page'));
const pageLinks = Array.from(document.querySelectorAll('[data-page]'));
const navLinks = Array.from(document.querySelectorAll('.nav-link'));

function isDarkTheme() {
    return elements.html.dataset.theme === 'dark';
}

function setTheme(dark) {
    if (dark) {
        elements.html.dataset.theme = 'dark';
    } else {
        delete elements.html.dataset.theme;
    }

    elements.themeIcon.className = dark ? 'fa fa-sun-o' : 'fa fa-moon-o';
    elements.themeToggle.setAttribute('aria-label', dark ? 'Switch to light mode' : 'Switch to dark mode');
    document.querySelector('meta[name="theme-color"]').content = dark ? '#0f1720' : '#f7f9fb';

    try {
        localStorage.setItem('theme', dark ? 'dark' : 'light');
    } catch (error) {
        // Theme switching still works when browser storage is unavailable.
    }
}

function getPageIdFromHash() {
    const slug = window.location.hash.replace(/^#/, '').trim();
    return SECTION_BY_SLUG[slug]?.id || 'home-page';
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

function closeSearch() {
    elements.searchShell.classList.remove('is-open');
    elements.searchResults.classList.remove('is-visible');
    elements.searchToggle.setAttribute('aria-expanded', 'false');
    elements.searchToggle.setAttribute('aria-label', 'Open search');
}

function switchPage(pageId, targetElementId = null, options = {}) {
    const { updateHash = true, scrollToTop = true } = options;
    const nextPage = document.getElementById(pageId) || document.getElementById('home-page');
    const resolvedPageId = nextPage.id;

    pages.forEach(page => page.classList.toggle('active', page === nextPage));
    setActiveNavigation(resolvedPageId);
    closeMenu();
    closeSearch();

    const section = SECTION_BY_ID[resolvedPageId] || SECTION_BY_ID['home-page'];
    document.title = resolvedPageId === 'home-page' ? 'Wei Wang | Mathematics' : `${section.label} | Wei Wang`;

    if (updateHash) {
        const nextHash = `#${getSlugFromPageId(resolvedPageId)}`;
        if (window.location.hash !== nextHash) {
            history.pushState(null, '', nextHash);
        }
    }

    if (targetElementId) {
        window.setTimeout(() => {
            const target = document.querySelector(`[data-search-id="${targetElementId}"]`);
            if (!target) return;
            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('search-highlight-active');
            window.setTimeout(() => target.classList.remove('search-highlight-active'), 2000);
        }, 80);
        return;
    }

    if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function initializeSearchIndex() {
    let index = 0;
    document.querySelectorAll('.searchable h1, .searchable h2, .searchable h3, .searchable h4, .searchable p, .searchable li, .searchable tr')
        .forEach(element => {
            element.dataset.searchId = `idx-${index++}`;
        });
}

function showSearchResults() {
    elements.searchResults.classList.add('is-visible');
}

function renderSearchResults(matches) {
    elements.searchResults.replaceChildren();

    if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'search-empty';
        empty.textContent = 'No matches';
        elements.searchResults.appendChild(empty);
        showSearchResults();
        return;
    }

    matches.slice(0, 10).forEach(match => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'search-result';
        item.setAttribute('role', 'option');
        item.addEventListener('click', () => switchPage(match.pageId, match.id));

        const label = document.createElement('div');
        label.className = 'search-result-label';
        label.textContent = match.label;

        const text = document.createElement('div');
        text.className = 'search-result-text';
        text.textContent = match.text;

        item.append(label, text);
        elements.searchResults.appendChild(item);
    });

    showSearchResults();
}

function handleSearchInput(event) {
    const query = event.target.value.trim().toLowerCase();

    if (!query) {
        elements.searchResults.classList.remove('is-visible');
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

function bindEvents() {
    pageLinks.forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            switchPage(link.dataset.page);
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
        }
    });

    elements.searchInput.addEventListener('input', handleSearchInput);
    elements.searchInput.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            elements.searchInput.value = '';
            closeSearch();
            elements.searchToggle.focus();
        }
    });

    document.addEventListener('click', event => {
        if (!elements.searchArea.contains(event.target)) {
            elements.searchResults.classList.remove('is-visible');
            if (window.matchMedia('(max-width: 820px)').matches) closeSearch();
        }
    });

    window.addEventListener('hashchange', () => {
        switchPage(getPageIdFromHash(), null, { updateHash: false });
    });
}

setTheme(isDarkTheme());
initializeSearchIndex();
bindEvents();
switchPage(getPageIdFromHash(), null, { updateHash: false, scrollToTop: false });
