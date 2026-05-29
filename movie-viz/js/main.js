/**
 * 纯静态版 - 电影市场票房转化漏斗分析
 * 所有数据处理在前端完成，无需服务器
 */

// 全局变量
let allMovies = []; // 所有电影数据
let funnelChart = null;
let genreChart = null;
let trendChart = null;
let scatterChart = null;
let currentLevel = 'all';
let currentPage = 1;
const PAGE_SIZE = 20;

/**
 * 初始化函数
 */
async function init() {
    console.log('开始初始化...');
    
    // 初始化图表
    initCharts();
    
    // 绑定事件
    bindEvents();
    
    // 加载数据
    await loadData();
}

/**
 * 加载数据
 */
function loadData() {
    const statusEl = document.getElementById('statStatus');
    statusEl.innerHTML = '<span class="loading"></span> 加载数据...';
    
    try {
        // 直接使用全局变量 MOVIES_DATA（从 data.js 加载）
        if (typeof MOVIES_DATA === 'undefined' || !MOVIES_DATA.movies) {
            throw new Error('数据未加载');
        }
        
        allMovies = MOVIES_DATA.movies;
        
        // 更新状态
        statusEl.textContent = '已就绪';
        statusEl.style.color = '#4caf50';
        
        document.getElementById('statTotal').textContent = 
            allMovies.length.toLocaleString() + ' 部';
        
        console.log(`数据加载完成: ${allMovies.length.toLocaleString()} 部电影`);
        
        // 更新所有图表
        updateAllCharts();
        
    } catch (err) {
        console.error('加载数据失败:', err);
        statusEl.textContent = '加载失败';
        statusEl.style.color = '#f44336';
        alert('数据加载失败，请确保 js/data.js 文件存在');
    }
}

/**
 * 初始化所有图表
 */
function initCharts() {
    funnelChart = echarts.init(document.getElementById('funnelChart'));
    genreChart = echarts.init(document.getElementById('genreChart'));
    trendChart = echarts.init(document.getElementById('trendChart'));
    scatterChart = echarts.init(document.getElementById('scatterChart'));
    
    // 响应窗口大小变化
    window.addEventListener('resize', () => {
        funnelChart && funnelChart.resize();
        genreChart && genreChart.resize();
        trendChart && trendChart.resize();
        scatterChart && scatterChart.resize();
    });
    
    // 漏斗图点击事件
    funnelChart.on('click', (params) => {
        const levelMap = {
            '上映电影总数': 'all',
            '获得评分电影': 'rated',
            '中等口碑电影': 'medium',
            '高口碑电影': 'high',
            '经典佳作': 'classic'
        };
        currentLevel = levelMap[params.name] || 'all';
        currentPage = 1;
        document.getElementById('movieTableTitle').textContent = 
            `电影详情列表 - ${params.name}`;
        updateMovieTable();
        document.getElementById('movieTable').scrollIntoView({ behavior: 'smooth' });
    });
}

/**
 * 类型中英文映射
 */
const GENRE_MAP = {
    'Action': '动作',
    'Adventure': '冒险',
    'Animation': '动画',
    'Biography': '传记',
    'Comedy': '喜剧',
    'Crime': '犯罪',
    'Documentary': '纪录片',
    'Drama': '剧情',
    'Family': '家庭',
    'Fantasy': '奇幻',
    'Film-Noir': '黑色电影',
    'History': '历史',
    'Horror': '恐怖',
    'Music': '音乐',
    'Musical': '歌舞',
    'Mystery': '悬疑',
    'News': '新闻',
    'Romance': '爱情',
    'Sci-Fi': '科幻',
    'Sport': '运动',
    'Thriller': '惊悚',
    'War': '战争',
    'Western': '西部'
};

/**
 * 获取类型的中文名称
 */
function getGenreChineseName(englishName) {
    return GENRE_MAP[englishName] || englishName;
}

/**
 * 获取筛选条件
 */
function getFilters() {
    return {
        yearStart: parseInt(document.getElementById('yearStart').value) || 1900,
        yearEnd: parseInt(document.getElementById('yearEnd').value) || 2024,
        genre: document.getElementById('genreSelect').value || '',
        minVotes: parseInt(document.getElementById('minVotes').value) || 0
    };
}

/**
 * 筛选电影数据
 */
