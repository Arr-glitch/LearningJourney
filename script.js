/**
 * Enhanced Interactive English Learning Platform
 * Professional learning management system with advanced progress tracking,
 * session management, and user experience optimizations.
 */

// Configuration for final submission behavior
const REQUIRE_ALL_QUESTIONS_CHECKED_FOR_FINAL_SUBMISSION = false;

// Session management configuration
const SESSION_CONFIG = {
    AUTO_SAVE_INTERVAL: 30000, // Auto-save every 30 seconds
    HEARTBEAT_INTERVAL: 60000, // Check session every minute
    IDLE_WARNING_TIME: 300000, // Warn after 5 minutes of inactivity
    SESSION_TIMEOUT: 1800000, // Session timeout after 30 minutes
    ENABLE_EXIT_CONFIRMATION: true
};

class InteractiveBook {
    constructor() {
        this.currentChapter = 0;
        this.chapters = [];
        this.userAnswers = {};
        this.stats = {
            totalQuestions: 0,
            correctAnswers: 0,
            chaptersCompleted: 0
        };
        this.userName = '';
        this.userItqanId = '';
        
        // Session management properties
        this.lastActivity = Date.now();
        this.sessionId = this.generateSessionId();
        this.autoSaveTimer = null;
        this.heartbeatTimer = null;
        this.idleWarningShown = false;
        this.isExiting = false;

        // DOM elements references
        this.loadingIndicator = document.getElementById('loadingIndicator');
        this.totalScoreSpan = document.getElementById('totalScore');
        this.totalQuestionsSpan = document.getElementById('totalQuestions');
        this.chapterNavTop = document.getElementById('chapterNavTop');
        this.chapterNavBottom = document.getElementById('chapterNavBottom');
        this.bookContent = document.getElementById('bookContent');
        this.progressFill = document.getElementById('progressFill');
        this.correctAnswersStat = document.getElementById('correctAnswers');
        this.accuracyStat = document.getElementById('accuracy');
        this.chaptersCompletedStat = document.getElementById('chaptersCompleted');

        // Modal elements
        this.userInfoModal = document.getElementById('userInfoModal');
        this.userNameInput = document.getElementById('userNameInput');
        this.itqanIdInput = document.getElementById('itqanIdInput');
        this.startLearningBtn = document.getElementById('startLearningBtn');
        this.userInfoMessage = document.getElementById('userInfoMessage');

        this.finalScoreModal = document.getElementById('finalScoreModal');
        this.finalUserNameSpan = document.getElementById('finalUserName');
        this.finalItqanIdSpan = document.getElementById('finalItqanId');
        this.finalScoreDisplay = document.getElementById('finalScoreDisplay');
        this.finalTotalQuestions = document.getElementById('finalTotalQuestions');

        this.finishAllQuestionsBtn = document.getElementById('finishAllQuestionsBtn');

        this.init();
    }

    /**
     * Generates a unique session ID
     */
    generateSessionId() {
        return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Initializes the learning platform
     */
    async init() {
        this.showLoading(true);
        
        // Set up session management
        this.setupSessionManagement();
        
        // Set up exit confirmation
        if (SESSION_CONFIG.ENABLE_EXIT_CONFIRMATION) {
            this.setupExitConfirmation();
        }

        try {
            await this.promptForUserInfo();
            await this.loadContent();
            this.renderChapterNavigation();
            
            if (this.loadProgress()) {
                this.showChapter(this.currentChapter, false);
            } else {
                this.showChapter(0);
            }
            
            this.updateStats();
            
            if (this.finishAllQuestionsBtn) {
                this.finishAllQuestionsBtn.addEventListener('click', () => this.checkCompletionAndShowScore());
            }

            // Start auto-save and session monitoring
            this.startAutoSave();
            this.startHeartbeat();

        } catch (error) {
            console.error('Failed to initialize platform:', error);
            this.bookContent.innerHTML = `
                <div class="loading" style="display: block;">
                    <p style="color: #f56565;">❌ Error loading content. Please refresh the page and try again.</p>
                </div>
            `;
        } finally {
            this.showLoading(false);
        }
    }

    /**
     * Sets up session management and activity tracking
     */
    setupSessionManagement() {
        // Track user activity
        const activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
        
        activityEvents.forEach(event => {
            document.addEventListener(event, () => {
                this.updateActivity();
            }, true);
        });

        // Store session start time
        this.sessionStartTime = Date.now();
        
        // Save session info
        try {
            localStorage.setItem('englishBookSession', JSON.stringify({
                sessionId: this.sessionId,
                startTime: this.sessionStartTime,
                lastActivity: this.lastActivity
            }));
        } catch (e) {
            console.warn('Could not save session info:', e);
        }
    }

    /**
     * Updates last activity timestamp
     */
    updateActivity() {
        this.lastActivity = Date.now();
        this.idleWarningShown = false;
        
        // Update session info in localStorage
        try {
            const sessionInfo = JSON.parse(localStorage.getItem('englishBookSession') || '{}');
            sessionInfo.lastActivity = this.lastActivity;
            localStorage.setItem('englishBookSession', JSON.stringify(sessionInfo));
        } catch (e) {
            console.warn('Could not update session activity:', e);
        }
    }

    /**
     * Starts auto-save functionality
     */
    startAutoSave() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        
        this.autoSaveTimer = setInterval(() => {
            this.saveProgress();
            this.showCustomMessage('💾 Progress auto-saved', 'success', 2000);
        }, SESSION_CONFIG.AUTO_SAVE_INTERVAL);
    }

    /**
     * Starts session heartbeat monitoring
     */
    startHeartbeat() {
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        this.heartbeatTimer = setInterval(() => {
            this.checkSessionHealth();
        }, SESSION_CONFIG.HEARTBEAT_INTERVAL);
    }

    /**
     * Checks session health and handles idle warnings
     */
    checkSessionHealth() {
        const now = Date.now();
        const timeSinceActivity = now - this.lastActivity;
        
        // Show idle warning
        if (timeSinceActivity > SESSION_CONFIG.IDLE_WARNING_TIME && !this.idleWarningShown) {
            this.idleWarningShown = true;
            this.showCustomMessage('⏰ You\'ve been idle for a while. Your progress is being saved automatically.', 'info', 5000);
        }
        
        // Handle session timeout (optional - for now just log)
        if (timeSinceActivity > SESSION_CONFIG.SESSION_TIMEOUT) {
            console.log('Session timeout reached, but continuing...');
            // Could implement session refresh or logout here
        }
    }

