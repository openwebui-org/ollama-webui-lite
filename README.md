# Ollama Web UI Lite 🦙

Ollama Web UI Lite is a streamlined version of the original OpenWebUI, designed to offer a simplified user interface with minimal features and reduced complexity. This fork is maintained by Robin Kroonen and focuses on achieving cleaner code through a full TypeScript migration, adopting a more modular architecture, ensuring comprehensive test coverage, and implementing a robust CI/CD pipeline.

## Features ⭐

The current version includes essential functionalities such as pulling and deleting models, engaging in conversations with one or multiple models, chat import/export, etc.

We are committed to maintaining this repository and progressively working through our to-do list to enhance its capabilities. The planned improvements include:

- **Code Cleanup:** Enhance readability and maintainability of the codebase.
- **Architectural Refactoring:** Implement a more modular architecture with a focus on component separation.
- **TypeScript Migration:** Fully migrate the codebase to TypeScript, providing complete type declarations.
- **Test Implementation:** Introduce a comprehensive suite of tests to ensure code reliability.
- **CI/CD Integration:** Establish a continuous integration and continuous deployment pipeline for automated testing and deployment.
- **Additional Features:** Add new features based on user requests.

## Installation 🚀

Before proceeding with the installation, ensure that you have the following prerequisites:

- Ollama (see [here](https://ollama.ai/)) running at http://localhost:11434. 
- Node.js
- npm

Follow these steps to set up Ollama-webui-lite:

1. Clone the repository:

   ```bash
   git clone https://github.com/kroonen/ollama-webui-lite.git
   cd ollama-webui-lite
   ```

2. Install the dependencies:

   ```bash
   npm ci
   ```

3. Run the application in development mode:

   ```bash
   npm run dev
   ```

   Ollama Web UI Lite now should be available at http://localhost:3000

![Preview](preview.png)

## License 📜

This project is licensed under the MIT License - see the LICENSE file for details. 📄

## Support 💬

If you have any questions, suggestions, or need assistance, please open an issue in the GitHub repository.

---

Maintained by Robin Kroonen