function filterMovies(movies, filters) {
    let filtered = [...movies];
    
    // 年份筛选
    filtered = filtered.filter(m => m.year >= filters.yearStart && m.year <= filters.yearEnd);
    
    // 类型筛选
    if (filters.genre) {
        filtered = filtered.filter(m => m.genres.includes(filters.genre));
    }
    
    return filtered;
}

/**
 * 更新所有图表
 */
function updateAllCharts() {
    const filters = getFilters();
    const filtered = filterMovies(allMovies, filters);
    
    // 更新筛选条件显示
    const genreText = filters.genre || '全部';
    document.getElementById('statFilter').textContent = 
        `${filters.yearStart}-${filters.yearEnd}年 | ${genreText} | 投票≥${filters.minVotes}`;
    
    document.getElementById('statTotal').textContent = 
        filtered.length.toLocaleString() + ' 部';
    
    // 计算并渲染各图表
    const funnelData = calculateFunnelData(filtered, filters.minVotes);
    renderFunnelChart(funnelData, filters);
    updateConversionTable(funnelData);
    
    const genreData = calculateGenreData(filtered);
    renderGenreChart(genreData);
    
    const trendData = calculateTrendData(filtered);
    renderTrendChart(trendData);
    
    const scatterData = calculateScatterData(filtered, 1000);
    renderScatterChart(scatterData);
    
    // 更新电影详情表格
    currentLevel = 'all';
    currentPage = 1;
    updateMovieTable();
}

/**
 * 计算漏斗数据
 */
function calculateFunnelData(movies, minVotes) {
    const totalMovies = movies.length;
    
    if (totalMovies === 0) {
        return getEmptyFunnelData();
    }
    
    const withRatings = movies.filter(m => m.votes >= minVotes);
    const mediumRating = withRatings.filter(m => m.rating >= 6.0);
    const highRating = mediumRating.filter(m => m.rating >= 7.5);
    const classics = highRating.filter(m => m.votes >= 10000 && m.rating >= 8.5);
    
    const formatPercent = (value, total) => {
        if (total === 0) return '0%';
        return (value / total * 100).toFixed(2) + '%';
    };
    
    return [
        {
            name: '上映电影总数',
            value: totalMovies,
            percent: '100%',
            conversionRate: '-',
            itemStyle: { color: '#667eea' }
        },
        {
            name: '获得评分电影',
            value: withRatings.length,
            percent: formatPercent(withRatings.length, totalMovies),
            conversionRate: '100%',
            itemStyle: { color: '#7c4dff' }
        },
        {
            name: '中等口碑电影',
            value: mediumRating.length,
            percent: formatPercent(mediumRating.length, totalMovies),
            conversionRate: formatPercent(mediumRating.length, withRatings.length),
            itemStyle: { color: '#e040fb' }
        },
        {
            name: '高口碑电影',
            value: highRating.length,
            percent: formatPercent(highRating.length, totalMovies),
            conversionRate: formatPercent(highRating.length, mediumRating.length),
            itemStyle: { color: '#ff4081' }
        },
        {
            name: '经典佳作',
            value: classics.length,
            percent: formatPercent(classics.length, totalMovies),
            conversionRate: formatPercent(classics.length, highRating.length),
            itemStyle: { color: '#f50057' }
        }
    ];
}

function getEmptyFunnelData() {
    return [
        { name: '上映电影总数', value: 0, percent: '0%', conversionRate: '-', itemStyle: { color: '#667eea' } },
        { name: '获得评分电影', value: 0, percent: '0%', conversionRate: '-', itemStyle: { color: '#7c4dff' } },
        { name: '中等口碑电影', value: 0, percent: '0%', conversionRate: '-', itemStyle: { color: '#e040fb' } },
        { name: '高口碑电影', value: 0, percent: '0%', conversionRate: '-', itemStyle: { color: '#ff4081' } },
        { name: '经典佳作', value: 0, percent: '0%', conversionRate: '-', itemStyle: { color: '#f50057' } }
    ];
}

/**
 * 计算类型分布数据
 */
