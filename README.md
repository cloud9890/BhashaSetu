<div align="center">
<img width="1200" height="475" alt="BhashaSetu Header" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# 🌏 BhashaSetu (भाषा सेतु)
### Bridging Indian Languages through Cultural AI & Contextual NLP

**BhashaSetu** is a production-grade NLP ecosystem designed specifically for the linguistic diversity of India. Unlike generic translators, BhashaSetu leverages the **Google Gemini 1.5/2.0 API** to provide context-aware translations, cultural idiom mapping, and specialized document handling.

> [!WARNING]
> **Project Status:** This application is currently in the **development phase**. It may not work properly and may encounter glitches. It is not intended for stable production use at this time.


---

## ✨ Key Features

### 📄 DocuBridge (PDF/DOCX Translation & Simplifier)
The powerhouse of the application. It provides two distinct modes:
- **Document Mode:** Upload complex PDF or Word documents. Gemini translates the content line-by-line while maintaining structural integrity. Output can be exported back to PDF.
- **Simplifier Mode:** Paste legal or medical jargon to receive a simplified version in your regional language, complete with "Key Term" breakdowns.

### 🏛️ Cultural Bridge
Goes beyond literal translation. It interprets cultural nuances, regional etiquette, and contextual meanings that traditional models miss.

### 🔀 Code-Switch Normalizer (Hinglish/Benglish)
Automatically detects and normalizes "code-switched" text (mixing English with regional languages) into formal, grammatically correct regional scripts.

### 🖖 Sign Language Vision
Use your camera to capture hand gestures. BhashaSetu analyzes the visual data in real-time to translate sign language into text and speech.

### 🎞️ Video Insight
Upload videos to extract intelligent summaries, identify key speakers, and generate multi-lingual insights directly from the footage.

### 🗺️ Dialect & Idiom Navigator
- **Dialect Detector:** Identifies and standardizes specific regional dialects.
- **Cultural Idioms:** Maps English proverbs to their exact cultural equivalents (e.g., finding the perfect Hindi/Assamese proverb for "A penny saved is a penny earned").

---

## 🛠️ Tech Stack

- **Framework:** React 19 + TypeScript
- **State Management:** Modular React Hooks Architecture
- **AI Core:** Google Gemini Pro / Flash API
- **Styling:** Tailwind CSS + Motion (for animations)
- **Icons:** Lucide React
- **Rendering:** React Markdown + Tailwind Typography

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- A Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/cloud9890/BhashaSetu.git
   cd BhashaSetu
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure Environment:**
   Create a `.env` file in the root directory and add your API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```

4. **Run Development Server:**
   ```bash
   npm run dev
   ```
   *The app will be available at http://localhost:3000*

---

## 📖 How to Use

1. **Select a Module:** Use the sidebar to choose between translation, docs, sentiment, or vision.
2. **Configure Settings:** Fine-tune length, domain (Legal/Medical), or target script in the configuration panel.
3. **Execute:** 
   - **Text:** Type and click "Execute".
   - **Voice:** Click the Microphone 🎤 icon for instant speech-to-text.
   - **Visuals:** Use the Camera 📷 icon to extract text from images or signs.
4. **Copy/Listen:** Use the action bar below the result to copy to clipboard or hear the output via high-quality TTS.

---

## 🏗️ Architecture

The app is built with extreme modularity to ensure maintainability:
- `/src/components`: UI split into `layout`, `features`, and `tabs`.
- `/src/hooks`: Encapsulated logic for Camera, Audio, History, and State.
- `/src/services`: Centralized Gemini AI orchestration.

---

## 📜 License
MIT License. Created by [cloud9890](https://github.com/cloud9890).
