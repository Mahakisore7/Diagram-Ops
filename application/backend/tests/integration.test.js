// Unlike every other file in tests/, this one hits a REAL MongoDB and drives
// the app through actual HTTP requests via supertest — no mocks. The unit
// tests prove each piece's logic in isolation; this proves the pieces are
// actually wired together correctly (routing, middleware order, real
// Mongoose queries). Requires a reachable MongoDB — see
// tests/setupEnv.js for the default connection string, and
// .github/workflows/pr.yml's "backend" job for how CI provides one.
const mongoose = require('mongoose');
const request = require('supertest');
const createApp = require('../src/app');
const db = require('../src/db/connect');
const User = require('../src/models/User');
const Diagram = require('../src/models/Diagram');
const ActivityEvent = require('../src/models/ActivityEvent');

const app = createApp();

beforeAll(async () => {
  await db.connect();
});

afterAll(async () => {
  await mongoose.connection.close();
});

afterEach(async () => {
  await User.deleteMany({});
  await Diagram.deleteMany({});
  await ActivityEvent.deleteMany({});
});

async function registerAndLogin(email) {
  await request(app).post('/api/auth/register').send({ email, password: 'correcthorse1' });
  const res = await request(app).post('/api/auth/login').send({ email, password: 'correcthorse1' });
  return res.body.token;
}

describe('health and readiness', () => {
  it('GET /healthz is always 200, unauthenticated', async () => {
    const res = await request(app).get('/healthz');
    expect(res.status).toBe(200);
  });

  it('GET /readyz is 200 once MongoDB is connected', async () => {
    const res = await request(app).get('/readyz');
    expect(res.status).toBe(200);
  });
});

describe('auth flow', () => {
  it('registers, then logs in, then fetches the profile', async () => {
    const register = await request(app)
      .post('/api/auth/register')
      .send({ email: 'alice@example.com', password: 'correcthorse1' });
    expect(register.status).toBe(201);
    expect(register.body.user.passwordHash).toBeUndefined();

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'correcthorse1' });
    expect(login.status).toBe(200);
    expect(login.body.token).toBeTruthy();

    const me = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${login.body.token}`);
    expect(me.status).toBe(200);
    expect(me.body.user.email).toBe('alice@example.com');
  });

  it('rejects a duplicate registration with 409', async () => {
    await request(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'correcthorse1' });
    const res = await request(app).post('/api/auth/register').send({ email: 'dup@example.com', password: 'correcthorse1' });
    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_IN_USE');
  });

  it('rejects protected routes with no token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('diagram CRUD and ownership — FR-D7', () => {
  it('a user can save, list, fetch, update, and delete their own diagram', async () => {
    const token = await registerAndLogin('bob@example.com');
    const auth = { Authorization: `Bearer ${token}` };

    const save = await request(app)
      .post('/api/diagrams')
      .set(auth)
      .send({
        title: 'My Flow',
        sourceText: 'a simple login flow',
        diagramType: 'flowchart',
        mermaidSyntax: 'flowchart TD\nA-->B',
      });
    expect(save.status).toBe(201);
    const id = save.body._id;

    const list = await request(app).get('/api/diagrams').set(auth);
    expect(list.status).toBe(200);
    expect(list.body.data).toHaveLength(1);

    const getOne = await request(app).get(`/api/diagrams/${id}`).set(auth);
    expect(getOne.status).toBe(200);
    expect(getOne.body.title).toBe('My Flow');

    const update = await request(app).patch(`/api/diagrams/${id}`).set(auth).send({ title: 'Renamed' });
    expect(update.status).toBe(200);
    expect(update.body.title).toBe('Renamed');

    const del = await request(app).delete(`/api/diagrams/${id}`).set(auth);
    expect(del.status).toBe(204);

    const getAfterDelete = await request(app).get(`/api/diagrams/${id}`).set(auth);
    expect(getAfterDelete.status).toBe(404);
  });

  it('returns 404 — not 403 — when a second user requests the first user\'s diagram', async () => {
    const tokenA = await registerAndLogin('carol@example.com');
    const tokenB = await registerAndLogin('dave@example.com');

    const save = await request(app)
      .post('/api/diagrams')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        sourceText: 'carol\'s private diagram',
        diagramType: 'flowchart',
        mermaidSyntax: 'flowchart TD\nA-->B',
      });
    const id = save.body._id;

    const asOwner = await request(app).get(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(asOwner.status).toBe(200);

    const asStranger = await request(app).get(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(asStranger.status).toBe(404);

    const deleteAsStranger = await request(app).delete(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenB}`);
    expect(deleteAsStranger.status).toBe(404);

    const stillThere = await request(app).get(`/api/diagrams/${id}`).set('Authorization', `Bearer ${tokenA}`);
    expect(stillThere.status).toBe(200);
  });

  it('rejects an oversized generation request before touching any provider', async () => {
    const token = await registerAndLogin('erin@example.com');
    const res = await request(app)
      .post('/api/diagrams/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({ text: 'a'.repeat(2001) });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('every error response carries the same request id sent in the header', async () => {
    const res = await request(app)
      .get('/api/diagrams/not-a-valid-object-id')
      .set('Authorization', 'Bearer garbage-token')
      .set('x-request-id', 'test-fixed-id-123');

    expect(res.status).toBe(401);
    expect(res.body.error.requestId).toBe('test-fixed-id-123');
    expect(res.headers['x-request-id']).toBe('test-fixed-id-123');
  });
});

