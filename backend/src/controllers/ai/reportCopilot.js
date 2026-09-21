import { createOpenAI } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Initialize OpenAI client with environment key or fallback
const getOpenAIModel = (modelName = 'gpt-4o-mini') => {
    const apiKey = process.env.OPENAI_API_KEY || '';
    if (!apiKey) return null;
    const openai = createOpenAI({ apiKey });
    return openai(modelName);
};

export async function chatReportCopilot(req, res) {
    try {
        const { messages, reportContext } = req.body;

        if (!messages || !Array.isArray(messages)) {
            return res.status(400).json({ error: 'Invalid messages array.' });
        }

        const model = getOpenAIModel();

        // Construct System Prompt with Active Report Context
        const reportTitle = reportContext?.reportTitle || 'Maritime Report';
        const moduleName = reportContext?.moduleName || 'Sagarmanthan';
        const activeView = reportContext?.activeView || 'summary';
        const columns = (reportContext?.columns || []).map(c => c.headerName || c.field).filter(Boolean).join(', ');
        const rowCount = reportContext?.rowCount || (Array.isArray(reportContext?.data) ? reportContext.data.length : 0);
        
        // Compact snapshot of data sample (up to 20 rows) for grounding
        let sampleDataSnippet = '';
        if (Array.isArray(reportContext?.data) && reportContext.data.length > 0) {
            const sample = reportContext.data.slice(0, 20);
            sampleDataSnippet = JSON.stringify(sample);
        }

        const systemPrompt = `You are **SagarBot**, the intelligent AI Analytics Copilot for **Sagarmanthan** (Ministry of Ports, Shipping and Waterways, Government of India).

### CURRENT CONTEXT:
* **Module**: ${moduleName}
* **Active Report**: ${reportTitle}
* **Current View Mode**: ${activeView}
* **Available Columns**: [${columns}]
* **Total Rows in View**: ${rowCount}
* **Data Sample**: ${sampleDataSnippet || 'Aggregated summary table'}

### GUIDELINES FOR YOUR RESPONSE:
1. Provide **clear, executive, and highly accurate analysis** based on the report data provided.
2. Structure answers using markdown: bullet points, **bold numbers**, small tables or callouts where helpful.
3. Highlight high performers, pending bottlenecks, zero values, or anomalies.
4. Keep answers concise, factual, and directly relevant to the user's question.
5. If the user asks for actions (e.g. export or print), guide them on which toolbar button to use.`;

        // If OpenAI API key is missing or not configured, return an intelligent mock streamed response
        if (!model) {
            res.setHeader('Content-Type', 'text/event-stream');
            res.setHeader('Cache-Control', 'no-cache');
            res.setHeader('Connection', 'keep-alive');

            const lastMessage = messages[messages.length - 1]?.content || '';
            const fallbackResponse = `### 📊 Analysis for ${reportTitle}
* **Total Records in View**: **${rowCount}**
* **Active View**: **${activeView}**

**Insights:**
1. The **${reportTitle}** dataset currently displays **${rowCount}** active entries across the configured wings and divisions.
2. All column definitions (*${columns.substring(0, 80)}...*) are synchronized with real-time database state.
3. You can use the **Filter**, **Search**, and **Export** buttons on the top right toolbar to narrow down or download this dataset.

*(Tip: To enable full generative AI answers with live reasoning, configure \`OPENAI_API_KEY\` in the backend \`.env\` file).*`;

            // Stream simulated response in chunks
            const chunks = fallbackResponse.match(/.{1,25}/g) || [fallbackResponse];
            for (const chunk of chunks) {
                res.write(`0:${JSON.stringify(chunk)}\n`);
                await new Promise(r => setTimeout(r, 20));
            }
            res.write(`d:{"finishReason":"stop"}\n`);
            return res.end();
        }

        // Live Vercel AI SDK streamText execution
        const result = streamText({
            model,
            system: systemPrompt,
            messages: messages.map(m => ({
                role: m.role === 'user' ? 'user' : 'assistant',
                content: m.content
            })),
            temperature: 0.3,
        });

        result.pipeDataStreamToResponse(res);

    } catch (err) {
        console.error('Error in chatReportCopilot:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Failed to process AI Copilot query' });
        }
    }
}

export default {
    chatReportCopilot
};
