const NEWS_API_KEY = 'c8fe7a975f7a487a84731efa36093dfc';
const NEWS_API_URL = 'https://newsapi.org/v2/everything';
let currentPage = 1;
let currentKeyword = '';
let hasMoreResults = true;

const INDUSTRY_KEYWORDS = {
    '投融资': 'investment OR financing OR 投资 OR 融资',
    '硬科技': 'hardware technology OR 硬科技 OR 芯片 OR 半导体',
    '大健康': 'healthcare OR medical OR 医疗 OR 健康',
    '大消费': 'consumer OR retail OR 消费 OR 零售',
    '汽车': 'automotive OR 汽车 OR 新能源汽车',
    '数字化': 'digital transformation OR 数字化 OR 智能化',
    '新能源': 'new energy OR renewable OR 新能源 OR 可再生能源'
};

function calculateImportance(article) {
    let score = 5;
    const title = article.title.toLowerCase();
    const description = (article.description || '').toLowerCase();
    
    const keywords = ['重要', '突破', '重大', '首次', '创新', '独家', '最新', '紧急'];
    keywords.forEach(keyword => {
        if (title.includes(keyword)) score += 1;
        if (description.includes(keyword)) score += 0.5;
    });
    
    if (title.length > 30) score += 1;
    if (description && description.length > 100) score += 1;
    
    const importantSources = ['新华社', '人民日报', '央视新闻', '中国证券报'];
    if (importantSources.some(source => article.source.name.includes(source))) {
        score += 1;
    }
    
    return Math.min(Math.max(score, 1), 10);
}

function generateSummary(text) {
    if (!text) return '';
    const sentences = text.split(/[。！？.!?]/);
    let summary = sentences[0] || '';
    return summary.length > 50 ? summary.substring(0, 47) + '...' : summary;
}

function getSelectedIndustries() {
    const checkedBoxes = document.querySelectorAll('input[name="industry"]:checked');
    return Array.from(checkedBoxes).map(box => box.value);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
}

function resetForm() {
    document.querySelectorAll('input[name="industry"]').forEach(checkbox => checkbox.checked = false);
    document.getElementById('selectAll').checked = false;
    document.getElementById('searchInput').value = '';
    document.getElementById('results').innerHTML = '';
    document.getElementById('loadMoreButton').style.display = 'none';
    currentPage = 1;
}

async function searchNewsForIndustry(industry, page = 1) {
    const searchQuery = INDUSTRY_KEYWORDS[industry] || industry;
    const additionalKeyword = document.getElementById('searchInput').value.trim();
    const finalQuery = additionalKeyword ? `(${searchQuery}) AND ${additionalKeyword}` : searchQuery;
    
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    
    const params = new URLSearchParams({
        q: finalQuery,
        apiKey: NEWS_API_KEY,
        language: 'zh',
        from: oneWeekAgo.toISOString().split('T')[0],
        sortBy: 'publishedAt',
        page: page,
        pageSize: 20
    });

    try {
        const response = await fetch(`${NEWS_API_URL}?${params}`);
        const data = await response.json();
        
        if (data.status === 'ok') {
            return {
                industry: industry,
                articles: data.articles.map(article => {
                    const importance = calculateImportance(article);
                    return {
                        title: article.title,
                        url: article.url,
                        source: article.source.name,
                        source_url: article.url,
                        pubDate: article.publishedAt,
                        description: generateSummary(article.description || ''),
                        importance: importance
                    };
                }),
                hasMore: data.totalResults > page * 20
            };
        }
        return { industry: industry, articles: [], hasMore: false };
    } catch (error) {
        console.error(`${industry} 新闻搜索失败:`, error);
        return { industry: industry, articles: [], hasMore: false };
    }
}

