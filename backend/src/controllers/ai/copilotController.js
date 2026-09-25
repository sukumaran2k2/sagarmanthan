import dotenv from 'dotenv';
dotenv.config();

let OpenAIClass = null;
async function getOpenAIClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!OpenAIClass) {
    const mod = await import('openai');
    OpenAIClass = mod.default;
  }
  return new OpenAIClass({ apiKey: process.env.OPENAI_API_KEY });
}

const MINISTRY_SYSTEM_PROMPT = `You are SagarBot AI Copilot - the real-time Ministry Intelligence assistant for Sagarmanthan (Ministry of Ports, Shipping and Waterways, Government of India).

You analyze questions about:
- Maritime India Vision (MIV) 2030 - interventions, milestones, and targets
- Port compliance - 15 exclusive data modules submission status across 9 major port authorities
- GEM procurement - GeM portal transaction compliance and thresholds
- Court Cases and Arbitrations - disposed vs pending across port authorities
- Project Tracking - 48 active projects, delays, on-track, and KPIs
- Young Professionals (YP) - KPI submissions and review schedules
- Capex Utilization - expenditure vs allocation and variance
- CSR Projects - fund allocation, progress, and status

RULES:
1. Always return strictly valid JSON only - no extra text, no markdown fences.
2. Use real-sounding but reasonable placeholder data when actual DB data is unavailable.
3. Infer the best visualization type from the question:
   - Comparisons -> bar chart
   - Time series / trends -> line chart
   - Breakdowns / composition -> pie chart
   - Lists / records -> table
   - Simple single-point answer -> none
4. Always provide 2-4 suggestedFollowUps.

Return ONLY this exact JSON schema (all fields optional except summary):
{
  "summary": "string - executive analytical narrative",
  "keyMetrics": [{ "label": "string", "value": "string or number", "trend": "string", "status": "positive or negative or neutral" }],
  "visualizationType": "bar or line or pie or area or table or none",
  "chartConfig": {
    "title": "string",
    "xAxisKey": "string",
    "dataKeys": [{ "key": "string", "label": "string", "color": "string" }],
    "data": [{}]
  },
  "tableConfig": {
    "title": "string",
    "headers": ["string"],
    "rows": [["string or number"]]
  },
  "suggestedFollowUps": ["string"]
}`;

function getOrgSystemPrompt(portName) {
  return `You are SagarBot AI Copilot - the real-time Port Intelligence assistant for ${portName} Port Authority on the Sagarmanthan portal.

You answer questions about:
- 15 exclusive data modules compliance status for ${portName}
- Capex utilization - actual spend vs target and variance
- GEM Works data upload status and procurement compliance
- Court Cases and Arbitrations - active, disposed, pending
- CSR Project progress, fund allocation, and beneficiary count
- HR and staffing metrics - sanctioned vs actual posts
- MIV 2030 interventions and targets for ${portName}

RULES:
1. Always return strictly valid JSON only - no extra text, no markdown fences.
2. Use ${portName}-specific realistic data when actual DB data is unavailable.
3. Infer the best visualization type (bar, line, pie, area, table, none) from the question.
4. Always provide 2-4 suggestedFollowUps.

Return ONLY this exact JSON schema:
{
  "summary": "string",
  "keyMetrics": [{ "label": "string", "value": "string or number", "trend": "string", "status": "positive or negative or neutral" }],
  "visualizationType": "bar or line or pie or area or table or none",
  "chartConfig": {
    "title": "string",
    "xAxisKey": "string",
    "dataKeys": [{ "key": "string", "label": "string", "color": "string" }],
    "data": [{}]
  },
  "tableConfig": {
    "title": "string",
    "headers": ["string"],
    "rows": [["string or number"]]
  },
  "suggestedFollowUps": ["string"]
}`;
}

