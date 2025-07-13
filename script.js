// iOS App Store Style - Store UI 4.0
class AcueStore {
    constructor() {
        this.apps = window.appsData || [];
        this.categories = window.categories || {};
        this.currentFilter = '';
        this.currentSearchTerm = '';
        this.currentPage = 'today';
        this.deviceInfo = this.detectDevice();
        this.isOlderDevice = this.detectOlderDevice();

        if (this.isOlderDevice) {
            this.optimizeForOlderDevices();
        }

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupNavigation();
        this.updatePageTitle();
        this.setTodayDate();
        this.renderHotApps();
        this.renderAllApps();
        this.renderPopularApps();
        this.initModals();
    }

    setupEventListeners() {
        // Bottom navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const page = item.dataset.page;
                this.switchToPage(page);
            });
        });

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.currentSearchTerm = e.target.value.toLowerCase().trim();
                this.handleSearch();
            });
        }

        // Category chips
        const categoryChips = document.querySelectorAll('.category-chip');
        categoryChips.forEach(chip => {
            chip.addEventListener('click', () => {
                const category = chip.dataset.category;
                this.filterByCategory(category);
                this.updateActiveCategoryChip(chip);
            });
        });

        // Profile button
        const profileBtn = document.getElementById('profileBtn');
        if (profileBtn) {
            profileBtn.addEventListener('click', () => {
                this.showProfileModal();
            });
        }
    }

    setupNavigation() {
        // Set initial active state
        this.switchToPage('today');
    }

    switchToPage(pageName) {
        // Hide all pages
        const pages = document.querySelectorAll('.page-section');
        pages.forEach(page => page.classList.remove('active'));

        // Show selected page
        const targetPage = document.getElementById(pageName + 'Page');
        if (targetPage) {
            targetPage.classList.add('active');
        }

        // Update navigation
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => item.classList.remove('active'));

        const activeNavItem = document.querySelector(`[data-page="${pageName}"]`);
        if (activeNavItem) {
            activeNavItem.classList.add('active');
        }

        this.currentPage = pageName;
        this.updatePageTitle();
    }

    updatePageTitle() {
        const pageTitle = document.getElementById('pageTitle');
        if (!pageTitle) return;

        const titles = {
            today: 'Today',
            apps: 'Apps',
            search: 'Search'
        };

        pageTitle.textContent = titles[this.currentPage] || 'Acue Store';
    }

    setTodayDate() {
        const todayDate = document.getElementById('todayDate');
        if (todayDate) {
            const today = new Date();
            const options = { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric' 
            };
            todayDate.textContent = today.toLocaleDateString('en-US', options).toUpperCase();
        }
    }

    renderHotApps() {
        const hotApps = this.apps.filter(app => app.isHot).slice(0, 8);
        const container = document.getElementById('hotAppsContainer');

        if (!container) return;

        container.innerHTML = hotApps.map(app => this.createHotAppCard(app)).join('');

        // Add event listeners
        const getButtons = container.querySelectorAll('.get-btn');
        getButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownload(hotApps[index]);
            });
        });
    }

    createHotAppCard(app) {
        const categoryInfo = this.categories[app.category] || { name: app.category };

        return `
            <div class="hot-app-card">
                <div class="hot-app-header">
                    <div class="hot-app-icon">
                        <i class="${app.icon}"></i>
                    </div>
                    <div class="hot-app-info">
                        <h4>${app.name}</h4>
                        <p>${app.developer}</p>
                    </div>
                </div>
                <div class="hot-app-footer">
                    <span class="hot-app-category">${categoryInfo.name}</span>
                    <button class="get-btn">GET</button>
                </div>
            </div>
        `;
    }

    renderAllApps() {
        let appsToRender = [...this.apps];

        if (this.currentFilter) {
            appsToRender = appsToRender.filter(app => app.category === this.currentFilter);
        }

        const container = document.getElementById('appsGrid');
        if (!container) return;

        container.innerHTML = appsToRender.map(app => this.createAppRow(app)).join('');

        // Add event listeners
        const getButtons = container.querySelectorAll('.get-btn');
        getButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownload(appsToRender[index]);
            });
        });

        // Add badge event listeners
        const badges = container.querySelectorAll('.app-badge');
        badges.forEach(badge => {
            badge.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const badgeType = badge.dataset.badgeType;
                this.showBadgeModal(badgeType);
            });
        });
    }

    createAppRow(app) {
        const categoryInfo = this.categories[app.category] || { name: app.category };
        const stars = this.generateStars(app.rating);
        const badges = this.createAppBadges(app.badges || []);

        return `
            <div class="app-row">
                <div class="app-icon-small">
                    <i class="${app.icon}"></i>
                </div>
                <div class="app-details">
                    <div class="app-name">${app.name}</div>
                    <div class="app-developer">${app.developer}</div>
                    <div class="app-rating">
                        <span class="rating-stars">${stars}</span>
                        <span class="rating-value">${app.rating}</span>
                    </div>
                    ${badges}
                </div>
                <button class="get-btn">GET</button>
            </div>
        `;
    }

    renderPopularApps() {
        const popularApps = this.apps
            .sort((a, b) => b.rating - a.rating)
            .slice(0, 6);

        const container = document.getElementById('popularApps');
        if (!container) return;

        container.innerHTML = popularApps.map(app => this.createPopularAppCard(app)).join('');

        // Add event listeners
        const getButtons = container.querySelectorAll('.get-btn');
        getButtons.forEach((button, index) => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleDownload(popularApps[index]);
            });
        });
    }

    createPopularAppCard(app) {
        const categoryInfo = this.categories[app.category] || { name: app.category };

        return `
            <div class="popular-app-card">
                <div class="popular-app-icon">
                    <i class="${app.icon}"></i>
                </div>
                <div class="popular-app-name">${app.name}</div>
                <div class="popular-app-category">${categoryInfo.name}</div>
                <button class="get-btn" style="margin-top: 8px;">GET</button>
            </div>
        `;
    }

    filterByCategory(category) {
        this.currentFilter = category;
        this.renderAllApps();
    }

    updateActiveCategoryChip(activeChip) {
        const chips = document.querySelectorAll('.category-chip');
        chips.forEach(chip => chip.classList.remove('active'));
        activeChip.classList.add('active');
    }

    handleSearch() {
        if (!this.currentSearchTerm) {
            // Show popular apps
            document.getElementById('popularApps').style.display = 'grid';
            document.getElementById('searchResults').style.display = 'none';
            return;
        }

        const filteredApps = this.apps.filter(app =>
            app.name.toLowerCase().includes(this.currentSearchTerm) ||
            app.developer.toLowerCase().includes(this.currentSearchTerm) ||
            app.description.toLowerCase().includes(this.currentSearchTerm) ||
            app.category.toLowerCase().includes(this.currentSearchTerm)
        );

        // Hide popular apps, show search results
        document.getElementById('popularApps').style.display = 'none';
        const searchResults = document.getElementById('searchResults');
        searchResults.style.display = 'block';

        if (filteredApps.length === 0) {
            searchResults.innerHTML = `
                <div class="no-results">
                    <h3>No Results found</h3>
                    <p>App does not exist</p>
                </div>
            `;
        } else {
            searchResults.innerHTML = filteredApps.map(app => this.createAppRow(app)).join('');

            // Add event listeners to search results
            const getButtons = searchResults.querySelectorAll('.get-btn');
            getButtons.forEach((button, index) => {
                button.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.handleDownload(filteredApps[index]);
                });
            });
        }
    }

    generateStars(rating) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);

        let stars = '';

        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }

        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }

        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }

        return stars;
    }

    createAppBadges(badges) {
        if (!badges || badges.length === 0) return '';

        const badgeTypes = window.badgeTypes || {};

        const badgeHtml = badges.map(badgeType => {
            const badge = badgeTypes[badgeType];
            if (!badge) return '';

            return `<span class="app-badge badge-${badgeType}" data-badge-type="${badgeType}">${badge.icon}</span>`;
        }).join('');

        return badgeHtml ? `<div class="app-badges">${badgeHtml}</div>` : '';
    }

    handleDownload(app) {
        if (!this.isBrowserAvailable()) {
            this.showBrowserError();
            return;
        }

        console.log(`Downloading ${app.name} from ${app.downloadUrl}`);
        window.open(app.downloadUrl, '_blank', 'noopener,noreferrer');
    }

    isBrowserAvailable() {
        if (typeof window === 'undefined' || typeof window.open !== 'function') {
            return false;
        }

        const userAgent = navigator.userAgent.toLowerCase();
        const browsers = ['chrome', 'firefox', 'safari', 'edge', 'opera', 'samsung', 'ucbrowser'];

        return browsers.some(browser => userAgent.includes(browser)) || 
               userAgent.includes('mozilla') || 
               userAgent.includes('webkit');
    }

    showBrowserError() {
        alert('Error 671: Browser Not Supported\n\nPlease have a Web Browser ready to download the app.');
    }

    initModals() {
        // Profile modal
        const profileModal = document.getElementById('profileModal');
        const closeProfileModal = document.getElementById('closeProfileModal');
        const aboutStoreBtn = document.getElementById('aboutStoreBtn');
        const rememberingBtn = document.getElementById('rememberingBtn');

        if (closeProfileModal) {
            closeProfileModal.addEventListener('click', () => {
                this.hideProfileModal();
            });
        }

        if (aboutStoreBtn) {
            aboutStoreBtn.addEventListener('click', () => {
                this.hideProfileModal();
                this.showBadgeModal('store-info');
            });
        }

        if (rememberingBtn) {
            rememberingBtn.addEventListener('click', () => {
                this.hideProfileModal();
                this.showRememberingModal();
            });
        }

        // Remembering modal
        const closeRememberingModal = document.getElementById('closeRememberingModal');
        if (closeRememberingModal) {
            closeRememberingModal.addEventListener('click', () => {
                this.hideRememberingModal();
            });
        }

        // Badge modal
        const badgeModalClose = document.getElementById('badgeModalClose');
        if (badgeModalClose) {
            badgeModalClose.addEventListener('click', () => {
                this.hideBadgeModal();
            });
        }

        // Close modals on background click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('profile-modal')) {
                this.hideProfileModal();
            }
            if (e.target.classList.contains('remembering-modal')) {
                this.hideRememberingModal();
            }
            if (e.target.classList.contains('badge-modal')) {
                this.hideBadgeModal();
            }
        });
    }

    showProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideProfileModal() {
        const modal = document.getElementById('profileModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showRememberingModal() {
        const modal = document.getElementById('rememberingModal');
        if (modal) {
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideRememberingModal() {
        const modal = document.getElementById('rememberingModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    showBadgeModal(badgeType) {
        const modal = document.getElementById('badgeModal');
        const title = document.getElementById('badgeModalTitle');
        const body = document.getElementById('badgeModalBody');
        const icon = document.getElementById('badgeModalIcon');

        if (!modal || !title || !body || !icon) return;

        const badgeInfo = {
            'data-sharing': {
                title: 'Data Sharing Notice',
                icon: '🌐',
                content: `
                    <p><strong>This app may share data with third parties.</strong></p>
                    <p>The app developer has indicated that this application may collect, use, or share the following types of data:</p>
                    <ul>
                        <li>Personal information (name, email, etc.)</li>
                        <li>Usage data and analytics</li>
                        <li>Device information</li>
                        <li>Location data (if applicable)</li>
                    </ul>
                    <p>Please review the app's privacy policy before downloading to understand how your data will be used.</p>
                `
            },
            'unstable': {
                title: 'Unstable App Warning',
                icon: '⚠️',
                content: `
                    <p><strong>This app may be unstable or contain bugs.</strong></p>
                    <p>Users have reported the following potential issues:</p>
                    <ul>
                        <li>App crashes or freezes</li>
                        <li>Performance issues</li>
                        <li>Feature limitations</li>
                        <li>Compatibility problems</li>
                    </ul>
                    <p>Download at your own risk. Consider looking for alternative apps with better stability ratings.</p>
                `
            },
            'store-info': {
                title: 'About Store',
                icon: 'ⓘ',
                content: `
                    <div class="store-info-content">
                        <p><strong>Store Information</strong></p>
                        <div class="info-grid">
                            <div class="info-item">
                                <span class="info-label">Store UI:</span>
                                <span class="info-value">4.0 (iOS Style)</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Security Patch:</span>
                                <span class="info-value">July 12, 2025</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">ASPFU Version:</span>
                                <span class="info-value">Beta-S6000ASPFUV918</span>
                            </div>
                            <div class="info-item">
                                <span class="info-label">Build:</span>
                                <span class="info-value">S6000Y25MJD8SU04</span>
                            </div>
                        </div>
                        <p>Acue Store provides safe and verified APK downloads from APKPure. All apps are scanned for security before being made available.</p>
                    </div>
                `
            }
        };

        const info = badgeInfo[badgeType];
        if (info) {
            title.textContent = info.title;
            icon.textContent = info.icon;
            body.innerHTML = info.content;
            modal.classList.add('show');
            document.body.style.overflow = 'hidden';
        }
    }

    hideBadgeModal() {
        const modal = document.getElementById('badgeModal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }

    detectDevice() {
        const userAgent = navigator.userAgent;
        return {
            type: /Mobi|Android/i.test(userAgent) ? 'Mobile' : 'Desktop',
            os: /Android/i.test(userAgent) ? 'Android' : 
                /iPhone|iPad|iPod/i.test(userAgent) ? 'iOS' : 'Other'
        };
    }

    detectOlderDevice() {
        const userAgent = navigator.userAgent.toLowerCase();
        const memory = navigator.deviceMemory || 4;
        const cores = navigator.hardwareConcurrency || 4;

        const olderDevices = [
            'sm-g935', 'sm-g930', 'sm-g925', 'sm-g920',
            'iphone 6', 'iphone 7', 'iphone 8'
        ];

        const isOlderDevice = olderDevices.some(device => userAgent.includes(device));
        const hasLowMemory = memory < 4;
        const hasLowCores = cores < 4;

        return isOlderDevice || hasLowMemory || hasLowCores;
    }

    optimizeForOlderDevices() {
        console.log('Optimizing for older device...');

        // Reduce animations
        const style = document.createElement('style');
        style.textContent = `
            * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }

            .horizontal-scroll {
                -webkit-overflow-scrolling: touch;
                scroll-behavior: auto;
            }
        `;
        document.head.appendChild(style);
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    window.acueStore = new AcueStore();
});
