function pretty(data) {
  return JSON.stringify(data, null, 2);
}

function parseJsonSafe(text) {
  try {
    return JSON.parse(text);
  } catch {
    return { raw: text };
  }
}

async function apiRequest(url, options = {}) {
  const res = await fetch(url, options);
  const text = await res.text();
  const body = parseJsonSafe(text);
  if (!res.ok) {
    throw new Error(pretty(body));
  }
  return body;
}

function setResult(el, value) {
  el.textContent = typeof value === 'string' ? value : pretty(value);
}

const analyzeForm = document.getElementById('analyze-form');
const analyzeResult = document.getElementById('analyze-result');
const chainSelect = document.getElementById('chain');
const targetValueInput = document.getElementById('targetValue');
const targetHint = document.getElementById('target-hint');
const apiKeyInput = document.getElementById('apiKey');
const keyResult = document.getElementById('key-result');
const keyStatusBtn = document.getElementById('key-status-btn');
const keyRotateBtn = document.getElementById('key-rotate-btn');
const usageForm = document.getElementById('usage-form');
const usageResult = document.getElementById('usage-result');
const invoiceForm = document.getElementById('invoice-form');
const invoiceResult = document.getElementById('invoice-result');

const EXAMPLE_TARGETS = {
  sui: '0x1111111111111111111111111111111111111111111111111111111111111111',
  evm: '0x742d35Cc6634C0532925a3b844Bc454e4438f44e',
  solana: 'Vote111111111111111111111111111111111111111',
};

const CHAIN_EXPLORERS = { sui: 'SuiScan', evm: 'Etherscan', solana: 'Solscan' };

function updateTargetHint(chain) {
  const example = EXAMPLE_TARGETS[chain] || EXAMPLE_TARGETS.sui;
  const explorer = CHAIN_EXPLORERS[chain] || 'a block explorer';
  targetValueInput.placeholder = example;
  targetHint.textContent = `Find this on ${explorer} or your DEX. Example: ${example}`;
}

updateTargetHint(chainSelect.value);
chainSelect.addEventListener('change', () => {
  updateTargetHint(chainSelect.value);
});

analyzeForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setResult(analyzeResult, 'Running analysis...');

  const formData = new FormData(analyzeForm);
  const body = {
    chain: formData.get('chain'),
    targetType: formData.get('targetType'),
    targetValue: formData.get('targetValue'),
  };

  const headers = { 'content-type': 'application/json' };
  if (apiKeyInput.value.trim()) {
    headers['x-api-key'] = apiKeyInput.value.trim();
  }

  try {
    const result = await apiRequest('/api/v1/analyze', {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    setResult(analyzeResult, result);
  } catch (error) {
    setResult(analyzeResult, String(error));
  }
});

keyStatusBtn.addEventListener('click', async () => {
  if (!apiKeyInput.value.trim()) {
    setResult(keyResult, 'Enter API key first.');
    return;
  }

  setResult(keyResult, 'Loading key status...');
  try {
    const result = await apiRequest('/api/v1/keys/me', {
      headers: { 'x-api-key': apiKeyInput.value.trim() },
    });
    setResult(keyResult, result);
  } catch (error) {
    setResult(keyResult, String(error));
  }
});

keyRotateBtn.addEventListener('click', async () => {
  if (!apiKeyInput.value.trim()) {
    setResult(keyResult, 'Enter API key first.');
    return;
  }

  setResult(keyResult, 'Rotating key...');
  try {
    const result = await apiRequest('/api/v1/keys/rotate', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKeyInput.value.trim(),
      },
      body: JSON.stringify({ name: 'rotated-from-ui' }),
    });
    if (result?.apiKey?.token) {
      apiKeyInput.value = result.apiKey.token;
    }
    setResult(keyResult, result);
  } catch (error) {
    setResult(keyResult, String(error));
  }
});

usageForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setResult(usageResult, 'Loading usage report...');

  const adminToken = document.getElementById('adminToken').value.trim();
  const startRaw = document.getElementById('usageStart').value;
  const endRaw = document.getElementById('usageEnd').value;
  const tier = document.getElementById('usageTier').value.trim();

  const params = new URLSearchParams();
  if (startRaw) params.set('start', new Date(startRaw).toISOString());
  if (endRaw) params.set('end', new Date(endRaw).toISOString());
  if (tier) params.set('tier', tier);

  try {
    const result = await apiRequest(`/api/v1/admin/reports/usage?${params.toString()}`, {
      headers: { 'x-admin-token': adminToken },
    });
    setResult(usageResult, result);
  } catch (error) {
    setResult(usageResult, String(error));
  }
});

invoiceForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  setResult(invoiceResult, 'Loading invoice report...');

  const adminToken = document.getElementById('adminToken').value.trim();
  const startRaw = document.getElementById('invoiceStart').value;
  const endRaw = document.getElementById('invoiceEnd').value;

  const params = new URLSearchParams();
  if (startRaw) params.set('start', new Date(startRaw).toISOString());
  if (endRaw) params.set('end', new Date(endRaw).toISOString());

  try {
    const result = await apiRequest(`/api/v1/admin/reports/invoice?${params.toString()}`, {
      headers: { 'x-admin-token': adminToken },
    });
    setResult(invoiceResult, result);
  } catch (error) {
    setResult(invoiceResult, String(error));
  }
});
