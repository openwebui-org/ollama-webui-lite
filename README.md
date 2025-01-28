# LLaMa WebUI Lite

> [!IMPORTANT]  
> **License Update**  
> We have forked this project under the **GNU Affero General Public License v3.0 (AGPLv3)**.
>
> **Coverage:** All modifications and additions from commit `45b2ddb202f2ce7d6a1af21f8cfba05963f8199c` onward are licensed under AGPLv3.
>
> The original project changed from MIT to BSD-3. Our fork continues to uphold a stricter copyleft approach, ensuring that any improvements remain free for the community.

A modern, streamlined interface for running local AI models, maintained by [openwebui-org](https://github.com/openwebui-org).

[![GitHub repo size](https://img.shields.io/github/repo-size/openwebui-org/ollama-webui-lite)](https://github.com/openwebui-org/ollama-webui-lite)
[![Version](https://img.shields.io/github/package-json/v/openwebui-org/ollama-webui-lite)](https://github.com/openwebui-org/ollama-webui-lite/releases)
[![License: AGPL3](https://img.shields.io/badge/License-AGPLv3-blue.svg)](https://www.gnu.org/licenses/agpl-3.0)

![llama-webui-lite preview](https://openwebui.org/demo.png)

---

## Overview

**llama-webui Lite** was born from the original llama-webui (Now OPEN WEBUI) interface concept, focusing on a **clean, efficient** user experience. With an emphasis on local AI deployment, privacy, and streamlined performance, we aim to keep AI **open** and **accessible**.

---

## ✨ Key Features

1. **Simplicity First**

   - Clean, intuitive interface
   - Minimal overhead
   - Optimized for stability

2. **Vision Support**

   - LLaMA 3.2 Vision integration
   - Drag-and-drop image analysis
   - Seamless large vision model compatibility

3. **Privacy-Focused**
   - 100% local inference
   - Zero data collection
   - Your models, your rules

---

## 🚀 Quick Start

### Prerequisites

- [Ollama](https://ollama.ai/) v0.4.0+ (listening on `http://localhost:11434`)
- Node.js (LTS recommended)
- Yarn

### Setup

```bash
git clone https://github.com/openwebui-org/ollama-webui-lite.git
cd ollama-webui-lite
yarn install
yarn run dev
```

Visit `http://localhost:3000` in your browser to access the interface.

---

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

Once pulled, you can select the model in the UI.

---

## 🔧 Technical Details

- **Framework**: SvelteKit & TypeScript
- **Styling**: TailwindCSS
- **Streaming**: Real-time generation previews
- **Theme**: Dark/Light support
- **Responsive**: Works great on mobile

---

## 🌐 Part of Something Bigger

llama-webui Lite is one piece of a growing open-source AI ecosystem:

- [Ophelia.chat](https://ophelia.chat) – an AI companion in your pocket

- [Kroonen.ai](https://kroonen.ai) – independent AI research focused on computational theory

We believe collaboration fuels innovation, and we welcome synergy with other AI projects.

---

## 🤝 Contributing

Contributions are always welcome. Please see [CONTRIBUTING.md](CONTRIBUTING.md) for more details on submitting pull requests, reporting issues, or suggesting improvements.

---

## 📖 License

This project is licensed under the **GNU Affero General Public License v3.0 (AGPLv3)**.  
Please note that **all new changes** to this fork must also comply with the AGPLv3’s copyleft provisions.

---

<div align="center">
  <sub>
    This community-driven project is maintained by the <strong>OPEN WEBUI</strong> foundation to ensure it remains dedicated to free and open AI tools.<br/>
    &copy; 2025 OPEN WEBUI
  </sub>
</div>