function calculateGenreData(movies) {
    const genreCount = {};
    const genreRatingSum = {};
    const genreRatingCount = {};
    
    movies.forEach(movie => {
        movie.genres.forEach(genre => {
            genreCount[genre] = (genreCount[genre] || 0) + 1;
            if (movie.rating > 0) {
                genreRatingSum[genre] = (genreRatingSum[genre] || 0) + movie.rating;
                genreRatingCount[genre] = (genreRatingCount[genre] || 0) + 1;
            }
        });
    });
    
    return Object.keys(genreCount)
        .map(genre => ({
            name: genre,
            count: genreCount[genre],
            avgRating: genreRatingCount[genre] > 0 
                ? (genreRatingSum[genre] / genreRatingCount[genre]).toFixed(1) 
                : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15);
}

/**
 * 计算年份趋势数据
 */
function calculateTrendData(movies) {
    const yearData = {};
    
    movies.forEach(movie => {
        const year = movie.year;
        if (!yearData[year]) {
            yearData[year] = { count: 0, ratingSum: 0, ratingCount: 0 };
        }
        yearData[year].count++;
        if (movie.rating > 0) {
            yearData[year].ratingSum += movie.rating;
            yearData[year].ratingCount++;
        }
    });
    
    return Object.keys(yearData)
        .map(year => ({
            year: parseInt(year),
            count: yearData[year].count,
            avgRating: yearData[year].ratingCount > 0 
                ? (yearData[year].ratingSum / yearData[year].ratingCount).toFixed(1) 
                : 0
        }))
        .sort((a, b) => a.year - b.year);
}

/**
 * 计算散点图数据
 */
function calculateScatterData(movies, limit) {
    const withRatings = movies.filter(m => m.rating > 0 && m.votes > 0);
    
    if (withRatings.length <= limit) {
        return withRatings.map(m => ({
            id: m.id,
            title: m.title,
            year: m.year,
            rating: m.rating,
            votes: m.votes,
            genres: m.genres.join(', ')
        }));
    }
    
    // 均匀采样
    const step = Math.floor(withRatings.length / limit);
    return withRatings
        .filter((_, index) => index % step === 0)
        .slice(0, limit)
        .map(m => ({
            id: m.id,
            title: m.title,
            year: m.year,
            rating: m.rating,
            votes: m.votes,
            genres: m.genres.join(', ')
        }));
}

/**
 * 渲染漏斗图
 */
function renderFunnelChart(funnelData, filters) {
    const genreText = filters.genre ? filters.genre : '全部类型';
    
    const option = {
        title: {
            text: '转化漏斗分析',
            subtext: `${filters.yearStart}-${filters.yearEnd}年 | ${genreText}`,
            left: 'center',
            top: 10,
            textStyle: { fontSize: 18, fontWeight: 'bold', color: '#1a1a2e' },
            subtextStyle: { fontSize: 12, color: '#6c757d' }
        },
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                const d = params.data;
                return `<b>${d.name}</b><br/>
                        数量：${d.value.toLocaleString()} 部<br/>
                        占比：${d.percent}<br/>
                        转化率：${d.conversionRate}`;
            }
        },
        series: [{
            type: 'funnel',
            left: '15%',
            top: 60,
            bottom: 30,
            width: '70%',
            min: 0,
            max: funnelData[0] ? funnelData[0].value : 100,
            minSize: '5%',
            maxSize: '100%',
            sort: 'descending',
            gap: 4,
            label: {
                show: true,
                position: 'inside',
                formatter: '{b}\n{c}',
                fontSize: 12,
                fontWeight: 'bold',
                color: '#fff'
            },
            itemStyle: {
                borderColor: '#fff',
                borderWidth: 2
            },
            emphasis: {
                label: { fontSize: 14 }
            },
            data: funnelData
        }]
    };
    
    funnelChart.setOption(option, true);
}

/**
 * 渲染类型分布图
 */
function renderGenreChart(genreData) {
    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'shadow' },
            formatter: function(params) {
                const data = params[0];
                return `<b>${data.name}</b><br/>
                        电影数量：${data.value.toLocaleString()}<br/>
                        平均评分：${genreData[data.dataIndex].avgRating}`;
            }
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '3%',
            top: '15%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            axisLabel: {
                formatter: function(value) {
                    return value >= 10000 ? (value / 10000) + '万' : value;
                }
            }
        },
        yAxis: {
            type: 'category',
            data: genreData.map(g => getGenreChineseName(g.name)).reverse(),
            axisLabel: { fontSize: 11 }
        },
        series: [{
            type: 'bar',
            data: genreData.map(g => g.count).reverse(),
            itemStyle: {
                color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                    { offset: 0, color: '#667eea' },
                    { offset: 1, color: '#764ba2' }
                ]),
                borderRadius: [0, 4, 4, 0]
            },
            label: {
                show: true,
                position: 'right',
                formatter: '{c}',
                fontSize: 10
            }
        }]
    };
    
    genreChart.setOption(option, true);
}

/**
 * 渲染年份趋势图
 */
