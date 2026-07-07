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

const SELECTORS = {
    html: document.documentElement,
    pageContainer: document.getElementById('page-container'),
    mobileMenu: document.getElementById('mobile-menu'),
    searchInput: document.getElementById('global-search'),
    searchResults: document.getElementById('search-results'),
    themeIcon: document.getElementById('theme-icon')
};

let pages = [];
let navLinks = [];

async function loadSections() {
    const htmlParts = await Promise.all(SECTIONS.map(async section => {
        const response = await fetch(`sections/${section.slug}.html`, { cache: 'no-cache' });
        if (!response.ok) {
            throw new Error(`Could not load sections/${section.slug}.html`);
        }
        return response.text();
    }));

    SELECTORS.pageContainer.innerHTML = htmlParts.join('\n\n');
}

function setTheme(isDark) {
    SELECTORS.html.classList.toggle('dark', isDark);
    SELECTORS.themeIcon.className = isDark ? 'fa fa-sun-o text-lg' : 'fa fa-moon-o text-lg';
    localStorage.theme = isDark ? 'dark' : 'light';
}

function initializeTheme() {
    const savedTheme = localStorage.theme;
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setTheme(savedTheme === 'dark' || (!savedTheme && prefersDark));
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
        link.classList.toggle('active', link.dataset.page === pageId);
    });
}

function switchPage(pageId, targetElementId = null, options = {}) {
    const { updateHash = true, scrollToTop = true } = options;
    const nextPage = document.getElementById(pageId);
    if (!nextPage) {
        if (updateHash) {
            const slug = getSlugFromPageId(pageId);
            if (window.location.hash !== `#${slug}`) {
                history.pushState(null, '', `#${slug}`);
            }
        }
        return;
    }

    pages.forEach(page => page.classList.remove('active'));
    nextPage.classList.add('active');
    setActiveNavigation(pageId);

    SELECTORS.mobileMenu.classList.add('hidden');
    SELECTORS.searchResults.style.display = 'none';

    if (updateHash) {
        const slug = getSlugFromPageId(pageId);
        if (window.location.hash !== `#${slug}`) {
            history.pushState(null, '', `#${slug}`);
        }
    }

    if (targetElementId) {
        setTimeout(() => {
            const target = document.querySelector(`[data-search-id="${targetElementId}"]`);
            if (!target) return;

            target.scrollIntoView({ behavior: 'smooth', block: 'center' });
            target.classList.add('search-highlight-active');
            setTimeout(() => target.classList.remove('search-highlight-active'), 2000);
        }, 120);
        return;
    }

    if (scrollToTop) {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }
}

function initializePages() {
    pages = Array.from(SELECTORS.pageContainer.querySelectorAll('.page'));

    if (pages.length) return true;

    SELECTORS.pageContainer.innerHTML = `
        <div class="load-error">
            <h1>Content could not be loaded</h1>
            <p>Please check the files in <code>sections/</code> and preview the site through a local server.</p>
        </div>
    `;
    return false;
}

function initializeSearchIndex() {
    let idCounter = 0;
    const searchableElements = document.querySelectorAll(
        '.searchable h1, .searchable h2, .searchable h3, .searchable h4, .searchable p, .searchable li, .searchable tr'
    );

    searchableElements.forEach(element => {
        element.dataset.searchId = `idx-${idCounter++}`;
    });
}

function renderSearchResults(matches) {
    const results = SELECTORS.searchResults;
    results.innerHTML = '';

    if (!matches.length) {
        const empty = document.createElement('div');
        empty.className = 'p-3 text-xs text-center text-gray-500';
        empty.textContent = 'No matches';
        results.appendChild(empty);
        results.style.display = 'block';
        return;
    }

    matches.slice(0, 10).forEach(match => {
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'search-item block w-full text-left';
        item.addEventListener('click', () => switchPage(match.pageId, match.id));

        const label = document.createElement('div');
        label.className = 'text-[10px] text-primary font-bold uppercase';
        label.textContent = match.label;

        const text = document.createElement('div');
        text.className = 'text-xs text-gray-700 dark:text-gray-300 line-clamp-2';
        text.textContent = match.text;

        item.append(label, text);
        results.appendChild(item);
    });

    results.style.display = 'block';
}

function handleSearchInput(event) {
    const query = event.target.value.trim().toLowerCase();

    if (!query) {
        SELECTORS.searchResults.style.display = 'none';
        return;
    }

    const matches = Array.from(document.querySelectorAll('[data-search-id]'))
        .filter(element => element.innerText.toLowerCase().includes(query))
        .map(element => {
            const pageId = element.closest('.page').id;
            const compactText = element.textContent.replace(/\s+/g, ' ').trim();
            return {
                id: element.dataset.searchId,
                pageId,
                label: SECTION_BY_ID[pageId]?.label || 'Page',
                text: compactText.length > 110 ? `${compactText.substring(0, 110)}...` : compactText
            };
        });

    renderSearchResults(matches);
}

function bindEvents() {
    navLinks = Array.from(document.querySelectorAll('[data-page]'));

    navLinks.forEach(link => {
        link.addEventListener('click', event => {
            event.preventDefault();
            switchPage(link.dataset.page);
        });
    });

    document.getElementById('theme-toggle').addEventListener('click', () => {
        setTheme(!SELECTORS.html.classList.contains('dark'));
    });

    document.getElementById('menu-toggle').addEventListener('click', () => {
        SELECTORS.mobileMenu.classList.toggle('hidden');
    });

    SELECTORS.searchInput.addEventListener('input', handleSearchInput);

    SELECTORS.searchInput.addEventListener('keydown', event => {
        if (event.key === 'Escape') {
            SELECTORS.searchInput.value = '';
            SELECTORS.searchResults.style.display = 'none';
        }
    });

    document.addEventListener('click', event => {
        const clickedSearch = SELECTORS.searchInput.contains(event.target) || SELECTORS.searchResults.contains(event.target);
        if (!clickedSearch) SELECTORS.searchResults.style.display = 'none';
    });

    window.addEventListener('hashchange', () => {
        switchPage(getPageIdFromHash(), null, { updateHash: false });
    });
}

function typesetMath() {
    if (window.MathJax?.typesetPromise) {
        window.MathJax.typesetPromise();
    }
}

window.addEventListener('DOMContentLoaded', async () => {
    initializeTheme();
    bindEvents();

    try {
        await loadSections();
    } catch (error) {
        SELECTORS.pageContainer.innerHTML = `
            <div class="load-error">
                <h1>Content could not be loaded</h1>
                <p>${error.message}</p>
            </div>
        `;
        return;
    }

    if (!initializePages()) return;

    initializeSearchIndex();
    switchPage(getPageIdFromHash(), null, { updateHash: false, scrollToTop: false });
    typesetMath();
});