function generateMockResponse(query, portName) {
  const q = (query || '').toLowerCase().trim();
  const cleaned = q.replace(/[^\w\s]/g, '').trim();
  const port = portName || 'All Ports';

  const greetings = [
    'hi', 'hai', 'hello', 'hey', 'helo', 'hlo', 'hy', 'namaste',
    'good morning', 'good afternoon', 'good evening',
    'who are you', 'what can you do', 'help', 'thanks', 'thank you', 'tq', 'thx'
  ];

  if (greetings.includes(cleaned) || (cleaned.split(' ').length <= 2 && greetings.some(g => cleaned.startsWith(g)))) {
    return {
      summary: `Hello! 👋 Welcome to **SagarBot AI Copilot**.\n\nI am your real-time Ministry Intelligence assistant for Sagarmanthan. You can ask me about Maritime India Vision 2030 milestones, port compliance submissions, GEM procurement progress, active court cases, or project health.`,
      keyMetrics: [],
      visualizationType: 'none',
      suggestedFollowUps: [
        'How many court cases are currently active?',
        'Show Capex utilization vs targets',
        'What is the GEM procurement compliance status?',
        'Show MIV 2030 interventions status'
      ]
    };
  }

  if (q.includes('court') || q.includes('case') || q.includes('arbitration') || q.includes('legal')) {
    return {
      summary: `As of September 2026, ${port} has 38 active court cases: 22 in litigation, 11 in arbitration, and 5 in mediation. 6 cases were disposed in September - the highest monthly clearance this FY. High-value disputes (above Rs 50 Cr) account for 14 of the active cases.`,
      keyMetrics: [
        { label: 'Active Cases', value: 38, trend: '-4 vs last month', status: 'positive' },
        { label: 'Disposed (Sep 2026)', value: 6, trend: '+2 MoM', status: 'positive' },
        { label: 'High-Value Cases', value: 14, trend: '37%', status: 'neutral' }
      ],
      visualizationType: 'bar',
      chartConfig: {
        title: 'Court Case Status - ' + port,
        xAxisKey: 'category',
        dataKeys: [{ key: 'count', label: 'Cases', color: '#0EA5E9' }],
        data: [
          { category: 'Litigation', count: 22 },
          { category: 'Arbitration', count: 11 },
          { category: 'Mediation', count: 5 },
          { category: 'Disposed (Sep)', count: 6 }
        ]
      },
      suggestedFollowUps: [
        'Which arbitration cases are awaiting award for more than 12 months?',
        'What is the total financial exposure from high-value court cases?',
        'Compare court case disposal rate for the last 6 months',
        'Show the break-up of cases by department or wing'
      ]
    };
  }

  if (q.includes('gem') || q.includes('procurement') || q.includes('purchase')) {
    return {
      summary: port + ' GEM procurement compliance stands at 82% for September 2026 against a ministry threshold of 76%. Total GEM transactions this month: Rs 47.3 Cr across 156 orders. Technology and Civil categories lead in volume. 3 pending orders are beyond the 30-day resolution window.',
      keyMetrics: [
        { label: 'GEM Compliance', value: '82%', trend: '+6% vs threshold', status: 'positive' },
        { label: 'Total Transactions', value: 'Rs 47.3 Cr', trend: '+12% MoM', status: 'positive' },
        { label: 'Pending >30 days', value: 3, trend: '-2 vs last month', status: 'positive' }
      ],
      visualizationType: 'bar',
      chartConfig: {
        title: 'GEM Procurement by Category - ' + port,
        xAxisKey: 'category',
        dataKeys: [
          { key: 'amount', label: 'Amount (Rs Cr)', color: '#10B981' },
          { key: 'orders', label: 'Orders', color: '#6366F1' }
        ],
        data: [
          { category: 'Technology', amount: 18.4, orders: 42 },
          { category: 'Civil Works', amount: 14.2, orders: 31 },
          { category: 'Equipment', amount: 8.7, orders: 52 },
          { category: 'Stationery', amount: 3.5, orders: 18 },
          { category: 'Others', amount: 2.5, orders: 13 }
        ]
      },
      suggestedFollowUps: [
        'Show month-wise GEM compliance trend for FY 2025-26',
        'Which vendors have the highest pending order amounts?',
        'Compare GEM compliance across all 9 major port authorities',
        'What categories are below the ministry procurement benchmark?'
      ]
    };
  }

  if (q.includes('capex') || q.includes('expenditure') || q.includes('budget') || q.includes('utilisation') || q.includes('utilization')) {
    return {
      summary: port + ' Capex utilisation stands at 68% (Rs 1,247 Cr of Rs 1,835 Cr allocated) as of Q2 FY 2025-26. Berth Development and Port Equipment categories lead utilisation. Dredging projects show the highest variance at -18% against quarterly targets.',
      keyMetrics: [
        { label: 'Capex Utilised', value: 'Rs 1,247 Cr', trend: '68% of allocation', status: 'neutral' },
        { label: 'Q2 Target Gap', value: 'Rs 588 Cr', trend: 'Remaining', status: 'negative' },
        { label: 'Projects On Track', value: 14, trend: 'of 22 active', status: 'positive' }
      ],
      visualizationType: 'bar',
      chartConfig: {
        title: 'Capex Utilisation by Category - ' + port,
        xAxisKey: 'category',
        dataKeys: [
          { key: 'target', label: 'Target (Rs Cr)', color: '#94A3B8' },
          { key: 'actual', label: 'Actual (Rs Cr)', color: '#0EA5E9' }
        ],
        data: [
          { category: 'Berth Dev.', target: 480, actual: 362 },
          { category: 'Dredging', target: 320, actual: 198 },
          { category: 'Equipment', target: 410, actual: 318 },
          { category: 'IT Systems', target: 195, actual: 189 },
          { category: 'Roads and Infra', target: 430, actual: 180 }
        ]
      },
      suggestedFollowUps: [
        'Which projects have the highest Capex variance from plan?',
        'Show quarter-wise Capex absorption trend for FY 2024-25',
        'What is the projected year-end utilisation at current burn rate?',
        'List all projects with less than 50% utilisation'
      ]
    };
  }

  if (q.includes('miv') || q.includes('maritime india vision') || q.includes('2030') || q.includes('intervention')) {
    return {
      summary: 'As of September 2026, Maritime India Vision 2030 progress shows 387 active interventions across all 9 major port authorities. 52 milestones were cleared in Q2 FY 2025-26 - the strongest quarterly performance. 71 interventions (18%) are at risk due to resource or regulatory delays.',
      keyMetrics: [
        { label: 'Active Interventions', value: 387, trend: 'of 512 total', status: 'positive' },
        { label: 'Q2 Milestones Cleared', value: 52, trend: '+8 vs Q1', status: 'positive' },
        { label: 'At-Risk Interventions', value: 71, trend: '18%', status: 'negative' }
      ],
      visualizationType: 'pie',
      chartConfig: {
        title: 'MIV 2030 Intervention Status Distribution',
        xAxisKey: 'status',
        dataKeys: [{ key: 'count', label: 'Interventions', color: '' }],
        data: [
          { status: 'On Track', count: 241 },
          { status: 'At Risk', count: 71 },
          { status: 'Delayed', count: 45 },
          { status: 'Completed', count: 30 }
        ]
      },
      suggestedFollowUps: [
        'Which port authority has the most at-risk MIV 2030 interventions?',
        'Show milestone achievement trend for the last 4 quarters',
        'What are the top 5 delayed interventions by impact score?',
        'Compare MIV 2030 progress across Connectivity, Capacity, and Governance pillars'
      ]
    };
  }

  if (q.includes('module') || q.includes('compliance') || q.includes('submission') || q.includes('pending')) {
    return {
      summary: 'Module compliance for ' + port + ' stands at 80% (12 of 15 exclusive modules submitted) for September 2026. Pending modules: Capex Monthly Update, GEM Works Upload, and CSR Report. All pending modules have a deadline of 30th September - immediate action required.',
      keyMetrics: [
        { label: 'Modules Submitted', value: '12/15', trend: '80% compliance', status: 'positive' },
        { label: 'Overdue Modules', value: 3, trend: 'Due 30 Sep', status: 'negative' },
        { label: 'Days to Deadline', value: 5, trend: 'Urgent', status: 'negative' }
      ],
      visualizationType: 'table',
      tableConfig: {
        title: 'Pending Modules - ' + port,
        headers: ['Module', 'Category', 'Due Date', 'Status', 'Last Updated'],
        rows: [
          ['Capex Monthly Update', 'Finance', '30 Sep 2026', 'Pending', '15 Sep 2026'],
          ['GEM Works Upload', 'Procurement', '30 Sep 2026', 'Pending', '20 Sep 2026'],
          ['CSR Report Q2', 'Governance', '30 Sep 2026', 'Pending', '01 Sep 2026']
        ]
      },
      suggestedFollowUps: [
        'Who is the nodal officer responsible for each pending module?',
        'Show historical module compliance rates for the last 6 months',
        'Compare module submission compliance across all 9 port authorities',
        'What are the consequences of missing the submission deadline?'
      ]
    };
  }

  if (q.includes('csr') || q.includes('social responsibility')) {
    return {
      summary: port + ' has 8 active CSR projects in FY 2025-26 with a total corpus of Rs 12.4 Cr. 5 projects are on track, 2 are at risk of delayed completion, and 1 is under review. Primary focus areas: Education (Rs 4.2 Cr), Healthcare (Rs 3.8 Cr), Environment (Rs 2.6 Cr), and Skilling (Rs 1.8 Cr).',
      keyMetrics: [
        { label: 'CSR Budget', value: 'Rs 12.4 Cr', trend: '68% disbursed', status: 'neutral' },
        { label: 'Active Projects', value: 8, trend: '5 on track', status: 'positive' },
        { label: 'Beneficiaries', value: '14,200+', trend: '+1,800 this quarter', status: 'positive' }
      ],
      visualizationType: 'pie',
      chartConfig: {
        title: 'CSR Fund Allocation by Focus Area - ' + port,
        xAxisKey: 'area',
        dataKeys: [{ key: 'amount', label: 'Amount (Rs Cr)', color: '' }],
        data: [
          { area: 'Education', amount: 4.2 },
          { area: 'Healthcare', amount: 3.8 },
          { area: 'Environment', amount: 2.6 },
          { area: 'Skilling', amount: 1.8 }
        ]
      },
      suggestedFollowUps: [
        'Show detailed status of each CSR project with completion percentage',
        'What is the beneficiary count breakdown by project?',
        'Compare CSR spending vs mandatory 2% net profit obligation',
        'List upcoming CSR project completion milestones for Q3'
      ]
    };
  }

  return {
    summary: 'SagarBot analysis for your query - Based on Sagarmanthan telemetry as of September 2026: ' + port + ' shows 80% overall module compliance, 68% Capex utilisation, 82% GEM procurement compliance, and 6 court cases disposed this month. 52 MIV 2030 milestones were cleared in Q2 FY 2025-26 - the highest quarterly performance this fiscal year.',
    keyMetrics: [
      { label: 'Module Compliance', value: '80%', trend: '+5% MoM', status: 'positive' },
      { label: 'Capex Utilised', value: '68%', trend: 'Rs 1,247 Cr', status: 'neutral' },
      { label: 'GEM Compliance', value: '82%', trend: '+6% vs 76% threshold', status: 'positive' }
    ],
    visualizationType: 'bar',
    chartConfig: {
      title: 'Executive Dashboard Snapshot - ' + port,
      xAxisKey: 'metric',
      dataKeys: [
        { key: 'actual', label: 'Actual (%)', color: '#0EA5E9' },
        { key: 'target', label: 'Target (%)', color: '#94A3B8' }
      ],
      data: [
        { metric: 'Module Compliance', actual: 80, target: 100 },
        { metric: 'Capex Utilisation', actual: 68, target: 85 },
        { metric: 'GEM Compliance', actual: 82, target: 76 },
        { metric: 'MIV 2030 Progress', actual: 75, target: 80 }
      ]
    },
    suggestedFollowUps: [
      'Which modules are pending submission for this month?',
      'Show Capex utilisation vs quarterly targets',
      'How many court cases were disposed vs pending this quarter?',
      'Compare GEM compliance across all port authorities'
    ]
  };
}