async function saveDiagram(auth, overrides = {}) {
  const res = await request(app)
    .post('/api/diagrams')
    .set(auth)
    .send({
      title: 'Checkout flow',
      sourceText: 'checkout flow',
      diagramType: 'flowchart',
      mermaidSyntax: 'flowchart TD\nA-->B',
      providerUsed: 'groq',
      generationMs: 800,
      ...overrides,
    });
  expect(res.status).toBe(201);
  return res.body;
}

describe('library: stats, search, favourites, tags', () => {
  it('GET /api/diagrams/stats is routed before /diagrams/:id and aggregates per user', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('stats@example.com')}` };
    const a = await saveDiagram(auth);
    await saveDiagram(auth, { title: 'Orders schema', diagramType: 'er', mermaidSyntax: 'erDiagram\nA ||--o{ B : has' });
    await request(app).patch(`/api/diagrams/${a._id}`).set(auth).send({ isFavorite: true, tags: ['Payments', 'payments '] });

    // A second user's diagrams must never leak into the first user's stats.
    const other = { Authorization: `Bearer ${await registerAndLogin('other@example.com')}` };
    await saveDiagram(other);

    const res = await request(app).get('/api/diagrams/stats').set(auth);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(2);
    expect(res.body.byType).toEqual({ flowchart: 1, er: 1 });
    expect(res.body.favorites).toBe(1);
    expect(res.body.tags).toEqual([{ tag: 'payments', count: 1 }]);
    expect(res.body.activity).toHaveLength(14);
    expect(res.body.activity.at(-1).count).toBe(2);
  });

  it('filters the list by search text, type, favourite and tag', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('filter@example.com')}` };
    const a = await saveDiagram(auth, { title: 'Payment retries' });
    await saveDiagram(auth, { title: 'Orders schema', diagramType: 'er', mermaidSyntax: 'erDiagram\nA ||--o{ B : has' });
    await request(app).patch(`/api/diagrams/${a._id}`).set(auth).send({ isFavorite: true, tags: ['billing'] });

    const byText = await request(app).get('/api/diagrams?q=PAYMENT').set(auth);
    expect(byText.body.data.map((d) => d.title)).toEqual(['Payment retries']);

    const byType = await request(app).get('/api/diagrams?type=er').set(auth);
    expect(byType.body.data.map((d) => d.title)).toEqual(['Orders schema']);

    const favs = await request(app).get('/api/diagrams?favorite=true').set(auth);
    expect(favs.body.pagination.total).toBe(1);

    const byTag = await request(app).get('/api/diagrams?tag=billing').set(auth);
    expect(byTag.body.data[0]._id).toBe(a._id);

    const badType = await request(app).get('/api/diagrams?type=pie').set(auth);
    expect(badType.status).toBe(400);
  });
});