    /**
     * Sets up exit confirmation to prevent accidental data loss
     */
    setupExitConfirmation() {
        // Handle browser close/refresh
        window.addEventListener('beforeunload', (e) => {
            if (!this.isExiting) {
                // Save progress before potentially leaving
                this.saveProgress();
                
                // Show confirmation dialog
                const message = 'Your progress has been saved. Are you sure you want to leave?';
                e.preventDefault();
                e.returnValue = message;
                return message;
            }
        });

        // Handle page visibility changes (tab switching, minimizing)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                // Save progress when tab becomes hidden
                this.saveProgress();
            } else {
                // Update activity when tab becomes visible again
                this.updateActivity();
            }
        });
    }

    /**
     * Enhanced user info prompt with validation
     */
    promptForUserInfo() {
        return new Promise(resolve => {
            this.userInfoModal.style.display = 'flex';

            // Load saved user info if available
            try {
                const savedUserInfo = localStorage.getItem('englishBookUserInfo');
                if (savedUserInfo) {
                    const userInfo = JSON.parse(savedUserInfo);
                    this.userNameInput.value = userInfo.name || '';
                    this.itqanIdInput.value = userInfo.itqanId || '';
                    this.userName = userInfo.name || '';
                    this.userItqanId = userInfo.itqanId || '';
                }
            } catch (e) {
                console.error('Error loading user info from localStorage:', e);
            }

            const handleSubmit = () => {
                const name = this.userNameInput.value.trim();
                const itqanId = this.itqanIdInput.value.trim();

                // Enhanced validation
                if (!name || name.length < 2) {
                    this.userInfoMessage.textContent = '❌ Please enter a valid name (at least 2 characters).';
                    this.userNameInput.focus();
                    return;
                }

                if (!itqanId || itqanId.length < 3) {
                    this.userInfoMessage.textContent = '❌ Please enter a valid ITQAN ID (at least 3 characters).';
                    this.itqanIdInput.focus();
                    return;
                }

                this.userName = name;
                this.userItqanId = itqanId;
                
                try {
                    localStorage.setItem('englishBookUserInfo', JSON.stringify({ 
                        name: this.userName, 
                        itqanId: this.userItqanId,
                        registrationTime: Date.now()
                    }));
                } catch (e) {
                    console.error('Error saving user info to localStorage:', e);
                }
                
                this.userInfoModal.style.display = 'none';
                this.startLearningBtn.removeEventListener('click', handleSubmit);
                
                // Show welcome message
                this.showCustomMessage(`🎉 Welcome ${this.userName}! Let's start your learning journey.`, 'success', 4000);
                
                resolve();
            };

            this.startLearningBtn.addEventListener('click', handleSubmit);
            
            // Enhanced keyboard support
            [this.userNameInput, this.itqanIdInput].forEach(input => {
                input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        handleSubmit();
                    }
                });
                
                // Clear error message on input
                input.addEventListener('input', () => {
                    this.userInfoMessage.textContent = '';
                });
            });

            // Focus on first empty field
            if (!this.userNameInput.value) {
                this.userNameInput.focus();
            } else if (!this.itqanIdInput.value) {
                this.itqanIdInput.focus();
            }
        });
    }

    /**
     * Enhanced loading indicator
     */
    showLoading(show) {
        if (this.loadingIndicator) {
            this.loadingIndicator.style.display = show ? 'flex' : 'none';
        }
    }

    /**
     * Enhanced content loading with error handling
     */
    async loadContent() {
        try {
            /*
            const response = await fetch('./content.json');https://arr-glitch.github.io/LearningJourney/
            */
             const response = await fetch('https://arr-glitch.github.io/LearningJourney/content.json')
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            this.chapters = data.chapters;
            this.calculateTotalQuestions();
            
            // Log successful content load
            console.log(`✅ Loaded ${this.chapters.length} chapters with ${this.stats.totalQuestions} total questions`);
            
        } catch (error) {
            console.error('Error fetching content.json:', error);
            throw new Error('Could not load learning content. Please check your internet connection and try again.');
        }
    }

    /**
     * Calculate total questions across all chapters
     */
    calculateTotalQuestions() {
        this.stats.totalQuestions = this.chapters.reduce((total, chapter) => {
            return total + chapter.questions.length;
        }, 0);
        this.totalQuestionsSpan.textContent = this.stats.totalQuestions;
    }

    /**
     * Enhanced chapter navigation rendering
     */
    renderChapterNavigation() {
        if (!this.chapterNavTop || !this.chapterNavBottom || !this.chapters.length) return;

        const navHtml = this.chapters.map((chapter, index) => {
            const isCompleted = this.isChapterCompleted(index);
            const completedIcon = isCompleted ? ' ✅' : '';
            
            return `<button class="chapter-btn ${index === this.currentChapter ? 'active' : ''} ${isCompleted ? 'completed' : ''}" 
                            onclick="book.showChapter(${index})"
                            title="Chapter ${index + 1}: ${chapter.title}${isCompleted ? ' (Completed)' : ''}">
                        ${index + 1}. ${chapter.title}${completedIcon}
                    </button>`;
        }).join('');

        this.chapterNavTop.innerHTML = navHtml;
        this.chapterNavBottom.innerHTML = navHtml;
    }

    /**
     * Check if a chapter is completed
     */
    isChapterCompleted(chapterIndex) {
        const chapter = this.chapters[chapterIndex];
        if (!chapter) return false;
        
        return chapter.questions.every((q, qIndex) => {
            const questionId = `q_${chapterIndex}_${qIndex}`;
            return this.userAnswers[questionId] !== undefined && 
                   this.userAnswers[questionId].isCorrect !== undefined;
        });
    }

    /**
     * Enhanced chapter display with animations and accessibility
     */
    showChapter(index, saveProgressAfterShow = true) {
        if (index < 0 || index >= this.chapters.length) {
            console.warn('Chapter index out of bounds:', index);
            return;
        }

        this.currentChapter = index;

        // Update navigation button active state
        document.querySelectorAll('.chapter-btn').forEach((btn, i) => {
            btn.classList.toggle('active', i === index);
        });

        const chapter = this.chapters[index];
        if (!chapter) {
            this.bookContent.innerHTML = '<div class="loading" style="display: block;"><p>❌ Chapter content not found.</p></div>';
            return;
        }

        // Enhanced chapter rendering with better structure
        this.bookContent.innerHTML = `
            <div class="chapter active">
                <h2>${chapter.title}</h2>
                <div class="lesson-content">
                    <h3>📖 Reading Passage</h3>
                    <p>${chapter.content.passage}</p>
                    ${chapter.content.explanation ? `
                        <h3>💡 Explanation</h3>
                        <p>${chapter.content.explanation}</p>
                    ` : ''}
                </div>
                <div class="questions">
                    ${chapter.questions.map((q, i) => this.renderQuestion(q, index, i)).join('')}
                </div>
                <div class="chapter-actions">
                    <button class="btn check-chapter-btn" id="checkChapterBtn" onclick="book.checkCurrentChapterAnswers()">
                        <span>✅ Check Chapter Answers</span>
                    </button>
                </div>
            </div>
        `;

        this.initializeDragDrop();
        this.updateProgress();
        this.applyUserAnswersToChapter();

        // Check if chapter is already completed
        const chapterAlreadyChecked = this.isChapterCompleted(this.currentChapter);
        const checkBtn = document.getElementById('checkChapterBtn');
        if (checkBtn && chapterAlreadyChecked) {
            checkBtn.disabled = true;
            checkBtn.innerHTML = '<span>✅ Chapter Completed</span>';
        }

        if (saveProgressAfterShow) {
            this.saveProgress();
        }

        // Update activity
        this.updateActivity();

        // Show chapter change notification
        this.showCustomMessage(`📖 Chapter ${index + 1}: ${chapter.title}`, 'info', 2000);
    }

    /**
     * Enhanced question rendering with better accessibility
     */
    renderQuestion(question, chapterIndex, questionIndex) {
        const questionId = `q_${chapterIndex}_${questionIndex}`;
        const userAnswerData = this.userAnswers[questionId];
        const userAnswer = userAnswerData ? userAnswerData.answer : undefined;
        const isQuestionChecked = userAnswerData && userAnswerData.isCorrect !== undefined;

        let questionHtml = '';

        switch (question.type) {
            case 'multiple-choice':
                questionHtml = `
                    <div class="question-container" role="group" aria-labelledby="question_${questionId}">
                        <div class="question" id="question_${questionId}">${questionIndex + 1}. ${question.question}</div>
                        <div class="options" role="radiogroup" aria-labelledby="question_${questionId}">
                            ${question.options.map((option, i) =>
                                `<div class="option ${userAnswer === i && !isQuestionChecked ? 'selected' : ''}"
                                      data-option-index="${i}"
                                      onclick="book.selectOption('${questionId}', ${i})"
                                      role="radio"
                                      aria-checked="${userAnswer === i ? 'true' : 'false'}"
                                      tabindex="0"
                                      ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                    ${String.fromCharCode(65 + i)}. ${option}
                                </div>`
                            ).join('')}
                        </div>
                        <div class="feedback" id="feedback_${questionId}" role="status" aria-live="polite"></div>
                    </div>
                `;
                break;

            case 'fill-in-blank':
                questionHtml = `
                    <div class="question-container input-question">
                        <div class="question">${questionIndex + 1}. ${question.question}</div>
                        <input type="text" 
                               id="input_${questionId}" 
                               placeholder="Type your answer here..."
                               value="${userAnswer !== undefined ? userAnswer : ''}"
                               aria-label="Answer input for question ${questionIndex + 1}"
                               ${isQuestionChecked ? 'disabled' : ''}>
                        <div class="feedback" id="feedback_${questionId}" role="status" aria-live="polite"></div>
                    </div>
                `;
                break;

            case 'drag-drop':
                const itemsToDisplay = (userAnswerData && userAnswerData.answer && userAnswerData.answer.droppedItems) ? 
                    userAnswerData.answer.droppedItems : [...question.items].sort(() => Math.random() - 0.5);
                const dropZoneContent = (userAnswerData && userAnswerData.answer && userAnswerData.answer.dropZones) ? 
                    userAnswerData.answer.dropZones : Array(question.correct.length).fill('Drop here');

                questionHtml = `
                    <div class="question-container">
                        <div class="question">${questionIndex + 1}. ${question.question}</div>
                        <div class="drag-drop" id="dragdrop_${questionId}">
                            <div class="drag-items" ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                <h4>📝 Drag items:</h4>
                                ${itemsToDisplay.map((item, i) =>
                                    (dropZoneContent.includes(item) && isQuestionChecked) ? '' : 
                                    `<div class="drag-item" draggable="true" data-item="${item}" tabindex="0">${item}</div>`
                                ).join('')}
                            </div>
                            <div class="drop-zones" ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                <h4>🎯 Drop zones:</h4>
                                ${dropZoneContent.map((content, i) =>
                                    `<div class="drop-zone ${content !== 'Drop here' ? 'filled' : ''}" 
                                          data-position="${i}"
                                          role="button"
                                          tabindex="0"
                                          aria-label="Drop zone ${i + 1}">
                                        ${content}
                                    </div>`
                                ).join('')}
                            </div>
                        </div>
                        <div class="feedback" id="feedback_${questionId}" role="status" aria-live="polite"></div>
                    </div>
                `;
                break;

            case 'reading-passage':
                questionHtml = `
                    <div class="question-container" role="group" aria-labelledby="question_${questionId}">
                        <div class="question" id="question_${questionId}">${questionIndex + 1}. ${question.question}</div>
                        <div class="options" role="radiogroup" aria-labelledby="question_${questionId}">
                            ${question.options.map((option, i) =>
                                `<div class="option ${userAnswer === i && !isQuestionChecked ? 'selected' : ''}"
                                      data-option-index="${i}"
                                      onclick="book.selectOption('${questionId}', ${i})"
                                      role="radio"
                                      aria-checked="${userAnswer === i ? 'true' : 'false'}"
                                      tabindex="0"
                                      ${isQuestionChecked ? 'style="pointer-events: none;"' : ''}>
                                    ${String.fromCharCode(65 + i)}. ${option}
                                </div>`
                            ).join('')}
                        </div>
                        <div class="feedback" id="feedback_${questionId}" role="status" aria-live="polite"></div>
                    </div>
                `;
                break;

            default:
                questionHtml = `<div class="question-container"><p>❌ Unsupported question type: ${question.type}</p></div>`;
                break;
        }
        return questionHtml;
    }

    /**
     * Enhanced chapter answer checking with better feedback
     */
    checkCurrentChapterAnswers() {
        const chapter = this.chapters[this.currentChapter];
        let allQuestionsAttemptedInChapter = true;
        let newlyAnsweredCount = 0;

        chapter.questions.forEach((q, i) => {
            const questionId = `q_${this.currentChapter}_${i}`;
            const feedbackElement = document.getElementById(`feedback_${questionId}`);
            let userAnswer;
            let isCorrect;
            let currentQuestionAttempted = true;

            // Skip if already checked
            if (this.userAnswers[questionId] && this.userAnswers[questionId].isCorrect !== undefined) {
                this.applyFeedbackForQuestion(questionId, q, this.userAnswers[questionId].answer, this.userAnswers[questionId].isCorrect);
                return; 
            }

            if (q.type === 'multiple-choice' || q.type === 'reading-passage') {
                const container = feedbackElement.closest('.question-container');
                const selectedOption = container.querySelector('.option.selected');
                userAnswer = selectedOption ? parseInt(selectedOption.dataset.optionIndex) : undefined;

                if (userAnswer === undefined) {
                    feedbackElement.innerHTML = '<div class="feedback incorrect">❌ Please select an answer.</div>';
                    currentQuestionAttempted = false;
                } else {
                    isCorrect = (Array.isArray(q.correct) && q.correct.includes(userAnswer)) || 
                               (!Array.isArray(q.correct) && userAnswer === q.correct);
                    this.userAnswers[questionId] = { answer: userAnswer, isCorrect: isCorrect };
                    newlyAnsweredCount++;
                }

            } else if (q.type === 'fill-in-blank') {
                const inputElement = document.getElementById(`input_${questionId}`);
                userAnswer = inputElement.value.trim();
                if (!userAnswer) {
                    feedbackElement.innerHTML = '<div class="feedback incorrect">❌ Please enter an answer.</div>';
                    currentQuestionAttempted = false;
                } else {
                    isCorrect = (Array.isArray(q.correct) && q.correct.map(s => s.toLowerCase()).includes(userAnswer.toLowerCase())) || 
                               (!Array.isArray(q.correct) && userAnswer.toLowerCase() === q.correct.toLowerCase());
                    this.userAnswers[questionId] = { answer: userAnswer, isCorrect: isCorrect };
                    newlyAnsweredCount++;
                }

            } else if (q.type === 'drag-drop') {
                const dropZones = document.querySelectorAll(`#dragdrop_${questionId} .drop-zone`);
                const currentDropZoneContent = Array.from(dropZones).map(zone => zone.textContent.trim());
                
                if (currentDropZoneContent.some(text => text === 'Drop here' || text === '')) {
                    feedbackElement.innerHTML = '<div class="feedback incorrect">❌ Please fill all positions.</div>';
                    currentQuestionAttempted = false;
                } else {
                    isCorrect = JSON.stringify(currentDropZoneContent) === JSON.stringify(q.correct);
                    this.userAnswers[questionId] = { 
                        answer: { dropZones: currentDropZoneContent, droppedItems: [] }, 
                        isCorrect: isCorrect 
                    };
                    newlyAnsweredCount++;
                }
            }

            if (!currentQuestionAttempted) {
                allQuestionsAttemptedInChapter = false;
            } else {
                this.applyFeedbackForQuestion(questionId, q, userAnswer, isCorrect);
                if (isCorrect) showConfetti();
            }
        });

        // Enhanced feedback messages
        if (allQuestionsAttemptedInChapter) {
            const checkBtn = document.getElementById('checkChapterBtn');
            if (checkBtn) {
                checkBtn.disabled = true;
                checkBtn.innerHTML = '<span>✅ Chapter Completed</span>';
            }
            
            const correctCount = chapter.questions.filter((q, i) => {
                const questionId = `q_${this.currentChapter}_${i}`;
                return this.userAnswers[questionId] && this.userAnswers[questionId].isCorrect;
            }).length;
            
            this.showCustomMessage(
                `🎉 Chapter ${this.currentChapter + 1} completed! Score: ${correctCount}/${chapter.questions.length}`, 
                'success', 
                4000
            );
        } else {
            this.showCustomMessage('⚠️ Please answer all questions in the chapter before checking!', 'info', 3000);
        }
        
        this.updateStats();
        this.saveProgress();
        this.updateActivity();
    }

    /**
     * Enhanced feedback application with better visual indicators
     */
    applyFeedbackForQuestion(questionId, question, userAnswer, isCorrect) {
        const feedbackElement = document.getElementById(`feedback_${questionId}`);
        if (!feedbackElement) return;

        const feedbackIcon = isCorrect ? '✅' : '❌';
        const feedbackText = isCorrect ? 'Excellent!' : 'Try again next time!';
        
        feedbackElement.innerHTML = `
            <div class="feedback ${isCorrect ? 'correct' : 'incorrect'}">
                ${feedbackIcon} ${feedbackText}
            </div>
        `;

        // Enhanced visual feedback for different question types
        if (question.type === 'multiple-choice' || question.type === 'reading-passage') {
            const container = feedbackElement.closest('.question-container');
            const options = container.querySelectorAll('.option');
            options.forEach(option => {
                option.style.pointerEvents = 'none';
                option.classList.remove('selected');
                const optionIndex = parseInt(option.dataset.optionIndex);
                
                if (isCorrect && (optionIndex === question.correct || 
                    (Array.isArray(question.correct) && question.correct.includes(optionIndex)))) {
                    option.classList.add('correct');
                } else if (!isCorrect && optionIndex === userAnswer) {
                    option.classList.add('incorrect');
                }
            });
        } else if (question.type === 'fill-in-blank') {
            const inputElement = document.getElementById(`input_${questionId}`);
            if (inputElement) {
                inputElement.disabled = true;
                inputElement.style.backgroundColor = isCorrect ? '#c6f6d5' : '#fed7d7';
            }
        } else if (question.type === 'drag-drop') {
            const dropZones = document.querySelectorAll(`#dragdrop_${questionId} .drop-zone`);
            const dragItemsContainer = document.querySelector(`#dragdrop_${questionId} .drag-items`);
            
            dropZones.forEach((zone, index) => {
                zone.style.pointerEvents = 'none';
                if (userAnswer && userAnswer.dropZones && userAnswer.dropZones[index] === question.correct[index]) {
                    zone.style.backgroundColor = '#c6f6d5';
                    zone.style.borderColor = '#48bb78';
                } else if (userAnswer && userAnswer.dropZones) {
                    zone.style.backgroundColor = '#fed7d7';
                    zone.style.borderColor = '#f56565';
                }
            });
            if (dragItemsContainer) dragItemsContainer.style.pointerEvents = 'none';
        }
    }

    /**
     * Enhanced option selection with better UX
     */
    selectOption(questionId, optionIndex) {
        const container = document.querySelector(`#feedback_${questionId}`).closest('.question-container');
        const options = container.querySelectorAll('.option');

        options.forEach(option => {
            option.classList.remove('selected');
            option.setAttribute('aria-checked', 'false');
        });
        
        options[optionIndex].classList.add('selected');
        options[optionIndex].setAttribute('aria-checked', 'true');

        this.userAnswers[questionId] = { answer: optionIndex, isCorrect: undefined };
        this.updateActivity();
    }

    /**
     * Enhanced statistics update with animations
     */
    updateStats() {
        const attemptedQuestionsCount = Object.keys(this.userAnswers).length;

        let currentCorrectAnswers = 0;
        Object.values(this.userAnswers).forEach(answerData => {
            if (answerData && answerData.isCorrect === true) {
                currentCorrectAnswers++;
            }
        });
        this.stats.correctAnswers = currentCorrectAnswers;

        const accuracy = attemptedQuestionsCount > 0 ? 
            Math.round((this.stats.correctAnswers / attemptedQuestionsCount) * 100) : 0;
        
        // Animate number changes
        this.animateNumber(this.totalScoreSpan, this.stats.correctAnswers);
        this.animateNumber(this.correctAnswersStat, this.stats.correctAnswers);
        this.animateText(this.accuracyStat, accuracy + '%');
        
        // Update chapters completed
        let completedCount = 0;
        this.chapters.forEach((chapter, chapIndex) => {
            if (this.isChapterCompleted(chapIndex)) {
                completedCount++;
            }
        });
        this.stats.chaptersCompleted = completedCount;
        this.animateNumber(this.chaptersCompletedStat, this.stats.chaptersCompleted);
        
        this.updateProgress();
        this.renderChapterNavigation(); // Update navigation to show completed chapters

        // Update finish button
        if (this.finishAllQuestionsBtn) {
            if (REQUIRE_ALL_QUESTIONS_CHECKED_FOR_FINAL_SUBMISSION) {
                const allQuestionsChecked = Object.values(this.userAnswers)
                    .filter(ad => ad.isCorrect !== undefined).length;
                this.finishAllQuestionsBtn.disabled = !(allQuestionsChecked === this.stats.totalQuestions && this.stats.totalQuestions > 0);
            } else {
                this.finishAllQuestionsBtn.disabled = false;
            }
        }
    }

    /**
     * Animate number changes for better UX
     */
    animateNumber(element, targetNumber) {
        if (!element) return;
        
        const currentNumber = parseInt(element.textContent) || 0;
        const increment = targetNumber > currentNumber ? 1 : -1;
        const duration = Math.abs(targetNumber - currentNumber) * 50; // 50ms per number
        
        if (currentNumber === targetNumber) return;
        
        let current = currentNumber;
        const timer = setInterval(() => {
            current += increment;
            element.textContent = current;
            
            if (current === targetNumber) {
                clearInterval(timer);
            }
        }, duration / Math.abs(targetNumber - currentNumber));
    }

    /**
     * Animate text changes
     */
    animateText(element, newText) {
        if (!element || element.textContent === newText) return;
        
        element.style.transform = 'scale(1.1)';
        element.style.transition = 'transform 0.2s ease';
        
        setTimeout(() => {
            element.textContent = newText;
            element.style.transform = 'scale(1)';
        }, 100);
    }

    /**
     * Enhanced progress saving with error handling and validation
     */
    saveProgress() {
        const progress = {
            version: '2.0', // Version for future compatibility
            userAnswers: this.userAnswers,
            stats: this.stats,
            currentChapter: this.currentChapter,
            userName: this.userName,
            userItqanId: this.userItqanId,
            sessionId: this.sessionId,
            lastSaved: Date.now(),
            totalSessions: this.getTotalSessions() + 1
        };
        
        try {
            const progressString = JSON.stringify(progress);
            localStorage.setItem('englishBookProgress', progressString);
            
            // Also save a backup with timestamp
            const backupKey = `englishBookProgress_backup_${Date.now()}`;
            localStorage.setItem(backupKey, progressString);
            
            // Clean old backups (keep only last 3)
            this.cleanOldBackups();
            
            console.log('✅ Progress saved successfully');
            return true;
        } catch (e) {
            console.error('❌ Cannot save progress:', e);
            this.showCustomMessage('⚠️ Could not save progress. Please check your browser storage.', 'error', 4000);
            return false;
        }
    }

    /**
     * Clean old backup files
     */
    cleanOldBackups() {
        try {
            const backupKeys = Object.keys(localStorage)
                .filter(key => key.startsWith('englishBookProgress_backup_'))
                .sort()
                .reverse();
            
            // Keep only the 3 most recent backups
            backupKeys.slice(3).forEach(key => {
                localStorage.removeItem(key);
            });
        } catch (e) {
            console.warn('Could not clean old backups:', e);
        }
    }

    /**
     * Get total number of sessions
     */
    getTotalSessions() {
        try {
            const saved = localStorage.getItem('englishBookProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                return progress.totalSessions || 0;
            }
        } catch (e) {
            console.warn('Could not get total sessions:', e);
        }
        return 0;
    }

    /**
     * Enhanced progress loading with migration support
     */
    loadProgress() {
        try {
            const saved = localStorage.getItem('englishBookProgress');
            if (saved) {
                const progress = JSON.parse(saved);
                
                // Handle version migration if needed
                if (!progress.version || progress.version < '2.0') {
                    console.log('Migrating progress to new version...');
                    // Migration logic here if needed
                }
                
                this.userAnswers = progress.userAnswers || {};
                this.stats = { ...this.stats, ...progress.stats };
                this.currentChapter = progress.currentChapter || 0;
                this.userName = progress.userName || '';
                this.userItqanId = progress.userItqanId || '';
                
                console.log(`✅ Progress loaded successfully (Session ${progress.totalSessions || 1})`);
                
                // Show welcome back message
                if (this.userName) {
                    this.showCustomMessage(`👋 Welcome back, ${this.userName}! Your progress has been restored.`, 'success', 4000);
                }
                
                return true;
            }
        } catch (e) {
            console.error('❌ Cannot load progress:', e);
            
            // Try to load from backup
            try {
                const backupKeys = Object.keys(localStorage)
                    .filter(key => key.startsWith('englishBookProgress_backup_'))
                    .sort()
                    .reverse();
                
                if (backupKeys.length > 0) {
                    const backupData = localStorage.getItem(backupKeys[0]);
                    if (backupData) {
                        const progress = JSON.parse(backupData);
                        this.userAnswers = progress.userAnswers || {};
                        this.stats = { ...this.stats, ...progress.stats };
                        this.currentChapter = progress.currentChapter || 0;
                        this.userName = progress.userName || '';
                        this.userItqanId = progress.userItqanId || '';
                        
                        this.showCustomMessage('📁 Progress restored from backup!', 'success', 4000);
                        return true;
                    }
                }
            } catch (backupError) {
                console.error('Could not load from backup:', backupError);
            }
            
            this.showCustomMessage('⚠️ Could not load saved progress. Starting fresh.', 'info', 4000);
        }
        return false;
    }

    /**
     * Enhanced reset progress with confirmation
     */
    resetProgress() {
        this.showConfirmDialog(
            '⚠️ Are you sure you want to reset all your progress? This action cannot be undone and will delete all your answers and statistics.',
            () => {
                this.userAnswers = {};
                this.stats = {
                    totalQuestions: this.stats.totalQuestions,
                    correctAnswers: 0,
                    chaptersCompleted: 0
                };
                this.currentChapter = 0;
                this.userName = '';
                this.userItqanId = '';
                
                try {
                    // Clear all related localStorage items
                    localStorage.removeItem('englishBookProgress');
                    localStorage.removeItem('englishBookUserInfo');
                    localStorage.removeItem('englishBookSession');
                    
                    // Clear backups
                    Object.keys(localStorage)
                        .filter(key => key.startsWith('englishBookProgress_backup_'))
                        .forEach(key => localStorage.removeItem(key));
                    
                    console.log('✅ Progress reset successfully');
                } catch (e) {
                    console.error('Cannot clear progress:', e);
                }
                
                this.updateStats();
                this.showChapter(0);
                this.renderChapterNavigation();
                
                // Re-prompt for user info
                setTimeout(() => {
                    this.promptForUserInfo();
                }, 500);
                
                this.showCustomMessage('🔄 Progress reset successfully! Please enter your details again.', 'success', 4000);
            }
        );
    }

    /**
     * Enhanced custom message with better styling and timing
     */
    showCustomMessage(message, type, duration = 3000) {
        // Remove any existing message
        const existingMessage = document.querySelector('.custom-message-box');
        if (existingMessage) {
            existingMessage.remove();
        }

        const messageBox = document.createElement('div');
        messageBox.classList.add('custom-message-box', type);
        messageBox.textContent = message;
        document.body.appendChild(messageBox);

        // Enhanced positioning and styling
        messageBox.style.position = 'fixed';
        messageBox.style.top = '20px';
        messageBox.style.left = '50%';
        messageBox.style.transform = 'translateX(-50%)';
        messageBox.style.padding = '1rem 2rem';
        messageBox.style.borderRadius = '16px';
        messageBox.style.zIndex = '10000';
        messageBox.style.color = 'white';
        messageBox.style.fontWeight = '600';
        messageBox.style.boxShadow = '0 8px 25px rgba(0,0,0,0.3)';
        messageBox.style.opacity = '0';
        messageBox.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
        messageBox.style.backdropFilter = 'blur(10px)';
        messageBox.style.maxWidth = '90vw';
        messageBox.style.textAlign = 'center';

        // Type-specific styling
        if (type === 'success') {
            messageBox.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
        } else if (type === 'error') {
            messageBox.style.background = 'linear-gradient(135deg, #f44336, #d32f2f)';
        } else {
            messageBox.style.background = 'linear-gradient(135deg, #2196F3, #1976d2)';
        }

        // Animate in
        setTimeout(() => {
            messageBox.style.opacity = '1';
            messageBox.style.top = '30px';
        }, 10);

        // Animate out
        setTimeout(() => {
            messageBox.style.opacity = '0';
            messageBox.style.top = '10px';
            messageBox.addEventListener('transitionend', () => {
                if (messageBox.parentNode) {
                    messageBox.remove();
                }
            });
        }, duration);
    }

    /**
     * Enhanced confirmation dialog
     */
    showConfirmDialog(message, onConfirm) {
        const confirmOverlay = document.createElement('div');
        confirmOverlay.classList.add('modal-overlay');
        confirmOverlay.style.display = 'flex';

        confirmOverlay.innerHTML = `
            <div class="modal-content">
                <h2>🤔 Confirmation Required</h2>
                <p>${message}</p>
                <div style="display: flex; gap: 1rem; justify-content: center; margin-top: 2rem;">
                    <button class="btn" id="confirmYes" style="background: linear-gradient(145deg, #dc2626, #b91c1c);">
                        <span>✅ Yes, Continue</span>
                    </button>
                    <button class="btn" id="confirmNo">
                        <span>❌ Cancel</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(confirmOverlay);

        const confirmYesBtn = document.getElementById('confirmYes');
        const confirmNoBtn = document.getElementById('confirmNo');

        const cleanup = () => {
            confirmYesBtn.removeEventListener('click', handleYes);
            confirmNoBtn.removeEventListener('click', handleNo);
            confirmOverlay.remove();
        };

        const handleYes = () => {
            onConfirm();
            cleanup();
        };

        const handleNo = () => {
            cleanup();
        };

        confirmYesBtn.addEventListener('click', handleYes);
        confirmNoBtn.addEventListener('click', handleNo);

        // ESC key support
        const handleEsc = (e) => {
            if (e.key === 'Escape') {
                cleanup();
                document.removeEventListener('keydown', handleEsc);
            }
        };
        document.addEventListener('keydown', handleEsc);
    }

    /**
     * Enhanced completion check and score display
     */
    checkCompletionAndShowScore() {
        if (REQUIRE_ALL_QUESTIONS_CHECKED_FOR_FINAL_SUBMISSION) {
            const allQuestionsChecked = Object.values(this.userAnswers)
                .filter(ad => ad.isCorrect !== undefined).length;
            if (allQuestionsChecked === this.stats.totalQuestions && this.stats.totalQuestions > 0) {
                this.displayFinalScore();
            } else {
                this.showCustomMessage(
                    '📝 Please complete all questions across all chapters before finishing your learning journey!', 
                    'info', 
                    4000
                );
            }
        } else {
            this.displayFinalScore();
        }
    }

    /**
     * Enhanced final score display
     */
    displayFinalScore() {
        // Calculate additional statistics
        const completionPercentage = this.stats.totalQuestions > 0 ? 
            Math.round((this.stats.correctAnswers / this.stats.totalQuestions) * 100) : 0;
        
        this.finalUserNameSpan.textContent = this.userName;
        this.finalItqanIdSpan.textContent = this.userItqanId;
        this.finalScoreDisplay.textContent = this.stats.correctAnswers;
        this.finalTotalQuestions.textContent = this.stats.totalQuestions;
        
        // Add completion percentage to the display
        const scoreContainer = this.finalScoreDisplay.parentElement;
        if (!scoreContainer.querySelector('.completion-percentage')) {
            const percentageElement = document.createElement('p');
            percentageElement.className = 'completion-percentage';
            percentageElement.innerHTML = `<strong>📊 Completion Rate:</strong> <span style="color: #059669; font-weight: 700; font-size: 1.2em;">${completionPercentage}%</span>`;
            scoreContainer.appendChild(percentageElement);
        }
        
        this.finalScoreModal.style.display = 'flex';
        
        // Save final completion
        this.saveProgress();
        
        // Show celebration
        showConfetti();
        
        // Update activity
        this.updateActivity();
    }

    /**
     * Hide final score modal
     */
    hideFinalScoreModal() {
        this.finalScoreModal.style.display = 'none';
    }

    /**
     * Enhanced progress export with certificate-like format
     */
    exportProgress() {
        const completionDate = new Date().toLocaleDateString();
        const completionPercentage = this.stats.totalQuestions > 0 ? 
            Math.round((this.stats.correctAnswers / this.stats.totalQuestions) * 100) : 0;
        
        const certificate = {
            // Certificate Header
            certificateTitle: "ITQAN Institute - English Learning Certificate",
            issuedTo: this.userName,
            studentId: this.userItqanId,
            completionDate: completionDate,
            
            // Performance Summary
            performance: {
                totalQuestions: this.stats.totalQuestions,
                correctAnswers: this.stats.correctAnswers,
                completionPercentage: completionPercentage,
                chaptersCompleted: this.stats.chaptersCompleted,
                totalChapters: this.chapters.length
            },
            
            // Detailed Progress
            detailedProgress: {
                userAnswers: this.userAnswers,
                chapterTitles: this.chapters.map(chap => chap.title),
                sessionInfo: {
                    totalSessions: this.getTotalSessions(),
                    lastSession: new Date().toISOString()
                }
            },
            
            // Metadata
            metadata: {
                exportDate: new Date().toISOString(),
                version: '2.0',
                platform: 'ITQAN Interactive English Learning Platform'
            }
        };
        
        const dataStr = JSON.stringify(certificate, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const link = document.createElement('a');
        link.href = URL.createObjectURL(dataBlob);
        link.download = `ITQAN_English_Certificate_${this.userName.replace(/\s/g, '_')}_${completionDate.replace(/\//g, '-')}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(link.href);
        
        this.showCustomMessage('📥 Certificate downloaded successfully!', 'success', 4000);
    }

    /**
     * Enhanced progress update with smooth animations
     */
    updateProgress() {
        const attemptedQuestionsCount = Object.keys(this.userAnswers).length;
        const progressPercentage = this.stats.totalQuestions > 0 ? 
            (attemptedQuestionsCount / this.stats.totalQuestions) * 100 : 0;
        
        // Smooth progress bar animation
        this.progressFill.style.width = progressPercentage + '%';
        
        // Update aria attributes for accessibility
        const progressBar = this.progressFill.parentElement;
        if (progressBar) {
            progressBar.setAttribute('aria-valuenow', Math.round(progressPercentage));
            progressBar.setAttribute('aria-valuemin', '0');
            progressBar.setAttribute('aria-valuemax', '100');
        }
    }

    /**
     * Apply saved answers to current chapter
     */
    applyUserAnswersToChapter() {
        const chapterQuestions = this.chapters[this.currentChapter].questions;
        let chapterFullyAnswered = true;

        chapterQuestions.forEach((q, i) => {
            const questionId = `q_${this.currentChapter}_${i}`;
            const userAnswerData = this.userAnswers[questionId];
            
            if (userAnswerData && userAnswerData.isCorrect !== undefined) {
                this.applyFeedbackForQuestion(questionId, q, userAnswerData.answer, userAnswerData.isCorrect);
            } else if (userAnswerData && userAnswerData.answer !== undefined) {
                // Re-apply selections for unanswered questions
                if (q.type === 'multiple-choice' || q.type === 'reading-passage') {
                    const container = document.querySelector(`#feedback_${questionId}`).closest('.question-container');
                    const options = container.querySelectorAll('.option');
                    options.forEach(option => {
                        if (parseInt(option.dataset.optionIndex) === userAnswerData.answer) {
                            option.classList.add('selected');
                            option.setAttribute('aria-checked', 'true');
                        } else {
                            option.classList.remove('selected');
                            option.setAttribute('aria-checked', 'false');
                        }
                        option.style.pointerEvents = 'auto';
                    });
                } else if (q.type === 'fill-in-blank') {
                    const inputElement = document.getElementById(`input_${questionId}`);
                    if (inputElement) inputElement.disabled = false;
                }
                chapterFullyAnswered = false;
            } else {
                chapterFullyAnswered = false;
            }
        });

        const checkBtn = document.getElementById('checkChapterBtn');
        if (checkBtn) {
            checkBtn.disabled = chapterFullyAnswered;
            if (chapterFullyAnswered) {
                checkBtn.innerHTML = '<span>✅ Chapter Completed</span>';
            }
        }
    }

    /**
     * Initialize drag and drop functionality
     */
    initializeDragDrop() {
        // Enhanced drag and drop with better accessibility and touch support
        const dragItems = document.querySelectorAll('.drag-item');
        const dropZones = document.querySelectorAll('.drop-zone');

        dragItems.forEach(item => {
            // Mouse events
            item.addEventListener('dragstart', (e) => {
                e.dataTransfer.setData('text/plain', item.dataset.item);
                item.classList.add('dragging');
            });

            item.addEventListener('dragend', () => {
                item.classList.remove('dragging');
            });

            // Keyboard support
            item.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    // Implement keyboard drag and drop logic here
                    this.handleKeyboardDragDrop(item);
                }
            });

            // Touch support for mobile
            let touchStartX, touchStartY;
            
            item.addEventListener('touchstart', (e) => {
                const touch = e.touches[0];
                touchStartX = touch.clientX;
                touchStartY = touch.clientY;
                item.classList.add('dragging');
            });

            item.addEventListener('touchmove', (e) => {
                e.preventDefault();
                const touch = e.touches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                
                // Highlight drop zones
                dropZones.forEach(zone => zone.classList.remove('drag-over'));
                if (elementBelow && elementBelow.classList.contains('drop-zone')) {
                    elementBelow.classList.add('drag-over');
                }
            });

            item.addEventListener('touchend', (e) => {
                const touch = e.changedTouches[0];
                const elementBelow = document.elementFromPoint(touch.clientX, touch.clientY);
                
                item.classList.remove('dragging');
                dropZones.forEach(zone => zone.classList.remove('drag-over'));
                
                if (elementBelow && elementBelow.classList.contains('drop-zone')) {
                    this.handleDrop(elementBelow, item.dataset.item);
                }
            });
        });

        dropZones.forEach(zone => {
            zone.addEventListener('dragover', (e) => {
                e.preventDefault();
                zone.classList.add('drag-over');
            });

            zone.addEventListener('dragleave', () => {
                zone.classList.remove('drag-over');
            });

            zone.addEventListener('drop', (e) => {
                e.preventDefault();
                const data = e.dataTransfer.getData('text/plain');
                zone.classList.remove('drag-over');
                this.handleDrop(zone, data);
            });
        });
    }

    /**
     * Handle drop functionality
     */
    handleDrop(zone, itemText) {
        if (zone.textContent.trim() === 'Drop here' || zone.textContent.trim() === '') {
            zone.textContent = itemText;
            zone.classList.add('filled');
            
            // Remove the dragged item from the drag items container
            const dragItem = document.querySelector(`.drag-item[data-item="${itemText}"]`);
            if (dragItem) {
                dragItem.remove();
            }
            
            this.updateActivity();
        }
    }

    /**
     * Handle keyboard drag and drop (simplified implementation)
     */
    handleKeyboardDragDrop(item) {
        const dropZones = document.querySelectorAll('.drop-zone');
        const emptyZone = Array.from(dropZones).find(zone => 
            zone.textContent.trim() === 'Drop here' || zone.textContent.trim() === ''
        );
        
        if (emptyZone) {
            this.handleDrop(emptyZone, item.dataset.item);
        }
    }

    /**
     * Cleanup method for when the app is destroyed
     */
    cleanup() {
        if (this.autoSaveTimer) {
            clearInterval(this.autoSaveTimer);
        }
        if (this.heartbeatTimer) {
            clearInterval(this.heartbeatTimer);
        }
        
        // Final save before cleanup
        this.saveProgress();
    }
}

