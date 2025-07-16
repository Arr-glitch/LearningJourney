📚 Interactive English Learning Book
This project is an interactive web-based English learning application designed to help users practice grammar, vocabulary, and reading comprehension at an intermediate (B1) English proficiency level. It features multiple types of questions, progress tracking, and a clean, responsive user interface.

✨ Features
Chapter-based Learning: Content is organized into chapters, allowing for structured learning progression.

Diverse Question Types: Includes:

Multiple Choice: Select the correct answer from given options.

Fill-in-the-Blank: Type in the missing word or phrase.

Drag-and-Drop: Arrange words to form correct sentences.

Reading Comprehension: Read a passage and answer related questions.

Dynamic Content Loading: Questions and lessons are loaded from a content.json file, making it easy to update or expand content without modifying the core application logic.

Progress Tracking: Keeps track of total questions, correct answers, accuracy, and chapters completed.

Persistence: Saves and loads user progress locally in the browser (using localStorage).

Export Progress: Allows users to export their progress as a JSON file.

Responsive Design: Optimized for various screen sizes, from mobile devices to desktops.

Intuitive Navigation: Easy chapter navigation via buttons, keyboard arrow keys, and touch gestures (swipes).

Print Functionality: Users can print the current chapter's content for offline study.

Visual Feedback: Provides immediate feedback on answers (correct/incorrect) and a fun confetti animation for correct answers.

📁 Project Structure
The project is structured for clarity and maintainability, separating HTML, CSS, and JavaScript into their respective files.

english-learning-book/
├── index.html          # Main HTML file for the application structure.
├── style.css           # All CSS rules for styling the application.
├── script.js           # Core JavaScript logic for interactivity, content handling, and progress.
├── content.json        # JSON file containing all chapters, lessons, and questions.
└── images/             # Directory for image assets.
    └── images (2).png  # The ITQAN Institute logo.

🚀 How to Run Locally
To run this project on your local machine:

Clone the repository (or download the files) to your computer.

Navigate to the project directory.

Open the index.html file in your web browser.

Note: Due to browser security restrictions (CORS), directly opening index.html might prevent script.js from fetching content.json if you're using a file:// URL. For local development, it's recommended to use a simple local web server (e.g., Python's http.server or Node.js's serve).

Using Python:

cd path/to/english-learning-book
python -m http.server 8000

Then open http://localhost:8000 in your browser.

Using Node.js (if you have serve installed):

cd path/to/english-learning-book
npx serve .

Then open the provided URL (usually http://localhost:3000).

🌐 How to Deploy on GitHub Pages
You can easily host this interactive book for free using GitHub Pages.

Create a New GitHub Repository:

Go to GitHub and create a new public repository (e.g., english-learning-book). Do not initialize it with a README or other files.

Upload Project Files:

Place all the project files (index.html, style.css, script.js, content.json, and the images folder with its content) into the root directory of your local repository.

Push these files to your new GitHub repository.

git init
git add .
git commit -m "Initial commit of English learning book"
git branch -M main # Renames your branch to 'main' if it's 'master'
git remote add origin https://github.com/YOUR_USERNAME/your-repo-name.git
git push -u origin main

(Replace YOUR_USERNAME and your-repo-name with your actual GitHub details.)

Enable GitHub Pages:

On GitHub, navigate to your repository.

Click on the Settings tab.

In the left sidebar, click on Pages.

Under "Build and deployment," select Deploy from a branch for the "Source."

For the "Branch," choose main (or master if that's your branch name) and select the /(root) folder.

Click Save.

Access Your Live Site:

After a few moments (it might take 1-5 minutes for GitHub Pages to build), refresh the "Pages" section.

You will see a link indicating that your site is published at https://YOUR_USERNAME.github.io/your-repo-name/. Click this link to access your live interactive English learning book!

🤝 Contributing
Feel free to fork this repository, suggest improvements, or add more chapters and questions to the content.json file.

📄 License
This project is open-source and available under the MIT License.
