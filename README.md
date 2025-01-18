# Ollama WebUI

> [!IMPORTANT]
> **License Update**  
> Following the recent shift of Open WebUI toward a more restrictive model, this fork is now licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.  
> 
> **Important:** All modifications and additions to the codebase made **after commit `45b2ddb202f2ce7d6a1af21f8cfba05963f8199c`** are covered by AGPLv3. This change ensures that any further development remains genuinely open and shares improvements with the community.

A modern, streamlined interface for running local AI models.

[![GitHub repo size](https://img.shields.io/github/repo-size/OllamaUI/OllamaUI)](https://github.com/OllamaUI/OllamaUI)
[![Version](https://img.shields.io/github/package-json/v/OllamaUI/OllamaUI)](https://github.com/OllamaUI/OllamaUI/releases)
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
git clone https://github.com/openwebui-org/ollama-webui-community-lite.git
cd ollama-webui-community-lite
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

- [Kroonen.ai](https://kroonen.ai) - Independent research in AI systems and computational theory

## 🤝 Contributing

We welcome contributions that align with our vision of simplicity and efficiency. See our [Contributing Guidelines](CONTRIBUTING.md).

## 📖 License

MIT License - feel free to use and modify, but please credit the original work.

---

<div align="center">
<p>A community fork of Open WebUI.com</a> focusing on remaining a free as in freedom, integration with <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">Ollama</a>, maintained by <a href="https://kroonen.ai" target="_blank" rel="noopener noreferrer">a former contributor</a>.</p>
</div>
