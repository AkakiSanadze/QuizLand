document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const homePage = document.getElementById('home-page');
    const quizPage = document.getElementById('quiz-page');
    const resultsPage = document.getElementById('results-page');
    const startQuizBtn = document.getElementById('start-quiz-btn');
    const prevBtn = document.getElementById('prev-btn');
    const nextBtn = document.getElementById('next-btn');
    const finishBtn = document.getElementById('finish-btn');
    const questionText = document.getElementById('question-text');
    const optionsContainer = document.getElementById('options-container');
    const textAnswerContainer = document.getElementById('text-answer-container');
    const textAnswerInput = document.getElementById('text-answer');
    const questionCounter = document.getElementById('question-counter');
    const timerElement = document.getElementById('timer');
    const finalScoreElement = document.getElementById('final-score');
    const correctCountElement = document.getElementById('correct-count');
    const incorrectCountElement = document.getElementById('incorrect-count');
    const reviewContainer = document.getElementById('review-container');
    const restartQuizBtn = document.getElementById('restart-quiz-btn');
    const backToHomeBtn = document.getElementById('back-to-home-btn');

    // Quiz Variables
    let allQuestions = []; // To store all questions from JSON
    let quizQuestions = []; // To store the 12 selected questions for the current quiz
    let currentQuestionIndex = 0;
    let userAnswers = []; // Stores answers for the current quiz [{ questionId: id, answer: value }, ...]
    let score = 0;
    let timer;
    let timeLeft = 0;
    const TIME_PER_QUESTION = 30; // Seconds per question
    const QUESTIONS_PER_QUIZ = 12;

    // --- Initialization ---

    // Fetch questions from JSON file
    async function loadAllQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allQuestions = await response.json();
            console.log(`Successfully loaded ${allQuestions.length} questions.`);
            // Initialize userAnswers array structure based on all questions
            userAnswers = new Array(allQuestions.length).fill(null);
            startQuizBtn.disabled = false; // Enable start button after loading
            startQuizBtn.textContent = 'ქვიზის დაწყება';
        } catch (error) {
            console.error("Could not load questions:", error);
            homePage.innerHTML += '<p style="color: red;">შეკითხვების ჩატვირთვა ვერ მოხერხდა. გთხოვთ, სცადოთ მოგვიანებით.</p>';
            startQuizBtn.disabled = true;
            startQuizBtn.textContent = 'ჩატვირთვის შეცდომა';
        }
    }

    // Shuffle array in place (Fisher-Yates)
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
    }

    // --- Quiz Flow ---

    function startQuiz() {
        if (allQuestions.length === 0) {
            console.error("Cannot start quiz, no questions loaded.");
            return;
        }
        console.log("Starting quiz...");
        // Shuffle and select questions
        shuffleArray(allQuestions);
        quizQuestions = allQuestions.slice(0, Math.min(QUESTIONS_PER_QUIZ, allQuestions.length)); // Select 12 or fewer if not enough questions

        currentQuestionIndex = 0;
        userAnswers = new Array(quizQuestions.length).fill(null); // Reset answers for the selected questions
        score = 0;

        homePage.classList.remove('active');
        resultsPage.classList.remove('active');
        quizPage.classList.add('active');

        loadQuestion();
    }

    function loadQuestion() {
        if (currentQuestionIndex < 0 || currentQuestionIndex >= quizQuestions.length) {
            console.error("Invalid question index:", currentQuestionIndex);
            return; // Should not happen
        }

        const question = quizQuestions[currentQuestionIndex];
        console.log("Loading question", currentQuestionIndex, question);

        // Reset timer
        clearInterval(timer);
        timeLeft = TIME_PER_QUESTION;
        updateTimerDisplay();
        startTimer();

        // Display question
        questionText.textContent = question.question;
        questionCounter.textContent = `შეკითხვა ${currentQuestionIndex + 1}/${quizQuestions.length}`;

        // Clear previous options and hide text input
        optionsContainer.innerHTML = '';
        textAnswerContainer.style.display = 'none';
        textAnswerInput.value = '';

        // Restore previous answer if exists
        const previousAnswer = userAnswers[currentQuestionIndex];

        // Create options or text input
        if (question.type === 'single' || question.type === 'multiple') {
            question.options.forEach((option, index) => {
                const button = document.createElement('button');
                button.className = 'option-btn';
                button.textContent = option;
                button.dataset.index = index; // Store index for multiple choice answers
                button.addEventListener('click', () => selectOption(button, index, question.type));

                // Highlight previously selected answer(s)
                if (question.type === 'single' && previousAnswer === index) {
                    button.classList.add('selected');
                } else if (question.type === 'multiple' && Array.isArray(previousAnswer) && previousAnswer.includes(index)) {
                    button.classList.add('selected');
                }

                optionsContainer.appendChild(button);
            });
        } else if (question.type === 'text') {
            textAnswerContainer.style.display = 'block';
            textAnswerInput.value = previousAnswer || ''; // Restore text answer
            textAnswerInput.oninput = () => saveCurrentAnswer(); // Save text as user types
        }

        // Update navigation buttons
        prevBtn.disabled = currentQuestionIndex === 0;
        nextBtn.style.display = currentQuestionIndex < quizQuestions.length - 1 ? 'inline-block' : 'none';
        finishBtn.style.display = currentQuestionIndex === quizQuestions.length - 1 ? 'inline-block' : 'none';
    }

    function selectOption(button, index, type) {
        if (type === 'single') {
            // Deselect other options
            const buttons = optionsContainer.querySelectorAll('.option-btn');
            buttons.forEach(btn => btn.classList.remove('selected'));
            // Select clicked option
            button.classList.add('selected');
            userAnswers[currentQuestionIndex] = index; // Store index of selected answer
        } else if (type === 'multiple') {
            button.classList.toggle('selected');
            // Get all selected indices
            const selectedIndices = [];
            const buttons = optionsContainer.querySelectorAll('.option-btn.selected');
            buttons.forEach(btn => selectedIndices.push(parseInt(btn.dataset.index)));
            userAnswers[currentQuestionIndex] = selectedIndices.length > 0 ? selectedIndices : null; // Store array of indices or null
        }
        console.log("User answers:", userAnswers);
    }

    function saveCurrentAnswer() {
        const question = quizQuestions[currentQuestionIndex];
        if (!question) return;

        if (question.type === 'text') {
            userAnswers[currentQuestionIndex] = textAnswerInput.value.trim() || null;
        }
        // For single/multiple, answers are saved in selectOption
        console.log("User answers (after save):", userAnswers);
    }

    function prevQuestion() {
        if (currentQuestionIndex > 0) {
            saveCurrentAnswer(); // Save answer before moving
            currentQuestionIndex--;
            loadQuestion();
        }
    }

    function nextQuestion() {
        if (currentQuestionIndex < quizQuestions.length - 1) {
            saveCurrentAnswer(); // Save answer before moving
            currentQuestionIndex++;
            loadQuestion();
        }
    }

    function finishQuiz() {
        clearInterval(timer); // Stop timer
        saveCurrentAnswer(); // Save the last answer
        calculateScore();
        displayResults();
        saveResultsToLocalStorage();

        quizPage.classList.remove('active');
        resultsPage.classList.add('active');
    }

    // --- Timer ---

    function startTimer() {
        timer = setInterval(() => {
            timeLeft--;
            updateTimerDisplay();
            if (timeLeft <= 0) {
                clearInterval(timer);
                handleTimeUp();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        timerElement.textContent = `დრო: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        // Optional: Change color when time is low
        timerElement.style.color = timeLeft <= 10 ? '#e74c3c' : '#333'; // Red when 10s or less
    }

    function handleTimeUp() {
        console.log("Time's up for question", currentQuestionIndex);
        // Mark question as unanswered or incorrect (implicitly score 0)
        // Move to next question or finish if it's the last one
        if (currentQuestionIndex < quizQuestions.length - 1) {
            nextQuestion();
        } else {
            finishQuiz();
        }
    }

    // --- Results ---

    function calculateScore() {
        score = 0;
        let correctCount = 0;
        let incorrectCount = 0;

        quizQuestions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            let isCorrect = false;

            if (question.type === 'single') {
                isCorrect = userAnswer === question.options.indexOf(question.correctAnswer);
            } else if (question.type === 'multiple') {
                // Ensure both arrays exist, have the same length, and contain the same elements (regardless of order)
                const correctIndices = question.correctAnswers; // Assuming correctAnswers are indices
                if (Array.isArray(userAnswer) && Array.isArray(correctIndices)) {
                    isCorrect = userAnswer.length === correctIndices.length &&
                                userAnswer.every(ansIdx => correctIndices.includes(ansIdx)) &&
                                correctIndices.every(corrIdx => userAnswer.includes(corrIdx));
                } else {
                    isCorrect = false; // No answer or incorrect format
                }
            } else if (question.type === 'text') {
                // Case-insensitive and trim whitespace comparison
                isCorrect = typeof userAnswer === 'string' &&
                            userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
            }

            if (isCorrect) {
                score += question.points || 0; // Add points if correct
                correctCount++;
            } else {
                incorrectCount++;
            }
        });

        // Update global score and counts (or return them)
        finalScoreElement.textContent = score;
        correctCountElement.textContent = correctCount;
        incorrectCountElement.textContent = incorrectCount;
    }

    function displayResults() {
        reviewContainer.innerHTML = '<h3>შეკითხვების მიმოხილვა:</h3>'; // Clear previous review

        quizQuestions.forEach((question, index) => {
            const userAnswer = userAnswers[index];
            let userAnswerText = 'პასუხი არ არის';
            let isCorrect = false;
            let correctAnswerText = '';

            // Determine correctness and format answers for display
            if (question.type === 'single') {
                const correctIndex = question.options.indexOf(question.correctAnswer);
                isCorrect = userAnswer === correctIndex;
                correctAnswerText = question.correctAnswer;
                if (userAnswer !== null) {
                    userAnswerText = question.options[userAnswer];
                }
            } else if (question.type === 'multiple') {
                const correctIndices = question.correctAnswers;
                 if (Array.isArray(userAnswer) && Array.isArray(correctIndices)) {
                    isCorrect = userAnswer.length === correctIndices.length &&
                                userAnswer.every(ansIdx => correctIndices.includes(ansIdx)) &&
                                correctIndices.every(corrIdx => userAnswer.includes(corrIdx));
                    userAnswerText = userAnswer.map(idx => question.options[idx]).join(', ');
                } else if (userAnswer !== null) {
                     userAnswerText = Array.isArray(userAnswer) ? userAnswer.map(idx => question.options[idx]).join(', ') : 'არასწორი ფორმატი';
                }
                correctAnswerText = correctIndices.map(idx => question.options[idx]).join(', ');

            } else if (question.type === 'text') {
                 isCorrect = typeof userAnswer === 'string' &&
                             userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
                 correctAnswerText = question.correctAnswer;
                 if (userAnswer !== null) {
                    userAnswerText = userAnswer;
                 }
            }

            // Create review item
            const reviewItem = document.createElement('div');
            reviewItem.classList.add('review-item');
            reviewItem.classList.add(isCorrect ? 'correct' : 'incorrect');

            let reviewHTML = `
                <p><strong>შეკითხვა ${index + 1}:</strong> ${question.question}</p>
                <p><strong>თქვენი პასუხი:</strong> ${userAnswerText}</p>
            `;
            if (!isCorrect) {
                reviewHTML += `<p><strong>სწორი პასუხი:</strong> ${correctAnswerText}</p>`;
                if (question.explanation) {
                    reviewHTML += `<p><strong>განმარტება:</strong> ${question.explanation}</p>`;
                }
            }
             reviewHTML += `<p><strong>ქულა:</strong> ${isCorrect ? (question.points || 0) : 0}</p>`;


            reviewItem.innerHTML = reviewHTML;
            reviewContainer.appendChild(reviewItem);
        });
    }

     function saveResultsToLocalStorage() {
        const results = {
            score: score,
            correctCount: parseInt(correctCountElement.textContent),
            incorrectCount: parseInt(incorrectCountElement.textContent),
            timestamp: new Date().toISOString()
        };
        try {
            localStorage.setItem('quizLandLastResult', JSON.stringify(results));
            console.log("Results saved to localStorage:", results);
        } catch (e) {
            console.error("Could not save results to localStorage:", e);
        }
    }

    // --- Navigation from Results ---

    function restartQuiz() {
        // Simply go back to the start function which re-shuffles and resets
        startQuiz();
    }

    function backToHome() {
        resultsPage.classList.remove('active');
        quizPage.classList.remove('active');
        homePage.classList.add('active');
        // Optionally display last score from localStorage here
    }


    // --- Event Listeners ---
    startQuizBtn.addEventListener('click', startQuiz);
    prevBtn.addEventListener('click', prevQuestion);
    nextBtn.addEventListener('click', nextQuestion);
    finishBtn.addEventListener('click', finishQuiz);
    restartQuizBtn.addEventListener('click', restartQuiz);
    backToHomeBtn.addEventListener('click', backToHome);

    // --- Initial Load ---
    startQuizBtn.disabled = true; // Disable until questions are loaded
    startQuizBtn.textContent = 'შეკითხვების ჩატვირთვა...';
    loadAllQuestions(); // Load questions when the DOM is ready

    console.log("Quiz application script fully loaded and initialized.");
});
