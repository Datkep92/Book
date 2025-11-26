// app.js - Main Application
class BookReader {
     constructor() {
        // Authentication system
        this.auth = new AuthSystem();
        
        // Reading state
        this.currentPage = 0;
        this.totalPages = 0;
        this.headings = [];
        this.currentBook = null;
        
        // UI state
        this.isMenuOpen = false;
        this.isSettingsOpen = false;
        
        // Touch gestures
        this.touchStartX = 0;
        this.touchStartY = 0;
        
        // Data
        this.documents = [];
        this.pendingUpload = null;
        
        // GitHub configuration
        this.ghConfig = {
            owner: 'Datkep92',
            repo: 'aquyet',
            basePath: 'docs/Quyet',
            token: ''
        };
    }

// app.js - Sửa hàm initialize để loadConfig TRƯỚC khi check auth
async initialize() {
    console.log('🚀 Khởi tạo BookReader...');
    
    // KHỞI TẠO ELEMENTS TRƯỚC
    this.initializeElements();
    
    // LOAD CONFIG TRƯỚC để có ghConfig
    this.loadConfig();
    
    // Khởi tạo auth system với elements
    const authElements = {
        adminLoginBtn: this.adminLoginBtn,
        adminLogoutBtn: this.adminLogoutBtn,
        adminSection: this.adminSection,
        grantAdminBtn: this.grantAdminBtn,
        usersList: this.usersList
    };
    
    console.log('🔧 Auth elements:', authElements);
    
    // KHỞI TẠO AUTH
    this.auth = new AuthSystem();
    this.auth.initialize(this.ghConfig, authElements);
    
    // Bind events và các setting khác
    this.bindEvents();
    this.disableZoom();
    this.disableHorizontalScroll();
    this.loadPreferences();

    // Check device và đăng ký
    console.log('📱 Checking device registration...');
    const authResult = await this.auth.checkDeviceAndRegister();
    
    if (authResult === 'registered') {
        // VỪA ĐĂNG KÝ THÀNH CÔNG - LOAD GITHUB NGAY
        console.log('🎯 Vừa đăng ký thành công - tự động load từ GitHub');
        await this.autoLoadFromGitHub();
    } else if (authResult === true) {
        // ĐÃ ĐĂNG KÝ TRƯỚC ĐÓ - LOAD GITHUB NGAY
        console.log('🎯 Đã đăng ký trước đó - tự động load từ GitHub');
        await this.autoLoadFromGitHub();
    } else {
        // ĐĂNG KÝ THẤT BẠI
        console.log('❌ Đăng ký thất bại - Dừng khởi tạo app');
        return;
    }
    this.updateUIBasedOnRole();
    console.log('✅ BookReader initialized với user:', this.auth.currentUser);
}

// app.js - Sửa hàm autoLoadFromGitHub
async autoLoadFromGitHub() {
    console.log('🌐 Tự động load từ GitHub...');
    console.log('📁 Current ghConfig:', this.ghConfig);
    
    // KIỂM TRA CẢ ghConfig HIỆN TẠI (từ loadConfig) VÀ savedConfig
    const savedConfig = localStorage.getItem('bookreader_gh_config');
    
    if ((this.ghConfig && this.ghConfig.owner && this.ghConfig.repo) || savedConfig) {
        // Nếu có config từ loadConfig() HOẶC từ localStorage
        if (savedConfig) {
            this.ghConfig = JSON.parse(savedConfig);
        }
        console.log('📁 Đã có config GitHub:', this.ghConfig);
        
        // GỌI TRỰC TIẾP loadFromGitHub()
        await this.loadFromGitHub();
    } else {
        console.log('ℹ️ Chưa có config GitHub - cần cấu hình thủ công');
        // Hiển thị settings để user cấu hình GitHub
        this.toggleSettings();
    }
}

// SỬA hàm loadConfig để đảm bảo ghConfig được load đúng
loadConfig() {
    const savedConfig = localStorage.getItem('bookreader_gh_config');
    if (savedConfig) {
        this.ghConfig = JSON.parse(savedConfig);
        console.log('📁 Loaded config from localStorage:', this.ghConfig);
    } else {
        // Nếu không có saved config, dùng config mặc định
        this.ghConfig = {
            owner: 'Datkep92',
            repo: 'aquyet', 
            basePath: 'docs/Quyet',
            token: ''
        };
        console.log('📁 Using default config:', this.ghConfig);
    }
    
    // Cập nhật UI nếu elements tồn tại
    if (this.ghOwner && this.ghRepo && this.ghBasePath && this.ghToken) {
        this.ghOwner.value = this.ghConfig.owner;
        this.ghRepo.value = this.ghConfig.repo;
        this.ghBasePath.value = this.ghConfig.basePath;
        this.ghToken.value = this.ghConfig.token;
        
        // Hide config inputs if already configured
        this.toggleGitHubConfig(false);
    }
    
    // Load saved documents
    const savedDocuments = localStorage.getItem('bookreader_documents');
    if (savedDocuments) {
        this.documents = JSON.parse(savedDocuments);
        this.renderDocumentsList();
        console.log('📚 Loaded documents from localStorage:', this.documents.length);
    }
}



// THÊM hàm debug để kiểm tra
debugElements() {
    console.log('🔍 Debug Elements:');
    console.log('- adminLoginBtn:', this.adminLoginBtn);
    console.log('- adminSection:', this.adminSection);
    console.log('- settingsPanel:', this.settingsPanel);
    console.log('- ghConfigSection:', this.ghConfigSection);
    
    // Kiểm tra xem elements có trong DOM không
    const checkElements = [
        'admin-login-btn',
        'admin-section', 
        'settings-panel',
        'gh-config-section',
        'gh-owner',
        'gh-repo'
    ];
    
    checkElements.forEach(id => {
        const el = document.getElementById(id);
        console.log(`- ${id}:`, el ? 'FOUND' : 'NOT FOUND');
    });
}

