class ProfessionalTrainer {
    constructor() {
        this.subjects = [
            { id: 1, name: "Основи програмування", icon: "fa-laptop-code", description: "Введення в програмування та базові концепції", testFile: "programming.js" },
            { id: 2, name: "Алгоритми та структури даних", icon: "fa-diagram-project", description: "Структури даних та алгоритми їх обробки", testFile: "algorithms.js" },
            { id: 3, name: "Веб розробка", icon: "fa-globe", description: "Створення сучасних веб-додатків", testFile: "web.js" },
            { id: 4, name: "Основи баз даних", icon: "fa-database", description: "Проектування та робота з базами даних", testFile: "databases.js" },
           
        ];

        this.currentSubject = null;
        this.currentTest = null;
        this.userProgress = {};
        this.timerInterval = null;

        this.init();
    }

    init() {
        this.loadTemplates();
        this.setupRouter();
        this.setupTheme();
        this.setupEventListeners();
        this.animateSplash();
        this.loadProgress();
    }

    loadTemplates() {
        this.pages = {
            home: document.getElementById('home-page').content,
            subjects: document.getElementById('subjects-page').content,
            progress: document.getElementById('progress-page').content,
            test: document.getElementById('test-page').content
        };
    }

    renderSubjectCards() {
        const grid = document.querySelector('.subjects-grid');
        if (!grid) return;

        grid.innerHTML = '';

        this.subjects.forEach(subject => {
            const progress = this.userProgress[subject.id] || 0;
            const card = document.createElement('div');
            card.className = 'subject-card';
            card.innerHTML = `
                <div class="subject-icon">
                    <i class="fas ${subject.icon}"></i>
                </div>
                <h3>${subject.name}</h3>
                <p>${subject.description}</p>
                <div class="progress-bar">
                    <div class="progress" style="width: ${progress}%"></div>
                </div>
                <button class="start-btn" data-subject="${subject.id}">
                    ${progress > 0 ? 'Продовжити' : 'Почати'} тестування
                </button>
            `;
            grid.appendChild(card);
        });
    }

    setupRouter() {
        document.addEventListener('click', (e) => {
            const routeEl = e.target.closest('[data-route]');
            if (routeEl) {
                e.preventDefault();
                const route = routeEl.dataset.route;
                this.navigate(route);
            }

            const subjectBtn = e.target.closest('[data-subject]');
            if (subjectBtn) {
                const subjectId = parseInt(subjectBtn.dataset.subject);
                this.startTest(subjectId);
            }
        });

        window.addEventListener('popstate', () => this.resolveRoute());
    }

    navigate(page, state = {}) {
        history.pushState(state, '', `#${page}`);
        this.resolveRoute();
    }

    resolveRoute() {
        const hash = window.location.hash.substring(1) || 'home';
        const routerView = document.getElementById('router-view');
        routerView.innerHTML = '';

        if (this.pages[hash]) {
            const content = document.importNode(this.pages[hash], true);
            routerView.appendChild(content);

            if (hash === 'subjects') {
                this.renderSubjectCards();
            }

            if (hash === 'progress') {
                this.renderProgress();
            }
        } else {
            routerView.innerHTML = '<h2>Сторінку не знайдено</h2>';
        }
    }

    async startTest(subjectId) {
        this.currentSubject = this.subjects.find(s => s.id === subjectId);
        if (!this.currentSubject) return;

        try {
            const module = await import(`./tests/${this.currentSubject.testFile}`);
            this.currentTest = {
                questions: this.shuffleArray([...module.questions]),
                currentQuestionIndex: 0,
                userAnswers: {},
                startTime: new Date(),
                timeLimit: 20 * 60 * 1000 // 20 хвилин
            };

            // Додаємо сторінку тесту до DOM
            const testTemplate = document.getElementById('test-page').content;
            document.getElementById('router-view').appendChild(document.importNode(testTemplate, true));
            
            this.startTimer();
            this.renderQuestion();
        } catch (err) {
            console.error('Помилка завантаження тесту:', err);
            alert('Не вдалося завантажити тест');
        }
    }

    startTimer() {
        this.updateTimer();
        this.timerInterval = setInterval(() => this.updateTimer(), 1000);
    }

    updateTimer() {
        const timeLeftElement = document.getElementById('time-left');
        if (!timeLeftElement || !this.currentTest) return;

        const now = new Date();
        const elapsed = now - this.currentTest.startTime;
        const remaining = this.currentTest.timeLimit - elapsed;

        if (remaining <= 0) {
            clearInterval(this.timerInterval);
            this.finishTest();
            return;
        }

        const minutes = Math.floor(remaining / (60 * 1000));
        const seconds = Math.floor((remaining % (60 * 1000)) / 1000);

        timeLeftElement.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }

