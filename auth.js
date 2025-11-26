// auth.js - Complete Authentication & Admin Management System (Updated)
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.isAdmin = false;
        this.ghConfig = null;
        this.users = [];
        this.elements = {};
        
        // Admin elements
        this.adminStats = null;
    }

    initialize(ghConfig, elements) {
        this.ghConfig = ghConfig;
        this.elements = elements || {};
        this.initializeAdminElements();
        this.loadLocalAuthState();
        this.bindAuthEvents();
        
        // CẬP NHẬT UI NGAY KHI KHỞI TẠO
        if (window.bookReader && typeof window.bookReader.updateUIBasedOnRole === 'function') {
            window.bookReader.updateUIBasedOnRole();
        }
    }

    initializeAdminElements() {
        this.adminStats = document.getElementById('admin-stats');
    }

    // Admin & Access Control methods
    updateUIBasedOnRole() {
        console.log('🔐 Updating UI based on role, isAdmin:', this.isAdmin);
        
        const adminLoginSection = document.getElementById('admin-login-section');
        const adminPanelSection = document.getElementById('admin-section');
        const githubSection = document.getElementById('github-section');
        
        if (this.isAdmin) {
            // TRƯỜNG HỢP 1: LÀ ADMIN
            console.log('👑 Hiển thị cho ADMIN');
            
            if (adminLoginSection) adminLoginSection.style.display = 'none';
            if (adminPanelSection) adminPanelSection.style.display = 'block';
            if (githubSection) githubSection.style.display = 'block';
            
        } else {
            // TRƯỜNG HỢP 2: KHÔNG PHẢI ADMIN
            console.log('👤 Hiển thị cho USER THƯỜNG');
            
            if (adminLoginSection) adminLoginSection.style.display = 'block';
            if (adminPanelSection) adminPanelSection.style.display = 'none';
            if (githubSection) githubSection.style.display = 'none';
        }
    }

    async logAccess(action, documentTitle = '') {
        const deviceId = this.currentUser?.deviceId || 'unknown';
        
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

    loadAccessStats() {
        const accessLogs = JSON.parse(localStorage.getItem('bookreader_access_logs') || '[]');
        
        // Tính toán stats từ local data
        const stats = this.calculateLocalStats(accessLogs);
        
        if (this.adminStats) {
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
    }

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

    // Load trạng thái auth từ localStorage
    loadLocalAuthState() {
        const savedAdmin = localStorage.getItem('bookreader_admin_logged');
        this.isAdmin = savedAdmin === 'true';
        
        const savedUser = localStorage.getItem('bookreader_user_info');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }
    }

    // SỬA hàm bindAuthEvents - đảm bảo bind đúng
    bindAuthEvents() {
        // Admin login - LUÔN bind vì nút này luôn hiển thị
        if (this.elements.adminLoginBtn) {
            this.elements.adminLoginBtn.addEventListener('click', () => {
                this.showAdminLogin();
            });
        }
        
        // Admin logout - chỉ bind khi là admin
        if (this.elements.adminLogoutBtn) {
            this.elements.adminLogoutBtn.addEventListener('click', () => {
                this.adminLogout();
            });
        }

        // User management - chỉ bind khi là admin
        if (this.elements.grantAdminBtn) {
            this.elements.grantAdminBtn.addEventListener('click', () => {
                this.toggleUsersList();
            });
        }

        console.log('✅ Auth events bound');
    }

// SỬA hàm checkDeviceAndRegister trong auth.js
async checkDeviceAndRegister() {
    const deviceId = localStorage.getItem('bookreader_device_id');
    const userInfo = localStorage.getItem('bookreader_user_info');

    if (!deviceId || !userInfo) {
        // Thiết bị mới - cần đăng ký
        console.log('📝 Thiết bị mới - hiển thị form đăng ký');
        const result = await this.showRegistrationForm();
        return result ? 'registered' : false;
    } else {
        // Thiết bị cũ - load user info
        console.log('📱 Thiết bị đã đăng ký - load thông tin');
        this.currentUser = JSON.parse(userInfo);
        this.currentUser.deviceId = deviceId;
        
        // Kiểm tra quyền admin từ server
        await this.checkAdminPermissions();
        return true; // Trả về true để báo đã đăng ký
    }
}

   // auth.js - Sửa hàm showRegistrationForm
async showRegistrationForm() {
    return new Promise((resolve) => {
        // Tạo modal đăng ký
        const modal = document.createElement('div');
        modal.className = 'registration-modal';
        modal.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); display: flex; align-items: center;
            justify-content: center; z-index: 9999; font-family: Arial, sans-serif;
        `;

        modal.innerHTML = `
            <div style="background: white; padding: 24px; border-radius: 12px; width: 90%; max-width: 400px;">
                <h3 style="margin-bottom: 16px; text-align: center;">📱 Đăng ký thiết bị mới</h3>
                <p style="margin-bottom: 20px; text-align: center; color: #666;">
                    Vui lòng nhập thông tin của bạn để tiếp tục
                </p>
                <div style="margin-bottom: 16px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Họ và tên:</label>
                    <input type="text" id="auth-user-name" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                        placeholder="Nhập họ và tên" required>
                </div>
                <div style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 500;">Số điện thoại:</label>
                    <input type="tel" id="auth-user-phone" 
                        style="width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 6px;"
                        placeholder="Nhập số điện thoại" required>
                </div>
                <button id="auth-register-btn" 
                        style="width: 100%; padding: 12px; background: #4f46e5; color: white; 
                               border: none; border-radius: 6px; font-size: 16px; cursor: pointer;">
                    Đăng ký và tiếp tục
                </button>
            </div>
        `;

        document.body.appendChild(modal);

        const registerBtn = document.getElementById('auth-register-btn');
        const userNameInput = document.getElementById('auth-user-name');
        const userPhoneInput = document.getElementById('auth-user-phone');

        registerBtn.addEventListener('click', async () => {
            const name = userNameInput.value.trim();
            const phone = userPhoneInput.value.trim();

            if (!name || !phone) {
                alert('Vui lòng nhập đầy đủ họ tên và số điện thoại');
                return;
            }

            // Tạo device ID mới
            const deviceId = 'device_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now();
            
            // Tạo user data
            const userData = {
                deviceId: deviceId,
                name: name,
                phone: phone,
                role: 'user',
                registeredAt: new Date().toISOString(),
                lastLogin: new Date().toISOString()
            };

            // Lưu local
            localStorage.setItem('bookreader_device_id', deviceId);
            localStorage.setItem('bookreader_user_info', JSON.stringify(userData));
            
            // Lưu lên GitHub (KHÔNG bắt lỗi - cho phép tiếp tục dù GitHub lỗi)
            try {
                await this.saveUserToGitHub(userData);
            } catch (error) {
                console.warn('⚠️ Không thể lưu user lên GitHub, nhưng vẫn tiếp tục:', error);
            }
            
            this.currentUser = userData;
            document.body.removeChild(modal);
            
            // THÔNG BÁO VÀ RESOLVE VỚI FLAG ĐẶC BIỆT
            resolve('registered'); // Flag đặc biệt để app biết là vừa đăng ký
        });
    });
}

    // SỬA hàm showAdminLogin trong auth.js
    async showAdminLogin() {
        console.log('🔑 Bắt đầu đăng nhập admin...');
        
        const username = prompt('Tên đăng nhập:');
        const password = prompt('Mật khẩu:');
        
        if (username && password) {
            const success = await this.adminLogin(username, password);
            
            if (success) {
                console.log('✅ Đăng nhập thành công');
                
                // SỬA: Hiển thị admin panel an toàn
                this.showAdminPanel();
                alert('✅ Đăng nhập Admin thành công!');
            } else {
                alert('❌ Sai tên đăng nhập hoặc mật khẩu!');
            }
        }
    }

    // auth.js - SỬA hàm adminLogin
    async adminLogin(username, password) {
        // Kiểm tra credentials cố định
        if (username === 'admin' && password === '123456') {
            this.isAdmin = true;
            localStorage.setItem('bookreader_admin_logged', 'true');
            
            // Cập nhật last login - KHÔNG BLOCK TRÊN LỖI
            if (this.currentUser) {
                this.currentUser.lastLogin = new Date().toISOString();
                try {
                    await this.saveUserToGitHub(this.currentUser);
                    console.log('✅ Last login updated on GitHub');
                } catch (error) {
                    console.warn('⚠️ Không thể cập nhật last login lên GitHub:', error);
                    // VẪN CHO ĐĂNG NHẬP THÀNH CÔNG DÙ GITHUB LỖI
                }
            }
            
            // CẬP NHẬT UI KHI ĐĂNG NHẬP ADMIN
            if (window.bookReader && typeof window.bookReader.updateUIBasedOnRole === 'function') {
                window.bookReader.updateUIBasedOnRole();
            }
            
            return true;
        }
        return false;
    }

// auth.js - SỬA HÀM adminLogout
adminLogout() {
    console.log('🚪 Đang đăng xuất admin...');
    
    this.isAdmin = false;
    localStorage.setItem('bookreader_admin_logged', 'false');
    
    // ẨN admin panel trực tiếp (fallback)
    const adminPanel = document.getElementById('admin-section');
    const githubSection = document.getElementById('github-section');
    const adminLoginSection = document.getElementById('admin-login-section');
    
    if (adminPanel) {
        adminPanel.style.display = 'none';
        console.log('❌ Đã ẩn admin panel');
    }
    if (githubSection) {
        githubSection.style.display = 'none';
        console.log('❌ Đã ẩn GitHub section');
    }
    if (adminLoginSection) {
        adminLoginSection.style.display = 'block';
        console.log('✅ Đã hiển thị admin login section');
    }
    
    // Gọi update UI từ app
    if (window.bookReader && typeof window.bookReader.updateUIBasedOnRole === 'function') {
        window.bookReader.updateUIBasedOnRole();
    }
    
    this.showMessage('✅ Đã đăng xuất!');
}

// SỬA hàm grantAdminPermission để cập nhật UI
async grantAdminPermission(deviceId) {
    try {
        const users = await this.getUsersFromGitHub();
        const userIndex = users.findIndex(u => u.deviceId === deviceId);
        
        if (userIndex !== -1) {
            users[userIndex].role = 'admin';
            users[userIndex].adminGrantedAt = new Date().toISOString();
            
            const content = JSON.stringify(users, null, 2);
            await this.uploadToGitHub('users.json', content);
            
            // Nếu là user hiện tại được cấp quyền, cập nhật UI ngay
            if (this.currentUser && this.currentUser.deviceId === deviceId) {
                this.isAdmin = true;
                localStorage.setItem('bookreader_admin_logged', 'true');
                if (window.bookReader) {
                    window.bookReader.updateUIBasedOnRole();
                }
            }
            
            this.showMessage('✅ Đã cấp quyền admin thành công!');
            this.loadUsersList();
            return true;
        }
        return false;
    } catch (error) {
        console.error('Lỗi cấp quyền admin:', error);
        this.showMessage('❌ Lỗi khi cấp quyền admin');
        return false;
    }
}


    // Hiển thị admin panel - SỬA để an toàn
    showAdminPanel() {
        if (this.elements && this.elements.adminSection) {
            this.elements.adminSection.style.display = 'block';
            console.log('🎯 Đã hiển thị admin section');
        } else {
            console.warn('⚠️ Không thể hiển thị admin panel: elements không tồn tại');
            // Fallback: tìm element bằng ID
            const adminSection = document.getElementById('admin-section');
            if (adminSection) {
                adminSection.style.display = 'block';
                console.log('🎯 Đã hiển thị admin section (fallback)');
            }
        }
        this.loadUsersList();
    }

    // Ẩn admin panel - SỬA để an toàn
    hideAdminPanel() {
        if (this.elements && this.elements.adminSection) {
            this.elements.adminSection.style.display = 'none';
        } else {
            // Fallback
            const adminSection = document.getElementById('admin-section');
            if (adminSection) {
                adminSection.style.display = 'none';
            }
        }
    }

    // Toggle users list - SỬA để an toàn
    toggleUsersList() {
        if (this.elements && this.elements.usersList) {
            const usersList = this.elements.usersList;
            if (usersList.style.display === 'none') {
                usersList.style.display = 'block';
                this.loadUsersList();
            } else {
                usersList.style.display = 'none';
            }
        }
    }

    // Load danh sách user
    async loadUsersList() {
        if (!this.isAdmin) return;

        try {
            const users = await this.getUsersList();
            this.renderUsersList(users);
        } catch (error) {
            console.error('Lỗi load users list:', error);
        }
    }

    // Hiển thị danh sách user - SỬA để an toàn
    renderUsersList(users) {
        if (!this.elements || !this.elements.usersList) {
            console.warn('⚠️ Không thể render users list: elements không tồn tại');
            return;
        }

        if (!users.length) {
            this.elements.usersList.innerHTML = '<div class="no-users">Chưa có user nào</div>';
            return;
        }

        this.elements.usersList.innerHTML = users.map(user => `
            <div class="user-item">
                <div class="user-info">
                    <div class="user-name">${this.escapeHtml(user.name)}</div>
                    <div class="user-meta">
                        <span>${user.phone}</span>
                        <span>•</span>
                        <span>${user.role}</span>
                        <span>•</span>
                        <span>${new Date(user.registeredAt).toLocaleDateString('vi-VN')}</span>
                    </div>
                </div>
                <div class="user-actions">
                    ${user.role !== 'admin' ? 
                        `<button class="grant-btn" data-device="${user.deviceId}">Cấp Admin</button>` :
                        `<button class="revoke-btn" data-device="${user.deviceId}">Thu quyền</button>`
                    }
                </div>
            </div>
        `).join('');

        // Bind events cho buttons
        this.elements.usersList.querySelectorAll('.grant-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deviceId = e.target.getAttribute('data-device');
                await this.grantAdminPermission(deviceId);
            });
        });

        this.elements.usersList.querySelectorAll('.revoke-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                const deviceId = e.target.getAttribute('data-device');
                await this.revokeAdminPermission(deviceId);
            });
        });
    }

    // Kiểm tra quyền admin từ server
    async checkAdminPermissions() {
        if (!this.currentUser) return;

        try {
            const users = await this.getUsersFromGitHub();
            const user = users.find(u => u.deviceId === this.currentUser.deviceId);
            
            if (user && user.role === 'admin') {
                this.isAdmin = true;
                localStorage.setItem('bookreader_admin_logged', 'true');
            }
        } catch (error) {
            console.error('Lỗi kiểm tra quyền admin:', error);
        }
    }

    // Lấy danh sách user từ GitHub - SỬA để xử lý lỗi token
    async getUsersFromGitHub() {
        if (!this.ghConfig?.owner || !this.ghConfig?.repo) {
            console.warn('⚠️ Chưa cấu hình GitHub - trả về mảng rỗng');
            return [];
        }

        try {
            const usersUrl = `https://raw.githubusercontent.com/${this.ghConfig.owner}/${this.ghConfig.repo}/main/users.json`;
            const response = await fetch(usersUrl);
            
            if (response.ok) {
                return await response.json();
            }
            return [];
        } catch (error) {
            console.error('Lỗi lấy users từ GitHub:', error);
            return [];
        }
    }

    // Lấy danh sách user cho admin
    async getUsersList() {
        return await this.getUsersFromGitHub();
    }
// auth.js - COMMENT lại phần upload stats
async uploadAccessLogs() {
    console.log('📊 Bỏ qua upload stats (tính năng tạm ẩn)');
    return;
    

    // CODE CŨ - TẠM ẨN
    try {
        const accessLogs = JSON.parse(localStorage.getItem('bookreader_access_logs') || '[]');
        const stats = this.calculateStats(accessLogs);
        
        const statsData = {
            totalDevices: this.getUniqueDevices(accessLogs).length,
            totalAccess: accessLogs.length,
            onlineDevices: this.getOnlineDevices(accessLogs),
            documentStats: this.getDocumentStats(accessLogs),
            lastUpdated: new Date().toISOString()
        };
        
        // Upload stats to GitHub
        const statsContent = JSON.stringify(statsData, null, 2);
        await this.uploadToGitHub('stats/access_stats.json', statsContent);
        
    } catch (error) {
        console.error('Error uploading access logs:', error);
    }
    
}
    // auth.js - SỬA hàm saveUserToGitHub với log đẹp
async saveUserToGitHub(userData) {
    if (!this.ghConfig?.owner || !this.ghConfig?.repo) {
        console.warn('⚠️ Chưa cấu hình GitHub - bỏ qua lưu GitHub');
        return true;
    }

    // KIỂM TRA token trước khi upload
    if (!this.ghConfig.token) {
        console.warn('⚠️ Chưa cấu hình GitHub Token - bỏ qua lưu GitHub');
        return true;
    }

    try {
        console.log('👤 Đang lưu user lên GitHub...');
        console.log('📝 User:', userData.name, `(${userData.deviceId})`);
        
        let users = await this.getUsersFromGitHub();
        console.log('📊 Tổng số users hiện tại:', users.length);
        
        const existingIndex = users.findIndex(u => u.deviceId === userData.deviceId);
        if (existingIndex !== -1) {
            users[existingIndex] = userData;
            console.log('🔄 Đang cập nhật user có sẵn');
        } else {
            users.push(userData);
            console.log('➕ Đang thêm user mới');
        }

        const content = JSON.stringify(users, null, 2);
        console.log('📄 Kích thước dữ liệu:', content.length, 'ký tự');
        
        console.log('🚀 Bắt đầu upload users.json...');
        const result = await this.uploadToGitHub('users.json', content, 'Cập nhật danh sách users');
        
        console.log('🎊 🎊 🎊 LƯU USER THÀNH CÔNG! 🎊 🎊 🎊');
        console.log('✅ Đã lưu user:', userData.name);
        console.log('✅ Tổng số users:', users.length);
        console.log('✅ File URL:', result.content.html_url);
        
        return !!result;
        
    } catch (error) {
        console.error('💥 💥 💥 LỖI LƯU USER! 💥 💥 💥');
        console.error('❌ User:', userData.name);
        console.error('❌ Lỗi:', error.message);
        console.warn('⚠️ Ứng dụng vẫn tiếp tục hoạt động bình thường');
        return false;
    }
}
    // Thu quyền admin
    async revokeAdminPermission(deviceId) {
        try {
            const users = await this.getUsersFromGitHub();
            const userIndex = users.findIndex(u => u.deviceId === deviceId);
            
            if (userIndex !== -1) {
                users[userIndex].role = 'user';
                delete users[userIndex].adminGrantedAt;
                
                const content = JSON.stringify(users, null, 2);
                await this.uploadToGitHub('users.json', content);
                
                this.showMessage('✅ Đã thu quyền admin thành công!');
                this.loadUsersList();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Lỗi thu quyền admin:', error);
            this.showMessage('❌ Lỗi khi thu quyền admin');
            return false;
        }
    }

    // auth.js - SỬA hàm uploadToGitHub với log chi tiết
async uploadToGitHub(path, content, message = 'Add new document') {
    // KIỂM TRA token trước khi upload
    if (!this.ghConfig?.token) {
        console.warn('❌ Chưa cấu hình GitHub token');
        throw new Error('Chưa cấu hình GitHub token');
    }

    const apiUrl = `https://api.github.com/repos/${this.ghConfig.owner}/${this.ghConfig.repo}/contents/${path}`;
    
    console.log('🚀 Bắt đầu upload đến GitHub...');
    console.log('📁 Repository:', `${this.ghConfig.owner}/${this.ghConfig.repo}`);
    console.log('📍 Path:', path);
    console.log('📝 Message:', message);
    console.log('📏 Content size:', content.length, 'ký tự');

    // KIỂM TRA file có tồn tại không để lấy SHA
    let sha = null;
    let fileExists = false;
    
    try {
        console.log('🔍 Đang kiểm tra file có tồn tại không...');
        const checkResponse = await fetch(apiUrl, {
            headers: {
                'Authorization': `token ${this.ghConfig.token}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        
        if (checkResponse.ok) {
            const existingFile = await checkResponse.json();
            sha = existingFile.sha;
            fileExists = true;
            message = 'Cập nhật file ' + path;
            console.log('✅ File đã tồn tại, dùng SHA để cập nhật');
        } else if (checkResponse.status === 404) {
            fileExists = false;
            message = 'Thêm file mới ' + path;
            console.log('📭 File chưa tồn tại, sẽ tạo mới');
        } else {
            console.warn('⚠️ Lỗi khi kiểm tra file:', checkResponse.status);
        }
    } catch (error) {
        console.warn('⚠️ Không thể kiểm tra file, tiếp tục upload...');
    }

    // Chuẩn bị payload
    const payload = {
        message: message,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: 'main'
    };

    // Thêm SHA nếu file đã tồn tại
    if (sha) {
        payload.sha = sha;
        console.log('🔑 Đã thêm SHA vào payload');
    }

    console.log('📦 Đang gửi request đến GitHub API...');

    const response = await fetch(apiUrl, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${this.ghConfig.token}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify(payload)
    });

    console.log('📡 GitHub API response status:', response.status);

    if (response.ok) {
        const result = await response.json();
        console.log('🎉 🎉 🎉 UPLOAD THÀNH CÔNG! 🎉 🎉 🎉');
        console.log('✅ File:', path);
        console.log('✅ Commit:', result.commit.message);
        console.log('✅ URL:', result.content.html_url);
        console.log('✅ SHA:', result.content.sha);
        console.log('✅ Size:', result.content.size, 'bytes');
        console.log('🎉 Upload hoàn tất thành công!');
        return result;
    } else {
        let errorDetails = '';
        try {
            const errorData = await response.json();
            errorDetails = errorData.message || `HTTP ${response.status}`;
            console.error('❌ Chi tiết lỗi GitHub API:', errorData);
            
            // Hiển thị thông báo lỗi chi tiết
            if (errorData.errors) {
                errorData.errors.forEach((err, index) => {
                    console.error(`❌ Lỗi ${index + 1}:`, err.message);
                });
            }
        } catch (e) {
            errorDetails = `HTTP ${response.status}: ${response.statusText}`;
        }
        
        console.error('❌ ❌ ❌ UPLOAD THẤT BẠI! ❌ ❌ ❌');
        console.error('📁 File:', path);
        console.error('📡 Status:', response.status);
        console.error('🔍 Lỗi:', errorDetails);
        
        throw new Error(`GitHub API error: ${errorDetails}`);
    }
}

    // Helper function để hiển thị message
    showMessage(message) {
        alert(message);
    }

    // Helper function để escape HTML
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}