    initializeElements() {
        // Sidebar elements
        this.sidebar = document.getElementById('sidebar');
        this.menuToggleBtn = document.getElementById('menu-toggle-btn');
        this.closeMenuBtn = document.getElementById('close-menu-btn');
        this.sidebarSettingsBtn = document.getElementById('sidebar-settings-btn');
        this.githubSection = document.getElementById('github-section');
        this.adminLoginSection = document.getElementById('admin-login-section');

        // Settings elements
        this.settingsPanel = document.getElementById('settings-panel');
        this.settingsBtn = document.getElementById('settings-btn');
        this.closeSettingsBtn = document.getElementById('close-settings-btn');
        
        // GitHub elements
        this.ghConfigSection = document.getElementById('gh-config-section');
        this.ghOwner = document.getElementById('gh-owner');
        this.ghRepo = document.getElementById('gh-repo');
        this.ghBasePath = document.getElementById('gh-base-path');
        this.ghToken = document.getElementById('gh-token');
        this.saveConfigBtn = document.getElementById('save-config-btn');
        this.loadFromGitHubBtn = document.getElementById('load-from-github-btn');
        this.reconfigureGitHubBtn = document.getElementById('reconfigure-github-btn');
        
        // Admin elements
        this.adminPanel = document.getElementById('admin-panel');
        this.adminLoginBtn = document.getElementById('admin-login-btn');
        this.adminLogoutBtn = document.getElementById('admin-logout-btn');
        this.adminSection = document.getElementById('admin-section');
        this.adminStats = document.getElementById('admin-stats');
        this.uploadSection = document.getElementById('upload-section');
        
        // File upload elements
        this.fileInput = document.getElementById('file-input');
        this.authorName = document.getElementById('author-name');
        this.bookTitleInput = document.getElementById('book-title-input');
        this.uploadBtn = document.getElementById('upload-btn');
        if (this.uploadBtn) this.uploadBtn.disabled = true;
        
        // Documents list
        this.documentsList = document.getElementById('documents-list');
        
        // Content elements
        this.mainWrapper = document.getElementById('main-wrapper');
        this.contentReader = document.getElementById('content-reader');
        this.fileContentDiv = document.getElementById('file-content-display');
        this.placeholderDiv = document.getElementById('placeholder-content');
        this.bookTitle = document.getElementById('book-title');
        
        // Table of contents
        this.tocList = document.getElementById('toc-list');
        this.tocSearch = document.getElementById('toc-search');
        this.tocSearchResults = document.getElementById('toc-search-results');
        
        // Page indicator
        this.currentPageEl = document.getElementById('current-page');
        this.totalPagesEl = document.getElementById('total-pages');
        this.pageIndicator = document.getElementById('page-indicator');
        
        // Progress
        this.progressFill = document.getElementById('progress-fill');
        
        // Settings
        this.fontSizeSelect = document.getElementById('font-size');
        this.themeSelect = document.getElementById('theme');
        
        // Loading
        this.loadingOverlay = document.getElementById('loading-overlay');

        // Pending upload buffer for processed files
        this.pendingUpload = null;
        
        // Get started button
        this.getStartedBtn = document.getElementById('get-started-btn');
        
        // NEW ELEMENTS - Sidebar navigation và search
        this.sidebarNav = document.getElementById('sidebar-nav');
        this.backBtn = document.getElementById('back-btn');
        this.pageTitle = document.getElementById('page-title');
        this.documentsSearch = document.getElementById('documents-search');
        this.documentsSearchResults = document.getElementById('documents-search-results');
        this.documentsSearchContainer = document.getElementById('documents-search-container');
        this.documentsSection = document.getElementById('documents-section');
        this.tocSearchContainer = document.getElementById('toc-search-container');
        this.tocSection = document.getElementById('toc-section');
        this.userManagementSection = document.getElementById('user-management-section');
        this.usersList = document.getElementById('users-list');
        this.grantAdminBtn = document.getElementById('grant-admin-btn');
    }
   bindEvents() {
    // Menu controls
    this.menuToggleBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleMenu();
    });
    
    this.closeMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeMenu();
    });
    
    // Settings controls
    this.settingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSettings();
    });
    
    this.sidebarSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleSettings();
    });
    
    this.closeSettingsBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.closeSettings();
    });
    
    // GitHub operations
    this.saveConfigBtn.addEventListener('click', () => {
        this.saveGitHubConfig();
    });
    
    this.loadFromGitHubBtn.addEventListener('click', () => {
        this.loadFromGitHub();
    });
    
    this.reconfigureGitHubBtn.addEventListener('click', () => {
        this.toggleGitHubConfig();
    });
    
    // Get started button
    this.getStartedBtn.addEventListener('click', () => {
        this.toggleSettings();
    });
    
    // Settings changes
    this.fontSizeSelect.addEventListener('change', (e) => {
        this.changeFontSize(e.target.value);
    });
    
    this.themeSelect.addEventListener('change', (e) => {
        this.changeTheme(e.target.value);
    });
    
    // File upload operations
    this.uploadBtn.addEventListener('click', () => {
        this.uploadFileToGitHub();
    });

    // Pre-process file on select
    this.fileInput.addEventListener('change', async () => {
        const f = this.fileInput.files[0];
        if (!f) return;
        try {
            this.showMessage('🔍 Đang xử lý file...');
            const res = await this.handleFileSelect(f, { 
                fileContentDiv: this.fileContentDiv, 
                bookTitleEl: null, 
                contentReaderEl: this.contentReader 
            });
            this.pendingUpload = { 
                file: f, 
                book: res.book, 
                processedContent: res.processedContent 
            };

            if (!this.bookTitleInput.value) {
                this.bookTitleInput.value = res.book.name;
            }

            this.uploadBtn.disabled = false;
            this.showUploadPreview(res);
            this.showMessage('✅ File đã được xử lý, sẵn sàng upload');
        } catch (e) {
            console.error('Preprocess error', e);
            this.showMessage('❌ Lỗi xử lý file: ' + (e.message || e));
        }
    });
    
    // Sidebar navigation events
    this.backBtn.addEventListener('click', () => {
        this.showDocumentsList();
    });
    
    this.documentsSearch.addEventListener('input', (e) => {
        this.searchDocuments(e.target.value);
    });

    // Documents list events
    this.documentsList.addEventListener('click', (e) => {
        const documentItem = e.target.closest('.document-item');
        if (documentItem) {
            const index = parseInt(documentItem.getAttribute('data-index'));
            this.openDocument(index);
        }
    });

    // Touch events for swipe navigation
    this.contentReader.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.contentReader.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    
    // Keyboard navigation
    document.addEventListener('keydown', (e) => this.handleKeydown(e));
    
    // Close panels when clicking outside
    document.addEventListener('click', (e) => {
        if (this.isMenuOpen && !e.target.closest('.sidebar') && !e.target.closest('.menu-toggle-btn')) {
            this.closeMenu();
        }
        if (this.isSettingsOpen && !e.target.closest('.settings-panel') && !e.target.closest('.settings-btn') && !e.target.closest('.sidebar-settings-btn')) {
            this.closeSettings();
        }
    });

    // Prevent event propagation
    this.sidebar.addEventListener('click', (e) => e.stopPropagation());
    this.settingsPanel.addEventListener('click', (e) => e.stopPropagation());

    // Scroll event for page tracking
    this.contentReader.addEventListener('scroll', () => {
        this.updateCurrentPage();
        this.saveReadingProgress();
    });

    // TOC search events
    this.tocSearch.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        
        if (searchTerm === '') {
            this.tocSearchResults.style.display = 'none';
            this.showAllTOCItems();
            return;
        }

        const filteredHeadings = this.headings.filter(heading => 
            heading.text.toLowerCase().includes(searchTerm)
        );

        this.filterTOCItems(searchTerm);
        this.showSearchResults(filteredHeadings, searchTerm);
    });

    // TOC list click events
    this.tocList.addEventListener('click', (e) => {
        const tocLink = e.target.closest('.toc-link');
        if (tocLink) {
            e.preventDefault();
            const index = parseInt(tocLink.getAttribute('data-index'));
            this.scrollToHeading(this.headings[index].element);
            this.closeMenu();
        }
    });

    // TOC search results click events
    this.tocSearchResults.addEventListener('click', (e) => {
        const searchResult = e.target.closest('.toc-search-result');
        if (searchResult) {
            const index = parseInt(searchResult.getAttribute('data-index'));
            this.scrollToHeading(this.headings[index].element);
            this.closeMenu();
            this.tocSearchResults.style.display = 'none';
            this.tocSearch.value = '';
            this.showAllTOCItems();
        }
    });

    // Documents search results click events
    this.documentsSearchResults.addEventListener('click', (e) => {
        const searchResult = e.target.closest('.documents-search-result');
        if (searchResult) {
            const index = parseInt(searchResult.getAttribute('data-index'));
            this.openDocument(index);
            this.documentsSearchResults.style.display = 'none';
            this.documentsSearch.value = '';
            this.showAllDocuments();
        }
    });

    console.log('✅ Tất cả events đã được bind');
}
// THÊM vào app.js
showAdminPanel() {
    this.adminSection.style.display = 'block';
    this.loadAccessStats();
    this.loadUsersList();
}


    // app.js - SỬA hàm logAccess (chỉ local)
async logAccess(action, documentTitle = '') {
    const deviceId = this.auth.currentUser?.deviceId || 'unknown';
    
    const logEntry = {
        deviceId: deviceId,
        action: action,
        document: documentTitle,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent
    };
    
    // CHỈ LƯU LOCAL - KHÔNG GỬI GITHUB
    const accessLogs = JSON.parse(localStorage.getItem('bookreader_access_logs') || '[]');
    accessLogs.push(logEntry);
    
    // Giữ chỉ 1000 bản ghi gần nhất
    if (accessLogs.length > 1000) {
        accessLogs.splice(0, accessLogs.length - 1000);
    }
    
    localStorage.setItem('bookreader_access_logs', JSON.stringify(accessLogs));
    console.log('📊 Logged access (local):', action, documentTitle);
}

// SỬA hàm loadAccessStats (chỉ local)
loadAccessStats() {
    const accessLogs = JSON.parse(localStorage.getItem('bookreader_access_logs') || '[]');
    
    // Tính toán stats từ local data
    const stats = this.calculateLocalStats(accessLogs);
    
    this.adminStats.innerHTML = `
        <div class="stat-item">
            <span class="stat-label">Truy cập local:</span>
            <span class="stat-value">${stats.totalAccess}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Sách đã xem:</span>
            <span class="stat-value">${stats.uniqueDocuments}</span>
        </div>
        <div class="stat-item">
            <span class="stat-label">Lần cuối:</span>
            <span class="stat-value">${stats.lastAccess}</span>
        </div>
        <div class="document-stats">
            <h4>Sách đã đọc:</h4>
            ${stats.documentStats.map(doc => `
                <div class="doc-stat-item">
                    <span class="doc-name">${doc.document}</span>
                    <span class="doc-views">${doc.views} lượt</span>
                </div>
            `).join('')}
        </div>
    `;
}

// THÊM hàm tính stats local
calculateLocalStats(accessLogs) {
    const uniqueDocuments = [...new Set(accessLogs.map(log => log.document).filter(Boolean))];
    const documentStats = uniqueDocuments.map(doc => {
        const views = accessLogs.filter(log => log.document === doc).length;
        return { document: doc, views: views };
    });
    
    const lastAccess = accessLogs.length > 0 ? 
        new Date(accessLogs[accessLogs.length - 1].timestamp).toLocaleDateString('vi-VN') : 
        'Chưa có';
    
    return {
        totalAccess: accessLogs.length,
        uniqueDocuments: uniqueDocuments.length,
        lastAccess: lastAccess,
        documentStats: documentStats
    };
}



            calculateStats(accessLogs) {
                const uniqueDevices = this.getUniqueDevices(accessLogs);
                const onlineDevices = this.getOnlineDevices(accessLogs);
                const documentStats = this.getDocumentStats(accessLogs);
                
                return {
                    totalDevices: uniqueDevices.length,
                    totalAccess: accessLogs.length,
                    onlineDevices: onlineDevices,
                    documentStats: documentStats
                };
            }

            getUniqueDevices(accessLogs) {
                const deviceMap = new Map();
                accessLogs.forEach(log => {
                    deviceMap.set(log.deviceId, log);
                });
                return Array.from(deviceMap.values());
            }

            getOnlineDevices(accessLogs) {
                const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
                return accessLogs
                    .filter(log => log.timestamp > fiveMinutesAgo)
                    .map(log => log.deviceId)
                    .filter((value, index, self) => self.indexOf(value) === index);
            }

            getDocumentStats(accessLogs) {
                const docStats = {};
                accessLogs.forEach(log => {
                    if (log.document) {
                        if (!docStats[log.document]) {
                            docStats[log.document] = { views: 0, lastAccess: '' };
                        }
                        docStats[log.document].views++;
                        if (log.timestamp > docStats[log.document].lastAccess) {
                            docStats[log.document].lastAccess = log.timestamp;
                        }
                    }
                });
                return docStats;
            }


            

            saveGitHubConfig() {
                this.ghConfig = {
                    owner: this.ghOwner.value.trim(),
                    repo: this.ghRepo.value.trim(),
                    basePath: this.ghBasePath.value.trim(),
                    token: this.ghToken.value.trim()
                };
                
                localStorage.setItem('bookreader_gh_config', JSON.stringify(this.ghConfig));
                this.toggleGitHubConfig(false);
                this.showMessage('✅ Đã lưu cấu hình GitHub!');
            }

            toggleGitHubConfig(show = true) {
                const inputs = this.ghConfigSection.querySelectorAll('input');
                inputs.forEach(input => {
                    input.style.display = show ? 'block' : 'none';
                });
                
                this.saveConfigBtn.style.display = show ? 'block' : 'none';
                this.reconfigureGitHubBtn.style.display = show ? 'none' : 'block';
            }