// Global instance
let book;

// Enhanced initialization
window.addEventListener('DOMContentLoaded', () => {
    book = new InteractiveBook();
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (book) {
        book.cleanup();
    }
});

/**
 * Enhanced confetti animation with better performance
 */
function showConfetti() {
    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#a2d2ff', '#ffcbf2', '#b4f8c8', '#ffd93d'];
    const confettiCount = 100;
    const animationDuration = 3000;
    
    for (let i = 0; i < confettiCount; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.style.position = 'fixed';
            confetti.style.width = Math.random() * 10 + 5 + 'px';
            confetti.style.height = confetti.style.width;
            confetti.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
            confetti.style.pointerEvents = 'none';
            confetti.style.zIndex = '9999';
            confetti.style.transition = `all ${animationDuration / 1000}s cubic-bezier(0.25, 0.46, 0.45, 0.94)`;
            confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
            
            document.body.appendChild(confetti);
            
            // Animate confetti
            setTimeout(() => {
                confetti.style.top = '100vh';
                confetti.style.left = `${parseFloat(confetti.style.left) + (Math.random() - 0.5) * 100}px`;
                confetti.style.transform = `rotate(${720 + Math.random() * 360}deg) scale(0)`;
                confetti.style.opacity = '0';
            }, 50);
            
            // Remove confetti
            setTimeout(() => {
                if (confetti.parentNode) {
                    confetti.remove();
                }
            }, animationDuration + 100);
        }, i * 20);
    }
}

