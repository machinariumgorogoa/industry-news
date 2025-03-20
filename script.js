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

function getSelectedIndustries() {
    const checkedBoxes = document.querySelectorAll('input[name="industry"]:checked');
    const industries = Array.from(checkedBoxes).map(box => box.value);
    
    const customIndustry = document.getElementById('customIndustry').value.trim();
    if (customIndustry) {
        industries.push(customIndustry);
    }
    
    return industries;
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN');
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
                articles: data.articles.map(article => ({
                    title: article.title,
                    url: article.url,
                    source: article.source.name,
                    source_url: article.url,
                    pubDate: article.publishedAt,
                    description: article.description || ''
                })),
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

function displayResults(results, isLoadMore) {
    const resultsContainer = document.getElementById('results');
    
    if (!isLoadMore) {
        resultsContainer.innerHTML = '';
        resultsContainer.setAttribute('data-columns', results.length);
    }

    results.forEach(result => {
        let industrySection;
        if (!isLoadMore) {
            industrySection = document.createElement('div');
            industrySection.className = 'industry-section';
            industrySection.setAttribute('data-industry', result.industry);
            industrySection.innerHTML = `
                <h2>${result.industry}行业新闻</h2>
                <div class="news-list"></div>
            `;
            resultsContainer.appendChild(industrySection);
        } else {
            industrySection = resultsContainer.querySelector(`[data-industry="${result.industry}"]`);
        }
        
        const newsList = industrySection.querySelector('.news-list');
        
        result.articles.forEach(article => {
            const newsItem = document.createElement('div');
            newsItem.className = 'news-item';
            newsItem.innerHTML = `
                <h3><a href="${article.url}" target="_blank">${article.title}</a></h3>
                <div class="news-meta">
                    <span>来源: <a href="${article.source_url}" target="_blank">${article.source}</a></span>
                    <span>发布日期: ${formatDate(article.pubDate)}</span>
                </div>
                <p>${article.description}</p>
            `;
            newsList.appendChild(newsItem);
        });
    });
}

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('searchButton').addEventListener('click', () => searchNews(false));
    document.getElementById('loadMoreButton').addEventListener('click', () => searchNews(true));
    document.getElementById('searchInput').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') searchNews(false);
    });
});