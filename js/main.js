/**
 * shortSHOW 主功能模块
 * 处理UI交互、事件监听、模态框管理等核心功能
 * 
 * @author Luxcus Qing
 * @version 1.0
 * @updated 2025-05-29
 */

document.addEventListener('DOMContentLoaded', () => {
    // 全局变量和元素引用
    const searchForm = document.getElementById('searchForm');
    const searchInput = document.getElementById('searchInput');
    const searchSuggestions = document.getElementById('searchSuggestions');
    const hotTags = document.querySelectorAll('.hot-tag');
    const searchResultsModal = document.getElementById('searchResultsModal');
    const noResultsModal = document.getElementById('noResultsModal');
    const contactModal = document.getElementById('contactModal');
    const searchResultsList = document.getElementById('searchResultsList');
    const resultsTitle = document.getElementById('resultsTitle');
    const backToTopBtn = document.getElementById('backToTop');
    const contactButton = document.getElementById('contactButton');
    const loadingElement = document.getElementById('loading');
    
    // 模态框关闭按钮
    const closeButtons = document.querySelectorAll('.modal-close');
    const lastUpdateElement = document.getElementById('lastUpdate');

    // 上次搜索关键词
    let lastSearchQuery = '';
    
    // 设置最后更新日期
    if (lastUpdateElement) {
        lastUpdateElement.textContent = '2025-05-29';
    }
    
    // 初始化功能
    initEventListeners();
    checkForDeepLink();
    initScrollToTopButton();
    
    /**
     * 初始化所有事件监听器
     */
    function initEventListeners() {
        // 搜索表单提交
        searchForm.addEventListener('submit', handleSearch);
        
        // 搜索输入框事件
        searchInput.addEventListener('input', handleSearchInput);
        searchInput.addEventListener('focus', showSuggestions);
        searchInput.addEventListener('blur', () => {
            // 延迟隐藏推荐，以便可以点击
            setTimeout(() => {
                hideSuggestions();
            }, 200);
        });
        
        // 热门标签点击
        hotTags.forEach(tag => {
            tag.addEventListener('click', () => {
                const searchText = tag.getAttribute('data-search');
                if (searchText) {
                    searchInput.value = searchText;
                    handleSearch(null, searchText);
                }
            });
        });
        
        // 关闭按钮点击
        closeButtons.forEach(button => {
            button.addEventListener('click', () => {
                const modal = button.closest('.modal');
                closeModal(modal);
            });
        });
        
        // 点击模态框外部区域关闭
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    closeModal(modal);
                }
            });
        });
        
        // 联系按钮点击
        contactButton.addEventListener('click', () => {
            openModal(contactModal);
        });
        
        // 键盘事件
        document.addEventListener('keydown', event => {
            if (event.key === 'Escape') {
                document.querySelectorAll('.modal.show').forEach(modal => {
                    closeModal(modal);
                });
            }
        });
    }
    
    /**
     * 处理搜索表单提交
     * @param {Event} event - 表单提交事件
     * @param {string} forcedQuery - 强制搜索关键词（热门标签使用）
     */
    function handleSearch(event, forcedQuery = null) {
        if (event) {
            event.preventDefault();
        }
        
        const query = forcedQuery || searchInput.value.trim();
        
        // 防止重复搜索
        if (query === lastSearchQuery) {
            return;
        }
        lastSearchQuery = query;
        
        if (!query) {
            showToast('请输入搜索关键词');
            return;
        }
        
        // 显示加载动画
        showLoading();
        
        // 更新URL
        updateUrlWithQuery(query);
        
        // 增加搜索计数
        window.searchEngine.incrementSearchCount();
        
        // 延迟执行搜索，让UI有时间更新
        setTimeout(() => {
            const results = window.searchEngine.search(query);
            
            if (results && results.length > 0) {
                const formattedResults = window.searchEngine.formatResults(results);
                displaySearchResults(formattedResults, query);
            } else {
                showNoResults();
            }
            
            // 隐藏加载动画
            hideLoading();
            
        }, 500);
    }
    
    /**
     * 处理搜索框输入
     */
    function handleSearchInput() {
        const query = searchInput.value.trim();
        
        if (query.length >= 1) {
            const suggestions = window.searchEngine.getSuggestions(query);
            if (suggestions.length > 0) {
                displaySuggestions(suggestions);
            } else {
                hideSuggestions();
            }
        } else {
            hideSuggestions();
        }
    }
    
    /**
     * 显示搜索建议
     */
    function showSuggestions() {
        handleSearchInput();
    }
    
    /**
     * 隐藏搜索建议
     */
    function hideSuggestions() {
        searchSuggestions.innerHTML = '';
        searchSuggestions.classList.add('hidden');
    }
    
    /**
     * 显示搜索建议列表
     * @param {Array} suggestions - 建议列表
     */
    function displaySuggestions(suggestions) {
        searchSuggestions.innerHTML = '';
        
        suggestions.forEach(suggestion => {
            const item = document.createElement('div');
            item.className = 'suggestion-item';
            item.textContent = suggestion;
            
            item.addEventListener('click', () => {
                searchInput.value = suggestion;
                hideSuggestions();
                handleSearch(null, suggestion);
            });
            
            searchSuggestions.appendChild(item);
        });
        
        searchSuggestions.classList.remove('hidden');
    }
    
    /**
     * 显示搜索结果
     * @param {Array} results - 格式化后的搜索结果
     * @param {string} query - 搜索关键词
     */
    function displaySearchResults(results, query) {
        searchResultsList.innerHTML = '';
        resultsTitle.textContent = `"${query}" 的搜索结果 (${results.length})`;
        
        results.forEach(result => {
            const item = document.createElement('div');
            item.className = 'result-item';
            
            const title = document.createElement('div');
            title.className = 'result-title';
            title.textContent = result.title;
            
            const meta = document.createElement('div');
            meta.className = 'result-meta';
            
            if (result.actors) {
                const actors = document.createElement('span');
                actors.innerHTML = `<strong>主演:</strong> ${result.actors}`;
                meta.appendChild(actors);
            }
            
            if (result.episodes) {
                const episodes = document.createElement('span');
                episodes.innerHTML = `<strong>集数:</strong> ${result.episodes}`;
                meta.appendChild(episodes);
            }
            
            const link = document.createElement('a');
            link.className = 'result-link';
            link.href = result.link;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.innerHTML = '<span class="btn-icon">▶</span> 立即观看';
            
            // 添加事件分析
            link.addEventListener('click', () => {
                trackWatchClick(result.title);
            });
            
            item.appendChild(title);
            item.appendChild(meta);
            
            if (result.description) {
                const desc = document.createElement('p');
                desc.style.margin = '0.75rem 0';
                desc.style.fontSize = '0.9rem';
                desc.style.color = 'var(--text-muted)';
                desc.textContent = truncateText(result.description, 100);
                item.appendChild(desc);
            }
            
            item.appendChild(link);
            searchResultsList.appendChild(item);
        });
        
        openModal(searchResultsModal);
    }
    
    /**
     * 显示无结果界面
     */
    function showNoResults() {
        openModal(noResultsModal);
    }
    
    /**
     * 打开模态框
     * @param {Element} modal - 模态框元素
     */
    function openModal(modal) {
        closeAllModals();
        setTimeout(() => {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.add('show');
            }, 10);
        }, 100);
    }
    
    /**
     * 关闭模态框
     * @param {Element} modal - 模态框元素
     */
    function closeModal(modal) {
        modal.classList.remove('show');
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
    
    /**
     * 关闭所有模态框
     */
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            closeModal(modal);
        });
    }
    
    /**
     * 显示加载动画
     */
    function showLoading() {
        loadingElement.classList.remove('hidden');
    }
    
    /**
     * 隐藏加载动画
     */
    function hideLoading() {
        loadingElement.classList.add('hidden');
    }
    
    /**
     * 更新URL参数
     * @param {string} query - 搜索关键词
     */
    function updateUrlWithQuery(query) {
        const url = new URL(window.location);
        url.searchParams.set('q', query);
        window.history.pushState({}, '', url);
    }
    
    /**
     * 检查URL中是否包含搜索参数
     */
    function checkForDeepLink() {
        const urlParams = new URLSearchParams(window.location.search);
        const query = urlParams.get('q');
        
        if (query) {
            searchInput.value = query;
            handleSearch(null, query);
        }
    }
    
    /**
     * 初始化回到顶部按钮
     */
    function initScrollToTopButton() {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.remove('hidden');
            } else {
                backToTopBtn.classList.add('hidden');
            }
        });
        
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    /**
     * 截断文本
     * @param {string} text - 原始文本
     * @param {number} maxLength - 最大长度
     * @returns {string} 截断后的文本
     */
    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * 显示提示消息
     * @param {string} message - 提示消息
     * @param {string} type - 消息类型（success, error, info）
     */
    function showToast(message, type = 'info') {
        // 检查是否已存在Toast元素
        let toast = document.querySelector('.toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.className = 'toast-notification hidden';
            document.body.appendChild(toast);
        }
        
        // 设置类型和消息
        toast.className = `toast-notification toast-${type} hidden`;
        toast.textContent = message;
        
        // 显示动画
        setTimeout(() => {
            toast.classList.remove('hidden');
            setTimeout(() => {
                toast.classList.add('hidden');
                setTimeout(() => {
                    toast.remove();
                }, 300);
            }, 3000);
        }, 10);
    }
    
    /**
     * 跟踪观看点击
     * @param {string} title - 短剧标题
     */
    function trackWatchClick(title) {
        try {
            // 记录本地历史
            const watchHistory = JSON.parse(localStorage.getItem('watchHistory') || '[]');
            
            // 移除重复项
            const filteredHistory = watchHistory.filter(item => item.title !== title);
            
            // 添加到开头
            filteredHistory.unshift({
                title: title,
                timestamp: new Date().toISOString()
            });
            
            // 限制历史记录数量
            const limitedHistory = filteredHistory.slice(0, 50);
            
            // 保存到本地存储
            localStorage.setItem('watchHistory', JSON.stringify(limitedHistory));
            
        } catch (error) {
            console.warn('保存观看历史失败:', error);
        }
    }
    
    /**
     * 获取观看历史
     * @returns {Array} 观看历史记录
     */
    function getWatchHistory() {
        try {
            return JSON.parse(localStorage.getItem('watchHistory') || '[]');
        } catch (error) {
            console.warn('获取观看历史失败:', error);
            return [];
        }
    }
    
    /**
     * 清除观看历史
     */
    function clearWatchHistory() {
        try {
            localStorage.removeItem('watchHistory');
        } catch (error) {
            console.warn('清除观看历史失败:', error);
        }
    }
    
    // 导出公共API
    window.appUI = {
        openModal,
        closeModal,
        showToast,
        getWatchHistory,
        clearWatchHistory
    };
});

// 添加自定义CSS样式
(function addToastStyles() {
    const style = document.createElement('style');
    style.textContent = `
        .toast-notification {
            position: fixed;
            bottom: 2rem;
            left: 50%;
            transform: translateX(-50%);
            padding: 0.75rem 1.5rem;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            opacity: 1;
            transition: all 0.3s ease;
            max-width: 80vw;
            text-align: center;
        }
        
        .toast-notification.hidden {
            opacity: 0;
            transform: translate(-50%, 20px);
            pointer-events: none;
        }
        
        .toast-success {
            background-color: #48bb78;
        }
        
        .toast-error {
            background-color: #f56565;
        }
        
        .toast-info {
            background-color: #4299e1;
        }
    `;
    document.head.appendChild(style);
})();

// 添加网站性能追踪
(function initPerformanceTracking() {
    // 记录页面加载时间
    window.addEventListener('load', () => {
        setTimeout(() => {
            const perfData = window.performance.timing;
            const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
            console.log(`页面加载时间: ${pageLoadTime}ms`);
            
            // 可以在这里实现发送到分析服务
        }, 0);
    });
})();
