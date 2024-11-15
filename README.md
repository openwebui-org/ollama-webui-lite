# OllamaUI

A streamlined, open-source client for Ollama models with LLaMA 3.2 Vision support.

[![GitHub repo size](https://img.shields.io/github/repo-size/ArtyLLaMa/OllamaUI)](https://github.com/ArtyLLaMa/OllamaUI)
[![Version](https://img.shields.io/github/package-json/v/ArtyLLaMa/OllamaUI)](https://github.com/ArtyLLaMa/OllamaUI/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

OllamaUI is a refined fork of Ollama-WebUI, optimized for seamless Ollama integration while maintaining a focus on simplicity and efficiency. Our platform delivers a lean, stable interface that prioritizes essential functionality without unnecessary complexity.

## Key Features

- **Model Management**
  - Effortless model pulling and removal
  - Multi-model conversation support
  - Performance metrics tracking

- **Chat Capabilities**
  - Real-time message streaming
  - Chat history import/export
  - Mobile-responsive interface

- **Vision Model Integration**
  - Support for LLaVA and LLaMA 3.2 Vision models
  - Drag-and-drop image upload
  - Advanced image analysis capabilities

## Getting Started

### Prerequisites

- [Ollama](https://ollama.ai/) (v0.1.17+) running on `http://localhost:11434`
- Node.js (latest LTS version)
- Yarn package manager

### Installation

1. Clone the repository
```bash
git clone https://github.com/ArtyLLaMa/OllamaUI.git
cd OllamaUI
```

2. Install dependencies
```bash
yarn install
```

3. Launch development server
```bash
yarn dev
```

Access the application at `http://localhost:3000`

## Vision Model Support

### Compatible Models

| Model | VRAM Requirements | Capabilities |
|-------|------------------|--------------|
| llama3.2-vision | 8GB+ | Image analysis, OCR |
| llama3.2-vision:90b | 64GB+ | Enhanced image understanding, Advanced OCR |

### Setup Instructions

1. Install a vision-capable model:
```bash
ollama pull llama3.2-vision
```

2. Select the model from the UI dropdown
3. Upload images via the interface or drag-and-drop
4. Begin your image analysis session

## Technical Stack

- **Frontend**: SvelteKit, TypeScript
- **Styling**: TailwindCSS
- **Features**:
  - Dark/Light theme support
  - Responsive design
  - Real-time streaming
  - Performance monitoring

## Contributing

We welcome contributions that align with our philosophy of simplicity and efficiency.

1. Fork the repository
2. Create a feature branch
3. Implement your changes
4. Add relevant tests
5. Submit a pull request

Please review our [Contributing Guidelines](CONTRIBUTING.md) for detailed information.

## Related Projects

- [ArtyLLaMa](https://github.com/ArtyLLaMa/ArtyLLaMa) - AI-Powered Creative Platform

## Support

- Create an issue in this repository
- Visit our [main project page](https://github.com/ArtyLLaMa)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">
© 2024 Robin Kroonen | <a href="https://kroonen.ai">kroonen.ai</a><br>
Independent Research in AI Systems and Computational Theory
</div>
