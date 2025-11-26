// github-manager.js - GitHub Operations Management (Updated)
class GitHubManager {
    constructor(bookReader) {
        this.bookReader = bookReader;
        this.ghConfig = {
            owner: 'Datkep92',
            repo: 'aquyet',
            basePath: 'docs/Quyet',
            token: ''
        };
        
        // Elements
        this.ghConfigSection = null;
        this.ghOwner = null;
        this.ghRepo = null;
        this.ghBasePath = null;
        this.ghToken = null;
        this.saveConfigBtn = null;
        this.loadFromGitHubBtn = null;
        this.reconfigureGitHubBtn = null;
    }

    initialize() {
        console.log('🚀 Khởi tạo GitHubManager...');
        this.initializeElements();
        this.bindEvents();
        this.loadConfig();
    }

    initializeElements() {
        this.ghConfigSection = document.getElementById('gh-config-section');
        this.ghOwner = document.getElementById('gh-owner');
        this.ghRepo = document.getElementById('gh-repo');
        this.ghBasePath = document.getElementById('gh-base-path');
        this.ghToken = document.getElementById('gh-token');
        this.saveConfigBtn = document.getElementById('save-config-btn');
        this.loadFromGitHubBtn = document.getElementById('load-from-github-btn');
        this.reconfigureGitHubBtn = document.getElementById('reconfigure-github-btn');
        
        console.log('✅ GitHub elements initialized');
    }

    bindEvents() {
        if (this.saveConfigBtn) {
            this.saveConfigBtn.addEventListener('click', () => {
                this.saveGitHubConfig();
            });
        }
        
        if (this.loadFromGitHubBtn) {
            this.loadFromGitHubBtn.addEventListener('click', () => {
                this.loadFromGitHub();
            });
        }
        
        if (this.reconfigureGitHubBtn) {
            this.reconfigureGitHubBtn.addEventListener('click', () => {
                this.toggleGitHubConfig();
            });
        }
        
        console.log('✅ GitHub events bound');
    }

    // GitHub Configuration methods
    saveGitHubConfig() {
        this.ghConfig = {
            owner: this.ghOwner.value.trim(),
            repo: this.ghRepo.value.trim(),
            basePath: this.ghBasePath.value.trim(),
            token: this.ghToken.value.trim()
        };
        
        localStorage.setItem('bookreader_gh_config', JSON.stringify(this.ghConfig));
        this.toggleGitHubConfig(false);
        this.bookReader.showMessage('✅ Đã lưu cấu hình GitHub!');
    }

    toggleGitHubConfig(show = true) {
        if (!this.ghConfigSection) return;
        
        const inputs = this.ghConfigSection.querySelectorAll('input');
        inputs.forEach(input => {
            input.style.display = show ? 'block' : 'none';
        });
        
        if (this.saveConfigBtn) {
            this.saveConfigBtn.style.display = show ? 'block' : 'none';
        }
        
        if (this.reconfigureGitHubBtn) {
            this.reconfigureGitHubBtn.style.display = show ? 'none' : 'block';
        }
    }

