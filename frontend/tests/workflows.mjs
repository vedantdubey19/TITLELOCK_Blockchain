// Run with Node; PLAYWRIGHT_MODULE can point to an existing Playwright installation.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE || 'playwright');
const server = await createServer({ server: { host: '127.0.0.1', port: 0 }, logLevel: 'error' });
await server.listen();
const origin = `http://127.0.0.1:${server.httpServer.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
const date = '2026-10-21T09:00:00Z';
const citizen = { id: 'citizen-id', name: 'Test Citizen', username: 'citizen', email: 'citizen@example.com', phone: '+919000000001', jurisdiction: '', description: '', role: 'CITIZEN', status: 'ACTIVE', activeRole: 'OWNER', aadhaarLast4: '0123', profile: { residentialAddress: 'Stored address' } };
const registrar = { ...citizen, id: 'registrar-id', role: 'REGISTRAR', activeRole: 'REGISTRAR', officerVerified: true };
const requests = [];
const failures = [];
async function pageFor(user, handle) {
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('pageerror', (error) => failures.push(error.message));
  await context.route('**/api/**', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const body = request.postDataJSON();
    requests.push({ method: request.method(), path: url.pathname, body });
    const result = await handle?.(url, request.method(), body);
    const defaults = { '/api/auth/me': user, '/api/properties/my': { properties: [], identity_linked: false }, '/api/health': { chain_mode: 'mock', chain_id: 31337 }, '/api/chain/wallet': { address: null } };
    await route.fulfill({ status: result?.status || 200, json: result?.body ?? defaults[url.pathname] ?? [] });
  });
  return { page, context };
}
try {
  await test('profile saves persisted fields via PATCH; contact changes require sign-in', async () => {
    let edited = false;
    const { page, context } = await pageFor(citizen, (url, method, data) => {
      if (url.pathname === '/api/auth/profile' && method === 'PATCH') {
        edited = true; return { body: { user: { ...citizen, ...data }, login_required: Boolean(data.currentPassword) } };
      }
    });
    await page.goto(`${origin}/citizen/profile`);
    assert.equal(await page.getByLabel('Residential address').inputValue(), 'Stored address');
    await page.getByLabel('Full name').fill('Updated Citizen');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.getByRole('status').filter({ hasText: 'Profile saved.' }).first().waitFor();
    assert.equal(edited, true);
    assert.equal(requests.findLast((r) => r.method === 'PATCH').body.name, 'Updated Citizen');
    await page.getByLabel('Email', { exact: true }).fill('changed@example.com');
    await page.getByLabel('Current password').fill('test password');
    await page.getByRole('button', { name: 'Save profile', exact: true }).click();
    await page.waitForURL('**/citizen/login');
    await context.close();
  });
  await test('dashboard uses real API activity and displays failure markers', async () => {
    const { page, context } = await pageFor(citizen, (url) => url.pathname === '/api/notifications' ? { body: [{ event_id: 1, action: 'TRANSFER_FAILED', parcel_id: 'REAL-LAND', created_at: date }] } : undefined);
    await page.goto(`${origin}/citizen/dashboard`);
    await page.getByText('● Transfer attempt failed').waitFor();
    assert.match(await page.locator('section').innerText(), /REAL-LAND/);
    assert.doesNotMatch(await page.locator('section').innerText(), /UP-0001|Title verified|Confirmed on-chain/);
    await context.close();
  });
  await test('risk screening opens and resolves saved holds', async () => {
    let assessed = false; let held = false; let resolved = false;
    const row = { id: 'assessment-id', parcel_id: 'LAND-1', document_hash: 'unique-document', decision: 'BLOCK', score: 80, created_at: date, expires_at: date, findings: [{ rule: 'LEGAL_RESTRICTIONS', blocked: true }] };
    const { page, context } = await pageFor(registrar, (url, method, body) => {
      if (url.pathname === '/api/risk/assessments' && method === 'POST') { assessed = true; return { body: row }; }
      if (url.pathname.endsWith('/hold') && method === 'POST') { held = true; assert.equal(body.evidence_reference, 'review-ref'); return { body: {} }; }
      if (url.pathname.endsWith('/resolve') && method === 'POST') { resolved = true; return { body: {} }; }
      if (url.pathname === '/api/risk/assessments') return { body: assessed ? [row] : [] };
      if (url.pathname === '/api/risk/holds') return { body: held && (!resolved || url.searchParams.get('include_resolved') === 'true') ? [{ id: 'hold-id', parcel_id: 'LAND-1', reason: 'test hold', evidence_reference: 'review-ref', created_at: date, resolved_at: resolved ? date : null }] : [] };
    });
    await page.goto(`${origin}/registrar/risk`);
    await page.getByLabel('Property ULPIN').fill('LAND-1');
    await page.getByLabel('Buyer username').fill('buyer');
    await page.getByLabel('Document hash / reference').fill('unique-document');
    await page.getByRole('button', { name: 'Run assessment', exact: true }).click();
    await page.getByRole('button', { name: 'Open review hold' }).waitFor();
    await page.getByRole('button', { name: 'Open review hold' }).click();
    await page.getByLabel('Reason', { exact: true }).fill('test hold');
    await page.getByLabel('Evidence reference', { exact: true }).fill('review-ref');
    await page.getByRole('button', { name: 'Save review action' }).click();
    await page.getByRole('button', { name: 'Resolve hold' }).click();
    await page.getByLabel('Reason', { exact: true }).fill('cleared after review');
    await page.getByLabel('Evidence reference', { exact: true }).fill('resolve-ref');
    await page.getByRole('button', { name: 'Save review action' }).click();
    await page.getByRole('button', { name: 'Resolve hold', exact: true }).waitFor({ state: 'detached' });
    await page.getByLabel('Include resolved holds').check();
    await page.getByText(/Resolved /).last().waitFor();
    assert.equal(resolved, true);
    await context.close();
  });
  await test('citizen files succession evidence with numeric shares, then withdraws', async () => {
    let claim = null;
    const { page, context } = await pageFor(citizen, (url, method, data) => {
      if (url.pathname === '/api/succession' && method === 'POST') {
        assert.equal(data.heirs[0].share_bps, 10000);
        claim = { ...data, id: 'case-id', applicant_user_id: citizen.id, created_at: date, status: 'SUBMITTED', heirs: [{ ...data.heirs[0], name: 'Test Citizen' }] };
        return { body: { status: 'SUBMITTED' } };
      }
      if (url.pathname.endsWith('/withdraw')) { claim.status = 'WITHDRAWN'; return { body: { status: 'WITHDRAWN' } }; }
      if (url.pathname === '/api/succession') return { body: claim ? [claim] : [] };
    });
    await page.goto(`${origin}/citizen/nominees`);
    for (const [label,value] of [['Property ULPIN','LAND-1'],["Deceased owner's registry UUID",'00000000-0000-4000-8000-000000000001'],['Death certificate reference','death-ref'],['Legal heir / court evidence reference','court-ref'],['Document SHA-256 hash','a'.repeat(64)],['Heir username','citizen'],['Share (basis points)','10000']]) await page.getByLabel(label).fill(value);
    await page.getByRole('button', { name: 'Submit evidence for review' }).click();
    await page.getByRole('button', { name: 'Withdraw submitted claim' }).click();
    await page.getByRole('heading', { name: 'LAND-1 · WITHDRAWN' }).waitFor();
    await context.close();
  });
  await test('registrar assignment, evidence review and case history do not claim a transfer', async () => {
    const claim = { id: 'case-id', parcel_id: 'LAND-1', deceased_user_id: 'owner-id', status: 'SUBMITTED', created_at: date, heirs: [{ name: 'Heir', username: 'heir', share_bps: 10000 }], document_hash: 'a'.repeat(64) };
    const { page, context } = await pageFor(registrar, (url, method, data) => {
      if (url.pathname.endsWith('/assign')) { claim.assigned_registrar_id = registrar.id; claim.status = 'IN_REVIEW'; return { body: { status: claim.status } }; }
      if (url.pathname.endsWith('/review')) { claim.status = data.decision; claim.review_note = data.note; claim.reviewed_at = date; return { body: { status: claim.status, message: 'Evidence review only. No ownership or blockchain transfer occurred.' } }; }
      if (url.pathname.endsWith('/events')) return { body: [{ id: 1, action: claim.status, created_at: date }] };
      if (url.pathname === '/api/succession') return { body: [claim] };
    });
    await page.goto(`${origin}/registrar/succession`);
    await page.getByRole('button', { name: 'Assign to me for review' }).click();
    await page.getByRole('button', { name: 'Record evidence decision' }).click();
    await page.getByLabel('Reviewed evidence reference').fill('court-order-reference');
    await page.getByLabel('Review note').fill('Evidence checked in person');
    await page.getByRole('button', { name: 'Save decision' }).click();
    await page.getByRole('heading', { name: 'LAND-1 · EVIDENCE VERIFIED' }).waitFor();
    await page.getByRole('button', { name: 'Show case history' }).click();
    await page.getByText(/EVIDENCE_VERIFIED/).waitFor();
    assert.equal(requests.some((r) => /complete|transaction|submitted/.test(r.path)), false);
    await context.close();
  });
  await test('unavailable backend is shown as an error, not successful save or empty register', async () => {
    const { page, context } = await pageFor(registrar, (url, method) => url.pathname.startsWith('/api/risk/') ? { status: 503, body: { detail: 'Registry unavailable' } } : undefined);
    await page.goto(`${origin}/registrar/risk`);
    await page.getByRole('alert').first().waitFor();
    assert.equal(await page.getByText('No matching assessments.', { exact: true }).count(), 0);
    await context.close();
  });
  await test('empty map does not invent boundaries, registered area or verification', async () => {
    const { page, context } = await pageFor(citizen);
    await context.route('https://**/*', (route) => route.abort());
    await page.goto(`${origin}/citizen/map/fullscreen`);
    await page.locator('.leaflet-container').waitFor();
    assert.equal(await page.locator('.leaflet-overlay-pane path').count(), 0);
    assert.doesNotMatch(await page.locator('body').innerText(), /2,390|UP-0001-CLEAN/);
    await page.getByTitle('Measure parcel boundary', { exact: true }).click();
    await page.getByText('No registered area is available.').waitFor();
    await context.close();
  });
  assert.deepEqual(failures, [], 'No browser runtime errors');
} finally { await browser.close(); await server.close(); }