function renderTrendChart(trendData) {
    const years = trendData.map(t => t.year);
    const counts = trendData.map(t => t.count);
    const ratings = trendData.map(t => parseFloat(t.avgRating) || 0);
    
    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const year = params[0].name;
                let html = `<b>${year}年</b><br/>`;
                params.forEach(p => {
                    if (p.seriesName === '电影数量') {
                        html += `${p.seriesName}：${p.value.toLocaleString()} 部<br/>`;
                    } else {
                        html += `${p.seriesName}：${p.value}<br/>`;
                    }
                });
                return html;
            }
        },
        legend: {
            data: ['电影数量', '平均评分'],
            bottom: 0
        },
        grid: {
            left: '3%',
            right: '4%',
            bottom: '15%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'category',
            data: years,
            axisLabel: {
                rotate: 45,
                fontSize: 10,
                interval: Math.floor(years.length / 15)
            }
        },
        yAxis: [
            {
                type: 'value',
                name: '数量',
                position: 'left',
                axisLabel: {
                    formatter: function(value) {
                        return value >= 10000 ? (value / 10000) + '万' : value;
                    }
                }
            },
            {
                type: 'value',
                name: '评分',
                position: 'right',
                min: 0,
                max: 10,
                axisLabel: { formatter: '{value}' }
            }
        ],
        series: [
            {
                name: '电影数量',
                type: 'line',
                data: counts,
                smooth: true,
                symbol: 'none',
                lineStyle: { color: '#667eea', width: 2 },
                areaStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(102, 126, 234, 0.3)' },
                        { offset: 1, color: 'rgba(102, 126, 234, 0.05)' }
                    ])
                },
                itemStyle: { color: '#667eea' }
            },
            {
                name: '平均评分',
                type: 'line',
                yAxisIndex: 1,
                data: ratings,
                smooth: true,
                symbol: 'none',
                lineStyle: { color: '#f50057', width: 2 },
                itemStyle: { color: '#f50057' }
            }
        ]
    };
    
    trendChart.setOption(option, true);
}

/**
 * 渲染散点图
 */
function renderScatterChart(scatterData) {
    const option = {
        tooltip: {
            trigger: 'item',
            formatter: function(params) {
                const d = params.data;
                return `<b>${d[3]}</b><br/>
                        年份：${d[4]}<br/>
                        类型：${d[5]}<br/>
                        评分：${d[0]}<br/>
                        投票数：${d[1].toLocaleString()}`;
            }
        },
        grid: {
            left: '4%',
            right: '8%',
            bottom: '12%',
            top: '10%',
            containLabel: true
        },
        xAxis: {
            type: 'value',
            name: '评分',
            min: 0,
            max: 10,
            nameLocation: 'end',
            nameTextStyle: { fontSize: 13, padding: [0, 0, 0, 5] }
        },
        yAxis: {
            type: 'log',
            name: '投票数 (对数)',
            nameTextStyle: { fontSize: 12 },
            axisLabel: {
                formatter: function(value) {
                    if (value >= 1000000) return (value / 1000000) + 'M';
                    if (value >= 1000) return (value / 1000) + 'K';
                    return value;
                }
            }
        },
        series: [{
            type: 'scatter',
            symbolSize: 6,
            data: scatterData.map(m => [
                m.rating, 
                Math.max(1, m.votes), 
                m.id, 
                m.title, 
                m.year, 
                m.genres
            ]),
            itemStyle: {
                color: function(params) {
                    const rating = params.data[0];
                    if (rating >= 8) return '#4caf50';
                    if (rating >= 6) return '#ff9800';
                    return '#f44336';
                },
                opacity: 0.6
            },
            emphasis: {
                itemStyle: { opacity: 1, shadowBlur: 10, shadowColor: 'rgba(0,0,0,0.3)' }
            }
        }]
    };
    
    scatterChart.setOption(option, true);
}

/**
 * 更新转化率表格
 */
