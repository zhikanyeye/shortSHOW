document.addEventListener('DOMContentLoaded', function() {
    // 获取DOM元素
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
    
    // 全局定时器
    window.searchTimer = null;
    
    // 设置最后更新日期
    if (lastUpdateElement) {
        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, '0');
        const day = String(currentDate.getDate()).padStart(2, '0');
        lastUpdateElement.textContent = `${year}-${month}-${day}`;
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
            // 将延迟时间减少，避免与弹窗冲突
            setTimeout(() => {
                hideSuggestions();
            }, 100);
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
        
        // 点击模态框外部区域关闭（修改此处避免弹窗自动消失）
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', event => {
                if (event.target === modal) {
                    closeModal(modal);
                }
            });
        });
        
        // 防止搜索结果弹窗中的点击事件冒泡到外层
        if (searchResultsModal) {
            const modalContent = searchResultsModal.querySelector('.modal-content');
            if (modalContent) {
                modalContent.addEventListener('click', (event) => {
                    event.stopPropagation();
                });
            }
        }
        
        // 联系按钮点击
        if (contactButton) {
            contactButton.addEventListener('click', () => {
                openModal(contactModal);
            });
        }
        
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
        
        // 防止重复搜索（修改逻辑，允许重复搜索仍然显示结果）
        if (query === lastSearchQuery) {
            // 如果是重复搜索，仍然显示结果而不是直接返回
            const existingResults = window.searchEngine.search(query);
            if (existingResults && existingResults.length > 0) {
                const formattedResults = window.searchEngine.formatResults(existingResults);
                displaySearchResults(formattedResults, query);
            }
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
        
        // 使用更稳定的定时器
        clearTimeout(window.searchTimer);
        window.searchTimer = setTimeout(() => {
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
        if (searchSuggestions) {
            searchSuggestions.innerHTML = '';
            searchSuggestions.classList.add('hidden');
        }
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
        if (!searchResultsList || !resultsTitle) return;
        
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
        if (noResultsModal) {
            openModal(noResultsModal);
        }
    }
    
    /**
     * 打开模态框 - 修改版本
     * @param {Element} modal - 模态框元素
     */
    function openModal(modal) {
        if (!modal) return;
        
        // 先关闭其他所有弹窗
        document.querySelectorAll('.modal.show').forEach(m => {
            if (m !== modal) {
                m.classList.remove('show');
                m.classList.add('hidden');
            }
        });
        
        // 延时打开目标弹窗，避免动画冲突
        modal.classList.remove('hidden');
        // 使用requestAnimationFrame确保DOM更新后再添加动画类
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                modal.classList.add('show');
            });
        });
    }
    
    /**
     * 关闭模态框 - 修改版本
     * @param {Element} modal - 模态框元素
     */
    function closeModal(modal) {
        if (!modal) return;
        
        modal.classList.remove('show');
        // 使用较长的延迟以匹配CSS过渡时间
        setTimeout(() => {
            modal.classList.add('hidden');
        }, 300);
    }
    
    /**
     * 关闭所有模态框
     */
    function closeAllModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.classList.remove('show');
            modal.classList.add('hidden');
        });
    }
    
    /**
     * 显示加载动画
     */
    function showLoading() {
        if (loadingElement) {
            loadingElement.classList.remove('hidden');
        }
    }
    
    /**
     * 隐藏加载动画
     */
    function hideLoading() {
        if (loadingElement) {
            loadingElement.classList.add('hidden');
        }
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
     * 初始化返回顶部按钮
     */
    function initScrollToTopButton() {
        if (!backToTopBtn) return;
        
        // 监听滚动事件
        window.addEventListener('scroll', () => {
            if (window.scrollY > 300) {
                backToTopBtn.classList.add('show');
            } else {
                backToTopBtn.classList.remove('show');
            }
        });
        
        // 点击事件
        backToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }
    
    /**
     * 显示提示信息
     * @param {string} message - 提示消息
     */
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = message;
        
        document.body.appendChild(toast);
        
        // 强制重绘
        void toast.offsetWidth;
        
        toast.classList.add('show');
        
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }
    
    /**
     * 截断文本
     * @param {string} text - 原始文本
     * @param {number} maxLength - 最大长度
     * @returns {string} 截断后的文本
     */
    function truncateText(text, maxLength) {
        if (!text || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }
    
    /**
     * 记录观看点击
     * @param {string} title - 剧名
     */
    function trackWatchClick(title) {
        // 这里可以添加统计代码
        console.log('用户点击了观看:', title);
    }
});
