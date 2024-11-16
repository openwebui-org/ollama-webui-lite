# OllamaUI

A modern, streamlined interface for running local AI models. Part of the ArtyLLaMa ecosystem.

[![GitHub repo size](https://img.shields.io/github/repo-size/ArtyLLaMa/OllamaUI)](https://github.com/ArtyLLaMa/OllamaUI)
[![Version](https://img.shields.io/github/package-json/v/ArtyLLaMa/OllamaUI)](https://github.com/ArtyLLaMa/OllamaUI/releases)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

![image](https://github.com/user-attachments/assets/757a2b14-1524-4ecc-9ac6-f83015ee62bc)

## Overview

OllamaUI represents our original vision for a clean, efficient interface to Ollama models. We focus on delivering essential functionality through a lean, stable interface that prioritizes user experience and performance.

## ✨ Key Features

- **Simplicity First**

  - Clean, intuitive interface
  - Focus on essential features
  - Optimized performance

- **Vision Support**

  - Full LLaMA 3.2 Vision integration
  - Drag-and-drop image analysis
  - Support for large vision models

- **Privacy-Focused**
  - Runs completely locally
  - No data collection
  - Your models, your control

## 🚀 Quick Start

### Prerequisites

- [Ollama](https://ollama.ai/) v0.4.0+ running on `http://localhost:11434`
- Node.js (LTS)
- Yarn

### Setup

```bash
git clone https://github.com/ArtyLLaMa/OllamaUI.git
cd OllamaUI
yarn install
yarn run dev
```

Access OllamaUI at `http://localhost:3000`

## 👁️ Vision Models

### Supported Models

| Model               | VRAM  | Features               |
| ------------------- | ----- | ---------------------- |
| llama3.2-vision     | 8GB+  | Image analysis, OCR    |
| llama3.2-vision:90b | 64GB+ | Enhanced understanding |

### Quick Setup

```bash
ollama pull llama3.2-vision
```

## 🔧 Technical Details

- Built with SvelteKit & TypeScript
- Styled using TailwindCSS
- Real-time streaming support
- Dark/Light theme
- Mobile-responsive design

## 🌐 Part of Something Bigger

OllamaUI is part of a broader ecosystem of AI tools and research:

- [ArtyLLaMa](https://artyllama.com) - AI-powered creative platform featuring artifact generation and multi-model support
- [Kroonen.ai](https://kroonen.ai) - Independent research in AI systems and computational theory

## 🤝 Contributing

We welcome contributions that align with our vision of simplicity and efficiency. See our [Contributing Guidelines](CONTRIBUTING.md).

## 📖 License

MIT License - feel free to use and modify, but please credit the original work.

---

<div align="center">
  <p>Built with ✨ by <a href="https://kroonen.ai">Robin Kroonen</a></p>
  <p>Where innovation inspires innovation</p>
  <p><sub>Part of the <a href="https://artyllama.com">ArtyLLaMa</a> ecosystem</sub></p>
</div>