    renderQuestion() {
        if (!this.currentTest) return;

        const question = this.currentTest.questions[this.currentTest.currentQuestionIndex];
        const questionText = document.getElementById('question-text');
        const answersContainer = document.getElementById('answers-container');
        const currentQuestionNum = document.getElementById('current-question');
        const totalQuestions = document.getElementById('total-questions');
        const prevButton = document.getElementById('prev-question');
        const nextButton = document.getElementById('next-question');

        if (!question || !questionText || !answersContainer) return;

        // Оновлюємо текст питання
        questionText.textContent = question.question;

        // Оновлюємо номер питання
        currentQuestionNum.textContent = this.currentTest.currentQuestionIndex + 1;
        totalQuestions.textContent = this.currentTest.questions.length;

        // Оновлюємо варіанти відповідей
        answersContainer.innerHTML = '';
        question.answers.forEach((answer, index) => {
            const answerElement = document.createElement('div');
            answerElement.className = 'answer-item';
            if (this.currentTest.userAnswers[this.currentTest.currentQuestionIndex] === index) {
                answerElement.classList.add('selected');
            }

            answerElement.innerHTML = `
                <input type="radio" name="answer" value="${index}" id="answer-${index}" 
                    ${this.currentTest.userAnswers[this.currentTest.currentQuestionIndex] === index ? 'checked' : ''}>
                <label for="answer-${index}">${answer}</label>
            `;

            answerElement.addEventListener('click', () => {
                this.selectAnswer(index);
            });

            answersContainer.appendChild(answerElement);
        });

        // Оновлюємо кнопки навігації
        prevButton.disabled = this.currentTest.currentQuestionIndex === 0;
        nextButton.disabled = this.currentTest.currentQuestionIndex === this.currentTest.questions.length - 1;
    }

    selectAnswer(answerIndex) {
        if (!this.currentTest) return;
        this.currentTest.userAnswers[this.currentTest.currentQuestionIndex] = answerIndex;
        this.renderQuestion();
    }

    nextQuestion() {
        if (!this.currentTest) return;
        if (this.currentTest.currentQuestionIndex < this.currentTest.questions.length - 1) {
            this.currentTest.currentQuestionIndex++;
            this.renderQuestion();
        }
    }

    prevQuestion() {
        if (!this.currentTest) return;
        if (this.currentTest.currentQuestionIndex > 0) {
            this.currentTest.currentQuestionIndex--;
            this.renderQuestion();
        }
    }

    finishTest() {
        if (!this.currentTest || !this.currentSubject) return;

        clearInterval(this.timerInterval);

        // Підрахунок результатів
        let correctCount = 0;
        this.currentTest.questions.forEach((question, index) => {
            if (this.currentTest.userAnswers[index] === question.correct) {
                correctCount++;
            }
        });

        const score = Math.round((correctCount / this.currentTest.questions.length) * 100);
        this.updateProgress(this.currentSubject.id, score);

        // Показуємо результати
        alert(`Тест завершено!\nВаш результат: ${correctCount} з ${this.currentTest.questions.length} (${score}%)`);
        
        // Повертаємось до списку предметів
        this.navigate('subjects');
    }

    renderProgress() {
        const progressChart = document.querySelector('.progress-chart');
        if (!progressChart) return;

        progressChart.innerHTML = '';

        this.subjects.forEach(subj => {
            const prog = this.userProgress[subj.id] || 0;
            const div = document.createElement('div');
            div.innerHTML = `<strong>${subj.name}:</strong> ${prog}%`;
            progressChart.appendChild(div);
        });
    }

    updateProgress(subjectId, percent) {
        this.userProgress[subjectId] = percent;
        this.saveProgress();
        this.renderSubjectCards();
        this.renderProgress();
    }

    saveProgress() {
        localStorage.setItem('userProgress', JSON.stringify(this.userProgress));
    }

    loadProgress() {
        const saved = localStorage.getItem('userProgress');
        this.userProgress = saved ? JSON.parse(saved) : {};
    }

    shuffleArray(array) {
        const newArray = [...array];
        for (let i = newArray.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
        }
        return newArray;
    }

    setupTheme() {
        const themeToggle = document.getElementById('theme-toggle');
        if (!themeToggle) return;

        const icon = themeToggle.querySelector('i');
        let savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        icon.classList.toggle('fa-moon', savedTheme === 'light');
        icon.classList.toggle('fa-sun', savedTheme === 'dark');

        themeToggle.addEventListener('click', () => {
            let current = document.documentElement.getAttribute('data-theme');
            let next = current === 'light' ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);

            icon.classList.toggle('fa-moon');
            icon.classList.toggle('fa-sun');
        });
    }

    animateSplash() {
        const splash = document.querySelector('.splash-screen');
        if (!splash) return;

        setTimeout(() => {
            splash.classList.add('fade-out');
            setTimeout(() => {
                splash.style.display = 'none';
                this.resolveRoute();
            }, 1000);
        }, 3000);
    }

    setupEventListeners() {
        window.addEventListener('popstate', () => this.resolveRoute());

        // Додаємо обробники для кнопок тестування
        document.addEventListener('click', (e) => {
            if (e.target.closest('#next-question')) {
                this.nextQuestion();
            }
            if (e.target.closest('#prev-question')) {
                this.prevQuestion();
            }
            if (e.target.closest('#finish-test')) {
                if (confirm('Ви впевнені, що хочете завершити тест?')) {
                    this.finishTest();
                }
            }
        });
    }
}

// Ініціалізація тренажера
window.professionalTrainer = new ProfessionalTrainer();