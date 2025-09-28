function app() {
    return {
        // 状态变量
        isLoggedIn: false,
        showRegister: false,
        loading: false,
        user: {},
        currentView: 'dashboard',
        
        // 飞行状态
        isFlying: false,
        flightStartTime: null,
        flightDuration: 0,
        flightTimer: null,
        
        // 表单数据
        loginForm: {
            username: '',
            password: ''
        },
        registerForm: {
            username: '',
            password: '',
            inviteCode: ''
        },
        flightForm: {
            flightNumber: '',
            fuelConsumption: 0,
            forcedLanding: false,
            airCrash: false,
            flightAttendant: '',
            copilot: '',
            hangar: '',
            remarks: ''
        },
        
        // 统计数据
        stats: {},
        
        // UI状态
        showFlightModal: false,
        showDayModal: false,
        showLogModal: false,
        errorMessage: '',
        notification: {
            show: false,
            message: ''
        },
        
        // 日历相关
        currentCalendarDate: new Date(),
        calendarDays: [],
        selectedDay: null,
        dayLogs: [],
        
        // 表格相关
        flightLogs: [],
        currentPage: 1,
        hasMorePages: false,
        selectedLog: null,
        
        // 数据管理
        selectedFile: null,
        
        // 排行榜
        topDurationLogs: [],
        topFuelLogs: [],
        monthlyStats: {},
        maxDurationLeaderboard: [],
        
        // 图表实例
        dailyChart: null,
        
        // 主题相关
        currentTheme: 'light',
        
        // 初始化
        async init() {
            // 初始化主题
            this.initTheme();
            
            // 初始化登录表单
            this.initLoginForm();
            
            await this.checkAuthStatus();
            if (this.isLoggedIn) {
                console.log('用户已登录，开始加载初始数据');
                // 加载所有视图的数据
                await this.loadAllViewsData();
            }
        },
        
        // 初始化登录表单
        initLoginForm() {
            // 检查是否是首次访问
            const hasVisited = localStorage.getItem('flightlog-has-visited');
            // 获取上次登录的用户名
            const lastUsername = localStorage.getItem('flightlog-last-username');
            
            if (!hasVisited) {
                // 首次访问，使用demo账号
                this.loginForm.username = 'demo';
                this.loginForm.password = 'demodemo';
                // 标记已访问
                localStorage.setItem('flightlog-has-visited', 'true');
            } else if (lastUsername) {
                // 非首次访问且有上次登录记录，使用上次的用户名
                this.loginForm.username = lastUsername;
                this.loginForm.password = ''; // 密码不留存
            }
            // 否则保持空值
        },
        
        // 初始化主题
        initTheme() {
            const savedTheme = localStorage.getItem('flightlog-theme') || 'light';
            this.currentTheme = savedTheme;
            this.applyTheme(savedTheme);
        },
        
        // 切换主题
        toggleTheme() {
            const newTheme = this.currentTheme === 'light' ? 'dark' : 'light';
            this.currentTheme = newTheme;
            this.applyTheme(newTheme);
            localStorage.setItem('flightlog-theme', newTheme);
            
            // 如果有图表，重新绘制以适应主题
            if (this.dailyChart && this.currentView === 'dashboard') {
                setTimeout(() => {
                    this.loadDailyChart();
                }, 100);
            }
        },
        
        // 应用主题
        applyTheme(theme) {
            if (theme === 'dark') {
                document.documentElement.setAttribute('data-theme', 'dark');
            } else {
                document.documentElement.removeAttribute('data-theme');
            }
        },
        
        // 加载所有视图的数据
        async loadAllViewsData() {
            try {
                console.log('开始加载所有视图数据...');
                
                // 加载仪表板数据
                await this.loadDashboardData();
                
                // 初始化日历
                this.initCalendar();
                await this.loadCalendarData();
                
                // 加载飞行记录
                await this.loadFlightLogs();
                
                // 加载排行榜数据
                await this.loadLeaderboard();
                
                console.log('所有视图数据加载完成');
            } catch (error) {
                console.error('加载视图数据失败:', error);
            }
        },
        
        // 切换视图时的处理
        async switchView(viewName) {
            this.currentView = viewName;
            
            // 根据不同视图加载对应数据
            switch(viewName) {
                case 'dashboard':
                    setTimeout(() => {
                        console.log('切换到dashboard，重新加载图表');
                        this.loadDailyChart();
                    }, 200);
                    break;
                    
                case 'calendar':
                    console.log('切换到日历视图，加载日历数据');
                    // 先生成日历日期，再加载数据
                    this.generateCalendarDays();
                    await this.loadCalendarData();
                    break;
                    
                case 'table':
                    console.log('切换到表格视图，加载飞行记录');
                    await this.loadFlightLogs();
                    break;
                    
                case 'leaderboard':
                    console.log('切换到排行榜，加载排行榜数据');
                    await this.loadLeaderboard();
                    break;
                    
                case 'data':
                    console.log('切换到数据管理');
                    // 数据管理页面通常不需要预加载数据
                    break;
            }
        },
        
        // 检查登录状态
        async checkAuthStatus() {
            try {
                const response = await fetch('/api/auth/status');
                const data = await response.json();
                
                if (data.isLoggedIn) {
                    this.isLoggedIn = true;
                    this.user = data.user;
                }
            } catch (error) {
                console.error('检查登录状态失败:', error);
            }
        },
        
        // 登录
        async login() {
            this.loading = true;
            this.errorMessage = '';
            
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.loginForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.isLoggedIn = true;
                    this.user = data.user;
                    // 保存用户名到 localStorage
                    localStorage.setItem('flightlog-last-username', this.loginForm.username);
                    this.showNotification('登录成功！');
                    await this.loadAllViewsData();
                } else {
                    this.errorMessage = data.error;
                }
            } catch (error) {
                this.errorMessage = '登录失败，请检查网络连接';
                console.error('登录错误:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // 注册
        async register() {
            this.loading = true;
            this.errorMessage = '';
            
            try {
                const response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(this.registerForm)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.isLoggedIn = true;
                    this.user = data.user;
                    // 保存用户名到 localStorage
                    localStorage.setItem('flightlog-last-username', this.registerForm.username);
                    this.showNotification('注册成功！');
                    await this.loadAllViewsData();
                } else {
                    this.errorMessage = data.error;
                }
            } catch (error) {
                this.errorMessage = '注册失败，请检查网络连接';
                console.error('注册错误:', error);
            } finally {
                this.loading = false;
            }
        },
        
        // 登出
        async logout() {
            try {
                await fetch('/api/auth/logout', { method: 'POST' });
                this.isLoggedIn = false;
                this.user = {};
                this.currentView = 'dashboard';
                this.showNotification('已成功登出');
                
                // 清理飞行状态
                if (this.flightTimer) {
                    clearInterval(this.flightTimer);
                    this.flightTimer = null;
                }
                this.isFlying = false;
                
            } catch (error) {
                console.error('登出错误:', error);
            }
        },
        
        // 起飞
        takeoff() {
            this.isFlying = true;
            this.flightStartTime = Date.now();
            this.flightDuration = 0;
            
            // 启动计时器
            this.flightTimer = setInterval(() => {
                this.flightDuration = Math.floor((Date.now() - this.flightStartTime) / 1000);
            }, 1000);
            
            this.showNotification('起飞成功！祝您飞行愉快 ✈️');
        },
        
        // 降落
        async landing() {
            if (!this.isFlying) return;
            
            // 停止计时器
            if (this.flightTimer) {
                clearInterval(this.flightTimer);
                this.flightTimer = null;
            }
            
            this.loading = true;
            
            try {
                // 先保存基础飞行记录
                const basicFlightData = {
                    startTime: this.flightStartTime,
                    endTime: Date.now(),
                    flightNumber: '',
                    fuelConsumption: 0,
                    forcedLanding: false,
                    airCrash: false,
                    flightAttendant: '',
                    copilot: '',
                    hangar: '',
                    cabinPressure: '',
                    remarks: ''
                };
                
                const response = await fetch('/api/flights', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(basicFlightData)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    // 保存成功后，跳转到表格视图
                    this.isFlying = false;
                    this.flightStartTime = null;
                    this.flightDuration = 0;
                    
                    // 刷新数据
                    await this.loadStats();
                    await this.loadDailyChart();
                    await this.loadFlightLogs();
                    await this.loadLeaderboard();
                    this.loadCalendarData();
                    
                    // 切换到表格视图
                    this.currentView = 'table';
                    
                    this.showNotification('飞行记录已保存！请在表格中找到记录并更新详情');
                } else {
                    alert('保存失败: ' + data.error);
                    // 如果保存失败，重置状态
                    this.isFlying = false;
                }
            } catch (error) {
                alert('保存失败，请检查网络连接');
                console.error('保存基础飞行记录错误:', error);
                this.isFlying = false;
            } finally {
                this.loading = false;
            }
        },
        
        // 保存飞行记录（用于从表格视图更新详情）
        async saveFlightLog() {
            this.loading = true;
            
            try {
                if (this.selectedLog && this.selectedLog.id) {
                    console.log('准备更新记录:', this.selectedLog.id);
                    console.log('表单数据:', this.flightForm);
                    
                    // 更新现有记录的详细信息
                    const response = await fetch(`/api/flights/${this.selectedLog.id}`, {
                        method: 'PUT',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(this.flightForm)
                    });
                    
                    console.log('响应状态:', response.status);
                    const data = await response.json();
                    console.log('响应数据:', data);
                    
                    if (response.ok) {
                        this.showNotification('飞行记录详情更新成功！');
                        this.showFlightModal = false;
                        this.selectedLog = null;
                        
                        // 刷新统计数据
                        await this.loadStats();
                        await this.loadDailyChart();
                        await this.loadFlightLogs();
                        await this.loadLeaderboard();
                        this.loadCalendarData();
                    } else {
                        alert('更新失败: ' + data.error);
                    }
                } else {
                    console.error('没有选中的记录:', this.selectedLog);
                    alert('未找到要更新的记录');
                }
            } catch (error) {
                console.error('保存飞行记录错误:', error);
                alert('保存失败，请检查网络连接');
            } finally {
                this.loading = false;
            }
        },
        
        // 取消飞行记录
        cancelFlightLog() {
            this.showFlightModal = false;
            this.selectedLog = null;
            this.showLogModal = false;
        },
        
        // 重置飞行表单
        resetFlightForm() {
            this.flightForm = {
                flightNumber: '',
                fuelConsumption: 0,
                forcedLanding: false,
                airCrash: false,
                flightAttendant: '',
                copilot: '',
                hangar: '',
                cabinPressure: '',
                remarks: ''
            };
        },
        
        // 加载仪表板数据
        async loadDashboardData() {
            console.log('开始加载仪表板数据...');
            await this.loadStats();
            // 等待DOM完全渲染后再加载图表
            setTimeout(() => {
                console.log('准备加载图表，当前视图:', this.currentView);
                this.loadDailyChart();
            }, 100);
        },
        
        // 加载统计数据
        async loadStats() {
            try {
                const response = await fetch('/api/flights/stats/overview');
                const data = await response.json();
                
                if (response.ok) {
                    this.stats = data.stats;
                }
            } catch (error) {
                console.error('加载统计数据失败:', error);
            }
        },
        
        // 加载并绘制每日图表
        async loadDailyChart() {
            try {
                this.loading = true;
                console.log('开始加载每日图表数据...');
                
                // 检查元素是否存在且可见
                const chartElement = document.getElementById('dailyChart');
                console.log('图表元素检查结果:', chartElement);
                
                if (!chartElement) {
                    console.error('图表元素不存在，跳过图表加载');
                    this.loading = false;
                    return;
                }
                
                // 检查当前视图是否为dashboard
                if (this.currentView !== 'dashboard') {
                    console.log('当前不在dashboard视图，跳过图表加载');
                    this.loading = false;
                    return;
                }
                
                const response = await fetch('/api/flights/stats/daily?days=30');
                console.log('API响应状态:', response.status);
                
                const data = await response.json();
                console.log('每日图表数据响应:', data);
                
                if (response.ok && data.dailyCounts) {
                    console.log('开始绘制图表，数据:', data.dailyCounts);
                    this.drawDailyChart(data.dailyCounts);
                } else {
                    console.error('获取每日图表数据失败:', response.status, data);
                    this.loading = false;
                }
            } catch (error) {
                console.error('加载每日统计失败:', error);
                console.error('错误详情:', error.stack);
                this.loading = false;
            }
        },
        
        // 绘制每日飞行图表
        drawDailyChart(dailyData) {
            console.log('开始绘制图表，原始数据:', dailyData);
            
            // 检查Chart.js是否加载
            console.log('Chart.js 检查:', typeof Chart);
            if (typeof Chart === 'undefined') {
                console.error('Chart.js 未加载');
                this.loading = false;
                return;
            }
            
            const chartElement = document.getElementById('dailyChart');
            console.log('图表元素查找结果:', chartElement);
            
            if (!chartElement || !chartElement.getContext) {
                console.error('找不到有效的 dailyChart 元素');
                this.loading = false;
                return;
            }
            
            // 检查元素是否正确附加到DOM并且可见
            if (!document.body.contains(chartElement)) {
                console.error('图表元素未正确附加到DOM');
                this.loading = false;
                return;
            }
            
            // 等待元素完全渲染
            setTimeout(() => {
                try {
                    // 再次验证元素有效性
                    if (!chartElement.offsetParent && chartElement.style.display !== 'block') {
                        console.error('图表元素不可见或未渲染');
                        this.loading = false;
                        return;
                    }
                    
                    console.log('Chart 元素找到:', chartElement);
                    console.log('元素尺寸:', chartElement.offsetWidth, 'x', chartElement.offsetHeight);
                    
                    // 确保canvas有正确的尺寸
                    const containerWidth = chartElement.parentElement.offsetWidth || 800;
                    const containerHeight = chartElement.parentElement.offsetHeight || 320;
                    
                    chartElement.width = containerWidth;
                    chartElement.height = containerHeight;
                    chartElement.style.width = containerWidth + 'px';
                    chartElement.style.height = containerHeight + 'px';
                    
                    const ctx = chartElement.getContext('2d');
                    
                    // 销毁现有图表
                    if (this.dailyChart) {
                        console.log('销毁现有图表');
                        this.dailyChart.destroy();
                        this.dailyChart = null;
                    }
                    
                    const labels = dailyData.map(item => {
                        const date = new Date(item.date);
                        return `${date.getMonth() + 1}/${date.getDate()}`;
                    });
                    
                    const data = dailyData.map(item => item.count);
                    
                    console.log('图表标签:', labels);
                    console.log('图表数据:', data);
                    
                    // 创建图表配置
                    const isDark = this.currentTheme === 'dark';
                    const config = {
                        type: 'line',
                        data: {
                            labels: labels,
                            datasets: [{
                                label: '每日飞行次数',
                                data: data,
                                borderColor: isDark ? '#ffd65c' : 'rgb(59, 130, 246)',
                                backgroundColor: isDark ? 'rgba(255, 214, 92, 0.1)' : 'rgba(59, 130, 246, 0.1)',
                                borderWidth: 2,
                                fill: true,
                                tension: 0.4,
                                pointRadius: 3,
                                pointHoverRadius: 5,
                                pointBackgroundColor: isDark ? '#ffea00' : 'rgb(59, 130, 246)',
                                pointBorderColor: isDark ? '#ffd65c' : 'rgb(59, 130, 246)'
                            }]
                        },
                        options: {
                            responsive: false,
                            maintainAspectRatio: false,
                            animation: {
                                duration: 0
                            },
                            interaction: {
                                intersect: false,
                                mode: 'index'
                            },
                            scales: {
                                y: {
                                    beginAtZero: true,
                                    ticks: {
                                        stepSize: 1,
                                        color: isDark ? '#eeeeee' : '#6b7280'
                                    },
                                    grid: {
                                        color: isDark ? '#333333' : '#e5e7eb'
                                    }
                                },
                                x: {
                                    display: true,
                                    ticks: {
                                        color: isDark ? '#eeeeee' : '#6b7280'
                                    },
                                    grid: {
                                        color: isDark ? '#333333' : '#e5e7eb'
                                    }
                                }
                            },
                            plugins: {
                                legend: {
                                    display: false
                                },
                                tooltip: {
                                    enabled: true,
                                    backgroundColor: isDark ? '#333333' : '#ffffff',
                                    titleColor: isDark ? '#eeeeee' : '#1f2937',
                                    bodyColor: isDark ? '#eeeeee' : '#1f2937',
                                    borderColor: isDark ? '#ffd65c' : '#e5e7eb',
                                    borderWidth: 1
                                }
                            }
                        }
                    };
                    
                    this.dailyChart = new Chart(ctx, config);
                    
                    console.log('图表创建完成:', this.dailyChart);
                    this.loading = false;
                    
                } catch (error) {
                    console.error('创建图表时出错:', error);
                    this.loading = false;
                    
                    // 显示错误信息
                    if (chartElement && chartElement.parentElement) {
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'absolute inset-0 flex items-center justify-center text-red-500 bg-red-50';
                        errorDiv.innerHTML = '<p>图表加载失败：' + error.message + '</p>';
                        chartElement.parentElement.appendChild(errorDiv);
                    }
                }
            }, 100); // 延迟100ms确保DOM完全渲染
        },
        
        // 格式化数字（四舍五入，不显示小数）
        formatNumber(number) {
            if (!number || isNaN(number)) return 0;
            return Math.round(number);
        },
        
        // 格式化持续时间
        formatDuration(totalSeconds) {
            if (!totalSeconds || totalSeconds < 0) return '0分0秒';
            
            const hours = Math.floor(totalSeconds / 3600);
            const minutes = Math.floor((totalSeconds % 3600) / 60);
            const seconds = totalSeconds % 60;
            
            if (hours > 0) {
                return `${hours}小时${minutes}分${seconds}秒`;
            } else if (minutes > 0) {
                return `${minutes}分${seconds}秒`;
            } else {
                return `${seconds}秒`;
            }
        },
        
        // 显示通知
        showNotification(message) {
            this.notification.message = message;
            this.notification.show = true;
            
            setTimeout(() => {
                this.notification.show = false;
            }, 3000);
        },
        
        // === 日历功能 ===
        
        // 初始化日历
        initCalendar() {
            this.generateCalendarDays();
            this.loadCalendarData();
        },
        
        // 生成日历日期
        generateCalendarDays() {
            const year = this.currentCalendarDate.getFullYear();
            const month = this.currentCalendarDate.getMonth();
            
            // 获取当月第一天和最后一天
            const firstDay = new Date(year, month, 1);
            const lastDay = new Date(year, month + 1, 0);
            
            // 获取当月第一天是星期几（0=周日，1=周一）
            let startDay = firstDay.getDay();
            startDay = startDay === 0 ? 7 : startDay; // 转换为周一开始
            
            const days = [];
            
            // 添加上个月的日期
            for (let i = startDay - 1; i > 0; i--) {
                const date = new Date(year, month, 1 - i);
                days.push({
                    date: date.getDate(),
                    dateStr: date.toISOString().split('T')[0],
                    fullDate: new Date(date),
                    isCurrentMonth: false,
                    flightCount: 0
                });
            }
            
            // 添加当月的日期
            for (let date = 1; date <= lastDay.getDate(); date++) {
                const fullDate = new Date(year, month, date);
                days.push({
                    date: date,
                    dateStr: fullDate.toISOString().split('T')[0],
                    fullDate: fullDate,
                    isCurrentMonth: true,
                    flightCount: 0
                });
            }
            
            // 添加下个月的日期，补齐为42天（6周）
            const remainingDays = 42 - days.length;
            for (let date = 1; date <= remainingDays; date++) {
                const fullDate = new Date(year, month + 1, date);
                days.push({
                    date: date,
                    dateStr: fullDate.toISOString().split('T')[0],
                    fullDate: fullDate,
                    isCurrentMonth: false,
                    flightCount: 0
                });
            }
            
            this.calendarDays = days;
        },
        
        // 加载日历数据
        async loadCalendarData() {
            try {
                console.log('开始加载日历数据...');
                const year = this.currentCalendarDate.getFullYear();
                const month = this.currentCalendarDate.getMonth() + 1;
                
                console.log('加载日历数据:', year, '年', month, '月');
                
                const response = await fetch(`/api/flights/calendar/${year}/${month}`);
                const data = await response.json();
                
                console.log('日历数据响应:', data);
                
                if (response.ok && data.calendarData) {
                    console.log('更新日历中的飞行次数, 日历天数:', this.calendarDays.length);
                    
                    // 更新日历中的飞行次数
                    data.calendarData.forEach(item => {
                        const day = this.calendarDays.find(d => d.dateStr === item.date);
                        if (day) {
                            day.flightCount = item.count;
                            day.logIds = item.logIds ? item.logIds.split(',').map(id => parseInt(id)) : [];
                            console.log('更新日期', item.date, '飞行次数:', item.count);
                        } else {
                            console.log('找不到日期:', item.date);
                        }
                    });
                    
                    console.log('日历数据加载完成');
                } else {
                    console.error('获取日历数据失败:', response.status, data);
                }
            } catch (error) {
                console.error('加载日历数据失败:', error);
            }
        },
        
        // 上个月
        previousMonth() {
            this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() - 1);
            this.generateCalendarDays();
            this.loadCalendarData();
        },
        
        // 下个月
        nextMonth() {
            this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + 1);
            this.generateCalendarDays();
            this.loadCalendarData();
        },
        
        // 获取月份显示
        getMonthYear() {
            const year = this.currentCalendarDate.getFullYear();
            const month = this.currentCalendarDate.getMonth() + 1;
            return `${year}年${month}月`;
        },
        
        // 显示日期详情
        async showDayDetails(day) {
            if (day.flightCount === 0) return;
            
            this.selectedDay = day;
            this.dayLogs = [];
            
            try {
                // 获取当日的飞行记录
                const response = await fetch('/api/flights');
                const data = await response.json();
                
                if (response.ok && data.logs) {
                    // 过滤出当日的记录
                    this.dayLogs = data.logs.filter(log => {
                        const logDate = new Date(log.startTime).toISOString().split('T')[0];
                        return logDate === day.dateStr;
                    });
                }
            } catch (error) {
                console.error('获取日期详情失败:', error);
            }
            
            this.showDayModal = true;
        },
        
        // === 表格功能 ===
        
        // 加载飞行记录列表
        async loadFlightLogs(page = 1) {
            try {
                console.log('开始加载飞行记录列表, 页码:', page);
                
                const response = await fetch(`/api/flights?page=${page}&limit=20`);
                const data = await response.json();
                
                console.log('飞行记录响应:', data);
                
                if (response.ok) {
                    this.flightLogs = data.logs;
                    this.currentPage = data.pagination.page;
                    this.hasMorePages = data.pagination.hasMore;
                    
                    console.log('加载了', data.logs.length, '条记录, 当前页:', this.currentPage, '是否有更多:', this.hasMorePages);
                } else {
                    console.error('获取飞行记录失败:', response.status, data);
                }
            } catch (error) {
                console.error('加载飞行记录失败:', error);
            }
        },
        
        // 上一页
        async loadPreviousPage() {
            if (this.currentPage > 1) {
                await this.loadFlightLogs(this.currentPage - 1);
            }
        },
        
        // 下一页
        async loadNextPage() {
            if (this.hasMorePages) {
                await this.loadFlightLogs(this.currentPage + 1);
            }
        },
        
        // 查看记录详情
        viewLogDetails(log) {
            this.selectedLog = log;
            this.showLogModal = true;
        },
        
        // 编辑记录详情
        editLogDetails(log) {
            this.selectedLog = log;
            console.log('编辑记录:', log);
            // 填充表单数据
            this.flightForm = {
                flightNumber: log.flightNumber || '',
                fuelConsumption: parseInt(log.fuelConsumption) || 0,
                forcedLanding: Boolean(log.forcedLanding),
                airCrash: Boolean(log.airCrash),
                flightAttendant: log.flightAttendant || '',
                copilot: log.copilot || '',
                hangar: log.hangar || '',
                cabinPressure: log.cabinPressure || '',
                remarks: log.remarks || ''
            };
            console.log('表单数据:', this.flightForm);
            this.showLogModal = false;
            this.showFlightModal = true;
        },
        
        // === 数据管理功能 ===
        
        // 导出 JSON
        async exportJSON() {
            try {
                const response = await fetch('/api/flights/export/json');
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'flight-logs.json';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    this.showNotification('数据导出成功');
                } else {
                    throw new Error('导出失败');
                }
            } catch (error) {
                console.error('导出 JSON 失败:', error);
                alert('导出失败，请稍后重试');
            }
        },
        
        // 导出 CSV
        async exportCSV() {
            try {
                const response = await fetch('/api/flights/export/csv');
                if (response.ok) {
                    const blob = await response.blob();
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'flight-logs.csv';
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                    this.showNotification('数据导出成功');
                } else {
                    throw new Error('导出失败');
                }
            } catch (error) {
                console.error('导出 CSV 失败:', error);
                alert('导出失败，请稍后重试');
            }
        },
        
        // 处理文件选择
        handleFileSelect(event) {
            this.selectedFile = event.target.files[0];
        },
        
        // 导入数据
        async importData() {
            if (!this.selectedFile) {
                alert('请选择要导入的文件');
                return;
            }
            
            if (!confirm('导入数据将会覆盖您现有的所有飞行记录，确定继续吗？')) {
                return;
            }
            
            this.loading = true;
            
            try {
                const formData = new FormData();
                formData.append('file', this.selectedFile);
                
                const response = await fetch('/api/flights/import', {
                    method: 'POST',
                    body: formData
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    this.showNotification(`数据导入成功，共导入 ${data.importedCount} 条记录`);
                    
                    // 刷新数据
                    await this.loadDashboardData();
                    await this.loadFlightLogs();
                    await this.loadLeaderboard();
                    this.loadCalendarData();
                    
                    // 重置文件选择
                    this.selectedFile = null;
                    event.target.value = '';
                } else {
                    alert('导入失败: ' + data.error);
                }
            } catch (error) {
                console.error('导入数据失败:', error);
                alert('导入失败，请检查文件格式和网络连接');
            } finally {
                this.loading = false;
            }
        },
        
        // === 工具函数 ===
        
        // 格式化日期时间
        formatDateTime(timestamp) {
            return new Date(timestamp).toLocaleString('zh-CN');
        },
        
        // 格式化时间
        formatTime(timestamp) {
            return new Date(timestamp).toLocaleTimeString('zh-CN', {
                hour: '2-digit',
                minute: '2-digit'
            });
        },
        
        // === 排行榜功能 ===
        
        // 加载排行榜数据
        async loadLeaderboard() {
            try {
                console.log('开始加载排行榜数据...');
                
                // 获取所有记录用于排行
                const response = await fetch('/api/flights/all');
                const data = await response.json();
                
                console.log('排行榜数据响应:', data);
                
                if (response.ok && data.logs) {
                    console.log('处理排行榜数据，记录数量:', data.logs.length);
                    
                    // 按持续时间排序（降序）
                    this.topDurationLogs = [...data.logs]
                        .sort((a, b) => b.duration - a.duration)
                        .slice(0, 10);
                    
                    console.log('单次时长排行榜:', this.topDurationLogs);
                    
                    // 按燃料消耗排序（降序）
                    this.topFuelLogs = [...data.logs]
                        .filter(log => log.fuelConsumption > 0)
                        .sort((a, b) => b.fuelConsumption - a.fuelConsumption)
                        .slice(0, 10);
                    
                    console.log('燃料消耗排行榜:', this.topFuelLogs);
                    
                    // 计算月度统计
                    this.calculateMonthlyStats(data.logs);
                    
                    console.log('月度统计:', this.monthlyStats);
                } else {
                    console.error('获取排行榜数据失败:', response.status, data);
                }
                
                // 加载PK榜数据
                await this.loadMaxDurationLeaderboard();
                
                console.log('排行榜数据加载完成');
            } catch (error) {
                console.error('加载排行榜数据失败:', error);
            }
        },
        
        // 加载单次飞行时长PK榜
        async loadMaxDurationLeaderboard() {
            try {
                const response = await fetch('/api/flights/leaderboard/max-duration?limit=10');
                const data = await response.json();
                
                if (response.ok && data.leaderboard) {
                    this.maxDurationLeaderboard = data.leaderboard;
                }
            } catch (error) {
                console.error('加载PK榜数据失败:', error);
            }
        },
        
        // 计算月度统计
        calculateMonthlyStats(logs) {
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const monthlyLogs = logs.filter(log => {
                const logDate = new Date(log.startTime);
                return logDate.getMonth() === currentMonth && logDate.getFullYear() === currentYear;
            });
            
            if (monthlyLogs.length === 0) {
                this.monthlyStats = {
                    totalDuration: 0,
                    avgDuration: 0,
                    maxDuration: 0
                };
                return;
            }
            
            const totalDuration = monthlyLogs.reduce((sum, log) => sum + log.duration, 0);
            const avgDuration = totalDuration / monthlyLogs.length;
            const maxDuration = Math.max(...monthlyLogs.map(log => log.duration));
            
            this.monthlyStats = {
                totalDuration,
                avgDuration: Math.round(avgDuration),
                maxDuration
            };
        }
    };
}