    loadConfig() {
        const savedConfig = localStorage.getItem('bookreader_gh_config');
        if (savedConfig) {
            this.ghConfig = JSON.parse(savedConfig);
            console.log('📁 Loaded config from localStorage:', this.ghConfig);
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
    }

    // GitHub Operations methods
    async autoLoadFromGitHub() {
        console.log('🌐 Tự động load từ GitHub...');
        
        if ((this.ghConfig.owner && this.ghConfig.repo) || localStorage.getItem('bookreader_gh_config')) {
            await this.loadFromGitHub();
        } else {
            console.log('ℹ️ Chưa có config GitHub - cần cấu hình thủ công');
            this.bookReader.toggleSettings();
        }
    }

    async loadFromGitHub() {
        console.log('🌐 Bắt đầu loadFromGitHub...');
        
        if (!this.ghConfig.owner || !this.ghConfig.repo) {
            this.bookReader.showMessage('❌ Vui lòng nhập GitHub Owner và Repo!');
            return;
        }
        
        try {
            this.bookReader.showLoading();
            await this.smartLoadDocuments();
            this.bookReader.hideLoading();
            this.bookReader.closeSettings();
        } catch (error) {
            this.bookReader.hideLoading();
            console.error('❌ GitHub load error:', error);
            this.bookReader.showMessage('❌ Lỗi tải từ GitHub: ' + error.message);
        }
    }

    saveConfig(config) {
        this.ghConfig = config;
        localStorage.setItem('bookreader_gh_config', JSON.stringify(config));
        console.log('💾 Saved GitHub config');
    }

    getConfig() {
        return this.ghConfig;
    }

    // SMART LOADING: Hiển thị cache trước, update sau
    async smartLoadDocuments() {
        console.log('🔍 Smart loading documents...');
        
        // 1. Kiểm tra cache trước
        const cachedMeta = this.getCachedDocumentsMeta();
        if (cachedMeta && this.isCacheValid(cachedMeta)) {
            console.log('📱 Hiển thị documents từ cache');
            this.bookReader.documents = cachedMeta.documents;
            if (this.bookReader.sidebarManager) {
                this.bookReader.sidebarManager.updateDocumentsList();
            }
            
            // Mở sách đầu tiên ngay nếu có
            if (this.bookReader.documents.length > 0 && !this.bookReader.currentBook) {
                this.bookReader.openDocument(0);
            }
        }
        
        // 2. Đồng thời quét GitHub để update
        try {
            console.log('🌐 Đang quét GitHub để cập nhật...');
            const githubDocuments = await this.scanGitHubForDocuments();
            
            // 3. So sánh và merge
            const mergedDocuments = this.mergeDocuments(this.bookReader.documents, githubDocuments);
            
            // 4. Lưu cache mới
            this.saveDocumentsMeta(mergedDocuments);
            
            // 5. Cập nhật UI nếu có thay đổi
            if (this.hasDocumentsChanged(this.bookReader.documents, mergedDocuments)) {
                this.bookReader.documents = mergedDocuments;
                if (this.bookReader.sidebarManager) {
                    this.bookReader.sidebarManager.updateDocumentsList();
                }
                console.log('🔄 Đã cập nhật documents từ GitHub');
            }
            
        } catch (error) {
            console.warn('⚠️ Không thể quét GitHub, giữ cache hiện tại:', error);
        }
    }

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

        // Attempt PUT with retries to handle concurrent updates
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
                    payload.sha = existing.sha;
                    
                    // Try merging if content looks like JSON and new content is JSON
                    try {
                        const remoteContent = existing.content ? decodeURIComponent(escape(window.atob(existing.content))) : null;
                        const ourObj = JSON.parse(content);
                        const remoteObj = remoteContent ? JSON.parse(remoteContent) : null;
                        if (remoteObj && typeof remoteObj === 'object' && typeof ourObj === 'object') {
                            const merged = Object.assign({}, remoteObj, ourObj);
                            payload.content = btoa(unescape(encodeURIComponent(JSON.stringify(merged, null, 2))));
                        }
                    } catch (e) {
                        // not JSON or merge failed — keep our payload.content
                    }
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

        throw new Error(lastErr && lastErr.message ? lastErr.message : 'Failed to upload after multiple attempts');
    }



// Thêm hàm update nhiều documents
async updateDocumentsJsonBulk(documents) {
    try {
        const content = JSON.stringify(documents, null, 2);
        await this.uploadToGitHub('documents.json', content, 'Cập nhật danh sách tài liệu (bulk)');
        
        this.bookReader.documents = documents;
        if (this.bookReader.sidebarManager) {
            this.bookReader.sidebarManager.updateDocumentsList();
        }
        
        console.log('✅ Documents.json bulk updated với', documents.length, 'tài liệu');
        return true;
        
    } catch (error) {
        console.error('❌ Error bulk updating documents.json:', error);
        throw error;
    }
}

// Xóa documents đã remove
async deleteRemovedDocuments(originalDocs, modifiedDocs) {
    const removedDocs = originalDocs.filter(origDoc => 
        !modifiedDocs.find(modDoc => modDoc.id === origDoc.id)
    );
    
    for (const doc of removedDocs) {
        try {
            await this.deleteFromGitHub(doc.file);
            console.log('🗑️ Đã xóa file:', doc.file);
        } catch (error) {
            console.warn('⚠️ Không thể xóa file:', doc.file, error);
        }
    }
}

// Hàm xóa file từ GitHub
async deleteFromGitHub(path) {
    const apiUrl = `https://api.github.com/repos/${this.ghConfig.owner}/${this.ghConfig.repo}/contents/${path}`;
    
    // Lấy SHA của file hiện tại
    const response = await fetch(apiUrl, {
        headers: {
            'Authorization': `token ${this.ghConfig.token}`,
            'Accept': 'application/vnd.github.v3+json'
        }
    });
    
    if (response.ok) {
        const fileData = await response.json();
        const sha = fileData.sha;
        
        // Xóa file
        const deleteResponse = await fetch(apiUrl, {
            method: 'DELETE',
            headers: {
                'Authorization': `token ${this.ghConfig.token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message: `Xóa file: ${path}`,
                sha: sha,
                branch: 'main'
            })
        });
        
        if (!deleteResponse.ok) {
            throw new Error(`Không thể xóa file: ${path}`);
        }
        
        return true;
    }
    
    throw new Error(`File không tồn tại: ${path}`);
}
    async updateDocumentsJson(newDoc) {
    try {
        let documents = await this.getDocumentsFromGitHub();
        
        // ĐẢM BẢO documents là array
        if (!Array.isArray(documents)) {
            console.warn('⚠️ documents is not array, initializing new array:', typeof documents, documents);
            documents = [];
        }
        
        // Đảm bảo createdAt là string hợp lệ
        if (!newDoc.createdAt || isNaN(new Date(newDoc.createdAt).getTime())) {
            newDoc.createdAt = new Date().toISOString();
        }
        
        // Đảm bảo updatedAt là string hợp lệ
        newDoc.updatedAt = new Date().toISOString();
        
        const existingIndex = documents.findIndex(doc => doc.id === newDoc.id);
        if (existingIndex !== -1) {
            documents[existingIndex] = { ...documents[existingIndex], ...newDoc };
        } else {
            documents.push(newDoc);
        }
        
        const content = JSON.stringify(documents, null, 2);
        await this.uploadToGitHub('documents.json', content, 'Cập nhật danh sách tài liệu');
        
        this.bookReader.documents = documents;
        if (this.bookReader.sidebarManager) {
            this.bookReader.sidebarManager.updateDocumentsList();
        }
        
        console.log('✅ Documents.json updated với', documents.length, 'tài liệu');
        return true;
        
    } catch (error) {
        console.error('❌ Error updating documents.json:', error);
        throw error;
    }
}

// Sửa hàm getDocumentsFromGitHub để đảm bảo luôn trả về array
async getDocumentsFromGitHub() {
    try {
        if (!this.ghConfig?.owner || !this.ghConfig?.repo) {
            console.warn('⚠️ Chưa cấu hình GitHub - trả về mảng rỗng');
            return [];
        }

        const documentsUrl = `https://raw.githubusercontent.com/${this.ghConfig.owner}/${this.ghConfig.repo}/main/documents.json`;
        console.log('📖 Loading documents from:', documentsUrl);
        
        const response = await fetch(documentsUrl);
        
        if (response.ok) {
            const documents = await response.json();
            
            // KIỂM TRA và đảm bảo kết quả là array
            if (Array.isArray(documents)) {
                console.log('✅ Loaded', documents.length, 'documents from GitHub');
                return documents;
            } else {
                console.warn('⚠️ documents.json không phải array, trả về array rỗng:', typeof documents);
                return [];
            }
        } else if (response.status === 404) {
            console.log('📭 documents.json không tồn tại, tạo mới');
            return [];
        } else {
            console.warn('⚠️ Lỗi load documents.json:', response.status);
            return [];
        }
    } catch (error) {
        console.error('❌ Lỗi lấy documents từ GitHub:', error);
        return [];
    }
}

    slugify(text) {
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    }
}