/**
 * Enhanced keyboard navigation
 */
document.addEventListener('keydown', (e) => {
    if (!book || !book.chapters.length) return;
    
    // Prevent navigation if modals are open
    if (document.querySelector('.modal-overlay[style*="flex"]')) return;
    
    switch (e.key) {
        case 'ArrowLeft':
            e.preventDefault();
            book.showChapter(Math.max(0, book.currentChapter - 1));
            break;
        case 'ArrowRight':
            e.preventDefault();
            book.showChapter(Math.min(book.chapters.length - 1, book.currentChapter + 1));
            break;
        case 'Home':
            e.preventDefault();
            book.showChapter(0);
            break;
        case 'End':
            e.preventDefault();
            book.showChapter(book.chapters.length - 1);
            break;
    }
});

/**
 * Enhanced touch support for mobile devices
 */
let touchStartX = 0;
let touchEndX = 0;
let touchStartY = 0;
let touchEndY = 0;

document.addEventListener('touchstart', (e) => {
    if (document.querySelector('.modal-overlay[style*="flex"]')) return;
    
    touchStartX = e.changedTouches[0].screenX;
    touchStartY = e.changedTouches[0].screenY;
});

document.addEventListener('touchend', (e) => {
    if (document.querySelector('.modal-overlay[style*="flex"]')) return;
    
    touchEndX = e.changedTouches[0].screenX;
    touchEndY = e.changedTouches[0].screenY;
    handleSwipe();
});