function updateConversionTable(funnelData) {
    const tbody = document.getElementById('conversionBody');
    tbody.innerHTML = '';
    
    const levelKeys = ['all', 'rated', 'medium', 'high', 'classic'];
    
    funnelData.forEach((level, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${level.itemStyle.color};margin-right:8px;"></span>
                ${level.name}
            </td>
            <td>${level.value.toLocaleString()}</td>
            <td>${level.percent}</td>
            <td>${level.conversionRate}</td>
            <td><button class="btn-link" onclick="showLevelMovies('${levelKeys[index]}', '${level.name}')">查看电影</button></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * 显示指定层级的电影
 */
function showLevelMovies(level, levelName) {
    currentLevel = level;
    currentPage = 1;
    document.getElementById('movieTableTitle').textContent = `电影详情列表 - ${levelName}`;
    updateMovieTable();
    document.getElementById('movieTable').scrollIntoView({ behavior: 'smooth' });
}

/**
 * 更新电影详情表格
 */
function updateMovieTable() {
    const filters = getFilters();
    let filtered = filterMovies(allMovies, filters);
    
    // 根据层级筛选
    const minVotes = filters.minVotes;
    if (currentLevel === 'rated') {
        filtered = filtered.filter(m => m.votes >= minVotes);
    } else if (currentLevel === 'medium') {
        filtered = filtered.filter(m => m.votes >= minVotes && m.rating >= 6.0);
    } else if (currentLevel === 'high') {
        filtered = filtered.filter(m => m.votes >= minVotes && m.rating >= 7.5);
    } else if (currentLevel === 'classic') {
        filtered = filtered.filter(m => m.votes >= 10000 && m.rating >= 8.5);
    }
    
    // 排序
    const sortBy = document.getElementById('sortBy').value;
    const sortOrder = document.getElementById('sortOrder').value === 'desc' ? -1 : 1;
    
    filtered.sort((a, b) => {
        if (sortBy === 'rating') return (a.rating - b.rating) * sortOrder;
        if (sortBy === 'votes') return (a.votes - b.votes) * sortOrder;
        if (sortBy === 'year') return (a.year - b.year) * sortOrder;
        return 0;
    });
    
    // 分页
    const total = filtered.length;
    const totalPages = Math.ceil(total / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE;
    const end = start + PAGE_SIZE;
    const items = filtered.slice(start, end);
    
    // 渲染表格
    renderMovieTable(items);
    
    // 更新分页信息
    document.getElementById('pageInfo').textContent = 
        `第 ${currentPage} / ${totalPages} 页 (共 ${total.toLocaleString()} 部)`;
    document.getElementById('btnPrevPage').disabled = currentPage <= 1;
    document.getElementById('btnNextPage').disabled = currentPage >= totalPages;
}

/**
 * 渲染电影详情表格
 */
function renderMovieTable(movies) {
    const tbody = document.getElementById('movieBody');
    tbody.innerHTML = '';
    
    movies.forEach(movie => {
        const row = document.createElement('tr');
        
        // 评分颜色
        let ratingClass = 'rating-low';
        if (movie.rating >= 8) ratingClass = 'rating-high';
        else if (movie.rating >= 6) ratingClass = 'rating-medium';
        
        // 类型标签
        const genreTags = movie.genres.slice(0, 3).map(g => 
            `<span class="genre-tag">${g}</span>`
        ).join('');
        
        row.innerHTML = `
            <td><a href="https://www.imdb.com/title/${movie.id}" target="_blank" class="btn-link">${movie.title}</a></td>
            <td><span class="year-badge">${movie.year}</span></td>
            <td>${genreTags}</td>
            <td><span class="${ratingClass}">${movie.rating.toFixed(1)}</span></td>
            <td><span class="votes">${movie.votes.toLocaleString()}</span></td>
        `;
        tbody.appendChild(row);
    });
}

/**
 * 绑定事件
 */
function bindEvents() {
    // 筛选按钮
    document.getElementById('btnFilter').addEventListener('click', updateAllCharts);
    
    // 重置按钮
    document.getElementById('btnReset').addEventListener('click', () => {
        document.getElementById('yearStart').value = 2000;
        document.getElementById('yearEnd').value = 2024;
        document.getElementById('genreSelect').value = '';
        document.getElementById('minVotes').value = 100;
        updateAllCharts();
    });
    
    // 排序变化
    document.getElementById('sortBy').addEventListener('change', () => {
        currentPage = 1;
        updateMovieTable();
    });
    
    document.getElementById('sortOrder').addEventListener('change', () => {
        currentPage = 1;
        updateMovieTable();
    });
    
    // 分页按钮
    document.getElementById('btnPrevPage').addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            updateMovieTable();
        }
    });
    
    document.getElementById('btnNextPage').addEventListener('click', () => {
        currentPage++;
        updateMovieTable();
    });
    
    // 回车键触发筛选
    document.querySelectorAll('input').forEach(el => {
        el.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                updateAllCharts();
            }
        });
    });
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', init);
