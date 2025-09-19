// OpenRouter API Configuration and Usage Guide
// Your API key is stored in .env file (keep it secure!)

class OpenRouterAPI {
    constructor() {
        // Load API key from environment or .env file
        this.apiKey = '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';
        this.baseURL = 'https://openrouter.ai/api/v1';
    }

    // FREE MODELS (No cost, but rate limited)
    getFreeModels() {
        return {
            'meta-llama/llama-3.1-405b-instruct:free': 'Llama 3.1 405B (Best free model)',
            'meta-llama/llama-3.1-8b-instruct:free': 'Llama 3.1 8B (Fast, efficient)',
            'meta-llama/llama-3.2-3b-instruct:free': 'Llama 3.2 3B (Very fast)',
            'google/gemma-2-9b-it:free': 'Gemma 2 9B (Google)',
            'mistralai/mistral-7b-instruct:free': 'Mistral 7B (Good balance)',
            'microsoft/phi-3-mini-128k-instruct:free': 'Phi-3 Mini (Microsoft)',
            'huggingface/zephyr-7b-beta:free': 'Zephyr 7B (Instruction tuned)'
        };
    }

    // Example: Content filtering for 4chan posts
    async filterContent(postText, model = 'meta-llama/llama-3.1-8b-instruct:free') {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': '4chan TTS Reader'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: 'user',
                        content: `Rate this 4chan post for appropriateness on a scale of 1-10 (10=completely safe, 1=inappropriate). Only respond with the number and a brief reason:\n\n"${postText}"`
                    }],
                    max_tokens: 50,
                    temperature: 0.1
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenRouter API Error:', error);
            return null;
        }
    }

    // NEW: Analyze post tone and suggest music/voice settings
    async analyzeTone(postText, model = 'meta-llama/llama-3.1-405b-instruct:free') {
        try {
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': '4chan TTS Reader'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: 'user',
                        content: `Analyze this 4chan post and respond with ONLY a JSON object containing tone analysis:\n\n"${postText}"\n\nFormat: {"mood": "angry/sad/happy/neutral/excited/sarcastic/serious", "energy": "low/medium/high", "voice_style": "deep/normal/high/robotic/dramatic", "music_genre": "ambient/electronic/rock/classical/none", "tempo": "slow/medium/fast"}`
                    }],
                    max_tokens: 150,
                    temperature: 0.3
                })
            });

            const data = await response.json();
            try {
                return JSON.parse(data.choices[0].message.content);
            } catch {
                // Fallback if JSON parsing fails
                return {
                    mood: 'neutral',
                    energy: 'medium',
                    voice_style: 'normal',
                    music_genre: 'ambient',
                    tempo: 'medium'
                };
            }
        } catch (error) {
            console.error('Tone Analysis Error:', error);
            return null;
        }
    }

    // Example: Summarize thread
    async summarizeThread(posts, model = 'meta-llama/llama-3.1-405b-instruct:free') {
        try {
            const threadText = posts.slice(0, 10).join('\n\n'); // Limit to first 10 posts
            
            const response = await fetch(`${this.baseURL}/chat/completions`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': window.location.origin,
                    'X-Title': '4chan TTS Reader'
                },
                body: JSON.stringify({
                    model: model,
                    messages: [{
                        role: 'user',
                        content: `Summarize this 4chan thread in 2-3 sentences. Focus on the main topic and key points:\n\n${threadText}`
                    }],
                    max_tokens: 150,
                    temperature: 0.3
                })
            });

            const data = await response.json();
            return data.choices[0].message.content;
        } catch (error) {
            console.error('OpenRouter API Error:', error);
            return null;
        }
    }

    // Check your usage and credits
    async getUsageInfo() {
        try {
            const response = await fetch(`${this.baseURL}/auth/key`, {
                headers: {
                    'Authorization': `Bearer ${this.apiKey}`
                }
            });
            return await response.json();
        } catch (error) {
            console.error('Failed to get usage info:', error);
            return null;
        }
    }
}

// Usage example:
// const openRouter = new OpenRouterAPI();
// const summary = await openRouter.summarizeThread(threadPosts);
// const safety = await openRouter.filterContent(postText);

// Export for use in your main script
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OpenRouterAPI;
} else {
    window.OpenRouterAPI = OpenRouterAPI;
}