# AI Integrated Webchat

This project started as an existing real-time webchat application. The original webchat functionality was already built, and this version adds AI integration on top of it using Ollama.

## What It Does

- Provides real-time chat with Socket.IO.
- Stores recent chat messages with Firebase Firestore.
- Filters toxic messages in the browser with TensorFlow's toxicity model.
- Adds an `Ask Ollama` button that sends a message to a local Ollama model and displays the AI response in the chat.

## AI Integration

The AI feature runs through the Node.js server instead of calling Ollama directly from the browser. This keeps the browser code simple and lets the backend control the Ollama URL and model name.

By default, the app expects:

```text
OLLAMA_BASE_URL=http://127.0.0.1:11434
OLLAMA_MODEL=llama3.2
```

These values can be changed in a local `.env` file.

## Setup

Install dependencies:

```bash
npm install
```

Create a `.env` file from the example:

```bash
cp .env.example .env
```

Fill in the Firebase values in `.env`, then make sure Ollama is running locally and that the selected model is installed.

For example:

```bash
ollama pull llama3.2
ollama serve
```

Start the app:

```bash
node index.js
```

Then open:

```text
http://localhost:4000
```

## Environment Variables

The app uses `.env` for local configuration. The `.env` file is ignored by git so API keys and local settings are not committed.

Required Firebase values:

```text
FIREBASE_API_KEY=
FIREBASE_AUTH_DOMAIN=
FIREBASE_PROJECT_ID=
FIREBASE_STORAGE_BUCKET=
FIREBASE_MESSAGING_SENDER_ID=
FIREBASE_APP_ID=
FIREBASE_MEASUREMENT_ID=
```

Ollama values:

```text
OLLAMA_BASE_URL=
OLLAMA_MODEL=
```