async function searchNews(isLoadMore = false) {
    if (!isLoadMore) {
        currentPage = 1;
        document.getElementById('results').innerHTML = '';
    }

    const industries = getSelectedIndustries();
    if (industries.length === 0) {
        alert('请至少选择一个行业');
        return;
    }

    try {
        const searchPromises = industries.map(industry => 
            searchNewsForIndustry(industry, currentPage)
        );
        
        const results = await Promise.all(searchPromises);
        displayResults(results, isLoadMore);
        
        hasMoreResults = results.some(result => result.hasMore);
        document.getElementById('loadMoreButton').style.display = hasMoreResults ? 'block' : 'none';
        
        if (isLoadMore) {
            currentPage++;
        }
    } catch (error) {
        console.error('搜索失败:', error);
        document.getElementById('results').innerHTML += '<p>搜索时出错，请稍后重试</p>';
    }
}

function sortArticles(articles, method) {
    return [...articles].sort((a, b) => {
        if (method === 'importance') {
            return b.dataset.importance - a.dataset.importance;
        } else {
            return new Date(b.dataset.date) - new Date(a.dataset.date);
        }
    });
}

function displayResults(results, isLoadMore) {
    const resultsContainer = document.getElementById('results');
    
    if (!isLoadMore) {
        resultsContainer.innerHTML = '';
        resultsContainer.style.gridTemplateColumns = `repeat(${results.length}, 1fr)`;
    }

    results.forEach(result => {
        let industrySection;
        if (!isLoadMore) {
            industrySection = document.createElement('div');
            industrySection.className = 'industry-section';
            industrySection.setAttribute('data-industry', result.industry);
            industrySection.innerHTML = `
                <div class="sort-control">
                    <select class="sort-selector" data-industry="${result.industry}">
                        <option value="date">按日期排序</option>
                        <option value="importance">按重要度排序</option>
                    </select>
                </div>
                <h2>${result.industry}行业新闻</h2>
                <div class="news-list"></div>
                <button class="load-more-button" style="display: none;">加载更多</button>
            `;
            resultsContainer.appendChild(industrySection);
            
            const selector = industrySection.querySelector('.sort-selector');
            selector.addEventListener('change', (e) => {
                const method = e.target.value;
                const newsList = industrySection.querySelector('.news-list');
                const articles = Array.from(newsList.children);
                const sortedArticles = sortArticles(articles, method);
                newsList.innerHTML = '';
                sortedArticles.forEach(article => newsList.appendChild(article));
            });
        } else {
            industrySection = resultsContainer.querySelector(`[data-industry="${result.industry}"]`);
        }
        
        const newsList = industrySection.querySelector('.news-list');
        const loadMoreBtn = industrySection.querySelector('.load-more-button');
        
        result.articles.forEach(article => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            newsItem.dataset.importance = article.importance;
            newsItem.dataset.date = article.pubDate;
            
            newsItem.innerHTML = `
                <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
                <div class="news-meta">
                    <span>来源：<a href="${article.source_url}" target="_blank">${article.source}</a></span>
                    <span>发布日期：${formatDate(article.pubDate)}</span>
                    <span>重要度：${article.importance.toFixed(1)}</span>
                </div>
                <p>${article.description}</p>
            `;
            newsList.appendChild(newsItem);
        });

        loadMoreBtn.style.display = result.hasMore ? 'block' : 'none';
        loadMoreBtn.onclick = () => searchNews(true);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const selectAllCheckbox = document.getElementById('selectAll');
    const industryCheckboxes = document.querySelectorAll('input[name="industry"]');

    selectAllCheckbox.addEventListener('change', (e) => {
        industryCheckboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
        });
    });

    industryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            const allChecked = Array.from(industryCheckboxes).every(cb => cb.checked);
            const someChecked = Array.from(industryCheckboxes).some(cb => cb.checked);
            selectAllCheckbox.checked = allChecked;
            selectAllCheckbox.indeterminate = someChecked && !allChecked;
        });
    });

    document.getElementById('searchButton').addEventListener('click', () => searchNews(false));
    document.getElementById('refreshButton').addEventListener('click', () => searchNews(false));
    document.getElementById('resetButton').addEventListener('click', resetForm);
    document.getElementById('loadMoreButton').addEventListener('click', () => searchNews(true));
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchNews(false);
    });
});