// app.js - SỬA hàm loadFromGitHub
async loadFromGitHub() {
    console.log('🌐 Bắt đầu loadFromGitHub với cấu trúc mới...');
    
    if (!this.ghConfig.owner || !this.ghConfig.repo) {
        this.showMessage('❌ Vui lòng nhập GitHub Owner và Repo!');
        return;
    }
    
    try {
        this.showLoading();
        
        // SMART LOADING: Hiển thị cache trước, update sau
        await this.smartLoadDocuments();
        
        this.hideLoading();
        this.closeSettings();

    } catch (error) {
        this.hideLoading();
        console.error('❌ GitHub load error:', error);
        this.showMessage('❌ Lỗi tải từ GitHub: ' + error.message);
    }
}

// THÊM hàm smartLoadDocuments
async smartLoadDocuments() {
    console.log('🔍 Smart loading documents...');
    
    // 1. Kiểm tra cache trước
    const cachedMeta = this.getCachedDocumentsMeta();
    if (cachedMeta && this.isCacheValid(cachedMeta)) {
        console.log('📱 Hiển thị documents từ cache');
        this.documents = cachedMeta.documents;
        this.renderDocumentsList();
        
        // Mở sách đầu tiên ngay nếu có
        if (this.documents.length > 0 && !this.currentBook) {
            this.openDocument(0);
        }
    }
    
    // 2. Đồng thời quét GitHub để update
    try {
        console.log('🌐 Đang quét GitHub để cập nhật...');
        const githubDocuments = await this.scanGitHubForDocuments();
        
        // 3. So sánh và merge
        const mergedDocuments = this.mergeDocuments(this.documents, githubDocuments);
        
        // 4. Lưu cache mới
        this.saveDocumentsMeta(mergedDocuments);
        
        // 5. Cập nhật UI nếu có thay đổi
        if (this.hasDocumentsChanged(this.documents, mergedDocuments)) {
            this.documents = mergedDocuments;
            this.renderDocumentsList();
            console.log('🔄 Đã cập nhật documents từ GitHub');
        }
        
    } catch (error) {
        console.warn('⚠️ Không thể quét GitHub, giữ cache hiện tại:', error);
    }
}
// app.js - THÊM các hàm helper
async fetchAllAuthorsFromGitHub() {
    const apiUrl = `https://api.github.com/repos/${this.ghConfig.owner}/${this.ghConfig.repo}/contents/${this.ghConfig.basePath}`;
    const headers = this.ghConfig.token ? { Authorization: `token ${this.ghConfig.token}` } : {};
    
    try {
        const response = await fetch(apiUrl, { headers });
        if (!response.ok) return [];
        
        const items = await response.json();
        const authors = items
            .filter(item => item.type === 'dir')
            .map(item => item.name);
            
        return authors;
    } catch (error) {
        console.error('Error fetching authors:', error);
        return [];
    }
}

async fetchAuthorFiles(author) {
    const apiUrl = `https://api.github.com/repos/${this.ghConfig.owner}/${this.ghConfig.repo}/contents/${this.ghConfig.basePath}/${author}`;
    const headers = this.ghConfig.token ? { Authorization: `token ${this.ghConfig.token}` } : {};
    
    try {
        const response = await fetch(apiUrl, { headers });
        if (!response.ok) return [];
        
        const items = await response.json();
        const htmlFiles = items
            .filter(item => item.type === 'file' && item.name.endsWith('.html'))
            .map(item => ({
                id: `${author}_${item.name.replace('.html', '')}_${Date.now()}`,
                title: this.filenameToTitle(item.name),
                author: this.slugToName(author),
                authorSlug: author,
                file: `${author}/${item.name}`,
                fileSize: item.size,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            }));
            
        return htmlFiles;
    } catch (error) {
        console.error(`Error fetching files for author ${author}:`, error);
        return [];
    }
}

filenameToTitle(filename) {
    return filename
        .replace('.html', '')
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

slugToName(slug) {
    return slug
        .replace(/_/g, ' ')
        .replace(/\b\w/g, l => l.toUpperCase());
}

removeDuplicateDocuments(documents) {
    const seen = new Set();
    return documents.filter(doc => {
        const key = `${doc.authorSlug}_${doc.file}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

mergeDocuments(oldDocs, newDocs) {
    const merged = [...oldDocs];
    const oldKeys = new Set(oldDocs.map(d => `${d.authorSlug}_${d.file}`));
    
    newDocs.forEach(newDoc => {
        const key = `${newDoc.authorSlug}_${newDoc.file}`;
        if (!oldKeys.has(key)) {
            merged.push(newDoc);
        }
    });
    
    return merged;
}
// app.js - THÊM cache system cơ bản
getCachedDocumentsMeta() {
    try {
        const cached = localStorage.getItem('bookreader_documents_meta');
        return cached ? JSON.parse(cached) : null;
    } catch (error) {
        console.error('Error reading cache:', error);
        return null;
    }
}

saveDocumentsMeta(documents) {
    try {
        const meta = {
            lastSync: new Date().toISOString(),
            documents: documents.map(doc => ({
                id: doc.id,
                title: doc.title,
                author: doc.author,
                authorSlug: doc.authorSlug,
                file: doc.file,
                fileSize: doc.fileSize,
                createdAt: doc.createdAt,
                updatedAt: doc.updatedAt
                // KHÔNG lưu content
            }))
        };
        
        localStorage.setItem('bookreader_documents_meta', JSON.stringify(meta));
        console.log('💾 Đã lưu documents metadata vào cache');
    } catch (error) {
        console.error('Error saving cache:', error);
    }
}

isCacheValid(cachedMeta) {
    if (!cachedMeta || !cachedMeta.lastSync) return false;
    
    const cacheAge = Date.now() - new Date(cachedMeta.lastSync).getTime();
    const MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours
    
    return cacheAge < MAX_CACHE_AGE;
}
hasDocumentsChanged(oldDocs, newDocs) {
    if (oldDocs.length !== newDocs.length) return true;
    
    const oldKeys = new Set(oldDocs.map(d => `${d.authorSlug}_${d.file}`));
    const newKeys = new Set(newDocs.map(d => `${d.authorSlug}_${d.file}`));
    
    return !(oldKeys.size === newKeys.size && [...oldKeys].every(key => newKeys.has(key)));
}
// THÊM hàm scanGitHubForDocuments
async scanGitHubForDocuments() {
    console.log('🔍 Scanning GitHub for documents...');
    
    const documents = [];
    
    try {
        // Thử load từ documents.json trước
        const docsUrl = `https://raw.githubusercontent.com/${this.ghConfig.owner}/${this.ghConfig.repo}/main/${this.ghConfig.basePath}/documents.json`;
        const res = await fetch(docsUrl);
        if (res.ok) {
            const docsFromJson = await res.json();
            documents.push(...docsFromJson);
            console.log('✅ Loaded from documents.json:', docsFromJson.length);
        }
    } catch (error) {
        console.log('📭 documents.json not found, scanning folders...');
    }
    
    // Quét thư mục tác giả để tìm file mới
    try {
        const authors = await this.fetchAllAuthorsFromGitHub();
        console.log('👥 Found authors:', authors);
        
        for (const author of authors) {
            const authorFiles = await this.fetchAuthorFiles(author);
            documents.push(...authorFiles);
        }
    } catch (error) {
        console.warn('⚠️ Cannot scan author folders:', error);
    }
    
    // Remove duplicates
    const uniqueDocuments = this.removeDuplicateDocuments(documents);
    console.log('📚 Total unique documents:', uniqueDocuments.length);
    
    return uniqueDocuments;
}

            // compact recursive listing via GitHub contents API
            async fetchAllFilesFromGitHub(path = '') {
                const files = [];
                const apiBase = `https://api.github.com/repos/${this.ghConfig.owner}/${this.ghConfig.repo}/contents`;
                const headers = this.ghConfig.token ? { Authorization: `token ${this.ghConfig.token}` } : {};

                const walk = async (p) => {
                    const url = `${apiBase}/${p}`.replace(/\\/g, '/');
                    const r = await fetch(url, { headers });
                    if (!r.ok) return;
                    const list = await r.json();
                    for (const item of list) {
                        if (item.type === 'dir') await walk(item.path);
                        else if (item.type === 'file') files.push(item.path);
                    }
                };

                await walk(path);
                // normalize to relative to basePath when possible
                return files.map(p => p.startsWith(this.ghConfig.basePath + '/') ? p : p);
            }

            // app.js - SỬA hàm uploadFileToGitHub
async uploadFileToGitHub() {
    if (!this.auth.isAdmin) {
        this.showMessage('❌ Vui lòng đăng nhập Admin!');
        return;
    }

    const file = this.fileInput.files[0];
    const author = this.authorName.value.trim();
    const title = this.bookTitleInput.value.trim();

    if (!file || !author || !title) {
        this.showMessage('❌ Vui lòng điền đầy đủ thông tin!');
        return;
    }

    try {
        this.showLoading();
        
        // 1. Tạo slug cho tác giả và tiêu đề
        const authorSlug = this.slugify(author);
        const titleSlug = this.slugify(title);
        
        console.log('📁 Tạo folder tác giả:', authorSlug);
        
        // 2. Đường dẫn file mới
        const filePath = `${this.ghConfig.basePath}/${authorSlug}/${titleSlug}.html`;
        
        // 3. Xử lý file content
        let book, processedContent;
        if (this.pendingUpload && this.pendingUpload.file === file) {
            book = this.pendingUpload.book;
            processedContent = this.pendingUpload.processedContent;
        } else {
            const result = await this.handleFileSelect(file, { 
                fileContentDiv: this.fileContentDiv, 
                bookTitleEl: this.bookTitle, 
                contentReaderEl: this.contentReader 
            });
            book = result.book;
            processedContent = result.processedContent;
        }

        this.currentBook = book;

        // 4. Upload file lên GitHub
        console.log('📤 Uploading to:', filePath);
        const result = await this.uploadToGitHub(filePath, processedContent);
        
        // 5. Cập nhật documents.json
        await this.updateDocumentsJson({
            id: `${authorSlug}_${titleSlug}_${Date.now()}`,
            title: title,
            author: author,
            authorSlug: authorSlug,
            file: `${authorSlug}/${titleSlug}.html`,
            fileSize: processedContent.length,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isNew: true
        });

        this.hideLoading();
        this.showMessage(`✅ Upload thành công!\n📁 Tác giả: ${author}\n📖 Sách: ${title}`);
        
        // Reset form
        this.fileInput.value = '';
        this.authorName.value = '';
        this.bookTitleInput.value = '';
        this.pendingUpload = null;
        this.clearUploadPreview();

    } catch (error) {
        this.hideLoading();
        console.error('Upload error:', error);
        this.showMessage('❌ Lỗi upload: ' + (error.message || error));
    }
}

// THÊM hàm slugify
slugify(text) {
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9]/g, '_') // Replace non-alphanumeric with _
        .replace(/_+/g, '_') // Replace multiple _ with single
        .replace(/^_|_$/g, ''); // Remove leading/trailing _
}
// THÊM các hàm này vào app.js
async loadUsersList() {
    if (!this.auth.isAdmin) return;
    await this.auth.loadUsersList();
}