// ─── Python AI Service URL (Text-to-SQL microservice) ───────────────────────
const PYTHON_AI_URL = process.env.PYTHON_AI_URL || 'http://127.0.0.1:8000';

async function callPythonAIService(query, portName, viewType, conversationHistory) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 8000); // 8s timeout
  try {
    const url = `${PYTHON_AI_URL}/api/copilot/query`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, portName, viewType, conversationHistory }),
      signal: controller.signal
    });
    if (!res.ok) {
      console.warn(`[Copilot] Python AI returned HTTP ${res.status}`);
      return null;
    }
    const json = await res.json();
    if (json.success) {
      console.log(`[Copilot] Python AI query successful (source: ${json.source})`);
      return { data: json.data, source: json.source || 'python' };
    }
    return null;
  } catch (err) {
    console.warn(`[Copilot] Python AI call failed (${err.message}) — using fallback`);
    return null; // Python service not running — fall through
  } finally {
    clearTimeout(timeout);
  }
}

export async function handleCopilotQuery(req, res) {
  try {
    const { query, portName, viewType, conversationHistory = [] } = req.body;

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ success: false, message: 'Query is required.' });
    }

    // ── Tier 1: Python FastAPI Text-to-SQL service (real DB data) ────────────
    const pythonResult = await callPythonAIService(query, portName, viewType, conversationHistory.slice(-6));
    if (pythonResult) {
      return res.status(200).json({ success: true, data: pythonResult.data, source: pythonResult.source });
    }

    // ── Tier 2: Node.js OpenAI JSON mode (no DB, but smart analysis) ─────────
    const systemPrompt = viewType === 'org'
      ? getOrgSystemPrompt(portName || 'Port Authority')
      : MINISTRY_SYSTEM_PROMPT;

    const messages = [
      ...conversationHistory.slice(-6).map(m => ({
        role: m.role === 'user' ? 'user' : 'assistant',
        content: m.text || ''
      })),
      { role: 'user', content: (portName ? 'Port: ' + portName + '. ' : '') + 'Query: ' + query }
    ];

    const client = await getOpenAIClient();

    if (client) {
      const completion = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        temperature: 0.25,
        max_tokens: 1500,
        messages: [{ role: 'system', content: systemPrompt }, ...messages]
      });
      const parsedData = JSON.parse(completion.choices[0].message.content);
      return res.status(200).json({ success: true, data: parsedData, source: 'openai' });
    }

    // ── Tier 3: Rich mock response (always works, no API keys needed) ─────────
    const mockData = generateMockResponse(query, portName);
    return res.status(200).json({ success: true, data: mockData, source: 'mock' });

  } catch (err) {
    console.error('AI Copilot Error:', err);
    const mockData = generateMockResponse(req.body?.query || '', req.body?.portName || '');
    return res.status(200).json({ success: true, data: mockData, source: 'fallback' });
  }
}

export default { handleCopilotQuery };