describe('versions, duplicate, sharing', () => {
  it('keeps a version per content change and exposes it newest-first', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('ver@example.com')}` };
    const d = await saveDiagram(auth);

    await request(app).patch(`/api/diagrams/${d._id}`).set(auth).send({ mermaidSyntax: 'flowchart TD\nA-->C' });
    await request(app).patch(`/api/diagrams/${d._id}`).set(auth).send({ title: 'Renamed' });
    await request(app).patch(`/api/diagrams/${d._id}`).set(auth).send({ isFavorite: true });

    const res = await request(app).get(`/api/diagrams/${d._id}/versions`).set(auth);
    expect(res.status).toBe(200);
    expect(res.body.versions).toHaveLength(2);
    expect(res.body.versions[0].title).toBe('Checkout flow');
    expect(res.body.versions[1].mermaidSyntax).toBe('flowchart TD\nA-->B');

    // Version history never leaks into the normal detail payload.
    const detail = await request(app).get(`/api/diagrams/${d._id}`).set(auth);
    expect(detail.body.versions).toBeUndefined();
  });

  it('duplicates a diagram as a new, independent document', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('dup@example.com')}` };
    const d = await saveDiagram(auth);
    const res = await request(app).post(`/api/diagrams/${d._id}/duplicate`).set(auth);
    expect(res.status).toBe(201);
    expect(res.body._id).not.toBe(d._id);
    expect(res.body.title).toBe('Checkout flow (copy)');
  });

  it('serves a shared diagram publicly until the link is revoked', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('share@example.com')}` };
    const d = await saveDiagram(auth);

    const share = await request(app).post(`/api/diagrams/${d._id}/share`).set(auth);
    expect(share.status).toBe(200);
    const token = share.body.shareToken;

    const pub = await request(app).get(`/api/public/diagrams/${token}`);
    expect(pub.status).toBe(200);
    expect(pub.body.title).toBe('Checkout flow');
    expect(pub.body.sourceText).toBeUndefined();
    expect(pub.body.userId).toBeUndefined();

    const revoke = await request(app).delete(`/api/diagrams/${d._id}/share`).set(auth);
    expect(revoke.status).toBe(204);
    const after = await request(app).get(`/api/public/diagrams/${token}`);
    expect(after.status).toBe(404);
  });

  it("another user cannot share someone else's diagram", async () => {
    const owner = { Authorization: `Bearer ${await registerAndLogin('own@example.com')}` };
    const intruder = { Authorization: `Bearer ${await registerAndLogin('intr@example.com')}` };
    const d = await saveDiagram(owner);
    const res = await request(app).post(`/api/diagrams/${d._id}/share`).set(intruder);
    expect(res.status).toBe(404);
  });
});

describe('account management and activity log', () => {
  it('updates the profile name, records activity, and exports account data', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('prof@example.com')}` };
    await saveDiagram(auth);

    const patch = await request(app).patch('/api/auth/me').set(auth).send({ name: 'Ada Lovelace' });
    expect(patch.status).toBe(200);
    expect(patch.body.user.name).toBe('Ada Lovelace');

    const exp = await request(app).get('/api/auth/me/export').set(auth);
    expect(exp.status).toBe(200);
    expect(exp.body.account.passwordHash).toBeUndefined();
    expect(exp.body.diagrams).toHaveLength(1);

    const act = await request(app).get('/api/activity').set(auth);
    const actions = act.body.events.map((e) => e.action);
    expect(actions).toEqual(
      expect.arrayContaining(['auth.register', 'auth.login', 'diagram.create', 'profile.update', 'account.export']),
    );
  });

  it('logs failed sign-ins against the real account', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('brute@example.com')}` };
    await request(app).post('/api/auth/login').send({ email: 'brute@example.com', password: 'wrongpass1' });
    const act = await request(app).get('/api/activity').set(auth);
    expect(act.body.events.map((e) => e.action)).toContain('auth.login_failed');
  });

  it('changes the password only with the correct current password', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('pw@example.com')}` };

    const wrong = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'nope12345', newPassword: 'newpass123' });
    expect(wrong.status).toBe(403);

    const ok = await request(app)
      .post('/api/auth/change-password')
      .set(auth)
      .send({ currentPassword: 'correcthorse1', newPassword: 'newpass123' });
    expect(ok.status).toBe(204);

    const login = await request(app).post('/api/auth/login').send({ email: 'pw@example.com', password: 'newpass123' });
    expect(login.status).toBe(200);
  });

  it('deletes the account and all of its data', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('bye@example.com')}` };
    await saveDiagram(auth);

    const del = await request(app).delete('/api/auth/me').set(auth).send({ password: 'correcthorse1' });
    expect(del.status).toBe(204);

    expect(await User.countDocuments({ email: 'bye@example.com' })).toBe(0);
    expect(await Diagram.countDocuments({})).toBe(0);
    const me = await request(app).get('/api/auth/me').set(auth);
    expect(me.status).toBe(401);
  });
});

describe('create with tags', () => {
  it('normalises tags on create and rejects too many', async () => {
    const auth = { Authorization: `Bearer ${await registerAndLogin('tags@example.com')}` };
    const d = await saveDiagram(auth, { tags: [' Infra', 'infra', 'AWS'] });
    expect(d.tags).toEqual(['infra', 'aws']);

    const tooMany = await request(app)
      .post('/api/diagrams')
      .set(auth)
      .send({
        sourceText: 'x',
        diagramType: 'flowchart',
        mermaidSyntax: 'flowchart TD\nA-->B',
        tags: Array.from({ length: 11 }, (_, i) => `t${i}`),
      });
    expect(tooMany.status).toBe(400);
  });
});
