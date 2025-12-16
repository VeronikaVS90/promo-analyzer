# PromoAnalyzer 📝

AI-powered promotional content analyzer with 10+ marketing features: EMV/CTR analysis, Benefits vs Features detection, PAS rating, Sales mistakes checker, SEO coverage, CTA optimizer, and more.

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Configure AI provider (choose one):

### Option 1: Ollama (FREE, Local) 🆓
```bash
# Install Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Pull a model (e.g., llama3.2)
ollama pull llama3.2

# In .env.local:
AI_PROVIDER=ollama
OLLAMA_URL=http://localhost:11434
OLLAMA_MODEL=llama3.2
```

### Option 2: Groq (FREE Tier) 🆓
```bash
# Get free API key from https://console.groq.com/
# In .env.local:
AI_PROVIDER=groq
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=llama-3.1-70b-versatile
```

### Option 3: OpenAI (Paid, but cheap)
```bash
# Get API key from https://platform.openai.com/api-keys
# In .env.local:
AI_PROVIDER=openai
OPENAI_API_KEY=sk-your_openai_key
OPENAI_MODEL=gpt-4o-mini  # cheapest option
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser.

## Features

- 🧠 **AI Headline Analysis** - EMV score, CTR prediction, alternative headlines
- 🎯 **Benefits vs Features Detector** - Color-coded highlighting, ratio analysis
- 🔥 **PAS Rating** - Problem → Agitation → Solution analysis
- 🔍 **Sales Mistakes Checker** - Long sentences, generic phrases, filler words
- 📊 **SEO Keyword Coverage** - Keywords extraction, LSI suggestions
- 📁 **File Upload** - Parse .pdf, .docx, .txt files
- 🧩 **AI Style Rewriter** - Rewrite in brand styles (Apple, Nike, Tesla, etc.)
- 📈 **Content Score Dashboard** - Overall content quality metrics
- 🧩 **CTA Optimizer** - AI-generated call-to-action suggestions
- 🌍 **Tone Switcher** - Convert between formal, friendly, expert, etc.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