async grantAdminPermission(deviceId) {
    if (!this.auth.isAdmin) return;
    await this.auth.grantAdminPermission(deviceId);
}

async revokeAdminPermission(deviceId) {
    if (!this.auth.isAdmin) return;
    await this.auth.revokeAdminPermission(deviceId);
}
            async uploadToGitHub(path, content, message = 'Add new document') {
                const apiUrl = `https://api.github.com/repos/${this.ghConfig.owner}/${this.ghConfig.repo}/contents/${path}`;
                
                // Check if file exists
                let sha = null;
                try {
                    const checkResponse = await fetch(apiUrl, {
                        headers: {
                            'Authorization': `token ${this.ghConfig.token}`,
                            'Accept': 'application/vnd.github.v3+json'
                        }
                    });
                    
                    if (checkResponse.ok) {
                        const existingFile = await checkResponse.json();
                        sha = existingFile.sha;
                        message = 'Update existing document';
                    }
                } catch (error) {
                    // File doesn't exist, continue with upload
                }

                const payload = {
                    message: message,
                    content: btoa(unescape(encodeURIComponent(content))),
                    branch: 'main'
                };

                if (sha) {
                    payload.sha = sha;
                }

                // Attempt PUT with retries to handle concurrent updates. We'll retry up to 3 times.
                let attempts = 0;
                const maxAttempts = 3;
                let lastErr = null;

                while (attempts < maxAttempts) {
                    attempts++;
                    const response = await fetch(apiUrl, {
                        method: 'PUT',
                        headers: {
                            'Authorization': `token ${this.ghConfig.token}`,
                            'Content-Type': 'application/json',
                            'Accept': 'application/vnd.github.v3+json'
                        },
                        body: JSON.stringify(payload)
                    });

                    if (response.ok) return await response.json();

                    // handle conflict by refetching metadata (get newest sha) and retry
                    if (response.status === 409) {
                        lastErr = await response.json().catch(() => ({ message: `HTTP ${response.status}` }));
                        console.warn('⚠️ UPLOAD 409 conflict, attempt', attempts, 'of', maxAttempts, lastErr.message || lastErr);
                        try {
                            const meta = await fetch(apiUrl, { headers: { 'Authorization': `token ${this.ghConfig.token}`, 'Accept': 'application/vnd.github.v3+json' } });
                            if (!meta.ok) continue;
                            const existing = await meta.json();
                            // If we get content, update payload.sha and also try to merge JSON if both are JSON
                            payload.sha = existing.sha;
                            // Try merging if content looks like JSON and new content is JSON
                            try {
                                const remoteContent = existing.content ? decodeURIComponent(escape(window.atob(existing.content))) : null;
                                const ourObj = JSON.parse(content);
                                const remoteObj = remoteContent ? JSON.parse(remoteContent) : null;
                                if (remoteObj && typeof remoteObj === 'object' && typeof ourObj === 'object') {
                                    // Simple merge: remote fields preserved, new fields overwrite
                                    const merged = Object.assign({}, remoteObj, ourObj);
                                    payload.content = btoa(unescape(encodeURIComponent(JSON.stringify(merged, null, 2))));
                                }
                            } catch (e) {
                                // not JSON or merge failed — keep our payload.content
                            }
                            // next loop iteration will retry
                            continue;
                        } catch (e) {
                            lastErr = e;
                            console.warn('Retry after 409 failed to fetch meta:', e.message || e);
                            continue;
                        }
                    }

                    // Non-409 errors -> show error
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP ${response.status}`);
                }

                // If we exit loop without success
                throw new Error(lastErr && lastErr.message ? lastErr.message : 'Failed to upload after multiple attempts');

                return await response.json();
            }

            // app.js - SỬA hàm updateDocumentsJson
async updateDocumentsJson(newDoc) {
    const docsPath = `${this.ghConfig.basePath}/documents.json`;
    
    // Load existing documents
    let documents = [];
    try {
        const docsUrl = `https://raw.githubusercontent.com/${this.ghConfig.owner}/${this.ghConfig.repo}/main/${docsPath}`;
        const response = await fetch(docsUrl);
        if (response.ok) {
            documents = await response.json();
        }
    } catch (error) {
        // documents.json doesn't exist yet
    }

    // Tìm và update document
    const existingIndex = documents.findIndex(doc => 
        doc.authorSlug === newDoc.authorSlug && doc.file === newDoc.file
    );
    
    if (existingIndex !== -1) {
        documents[existingIndex] = newDoc;
        console.log('🔄 Cập nhật document có sẵn');
    } else {
        documents.push(newDoc);
        console.log('➕ Thêm document mới');
    }

    // Upload updated documents.json
    const content = JSON.stringify(documents, null, 2);
    await this.uploadToGitHub(docsPath, content, 'Update documents list');
    
    // Update local documents và cache
    this.documents = documents;
    this.saveDocumentsMeta(documents);
    
    this.renderDocumentsList();
    console.log('✅ Đã cập nhật documents.json');
}

            // Read a file and attempt to detect its encoding, returning decoded text
            async readFileAsText(file, preferredEncoding = null) {
                if (!file) throw new Error('No file provided');
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onerror = (e) => reject(e);
                    reader.onload = async (e) => {
                        try {
                            const buffer = e.target.result;
                            // If caller provided a preferredEncoding use it first
                            if (preferredEncoding) {
                                try {
                                    const decoder = new TextDecoder(preferredEncoding);
                                    const text = decoder.decode(buffer);
                                    return resolve(text);
                                } catch (err) {
                                    // fall through to detection
                                }
                            }

                            // Try to detect encoding from buffer
                            try {
                                const det = await this.detectEncoding(buffer);
                                return resolve(det.text);
                            } catch (err) {
                                // fallback to UTF-8
                                const text = new TextDecoder('utf-8').decode(buffer);
                                return resolve(text);
                            }
                        } catch (err) {
                            reject(err);
                        }
                    };
                    reader.readAsArrayBuffer(file);
                });
            }

            // Process a selected file and return a normalized "book" object plus processed content
            // options: { fileContentDiv, bookTitleEl, contentReaderEl, storageKey, lastBookKey, encoding }
            async handleFileSelect(file, options = {}) {
                const {
                    fileContentDiv = this.fileContentDiv,
                    bookTitleEl = this.bookTitle,
                    contentReaderEl = this.contentReader,
                    storageKey = 'bookreader_books',
                    lastBookKey = 'bookreader_lastbook',
                    encoding = null
                } = options;

                if (!file) throw new Error('No file provided');

                const raw = await this.readFileAsText(file, encoding);
                const fileName = file.name.replace(/\.[^/.]+$/, '');

                // Fix encoding mojibake and ensure meta
                let processed = this.fixContentEncoding(raw);

                // Ensure meta charset header
                if (!processed.includes('<meta charset=')) {
                    processed = processed.replace('<head>', '<head>\n    <meta charset="UTF-8">');
                }

                // If a DOM element is available, render and optimize it for TOC/pages detection
                let headings = [];
                if (fileContentDiv) {
                    // Render into a temporary container inside the provided div so we don't overwrite main UI
                    let temp = fileContentDiv.querySelector('.upload-temp');
                    if (!temp) {
                        temp = document.createElement('div');
                        temp.className = 'upload-temp';
                        temp.style.display = 'none';
                        fileContentDiv.appendChild(temp);
                    }

                    temp.innerHTML = processed;
                    // Run optimizations that modify DOM (images, tables...)
                    try { this.optimizeContent(); } catch(e) { console.warn('optimizeContent failed', e); }
                    // Generate TOC using existing method; it expects content already in fileContentDiv
                    headings = this.generateTOC(fileContentDiv, { tocListEl: null });
                }

                // Calculate pages if reader element exists
                let totalPages = null;
                if (contentReaderEl && fileContentDiv) {
                    try {
                        totalPages = this.calculatePages(contentReaderEl, fileContentDiv, { totalPagesEl: null });
                    } catch (e) {
                        console.warn('calculatePages failed', e);
                    }
                }

                const book = {
                    name: fileName,
                    content: processed,
                    timestamp: Date.now(),
                    lastPosition: 0
                };

                // Save local (processed) copy before trying to upload
                try {
                    await this.saveBookToStorage(book);
                    if (lastBookKey) localStorage.setItem(lastBookKey, fileName);
                } catch (e) {
                    console.warn('Save book to storage (upload flow) failed', e);
                }

                // Return normalized book and processed content to caller
                return { book, processedContent: processed, headings, totalPages };
            }

            renderDocumentsList() {
        if (this.documents.length === 0) {
            this.documentsList.innerHTML = '<div class="document-placeholder">Chưa có tài liệu nào</div>';
            return;
        }
        
        this.documentsList.innerHTML = this.documents.map((doc, index) => `
            <div class="document-item" data-index="${index}">
                <div class="document-icon">📄</div>
                <div class="document-info">
                    <div class="document-title">${this.escapeHtml(doc.title)}</div>
                    <div class="document-meta">
                        <span>${this.escapeHtml(doc.author || 'Không rõ')}</span>
                        <span>•</span>
                        <span>${doc.date || 'N/A'}</span>
                        ${doc.isNew ? '<span class="badge-new">MỚI</span>' : ''}
                    </div>
                </div>
            </div>
        `).join('');
        
        // Add click events
        this.documentsList.querySelectorAll('.document-item').forEach(item => {
            item.addEventListener('click', () => {
                const index = parseInt(item.getAttribute('data-index'));
                this.openDocument(index);
            });
        });
    }


           
            displayContentInIframe(content) {
                // Create iframe for better isolation and font rendering
                const iframe = document.createElement('iframe');
                iframe.style.width = '100%';
                iframe.style.height = '100%';
                iframe.style.border = 'none';
                iframe.style.background = 'var(--bg-primary)';
                
                // Ensure UTF-8 meta tag
                if (!content.includes('<meta charset=')) {
                    content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
                }
                
                // Add basic styles for iframe content
                const styles = `
                    <style>
                        body { 
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                            line-height: 1.6; 
                            margin: 0; 
                            padding: 16px;
                            background: var(--bg-primary);
                            color: var(--text-primary);
                        }
                        img { max-width: 100%; height: auto; }
                        table { width: 100%; border-collapse: collapse; }
                        th, td { border: 1px solid var(--border-color); padding: 8px; }
                    </style>
                `;
                
                content = content.replace('</head>', styles + '</head>');
                
                this.fileContentDiv.innerHTML = '';
                this.fileContentDiv.appendChild(iframe);
                
                iframe.onload = () => {
                    const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                    iframeDoc.open();
                    iframeDoc.write(content);
                    iframeDoc.close();
                    
                    // Apply theme to iframe
                    this.applyThemeToIframe(iframe);
                };
            }

            applyThemeToIframe(iframe) {
                const theme = localStorage.getItem('bookreader-theme') || 'light';
                const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
                
                iframeDoc.body.setAttribute('data-theme', theme);
                iframeDoc.documentElement.style.cssText = `
                    --bg-primary: ${getComputedStyle(document.documentElement).getPropertyValue('--bg-primary')};
                    --text-primary: ${getComputedStyle(document.documentElement).getPropertyValue('--text-primary')};
                    --border-color: ${getComputedStyle(document.documentElement).getPropertyValue('--border-color')};
                `;
            }

           
            displayTOCWithSearch() {
                if (this.headings.length === 0) {
                    this.tocList.innerHTML = '<li class="toc-placeholder">Không tìm thấy mục lục trong file</li>';
                    return;
                }

                const tocItemsHTML = this.headings.map((heading, index) => {
                    return `
                        <li class="toc-item">
                            <a href="#${heading.id}" class="toc-link level-${heading.level}" data-index="${index}">
                                <span class="toc-text">${heading.text}</span>
                            </a>
                        </li>
                    `;
                }).join('');

                this.tocList.innerHTML = tocItemsHTML;

                // Add search functionality
                this.tocSearch.addEventListener('input', (e) => {
                    const searchTerm = e.target.value.toLowerCase().trim();
                    
                    if (searchTerm === '') {
                        this.tocSearchResults.style.display = 'none';
                        this.showAllTOCItems();
                        return;
                    }

                    const filteredHeadings = this.headings.filter(heading => 
                        heading.text.toLowerCase().includes(searchTerm)
                    );

                    this.filterTOCItems(searchTerm);
                    this.showSearchResults(filteredHeadings, searchTerm);
                });

                // Add click events for TOC links
                this.tocList.querySelectorAll('.toc-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        const index = parseInt(link.getAttribute('data-index'));
                        this.scrollToHeading(this.headings[index].element);
                        this.closeMenu();
                    });
                });
            }

            filterTOCItems(searchTerm) {
                const tocItems = this.tocList.querySelectorAll('.toc-item');
                
                tocItems.forEach(item => {
                    const text = item.querySelector('.toc-text').textContent.toLowerCase();
                    if (text.includes(searchTerm)) {
                        item.style.display = 'flex';
                        const originalText = item.querySelector('.toc-text').textContent;
                        const highlightedText = this.highlightText(originalText, searchTerm);
                        item.querySelector('.toc-text').innerHTML = highlightedText;
                    } else {
                        item.style.display = 'none';
                    }
                });
            }

            showAllTOCItems() {
                const tocItems = this.tocList.querySelectorAll('.toc-item');
                tocItems.forEach(item => {
                    item.style.display = 'flex';
                    const text = item.querySelector('.toc-text').textContent;
                    item.querySelector('.toc-text').textContent = text;
                });
            }

            showSearchResults(filteredHeadings, searchTerm) {
                if (filteredHeadings.length === 0) {
                    this.tocSearchResults.innerHTML = '<div class="toc-no-results">Không tìm thấy kết quả</div>';
                    this.tocSearchResults.style.display = 'block';
                    return;
                }

                const resultsHTML = filteredHeadings.map(heading => {
                    const highlightedText = this.highlightText(heading.text, searchTerm);
                    return `
                        <div class="toc-search-result" data-index="${this.headings.indexOf(heading)}">
                            <div class="toc-search-text">${highlightedText}</div>
                        </div>
                    `;
                }).join('');

                this.tocSearchResults.innerHTML = resultsHTML;
                this.tocSearchResults.style.display = 'block';

                this.tocSearchResults.querySelectorAll('.toc-search-result').forEach(result => {
                    result.addEventListener('click', () => {
                        const index = parseInt(result.getAttribute('data-index'));
                        this.scrollToHeading(this.headings[index].element);
                        this.closeMenu();
                        this.tocSearchResults.style.display = 'none';
                        this.tocSearch.value = '';
                        this.showAllTOCItems();
                    });
                });
            }

            highlightText(text, searchTerm) {
                if (!searchTerm) return text;
                const regex = new RegExp(`(${this.escapeRegex(searchTerm)})`, 'gi');
                return text.replace(regex, '<mark class="search-highlight">$1</mark>');
            }

            escapeRegex(string) {
                return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            }

       
            /* =========================
               CORE FUNCTIONALITY (ORIGINAL LOGIC)
               ========================= */
            disableZoom() {
                document.addEventListener('gesturestart', (e) => e.preventDefault());
                document.addEventListener('gesturechange', (e) => e.preventDefault());
                document.addEventListener('gestureend', (e) => e.preventDefault());
                
                let lastTouchEnd = 0;
                document.addEventListener('touchend', (e) => {
                    const now = Date.now();
                    if (now - lastTouchEnd <= 300) {
                        e.preventDefault();
                    }
                    lastTouchEnd = now;
                }, false);
            }

            disableHorizontalScroll() {
                this.contentReader.addEventListener('scroll', (e) => {
                    if (e.target.scrollLeft !== 0) {
                        e.target.scrollLeft = 0;
                    }
                });
            }

            loadPreferences() {
                const savedTheme = localStorage.getItem('bookreader-theme');
                if (savedTheme) {
                    this.themeSelect.value = savedTheme;
                    document.body.setAttribute('data-theme', savedTheme);
                }
                
                const savedFontSize = localStorage.getItem('bookreader-fontsize');
                if (savedFontSize) {
                    this.fontSizeSelect.value = savedFontSize;
                }
            }

            loadLastBook() {
                const lastBookName = localStorage.getItem('bookreader_lastbook');
                if (lastBookName && this.documents.length > 0) {
                    const docIndex = this.documents.findIndex(doc => doc.title === lastBookName);
                    if (docIndex !== -1) {
                        this.openDocument(docIndex);
                    }
                }
            }

            toggleMenu() {
        this.isMenuOpen = !this.isMenuOpen;
        this.sidebar.classList.toggle('active', this.isMenuOpen);
        if (this.isMenuOpen) {
            this.closeSettings();
            // Hiển thị đúng chế độ dựa trên trạng thái hiện tại
            if (this.currentBook) {
                this.showTOC();
            } else {
                this.showDocumentsList();
            }
        }
    }

            closeMenu() {
        this.isMenuOpen = false;
        this.sidebar.classList.remove('active');
        // Reset về danh sách tài liệu khi đóng menu
        if (!this.currentBook) {
            this.showDocumentsList();
        }
    }

            toggleSettings() {
                this.isSettingsOpen = !this.isSettingsOpen;
                this.settingsPanel.classList.toggle('active', this.isSettingsOpen);
                if (this.isSettingsOpen) {
                    this.closeMenu();
                }
            }

            closeSettings() {
                this.isSettingsOpen = false;
                this.settingsPanel.classList.remove('active');
            }

            // Save a book object to localStorage. If no bookArg provided, use this.currentBook
            saveBookToStorage(bookArg) {
                const bookToSave = bookArg || this.currentBook;
                if (!bookToSave) return;
                
                try {
                    const savedBooks = this.getSavedBooks();
                    const existingBookIndex = savedBooks.findIndex(book => book.name === bookToSave.name);

                    if (existingBookIndex !== -1) {
                        savedBooks[existingBookIndex] = bookToSave;
                    } else {
                        savedBooks.push(bookToSave);
                    }
                    
                    try {
                        localStorage.setItem('bookreader_books', JSON.stringify(savedBooks));
                        console.log('💾 Book saved to localStorage');
                    } catch (err) {
                        // Handle localStorage quota exceeded: try to shrink existing stored books
                        console.warn('⚠️ Saving books failed, attempting fallback:', err.message || err);
                        if (err && (err.name === 'QuotaExceededError' || /quota/i.test(err.message || ''))) {
                            try {
                                // Remove content of other saved books to free space
                                const existing = this.getSavedBooks();
                                const compact = existing.map(b => b.name === bookToSave.name ? ({ ...bookToSave, content: '' }) : ({ ...b, content: '' }));
                                localStorage.setItem('bookreader_books', JSON.stringify(compact));
                                console.log('💾 Book saved in compact mode (no content) due to quota');
                            } catch (err2) {
                                try {
                                    // Last resort: store only minimal metadata for current book
                                    const metaOnly = [{ name: bookToSave.name, timestamp: bookToSave.timestamp, lastPosition: bookToSave.lastPosition }];
                                    localStorage.setItem('bookreader_books', JSON.stringify(metaOnly));
                                    console.log('💾 Book saved as metadata-only due to quota');
                                } catch (err3) {
                                    console.error('❌ Unable to save books to localStorage after fallbacks:', err3.message || err3);
                                    this.showMessage('❌ Không thể lưu sách cục bộ: bộ nhớ trình duyệt đầy.');
                                }
                            }
                        } else {
                            console.error('❌ Error saving book to storage:', err.message || err);
                        }
                    }
                    
                } catch (error) {
                    console.error('❌ Error saving book to storage:', error);
                }
            }

            getSavedBooks() {
                try {
                    const savedBooks = localStorage.getItem('bookreader_books');
                    return savedBooks ? JSON.parse(savedBooks) : [];
                } catch (error) {
                    console.error('❌ Error reading saved books:', error);
                    return [];
                }
            }

            saveReadingProgress() {
                if (!this.currentBook) return;
                
                const scrollTop = this.contentReader.scrollTop;
                this.currentBook.lastPosition = scrollTop;
                this.currentBook.lastRead = new Date().getTime();
                
                this.saveBookToStorage();
            }

            restoreReadingProgress() {
                if (!this.currentBook) return;
                
                const savedBooks = this.getSavedBooks();
                const savedBook = savedBooks.find(book => book.name === this.currentBook.name);
                
                if (savedBook && savedBook.lastPosition) {
                    setTimeout(() => {
                        this.contentReader.scrollTo({
                            top: savedBook.lastPosition,
                            behavior: 'smooth'
                        });
                        
                        setTimeout(() => {
                            this.updateCurrentPage();
                        }, 200);
                        
                        console.log('📖 Reading progress restored');
                    }, 100);
                }
            }


    displayContentDirectly(content) {
        // Xóa iframe cũ nếu có
        this.fileContentDiv.innerHTML = '';
        
        // Tạo div để hiển thị nội dung trực tiếp
        const contentDiv = document.createElement('div');
        contentDiv.className = 'file-content-display';
        contentDiv.innerHTML = content;
        
        // Thêm vào DOM
        this.fileContentDiv.appendChild(contentDiv);
        
        // Tối ưu hóa nội dung
        this.optimizeContent();
        
        console.log('📄 Content displayed directly');
    }

    optimizeContent() {
        const contentDiv = this.fileContentDiv.querySelector('.file-content-display');
        if (!contentDiv) return;
        
        // Tối ưu hóa images
        contentDiv.querySelectorAll('img').forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.loading = 'lazy';
        });
        
        // Tối ưu hóa tables
        contentDiv.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.display = 'block';
            table.style.overflowX = 'auto';
            table.style.fontSize = '0.9em';
        });
        
        // Đảm bảo tất cả elements không vượt quá width
        contentDiv.querySelectorAll('*').forEach(el => {
            el.style.maxWidth = '100%';
            el.style.boxSizing = 'border-box';
        });
        
        // Xóa empty elements
        contentDiv.querySelectorAll('p, div').forEach(el => {
            if (!el.textContent.trim() && !el.querySelector('img, table')) {
                el.remove();
            }
        });
        
        console.log('🎨 Content optimized');
    }
 fixContentEncoding(content) {
        // Thêm meta charset UTF-8 nếu thiếu
        if (!content.includes('<meta charset=') && !content.includes('charset=')) {
            content = content.replace('<head>', '<head>\n    <meta charset="UTF-8">');
            console.log('🔧 Added UTF-8 meta tag');
        }
        
        // Sửa các ký tự tiếng Việt bị lỗi phổ biến
        const encodingFixes = {
            // Windows-1252 to UTF-8 fixes
            'Ã¡': 'á', 'Ã ': 'à', 'Ã£': 'ã', 'Ã¢': 'â', 'Ã©': 'é',
            'Ã¨': 'è', 'Ãª': 'ê', 'Ã­': 'í', 'Ã¬': 'ì', 'Ã³': 'ó',
            'Ã²': 'ò', 'Ã´': 'ô', 'Ãº': 'ú', 'Ã¹': 'ù', 'Ã½': 'ý',
            'Ã': 'Á', 'Ã€': 'À', 'Ãƒ': 'Ã', 'Ã‚': 'Â', 'Ã‰': 'É',
            'Ãˆ': 'È', 'ÃŠ': 'Ê', 'Ã': 'Í', 'ÃŒ': 'Ì', 'Ã“': 'Ó',
            'Ã’': 'Ò', 'Ã”': 'Ô', 'Ãš': 'Ú', 'Ã™': 'Ù', 'Ã': 'Ý',
            'Äƒ': 'ă', 'Ä‚': 'Ă', 'Æ¡': 'ơ', 'Æ¯': 'ư', 'â€“': '–',
            'â€œ': '“', 'â€': '”', 'â€¦': '…',
            
            // UTF-8 mojibake fixes
            'áº¡': 'ạ', 'áº£': 'ả', 'áº¥': 'ấ', 'áº§': 'ầ', 'áº­': 'ậ',
            'áº©': 'ẩ', 'áº«': 'ẫ', 'áº¯': 'ắ', 'áº±': 'ằ', 'áº·': 'ặ',
            'áº³': 'ẳ', 'áºµ': 'ẵ', 'áº¹': 'ẹ', 'áº»': 'ẻ', 'áº½': 'ẽ',
            'áº¿': 'ế', 'á»': 'ề', 'á»‡': 'ệ', 'á»ƒ': 'ể', 'á»…': 'ễ',
            'á»‹': 'ị', 'á»‰': 'ỉ', 'á»': 'ọ', 'á»': 'ỏ', 'á»‘': 'ố',
            'á»“': 'ồ', 'á»™': 'ộ', 'á»•': 'ổ', 'á»—': 'ỗ', 'á»›': 'ớ',
            'á»': 'ờ', 'á»£': 'ợ', 'á»Ÿ': 'ở', 'á»¡': 'ỡ', 'á»¥': 'ụ',
            'á»§': 'ủ', 'Å©': 'ũ', 'á»©': 'ứ', 'á»«': 'ừ', 'á»±': 'ự',
            'á»­': 'ử', 'á»¯': 'ữ', 'á»³': 'ỳ', 'á»·': 'ỵ', 'á»¹': 'ỹ'
        };

        // Áp dụng tất cả các fix
        Object.keys(encodingFixes).forEach(badChar => {
            const regex = new RegExp(badChar, 'g');
            content = content.replace(regex, encodingFixes[badChar]);
        });

        console.log('🔧 Applied encoding fixes');
        return content;
    }



    optimizeContent() {
        const contentDiv = this.fileContentDiv.querySelector('.file-content-display');
        if (!contentDiv) return;
        
        // Tối ưu hóa images
        contentDiv.querySelectorAll('img').forEach(img => {
            img.style.maxWidth = '100%';
            img.style.height = 'auto';
            img.loading = 'lazy';
        });
        
        // Tối ưu hóa tables
        contentDiv.querySelectorAll('table').forEach(table => {
            table.style.width = '100%';
            table.style.borderCollapse = 'collapse';
            table.style.display = 'block';
            table.style.overflowX = 'auto';
        });
        
        // Đảm bảo responsive
        contentDiv.querySelectorAll('*').forEach(el => {
            el.style.maxWidth = '100%';
        });
        
        console.log('🎨 Content optimized');
    }

    // THỬ PHƯƠNG PHÁP KHÁC: Dùng TextDecoder với detection encoding
    async detectEncoding(buffer) {
        const encodings = ['utf-8', 'windows-1252', 'iso-8859-1', 'utf-16'];
        
        for (let encoding of encodings) {
            try {
                const decoder = new TextDecoder(encoding);
                const text = decoder.decode(buffer);
                
                // Kiểm tra xem text có hợp lệ không (có chứa ký tự tiếng Việt)
                const vietnameseChars = /[áàảãạăắằẳẵặâấầẩẫậéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵđ]/i;
                if (vietnameseChars.test(text)) {
                    console.log(`✅ Detected encoding: ${encoding}`);
                    return { encoding, text };
                }
            } catch (e) {
                continue;
            }
        }
        
        // Fallback to UTF-8
        console.log('⚠️ Using UTF-8 as fallback');
        return { encoding: 'utf-8', text: new TextDecoder('utf-8').decode(buffer) };
    }
    // Hiển thị kết quả tìm kiếm tài liệu trong dropdown
    showDocumentSearchResults(filteredDocs, searchTerm) {
        if (filteredDocs.length === 0) {
            this.documentsSearchResults.innerHTML = '<div class="toc-no-results">Không tìm thấy tài liệu</div>';
            this.documentsSearchResults.style.display = 'block';
            return;
        }

        const resultsHTML = filteredDocs.map((doc, index) => {
            const highlightedTitle = this.highlightText(doc.title, searchTerm);
            const highlightedAuthor = this.highlightText(doc.author || '', searchTerm);
            return `
                <div class="documents-search-result" data-index="${this.documents.indexOf(doc)}">
                    <div class="document-search-title">${highlightedTitle}</div>
                    <div class="document-search-author">${highlightedAuthor}</div>
                </div>
            `;
        }).join('');

        this.documentsSearchResults.innerHTML = resultsHTML;
        this.documentsSearchResults.style.display = 'block';

        this.documentsSearchResults.querySelectorAll('.documents-search-result').forEach(result => {
            result.addEventListener('click', () => {
                const index = parseInt(result.getAttribute('data-index'));
                this.openDocument(index);
                this.documentsSearchResults.style.display = 'none';
                this.documentsSearch.value = '';
                this.showAllDocuments();
            });
        });
    }
    // Hiển thị mục lục (chế độ đang đọc)
    showTOC() {
        this.sidebarNav.style.display = 'flex';
        this.documentsSearchContainer.style.display = 'none';
        this.documentsSection.style.display = 'none';
        this.tocSearchContainer.style.display = 'block';
        this.tocSection.style.display = 'block';
        this.pageTitle.textContent = this.currentBook ? this.currentBook.name : 'Mục lục';
    }
    // Tìm kiếm tài liệu
    searchDocuments(searchTerm) {
        if (searchTerm === '') {
            this.documentsSearchResults.style.display = 'none';
            this.showAllDocuments();
            return;
        }

        const filteredDocs = this.documents.filter(doc => 
            doc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (doc.author && doc.author.toLowerCase().includes(searchTerm.toLowerCase()))
        );

        this.filterDocuments(searchTerm);
        this.showDocumentSearchResults(filteredDocs, searchTerm);
    }
     // Hiển thị danh sách tài liệu (chế độ chưa đọc)
    showDocumentsList() {
        this.sidebarNav.style.display = 'none';
        this.documentsSearchContainer.style.display = 'block';
        this.documentsSection.style.display = 'block';
        this.tocSearchContainer.style.display = 'none';
        this.tocSection.style.display = 'none';
        this.pageTitle.textContent = 'Mục lục';
        
        // Reset search
        this.documentsSearch.value = '';
        this.documentsSearchResults.style.display = 'none';
        this.showAllDocuments();
    }
       // Lọc danh sách tài liệu hiển thị
    filterDocuments(searchTerm) {
        const docItems = this.documentsList.querySelectorAll('.document-item');
        
        docItems.forEach(item => {
            const title = item.querySelector('.document-title').textContent.toLowerCase();
            const authorElement = item.querySelector('.document-meta span:first-child');
            const author = authorElement ? authorElement.textContent.toLowerCase() : '';
            const searchText = (title + ' ' + author).toLowerCase();
            
            if (searchText.includes(searchTerm.toLowerCase())) {
                item.style.display = 'flex';
                // Highlight kết quả tìm kiếm
                const originalTitle = item.querySelector('.document-title').textContent;
                const highlightedTitle = this.highlightText(originalTitle, searchTerm);
                item.querySelector('.document-title').innerHTML = highlightedTitle;
            } else {
                item.style.display = 'none';
            }
        });
    }
    // Hiển thị tất cả tài liệu (bỏ filter)
    showAllDocuments() {
        const docItems = this.documentsList.querySelectorAll('.document-item');
        docItems.forEach(item => {
            item.style.display = 'flex';
            const title = item.querySelector('.document-title').textContent;
            item.querySelector('.document-title').textContent = title;
        });
    }
    // Sửa phương thức openDocument để chuyển sang chế độ đọc
    async openDocument(index) {
        console.log('🎯 Opening document:', index);
        
        const doc = this.documents[index];
        if (!doc) {
            this.showMessage('❌ Tài liệu không tồn tại');
            return false;
        }
        
        this.showLoading();
        this.placeholderDiv.style.display = 'none';
        
        try {
            let content = '';
            
            if (doc.file) {
                const filePath = `${this.ghConfig.basePath}/${doc.file}`;
                const fileUrl = `https://raw.githubusercontent.com/${this.ghConfig.owner}/${this.ghConfig.repo}/main/${filePath}`;
                
                console.log('📖 Loading from:', fileUrl);
                
                const response = await fetch(fileUrl);
                if (!response.ok) {
                    if (response.status === 404) {
                        console.warn('⚠️ File not found:', fileUrl);
                        this.hideLoading();
                        return false;
                    }
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                const buffer = await response.arrayBuffer();
                const result = await this.detectEncoding(buffer);
                content = result.text;
                console.log(`📝 Used encoding: ${result.encoding}`);
                
            } else if (doc.content) {
                content = doc.content;
            } else {
                throw new Error('Tài liệu không có nội dung');
            }
            
            // Áp dụng encoding fixes
            content = this.fixContentEncoding(content);
            
            // Log access
            try {
                await this.logAccess('document_open', doc.title);
            } catch (e) {
                console.log('⚠️ Log access failed:', e.message);
            }
            
            // Hiển thị nội dung
            this.displayContentDirectly(content);
            
            this.fileContentDiv.style.display = 'block';
            this.bookTitle.textContent = doc.title;
            
            this.generateTOC();
            this.calculatePages();
            
            // Save to storage
            this.currentBook = {
                name: doc.title,
                content: content,
                timestamp: new Date().getTime(),
                lastPosition: 0
            };
            
            this.saveBookToStorage();
            localStorage.setItem('bookreader_lastbook', doc.title);
            this.restoreReadingProgress();
            
            // Apply settings
            const savedFontSize = localStorage.getItem('bookreader-fontsize');
            if (savedFontSize) {
                this.changeFontSize(savedFontSize);
            }
            
            // CHUYỂN SANG CHẾ ĐỘ ĐỌC - Hiển thị mục lục
            this.showTOC();
            
            this.hideLoading();
            this.closeMenu();
            
            console.log('✅ Document loaded successfully');
            
        } catch (error) {
            console.error('❌ Error loading document:', error);
            this.hideLoading();
            if (error && error.message && error.message.includes('HTTP 404')) return false;
            this.showError('Lỗi khi tải tài liệu: ' + (error.message || error));
            return false;
        }
        return true;
    }
    
   generateTOC() {
        this.tocList.innerHTML = '';
        this.headings = [];
        
        const allElements = this.fileContentDiv.querySelectorAll('*');
        const headingRegexes = [
            /^(\d{1,2})\.\s+(.+)/,
            /^(\d{1,2}\.\d{1,2})\.\s+(.+)/,
            /^(\d{1,2}\.\d{1,2}\.\d{1,2})\.\s+(.+)/
        ];
        
        const prioritySelectors = [
            'p.A10', 'h1', '.A10', 'p[class*="A10"]', 
            'p[class*="a1"]', 'h2', 'h3', '.MsoNormal'
        ];
        
        // Search in priority selectors first
        for (let selector of prioritySelectors) {
            const elements = this.fileContentDiv.querySelectorAll(selector);
            
            for (let element of elements) {
                if (this.headings.length >= 50) break;
                
                const text = element.textContent.trim();
                const match = this.findHeadingMatch(text, headingRegexes);
                
                if (match) {
                    this.addHeadingToTOC(element, match);
                }
            }
            
            if (this.headings.length >= 50) break;
        }
        
        // Fallback: search all elements
        if (this.headings.length < 10) {
            for (let element of allElements) {
                if (this.headings.length >= 50) break;
                if (element.id && element.id.startsWith('toc-heading-')) continue;
                
                const text = element.textContent.trim();
                const match = this.findHeadingMatch(text, headingRegexes);
                
                if (match) {
                    this.addHeadingToTOC(element, match);
                }
            }
        }
        
        // Sort headings by position in document
        this.headings.sort((a, b) => {
            const positionA = this.getElementPosition(a.element);
            const positionB = this.getElementPosition(b.element);
            return positionA - positionB;
        });
        
        this.displayTOCWithSearch();
    }
findHeadingMatch(text, regexes) {
        for (let regex of regexes) {
            const match = text.match(regex);
            if (match) return match;
        }
        return null;
    }
addHeadingToTOC(element, match) {
        const id = `toc-heading-${this.headings.length}`;
        element.id = id;
        
        const level = match[1].split('.').length;
        
        this.headings.push({
            id: id,
            text: match[0],
            element: element,
            level: Math.min(level, 3)
        });
    }

    scrollToHeading(element) {
        element.scrollIntoView({ 
            behavior: 'smooth',
            block: 'start'
        });
        
        setTimeout(() => this.updateCurrentPage(), 300);
    }
getElementPosition(element) {
        let position = 0;
        let prevElement = element.previousElementSibling;
        while (prevElement) {
            position++;
            prevElement = prevElement.previousElementSibling;
        }
        return position;
    }
    

    changeFontSize(size) {
        const contentDiv = this.fileContentDiv.querySelector('.file-content-display');
        if (contentDiv) {
            contentDiv.style.fontSize = `${size}rem`;
        }
        localStorage.setItem('bookreader-fontsize', size);
        setTimeout(() => this.calculatePages(), 100);
    }

    calculatePages() {
        const contentHeight = this.contentReader.clientHeight;
        const totalHeight = this.fileContentDiv.scrollHeight;
        this.totalPages = Math.ceil(totalHeight / contentHeight);
        this.totalPagesEl.textContent = this.totalPages;
        this.updateCurrentPage();
        
        console.log('📄 Pages calculated:', this.totalPages);
    }

   



            updateCurrentPage() {
                const scrollTop = this.contentReader.scrollTop;
                const contentHeight = this.contentReader.clientHeight;
                const totalHeight = this.fileContentDiv.scrollHeight;
                
                if (totalHeight > 0) {
                    this.currentPage = Math.floor((scrollTop / totalHeight) * this.totalPages);
                    this.currentPageEl.textContent = this.currentPage + 1;
                    
                    const progress = ((this.currentPage + 1) / this.totalPages) * 100;
                    this.progressFill.style.width = `${progress}%`;
                }
            }

            handleTouchStart(e) {
                this.touchStartX = e.touches[0].clientX;
                this.touchStartY = e.touches[0].clientY;
            }

            handleTouchEnd(e) {
                if (!this.touchStartX) return;
                
                const touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;
                
                const diffX = touchEndX - this.touchStartX;
                const diffY = touchEndY - this.touchStartY;
                
                // Only handle horizontal swipe with small vertical deviation
                if (Math.abs(diffX) > 50 && Math.abs(diffY) < 100) {
                    if (diffX > 0) {
                        // Swipe right - previous page
                        this.previousPage();
                    } else {
                        // Swipe left - next page
                        this.nextPage();
                    }
                }
                
                this.touchStartX = 0;
                this.touchStartY = 0;
            }

            nextPage() {
                if (this.currentPage < this.totalPages - 1) {
                    this.goToPage(this.currentPage + 1);
                }
            }

            previousPage() {
                if (this.currentPage > 0) {
                    this.goToPage(this.currentPage - 1);
                }
            }

            goToPage(page) {
                if (page < 0 || page >= this.totalPages) return;
                
                this.currentPage = page;
                const scrollPosition = (page / this.totalPages) * this.fileContentDiv.scrollHeight;
                
                this.contentReader.scrollTo({
                    top: scrollPosition,
                    behavior: 'smooth'
                });
            }

            handleKeydown(e) {
                // Intercept F5 to refresh documents from GitHub without a full page reload
                if (e.key === 'F5' || e.keyCode === 116) {
                    e.preventDefault();
                    if (this.ghConfig && this.ghConfig.owner && this.ghConfig.repo) {
                        // reload from remote repository
                        this.loadFromGitHub().catch(() => {});
                    } else {
                        this.showMessage('❌ Chưa cấu hình GitHub (owner/repo).');
                    }
                    return;
                }
                if (e.key === 'ArrowLeft') {
                    this.previousPage();
                } else if (e.key === 'ArrowRight') {
                    this.nextPage();
                } else if (e.key === 'Escape') {
                    if (this.isMenuOpen) this.closeMenu();
                    if (this.isSettingsOpen) this.closeSettings();
                }
            }

            changeTheme(theme) {
                document.body.setAttribute('data-theme', theme);
                localStorage.setItem('bookreader-theme', theme);
                
                // Apply theme to iframe if exists
                const iframe = this.fileContentDiv.querySelector('iframe');
                if (iframe) {
                    this.applyThemeToIframe(iframe);
                }
            }

            showLoading() {
                this.loadingOverlay.classList.add('active');
            }

            hideLoading() {
                this.loadingOverlay.classList.remove('active');
            }

            showError(message) {
                this.placeholderDiv.style.display = 'block';
                this.placeholderDiv.innerHTML = `
                    <div style="font-size: 48px;">❌</div>
                    <h3>Đã xảy ra lỗi</h3>
                    <p>${message}</p>
                    <button class="get-started-btn" onclick="location.reload()">Thử lại</button>
                `;
                this.hideLoading();
            }

            showMessage(message) {
                alert(message);
            }

            showUploadPreview(res) {
                const el = document.getElementById('upload-preview');
                if (!el) return;
                const book = res.book || {};
                const processed = res.processedContent || '';
                const headings = res.headings || [];
                const totalPages = res.totalPages || 'N/A';
                const sizeKB = (new Blob([processed]).size / 1024).toFixed(1);

                el.style.display = 'block';
                el.innerHTML = `
                    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;">
                        <div style="flex:1;min-width:0">
                            <div style="font-weight:600;color:var(--text-primary);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${this.escapeHtml(book.name || 'Không tên')}</div>
                            <div style="font-size:0.85em;color:var(--text-secondary);margin-top:4px">Kích thước: ${sizeKB} KB · Mục lục: ${headings.length} · Trang ~ ${totalPages}</div>
                        </div>
                        <div style="display:flex;gap:6px">
                            <button id="upload-preview-view" class="upload-btn" style="padding:6px 10px">Xem</button>
                            <button id="upload-preview-clear" class="upload-btn" style="padding:6px 10px">Hủy</button>
                        </div>
                    </div>
                `;

                // Bind events
                const viewBtn = document.getElementById('upload-preview-view');
                const clearBtn = document.getElementById('upload-preview-clear');
                if (viewBtn) viewBtn.addEventListener('click', () => {
                    try {
                        this.currentBook = book;
                        this.displayContentDirectly(processed);
                        this.generateTOC();
                        this.calculatePages();
                        this.showMessage('👁️ Đã hiển thị bản xử lý (preview)');
                    } catch (e) {
                        console.warn('Preview failed', e);
                        this.showMessage('❌ Hiển thị preview thất bại: ' + (e.message || e));
                    }
                });

                if (clearBtn) clearBtn.addEventListener('click', () => {
                    this.pendingUpload = null;
                    this.fileInput.value = '';
                    this.bookTitleInput.value = '';
                    this.authorName.value = '';
                    this.clearUploadPreview();
                    this.showMessage('🗑️ Đã hủy bản xử lý');
                });
            }

            clearUploadPreview() {
                const el = document.getElementById('upload-preview');
                if (!el) return;
                el.style.display = 'none';
                el.innerHTML = '';
                if (this.uploadBtn) this.uploadBtn.disabled = true;
            }
            // app.js - SỬA LẠI HOÀN TOÀN hàm updateUIBasedOnRole
updateUIBasedOnRole() {
    console.log('🔐 Updating UI based on role, isAdmin:', this.auth.isAdmin);
    
    // Tìm tất cả elements
    const adminLoginSection = document.getElementById('admin-login-section');
    const adminPanelSection = document.getElementById('admin-section');
    const githubSection = document.getElementById('github-section');
    
    console.log('🔍 Elements found:');
    console.log('- adminLoginSection:', adminLoginSection);
    console.log('- adminPanelSection:', adminPanelSection);
    console.log('- githubSection:', githubSection);
    
    if (this.auth.isAdmin) {
        // TRƯỜNG HỢP 1: LÀ ADMIN
        console.log('👑 Hiển thị cho ADMIN');
        
        // Ẩn nút đăng nhập
        if (adminLoginSection) {
            adminLoginSection.style.display = 'none';
            console.log('❌ Ẩn admin login section');
        }
        
        // Hiển thị admin panel
        if (adminPanelSection) {
            adminPanelSection.style.display = 'block';
            console.log('✅ Hiển thị admin panel');
        }
        
        // Hiển thị GitHub section
        if (githubSection) {
            githubSection.style.display = 'block';
            console.log('✅ Hiển thị GitHub section');
        }
        
    } else {
        // TRƯỜNG HỢP 2: KHÔNG PHẢI ADMIN
        console.log('👤 Hiển thị cho USER THƯỜNG');
        
        // Hiển thị nút đăng nhập
        if (adminLoginSection) {
            adminLoginSection.style.display = 'block';
            console.log('✅ Hiển thị admin login section');
        }
        
        // Ẩn admin panel
        if (adminPanelSection) {
            adminPanelSection.style.display = 'none';
            console.log('❌ Ẩn admin panel');
        }
        
        // Ẩn GitHub section
        if (githubSection) {
            githubSection.style.display = 'none';
            console.log('❌ Ẩn GitHub section');
        }
    }
    
    // Cập nhật nút settings trong sidebar
    if (this.sidebarSettingsBtn) {
        this.sidebarSettingsBtn.style.display = 'block'; // Luôn hiển thị cho mọi người
    }
}
            escapeHtml(text) {
                if (!text) return '';
                const div = document.createElement('div');
                div.textContent = text;
                return div.innerHTML;
            }
        }



// Thêm vào cuối app.js để debug
document.addEventListener('DOMContentLoaded', async () => {
    console.log('🚀 DOM loaded - Starting BookReader...');
    window.bookReader = new BookReader();
    await window.bookReader.initialize();
    
    // Debug thêm
    setTimeout(() => {
        console.log('🔍 Final check:');
        console.log('- documents:', window.bookReader.documents);
        console.log('- ghConfig:', window.bookReader.ghConfig);
        console.log('- auth.currentUser:', window.bookReader.auth.currentUser);
    }, 2000);
});