function handleSwipe() {
    if (!book || !book.chapters.length) return;
    
    const swipeThreshold = 100;
    const diffX = touchStartX - touchEndX;
    const diffY = Math.abs(touchStartY - touchEndY);
    
    // Only process horizontal swipes (ignore vertical scrolling)
    if (Math.abs(diffX) > swipeThreshold && diffY < swipeThreshold * 0.5) {
        if (diffX > 0 && book.currentChapter < book.chapters.length - 1) {
            // Swipe left - next chapter
            book.showChapter(book.currentChapter + 1);
        } else if (diffX < 0 && book.currentChapter > 0) {
            // Swipe right - previous chapter
            book.showChapter(book.currentChapter - 1);
        }
    }
}

/**
 * Enhanced print functionality
 */
function printChapter() {
    const printContent = document.querySelector('.chapter.active');
    if (!printContent) {
        book.showCustomMessage('❌ No chapter content to print.', 'error');
        return;
    }

    const printWindow = window.open('', '_blank');
    const chapterTitle = book.chapters[book.currentChapter].title;
    
    printWindow.document.write(`
        <!DOCTYPE html>
        <html>
            <head>
                <title>ITQAN English Learning - ${chapterTitle}</title>
                <meta charset="UTF-8">
                <style>
                    body { 
                        font-family: 'Arial', sans-serif; 
                        margin: 20px; 
                        color: #000; 
                        line-height: 1.6;
                    }
                    .header {
                        text-align: center;
                        border-bottom: 2px solid #667eea;
                        padding-bottom: 20px;
                        margin-bottom: 30px;
                    }
                    .header h1 {
                        color: #667eea;
                        margin: 0;
                        font-size: 24px;
                    }
                    .header p {
                        color: #666;
                        margin: 10px 0 0 0;
                    }
                    h2, h3 { 
                        color: #333; 
                        margin-top: 25px;
                    }
                    .lesson-content, .question-container {
                        margin: 20px 0;
                        padding: 15px;
                        border: 1px solid #ddd;
                        border-radius: 8px;
                        page-break-inside: avoid;
                    }
                    .question { 
                        font-weight: bold; 
                        margin-bottom: 10px; 
                        color: #333;
                    }
                    .options { 
                        margin: 10px 0;
                    }
                    .option {
                        margin: 5px 0;
                        padding: 8px;
                        border: 1px solid #eee;
                        background-color: #f9f9f9;
                        border-radius: 5px;
                    }
                    .option.correct { 
                        background-color: #e6ffe6; 
                        border-color: #a3e6a3; 
                        font-weight: bold;
                    }
                    .option.incorrect { 
                        background-color: #ffe6e6; 
                        border-color: #e6a3a3; 
                    }
                    .feedback { 
                        margin-top: 10px; 
                        padding: 10px; 
                        border-radius: 5px; 
                        font-weight: bold;
                    }
                    .feedback.correct { 
                        background-color: #d4edda; 
                        color: #155724; 
                        border: 1px solid #c3e6cb; 
                    }
                    .feedback.incorrect { 
                        background-color: #f8d7da; 
                        color: #721c24; 
                        border: 1px solid #f5c6cb; 
                    }
                    input[type="text"] { 
                        border: 1px solid #ccc; 
                        padding: 5px; 
                        width: 80%; 
                        font-size: 14px;
                    }
                    .btn, .utility-buttons, .progress-bar, .score, .chapter-nav, .stats, .chapter-actions, .final-actions { 
                        display: none; 
                    }
                    .footer {
                        margin-top: 40px;
                        text-align: center;
                        font-size: 12px;
                        color: #666;
                        border-top: 1px solid #ddd;
                        padding-top: 20px;
                    }
                    @media print {
                        body { margin: 0; padding: 10mm; }
                        .header h1 { font-size: 20px; }
                        .question-container { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ITQAN Interactive English Learning Platform</h1>
                    <p>Student: ${book.userName} | ID: ${book.userItqanId}</p>
                    <p>Chapter: ${chapterTitle}</p>
                </div>
                ${printContent.innerHTML}
                <div class="footer">
                    <p>Printed on ${new Date().toLocaleDateString()} | ITQAN Institute</p>
                </div>
            </body>
        </html>
    `);
    
    printWindow.document.close();
    
    // Wait for content to load before printing
    setTimeout(() => {
        printWindow.print();
        printWindow.onafterprint = () => printWindow.close();
    }, 500);
    
    book.showCustomMessage('🖨️ Print dialog opened!', 'success');
}

/**
 * Exit confirmation functions
 */
function confirmExit() {
    book.isExiting = true;
    window.close();
}

function cancelExit() {
    const modal = document.getElementById('exitConfirmModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

