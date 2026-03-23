import fetch from 'node-fetch';
import fs from 'fs';

const envFile = fs.readFileSync('.env.local', 'utf8');
const env = {};
envFile.split('\n').forEach(line => {
    const [key, ...values] = line.split('=');
    if (key && values) {
        env[key.trim()] = values.join('=').trim();
    }
});

const GROQ_KEY = env['GROQ_API_KEY'];
const GEMINI_KEY = env['GEMINIAI_API_KEY'];

async function testGroq() {
    console.log("Testing Groq...");
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`
        },
        body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: 'hola' }]
        })
    });
    console.log("Groq status:", res.status);
    if (!res.ok) {
        console.log("Groq error:", await res.text());
    } else {
        console.log("Groq success!");
    }
}

async function testGemini() {
    console.log("Testing Gemini...");
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: "hola" }] }]
        })
    });
    console.log("Gemini status:", res.status);
    if (!res.ok) {
        console.log("Gemini error:", await res.text());
    } else {
        console.log("Gemini success!");
    }
}

async function run() {
    await testGroq();
    await testGemini();
}
run();
